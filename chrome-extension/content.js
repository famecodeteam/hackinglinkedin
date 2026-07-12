// Fame LinkedIn Content Helper - injects two buttons on LinkedIn:
//  1. "Add to bank & draft" on each feed/profile post
//  2. "Add to daily scan" on each profile page
// LinkedIn now serves obfuscated class names and no data-urn, so post detection is
// class-agnostic: anchor on each post's "Comment" button and walk up to the container.
(function () {
  const BTN = "fame-helper-btn";

  function toast(msg, ok) {
    let t = document.getElementById("fame-helper-toast");
    if (!t) { t = document.createElement("div"); t.id = "fame-helper-toast"; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.toggle("err", ok === false);
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), 2800);
  }

  function guessPillar(text) {
    const t = (text || "").toLowerCase();
    if (/podcast|b2b marketing|content marketing|\bseo\b|newsletter|thought leader/.test(t)) return "Marketing";
    if (/bootstrap|\bvc\b|venture|funding|cashflow|profit|revenue|solopreneur/.test(t)) return "Business";
    if (/\bai\b|vibe cod|automat|\bsaas\b|built an internal|shipped in a|no-code|crawler|react|next\.js/.test(t)) return "AI";
    if (/hir|manager|remote|return to office|\bteam\b|culture|quit|toxic|boss|\bcv\b|resume|salary|layoff/.test(t)) return "Workplace";
    return "Workplace";
  }

  // ---------- POSTS (class-agnostic) ----------
  function postContainer(commentBtn) {
    let el = commentBtn;
    while (el) {
      if ((el.innerText || "").replace(/\s+/g, " ").trim().length > 150) return el;
      el = el.parentElement;
    }
    return null;
  }
  function extractPost(container) {
    const lines = (container.innerText || "").split("\n").map(l => l.trim());
    let author = "someone on LinkedIn";
    for (let i = 0; i < lines.length; i++) {
      if (/^•\s*(1st|2nd|3rd)/.test(lines[i])) {
        for (let j = i - 1; j >= 0; j--) {
          if (lines[j] && lines[j] !== "Feed post" && !/^Followed by/.test(lines[j])) { author = lines[j]; break; }
        }
        break;
      }
    }
    let start = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/\b\d+\s*[hdwmy]\b\s*•/.test(lines[i]) || /^\d+\s*(hour|day|week|month|year|min)/i.test(lines[i])) start = i + 1;
    }
    let end = lines.length;
    for (let i = start; i < lines.length; i++) {
      if (/^(Like|Comment|Repost|Send)$/.test(lines[i]) || /^Activate to view/.test(lines[i]) || /^\d[\d,]*\s*(comment|repost|reaction)/i.test(lines[i])) { end = i; break; }
    }
    const body = lines.slice(start, end)
      .filter(l => l && l !== "Follow" && l !== "…more" && l !== "see more")
      .join("\n").trim();
    return { author, body };
  }
  function fiberOf(el) { const k = Object.keys(el).find(k => k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$")); return k ? el[k] : null; }
  // The outermost element that still belongs to just THIS post (parent holds >1 post).
  function postRoot(container) {
    let el = container;
    while (el && el.parentElement) {
      if (el.parentElement.querySelectorAll('button[aria-label*="Comment"]').length > 1) return el;
      el = el.parentElement;
    }
    return container;
  }
  // LinkedIn strips the URN from the DOM but keeps it in React state. Scan THIS post's
  // fiber subtree (downward, so it stays scoped to this post) and pick the activity URN.
  function postUrn(rootEl) {
    const rx = /urn:li:(activity|share|ugcPost):\d+/;
    const found = new Set(); const stack = [[fiberOf(rootEl), 0]]; let steps = 0;
    while (stack.length && steps < 5000) {
      const [f, d] = stack.pop(); steps++;
      if (!f) continue;
      const seen = new WeakSet();
      (function scan(o, dd) {
        if (!o || dd > 2 || typeof o !== "object" || seen.has(o)) return; seen.add(o);
        for (const k in o) { try { const v = o[k]; if (typeof v === "string") { const m = v.match(rx); if (m) found.add(m[0]); } else if (v && typeof v === "object") scan(v, dd + 1); } catch (e) {} }
      })(f.memoizedProps, 0);
      if (f.child) stack.push([f.child, d + 1]);
      if (f.sibling && d > 0) stack.push([f.sibling, d]);
    }
    const arr = Array.from(found);
    return arr.find(u => u.includes(":activity:")) || arr.find(u => u.includes(":share:")) || arr[0] || null;
  }
  // On profile/activity pages LinkedIn puts the URN in a DOM attribute; on the feed it's only in React state.
  function urnFromAttrs(container) {
    let el = container;
    for (let i = 0; i < 10 && el; i++) {
      for (const a of el.attributes || []) { const m = (a.value || "").match(/urn:li:(activity|share|ugcPost):\d+/); if (m) return m[0]; }
      el = el.parentElement;
    }
    return null;
  }
  function postUrl(container) {
    const ua = urnFromAttrs(container); if (ua) return "https://www.linkedin.com/feed/update/" + ua + "/";
    try { const urn = postUrn(postRoot(container)); if (urn) return "https://www.linkedin.com/feed/update/" + urn + "/"; } catch (e) {}
    const hrefs = Array.from(container.querySelectorAll("a[href]")).map(a => a.href).filter(Boolean);
    const perma = hrefs.find(h => /\/(feed\/update|posts)\/[^/]/.test(h));
    if (perma) return perma;
    const prof = hrefs.find(h => /linkedin\.com\/(in|company)\//.test(h));
    const m = prof && prof.match(/linkedin\.com\/(in|company)\/([^/?#]+)/);
    if (m) return "https://www.linkedin.com/" + m[1] + "/" + m[2] + "/recent-activity/all/";
    return "";
  }
  function addPostButton(container) {
    if (!container || container.dataset.fameDone) return;
    const raw = container.innerText || "";
    if (/\bPromoted\b/.test(raw.slice(0, 400)) || /follow this Page/i.test(raw)) { container.dataset.fameDone = "skip"; return; } // skip ads
    const { author, body } = extractPost(container);
    if (!body || body.length < 40) return;
    container.dataset.fameDone = "1";

    // Pillar picker - defaults to a best guess, but you choose.
    const sel = document.createElement("select");
    sel.className = "fame-helper-select";
    const guessed = guessPillar(body);
    ["Workplace", "Business", "Marketing", "AI", "Wildcard"].forEach(p => {
      const o = document.createElement("option");
      o.value = p; o.textContent = p; if (p === guessed) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("click", e => e.stopPropagation());

    const btn = document.createElement("button");
    btn.className = BTN; btn.type = "button";
    btn.textContent = "＋ Add to bank";
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); e.preventDefault();
      const hook = (body.split("\n").find(l => l.trim().length > 0) || body).slice(0, 90);
      btn.disabled = true; sel.disabled = true; btn.textContent = "Adding…";
      chrome.runtime.sendMessage({
        type: "addIdea",
        item: {
          hook: hook,
          note: "Inspiration - LinkedIn post by " + author,
          draftNotes: "INSPIRATION POST by " + author + " that Tom saved. Write Tom's OWN take on this theme in his voice (do not copy it):\n\n" + body,
          pillar: sel.value,
          source: "chrome-extension",
          sourceUrl: postUrl(container)
        }
      }, (resp) => {
        if (resp && resp.ok && resp.data && resp.data.added === 0) { btn.textContent = "✓ Already in bank"; toast("Already in your bank"); }
        else if (resp && resp.ok) { btn.textContent = "✓ Added to " + sel.value; toast("Added to your bank (" + sel.value + ") - draft it from the dashboard"); }
        else { btn.disabled = false; sel.disabled = false; btn.textContent = "＋ Add to bank"; toast("Couldn't reach your dashboard server - is it running at localhost:8000?", false); }
      });
    });
    const holder = document.createElement("div");
    holder.className = "fame-helper-holder";
    holder.appendChild(sel);
    holder.appendChild(btn);
    container.prepend(holder);
  }
  function scanPosts() {
    document.querySelectorAll('button[aria-label*="Comment"]').forEach(b => addPostButton(postContainer(b)));
  }

  // ---------- PROFILE ----------
  function currentHandle() {
    const m = location.pathname.match(/\/in\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function addProfileButton() {
    const handle = currentHandle();
    if (!handle) return;
    if (document.getElementById("fame-add-creator")) return;
    const main = document.querySelector("main");
    if (!main) return;
    const nameEl = main.querySelector("h1");
    const name = nameEl ? nameEl.innerText.trim() : handle;
    const btn = document.createElement("button");
    btn.id = "fame-add-creator"; btn.className = BTN + " profile"; btn.type = "button";
    btn.textContent = "＋ Add to daily scan";
    btn.addEventListener("click", () => {
      btn.disabled = true; btn.textContent = "Adding…";
      chrome.runtime.sendMessage({ type: "addCreator", creator: { handle: handle, name: name, focus: "" } }, (resp) => {
        if (resp && resp.ok && resp.data && resp.data.duplicate) { btn.textContent = "✓ Already in daily scan"; toast(name + " is already in the daily scan"); }
        else if (resp && resp.ok) { btn.textContent = "✓ Added to daily scan"; toast(name + " added to your daily scan"); }
        else { btn.disabled = false; btn.textContent = "＋ Add to daily scan"; toast("Couldn't reach your dashboard server - is it running?", false); }
      });
    });
    const holder = document.createElement("div");
    holder.className = "fame-helper-holder profile";
    holder.appendChild(btn);
    main.prepend(holder);
  }

  // ---------- run + watch for dynamically loaded content ----------
  function tick() { try { scanPosts(); addProfileButton(); } catch (e) {} }
  let scheduled = null;
  const obs = new MutationObserver(() => { clearTimeout(scheduled); scheduled = setTimeout(tick, 500); });
  obs.observe(document.body, { childList: true, subtree: true });
  let lastPath = location.pathname;
  setInterval(() => { if (location.pathname !== lastPath) { lastPath = location.pathname; tick(); } }, 800);
  tick();
})();
