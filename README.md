# Facebook Messenger Marketplace Autoresponder 🤖

**Hybrid Architecture: Playwright + Stagehand AI Fallback**

Automatically respond to Facebook Marketplace messages on Messenger.com. Uses Playwright as the primary engine, with Stagehand AI as a fallback when UI changes break selectors.

## ✨ Key Features

- 🔍 **Marketplace Detection** - Identifies Marketplace messages automatically
- 💬 **Auto-Response** - Sends customizable replies to new inquiries
- 🧠 **Hybrid Architecture** - Playwright (fast) + Stagehand AI (resilient)
- 📸 **Auto-Screenshots** - Captures screen on errors and successes
- 🔔 **Notifications** - Alerts you when things go wrong or recovery happens
- 🔄 **Smart Recovery** - AI steps in when Playwright fails
- 📊 **Recovery Analytics** - Tracks which approach works best

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Request                         │
└──────────────────┬──────────────────────────────────────┘
                   │
         ┌─────────▼──────────┐
         │   Playwright       │ ◄── Primary (fast, cheap)
         │   (CSS selectors)  │
         └─────────┬──────────┘
                   │ Success?
          ┌────────┴────────┐
          ▼                 ▼
      [Continue]       [Failure]
                            │
                    ┌───────▼────────┐
                    │  1. Screenshot │
                    │  2. Notify you │
                    │  3. Stagehand  │ ◄── Fallback (AI-powered)
                    │     Recovery   │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │ Document what  │
                    │ worked for     │
                    │ future runs    │
                    └────────────────┘
