# Feeder — LinkedIn scan prompt

Run daily (or on a schedule). Harvests inspiration into the idea bank. Does NOT write finished posts — it drops 5–8 short, pillar-tagged IDEAS. You draft from them later.

Time-box to ~15 minutes.

## What to do

1. Read `voice-guide.md` (for phrasing hooks) and `pillars.md` (for pillars/enemies).
2. Scan LinkedIn across the five pillars. Read your creator list from data/creators.json (scan the active ones). Visit each .
   Then open-web keyword search for thin pillars — especially Marketing and AI. Keywords:
   - Workplace: "toxic boss", "quit my job", "bad manager signs", "return to office", "micromanagement"
   - Business: "bootstrapped", "turned down VC", "profitable not fundable", "cashflow"
   - Marketing: "B2B podcast", "content that converts", "we stopped cold outreach"
   - AI: "vibe coding", "built an internal tool", "replaced a SaaS", "shipped in a weekend"
3. Pick the 5–8 strongest, most on-brand (matching your voice guide) posts (strong opinion / surprising observation / personal story — NOT listicles or corporate posts). Cover as many pillars as you can. For AI and Wildcard (hard to source from others), generate 1–2 idea-prompts each based on building-in-public / founder-diary angles, marked `"source":"prompt"`.
4. Write each as a SHORT idea (not a finished post): `hook` (phrased how you open), `note` (1-line angle), `pillar`, `source` (creator name or "prompt").
5. Save to `data/inbox/ideas-YYYY-MM-DD.json` in this shape:

```json
{ "source": "feeder", "run": "YYYY-MM-DD", "ideas": [
  { "id": "YYYY-MM-DD-1", "pillar": "Workplace", "hook": "...", "note": "...", "source": "Creator Name" }
] }
```

6. Merge the new ideas into `data/ideas.json` (append, dedupe by `id`).

## LinkedIn access

LinkedIn blocks plain HTTP fetching, so use a browser MCP (Claude in Chrome or Playwright). To save tokens, prefer a small Node/Playwright script that extracts post text + reaction counts and writes the JSON — only use the model for phrasing the hooks. See README "Feeder as a script".
