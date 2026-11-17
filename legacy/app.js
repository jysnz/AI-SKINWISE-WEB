// AI SkinWise Web. Detection runs on the SkinWise server (see AGENT.md).
const DEFAULT_API = "https://ai-skinwise-v2-server.onrender.com/predict-skin-disease";
// Override for local testing: index.html?api=http://localhost:8000
const API = (() => {
  const q = new URLSearchParams(location.search).get("api");
  return q && /^https?:\/\//.test(q) ? q.replace(/\/$/, "") + "/predict-skin-disease" : DEFAULT_API;
})();
const TIMEOUT_MS = 90000;
const MAX_FILES = 3;
const MAX_MB = 12;
const BODY = ["Face", "Scalp", "Neck", "Chest", "Back", "Arm", "Hand", "Stomach", "Leg", "Foot"];
const SYMPTOMS = ["Itchiness", "Redness", "Swelling", "Dryness", "Peeling", "Bleeding", "Pain/Stinging", "Bumps/Blisters", "Discoloration", "Scaly Skin"];

const $ = (id) => document.getElementById(id);
const state = { files: [], body: null, sym: new Set() };

// ---- theme (light default, remembers choice, follows system) ----
(function theme() {
  let saved = null;
  try { saved = localStorage.getItem("sw-theme"); } catch (e) {}
  const forced = new URLSearchParams(location.search).get("theme");
  const dark = forced ? forced === "dark" : (saved ? saved === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  $("themeBtn").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("sw-theme", next); } catch (e) {}
  });
})();

// ---- chips ----
function chip(label, pressed, role, onClick) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "chip"; b.textContent = label;
  b.setAttribute("role", role);
  b.setAttribute(role === "radio" ? "aria-checked" : "aria-pressed", String(pressed));
  b.addEventListener("click", () => onClick(b));
  return b;
}
function pop(b) { b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }
function updateChips() {
  document.querySelectorAll("#body .chip").forEach((b) => b.setAttribute("aria-checked", String(b.textContent === state.body)));
}
function renderChips() {
  $("body").replaceChildren(...BODY.map((p) => chip(p, state.body === p, "radio", (b) => {
    state.body = p; updateChips(); pop(b);
  })));
  $("sym").replaceChildren(...SYMPTOMS.map((s) => chip(s, state.sym.has(s), "button", (b) => {
    state.sym.has(s) ? state.sym.delete(s) : state.sym.add(s);
    b.setAttribute("aria-pressed", String(state.sym.has(s)));
    pop(b);
  })));
}
renderChips();

