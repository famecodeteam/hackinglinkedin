# Draft — turn flagged ideas into finished posts

When you click **Draft** on an idea in the dashboard, it flags that idea in `data/ideas.json` with `"draftRequested": true`. This prompt turns those flagged ideas into full drafts in your voice. Run it in Claude Code whenever you want your queued ideas drafted (or put it on a schedule — see the README).

**You NEVER post anything — you finish and post every draft yourself.**

## What to do

1. Read `data/ideas.json`. Find items where `"draftRequested"` is `true`. If there are none, stop — say "nothing queued" and end.
2. For EACH flagged item, write ONE finished post in your voice using the **`linkedin-writer`** agent (it reads `voice-guide.md` + `voice-examples.md` first). Pass it the item's `hook`, `pillar`, `note`, and `draftNotes` (your own notes — treat those as authoritative). Ask for the finished post text only.
   - **Repost** items: do NOT rewrite. Their `draft` is the URL of the original post to re-share — just mark them drafted.
3. *(Optional — only if you use the Google Docs integration)* create a Google Doc for each draft and store its id/url on the item as `docId` / `docUrl`.
4. Update each item in `data/ideas.json`: set `draft` to the finished text, set `status` to `"drafted"`, and **remove** the `draftRequested` flag. Save the file (preserve every other item exactly).
5. Reload the dashboard — the drafts (and any Doc links) show on their cards, ready for you to finish and post.

Only produce drafts. Never publish to LinkedIn.

---

## Also: "Pull edits" (sync a Google Doc back)

If you edit a draft in its Google Doc, the dashboard's **Pull edits** button flags that idea in `data/ideas.json` with `"syncFromDocRequested": true`. While you're here, handle those too:

1. Find items where `"syncFromDocRequested"` is `true`.
2. For each, read the current text of its Google Doc (via your Google Drive connector, using the item's `docId`).
3. Set the item's `draft` to that text and **remove** the `syncFromDocRequested` flag. Save.
4. If the Doc can't be read, just remove the flag and leave the existing draft untouched — never blank it.

Now the dashboard's "Copy for LinkedIn" button matches your edited Doc. (Only relevant if you use the optional Google Docs integration.)