```

## Installation

Use Node.js 22 (`nvm use` if you use nvm). Install the locked dependencies,
then verify the source and local browser without contacting Messenger or sending messages:

```bash
cd messenger-marketplace-autoresponder
npm ci
npm run build
npm test
npm run check-setup
```

`build` checks JavaScript syntax; this app runs directly in Node.js and has no
compiled bundle. `check-setup` validates configuration without displaying values
and launches Chromium against an offline page. It does not start the autoresponder.
`npm ci` also installs Playwright's Chromium browser through the postinstall script.
If Chromium needs reinstalling, run `npx playwright install chromium`.
Linux prerequisites are documented in [SYSTEM_DEPS.md](SYSTEM_DEPS.md).

### Optional: Stagehand AI fallback

Stagehand is already included in the locked dependencies, but fallback is disabled
in the default configuration. Local Playwright setup requires no API credentials.

If you later choose AI fallback, provide `OPENAI_API_KEY` through your local
environment and set `stagehand.enabled` to `true`. Keep `stagehand.apiKey` null:
`config.json` is tracked and must not contain credentials. The app does not load
`.env` files automatically. The local setup check only verifies key presence;
it does not verify AI recovery against Messenger.

## Configuration

Edit `config.json`:

```json
{
  "autoResponseMessage": "Your custom message here",
  "pollingIntervalMs": 30000,
  "headless": false,
  "marketplaceIndicators": ["Marketplace", "is interested in"],
  
  "stagehand": {
    "enabled": false,
    "model": "gpt-4o",
    "fallbackOnFailure": true,
    "maxRecoveriesPerSession": 10
  },
  
  "notifications": {
    "onError": true,
    "onRecovery": true,
    "onMessageSent": true
  }
}
```

### Config Options

| Option | Description |
|--------|-------------|
| `autoResponseMessage` | Legacy fixed reply; container inquiry rules now choose the reply |
| `pollingIntervalMs` | Check frequency (default: 30s) |
| `headless` | Run without visible browser |
| `stagehand.enabled` | Enable AI fallback |
| `stagehand.model` | AI model (gpt-4o, claude-3-opus, etc.) |
| `stagehand.maxRecoveriesPerSession` | Limit AI calls per session |
| `notifications.onError` | Alert when Playwright fails |
| `notifications.onRecovery` | Alert when Stagehand fixes something |

## Usage

Before starting, review the inquiry replies below, `marketplaceIndicators`,
`pollingIntervalMs`, `maxMessagesPerSession`, and `skipRepliedConversations` in
`config.json`.
Keep `headless: false` for manual login. Notifications currently go only to the
console and local files; they do not require a notification service account.

The following command starts live monitoring and can send replies as soon as
login is detected. It is separate from the offline setup check:

```bash
npm start
```

### First Run

1. Browser opens to messenger.com
2. **Log in manually** (if not already logged in)
3. Script detects login and starts monitoring
4. Automatically responds to Marketplace messages
5. If Playwright fails, Stagehand AI takes over

Step 5 applies only when AI fallback is enabled. Stop the app with Ctrl+C.
The browser uses a fresh context on each launch, so expect to log in again;
`state.json` tracks replies and does not store login cookies. Treat screenshots,
state, and notification files as private account data.

### Container inquiry replies

The app selects one first reply from the first incoming message rendered in the
open conversation. Replies are defined in `inquiry-replies.js`; no AI key is needed.

| Initial inquiry contains | Reply |
| --- | --- |
| ZIP, size, and used/new condition | Hi! Thanks for reaching out. What do you plan to use the container for, and when do you need it delivered? |
| ZIP and size | Hi! Thanks for reaching out. Do you prefer a used or new container, and when do you need it delivered? |
| Availability question or other incomplete inquiry | Hi! Thanks for your interest. What is your delivery ZIP code, and what container size are you looking for? |

The most complete matching rule wins. ZIP recognition accepts U.S. five-digit and
ZIP+4 codes. Sizes include 10, 20, 40, 45, and 53 feet with unit/container context,
or comma-separated size/ZIP shorthand. Condition recognition accepts used, new,
one-trip, and 1-trip; conflicting or negated choices ask for clarification.
These are keyword rules, so ambiguous wording can still require human review.
The legacy `autoResponseMessage` is no longer used by this reply path.

Extraction uses the repository's documented `incoming_message` marker inside a
conversation container, preferring its `message_text` children. Sidebar previews
and listing titles are excluded. If incoming text cannot be read, no reply is sent
and the conversation is left eligible for a later check. These selectors require
verification against the logged-in Messenger UI before live use. If Messenger
only renders recent history, the first rendered incoming bubble may not be the
original message; this app does not load older history. Existing already-replied
checks still apply: this is a first-reply workflow, not a multi-turn qualification bot.

## 📁 Output Files

| File | Purpose |
|------|---------|
| `state.json` | Tracks responded conversations |
| `screenshots/` | Screenshots on errors/successes |
| `notifications.json` | Alert history |
| `recovery-log.json` | What failed and how it was fixed |
| `dom-structure.json` | DOM analysis for debugging |

## 🔄 How Recovery Works

When Playwright can't find an element (Facebook changed their UI):

1. **Screenshot captured** → `screenshots/failure-{context}-{timestamp}.png`
2. **Notification sent** → Logged to console + `notifications.json`
3. **Stagehand activates** → AI analyzes the page
4. **Natural language action** → "Click the message input box"
5. **Success documented** → `recovery-log.json` tracks what worked

### Example Recovery Flow

```
[13:45:12] ❌ ERROR Playwright failure in send-message: Message input not found
[13:45:12] ℹ️  INFO Screenshot saved: screenshot-failure-send-message-2024-...
[13:45:12] ℹ️  INFO [NOTIFICATION] Playwright failure: send-message
[13:45:13] 🔄 RECOVERY Attempting Stagehand recovery...
[13:45:13] 🤖 STAGEHAND Initializing Stagehand...
[13:45:15] 🤖 STAGEHAND Sending message via AI...
[13:45:18] ✅ SUCCESS Stagehand recovery successful!
```

## 🛠️ Troubleshooting

### "Stagehand not installed"
```bash
npm ci
```

Keep fallback disabled unless you have intentionally configured an AI key.

### Too many Playwright failures
- Check `screenshots/` to see what's happening
- Review `recovery-log.json` for patterns
- Facebook may have changed UI significantly

### Stagehand quota exceeded
- Set `"stagehand.enabled": false` in config
- Or increase `maxRecoveriesPerSession`
- Check OpenAI billing dashboard

### Not detecting Marketplace conversations
Add more indicators to config:
```json
"marketplaceIndicators": [
  "Marketplace",
  "is interested in",
  "sent an offer",
  "asked about",
  "availability",
  "still available"
]
```

## 📊 Analytics

The script tracks:
- Messages sent
- Playwright failures
- Stagehand recoveries
- Error patterns

View stats in real-time:
```
Stats: PW failures: 3, Stagehand recoveries: 3
```

## 💡 Pro Tips

1. **Check screenshots/** regularly - you'll see exactly what the bot sees
2. **Review recovery-log.json** - helps tune selectors when patterns emerge
3. **Set maxRecoveriesPerSession** - prevents runaway API costs if UI breaks completely
4. **Keep debugMode on** initially - helps you understand what's happening
5. **Use headless: false** - you can take over manually if needed

## 🔒 Safety

- Max 50 messages per session (configurable)
- Won't spam same conversation twice
- Stagehand has recovery limit
- All actions are logged
- Screenshots preserve evidence

## ⚠️ Disclaimer

This tool is for personal use. Using automation on Facebook may violate their Terms of Service. The hybrid approach (especially Stagehand) is designed to be more resilient but not undetectable. Use at your own risk.

## License

MIT
