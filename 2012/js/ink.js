/* ============================================================ Handwriting (ink)
   4.7: View › Use Ink, with its Use Keyboard / Pen / Eraser / Selection buttons (strings 40945, icons from its toolbar strip).
   6.2 / 7.5 / 8.5 / 2009: the Handwrite / Type tabs at the right of the typing box and the ink toolbar of the conversation
   window markup (UIFILE 920): pen + size (Fine / Normal / Bold), eraser + size (Small / Big / Stroke / Clear All),
   Undo / Redo and stationery ("Rule lines") from 7.5 on, and the ink colour (Default Color / More Colors...).
   "Convert" (send as text) needed Tablet PC handwriting recognition, so it isn't offered. 8.5 / 2009 draw their ink icons
   with their own UI engine (not image files); 7.5's are used for them. 2012 had no handwriting. */
const INK_COLORS = ["#000000", "#808080", "#800000", "#808000", "#008000", "#008080", "#000080", "#800080",
                    "#ffffff", "#c0c0c0", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff"];
const PEN_W = { fine: 1, normal: 2, bold: 4 }, ERASER_R = { small: 4, big: 10 };
const hasInk = () => V.layout === "wm" ? !!D().strings.inkTools : !!D().strings.inkHandwrite;
const inkList = () => String(D().strings.inkTools || "").split("\u0000");        // 4.7: Block, Unblock, Font, Emoticons, Use Ink, Use Keyboard, Pen, Eraser, Selection
const inkState = conv => conv.ink || (conv.ink = { on: false, strokes: [], undo: [], redo: [], tool: "pen", pen: "normal", er: "small", color: "#000000", bg: "blank", sel: [] });

function inkModeTabs(conv) {
  if (V.layout === "wm" || !hasInk() || settings.handwriteTab === false) return "";
  const st = inkState(conv), icon = n => has(n) ? `<img src="${img(n)}" alt="">` : "";
  const tab = (mode, iconName, key, tip) => `<button class="inktab ${(mode === "ink") === st.on ? "sel" : ""}" data-ink="${mode}" title="${esc(S(tip, S(key)))}">
    ${V.id === "6.2" ? esc(tl(key)) : icon(iconName) || esc(tl(key))}</button>`;
  return `<div class="inktabs">${tab("ink", "inktab_hw", "inkHandwrite", "inkHwTip")}${tab("type", "inktab_type", "inkType", "inkTypeTip")}</div>`;
}
function inkToolbar(conv) {
  const st = inkState(conv), b = (act, iconName, tip, extra = "") => `<button class="tbtn ink ${extra}" data-inkact="${act}" title="${esc(tip)}"><img src="${first(iconName)}" alt=""></button>`;
  if (V.layout === "wm") {
    const L = inkList();
    return b("keyboard", "fmt_keyboard", L[5] || "") + b("pen", "fmt_pen", L[6] || "", st.tool === "pen" ? "on" : "") +
      b("eraser", "fmt_eraser", L[7] || "", st.tool === "eraser" ? "on" : "") + b("select", "fmt_lasso", L[8] || "", st.tool === "select" ? "on" : "");
  }
  return b("pen", "ink_pen", S("inkPenTip"), st.tool === "pen" ? "on" : "") + `<button class="tbtn ink dd" data-inkact="pensize" title="${esc(S("inkPenTip"))}">▾</button>` +
    b("eraser", "ink_eraser", S("inkEraserTip"), st.tool === "eraser" ? "on" : "") + `<button class="tbtn ink dd" data-inkact="ersize" title="${esc(S("inkEraserTip"))}">▾</button>` +
    (S("inkUndo") ? b("undo", "ink_undo", S("inkUndoTip")) + b("redo", "ink_redo", S("inkRedoTip")) : "") +
    `<button class="tbtn ink" data-inkact="color" title="${esc(S("inkColorTip"))}"><img src="${first("ink_color")}" alt=""><i class="inkswatch" style="background:${st.color}"></i> ▾</button>` +
    (S("ruleLines") ? `<button class="tbtn ink" data-inkact="bg" title="${esc(S("bgTip"))}"><img src="${first("ink_bg")}" alt=""> ▾</button>` : "");
}
/* switch the typing box of a conversation between text and ink */
function setInkMode(conv, on) {
  if (!hasInk()) return;
  const st = inkState(conv); st.on = on;
  const w = conv.win, row = $(".compose .row", w), ta = $("textarea", w), fmtBar = $(".compose .fmt", w);
  if (!row) return;
  ta.style.display = on ? "none" : "";
  let pad = $(".inkpad", row);
  if (on && !pad) { pad = h(`<canvas class="inkpad"></canvas>`); ta.after(pad); wireInkPad(conv, pad); }
  if (pad) pad.style.display = on ? "" : "none";
  if (on) { if (!fmtBar.dataset.textBar) fmtBar.dataset.textBar = fmtBar.innerHTML; fmtBar.innerHTML = inkToolbar(conv); }
  else if (fmtBar.dataset.textBar) { fmtBar.innerHTML = fmtBar.dataset.textBar; delete fmtBar.dataset.textBar; wireConvButtons(conv); }
  wireInkBar(conv);
  $$(".inktab", w).forEach(t => t.classList.toggle("sel", (t.dataset.ink === "ink") === on));
  if (on) inkRedraw(conv); else ta.focus();
}
function wireInkBar(conv) {
  const w = conv.win, st = inkState(conv);
  $$(".inktab", w).forEach(t => t.onclick = () => setInkMode(conv, t.dataset.ink === "ink"));
  $$("[data-inkact]", w).forEach(bn => bn.onclick = e => {
    const a = bn.dataset.inkact, r = bn.getBoundingClientRect();
    const pick = (items) => showMenu(items, r.left, r.bottom);
    if (a === "keyboard") return setInkMode(conv, false);
    if (a === "pen" || a === "eraser" || a === "select") { st.tool = a; return setInkMode(conv, true); }
    if (a === "undo") { if (st.undo.length) { st.redo.push(st.strokes); st.strokes = st.undo.pop(); inkRedraw(conv); } return; }
    if (a === "redo") { if (st.redo.length) { st.undo.push(st.strokes); st.strokes = st.redo.pop(); inkRedraw(conv); } return; }
    if (a === "pensize") return pick([["fine", "penFine", "ink_pen1"], ["normal", "penNormal", "ink_pen2"], ["bold", "penBold", "ink_pen3"]]
      .map(([k, s, ic]) => ({ t: S(s), icon: first(ic), radio: true, checked: st.pen === k, fn: () => { st.pen = k; st.tool = "pen"; setInkMode(conv, true); } })));
    if (a === "ersize") return pick([...[["small", "erSmall", "ink_er1"], ["big", "erBig", "ink_er2"], ["stroke", "inkStroke", "ink_stroke"]]
      .map(([k, s, ic]) => ({ t: S(s), icon: first(ic), radio: true, checked: st.er === k, fn: () => { st.er = k; st.tool = "eraser"; setInkMode(conv, true); } })),
      "-", { t: S("inkClear"), icon: first("ink_clear"), fn: () => { inkPush(st); st.strokes = []; inkRedraw(conv); } }]);
    if (a === "color") {
      const m = h(`<div class="popup inkpal">${INK_COLORS.map(c => `<i data-c="${c}" style="background:${c}" class="${c === st.color ? "sel" : ""}"></i>`).join("")}
        <a class="lnk" data-c="#000000">${esc(tl("defColor"))}</a><a class="lnk more">${esc(tl("moreColors"))}</a></div>`);
      document.body.append(m); Object.assign(m.style, { left: r.left + "px", top: r.bottom + 2 + "px", zIndex: 99999 });
      $$("[data-c]", m).forEach(x => x.onclick = () => { st.color = x.dataset.c; m.remove(); setInkMode(conv, true); });
      $(".more", m).onclick = () => { const inp = h(`<input type="color" value="${st.color}">`); inp.oninput = () => { st.color = inp.value; setInkMode(conv, true); }; m.remove(); inp.click(); };
      return;
    }
    if (a === "bg") {
      const all = [["blank", "ruleBlank"], ["college", "ruleCollege"], ["standard", "ruleStandard"], ["wide", "ruleWide"], ["collegeV", "ruleCollegeV"],
                   ["standardV", "ruleStandardV"], ["wideV", "ruleWideV"], ["gridS", "gridSmall"], ["gridM", "gridMedium"], ["gridL", "gridLarge"]];
      return pick(all.filter(([, s]) => D().strings[s]).map(([k, s]) => ({ t: S(s), radio: true, checked: st.bg === k, fn: () => { st.bg = k; inkRedraw(conv); } })));
    }
  });
}
const inkPush = st => { st.undo.push(st.strokes.map(s => ({ ...s, pts: s.pts.slice() }))); st.redo = []; };
function wireInkPad(conv, pad) {
  const st = inkState(conv);
  let cur = null, lasso = null, drag = null;
  const pt = e => { const r = pad.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  pad.onpointerdown = e => {
    pad.setPointerCapture(e.pointerId); const p = pt(e);
    if (st.tool === "select") {
      const hit = st.sel.length && st.sel.some(i => st.strokes[i]?.pts.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 8));
      if (hit) { inkPush(st); drag = p; } else { lasso = [p]; st.sel = []; }
    } else { inkPush(st); if (st.tool === "pen") { cur = { color: st.color, w: PEN_W[st.pen], pts: [p] }; st.strokes.push(cur); } else inkErase(st, p); }
    inkRedraw(conv, lasso);
  };
  pad.onpointermove = e => {
    if (e.buttons === 0) return; const p = pt(e);
    if (cur) cur.pts.push(p); else if (lasso) lasso.push(p);
    else if (drag) { const dx = p[0] - drag[0], dy = p[1] - drag[1]; st.sel.forEach(i => st.strokes[i].pts.forEach(q => { q[0] += dx; q[1] += dy; })); drag = p; }
    else if (st.tool === "eraser") inkErase(st, p);
    inkRedraw(conv, lasso);
  };
  pad.onpointerup = () => {
    if (lasso) { st.sel = st.strokes.map((s, i) => s.pts.every(q => inPoly(q, lasso)) ? i : -1).filter(i => i >= 0); lasso = null; }
    cur = null; drag = null; inkRedraw(conv);
  };
  pad.onkeydown = e => { if ((e.key === "Delete" || e.key === "Backspace") && st.sel.length) { inkPush(st); st.strokes = st.strokes.filter((s, i) => !st.sel.includes(i)); st.sel = []; inkRedraw(conv); } };
  pad.tabIndex = 0;
  new ResizeObserver(() => inkRedraw(conv)).observe(pad);
}
function inPoly([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; }
  return inside;
}
function inkErase(st, p) {
  if (st.er === "stroke") { st.strokes = st.strokes.filter(s => !s.pts.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 6)); return; }
  const R = ERASER_R[st.er] || 4, out = [];
  for (const s of st.strokes) {                     // split strokes where the eraser passes
    let part = [];
    for (const q of s.pts) { if (Math.hypot(q[0] - p[0], q[1] - p[1]) < R) { if (part.length) out.push({ ...s, pts: part }); part = []; } else part.push(q); }
    if (part.length) out.push({ ...s, pts: part });
  }
  st.strokes = out;
}
function drawStrokes(ctx, strokes, sel = []) {
  strokes.forEach((s, i) => {
    ctx.strokeStyle = s.color; ctx.lineWidth = s.w; ctx.lineCap = ctx.lineJoin = "round";
    ctx.beginPath(); s.pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    if (s.pts.length === 1) ctx.lineTo(s.pts[0][0] + .1, s.pts[0][1]);
    ctx.stroke();
    if (sel.includes(i)) { ctx.save(); ctx.strokeStyle = "#3a78d8"; ctx.setLineDash([3, 2]); ctx.lineWidth = 1; const xs = s.pts.map(q => q[0]), ys = s.pts.map(q => q[1]);
      ctx.strokeRect(Math.min(...xs) - 3, Math.min(...ys) - 3, Math.max(...xs) - Math.min(...xs) + 6, Math.max(...ys) - Math.min(...ys) + 6); ctx.restore(); }
  });
}
function inkRedraw(conv, lasso) {
  const pad = conv.win && $(".inkpad", conv.win); if (!pad || pad.style.display === "none") return;
  const st = inkState(conv), r = pad.getBoundingClientRect(), dpr = devicePixelRatio || 1;
  if (pad.width !== Math.round(r.width * dpr) || pad.height !== Math.round(r.height * dpr)) { pad.width = Math.round(r.width * dpr); pad.height = Math.round(r.height * dpr); }
  const ctx = pad.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
  // stationery ("Rule lines"): ruled lines at college / standard / wide spacing, horizontal or vertical, or grids
  const gap = { college: 16, standard: 20, wide: 26, collegeV: 16, standardV: 20, wideV: 26, gridS: 10, gridM: 16, gridL: 24 }[st.bg];
  if (gap) {
    ctx.save(); ctx.strokeStyle = /grid/.test(st.bg) ? "#d7e3f1" : "#b9cde6"; ctx.lineWidth = 1;
    const horiz = !/V$/.test(st.bg), vert = /V$/.test(st.bg) || /grid/.test(st.bg);
    if (horiz) for (let y = gap; y < r.height; y += gap) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(r.width, y + .5); ctx.stroke(); }
    if (vert) for (let x = gap; x < r.width; x += gap) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, r.height); ctx.stroke(); }
    ctx.restore();
  }
  drawStrokes(ctx, st.strokes, st.sel);
  if (lasso && lasso.length > 1) { ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = "#555"; ctx.beginPath(); lasso.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore(); }
}
/* Send: the drawing goes into the conversation as a picture (strokes only, cropped). */
function sendInk(conv) {
  const st = inkState(conv); if (!st.strokes.length) return false;
  const all = st.strokes.flatMap(s => s.pts), pad = 6;
  const x0 = Math.min(...all.map(q => q[0])) - pad, y0 = Math.min(...all.map(q => q[1])) - pad;
  const W = Math.max(...all.map(q => q[0])) - x0 + pad, H = Math.max(...all.map(q => q[1])) - y0 + pad;
  const c = document.createElement("canvas"); c.width = W * 2; c.height = H * 2;
  const ctx = c.getContext("2d"); ctx.scale(2, 2); ctx.translate(-x0, -y0); drawStrokes(ctx, st.strokes);
  pushLog(conv, { type: "ink", from: "me", src: c.toDataURL("image/png"), w: W, h: H, ts: now(), date: today() });
  st.undo = []; st.redo = []; st.strokes = []; st.sel = []; inkRedraw(conv);
  return true;
}
