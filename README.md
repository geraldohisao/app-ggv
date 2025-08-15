# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Web Search (optional)

To allow the assistant to fetch brief summaries from the web, set these app settings (via Settings → Preferências or SQL):

- `USE_WEB_SEARCH`: true/false
- `WEB_CONTEXT_HINT`: free text like "vendas B2B Brasil, 2024, SaaS"
- `WEB_TOPK`: number of results (default 2)
- `WEB_TIMEOUT_MS`: request timeout (default 5000)
- `G_CSE_API_KEY` and `G_CSE_CX`: Google Programmable Search credentials

When enabled, the assistant will append a short “Informações Externas” section to the RAG context when it detects low confidence or the user asks for data/methodologies. Sources are summarized and referenced.
