# LinkedIn Content System

A self-hosted content engine for LinkedIn. It scans creators you trust for inspiration, drafts posts in **your** voice (trained on your own past posts), plans your week, and hands you finished drafts in Google Docs. **Nothing ever auto-posts** - you finish and post everything yourself.

Built by [Tom Hunt](https://tomhunt.io), founder & CEO of [Fame](https://fame.so) (we start and grow B2B podcasts), as a "you could build this yourself now" experiment. Open-sourced so you can too.

> **The pitch:** three years ago this was a $20-50k custom build or an expensive SaaS subscription. Now it's a weekend, some evenings, and an AI that writes in your voice.

---

## What it does

- **📅 Weekly planner** - a 3-week board with a per-day content cadence (repost / case study / rotating pillars), plus an idea bank you triage and draft from.
- **💡 Daily feeder** - each morning it scans a list of creators you choose, surfaces their best recent posts into an **Inspiration** feed, and auto-writes one "draft of the day" from the strongest.
- **✍️ A writer trained on you** - drafts key off *your* voice guide and a corpus of *your own* real posts, so they sound like you, not ChatGPT.
- **👥 Editable creator list** - add or pause the creators the scan watches, from the dashboard.
- **🧩 Chrome extension** - save any LinkedIn post to your bank (with the real permalink) and add any profile to your daily scan, straight from LinkedIn.
- **📄 Google Docs output** - every draft lands in its own Google Doc, ready to edit; plus a "Copy for LinkedIn" button.
- **📷 Suggest a photo** - matches a post to a shot from your photo library.

The whole thing is model-free at rest (a static dashboard + a tiny local server + JSON files). The AI parts - drafting, scanning, captioning - run in Claude Code.

---

## How it fits together

```
Feeder (Claude Code, daily) ── scans your creators ──▶ Inspiration feed + idea bank
                                                              │
You (dashboard) ── slot / add notes / click "Draft" ─────────┤
                                                              ▼
Writer (Claude Code) ── drafts in your voice ──▶ Google Doc + bank
                                                              │
You ── Copy for LinkedIn ──▶ paste into LinkedIn ──▶ post / schedule (natively)
```

- `dashboard/` - the web dashboard (static HTML/JS).
- `serve.py` - a tiny local server: serves the dashboard and persists changes to the JSON files.
- `data/` - your content: `ideas.json` (the bank), `creators.json` (who the scan watches), `inspiration.json`, `photos.json`.
- `prompts/`, `voice-guide.md`, `voice-examples.md` - how the writer sounds (this is the bit you make your own).
- `chrome-extension/` - the LinkedIn helper (load unpacked).
- Scheduled tasks (feeder / sweeper / weekly-draft) run in Claude Code and read/write `data/`.

---

## Quick start

**Requirements:** Python 3, and [Claude Code](https://claude.com/claude-code) for the AI parts (drafting, scanning).

1. **Clone** this repo.
2. **Run the dashboard:**
   ```bash
   python3 serve.py
   ```
   Open **http://localhost:8000/dashboard/**.
3. **Make it yours:** edit `voice-guide.md` (how your posts sound) and `data/creators.json` (who to scan). Drop a few of your best past posts into `voice-examples.md`.
4. **The AI parts:** open the folder in Claude Code and use the prompts in `prompts/` (feeder + weekly-draft), or set them up as scheduled tasks. Drafting uses the `linkedin-writer` agent, which reads your voice guide + examples.
5. **Chrome extension (optional):** `chrome://extensions` → enable Developer mode → **Load unpacked** → select `chrome-extension/`.

> The Google Docs and Google Drive photo features assume you're driving them through Claude Code with a Google Drive connector. They're optional - the core planner + writer work without them.

---

## Make the writer sound like *you*

This is the part that matters. Out of the box the voice guide is a template. To get drafts that sound like you:

1. Rewrite `voice-guide.md` in your own terms - your hooks, your enemies, your rules.
2. Paste 15-20 of your best real posts into `voice-examples.md` (with a line on why each works). The writer pattern-matches against these.

Garbage in, garbage out - a thin voice guide gives thin drafts. Ten minutes here is the highest-leverage thing you'll do.

---

## Philosophy

- **Nothing auto-posts.** The tool drafts; you decide, edit, and post. That guardrail is deliberate.
- **Substance over vanity.** It optimises for posts you'd actually want to publish, not engagement bait.
- **Yours to break.** It's a starting point, not a product. Fork it, rip bits out, rebuild it.

---

## Built by

[**Tom Hunt**](https://tomhunt.io) - founder & CEO of [**Fame**](https://fame.so), the B2B podcast agency. If this is useful, come say hi on [LinkedIn](https://www.linkedin.com/in/tomhuntio/).

## License

MIT - see [LICENSE](LICENSE). Do what you like with it.
