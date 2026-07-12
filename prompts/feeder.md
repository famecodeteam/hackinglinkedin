# Feeder — LinkedIn scan prompt

Run daily (or on a schedule). Harvests inspiration into the idea bank. Does NOT write finished posts — it drops 5–8 short, pillar-tagged IDEAS. You draft from them later.

Time-box to ~15 minutes.

**How to run it:** paste this prompt into Claude Code (with the repo folder open). LinkedIn blocks plain HTTP, so you need a **browser tool** — [Claude in Chrome](https://www.anthropic.com/claude-in-chrome) or a Playwright MCP — and to be **signed into LinkedIn** in that browser. To run it automatically each morning, see the README section "Run the scanner & drafter".

## What to do

1. Read `voice-guide.md` (for phrasing hooks) and `pillars.md` (for pillars/enemies).
2. Scan LinkedIn across your pillars. Read your creator list from `data/creators.json` and scan the active ones — visit each creator's recent-activity page (`https://www.linkedin.com/in/<handle>/recent-activity/all/`) and read their latest posts.
   Then do an open-web keyword search for any thin pillars. Example keywords:
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

LinkedIn blocks plain HTTP fetching, so use a browser tool (Claude in Chrome or a Playwright MCP) while signed into LinkedIn. Optional token-saver: have Claude write a small Playwright script that extracts each post's text + reaction count into JSON, and only use the model to phrase the hooks — that keeps most of the run out of the model.

> Note: `data/inbox/` is where daily idea files land before they're merged into `data/ideas.json` (step 6). It ships empty — the feeder creates dated files in it.
