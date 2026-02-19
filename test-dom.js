/**
 * DOM Structure Test Script
 * Navigates to messenger.com and documents the DOM for message detection
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;

async function testNavigation() {
  console.log('🔍 Testing navigation to messenger.com...\n');

  let browser;
  
  try {
    // Launch browser
    browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();

    // Navigate to messenger.com
    console.log('📍 Navigating to https://messenger.com...');
    await page.goto('https://messenger.com', {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    console.log(`✅ Loaded: ${page.url()}`);
    console.log(`📄 Title: ${await page.title()}`);

    // Wait a moment for any dynamic content
    await page.waitForTimeout(3000);

    // Document the DOM structure
    console.log('\n🔍 Analyzing DOM structure...');

    const domInfo = await page.evaluate(() => {
      const info = {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString(),
        selectors: {
          loginPage: {
            emailInputs: document.querySelectorAll('input[type="email"], input[name="email"]').length,
            passwordInputs: document.querySelectorAll('input[type="password"], input[name="pass"]').length,
            submitButtons: document.querySelectorAll('button[type="submit"]').length,
            loginForms: document.querySelectorAll('form').length
          },
          messengerInterface: {
            conversationLists: document.querySelectorAll('[role="list"], [role="listitem"]').length,
            navigationElements: document.querySelectorAll('[role="navigation"]').length,
            chatContainers: document.querySelectorAll('[role="main"], [role="complementary"]').length
          }
        },
        ariaLabels: [],
        dataTestIds: [],
        classes: [],
        potentialSelectors: []
      };

      // Collect aria-labels
      const elementsWithAria = document.querySelectorAll('[aria-label]');
      const ariaSet = new Set();
      for (const el of elementsWithAria) {
        const label = el.getAttribute('aria-label');
        if (label && label.length > 0 && label.length < 100) {
          ariaSet.add(label);
        }
      }
      info.ariaLabels = Array.from(ariaSet).slice(0, 30);

      // Collect data-testid attributes
      const testIdElements = document.querySelectorAll('[data-testid]');
      const testIdSet = new Set();
      for (const el of testIdElements) {
        testIdSet.add(el.getAttribute('data-testid'));
      }
      info.dataTestIds = Array.from(testIdSet).slice(0, 30);

      // Collect interesting class names
      const allElements = document.querySelectorAll('*');
      const classSet = new Set();
      for (const el of allElements) {
        for (const cls of el.classList) {
          if (cls.includes('conversation') || 
              cls.includes('message') || 
              cls.includes('chat') ||
              cls.includes('inbox') ||
              cls.includes('list') ||
              cls.includes('item')) {
            classSet.add(cls);
          }
        }
      }
      info.classes = Array.from(classSet).slice(0, 30);

      // HTML structure snapshot
      info.bodyHTML = document.body.innerHTML.slice(0, 2000);

      // Login page detection
      info.isLoginPage = info.selectors.loginPage.emailInputs > 0 || 
                         info.selectors.loginPage.passwordInputs > 0;

      return info;
    });

    // Save DOM structure
    const outputPath = './dom-structure-test.json';
    await fs.writeFile(outputPath, JSON.stringify(domInfo, null, 2), 'utf8');

    // Print summary
    console.log('\n📊 DOM Structure Summary:');
    console.log('========================');
    console.log(`Is Login Page: ${domInfo.isLoginPage ? 'Yes' : 'No'}`);
    console.log(`Email inputs: ${domInfo.selectors.loginPage.emailInputs}`);
    console.log(`Password inputs: ${domInfo.selectors.loginPage.passwordInputs}`);
    console.log(`Login forms: ${domInfo.selectors.loginPage.loginForms}`);
    console.log(`List/ListItem elements: ${domInfo.selectors.messengerInterface.conversationLists}`);
    console.log(`Navigation elements: ${domInfo.selectors.messengerInterface.navigationElements}`);
    
    console.log(`\n📝 Aria Labels found: ${domInfo.ariaLabels.length}`);
    if (domInfo.ariaLabels.length > 0) {
      console.log('  Sample labels:', domInfo.ariaLabels.slice(0, 5).join(', '));
    }

    console.log(`\n🧪 Data-testid attributes found: ${domInfo.dataTestIds.length}`);
    if (domInfo.dataTestIds.length > 0) {
      console.log('  Sample testids:', domInfo.dataTestIds.slice(0, 5).join(', '));
    }

    console.log(`\n📁 Full DOM structure saved to: ${outputPath}`);

    // Recommendations
    console.log('\n💡 Recommendations for message detection:');
    if (domInfo.isLoginPage) {
      console.log('  • Page is showing login form - need to authenticate first');
      console.log('  • Login selectors to use:');
      console.log('    - input[type="email"] or input[name="email"]');
      console.log('    - input[type="password"] or input[name="pass"]');
      console.log('    - button[type="submit"]');
    }
    
    if (domInfo.selectors.messengerInterface.conversationLists > 0) {
      console.log('  • Conversation list elements detected!');
      console.log('  • Use [role="listitem"] to find individual conversations');
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testNavigation();
