/* Messenger mockup, 2009's own copy of the code (site/2009/, a folder of its own: every version has one, and each
   copy can be changed on its own). Its data: data.js + assets/2009/. The Start menu's other versions are pages of
   their own (../<version>/); what carries over between them (contacts, conversations, settings) goes with the switch. */
"use strict";

/* ============================================================ helpers */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const h = html => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const today = () => new Date().toLocaleDateString();
// Win32 mnemonic: "&File" -> F underlined, "&&" -> "&"
const mn = s => esc(String(s).replace(/\t.*$/, "")).replace(/&amp;&amp;/g, "\u0001").replace(/&amp;(.)/, '<span class="u">$1</span>').replace(/&amp;/g, "").replace(/\u0001/g, "&amp;");
const plain = s => String(s).replace(/\t.*$/, "").replace(/&&/g, "\u0001").replace(/&/g, "").replace(/\u0001/g, "&");
const store = { get(k, d) { try { const v = localStorage.getItem("msnmock." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
                set(k, v) { try { localStorage.setItem("msnmock." + k, JSON.stringify(v)); } catch { } } };

/* ============================================================ version */
// each version is its own page (site/<version>/index.html, <html data-version="...">) with its own copy of this code
let V = VERSIONS[document.documentElement.dataset.version] || VERSIONS[store.get("version", "8.5")] || VERSIONS["8.5"];
const D = () => MSNDATA[V.id];
const has = n => D().images.includes(n);
const V_Q = typeof BUILD === "string" ? `?v=${BUILD}` : "";      // cache buster from data.js
const img = n => `assets/${V.id}/${n}.png${V_Q}`;
const first = (...names) => { for (const n of names) if (n && has(n)) return img(n); return ""; };
// a label from the version's own strings, without its &mnemonic ("Fun && &Games" -> "Fun & Games")
const tl = (k, fallback = "") => String(D().strings[k] || fallback).replace(/&&/g, "\u0001").replace(/&/g, "").replace(/\u0001/g, "&");
const sndLabel = k => (D().strings["snd_" + k] || V.soundLabels[k] || k).replace(/^\((.*)\)$/, "$1");
const S = (k, fallback) => { const v = D().strings[k] || fallback; return typeof v === "string" ? v.replace(/\\n/g, "\n") : v; };   // string tables store "\n" literally
const fmt = (s, ...a) => String(s).replace(/%(\d)(!\w+!)?/g, (m, i) => a[i - 1] ?? "").replace(/%s/g, () => a.shift() ?? "").replace(/\\n/g, "\n");

/* ============================================================ state (shared by all versions) */
const STATUS_KEYS = ["online", "busy", "brb", "away", "call", "lunch", "offline"];
const statusKeys = () => V.statusKeys || STATUS_KEYS;
const statusLabel = (s, self) => s === "offline" ? (self ? V.statusLabels.offline : (V.layout === "wm" ? "Not Online" : "Offline")) : V.statusLabels[s];
const stIcon = s => s === "online" ? first("st_online") : s === "offline" ? first("st_offline") :
  (s === "busy") ? first("st_busy") : s === "call" ? first("st_phone", "st_busy") : first("st_away");
const bigIcon = s => s === "online" ? first("big_online") : s === "offline" ? first("big_offline") : (s === "busy" || s === "call") ? first("big_busy", "big_online") : first("big_away", "big_online");

const me = { name: "John Doe", email: "john.doe@hotmail.example", psm: "", status: "online", pic: "default2", showPic: true };
let signedIn = false;          // nobody is signed in until Messenger is opened from the Start menu

/* kind: "mobile" (phone number only) | "email" (address-book entry, no IM). mobile: has a mobile number.
   space: days since their space was updated. group: null = ungrouped ("Other Contacts"). pic: display picture subject. */
let contacts = [
  { id: "ana", name: "Amy ☀", first: "Amy", last: "Walker", email: "amy.walker@hotmail.example", status: "online", psm: "beach tomorrow? (#)", group: "Favorites", pic: "beach", space: 0 },
  { id: "bruno", name: "Ben", first: "Ben", last: "Carter", email: "ben.c@live.example", status: "busy", psm: "exam season... do not disturb", group: "Favorites", pic: "chess", space: 12 },
  { id: "carla", name: "Chloe (L)", first: "Chloe", last: "Evans", email: "chloe_xo@msn.example", status: "away", song: "Coldplay - Viva la Vida", group: "Friends", pic: "flower", space: 0 },
  { id: "diogo", name: "Dan (the real one)", first: "Dan", last: "Foster", email: "dan_f@hotmail.example", status: "online", psm: "lol", group: "Friends", pic: "moto", space: 3 },
  { id: "marta", name: "Megan", first: "Megan", last: "Reed", email: "megan.r@hotmail.example", status: "brb", psm: "back in 5", group: "Friends", pic: "duck", space: 40 },
  { id: "rui", name: "Ryan ~ skater boi", first: "Ryan", last: "Scott", email: "ryan.sk8@live.example", status: "call", psm: "", group: "Friends", pic: "skater", space: 5 },
  { id: "sofia", name: "Sophie", first: "Sophie", last: "Price", email: "sophie.p@msn.example", status: "lunch", psm: "pizza time (B)", group: "Friends", pic: "dog", space: 20 },
  { id: "nuno", name: "Nick", first: "Nick", last: "Adams", email: "nick.a@hotmail.example", status: "offline", psm: "", group: "Friends", pic: "soccer", mobile: true },
  { id: "mae", name: "Mom", first: "Helen", last: "Parker", email: "helen.parker@example.com", status: "online", psm: "dinner at 8!", group: "Family", pic: "horses" },
  { id: "tiago", name: "Tom (bro)", first: "Tom", last: "Parker", email: "tom.parker@hotmail.example", status: "offline", psm: "", group: "Family", pic: "palms", space: 1 },
  { id: "avo", name: "Grandma", first: "Rose", last: "Parker", email: "+44 7700 900123", status: "offline", psm: "", kind: "mobile", group: "Family", pic: "default3" },
  { id: "tia", name: "Aunt Linda", first: "Linda", last: "Parker", email: "linda.parker@example.com", status: "offline", psm: "", kind: "email", group: "Family", pic: "default3" },
  { id: "joao", name: "John Pierce", first: "John", last: "Pierce", email: "john.pierce@work.example", status: "online", psm: "Meeting 2-4pm", group: "Work", pic: "default1", space: 9 },
  { id: "ines", name: "Irene Cole", first: "Irene", last: "Cole", email: "irene.cole@work.example", status: "away", psm: "", group: "Work", pic: "default3" },
  { id: "pedro", name: "Pete", first: "Pete", last: "Lawson", email: "pete.l@work.example", status: "offline", psm: "on holiday until Monday", group: "Work", pic: "default4", mobile: true, space: 2 },
  { id: "hugo", name: "Hugh_92", first: "Hugh", last: "Noble", email: "hugh_92@hotmail.example", status: "online", psm: "new pics on my space!!", group: null, pic: "shuttle", space: 0 },
  { id: "rita", name: "rachel.m", first: "Rachel", last: "Moore", email: "rachel.m@live.example", status: "offline", psm: "", group: null, pic: "default2", space: 60 },
  { id: "dent", name: "Smile Dental Clinic", first: "", last: "", email: "info@smiledental.example", status: "offline", psm: "", kind: "email", group: null, pic: "default3" },
];
const groups = ["Favorites", "Friends", "Family", "Work"];      // contact groups (called "categories" in 2012)
/* Named group chats. Only 2012 (features.groups) had these; older versions show the same people as a plain
   multi-person conversation titled by its participants. */
const chatGroups = [{ id: "fun", name: "fun groupchat", members: ["diogo", "carla", "joao"] }];
const groupOf = conv => V.features.groups && conv.group ? chatGroups.find(g => g.id === conv.group) : null;
const byId = id => contacts.find(c => c.id === id);

const settings = {
  myFont: null, rtl: false, history: true, customEmo: true, defaultBg: null,
  favPics: "none", sortBy: "groups", groupOffline: true, groupMobile: true, groupNonIM: false, filter: "all", viewBy: "name", listPics: "none",
  alwaysOnTop: false, actionsPane: true,
  emoticons: true, autoWinks: true, tabbedConvs: true, warnTabs: true, alertFav: true, alertMsg: true, alertMail: true, ringInv: true, mainPics: true,
  idleAway: true, lastConv: false, handwriteTab: true, inkAllowed: true, alertAdded: true, shadows: true, showFav: true, showGroups: true, showOffline: true, statusText: true, whatsNew: true, timestamps: false, groupSeq: true, nudges: true, alertOnline: true, showPics: true, psmSong: true, sounds: true,
};
const optState = {};       // generic Options values, keyed "<version>:<dialog>:<control>"
const soundOff = {};       // per event, from the Alerts and Sounds page
const REPLIES = ["hahaha :D", "yesss", "hold on a sec", "what are you doing?", "lol (Y)", "yeah yeah", "no way :O", "ok :)", "brb", "did you see that video?",
  "(H) obviously", "hmm... maybe", "hehe ;)", "nudge me later", "I'm downloading the new MSN version", "add me on myspace lol", "(L)", "back in a bit", "ahahah", "tell me everything"];

/* ============================================================ pictures */
const hasPic = () => V.features.dp;
function picUrl(key) {
  if (!hasPic()) return "";
  if (has("dp_" + key)) return img("dp_" + key);
  if (/^default/.test(key)) return first("dp_" + key, "dp_default" + ((+key.slice(7) - 1) % V.defaults.length + 1), "dp_default1");
  return first("dp_default1");
}
function frame(key, status, cls = "") {
  if (!hasPic()) return "";
  return `<div class="dp st-${status} ${cls}"><img src="${picUrl(key)}" alt=""></div>`;
}
const allPics = () => [...V.defaults, "flower", "soccer", "chess", "beach", "shuttle", "duck", "dog", "moto", "palms", "horses", "skater"].filter(k => picUrl(k));
let recentPics = ["default2"];

/* ============================================================ emoticons */
const customEmoticons = [];          // {short, name, img} made with My Custom Emoticons (7.5 / 8.5 / 2012)
const hasCustomEmo = () => V.layout !== "wm";
/* Emoticons: 4.7 uses its 47-icon strip (assets/common) with EMOTICON_CODES; 7.5 / 8.5 / 2012 use their own strip and the
   shortcut -> icon table read out of their msnmsgr.exe (data.js "emoticons"); animated ones play their frame strips. */
const ANIM_POS = { "6.2": [92, [2, 10, 29, 42, 71, 72, 73, 74, 75, 76, 77]], "7.5": [92, [2, 10, 29, 42, 71, 72, 73, 74, 75, 76, 77]],
                   "8.5": [110, [2, 10, 29, 42, 71, 72, 73, 74, 75, 76, 77]], "2009": [93, [2, 10, 29, 42, 71, 72, 73, 74, 75, 76, 77]] };
const emoCache = {};
function emoSet() {
  if (emoCache[V.id]) return emoCache[V.id];
  const E = D().emoticons;
  let codes;
  if (!E) codes = EMOTICON_CODES.map((c, i) => ({ code: c, html: `<i class="emo" style="background-image:url(assets/common/emoticons.png);background-position:${-i * 19}px 0"></i>`, idx: i, ci: true }));
  else codes = Object.entries(E.table).map(([code, idx]) => {
    const f = E.anim[idx];
    const html = f ? `<i class="emo anim" style="background-image:url(assets/${V.id}/emo_a${idx}.png);--f:${f};--d:${(f * 0.11).toFixed(2)}s"></i>`
      : `<i class="emo" style="background-image:url(assets/${V.id}/emoticons.png);background-position:${-idx * 19}px 0"></i>`;
    return { code, html, idx };
  });
  const byLen = [...codes].sort((a, b) => b.code.length - a.code.length);
  const re = new RegExp(byLen.map(c => esc(c.code).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), E ? "g" : "gi");
  const map = new Map(); codes.forEach(c => { map.set(c.ci ? esc(c.code).toLowerCase() : esc(c.code), c); });
  // picker: one icon per index, preferring the plainest shortcut (":)" over ":-)", "(A)" over "(a)"), in the version's own order
  const seen = new Map();
  codes.forEach(c => { const cur = seen.get(c.idx); const score = x => (x.code.includes("-") ? 2 : 0) + (/[a-z]/.test(x.code) && /[A-Z]/.test(x.code.toUpperCase()) && x.code !== x.code.toUpperCase() ? 1 : 0) + x.code.length / 100; if (!cur || score(c) < score(cur)) seen.set(c.idx, c); });
  const ap = ANIM_POS[V.id], pos = i => ap && i >= ap[0] ? ap[1][i - ap[0]] + 0.5 : i;
  const picker = [...seen.values()].sort((a, b) => pos(a.idx) - pos(b.idx));
  return emoCache[V.id] = { re, map, picker, ci: !E };
}
function emoticonize(text) {
  let s = esc(text);
  if (!settings.emoticons) return s;
  if (hasCustomEmo() && settings.customEmo) customEmoticons.forEach(e => { s = s.split(esc(e.short)).join(`<img class="cemo" src="${e.img}" alt="${esc(e.short)}" title="${esc(e.name || e.short)}">`); });
  const set = emoSet();
  // only replace outside tags (custom emoticons above may have added <img>)
  return s.split(/(<[^>]+>)/).map(part => part.startsWith("<") ? part : part.replace(set.re, m => {
    const e = set.map.get(set.ci ? m.toLowerCase() : m); return e ? e.html.replace("<i ", `<i title="${m}" `) : m;
  })).join("");
}

/* ============================================================ sounds (WAV, converted by tools/build.py) */
function play(evt, force, c) {
  const own = c?.sounds?.[evt];                       // 2009 / 2012 "Choose sounds for this contact": "" = don't play a sound
  if (own === "") return;
  const name = own || V.sounds[evt];
  if (!name) return;
  if (!force && (!settings.sounds || soundOff[V.id + ":" + evt])) return;
  const a = new Audio(`assets/${V.id}/sounds/${name}.wav${V_Q}`);
  a.play().catch(() => { });              // browsers block audio until the first click on the page
  return a;
}

/* ============================================================ windows */
let zTop = 10;
/* Phones (html.mobile, set in index.html): the contact list and each conversation fill the desktop above the taskbar,
   dialogs are kept inside it, so everything can be seen. */
const MOBILE = document.documentElement.classList.contains("mobile");
function mobileFit(w) {
  if (!MOBILE || !w) return;
  if (!w.dataset.prev) w.dataset.prev = JSON.stringify({ l: "8px", t: "8px", w: Math.min(innerWidth - 16, 420) + "px", h: Math.min(innerHeight - 50, 560) + "px" });
  w.classList.add("maxed");
  Object.assign(w.style, { left: "0", top: "0", width: "100vw", height: "calc(100dvh - 30px)" });
}
const closeMain = () => { const m = $("#main"); m.classList.add("hidden"); m.dataset.min = 1; };   // Messenger keeps running when its window is closed
function focusWin(w) {
  if (w.id === "debug") {                              // the mockup's tool: comes forward without deactivating Messenger
    w.classList.remove("inactive", "hidden"); delete w.dataset.min; w.style.zIndex = ++zTop; return;
  }
  $$(".win").forEach(x => x.classList.add("inactive"));
  w.classList.remove("inactive", "hidden"); delete w.dataset.min; delete w.dataset.closed; delete w.dataset.flash;
  w.style.zIndex = (settings.alwaysOnTop && w.id === "main") ? 5000 : ++zTop;
}
function makeWindow(w, { resizable = true } = {}) {
  const tb = $(".titlebar", w);
  w.addEventListener("pointerdown", () => focusWin(w));
  tb.addEventListener("pointerdown", e => {
    if (e.target.closest(".cap") || w.classList.contains("maxed") || e.button > 0) return;
    const r = w.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    const mv = ev => { w.style.left = Math.max(-r.width + 60, ev.clientX - dx) + "px"; w.style.top = Math.max(0, ev.clientY - dy) + "px"; };
    const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
    addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
  });
  const toggleMax = () => {
    const maxed = w.classList.toggle("maxed");
    if (maxed) { w.dataset.prev = JSON.stringify({ l: w.style.left, t: w.style.top, w: w.style.width || w.offsetWidth + "px", h: w.style.height || w.offsetHeight + "px" });
      Object.assign(w.style, { left: "0", top: "0", width: "100vw", height: "calc(100vh - 30px)" }); }
    else { const p = JSON.parse(w.dataset.prev); Object.assign(w.style, { left: p.l, top: p.t, width: p.w, height: p.h }); }
  };
  tb.ondblclick = e => { if (!e.target.closest(".cap") && $('[data-act="max"]', tb)) toggleMax(); };
  $$(".cap span", tb).forEach(b => b.onclick = () => {
    const a = b.dataset.act;
    if (a === "min") { w.classList.add("hidden"); w.dataset.min = 1; }
    if (a === "max") toggleMax();
    if (a === "close") w.onclose ? w.onclose() : (w.id === "main" ? closeMain() : w.remove());
  });
  if (resizable) {
    for (const d of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
      const hd = h(`<div class="rh ${d}"></div>`); w.append(hd);
      hd.addEventListener("pointerdown", e => {
        e.preventDefault(); e.stopPropagation(); focusWin(w);
        const r = w.getBoundingClientRect(), cs = getComputedStyle(w);
        const minW = parseFloat(cs.minWidth) || 200, minH = parseFloat(cs.minHeight) || 150, sx = e.clientX, sy = e.clientY;
        const mv = ev => {
          const dx = ev.clientX - sx, dy = ev.clientY - sy; let { left: l, top: t, width: W, height: H } = r;
          if (d.includes("e")) W = Math.max(minW, r.width + dx);
          if (d.includes("s")) H = Math.max(minH, r.height + dy);
          if (d.includes("w")) { W = Math.max(minW, r.width - dx); l = r.right - W; }
          if (d.includes("n")) { H = Math.max(minH, r.height - dy); t = Math.max(0, r.bottom - H); H = r.bottom - t; }
          Object.assign(w.style, { left: l + "px", top: t + "px", width: W + "px", height: H + "px" });
        };
        const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); removeEventListener("pointercancel", up); };
        addEventListener("pointermove", mv); addEventListener("pointerup", up); addEventListener("pointercancel", up);
      });
    }
    w.append(h(`<div class="grip"></div>`));
  }
  focusWin(w);
}
function newWindow({ title, icon, width, height, cls = "", caps = ["close"], left, top, resizable = false, body = "" }) {
  const w = h(`<div class="win ${cls}" style="width:${width}px;height:${height}px">
    <div class="titlebar"><img src="${icon || first("app16")}" alt=""><span class="t">${esc(title)}</span>
      <div class="cap">${caps.map(c => `<span data-act="${c}">${{ min: "&#8212;", max: "&#9633;", close: "&#10005;" }[c]}</span>`).join("")}</div></div>${body}</div>`);
  w.style.left = (left ?? Math.max(10, innerWidth / 2 - width / 2)) + "px";
  w.style.top = (top ?? Math.max(10, (innerHeight - 40) / 2 - height / 2)) + "px";
  if (MOBILE) {                                        // inside the screen, above the taskbar
    const W = Math.min(width, innerWidth), H = Math.min(height, innerHeight - 30);
    Object.assign(w.style, { width: W + "px", height: H + "px", left: Math.max(0, Math.min(parseFloat(w.style.left), innerWidth - W)) + "px",
      top: Math.max(0, Math.min(parseFloat(w.style.top), innerHeight - 30 - H)) + "px" });
  }
  document.body.append(w); makeWindow(w, { resizable });
  return w;
}
function note(text, title) {
  const w = newWindow({ title: title || V.product, width: 360, height: 150, cls: "dlgwin msgbox",
    body: `<div class="pad" style="flex:1"><div style="display:flex;gap:12px;align-items:flex-start;flex:1">
      <img src="${first("info", "big_online")}" style="width:32px;height:32px;object-fit:contain">
      <div style="white-space:pre-wrap;flex:1;font:11px Tahoma,sans-serif">${esc(text)}</div></div>
      <div style="display:flex;justify-content:flex-end"><button class="pb btn" style="min-width:75px;height:23px">OK</button></div></div>` });
  w.style.height = "auto"; w.style.minHeight = "0"; w.style.zIndex = 20000;
  $(".pb", w).onclick = () => w.remove(); $(".pb", w).focus();
}

/* ============================================================ menus */
let openMenu = null;
function closeMenus() { $$(".menu").forEach(m => m.remove()); openMenu = null; $$(".menubar>div.open").forEach(d => d.classList.remove("open")); $$(".startmenu").forEach(m => m.remove()); }
addEventListener("mousedown", e => { if (!e.target.closest(".menu,.menubar>div,.popup,.emobtn,.startmenu,#orb")) { closeMenus(); $$(".popup").forEach(p => p.remove()); } });
function showMenu(items, x, y, level = 0) {
  if (level === 0) closeMenus(); else $$(".menu").forEach(m => { if (+m.dataset.level >= level) m.remove(); });
  const m = h(`<div class="menu" data-level="${level}"></div>`);
  for (const it of items) {
    if (it === "-") { m.append(h("<hr>")); continue; }
    if (it.h) { m.append(h(`<div class="mh">${esc(it.h)}</div>`)); continue; }
    const d = h(`<div class="${it.checked ? (it.radio ? "radio" : "checked") : ""} ${it.dis ? "dis" : ""} ${it.sub ? "sub" : ""}">${it.icon ? `<img src="${it.icon}">` : ""}${mn(it.t)}${it.acc ? `<span class="acc">${esc(it.acc)}</span>` : ""}</div>`);
    d.onmouseenter = () => {
      if (it.sub) { const r = d.getBoundingClientRect(); showMenu(it.sub, r.right - 3, r.top - 3, level + 1); }
      else $$(".menu").forEach(x => { if (+x.dataset.level > level) x.remove(); });
    };
    d.onclick = () => { if (it.sub || it.dis) return; closeMenus(); it.fn ? it.fn() : note("Not available"); };
    m.append(d);
  }
  document.body.append(m);
  const r = m.getBoundingClientRect();
  m.style.left = (x + r.width > innerWidth - 4 ? (level ? x - r.width * 2 + 6 : innerWidth - r.width - 4) : x) + "px";
  m.style.top = Math.max(0, Math.min(y, innerHeight - r.height - 44)) + "px";
  m.style.zIndex = 99999 + level; openMenu = m;
}
function buildMenubar(bar, defs) {
  bar.innerHTML = "";
  for (const [label, itemsFn] of defs) {
    const d = h(`<div>${mn(label)}</div>`);
    d.onmousedown = e => {
      e.stopPropagation(); const r = d.getBoundingClientRect(), was = d.classList.contains("open");
      closeMenus(); if (was) return; showMenu(itemsFn(), r.left, r.bottom); d.classList.add("open");
    };
    bar.append(d);
  }
}
/* Real menus (data.js) -> menu items. Placeholder entries that Messenger fills at runtime ("&S", "&T", "&W...") are dropped. */
const normLabel = s => plain(s).replace(/\.\.\.$/, "").trim().toLowerCase();
function convertMenu(items, path, ctx) {
  const out = [], seen = new Set();
  for (const it of items) {
    if (it.sep) { if (out.length && out[out.length - 1] !== "-") out.push("-"); continue; }
    let label = normLabel(it.t), label0 = it.t.split("\t")[0];
    const acc = it.t.split("\t")[1];
    // placeholders the program replaced at runtime: one-letter items, "Brand ... menu"; DEFAULT = the bold default action
    if (label.replace(/\W/g, "").length <= 1 || /^brand .*menu$/.test(label)) continue;
    if (label === "default") { const im = findItem(items, /^send an instant message$/); if (!im) continue; label0 = im.t; label = normLabel(im.t); }
    if (seen.has(label)) continue; seen.add(label);                 // 2012's templates list some entries twice
    const p = [...path, label];
    const node = { t: label0, acc };
    const r = resolveCommand(p, ctx) || {};
    if (r.hidden) continue;
    if (r.sub) { node.sub = r.sub; out.push(node); continue; }                                // filled at runtime (e.g. "Move contact to")
    if (it.sub) { node.sub = convertMenu(it.sub, p, ctx); if (!node.sub.filter(x => x !== "-").length) continue; }
    else Object.assign(node, r);
    if (it.chk && node.checked === undefined) node.checked = true;
    if (it.dis && !node.sub && !node.fn) node.dis = true;
    if (node.sub) node.dis = false;
    out.push(node);
  }
  while (out[out.length - 1] === "-") out.pop();
  while (out[0] === "-") out.shift();
  return out;
}
function findItem(items, re) { for (const it of items || []) { if (it.t && re.test(normLabel(it.t))) return it; const f = findItem(it.sub, re); if (f) return f; } return null; }
/* A right-click / dropdown menu from the version's MENU resources (data.js menus.<key>): its single popup's items. */
function ctxMenu(key, ctx) {
  const tree = D().menus?.[key]; if (!tree) return null;
  const items = tree.length === 1 && tree[0].sub ? tree[0].sub : tree;
  const out = convertMenu(items, [key], ctx);
  return out.length ? out : null;
}
function menuDefsFrom(tree, ctx) {
  return tree.map(top => [top.t, () => {
    let items = convertMenu(top.sub || [], [normLabel(top.t)], ctx);
    if (normLabel(top.t) === "help" && !items.length) items = ctxMenu("help", "help") || [];      // the program filled Help from menu 299
    return items;
  }]);
}
const STATUS_BY_LABEL = { "available": "online", "online": "online", "busy": "busy", "be right back": "brb", "away": "away", "on the phone": "call", "in a call": "call", "out to lunch": "lunch", "appear offline": "offline" };
const radioSet = (k, v) => ({ radio: true, checked: settings[k] === v, fn: () => { settings[k] = v; if (k === "sortBy") settings._sortChosen = true; renderList(); } });
const toggleSet = k => ({ checked: !!settings[k], fn: () => { settings[k] = !settings[k]; renderList(); if (k === "actionsPane") renderMain(); } });
/* Maps a menu path (normalized labels) to behaviour. ctx = "main" or a conversation object. */
const web = label => ({ fn: () => note("Not available") });
const mobileNote = { fn: () => note("Not available") };
const phoneNote = { fn: () => note("Not available") };
function resolveCommand(path, ctx) {
  const p = path.join(">"), last = path[path.length - 1];
  if (ctx && typeof ctx === "object" && !ctx.log) return resolveObjCommand(path, ctx);
  if (["status", "help", "edit", "hist", "mypic", "share"].includes(ctx)) return resolveMenuCommand(path, ctx);
  const conv = typeof ctx === "object" ? ctx : null;
  if (last in STATUS_BY_LABEL && /status/.test(p)) { const k = STATUS_BY_LABEL[last]; return { radio: true, checked: me.status === k, icon: stIcon(k), fn: () => setMyStatus(k) }; }
  if (/sign ?out$/.test(last)) return { fn: () => signOut(true) };
  if (/^options$/.test(last)) return { fn: () => openOptions() };
  if (/^about/.test(last)) return { fn: about };
  if (/^close$/.test(last)) return { fn: () => conv ? closeConv(conv) : closeMain() };
  if (/always on top/.test(last)) return conv ? { fn: () => { } } : { checked: settings.alwaysOnTop, fn: () => { settings.alwaysOnTop = !settings.alwaysOnTop; focusWin($("#main")); } };
  if (/change (display |your )?picture/.test(last)) return hasPic() ? { fn: changeMyPic } : null;
  if (/change your (theme|scene)/.test(last)) return V.features.scenes ? { fn: () => scenePicker(plain(path[path.length - 1]).replace(/\.\.\.$/, "")) } : null;
  if (/change your badge/.test(last)) return { fn: badgeDialog };
  if (/^exit messenger$/.test(last)) return { fn: () => signOut(true) };
  if (/(show|enable) emoticons/.test(last)) return { checked: settings.emoticons, fn: () => { settings.emoticons = !settings.emoticons; renderAll(); } };
  if (conv) {
    if (/invite/.test(last)) return { fn: () => invite(conv) };
    if (/nudge/.test(last)) return { fn: () => nudge(conv, true) };
    if (/^block$/.test(last)) return { fn: () => block(conv) };
    if (/backgrounds?$/.test(last)) return { fn: () => cycleBg(conv) };
    if (/send a (file|single file)/.test(last)) return { fn: () => sendFile(conv) };
    if (/^save$|^save as$/.test(last)) return { fn: () => saveConversation(conv) };
    if (/open received files/.test(last)) return { fn: openReceived };
    if (/(view|open) message history/.test(last)) return { fn: () => openHistory(conv.ids[0]) };
    if (/^change font$/.test(last)) return { fn: () => fontDialog() };
    if (/text direction>left to right$/.test(p)) return { radio: true, checked: !settings.rtl, fn: () => { settings.rtl = false; renderAll(); } };
    if (/text direction>right to left$/.test(p)) return { radio: true, checked: settings.rtl, fn: () => { settings.rtl = true; renderAll(); } };
    const edit = { undo: "undo", cut: "cut", copy: "copy", paste: "paste", delete: "delete", "select all": "selectAll" }[last];
    if (/^edit>/.test(p) && edit) return { fn: () => editCommand(conv, edit) };
    if (/show toolbars?>standard$|^view>show toolbar$/.test(p)) return { checked: !conv.hideTb, fn: () => { conv.hideTb = !conv.hideTb; applyConvChrome(conv); } };
    if (/show toolbars>formatting$/.test(p)) return { checked: !conv.hideFmt, fn: () => { conv.hideFmt = !conv.hideFmt; applyConvChrome(conv); } };
    if (/^view>show sidebar$/.test(p)) return { checked: !conv.hideSide, fn: () => { conv.hideSide = !conv.hideSide; applyConvChrome(conv); } };
    if (/^text size$/.test(last)) return { fn: () => textSizeDialog(conv) };
    if (/audio (and|&) video setup|set up audio and video|audio tuning wizard/.test(last)) return { fn: avSetup };
    if (/webcam settings|web camera settings/.test(last)) return { fn: cameraSettings };
    if (/emoticons$/.test(last) && !/show/.test(last)) return hasCustomEmo() ? { fn: myEmoticons } : null;
    if (/winks$/.test(last)) return { fn: () => myWinks(conv) };
    if (/backgrounds$/.test(last)) return V.features.backgrounds ? { fn: () => myBackgrounds(conv) } : null;
    if (/picture-in-picture/.test(last)) return { checked: !!conv.pip, fn: () => { conv.pip = !conv.pip; refreshConv(conv); } };
    if (/stop sending video|stop (a|the) video/.test(last)) return { fn: () => conv.call?.type === "video" && endCall(conv) };
    if (/stop (a|the) voice|stop talking/.test(last)) return { fn: () => conv.call && endCall(conv) };
    if (/video (call|conversation)|webcam|start a video/.test(last)) return { fn: () => toggleCall(conv, "video") };
    if (/(voice|audio) conversation|call computer|call contact|start talking|start a voice|^call$/.test(last)) return { fn: () => toggleCall(conv, "voice") };
    if (/wink/.test(last)) return { fn: () => wink(conv) };
    const one = () => byId(conv.ids[0]);
    if (/^add to contacts$/.test(last)) return { fn: () => sysMsg(conv, "info", S("alreadyAll", "")) };
    if (/^properties$/.test(last)) return { fn: () => editContact(one()) };
    if (/profile$|view photos|publish files online|upgrade this contact|open viewer for shared item/.test(last)) return web(last);
    if (/send (an )?e-?mail( message)?$/.test(last)) return { fn: () => note("Not available") };
    if (/make a phone call|^call (home|mobile|work|other)$|call a new number/.test(last)) return phoneNote;
    if (/start (an )?activity|play a game|start test activity|show fun\s+&?\s*games/.test(last)) return { fn: () => activityInvite(conv, last) };
    if (/remote assistance/.test(last)) return { fn: () => inviteToStart(conv, S("remoteAssist", "Remote Assistance")) };
    if (/start application sharing/.test(last)) return { fn: () => inviteToStart(conv, S("appSharing", "Application Sharing")) };
    if (/start whiteboard/.test(last)) return { fn: () => inviteToStart(conv, S("whiteboard", "Whiteboard")) };
    if (/^start 3° (groups|musicmix)$/.test(last)) return { fn: () => inviteToStart(conv, plain(path[path.length - 1]).replace(/^start /i, "")) };
    if (/block and report abuse|report as compromised/.test(last)) return { fn: () => { block(conv); } };
    if (/^private message$/.test(last)) return conv.ids.length > 1 ? { fn: () => pickContact(plain(last), c => openChat([c.id]), " ", conv.ids) } : { dis: true };
    if (/^appear offline to this person$/.test(last)) return conv.ids.length === 1 ? { checked: !!one()?.appearOff, fn: () => { one().appearOff = !one().appearOff; } } : { dis: true };
    if (/show my contact's scene/.test(last)) return { checked: settings.contactScene !== false, fn: () => { settings.contactScene = settings.contactScene === false; applyScene(); } };
    if (/picture previews in instant messages|preview pictures before transfer/.test(path.join(">"))) {
      const v = { large: "large", small: "small", none: "none" }[last];
      if (v) return { radio: true, checked: (settings.picPreview || "large") === v, fn: () => { settings.picPreview = v; convs.forEach(c => c.win && renderHistory(c)); } };
    }
    if (/display emoticons in instant messages/.test(last)) return { checked: settings.emoticons, fn: () => { settings.emoticons = !settings.emoticons; renderAll(); } };
    if (/sharing folder/.test(last)) return { fn: () => note("Not available") };
    if (/^use ink$/.test(last)) return hasInk() && settings.inkAllowed !== false ? { checked: !!conv.ink?.on, fn: () => setInkMode(conv, !conv.ink?.on) } : { dis: true };
    if (/^help topics$/.test(last)) return web(last);
    const size = { largest: 16, larger: 14, medium: 13, smaller: 11, smallest: 10 }[last];
    if (/text size/.test(p) && size) return { radio: true, checked: (conv.fontSize || 13) === size, fn: () => { conv.fontSize = size; renderHistory(conv); } };
    return null;
  }
  if (/sharing folder/.test(last)) return { fn: () => note("Not available") };
  if (/verify my e-?mail address/.test(last)) return D().dlg?.["212"] ? { fn: verifyEmail } : web(last);
  if (/^go to>/.test(path.slice(1).join(">")) && !/inbox/.test(last)) return web(last);
  if (/msn (home|today)|chat rooms|windows live today|offline messages|address book|advanced search|search by interest|view profile|online files|mobile settings|msn direct|watch settings|phone numbers|^help topics$/.test(last)) return web(last);
  if (/send a message to (a mobile device|an msn direct)/.test(last)) return mobileNote;
  if (/make a phone call|call a phone/.test(last)) return phoneNote;
  if (/^send (an )?e-?mail( message)?$/.test(last)) return { fn: () => pickContact(plain(last), c => note("Not available")) };
  if (/start an activity|play a game/.test(last)) return { fn: () => pickContact(plain(last), c => activityInvite(openChat([c.id]), last)) };
  if (/remote assistance/.test(last)) return { fn: () => pickContact(plain(last), c => inviteToStart(openChat([c.id]), S("remoteAssist", "Remote Assistance"))) };
  if (/start application sharing|start whiteboard|start 3°/.test(last)) {
    const what = /application/.test(last) ? S("appSharing", "Application Sharing") : /whiteboard/.test(last) ? S("whiteboard", "Whiteboard") : plain(path[path.length - 1]).replace(/^start /i, "");
    return { fn: () => pickContact(plain(last), c => inviteToStart(openChat([c.id]), what)) };
  }
  if (/alerts history/.test(last)) return { fn: () => alertsHistory(plain(path[path.length - 1])) };
  if (/show your webcam|view a contact's webcam/.test(last)) return { fn: () => pickContact(plain(last), c => toggleCall(openChat([c.id]), "video")) };
  if (/^show tabs$/.test(last)) return { checked: settings.showTabs !== false, fn: () => { settings.showTabs = settings.showTabs === false; note("Not available"); } };
  if (/use windows color scheme/.test(last)) return { checked: !!settings.winColors, fn: () => { settings.winColors = !settings.winColors; document.body.classList.toggle("wincolors", settings.winColors); } };
  if (/add a contact$/.test(last)) return { fn: addContact };
  if (V.features.groups && /^create a group$/.test(last)) return { fn: createChatGroup };
  if (/(create a (new )?group|create new group|add a group|create a category)$/.test(last)) return { fn: createGroup };
  if (/sort contacts by/.test(p)) {
    if (last === "groups") return radioSet("sortBy", "groups");
    if (/online \/ offline|^status$/.test(last)) return radioSet("sortBy", "status");
    if (/recently updated/.test(last)) return radioSet("sortBy", "spaces");
  }
  if (/group mobile contacts/.test(last)) return toggleSet("groupMobile");
  if (/group offline contacts/.test(last)) return toggleSet("groupOffline");
  if (/group non-instant/.test(last)) return toggleSet("groupNonIM");
  if (/filter contacts/.test(p)) return { "show all contacts": radioSet("filter", "all"), "messenger contacts only": radioSet("filter", "messenger"), "online contacts only": radioSet("filter", "online") }[last] || null;
  if (/view contacts by/.test(p)) return { "display name": radioSet("viewBy", "name"), "first and last name": radioSet("viewBy", "first"), "e-mail address": radioSet("viewBy", "email") }[last] || null;
  if (/view display pictures/.test(p)) return { large: radioSet("listPics", "large"), small: radioSet("listPics", "small"), none: radioSet("listPics", "none") }[last] || null;
  if (/show actions pane/.test(last)) return toggleSet("actionsPane");
  if (/open received files/.test(last)) return { fn: openReceived };
  if (/audio (and|&) video setup|set up audio and video|audio tuning wizard/.test(last)) return { fn: avSetup };
  if (/webcam settings|web camera settings/.test(last)) return { fn: cameraSettings };
  if (/emoticons$/.test(last)) return hasCustomEmo() ? { fn: myEmoticons } : null;
  if (/winks$/.test(last) && !/send/.test(last)) return { fn: () => myWinks(null) };
  if (/send a wink/.test(last)) return V.features.winks ? { fn: () => pickContact(plain(path[path.length - 1]), c => { const cv = openChat([c.id]); setTimeout(() => wink(cv), 50); }) } : null;
  if (/backgrounds$/.test(last)) return V.features.backgrounds ? { fn: () => myBackgrounds(null) } : null;
  if (/^delete (a )?contact$/.test(last)) return { fn: () => pickContact(plain(S("deleteContact", "Delete a Contact")), c => deleteContactFlow(c), " ") };
  if (/^(edit a contact|properties)$/.test(last)) return { fn: () => pickContact("Edit contact", c => editContact(c), " ") };
  if (/^(rename a group|edit a group|edit a category)$/.test(last)) return { fn: () => pickGroup(plain(path[path.length - 1]), g => renameGroup(g)) };
  if (/^(delete a group|delete a category)$/.test(last)) return { fn: () => pickGroup(plain(S("deleteAGroup", path[path.length - 1])), g => deleteGroup(g), S("selectGroupDelete")) };
  if (/^save (contact list|instant messaging contacts)$/.test(last)) return { fn: saveContactList };
  if (/^import (contacts from a (saved )?file|instant messaging contacts)$/.test(last)) return { fn: importContactList };
  if (/send a (file|single file)/.test(last)) return { fn: () => pickContact(plain(path[path.length - 1]), c => sendFile(openChat([c.id]))) };
  if (/(view|open) message history/.test(last)) return { fn: () => pickContact(plain(S("pickHistory", "Message History")).slice(0, 60), c => openHistory(c.id), S("pickHistory")) };
  if (/start an? (video|voice|audio)|video call|send my webcam|call a contact/.test(last)) {
    const type = /video|webcam/.test(last) ? "video" : "voice";
    return { fn: () => pickContact(plain(path[path.length - 1]), c => { const cv = openChat([c.id]); toggleCall(cv, type); }) };
  }
  if (/send an instant message/.test(last)) return { fn: () => pickContact("Send an Instant Message", c => openChat([c.id])) };
  if (/inbox/.test(last)) return { fn: mailToast };
  return null;
}
/* The version's own right-click menus on a contact ({ contact }), a group / category header ({ group }), a 2009 group
   ({ chatgroup }) or the Favorites header ({ fav }). Items come in pairs the program showed one of (block / unblock ...). */
function resolveObjCommand(path, ctx) {
  const last = path[path.length - 1], p = path.join(">");
  const c = ctx.contact, g = ctx.group, grp = ctx.chatgroup;
  if (c) {
    const im = !c.kind, fav = c.group === "Favorites";
    if (/^(add contact to contact list|add to contacts)$/.test(last)) return { hidden: true };            // already a contact
    if (/^private message$|^report abuse$/.test(last)) return { hidden: true };                           // 2012: group conversations only
    if (/^send (an )?(instant message|im)$/.test(last)) return im ? { fn: () => openChat([c.id]), bold: true } : { dis: true };
    if (/offline instant message/.test(last)) return c.status === "offline" && im ? { fn: () => openChat([c.id]) } : { hidden: true };
    if (/^(send (an )?e-?mail|e-?mail)$/.test(last)) return { fn: () => note("Not available") };
    if (/mobile|sms|msn direct|watch/.test(last)) return mobileNote;
    if (/^call (mobile|home|work|other)$|call a phone/.test(last)) return phoneNote;
    if (/send a wink/.test(last)) return V.features.winks && im ? { fn: () => { const cv = openChat([c.id]); setTimeout(() => wink(cv), 50); } } : { hidden: true };
    if (/send a (file|single file)/.test(last)) return im ? { fn: () => sendFile(openChat([c.id])) } : { dis: true };
    if (/start a voice conversation|call computer|voice call/.test(last)) return im ? { fn: () => toggleCall(openChat([c.id]), "voice") } : { dis: true };
    if (/webcam|video conversation|video call/.test(last)) return im ? { fn: () => toggleCall(openChat([c.id]), "video") } : { dis: true };
    if (/start an activity|play a game/.test(last)) return { fn: () => activityInvite(openChat([c.id]), last) };
    if (/message history$/.test(last)) return { fn: () => openHistory(c.id) };
    if (/contact card$/.test(last)) return { fn: () => { const r = $(`#clist .c[data-id="${c.id}"]`)?.getBoundingClientRect(); showCard(c, r ? r.right : 200, r ? r.top : 200); } };
    if (/profile$/.test(last)) return web(last);
    if (/^copy contact to$/.test(last)) return { sub: groups.filter(x => x !== c.group).map(x => ({ t: x, fn: () => note(`${plain(c.name)} is now also in ${x}.`) })) };
    if (/^move contact to$/.test(last)) return { sub: [...groups, null].filter(x => x !== c.group).map(x => ({ t: x ?? S("other", "Other Contacts"), fn: () => { c.group = x; renderList(); } })) };
    if (/^remove contact from (group|category)$/.test(last)) return c.group ? { fn: () => { c.group = null; renderList(); } } : { dis: true };
    if (/^(delete contact|delete)$/.test(last)) return { fn: () => deleteContactFlow(c) };
    if (/^(block|block contact|block this contact)$/.test(last)) return c.blocked ? { hidden: true } : { fn: () => { c.blocked = true; renderList(); refreshConvs(); } };
    if (/^unblock( contact| this contact)?$/.test(last)) return c.blocked ? { fn: () => { c.blocked = false; renderList(); refreshConvs(); } } : { hidden: true };
    if (/^add to favorites$/.test(last)) return fav ? { hidden: true } : { fn: () => { c.group = "Favorites"; renderList(); } };
    if (/^remove from favorites$/.test(last)) return fav ? { fn: () => { c.group = null; renderList(); } } : { hidden: true };
    if (/^move (up|down)$/.test(last)) {
      if (!fav) return { hidden: true };
      return { fn: () => { const i = contacts.indexOf(c), favs = contacts.filter(x => x.group === "Favorites"), j = favs.indexOf(c) + (last === "move up" ? -1 : 1);
        if (favs[j]) { const k = contacts.indexOf(favs[j]); [contacts[i], contacts[k]] = [contacts[k], contacts[i]]; renderList(); } } };
    }
    if (/^add a nickname$/.test(last)) return c.nick ? { hidden: true } : { fn: () => nicknameDlg(c, last) };
    if (/^edit nickname$/.test(last)) return c.nick ? { fn: () => nicknameDlg(c, last) } : { hidden: true };
    if (/^edit contact$|^properties$/.test(last)) return { fn: () => editContact(c) };
    if (/receive contact updates/.test(last)) return { checked: c.updates !== false, fn: () => { c.updates = c.updates === false; } };
    if (/what is i'm/.test(last)) return web(last);
    if (/^appear offline to this person$/.test(last)) return c.appearOff ? { hidden: true } : { fn: () => { c.appearOff = true; } };
    if (/^(appear online|show your status) to this person$/.test(last)) return c.appearOff ? { fn: () => { c.appearOff = false; } } : { hidden: true };
    if (/choose sounds for this contact/.test(last)) return { fn: () => contactSounds(c) || openOptions("Sounds") };
    if (/report as compromised|report abuse/.test(last)) return web(last);
    return null;
  }
  if (g !== undefined) {                     // a group (category) header
    const members = () => contacts.filter(x => x.group === g && !x.kind && x.status !== "offline").map(x => x.id);
    if (/send (an )?instant message to (this group|category)/.test(last)) return members().length ? { fn: () => openChat(members()) } : { dis: true };
    if (/^rename (group|category)$|^edit (group|category)$/.test(last)) return { fn: () => renameGroup(g) };
    if (/^delete (group|category)$/.test(last)) return { fn: () => deleteGroup(g) };
    if (/^create (new )?(group|category)$/.test(last)) return { fn: createGroup };
    if (/save group to a file/.test(last)) return { fn: saveContactList };
    if (/create a group from this category/.test(last)) return V.features.groups ? { fn: createChatGroup } : null;
    if (/change contact list layout/.test(last)) return { fn: () => openOptions("Layout") };
    return null;
  }
  if (grp) {                                 // 2009 group (named group chat)
    if (/send instant message to group/.test(last)) return { fn: () => openChat(grp.members, { group: grp.id }) };
    if (/invite people to group/.test(last)) return { fn: () => inviteToGroup(grp) };
    if (/view message history/.test(last)) return { fn: () => openHistory(grp.members[0]) };
    if (/leave group/.test(last)) return { fn: () => { chatGroups.splice(chatGroups.indexOf(grp), 1); convs.filter(x => x.group === grp.id).forEach(x => x.group = null); renderList(); refreshConvs(); } };
    if (/^block group$/.test(last)) return grp.blocked ? { hidden: true } : { fn: () => { grp.blocked = true; } };
    if (/^unblock group$/.test(last)) return grp.blocked ? { fn: () => { grp.blocked = false; } } : { hidden: true };
    if (/website|group settings|edit group|discussions|^view$/.test(last) || /^view>/.test(p.split(">").slice(1).join(">"))) return web(last);
    return web(last);
  }
  if (ctx.fav) {
    if (/change favorites layout/.test(last)) return { fn: () => openOptions("Layout") };
    if (/edit favorites/.test(last)) return { fn: () => pickContact(plain(last), x => { x.group = "Favorites"; renderList(); }) };
  }
  return null;
}
/* Menus under your name ("status"), Help, and the right-click menus of the typing box ("edit") / conversation text ("hist"). */
function resolveMenuCommand(path, ctx) {
  const last = path[path.length - 1];
  if (ctx === "status") {
    if (last in STATUS_BY_LABEL) { const k = STATUS_BY_LABEL[last]; return statusKeys().includes(k) ? { radio: true, checked: me.status === k, icon: stIcon(k), fn: () => setMyStatus(k) } : { hidden: true }; }
    if (/^sign out/.test(last)) return { fn: () => signOut(true) };
    if (/change (my |your )?display picture|change your picture/.test(last)) return hasPic() ? { fn: changeMyPic } : { hidden: true };
    if (/change (your )?scene/.test(last)) return V.features.scenes ? { fn: () => scenePicker(plain(path[path.length - 1]).replace(/\.\.\.$/, "")) } : { hidden: true };
    if (/change display name/.test(last)) return { fn: () => inlineEdit("name") };
    if (/personal settings|^options$/.test(last)) return { fn: () => openOptions(/personal/.test(last) ? "Personal" : undefined) };
    if (/contact card|personal space|blog entry|profile|social updates|online files|friends list|share your contact info/.test(last)) return web(last);
    return null;
  }
  if (ctx === "mypic") {
    if (/change your picture/.test(last)) return { fn: changeMyPic };
    return web(last);
  }
  if (ctx === "help") return /^about/.test(last) ? { fn: about } : web(last);
  if (ctx === "share") return /^photos from your computer/.test(last) ? { fn: () => photoShare(activeConvForMenu) }
    : /from your computer/.test(last) ? { fn: () => sendFile(activeConvForMenu) } : web(last);
  const conv = activeConvForMenu;
  const edit = { undo: "undo", cut: "cut", copy: "copy", paste: "paste", delete: "delete", "select all": "selectAll" }[last];
  if (edit && conv) return { fn: () => editCommand(conv, edit) };
  if (/^change font$/.test(last)) return { fn: fontDialog };
  if (/right-to-left reading order/.test(last)) return { checked: !!settings.rtl, fn: () => { settings.rtl = !settings.rtl; renderAll(); } };
  return null;
}
let activeConvForMenu = null;
/* Activities and games: their lists came from MSN's servers, so choosing one sends an invitation that is declined
   (the version's own invitation wording). */
function activityInvite(conv, label) {
  inviteToStart(conv, plain(label).replace(/^(start an |play a )/i, "").replace(/\.\.\.$/, ""));
}
/* 2009 / 2012 "Sounds for <contact>" (4010/958 MySoundsDialog, 2012 966 PerContactDialog): one row per event (the
   eventbutton / seCategory template), opening onto the sound library (signaturesoundbutton / seSoundItem rows), named
   as sounds.mct's content.xml names them. The choice then plays for that contact. */
function uiPart(name) {
  const u = D().ui?.[name]; if (!u) return null;
  const scope = `ui${V.id.replace(".", "")}-${name}`, sid = "css-" + scope;
  if (!document.getElementById(sid)) document.head.append(Object.assign(document.createElement("style"), { id: sid, textContent: u.css }));
  return () => h(`<div class="${scope} uipart">${u.html}</div>`);
}
function contactSounds(c) {
  const name = V.id === "2009" ? "sounds" : "contactsounds";
  const u = D().ui?.[name], lib = D().soundlib || [];
  const ev = uiPart("sndevent"), item = uiPart("snditem");
  if (!u?.strings || !lib.length || !ev || !item) return false;
  const T = i => u.strings[i] || "";
  // the picker's size is in the string table beside its strings (2009: 450 x 500; 2012 keeps only its height, 370)
  const ui = uiDialog(name, { title: T(38028) + plain(c.name), width: +T(38101) || 450, height: +T(38100) || +T(38116) + 130 || 500 }); if (!ui) return false;
  const { w, q } = ui;
  if (q("instructions")) q("instructions").textContent = T(38029);
  const host = q("SoundEventCategories") || q("CategoryList") || q("listofapps");
  host.innerHTML = ""; host.classList.add("uisndlist");
  // the events a contact's sound can be set for, and the default each one plays
  const events = [["online", T(38113) || T(38003), T(38104)], ["type", T(38112) || T(38022), T(38105)]];
  const pick = { ...(c.sounds || {}) };
  const libName = k => lib.find(x => x[0] === k)?.[1] || k;
  const defName = (evt, tag) => lib.find(x => x[0] === V.sounds[evt] && /^Default/.test(x[1]))?.[1] || T(38033) + tag;
  const secs = n => n == null ? "" : `${n.toFixed(1)} ${T(38041)}`;
  for (const [evt, label, tag] of events) {
    const row = ev(), cur = () => pick[evt] === "" ? T(38034) : pick[evt] ? libName(pick[evt]) : defName(evt, tag);
    const set = (id, t) => $$(`[data-id="${id}"]`, row).forEach(e => e.textContent = t);
    set("EventID", label); set("currentsound", cur());
    const list = $('[data-id="soundlist"]', row) || $("[data-list]", row);
    const choices = [[undefined, defName(evt, tag), lib.find(x => x[0] === V.sounds[evt])?.[2]], ["", T(38034), null],
      ...lib.filter(x => !/^Default/.test(x[1])).map(x => [x[0], x[1], x[2]])];
    if (list) {
      list.style.display = "none"; list.classList.add("uisndchoices");
      for (const [k, n, len] of choices) {
        const it = item(), radio = $("input", it);
        $("label span", it).textContent = n; radio.type = "radio"; radio.name = "snd-" + evt; radio.checked = pick[evt] === k;
        $$('[data-id="soundlength"]', it).forEach(e => e.textContent = secs(len));
        const pl = $('[data-id="play"]', it); if (pl) { pl.style.visibility = k === "" ? "hidden" : ""; pl.onclick = e => { e.stopPropagation(); const a = new Audio(`assets/${V.id}/sounds/${k || V.sounds[evt]}.wav${V_Q}`); a.play().catch(() => { }); }; }
        const rm = $('[data-id="remove"]', it); if (rm) rm.style.display = "none";     // the library's own sounds can't be removed
        radio.onchange = () => { pick[evt] = k; if (k === undefined) delete pick[evt]; set("currentsound", cur()); };
        list.append(it);
      }
    }
    const toggle = e => { if (e.target.closest(".uisndchoices,[data-id='addsound']")) return; if (list) list.style.display = list.style.display === "none" ? "" : "none"; };
    (row.firstElementChild || row).addEventListener("click", toggle);
    $$('[data-id="addsound"]', row).forEach(b => b.onclick = e => { e.stopPropagation(); note("Not available"); });
    host.append(row);
  }
  q("idok").onclick = () => { c.sounds = pick; w.remove(); };
  return true;
}
/* 2009 / 2012 "Create a display picture with your webcam" (4010/960 WebcamSnapshotDialog). The camera is the mockup's
   simulated one (you: your own picture), so the snapshot or the 4-second clip gives back that picture. */
function webcamSnapshot(onShot) {
  const ui = uiDialog("snapshot"); if (!ui) return note("Not available");
  const { w, q } = ui, show = (id, on) => { const e = q(id); if (e) e.style.display = on ? "" : "none"; };
  ["idWebcamError", "idGenerating", "idRecordProgress", "idRedDotArea", "idRecordIndicator", "idPreview"].forEach(id => show(id, false));
  const host = q("idWebcamhost");
  if (host) { host.style.position = "relative"; host.style.overflow = "hidden"; host.innerHTML = fakecam("me", "snap"); }
  const done = q("idok"); if (done) done.disabled = true;           // "Done" waits for a preview (SnapshotDlg::PreviewExist)
  let got = false;
  const preview = () => {                                              // the result replaces the empty preview box
    const pv = q("idPreview"); got = true;
    if (pv) { pv.style.position = "relative"; pv.innerHTML = me.showPic && hasPic() ? `<img src="${picUrl(me.pic)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">` : ""; }
    show("idEmptyPreview", false); show("idPreview", true); if (done) done.disabled = false;
  };
  q("idSnapshot")?.addEventListener("click", () => { host?.classList.remove("flash"); void host?.offsetWidth; host?.classList.add("flash"); preview(); });
  q("idRecord")?.addEventListener("click", () => {
    show("idRedDotArea", true); show("idRecordProgress", true); show("idRecordIndicator", true);
    const bar = $("progress", q("idRecordProgress") || w); let t = 0;
    const iv = setInterval(() => { t += .1; if (bar) { bar.max = 4; bar.value = t; }
      if (t >= 4 || !w.isConnected) { clearInterval(iv); ["idRedDotArea", "idRecordProgress", "idRecordIndicator"].forEach(id => show(id, false)); if (w.isConnected) preview(); } }, 100);
  });
  if (done) done.onclick = () => { if (!got) return; onShot?.(); w.remove(); };
}
/* the Games / Activities drop-down (4010 or UIFILE 930 GamesLobby): it asks the service for the list ("Contacting
   service..."); that service is gone, so it ends on the program's own "temporarily unavailable" message */
function gamesLobby(conv, btn) {
  const u = D().ui?.games; if (!u) return false;
  const scope = `ui${V.id.replace(".", "")}-games`, sid = "css-" + scope;
  if (!document.getElementById(sid)) document.head.append(Object.assign(document.createElement("style"), { id: sid, textContent: u.css }));
  $$(".popup").forEach(p => p.remove());
  const p = h(`<div class="popup uilobby"><div class="uibody ${scope}">${u.html}</div></div>`);
  document.body.append(p);
  const q = id => $(`[data-id="${id}"]`, p), show = (id, on) => { const e = q(id); if (e) e.style.display = on ? "" : "none"; };
  ["ContactingError", "NoApps", "LocalApps", "LocalAppContainer", "MenuSeparator"].forEach(id => show(id, false));
  show("Contacting", true);
  const r = btn.getBoundingClientRect();
  p.style.left = Math.max(0, Math.min(r.left, innerWidth - p.offsetWidth - 4)) + "px";
  p.style.top = Math.min(r.bottom, innerHeight - p.offsetHeight - 34) + "px";
  setTimeout(() => { if (!p.isConnected) return; show("Contacting", false); show("ContactingError", true); }, 1800);
  return true;
}
function inviteToStart(conv, what) {
  const c = byId(conv.ids[0]); if (!c) return;
  const cancel = S("lblCancel", "Cancel");
  if (V.layout === "wm") sysMsg(conv, "info", fmt(S("inviteUsing", "You have invited %1 to start using %2. Please wait for a response or %3 the pending invitation."), plain(c.name), what, cancel));
  else sysMsg(conv, "info", fmt(S("invitedStart", "You have invited %1 to start %2. Please wait for a response or %5 (Alt+Q) the pending invitation."), plain(c.name), what, "", "", cancel));
  setTimeout(() => { if (!conv.win) return; sysMsg(conv, "info", fmt(S(V.layout === "wm" ? "declinedUsing" : "declinedStart", "%1 has declined your invitation to start %2."), plain(c.name), what)); }, 5000);
}
function nicknameDlg(c, label) {
  const w = newWindow({ title: plain(label), width: 320, height: 150, cls: "dlgwin msgbox", body: `<div class="pad addc" style="flex:1">
    <label>${esc(S("nickname", "Nickname:"))}<input class="nk"></label>
    <div class="btns"><button class="btn pb" data-b="ok">OK</button><button class="btn pb" data-b="c">Cancel</button></div></div>` });
  w.style.zIndex = 20000; const inp = $(".nk", w); inp.value = c.nick || ""; inp.focus();
  $('[data-b="ok"]', w).onclick = () => { c.nick = inp.value.trim() || null; w.remove(); renderList(); };
  $('[data-b="c"]', w).onclick = () => w.remove();
}
/* Alerts history: every alert shown this session, newest first (the window is drawn around the menu's own label). */
const alertLog = [];
function alertsHistory(title) {
  const w = newWindow({ title: title.replace(/^View /i, "").replace(/^\w/, m => m.toUpperCase()), width: 380, height: 320, cls: "dlgwin msgbox", resizable: true, body: `<div class="pad" style="flex:1;min-height:0">
    <div class="lv" style="flex:1;overflow:auto;background:#fff;border:1px solid #7f9db9;padding:4px">${alertLog.length ? [...alertLog].reverse().map(a => `<div class="row" style="gap:6px;align-items:flex-start;padding:3px 2px">
      <span style="color:#6b7b8c;flex:none">${esc(a.time)}</span><div><b>${emoticonize(a.name)}</b> ${emoticonize(a.text)}</div></div>`).join("") : ""}</div>
    <div style="display:flex;justify-content:flex-end"><button class="btn pb" style="min-width:75px;height:23px">Close</button></div></div>` });
  w.style.zIndex = 20000; $(".pb", w).onclick = () => w.remove();
}
/* File › Verify My E-mail Address: DIALOG 212 from the version's files. */
function verifyEmail() {
  const d = D().dlg["212"];
  const w = dialogWindow({ ...d, title: fmt(d.title, me.email), ctrls: d.ctrls.map(c => c.t ? { ...c, t: fmt(c.t, me.email) } : c) },
    { onOk: () => w.remove(), onButton: () => note("Not available") });
}
function about() {
  note(`${V.product}\nVersion ${V.short}  (${V.year})\n\nThis is a mockup rebuilt from the original program files.`, `About ${V.product}`);
}

/* ============================================================ contact list */
const kindOf = c => c.kind === "email" ? "nonim" : (c.kind === "mobile" || (c.status === "offline" && c.mobile)) ? "mobile" : c.status === "offline" ? "offline" : "online";
const displayName = c => c.nick && V.layout !== "wm" && V.layout !== "msn7" ? c.nick : settings.viewBy === "email" ? c.email : settings.viewBy === "first" ? ((c.first || c.last) ? `${c.first} ${c.last}`.trim() : c.email) : c.name;
function renderList() {
  const list = $("#clist"); if (!list) return;
  const q = ($("#find")?.value || "").toLowerCase();
  const collapsed = new Set($$(".group.collapsed", list).map(g => g.dataset.g));
  list.className = "clist pics-" + (hasPic() && settings.mainPics !== false ? settings.listPics : "none");
  list.innerHTML = "";
  const supports = c => V.features.spaces ? true : c.kind !== "email";          // address-book-only entries arrived with Live
  const vis = c => {
    const k = kindOf(c);
    if (!supports(c)) return false;
    if (q && !(`${c.name} ${c.first} ${c.last} ${c.email}`.toLowerCase().includes(q))) return false;
    if (settings.filter === "messenger") return !c.kind;
    if (settings.filter === "online") return k === "online";
    return true;
  };
  const shown = contacts.filter(vis).filter(c => settings.showOffline !== false || !V.features.categories || kindOf(c) !== "offline");
  const order = { online: 0, busy: 1, call: 1, brb: 2, away: 2, lunch: 2, offline: 3 };
  const byStatus = (a, b) => (a.kind ? 1 : 0) - (b.kind ? 1 : 0) || order[a.status] - order[b.status] || displayName(a).localeCompare(displayName(b));
  const mobileGroup = V.layout !== "wm" && settings.groupMobile;
  const sortBy = (settings.sortBy === "spaces" && !V.features.spaces) ? "groups" : settings.sortBy;
  const other = S("other", "Other Contacts");
  const NONIM = "Non-instant messaging contacts";
  let sections = [];
  if (sortBy === "groups") {
    const pulled = c => { const k = kindOf(c); return (k === "offline" && settings.groupOffline) || (k === "mobile" && (mobileGroup || (V.layout === "wm" && settings.groupOffline))) || (k === "nonim" && settings.groupNonIM); };
    for (const g of [...groups, null]) {
      if (g === "Favorites" && V.features.favorites && settings.showFav === false) continue;     // 2009 / 2012: "Show favorites" off
      const all = contacts.filter(c => c.group === g && supports(c));
      if (g === null && !all.length) continue;
      sections.push([g ?? other, shown.filter(c => c.group === g && !pulled(c)).sort(byStatus), `(${all.filter(c => kindOf(c) === "online").length}/${all.length})`]);
    }
    if (mobileGroup) sections.push(["Mobile", shown.filter(c => kindOf(c) === "mobile")]);
    if (settings.groupOffline) sections.push([V.offlineGroup, shown.filter(c => kindOf(c) === "offline" || (V.layout === "wm" && kindOf(c) === "mobile"))]);
    if (settings.groupNonIM && V.features.spaces) sections.push([NONIM, shown.filter(c => kindOf(c) === "nonim")]);
  } else if (sortBy === "status") {
    if (V.features.favorites && settings.showFav !== false) sections.push([S("favorites", "Favorites"), shown.filter(c => c.group === "Favorites").sort(byStatus)]);
    sections.push([S("online", "Online"), shown.filter(c => kindOf(c) === "online").sort(byStatus)]);
    if (mobileGroup) sections.push(["Mobile", shown.filter(c => kindOf(c) === "mobile")]);
    sections.push([V.offlineGroup, shown.filter(c => kindOf(c) === "offline" || (!mobileGroup && kindOf(c) === "mobile") || (!settings.groupNonIM && kindOf(c) === "nonim")).sort(byStatus)]);
    if (settings.groupNonIM && V.features.spaces) sections.push([NONIM, shown.filter(c => kindOf(c) === "nonim")]);
  } else {
    const buckets = [["Today", d => d === 0], ["Last Seven Days", d => d > 0 && d < 7], ["Last Four Weeks", d => d >= 7 && d < 28], ["Older", d => d == null || d >= 28]];
    for (const [t, f] of buckets) sections.push([t, shown.filter(c => f(c.space)).sort((a, b) => (a.space ?? 999) - (b.space ?? 999) || byStatus(a, b))]);
  }
  let groupsShown = false;
  const addChatGroups = () => { if (groupsShown || !V.features.groups || settings.showGroups === false) return; groupsShown = true; list.append(chatGroupSection(collapsed)); };
  for (const [g, cs, cnt] of sections) {
    if (g !== S("favorites", "Favorites")) addChatGroups();
    if ((q || settings.filter !== "all" || sortBy !== "groups") && !cs.length) continue;
    const favPics = V.features.favorites && g === S("favorites", "Favorites") ? ` pics-${settings.favPics}` : "";
    const gel = h(`<div class="group${favPics} ${collapsed.has(g) ? "collapsed" : ""}" data-g="${esc(g)}"><div class="gh"><span class="tri">▼</span>${esc(g)} <span class="cnt">${cnt || `(${cs.length})`}</span></div><div class="items"></div></div>`);
    $(".gh", gel).onclick = () => gel.classList.toggle("collapsed");
    if (g === S("favorites", "Favorites") && D().menus.favorites) $(".gh", gel).oncontextmenu = e => { e.preventDefault(); const m = ctxMenu("favorites", { fav: true }); m && showMenu(m, e.clientX, e.clientY); };
    else if (groups.includes(g)) $(".gh", gel).oncontextmenu = e => { e.preventDefault();
      const real = ctxMenu("group", { group: g }); if (real) return showMenu(real, e.clientX, e.clientY);
      showMenu([{ t: V.features.categories ? S("renameCategory", "Rename category") : S("renameGroup", "Rename Group"), fn: () => renameGroup(g) },
        { t: V.features.categories ? S("deleteCategory", "Delete category") : S("deleteGroup", "Delete Group"), fn: () => deleteGroup(g) }], e.clientX, e.clientY); };
    for (const c of cs) $(".items", gel).append(contactRow(c, list));
    list.append(gel);
  }
  addChatGroups();
  if (!list.children.length) list.append(h(`<div style="padding:16px;color:#6b7b8c;text-align:center">No contacts match.</div>`));
}
function chatGroupSection(collapsed) {
  const title = S("groups", "Groups");
  const gel = h(`<div class="group ${collapsed.has(title) ? "collapsed" : ""}" data-g="${esc(title)}"><div class="gh"><span class="tri">▼</span>${esc(title)} <span class="cnt">(${chatGroups.length})</span></div><div class="items"></div></div>`);
  $(".gh", gel).onclick = () => gel.classList.toggle("collapsed");
  for (const grp of chatGroups) {
    const on = grp.members.map(byId).filter(c => c && c.status !== "offline").length;
    const el = h(`<div class="c chatgroup"><img class="gt" src="${first("group_tile")}" alt=""><div class="lines"><span class="nm">${esc(grp.name)}</span><span class="ps"><span class="dash">- </span>${on}/${grp.members.length} members online</span></div></div>`);
    const open = () => openChat(grp.members, { group: grp.id });
    el.onclick = () => { $$("#clist .c.sel").forEach(x => x.classList.remove("sel")); el.classList.add("sel"); };
    el.ondblclick = open;
    // only the entries this version has wording for (2012: 39740-39752; 2009: invite / website / discussions / leave)
    const leave = () => { chatGroups.splice(chatGroups.indexOf(grp), 1); convs.filter(c => c.group === grp.id).forEach(c => c.group = null); renderList(); refreshConvs(); };
    const web = () => note("Not available");
    el.oncontextmenu = e => { e.preventDefault(); el.onclick();
      const real = ctxMenu("chatgroup", { chatgroup: grp }); if (real) return showMenu(real, e.clientX, e.clientY);
      showMenu([
      ["sendToGroup", open], ["invitePeopleToGroup", () => inviteToGroup(grp)],
      ["groupSettings", () => note(`${grp.name}\nMembers: you, ${grp.members.map(i => plain(byId(i)?.name || i)).join(", ")}`, S("groupSettings"))],
      ["groupSite", web], ["groupDiscuss", web], ["appearOffGroup", () => note(`You now appear offline to “${grp.name}”.`)], ["leaveGroup", leave],
    ].filter(([k]) => D().strings[k]).map(([k, fn]) => ({ t: D().strings[k], fn })), e.clientX, e.clientY); };
    $(".items", gel).append(el);
  }
  return gel;
}
function inviteToGroup(grp) {
  pickContact(S("invitePeopleToGroup", S("inviteToGroup", "")).replace(/\.\.\.$/, ""), c => {
    if (!grp.members.includes(c.id)) grp.members.push(c.id);
    const conv = convs.find(x => x.group === grp.id); if (conv && !conv.ids.includes(c.id)) { conv.ids.push(c.id); refreshConv(conv); }
    renderList(); note(S("afterAccept", "After they accept your invitation, you can have group conversations with them in Messenger."));
  });
}
/* 2012: Contacts › Create a group... (a named group chat, not a contact category) */
function createChatGroup() {
  const cands = contacts.filter(c => !c.kind);
  const w = newWindow({ title: S("createGroup", "Create a group"), width: 380, height: 420, cls: "dlgwin msgbox", body: `<div class="pad addc" style="flex:1;min-height:0">
    <label>${esc(S("enterGroupName", "Enter a name for your group"))}<input class="gn"></label>
    <div class="h" style="font-size:11px">${esc(S("inviteToGroup", "Invite people to join your group"))}</div>
    <div class="dlg" style="flex:1;position:relative;min-height:0"><div class="lv" style="position:absolute;inset:0">${cands.map(c => `<label class="row"><input type="checkbox" value="${c.id}"> <img src="${stIcon(c.status)}"> ${emoticonize(c.name)}</label>`).join("")}</div></div>
    <div class="btns"><button class="btn pb" data-b="ok">OK</button><button class="btn pb" data-b="c">Cancel</button></div></div>` });
  w.style.zIndex = 20000; $(".gn", w).focus();
  $('[data-b="c"]', w).onclick = () => w.remove();
  $('[data-b="ok"]', w).onclick = () => {
    const name = $(".gn", w).value.trim();
    if (!name) return note(S("groupNeedsName", "Your group must have a name. Please enter a name for this group and try again."));
    const members = $$("input[type=checkbox]:checked", w).map(i => i.value);
    chatGroups.push({ id: "g" + Date.now(), name, members }); w.remove(); renderList();
    if (members.length) note(S("afterAccept", "After they accept your invitation, you can have group conversations with them in Messenger."));
  };
}
function contactRow(c, list) {
  const k = kindOf(c);
  const icon = c.blocked && has("st_blocked") ? first("st_blocked") : k === "nonim" ? first("email16", "st_offline") : k === "mobile" ? first("mobile16", "st_mobile", "st_offline") : stIcon(c.status);
  const stTxt = settings.statusText === false && V.features.categories ? "" : c.status !== "online" && c.status !== "offline" ? ` <span style="opacity:.7">(${statusLabel(c.status)})</span>` : k === "mobile" && V.layout !== "wm" ? ` <span style="opacity:.7">(Mobile)</span>` : "";
  let extra = "";
  if (k === "nonim") extra = `<span class="ps"><span class="dash">- </span>${esc(c.email)}</span>`;
  else if (V.features.psm) extra = c.song && V.features.song && settings.psmSong ? `<span class="ps song"><span class="dash">- </span>♫ ${esc(c.song)}</span>` : c.psm ? `<span class="ps"><span class="dash">- </span>${emoticonize(c.psm)}</span>` : "";
  const gleam = V.features.spaces && c.space != null && c.space < 7 ? `<span class="gleam" title="Space updated ${c.space ? c.space + " day(s) ago" : "today"}">✦</span>` : "";
  const el = h(`<div class="c ${k === "online" ? "" : "off"} ${k === "nonim" ? "nonim" : ""}" data-id="${c.id}">
      <img class="si" src="${icon}" alt="">${frame(c.pic, k === "online" ? c.status : "offline", "mini")}
      <div class="lines"><span class="nm">${emoticonize(displayName(c))}${stTxt}</span>${extra}</div>${gleam}</div>`);
  el.onclick = () => { $$(".c.sel", list).forEach(x => x.classList.remove("sel")); el.classList.add("sel"); };
  el.ondblclick = () => k === "nonim" ? note("Not available")
    : k === "mobile" && c.kind ? note("Not available") : openChat([c.id]);
  el.oncontextmenu = e => {
    e.preventDefault(); el.onclick();
    const real = ctxMenu("contact", { contact: c });            // the version's own contact menu (MENU resource)
    if (real) return showMenu(real, e.clientX, e.clientY);
    showMenu([
      { t: "&Send an Instant Message", dis: !!c.kind, fn: () => openChat([c.id]) }, { t: "Send &E-mail" },
      ...(V.features.nudge ? [{ t: "Send a Message to a &Mobile Device", dis: !(c.mobile || c.kind === "mobile") }] : []), "-",
      { t: "View Co&ntact Card", fn: () => showCard(c, e.clientX, e.clientY) }, { t: "&Properties" },
      { t: "&Block", fn: () => note(`${c.name} has been blocked.\nThey will see you as offline.`) },
      { t: "&Delete Contact", fn: () => deleteContactFlow(c) }, ...(V.layout === "wlm" || V.layout === "w12" ? [{ t: "&Edit contact", fn: () => editContact(c) }] : []), "-",
      { t: "Move to Group", sub: [...groups, null].map(g => ({ t: g ?? S("other", "Other Contacts"), radio: true, checked: c.group === g, fn: () => { c.group = g; renderList(); } })) },
    ], e.clientX, e.clientY);
  };
  let hov; el.onmouseenter = e => { clearTimeout(cardHide); hov = setTimeout(() => showCard(c, e.clientX + 12, e.clientY + 12), 900); };
  el.onmouseleave = () => { clearTimeout(hov); hideCardSoon(); };
  return el;
}
// the card stays while the pointer travels from the contact onto it, and closes once the pointer leaves both
let cardHide = null;
function hideCardSoon() { clearTimeout(cardHide); cardHide = setTimeout(() => { $("#card").style.display = "none"; }, 350); }
// 7.5's own card (UIFILE 931, filled by element id). 2009's (4010/21400) is laid out around a profile theme that came from
// Windows Live's servers (idThemeHead / Body / Actions), so it isn't used; 8.5's names none of its fields.
const CARD_SIZE = { "7.5": [282, 206] };
function uiCard(c, x, y) {
  const u = D().ui?.card, size = CARD_SIZE[V.id];
  if (!u || !size) return false;
  const card = $("#card"), scope = `ui${V.id.replace(".", "")}-card`, sid = "css-" + scope;
  if (!document.getElementById(sid)) document.head.append(Object.assign(document.createElement("style"), { id: sid, textContent: u.css }));
  card.className = "card uicard"; card.style.width = size[0] + "px"; card.style.height = size[1] + "px";
  card.innerHTML = `<div class="uibody ${scope}">${u.html}</div>`;
  const q = id => $(`[data-id="${id}"]`, card), set = (id, html) => { const el = q(id); if (el) el.innerHTML = html; };
  const pic = hasPic() ? picUrl(c.pic) : "";
  if (V.id === "7.5") {
    set("idFsFriendlyName", emoticonize(c.name)); set("idFsStatusMsg", esc(statusLabel(c.status)));
    set("idPSMText", c.psm ? emoticonize(c.psm) : ""); set("idSongText", c.song ? esc(c.song) : "");
    if (q("idCurrentSong")) q("idCurrentSong").style.display = c.song ? "" : "none";
    if (q("idPSM")) q("idPSM").style.display = c.psm && !c.song ? "" : "none";
    set("idFsBuddyTile", pic ? `<img src="${pic}" style="width:48px;height:48px;margin:auto">` : "");
  } else {
    uiBind(card, { Name: c.name, PersonalStatusMessage: c.psm || "", StatusMessage: !!c.psm, DefaultIM: c.email, HomeEmail: c.email,
      UsertileAccName: plain(c.name) });
    const t = q("UXUTileImagePrimary"); if (t && pic) t.style.cssText += `;background:url(${pic}) center/cover`;
  }
  $$('[data-id="idContactCardClose"],[data-id="FLWCloseBtn"]', card).forEach(b => b.onclick = () => card.style.display = "none");
  $$("a,[data-id='idSendIM']", card).forEach(a => a.onclick = e => { e.preventDefault(); card.style.display = "none"; if (a.dataset.id === "idSendIM") openChat([c.id]); else note("Not available"); });
  card.onmouseenter = () => clearTimeout(cardHide); card.onmouseleave = hideCardSoon;
  card.style.display = "block"; card.style.left = Math.min(x, innerWidth - size[0] - 10) + "px"; card.style.top = Math.min(y, innerHeight - size[1] - 44) + "px";
  return true;
}
function showCard(c, x, y) {
  clearTimeout(cardHide);
  if (uiCard(c, x, y)) return;
  const card = $("#card");
  card.className = "card"; card.style.width = ""; card.style.height = "";
  clearTimeout(cardHide);
  card.onmouseenter = () => clearTimeout(cardHide);
  card.onmouseleave = hideCardSoon;
  card.innerHTML = `<div class="top">${frame(c.pic, c.status) || `<img src="${bigIcon(c.status)}" style="width:32px;height:45px;object-fit:contain">`}<div><b>${emoticonize(c.name)}</b><div class="em">${esc(c.email)}</div>
    <div style="margin-top:4px"><img src="${stIcon(c.status)}" style="width:14px;vertical-align:-3px"> ${statusLabel(c.status)}</div>
    ${V.features.psm ? `<div style="color:#56708c;margin-top:4px">${c.song ? "♫ " + esc(c.song) : emoticonize(c.psm || "")}</div>` : ""}
    ${V.features.spaces && c.space != null ? `<div class="em">Space updated ${c.space === 0 ? "today" : c.space + " days ago"}</div>` : ""}</div></div>
    <div class="acts"><span class="lnk">Send e-mail</span>${V.features.spaces ? `<span class="lnk">View space</span>` : ""}<span class="lnk" data-call="1">Call</span></div>`;
  card.style.display = "block"; card.style.left = Math.min(x, innerWidth - 270) + "px"; card.style.top = Math.min(y, innerHeight - 190) + "px";
  $$(".lnk", card).forEach(l => l.onclick = () => {
    card.style.display = "none";
    if (!l.dataset.call) return note("Not available");
    if (c.status === "offline") return note(fmt(S("offlineCantCall", "%1 is offline."), plain(c.name)));
    const conv = openChat([c.id]); if (!conv.call) toggleCall(conv, "voice");            // a voice call, from its conversation window
  });
}
function setMyStatus(s) { me.status = s; renderMain(); refreshConvs(); renderTray(); }
/* No notification area (no clock, no Messenger icon): a closed main window comes back from the Start menu. */
function renderTray() { const t = $("#verLabel"); if (t) { t.innerHTML = ""; t.style.display = "none"; } }
/* Add a contact: 4.7 uses its original DIALOG 40031; later versions built this window at runtime, so it's drawn here.
   After OK the contact is added and, a moment later, their "has added you to his/her contact list" request arrives. */
/* 2009 / 2012: Windows Live Contacts' own wizard (4010/44955 addcontactdialog): step 1 address + category (Next), step 2
   personal message + "also send in e-mail" (Send invitation), step 4 the profile page note (Close). Step 3 is its
   "please wait" page while the service answered; the mockup has nothing to wait for. */
function addContactUI() {
  const ui = uiDialog("addcontact"); if (!ui) return false;
  const { w, q } = ui;
  const steps = ["idstep1", "idstep2", "idstep3", "idstep4"], btns = ["idnextwrapper", "idaddwrapper", "idcancelwrapper", "idclosewrapper"];
  const page = (n, show) => {
    steps.forEach((s, i) => { const el = q(s); if (el) el.style.display = i === n ? "" : "none"; });
    btns.forEach(b => { const el = q(b); if (el) el.style.display = show.includes(b) ? "" : "none"; });
  };
  ["MsgrError", "UIError", "MobileSelectorWrapper", "MobileAddressSelectorWrapper"].forEach(id => { const el = q(id); if (el) el.style.display = "none"; });
  page(0, ["idnextwrapper", "idcancelwrapper"]);
  const sel = $("select", q("cmbbxGroup") || w); if (sel) sel.innerHTML = `<option>(none)</option>` + groups.map(g => `<option>${esc(g)}</option>`).join("");
  const email = $("input", q("idWindowsLiveAddress") || w); email?.focus();
  q("idnext").onclick = () => {
    const e = (email?.value || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { const er = q("MsgrError"); if (er) er.style.display = ""; email?.focus(); return; }
    page(1, ["idaddwrapper", "idcancelwrapper"]);
  };
  q("idadd").onclick = () => {
    const g = sel && sel.selectedIndex > 0 ? sel.value : null;
    contactAdded(email.value.trim(), g);
    page(3, ["idclosewrapper"]);
  };
  $$('[data-id="idGoToProfileLink"],[data-id="idAddToProfile"]', w).forEach(b => b.onclick = () => note("Not available"));
  return true;
}
function addContact() {
  if (addContactUI()) return;
  if (V.features.invite) return addContactW12();
  if (V.layout === "msn7" && D().addWiz) return addContactWizard75();   // 6.2 and 7.5
  if (V.layout === "wm" && D().addc) {
    const w = dialogWindow({ ...D().addc, title: "Add a Contact" }, { onOk: (vals) => {
      const email = ($("input.ed", w)?.value || "").trim(); w.remove(); if (email) contactAdded(email, "");
    } });
    const sel = $("select", w); if (sel) sel.innerHTML = "<option>.NET Messenger Service</option><option>Exchange</option><option>SIP Communications Service</option>";
    $("input.ed", w)?.focus();
    return;
  }
  // 8.5 (strings 45278, 46229, 46180, 61813, 46189, 46431, 46607)
  const w = newWindow({ title: S("addTitle", "Add a Contact"), width: 420, height: 380, cls: "dlgwin msgbox",
    body: `<div class="pad addc" style="flex:1">
      <label>${esc(S("imAddress", "Instant Messaging Address:"))}<input class="em" placeholder="example555@hotmail.com"></label>
      <label>${esc(S("nickname", "Nickname:"))}<input></label>
      <label>${esc(S("mobileNumber", "Mobile device number"))}<input></label>
      <label>${esc(S("groupLabel", "Group:"))}<select>${groups.map(g => `<option ${g === "Friends" ? "selected" : ""}>${esc(g)}</option>`).join("")}<option>(none)</option></select></label>
      <label>${esc(S("personalInvite", "Personal invitation:"))}<textarea rows="3"></textarea></label>
      <div class="btns"><button class="btn pb" data-b="ok">${esc(S("addButton", "Add contact"))}</button><button class="btn pb" data-b="c">Cancel</button></div></div>` });
  w.style.zIndex = 20000;
  const email = $(".em", w); email.focus();
  const ok = () => {
    const e = email.value.trim() || "new.friend@hotmail.example"; const g = $("select", w).value; w.remove(); contactAdded(e, g === "(none)" ? null : g);
    if (S("added")) note(fmt(S("added"), e));                      // 7.5: "Success! %1 was added to your list."
  };
  $('[data-b="ok"]', w).onclick = ok; email.onkeydown = e => { if (e.key === "Enter") ok(); };
  $('[data-b="c"]', w).onclick = () => w.remove();
}
/* 7.5: the Add a Contact wizard, page 262 then page 290 (the wizard frame supplied Back/Next/Cancel). */
function addContactWizard75() {
  const wz = D().addWiz, W = Math.round(wz.w * DLU_X), H = Math.round(wz.h * DLU_Y);
  const w = newWindow({ title: "Add a Contact", width: W + 40, height: H + 100, cls: "dlgwin msgbox", body: `<div class="dlgbody" style="padding:10px 14px"></div>
    <div class="dlgbtns"><button class="pb" disabled>&lt; Back</button><button class="pb" data-b="next">Next &gt;</button><button class="pb" data-b="c">Cancel</button></div>` });
  w.style.zIndex = 20000;
  $(".dlgbody", w).append(renderDialog(wz, { draft: {}, onLink: () => note("Not available") }));
  $('[data-b="c"]', w).onclick = () => w.remove();
  $('[data-b="next"]', w).onclick = () => {
    const radios = $$("input[type=radio]", w), choice = radios.findIndex(r => r.checked);
    w.remove();
    if (choice !== 1) return note("Not available");
    const d2 = dialogWindow({ ...D().addEmail, title: "Add a Contact" }, { onOk: () => {
      const e = ($("input.ed", d2)?.value || "").trim() || "new.friend@hotmail.example"; d2.remove(); contactAdded(e, null);
      if (S("added")) note(fmt(S("added"), e));
    } });
    $("input.ed", d2)?.focus();
  };
}
/* 2012 invitation (strings 33525 "Invitation", 33504 "%1 wants to be friends", 2052/2053 Accept/Ignore, 33532 block). */
function invitationW12(c) {
  const w = newWindow({ title: S("invitation", "Invitation"), width: 380, height: 210, cls: "dlgwin msgbox", body: `<div class="pad inv12" style="flex:1">
    <div class="top">${frame(c.pic, "offline")}<div><div class="h">${esc(fmt(S("wantsFriends", "%1 wants to be friends"), plain(c.name)))}</div><div class="em">${esc(c.email)}</div></div></div>
    <label class="ckb"><input type="checkbox"> ${esc(S("blockInvites", "Block invitations from this person"))}</label>
    <div class="btns"><button class="btn pb" data-b="a">${esc(S("accept", "Accept"))}</button><button class="btn pb" data-b="i">${esc(S("ignore", "Ignore"))}</button></div></div>` });
  w.style.zIndex = 20000;
  $('[data-b="a"]', w).onclick = () => { w.remove(); c.status = "online"; c.psm = c.psm || "hey! thanks for adding me :)"; renderList(); toastOnline(c); };
  $('[data-b="i"]', w).onclick = () => { const blocked = $("input", w).checked; w.remove(); contacts = contacts.filter(x => x !== c); renderList(); if (blocked) note(`${plain(c.name)} can no longer send you invitations.`); };
}
/* 2012: Add a contact = send an invitation (strings 8103, 46647, 46431, 46633, 46659, 46663). */
function addContactW12() {
  const w = newWindow({ title: S("addTitle", "Add a contact"), width: 420, height: 300, cls: "dlgwin msgbox", body: `<div class="pad addc" style="flex:1">
    <label>${esc(S("addPrompt", "Enter an email address to invite a contact to Windows Live Messenger"))}<input class="em" placeholder="example555@hotmail.com"></label>
    <label>${esc(S("personalInvite", "Personal invitation:"))}<textarea rows="4"></textarea></label>
    <div class="btns"><button class="btn pb" data-b="ok">${esc(S("invite", "Invite"))}</button><button class="btn pb" data-b="c">Cancel</button></div></div>` });
  w.style.zIndex = 20000;
  const email = $(".em", w); email.focus();
  const ok = () => {
    const e = email.value.trim() || "new.friend@hotmail.example";
    $(".pad", w).innerHTML = `<div class="h">${esc(fmt(S("inviting", "You're inviting %1"), e))}</div><div>${esc(S("whenAccepted", ""))}</div>
      <div>${esc(S("whenSignIn", ""))}</div><div class="btns"><button class="btn pb">Close</button></div>`;
    $(".pad .pb", w).onclick = () => w.remove();
    contactAdded(e, null);
  };
  $('[data-b="ok"]', w).onclick = ok; email.onkeydown = e => { if (e.key === "Enter") ok(); };
  $('[data-b="c"]', w).onclick = () => w.remove();
}
function contactAdded(email, group) {
  const nick = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, m => m.toUpperCase());
  let c = contacts.find(x => x.email.toLowerCase() === email.toLowerCase());
  if (!c) { c = { id: "c" + Date.now(), name: nick, first: nick.split(" ")[0], last: nick.split(" ")[1] || "", email, status: "offline", psm: "", group: group ?? null, pic: "default1" }; contacts.push(c); }
  renderList();
  // Privacy: "Alert me when other people add me to their contact list" off: no prompt, they are simply allowed
  setTimeout(() => settings.alertAdded === false ? (c.status = "online", renderList()) : friendRequest(c), 2500);
}
function friendRequest(c) {
  play("newalert");
  if (V.features.invite) return invitationW12(c);
  const dlg = D().request || MSNDATA["8.5"].request;
  const title = V.product;
  const w = dialogWindow({ ...dlg, title }, {
    subst: [plain(c.name), c.email],
    onButton: b => note("Not available"),
    onOk: () => {
      const radios = $$("input[type=radio]", w), allow = !radios.length || radios[0].checked;
      const add = $("input[type=checkbox]", w)?.checked !== false;
      w.remove();
      if (!allow) { contacts = contacts.filter(x => x !== c); renderList(); return note(`${plain(c.name)} has been blocked.`); }
      if (!add && !c.group) c.group = null;
      c.status = "online"; c.psm = c.psm || "hey! thanks for adding me :)";
      renderList(); toastOnline(c);
    },
  });
}
// 2009 / 2012: Windows Live Contacts' category window (4010/44953 groupdialog): name, a contact picker, Save / Cancel
function createGroupUI() {
  const ui = uiDialog("category"); if (!ui) return false;
  const { w, q } = ui;
  const er = q("UIError"); if (er) er.style.display = "none";
  const picker = q("PeoplePicker");
  if (picker) {
    picker.classList.add("uipicker");
    picker.innerHTML = contacts.filter(c => !c.kind).map(c => `<label><input type="checkbox" value="${esc(c.id)}"> ${emoticonize(c.name)}</label>`).join("");
  }
  const name = $("input", q("Name") || w); name?.focus();
  q("idok").onclick = () => {
    const g = (name?.value || "").trim();
    if (!g) { if (er) er.style.display = ""; return; }
    if (!groups.includes(g)) groups.push(g);
    $$("input:checked", picker || w).forEach(i => { const c = byId(i.value); if (c) c.group = g; });
    w.remove(); renderList();
  };
  return true;
}
// a window of the mockup's own rather than the browser's prompt(), which embedded browsers refuse
function createGroup() {
  if (createGroupUI()) return;
  const w = newWindow({ title: V.product, width: 340, height: 150, cls: "dlgwin msgbox",
    body: `<div class="pad" style="flex:1;display:flex;flex-direction:column;gap:8px;font:11px Tahoma,sans-serif">
      <label>${esc(V.features.groups ? "Type a name for your new category:" : "Type a name for your new group:")}</label>
      <input class="gname" type="text" value="School" style="font:11px Tahoma,sans-serif">
      <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:auto"><button class="pb btn ok" style="min-width:75px;height:23px">OK</button><button class="pb btn cancel" style="min-width:75px;height:23px">Cancel</button></div></div>` });
  w.style.height = "auto"; w.style.minHeight = "0"; w.style.zIndex = 20000;
  const inp = $(".gname", w); inp.focus(); inp.select();
  const ok = () => { const g = inp.value.trim(); w.remove(); if (g && !groups.includes(g)) { groups.push(g); renderList(); } };
  $(".ok", w).onclick = ok; $(".cancel", w).onclick = () => w.remove();
  inp.onkeydown = e => { if (e.key === "Enter") ok(); else if (e.key === "Escape") w.remove(); };
}
function pickContact(title, cb, prompt, only) {
  const on = contacts.filter(c => only ? only.includes(c.id) : c.status !== "offline" && !c.kind);
  const w = newWindow({ title, width: 300, height: 300, cls: "dlgwin msgbox", body: `<div class="pad" style="flex:1;min-height:0">
    <div style="font:11px Tahoma">${esc(prompt || "Select the contact you want to send an instant message to:")}</div>
    <div class="dlg" style="flex:1;position:relative"><div class="lv" style="position:absolute;inset:0">${on.map(c => `<div class="row" data-id="${c.id}"><img src="${stIcon(c.status)}">${emoticonize(c.name)}</div>`).join("")}</div></div>
    <div style="display:flex;justify-content:flex-end;gap:6px"><button class="pb btn" data-b="ok" style="min-width:75px;height:23px">OK</button><button class="pb btn" data-b="c" style="min-width:75px;height:23px">Cancel</button></div></div>` });
  let sel = on[0]?.id;
  $$(".row", w).forEach(r => { if (r.dataset.id === sel) r.classList.add("sel"); r.onclick = () => { $$(".row.sel", w).forEach(x => x.classList.remove("sel")); r.classList.add("sel"); sel = r.dataset.id; }; r.ondblclick = () => { w.remove(); cb(byId(sel)); }; });
  $('[data-b="ok"]', w).onclick = () => { w.remove(); if (sel) cb(byId(sel)); };
  $('[data-b="c"]', w).onclick = () => w.remove();
}

/* ============================================================ main window */
function renderMain() {
  const main = $("#main");
  $(".titlebar .t", main).textContent = V.product;
  if (!signedIn) return renderSignin();
  buildMenubar($("#mainMenu"), menuDefsFrom(D().menus.main, "main"));
  ({ wm: mainWM, msn7: mainM7, wlm: mainWLM, w12: mainW12 })[V.layout]($("#mainBody"));
  renderList();
}
function nameStatusMenu(e) {
  const r = e.currentTarget.getBoundingClientRect();
  // the version's own menu under your name (MENU 223 / 40198; 2012's 333 has no statuses, which its code added above it)
  const real = ctxMenu("status", "status");
  if (real) {
    const hasSt = real.some(x => x.radio);
    return showMenu([...(hasSt ? [] : [...statusKeys().map(k => ({ t: V.statusLabels[k], icon: stIcon(k), radio: true, checked: me.status === k, fn: () => setMyStatus(k) })), "-"]), ...real], r.left, r.bottom);
  }
  showMenu([...statusKeys().map(k => ({ t: V.statusLabels[k], icon: stIcon(k), radio: true, checked: me.status === k, fn: () => setMyStatus(k) })), "-",
    ...(hasPic() ? [{ t: "Change Display &Picture...", fn: changeMyPic }] : []),
    { t: "Change Display &Name...", fn: () => inlineEdit("name") }, { t: "&Options...", fn: () => openOptions() }, "-", { t: "Sig&n Out", fn: () => signOut(true) }], r.left, r.bottom);
}
function mainWM(b) {
  b.innerHTML = `
    <div class="wm-head"><div class="me" id="meName"><img src="${stIcon(me.status)}"><span>${emoticonize(me.name)} (${esc(statusLabel(me.status, true))})</span> ▾</div></div>
    <div class="wm-mail" id="mailIco"><img src="${first("mail")}"><span>Go to My E-mail Inbox</span></div>
    <div class="clist" id="clist"></div>
    ${settings.actionsPane ? `<div class="wm-actions"><div class="h">I want to... <span class="lnk" id="hideAct" style="font-weight:400">▲</span></div>
      <div class="a" data-a="add"><img src="${first("t_add")}">Add a Contact</div>
      <div class="a" data-a="im"><img src="${first("t_im")}">Send an Instant Message</div>
      <div class="a" data-a="file"><img src="${first("t_file")}">Send a File or Photo</div>
      <div class="a" data-a="phone"><img src="${first("t_phone")}">Make a Phone Call</div>
      <div class="a" data-a="mail"><img src="${first("t_mail")}">Go to My E-mail Inbox</div></div>` : ""}
    <div class="wm-ad"><img src="${first("logo")}" alt=""></div>`;
  $("#meName").onclick = nameStatusMenu;
  $("#mailIco").onclick = mailToast;
  $("#hideAct") && ($("#hideAct").onclick = () => { settings.actionsPane = false; renderMain(); });
  $$(".wm-actions .a", b).forEach(a => a.onclick = () => ({ add: addContact, im: () => pickContact("Send an Instant Message", c => openChat([c.id])),
    mail: mailToast })[a.dataset.a]?.() ?? note("Not available"));
}
function mainM7(b) {
  // 6.2: the large status buddy beside your name, no personal message, no tabs, and the "I want to..." pane (Tools › Show Actions Pane)
  const myPic = V.features.mainPic === false ? `<img class="bigst" src="${first("big_" + (me.status === "offline" ? "offline" : ["busy", "call"].includes(me.status) ? "busy" : ["away", "brb", "lunch"].includes(me.status) ? "away" : "online"), "big_online")}" alt="">`
    : frame(me.showPic ? me.pic : "default1", me.status);
  const wt = [["add", "wtAdd", "t_add"], ["im", "wtIm", "t_im"], ["file", "wtFile", "t_file"], ["audio", "wtAudio", "tb_audio"], ["video", "wtVideo", "tb_video"],
              ["mail", "wtMail", "t_mail"], ["phone", "wtPhone", "t_phone"]].filter(([, k]) => D().strings[k]);
  b.innerHTML = `
    <div class="m7-top"><div class="m7-head">
      ${myPic}
      <div class="info">
        <div class="name" id="meName">${emoticonize(me.name)} (${esc(statusLabel(me.status, true))}) ▾</div>
        ${V.features.psm ? `<div class="psm ${me.psm ? "" : "empty"}" id="mePsm">${me.psm ? emoticonize(me.psm) : esc(S("psmEmpty", ""))}</div>` : ""}
        <div class="icons"><span id="mailIco" title="${esc(fmt(S("mailCount", "%1!d! new e-mail messages"), 3))}"><img src="${first("mail_small", "mail")}"> (3)</span></div>
      </div></div></div>
    ${has("addcontact") ? `<div class="m7-tabbar"><button class="tbtn" id="addBtn" title="Add a Contact"><img src="${first("addcontact")}"></button><span style="color:#0a246a">Add a Contact</span></div>` : ""}
    <div class="m7-list">${has("tab_today") ? `<div class="m7-tabs"><div class="sel" title="MSN Today"><img src="${first("tab_today")}"></div><div title="My Space"><img src="${first("big_online")}"></div></div>` : ""}<div class="clist" id="clist"></div></div>
    ${V.features.actionsPane && settings.actionsPane && wt.length ? `<div class="wm-actions m7-actions"><div class="h">${esc(S("wantTo", "I want to..."))}</div>
      ${wt.map(([a, k, ic]) => `<div class="a" data-a="${a}"><img src="${first(ic, "app16")}">${esc(S(k))}</div>`).join("")}</div>` : ""}
    <div class="m7-ad"><div class="ad">advertisement</div><img src="${first("logo_small")}"></div>`;
  $(".dp", b) && ($(".dp", b).onclick = changeMyPic);
  $("#meName").onclick = nameStatusMenu;
  $("#mePsm") && ($("#mePsm").onclick = () => inlineEdit("psm"));
  $("#mailIco").onclick = mailToast;
  $("#addBtn") && ($("#addBtn").onclick = addContact);
  const pickThen = (t, f) => () => pickContact(t, c => f(openChat([c.id])));
  $$(".m7-actions .a", b).forEach(el => el.onclick = () => ({
    add: addContact, im: () => pickContact(el.textContent, c => openChat([c.id])), file: pickThen(el.textContent, sendFile),
    audio: pickThen(el.textContent, cv => toggleCall(cv, "voice")), video: pickThen(el.textContent, cv => toggleCall(cv, "video")), mail: mailToast,
  })[el.dataset.a]?.() ?? note("Not available"));
}
function mainWLM(b) {
  b.innerHTML = `
    <div class="w-me">
      ${frame(me.showPic ? me.pic : "default3", me.status)}
      <div class="info">
        <div class="name" id="meName">${emoticonize(me.name)} <small>(${esc(statusLabel(me.status, true))})</small> ▾</div>
        <div class="psm ${me.psm ? "" : "empty"}" id="mePsm">${me.psm ? emoticonize(me.psm) : esc(S("psmEmpty", "<Enter a personal message>"))}</div>
        <div class="icons"><span id="mailIco" title="Windows Live Mail inbox (3 new)"><img src="${first("mail")}">(3)</span>
          <span id="alertIco" title="Alerts"><img src="${first("bell")}"></span><span title="Spaces"><img src="${first("spaces")}"></span></div>
      </div></div>
    <div class="w-search"><input id="find" placeholder="${esc(S("find", "Find a contact..."))}">
      <button class="tbtn" id="addBtn" title="Add a contact or group"><img src="${first("addcontact")}"></button>
      <button class="tbtn" id="optBtn" title="Change the display options for the contact list">▾</button></div>
    <div class="clist" id="clist"></div>
    ${V.features.whatsNew && settings.whatsNew !== false ? `<div class="w9-new"><div class="h">${esc(S("whatsNew", "What's new"))}
      <span class="nav"><button class="tbtn" id="wnPrev" title="${esc(S("whatsPrev", ""))}">◀</button><span id="wnPos"></span><button class="tbtn" id="wnNext" title="${esc(S("whatsNext", ""))}">▶</button></span></div>
      <div class="it" id="wnItem"></div></div>` : ""}
    <div class="w-ad"><img src="${first("banner")}" alt=""></div>`;
  if ($("#wnItem")) {                                          // 2009: one item at a time (sample content; the real feed came from the web)
    const items = whatsNewItems(); let i = 0;
    const show = () => { const [c, t] = items[i]; $("#wnItem").innerHTML = `${frame(c.pic, c.status)}<div><b>${emoticonize(c.name)}</b> ${esc(t)}</div>`; $("#wnPos").textContent = `${i + 1}/${items.length}`; };
    $("#wnPrev").onclick = () => { i = (i + items.length - 1) % items.length; show(); }; $("#wnNext").onclick = () => { i = (i + 1) % items.length; show(); };
    show();
  }
  $(".dp", b).onclick = changeMyPic;
  $("#meName").onclick = nameStatusMenu;
  $("#mePsm").onclick = () => inlineEdit("psm");
  $("#find").oninput = renderList;
  $("#mailIco").onclick = mailToast;
  $("#alertIco").onclick = () => note("Not available");
  $("#addBtn").onclick = e => { const r = e.currentTarget.getBoundingClientRect(); showMenu([{ t: "&Add a contact...", fn: addContact }, { t: "Crea&te a group...", fn: createGroup }], r.left, r.bottom); };
  $("#optBtn").onclick = viewOptionsMenu;
}
/* ---- Windows Live Messenger 2012 (layout "w12") ---- */
function viewOptionsMenu(e) {
  const r = e.currentTarget.getBoundingClientRect(), rs = radioSet;
  showMenu([{ h: "Sort contacts by" }, { t: "&Status", ...rs("sortBy", "status") }, { t: "&Groups", ...rs("sortBy", "groups") },
    ...(V.features.spaces ? [{ t: "&Recently updated spaces", ...rs("sortBy", "spaces") }] : []), "-",
    { t: "Group &mobile contacts together", ...toggleSet("groupMobile") }, { t: "Group o&ffline contacts together", ...toggleSet("groupOffline") }, { t: "Group non-instant messaging &contacts together", ...toggleSet("groupNonIM") }, "-",
    { h: "Filter contacts" }, { t: "&Show all contacts", ...rs("filter", "all") }, { t: "&Messenger contacts only", ...rs("filter", "messenger") }, { t: "&Online contacts only", ...rs("filter", "online") }, "-",
    { h: "View contacts by" }, { t: "&Display name", ...rs("viewBy", "name") }, { t: "&First and last name", ...rs("viewBy", "first") }, { t: "&E-mail address", ...rs("viewBy", "email") }, "-",
    { h: "Display pictures" }, { t: "&Large", ...rs("listPics", "large") }, { t: "&Medium", ...rs("listPics", "medium") }, { t: "&Small", ...rs("listPics", "small") }, { t: "&Hide display pictures", ...rs("listPics", "none") }],
    r.right - 250, r.bottom);
}
const menuButton = (tree, ctx) => e => { const r = e.currentTarget.getBoundingClientRect(); showMenu(menuDefsFrom(tree, ctx).map(([t, f]) => ({ t, sub: f() })), r.left, r.bottom); };
function whatsNewItems() {
  return [[byId("hugo"), "added new photos: \"Summer 2009\""], [byId("ana"), "changed her display picture"], [byId("diogo"), "updated his profile"],
    [byId("carla"), "added a new blog entry"]].filter(x => x[0]);
}
function socialItems() {
  const pick = id => byId(id);
  return [
    [pick("hugo"), `shared a photo album: "Summer 2011" (12 photos)`],
    [pick("ana"), "has a new profile picture"],
    [pick("carla"), `is listening to ${pick("carla")?.song || "music"}`],
    [pick("diogo"), "posted a link: \"funniest cat video ever lol\""],
  ].filter(x => x[0]);
}
function mainW12(b) {
  b.innerHTML = `
    <div class="w12-head">
      <div class="w12-me">${frame(me.showPic ? me.pic : "default1", me.status)}
        <div class="info"><div class="name" id="meName">${emoticonize(me.name)} ▾</div>
          <div class="st"><img src="${stIcon(me.status)}"> ${esc(statusLabel(me.status, true))}</div>
          <div class="psm ${me.psm ? "" : "empty"}" id="mePsm">${me.psm ? emoticonize(me.psm) : esc(S("quick", "Share a quick message"))}</div></div></div>
      <div class="w12-icons"><span id="mailIco" title="${esc(fmt(S("mailUnread", "You have %1!lu! unread messages in your email inbox."), 3))}"><img src="${first("mail")}"> 3</span>
        <span id="socialIco" title="${esc(S("social", "Social Highlights"))}"><img src="${first("social")}"></span>
        <span id="menuBtn" title="Show menu">☰ ▾</span></div>
    </div>
    <div class="w12-search"><input id="find" placeholder="Search contacts or the web...">
      <button class="tbtn" id="addBtn" title="Add a contact or group"><img src="${first("addcontact")}"></button>
      <button class="tbtn" id="optBtn" title="Change layout">▾</button></div>
    ${settings.socialPane !== false ? `<div class="w12-social"><div class="h"><span>${esc(S("social", "Social Highlights"))}</span><a id="hideSocial">Hide</a></div>
      ${socialItems().map(([c, t]) => `<div class="it">${frame(c.pic, c.status)}<div><b>${emoticonize(c.name)}</b> ${esc(t)}<div class="acts"><a>Comment</a> · <a>Like</a></div></div></div>`).join("")}</div>` : ""}
    <div class="clist" id="clist"></div>
    <div class="w-ad"><img src="${first("banner")}" alt=""></div>`;
  $(".w12-me .dp", b).onclick = e => { const m = ctxMenu("mypic", "mypic"); if (!m) return changeMyPic(); const r = e.currentTarget.getBoundingClientRect(); showMenu(m, r.left, r.bottom); };
  $("#meName").onclick = nameStatusMenu;
  $("#mePsm").onclick = () => inlineEdit("psm");
  $("#find").oninput = renderList;
  $("#mailIco").onclick = mailToast;
  $("#socialIco").onclick = () => { settings.socialPane = settings.socialPane === false; renderMain(); };
  $("#hideSocial") && ($("#hideSocial").onclick = () => { settings.socialPane = false; renderMain(); });
  $$(".w12-social .acts a", b).forEach(a => a.onclick = () => note("Not available"));
  $("#menuBtn").onclick = menuButton(D().menus.main, "main");
  $("#addBtn").onclick = e => { const r = e.currentTarget.getBoundingClientRect(); showMenu([{ t: "&Add a contact...", fn: addContact }, { t: "Create a &group...", fn: createGroup }], r.left, r.bottom); };
  $("#optBtn").onclick = viewOptionsMenu;
}
/* 2012's sign-in screen text comes from the shared Windows Live ID UI (wliduxloc.mui), not Messenger itself. */
const idStr = (k, d) => S(k, d);
const idLinks = s => esc(plain(s)).replace(/&lt;id\w*Link\w*&gt;(.*?)&lt;\/id\w*Link\w*&gt;/g, '<a>$1</a>');
function signinW12(b) {
  const st = V.statusLabels[signin.status];
  const heading = plain(idStr("id_heading", "Sign in to\\nWindows Live <AppName>%1</AppName>")).replace(/<AppName>%1<\/AppName>/, "Messenger").replace(/\\n/g, "\n");
  b.innerHTML = `<div class="w12-signin fadein">
    <img class="art" src="${first("signin_art")}" alt="">
    <div class="heading">${esc(heading).replace(/\n/g, "<br>")}</div>
    <div class="fields">
      <input id="siEmail" value="${signin.remember ? esc(me.email) : ""}" placeholder="${esc(idStr("id_example", "example555@hotmail.com"))}" autocomplete="off" aria-label="${esc(plain(idStr("id_email", "Email address:")))}">
      <input id="siPass" type="password" value="${signin.rememberPass ? "password" : ""}" placeholder="${esc(idStr("id_pwPlaceholder", "Password"))}" autocomplete="off">
      <div class="caps" id="siCaps">${esc(idStr("id_caps", ""))}</div>
      <div class="asrow"><span>${mn(idStr("id_signInAs", "Si&gn in as:"))}</span> <span class="stchooser" id="siStatus"><img src="${stIcon(signin.status)}"> ${esc(st)} ▾</span></div>
      <label><input type="checkbox" id="siRem" ${signin.rememberPass ? "checked" : ""}> <span>${mn(idStr("id_remember", "Remem&ber my ID and password"))}</span></label>
      <label><input type="checkbox" id="siAuto" ${signin.auto ? "checked" : ""}> <span>${mn(idStr("id_auto", "Sign me in &automatically"))}</span></label>
      <a id="siForget">${mn(idStr("id_forget", "&Forget me"))}</a>
      <button class="btn" data-b="signin">${mn(idStr("id_signIn", "&Sign in"))}</button>
    </div>
    <div class="progress"><img class="spin" src="${first("spinner")}" alt=""><div id="siTxt"></div><button class="btn" data-b="cancel">${mn(idStr("id_cancel", "Ca&ncel"))}</button></div>
    <div class="links">
      <div>${idLinks(idStr("id_signup", "Don't have a Microsoft account? <idLinkSignup>Sign up</idLinkSignup>"))}</div>
      <div>${idLinks(idStr("id_public", ""))}</div>
      <div><a>${esc(plain(idStr("id_forgot", "Forgot password?")))}</a> · <a>${esc(plain(idStr("id_status", "Server status")))}</a> · <a>${esc(plain(idStr("id_privacy", "Privacy statement")))}</a></div>
    </div></div>`;
  const email = $("#siEmail"), pass = $("#siPass");
  $("#siStatus").onclick = e => { const r = e.currentTarget.getBoundingClientRect(); showMenu(statusKeys().map(k => ({ t: V.statusLabels[k], icon: stIcon(k), radio: true, checked: signin.status === k, fn: () => { signin.status = k; signinW12(b); } })), r.left, r.bottom); };
  $("#siRem").onchange = e => { signin.remember = signin.rememberPass = e.target.checked; if (!e.target.checked) { signin.auto = $("#siAuto").checked = false; } };
  $("#siAuto").onchange = e => { signin.auto = e.target.checked; if (e.target.checked) { signin.remember = signin.rememberPass = $("#siRem").checked = true; } };
  $("#siForget").onclick = () => { email.value = pass.value = ""; Object.assign(signin, { remember: false, rememberPass: false, auto: false }); $("#siRem").checked = $("#siAuto").checked = false; };
  const caps = e => { $("#siCaps").style.display = e.getModifierState?.("CapsLock") ? "block" : "none"; };
  [email, pass].forEach(i => i.onkeydown = e => { caps(e); if (e.key === "Enter") startSignin(email.value.trim()); });
  $('[data-b="signin"]', b).onclick = () => startSignin(email.value.trim());
  $('[data-b="cancel"]', b).onclick = () => { clearTimeout(signinTimer); setBusy(false); };
  $$(".links a", b).forEach(a => a.onclick = () => note("Not available"));
}
function busyW12(mode) {
  const root = $(".w12-signin"); if (!root) return;
  root.classList.toggle("busy", !!mode);
  $("#siTxt").textContent = mode === "out" ? "Signing out..." : S("signingIn", "Signing in to Messenger");
  $('[data-b="cancel"]', root).style.display = mode === "in" ? "" : "none";
}
/* Scenes (2009: Tools › Change your scene..., 2012: Change your theme...). 2012's pack has a skinny and a wide picture per
   scene; 2009's has one picture per scene, and no scene is set until you pick one. */
const sceneKeys = () => (D().scenes || []).map(x => x.key);
const sceneKey = () => sceneKeys().includes(me.scene) ? me.scene : (V.id === "2012" ? "WindowsLive" : null);
const sceneImg = (key, sfx) => `assets/${V.id}/scenes/${key}_${V.id === "2012" ? sfx : "w"}.jpg`;
function applyScene() {
  const key = sceneKey(), u = sfx => key ? `url("${new URL(sceneImg(key, sfx), location.href)}")` : "none";
  document.body.style.setProperty("--scene-s", V.features.scenes ? u("s") : "none");
  document.body.style.setProperty("--scene-w", V.features.scenes && settings.contactScene !== false ? u("w") : "none");
  document.body.classList.toggle("has-scene", !!(V.features.scenes && key));
}
function scenePicker(title) {
  let sel = sceneKey() || sceneKeys()[0];
  const scenes = D().scenes || [];
  const w = newWindow({ title: title || "Change your theme", width: 560, height: 470, cls: "dlgwin", body: `<div class="pad" style="flex:1;min-height:0">
    <div style="font:12px var(--font)">${esc(D().strings.sceneTitle || "Select a Scene Picture")}</div>
    <div class="sceneprev"></div>
    <div class="scenegrid">${scenes.map(sc => `<div class="sc ${sc.key === sel ? "sel" : ""}" data-k="${sc.key}" title="${esc(sc.name)}"><img src="${sceneImg(sc.key, "s")}"><span>${esc(sc.name)}</span></div>`).join("")}</div>
    <div style="display:flex;justify-content:flex-end;gap:6px"><button class="btn" data-b="ok" style="min-width:75px;height:23px">OK</button><button class="btn" data-b="c" style="min-width:75px;height:23px">Cancel</button></div></div>` });
  const prev = () => $(".sceneprev", w).style.backgroundImage = `url(${sceneImg(sel, "w")})`;
  $$(".sc", w).forEach(d => { d.onclick = () => { sel = d.dataset.k; $$(".sc.sel", w).forEach(x => x.classList.remove("sel")); d.classList.add("sel"); prev(); }; d.ondblclick = () => { sel = d.dataset.k; ok(); }; });
  const ok = () => { me.scene = sel; applyScene(); w.remove(); };
  $('[data-b="ok"]', w).onclick = ok; $('[data-b="c"]', w).onclick = () => w.remove();
  prev();
}
function inlineEdit(field) {
  const el = field === "name" ? $("#meName") : $("#mePsm"); if (!el) return;
  const inp = h(`<input class="inline" maxlength="130">`); inp.value = me[field];
  el.replaceWith(inp); inp.focus(); inp.select();
  let done = false;
  const finish = save => { if (done) return; done = true; if (save) me[field] = inp.value.trim() || (field === "name" ? me.email : ""); renderMain(); refreshConvs(); };
  inp.onkeydown = e => { if (e.key === "Enter") finish(true); if (e.key === "Escape") finish(false); };
  inp.onblur = () => finish(true);
}
function mailToast() { play("newemail"); if (settings.alertMail === false) return; toast({ name: "Hotmail", pic: null, status: "online" }, fmt(S("mailFrom", "You have received a new e-mail message from %1."), "Amy")); }

/* ============================================================ sign-in screens */
let signinTimer = null;
const signin = { remember: true, rememberPass: true, auto: false, status: "online" };
function signOut(animated = true) {
  setTimeout(renderTray, 0);
  closeAllConvs();
  const wasIn = signedIn; signedIn = false;
  renderMain();
  if (animated && wasIn) { setBusy("out"); signinTimer = setTimeout(() => setBusy(false), 1500); }
}
function renderSignin() {
  clearTimeout(signinTimer);
  $("#mainMenu").innerHTML = "";
  buildMenubar($("#mainMenu"), menuDefsFrom(D().menus.main, "main"));
  const b = $("#mainBody");
  ({ wm: signinWM, msn7: signinM7, wlm: signinWLM, w12: signinW12 })[V.layout](b);
}
function finishSignin() { signedIn = true; renderMain(); renderTray(); $("#mainBody").firstElementChild?.classList.add("fadein"); setTimeout(() => toastOnline(byId("ana")), 1200); scheduleChatter(true); }
/* BonziBuddy, the mockup's joke greeter (not part of XP or Messenger), from his own Microsoft Agent character file
   (tools/acs.py; data.js BONZI, assets/bonzi/). He swings in (Show), waves, points down at the Start button and says
   his line, typed out in his word balloon (the balloon's colours and font are the character's own); when Start is
   clicked he lowers his arm through the animation's exit frames and swings away (Hide), not to return until the
   page is loaded again. Frames keep their own durations, sounds and branch percentages. */
let bonziLeave = () => {};
function bonziGreet() {
  const B = typeof BONZI !== "undefined" ? BONZI : null; if (!B || running) return startHint();
  const bl = B.balloon || {}, rgb = c => c ? `rgb(${c.join(",")})` : "";
  const el = h(`<div id="bonzi"><div class="bz-balloon" hidden style="background:${rgb(bl.bg)};color:${rgb(bl.fg)};border-color:${rgb(bl.border)};font-family:'${bl.font || "MS Sans Serif"}',Tahoma,sans-serif;font-size:${Math.abs(bl.height || 13)}px"><span></span><i style="border-top-color:${rgb(bl.border)}"></i><b style="border-top-color:${rgb(bl.bg)}"></b></div><div class="bz-sprite"></div></div>`);
  document.body.append(el);
  const spr = $(".bz-sprite", el), balloon = $(".bz-balloon", el);
  Object.assign(spr.style, { width: B.w + "px", height: B.h + "px", backgroundImage: `url(assets/bonzi/sheet.png${V_Q})` });
  const cell = c => { if (c >= 0) spr.style.backgroundPosition = `${-(c % B.cols) * B.w}px ${-Math.floor(c / B.cols) * B.h}px`; };
  // his sounds: one player each, kept. Phones only let a player sound once it has been started during a tap, so the
  // first tap anywhere (and the tap on Start) starts them all muted for a moment ("unlock"); later his timers can play them.
  const players = {};
  const player = i => players[i] = players[i] || new Audio(`assets/bonzi/snd_${i}.wav${V_Q}`);
  Object.values(B.anims).forEach(fr => fr.forEach(f => { if (f.s != null) player(f.s); }));
  const sound = i => { const a = player(i); a.muted = false; a.currentTime = 0; a.play().catch(() => { }); };
  const unlock = () => Object.values(players).forEach(a => {
    if (!a.paused) return;
    a.muted = true; a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; });
  });
  let timer = null, cur = null, idx = 0, state = "arriving", voice = null, typing = null;
  // an animation plays to its end, or holds its last drawn frame where the next is an empty end marker
  const play = (name, done) => {
    clearTimeout(timer); cur = B.anims[name]; idx = 0;
    const step = () => {
      const f = cur[idx]; cell(f.c); if (f.s != null) sound(f.s);
      timer = setTimeout(() => {
        let next = idx + 1;
        if (f.b.length) { let r = Math.random() * 100; for (const [to, pct] of f.b) if ((r -= pct) < 0) { next = to; break; } }
        if (next >= cur.length || cur[next].c < 0) return done?.();
        idx = next; step();
      }, f.d || 100);
    };
    step();
  };
  // leaving an animation the way Agent does: each frame's exit frame in turn, until one that ends it
  const exit = done => {
    clearTimeout(timer);
    const walk = () => { const x = cur[idx]?.x; if (x == null || x < 0 || !cur[x] || cur[x].c < 0) return done(); idx = x; cell(cur[idx].c); timer = setTimeout(walk, cur[idx].d || 100); };
    walk();
  };
  const say = () => {
    balloon.hidden = false;
    const words = B.say.split(" "), span = $("span", balloon);
    voice = new Audio(`assets/bonzi/welcome.wav${V_Q}`);
    const type = () => {
      const per = ((voice.duration || 6) * 1000) / words.length; let n = 0; clearInterval(typing);
      typing = setInterval(() => { span.textContent = words.slice(0, ++n).join(" "); if (n >= words.length) clearInterval(typing); }, per);
    };
    // browsers keep a page silent until it's tapped or clicked: then he speaks, on that first tap (unless it's on Start).
    // A tap only counts once the finger lifts (pointerup / touchend), so those are what's listened for.
    voice.play().then(type).catch(() => {
      span.textContent = B.say;
      const evs = ["pointerup", "touchend", "click"];
      const once = e => {
        evs.forEach(n => removeEventListener(n, once, true));
        unlock();
        if (state !== "leaving" && !e.target.closest?.("#orb")) { span.textContent = ""; voice.play().then(type).catch(() => span.textContent = B.say); }
      };
      evs.forEach(n => addEventListener(n, once, true));
    });
  };
  // he starts talking as the wave begins, and ends up pointing at Start
  const greet = () => { state = "greeting"; say(); play("Wave", () => play("GestureDown", () => { state = "pointing"; })); };
  if (!MOBILE) play("Show", greet);
  else {
    // phones can't sound before a tap: he keeps waving, balloon closed, until the first tap (other than on Start),
    // which unlocks his sounds and starts the greeting there and then, waving again as he says hello
    const evs = ["pointerup", "touchend", "click"];
    const tap = e => {
      if (state === "leaving" || e.target.closest?.("#orb")) return;
      evs.forEach(n => removeEventListener(n, tap, true));
      unlock(); greet();
    };
    const waveOn = () => { if (state === "waiting") play("Wave", waveOn); };
    play("Show", () => { state = "waiting"; waveOn(); });
    evs.forEach(n => addEventListener(n, tap, true));
  }
  // menu: the Start menu just opened; he snaps up onto its top edge (no animation of his own for that), then leaves
  bonziLeave = menu => {
    if (state === "leaving") return; state = "leaving";
    bonziLeave = () => {};
    unlock();                                           // still inside the tap on Start: his Hide sound may play later
    if (menu) el.style.bottom = Math.round(innerHeight - menu.getBoundingClientRect().top - (B.h - 152)) + "px";
    clearInterval(typing); voice?.pause(); balloon.hidden = true;
    const away = () => play("Hide", () => el.remove());
    // on the menu: in his rest pose (RestPose), whatever he was doing, for a second; then away
    if (menu) { clearTimeout(timer); cur = B.anims.RestPose; idx = 0; cell(cur[0].c); timer = setTimeout(away, 1000); }
    else cur && cur === B.anims.GestureDown ? exit(away) : away();
  };
}
/* The mockup's own pointer (not part of XP or Messenger) to the Start button until a version has been opened. */
function startHint() {
  if (running || $("#starthint")) return;
  document.body.append(h(`<div id="starthint"><div class="sh-bubble">To start, click <b>start</b> and select an MSN version</div><div class="sh-arrow"></div></div>`));
}
/* Opening Messenger from the Start menu: its window appears on the version's sign-in screen, which goes straight to
   "Signing in..." (the address and password are taken as remembered) and then to the contact list. */
let running = false;
function launchMessenger() {
  const main = $("#main");
  if (running && signedIn) return focusWin(main);
  running = true; $("#starthint")?.remove(); delete main.dataset.closed; focusWin(main); mobileFit(main);
  document.title = `${V.product} ${V.short} — mockup`; debugRefresh();
  if (!signedIn) { renderMain(); startSignin(); }
  updateTaskbar();
}
/* Once signed in, contacts write now and then: within 4 seconds of signing in, then every half minute to a minute and a
   half, sometimes in the group chat. */
let chatterTimer = null;
function scheduleChatter(first) {
  clearTimeout(chatterTimer);
  chatterTimer = setTimeout(() => {
    if (!signedIn) return;
    const on = c => c && !c.kind && !c.blocked && c.status !== "offline";
    if (Math.random() < .35) {
      const g = groupConv(), who = g.ids.map(byId).filter(on);
      if (who.length) incomingMessage(pick(who), pick(BUSY_LINES), g);
    } else {
      const c = contacts.filter(on); if (c.length) incomingMessage(pick(c), pick(BUSY_LINES));
    }
    scheduleChatter(false);
  }, first ? 1500 + Math.random() * 2500 : 30000 + Math.random() * 60000);
}
function setBusy(mode) { ({ wm: busyWM, msn7: busyM7, wlm: busyWLM, w12: busyW12 })[V.layout](mode); }
function startSignin(email) {
  if (email) me.email = email;
  me.status = signin.status; setBusy("in");
  clearTimeout(signinTimer); signinTimer = setTimeout(finishSignin, 3500);
}
/* --- 4.7: "Click here to sign in" + the .NET Messenger Service dialog --- */
function signinWM(b) {
  b.innerHTML = `<div class="wm-signin fadein"><img class="logo2" src="${first("logo_buddies")}"><img src="${first("logo")}" style="max-width:90%">
    <div id="wmState"><a id="wmClick">${esc(S("clickSignIn", "Click here to sign in"))}</a></div></div>`;
  $("#wmClick").onclick = openSigninDialog;
}
function busyWM(mode) {
  const st = $("#wmState"); if (!st) return;
  if (!mode) { st.innerHTML = `<a id="wmClick">${esc(S("clickSignIn", "Click here to sign in"))}</a>`; $("#wmClick").onclick = openSigninDialog; return; }
  st.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><div class="clk" style="background-image:url(${first("signin_anim")})"></div>
    <div>${esc(mode === "out" ? S("signingOut", "Signing Out...") : S("signingIn", "Signing In..."))}</div></div>`;
}
function openSigninDialog() {
  const dlg = D().signin;
  const w = dialogWindow(dlg, { ctx: "signin", onOk: vals => { w.remove(); startSignin(vals.email); } });
}
/* --- 7.0 / 7.5 --- */
function signinM7(b) {
  b.innerHTML = `<div class="m7-signin fadein">
    ${frame(me.pic, "offline")}
    <div class="fields" style="align-self:stretch">
      <div class="f">E-mail address:<input id="siEmail" value="${signin.remember ? esc(me.email) : ""}"></div>
      <div class="f">Password:<input id="siPass" type="password" value="${signin.rememberPass ? "password" : ""}"></div>
      <div class="f">${esc(S("status", "Status:"))}<select id="siStatus">${statusKeys().map(k => `<option value="${k}" ${signin.status === k ? "selected" : ""}>${V.statusLabels[k]}</option>`).join("")}</select></div>
      <div class="ck"><label><input type="checkbox" ${signin.remember ? "checked" : ""}> Remember Me</label>
        <label><input type="checkbox" ${signin.rememberPass ? "checked" : ""}> Remember my Password</label>
        <label><input type="checkbox" ${signin.auto ? "checked" : ""}> Sign Me In Automatically</label></div>
    </div>
    <div class="busy" style="display:none;flex-direction:column;align-items:center">
      <img class="anim" src="assets/${V.id}/signin_anim.gif" alt=""><div id="m7Txt"></div></div>
    <button class="pb" id="siBtn">Sign In</button>
    <div class="links"><a>Forgot your password?</a><a>Service Status</a><a>Get a new account</a></div></div>`;
  $("#siStatus").onchange = e => signin.status = e.target.value;
  $("#siBtn").onclick = () => $("#siBtn").dataset.mode === "cancel" ? (clearTimeout(signinTimer), setBusy(false)) : startSignin($("#siEmail").value.trim());
  [$("#siEmail"), $("#siPass")].forEach(i => i.onkeydown = e => { if (e.key === "Enter") startSignin($("#siEmail").value.trim()); });
  $$(".links a", b).forEach(a => a.onclick = () => note("Not available"));
}
function busyM7(mode) {
  const root = $(".m7-signin"); if (!root) return;
  $(".fields", root).style.display = mode ? "none" : ""; $(".busy", root).style.display = mode ? "flex" : "none";
  $("#m7Txt").textContent = mode === "out" ? S("signingOut", "Signing Out...") : S("signingIn", "Signing In...");
  const btn = $("#siBtn"); btn.style.display = mode === "out" ? "none" : ""; btn.textContent = mode === "in" ? "Cancel" : "Sign In"; btn.dataset.mode = mode === "in" ? "cancel" : "";
}
/* --- 8.1 / 8.5 --- */
function signinWLM(b) {
  const st = V.statusLabels[signin.status];
  b.innerHTML = `<div class="w-signin fadein">
    <div class="tilewrap"><img class="pic" src="${picUrl(me.pic)}" alt=""><img class="fr" src="${first("frame_signin")}" alt=""></div>
    <div class="form">
      <div class="fields">
        <div class="lbl"><span class="u">E</span>-mail address:</div>
        <div class="combo"><input id="siEmail" value="${signin.remember ? esc(me.email) : ""}" placeholder="example555@hotmail.com" autocomplete="off"><button id="siPick">▼</button></div>
        <div class="lbl">Pass<span class="u">w</span>ord:</div>
        <div class="combo"><input type="password" id="siPass" value="${signin.rememberPass ? "password" : ""}" autocomplete="off"></div>
        <div class="caps" id="siCaps">Caps Lock is on. Having Caps Lock on may cause you to enter your password incorrectly.</div>
        <div class="asrow"><span>Si<span class="u">g</span>n in as:</span> <span class="stchooser" id="siStatus"><img src="${stIcon(signin.status)}"><span>${st}</span> ▾</span></div>
      </div>
      <div class="opts">
        <label><input type="checkbox" id="siRem" ${signin.remember ? "checked" : ""}> <span>Remem<span class="u">b</span>er me</span></label>
        <a class="forget" id="siForget">(Forget <span class="u">m</span>e)</a>
        <label><input type="checkbox" id="siRemPass" ${signin.rememberPass ? "checked" : ""}> <span><span class="u">R</span>emember my password</span></label>
        <label><input type="checkbox" id="siAuto" ${signin.auto ? "checked" : ""}> <span>Sig<span class="u">n</span> me in automatically</span></label>
      </div>
      <div class="progress"><div class="who" id="siWho"></div><div class="txt" id="siTxt">Signing in...</div>
        <div class="buddyspin"><div class="ring"></div><div class="orbit"><img class="b g" src="${first("st_online")}"><img class="b bl" src="${first("st_online")}"></div></div></div>
      <div class="btns"><button class="btn" data-b="signin"><span class="u">S</span>ign in</button><button class="btn" data-b="cancel" style="display:none">Ca<span class="u">n</span>cel</button></div>
    </div>
    <div class="links"><a>Forgot your password?</a><a>Service status</a><a>Sign up for a Windows Live ID</a><a>Privacy statement</a></div>
    <div class="foot"><img src="${first("check")}"> Windows Live ID</div></div>`;
  const email = $("#siEmail"), pass = $("#siPass");
  $("#siPick").onclick = e => { const r = e.currentTarget.closest(".combo").getBoundingClientRect(); showMenu([{ t: me.email, fn: () => email.value = me.email }, "-", { t: "Sign in with a different e-mail address", fn: () => { email.value = ""; pass.value = ""; email.focus(); } }], r.left, r.bottom); };
  $("#siStatus").onclick = e => { const r = e.currentTarget.getBoundingClientRect(); showMenu(statusKeys().map(k => ({ t: V.statusLabels[k], icon: stIcon(k), radio: true, checked: signin.status === k, fn: () => { signin.status = k; signinWLM(b); } })), r.left, r.bottom); };
  $("#siRem").onchange = e => { signin.remember = e.target.checked; if (!e.target.checked) { signin.rememberPass = signin.auto = false; $("#siRemPass").checked = $("#siAuto").checked = false; } };
  $("#siRemPass").onchange = e => { signin.rememberPass = e.target.checked; if (e.target.checked) { signin.remember = $("#siRem").checked = true; } else { signin.auto = $("#siAuto").checked = false; } };
  $("#siAuto").onchange = e => { signin.auto = e.target.checked; if (e.target.checked) { signin.remember = signin.rememberPass = $("#siRem").checked = $("#siRemPass").checked = true; } };
  $("#siForget").onclick = () => { email.value = pass.value = ""; Object.assign(signin, { remember: false, rememberPass: false, auto: false }); $("#siRem").checked = $("#siRemPass").checked = $("#siAuto").checked = false; };
  const caps = e => { $("#siCaps").style.display = e.getModifierState?.("CapsLock") ? "block" : "none"; };
  [email, pass].forEach(i => i.onkeydown = e => { caps(e); if (e.key === "Enter") startSignin(email.value.trim()); });
  pass.onkeyup = caps;
  $('[data-b="signin"]', b).onclick = () => startSignin(email.value.trim());
  $('[data-b="cancel"]', b).onclick = () => { clearTimeout(signinTimer); setBusy(false); };
  $$(".links a", b).forEach(a => a.onclick = () => note("Not available"));
}
function busyWLM(mode) {
  const root = $(".w-signin"); if (!root) return;
  root.classList.toggle("busy", !!mode);
  $('[data-b="cancel"]', root).style.display = mode === "in" ? "" : "none";
  $("#siTxt").textContent = mode === "out" ? S("signingOut", "") : S("signingIn", "");
  $("#siWho").textContent = mode === "in" ? ($("#siEmail").value.trim() || "") : "";
}

/* ============================================================ conversations */
const convs = [];      // {ids, log:[], win, bg, fontSize, lastAt, rect}
let cascade = 0;
const convTitle = conv => {
  const ps = conv.ids.map(byId).filter(Boolean), grp = groupOf(conv);
  // (no "(N people)" suffix: none of the versions' files have that wording)
  if (V.layout !== "w12") return fmt(S("convTitle", "%1 - Conversation"), grp ? grp.name : ps.map(p => plain(p.name)).join(", "));
  if (grp) return grp.name;
  if (V.layout === "w12") return ps.length === 1 ? `${plain(ps[0].name)} <${ps[0].email}>` : ps.map(p => plain(p.name)).join(", ");
  return `${ps.map(p => plain(p.name)).join(", ")} - Conversation`;
};
function openChat(ids, { focus = true, group = null } = {}) {
  ids = [...new Set(ids)];
  let conv = group ? convs.find(c => c.group === group) : convs.find(c => !c.group && c.ids.length === ids.length && c.ids.every(i => ids.includes(i)));
  // focus: false (a message, nudge, wink or file arriving): the window stays where it is; its taskbar button flashes
  if (conv && conv.win && document.body.contains(conv.win)) { if (focus) { showConv(conv); $("textarea", conv.win).focus(); } return conv; }
  if (!conv) {
    conv = { ids, log: [], bg: settings.defaultBg, fontSize: 13, lastAt: null, group };
    convs.push(conv);
    // Options: "Show my last conversation in new conversation windows"
    const past = pastLogs[convKey(ids, group)];
    if (settings.lastConv && past) conv.log.push(...past.map(m => ({ ...m, old: true })));
    // shown only by the versions whose string tables carry it (4.7 and 7.5); kept in the log so switching version shows/hides it
    conv.log.push({ type: "sys", icon: "warn", only: ["wm", "msn7"], text: "never" });
    const c = byId(ids[0]);
    if (ids.length === 1 && c.status === "offline") conv.log.push({ type: "sys", icon: "info", key: "offlineConv", args: [c.id] });
  }
  buildConvWindow(conv, focus);
  return conv;
}
/* 2011/2012 put conversations in tabs of one window unless Options › Messages › "Enable tabbed conversations" is off. */
const tabbed = () => V.layout === "w12" && settings.tabbedConvs !== false;
const winOf = conv => tabbed() ? $("#convhost") : conv.win;
const showConv = conv => tabbed() ? activateConv(conv) : focusWin(conv.win);
/* 2011/2012: all conversations live in one window, one tab per conversation down the left side. */
let activeConv = null, hostRect = null;
function convHost() {
  let host = $("#convhost"); if (host) return host;
  host = h(`<div class="win conv w12host" id="convhost"><div class="titlebar"><img src="${first("app16")}"><span class="t"></span>
      <div class="cap"><span data-act="min">&#8212;</span><span data-act="max">&#9633;</span><span data-act="close">&#10005;</span></div></div>
    <div class="body"><div class="w12tabs"></div><div class="w12pages"></div></div></div>`);
  Object.assign(host.style, hostRect || { left: "380px", top: "40px", width: "720px", height: "520px" });
  setTimeout(() => mobileFit(host));
  document.body.append(host);
  host.onclose = () => {
    const open = convs.filter(c => c.win);
    if (open.length < 2 || settings.warnTabs === false || !S("closeTabsQ")) return [...convs].forEach(closeConv);
    const w = newWindow({ title: V.product, width: 360, height: 150, cls: "dlgwin msgbox", body: `<div class="pad" style="flex:1">
      <div>${esc(S("closeTabsQ"))}</div><label class="ckb"><input type="checkbox"> ${esc(tl("alwaysCloseAll"))}</label>
      <div class="btns"><button class="btn pb" data-b="all">${esc(tl("closeAllTabs"))}</button><button class="btn pb" data-b="one">${esc(tl("closeThisTab"))}</button><button class="btn pb" data-b="c">Cancel</button></div></div>` });
    w.style.zIndex = 21000;
    $('[data-b="all"]', w).onclick = () => { if ($("input", w).checked) settings.warnTabs = false; w.remove(); [...convs].forEach(closeConv); };
    $('[data-b="one"]', w).onclick = () => { w.remove(); if (activeConv) closeConv(activeConv); };
    $('[data-b="c"]', w).onclick = () => w.remove();
  };
  makeWindow(host); return host;
}
function renderTabs() {
  const host = $("#convhost"); if (!host) return;
  const open = convs.filter(c => c.win);
  $(".w12tabs", host).innerHTML = open.map((c, i) => {
    const p = byId(c.ids[0]);
    return `<div class="tab ${c === activeConv ? "sel" : ""} ${c.unread && c !== activeConv ? "unread" : ""}" data-i="${i}" title="${esc(convTitle(c))}">${c.ids.length > 1 ? `<img class="grp" src="${first("group_tile")}">` : frame(p.pic, p.status)}<span class="x" title="Close">✕</span></div>`;
  }).join("");
  $$(".tab", host).forEach(t => { const c = open[+t.dataset.i]; t.onclick = e => e.target.classList.contains("x") ? closeConv(c) : activateConv(c); });
}
function activateConv(conv, focus = true) {
  const host = convHost(); activeConv = conv; conv.unread = false;
  $$(".w12page", host).forEach(pg => pg.style.display = pg === conv.win ? "" : "none");
  $(".titlebar .t", host).textContent = convTitle(conv);
  renderTabs(); if (focus) focusWin(host);
  const hist = $(".hist", conv.win); if (hist) hist.scrollTop = hist.scrollHeight;
}
function buildConvTab(conv, focus) {
  const fresh = !$("#convhost"), prev = activeWin(), host = convHost();
  if (fresh && !focus) placeBehind(host, prev);
  const page = h(`<div class="w12page"></div>`); page.innerHTML = convW12(conv);
  $(".w12pages", host).append(page); conv.win = page;
  wireConv(conv); refreshConv(conv); renderHistory(conv);
  if (focus || !activeConv || !activeConv.win) activateConv(conv, focus); else { page.style.display = "none"; renderTabs(); }
}
function buildConvWindow(conv, focus = true) {
  if (tabbed()) return buildConvTab(conv, focus);
  const prevActive = activeWin(), off = (cascade++ % 6) * 28;
  const w = h(`<div class="win conv"><div class="titlebar"><img src="${first("app16")}"><span class="t"></span>
      <div class="cap"><span data-act="min">&#8212;</span><span data-act="max">&#9633;</span><span data-act="close">&#10005;</span></div></div>
    <div class="menubar"></div><div class="body"></div></div>`);
  const r = conv.rect;
  Object.assign(w.style, r ? { left: r.l, top: r.t, width: r.w, height: r.h } : { left: (conv.ids.length > 1 ? 470 : 380) + off + "px", top: (conv.ids.length > 1 ? 160 : 40) + off + "px" });
  if (!r && V.layout === "wm") w.style.width = "620px";
  if (!r && V.layout === "w12") Object.assign(w.style, { width: "600px", height: "500px" });
  document.body.append(w);
  conv.win = w; w.onclose = () => closeConv(conv);
  buildMenubar($(".menubar", w), menuDefsFrom(D().menus.conv, conv));
  const body = $(".body", w);
  body.innerHTML = ({ wm: convWM, msn7: convM7, wlm: convWLM, w12: convW12 })[V.layout](conv);
  makeWindow(w);
  wireConv(conv);
  refreshConv(conv); renderHistory(conv); applyBg(conv); applyConvChrome(conv);
  if (conv.ink?.on) setInkMode(conv, hasInk() && settings.inkAllowed !== false);
  if (conv.ps) { if (S("psName") && conv.ps.phase === "on") renderPhotoShare(conv); else if (!S("psName")) conv.ps = null; }   // only 2009 has it
  mobileFit(w);
  if (!focus) placeBehind(w, prevActive); else $("textarea", w).focus();
}
/* a window opened by someone else (a message arriving): just behind the window in use, which keeps the keyboard */
const activeWin = () => $$(".win:not(.hidden):not(.inactive)").find(x => x.id !== "debug");
function placeBehind(w, act) {
  w.classList.add("inactive");
  if (act && act !== w) act.classList.remove("inactive");      // creating the window had taken the focus from it
  const z = act && act !== w ? +act.style.zIndex || 0 : 0;
  if (z) { $$(".win").forEach(x => { if (x !== w && +x.style.zIndex >= z) x.style.zIndex = +x.style.zIndex + 1; }); w.style.zIndex = z; zTop++; }
}
const tbtn = (key, iconName, label, extra = "") => `<button class="tbtn ${extra}" data-t="${key}" title="${esc(label)}"><img src="${first(iconName, iconName === "tb_photos" ? "tb_files" : null)}" alt="">${label ? `<span>${esc(label)}</span>` : ""}</button>`;
function convWM(conv) {
  return `<div class="wm-tb">${tbtn("invite", "tb_invite", "Invite")}${tbtn("block", "tb_block", "Block")}${tbtn("mail", "tb_mail", "Send E-mail")}${tbtn("call", "tb_voice", "Voice")}</div>
    <div class="wm-to"></div>
    <div class="main"><div class="left"><div class="hist"></div>
      <div class="compose"><div class="fmt">${tbtn("font", "fmt_font", "Font")}<button class="tbtn emobtn" title="Emoticons"><img src="${first("fmt_emo")}"> ▾</button></div>
        <div class="row"><textarea></textarea><div class="send"><button class="pb" data-f="send">Send</button></div></div></div></div>
      <div class="wm-side"><div class="panel"><div class="h">I want to...</div>
        <div class="a" data-t="invite"><img src="${first("t_add")}">Invite Someone to This Conversation</div>
        <div class="a" data-t="file"><img src="${first("t_file")}">Send a File or Photo</div>
        <div class="a" data-t="call"><img src="${first("t_voice")}">Start a Voice Conversation</div>
        <div class="a" data-t="video"><img src="${first("t_video")}">Start a Video Conversation</div>
        <div class="a" data-t="mail"><img src="${first("t_mail")}">Send E-mail</div>
        <div class="a" data-t="phone"><img src="${first("t_phone")}">Make a Phone Call</div>
        <div class="a" data-t="remote"><img src="${first("t_chat")}">Ask for Remote Assistance</div></div></div></div>
    <div class="statusline"></div>`;
}
/* The formatting bar of 6.2 / 7.5, in the order of UIFILE 920's <mtoolbar>: fontbtn, emoticonbtn, VoiceIMtoolbarbtn, winkbtn,
   backgroundsbtn, themesbtn (Packs), buzzbtn (Nudge). 6.2 has only the first two and Backgrounds. Tooltips are the AccNames. */
const fmtBtn = (key, icon, tip, caret) => `<button class="tbtn" data-t="${key}" title="${esc(tip)}"><img src="${first(icon)}" alt="">${caret ? " ▾" : ""}</button>`;
function fmtBarM7() {
  return fmtBtn("font", "fmt_font", "Font") + `<button class="tbtn emobtn" title="Emoticons"><img src="${first("fmt_emo")}"> ▾</button>`
    + (V.features.voice ? fmtBtn("voice", "fmt_voice", S("voiceClip", "Voice Clip")) : "")
    + (V.features.winks ? fmtBtn("wink", "fmt_wink", "Winks", true) : "")
    + fmtBtn("bg", "fmt_bg", "Backgrounds", V.id !== "6.2")
    + (has("fmt_packs") && V.id !== "6.2" ? fmtBtn("packs", "fmt_packs", "Packs", true) : "")
    + (V.features.nudge ? fmtBtn("nudge", "fmt_nudge", "Nudge") : "");
}
function convM7(conv) {
  // labels: strings 60032-60042 (6.2: Invite, Send Files, Webcam, Audio, Fun & Games; 7.5: ... Video, Voice, Activities, Games)
  return `<div class="m7-ctb">${tbtn("invite", "tb_invite", tl("tbInvite", "Invite"))}${tbtn("file", "tb_files", tl("tbFiles", "Send Files"))}${tbtn("video", "tb_video", tl("tbVideo", "Video"))}${tbtn("call", "tb_audio", tl("tbCall", "Voice"))}
      ${D().strings.tbActs ? tbtn("acts", "tb_acts", tl("tbActs")) : ""}${tbtn("games", "tb_games", tl("tbGames", "Games"))}<span class="sp"></span>${tbtn("block", "tb_block", "")}</div>
    <div class="m7-to"></div>
    <div class="main"><div class="left"><div class="hist"></div>
      <div class="compose"><div class="fmt" style="${has("fmtbar_m") ? `background:url(${first("fmtbar_l")}) left top no-repeat,url(${first("fmtbar_r")}) right top no-repeat,url(${first("fmtbar_m")}) 6px 0/calc(100% - 12px) 100% no-repeat;border:0;height:23px;box-sizing:border-box;padding:0 6px` : ""}">${fmtBarM7()}</div>
        <div class="row"><textarea></textarea>${inkModeTabs(conv)}<div class="send"><button class="pb" data-f="send">Send</button><button class="pb" data-f="search">Search</button></div></div></div></div>
      <div class="pane"></div></div>
    <div class="statusline"></div>`;
}
function convWLM(conv) {
  return `<div class="w-chead"></div>
    <div class="w-ctb">${D().strings.tbPhotos
      // 2009 (strings 64200-64208): Photos, Files, Video, Call, Activities, Games, Invite, Block
      ? `${tbtn("photos", "tb_photos", tl("tbPhotos"))}${tbtn("file", "tb_files", tl("tbFiles"))}${tbtn("video", "tb_video", tl("tbVideo"))}${tbtn("call", "tb_call", tl("tbCall"))}
         ${tbtn("acts", "tb_acts", tl("tbActs"))}${tbtn("games", "tb_games", tl("tbGames"))}${tbtn("invite", "tb_invite", tl("tbInvite"))}${tbtn("block", "tb_block", tl("tbBlock"))}`
      : `${tbtn("invite", "tb_invite", tl("tbInvite", "Invite"))}${tbtn("file", "tb_files", tl("tbFiles", "Share files"))}${tbtn("video", "tb_video", tl("tbVideo", "Video"))}${tbtn("call", "tb_call", tl("tbCall", "Call"))}
         ${tbtn("games", "tb_games", tl("tbGames", "Games"))}${tbtn("acts", "tb_acts", tl("tbActs", "Activities"))}${tbtn("block", "tb_block", tl("tbBlock", "Block"))}`}</div>
    <div class="main"><div class="left"><div class="hist"></div>
      <div class="compose"><div class="fmt"><button class="tbtn emobtn" title="Select an emoticon"><img src="${first("fmt_emo")}"> ▾</button>
        ${fmtBtn("wink", "fmt_wink", "Winks", true)}${fmtBtn("nudge", "fmt_nudge", "Nudge")}${fmtBtn("voice", "fmt_voice", S("voiceClip", "Voice Clip"))}${fmtBtn("font", "fmt_font", "Font")}${fmtBtn("bg", "fmt_bg", "Backgrounds", true)}</div>
        <div class="row"><textarea></textarea>${inkModeTabs(conv)}<div class="send"><button class="btn" data-f="send">Send</button><button class="btn" data-f="search">Search</button></div></div></div></div>
      <div class="pane"></div></div>
    <div class="statusline"></div>`;
}
function convW12(conv) {
  return `<div class="w12-chead"><div class="who"></div>
      <div class="acts">${tbtn("video", "tb_video", "Video call")}${tbtn("call", "tb_call", "Call")}${tbtn("invite", "tb_invite", "Invite")}${tbtn("file", "tb_files", "Files")}
        ${tbtn("games", "tb_games", "Games")}${tbtn("block", "tb_block", "")}<button class="tbtn" data-t="menu" title="Show menu">☰ ▾</button></div></div>
    <div class="w12-main"><div class="pane"></div>
      <div class="left"><div class="hist"></div>
        <div class="compose"><div class="fmt"><button class="tbtn emobtn" title="Send an emoticon or wink"><img src="${first("fmt_emo")}"> ▾</button>
          ${fmtBtn("nudge", "fmt_nudge", "Nudge")}${fmtBtn("voice", "fmt_voice", S("voiceClip", "Voice Clip"))}${fmtBtn("font", "fmt_font", "Change font")}</div>
          <div class="row"><textarea></textarea></div></div></div></div>
    <div class="statusline"></div>`;
}
function wireConv(conv) {
  const w = conv.win, ta = $("textarea", w);
  const sendB = $('[data-f="send"]', w); if (sendB) sendB.onclick = () => send(conv);
  const sb = $('[data-f="search"]', w); if (sb) sb.onclick = () => note("Not available");
  ta.onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(conv); } };
  if (MOBILE) ta.setAttribute("enterkeyhint", "send");      // phones: Enter sends (the Send button is hidden there)
  // right-click menus of the typing box and the conversation text (the version's own MENU resources)
  ta.oncontextmenu = e => { activeConvForMenu = conv; const m = ctxMenu("edit", "edit"); if (m) { e.preventDefault(); showMenu(m, e.clientX, e.clientY); } };
  const hist = $(".hist", w); if (hist) hist.oncontextmenu = e => { activeConvForMenu = conv; const m = ctxMenu("histctx", "hist"); if (m) { e.preventDefault(); showMenu(m, e.clientX, e.clientY); } };
  wireConvButtons(conv);
  wireInkBar(conv);
  wireInputSplitter(conv);
  // toolbar buttons for features this version didn't have
  if (!V.features.nudge) $$('[data-t="nudge"],[data-t="wink"]', w).forEach(x => x.remove());
}
/* 6.2 to 2009 put a <splitter> (5px, beforeid youlayout, afterid inputarea) between the conversation text and the typing
   area, and 2012 an "inputareagripper": dragging it makes the typing area, and the handwriting pad inside it, taller or
   shorter. 4.7 has none. The markup gives the splitter's place and size, not a drawing, so it is a plain strip. */
function wireInputSplitter(conv) {
  const w = conv.win, comp = $(".compose", w), hist = $(".hist", w);
  if (V.layout === "wm" || !comp || !hist || $(".csplit", w)) return;
  const bar = h(`<div class="csplit"></div>`); comp.before(bar);
  if (conv.inputH) comp.style.setProperty("--inh", conv.inputH + "px");
  bar.onpointerdown = e => {
    e.preventDefault(); bar.setPointerCapture(e.pointerId);
    const row = $(".row", comp), y0 = e.clientY, h0 = $("textarea", row).offsetHeight || $(".inkpad", row)?.offsetHeight || 58, room = hist.offsetHeight + h0 - 60;
    bar.onpointermove = ev => { conv.inputH = Math.round(Math.max(40, Math.min(room, h0 - (ev.clientY - y0)))); comp.style.setProperty("--inh", conv.inputH + "px"); };
    bar.onpointerup = () => { bar.onpointermove = bar.onpointerup = null; };
  };
}
function wireConvButtons(conv) {
  const w = conv.win;
  const eb = $(".emobtn", w); if (eb) eb.onclick = e => emoPicker(conv, e.currentTarget);
  $$("[data-t]", w).forEach(b => b.onclick = () => {
    const t = b.dataset.t;
    if (t === "menu") return menuButton(D().menus.conv, conv)({ currentTarget: b });
    if (t === "invite") invite(conv); else if (t === "block") block(conv); else if (t === "nudge") nudge(conv, true);
    else if (t === "bg") cycleBg(conv); else if (t === "wink") wink(conv); else if (t === "font") fontDialog();
    else if (t === "photos" && S("psName")) photoShare(conv);
    else if (t === "file") { const m = V.layout === "w12" && (activeConvForMenu = conv, ctxMenu("share", "share")); if (m) { const r = b.getBoundingClientRect(); showMenu(m, r.left, r.bottom); } else sendFile(conv); }
    else if (t === "video") toggleCall(conv, "video");
    else if (t === "call") toggleCall(conv, "voice");
    else if (t === "voice") { if (!V.features.voice) return;
      if (conv.call && S("noClipInCall")) return note(S("noClipInCall")); sysKey(conv, "tb_audio", "voiceRecording"); setTimeout(() => { play("vimdone"); sysKey(conv, "tb_audio", "voiceDone"); }, 1500); }
    else if (t === "mail") note("Not available");
    else if ((t === "games" || t === "acts") && gamesLobby(conv, b)) return;
    else note("Not available");
  });
}
let ptrDown = false;
addEventListener("pointerdown", () => ptrDown = true, true);
addEventListener("pointerup", () => { ptrDown = false; convs.forEach(c => { if (c.redrawAfterDrag) { c.redrawAfterDrag = false; if (c.win) refreshConv(c); } }); }, true);
function refreshConvs() { convs.forEach(c => c.win && document.body.contains(c.win) && refreshConv(c)); }
function refreshConv(conv) {
  const w = conv.win, ps = conv.ids.map(byId).filter(Boolean);
  const tt = $(".titlebar .t", w); if (tt) tt.textContent = convTitle(conv);
  if (V.layout === "w12") {
    if (tabbed() && conv === activeConv && $("#convhost")) $("#convhost .titlebar .t").textContent = convTitle(conv);
    $(".w12-chead .who", w).innerHTML = ps.length === 1
      ? `<b>${emoticonize(ps[0].name)}</b> <span class="st"><img src="${stIcon(ps[0].status)}"> ${statusLabel(ps[0].status)}</span><div class="sub">${ps[0].song ? "♫ " + esc(ps[0].song) : ps[0].psm ? emoticonize(ps[0].psm) : esc(ps[0].email)}</div>`
      // (no "N people in this conversation" line: 2012's files have no such wording)
      : groupOf(conv) ? `<b>${esc(groupOf(conv).name)}</b><div class="sub">${ps.map(p => emoticonize(p.name)).join(", ")}</div>`
      : `<b>${ps.map(p => emoticonize(p.name)).join(", ")}</b>`;
    if (tabbed()) renderTabs();
  }
  const to = ps.map(c => `<b>${emoticonize(c.name)}</b> &lt;${esc(c.email)}&gt;`).join(", ");
  if (V.layout === "wm") $(".wm-to", w).innerHTML = `${esc(S("to", "To:"))} ${to}`;
  if (V.layout === "msn7") $(".m7-to", w).innerHTML = `${esc(S("to", "To:"))} ${to}${ps.length === 1 && V.features.psm && (ps[0].psm || ps[0].song) ? `<div style="color:#555">${ps[0].song ? "♫ " + esc(ps[0].song) : emoticonize(ps[0].psm)}</div>` : ""}`;
  if (V.layout === "wlm") $(".w-chead", w).innerHTML = ps.length === 1
    ? `<b>${emoticonize(ps[0].name)}</b> <span style="color:#56708c">(${statusLabel(ps[0].status)})</span><div class="sub">${ps[0].song ? "♫ " + esc(ps[0].song) : ps[0].psm ? emoticonize(ps[0].psm) : "&lt;" + esc(ps[0].email) + "&gt;"}</div>`
    : `<b>${ps.map(p => emoticonize(p.name)).join(", ")}</b><div class="sub">${esc(fmt(S("participants", "%1!d! Participants"), ps.length + 1))}</div>`;
  // a message arriving while a call volume slider is being dragged waits until the mouse is released
  const drag = ptrDown && w.contains(document.activeElement) && document.activeElement.matches("input[data-k]");
  if (drag) conv.redrawAfterDrag = true;
  const pane = drag ? null : $(".pane", w);
  if (pane) {
    if (ps.length === 1) {
      pane.className = "side pane";
      const arrow = V.layout === "msn7" ? `<img class="arrow" src="${first("arrow_up")}">` : "";
      pane.innerHTML = `<div class="dpbox">${frame(settings.showPics ? ps[0].pic : "default1", ps[0].status)}${arrow}</div>
        <div class="dpbox">${me.showPic ? frame(me.pic, me.status) : ""}${arrow}<div class="lbl">${emoticonize(me.name)}</div></div>`;
    } else {
      pane.className = "plist pane";
      pane.innerHTML = (V.layout === "wlm" ? `<div class="hd">${esc(fmt(S("participants", "%1!d! Participants"), ps.length + 1))}</div>` : "") + ps.map(c => `<div class="p">${frame(settings.showPics ? c.pic : "default1", c.status)}<div style="min-width:0"><div class="n">${emoticonize(c.name)}</div><div class="s"><img src="${stIcon(c.status)}" style="width:12px;vertical-align:-2px"> ${statusLabel(c.status)}</div></div></div>`).join("")
        + `<div class="p">${frame(me.pic, me.status)}<div><div class="n">${emoticonize(me.name)}</div><div class="s">${statusLabel(me.status, true)}</div></div></div>`;
    }
  }
  if (!drag) renderCall(conv);
  const sl = $(".statusline", w);
  // 6.2 words it "Last message received on %1 at %2." (date first); later versions "at %1 on %2."
  const lm = S("lastMsg", "Last message received at %1 on %2."), dateFirst = /on %1 at %2/.test(lm);
  if (!sl.dataset.busy) sl.textContent = conv.lastAt ? fmt(lm, ...(dateFirst ? [today(), conv.lastAt] : [conv.lastAt, today()])) : "";
  if (V.layout === "wm" && conv.lastAt && !sl.dataset.busy) sl.textContent = fmt(S("lastMsg"), today(), conv.lastAt);
}
function renderHistory(conv) {
  const hist = $(".hist", conv.win); if (!hist) return;
  hist.style.fontSize = (conv.fontSize || 13) + "px";
  hist.innerHTML = "";
  let lastFrom = null;
  for (const m of conv.log) { hist.append(logEl(m, lastFrom)); lastFrom = m.type === "msg" ? m.from : null; }
  if (conv.call?.phase === "incoming" && V.layout !== "w12") hist.append(callPrompt(conv));
  hist.scrollTop = hist.scrollHeight;
}
const fromName = id => id === "me" ? me.name : (byId(id)?.name || id);
function logEl(m, lastFrom) {
  if (m.old) { const el = logEl({ ...m, old: false }, lastFrom); el.classList.add("oldmsg"); return el; }
  if (m.only && !m.only.includes(V.layout)) return h(`<span hidden></span>`);
  if (m.type === "ft") return ftEl(m);
  if (m.type === "wink") {
    const wk = (D().winks || []).find(x => x.key === m.key);
    if (!wk) return h(`<span hidden></span>`);
    const el = h(`<div class="winkbox"><div class="from">${emoticonize(fromName(m.from))}:</div><img src="assets/${V.id}/winks/${wk.key}.png${V_Q}" title="${esc(wk.name)}"><div class="wn">${esc(wk.name)}</div></div>`);
    $("img", el).onclick = () => playWink(wk, convs.find(c => c.log.includes(m)));
    return el;
  }
  if (m.type === "sys") {
    let text = m.text === "never" ? S("never", "Never give out your password or credit card number in an instant message conversation.") : m.text;
    if (m.key) { const t = S(m.key); if (!t) return h(`<span hidden></span>`); text = fmt(t, ...(m.args || []).map(a => byId(a) ? plain(byId(a).name) : a)); }
    const ic = first(m.icon, "info");      // 4.7 has no such icon
    return h(`<div class="sys">${ic ? `<img src="${ic}">` : ""}<span>${esc(text)}</span></div>`);
  }
  if (m.type === "psinvite") {      // 2009: the generic activity invitation with %2 = "sharing photos", Accept / Decline links
    const conv = convs.find(v => v.log.includes(m)), c = byId(m.from), nm = plain(c?.name || "");
    if (m.answered) return h(`<span hidden></span>`);
    const L = (t, act) => `<a data-act="${act}">${esc(t)}</a>`;
    const el = h(`<div class="sys callprompt"><img src="${first("tb_files", "info")}"><span>${esc(fmt(S("inviteStart", "%1 is inviting you to start %2. Do you want to %3 or %4 the invitation?"), nm, S("psName"), "\u0003", "\u0004")).replace("\u0003", L(S("lblAccept", "Accept"), "a")).replace("\u0004", L(S("lblDecline", "Decline"), "d"))}</span></div>`);
    $$("[data-act]", el).forEach(x => x.onclick = () => {
      m.answered = true;
      if (x.dataset.act === "a") {
        sysKey(conv, "tb_files", "youAcceptedStart", "", S("psName"));
        conv.ps = { phase: "on", photos: MY_PICTURES().sort(() => Math.random() - .5).slice(0, 4).map(p => ({ name: p[0], img: p[1], saved: 0 })), sel: 0, collapsed: false };
        renderPhotoShare(conv);
      } else sysKey(conv, "tb_files", "youDeclinedStart", "", S("psName"));
      renderHistory(conv);
    });
    return el;
  }
  if (m.type === "nudge") {
    const txt = m.from === "me" ? S("nudgeSent", "You have just sent a nudge.") : fmt(S("nudgeGot", "%1 just sent you a nudge."), plain(fromName(m.from)));
    return h(`<div class="nudge">${esc(txt)}</div>`);
  }
  if (m.type === "ink") {
    const el = logEl({ ...m, type: "msg", text: "" }, lastFrom);
    $(".txt", el).append(h(`<img class="inkmsg" src="${m.src}" style="width:${m.w}px;height:${m.h}px" alt="">`));
    return el;
  }
  const grouped = settings.groupSeq && lastFrom === m.from;
  const fmtSays = settings.timestamps ? S("saysTime", S("says", "%1 says:").replace(/:?$/, " (%3):")) : S("says", "%1 says:");
  const head = esc(fmt(fmtSays.replace("%3", "\u0003"), "\u0002")).replace("\u0002", emoticonize(fromName(m.from))).replace("\u0003", esc(m.ts));
  return h(`<div class="m ${grouped ? "grouped" : ""}"><div class="from">${head}</div>
    <div class="txt" style="${m.style || ""}" ${m.rtl ? 'dir="rtl"' : ""}>${emoticonize(m.text)}</div></div>`);
}
function pushLog(conv, entry) {
  conv.log.push(entry);
  if (!conv.win || !document.body.contains(conv.win)) return;
  const hist = $(".hist", conv.win), prev = conv.log[conv.log.length - 2];
  hist.append(logEl(entry, prev && (prev.type === "msg" || prev.type === "ink") ? prev.from : null)); hist.scrollTop = hist.scrollHeight;
}
const addMsg = (conv, from, text) => pushLog(conv, { type: "msg", from, text, ts: now(), date: today(), style: from === "me" ? myFontCss() : "", rtl: from === "me" && settings.rtl });
const sysMsg = (conv, icon, text) => pushLog(conv, { type: "sys", icon, text, ts: now(), date: today() });
const sysKey = (conv, icon, key, ...args) => pushLog(conv, { type: "sys", icon, key, args, ts: now(), date: today() });   // native string, per version
function send(conv) {
  if (conv.ink?.on) { if (!sendInk(conv)) return; }
  else { const ta = $("textarea", conv.win), text = ta.value.trim(); if (!text) return; ta.value = ""; addMsg(conv, "me", text); }
  const online = conv.ids.map(byId).filter(c => c && c.status !== "offline");
  if (!online.length) return;
  const who = online[Math.floor(Math.random() * online.length)];
  const sl = $(".statusline", conv.win);
  setTimeout(() => { if (!conv.win) return; sl.dataset.busy = 1; sl.textContent = fmt(S("typing", "%1 is writing a message."), plain(who.name)); }, 700);
  setTimeout(() => {
    if (!conv.win || !document.body.contains(conv.win)) return;
    delete sl.dataset.busy; conv.lastAt = now();
    if (conv.ids.length === 1 && V.features.nudge && Math.random() < .12) { nudge(conv, false); refreshConv(conv); return; }
    addMsg(conv, who.id, REPLIES[Math.floor(Math.random() * REPLIES.length)]); play("type", false, who);
    if (conv.ids.length > 1 && Math.random() < .6) { const o = online.find(c => c !== who); if (o) setTimeout(() => { if (conv.win && document.body.contains(conv.win)) addMsg(conv, o.id, REPLIES[Math.floor(Math.random() * REPLIES.length)]); }, 900); }
    refreshConv(conv);
    if (tabbed() && conv !== activeConv) { conv.unread = true; renderTabs(); }
    const ww = winOf(conv); if (ww && ww.classList.contains("inactive")) flashWin(ww);
  }, 1800 + Math.random() * 1500);
}
function nudge(conv, mine) {
  if (!V.features.nudge) return;
  if (!settings.nudges) { S("nudgesOff") ? sysMsg(conv, "info", S("nudgesOff")) : note("Nudges are turned off in Options › Messages."); return; }
  pushLog(conv, { type: "nudge", from: mine ? "me" : conv.ids[0] });
  const ww = winOf(conv); ww.classList.remove("shake"); void ww.offsetWidth; ww.classList.add("shake"); play("nudge");
  if (!mine && (ww.classList.contains("inactive") || ww.classList.contains("hidden"))) flashWin(ww);
}
function wink(conv, key) {
  if (!V.features.winks || !(D().winks || []).length) return;
  if (!key) return winkPicker(conv);
  pushLog(conv, { type: "wink", from: "me", key, ts: now(), date: today() });
  playWink(D().winks.find(x => x.key === key), conv);      // the sender sees their own wink play too
}
function receiveWink(conv, from, key) {
  if (!V.features.winks || !(D().winks || []).some(x => x.key === key)) return;
  pushLog(conv, { type: "wink", from, key, ts: now(), date: today() });
  if (settings.autoWinks) playWink(D().winks.find(x => x.key === key), conv);
}
/* ============================================================ My Emoticons / Winks / Backgrounds */
/* DIALOG 306 (My Custom Emoticons), 307 (Add), 308 (Modify). 2012 has no DIALOG for this, so it reuses 8.5's. */
function emoDlg(id) { return D().dlg?.[id] || MSNDATA["8.5"].dlg[id]; }
/* Windows rebuilt from the programs' own markup (tools/duihtml.py; data.js "ui"): the window's HTML and scoped CSS, with
   the markup's ids kept as data-id so its buttons and lists are wired here by name. */
function uiDialog(name, opts = {}) {
  const u = D().ui?.[name]; if (!u || u.html.length < 400) return null;
  const scope = `ui${V.id.replace(".", "")}-${name}`, sid = "css-" + scope;
  if (!document.getElementById(sid)) document.head.append(Object.assign(document.createElement("style"), { id: sid, textContent: u.css }));
  const pad = u.client ? [8, 34] : [0, 0];            // a size given for the content alone: add the frame and title bar
  const w = newWindow({ title: opts.title || u.title || V.product, width: opts.width || (u.w && u.w + pad[0]) || 470, height: opts.height || (u.h && u.h + pad[1]) || 420,
    cls: `dlgwin uiwin`, resizable: true, body: `<div class="uibody ${scope}">${u.html}</div>` });
  w.style.zIndex = 20000;
  const q = id => $(`[data-id="${id}"]`, w);
  // counters the program formatted ("Pinned emoticons (%1!lu!/%2!lu!)"): without the numbers, the label alone
  // (2009 has that plain "Pinned emoticons" too, 44092)
  const tw = document.createTreeWalker(w, NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) if (/%\d!\w+!/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/\s*\(%\d!\w+!(\/%\d!\w+!)?\)/g, "");
  // the usual ones: OK / Close / Cancel close it, Help and the "get more" links go to the web
  $$('[data-id="idok"],[data-id="idOk"],[data-id="idclose"],[data-id="idClose"],[data-id="idcancel"],[data-id="idCancel"],[data-id="FLWCloseBtn"],[data-id="idContactCardClose"]', w)
    .forEach(b => b.onclick = () => w.remove());
  // a MenuButton's own drop-down (PopupMenu2, hidden in the markup) opens as a menu; its items act as themselves
  $$(".d-menubutton", w).forEach(b => b.onclick = e => {
    if (e.target.closest("[data-popup]")) return;
    const items = $$("[data-popup] > *", b).map(it => ({ t: it.textContent.trim(), fn: () => it.click() }));
    const r = b.getBoundingClientRect(); if (items.length) showMenu(items, r.left, r.bottom);
  });
  $$('[data-id="idhelp"],[data-id="idHelp"],[data-id="getwinks"],[data-id="getemoticons"],[data-id="idFeaturedPartnerLink"],[data-id="morelink"]', w)
    .forEach(b => b.onclick = e => { e.preventDefault(); note("Not available"); });
  return { w, q };
}
/* fill a markup window's data bindings: content -> text, visible -> shown only when the value is there ("." = itself) */
function uiBind(root, data) {
  const get = n => n === "." ? true : data[n] ?? data[n.split("/").pop()] ?? data[n.split("::").pop()];
  $$("[data-bind-visible]", root).forEach(el => { const v = get(el.dataset.bindVisible); el.style.display = v ? "" : "none"; });
  $$("[data-bind-content]", root).forEach(el => { const v = get(el.dataset.bindContent); if (typeof v === "string") el.innerHTML = emoticonize(v); });
  $$("[data-bind-accname]", root).forEach(el => { const v = get(el.dataset.bindAccname); if (typeof v === "string") el.title = plain(v); });
}
/* a list the markup leaves for the program to fill: tiles, one selected at a time */
function uiTiles(box, items, onSel, onOpen) {
  if (!box) return;
  box.classList.add("uitiles");
  box.innerHTML = items.map((it, i) => `<button type="button" class="uitile ${i === 0 ? "sel" : ""}" data-i="${i}" title="${esc(it.title || "")}">${it.html}</button>`).join("");
  $$(".uitile", box).forEach(b => {
    b.onclick = () => { $$(".uitile.sel", box).forEach(x => x.classList.remove("sel")); b.classList.add("sel"); onSel?.(items[+b.dataset.i]); };
    b.ondblclick = () => onOpen?.(items[+b.dataset.i]);
  });
  if (items[0]) onSel?.(items[0]);
}
function myEmoticons() {
  const ui = uiDialog("emoticons");
  if (ui) {
    const { w, q } = ui; let sel = null;
    const drawMine = () => uiTiles(q("idMyContentList") || q("listofapps"), customEmoticons.map((e, i) => ({ i, title: `${e.short} ${e.name || ""}`, html: `<img src="${e.img}" class="cemo">` })), it => sel = it.i, () => sel != null && modifyEmoticon(sel, drawMine));
    drawMine();
    uiTiles(q("idDefContentList"), emoSet().picker.map(e => ({ title: `${e.name || ""} ${e.code}`, html: emoticonize(e.code) })));
    q("idcreateemoticon")?.addEventListener("click", () => addEmoticon(drawMine));
    q("idmodifyemoticon")?.addEventListener("click", () => sel != null && customEmoticons[sel] && modifyEmoticon(sel, drawMine));
    q("idremoveemoticon")?.addEventListener("click", () => { if (sel != null && customEmoticons[sel]) { customEmoticons.splice(sel, 1); sel = null; drawMine(); } });
    $$('[data-id="idpinemoticon"],[data-id="idunpinemoticon"]', w).forEach(b => b.onclick = () => note("Not available"));
    q("idok")?.addEventListener("click", () => renderAll());
    return;
  }
  let sel = 0;
  const d = emoDlg("306");
  const dlg = { ...d, title: V.layout === "w12" ? S("customEmoticons", d.title) : d.title, ctrls: d.ctrls.filter(c => c.id !== 1435) };   // 1435's "%d" count isn't in the files
  let lvEl;
  const draw = () => {
    lvEl.innerHTML = customEmoticons.length ? customEmoticons.map((e, i) => `<div class="row ${i === sel ? "sel" : ""}" data-i="${i}"><img src="${e.img}" style="width:19px;height:19px"> ${esc(e.short)} ${e.name ? `<span style="color:#777">— ${esc(e.name)}</span>` : ""}</div>`).join("") : "";
    $$(".row", lvEl).forEach(r => { r.onclick = () => { sel = +r.dataset.i; draw(); }; r.ondblclick = () => modifyEmoticon(sel, draw); });
  };
  const w = dialogWindow(dlg, {
    fill: (dd, c, el) => { if (el) { lvEl = el; draw(); } return null; },
    onButton: c => {
      const t = plain(c.t).toLowerCase();
      if (t.startsWith("add")) addEmoticon(draw);
      else if (t === "remove" && customEmoticons[sel]) { customEmoticons.splice(sel, 1); sel = Math.max(0, sel - 1); draw(); }
      else if (t.startsWith("modify") && customEmoticons[sel]) modifyEmoticon(sel, draw);
      else if (t === "move up" && sel > 0) { [customEmoticons[sel - 1], customEmoticons[sel]] = [customEmoticons[sel], customEmoticons[sel - 1]]; sel--; draw(); }
      else if (t === "move down" && sel < customEmoticons.length - 1) { [customEmoticons[sel + 1], customEmoticons[sel]] = [customEmoticons[sel], customEmoticons[sel + 1]]; sel++; draw(); }
      else if (t === "help") note("Not available");
    },
    onOk: (v, ww) => { ww.remove(); renderAll(); },
  });
}
function pickImage(cb) {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => cb(r.result, f.name); r.readAsDataURL(f); };
  inp.click();
}
function emoForm(dlgId, init, onDone) {
  const d = emoDlg(dlgId); let img = init?.img || "";
  const w = dialogWindow(d, {
    onButton: c => { if (/find image/i.test(plain(c.t))) pickImage((data, name) => { img = data; const ed = $$("input.ed", w); const imgEd = ed.find(e => e.dataset.ctl === "1419") || ed[0]; imgEd.value = name;
      const pv = $(".emo-pv", w); if (pv) pv.src = data; }); },
    onOk: () => {
      const ed = $$("input.ed", w), by = id => ed.find(e => e.dataset.ctl === id);
      const short = (by("1417")?.value || "").trim().slice(0, 7), name = (by("1425")?.value || "").trim();
      if (!img || !short) return;
      w.remove(); onDone({ img, short, name });
    },
  });
  // tag the edits with their control ids, and put a preview where 308 has its bitmap
  const ctrls = d.ctrls.filter(c => c.vis && /edit/i.test(c.cls)); $$("input.ed", w).forEach((e, i) => e.dataset.ctl = String(ctrls[i]?.id));
  const bmp = d.ctrls.find(c => c.id === 1429);
  if (bmp) $(".dlg", w).append(h(`<img class="emo-pv" src="${img}" style="position:absolute;left:${px(bmp, "x")}px;top:${px(bmp, "y")}px;width:19px;height:19px">`));
  if (init) { const ed = $$("input.ed", w); ed.forEach(e => { if (e.dataset.ctl === "1417") e.value = init.short; if (e.dataset.ctl === "1425") e.value = init.name || ""; if (e.dataset.ctl === "1419") e.value = "(current image)"; }); }
}
const addEmoticon = redraw => emoForm("307", null, e => { customEmoticons.push(e); redraw(); });
const modifyEmoticon = (i, redraw) => emoForm("308", customEmoticons[i], e => { customEmoticons[i] = e; redraw(); });
/* Winks: the real thumbnails from each version's wink packs. The .swf animations are Flash, which browsers no longer run;
   if the Ruffle Flash emulator can be loaded from the web, clicking a wink plays it. */
function winkPicker(conv) {
  const ws = D().winks || []; $$(".popup").forEach(p => p.remove());
  // anchored to the Winks (or Emoticons) button; from a menu the window may have neither, then to the window itself
  const btn = conv.win && ($('[data-t="wink"]', conv.win) || $(".emobtn", conv.win) || conv.win);
  const p = h(`<div class="popup"><div style="color:#56708c;margin-bottom:4px">${esc(S("myWinks", "Winks"))}</div><div class="winkgrid">${ws.map(w => `<span data-k="${w.key}" title="${esc(w.name)}"><img src="assets/${V.id}/winks/${w.key}.png${V_Q}"></span>`).join("")}</div>
    <div style="margin-top:4px"><a class="lnk">${esc(S("getWinks", "Get more winks").replace(/\.\.\.$/, ""))}</a></div></div>`);
  document.body.append(p);
  const r = btn ? btn.getBoundingClientRect() : { left: (innerWidth - p.offsetWidth) / 2, top: (innerHeight + p.offsetHeight) / 2 };
  p.style.left = Math.max(4, Math.min(r.left, innerWidth - p.offsetWidth - 6)) + "px"; p.style.top = Math.max(4, r.top - p.offsetHeight - 4) + "px"; p.style.zIndex = 99999;
  $$("span", p).forEach(sp => sp.onclick = () => { p.remove(); wink(conv, sp.dataset.k); });
  $(".lnk", p).onclick = () => { p.remove(); note("Not available"); };
}
function myWinks(conv) {
  const ws = D().winks || [];
  const ui = uiDialog("winks");
  if (ui) {
    const { w, q } = ui; let sel = ws[0];
    const prev = q("FlashPreview");
    uiTiles(q("idContentList") || q("listofapps"), ws.map(x => ({ x, title: x.name, html: `<img src="assets/${V.id}/winks/${x.key}.png${V_Q}" alt="">` })),
      it => { sel = it.x; if (prev) prev.innerHTML = `<img src="assets/${V.id}/winks/${sel.key}.png${V_Q}" alt="" style="max-width:100%;max-height:100%;margin:auto">`; },
      it => playWink(it.x, conv));
    q("idpreviewwink")?.addEventListener("click", () => sel && playWink(sel, conv));
    q("idremovewink")?.setAttribute("disabled", "");                       // the winks that came with Messenger can't be removed
    const send = q("idsend") || (conv ? q("idok") : null);
    if (send) send.onclick = () => { w.remove(); if (conv && sel) wink(conv, sel.key); };
    return;
  }
  const w = newWindow({ title: S("myWinks", V.layout === "msn7" ? "My Winks" : "Winks"), width: 420, height: 360, cls: "dlgwin msgbox", body: `<div class="pad" style="flex:1;min-height:0">
    <div class="winkgrid big" style="flex:1;overflow:auto;background:#fff;border:1px solid #7f9db9;padding:6px">${ws.map(x => `<figure data-k="${x.key}"><img src="assets/${V.id}/winks/${x.key}.png${V_Q}"><figcaption>${esc(x.name)}</figcaption></figure>`).join("")}</div>
    <div style="display:flex;justify-content:space-between;align-items:center"><a class="lnk get">${esc(S("getWinks", "Get more winks"))}</a>
      <span>${conv ? `<button class="btn pb" data-b="send" style="min-width:75px;height:23px">Send</button> ` : ""}<button class="btn pb" data-b="c" style="min-width:75px;height:23px">Close</button></span></div></div>` });
  w.style.zIndex = 20000; let sel = ws[0]?.key;
  $$("figure", w).forEach(f => { f.onclick = () => { $$("figure.sel", w).forEach(x => x.classList.remove("sel")); f.classList.add("sel"); sel = f.dataset.k; }; f.ondblclick = () => playWink(ws.find(x => x.key === f.dataset.k)); });
  $("figure", w)?.classList.add("sel");
  $(".get", w).onclick = () => note("Not available");
  $('[data-b="c"]', w).onclick = () => w.remove();
  $('[data-b="send"]', w)?.addEventListener("click", () => { w.remove(); wink(conv, sel); });
}
/* Winks play the way Messenger played them: a borderless, transparent animation laid over the conversation window, sized
   as the Flash movie was authored and free to spill past the window's edges. The .swf files were recorded frame by frame
   (tools/winkcap.html) into VP9 WebM with an alpha channel (tools/winks_video.py), so no Flash player is needed. Browsers
   that can't show WebM transparency (Safari) fall back to the Ruffle Flash emulator in a small window. */
const alphaWebm = (() => { const v = document.createElement("video"); return !!v.canPlayType?.('video/webm; codecs="vp9"') && !/^((?!chrome|android).)*safari/i.test(navigator.userAgent); })();
function playWink(wk, conv) {
  if (!wk) return;
  if (!alphaWebm) return playWinkFlash(wk);
  $$(".winkfx").forEach(x => x.remove());
  const v = document.createElement("video");
  v.className = "winkfx"; v.src = `assets/${V.id}/winks/${wk.key}.webm${V_Q}`; v.playsInline = true; v.muted = !settings.sounds;
  v.onloadedmetadata = () => {
    const r = (conv?.win && !conv.win.classList.contains("hidden") ? conv.win : $("#desktop") || document.body).getBoundingClientRect();
    const k = Math.min(1, (innerWidth - 8) / v.videoWidth, (innerHeight - 8) / v.videoHeight);
    const w = v.videoWidth * k, hh = v.videoHeight * k;
    const cx = Math.max(w / 2 + 4, Math.min(innerWidth - w / 2 - 4, r.left + r.width / 2)), cy = Math.max(hh / 2 + 4, Math.min(innerHeight - hh / 2 - 4, r.top + r.height / 2));
    Object.assign(v.style, { width: w + "px", height: hh + "px", left: cx - w / 2 + "px", top: cy - hh / 2 + "px" });
    v.play().catch(() => { v.muted = true; v.play().catch(() => v.remove()); });   // autoplay with sound needs an earlier click
  };
  v.onended = v.onerror = () => v.remove();
  document.body.append(v);
}
let rufflePromise = null;
function playWinkFlash(wk) {
  const box = newWindow({ title: wk.name, width: 360, height: 320, cls: "dlgwin msgbox", body: `<div class="winkplay"><img src="assets/${V.id}/winks/${wk.key}.png${V_Q}"></div>` });
  box.style.zIndex = 21000;
  rufflePromise = rufflePromise || new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle"; sc.onload = res; sc.onerror = rej; document.head.append(sc); });
  rufflePromise.then(() => {
    const player = window.RufflePlayer.newest().createPlayer(); player.style.width = "100%"; player.style.height = "100%";
    const host = $(".winkplay", box); host.innerHTML = ""; host.append(player); player.load(`assets/${V.id}/winks/${wk.key}.swf`);
  }).catch(() => { $(".winkplay", box).append(h(`<div class="note">The Flash animation needs the Ruffle player, which couldn't be loaded (offline?).</div>`)); });
}
/* My Backgrounds (7.5 / 8.5): the backgrounds shipped in the program; the choice applies to open conversations and new ones. */
function myBackgrounds(conv) {
  const bgs = ["bg_1", "bg_2", "bg_3", "bg_4", "bg_5"].filter(has);
  const cur = conv ? conv.bg : settings.defaultBg;
  const ui = uiDialog("backgrounds");
  if (ui) {
    const { w, q } = ui; let sel = cur ?? bgs[0];
    const prev = q("Preview");
    const items = bgs.map(b => ({ b, html: `<img src="${img(b)}" alt="">` }))
      .concat((D().dynbg || []).map(d => ({ b: "dyn:" + d.key, title: d.name, html: `<img src="assets/${V.id}/dynbg/${d.key}/downlevel.jpg${V_Q}" alt="">` })));
    const thumb = b => b.startsWith("dyn:") ? `assets/${V.id}/dynbg/${b.slice(4)}/downlevel.jpg${V_Q}` : img(b);
    uiTiles(q("idContentList") || q("listofapps"), items, it => { sel = it.b; if (prev) prev.style.cssText += `;background:url(${thumb(it.b)}) center/cover`; });
    const apply = () => { if (conv) { conv.bg = sel; applyBg(conv); } else convs.forEach(c => { if (c.win) { c.bg = sel; applyBg(c); } }); };
    q("idok") && (q("idok").onclick = () => { w.remove(); apply(); });
    q("idsetasdefault")?.addEventListener("click", () => { settings.defaultBg = sel; });
    q("idbrowse")?.addEventListener("click", () => note("Not available"));
    q("idremove")?.setAttribute("disabled", "");
    return;
  }
  const w = newWindow({ title: S("myBackgrounds", V.layout === "msn7" ? "My Backgrounds" : "Backgrounds"), width: 460, height: 360, cls: "dlgwin msgbox", body: `<div class="pad" style="flex:1;min-height:0">
    <div class="bggrid">${[null, ...bgs].map(b => `<figure data-b="${b || ""}" class="${b === cur ? "sel" : ""}">${b ? `<img src="${img(b)}">` : `<div class="none">None</div>`}</figure>`).join("")}</div>
    <div style="display:flex;justify-content:flex-end;gap:6px"><button class="btn pb" data-b="ok" style="min-width:75px;height:23px">OK</button><button class="btn pb" data-b="c" style="min-width:75px;height:23px">Cancel</button></div></div>` });
  w.style.zIndex = 20000; let sel = cur;
  $$("figure", w).forEach(f => f.onclick = () => { $$("figure.sel", w).forEach(x => x.classList.remove("sel")); f.classList.add("sel"); sel = f.dataset.b || null; });
  $('[data-b="c"]', w).onclick = () => w.remove();
  $('[data-b="ok"]', w).onclick = () => { w.remove(); if (conv) { conv.bg = sel; applyBg(conv); } else { settings.defaultBg = sel; convs.forEach(c => { if (c.win) { c.bg = sel; applyBg(c); } }); } };
}

/* ============================================================ Audio and Video setup, Camera Settings
   7.5 / 8.5 wizard pages: rtcres.dll / lcres.dll 20143, 20145, 20144, 20142. 2012: UCCAPIRES.DLL 20152, 20148, 20153, 20142.
   The wizard frame (Back / Next / Finish / Cancel) was Windows'. 4.7's Audio Tuning Wizard is drawn around its strings. */
const DEVICES = { speakers: ["Speakers (SoundMAX Integrated Digital Audio)"], mic: ["Microphone (SoundMAX Integrated Digital Audio)"], cam: ["USB Video Device"] };
function avFill(dlg, c, el) {
  if (!el) return null;
  if (c.k === "static" && c.w > 100 && c.h > 40) { el.className = "avprev"; el.innerHTML = fakecam("me"); return el; }
  return el;
}
function wizardWindow(title, pages, render) {
  let i = 0;
  const w = newWindow({ title, width: 470, height: 400, cls: "dlgwin msgbox", body: `<div class="wizbody"></div><div class="wizsep"></div>
    <div class="dlgbtns"><button class="pb" data-b="back">&lt; <u>B</u>ack</button><button class="pb" data-b="next"><u>N</u>ext &gt;</button><button class="pb" data-b="c">Cancel</button></div>` });
  w.style.zIndex = 20000;
  const show = () => {
    const body = $(".wizbody", w); body.innerHTML = ""; body.append(render(pages[i], i));
    $(".titlebar .t", w).textContent = pages[i].title || title;
    const pw = pages[i].w ? Math.round(pages[i].w * DLU_X) : 380, ph = pages[i].h ? Math.round(pages[i].h * DLU_Y) : 220;
    w.style.width = Math.max(420, pw + 40) + "px"; w.style.height = (ph + 110) + "px";
    $('[data-b="back"]', w).disabled = i === 0;
    $('[data-b="next"]', w).innerHTML = i === pages.length - 1 ? "Finish" : "<u>N</u>ext &gt;";
    $$("select", body).forEach((sel, k) => { if (!sel.options.length || sel.options[0].text === "(Default)") sel.innerHTML = `<option>${esc((/webcam|camera/i.test(body.textContent) ? DEVICES.cam : k % 2 && /microphone/i.test(body.textContent) ? DEVICES.mic : /microphone/i.test(body.textContent) && !/speaker/i.test(body.textContent) ? DEVICES.mic : DEVICES.speakers)[0])}</option>`; });
  };
  $('[data-b="back"]', w).onclick = () => { if (i > 0) { i--; show(); } };
  $('[data-b="next"]', w).onclick = () => { if (i < pages.length - 1) { i++; show(); } else w.remove(); };
  $('[data-b="c"]', w).onclick = () => w.remove();
  show();
}
function avSetup() {
  if (V.layout === "wm") {   // 4.7: Audio Tuning Wizard
    const pages = [{ title: "Audio Tuning Wizard", label: S("lblSpeakers", "Speakers"), text: S("atwSpeakers", "") }, { title: "Audio Tuning Wizard", label: S("lblMicrophone", "Microphone"), text: S("atwMic", ""), mic: true }];
    return wizardWindow("Audio Tuning Wizard", pages, pg => h(`<div class="atw"><b>${esc(pg.label)}</b><p>${esc(pg.text)}</p><input type="range" value="70">
      ${pg.mic ? `<div class="lvl h" style="width:100%;height:10px;position:relative"><i></i></div>` : `<button class="pb btn test" style="min-width:90px;height:23px">Test</button>`}</div>`));
  }
  const pages = D().avWizard || [];
  if (!pages.length) return;
  wizardWindow(pages[0].title, pages, pg => {
    const el = renderDialog(pg, { draft: {}, fill: avFill, onButton: c => {
      const t = plain(c.t);
      if (/play|test/i.test(t)) play("online", true);
      else if (/options|webcam settings/i.test(t)) cameraSettings();
    } });
    if (!pg.ctrls.some(c => c.x < 100 && c.vis && c.k === "static" && c.t)) el.classList.add("wizintro");   // intro page: Windows' wizard art on the left
    return el;
  });
}
function cameraSettings() {
  if (V.layout === "wm") return;                          // 4.7 had no webcam settings
  const d = D().dlg?.["11016"] || MSNDATA["8.5"].dlg["11016"];
  const w = dialogWindow(d, { fill: avFill, onButton: c => {
    const t = plain(c.t);
    if (/^close$/i.test(t)) w.remove();
    else if (/restore defaults/i.test(t)) $$("input[type=range]", w).forEach(r => r.value = 50);
    else if (/advanced/i.test(t)) note("Not available");
  } });
  $$("select", w).forEach(sel => sel.innerHTML = `<option>${DEVICES.cam[0]}</option>`);
  $$("input[type=range]", w).forEach(r => r.value = 50);
}

/* ============================================================ contacts, groups, contact-list files */
function removeContact(c, block) {
  contacts = contacts.filter(x => x !== c); if (block) c.blocked = true;
  convs.filter(v => v.ids.includes(c.id)).forEach(v => v.ids.length === 1 && closeConv(v));
  renderList();
}
/* 4.7: Yes/No message; 7.5 / 8.5: DIALOG 309; 2012: "Delete %1 from your contact list?" */
function deleteContactFlow(c) {
  const name = plain(c.name);
  if (D().dlg?.["309"]) {
    const d = D().dlg["309"];
    const w = dialogWindow({ ...d, title: fmt(d.title, name) }, { subst: [name], onOk: () => { const block = $("input[type=checkbox]", w)?.checked; w.remove(); removeContact(c, block); } });
    // 7.5's buttons are Yes / No (ids 6 / 7), so wire them by label too
    $$(".pb", w).forEach(b => { if (/^yes$/i.test(plain(b.textContent))) b.onclick = () => { const block = $("input[type=checkbox]", w)?.checked; w.remove(); removeContact(c, block); };
      if (/^no$/i.test(plain(b.textContent))) b.onclick = () => w.remove(); if (/^delete contact$/i.test(plain(b.textContent))) b.onclick = () => { const block = $("input[type=checkbox]", w)?.checked; w.remove(); removeContact(c, block); }; });
    $$("input[type=checkbox]", w).forEach(x => x.checked = false);
    return;
  }
  const q = fmt(S("deleteContactQ", "Are you sure you want to delete this person from your contact list?"), name);
  confirmBox(q, V.layout === "w12" ? [S("deleteContact", "Delete contact"), "Cancel"] : ["Yes", "No"], () => removeContact(c, false), V.layout === "w12" ? S("deleteContactSub", "") : "");
}
function confirmBox(text, [yes, no], onYes, sub = "") {
  const w = newWindow({ title: V.product, width: 380, height: 150, cls: "dlgwin msgbox", body: `<div class="pad" style="flex:1"><div style="display:flex;gap:12px;align-items:flex-start;flex:1">
      <img src="${first("warn", "info")}" style="width:32px;height:32px;object-fit:contain"><div style="flex:1;font:11px Tahoma,sans-serif;white-space:pre-wrap">${esc(text)}${sub ? `<div style="margin-top:6px;color:#555">${esc(sub)}</div>` : ""}</div></div>
      <div style="display:flex;justify-content:flex-end;gap:6px"><button class="pb btn" data-b="y" style="min-width:75px;height:23px">${esc(yes)}</button><button class="pb btn" data-b="n" style="min-width:75px;height:23px">${esc(no)}</button></div></div>` });
  w.style.height = "auto"; w.style.minHeight = "0"; w.style.zIndex = 20000;
  $('[data-b="y"]', w).onclick = () => { w.remove(); onYes(); }; $('[data-b="n"]', w).onclick = () => w.remove();
}
/* 2009 / 2012: Windows Live Contacts' contact window (4010/44900 contactdialog). The markup is the frame: picture, name,
   personal message, song and an empty tab control; the pages were filled in code, so they are laid out here from the
   strings that code used (General / Contact / Personal / Work / Notes, each field's label and cue text by id). */
function editContactUI(c) {
  const u = D().ui?.contact; if (!u?.strings) return false;
  const T = i => (u.strings[i] || "").replace(/&(?=\S)/, ""), cue = i => esc(T(i));
  const ui = uiDialog("contact", { title: T(45277).replace(/%l?s/, plain(c.name)), width: 460, height: 560 }); if (!ui) return false;
  const { w, q } = ui;
  ["MsgrError", "UIError", "ReplError", "InfoTip"].forEach(id => { const e = q(id); if (e) e.style.display = "none"; });
  uiBind(w, { Name: c.name, StatusMessage: !!c.psm, Id: true });
  const pic = hasPic() ? picUrl(c.pic) : "", t = q("UXUTileImagePrimary") || (q("usertile") && q("usertile").appendChild(document.createElement("div")));
  if (t && pic) { q("usertile").style.position = "relative"; t.style.cssText += `;background:url(${pic}) center/cover;position:absolute;inset:4px`; }
  if (q("idPSMelem")) q("idPSMelem").innerHTML = c.psm ? emoticonize(c.psm) : "";
  if (q("idCurrentSong")) q("idCurrentSong").style.display = c.song ? "" : "none";
  if (q("idSongInnerText")) q("idSongInnerText").textContent = c.song || "";
  const d = c.details || {};
  const f = (label, key, cueId, val = d[key] ?? "") => `<label class="cf"><span>${esc(T(label))}</span><input data-k="${key}" value="${esc(val)}" placeholder="${cueId ? cue(cueId) : ""}"></label>`;
  const bare = (key, cueId) => `<label class="cf"><span></span><input data-k="${key}" value="${esc(d[key] ?? "")}" placeholder="${cue(cueId)}"></label>`;
  const day = (label, key) => `<label class="cf"><span>${esc(T(label))}</span><span class="cfd"><select data-k="${key}m"><option></option>${[...Array(12)].map((_, i) => `<option ${d[key + "m"] == i + 1 ? "selected" : ""} value="${i + 1}">${esc(T(46296 + i))}</option>`).join("")}</select><select data-k="${key}d"><option></option>${[...Array(31)].map((_, i) => `<option ${d[key + "d"] == i + 1 ? "selected" : ""}>${esc(T(46308 + i))}</option>`).join("")}</select></span></label>`;
  const pages = [
    [45261, `${f(46385 , "email", 46230, c.email).replace("<input", "<input disabled")}
      ${f(46171, "first", 46172)}${f(46177, "last", 46178)}${f(46180, "nick", 46181, c.nick || "")}
      ${f(46242, "mobile", 0, c.mobileNo || "")}<div class="cfnote">${esc(T(46264))}</div>
      <label class="cf"><span>${esc(T(46189))}</span><select data-k="group"><option value=""></option>${groups.map(g => `<option ${c.group === g ? "selected" : ""}>${esc(g)}</option>`).join("")}</select></label>`],
    [45264, `${f(46266, "hmail", 46267)}${f(46269, "wmail", 46270)}${f(46272, "omail", 46273)}
      <label class="cf"><span>${esc(T(46275))}</span><select data-k="primary">${[46382, 46383, 46384].map(i => `<option>${esc(T(i))}</option>`).join("")}</select></label>
      ${f(46236, "hphone", 46237)}${f(46239, "wphone", 46240)}${f(46248, "ophone", 46249)}${f(46243, "pager", 46244)}${f(46245, "hfax", 46246)}`],
    [46382, `${bare("hstreet", 46152).replace(/placeholder="[^"]*"/, "")}${bare("hcity", 46153)}${bare("hstate", 46155)}${bare("hzip", 46157)}${bare("hcountry", 46159)}
      ${f(46276, "web", 46277)}${day(46279, "bday")}${f(46286, "so", 46287)}${day(46289, "anniv")}`],
    [45270, `${f(46342, "company", 46343)}${f(46345, "job", 46346)}${bare("wstreet", 46161)}${bare("wcity", 46163)}${bare("wstate", 46165)}${bare("wzip", 46167)}${bare("wcountry", 46169)}${f(46339, "wweb", 46340)}`],
    [45273, `<label class="cf cfnotes"><span>${esc(T(46183))}</span><textarea data-k="notes" placeholder="${cue(46184)}">${esc(d.notes || "")}</textarea></label>`],
  ];
  const tab = q("idTab");
  if (tab) {
    tab.classList.add("cftabs");
    tab.innerHTML = `<div class="cftabbar">${pages.map(([n], i) => `<button type="button" class="${i ? "" : "sel"}" data-p="${i}">${esc(T(n))}</button>`).join("")}</div>
      ${pages.map(([, h], i) => `<div class="cfpage" data-p="${i}" ${i ? "hidden" : ""}>${h}</div>`).join("")}
      <div class="cfbtns"><button type="button" class="btn pb" data-b="ok">${esc(T(46186))}</button><button type="button" class="btn pb" data-b="c">${esc(T(46214))}</button></div>`;
    $$(".cftabbar button", tab).forEach(b => b.onclick = () => {
      $$(".cftabbar button", tab).forEach(x => x.classList.toggle("sel", x === b));
      $$(".cfpage", tab).forEach(p => p.hidden = p.dataset.p !== b.dataset.p);
    });
    $('[data-b="c"]', tab).onclick = () => w.remove();
    $('[data-b="ok"]', tab).onclick = () => {
      const v = {}; $$("[data-k]", tab).forEach(e => v[e.dataset.k] = e.value.trim());
      const { email, nick, mobile, group, ...rest } = v; c.details = rest;
      c.nick = nick; if (nick) { c.origName = c.origName || c.name; c.name = nick; } else if (c.origName) c.name = c.origName;
      c.mobileNo = mobile; c.group = group || null; w.remove(); renderList(); refreshConvs();
    };
  }
  return true;
}
/* 8.5 "Edit Contact: %ls" (labels from the string tables; the window was drawn at runtime) */
function editContact(c) {
  if (editContactUI(c)) return;
  if (V.layout !== "wlm" && V.layout !== "w12") return note(`${plain(c.name)} <${c.email}>`);
  const w = newWindow({ title: fmt(S("editContact", "Edit Contact: %ls"), plain(c.name)), width: 400, height: 330, cls: "dlgwin msgbox", body: `<div class="pad addc" style="flex:1">
    <label>${esc(S("imAddress", "Instant Messaging Address:"))}<input value="${esc(c.email)}" disabled></label>
    <label>${esc(S("nickname", "Nickname:"))}<input class="nick" value="${esc(c.nick || "")}"></label>
    <label>${esc(S("mobileNumber", "Mobile device number"))}<input class="mob" value="${esc(c.mobileNo || "")}"></label>
    <label>${esc(S("groupLabel", "Group:"))}<select class="grp">${[...groups, null].map(g => `<option value="${g ?? ""}" ${c.group === g ? "selected" : ""}>${esc(g ?? S("other", "Other Contacts"))}</option>`).join("")}</select></label>
    <div class="btns"><button class="btn pb" data-b="ok">OK</button><button class="btn pb" data-b="c">Cancel</button></div></div>` });
  w.style.zIndex = 20000;
  $('[data-b="c"]', w).onclick = () => w.remove();
  $('[data-b="ok"]', w).onclick = () => {
    const nick = $(".nick", w).value.trim(); c.nick = nick; if (nick) { c.origName = c.origName || c.name; c.name = nick; } else if (c.origName) c.name = c.origName;
    c.mobileNo = $(".mob", w).value.trim(); c.group = $(".grp", w).value || null; w.remove(); renderList(); refreshConvs();
  };
}
function pickGroup(title, cb, prompt) {
  const w = newWindow({ title, width: 300, height: 280, cls: "dlgwin msgbox", body: `<div class="pad" style="flex:1;min-height:0">
    ${prompt ? `<div style="font:11px Tahoma">${esc(prompt)}</div>` : ""}
    <div class="dlg" style="flex:1;position:relative"><div class="lv" style="position:absolute;inset:0">${groups.map((g, i) => `<div class="row ${i ? "" : "sel"}" data-g="${esc(g)}">${esc(g)}</div>`).join("")}</div></div>
    <div style="display:flex;justify-content:flex-end;gap:6px"><button class="pb btn" data-b="ok" style="min-width:75px;height:23px">OK</button><button class="pb btn" data-b="c" style="min-width:75px;height:23px">Cancel</button></div></div>` });
  w.style.zIndex = 20000; let sel = groups[0];
  $$(".row", w).forEach(r => r.onclick = () => { $$(".row.sel", w).forEach(x => x.classList.remove("sel")); r.classList.add("sel"); sel = r.dataset.g; });
  $('[data-b="ok"]', w).onclick = () => { w.remove(); if (sel) cb(sel); }; $('[data-b="c"]', w).onclick = () => w.remove();
}
function renameGroup(g) {
  const title = V.features.categories ? S("renameCategory", "Rename category") : S("renameGroup", "Rename Group");
  const w = newWindow({ title, width: 320, height: 150, cls: "dlgwin msgbox", body: `<div class="pad addc" style="flex:1">
    <label>${esc(S("enterGroupName", ""))}<input class="gn" value="${esc(g)}"></label>
    <div class="btns"><button class="btn pb" data-b="ok">OK</button><button class="btn pb" data-b="c">Cancel</button></div></div>` });
  w.style.zIndex = 20000; $(".gn", w).select();
  $('[data-b="c"]', w).onclick = () => w.remove();
  $('[data-b="ok"]', w).onclick = () => {
    const n = $(".gn", w).value.trim(); if (!n || (n !== g && groups.includes(n))) return;
    groups[groups.indexOf(g)] = n; contacts.forEach(c => { if (c.group === g) c.group = n; }); w.remove(); renderList();
  };
}
function deleteGroup(g) {
  const members = contacts.filter(c => c.group === g);
  const drop = () => { members.forEach(c => c.group = null); groups.splice(groups.indexOf(g), 1); renderList(); };
  if (members.length && S("groupNotEmpty")) return note(S("groupNotEmpty"));                      // 4.7 / 7.5: only empty groups
  if (S("groupDeleteMoves")) return confirmBox(S("groupDeleteMoves"), ["OK", "Cancel"], drop);      // 8.5: contacts move to Other Contacts
  if (S("deleteCategoryQ")) return confirmBox(S("deleteCategoryQ"), ["Yes", "No"], drop);           // 2012
  drop();
}
/* Contact list files (*.ctt), in the format Messenger wrote them. */
function saveContactList() {
  const im = contacts.filter(c => !c.kind);
  const xml = `<?xml version="1.0"?>\r\n<messenger>\r\n  <service name=".NET Messenger Service">\r\n    <contactlist>\r\n${im.map(c => `      <contact>${c.email}</contact>`).join("\r\n")}\r\n    </contactlist>\r\n  </service>\r\n</messenger>\r\n`;
  const name = fmt(S("cttName", "Contact List.ctt"), me.name, me.email);
  saveDialog({ title: S("saveCtt", "Save Messenger Contact List"), name, filters: [[plain(S("cttFilter", "Messenger Contacts (*.ctt)")).replace(/\s*\(.*$/, ""), "*.ctt"]], onSave: n => download(n, xml, "text/xml") });
}
function importContactList() {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".ctt,.xml";
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    const emails = [...(await f.text()).matchAll(/<contact[^>]*>\s*([^<\s]+)\s*<\/contact>/gi)].map(m => m[1]);
    const add = emails.filter(e => !contacts.some(c => c.email.toLowerCase() === e.toLowerCase()));
    if (!add.length) return note(S("cttAllThere", "All the contacts in the file you are importing are already in your contact list."));
    add.forEach(e => contacts.push({ id: "c" + Date.now() + Math.random(), name: e.split("@")[0], first: "", last: "", email: e, status: "offline", psm: "", group: null, pic: "default1" }));
    renderList();
  };
  inp.click();
}

/* ============================================================ file transfer
   Log entries of type "ft" point at a transfer record; its box is redrawn as the state changes. */
const transfers = {}, received = [];
const MY_FILES = [["beach_pics.zip", 4312], ["summer_vacation.jpg", 862], ["homework_final.doc", 118], ["our_song.mp3", 3950], ["funny_video.wmv", 7420]];
let ftSeq = 0;
function ftEl(m) {
  const t = transfers[m.id]; if (!t) return h(`<span hidden></span>`);
  const c = byId(t.who), name = plain(c?.name || t.who), kb = `${t.kb.toLocaleString()} ${S("lblKB", "KB")}`;
  const L = (label, act) => `<a data-act="${act}">${esc(label)}</a>`;
  let text = "", acts = "";
  if (t.state === "waiting") { text = t.dir === "out" ? fmt(S("waitAccept", "Waiting for %1 to accept"), name, t.file, S("lblCancel", "Cancel"), "", t.kb, "1") : ""; acts = V.layout === "wm" ? "" : L(S("lblCancel", "Cancel"), "cancel"); }
  if (t.state === "offer") { text = fmt(S("ftOffer", '%1 would like to send you the file "%2"'), name, t.file); acts = [L(S("lblAccept", "Accept"), "accept"), V.layout !== "wm" ? L(S("lblSaveAs", "Save As..."), "saveas") : "", L(S("lblDecline", "Decline"), "decline")].filter(Boolean).join(" · "); }
  if (t.state === "progress") acts = L(S("lblCancel", "Cancel"), "cancel");
  if (t.state === "done") { text = t.dir === "out" ? fmt(S("ftComplete", 'Transfer of "%2" is complete.'), name, t.file) : fmt(S("ftReceived", "You have successfully received %2 from %1."), name, t.file); acts = t.dir === "in" ? [L(S("lblOpen", "Open"), "open"), S("openFolder") ? L(S("openFolder"), "folder") : ""].filter(Boolean).join(" · ") : ""; }
  if (t.state === "canceled") text = S("lblCanceled", "Canceled");
  const pct = Math.round(t.progress * 100), done = Math.round(t.kb * t.progress);
  const bar = t.state === "progress" ? `<div class="ftbar"><i style="width:${pct}%"></i></div><div class="ftn">${S("ofCount") ? esc(fmt(S("ofCount"), done, t.kb)) : `${pct}%`}</div>` : "";
  // picture files show a preview (6.2: Tools › Picture Previews in Instant Messages; 7.5 / 8.5: Preview Pictures Before Transfer)
  const pv = V.layout !== "wm" && /\.(jpe?g|png|gif|bmp)$/i.test(t.file) && (settings.picPreview || "large") !== "none"
    ? `<img class="ftpv" src="${picUrl(t.file.includes("beach") ? "beach" : "flower")}" style="width:${settings.picPreview === "small" ? 48 : 96}px">` : "";
  const el = h(`<div class="ftbox" data-ft="${t.id}">${pv || `<img src="${first("tb_files", "t_file", "info")}">`}<div class="fb"><div class="fn">${esc(t.file)} <span class="kb">(${esc(kb)})</span></div>
    ${text ? `<div class="ft">${esc(text)}</div>` : ""}${bar}${acts ? `<div class="fa">${acts}</div>` : ""}</div></div>`);
  $$("[data-act]", el).forEach(a => a.onclick = () => ftAction(t, a.dataset.act));
  return el;
}
function ftRedraw(t) {
  const conv = convs.find(c => c.log.some(m => m.type === "ft" && m.id === t.id)); if (!conv?.win) return;
  const old = $(`.ftbox[data-ft="${t.id}"]`, conv.win); if (old) old.replaceWith(ftEl({ type: "ft", id: t.id }));
}
function ftStart(conv, t) {
  t.state = "progress"; ftRedraw(t);
  const step = () => {
    if (t.state !== "progress") return;
    t.progress = Math.min(1, t.progress + 0.06 + Math.random() * 0.06); ftRedraw(t);
    if (t.progress < 1) return setTimeout(step, 250);
    t.state = "done"; ftRedraw(t);
    if (t.dir === "in") { received.unshift({ file: t.file, kb: t.kb, from: t.who }); play("newalert"); }
    const hist = $(".hist", conv.win); if (hist) hist.scrollTop = hist.scrollHeight;
  };
  setTimeout(step, 300);
}
function ftAction(t, act) {
  const conv = convs.find(c => c.log.some(m => m.type === "ft" && m.id === t.id));
  if (act === "cancel") { t.state = "canceled"; ftRedraw(t); if (V.layout === "wm") sysKey(conv, "tb_files", "ftCanceled", t.who); return; }
  if (act === "decline") { t.state = "canceled"; return ftRedraw(t); }
  if (act === "accept" || act === "saveas") {
    const go = () => { if (V.layout === "wm") sysKey(conv, "tb_files", "ftAcceptedFrom", t.who, t.file); ftStart(conv, t); };
    return act === "saveas" ? saveDialog({ name: t.file, filters: [["All Files", "*.*"]], onSave: (n) => { t.file = n; go(); }, noDownload: true }) : go();
  }
  if (act === "open") return note("Not available");
  if (act === "folder") return openReceived();
}
/* Send a file: pick one of the sample files, then wait for the contact to accept. */
function sendFile(conv) {
  if (conv.ids.length > 1 && S("ftOneOnly")) return sysMsg(conv, "info", S("ftOneOnly"));   // 4.7 / 7.5 only; later versions allowed it
  const c = byId(conv.ids[0]);
  const w = newWindow({ title: fmt(S("sendFileTo", "Send a File to %1"), plain(c.name)), width: 560, height: 360, cls: "dlgwin msgbox", body: `<div class="fileopen">
    <div class="addr">${V.os === "xp" ? "Look in:" : ""}<div class="crumb">📁 My Documents</div></div>
    <div class="fbody"><div class="nav">${["My Recent Documents", "Desktop", "My Documents", "My Computer"].map((n, i) => `<div class="${i === 2 ? "sel" : ""}">${n}</div>`).join("")}</div>
      <div class="files">${MY_FILES.map(([n, kb], i) => `<div class="f ${i ? "" : "sel"}" data-i="${i}"><div class="ficon">${n.split(".").pop().toUpperCase()}</div>${esc(n)}</div>`).join("")}</div></div>
    <div class="ffoot"><span>File name:</span><input class="fname" value="${MY_FILES[0][0]}"><button class="pb btn" data-b="open" style="min-width:75px;height:23px">Open</button>
      <span>Files of type:</span><select><option>All Files (*.*)</option></select><button class="pb btn" data-b="c" style="min-width:75px;height:23px">Cancel</button></div></div>` });
  w.style.zIndex = 21000;
  let pick = 0;
  $$(".f", w).forEach(f => { f.onclick = () => { $$(".f.sel", w).forEach(x => x.classList.remove("sel")); f.classList.add("sel"); pick = +f.dataset.i; $(".fname", w).value = MY_FILES[pick][0]; }; f.ondblclick = () => go(); });
  const go = () => {
    w.remove();
    const [file, kb] = MY_FILES[pick], t = transfers[++ftSeq] = { id: ftSeq, dir: "out", who: c.id, file, kb, state: "waiting", progress: 0 };
    pushLog(conv, { type: "ft", id: t.id, ts: now(), date: today() });
    setTimeout(() => { if (t.state !== "waiting") return; if (V.layout === "wm") sysKey(conv, "tb_files", "ftAcceptedBy", c.id, file); ftStart(conv, t); }, 3000);
  };
  $('[data-b="open"]', w).onclick = go; $('[data-b="c"]', w).onclick = () => w.remove();
}
function incomingFile(conv, file, kb) {
  const t = transfers[++ftSeq] = { id: ftSeq, dir: "in", who: conv.ids[0], file, kb, state: "offer", progress: 0 };
  pushLog(conv, { type: "ft", id: t.id, ts: now(), date: today() });
  play("newalert"); const ww = winOf(conv); if (ww?.classList.contains("inactive")) flashWin(ww);
}
/* File › Open received files: an Explorer window on "My Received Files". */
function openReceived() {
  const title = S("receivedFolder", "My Received Files");
  const w = newWindow({ title, width: 520, height: 340, cls: "dlgwin", caps: ["min", "max", "close"], resizable: true, body: `<div class="fileopen">
    <div class="addr">Address<div class="crumb">📁 C:\\Documents and Settings\\John Doe\\My Documents\\${esc(title)}</div></div>
    <div class="fbody"><div class="files">${received.length ? received.map(f => `<div class="f" title="${esc(fromName(f.from))}"><div class="ficon">${f.file.split(".").pop().toUpperCase()}</div>${esc(f.file)}<br><small>${f.kb.toLocaleString()} ${esc(S("lblKB", "KB"))}</small></div>`).join("")
      : `<div style="padding:10px;color:#666">This folder is empty.</div>`}</div></div></div>` });
  w.style.zIndex = 15000;
}
/* ============================================================ fonts, editing, window chrome */
const FONTS = ["Arial", "Comic Sans MS", "Courier New", "Georgia", "Lucida Console", "Microsoft Sans Serif", "Segoe UI", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana"];
const COLORS = [["Black", "#000000"], ["Maroon", "#800000"], ["Green", "#008000"], ["Olive", "#808000"], ["Navy", "#000080"], ["Purple", "#800080"], ["Teal", "#008080"],
  ["Gray", "#808080"], ["Silver", "#c0c0c0"], ["Red", "#ff0000"], ["Lime", "#00ff00"], ["Yellow", "#ffff00"], ["Blue", "#0000ff"], ["Fuchsia", "#ff00ff"], ["Aqua", "#00ffff"], ["White", "#ffffff"]];
const defaultFont = () => ({ face: V.os === "xp" && V.layout !== "w12" ? "Microsoft Sans Serif" : "Segoe UI", size: 10, bold: false, italic: false, under: false, strike: false, color: "#000000" });
function myFontCss() {
  const f = settings.myFont; if (!f) return "";
  return `font-family:'${f.face}';font-size:${Math.round(f.size * 1.333)}px;font-weight:${f.bold ? 700 : 400};font-style:${f.italic ? "italic" : "normal"};` +
    `text-decoration:${[f.under && "underline", f.strike && "line-through"].filter(Boolean).join(" ") || "none"};color:${f.color}`;
}
/* The Windows "Font" common dialog (Change Font...). It belongs to Windows, not Messenger, so it is drawn as XP/Vista showed it. */
function fontDialog() {
  const f = { ...defaultFont(), ...(settings.myFont || {}) };
  const styles = ["Regular", "Italic", "Bold", "Bold Italic"], sizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72];
  const w = newWindow({ title: S("fontTitle", "Font"), width: 430, height: 380, cls: "dlgwin msgbox", body: `<div class="pad fontdlg" style="flex:1">
    <div class="cols"><label>Font:<input class="fface"><select size="7" class="lface">${FONTS.map(x => `<option style="font-family:'${x}'">${x}</option>`).join("")}</select></label>
      <label>Font style:<input class="fstyle"><select size="7" class="lstyle">${styles.map(x => `<option>${x}</option>`).join("")}</select></label>
      <label>Size:<input class="fsize"><select size="7" class="lsize">${sizes.map(x => `<option>${x}</option>`).join("")}</select></label>
      <div class="btns2"><button class="pb btn" data-b="ok">OK</button><button class="pb btn" data-b="c">Cancel</button></div></div>
    <div class="cols2"><fieldset><legend>Effects</legend><label class="ck"><input type="checkbox" class="strike"> Stri<u>k</u>eout</label><label class="ck"><input type="checkbox" class="under"> <u>U</u>nderline</label>
        <label>Color:<select class="fcolor">${COLORS.map(([n, c]) => `<option value="${c}">${n}</option>`).join("")}</select></label></fieldset>
      <fieldset><legend>Sample</legend><div class="sample">AaBbYyZz</div></fieldset></div>
    <div>Script:<br><select disabled><option>Western</option></select></div></div>` });
  w.style.zIndex = 20000;
  const q = c => $(c, w), style = () => (f.bold ? "Bold" : "") + (f.bold && f.italic ? " " : "") + (f.italic ? "Italic" : "") || "Regular";
  const sync = () => {
    q(".fface").value = f.face; q(".lface").value = f.face; q(".fstyle").value = style(); q(".lstyle").value = style();
    q(".fsize").value = f.size; q(".lsize").value = String(f.size); q(".strike").checked = f.strike; q(".under").checked = f.under; q(".fcolor").value = f.color;
    const smp = q(".sample"); settings._tmp = f; Object.assign(smp.style, { fontFamily: `'${f.face}'`, fontSize: Math.round(f.size * 1.333) + "px", fontWeight: f.bold ? 700 : 400,
      fontStyle: f.italic ? "italic" : "normal", textDecoration: [f.under && "underline", f.strike && "line-through"].filter(Boolean).join(" ") || "none", color: f.color });
  };
  q(".lface").onchange = e => { f.face = e.target.value; sync(); };
  q(".lstyle").onchange = e => { f.bold = /Bold/.test(e.target.value); f.italic = /Italic/.test(e.target.value); sync(); };
  q(".lsize").onchange = e => { f.size = +e.target.value; sync(); };
  q(".fsize").onchange = e => { f.size = Math.max(6, Math.min(72, +e.target.value || 10)); sync(); };
  q(".strike").onchange = e => { f.strike = e.target.checked; sync(); };
  q(".under").onchange = e => { f.under = e.target.checked; sync(); };
  q(".fcolor").onchange = e => { f.color = e.target.value; sync(); };
  q('[data-b="ok"]').onclick = () => { settings.myFont = f; w.remove(); convs.forEach(c => c.win && applyConvChrome(c)); };
  q('[data-b="c"]').onclick = () => w.remove();
  sync();
}
function applyConvChrome(conv) {
  const w = conv.win; if (!w) return;
  const ta = $("textarea", w); if (ta) { ta.setAttribute("style", myFontCss()); ta.dir = settings.rtl ? "rtl" : "ltr"; }
  $$(".wm-tb,.m7-ctb,.w-ctb", w).forEach(x => x.style.display = conv.hideTb ? "none" : "");
  $$(".compose .fmt", w).forEach(x => x.style.display = conv.hideFmt ? "none" : "");
  $$(".wm-side", w).forEach(x => x.style.display = conv.hideSide ? "none" : "");
}
function editCommand(conv, cmd) {
  const ta = $("textarea", conv.win); if (!ta) return;
  ta.focus();
  if (cmd === "selectAll") return ta.select();
  if (cmd === "paste") return navigator.clipboard?.readText?.().then(t => { ta.setRangeText(t, ta.selectionStart, ta.selectionEnd, "end"); }).catch(() => note("The browser didn't allow reading the clipboard. Use Ctrl+V instead."));
  if (cmd === "delete") return ta.setRangeText("", ta.selectionStart, ta.selectionEnd, "end");
  document.execCommand(cmd);
}
/* 2012: Tools › Text size... (its window was drawn at runtime; five sizes like the older Text Size menus) */
function textSizeDialog(conv) {
  const sizes = [["Smallest", 10], ["Smaller", 11], ["Medium", 13], ["Larger", 14], ["Largest", 16]];
  const w = newWindow({ title: "Text size", width: 300, height: 170, cls: "dlgwin msgbox", body: `<div class="pad" style="flex:1">
    <input type="range" min="0" max="4" step="1" class="ts" value="${Math.max(0, sizes.findIndex(x => x[1] === (conv.fontSize || 13)))}">
    <div class="tsl" style="display:flex;justify-content:space-between;font-size:10px">${sizes.map(x => `<span>${x[0]}</span>`).join("")}</div>
    <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:auto"><button class="btn pb" data-b="ok" style="min-width:75px;height:23px">OK</button></div></div>` });
  w.style.zIndex = 20000;
  $(".ts", w).oninput = e => { conv.fontSize = sizes[+e.target.value][1]; renderHistory(conv); };
  $('[data-b="ok"]', w).onclick = () => w.remove();
}
/* ============================================================ message history (7.5 / 8.5 / 2012)
   Drawn with the layout of the MessageLog.xsl resource: Date | Time | From | To | Message, sessions zebra-striped #e0edff. */
function openHistory(contactId) {
  const c = byId(contactId);
  const sessions = convs.filter(v => v.ids.includes(contactId) && settings.history);
  const rows = [];
  sessions.forEach((v, si) => v.log.forEach(m => {
    if (m.type === "ink") rows.push({ si, date: m.date || today(), time: m.ts, from: plain(fromName(m.from)), to: v.ids.map(i => plain(fromName(i))).join(", "), text: S("inkNoHistory", "") });
    else if (m.type === "msg") rows.push({ si, date: m.date || today(), time: m.ts, from: plain(fromName(m.from)), to: (m.from === "me" ? v.ids.map(i => plain(fromName(i))) : [plain(me.name)]).join(", "), text: m.text, style: m.style });
    else if (m.type === "sys" && m.key) { const t = S(m.key); if (t) rows.push({ si, date: m.date || today(), time: m.ts || "", from: "", to: "", text: fmt(t, ...(m.args || []).map(a => byId(a) ? plain(byId(a).name) : a)) }); }
  }));
  if (!rows.length) return note(S("noHistory", "None of your contacts have a message history saved on this computer."));
  const col = (k, d) => esc(S(k, d));
  const w = newWindow({ title: fmt(S("historyFor", "Message History for %1"), plain(c.name)), width: 760, height: 420, cls: "histwin", caps: ["min", "max", "close"], resizable: true,
    body: `<div class="histbody"><table class="msglog"><colgroup><col style="width:16ex"><col style="width:2ex"><col style="width:16ex"><col style="width:2ex"><col style="width:21ex"><col style="width:2ex"><col style="width:21ex"><col style="width:2ex"><col style="width:70ex"></colgroup>
      <thead><tr><th>${col("colDate", "Date")}</th><th></th><th>${col("colTime", "Time")}</th><th></th><th>${col("colFrom", "From")}</th><th></th><th>${col("colTo", "To")}</th><th></th><th>${col("colMessage", "Message")}</th></tr></thead>
      <tbody>${rows.map(r => `<tr class="${r.si % 2 ? "z" : ""}"><td>${esc(r.date)}</td><td></td><td>${esc(r.time)}</td><td></td><td>${esc(r.from)}</td><td></td><td>${esc(r.to)}</td><td></td><td><span style="${r.style || ""}">${esc(r.text)}</span></td></tr>`).join("")}</tbody></table></div>` });
  w.style.zIndex = 15000;
}
/* ============================================================ Save / Save As (Windows common dialog) */
function saveDialog({ title = "Save As", name, filters, onSave }) {
  const xp = V.os === "xp";
  const w = newWindow({ title, width: 560, height: 380, cls: "dlgwin msgbox", body: `<div class="fileopen">
    <div class="addr">${xp ? "Save in:" : ""}<div class="crumb">${xp ? "📁 My Documents" : "Documents"}</div></div>
    <div class="fbody"><div class="nav">${(xp ? ["My Recent Documents", "Desktop", "My Documents", "My Computer", "My Network Places"] : ["Documents", "Pictures", "Music", "Desktop"]).map((n, i) => `<div class="${i === (xp ? 2 : 0) ? "sel" : ""}">${n}</div>`).join("")}</div>
      <div class="files"><div class="f"><img src="${first("app16")}" style="width:32px;height:32px;object-fit:contain;border:0">${esc(S("receivedFolder", "My Received Files"))}</div></div></div>
    <div class="ffoot"><span>File name:</span><input class="fname" value="${esc(name)}"><button class="pb btn" data-b="save" style="min-width:75px;height:23px">Save</button>
      <span>Save as type:</span><select class="ftype">${filters.map((f, i) => `<option value="${i}">${esc(f[0])} (${esc(f[1])})</option>`).join("")}</select><button class="pb btn" data-b="c" style="min-width:75px;height:23px">Cancel</button>
      <span></span><span class="mockflag">Mockup: Save downloads the file through your browser.</span><span></span></div></div>` });
  w.style.zIndex = 21000;
  $(".ftype", w).onchange = e => { const ext = filters[+e.target.value][1].replace("*", ""); $(".fname", w).value = $(".fname", w).value.replace(/\.\w+$/, "") + ext; };
  $('[data-b="c"]', w).onclick = () => w.remove();
  $('[data-b="save"]', w).onclick = () => { const n = $(".fname", w).value.trim(); const i = +$(".ftype", w).value; w.remove(); if (n) onSave(n, i); };
}
function download(name, text, type = "text/plain") {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
/* the file-type list from each version's own filter string ("RTF Document *.rtf Text Document *.txt ...") */
function saveFilters() {
  const raw = S("saveFilter", "Text Document|*.txt|Unicode Text Document|*.txt|RTF Document|*.rtf");
  const parts = raw.split(/\u0000|\|/).map(x => x.trim()).filter(Boolean), out = [];   // NUL- (4.7-8.5) or |-separated (2012)
  for (let i = 0; i + 1 < parts.length; i += 2) out.push([parts[i], parts[i + 1]]);
  return out.length ? out : [["Text Document", "*.txt"]];
}
function saveConversation(conv) {
  const filters = saveFilters(), names = conv.ids.map(i => plain(fromName(i))).join(", ");
  const lines = conv.log.filter(m => !m.only || m.only.includes(V.layout)).map(m => m.type === "msg" ? `${fmt(S("says", "%1 says:"), plain(fromName(m.from)))}\r\n${m.text}`
    : m.key ? (S(m.key) ? fmt(S(m.key), ...(m.args || []).map(a => byId(a) ? plain(byId(a).name) : a)) : "") : m.text === "never" ? S("never", "") : (m.text || "")).filter(Boolean);
  saveDialog({ name: names + filters[0][1].replace("*", ""), filters, onSave: (n, i) => {
    if (/rtf/i.test(filters[i][1])) download(n, `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Tahoma;}}\\f0\\fs20 ${lines.map(l => l.replace(/[\\{}]/g, "\\$&").replace(/\r\n/g, "\\par ")).join("\\par\\par ")}}`, "application/rtf");
    else download(n, lines.join("\r\n\r\n"), "text/plain;charset=utf-8");
  } });
}

/* ============================================================ voice & video calls
   Wording comes from each version's string tables (keys in tools/build.py STRING_FIND); a missing key means the
   version printed nothing for that step. Layout follows each version: 7.5/8.5 put video and audio controls in the
   display-picture column (UI markup: youhost / youaudio / youmute / youfullscreen, mehost / meaudio), 4.7 in the
   sidebar (Speakers / Microphone / Stop Talking / Stop Camera), 2012 in a call area under the scene header. */
const callKind = type => V.layout === "wm" ? S(type === "video" ? "videoConvLc" : "voiceConvLc", type === "video" ? "video conversation" : "voice conversation")
  : V.layout === "msn7" ? S(type === "video" ? "aVideoConv" : "aVoiceConv", "")
  : type === "video" ? S("aVideoCall", "a Video Call") : "";
// the ring loops until the call is answered, declined, cancelled or times out, and stops the moment it is
function ring(conv, snd) { stopRing(conv); if (settings.ringInv === false) return; const a = play(snd); if (a) { a.loop = true; conv.call.ringA = a; } }
function stopRing(conv) { const a = conv.call?.ringA; if (a) { a.pause(); a.currentTime = 0; conv.call.ringA = null; } }
function toggleCall(conv, type) {
  if (conv.call) { const same = conv.call.type === type; endCall(conv); if (same) return; }
  // each version's own refusal (6.2 on: 4129 voice / audio, 4141 video)
  if (conv.ids.length > 1) return sysMsg(conv, "info", S(type === "video" ? "oneVideo" : "oneVoice") || S("oneVideo"));
  const c = byId(conv.ids[0]);
  if (c.status === "offline") return sysKey(conv, "info", "offlineConv", c.id);
  startCall(conv, type);
}
function startCall(conv, type = "voice") {
  const c = byId(conv.ids[0]), icon = type === "video" ? "tb_video" : "tb_call";
  conv.call = { type, dir: "out", phase: "ringing", mic: true, spk: true, paused: false };
  if (V.layout === "msn7") sysKey(conv, icon, "waitAccept", c.id);
  else if (V.layout === "wlm" || V.layout === "w12") sysKey(conv, icon, type === "video" ? "makingVideo" : "calling", c.id);
  if (V.sounds.outgoing) ring(conv, "outgoing");
  refreshConv(conv);
  conv.call.t = setTimeout(() => connectCall(conv, "out"), 4500);
}
function connectCall(conv, how, withVideo = true) {
  if (!conv.call) return;
  const c = byId(conv.ids[0]), { type } = conv.call, kind = callKind(type), icon = type === "video" ? "tb_video" : "tb_call";
  stopRing(conv); conv.call.phase = "connected"; conv.call.myVideo = withVideo;
  if (how === "out") {
    if (V.layout === "wm") sysKey(conv, icon, "acceptedHave", c.id, kind);
    else if (V.layout === "w12") sysKey(conv, icon, type === "video" ? "acceptedVideo12" : "acceptedCall12", c.id);
    else if (kind) sysKey(conv, icon, "acceptedStart", c.id, kind);
  } else {
    if (V.layout === "wm") sysKey(conv, icon, "youAcceptedHave", c.id, kind);
    else if (kind) sysKey(conv, icon, "youAcceptedStart", "", kind);
  }
  renderHistory(conv);                     // drops the answered invitation prompt
  refreshConv(conv);
}
/* a call may have enlarged the window for its video area; put it back */
function restoreCallSize(conv) {
  const s0 = conv.sizeBeforeCall; if (!s0) return; conv.sizeBeforeCall = null;
  if (s0.host) { const host = $("#convhost"); if (host && !host.classList.contains("maxed")) host.style.height = s0.h; return; }
  if (conv.win && !conv.win.classList.contains("maxed")) { conv.win.style.width = s0.w; conv.win.style.height = s0.h; }
  if (conv.rect) { conv.rect.w = s0.w || conv.rect.w; conv.rect.h = s0.h || conv.rect.h; }
}
function endCall(conv) {
  if (!conv.call) return;
  restoreCallSize(conv);
  const c = byId(conv.ids[0]), { type, phase, dir } = conv.call, kind = callKind(type), icon = type === "video" ? "tb_video" : "tb_call";
  stopRing(conv); clearTimeout(conv.call.t); conv.call = null;
  const live = V.layout === "wlm" || V.layout === "w12";
  if (phase === "ringing" && dir === "out") {
    if (V.layout === "wm") sysKey(conv, icon, "youCanceledHave", c.id, kind);
    else if (V.layout === "msn7") sysKey(conv, icon, "youCanceledStart", "", kind);
    else sysKey(conv, icon, type === "video" ? "canceledVideo" : "canceledCall");
  } else if (phase === "incoming") {
    if (V.layout === "wm") sysKey(conv, icon, "youDeclinedHave", c.id, kind);
    else if (live && type === "video") sysKey(conv, icon, "declinedVideoYou", c.id);
    else if (kind) sysKey(conv, icon, "youDeclinedStart", "", kind);
  } else if (live) sysKey(conv, icon, type === "video" ? "videoCallEnded" : "callEnded");
  else sysKey(conv, icon, type === "video" ? "videoEnded" : "voiceEnded", c.id);
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => { });
  renderHistory(conv); refreshConv(conv);
}
/* An unanswered incoming call stops ringing after CALL_RING_MS. The files don't say how long Messenger waited; 10 s is a
   choice. What is shown then is each version's own text: 8.5 / 2009 / 2012 "You missed a (Video) Call from %1.",
   6.2 / 7.5 "%1 has canceled the invitation to start %2." (their only line for an invitation that went away), 4.7 nothing:
   its ringing stops and the invitation stays. */
const CALL_RING_MS = 10000;
function missCall(conv) {
  if (!conv.call || conv.call.phase !== "incoming") return;
  stopRing(conv);
  if (V.layout === "wm") return;
  const c = byId(conv.ids[0]), { type } = conv.call, kind = callKind(type), icon = type === "video" ? "tb_video" : "tb_call";
  restoreCallSize(conv); conv.call = null;
  if (V.layout === "msn7") sysKey(conv, icon, "theyCanceledStart", c.id, kind);
  else sysKey(conv, icon, type === "video" && S("missedVideo") ? "missedVideo" : "missedCall", c.id);
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => { });
  renderHistory(conv); refreshConv(conv);
}
function incomingCall(conv, type) {
  if (conv.call || !conv.win) return;
  conv.call = { type, dir: "in", phase: "incoming", mic: true, spk: true, paused: false };
  conv.call.t = setTimeout(() => missCall(conv), CALL_RING_MS);
  ring(conv, "phone");
  renderHistory(conv); refreshConv(conv); showConv(conv);
  if (winOf(conv)?.classList.contains("inactive")) flashWin(winOf(conv));
}
/* The incoming-call prompt inside the conversation history (4.7 / 7.5 / 8.5). */
function callPrompt(conv) {
  const c = byId(conv.ids[0]), { type } = conv.call, name = plain(c.name);
  const A = S("lblAccept", "Accept"), Dn = S("lblDecline", "Decline"), ans = S("lblAnswer", A);
  let html;
  const L = (t, act) => `<a data-act="${act}">${esc(t)}</a>`;
  if (V.layout === "wm") html = esc(fmt(S("inviteHave", "%1 would like to have a %2 with you. Do you want to %3 or %4 the invitation?"), name, callKind(type), "\u0003", "\u0004")).replace("\u0003", L(A, "accept")).replace("\u0004", L(Dn, "decline"));
  else if (V.layout === "msn7") html = esc(fmt(S("inviteStart", "%1 is inviting you to start %2. Do you want to %3 (Alt+C) or %4 (Alt+D) the invitation?"), name, callKind(type), "\u0003", "\u0004")).replace("\u0003", L(A, "accept")).replace("\u0004", L(Dn, "decline"));
  else html = `${esc(fmt(S(type === "video" ? "wantsVideo" : "callingYou", "%1 is calling you."), name))}<div class="btnrow"><button class="btn pb" data-act="accept">${esc(type === "video" ? A : ans)}</button><button class="btn pb" data-act="decline">${esc(Dn)}</button></div>`;
  const ic = first(type === "video" ? "tb_video" : "tb_call", "tb_voice", "info");   // 4.7: its Voice button picture
  const el = h(`<div class="sys callprompt">${ic ? `<img src="${ic}">` : ""}<span>${html}</span></div>`);
  $$("[data-act]", el).forEach(x => x.onclick = () => x.dataset.act === "accept" ? connectCall(conv, "in") : endCall(conv));
  return el;
}
/* 2012 "Change your badge": MyBadgesDlg of 4010/939 (read with tools/uib.py). Title "Badge", 535 x 497 (strings 37306 /
   37307), 20 / 15 px padding (4003/4630-4631), 9 pt text and 12 pt heading (20958 / 20959), colours from 4002. The badges
   and the "Featured badges" list were downloaded from Microsoft's servers and none were installed with Messenger, so both
   lists are empty, as they'd be today; the preview area only shows once a badge is picked, so it doesn't appear. */
function badgeDialog() {
  const old = $("#badgeDlg"); if (old) return focusWin(old);
  const w = newWindow({ title: S("badgeTitle", "Badge"), width: +S("badgeW", 535), height: +S("badgeH", 497), cls: "dlgwin", body: `<div class="badgedlg">
    <div class="bd-head"><div class="bd-h">${esc(S("badgeHead"))}</div><div class="bd-desc">${esc(S("badgeDesc"))}</div></div>
    <div class="bd-body">
      <div class="bd-upsell"><div class="bd-sup">${esc(S("badgeSupport"))}</div><div class="bd-desc">${esc(S("badgeClick"))}</div><img src="${first("badge_art")}" alt=""></div>
      <div class="bd-inst"><div class="bd-it">${esc(S("badgeInstalled"))}</div><div class="bd-list"></div>
        <button class="btn pb" disabled title="${esc(S("badgeRemoveTip"))}">${esc(tl("badgeRemove", "Remove"))}</button></div>
      <div class="bd-feat"><a class="bd-fl">${esc(S("badgeFeatured"))}</a><div class="bd-list"></div></div>
    </div>
    <div class="bd-foot"><button class="btn pb" data-b="ok">OK</button><button class="btn pb" data-b="c">Close</button></div></div>` });
  w.id = "badgeDlg"; w.style.zIndex = 20000;
  $(".bd-fl", w).onclick = () => note("Not available");
  $$("[data-b]", w).forEach(b => b.onclick = () => w.remove());
}
/* ============================================================ 2009 photo sharing
   Read from 2009's own markup with tools/uib.py: the panel is resource 4010/942 (template psPhotoShare, stylesheet at
   its start) and opens in the conversation drawer of 4010/920 (convdrawerroot: the activity host over the conversation
   text, with the collapse checkbox convdrawercollapse beneath). Photos button -> Windows' Open dialog -> the generic
   "start %2" invitation with %2 = string 2711 "sharing photos" -> the drawer. Sizes, paddings, pictures per state and
   the fades (250 ms between photos, 150 ms for the controls) are the markup's. The thumbnails' right-click menu comes
   from code (MenuFromProvider) and isn't reproduced. */
function photoShare(conv) {
  if (conv.ids.length !== 1) return note(fmt(S("startOneOnly", "You cannot start %1 with more than one contact in a conversation."), S("psName")));
  if (conv.ps?.phase === "on") return pictureDialog(sel => psAdd(conv, sel));
  if (conv.ps) return;
  pictureDialog(sel => {
    const c = byId(conv.ids[0]);
    conv.ps = { phase: "inviting", photos: sel.map(p => ({ ...p, saved: 0 })), sel: 0, collapsed: false };
    sysKey(conv, "tb_photos", "invitedStart", c.id, S("psName"), "", "", S("lblCancel", "Cancel"));
    setTimeout(() => {
      if (conv.ps?.phase !== "inviting" || !conv.win) return;
      conv.ps.phase = "on"; sysKey(conv, "tb_photos", "acceptedStart", c.id, S("psName")); renderPhotoShare(conv);
    }, 2200 + Math.random() * 1500);
  });
}
function psAdd(conv, sel) {
  const ps = conv.ps; ps.photos.push(...sel.map(p => ({ ...p, saved: 0 }))); psShow(conv, ps.photos.length - sel.length);
}
function psStop(conv) {
  if (!conv.ps) return;
  conv.ps = null; $(".psdrawer", conv.win)?.remove(); $(".hist", conv.win)?.classList.remove("psunder");
  sysKey(conv, "tb_photos", "psYouStopped", S("psName"));
}
function psShow(conv, i) {
  const ps = conv.ps, w = conv.win; if (!ps || !w) return;
  const old = ps.photos[ps.sel]; ps.sel = Math.max(0, Math.min(ps.photos.length - 1, i));
  const p = ps.photos[ps.sel], main = $(".psimg", w), over = $(".psold", w);
  if (over && old && old !== p) { over.src = img(old.img); over.classList.remove("fade"); void over.offsetWidth; over.classList.add("fade"); }   // OnContentChangeHide, 250 ms
  if (main) { main.src = img(p.img); main.title = p.name; }
  $$(".psthumb", w).forEach((t, k) => t.classList.toggle("sel", k === ps.sel));
  renderPsThumbs(conv);
  $$(".psxofy", w).forEach(x => x.textContent = fmt(S("psXofY", "%1 of %2"), ps.sel + 1, ps.photos.length));
  const sv = $(".pssave", w); if (sv) sv.disabled = !!p.saved;
}
function renderPsThumbs(conv) {
  const ps = conv.ps, list = $(".psthumbs", conv.win); if (!list) return;
  list.innerHTML = ps.photos.map((p, k) => `<div class="psthumb ${k === ps.sel ? "sel" : ""}" data-k="${k}" title="${esc(S("psSelect", "Select photo"))}">
      <div class="pti"><img src="${img(p.img)}" alt="${esc(p.name)}"></div>
      ${p.saved === 100 ? `<img class="pscheck" src="${first("ps_check")}" title="${esc(S("psSaved", "Photo saved"))}">` : ""}
      ${p.saved > 0 && p.saved < 100 ? `<div class="pspct">${p.saved}%</div>` : ""}</div>`).join("");
  $$(".psthumb", list).forEach(t => t.onclick = () => psShow(conv, +t.dataset.k));
}
/* 2012: the sharing panel of 4010/942 (shSharing), where 2012's conversation shows calls, below its header. From its
   stylesheet: the picture centred over the conversation area; the filmstrip (shThumbsListHost, 60 px, picture 2041) with
   scroll buttons 2025-2032 and thumbnails framed by 2017 / 4010-4012; the top bar (shTopMenu, 29 px, 2041) shown on hover
   with "Save item" and the close button "Hide what I'm sharing" (2039 / 2040). */
function renderPhotoShare12(conv) {
  const w = conv.win, ps = conv.ps; if (!w || !ps) return;
  $(".w12share", w)?.remove();
  const panel = h(`<div class="w12share">
    <div class="shmain"><img class="shimg" alt=""><img class="shold" alt=""></div>
    <div class="shtopmenu"><a class="shsave" title="${esc(S("psSave", "Save item"))}">${esc(S("psSave", "Save item"))}</a>
      <button class="shclose" title="${esc(S("psHide", "Hide what I'm sharing"))}"></button></div>
    <div class="shstrip"><button class="shscroll left" title="${esc(S("psScrollL", "Scroll left"))}"></button>
      <div class="shthumbs" title="${esc(S("psThumbs", ""))}"></div>
      <button class="shscroll right" title="${esc(S("psScrollR", "Scroll right"))}"></button></div></div>`);
  $(".w12-chead", w).after(panel);
  const thumbs = $(".shthumbs", panel);
  const show = i => {
    const old = ps.photos[ps.sel]; ps.sel = (i + ps.photos.length) % ps.photos.length;
    const p = ps.photos[ps.sel], o = $(".shold", panel);
    if (old && old !== p) { o.src = img(old.img); o.classList.remove("fade"); void o.offsetWidth; o.classList.add("fade"); }
    $(".shimg", panel).src = img(p.img);
    $$(".shthumb", thumbs).forEach((t, k) => t.classList.toggle("sel", k === ps.sel));
    $(".shscroll.left", panel).disabled = ps.sel === 0; $(".shscroll.right", panel).disabled = ps.sel === ps.photos.length - 1;
  };
  thumbs.innerHTML = ps.photos.map((p, k) => `<div class="shthumb" data-k="${k}" title="${esc(S("psSelect", "Select item"))}"><img src="${img(p.img)}" alt=""></div>`).join("");
  $$(".shthumb", thumbs).forEach(t => t.onclick = () => show(+t.dataset.k));
  $(".shscroll.left", panel).onclick = () => show(ps.sel - 1);
  $(".shscroll.right", panel).onclick = () => show(ps.sel + 1);
  $(".shsave", panel).onclick = () => { const p = ps.photos[ps.sel]; p.saved = 100; $$(".shthumb", thumbs)[ps.sel]?.insertAdjacentHTML("beforeend", `<img class="shcheck" src="${first("sh_check")}" title="${esc(S("psSaved", ""))}">`); };
  $(".shclose", panel).onclick = () => { conv.ps = null; panel.remove(); };
  show(ps.sel || 0);
}
function renderPhotoShare(conv) {
  if (V.layout === "w12") return renderPhotoShare12(conv);
  const w = conv.win, ps = conv.ps; if (!w || !ps) return;
  $(".psdrawer", w)?.remove();
  const hist = $(".hist", w); if (!hist) return;
  const btn = cls => `<button class="psbtn ${cls}" title="${esc(S(cls === "psadd" ? "psNew" : "psStop"))}">${cls === "psadd" ? `<img src="${first("ps_add")}"><span>${esc(S("psAdd", "Add..."))}</span>` : `<img src="${first("ps_close")}">`}</button>`;
  const d = h(`<div class="psdrawer ${ps.collapsed ? "collapsed" : ""}">
    <div class="psexp">
      <div class="psmain">
        <div class="psframe"><img class="psimg" alt=""><img class="psold" alt=""></div>
        <div class="psctl"><button class="psnav prev" title="${esc(S("psPrev"))}"></button><i class="psdiv"></i><button class="psnav next" title="${esc(S("psNext"))}"></button><button class="pssave" title="${esc(S("psSave"))}"></button></div>
      </div>
      <div class="psside"><i class="psdivider"></i>
        <div class="pstop">${btn("psadd")}${btn("psclose")}</div>
        <div class="psthumbs" title="${esc(S("psThumbs"))}"></div>
        <div class="psxofy"></div></div>
    </div>
    <div class="pscol"><div class="pstop">${btn("psadd")}${btn("psclose")}</div><div class="psxofy"></div></div>
    <div class="psbar" title="${esc(S(ps.collapsed ? "drawerExpand" : "drawerCollapse"))}"></div></div>`);
  hist.before(d); hist.classList.toggle("psunder", !ps.collapsed);
  $$(".psadd", d).forEach(b => b.onclick = () => photoShare(conv));
  $$(".psclose", d).forEach(b => b.onclick = () => psStop(conv));
  $(".prev", d).onclick = () => psShow(conv, (ps.sel - 1 + ps.photos.length) % ps.photos.length);
  $(".next", d).onclick = () => psShow(conv, (ps.sel + 1) % ps.photos.length);
  $(".pssave", d).onclick = () => {
    const p = ps.photos[ps.sel]; if (p.saved) return;
    const t = setInterval(() => { p.saved = Math.min(100, p.saved + 20); renderPsThumbs(conv); if (p.saved === 100) { clearInterval(t); if (ps.photos[ps.sel] === p) $(".pssave", conv.win).disabled = true; } }, 180);
  };
  $(".psbar", d).onclick = () => { ps.collapsed = !ps.collapsed; renderPhotoShare(conv); };
  psShow(conv, ps.sel);
}
/* Simulated camera: the person's display picture drifting like a webcam image (no display pictures in 4.7: a figure). */
const fakecam = (id, cls = "") => {
  const pic = id === "me" ? (me.showPic ? picUrl(me.pic) : "") : picUrl(byId(id)?.pic || "");
  return pic ? `<div class="fakecam ${cls}" style="background-image:url(${pic})"></div>` : `<div class="fakecam sil ${cls}"></div>`;
};
const vuMeter = on => `<div class="vu ${on ? "on" : ""}">${"<i></i>".repeat(8)}</div>`;
function renderCall(conv) {
  const w = conv.win; if (!w) return;
  $$(".wm-call,.w12-call", w).forEach(x => x.remove());
  $$('[data-t="video"],[data-t="call"]', w).forEach(b => b.classList.toggle("pressed", !!conv.call && b.dataset.t === (conv.call.type === "video" ? "video" : "call")));
  const call = conv.call; if (!call) return;
  const c = byId(conv.ids[0]), name = plain(c.name), video = call.type === "video", ph = call.phase;
  if (V.layout === "msn7" || V.layout === "wlm") {
    const pane = $(".pane.side", w); if (!pane) return;
    pane.classList.add("incall"); pane.classList.toggle("video", video);
    if (video && !w.classList.contains("maxed")) {                                   // room for the 240x180 video area
      if (!conv.sizeBeforeCall) conv.sizeBeforeCall = { w: w.style.width, h: w.style.height };
      if (w.offsetWidth < 780) w.style.width = "780px";
      if (w.offsetHeight < 560) w.style.height = "560px";
    }
    const boxes = $$(".dpbox", pane);
    const status = ph === "ringing" ? (V.layout === "msn7" ? S("connecting", "Connecting...") : fmt(S("connectingWith", S("connecting", "Connecting...")), name))
      : ph === "incoming" ? "" : "";
    const you = video
      ? (ph === "connected" ? `<div class="avhost">${fakecam(c.id)}</div>`
        : `<div class="avhost preroll">${has("butterfly") || V.id === "7.5" ? `<img class="bfly" src="assets/${V.id}/butterfly.gif" onerror="this.remove()">` : ""}
            <div>${esc(S(V.layout === "msn7" ? "lblVideoConv" : "lblVideoCall", "Video Call"))}</div><div class="con">${esc(S("connecting", "Connecting..."))}</div></div>`)
      : frame(c.pic, c.status);
    boxes[0].innerHTML = `<div class="avrow">${you}
        <div class="audioctl"><label class="mute ${call.spk ? "" : "on"}" title="${esc(S("lblMute") || S("muteSpk") || "")}"><input type="checkbox" ${call.spk ? "" : "checked"}><span>${call.spk ? "🔈" : "🔇"}</span></label>
          ${vuMeter(ph === "connected" && call.spk)}<input class="vol vert" data-k="spk" type="range" min="0" max="100" value="${call.vol?.spk ?? 70}">
          ${video ? `<button class="fs" title="${esc(S("lblFullScreen", "Full Screen"))}">⛶</button>` : ""}</div></div>
      <div class="caret"><span class="stxt">${esc(status)}</span>${!video && V.layout === "wlm" ? `<button class="btn pb hang">${esc(S("lblHangUp") || S("lblEndCall"))}</button>` : ""}</div>`;
    const mine = video && ph === "connected" && call.myVideo ? `<div class="avhost me">${call.paused ? "" : fakecam("me")}</div>` : frame(me.pic, me.status);
    boxes[1].innerHTML = `<div class="avrow">${mine}<div class="audioctl"><label class="mute ${call.mic ? "" : "on"}" title="${esc(S("lblMute") || S("muteMic") || "")}"><input type="checkbox" ${call.mic ? "" : "checked"}><span>🎤</span></label>
        ${vuMeter(ph === "connected" && call.mic)}<input class="vol vert" data-k="mic" type="range" min="0" max="100" value="${call.vol?.mic ?? 70}"></div></div>
      ${video && ph === "connected" ? `<div class="caret"><a class="pause">${esc(call.paused ? S("lblResumeWebcam", "Resume Webcam") : S("lblPauseWebcam", "Pause Webcam"))}</a></div>` : ""}<div class="lbl">${emoticonize(me.name)}</div>`;
    $$("input[data-k]", pane).forEach(r => r.oninput = () => { (call.vol ||= {})[r.dataset.k] = +r.value; });
    const [spkBox, micBox] = $$(".mute input", pane);
    spkBox.onchange = () => { call.spk = !spkBox.checked; refreshConv(conv); };
    micBox.onchange = () => { call.mic = !micBox.checked; refreshConv(conv); };
    $(".fs", pane)?.addEventListener("click", () => $(".avhost", pane).requestFullscreen?.().catch(() => { }));
    $(".hang", pane)?.addEventListener("click", () => endCall(conv));
    $(".pause", pane)?.addEventListener("click", () => { call.paused = !call.paused; refreshConv(conv); });
  } else if (V.layout === "wm") {
    const side = $(".wm-side", w);
    const panel = h(`<div class="panel wm-call">
      ${video ? `<div class="wmvid">${ph === "connected" ? fakecam(c.id) : `<img class="nov" src="${first("novideo")}">`}${ph === "connected" && conv.pip !== false ? `<div class="pip">${fakecam("me")}</div>` : ""}</div>
        <a class="a stopcam">${esc(S("lblStopCamera", "Stop Camera"))}</a>` : ""}
      <div class="st">${esc(ph === "ringing" ? (S("ringing") || S("connecting") || "") : ph === "connected" ? (S("connected") || S("connectedTo") || "") : "")}</div>
      <div class="vrow"><span>${esc(S("lblSpeakers", "Speakers"))}</span><input type="range" data-k="spk" value="${call.vol?.spk ?? 70}"></div>
      <div class="vrow"><span>${esc(S("lblMicrophone", "Microphone"))}</span><input type="range" data-k="mic" value="${call.vol?.mic ?? 70}"></div>
      <a class="a stoptalk">${esc(S("lblStopTalking", "Stop Talking"))}</a></div>`);
    side.prepend(panel);
    $$("input[data-k]", panel).forEach(r => r.oninput = () => { (call.vol ||= {})[r.dataset.k] = +r.value; });
    $(".stoptalk", panel).onclick = () => endCall(conv);
    $(".stopcam", panel)?.addEventListener("click", () => endCall(conv));
  } else if (V.layout === "w12") {
    const stage = ph === "incoming"
      ? `<div class="ask">${frame(c.pic, c.status)}<div class="txt">${esc(fmt(S(video ? "wantsVideo" : "callingYou", "%1 is calling you."), name))}</div>
          <div class="btnrow"><button class="btn acc">${esc(S(video ? "lblAccept" : "lblAnswer", "Accept"))}</button>${video ? `<button class="btn accnv">${esc(S("lblAcceptNoVideo", "Accept without showing my video"))}</button>` : ""}<button class="btn dec">${esc(S("lblDecline", "Decline"))}</button></div></div>`
      : video && ph === "connected" ? `${fakecam(c.id, "big")}${call.myVideo && !call.paused ? `<div class="pip">${fakecam("me")}</div>` : ""}<div class="cap">${esc(S("connectedTo", "Connected to"))} ${esc(name)}</div>`
      : `<div class="ask">${frame(c.pic, c.status)}<div class="txt">${esc(ph === "ringing" ? (video ? fmt(S("makingVideo", "%1"), name) : fmt(S("calling", "Calling %1 ..."), name)) : `${S("connectedTo", "Connected to")} ${name}`)}</div>
          ${ph === "ringing" && (S("ringing") || S("connecting")) ? `<div class="sub">${esc(S("ringing") || S("connecting"))}</div>` : ""}</div>`;
    const bar = ph === "incoming" ? "" : `<div class="bar"><button class="btn end">${esc(S("lblEndCall", "End call"))}</button>
        <button class="tbtn mic ${call.mic ? "" : "off"}" title="">🎤</button>
        ${video && ph === "connected" ? `<button class="tbtn pause">${esc(call.paused ? S("lblResumeWebcam", "Resume webcam") : S("lblPauseWebcam", "Pause webcam"))}</button>
          <button class="tbtn fs">${esc(S("lblFullScreen", "Full screen"))}</button>` : ""}</div>`;
    let panel = h(`<div class="w12-call ${video ? "video" : "voice"}"><div class="stage">${stage}</div>${bar}</div>`);
    // 2012's own video stage (4010/989 idResVideoCallImmersive) once the call is placed: its layers were arranged in
    // code (ImmersiveVideoDoLayoutBehavior): the other person's video filling it, yours in a corner, the pictures while
    // connecting; its toolbar ends the call, mutes, pauses the webcam, goes full screen
    const vu = video && ph !== "incoming" && D().ui?.videocall;
    if (vu) {
      const scope = "ui2012-videocall", sid = "css-" + scope;
      if (!document.getElementById(sid)) document.head.append(Object.assign(document.createElement("style"), { id: sid, textContent: vu.css }));
      panel = h(`<div class="w12-call video vv"><div class="stage uibody ${scope}">${vu.html}</div></div>`);
      const q = id => $(`[data-id="${id}"]`, panel), hide = id => $$(`[data-id="${id}"]`, panel).forEach(e => e.style.display = "none");
      ["callguidanceouter", "vvFrameStats", "vvEnableCapture", "vvLowQuality", "signalid", "videocalltext"].forEach(hide);
      const you = q("youvideolayer"), mine = q("mevideolayer"), mb = q("mevideolayerborder");
      const live = ph === "connected";
      if (you) { you.classList.add("vv-you"); you.innerHTML = live ? fakecam(c.id, "big") : ""; }
      [mine, mb].forEach(e => e && e.classList.add("vv-me"));
      if (mine) mine.innerHTML = call.myVideo !== false && !call.paused ? fakecam("me") : "";
      if (mb) mb.style.display = live && call.myVideo !== false && !call.paused ? "" : "none";
      if (mine) mine.style.display = live && call.myVideo !== false && !call.paused ? "" : "none";
      const tile = (id, url) => { const t = q(id); if (!t) return; t.classList.add("vv-tile"); t.style.display = live ? "none" : ""; t.innerHTML = url ? `<img src="${url}">` : ""; };
      tile("idCallSetupYouUsertile", picUrl(c.pic)); tile("idCallSetupMeUsertile", me.showPic ? picUrl(me.pic) : "");
      const pm = q("idCallProgressMessage"); if (pm) { pm.classList.add("vv-msg"); pm.style.display = live ? "none" : ""; if (!live) pm.textContent = fmt(S("makingVideo", S("connecting", "Connecting...")), name); }
      hide("idCallProgressImage");
      q("vvEndCall")?.addEventListener("click", () => endCall(conv));
      q("mevoicecontrol")?.addEventListener("click", () => { call.mic = !call.mic; refreshConv(conv); });
      q("mevoicecontrol")?.classList.toggle("sel", !call.mic);
      q("webcamBtn")?.addEventListener("click", () => { call.paused = !call.paused; refreshConv(conv); });
      q("vvFullScreen")?.addEventListener("click", () => $(".stage", panel).requestFullscreen?.().catch(() => { }));
      q("vvSettings")?.addEventListener("click", cameraSettings);
      ["vvIMButton", "youvoicecontrol"].forEach(id => q(id)?.addEventListener("click", () => note("Not available")));
    }
    const host = $("#convhost");
    if (host && !host.classList.contains("maxed") && host.offsetHeight < 660) { if (!conv.sizeBeforeCall) conv.sizeBeforeCall = { host: true, h: host.style.height }; host.style.height = "660px"; }
    $(".w12-chead", w).after(panel);
    $(".acc", panel)?.addEventListener("click", () => connectCall(conv, "in", true));
    $(".accnv", panel)?.addEventListener("click", () => connectCall(conv, "in", false));
    $(".dec", panel)?.addEventListener("click", () => endCall(conv));
    $(".end", panel)?.addEventListener("click", () => endCall(conv));
    $(".mic", panel)?.addEventListener("click", () => { call.mic = !call.mic; refreshConv(conv); });
    $(".pause", panel)?.addEventListener("click", () => { call.paused = !call.paused; refreshConv(conv); });
    $(".fs", panel)?.addEventListener("click", () => $(".stage", panel).requestFullscreen?.().catch(() => { }));
  }
}
function block(conv) { conv.ids.forEach(i => { const c = byId(i); if (c) c.blocked = !c.blocked; }); renderList(); refreshConv(conv); }
function invite(conv) {
  const avail = contacts.filter(c => c.status !== "offline" && !c.kind && !conv.ids.includes(c.id));
  const r = conv.win.getBoundingClientRect();
  showMenu(avail.map(c => ({ t: plain(c.name), icon: stIcon(c.status), fn: () => {
    if (conv.ids.length > 1) { conv.ids.push(c.id); refreshConv(conv); sysKey(conv, "tb_invite", "joined", c.id); return; }
    const g = openChat([...conv.ids, c.id]); sysKey(g, "tb_invite", "joined", c.id);
  } })), r.left + 20, r.top + 80);
}
function cycleBg(conv) {
  if (V.features.scenes) return scenePicker();
  if (!V.features.backgrounds) return;
  return myBackgrounds(conv);
  const bgs = ["bg_1", "bg_2", "bg_3", "bg_4", "bg_5", null].filter(x => x === null || has(x));
  conv.bg = bgs[(bgs.indexOf(conv.bg) + 1) % bgs.length]; applyBg(conv);
}
function applyBg(conv) {
  const b = $(".body", conv.win); if (!b) return;
  $(".dynbg", b)?.remove(); b.classList.remove("hasdyn"); $$(".hist", b).forEach(x => x.style.color = "");
  const dyn = conv.bg?.startsWith?.("dyn:") && (D().dynbg || []).find(x => x.key === conv.bg.slice(4));
  if (dyn) return applyDynBg(conv, b, dyn);
  b.style.background = conv.bg && has(conv.bg) ? `linear-gradient(#ffffff40,#ffffff40),url(${img(conv.bg)}) center/cover` : "";
}
/* 7.5 / 2009 dynamic backgrounds: the pack's background picture, its animation playing over it (in the area its margins leave:
   left, top, right, bottom) and its text colour. Without the Flash player (loaded from the web, as for winks) the pack's
   own "downlevel" picture is shown instead, as Messenger did where the animation couldn't run. */
function applyDynBg(conv, b, dyn) {
  const base = `assets/${V.id}/dynbg/${dyn.key}/`;
  b.classList.add("hasdyn");
  b.style.background = `url(${base}background.jpg${V_Q}) center/cover`;
  $$(".hist", b).forEach(x => x.style.color = `rgb(${dyn.font.join(",")})`);
  const [l, t, r, bt] = dyn.margins;
  const host = h(`<div class="dynbg" style="left:${l}px;top:${t}px;right:${r}px;bottom:${bt}px"></div>`);
  b.prepend(host);
  rufflePromise = rufflePromise || new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle"; sc.onload = res; sc.onerror = rej; document.head.append(sc); });
  rufflePromise.then(() => {
    if (!host.isConnected) return;
    const player = window.RufflePlayer.newest().createPlayer(); player.style.width = "100%"; player.style.height = "100%";
    host.append(player);
    player.load({ url: `${base}anim.swf${V_Q}`, autoplay: "on", unmuteOverlay: "hidden", splashScreen: false, letterbox: "off",
      backgroundColor: null, wmode: "transparent", contextMenu: "off", allowScriptAccess: false });
  }).catch(() => { b.style.background = `url(${base}downlevel.jpg${V_Q}) center/cover`; });
}
function emoPicker(conv, btn) {
  $$(".popup").forEach(p => p.remove());
  const custom = hasCustomEmo() ? customEmoticons.map(e => `<span data-c="${esc(e.short)}" title="${esc(e.name || e.short)}"><img class="cemo" src="${e.img}"></span>`).join("") : "";
  const p = h(`<div class="popup"><div style="color:#56708c;margin-bottom:4px">Emoticons</div><div class="emogrid">${custom}${emoSet().picker.map(e => `<span data-c="${esc(e.code)}" title="${esc(e.code)}">${e.html}</span>`).join("")}</div>
    ${hasCustomEmo() ? `<div style="margin-top:4px"><a class="lnk myemo">${esc(V.layout === "msn7" ? "My Emoticons..." : "Emoticons...")}</a></div>` : ""}</div>`);
  // 2012 has one button, "Send an emoticon or wink" (strings 3169 / 40460), and a "wink container" (3168) in its picker
  const ws = V.layout === "w12" && V.features.winks ? (D().winks || []) : [];
  if (ws.length) {
    p.append(h(`<div style="color:#56708c;margin:6px 0 4px">${esc(S("myWinks", "Winks"))}</div>`));
    const g = h(`<div class="winkgrid">${ws.map(w => `<span data-k="${w.key}" title="${esc(w.name)}"><img src="assets/${V.id}/winks/${w.key}.png${V_Q}"></span>`).join("")}</div>`);
    p.append(g); $$("span", g).forEach(sp => sp.onclick = e => { e.stopPropagation(); p.remove(); wink(conv, sp.dataset.k); });
  }
  document.body.append(p);
  const r = btn.getBoundingClientRect(); p.style.left = Math.min(r.left, innerWidth - p.offsetWidth - 6) + "px"; p.style.top = Math.max(4, r.top - p.offsetHeight - 4) + "px"; p.style.zIndex = 99999;
  $$("span[data-c]", p).forEach(s => s.onclick = () => { const ta = $("textarea", conv.win); ta.value += s.dataset.c; ta.focus(); p.remove(); });
  $(".myemo", p)?.addEventListener("click", () => { p.remove(); myEmoticons(); });
}
function flashWin(w) { if (w) w.dataset.flash = 1; }     // the taskbar button flashes orange; the title bar stays as it is
const pastLogs = {}, convKey = (ids, group) => group || [...ids].sort().join(",");
function closeConv(conv) {
  if (conv.call) { stopRing(conv); clearTimeout(conv.call.t); conv.call = null; }     // closing the window ends the call
  const msgs = conv.log.filter(m => m.type === "msg" && !m.old); if (msgs.length) pastLogs[convKey(conv.ids, conv.group)] = msgs.slice(-12);
  conv.win?.remove(); conv.win = null; const i = convs.indexOf(conv); if (i >= 0) convs.splice(i, 1);
  if (tabbed()) {
    const host = $("#convhost"), rest = convs.filter(c => c.win);
    if (!rest.length) { host?.remove(); activeConv = null; } else if (activeConv === conv || !activeConv?.win) activateConv(rest[rest.length - 1]); else renderTabs();
  }
}
function closeAllConvs() { [...convs].forEach(closeConv); }

/* ============================================================ toasts & presence */
/* Alerts ("toasts") stack upwards from the bottom-right corner, oldest at the bottom; each shows for about 5 seconds
   and the ones above slide down when it goes. */
const toasts = [];
// alerts sit on the taskbar's top edge at the right of the screen, the newer ones stacked above
function layoutToasts() { let y = $("#switcher")?.offsetHeight ?? 30; for (const t of toasts) { t.style.bottom = y + "px"; y += t.offsetHeight + 6; } }
function dropToast(t) { const i = toasts.indexOf(t); if (i < 0) return; toasts.splice(i, 1); t.classList.remove("show"); setTimeout(() => t.remove(), 400); layoutToasts(); }
function clearToasts() { [...toasts].forEach(dropToast); }
/* Alerts, per version:
   6.2 / 7.5: UIFILE 921 "MsgrToastRoot": header (branding icon PNG 215 + "MSN Messenger" string 2318, close button 1013-1015)
     on the inactive-caption colour with PNG 876 blended over it, frame pieces 870-877, an "Options" link (string 80) on a
     gradient strip, the client area (user tile framed by 1044, message in MS Shell Dlg 8 pt, rgb(31,51,107)) and the footer.
   8.5 / 2009: 4004/921 frameless branded window: icon + product, close button, 48 px user tile, message (#333) and the
     "Settings" link (string 80, #0088e4) at the bottom right. 2012: its own card with "Options" (string 80).
   4.7 has no alert markup; its alert is drawn around the product name. Sizes are the mockup's (the code set them). */
function toastHTML(c, text, said) {
  const pic = c.pic ? `<img class="tp" src="${picUrl(c.pic) || bigIcon(c.status)}" alt="">` : `<img class="tp big" src="${first("mail", "big_online")}" alt="">`;
  const opt = S("toastOptions") ? `<a class="topt">${esc(tl("toastOptions"))}</a>` : "";
  // sign-in alerts: name, then "has just signed in."; message alerts: the version's "%1 says:" line, then the message
  const msg = said != null ? `${esc(fmt(S("says", "%1 says:"), "\u0002")).replace("\u0002", `<span class="tn">${emoticonize(c.name)}</span>`)}<br>${emoticonize(said)}`
    : `<span class="tn">${emoticonize(c.name)}</span><br>${emoticonize(text)}`;
  const u = n => `url('${new URL(img(n), location.href)}')`;       // absolute: a url() in a custom property resolves against the stylesheet
  if (V.layout === "msn7" && has("toast_h")) return `<div class="toast t7" style="--hl:${u("toast_hl")};--hr:${u("toast_hr")};--h:${u("toast_h")};--x:${u("toast_x")};--xh:${u("toast_x_hot")};--xd:${u("toast_x_down")};--fr:${u("toast_frame")};--tile:${u("toast_tile")}">
      <div class="t7h"><img src="${img("toast_icon")}" alt=""><span class="tb7">${esc(S("toastBrand", V.product))}</span><span class="x" title="${esc(S("close", "Close"))}"></span></div>
      <div class="t7w"><div class="t7opt">${opt}</div><div class="t7c"><div class="t7tile">${pic}</div><div class="t7m">${msg}</div></div><div class="t7f"></div></div></div>`;
  if (V.layout === "wlm") return `<div class="toast t8"><div class="t8h"><img src="${first("app16")}" alt=""><span>${esc(V.product)}</span><span class="x">✕</span></div>
      <div class="t8c">${frame(c.pic, c.status) || pic}<div class="t8m">${msg}</div></div><div class="t8f">${opt}</div></div>`;
  if (V.layout === "w12") return `<div class="toast t12"><div class="th"><img src="${first("app16")}"><b>${esc(V.product)}</b><span class="x">✕</span></div>
      <div class="tb">${frame(c.pic, c.status) || pic}<div>${msg}</div></div><div class="t12f">${opt}</div></div>`;
  return `<div class="toast"><div class="th"><img src="${first("app16")}"><b>${esc(V.product)}</b><span class="x">✕</span></div>
    <div class="tb">${c.pic ? (frame(c.pic, c.status) || pic) : pic}<div>${msg}</div></div></div>`;
}
function toast(c, text, onclick, said) {
  // phones: no alert windows (they'd cover the conversation); the sound still plays and the taskbar button flashes
  if (MOBILE) { alertLog.push({ time: now(), name: c.name, text }); return; }
  const t = h(toastHTML(c, text, said));
  document.body.append(t); toasts.push(t); layoutToasts();
  alertLog.push({ time: now(), name: c.name, text });
  requestAnimationFrame(() => t.classList.add("show"));
  t.onclick = e => {
    if (e.target.closest(".topt")) { dropToast(t); return openOptions(V.layout === "w12" ? "Notifications" : /^8|2009/.test(V.id) ? "Alerts and Sounds" : "Alerts"); }
    dropToast(t); if (!e.target.classList.contains("x")) onclick && onclick();
  };
  setTimeout(() => dropToast(t), 5000);
}
function toastOnline(c) {
  // 2012 Notifications: "A favorite signs in" / "Any friend signs in"
  const fav = V.layout === "w12" && c?.group === "Favorites";
  if (!c || !(settings.alertOnline || (fav && settings.alertFav !== false))) return;
  play("online", false, c);
  const txt = S("justSignedInAny", S("justSignedIn", "%1\\nhas just signed in.")).replace(/^%[1s](\\n|\s)*/, "").trim() || "has just signed in.";
  toast(c, txt, () => openChat([c.id]));
}

/* ============================================================ Win32 dialog renderer
   Draws a DIALOG resource (data.js) at its real positions, converting dialog units to pixels. */
const DLU_X = 1.5, DLU_Y = 1.625;
const px = (c, k) => Math.round(c[k] * (k === "x" || k === "w" ? DLU_X : DLU_Y));
const CHECK_OFF = /mute all|shared computer|save a log|log of my|always ask|only people on my allow|automatically sign|sign me in automatically|hide tabs|collect anonymous|customer experience|scan files|video carousel|new videos|windows live today|use a proxy|proxy server|i use a/i;
const CHECK_BIND = [
  [/show emoticons|enable emoticons|show graphics \(emoticons\)/i, "emoticons"], [/timestamps/i, "timestamps"], [/nudge/i, "nudges"], [/group sequential/i, "groupSeq"],
  [/alerts when contacts (come online|sign in)|any friend signs in/i, "alertOnline"], [/a favorite signs in/i, "alertFav"],
  [/display pictures? from others/i, "showPics"], [/display pictures of contacts in main window/i, "mainPics"], [/song information|song i'm listening/i, "psmSong"],
  [/play a? ?sound when contacts/i, "sounds"], [/play a ring sound/i, "ringInv"], [/show my display picture/i, "__showPic"], [/mute all sounds/i, "__mute"],
  [/keep a history of my conversations|save my conversation history/i, "history"], [/show custom emoticons/i, "customEmo"],
  [/play .?winks automatically|^winks$/i, "autoWinks"], [/enable tabbed conversations/i, "tabbedConvs"], [/warn me before closing tabbed/i, "warnTabs"],
  [/display alerts when (a|an instant) message is received|^i receive an im$|^i receive a group im$/i, "alertMsg"],
  [/display alerts when e-?mail is received|^i receive email$/i, "alertMail"],
  [/show me as "away" when i'm inactive/i, "idleAway"], [/show my last conversation/i, "lastConv"], [/alert me when other people add me/i, "alertAdded"],
  [/show shadows under window frames/i, "shadows"], [/^show favorites$/i, "showFav"], [/^show groups$/i, "showGroups"], [/^show offline contacts$/i, "showOffline"],
  [/show offline contacts in a separate category/i, "groupOffline"], [/show status information in labels/i, "statusText"], [/show the what's new list/i, "whatsNew"], [/show the handwrit(e|ing) tab/i, "handwriteTab"], [/send and receive ink/i, "inkAllowed"],
];
function ctlKey(dlg, c) { return `${V.id}:${dlg.id ?? dlg.title}:${c.id}:${c.x},${c.y}`; }
/* ctx: { draft, onOk, onCancel, fill: fn(dlg, ctrl, el), ... } */
function renderDialog(dlg, ctx) {
  const root = h(`<div class="dlg" style="width:${Math.round(dlg.w * DLU_X)}px;height:${Math.round(dlg.h * DLU_Y)}px"></div>`);
  const ctrls = dlg.ctrls.filter(c => c.vis);
  let radioGroup = 0, prevRadio = false, lastStatic = "";
  ctrls.forEach((c, i) => {
    const pos = `left:${px(c, "x")}px;top:${px(c, "y")}px;width:${px(c, "w")}px;height:${px(c, "h")}px`;
    let el = null;
    const isRadio = c.k === "radio"; if (isRadio && !prevRadio) radioGroup++; prevRadio = isRadio;
    if (c.k === "static" && !c.t && c.w > 100 && c.h > 40) {    // empty placeholder that Messenger filled at runtime (2012 Sounds list)
      el = h(`<div class="lv" style="${pos}"></div>`); ctx.fill?.(dlg, c, el);
    } else if (c.k === "static" || c.k === "bitmap" || c.k === "icon") {
      if (c.k !== "static") { el = ctx.fill?.(dlg, c, null); if (el) el.setAttribute("style", pos); }
      else {
        const align = (c.st & 3) === 2 ? "r" : (c.st & 3) === 1 ? "c" : "";
        const isHead = ctrls.some(o => o.k === "etched" && Math.abs(o.y - c.y - 4) <= 3 && o.x <= c.x + 2);
        const isLink = /\.\.\.$/.test(c.t) && /download|more|get one|click/i.test(c.t) || /get one here/i.test(c.t);
        el = h(`<div class="st ${align} ${isHead ? "head" : ""} ${isLink ? "lnk" : ""}" style="${pos}">${mn(c.t).replace(/\\n|\n/g, "<br>")}</div>`);
        if (isHead) el.style.width = "auto", el.style.paddingRight = "4px", el.style.zIndex = 1;
        if (isLink) el.onclick = () => ctx.onLink ? ctx.onLink(c) : note("Not available");
        lastStatic = plain(c.t);
      }
    } else if (c.k === "etched") el = h(`<div class="et" style="${pos}"></div>`);
    else if (c.k === "radio" && (c.st & 0x80) && !c.t) {
      el = h(`<label class="imgradio" style="${pos}"><input type="radio" name="r${dlg.id}-${radioGroup}"><span class="pvw"></span></label>`);
      ctx.fill?.(dlg, c, el);
    }
    else if (c.k === "checkbox" || c.k === "radio") {
      const key = ctlKey(dlg, c), bind = CHECK_BIND.find(([re]) => re.test(String(c.t).replace(/&/g, "")))?.[1];
      const d = ctx.draft || {};
      let val = bind ? d[bind] : d[key];
      if (val === undefined) val = isRadio ? !ctrls.slice(0, i).some(o => o.k === "radio" && ctrls.indexOf(o) >= 0 && radioGroupOf(ctrls, o) === radioGroupOf(ctrls, c)) : !CHECK_OFF.test(c.t);
      el = h(`<label class="ck" style="${pos}"><input type="${isRadio ? "radio" : "checkbox"}" name="r${dlg.id}-${radioGroup}" ${val ? "checked" : ""}><span>${mn(c.t)}</span></label>`);
      const inp = $("input", el);
      inp.onchange = () => { if (isRadio) $$(`input[name="${inp.name}"]`, root).forEach(o => { d[o.dataset.key] = o.checked; }); d[bind || key] = inp.checked; ctx.onChange?.(); };
      inp.dataset.key = bind || key;
    } else if (c.k === "button" || c.k === "defbutton" || c.k === "ownerbutton") {
      el = h(`<button class="pb ${c.k === "defbutton" ? "def" : ""}" style="${pos}">${mn(c.t)}</button>`);
      el.onclick = e => { e.preventDefault(); ctx.onButton ? ctx.onButton(c, el) : note("Not available"); };
      if (/^(ok|cancel|&?apply|help)$/i.test(plain(c.t)) && ctx.bindButtons) ctx.bindButtons(plain(c.t).toLowerCase(), el);
    } else if (c.k === "group") {
      el = h(`<div class="gb" style="${pos}">${c.t ? `<b>${mn(c.t)}</b>` : ""}</div>`);
    } else if (c.cls === "Edit" || c.cls === "RichEdit20W" || /edit/i.test(c.cls)) {
      const key = ctlKey(dlg, c), d = ctx.draft || {};
      const role = /type your name/i.test(lastStatic) ? "__name" : /personal message|message text/i.test(lastStatic) ? "__psm"
        : /inactive for/i.test(ctrls[i - 1]?.t || "") ? "awayMin" : /sign-in name|e-mail address:?$/i.test(lastStatic) ? "__email" : null;
      const pw = /password/i.test(lastStatic);
      let val = d[role || key]; if (val === undefined) val = role === "awayMin" ? 5 : /folder/i.test(lastStatic) ? "C:\\Documents and Settings\\John Doe\\My Documents\\My Received Files" : "";
      const multi = c.h > 16 && !pw;
      el = h(multi ? `<textarea class="ed" style="${pos}"></textarea>` : `<input class="ed" type="${pw ? "password" : "text"}" style="${pos}">`);
      el.value = val; el.oninput = () => { d[role || key] = el.value; ctx.onChange?.(); };
      el.dataset.role = role || "";
    } else if (c.cls === "ComboBox") {
      el = h(`<select style="${pos.replace(/height:\d+px/, "height:20px")}"><option>${/country/i.test(lastStatic) ? "United Kingdom (44)" : /type/i.test(lastStatic) ? "HTTP" : "(Default)"}</option></select>`);
    } else if (c.cls === "SysListView32" || c.cls === "ListBox") {
      el = h(`<div class="lv" style="${pos}"></div>`); ctx.fill?.(dlg, c, el);
    } else if (/SysLink/i.test(c.cls)) {
      el = h(`<div class="st lnk" style="${pos}">${esc(plain(c.t).replace(/<\/?a[^>]*>/g, ""))}</div>`);
      el.onclick = () => note("Not available");
    } else if (/trackbar/i.test(c.cls)) {
      const thin = Math.min(c.w, c.h) <= 12 && Math.max(c.w, c.h) > 60, vert = c.h > c.w;
      el = thin ? h(`<div class="lvl ${vert ? "v" : "h"}" style="${pos}"><i></i></div>`)   // level meter Messenger drew itself
        : h(`<input type="range" value="70" class="${vert ? "vert" : ""}" style="${pos}${vert ? ";writing-mode:vertical-lr;direction:rtl" : ""}">`);
    } else return;
    // WS_DISABLED is ignored on purpose: Messenger enables most of these controls at runtime
    if (el) root.append(el);
  });
  return root;
}
function radioGroupOf(ctrls, c) { let g = 0, prev = false; for (const o of ctrls) { const r = o.k === "radio"; if (r && !prev) g++; prev = r; if (o === c) return g; } return g; }
/* A standalone dialog window (sign-in, display picture...) */
function dialogWindow(dlg, opts) {
  if (opts.subst) dlg = { ...dlg, ctrls: dlg.ctrls.map(c => ({ ...c, t: fmt(c.t, ...opts.subst) })) };
  const W = Math.round(dlg.w * DLU_X), H = Math.round(dlg.h * DLU_Y);
  const w = newWindow({ title: plain(fmt(dlg.title, V.product)), width: W + 30, height: H + 58, cls: "dlgwin msgbox", body: `<div class="dlgbody" style="padding:6px"></div>` });
  w.style.zIndex = 20000;
  const vals = opts.ctx === "signin" ? { __email: me.email } : {};   // only the sign-in dialog starts with your address
  const root = renderDialog(dlg, { draft: vals, fill: opts.fill, onButton: opts.onButton || ((c) => note("Not available")),
    bindButtons: (t, el) => { if (t === "ok") el.onclick = () => opts.onOk?.(vals, w); if (t === "cancel") el.onclick = () => { w.remove(); opts.onCancel?.(); }; if (t === "help") el.onclick = () => note("Not available"); } });
  $(".dlgbody", w).append(root);
  return w;
}

/* ============================================================ Options */
const PAGE_ICONS = { "Sign in": ["app16"], "Contacts": ["group", "big_online"], "History": ["im"], "Notifications": ["bell"], "Sounds": ["bell"], "Mobile phone": ["mobile16", "phone"], "Personal": ["big_online", "st_online"], "General": ["app16"], "Messages": ["tb_invite", "im", "t_im"], "Alerts and Sounds": ["bell"],
  "File Transfer": ["tb_files", "t_file"], "Phone": ["phone", "tb_voice", "t_phone"], "Tabs": ["tab_today", "tabs"], "Privacy": ["tb_block", "st_blocked"],
  "Security": ["check", "warn", "info"], "Sharing Folders": ["tb_files"], "Connection": ["info"], "Add-ins": ["addin", "tabs"] };
let optDraft = null, optWin = null;
function openOptions(pageTitle) {
  if (optWin && document.body.contains(optWin)) { focusWin(optWin); if (pageTitle) optWin.showPage(pageTitle); return; }
  optDraft = { ...settings, __name: me.name, __psm: me.psm, __showPic: me.showPic, __pic: me.pic, ...optState };
  for (const k in V.sounds) optDraft["__snd_" + k] = !soundOff[V.id + ":" + k];
  optDraft.__mute = !settings.sounds;
  const pages = D().options;
  let cur = pages.find(p => p.title === pageTitle) || pages[0];
  const isSheet = !D().frame;
  const pageW = Math.max(...pages.map(p => p.w)) * DLU_X, pageH = Math.max(...pages.map(p => p.h)) * DLU_Y;
  let W, H;
  const fr = isSheet ? null : fitFrame(D().frame, pages);
  if (isSheet) { W = pageW + 48; H = pageH + 128; } else { W = fr.w * DLU_X + 30; H = fr.h * DLU_Y + 60; }
  const w = newWindow({ title: "Options", width: Math.round(W), height: Math.round(H), cls: "dlgwin", caps: ["close"],
    body: isSheet ? `<div class="optframe" style="flex:1;min-height:0;display:flex;flex-direction:column"><div class="proptabs"></div><div class="proppage"></div>
      <div class="dlgbtns"><button class="pb" data-b="ok">OK</button><button class="pb" data-b="cancel">Cancel</button><button class="pb" data-b="apply" disabled>Apply</button></div></div>`
      : `<div class="dlgbody" style="padding:6px"></div>` });
  optWin = w; w.onclose = () => { w.remove(); optWin = null; };
  const changed = () => { const a = $('[data-b="apply"]', w) || w._apply; if (a) a.disabled = false; };
  const pageCtx = { draft: optDraft, onChange: changed, fill: fillOptionControl, onButton: optionButton, onLink: () => note("Not available") };
  const showPage = t => {
    cur = pages.find(p => p.title === t) || cur;
    const pageEl = renderDialog(cur, pageCtx);
    if (isSheet) {
      $(".proptabs", w).innerHTML = pages.map(p => `<div class="${p === cur ? "sel" : ""}">${esc(p.title)}</div>`).join("");
      $$(".proptabs div", w).forEach((d, i) => d.onclick = () => showPage(pages[i].title));
      $(".proppage", w).innerHTML = ""; pageEl.style.margin = "6px"; $(".proppage", w).append(pageEl);
    } else {
      const holder = $(".pagehold", w); holder.innerHTML = ""; holder.append(pageEl);
      $$(".cats .row", w).forEach(r => r.classList.toggle("sel", r.dataset.t === cur.title));
    }
  };
  w.showPage = showPage;
  const finish = save => { if (save) applyOptions(); w.remove(); optWin = null; };
  if (isSheet) {
    $('[data-b="ok"]', w).onclick = () => finish(true); $('[data-b="cancel"]', w).onclick = () => finish(false);
    $('[data-b="apply"]', w).onclick = e => { applyOptions(); e.target.disabled = true; };
  } else {
    const frameEl = renderDialog(fr, { draft: {}, fill: (dlg, c, el) => {
        if (!el) return null;
        el.classList.add("cats");
        el.innerHTML = pages.map(p => `<div class="row" data-t="${esc(p.title)}"><img src="${first(...(PAGE_ICONS[p.title] || ["app16"]))}">${esc(p.title)}</div>`).join("");
        $$(".row", el).forEach(r => r.onclick = () => showPage(r.dataset.t));
      },
      bindButtons: (t, el) => { if (t === "ok") el.onclick = () => finish(true); if (t === "cancel") el.onclick = () => finish(false);
        if (t === "apply") { el.disabled = true; w._apply = el; el.onclick = () => { applyOptions(); el.disabled = true; }; } if (t === "help") el.onclick = () => note("Not available"); } });
    const g = fr.ctrls.find(c => c.k === "group");
    const hold = h(`<div class="pagehold" style="position:absolute;left:${px(g, "x") + 4}px;top:${px(g, "y") + 4}px;width:${px(g, "w") - 8}px;height:${px(g, "h") - 8}px;overflow-y:auto;overflow-x:hidden"></div>`);
    frameEl.append(hold);
    $(".dlgbody", w).append(frameEl);
  }
  showPage(cur.title);
}
/* 2012's Options frame (401x202) is smaller than its pages; Messenger grew it at runtime, so do the same. */
function fitFrame(fr, pages) {
  const g = fr.ctrls.find(c => c.k === "group"); if (!g) return fr;
  const dw = Math.max(0, Math.max(...pages.map(p => p.w)) + 8 - g.w), dh = Math.max(0, Math.min(Math.max(...pages.map(p => p.h)), 262) + 8 - g.h);
  if (!dw && !dh) return fr;
  return { ...fr, w: fr.w + dw, h: fr.h + dh, ctrls: fr.ctrls.map(c => c.k === "group" ? { ...c, w: c.w + dw, h: c.h + dh }
    : c.cls === "SysListView32" ? { ...c, h: c.h + dh } : /button/.test(c.k) ? { ...c, x: c.x + dw, y: c.y + dh } : c) };
}
/* 2012 Contacts page: picture size for Favorites (1574-1578) and for other contacts (1579-1582). */
const LAYOUT_RADIOS = { 1578: ["favPics", "large"], 1577: ["favPics", "medium"], 1576: ["favPics", "small"], 1574: ["favPics", "none"],
                        1582: ["listPics", "large"], 1581: ["listPics", "medium"], 1580: ["listPics", "small"], 1579: ["listPics", "none"] };
function layoutPreview(size) {
  const px = { large: 16, medium: 11, small: 7, none: 0 }[size], rows = { large: 2, medium: 3, small: 3, none: 3 }[size];
  return Array.from({ length: rows }, () => `<i class="lr">${px ? `<b style="width:${px}px;height:${px}px"></b>` : `<s></s>`}<u></u></i>`).join("");
}
/* Fills list views and picture boxes inside Options pages. */
function fillOptionControl(dlg, c, el) {
  if (!el) return null;
  if (el.classList.contains("imgradio")) {
    const [key, val] = LAYOUT_RADIOS[c.id] || [];
    if (!key) return el;
    $(".pvw", el).innerHTML = layoutPreview(val); el.title = { large: "Large pictures", medium: "Medium pictures", small: "Small pictures", none: "Names only" }[val];
    const inp = $("input", el); inp.checked = (optDraft[key] || "none") === val;
    inp.onchange = () => { if (inp.checked) { optDraft[key] = val; const a = $('[data-b="apply"]', optWin) || optWin?._apply; if (a) a.disabled = false; } };
    return el;
  }
  const t = dlg.title, lvs = dlg.ctrls.filter(o => o.cls === "SysListView32" || o.cls === "ListBox"), idx = lvs.indexOf(c);
  if (/^Sounds$/.test(t) && c.cls === "Static") {       // 2012: one row per event with its own sound choice
    const choices = [...new Set(Object.values(V.sounds))].concat(V.extraSounds || []);
    const nice = f => f.replace(/_/g, " ").replace(/\b\w/g, m => m.toUpperCase());
    el.innerHTML = Object.keys(V.sounds).map(k => `<div class="row" data-snd="${k}" style="gap:8px"><input type="checkbox" ${optDraft["__snd_" + k] ? "checked" : ""}>
      <span style="flex:1">${esc(sndLabel(k))}</span><select>${choices.map(f => `<option ${f === V.sounds[k] ? "selected" : ""} value="${f}">${esc(f === V.sounds[k] ? "Default" : nice(f))}</option>`).join("")}</select>
      <button class="pb" style="height:20px;padding:0 6px">▶</button></div>`).join("");
    $$(".row", el).forEach(r => {
      $("input", r).onchange = e => optDraft["__snd_" + r.dataset.snd] = e.target.checked;
      $("button", r).onclick = () => new Audio(`assets/${V.id}/sounds/${$("select", r).value}.wav`).play().catch(() => { });
    });
  } else if (/^Sounds$/.test(t) && idx === 1) {             // 2012: "Sounds for your contacts" (the extra sounds in sounds.mct)
    el.innerHTML = (V.extraSounds || []).map((f, i) => `<div class="row ${i ? "" : "sel"}" data-file="${f}">♪ ${esc(f.replace(/_/g, " ").replace(/\b\w/g, m => m.toUpperCase()))}</div>`).join("");
    $$(".row", el).forEach(r => { r.onclick = () => { $$(".row.sel", el).forEach(x => x.classList.remove("sel")); r.classList.add("sel"); }; r.ondblclick = () => new Audio(`assets/${V.id}/sounds/${r.dataset.file}.wav`).play().catch(() => { }); });
  } else if (/Alerts and Sounds|^Sounds$/.test(t)) {
    el.innerHTML = Object.keys(V.sounds).map((k, i) => `<div class="row ${i ? "" : "sel"}" data-snd="${k}"><input type="checkbox" ${optDraft["__snd_" + k] ? "checked" : ""}> ${esc(sndLabel(k))}</div>`).join("");
    $$(".row", el).forEach(r => {
      r.onclick = e => { $$(".row.sel", el).forEach(x => x.classList.remove("sel")); r.classList.add("sel"); if (e.target.type === "checkbox") { optDraft["__snd_" + r.dataset.snd] = e.target.checked; } };
      r.ondblclick = () => play(r.dataset.snd, true);
    });
    const edit = el.parentElement ? null : null;
  } else if (/Privacy/.test(t)) {
    // Allow list / Block list: your contacts by block state (+ the program's own "All others" entry on the Allow list)
    const blocked = idx === 1, others = S("allOthers");
    el.dataset.plist = blocked ? "block" : "allow";
    el.innerHTML = contacts.filter(x => !x.kind && !!x.blocked === blocked)
      .map(x => `<div class="row" data-id="${x.id}"><img src="${first(blocked ? "st_blocked" : "", stIcon(x.status))}">${esc(x.email)}</div>`).join("")
      + (!blocked && others ? `<div class="row"><img src="${first("st_offline")}">${esc(others)}</div>` : "");
    $$(".row", el).forEach(r => r.onclick = () => { $$(".row.sel", el).forEach(x => x.classList.remove("sel")); r.classList.add("sel"); });
  } else if (/Tabs/.test(t)) {
    el.innerHTML = "";                                         // the tabs themselves were downloaded from MSN, so the list stays empty
  } else if (/Sharing/.test(t)) {
    el.innerHTML = (idx === 0 ? contacts.slice(2, 9) : contacts.slice(0, 2)).map(x => `<div class="row"><img src="${stIcon(x.status)}">${emoticonize(x.name)}</div>`).join("");
  }
  return el;
}
function optionButton(c) {
  const t = plain(c.t);
  if (/change picture/i.test(t)) return openPicDialog(optDraft.__showPic ? optDraft.__pic : null, key => { if (key) { optDraft.__pic = key; optDraft.__showPic = true; } else optDraft.__showPic = false; const a = $('[data-b="apply"]', optWin) || optWin?._apply; if (a) a.disabled = false; });
  if (/preview|play/i.test(t)) { const r = $(".row.sel[data-snd]", optWin), x = $(".row.sel[data-file]", optWin);
    if (r) return play(r.dataset.snd, true); if (x) return new Audio(`assets/${V.id}/sounds/${x.dataset.file}.wav`).play().catch(() => { }); return; }
  if (/^sounds/i.test(t)) return note("Not available");
  if (/change font/i.test(t)) return fontDialog();
  if (/text direction/i.test(t) && D().dlg?.["320"]) {
    const d = dialogWindow(D().dlg["320"], { onOk: () => { const r = $$("input[type=radio]", d); settings.rtl = !!r[1]?.checked; d.remove(); renderAll(); } });
    const r = $$("input[type=radio]", d); if (r.length > 1) { r[0].checked = !settings.rtl; r[1].checked = settings.rtl; }
    return;
  }
  // Privacy: move the selected address between the Allow and Block lists
  if (/allow$|^block/i.test(t) && optWin) {
    const toBlock = /^block/i.test(t), from = $(`[data-plist="${toBlock ? "allow" : "block"}"] .row.sel[data-id]`, optWin);
    if (!from) return;
    const c = byId(from.dataset.id); c.blocked = toBlock; renderList(); refreshConvs();
    return optWin.showPage($(".cats .row.sel", optWin)?.dataset.t || $(".proptabs .sel", optWin)?.textContent);
  }
  if (/^view$/i.test(t) && D().dlg?.["254"]) {                  // "Who has you in their contact list?" (DIALOG 254)
    const w = dialogWindow(D().dlg["254"], { fill: (d, c2, el) => { if (el && /List|ListBox|SysListView32/.test(c2.cls || "")) el.innerHTML = contacts.filter(x => !x.kind).map(x => `<div class="row"><img src="${stIcon(x.status)}">${esc(x.email)}</div>`).join(""); return el; },
      onButton: () => w.remove(), onOk: (v, ww) => ww.remove() });
    return;
  }
  if (/advanced settings/i.test(t) && D().dlg?.["227"]) return dialogWindow(D().dlg["227"], { onOk: (v, w2) => w2.remove(), onButton: c2 => /test/i.test(plain(c2.t)) ? note("Not available") : null });
  if (/test connection|^test$/i.test(t)) { if (!D().dlg?.["30050"]) return note("Not available"); const w3 = dialogWindow(D().dlg["30050"], { onOk: (v, ww) => ww.remove(), onButton: () => w3.remove() }); return; }
  if (/^(change|browse)$/i.test(t)) return note("Not available");
  if (/profile|mobile settings|watch settings|^settings$|more information|learn more|sign up|member services|install|edit (name|settings)|find an add-in|what's new list options/i.test(t)) return note("Not available");
  note("Not available");
}
function applyOptions() {
  const wasTabbed = tabbed();
  setTimeout(() => { document.body.classList.toggle("noshadow", settings.shadows === false); renderMain(); }, 0);
  for (const k in optDraft) {
    if (k.startsWith("__snd_")) soundOff[V.id + ":" + k.slice(6)] = !optDraft[k];
    else if (k in settings) settings[k] = optDraft[k];
    else if (!k.startsWith("__")) optState[k] = optDraft[k];
  }
  if ("__mute" in optDraft && D().options.some(p => p.id === 850)) settings.sounds = !optDraft.__mute;
  me.name = (optDraft.__name || "").trim() || me.email; me.psm = optDraft.__psm ?? me.psm; me.showPic = optDraft.__showPic; me.pic = optDraft.__pic || me.pic;
  renderAll();
  if (V.layout === "w12" && tabbed() !== wasTabbed) setVersion(V.id);        // rebuild: tabs in one window <-> separate windows
}

/* ============================================================ display picture dialog (DIALOG 310) + file picker */
function changeMyPic() { if (!hasPic()) return; openPicDialog(me.showPic ? me.pic : null, key => { if (key) { me.pic = key; me.showPic = true; } else me.showPic = false; renderMain(); refreshConvs(); }); }
/* 2009 / 2012 "Select a display picture" (4010/936 MyUsertilesDlg): the pictures, Browse / Remove, the webcam picture.
   Dynamic pictures (Flash, from partners) and 2012's featured pictures came from the web: left out. */
function usertilesUI(current, onPick) {
  const ui = uiDialog("usertiles"); if (!ui) return false;
  const { w, q } = ui; let sel = current;
  const hide = id => $$(`[data-id="${id}"]`, w).forEach(e => e.style.display = "none");
  ["DDPFlashNotInstalled", "DDPFlashPlayer", "installflashmsg", "installflashlink", "idLockdownMessage", "idGetWebcam", "idDynLabel",
    "idDynContentList", "ideditwebcamddp", "DDPProviderList", "idFeaturedUsertilesSection", "idFeaturedThemepacksSection", "idFeaturedContentList"].forEach(hide);
  // the button column (Webcam picture / Dynamic picture / Browse / Remove) is docked apart in the markup; the program put
  // it in the right-hand column under the preview, whose own layout leaves that space empty for it
  const col = q("idwebcam")?.tagName === "BUTTON" && q("idwebcam").parentElement, pw = q("idPreviewWrapper");   // 2009 only: 2012's
  if (col && pw && !pw.contains(col)) { col.classList.add("uibtncol"); pw.after(col); }                          // sits there already
  const preview = () => {
    const t = q("idBuddyTile") || q("idUserTileArea"); if (!t) return;
    t.style.position = "relative";
    $$(".uiprev", t).forEach(x => x.remove());
    if (sel) t.append(h(`<img class="uiprev" src="${picUrl(sel)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`));
  };
  const draw = () => {
    const tiles = [...new Set([...recentPics, ...allPics()])], keep = sel;
    uiTiles(q("idContentList") || q("listofapps"), tiles.map(k => ({ k, html: `<img src="${picUrl(k)}" class="uitilepic">` })), it => { sel = it.k; preview(); }, it => { sel = it.k; done(); });
    sel = keep; const i = tiles.indexOf(sel);
    $$(".uitile", w).forEach((b, j) => b.classList.toggle("sel", j === i));
    preview();
  };
  const done = () => { if (sel && !recentPics.includes(sel)) recentPics.unshift(sel); onPick(sel); w.remove(); };
  const on = (id, fn) => $$(`[data-id="${id}"]`, w).forEach(b => b.onclick = e => { e.preventDefault(); fn(); });
  on("idbrowse", openFileDialog);
  on("idremove", () => { recentPics = recentPics.filter(k => k !== sel); sel = null; draw(); });
  on("idwebcam", () => webcamSnapshot(() => { sel = me.pic; draw(); }));
  on("idwebcamddp", () => note("Not available"));
  on("idDLMorePics", () => note("Not available"));
  on("idok", done);
  draw();
  return true;
}
function openPicDialog(current, onPick) {
  if (usertilesUI(current, onPick)) return;
  let sel = current;
  const dlg = D().dp || { ...MSNDATA["8.5"].dp, title: "Change your picture" };   // 2012's picker isn't a DIALOG resource
  const renderTiles = el => {
    const tiles = [...new Set([...recentPics, ...allPics()])];
    el.classList.add("tiles");
    el.innerHTML = tiles.map(k => `<div class="tile ${k === sel ? "sel" : ""}" data-k="${k}"><img src="${picUrl(k)}"></div>`).join("");
    $$(".tile", el).forEach(t => { t.onclick = () => { sel = t.dataset.k; renderTiles(el); preview(); }; t.ondblclick = () => { sel = t.dataset.k; done(); }; });
  };
  let pvEl, lvEl;
  const preview = () => { if (pvEl) pvEl.innerHTML = sel ? `<img src="${picUrl(sel)}">` : `<span style="color:#888;font-size:10px">(none)</span>`; const nb = $("input[type=checkbox]", w); if (nb) nb.checked = !sel; };
  const done = () => { if (sel && !recentPics.includes(sel)) recentPics.unshift(sel); onPick(sel); w.remove(); };
  const pvCtl = dlg.ctrls.find(c => c.k === "bitmap");
  const w = dialogWindow(dlg, {
    fill: (d, c, el) => { if (el) { lvEl = el; renderTiles(el); } return null; },
    onButton: c => { const t = plain(c.t); if (/browse/i.test(t)) openFileDialog(); else if (/remove/i.test(t)) { recentPics = recentPics.filter(k => k !== sel); sel = null; renderTiles(lvEl); preview(); } else note("Not available"); },
    onOk: () => done(),
  });
  // the preview box (hidden bitmap control in the resource, sized here like the real dialog)
  if (pvCtl) {
    pvEl = h(`<div class="pv" style="position:absolute;left:${px(pvCtl, "x")}px;top:${px(pvCtl, "y")}px;width:96px;height:96px"></div>`);
    $(".dlg", w).append(pvEl);
  }
  const nb = $("input[type=checkbox]", w); if (nb) nb.onchange = () => { if (nb.checked) { sel = null; renderTiles(lvEl); } preview(); };
  $$(".st.lnk", w).forEach(l => l.onclick = () => note("Not available"));
  preview();
}
const MY_PICTURES = () => [["race_day.jpg", "bg_1"], ["aquarium.jpg", "bg_2"], ["hearts.png", "bg_3"], ["lavender.jpg", "bg_4"], ["doodle.png", "bg_5"],
  ["DSC01024.jpg", "dp_duck"], ["DSC01031.jpg", "dp_dog"], ["DSC01047.jpg", "dp_moto"], ["DSC01052.jpg", "dp_beach"], ["DSC01060.jpg", "dp_flower"],
  ["DSC01068.jpg", "dp_horses"], ["DSC01075.jpg", "dp_palms"]].filter(f => has(f[1]));   // display pictures differ per version, so no subject names
/* Windows' Open dialog over My Pictures, several pictures at a time (Ctrl+click), for photo sharing. */
function pictureDialog(onOpen) {
  const files = MY_PICTURES();
  const w = newWindow({ title: "Open", width: 620, height: 430, cls: "dlgwin", body: `<div class="fileopen">
    <div class="addr">Look in:<div class="crumb">📁 My Pictures</div></div>
    <div class="fbody"><div class="nav">${["My Recent Documents", "Desktop", "My Documents", "My Computer", "My Network Places"].map(n => `<div>${n}</div>`).join("")}</div>
      <div class="files">${files.map(([n, i], k) => `<div class="f ${k ? "" : "sel"}" data-n="${n}" data-i="${i}"><img src="${img(i)}">${n}</div>`).join("")}</div></div>
    <div class="ffoot"><span>File name:</span><input class="fname" value="${files[0]?.[0] || ""}"><button class="pb btn" data-b="open" style="min-width:75px;height:23px">Open</button>
      <span>Files of type:</span><select><option>Pictures (*.bmp;*.gif;*.jpg;*.png)</option></select><button class="pb btn" data-b="cancel" style="min-width:75px;height:23px">Cancel</button></div></div>` });
  w.style.zIndex = 21000;
  const names = () => $$(".f.sel", w).map(f => `"${f.dataset.n}"`).join(" ");
  $$(".f", w).forEach(f => {
    f.onclick = e => { if (!e.ctrlKey && !e.metaKey) $$(".f.sel", w).forEach(x => x.classList.remove("sel")); f.classList.toggle("sel", e.ctrlKey || e.metaKey ? !f.classList.contains("sel") : true); $(".fname", w).value = $$(".f.sel", w).length > 1 ? names() : f.dataset.n; };
    f.ondblclick = () => { $$(".f.sel", w).forEach(x => x.classList.remove("sel")); f.classList.add("sel"); $('[data-b="open"]', w).click(); };
  });
  $('[data-b="cancel"]', w).onclick = () => w.remove();
  $('[data-b="open"]', w).onclick = () => { const sel = $$(".f.sel", w).map(f => ({ name: f.dataset.n, img: f.dataset.i })); w.remove(); if (sel.length) onOpen(sel); };
}
function openFileDialog() {
  const files = MY_PICTURES().slice(0, 8);
  const xp = V.os === "xp";
  const w = newWindow({ title: xp ? "Open" : "Select a Display Picture", width: 620, height: 430, cls: "dlgwin", body: `<div class="fileopen">
    <div class="addr">${xp ? "Look in:" : ""}<div class="crumb">${xp ? "📁 My Pictures" : "John Doe ▸ Pictures ▸"}</div></div>
    <div class="fbody"><div class="nav">${(xp ? ["My Recent Documents", "Desktop", "My Documents", "My Computer", "My Network Places"] : ["Documents", "Pictures", "Music", "Desktop", "Recently Changed"]).map((n, i) => `<div class="${i === (xp ? 2 : 1) ? "sel" : ""}">${n}</div>`).join("")}</div>
      <div class="files">${files.map(([n, i], k) => `<div class="f ${k ? "" : "sel"}" data-n="${n}" data-i="${i}"><img src="${img(i)}">${n}</div>`).join("")}</div></div>
    <div class="ffoot"><span>File name:</span><input class="fname" value="${files[0]?.[0] || ""}"><button class="pb btn" data-b="open" style="min-width:75px;height:23px">Open</button>
      <span>Files of type:</span><select><option>Pictures (*.bmp;*.gif;*.jpg;*.png)</option></select><button class="pb btn" data-b="cancel" style="min-width:75px;height:23px">Cancel</button>
      <span></span><span class="mockflag">Mockup: the file picker is for show — no real files are read.</span><span></span></div></div>` });
  w.style.zIndex = 21000;
  let pick = files[0]?.[1];
  $$(".f", w).forEach(f => { f.onclick = () => { $$(".f.sel", w).forEach(x => x.classList.remove("sel")); f.classList.add("sel"); $(".fname", w).value = f.dataset.n; pick = f.dataset.i; }; f.ondblclick = () => { w.remove(); openCropDialog(pick); }; });
  $('[data-b="cancel"]', w).onclick = () => w.remove();
  $('[data-b="open"]', w).onclick = () => { w.remove(); openCropDialog(pick); };
}
function openCropDialog(imgKey) {
  const w = newWindow({ title: "Display Picture", width: 420, height: 430, cls: "dlgwin", body: `<div class="pad" style="flex:1">
    <div>Move and resize the box to select the part of the picture you want to show.</div>
    <div class="crop" style="background-image:url(${img(imgKey)})"><div class="shade"></div><div class="box"><i style="left:-5px;top:-5px"></i><i style="right:-5px;top:-5px"></i><i style="left:-5px;bottom:-5px"></i><i style="right:-5px;bottom:-5px"></i></div></div>
    <div class="mockflag">Mockup: cropping and saving custom pictures isn't implemented. This shows what the step looks like.</div>
    <div style="display:flex;justify-content:flex-end;gap:6px"><button class="pb btn" style="min-width:75px;height:23px">OK</button><button class="pb btn" style="min-width:75px;height:23px">Cancel</button></div></div>` });
  w.style.zIndex = 21000;
  $$(".pb", w).forEach(b => b.onclick = () => w.remove());
}

/* ============================================================ version switching */
function renderAll() { renderMain(); convs.forEach(c => { if (c.win) { refreshConv(c); renderHistory(c); } }); }
/* Switching version is a soft reset: everything drawn by the old version is closed, transient state (calls, pending
   sign-in, full screen, pop-ups) is dropped, and the lasting state (contacts, conversations, settings, window positions,
   minimised / closed windows) is rebuilt in the new version's own layout. Nothing from the old version stays on screen. */
function softReset() {
  closeMenus();
  $$(".popup").forEach(p => p.remove());
  clearToasts();
  $("#card").style.display = "none";
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => { });
  // every window except the contact list and conversations: dialogs, Options, history, wizards, pickers, explorers...
  $$(".win").forEach(w => { if (w.id !== "main" && w.id !== "debug" && !w.classList.contains("conv")) w.remove(); });
  optWin = null;
  // calls end silently (no "has ended" line: the call didn't end, the program was swapped)
  convs.forEach(c => { if (c.call) { stopRing(c); clearTimeout(c.call.t); c.call = null; restoreCallSize(c); } $(".statusline", c.win || document.createElement("div"))?.removeAttribute("data-busy"); });
  // an unfinished sign-in restarts on the new version's sign-in screen
  clearTimeout(signinTimer);
}
function setVersion(id) {
  if (!VERSIONS[id]) return;
  const isFirst = !setVersion.done; setVersion.done = true;
  if (!isFirst) document.body.classList.add("switching");
  const run = () => {
    softReset();
    const main = $("#main");
    const mainState = { hidden: main.classList.contains("hidden"), closed: !!main.dataset.closed, min: !!main.dataset.min };
    const keep = convs.filter(c => c.win).map(c => {
      const r = c.win, isWin = r.classList.contains("win");
      if (isWin) c.rect = { l: r.style.left, t: r.style.top, w: r.style.width || r.offsetWidth + "px", h: r.style.height || r.offsetHeight + "px" };
      c.wasHidden = isWin ? r.classList.contains("hidden") : !!$("#convhost")?.classList.contains("hidden");
      return c;
    });
    const host = $("#convhost"); if (host) hostRect = { left: host.style.left, top: host.style.top, width: host.style.width, height: host.style.height };
    const wasActive = activeConv;
    convs.forEach(c => { c.win?.remove(); c.win = null; }); host?.remove(); activeConv = null;
    // contact-list picture size is a per-version setting, limited to the sizes that version offered
    settings.listPicsBy = settings.listPicsBy || {};
    settings.listPicsBy[V.id] = settings.listPics;
    V = VERSIONS[id]; store.set("version", id); debugRefresh();
    settings.listPics = settings.listPicsBy[id] ?? "none";
    if (!(V.listPicSizes || ["none"]).includes(settings.listPics)) settings.listPics = "none";
    const fold = { brb: "away", lunch: "away", call: "busy" };           // statuses 2011/2012 no longer offered for yourself
    if (!statusKeys().includes(me.status)) me.status = fold[me.status] || "online";
    if (!statusKeys().includes(signin.status)) signin.status = fold[signin.status] || "online";
    if (!settings._sortChosen) settings.sortBy = V.layout === "w12" ? "status" : "groups";
    if (settings.sortBy === "spaces" && !V.features.spaces) settings.sortBy = "groups";
    if (!V.features.dp) settings.listPics = "none";
    applyScene();
    document.body.className = `os-${V.os} lay-${V.layout}` + (isFirst ? "" : " switching");
    // absolute URLs: a url() inside a custom property resolves against the stylesheet that uses it
    const cssUrl = n => has(n) ? `url("${new URL(img(n), location.href)}")` : "none";
    document.body.style.setProperty("--hdr", cssUrl("header"));
    document.body.style.setProperty("--frame-on", cssUrl("frame_on"));
    document.body.style.setProperty("--frame-off", cssUrl("frame_off"));
    $$(".appicon").forEach(i => i.src = first("app16"));
    $("#verLabel").title = `${V.label} · double-click a contact to chat · start button: switch version`;
    renderTray();
    document.title = running ? `${V.product} ${V.short} — mockup` : "MSN Messenger XPerience";
    renderMain();                                   // signed in: contact list; otherwise a fresh sign-in screen
    keep.forEach(c => buildConvWindow(c, false));
    if (tabbed() && keep.length) activateConv(keep.includes(wasActive) ? wasActive : keep[0]);
    // restore minimised / closed windows as they were
    keep.forEach(c => { const w = winOf(c); if (c.wasHidden && w) { w.classList.add("hidden"); w.dataset.min = 1; } });
    if (mainState.hidden) { main.classList.add("hidden"); if (mainState.closed) main.dataset.closed = 1; else main.dataset.min = 1; }
    else focusWin(main);
    mobileFit(main);
    taskSig = ""; updateTaskbar();
    requestAnimationFrame(() => document.body.classList.remove("switching"));
  };
  isFirst ? run() : setTimeout(run, 120);          // let the old version fade out first
}
/* Taskbar: one button per open window, like the real one. */
let taskSig = "";
function updateTaskbar() {
  const wins = $$(".win").filter(w => !w.dataset.closed);
  const sig = wins.map(w => [w.id || "", $(".titlebar .t", w)?.textContent, w.classList.contains("hidden"), w.classList.contains("inactive"), $(".titlebar img", w)?.src, w.dataset.flash].join("|")).join("#");
  if (sig === taskSig) return; taskSig = sig;
  const bar = $("#tasks"); bar.innerHTML = "";
  for (const w of wins) {
    const active = !w.classList.contains("hidden") && !w.classList.contains("inactive");
    const b = h(`<button class="${active ? "active" : ""} ${w.dataset.flash && !active ? "flash" : ""}" title="${esc($(".titlebar .t", w).textContent)}"><img src="${$(".titlebar img", w)?.src || ""}" alt=""><span>${esc($(".titlebar .t", w).textContent)}</span></button>`);
    b.onclick = () => { if (w.classList.contains("hidden")) focusWin(w); else if (active) { w.classList.add("hidden"); w.dataset.min = 1; } else focusWin(w); updateTaskbar(); };
    bar.append(b);
  }
}
setInterval(updateTaskbar, 250);
/* Mockup debug window (not part of Messenger): triggers the events you'd otherwise wait for (see DEBUG_ACTS). */
const BUSY_LINES = ["heyyy you there?", "omg did you see that?? :O", "lol", "are you coming tonight?", "brb", "check your email :P", "(Y)",
  "call me later ok?", "hahaha :D", "wanna play a game?", "hellooo", "where are you? :(", "sooo bored", "ok ttyl ;)"];
const pick = a => a[Math.floor(Math.random() * a.length)];
// a debug action while Messenger is still signing in: signed in at once (before it's opened, the actions are off)
const ensureSignedIn = () => {
  if (!signedIn) { clearTimeout(signinTimer); signedIn = true; renderMain(); renderTray(); scheduleChatter(false); }
};
function incomingMessage(c, text, conv) {
  conv = conv || openChat([c.id], { focus: false });
  addMsg(conv, c.id, text); conv.lastAt = now(); refreshConv(conv); play("type", false, c);
  const ww = winOf(conv);
  if (tabbed() && conv !== activeConv) { conv.unread = true; renderTabs(); }     // 2012: that tab lights up
  if (ww && (ww.classList.contains("inactive") || ww.classList.contains("hidden"))) {   // the window only when it's in the background
    flashWin(ww);
    if (settings.alertMsg !== false) toast(c, `${fmt(S("says", "%1 says:"), plain(c.name))} ${text}`, () => showConv(conv), text);
  }
}
// the one-to-one contact the debug actions use: someone online who isn't in the group chat, the same one each time
function debugContact() {
  const group = new Set(convs.filter(v => v.ids.length > 1).flatMap(v => v.ids));
  const on = contacts.filter(c => !c.kind && !c.blocked && c.status !== "offline" && !group.has(c.id));
  return on.find(c => c.id === debugContact.last) || (debugContact.last = (on.find(c => c.id === "ana") || on[0])?.id, byId(debugContact.last));
}
function groupConv() {
  let g = convs.find(v => v.ids.length > 1);
  if (!g) {                                            // a new group chat: the others joined it
    g = openChat(["diogo", "carla", "joao"].filter(byId), { focus: false, group: "fun" });
    g.ids.slice(1).forEach(id => sysKey(g, "tb_invite", "joined", id));
  }
  else if (!g.win) g = openChat(g.ids, { focus: false, group: g.group });
  return g;
}
function friendsSignIn(n = 6) {
  // six contacts (people without an open conversation first) drop off, then sign back in one after another
  const open = new Set(convs.filter(v => v.win).flatMap(v => v.ids));
  const all = contacts.filter(c => !c.kind && !c.blocked).sort(() => Math.random() - .5);
  const im = [...all.filter(c => !open.has(c.id)), ...all.filter(c => open.has(c.id))].slice(0, n);
  im.forEach(c => { if (c.status !== "offline") c._was = c.status; c.status = "offline"; });
  renderList(); refreshConvs();
  // random gaps of 0.7-1.8 s: an alert stays 5 s, so three to five are on screen at once
  let t = 600;
  im.forEach(c => { setTimeout(() => { if (!signedIn) return; c.status = c._was || "online"; delete c._was; renderList(); refreshConvs(); toastOnline(c); }, t); t += 700 + Math.random() * 1100; });
}
function newFriend() {
  const pool = [["Pete Marsh", "pete.marsh@hotmail.example"], ["Sara Lopes", "sara_l@live.example"], ["Mike Tan", "miketan@msn.example"], ["Lucy Hale", "lucy.h@hotmail.example"]];
  const [name, email] = pool.find(([, e]) => !contacts.some(c => c.email === e)) || [`New Friend ${contacts.length}`, `friend${contacts.length}@hotmail.example`];
  const c = { id: "c" + Date.now(), name, first: name.split(" ")[0], last: name.split(" ")[1] || "", email, status: "offline", psm: "", group: null, pic: "default1" };
  contacts.push(c); renderList(); friendRequest(c);
}
function incomingPhotoShare(c) {
  const conv = openChat([c.id], { focus: false });
  if (conv.ps) return;
  pushLog(conv, { type: "psinvite", from: c.id, ts: now(), date: today() });
  play("newalert");
  const ww = winOf(conv);
  if (ww && (ww.classList.contains("inactive") || ww.classList.contains("hidden"))) { flashWin(ww); toast(c, fmt(S("psInvited", "%1 is inviting you to share photos."), plain(c.name)), () => showConv(conv)); }
}
/* The mockup's own debug window (not part of Messenger): triggers what contacts would do. An action the current version
   couldn't have (no nudges in 4.7 / 6.2, winks from 7.0, photo sharing in 2009) is greyed out, re-checked on every
   version switch. Minimise / close like any window; the Start menu opens it again. */
const DEBUG_ACTS = [
  ["Messages", [["Message from one contact", () => incomingMessage(debugContact(), pick(BUSY_LINES))],
                ["Message in the group chat", () => { const g = groupConv(); incomingMessage(byId(pick(g.ids)), pick(BUSY_LINES), g); }],
                ["Nudge", () => { const v = openChat([debugContact().id], { focus: false }); nudge(v, false); }, () => V.features.nudge]]],
  ["Calls", [["Incoming video call", () => incomingCall(openChat([debugContact().id], { focus: false }), "video")],
             ["Incoming voice call", () => incomingCall(openChat([debugContact().id], { focus: false }), "voice")]]],
  ["Sharing", [["Receive a wink", () => { const c = debugContact(); receiveWink(openChat([c.id], { focus: false }), c.id, pick(D().winks).key); },
                () => V.features.winks && (D().winks || []).length > 0],
               ["Receive a file", () => incomingFile(openChat([debugContact().id], { focus: false }), pick(["beach_day.jpg", "notes.docx", "song.mp3", "party_photos.zip"]), 200 + Math.floor(Math.random() * 3000))],
               ["Photo sharing invitation", () => incomingPhotoShare(debugContact()), () => V.id === "2009" && !!S("psName")]]],
  ["Contacts", [["Friend request", newFriend],
                ["6 contacts sign in", () => friendsSignIn(6)],
                ["A contact signs out", () => { const c = debugContact(); if (!c) return; c.status = "offline"; debugContact.last = null; renderList(); refreshConvs(); }],
                ["New e-mail", () => mailToast()]]]];
function debugWindow() {
  const old = $("#debug");
  if (old) { old.classList.remove("hidden"); delete old.dataset.min; focusWin(old); return; }
  const w = newWindow({ title: "Mockup debug", icon: "theme/xp/cl_debug16.png", width: 220, height: 470, caps: ["min", "close"], left: innerWidth - 240, top: 20,
    body: `<div class="debug">${DEBUG_ACTS.map(([hd, items]) => `<fieldset><legend>${hd}</legend>${items.map(([t], i) => `<button class="btn pb" data-a="${hd}:${i}">${t}</button>`).join("")}</fieldset>`).join("")}</div>` });
  w.id = "debug"; w.style.height = "auto";
  if (MOBILE && !debugWindow.shown) { w.classList.add("hidden"); w.dataset.min = 1; }   // on a phone it waits on the taskbar
  debugWindow.shown = true;
  $$("[data-a]", w).forEach(b => b.onclick = () => {
    if (b.disabled || !running) return;
    ensureSignedIn(); const [hd, i] = b.dataset.a.split(":"); DEBUG_ACTS.find(x => x[0] === hd)[1][+i][1]();
  });
  debugRefresh();
}
function debugRefresh() {
  const w = $("#debug"); if (!w) return;
  $$("[data-a]", w).forEach(b => {
    const [hd, i] = b.dataset.a.split(":"), ok = DEBUG_ACTS.find(x => x[0] === hd)[1][+i][2];
    b.disabled = !running || (!!ok && !ok());
    b.title = !running ? "Open a Messenger version from the Start menu first" : b.disabled ? `Not in ${V.label}` : "";
  });
}
/* Start menu = the XP Start panel (sizes, fonts and colours generated from Luna's NormalBlue.ini into css/xp.css).
   Left: pinned Internet / E-mail, the most-used list (here: the Messenger versions), "All Programs"; right: the places list;
   bottom: Log Off / Turn Off Computer. Labels are English XP's. */
const PLACES = [["My Documents", "pl_docs", 1], ["My Recent Documents", "pl_recent", 1, "sub"], ["My Pictures", "pl_pics", 1], ["My Music", "pl_music", 1],
  ["My Computer", "pl_computer", 1], "-", ["Control Panel", "pl_control"], ["Set Program Access and Defaults", "pl_spad"], ["Printers and Faxes", "pl_printers"], "-",
  ["Help and Support", "pl_help"], ["Search", "pl_search"], ["Run...", "pl_run"]];
const xpIcon = n => `theme/xp/${n}.png`;
/* The classic Start menu (XP's "Classic Start menu": the edition banner, 32-pixel items), holding only what this
   mockup has: the Messenger versions and its debug window. Banner (explorer.exe bitmap 167) and the debug window's
   icon (shell32.dll 151) from XP's files. */
function startMenu() {
  if ($(".startmenu")) return closeMenus();
  // the debug window first, then the versions newest to oldest; the one running (if any) in bold
  const m = h(`<div class="startmenu classic"><div class="clbanner"></div><div class="clitems">
    <div class="it" data-debug="1"><img src="theme/xp/cl_debug.png" alt=""><span>Mockup debug</span></div>
    <div class="sep"></div>
    ${[...VERSION_ORDER].reverse().map(id => `<div class="it ${running && id === V.id ? "cur" : ""}" data-v="${id}"><img src="assets/${id}/prog32.png" alt=""><span>${esc(VERSIONS[id].label)}</span></div>`).join("")}
  </div></div>`);
  document.body.append(m);
  bonziLeave(m);
  // a version: switch to it (a running Messenger carries over), then open it, signing in if it isn't yet
  $$(".it[data-v]", m).forEach(it => it.onclick = () => {
    closeMenus();
    if (it.dataset.v === V.id) return launchMessenger();
    switchVersion(it.dataset.v);
  });
  $(".it[data-debug]", m).onclick = () => { closeMenus(); debugWindow(); };
}

/* Options › Personal: "Show me as Away when I'm inactive for 5 minutes" (5 is the dialog's own value). */
let lastInput = Date.now(), autoAway = false;
["pointerdown", "keydown", "pointermove"].forEach(ev => addEventListener(ev, () => {
  lastInput = Date.now();
  if (autoAway && me.status === "away") { autoAway = false; setMyStatus("online"); }
}, true));
setInterval(() => {
  if (!signedIn || settings.idleAway === false || me.status !== "online") return;
  if (Date.now() - lastInput > 5 * 60000) { autoAway = true; setMyStatus("away"); }
}, 10000);

/* The desktop never scrolls: focusing a box near the bottom can still scroll a hidden-overflow page, which would shift
   every window against the menus and alerts (placed in screen coordinates). */
for (const el of [document.documentElement, document.body]) el.addEventListener("scroll", () => { if (el.scrollTop || el.scrollLeft) el.scrollTop = el.scrollLeft = 0; });
addEventListener("scroll", () => { if (scrollX || scrollY) scrollTo(0, 0); });

/* ============================================================ touch screens
   Double-tap acts as a double-click (open a chat, maximise a window) and a long press as a right-click (context menus).
   Android already turns a long press into a contextmenu event; the synthetic one is skipped when that happens. */
(() => {
  let lastTap = { t: 0, el: null, x: 0, y: 0 }, press = null, nativeCtx = 0;
  addEventListener("contextmenu", () => { nativeCtx = Date.now(); }, true);
  // some mobile browsers fire their own dblclick on a double-tap: keep only ours, so a window doesn't maximise and restore
  let lastTouch = 0;
  addEventListener("pointerdown", e => { if (e.pointerType === "touch") lastTouch = Date.now(); }, true);
  addEventListener("dblclick", e => { if (e.isTrusted && Date.now() - lastTouch < 800) e.stopImmediatePropagation(); }, true);
  addEventListener("pointerdown", e => {
    if (e.pointerType !== "touch") return;
    const x = e.clientX, y = e.clientY, target = e.target;
    press = { x, y, timer: setTimeout(() => {
      press = null;
      if (Date.now() - nativeCtx < 900) return;
      target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 2 }));
    }, 550) };
  }, true);
  addEventListener("pointermove", e => { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) { clearTimeout(press.timer); press = null; } }, true);
  const endPress = () => { if (press) { clearTimeout(press.timer); press = null; } };
  addEventListener("pointercancel", endPress, true);
  addEventListener("pointerup", e => {
    endPress();
    if (e.pointerType !== "touch") return;
    const now = Date.now(), el = e.target;
    if (now - lastTap.t < 350 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 25 && (el === lastTap.el || el.contains(lastTap.el) || lastTap.el?.contains(el))) {
      lastTap.t = 0;
      setTimeout(() => el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY })), 0);
    } else lastTap = { t: now, el, x: e.clientX, y: e.clientY };
  }, true);
})();

/* ============================================================ switching version
   Every version is a page of its own. Choosing another one saves what carries over (you, contacts, groups, settings,
   custom emoticons, conversations with their windows, the debug window) for the browser tab, and opens that
   version's page, which takes it back: a Messenger that was running is running there too, signed in, with its
   conversations; one that wasn't opens on its sign-in screen. */
const CARRY = "msnx.carry";
function switchVersion(id) {
  const pos = w => w && { l: w.style.left, t: w.style.top, w: w.style.width || w.offsetWidth + "px", h: w.style.height || w.offsetHeight + "px",
    hidden: w.classList.contains("hidden"), closed: !!w.dataset.closed };
  const st = {
    running, signedIn, me, contacts, groups, settings, customEmoticons, recentPics, pastLogs, alertLog, transfers, received, ftSeq,
    convs: convs.filter(c => c.win).map(c => ({ ids: c.ids, group: c.group, log: c.log, bg: c.bg, fontSize: c.fontSize, lastAt: c.lastAt,
      unread: c.unread, active: c === activeConv, pos: tabbed() ? null : pos(c.win) })),
    host: pos($("#convhost")), main: pos($("#main")), debug: pos($("#debug")),
  };
  try { sessionStorage.setItem(CARRY, JSON.stringify(st)); } catch { }
  location.href = `../${id}/index.html`;
}
function takeCarried() {
  let st = null;
  try { st = JSON.parse(sessionStorage.getItem(CARRY)); sessionStorage.removeItem(CARRY); } catch { }
  if (!st) return null;
  Object.assign(me, st.me); contacts = st.contacts; groups.splice(0, groups.length, ...st.groups); Object.assign(settings, st.settings);
  customEmoticons.splice(0, customEmoticons.length, ...st.customEmoticons); recentPics = st.recentPics;
  Object.assign(pastLogs, st.pastLogs); alertLog.push(...st.alertLog); Object.assign(transfers, st.transfers); received.push(...st.received); ftSeq = st.ftSeq;
  if (st.host) hostRect = { left: st.host.l, top: st.host.t, width: st.host.w, height: st.host.h };
  return st;
}
function restoreCarried(st) {
  const main = $("#main"), place = (w, p) => { if (!w || !p) return; Object.assign(w.style, { left: p.l, top: p.t, width: p.w, height: p.h }); if (p.hidden) { w.classList.add("hidden"); w.dataset.min = 1; } };
  if (!st.running) return launchMessenger();                     // chosen before Messenger was open: sign in there
  running = true; signedIn = st.signedIn;
  delete main.dataset.closed; main.classList.remove("hidden");
  place(main, st.main); if (st.main?.closed) { main.classList.add("hidden"); main.dataset.closed = 1; }
  renderMain(); renderTray(); mobileFit(main);
  document.title = `${V.product} ${V.short} — mockup`;
  let active = null;
  for (const c of st.convs) {
    const conv = { ids: c.ids, group: c.group, log: c.log, bg: c.bg, fontSize: c.fontSize, lastAt: c.lastAt, unread: c.unread };
    convs.push(conv); buildConvWindow(conv, false);
    if (!tabbed()) place(conv.win, c.pos);
    if (c.active) active = conv;
  }
  if (tabbed() && convs.length) { activateConv(active || convs[0], false); if (st.host?.hidden) { $("#convhost").classList.add("hidden"); $("#convhost").dataset.min = 1; } }
  if (st.debug) { debugWindow(); place($("#debug"), st.debug); }
  if (!main.classList.contains("hidden")) focusWin(main);
  debugRefresh(); updateTaskbar();
  if (signedIn) scheduleChatter(false);
}

/* ============================================================ boot */
makeWindow($("#main"));
$("#orb").onclick = e => { e.stopPropagation(); startMenu(); };
// Messenger isn't open when the page loads: no window, no taskbar button, nobody signed in, no conversations.
// Arriving from another version's page, what was carried over comes back instead (and Bonzi has already left).
$("#main").classList.add("hidden"); $("#main").dataset.closed = 1;
const carried = takeCarried();
setVersion(V.id);
carried ? restoreCarried(carried) : bonziGreet();
