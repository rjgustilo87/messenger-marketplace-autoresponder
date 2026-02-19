{
  "version": "1.0.0",
  "documentation_date": "2026-02-19",
  "source": "Facebook Messenger (messenger.com)",
  "note": "Facebook frequently updates their DOM structure. These selectors may need updating.",
  
  "selectors": {
    "login_page": {
      "description": "Selectors for the login page",
      "email_input": [
        "input[type='email']",
        "input[name='email']",
        "input[data-testid='royal_email']",
        "#email"
      ],
      "password_input": [
        "input[type='password']",
        "input[name='pass']",
        "input[data-testid='royal_pass']",
        "#pass"
      ],
      "login_button": [
        "button[type='submit']",
        "button[data-testid='royal_login_button']",
        "button[name='login']"
      ]
    },

    "conversation_list": {
      "description": "Selectors for the conversation list sidebar",
      "container": [
        "[role='navigation']",
        "[data-testid='mw_conversations_list']",
        "[aria-label='Chats']"
      ],
      "conversation_items": [
        "[role='listitem']",
        "[data-testid='mw_conversation_list_item']",
        "a[href*='/t/']",
        "div[role='listitem']"
      ],
      "unread_indicators": [
        "[aria-label*='unread']",
        "[aria-label*='Unread']",
        ".x6s0dn4.x78zum5",
        "span[aria-label*='unread']"
      ]
    },

    "conversation_detail": {
      "description": "Selectors for individual conversation view",
      "message_container": [
        "[role='main']",
        "[data-testid='message_container']",
        "[aria-label*='Conversation']"
      ],
      "messages": [
        "[data-testid='message_text']",
        ".x1yc5d2u",
        "div[role='none'] > div"
      ],
      "outgoing_messages": [
        "[data-testid='outgoing_message']",
        ".x1yc5d2u.xqmdsaz"
      ],
      "incoming_messages": [
        "[data-testid='incoming_message']",
        ".x1yc5d2u:not(.xqmdsaz)"
      ]
    },

    "message_input": {
      "description": "Selectors for the message input field",
      "input_field": [
        "[role='textbox']",
        "[contenteditable='true']",
        "[data-testid='mw_text_input']",
        "[aria-label*='message']",
        "[aria-label*='Message']",
        "[placeholder*='message']",
        "[placeholder*='Message']"
      ],
      "send_button": [
        "[aria-label='Send']",
        "[data-testid='send_button']",
        "button[type='submit']"
      ]
    }
  },

  "marketplace_detection": {
    "description": "Patterns to identify Marketplace conversations",
    "text_indicators": [
      "Marketplace",
      "is interested in",
      "sent an offer",
      "asked about availability",
      "availability",
      "about your listing",
      "listing",
      "item",
      "price",
      "buy",
      "sell",
      "offer"
    ],
    "aria_patterns": [
      "Marketplace",
      "interested",
      "offer",
      "availability"
    ]
  },

  "dom_structure": {
    "login_page_structure": {
      "description": "HTML structure when not logged in",
      "key_elements": [
        "Form with email/password inputs",
        "Submit button for login",
        "Possible 2FA challenge page"
      ]
    },
    "logged_in_structure": {
      "description": "HTML structure when logged in",
      "main_sections": [
        {
          "name": "Left Sidebar - Conversation List",
          "attributes": {
            "role": "navigation",
            "aria-label": "Chats"
          },
          "children": [
            {
              "element": "div[role='listitem']",
              "contains": [
                "Profile picture",
                "Conversation name",
                "Last message preview",
                "Timestamp",
                "Unread indicator (if applicable)"
              ]
            }
          ]
        },
        {
          "name": "Main Content - Conversation View",
          "attributes": {
            "role": "main"
          },
          "children": [
            {
              "element": "Message bubbles",
              "attributes": [
                "data-testid for outgoing/incoming"
              ]
            },
            {
              "element": "Input area",
              "attributes": [
                "contenteditable",
                "role='textbox'"
              ]
            }
          ]
        }
      ]
    }
  },

  "automation_notes": {
    "login_handling": [
      "Check for login form elements",
      "Wait for user to log in manually",
      "Detect successful login by checking for conversation list"
    ],
    "conversation_detection": [
      "Query all [role='listitem'] elements in the sidebar",
      "Extract aria-label and text content",
      "Check for Marketplace keywords",
      "Look for unread indicators"
    ],
    "message_sending": [
      "Click on the message input (contenteditable div)",
      "Type the message",
      "Press Enter to send",
      "Wait for message to appear in the conversation"
    ],
    "rate_limiting": [
      "Add delays between actions (1-2 seconds)",
      "Limit total messages per session",
      "Use realistic typing delays"
    ]
  },

  "facebook_classes": {
    "description": "Common Facebook CSS classes (can change frequently)",
    "note": "Classes starting with 'x' are auto-generated and change often",
    "examples": [
      "x9f619 - Common container class",
      "x1n2onr6 - Common layout class",
      "x1ja2u2z - Common wrapper class",
      "x6s0dn4 - Often used for unread indicators",
      "x78zum5 - Common flexbox utility"
    ]
  },

  "troubleshooting": {
    "selectors_not_found": [
      "Check if logged in (look for login form)",
      "Wait longer for page load",
      "Check for aria-label changes",
      "Look for new data-testid attributes"
    ],
    "messages_not_sending": [
      "Ensure conversation is open",
      "Check if input is focused",
      "Verify input is contenteditable",
      "Add longer delays between actions"
    ],
    "rate_limiting_detected": [
      "Increase polling interval",
      "Reduce message sending frequency",
      "Add random delays",
      "Use non-headless mode"
    ]
  }
}