# SAK-020.1 — Catalog Expansion Architecture

## Release target

- Existing tools: 23
- Planned additions: 77
- Target catalog: 100
- Primary categories: 12
- Maximum new published tools per batch: 15

## Categories

### دستیارهای هوش مصنوعی و جست‌وجو (`ai-assistants`)

10 ابزار؛ 4 فعلی و 6 جدید.

- `chatgpt` — ChatGPT — existing
- `claude` — Claude — existing
- `gemini` — Gemini — existing
- `perplexity` — Perplexity — existing
- `microsoft-copilot` — Microsoft Copilot — planned
- `grok` — Grok — planned
- `deepseek` — DeepSeek — planned
- `le-chat` — Le Chat — planned
- `poe` — Poe — planned
- `you-com` — You.com — planned

### برنامه‌نویسی با هوش مصنوعی (`ai-coding`)

10 ابزار؛ 2 فعلی و 8 جدید.

- `cursor` — Cursor — existing
- `github-copilot` — GitHub Copilot — existing
- `claude-code` — Claude Code — planned
- `openai-codex` — OpenAI Codex — planned
- `replit` — Replit — planned
- `windsurf` — Windsurf — planned
- `amazon-q-developer` — Amazon Q Developer — planned
- `tabnine` — Tabnine — planned
- `qodo` — Qodo — planned
- `sourcegraph-cody` — Sourcegraph Cody — planned

### ساخت سایت و اپلیکیشن (`app-website-builders`)

10 ابزار؛ 5 فعلی و 5 جدید.

- `bolt` — Bolt — existing
- `lovable` — Lovable — existing
- `v0` — v0 — existing
- `framer` — Framer — existing
- `webflow` — Webflow — existing
- `wix` — Wix — planned
- `squarespace` — Squarespace — planned
- `bubble` — Bubble — planned
- `softr` — Softr — planned
- `glide` — Glide — planned

### طراحی و تولید تصویر (`design-image`)

9 ابزار؛ 2 فعلی و 7 جدید.

- `canva` — Canva — existing
- `midjourney` — Midjourney — existing
- `figma` — Figma — planned
- `adobe-firefly` — Adobe Firefly — planned
- `leonardo-ai` — Leonardo AI — planned
- `ideogram` — Ideogram — planned
- `krea` — Krea — planned
- `clipdrop` — Clipdrop — planned
- `remove-bg` — remove.bg — planned

### ویدیو، صدا و موسیقی (`video-audio-music`)

9 ابزار؛ 2 فعلی و 7 جدید.

- `runway` — Runway — existing
- `suno` — Suno — existing
- `elevenlabs` — ElevenLabs — planned
- `descript` — Descript — planned
- `capcut` — CapCut — planned
- `veed` — VEED — planned
- `synthesia` — Synthesia — planned
- `heygen` — HeyGen — planned
- `pika` — Pika — planned

### نویسندگی، محتوا و سئو (`writing-seo`)

8 ابزار؛ 0 فعلی و 8 جدید.

- `jasper` — Jasper — planned
- `copy-ai` — Copy.ai — planned
- `grammarly` — Grammarly — planned
- `quillbot` — QuillBot — planned
- `writesonic` — Writesonic — planned
- `surfer-seo` — Surfer SEO — planned
- `semrush` — Semrush — planned
- `ahrefs` — Ahrefs — planned

### مدیریت کار و بهره‌وری (`productivity`)

9 ابزار؛ 2 فعلی و 7 جدید.

- `asana` — Asana — existing
- `trello` — Trello — existing
- `clickup` — ClickUp — planned
- `monday` — monday.com — planned
- `linear` — Linear — planned
- `todoist` — Todoist — planned
- `basecamp` — Basecamp — planned
- `airtable` — Airtable — planned
- `slack` — Slack — planned

### یادداشت، دانش و جلسه (`notes-knowledge`)

8 ابزار؛ 2 فعلی و 6 جدید.

- `notion` — Notion — existing
- `miro` — Miro — existing
- `obsidian` — Obsidian — planned
- `evernote` — Evernote — planned
- `notebooklm` — NotebookLM — planned
- `otter-ai` — Otter.ai — planned
- `fireflies-ai` — Fireflies.ai — planned
- `granola` — Granola — planned

### اتوماسیون و بدون کد (`automation-no-code`)

8 ابزار؛ 1 فعلی و 7 جدید.

- `zapier` — Zapier — existing
- `make` — Make — planned
- `n8n` — n8n — planned
- `ifttt` — IFTTT — planned
- `power-automate` — Microsoft Power Automate — planned
- `pabbly-connect` — Pabbly Connect — planned
- `activepieces` — Activepieces — planned
- `bardeen` — Bardeen — planned

### فروش، فرم و زمان‌بندی (`commerce-forms-scheduling`)

7 ابزار؛ 3 فعلی و 4 جدید.

- `shopify` — Shopify — existing
- `typeform` — Typeform — existing
- `calendly` — Calendly — existing
- `stripe` — Stripe — planned
- `gumroad` — Gumroad — planned
- `tally` — Tally — planned
- `jotform` — Jotform — planned

### بازاریابی، CRM و پشتیبانی (`marketing-crm-support`)

6 ابزار؛ 0 فعلی و 6 جدید.

- `hubspot` — HubSpot — planned
- `salesforce` — Salesforce — planned
- `mailchimp` — Mailchimp — planned
- `intercom` — Intercom — planned
- `zendesk` — Zendesk — planned
- `buffer` — Buffer — planned

### داده، تحلیل و گزارش‌گیری (`data-analytics`)

6 ابزار؛ 0 فعلی و 6 جدید.

- `google-analytics` — Google Analytics — planned
- `mixpanel` — Mixpanel — planned
- `amplitude` — Amplitude — planned
- `tableau` — Tableau — planned
- `power-bi` — Microsoft Power BI — planned
- `metabase` — Metabase — planned

## Migration rules

- هر ابزار فقط یک دسته اصلی دارد.
- دسته‌های ثانویه از طریق Tag و Search پوشش داده می‌شوند.
- ابزارهای جدید ابتدا Draft هستند.
- هیچ Batch بیشتر از ۱۵ ابزار جدید منتشر نمی‌کند.
- انتشار بدون محتوا، لوگو و QA ممنوع است.
- مسیر قدیمی `website-commerce` بعداً Redirect می‌شود.
- مسیر قدیمی `development-automation` بعداً Redirect می‌شود.
