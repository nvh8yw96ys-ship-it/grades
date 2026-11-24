// ============================================================================
//  Grade Ledger: weighted course grades + what-if (vanilla JS, saves to localStorage)
// ============================================================================
(() => {
const { TERM, SCALE, COURSES } = DATA;
const KEY = "gradeledger.v1";
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const f1 = (n, d = 1) => (n == null || !isFinite(n) ? "—" : (+n).toFixed(d));
const wfmt = (w) => f1(w, w % 1 ? 1 : 0);

// ---------- icons ----------
const IC = {
  dash: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  course: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/><path d="M9 7.5h6M9 11h4"/>',
  settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', check: '<path d="M5 12.5 9.5 17 19 7.5"/>',
  right: '<path d="m9 6 6 6-6 6"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
};
const I = (n) => `<svg class="i" viewBox="0 0 24 24">${IC[n] || ""}</svg>`;

// ---------- state ----------
const blank = () => ({ entries: {}, totals: {}, weights: {} });
const defaults = { view: "dash", target: 90, courses: {}, sliders: {}, open: {} };
let S;
try { S = Object.assign(structuredClone(defaults), JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { S = structuredClone(defaults); }
COURSES.forEach((c) => (S.courses[c.id] = Object.assign(blank(), S.courses[c.id])));
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} hubSync(); };
const course = (id) => COURSES.find((c) => c.id === id);

// ---------- grade engine ----------
const grade = (p) => (p == null ? null : SCALE.find(([m]) => p >= m));
const letter = (p) => grade(p)?.[1] ?? "—";
function cfg(c, cat) {
  const s = S.courses[c.id];
  const w = s.weights[cat.id] ?? cat.w;
  const t = s.totals[cat.id] ?? cat.total ?? null;
  const pcts = (s.entries[cat.id] || []).filter((r) => r.p > 0 && r.e !== "" && r.e != null && isFinite(r.e)).map((r) => (r.e / r.p) * 100);
  const n = pcts.length, sum = pcts.reduce((a, b) => a + b, 0);
  return { w, t, n, sum, avg: n ? sum / n : null, remaining: n === 0 ? "all" : t && t > n ? t - n : 0 };
}
function current(c) {
  let ws = 0, acc = 0;
  c.cats.forEach((cat) => { const x = cfg(c, cat); if (x.w > 0 && x.avg != null) { ws += x.w; acc += x.w * x.avg; } });
  return { grade: ws ? acc / ws : null, graded: ws };
}
const totalW = (c) => c.cats.reduce((a, cat) => a + Math.max(0, cfg(c, cat).w), 0);
const catProj = (x, v) => (x.remaining === "all" ? v : x.remaining > 0 ? (x.sum + x.remaining * v) / x.t : x.avg);
function slider(c, cat) { const k = c.id + "/" + cat.id; if (S.sliders[k] == null) S.sliders[k] = Math.round(current(c).grade ?? 85); return S.sliders[k]; }
function projected(c, ov) {
  let ws = 0, acc = 0;
  c.cats.forEach((cat) => { const x = cfg(c, cat); if (x.w <= 0) return; ws += x.w; acc += x.w * catProj(x, ov && ov.id === cat.id ? ov.v : slider(c, cat)); });
  return ws ? acc / ws : null;
}
function needed(c, cat, T) { const a = projected(c, { id: cat.id, v: 0 }), b = projected(c, { id: cat.id, v: 100 }); return b - a < 1e-9 ? null : ((T - a) / (b - a)) * 100; }
const openCats = (c) => c.cats.filter((cat) => { const x = cfg(c, cat); return x.w > 0 && x.remaining !== 0; });
function gpa(useProj) {
  let h = 0, pts = 0;
  COURSES.forEach((c) => { const g = useProj ? projected(c) : current(c).grade; if (g == null) return; h += c.hrs; pts += c.hrs * grade(g)[2]; });
  return h ? { gpa: pts / h, hrs: h } : null;
}

// ---------- motion + ui helpers ----------
function countTo(el, to, dec = 0) {
  const from = parseFloat(el.dataset.v || "0"); el.dataset.v = to;
  const t0 = performance.now(), dur = 800;
  const step = (now) => { const k = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - k, 4); el.textContent = (from + (to - from) * e).toFixed(dec); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
  setTimeout(() => { if (el.dataset.v == to) el.textContent = (+to).toFixed(dec); }, dur + 150);
}
function hydrate(root) {
  setTimeout(() => {
    $$("[data-w]", root).forEach((el) => (el.style.width = Math.max(0, Math.min(100, +el.dataset.w)) + "%"));
    $$("[data-count]", root).forEach((el) => countTo(el, +el.dataset.count, +(el.dataset.dec || 0)));
  }, 40);
}
const toast = (msg) => { const t = $("#toast"); t.innerHTML = I("check") + esc(msg); t.classList.add("on"); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove("on"), 1900); };
const L = (p) => `<span class="lt L-${letter(p)}">${letter(p)}</span>`;
const num = (p, dec = 1) => (p == null ? "—" : `<span data-count="${p}" data-dec="${dec}">${f1(p, dec)}</span>`);
const scaleBar = (p) => `<div class="bar scale"><i data-w="${p ?? 0}"></i>${[60, 70, 80, 90].map((m) => `<b style="left:${m}%"></b>`).join("")}</div>`;

// ---------- sidebar ----------
const NAV = [["dash", "Overview", "dash"], ...COURSES.map((c) => [c.id, c.code, "course"]), ["settings", "Settings", "settings"]];
$("#nav").insertAdjacentHTML("beforeend", NAV.map(([v, l, ic], i) =>
  `${i === 1 ? '<div class="navlbl in">Courses</div>' : ""}<button data-v="${v}">${I(ic)}<span>${l}</span><em class="ng" id="ng-${v}"></em></button>`).join(""));
function syncNav() {
  $$("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.v === S.view));
  const on = $(`#nav button[data-v="${S.view}"]`); if (on) $("#pill").style.transform = `translateY(${on.offsetTop}px)`;
  COURSES.forEach((c) => { const g = current(c).grade, el = $("#ng-" + c.id); if (el) el.textContent = g == null ? "" : f1(g, 0); });
  const cur = gpa(false), pj = gpa(true);
  $("#sbfoot").innerHTML = `<div class="lbl">${TERM} GPA · current</div>
    <div class="big">${cur ? f1(cur.gpa, 2) : "—"} <span class="muted" style="font-size:13px">/ 4.00</span></div>
    <div class="mini"><i style="width:${cur ? (cur.gpa / 4) * 100 : 0}%"></i></div>
    <div class="xs muted" style="margin-top:6px">${pj ? `What-if: ${f1(pj.gpa, 2)}` : "Enter scores to see your GPA"}</div>`;
}
$("#nav").addEventListener("click", (e) => { const b = e.target.closest("button[data-v]"); if (!b || b.dataset.v === S.view) return; S.view = b.dataset.v; save(); render(true); window.scrollTo({ top: 0, behavior: "smooth" }); });

// ============================================================================
//  OVERVIEW
// ============================================================================
const V = {};
V.dash = () => {
  const cur = gpa(false), pj = gpa(true), hrs = COURSES.reduce((a, c) => a + c.hrs, 0);
  const graded = COURSES.filter((c) => current(c).grade != null).length;
  return `<div class="top"><div><div class="eyebrow">Texas A&amp;M · ${TERM} · ${hrs} credit hours</div><h1 class="h">Grade Ledger</h1></div></div>
  <div class="grid kpis st">
    <div class="card kpi" style="--i:0"><div class="k-top">${I("target")}Current GPA</div><div class="val"><b>${cur ? num(cur.gpa, 2) : "—"}</b><span>/ 4.00</span></div>
      <div class="bar"><i class="fill" data-w="${cur ? (cur.gpa / 4) * 100 : 0}"></i></div><div class="rem">${cur ? `From ${cur.hrs} graded credit hours` : "No scores yet"}</div></div>
    <div class="card kpi" style="--i:1"><div class="k-top">${I("sliders")}What-if GPA</div><div class="val"><b>${pj ? num(pj.gpa, 2) : "—"}</b><span>/ 4.00</span></div>
      <div class="bar"><i class="fill" data-w="${pj ? (pj.gpa / 4) * 100 : 0}"></i></div><div class="rem">Uses each course's what-if sliders</div></div>
    <div class="card kpi" style="--i:2"><div class="k-top">${I("course")}Courses with scores</div><div class="val"><b>${graded}</b><span>of ${COURSES.length}</span></div>
      <div class="bar"><i class="fill" data-w="${(graded / COURSES.length) * 100}"></i></div><div class="rem">Open a course to enter scores</div></div>
    <div class="card kpi" style="--i:3"><div class="k-top">${I("info")}Grading scale</div><div class="val"><b>A 90</b><span>B 80 · C 70 · D 60</span></div>
      <div class="bar"><i class="fill" data-w="100"></i></div><div class="rem">Standard scale in all five syllabi</div></div>
  </div>
  <div class="card" style="margin-top:16px"><div class="ch"><h3>Courses</h3><span class="sub">Current grade counts only graded work</span></div>
    <div class="clist st">${COURSES.map((c, i) => { const g = current(c).grade, p = projected(c), tw = totalW(c), cg = current(c).graded;
      return `<button class="crow" data-act="goview" data-v="${c.id}" style="--i:${i}">
        <div class="cc"><b>${c.code}</b><span class="muted">${esc(c.name)}</span></div>
        <div class="cg"><div class="cgv"><b>${g == null ? "—" : f1(g)}</b>${g == null ? "" : L(g)}</div>${scaleBar(g)}<div class="xs muted">${cg ? `${f1((cg / tw) * 100, 0)}% graded` : "No scores"} · what-if ${f1(p)}</div></div>
        <span class="go">${I("right")}</span></button>`; }).join("")}</div></div>`;
};

// ============================================================================
//  COURSE
// ============================================================================
function kpisHtml(c) {
  const cur = current(c), tw = totalW(c), p = projected(c), T = S.target;
  const opens = openCats(c), hardest = opens.map((cat) => [cat, needed(c, cat, T)]).filter(([, r]) => r != null).sort((a, b) => b[1] - a[1])[0];
  return `<div class="card kpi"><div class="k-top">Current grade<span class="pct">${cur.graded ? f1((cur.graded / tw) * 100, 0) + "% graded" : ""}</span></div>
      <div class="val"><b>${num(cur.grade)}</b><span>%</span>${cur.grade == null ? "" : L(cur.grade)}</div>${scaleBar(cur.grade)}
      <div class="rem">${cur.graded ? "Weighted by the syllabus" : "Enter a score to start"}</div></div>
    <div class="card kpi"><div class="k-top">What-if final</div><div class="val"><b>${num(p)}</b><span>%</span>${p == null ? "" : L(p)}</div>${scaleBar(p)}
      <div class="rem">${p == null ? "" : p >= T ? `Meets your ${wfmt(T)}% target` : `${f1(T - p)} points short of ${wfmt(T)}%`}</div></div>
    <div class="card kpi"><div class="k-top">Target</div><div class="val"><b>${wfmt(T)}</b><span>%</span>${L(T)}</div>
      <div class="seg" role="group" aria-label="Target grade">${[["A", 90], ["B", 80], ["C", 70]].map(([l, v]) => `<button class="${T === v ? "on" : ""}" data-act="target" data-t="${v}">${l}</button>`).join("")}
      <input id="tcustom" type="number" min="0" max="100" step="any" value="${T}" aria-label="Custom target percent"></div></div>
    <div class="card kpi"><div class="k-top">Toughest requirement</div>
      <div class="val"><b>${hardest ? (hardest[1] <= 0 ? "Locked" : hardest[1] > 100 ? "> 100" : f1(hardest[1])) : "—"}</b><span>${hardest && hardest[1] > 0 && hardest[1] <= 100 ? "%" : ""}</span></div>
      <div class="rem">${hardest ? `${esc(hardest[0].name)}, on the work left` : "Nothing left to solve for"}</div></div>`;
}
function rowHtml(c, cat, r, i) {
  const pct = r.p > 0 && r.e !== "" && r.e != null ? (r.e / r.p) * 100 : null, k = `${c.id}-${cat.id}-${i}`;
  return `<div class="sr" data-c="${c.id}" data-cat="${cat.id}" data-i="${i}">
    <input class="sn" id="n-${k}" data-f="n" value="${esc(r.n)}" placeholder="${esc(cat.total === 1 ? cat.name : "Assignment " + (i + 1))}" aria-label="Assignment name">
    <input id="e-${k}" data-f="e" type="number" inputmode="decimal" step="any" min="0" value="${r.e ?? ""}" placeholder="Earned" aria-label="Points earned">
    <span class="dim">/</span>
    <input id="p-${k}" data-f="p" type="number" inputmode="decimal" step="any" min="0" value="${r.p ?? 100}" aria-label="Points possible">
    <span class="rp">${pct == null ? "" : f1(pct) + "%"}</span>
    <button class="go" data-act="delrow" title="Remove score" aria-label="Remove score">${I("x")}</button></div>`;
}
function catHtml(c, cat, i) {
  const s = S.courses[c.id], x = cfg(c, cat), rows = s.entries[cat.id] || [], key = c.id + "/" + cat.id, open = !!S.open[key];
  return `<div class="cat ${open ? "open" : ""}" data-cat="${cat.id}" style="--i:${i}">
    <button class="chd" data-act="toggle" data-k="${key}" aria-expanded="${open}">
      <span class="chev">${I("right")}</span>
      <span class="cn"><b>${esc(cat.name)}</b>${cat.sub ? `<small>${esc(cat.sub)}</small>` : ""}</span>
      <span class="tag ${x.w <= 0 ? "warnw" : ""}">${wfmt(x.w)}%</span>
      <span class="cnt" id="cnt-${cat.id}">${x.t ? `${x.n} of ${x.t}` : x.n ? `${x.n} entered` : "none yet"}</span>
      <span class="cav" id="avg-${cat.id}">${x.avg == null ? "—" : f1(x.avg) + "%"}</span></button>
    <div class="cbody">
      <div class="rows">${rows.length ? rows.map((r, j) => rowHtml(c, cat, r, j)).join("") : `<div class="small dim">No scores yet. Add one to start the average.</div>`}</div>
      <div class="ctools">
        <button class="btn sm" data-act="addrow" data-c="${c.id}" data-cat="${cat.id}">${I("plus")}Add score</button>
        <label>Total in course <input class="meta-in" data-meta="totals" data-c="${c.id}" data-cat="${cat.id}" type="number" min="1" step="1" value="${x.t ?? ""}" placeholder="?"></label>
        <label>Weight % <input class="meta-in" data-meta="weights" data-c="${c.id}" data-cat="${cat.id}" type="number" min="0" step="any" value="${x.w}"></label>
        ${s.weights[cat.id] != null ? `<span class="xs muted">Syllabus says ${cat.w}%</span>` : ""}
      </div></div></div>`;
}
function whatIfHtml(c) {
  const opens = openCats(c);
  const partial = c.cats.filter((cat) => { const x = cfg(c, cat); return x.w > 0 && x.n > 0 && !x.t; });
  return `<div class="ch"><h3>What-if</h3><span class="sub">Expected average on work not graded yet</span></div>
    <div class="sliders">${opens.length ? opens.map((cat) => { const x = cfg(c, cat), k = c.id + "/" + cat.id, v = slider(c, cat);
      return `<div class="sl"><div class="sl-top"><span>${esc(cat.name)}</span><b id="o-${cat.id}">${v}%</b></div>
        <input type="range" class="wr" data-c="${c.id}" data-cat="${cat.id}" min="0" max="100" step="1" value="${v}" aria-label="Expected average on remaining ${esc(cat.name)}">
        <div class="xs muted">${x.remaining === "all" ? "Whole category" : `${x.remaining} left of ${x.t} · now ${f1(x.avg)}%`} · ${wfmt(x.w)}% of grade</div></div>`; }).join("")
      : `<div class="small dim">Every category is complete. Set a category's total to project work still to come.</div>`}</div>
    ${partial.length ? `<div class="callout">No total set for ${partial.map((p) => esc(p.name)).join(", ")}. Their current average is treated as final.</div>` : ""}
    <div class="need" id="need">${needHtml(c)}</div>`;
}
function needHtml(c) {
  const T = S.target, opens = openCats(c);
  if (!opens.length) return "";
  return `<div class="sec">Needed for ${wfmt(T)}% (${letter(T)})</div>` + opens.map((cat) => {
    const r = needed(c, cat, T); let t, cls;
    if (r == null) { t = "—"; cls = ""; } else if (r <= 0) { t = "Locked in"; cls = "ok"; } else if (r > 100) { t = "Out of reach"; cls = "no"; } else { t = f1(r) + "%"; cls = r > 90 ? "hard" : "ok"; }
    return `<div class="nr"><span>${esc(cat.name)}</span><b class="${cls}">${t}</b></div>`; }).join("") +
    `<div class="xs dim" style="margin-top:6px">Each line assumes the other sliders stay where they are.</div>`;
}
function courseView(c) {
  return `<div class="top"><div><div class="eyebrow">${c.code} · Section ${c.sec}${c.crn ? ` · CRN ${c.crn}` : ""} · ${c.hrs} credit hours</div><h1 class="h">${esc(c.name)}</h1></div>
    <div class="sp"></div><span class="tag">Weights total ${wfmt(totalW(c))}%</span></div>
  <div class="grid kpis st" id="kpis">${kpisHtml(c)}</div>
  <div class="grid main2">
    <div class="card"><div class="ch"><h3>Syllabus breakdown</h3><span class="sub">Category average = mean of your percentages</span></div>
      <div class="cats st">${c.cats.map((cat, i) => catHtml(c, cat, i)).join("")}</div>
      ${c.notes.length ? `<div class="callout"><ul>${c.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}</div>
    <div class="card wi" id="whatif">${whatIfHtml(c)}</div>
  </div>`;
}
COURSES.forEach((c) => (V[c.id] = () => courseView(c)));

// ============================================================================
//  SETTINGS
// ============================================================================
V.settings = () => `<div class="top"><div><div class="eyebrow">Grade Ledger</div><h1 class="h">Settings</h1></div></div>
  <div class="grid g2">
    <div class="card"><div class="ch"><h3>Backup</h3></div>
      <p class="small muted" style="margin-bottom:14px">Scores are saved only on this device. Export a backup to move them to your phone or another browser.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" data-act="export">Export backup</button>
      <label class="btn" style="cursor:pointer">Import backup<input type="file" id="imp" accept="application/json" class="hide"></label></div></div>
    <div class="card"><div class="ch"><h3>Reset</h3></div>
      <p class="small muted" style="margin-bottom:14px">Erase every score, weight change and slider on this device.</p>
      <button class="btn" data-act="reset">Erase all scores</button></div>
  </div>`;

// ============================================================================
//  render + live updates
// ============================================================================
function render(animate = false) {
  const v = $("#view");
  v.innerHTML = (V[S.view] || V.dash)();
  if (animate) { v.classList.remove("enter"); void v.offsetWidth; v.classList.add("enter"); }
  else $$(".st", v).forEach((el) => el.classList.remove("st"));
  syncNav(); hydrate(v);
}
// numbers only, so inputs keep focus while typing
function refresh(c, full) {
  $("#kpis").innerHTML = kpisHtml(c); hydrate($("#kpis"));
  c.cats.forEach((cat) => { const x = cfg(c, cat);
    $("#avg-" + cat.id).textContent = x.avg == null ? "—" : f1(x.avg) + "%";
    $("#cnt-" + cat.id).textContent = x.t ? `${x.n} of ${x.t}` : x.n ? `${x.n} entered` : "none yet"; });
  if (full) $("#whatif").innerHTML = whatIfHtml(c); else $("#need").innerHTML = needHtml(c);
  syncNav();
}
let saveT; const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(save, 300); };

document.addEventListener("input", (e) => {
  const t = e.target;
  const sr = t.closest(".sr");
  if (sr) {
    const c = course(sr.dataset.c), rows = S.courses[c.id].entries[sr.dataset.cat], r = rows[+sr.dataset.i], f = t.dataset.f;
    if (f === "n") r.n = t.value; else if (f === "e") r.e = t.value === "" ? "" : +t.value; else if (f === "p") r.p = +t.value || 0;
    const pct = r.p > 0 && r.e !== "" ? (r.e / r.p) * 100 : null; $(".rp", sr).textContent = pct == null ? "" : f1(pct) + "%";
    saveSoon(); if (f !== "n") refresh(c, true); return;
  }
  if (t.classList.contains("meta-in")) {
    const c = course(t.dataset.c), cat = c.cats.find((x) => x.id === t.dataset.cat), s = S.courses[c.id], v = parseFloat(t.value);
    if (t.dataset.meta === "totals") { if (v >= 1) s.totals[cat.id] = Math.round(v); else delete s.totals[cat.id]; }
    else { if (isFinite(v) && v !== cat.w) s.weights[cat.id] = v; else delete s.weights[cat.id]; }
    saveSoon(); refresh(c, true); return;
  }
  if (t.classList.contains("wr")) {
    const c = course(t.dataset.c); S.sliders[c.id + "/" + t.dataset.cat] = +t.value; $("#o-" + t.dataset.cat).textContent = t.value + "%";
    saveSoon(); $("#kpis").innerHTML = kpisHtml(c); $("#need").innerHTML = needHtml(c); syncNav(); return;
  }
  if (t.id === "tcustom") { const v = parseFloat(t.value); if (!isFinite(v)) return; S.target = v; saveSoon();
    const c = course(S.view); $$("#kpis .seg button").forEach((b) => b.classList.toggle("on", +b.dataset.t === v)); $("#need").innerHTML = needHtml(c); // the KPI cards refresh on blur so this box keeps focus
  }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "tcustom") { const c = course(S.view); if (c) refresh(c); }
  if (e.target.id === "imp") { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { try { const d = JSON.parse(t); if (!d.courses) throw 0; S = Object.assign(structuredClone(defaults), d); COURSES.forEach((c) => (S.courses[c.id] = Object.assign(blank(), S.courses[c.id]))); save(); render(true); toast("Backup restored"); } catch { toast("That file isn't a Grade Ledger backup"); } }); }
});
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]"); if (!el) return;
  const a = el.dataset.act;
  switch (a) {
    case "goview": S.view = el.dataset.v; save(); render(true); return window.scrollTo({ top: 0, behavior: "smooth" });
    case "toggle": { S.open[el.dataset.k] = !S.open[el.dataset.k]; save(); const cat = el.closest(".cat"); cat.classList.toggle("open", S.open[el.dataset.k]); el.setAttribute("aria-expanded", S.open[el.dataset.k]); return; }
    case "target": { S.target = +el.dataset.t; save(); return refresh(course(S.view)); }
    case "addrow": { const s = S.courses[el.dataset.c]; (s.entries[el.dataset.cat] ||= []).push({ n: "", e: "", p: 100 }); S.open[el.dataset.c + "/" + el.dataset.cat] = true; save(); render();
      const rows = $$(`.cat[data-cat="${el.dataset.cat}"] .sr input[data-f="e"]`); rows[rows.length - 1]?.focus(); return; }
    case "delrow": { const sr = el.closest(".sr"), rows = S.courses[sr.dataset.c].entries[sr.dataset.cat]; const r = rows.splice(+sr.dataset.i, 1)[0]; save(); render(); return toast(`${r.n || "Score"} removed`); }
    case "export": { const u = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: "application/json" }));
      const d = new Date(), iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      Object.assign(document.createElement("a"), { href: u, download: `grade-ledger-backup-${iso}.json` }).click(); return; }
    case "reset": if (!confirm("Erase every score on this device?")) return; localStorage.removeItem(KEY); location.reload(); return;
  }
});
window.addEventListener("resize", syncNav);
// ---------- dashboard hub: publish a small grade summary for /hub/ (same origin) ----------
function hubSync() {
  try {
    const g = gpa(false), gp = gpa(true);
    localStorage.setItem("hub.grades", JSON.stringify({ v: 1, updated: new Date().toISOString(), term: TERM, gpa: g?.gpa ?? null, gpaProj: gp?.gpa ?? null, target: S.target,
      courses: COURSES.map((c) => { const cu = current(c); return { id: c.id, code: c.code, name: c.name, hrs: c.hrs, grade: cu.grade, letter: letter(cu.grade), graded: cu.graded, proj: projected(c) }; }) }));
  } catch {}
}
hubSync();
render(true);
})();
