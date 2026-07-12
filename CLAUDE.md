# LinkedIn Content System — Claude Code project

A personal LinkedIn content engine. **Your job (as the AI): produce starting drafts in the owner's voice and keep the idea bank fed. Nothing here ever auto-posts.**

## How the system works

Flow: **feeder harvests inspiration → idea bank (`data/ideas.json`) → draft in the owner's voice → they finish & post manually.**

- `voice-guide.md` — the single source of truth for how the owner's posts sound. Read it before writing ANY draft.
- `voice-examples.md` — a corpus of the owner's real posts. Pattern-match every draft against these.
- `pillars.md` — the content pillars and weekday cadence.
- `data/ideas.json` — the idea bank (canonical store). Array of items. Read/edit directly.
- `data/creators.json` — the creators the daily feeder scans.
- `data/inspiration.json` — posts the scan surfaced.
- `dashboard/index.html` — a local dashboard (served by `serve.py`). Reads/writes the data files.
- `prompts/feeder.md` — the recurring scan prompt.
- `prompts/weekly-draft.md` — the weekly batch-drafting prompt.
- `.claude/agents/linkedin-writer.md` — the writer subagent. Delegate drafting to it so every draft follows the voice rules identically.

## Idea item schema (`data/ideas.json`)

```json
{
  "id": "unique-string",
  "pillar": "Repost | Workplace | Business | Marketing | AI | Wildcard",
  "hook": "the opening line / core idea",
  "note": "angle, source, or context",
  "source": "manual | feeder | chrome-extension | ...",
  "status": "idea | in progress | drafted | finishing | posted",
  "draft": "full post text (empty until drafted)",
  "day": "Mon..Fri | null",
  "date": "YYYY-MM-DD | null",
  "draftNotes": "the owner's notes to guide drafting",
  "sourceUrl": "link back to an inspiration post",
  "createdAt": 0
}
```

## Core tasks

1. **Draft** — read `voice-guide.md` + `voice-examples.md` (or use the `linkedin-writer` agent), write the post, set `status:"drafted"` and the `draft` text.
2. **Run the feeder** — see `prompts/feeder.md`. Scan the active creators in `creators.json`, distil pillar-tagged ideas, write them to the bank.

## Voice rules (summary — full detail in voice-guide.md)

Strong "see more" hook, one idea per line, real numbers over adjectives, 100-300 words, no hashtags. The owner fills in `voice-guide.md` and `voice-examples.md` with their own voice — everything keys off those.

## Setup notes

- The Google Docs / Drive features (drafting into Docs, "Suggest pic") assume a Google Drive connector in Claude Code and are optional. Placeholders like `YOUR_DRAFTS_FOLDER_ID` in `dashboard/index.html` mark where to put your own Drive folder IDs if you use them.
- Nothing posts to LinkedIn automatically. Ever.
