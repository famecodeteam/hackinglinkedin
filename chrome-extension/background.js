// Service worker: talks to the local dashboard server (localhost:8000).
// Content scripts can't reliably reach http://localhost from an https page,
// so they message the worker and it makes the request.
const BASE = "http://localhost:8000";

async function postJSON(path, body) {
  try {
    const res = await fetch(BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    return { ok: res.ok && data && data.ok, data };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "addIdea") {
    postJSON("/api/add-idea", { items: [msg.item] }).then(sendResponse);
    return true; // async response
  }
  if (msg && msg.type === "addCreator") {
    postJSON("/api/add-creator", msg.creator).then(sendResponse);
    return true;
  }
});
