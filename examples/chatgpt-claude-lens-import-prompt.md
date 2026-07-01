# Import your lens from ChatGPT or Claude

Users already brainstorm projects and learning goals in ChatGPT or Claude with **memory on**. The app serves a copy-paste prompt from [`prompts/lens-import-from-chatbot.md`](../prompts/lens-import-from-chatbot.md) that asks the chatbot to **summarize what it already knows about you** for **Your Unique Lens**.

**Flow**

1. Open **Your Unique Lens** → **Copy import prompt** (loads from `GET /api/profile/lens-import-prompt`)
2. Paste in ChatGPT or Claude
3. Paste the response → **Apply to form** → **Save lens**

Edit the prompt in `prompts/lens-import-from-chatbot.md` (body after the `---` separator line).
