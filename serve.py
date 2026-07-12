#!/usr/bin/env python3
"""Tiny local server for the Hacking LinkedIn dashboard.

Serves the static dashboard AND accepts small POSTs from it that flag ideas in
data/ideas.json for Claude Code to act on, e.g.:
  /api/draft-request  -> flags ideas (draftRequested:true) for the drafter (prompts/draft.md).
  /api/suggest-pic    -> flags an idea (picRequested:true) for photo suggestion.
  /api/sync-doc       -> flags an idea (syncFromDocRequested:true) to re-read its Google Doc.
  /api/update-note    -> saves your "notes for drafting" (draftNotes) onto an idea.
Each matches an incoming post to data/ideas.json by id or normalised hook; if it
isn't there (a browser-only / drifted idea) it is UPSERTED, so the action always
sticks. Pure standard-library Python - no dependencies.
"""
import json, os, re, time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
IDEAS = os.path.join(ROOT, "data", "ideas.json")
CREATORS = os.path.join(ROOT, "data", "creators.json")
INSPIRATION = os.path.join(ROOT, "data", "inspiration.json")


def norm(s):
    s = (s or "").lower().strip()
    for a, b in (("’", "'"), ("‘", "'"), ("“", '"'), ("”", '"'),
                 ("–", "-"), ("—", "-"), ("‑", "-")):
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s)


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")[:48] or "idea"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _apply(self, updater):
        """Read the posted items, match-or-upsert each into ideas.json, run updater(target, inc)."""
        length = int(self.headers.get("Content-Length", 0) or 0)
        try:
            data = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            data = {}
        items = data.get("items")
        if not items:
            items = [{"srcId": i} for i in (data.get("ids") or [])] + \
                    [{"hook": h} for h in (data.get("hooks") or [])]
        try:
            with open(IDEAS) as f:
                bank = json.load(f)
        except Exception as e:
            return self._json(500, {"ok": False, "error": str(e)})

        ideas = bank.setdefault("ideas", [])
        by_id = {it.get("id"): it for it in ideas if it.get("id")}
        by_hook = {norm(it.get("hook")): it for it in ideas if it.get("hook")}

        matched, added = 0, 0
        for inc in items:
            sid = inc.get("srcId") or inc.get("id")
            hook = inc.get("hook")
            target = by_id.get(sid) or (by_hook.get(norm(hook)) if hook else None)
            if target is not None:
                updater(target, inc)
                matched += 1
            elif hook:
                nid = sid or ("click-" + slugify(hook))
                if nid in by_id:
                    nid = nid + "-2"
                new = {
                    "id": nid, "pillar": inc.get("pillar") or "Workplace",
                    "hook": hook, "note": inc.get("note") or "",
                    "source": inc.get("source") or "dashboard",
                    "status": "idea", "draft": inc.get("draft") or "",
                    "type": inc.get("type") or "", "day": inc.get("day"),
                    "date": inc.get("date"),
                    "draftNotes": inc.get("draftNotes") or "",
                    "sourceUrl": inc.get("sourceUrl") or "",
                    "createdAt": int(time.time() * 1000),
                }
                updater(new, inc)
                ideas.append(new)
                by_id[nid] = new
                by_hook[norm(hook)] = new
                added += 1

        with open(IDEAS, "w") as f:
            json.dump(bank, f, indent=2, ensure_ascii=False)
            f.write("\n")
        return self._json(200, {"ok": True, "queued": matched, "matched": matched, "added": added})

    def do_POST(self):
        path = self.path.rstrip("/")
        if path == "/api/draft-request":
            return self._apply(lambda target, inc: target.update({"draftRequested": True}))
        if path == "/api/update-note":
            def set_notes(target, inc):
                if "draftNotes" in inc:
                    target["draftNotes"] = inc.get("draftNotes") or ""
            return self._apply(set_notes)
        if path == "/api/suggest-pic":
            return self._apply(lambda target, inc: target.update({"picRequested": True}))
        if path == "/api/sync-doc":
            # "Pull edits": flag the item so Claude Code re-reads its Google Doc and
            # updates the stored draft (so "Copy for LinkedIn" matches your Doc edits).
            return self._apply(lambda target, inc: target.update({"syncFromDocRequested": True}))
        if path == "/api/add-idea":
            # Extension "Add to bank": upsert the idea (keeps body in draftNotes) but do NOT
            # flag it for drafting. You draft it later from the dashboard.
            return self._apply(lambda target, inc: None)
        if path == "/api/inspiration-add":
            # Inspiration tab "Add to bank": turn a scanned post into an idea + mark it added.
            length = int(self.headers.get("Content-Length", 0) or 0)
            try:
                data = json.loads(self.rfile.read(length) or b"{}")
            except Exception:
                data = {}
            pid = data.get("id")
            try:
                with open(INSPIRATION) as f:
                    insp = json.load(f)
            except Exception as e:
                return self._json(500, {"ok": False, "error": str(e)})
            post = next((p for p in insp.get("posts", []) if p.get("id") == pid), None)
            if not post:
                return self._json(404, {"ok": False, "error": "post not found"})
            text = post.get("text") or ""
            hook = (text.split("\n")[0] or text)[:90]
            author = post.get("author") or "someone on LinkedIn"
            try:
                with open(IDEAS) as f:
                    bank = json.load(f)
            except Exception as e:
                return self._json(500, {"ok": False, "error": str(e)})
            nid = "insp-" + slugify(hook)
            if any(i.get("id") == nid for i in bank["ideas"]):
                nid = nid + "-2"
            bank["ideas"].append({
                "id": nid, "pillar": post.get("pillar") or "Workplace",
                "hook": hook, "note": "Inspiration - LinkedIn post by " + author,
                "source": "feeder", "status": "idea", "draft": "", "type": "",
                "day": None, "date": None,
                "draftNotes": "INSPIRATION POST by " + author + " that you saved. Write your OWN take on this theme in your voice (do not copy it):\n\n" + text,
                "sourceUrl": post.get("url") or "",
                "createdAt": int(time.time() * 1000),
            })
            with open(IDEAS, "w") as f:
                json.dump(bank, f, indent=2, ensure_ascii=False); f.write("\n")
            post["added"] = True
            with open(INSPIRATION, "w") as f:
                json.dump(insp, f, indent=2, ensure_ascii=False); f.write("\n")
            return self._json(200, {"ok": True, "id": nid})
        if path == "/api/delete-idea":
            length = int(self.headers.get("Content-Length", 0) or 0)
            try:
                data = json.loads(self.rfile.read(length) or b"{}")
            except Exception:
                data = {}
            ids = set(x for x in (data.get("ids") or []) if x)
            hooks = set(norm(h) for h in (data.get("hooks") or []) if h)
            try:
                with open(IDEAS) as f:
                    bank = json.load(f)
            except Exception as e:
                return self._json(500, {"ok": False, "error": str(e)})
            before = len(bank.get("ideas", []))
            bank["ideas"] = [i for i in bank["ideas"]
                             if not (i.get("id") in ids or norm(i.get("hook")) in hooks)]
            removed = before - len(bank["ideas"])
            with open(IDEAS, "w") as f:
                json.dump(bank, f, indent=2, ensure_ascii=False); f.write("\n")
            return self._json(200, {"ok": True, "removed": removed})
        if path == "/api/update-item":
            # Persist task state (status / slot / pillar) to the file so it survives reloads.
            def set_state(target, inc):
                for k in ("status", "day", "date", "pillar"):
                    if k in inc:
                        target[k] = inc[k]
            return self._apply(set_state)
        if path == "/api/add-creator":
            length = int(self.headers.get("Content-Length", 0) or 0)
            try:
                data = json.loads(self.rfile.read(length) or b"{}")
            except Exception:
                data = {}
            handle = (data.get("handle") or "").strip()
            handle = re.sub(r"^.*/in/", "", handle).split("/")[0].split("?")[0].strip()
            if not handle:
                return self._json(400, {"ok": False, "error": "no handle"})
            try:
                with open(CREATORS) as f:
                    doc = json.load(f)
            except Exception:
                doc = {"creators": []}
            creators = doc.setdefault("creators", [])
            if any((c.get("handle") or "").lower() == handle.lower() for c in creators):
                return self._json(200, {"ok": True, "duplicate": True, "handle": handle})
            creators.append({"handle": handle, "name": data.get("name") or handle,
                             "focus": data.get("focus") or "", "active": True})
            with open(CREATORS, "w") as f:
                json.dump(doc, f, indent=2, ensure_ascii=False)
                f.write("\n")
            return self._json(200, {"ok": True, "added": True, "handle": handle, "count": len(creators)})
        if path == "/api/save-creators":
            length = int(self.headers.get("Content-Length", 0) or 0)
            try:
                data = json.loads(self.rfile.read(length) or b"{}")
                creators = data.get("creators")
                if not isinstance(creators, list):
                    return self._json(400, {"ok": False, "error": "creators must be a list"})
                try:
                    with open(CREATORS) as f:
                        doc = json.load(f)
                except Exception:
                    doc = {"meta": {"note": "Trusted creators the daily feeder scans."}}
                doc["creators"] = creators
                doc.setdefault("meta", {})["updated"] = data.get("updated") or doc.get("meta", {}).get("updated")
                with open(CREATORS, "w") as f:
                    json.dump(doc, f, indent=2, ensure_ascii=False)
                    f.write("\n")
                return self._json(200, {"ok": True, "count": len(creators)})
            except Exception as e:
                return self._json(500, {"ok": False, "error": str(e)})
        return self._json(404, {"ok": False, "error": "not found"})

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
