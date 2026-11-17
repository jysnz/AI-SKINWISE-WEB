// Virtual clock for deterministic video capture. Injected into every http(s) frame before
// any page script runs. Real time never advances the page: timers, requestAnimationFrame,
// performance.now, CSS transitions/animations and Web Animations only move when the
// renderer calls window.__vtStep(dtMs). That gives exact, evenly spaced frames.
(() => {
  if (!/^https?:$/.test(location.protocol) || window.top === window || window.__vt) return; // only the app iframe, never the composer
  const S = { now: 0, id: 1, timers: new Map(), rafId: 1, raf: new Map() };
  window.__vt = S;

  const realFetch = window.fetch.bind(window);
  const realSetTimeout = window.setTimeout.bind(window);
  const realScrollTo = window.scrollTo.bind(window);
  const realSIV = Element.prototype.scrollIntoView;
  const realAnimate = Element.prototype.animate;

  // ---- clocks ----
  Object.defineProperty(performance, "now", { value: () => S.now, configurable: true, writable: true });
  const base = Date.now();
  Date.now = () => base + S.now;

  // ---- timers ----
  window.setTimeout = (fn, ms = 0, ...args) => {
    if (typeof fn !== "function") return 0;
    const id = S.id++;
    S.timers.set(id, { at: S.now + Math.max(0, Number(ms) || 0), fn, args, every: null });
    return id;
  };
  window.setInterval = (fn, ms = 0, ...args) => {
    if (typeof fn !== "function") return 0;
    const every = Math.max(1, Number(ms) || 0);
    const id = S.id++;
    S.timers.set(id, { at: S.now + every, fn, args, every });
    return id;
  };
  window.clearTimeout = window.clearInterval = (id) => { S.timers.delete(id); };
  window.requestAnimationFrame = (cb) => { const id = S.rafId++; S.raf.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { S.raf.delete(id); };
  window.requestIdleCallback = (cb) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 10 }), 1);
  window.cancelIdleCallback = (id) => window.clearTimeout(id);

  // ---- smooth scrolling is driven by the renderer, so make every scroll instant ----
  window.scrollTo = function (a, b) {
    if (a && typeof a === "object") return realScrollTo({ ...a, behavior: "auto" });
    return realScrollTo(a, b);
  };
  Element.prototype.scrollIntoView = function (o) {
    return realSIV.call(this, o && typeof o === "object" ? { ...o, behavior: "auto" } : o);
  };

  // ---- mocked prediction endpoint (resolves after a virtual delay) ----
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : (input && input.url) || String(input);
    const m = window.__vtMock;
    if (m && url.includes(m.match)) {
      return new Promise((resolve, reject) => {
        const sig = init && init.signal;
        const id = window.setTimeout(() => {
          resolve(new Response(JSON.stringify(m.body), { status: 200, headers: { "content-type": "application/json" } }));
        }, m.delay);
        if (sig) sig.addEventListener("abort", () => { window.clearTimeout(id); reject(new DOMException("Aborted", "AbortError")); });
      });
    }
    return realFetch(input, init);
  };

  // ---- animations: pause everything and drive currentTime from the virtual clock ----
  const rec = new WeakMap();
  const track = (anim) => {
    if (rec.has(anim)) return rec.get(anim);
    const r = { start: S.now };
    rec.set(anim, r);
    try { anim.pause(); anim.currentTime = 0; } catch (e) {}
    return r;
  };
  const created = new Set(); // everything made through element.animate(), including inside shadow roots
  Element.prototype.animate = function (...args) {
    const anim = realAnimate.apply(this, args);
    created.add(anim);
    track(anim);
    return anim;
  };
  const sync = () => {
    void document.documentElement.offsetHeight; // flush style so new transitions exist
    // document.getAnimations() does not reach into shadow roots (NumberFlow lives there), so collect them too
    const list = new Set(document.getAnimations());
    for (const el of document.querySelectorAll("*")) {
      const sr = el.shadowRoot;
      if (sr && sr.getAnimations) for (const a of sr.getAnimations()) list.add(a);
    }
    for (const a of created) list.add(a);
    for (const anim of list) {
      const r = track(anim);
      const t = S.now - r.start;
      if (anim.playState === "idle") { created.delete(anim); continue; }
      let end = Infinity;
      try { end = anim.effect.getComputedTiming().endTime; } catch (e) {}
      try {
        if (Number.isFinite(end) && t >= end) { if (anim.playState !== "finished") anim.finish(); created.delete(anim); }
        else { if (anim.playState === "running") anim.pause(); anim.currentTime = t; }
      } catch (e) {}
    }
  };

  const decoded = new WeakSet();
  const tick = () => new Promise((res) => { const c = new MessageChannel(); c.port1.onmessage = () => res(); c.port2.postMessage(0); });

  S.advance = (dt) => {
    const target = S.now + dt;
    for (let guard = 0; guard < 20000; guard++) {
      let best = null, bestId = 0;
      for (const [id, t] of S.timers) if (t.at <= target && (!best || t.at < best.at || (t.at === best.at && id < bestId))) { best = t; bestId = id; }
      if (!best) break;
      S.now = Math.max(S.now, best.at);
      if (best.every != null) best.at += best.every; else S.timers.delete(bestId);
      try { best.fn(...best.args); } catch (e) { queueMicrotask(() => { throw e; }); }
    }
    S.now = target;
    const cbs = [...S.raf.values()];
    S.raf.clear();
    for (const cb of cbs) { try { cb(S.now); } catch (e) { queueMicrotask(() => { throw e; }); } }
  };

  // One video frame: advance the clock, let React/Motion flush, then freeze animations at the new time.
  window.__vtStep = async (dt) => {
    S.advance(dt);
    await tick(); await tick();
    sync();
    await tick();
    sync();
    // make sure freshly inserted images are decoded before the frame is captured
    const fresh = [...document.images].filter((i) => !decoded.has(i));
    if (fresh.length) {
      fresh.forEach((i) => decoded.add(i));
      await Promise.race([Promise.all(fresh.map((i) => (i.decode ? i.decode().catch(() => {}) : null))), new Promise((r) => realSetTimeout(r, 800))]);
    }
  };

  // Colours the composer needs for the fake status bar and home indicator.
  window.__vtInfo = () => {
    const bodyBg = getComputedStyle(document.body).backgroundColor;
    const tb = document.querySelector(".topbar");
    return { bodyBg, topBg: tb ? getComputedStyle(tb).backgroundColor : bodyBg, scrollY: window.scrollY, hydrated: document.documentElement.dataset.hydrated === "1", path: location.pathname };
  };

  // Hide scrollbars and keep scrolling instant.
  const css = document.createElement("style");
  css.textContent = "html{scroll-behavior:auto!important;overscroll-behavior:none}::-webkit-scrollbar{display:none}*{-webkit-tap-highlight-color:transparent}";
  const addCss = () => (document.head || document.documentElement).appendChild(css);
  if (document.documentElement) addCss(); else document.addEventListener("readystatechange", addCss, { once: true });
})();