// ---- photos ----
function setStep(n) {
  document.querySelectorAll(".steps li").forEach((li) => li.classList.toggle("on", +li.dataset.step === n));
}
function showError(msg) { const e = $("err"); e.textContent = msg || ""; e.hidden = !msg; }
function addFiles(list) {
  showError("");
  const start = state.files.length;
  for (const f of list) {
    if (state.files.length >= MAX_FILES) { showError("You can add up to 3 photos."); break; }
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { showError("Only JPG, PNG or WEBP photos are supported."); continue; }
    if (f.size > MAX_MB * 1048576) { showError("Each photo must be under " + MAX_MB + " MB."); continue; }
    state.files.push({ file: f, url: URL.createObjectURL(f) });
  }
  renderThumbs(start);
}
function renderThumbs(popFrom = -1) {
  $("thumbs").replaceChildren(...state.files.map((it, i) => {
    const li = document.createElement("li");
    if (i >= popFrom) li.classList.add("pop");
    const img = document.createElement("img"); img.src = it.url; img.alt = "Photo " + (i + 1); img.draggable = false;
    const x = document.createElement("button"); x.type = "button"; x.textContent = "×"; x.setAttribute("aria-label", "Remove photo " + (i + 1));
    x.addEventListener("click", () => { URL.revokeObjectURL(it.url); state.files.splice(i, 1); renderThumbs(); });
    li.append(img, x); return li;
  }));
  setStep(state.files.length ? 2 : 1);
}
$("files").addEventListener("change", (e) => { addFiles(e.target.files); e.target.value = ""; });
const drop = $("drop");
["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

// ---- detection loading experience ----
const STAGES = ["Enhancing photos", "Running AI analysis", "Matching symptoms"];
let loadTimer = null;
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
function setStageText(txt) {
  const note = $("loadNote");
  note.textContent = txt;
  if (RM) return;
  note.animate([{ transform: "translateY(5px)", opacity: .3 }, { transform: "none", opacity: 1 }], { duration: 240, easing: "ease-out" });
}
function showLoading() {
  $("scanThumbs").replaceChildren(...state.files.slice(0, 3).map((it) => {
    const li = document.createElement("li"); li.className = "ph";
    const img = document.createElement("img"); img.src = it.url; img.alt = ""; img.draggable = false;
    li.append(img); return li;
  }));
  $("loadBar").style.width = "8%";
  setStageText(STAGES[0]);
  $("loading").hidden = false;
  let t = 0;
  loadTimer = setInterval(() => {
    t++;
    const bar = $("loadBar");
    const w = parseFloat(bar.style.width) || 0;
    if (w < 92) {
      const nw = Math.min(92, w + (w < 30 ? 5.5 : 0.9));
      bar.style.width = nw.toFixed(1) + "%";
      $("loadPct").textContent = Math.round(nw) + "%";
    }
    if (t === 4) setStageText(STAGES[1]);
    if (t === 9) setStageText(STAGES[2]);
    if (t === 15) setStageText("The server is waking up. This can take up to a minute.");
  }, 1000);
}
function hideLoading() {
  clearInterval(loadTimer); loadTimer = null;
  $("loading").hidden = true; $("loadBar").style.width = "0"; $("loadPct").textContent = "0%";
  $("loadNote").textContent = STAGES[0];
}

// ---- submit ----
let activeCtl = null;
let cancelled = false;
$("cancelBtn").addEventListener("click", () => { cancelled = true; activeCtl && activeCtl.abort(); });
$("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!state.files.length) return showError("Add at least one photo.");
  if (!state.body) return showError("Choose the affected body part.");
  showError("");

  const fd = new FormData();
  state.files.forEach((it, i) => fd.append("image_" + (i + 1), it.file));
  fd.append("body_location", state.body);
  fd.append("selected_symptoms", [...state.sym].join(", "));
  fd.append("user_description", $("desc").value.trim());

  $("go").disabled = true; $("form").hidden = true; $("result").hidden = true;
  setStep(3);
  showLoading();
  activeCtl = new AbortController();
  cancelled = false;
  const kill = setTimeout(() => activeCtl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API, { method: "POST", body: fd, signal: activeCtl.signal });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!data) throw new Error("The server sent an unreadable response (" + res.status + ").");
    if (data.error) throw new Error(data.error);
    render(data);
  } catch (err) {
    const msg = cancelled ? "" : (err.name === "AbortError" ? "The request timed out. Please try again." : (err.message || "Something went wrong."));
    $("form").hidden = false; setStep(2); showError(msg);
  } finally {
    clearTimeout(kill);
    hideLoading();
    $("go").disabled = false;
    activeCtl = null;
  }
});

