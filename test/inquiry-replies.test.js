const assert = require('node:assert/strict');
const { test } = require('node:test');
const { chromium } = require('playwright');
const { selectInquiryReply, readInitialIncomingMessage } = require('../inquiry-replies');
const { MessengerAutoresponder } = require('../main');

const zipAndSize = 'Hi! Thanks for your interest. What is your delivery ZIP code, and what container size are you looking for?';
const conditionAndTiming = 'Hi! Thanks for reaching out. Do you prefer a used or new container, and when do you need it delivered?';
const purposeAndTiming = 'Hi! Thanks for reaching out. What do you plan to use the container for, and when do you need it delivered?';

test('availability questions, including the supplied typo, ask for ZIP and size', () => {
  for (const text of ['Hi, s this still available?', 'Is this available?', 'Hello']) {
    assert.equal(selectInquiryReply(text), zipAndSize);
  }
});

test('size and ZIP ask for condition and timing', () => {
  for (const text of ['Need a 20ft delivered to 90210', '40 foot container, zip 33101',
    'ZIP 90210-1234, size: 40', '90210, 20', "A 40' to 90210", '45 HC to 90210']) {
    assert.equal(selectInquiryReply(text), conditionAndTiming);
  }
});

test('ZIP, size and condition take priority and ask for purpose and timing', () => {
  for (const text of ['Hi, is a USED 20ft available for 90210?',
    'New 40-foot to 33101', '20 feet one-trip for 90210', '40ft 1 trip 90210']) {
    assert.equal(selectInquiryReply(text), purposeAndTiming);
  }
});

test('missing, conflicting, and negated information does not imply a complete inquiry', () => {
  for (const text of ['Used 40ft', 'ZIP 90210', 'Need it by October 20 in 90210',
    '20 containers for 90210']) {
    assert.equal(selectInquiryReply(text), zipAndSize);
  }
  for (const text of ['20ft 90210 used or new', '40ft 90210 not new',
    "20ft 90210 don't want used", '40ft to 10001 in New York',
    '20ft 90210 to be used for storage']) {
    assert.equal(selectInquiryReply(text), conditionAndTiming);
  }
  assert.equal(selectInquiryReply(''), null);
  assert.equal(selectInquiryReply(null), null);
});

test('offline chat extraction ignores sidebar, listing, and outgoing message text', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(`
      <nav>New 40ft container 90210
        <div data-testid="incoming_message">Sidebar preview</div>
      </nav>
      <main role="main">
        <h1>New 40ft container in 90210</h1>
        <div data-testid="outgoing_message">Used 20ft 33101</div>
        <div data-testid="incoming_message"><span>Sender name</span>
          <span data-testid="message_text">Hi, s this still available?</span>
        </div>
        <div data-testid="incoming_message"><span data-testid="message_text">New 40ft 90210</span></div>
      </main>`);
    const initial = await readInitialIncomingMessage(page);
    assert.equal(initial, 'Hi, s this still available?');
    assert.equal(selectInquiryReply(initial), zipAndSize);

    await page.setContent('<main role="main"><h1>New 40ft 90210</h1><div data-testid="outgoing_message">Hi</div></main>');
    assert.equal(await readInitialIncomingMessage(page), null);

    await page.setContent('<div data-testid="message_container"><div data-testid="incoming_message">Used 20ft 90210</div></div>');
    assert.equal(selectInquiryReply(await readInitialIncomingMessage(page)), purposeAndTiming);
  } finally {
    await browser.close();
  }
});

test('processing sends the selected reply, records success, and skips unreadable chats', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const app = new MessengerAutoresponder();
    app.page = page;
    app.screenshotDir = __dirname; // No files are written; screenshot capture is stubbed below.
    app.config = { skipRepliedConversations: true, marketplaceIndicators: ['Marketplace'], maxMessagesPerSession: 50 };
    app.log = () => {};
    app.captureScreenshot = async () => {};
    app.saveState = async () => {};
    app.sendNotification = async () => {};
    app.openConversation = async () => true;
    app.checkIfAlreadyReplied = async () => false;
    const sent = [];
    app.sendMessage = async message => { sent.push(message); return true; };
    const conversation = id => ({ ariaLabel: id, text: 'Marketplace inquiry' });

    await page.setContent('<main role="main"><div data-testid="incoming_message">Used 40ft for 90210</div></main>');
    assert.equal(await app.processConversation(conversation('complete')), true);
    assert.deepEqual(sent, [purposeAndTiming]);
    assert.equal(app.state.messagesSent, 1);
    assert.deepEqual(app.state.respondedConversations, ['complete']);
    assert.equal(await app.processConversation(conversation('complete')), false);

    await page.setContent('<main role="main"><h1>New 40ft 90210</h1></main>');
    assert.equal(await app.processConversation(conversation('unreadable')), false);
    assert.equal(sent.length, 1);
    assert.equal(app.state.respondedConversations.includes('unreadable'), false);

    await page.setContent('<main role="main"><div data-testid="incoming_message">20ft 33101</div></main>');
    app.sendMessage = async () => false;
    assert.equal(await app.processConversation(conversation('failed-send')), false);
    assert.equal(app.state.messagesSent, 1);
    assert.equal(app.state.respondedConversations.includes('failed-send'), false);
  } finally {
    await browser.close();
  }
});
