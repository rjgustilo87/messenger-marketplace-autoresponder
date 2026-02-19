/**
 * Facebook Messenger Marketplace Autoresponder
 * 
 * Hybrid architecture:
 * - Primary: Playwright (fast, deterministic)
 * - Fallback: Stagehand (AI-powered, resilient)
 * 
 * On Playwright failures:
 * 1. Capture screenshot
 * 2. Send notification
 * 3. Attempt Stagehand recovery
 * 4. Document what worked
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Try to import Stagehand (optional dependency)
let Stagehand = null;
try {
  Stagehand = require('@browserbasehq/stagehand').Stagehand;
} catch (e) {
  console.log('Stagehand not installed. Run: npm install @browserbasehq/stagehand');
}

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  orange: '\x1b[38;5;208m'
};

class MessengerAutoresponder {
  constructor() {
    this.config = null;
    this.state = {
      respondedConversations: [],
      lastCheckTimestamp: null,
      sessionStartTime: Date.now(),
      messagesSent: 0,
      totalConversationsChecked: 0,
      playwrightFailures: 0,
      stagehandRecoveries: 0,
      errors: []
    };
    this.browser = null;
    this.page = null;
    this.stagehand = null;
    this.isRunning = false;
    this.stateFilePath = null;
    this.screenshotDir = null;
  }

  /**
   * Initialize the autoresponder
   */
  async initialize() {
    console.log(`${colors.cyan}${colors.bright}🚀 Facebook Messenger Marketplace Autoresponder${colors.reset}`);
    console.log(`${colors.dim}Hybrid: Playwright + Stagehand Fallback${colors.reset}`);
    console.log(`${colors.dim}================================================${colors.reset}\n`);

    try {
      await this.loadConfig();
      
      // Setup directories
      this.screenshotDir = path.join(__dirname, 'screenshots');
      await fs.mkdir(this.screenshotDir, { recursive: true });
      
      this.stateFilePath = path.resolve(this.config.stateFile);
      await this.loadState();
      
      this.log('info', 'Initialization complete');
      this.log('info', `Screenshots: ${this.screenshotDir}`);
      this.log('info', `Stagehand: ${Stagehand ? 'Available' : 'Not installed'}`);
      
      return true;
    } catch (error) {
      this.log('error', `Initialization failed: ${error.message}`);
      return false;
    }
  }

  async loadConfig() {
    const configPath = path.join(__dirname, 'config.json');
    const configData = await fs.readFile(configPath, 'utf8');
    this.config = JSON.parse(configData);
    this.log('info', 'Configuration loaded');
  }

  async loadState() {
    try {
      const stateData = await fs.readFile(this.stateFilePath, 'utf8');
      const savedState = JSON.parse(stateData);
      this.state = { ...this.state, ...savedState };
      this.log('info', `State loaded: ${this.state.respondedConversations.length} previously responded`);
    } catch (error) {
      this.log('info', 'No previous state found, starting fresh');
      await this.saveState();
    }
  }

  async saveState() {
    try {
      await fs.writeFile(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (error) {
      this.log('error', `Failed to save state: ${error.message}`);
    }
  }

  log(level, message) {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const levels = {
      error: { color: colors.red, prefix: '❌ ERROR' },
      warn: { color: colors.yellow, prefix: '⚠️  WARN' },
      success: { color: colors.green, prefix: '✅ SUCCESS' },
      info: { color: colors.blue, prefix: 'ℹ️  INFO' },
      debug: { color: colors.dim, prefix: '🔍 DEBUG' },
      marketplace: { color: colors.magenta, prefix: '🛒 MARKETPLACE' },
      stagehand: { color: colors.orange, prefix: '🤖 STAGEHAND' },
      recovery: { color: colors.cyan, prefix: '🔄 RECOVERY' }
    };
    
    const { color, prefix } = levels[level] || levels.info;
    console.log(`${colors.dim}[${timestamp}]${colors.reset} ${color}${prefix}${colors.reset} ${message}`);
  }

  /**
   * Capture screenshot with metadata
   */
  async captureScreenshot(context = 'unknown') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `screenshot-${context}-${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);
      
      if (this.page) {
        await this.page.screenshot({ 
          path: filepath,
          fullPage: true 
        });
        
        // Also save metadata
        const metadata = {
          timestamp: new Date().toISOString(),
          context,
          url: this.page.url(),
          screenshot: filename,
          state: this.state
        };
        
        const metaPath = filepath.replace('.png', '.json');
        await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf8');
        
        this.log('info', `Screenshot saved: ${filename}`);
        return filepath;
      }
    } catch (error) {
      this.log('error', `Failed to capture screenshot: ${error.message}`);
    }
    return null;
  }

  /**
   * Send notification (placeholder - can be extended)
   */
  async sendNotification(type, message, screenshotPath = null) {
    // Log to console
    this.log(type === 'error' ? 'error' : 'info', `[NOTIFICATION] ${message}`);
    
    // Could extend to send via:
    // - Telegram
    // - Discord webhook
    // - Email
    // - Push notification
    
    // Save notification to file for now
    const notification = {
      timestamp: new Date().toISOString(),
      type,
      message,
      screenshot: screenshotPath,
      url: this.page?.url()
    };
    
    try {
      const notifPath = path.join(__dirname, 'notifications.json');
      let notifications = [];
      try {
        const existing = await fs.readFile(notifPath, 'utf8');
        notifications = JSON.parse(existing);
      } catch (e) {
        // File doesn't exist yet
      }
      notifications.push(notification);
      await fs.writeFile(notifPath, JSON.stringify(notifications, null, 2), 'utf8');
    } catch (e) {
      // Silent fail on notification save
    }
    
    return notification;
  }

  /**
   * Start browser
   */
  async startBrowser() {
    this.log('info', 'Launching browser...');
    
    try {
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      });

      const context = await this.browser.newContext({
        viewport: this.config.browser.viewport,
        userAgent: this.config.browser.userAgent || undefined
      });

      this.page = await context.newPage();
      this.page.on('dialog', async dialog => {
        this.log('warn', `Dialog: ${dialog.message()}`);
        await dialog.accept();
      });

      this.log('success', 'Browser launched');
      return true;
    } catch (error) {
      this.log('error', `Failed to launch browser: ${error.message}`);
      return false;
    }
  }

  /**
   * Navigate to Messenger with error handling
   */
  async navigateToMessenger() {
    this.log('info', 'Navigating to messenger.com...');
    
    try {
      await this.page.goto('https://messenger.com', {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      const isLoggedIn = await this.checkIfLoggedIn();
      
      if (!isLoggedIn) {
        this.log('warn', 'Not logged in. Please log in manually.');
        console.log(`${colors.yellow}${colors.bright}Please log in to Facebook Messenger in the browser window.${colors.reset}\n`);
        await this.waitForManualLogin();
      }

      this.log('success', 'Messenger loaded');
      await this.page.waitForTimeout(3000);
      return true;
      
    } catch (error) {
      this.log('error', `Navigation failed: ${error.message}`);
      await this.handleFailure('navigation', error);
      return false;
    }
  }

  async checkIfLoggedIn() {
    try {
      const selectors = [
        '[role="navigation"]',
        '[data-testid="mw_conversations_list"]',
        '[aria-label="Chats"]'
      ];

      for (const selector of selectors) {
        const element = await this.page.$(selector);
        if (element) return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async waitForManualLogin() {
    const maxWaitTime = 300000;
    const checkInterval = 2000;
    let elapsedTime = 0;

    while (elapsedTime < maxWaitTime) {
      await this.page.waitForTimeout(checkInterval);
      elapsedTime += checkInterval;

      if (await this.checkIfLoggedIn()) {
        this.log('success', 'Login detected!');
        await this.page.waitForTimeout(3000);
        return;
      }

      if (elapsedTime % 30000 === 0) {
        this.log('info', `Waiting for login... (${elapsedTime / 1000}s)`);
      }
    }

    throw new Error('Login timeout');
  }

  /**
   * MAIN FAILURE HANDLER
   * When Playwright fails, use this recovery flow
   */
  async handleFailure(context, error) {
    this.state.playwrightFailures++;
    await this.saveState();
    
    this.log('error', `Playwright failure in ${context}: ${error.message}`);
    
    // 1. Capture screenshot
    const screenshotPath = await this.captureScreenshot(`failure-${context}`);
    
    // 2. Send notification
    await this.sendNotification('error', 
      `Playwright failure: ${context} - ${error.message}`, 
      screenshotPath
    );
    
    // 3. Try Stagehand recovery if available
    if (Stagehand && this.config.stagehand?.enabled !== false) {
      this.log('recovery', 'Attempting Stagehand recovery...');
      const recovered = await this.attemptStagehandRecovery(context, error);
      if (recovered) {
        this.state.stagehandRecoveries++;
        await this.saveState();
        this.log('success', 'Stagehand recovery successful!');
        return true;
      }
    }
    
    // 4. Log the error for later analysis
    this.state.errors.push({
      timestamp: new Date().toISOString(),
      context,
      error: error.message,
      screenshot: screenshotPath
    });
    
    return false;
  }

  /**
   * STAGEHAND FALLBACK
   * AI-powered recovery when Playwright selectors fail
   */
  async attemptStagehandRecovery(context, originalError) {
    if (!Stagehand) {
      this.log('stagehand', 'Stagehand not available');
      return false;
    }

    try {
      this.log('stagehand', 'Initializing Stagehand...');
      
      // Initialize Stagehand with current page
      this.stagehand = new Stagehand({
        page: this.page,
        modelName: this.config.stagehand?.model || 'gpt-4o',
        modelApiKey: this.config.stagehand?.apiKey || process.env.OPENAI_API_KEY,
        verbose: this.config.debugMode
      });

      await this.stagehand.init();
      
      // Define recovery actions based on context
      const recoveryActions = {
        'navigation': async () => {
          this.log('stagehand', 'Attempting to navigate to Messenger...');
          await this.stagehand.act({ 
            action: 'Navigate to https://messenger.com and wait for the page to load' 
          });
          return await this.checkIfLoggedIn();
        },
        
        'get-conversations': async () => {
          this.log('stagehand', 'Using AI to find conversations...');
          const conversations = await this.stagehand.extract({
            instruction: 'Find all conversation threads in the sidebar. For each conversation, extract: the person name, preview text, and whether there are unread messages. Return as a list.'
          });
          return conversations;
        },
        
        'open-conversation': async (conversation) => {
          this.log('stagehand', `Opening conversation: ${conversation.preview || 'unknown'}`);
          await this.stagehand.act({
            action: `Click on the conversation with preview text: "${conversation.preview?.slice(0, 50)}..."`
          });
          await this.page.waitForTimeout(2000);
          return true;
        },
        
        'send-message': async (message) => {
          this.log('stagehand', 'Sending message via AI...');
          await this.stagehand.act({
            action: `Type the message "${message.slice(0, 50)}..." into the message input box and send it`
          });
          return true;
        },
        
        'find-message-input': async () => {
          this.log('stagehand', 'Locating message input field...');
          await this.stagehand.act({
            action: 'Click on the message input field where you type messages'
          });
          return true;
        }
      };
      
      // Execute the appropriate recovery action
      if (recoveryActions[context]) {
        // Pass additional context if available
        const result = await recoveryActions[context]();
        
        if (result) {
          this.log('stagehand', `Recovery for ${context} successful`);
          
          // Document what worked
          await this.documentRecovery(context, originalError.message, 'success');
          return true;
        }
      } else {
        this.log('stagehand', `No recovery action defined for context: ${context}`);
      }
      
    } catch (stagehandError) {
      this.log('error', `Stagehand recovery failed: ${stagehandError.message}`);
      await this.documentRecovery(context, originalError.message, 'failed', stagehandError.message);
    }
    
    return false;
  }

  /**
   * Document recovery attempts for analysis
   */
  async documentRecovery(context, originalError, outcome, stagehandError = null) {
    const recoveryLog = {
      timestamp: new Date().toISOString(),
      context,
      originalError,
      outcome,
      stagehandError,
      url: this.page?.url()
    };
    
    try {
      const logPath = path.join(__dirname, 'recovery-log.json');
      let logs = [];
      try {
        const existing = await fs.readFile(logPath, 'utf8');
        logs = JSON.parse(existing);
      } catch (e) {}
      logs.push(recoveryLog);
      await fs.writeFile(logPath, JSON.stringify(logs, null, 2), 'utf8');
    } catch (e) {}
  }

  /**
   * Get conversations with fallback to Stagehand
   */
  async getConversations() {
    try {
      // Primary: Playwright approach
      const conversations = await this.getConversationsPlaywright();
      if (conversations.length > 0) {
        return conversations;
      }
      
      // If no conversations found, might be a selector issue
      this.log('warn', 'No conversations found with Playwright selectors');
      throw new Error('No conversations detected');
      
    } catch (error) {
      // Fallback: Stagehand
      const recovered = await this.handleFailure('get-conversations', error);
      if (recovered && this.stagehand) {
        // Return whatever Stagehand found (format may differ)
        return await this.getConversationsStagehand();
      }
      return [];
    }
  }

  async getConversationsPlaywright() {
    const conversations = [];
    
    const selectors = [
      '[role="listitem"]',
      '[data-testid="mw_conversation_list_item"]',
      'a[href*="/t/"]'
    ];

    for (const selector of selectors) {
      const elements = await this.page.$$(selector);
      
      for (const element of elements) {
        try {
          const conversation = await this.parseConversationElement(element);
          if (conversation) conversations.push(conversation);
        } catch (e) {
          continue;
        }
      }

      if (conversations.length > 0) break;
    }

    return conversations;
  }

  async getConversationsStagehand() {
    try {
      const result = await this.stagehand.extract({
        instruction: 'List all conversation threads visible in the sidebar. Include: sender name, message preview, and if it has unread messages. Return as JSON array.'
      });
      
      // Convert Stagehand format to our format
      return result.map(conv => ({
        text: conv.preview || conv.message || '',
        ariaLabel: conv.name || '',
        hasUnread: conv.unread || false,
        stagehand: true // Mark as Stagehand-sourced
      }));
    } catch (error) {
      this.log('error', `Stagehand conversation extraction failed: ${error.message}`);
      return [];
    }
  }

  async parseConversationElement(element) {
    try {
      const data = await element.evaluate(el => {
        return {
          text: el.textContent || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          href: el.getAttribute('href') || ''
        };
      });

      return {
        element: element,
        text: data.text,
        ariaLabel: data.ariaLabel,
        href: data.href,
        hasUnread: false,
        stagehand: false
      };
    } catch (error) {
      return null;
    }
  }

  isMarketplaceConversation(conversation) {
    const combinedText = `${conversation.text} ${conversation.ariaLabel}`.toLowerCase();
    
    for (const indicator of this.config.marketplaceIndicators) {
      if (combinedText.includes(indicator.toLowerCase())) {
        return true;
      }
    }

    const marketplacePatterns = [
      /marketplace/i,
      /is interested in/i,
      /sent an offer/i,
      /asked about/i
    ];

    for (const pattern of marketplacePatterns) {
      if (pattern.test(combinedText)) return true;
    }

    return false;
  }

  /**
   * Open conversation with Stagehand fallback
   */
  async openConversation(conversation) {
    try {
      if (conversation.stagehand) {
        // Conversation from Stagehand - use Stagehand to open
        return await this.attemptStagehandRecovery('open-conversation', new Error('Stagehand-sourced conversation'));
      }
      
      await conversation.element.click();
      await this.page.waitForTimeout(2000);
      return true;
      
    } catch (error) {
      this.log('error', `Failed to open conversation: ${error.message}`);
      return await this.handleFailure('open-conversation', error);
    }
  }

  /**
   * Send message with Stagehand fallback
   */
  async sendMessage(message) {
    try {
      // Primary: Playwright
      const inputSelectors = [
        '[role="textbox"]',
        '[contenteditable="true"]',
        'div[aria-label*="message" i]'
      ];

      let inputElement = null;
      for (const selector of inputSelectors) {
        inputElement = await this.page.$(selector);
        if (inputElement) break;
      }

      if (!inputElement) {
        throw new Error('Message input not found');
      }

      await inputElement.click();
      await this.page.waitForTimeout(500);
      await inputElement.type(message, { delay: 50 });
      await this.page.waitForTimeout(500);
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(1000);

      return true;
      
    } catch (error) {
      this.log('error', `Playwright send failed: ${error.message}`);
      
      // Fallback: Stagehand
      const recovered = await this.handleFailure('send-message', error);
      if (recovered && this.stagehand) {
        return await this.attemptStagehandRecovery('send-message', error);
      }
      return false;
    }
  }

  getConversationId(conversation) {
    return conversation.ariaLabel || conversation.text?.slice(0, 100) || 'unknown';
  }

  async processConversation(conversation) {
    const conversationId = this.getConversationId(conversation);
    this.state.totalConversationsChecked++;

    if (this.config.skipRepliedConversations && 
        this.state.respondedConversations.includes(conversationId)) {
      if (this.config.debugMode) {
        this.log('debug', `Skipping already responded: ${conversationId.slice(0, 50)}...`);
      }
      return false;
    }

    if (!this.isMarketplaceConversation(conversation)) {
      if (this.config.debugMode) {
        this.log('debug', `Not Marketplace: ${conversationId.slice(0, 50)}...`);
      }
      return false;
    }

    this.log('marketplace', `Found Marketplace conversation: ${conversationId.slice(0, 80)}`);

    // Take screenshot before responding
    await this.captureScreenshot('marketplace-found');

    const opened = await this.openConversation(conversation);
    if (!opened) return false;

    if (await this.checkIfAlreadyReplied()) {
      this.log('info', 'Already replied, skipping');
      this.state.respondedConversations.push(conversationId);
      await this.saveState();
      return false;
    }

    if (this.state.messagesSent >= this.config.maxMessagesPerSession) {
      this.log('warn', `Max messages (${this.config.maxMessagesPerSession}) reached`);
      return false;
    }

    this.log('info', `Sending auto-response to: ${conversationId.slice(0, 50)}...`);
    const sent = await this.sendMessage(this.config.autoResponseMessage);

    if (sent) {
      this.state.messagesSent++;
      this.state.respondedConversations.push(conversationId);
      this.state.lastCheckTimestamp = Date.now();
      await this.saveState();
      
      // Capture success screenshot
      await this.captureScreenshot('message-sent');
      await this.sendNotification('success', 
        `Auto-response sent to Marketplace conversation`,
        path.join(this.screenshotDir, `message-sent-${Date.now()}.png`)
      );
      
      this.log('success', `Auto-response sent! (Total: ${this.state.messagesSent})`);
      return true;
    }

    return false;
  }

  async checkIfAlreadyReplied() {
    try {
      const ourMessages = await this.page.$$('[data-testid="outgoing_message"]');
      return ourMessages.length > 0;
    } catch (error) {
      return false;
    }
  }

  async runPollingLoop() {
    this.log('info', 'Starting polling loop...');
    this.isRunning = true;

    while (this.isRunning) {
      try {
        this.log('info', 'Checking for new messages...');

        const conversations = await this.getConversations();
        this.log('info', `Found ${conversations.length} conversations`);

        let processedCount = 0;
        for (const conversation of conversations) {
          if (!this.isRunning) break;
          
          const processed = await this.processConversation(conversation);
          if (processed) processedCount++;
          
          await this.page.waitForTimeout(1000);
        }

        this.log('info', `Responded to ${processedCount} new Marketplace messages.`);
        this.log('info', `Stats: PW failures: ${this.state.playwrightFailures}, Stagehand recoveries: ${this.state.stagehandRecoveries}`);

        if (this.isRunning) {
          this.log('info', `Waiting ${this.config.pollingIntervalMs / 1000}s...`);
          await this.page.waitForTimeout(this.config.pollingIntervalMs);
        }

      } catch (error) {
        this.log('error', `Error in polling loop: ${error.message}`);
        await this.handleFailure('polling-loop', error);
        await this.page.waitForTimeout(10000);
      }
    }
  }

  async stop() {
    this.log('info', 'Stopping...');
    this.isRunning = false;
    
    if (this.stagehand) {
      try {
        await this.stagehand.close();
      } catch (e) {}
    }
    
    if (this.browser) {
      await this.browser.close();
    }

    await this.saveState();
    
    // Final summary notification
    await this.sendNotification('info', 
      `Session ended. Messages sent: ${this.state.messagesSent}, ` +
      `Playwright failures: ${this.state.playwrightFailures}, ` +
      `Stagehand recoveries: ${this.state.stagehandRecoveries}`
    );
    
    this.log('success', 'Autoresponder stopped');
  }

  async run() {
    try {
      if (!await this.initialize()) process.exit(1);
      if (!await this.startBrowser()) process.exit(1);
      if (!await this.navigateToMessenger()) process.exit(1);
      await this.runPollingLoop();
    } catch (error) {
      this.log('error', `Fatal error: ${error.message}`);
      await this.captureScreenshot('fatal-error');
    } finally {
      await this.stop();
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n' + colors.yellow + 'Shutting down...' + colors.reset);
  if (global.autoresponder) await global.autoresponder.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (global.autoresponder) await global.autoresponder.stop();
  process.exit(0);
});

// Run
(async () => {
  const autoresponder = new MessengerAutoresponder();
  global.autoresponder = autoresponder;
  await autoresponder.run();
})();