// ---- result (all server text goes through textContent) ----
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function toList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return String(v).split(/\r?\n|;/).map((s) => s.trim()).filter(Boolean);
}
function panel(title, content, open) {
  const d = el("details"); if (open) d.open = true;
  d.append(el("summary", null, title)); d.append(content); return d;
}
function listOrText(items, empty) {
  if (!items.length) return el("p", null, empty);
  if (items.length === 1) return el("p", null, items[0]);
  const ul = el("ul"); items.forEach((t) => ul.append(el("li", null, t))); return ul;
}
function reset() {
  $("result").hidden = true; $("form").hidden = false; setStep(state.files.length ? 2 : 1);
  scrollTo({ top: 0, behavior: "smooth" });
}
function countTo(node, target, suffix) {
  if (RM) { node.textContent = Math.round(target) + suffix; return; }
  const t0 = performance.now(), dur = 650;
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    node.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))) + suffix;
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function animateRing(ring, label, conf) {
  if (RM) { ring.style.setProperty("--p", conf); label.textContent = Math.round(conf) + "%"; return; }
  const t0 = performance.now(), dur = 900;
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    ring.style.setProperty("--p", (conf * e).toFixed(1));
    label.textContent = Math.round(conf * e) + "%";
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function render(data) {
  const box = $("result"); box.replaceChildren();
  const card = el("section", "card result-card");
  const left = el("div", "res-left");
  const right = el("div", "res-right");

  if (data.success === false) {
    const d = data.details || {};
    left.append(el("h2", null, "We could not be sure"));
    const head = el("div", "res-head");
    const final = Math.max(0, Math.min(100, Number(d.final) || 0));
    const ring = el("div", "ring"); ring.style.setProperty("--p", 0); ring.style.setProperty("--ring", "var(--warn)");
    const ringLabel = el("div", null, "0%");
    ring.append(ringLabel);
    const txt = el("div");
    txt.append(el("span", "badge warn", "Low confidence"));
    head.append(ring, txt); left.append(head);
    const m = el("div", "metrics");
    [["Photo analysis", Number(d.visual)], ["Symptom match", Number(d.match)]].forEach(([k, v]) => {
      const c = el("div", "metric");
      const b = el("b", null, "0%");
      if (v != null && !isNaN(v)) countTo(b, v, "%"); else b.textContent = "n/a";
      c.append(b, el("span", null, k)); m.append(c);
    });
    left.append(m);
    right.append(el("p", "muted", data.message || "Confidence was too low for a reliable result."));
    right.append(el("p", "muted", "Try clearer photos in good light, or add more symptoms. A dermatologist can give a proper answer."));
  } else {
    const p = data.prediction || {}, info = data.info || {};
    const conf = Math.max(0, Math.min(100, Number(p.final_confidence) || 0));
    left.append(el("h2", null, "Result"));
    const head = el("div", "res-head");
    const ring = el("div", "ring"); ring.style.setProperty("--p", 0);
    if (conf < 80) ring.style.setProperty("--ring", "var(--warn)");
    const ringLabel = el("div", null, "0%");
    ring.append(ringLabel);
    const txt = el("div");
    txt.append(el("div", "res-name", p.disease_name || "Unknown"));
    txt.append(el("span", "badge" + (conf < 80 ? " warn" : ""), conf >= 80 ? "High confidence" : "Low confidence"));
    head.append(ring, txt); left.append(head);

    const m = el("div", "metrics");
    [["Photo analysis", Number(p.visual_confidence_avg)],
     ["Symptom match", p.symptom_analysis && p.symptom_analysis !== "N/A" ? Number(p.symptom_match_score) : null]]
      .forEach(([k, v]) => {
        const c = el("div", "metric");
        const b = el("b", null, "0%");
        if (v != null && !isNaN(v)) countTo(b, v, "%"); else b.textContent = "n/a";
        c.append(b, el("span", null, k)); m.append(c);
      });
    left.append(m);

    right.append(panel("Description", listOrText(toList(info.description), "No description available."), true));
    right.append(panel("Typical symptoms", listOrText(toList(info.expected_symptoms), "No data."), false));
    right.append(panel("Suggested remedies", listOrText(toList(info.suggested_treatment), "Consult a dermatologist."), false));

    const refs = (Array.isArray(info.references) ? info.references : []).map((r) => (r && (r.reference || r)) + "").filter((r) => /^https?:\/\//i.test(r.trim()));
    if (refs.length) {
      const ul = el("ul");
      refs.forEach((u) => { const li = el("li"), a = el("a", null, u.trim()); a.href = u.trim(); a.target = "_blank"; a.rel = "noopener noreferrer"; li.append(a); ul.append(li); });
      right.append(panel("References", ul, false));
    }
  }
  if (state.files.length) {
    const strip = el("div", "res-photos");
    state.files.slice(0, 3).forEach((it, i) => {
      const img = document.createElement("img");
      img.src = it.url; img.alt = ""; img.draggable = false;
      img.tabIndex = 0; img.setAttribute("role", "button"); img.setAttribute("aria-label", "View photo " + (i + 1) + " larger");
      img.addEventListener("click", () => showPhoto(it.url));
      img.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showPhoto(it.url); } });
      strip.append(img);
    });
    left.append(el("p", "res-photos-label muted", "Photos analyzed"));
    left.append(strip);
  }
  const again = el("button", "btn", "Scan again"); again.type = "button"; again.addEventListener("click", reset);
  right.append(again);
  if (data.success === false) {
    const edit = el("button", "btn ghost", "Edit details"); edit.type = "button"; edit.addEventListener("click", reset);
    right.append(edit);
  }
  card.append(left, right);
  box.append(card); box.hidden = false;
  const ringEl = card.querySelector(".ring");
  if (ringEl) {
    const c = data.success === false
      ? Math.max(0, Math.min(100, Number((data.details || {}).final) || 0))
      : Math.max(0, Math.min(100, Number((data.prediction || {}).final_confidence) || 0));
    animateRing(ringEl, ringEl.querySelector("div"), c);
  }
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}
function showPhoto(url) {
  $("photoDlgImg").src = url;
  $("photoDlg").showModal();
}

