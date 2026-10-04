// Rules inspect incoming message text only, never listing titles or sidebar text.
function selectInquiryReply(message) {
  const text = typeof message === 'string' ? message.trim() : '';
  if (!text) return null;

  const hasZip = /\b\d{5}(?:-\d{4})?\b/.test(text);
  const hasSize = /\b(?:10|20|40|45|53)\s*-?\s*(?:ft\b|feet\b|foot\b|['′’])/i.test(text) ||
    // Shorthand must have container/size context or sit next to the ZIP,
    // rather than matching a quantity or a day of the month elsewhere.
    /\b(?:10|20|40|45|53)\s*(?:hc\b|high[- ]cube\b|container\b)/i.test(text) ||
    /\bsize\s*[:=]?\s*(?:10|20|40|45|53)\b/i.test(text) ||
    /\b(?:10|20|40|45|53)\s*[,/]\s*\d{5}\b|\b\d{5}\s*[,/]\s*(?:10|20|40|45|53)\b/.test(text);
  const used = /\bused\b(?!\s+(?:for|to)\b)/i.test(text);
  const newContainer = /\bnew\b(?!\s+(?:york|jersey|mexico|hampshire|orleans)\b)|\bone[-\s]+trip\b|\b1[-\s]+trip\b/i.test(text);
  // Conflicting choices and negations need clarification rather than guessing.
  const hasCondition = used !== newContainer &&
    !/\b(?:not|no|isn't|isn’t|don't|don’t)\s+(?:want\s+|need\s+)?(?:a\s+)?(?:used|new|one[-\s]+trip|1[-\s]+trip)\b/i.test(text);

  if (hasZip && hasSize && hasCondition) {
    return 'Hi! Thanks for reaching out. What do you plan to use the container for, and when do you need it delivered?';
  }
  if (hasZip && hasSize) {
    return 'Hi! Thanks for reaching out. Do you prefer a used or new container, and when do you need it delivered?';
  }
  return 'Hi! Thanks for your interest. What is your delivery ZIP code, and what container size are you looking for?';
}

async function readInitialIncomingMessage(page) {
  // Only use explicit incoming bubbles within the open conversation. If the UI
  // doesn't expose these markers, skip sending instead of classifying sidebar text.
  const incoming = page.locator(
    '[role="main"] [data-testid="incoming_message"], ' +
    '[data-testid="message_container"] [data-testid="incoming_message"]'
  ).first();
  if (await incoming.count() === 0) return null;
  const messageText = incoming.locator('[data-testid="message_text"]');
  const text = await messageText.count() > 0
    ? (await messageText.allTextContents()).join('\n')
    : await incoming.innerText();
  return text.trim() || null;
}

module.exports = { selectInquiryReply, readInitialIncomingMessage };
