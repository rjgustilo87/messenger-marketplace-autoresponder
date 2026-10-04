const assert = require('node:assert/strict');
const { test } = require('node:test');
const { validateConfig } = require('../scripts/check-setup');

const validConfig = () => ({
  autoResponseMessage: 'Test reply', stateFile: './state.json',
  pollingIntervalMs: 30000, maxMessagesPerSession: 50,
  headless: false, skipRepliedConversations: true, debugMode: true,
  marketplaceIndicators: ['Marketplace'],
  browser: { viewport: { width: 1280, height: 800 }, userAgent: null },
  stagehand: { enabled: false, model: 'gpt-4o', maxRecoveriesPerSession: 10 }
});

test('Playwright-only setup needs no API key', () => {
  assert.deepEqual(validateConfig(validConfig(), {}), []);
});

test('enabled AI fallback needs a key; reports no credential values', () => {
  const config = validConfig();
  config.stagehand.enabled = true;
  assert.deepEqual(validateConfig(config, {}), ['OPENAI_API_KEY: missing (or stagehand.apiKey)']);
  assert.deepEqual(validateConfig(config, { OPENAI_API_KEY: 'synthetic-test-value' }), []);
  config.stagehand.apiKey = 'synthetic-test-value';
  assert.deepEqual(validateConfig(config, {}), []);
});

test('rejects fields that could cause an unusable setup', () => {
  const config = validConfig();
  config.pollingIntervalMs = 0;
  config.browser.viewport.width = -1;
  config.marketplaceIndicators = [''];
  config.autoResponseMessage = ' ';
  assert.equal(validateConfig(config, {}).length, 4);
  assert.deepEqual(validateConfig(null, {}), ['config must be an object']);
});
