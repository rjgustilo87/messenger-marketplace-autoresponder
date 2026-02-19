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

```bash
cd messenger-autoresponder
npm install
```

### Optional: Install Stagehand for AI fallback

```bash
npm install @browserbasehq/stagehand
```

You'll also need an OpenAI API key:
```bash
export OPENAI_API_KEY="sk-..."
```

Or add to config.json:
```json
"stagehand": {
  "apiKey": "sk-..."
}
```

## Configuration

Edit `config.json`:

```json
{
  "autoResponseMessage": "Your custom message here",
  "pollingIntervalMs": 30000,
  "headless": false,
  "marketplaceIndicators": ["Marketplace", "is interested in"],
  
  "stagehand": {
    "enabled": true,
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
| `autoResponseMessage` | Message sent to Marketplace inquiries |
| `pollingIntervalMs` | Check frequency (default: 30s) |
| `headless` | Run without visible browser |
| `stagehand.enabled` | Enable AI fallback |
| `stagehand.model` | AI model (gpt-4o, claude-3-opus, etc.) |
| `stagehand.maxRecoveriesPerSession` | Limit AI calls per session |
| `notifications.onError` | Alert when Playwright fails |
| `notifications.onRecovery` | Alert when Stagehand fixes something |

## Usage

```bash
npm start
```

### First Run

1. Browser opens to messenger.com
2. **Log in manually** (if not already logged in)
3. Script detects login and starts monitoring
4. Automatically responds to Marketplace messages
5. If Playwright fails, Stagehand AI takes over

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
npm install @browserbasehq/stagehand
export OPENAI_API_KEY="sk-..."
```

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