// ---- demo states for screenshots and testing without the server (?demo=loading|result|low) ----
const demo = new URLSearchParams(location.search).get("demo");
if (demo) {
  const skinPhoto = (seed) => {
    const c = document.createElement("canvas"); c.width = 320; c.height = 320;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 320, 320);
    g.addColorStop(0, ["#D9A184", "#C98F6E", "#D7A487"][seed]);
    g.addColorStop(1, ["#B97B5E", "#AE7052", "#9AAFC9"][seed]);
    x.fillStyle = g; x.fillRect(0, 0, 320, 320);
    for (let i = 0; i < 30; i++) {
      x.fillStyle = "rgba(" + (seed === 2 ? "80,95,120," : "125,72,50,") + (0.05 + (i % 4) * 0.03) + ")";
      x.beginPath();
      x.ellipse((i * 97 + seed * 53) % 320, (i * 61 + seed * 31) % 320, 14 + (i % 5) * 9, 10 + (i % 4) * 7, i, 0, 6.3);
      x.fill();
    }
    return c.toDataURL("image/png");
  };
  state.files = [0, 1, 2].map((i) => ({ file: null, url: skinPhoto(i) }));
  renderThumbs();
  $("form").hidden = true;
  $("go").disabled = true;
  setStep(3);
  if (demo === "loading") {
    showLoading();
  } else {
    $("loading").hidden = true;
    render(demo === "result"
      ? { success: true, prediction: { disease_name: "Ringworm", final_confidence: 87.4, visual_confidence_avg: 84.2, symptom_match_score: 91, symptom_analysis: "matched" }, translation: null, info: { description: ["Ringworm (tinea corporis) is a common fungal infection that causes a raised, ring-shaped rash.", "It spreads through direct skin contact and shared items."], expected_symptoms: ["Red, ring-shaped patch with a raised edge", "Itching", "Slightly scaly skin inside the ring"], suggested_treatment: ["Keep the area clean and dry", "Apply an antifungal cream as directed", "Wash bedding and clothing separately"], references: [] } }
      : { success: false, low_confidence: true, message: "Confidence was too low for a reliable result.", details: { visual: 64, match: 52, final: 71 } });
    scrollTo(0, 0);
  }
}
