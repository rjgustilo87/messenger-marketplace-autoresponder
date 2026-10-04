const fs = require('node:fs');
const path = require('node:path');

const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;

// Return field names only. Never include user-provided values or parse errors.
function validateConfig(config, env = process.env) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return ['config must be an object'];
  }
  const errors = [];
  for (const field of ['autoResponseMessage', 'stateFile']) {
    if (!nonempty(config[field])) errors.push(`${field}: missing or invalid`);
  }
  for (const field of ['pollingIntervalMs', 'maxMessagesPerSession']) {
    if (!positiveInteger(config[field])) errors.push(`${field}: must be a positive integer`);
  }
  for (const field of ['headless', 'skipRepliedConversations', 'debugMode']) {
    if (typeof config[field] !== 'boolean') errors.push(`${field}: must be boolean`);
  }
  if (!Array.isArray(config.marketplaceIndicators) || !config.marketplaceIndicators.length ||
      !config.marketplaceIndicators.every(nonempty)) {
    errors.push('marketplaceIndicators: must contain nonempty strings');
  }
  for (const field of ['width', 'height']) {
    if (!positiveInteger(config.browser?.viewport?.[field])) {
      errors.push(`browser.viewport.${field}: must be a positive integer`);
    }
  }
  const userAgent = config.browser?.userAgent;
  if (userAgent != null && !nonempty(userAgent)) errors.push('browser.userAgent: invalid');
  if (typeof config.stagehand?.enabled !== 'boolean') errors.push('stagehand.enabled: must be boolean');
  if (config.stagehand?.enabled) {
    if (!nonempty(config.stagehand.model)) errors.push('stagehand.model: missing');
    if (!positiveInteger(config.stagehand.maxRecoveriesPerSession)) {
      errors.push('stagehand.maxRecoveriesPerSession: must be a positive integer');
    }
    if (!nonempty(config.stagehand.apiKey) && !nonempty(env.OPENAI_API_KEY)) {
      errors.push('OPENAI_API_KEY: missing (or stagehand.apiKey)');
    }
  }
  return errors;
}

async function checkSetup() {
  let config;
  try {
    config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
  } catch {
    console.error('config.json: missing or invalid JSON');
    process.exitCode = 1;
    return;
  }
  const errors = validateConfig(config);
  if (errors.length) {
    errors.forEach(error => console.error(error));
    process.exitCode = 1;
    return;
  }
  console.log('config.json: valid');
  console.log(`Stagehand fallback: ${config.stagehand.enabled ? 'enabled; key configured' : 'disabled'}`);
  console.log('Reply message: configured (value hidden)');
  let browser;
  try {
    const { chromium } = require('playwright');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent('<title>Local setup check</title>');
    if (await page.title() !== 'Local setup check') throw new Error();
    console.log('Chromium: local browser check passed');
  } catch {
    console.error('Chromium: check failed; run npx playwright install chromium and see SYSTEM_DEPS.md');
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
}

if (require.main === module) {
  checkSetup().catch(() => {
    console.error('Setup check failed (details hidden to protect configuration)');
    process.exitCode = 1;
  });
}

module.exports = { validateConfig };
