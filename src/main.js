import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { openStore, persist, usage } from './store.js';
import { t, getLang, setLang } from './i18n.js';

const COLORS = ['#1D9E75', '#D85A30', '#7F77DD', '#D4537E', '#378ADD', '#BA7517', '#639922', '#5F5E5A'];
const CELL_RATIO = 1.85; // calendar cell height / width
const now = new Date();
const S = { people: [], months: {}, sel: null, view: 'cal', y: now.getFullYear(), m: now.getMonth(), dayKey: null, dayPid: null, idx: 0, ready: false };
let store = null;

const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const dkey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayKey = dkey(now.getFullYear(), now.getMonth(), now.getDate());
const mid = (pid, y, m) => `m_${pid}_${y}-${pad(m + 1)}`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const parseKey = k => { const [a, b, c] = k.split('-').map(Number); return { y: a, m: b - 1, d: c }; };
const dim = (y, m) => new Date(y, m + 1, 0).getDate();
const firstCol = (y, m) => (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
const person = id => S.people.find(p => p.id === id);

function getDay(pid, k) { const { y, m } = parseKey(k); const mo = S.months[mid(pid, y, m)]; return (mo && mo[k]) || null; }
function photosOf(pid, k) { const d = getDay(pid, k); return d && Array.isArray(d.photos) ? d.photos : []; }
function countDays(pid, y, m) { const mo = S.months[mid(pid, y, m)] || {}; return Object.values(mo).filter(d => d && d.photos && d.photos.length).length; }
function save(id, body) {
  Promise.resolve(store.save(id, body)).catch(e => toast(t(e && e.code === 'permission-denied' ? 'permDenied' : 'saveFail')));
}
function setDay(pid, k, val) {
  const { y, m } = parseKey(k);
  const id = mid(pid, y, m);
  const mo = { ...(S.months[id] || {}) };
  if (!val || (!(val.photos || []).length && !val.note && !val.live)) delete mo[k]; else mo[k] = val;
  S.months[id] = mo;
  save(id, { days: mo });
}
function savePeople() { save('people', { list: S.people }); }

let toastT;
function toast(msg, stay) {
  let el = $('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.style.bottom = S.view === 'day' ? 'calc(20px + env(safe-area-inset-bottom))' : '';
  clearTimeout(toastT);
  if (!stay) toastT = setTimeout(() => el.remove(), 2600);
}
const clearToast = () => { const el = $('.toast'); if (el) el.remove(); };

/* ---------- views ---------- */
const ICON = {
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>',
  stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 20V12M10 20V6M15 20v-9M20 20V4"/></svg>',
  people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .7 3.5 2.8 3.5 6"/></svg>'
};

function render() {
  if (!S.ready) return;
  const v = S.view;
  const nav = $('#nav');
  nav.style.display = v === 'day' ? 'none' : 'flex';
  nav.innerHTML = [['cal', 'navCal'], ['stats', 'navStats'], ['people', 'navPeople']].map(([k, l]) => `<button class="${v === k ? 'on' : ''}" data-nav="${k}">${ICON[k]}${t(l)}</button>`).join('');
  if (S.people.length && !person(S.sel)) S.sel = S.people[0].id;
  if (v === 'cal') renderCal(); else if (v === 'day') renderDay(); else if (v === 'stats') renderStats(); else renderPeople();
}
function monthHeader() {
  return `<div class="row between" style="margin:0 2px 6px"><button class="iconbtn" data-act="prev" aria-label="‹">‹</button>
  <span class="title">${t('monthTitle', S.y, S.m)}</span><button class="iconbtn" data-act="next" aria-label="›">›</button></div>`;
}
function renderCal() {
  const app = $('#app');
  if (!S.people.length) {
    app.innerHTML = monthHeader() + `<div class="empty" style="height:50vh"><div style="font-size:18px;color:var(--fg);font-weight:600">${t('addFirst')}</div><div class="small">${t('addFirstSub')}</div><button class="btn primary" style="width:auto;padding:10px 20px;margin-top:10px" data-act="addPerson">${t('addPerson')}</button></div>`;
    return;
  }
  const total = dim(S.y, S.m);
  let chips = `<button class="chip" data-act="shot" aria-label="${t('screenshot')}" title="${t('screenshot')}" style="font-size:16px">📸</button>`;
  chips += S.people.map(p => `<button class="chip ${S.sel === p.id ? 'on' : ''}" style="${S.sel === p.id ? `color:${p.color}` : ''}" data-sel="${p.id}"><span class="dot" style="background:${p.color}"></span><span style="color:var(--fg)">${esc(p.name)}</span></button>`).join('');
  chips += `<button class="chip" data-act="addPerson" style="color:var(--mut)">${t('addChip')}</button>`;
  const first = firstCol(S.y, S.m);
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<div></div>';
  for (let d = 1; d <= total; d++) {
    const k = dkey(S.y, S.m, d), wd = (first + d - 1) % 7;
    const cls = wd === 5 ? 'sat' : wd === 6 ? 'sun' : '';
    const ph = photosOf(S.sel, k);
    const isLive = (getDay(S.sel, k) || {}).live;
    const today = (k === todayKey ? ' today' : '') + (isLive ? ' live' : '');
    const liveStyle = isLive ? ` style="--live:${person(S.sel).color}"` : '';
    if (ph.length) {
      cells += `<button class="cell has${today}"${liveStyle} data-day="${k}"><img src="${store.thumb(ph[0])}" data-thumb="${ph[0].id}" alt="">${ph[0].type === 'video' ? '<span class="play">▶</span>' : ''}<span class="d">${d}</span>${ph.length > 1 ? `<span class="plus">+${ph.length - 1}</span>` : ''}</button>`;
    } else cells += `<button class="cell${today}"${liveStyle} data-day="${k}"><span class="d ${cls}">${d}</span></button>`;
  }
  const wk = t('wk').map((w, i) => `<span class="${i === 5 ? 'sat' : i === 6 ? 'sun' : ''}">${w}</span>`).join('');
  const banner = '';
  app.innerHTML = monthHeader() + banner + `<div class="chips">${chips}</div><div class="wk">${wk}</div><div class="grid" id="grid">${cells}</div>`;
}
function renderDay() {
  const k = S.dayKey, { y, m, d } = parseKey(k), date = new Date(y, m, d);
  if (!person(S.dayPid)) S.dayPid = S.people[0] && S.people[0].id;
  const p = person(S.dayPid);
  if (!p) { S.view = 'cal'; render(); return; }
  const ph = photosOf(p.id, k);
  const day = getDay(p.id, k) || {};
  if (S.idx >= ph.length) S.idx = Math.max(0, ph.length - 1);
  const chips = S.people.length > 1 ? `<div class="chips">${S.people.map(q => { const n = photosOf(q.id, k).length; return `<button class="chip ${q.id === p.id ? 'on' : ''}" style="${q.id === p.id ? `color:${q.color}` : ''}" data-dp="${q.id}"><span class="dot" style="background:${q.color}"></span><span style="color:var(--fg)">${esc(q.name)}${n ? ` · ${n}` : ''}</span></button>`; }).join('')}</div>` : '';
  $('#app').innerHTML = `
  <div class="row between" style="margin-bottom:6px"><button class="iconbtn" data-act="back" aria-label="←">←</button>
    <div class="row" style="gap:2px"><button class="iconbtn" data-act="dprev" aria-label="‹">‹</button>
    <span style="font-size:17px;font-weight:600;min-width:130px;text-align:center">${t('dayTitle', y, m, d, date.getDay())}</span>
    <button class="iconbtn" data-act="dnext" aria-label="›">›</button></div><span style="width:40px"></span></div>
  ${chips}
  ${ph.length ? `<div style="position:relative"><div class="gallery" id="gal">${ph.map(x => x.type === 'video' ? `<video src="${store.url(x)}" poster="${store.thumb(x)}" controls playsinline preload="metadata"></video>` : `<img src="${store.url(x)}" data-full="${x.id}" alt="">`).join('')}</div>
    <span id="cnt" style="position:absolute;right:10px;top:10px;background:rgba(0,0,0,.6);color:#fff;font-size:13px;padding:3px 9px;border-radius:8px">${S.idx + 1} / ${ph.length}</span></div>`
    : `<button class="empty" data-act="pick"><span style="font-size:34px">＋</span><span>${t('dayEmpty', esc(p.name))}</span></button>`}
  <div class="thumbs">${ph.map((x, i) => `<button class="${i === S.idx ? 'on' : ''}" data-th="${i}"><img src="${store.thumb(x)}" data-thumb="${x.id}" alt="">${x.type === 'video' ? '<span class="play">▶</span>' : ''}</button>`).join('')}<button class="addtile" data-act="pick" aria-label="${t('addPhotos')}">＋</button></div>
  ${ph.length > 1 ? `<p class="small" style="margin:-2px 2px 8px">${t('reorderHint')}</p>` : ''}
  <button class="btn primary" data-act="pick">${t('addPhotos')}</button>
  <button class="btn livebtn ${day.live ? 'on' : ''}" style="margin-top:8px;--live:${p.color}" data-act="live">${day.live ? '✓ ' + t('liveOff') : t('live')}</button>
  ${ph.length ? `<div class="row" style="margin-top:8px"><button class="btn" data-act="crop" id="cropBtn">✂️ ${t('crop')}</button><button class="btn danger" data-act="delPhoto" id="delBtn">${t('delPhoto')}</button></div>` : ''}
  <p class="small" style="margin:16px 0 6px">${t('note')}</p>
  <textarea id="note" placeholder="${t('notePh')}">${esc(day.note || '')}</textarea>`;
  const gal = $('#gal');
  // Crop is for photos only; the delete label says photo or video.
  const syncActions = () => {
    const cur = ph[S.idx];
    const vid = cur && cur.type === 'video';
    const cb = $('#cropBtn'), db = $('#delBtn');
    if (cb) cb.style.display = vid ? 'none' : '';
    if (db) db.textContent = t(vid ? 'delVideo' : 'delPhoto');
  };
  syncActions();
  if (ph.length > 1) enableReorder(p.id, k);
  if (gal) {
    gal.scrollLeft = S.idx * gal.clientWidth;
    gal.addEventListener('scroll', () => {
      const i = Math.round(gal.scrollLeft / gal.clientWidth);
      if (i !== S.idx) {
        S.idx = i;
        $('#cnt').textContent = `${i + 1} / ${ph.length}`;
        document.querySelectorAll('.thumbs [data-th]').forEach((b, j) => b.classList.toggle('on', j === i));
        gal.querySelectorAll('video').forEach(v => v.pause());
        syncActions();
      }
    }, { passive: true });
  }
  $('#note').addEventListener('change', e => {
    const cur = getDay(p.id, k) || {};
    const v = e.target.value.trim();
    if ((cur.note || '') === v) return;
    setDay(p.id, k, { ...cur, photos: cur.photos || [], note: v });
    toast(t('noteSaved'));
  });
}
/* ---------- reorder photos: press and hold 1 second, then drag ---------- */
let drag = null;
let suppressClick = false;
document.addEventListener('touchmove', e => { if (drag) e.preventDefault(); }, { passive: false });
document.addEventListener('click', e => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; } }, true);
function enableReorder(pid, k) {
  const wrap = $('.thumbs');
  wrap.addEventListener('contextmenu', e => e.preventDefault());
  let timer = null, sx = 0, sy = 0;
  const cancel = () => { clearTimeout(timer); timer = null; };
  const onMove = e => {
    if (timer && Math.hypot(e.clientX - sx, e.clientY - sy) > 10) cancel();
    if (!drag) return;
    moveGhost(e.clientX, e.clientY);
    const items = [...wrap.querySelectorAll('[data-th]')];
    const over = items.find(b => {
      if (b === drag.btn) return false;
      const r = b.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (over) { if (items.indexOf(drag.btn) < items.indexOf(over)) over.after(drag.btn); else over.before(drag.btn); }
  };
  const onEnd = () => {
    cancel();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onEnd);
    window.removeEventListener('pointercancel', onEnd);
    if (!drag) return;
    const { btn, ghost } = drag;
    ghost.remove();
    btn.classList.remove('dragging');
    drag = null;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 400);
    const order = [...wrap.querySelectorAll('[data-th]')].map(x => +x.dataset.th);
    if (order.every((v, i) => v === i)) return;
    const cur = getDay(pid, k) || {};
    const old = cur.photos || [];
    const shown = old[S.idx];
    const next = order.map(i => old[i]).filter(Boolean);
    setDay(pid, k, { ...cur, photos: next });
    S.idx = Math.max(0, next.indexOf(shown));
    render();
    toast(t('reordered'));
  };
  wrap.querySelectorAll('[data-th]').forEach(btn => {
    btn.addEventListener('pointerdown', e => {
      if (drag) return;
      sx = e.clientX; sy = e.clientY;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
      timer = setTimeout(() => {
        timer = null;
        if (navigator.vibrate) navigator.vibrate(30);
        const r = btn.getBoundingClientRect();
        const ghost = btn.cloneNode(true);
        ghost.className = 'ghost';
        ghost.style.width = r.width + 'px';
        ghost.style.height = r.height + 'px';
        document.body.appendChild(ghost);
        btn.classList.add('dragging');
        drag = { btn, ghost, ox: sx - r.left, oy: sy - r.top };
        moveGhost(sx, sy);
      }, 1000);
    });
  });
}
function moveGhost(x, y) {
  if (!drag) return;
  drag.ghost.style.transform = `translate(${x - drag.ox}px, ${y - drag.oy}px) scale(1.08)`;
}

function renderStats() {
  const months = [];
  for (let i = 5; i >= 0; i--) { const dt = new Date(S.y, S.m - i, 1); months.push([dt.getFullYear(), dt.getMonth()]); }
  const body = S.people.length ? S.people.map(p => {
    const vals = months.map(([y, m]) => ({ y, m, n: countDays(p.id, y, m), t: dim(y, m) }));
    const totalPhotos = Object.entries(S.months).filter(([id]) => id.startsWith(`m_${p.id}_`)).reduce((a, [, mo]) => a + Object.values(mo).reduce((b, d) => b + ((d && d.photos) || []).length, 0), 0);
    return `<div class="card stat"><div class="row between"><span class="row" style="font-weight:600"><span class="dot" style="background:${p.color}"></span>${esc(p.name)}</span><span class="small">${t('photosTotal', totalPhotos)}</span></div>
    <div class="bars">${vals.map(v => `<div class="b"><span style="color:var(--fg);font-weight:600">${v.n}</span><div style="height:${Math.max(2, v.n / v.t * 100)}%;background:${p.color};opacity:${v.y === S.y && v.m === S.m ? 1 : 0.55}"></div><span>${t('monthShort', v.m)}</span></div>`).join('')}</div></div>`;
  }).join('') : `<div class="empty">${t('statsEmpty')}</div>`;
  $('#app').innerHTML = monthHeader() + `<p class="small" style="margin:0 4px 10px">${t('statsSub')}</p>` + body;
}
function langSwitch() {
  const l = getLang();
  return `<div class="seg"><button class="${l === 'ko' ? 'on' : ''}" data-lang="ko">한국어</button><button class="${l === 'en' ? 'on' : ''}" data-lang="en">English</button></div>`;
}
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (S.view === 'people') render(); maybeInstallPopup(); });

/* Install pop-up when the app is opened in the browser without being installed.
   Android: one-tap install. iPhone: short Safari steps. "Later" hides it for 3 days. */
let popupShown = false;
function maybeInstallPopup() {
  if (popupShown || isStandalone() || !S.ready || document.querySelector('.overlay')) return;
  const later = +(LS.get('installLater') || 0);
  if (Date.now() - later < 3 * 86400000) return;
  if (!installEvt && !isIOS) return;
  popupShown = true;
  const body = installEvt
    ? `<p class="small" style="font-size:15px;margin:0 0 16px;line-height:1.6">${t('installPopText')}</p>
       <button class="btn primary" id="pinstall">${t('installBtn')}</button>`
    : `<p class="small" style="font-size:15px;margin:0 0 10px;line-height:1.6">${t('installPopText')}</p>
       <ol style="margin:0 0 16px;padding-left:20px;line-height:1.7;font-size:15px">${t('iosSteps').slice(1, 3).map(x => `<li>${x}</li>`).join('')}</ol>
       <button class="btn primary" id="pok">${t('ok')}</button>`;
  sheet(`<div class="row" style="gap:14px;margin-bottom:12px"><img src="/icon-grid-192.png" alt="" style="width:56px;height:56px;border-radius:14px"><h3 style="margin:0">${t('installPopTitle')}</h3></div>
    ${body}<button class="btn" style="margin-top:8px" id="plater">${t('installLater')}</button>`, (o, close) => {
    const p1 = o.querySelector('#pinstall');
    if (p1) p1.onclick = () => { close(); if (installEvt) { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; render(); }); } };
    const p2 = o.querySelector('#pok');
    if (p2) p2.onclick = () => { LS.set('installLater', String(Date.now())); close(); };
    o.querySelector('#plater').onclick = () => { LS.set('installLater', String(Date.now())); close(); };
  });
}
window.addEventListener('appinstalled', () => { installEvt = null; if (S.ready) render(); });

const LS = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
const fmtDate = ms => new Date(ms).toLocaleDateString(getLang() === 'ko' ? 'ko-KR' : 'en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
const fmtSize = b => b > 1e9 ? (b / 1e9).toFixed(1) + ' GB' : Math.max(1, Math.round(b / 1e6)) + ' MB';

function renderPeople() {
  const last = LS.get('lastBackup');
  const install = isStandalone() ? '' : `<p class="small" style="margin:24px 4px 8px">${t('installTitle')}</p>
    ${installEvt ? `<button class="btn primary" data-act="install">${t('installBtn')}</button>` : `<button class="btn" data-act="installHelp">${t('installHow')}</button>`}`;
  $('#app').innerHTML = `<div class="row between" style="margin:6px 4px 10px"><span class="title">${t('people')}</span></div>
  <div class="list">${S.people.map(p => `<button class="item" data-edit="${p.id}"><span class="dot" style="background:${p.color};width:14px;height:14px"></span><span class="nm">${esc(p.name)}</span><span class="small">${t('daysThisMonth', countDays(p.id, now.getFullYear(), now.getMonth()))}</span></button>`).join('')}</div>
  <button class="btn primary" style="margin-top:16px" data-act="addPerson">${t('addPerson')}</button>
  <p class="small" style="margin:24px 4px 8px">${t('backupTitle')}</p>
  <div class="row"><button class="btn" data-act="backup">${t('backupBtn')}</button><button class="btn" data-act="restore">${t('restoreBtn')}</button></div>
  <p class="small" style="margin:8px 4px 0">${last ? t('lastBackup', fmtDate(+last)) : t('neverBackup')} · <span id="used"></span></p>
  <p class="small" style="margin:4px 4px 0">${t('backupNote')}</p>
  ${install}
  <p class="small" style="margin:24px 4px 8px">${t('language')}</p>${langSwitch()}`;
  usage().then(u => { const el = $('#used'); if (el) el.textContent = t('usedSpace', fmtSize(u)); });
}

/* ---------- backup / restore ---------- */
const hasVideos = () => Object.values(S.months).some(mo => Object.values(mo).some(d => d && (d.photos || []).some(x => x.type === 'video')));
function doBackup() {
  if (!hasVideos()) { makeBackup(true); return; }
  sheet(`<h3>${t('backupWhatQ')}</h3><p class="small" style="font-size:15px;margin:0 0 14px">${t('backupWhatText')}</p>
    <button class="btn primary" id="ball">${t('backupAll')}</button>
    <button class="btn" style="margin-top:8px" id="bphotos">${t('backupPhotos')}</button>
    <button class="btn" style="margin-top:8px" id="bcancel">${t('cancel')}</button>`, (o, close) => {
    o.querySelector('#ball').onclick = () => { close(); makeBackup(true); };
    o.querySelector('#bphotos').onclick = () => { close(); makeBackup(false); };
    o.querySelector('#bcancel').onclick = close;
  });
}
async function makeBackup(includeVideos) {
  toast(t('backupMaking'), true);
  let blob;
  try {
    blob = await store.exportZip((i, n) => toast(t('backupProgress', i, n), true), includeVideos);
  } catch (e) { console.error(e); toast(t('backupFail')); return; }
  clearToast();
  const d = new Date();
  const name = `collectbook-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.zip`;
  const file = new File([blob], name, { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
  sheet(`<h3>${t('backupReady')}</h3><p class="small" style="font-size:15px;margin:0 0 14px">${t('backupReadyText', fmtSize(blob.size))}</p>
    <a class="btn primary" style="text-decoration:none" href="${url}" download="${name}" id="bsave">${t('backupSave')}</a>
    ${canShare ? `<button class="btn" style="margin-top:8px" id="bshare">${t('backupShare')}</button>` : ''}
    <button class="btn" style="margin-top:8px" id="bclose">${t('close')}</button>`, (o, close) => {
    const mark = () => { LS.set('lastBackup', String(Date.now())); };
    o.querySelector('#bsave').addEventListener('click', () => { mark(); setTimeout(() => { toast(t('shotSaved')); render(); }, 300); });
    if (canShare) o.querySelector('#bshare').onclick = () => navigator.share({ files: [file] }).then(() => { mark(); render(); }).catch(() => {});
    o.querySelector('#bclose').onclick = () => { close(); setTimeout(() => URL.revokeObjectURL(url), 60000); render(); };
  });
}
function doRestore() {
  confirmSheet(t('restoreQ'), t('restoreText'), t('restoreBtn'), () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.zip,application/zip';
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      toast(t('restoring'), true);
      try {
        const data = await store.importZip(f, (a, b) => toast(t('restoringPct', Math.round(a / b * 100)), true));
        S.people = data.people; S.months = data.months; S.sel = null;
        LS.set('lastBackup', String(Date.now()));
        toast(t('restored'));
        render();
      } catch (e) { console.error(e); toast(t('restoreFail')); }
    };
    inp.click();
  });
}
function installHelp() {
  const steps = isIOS ? t('iosSteps') : t('androidSteps');
  sheet(`<h3>${t('installTitle')}</h3><ol style="margin:0 0 16px;padding-left:20px;line-height:1.7;font-size:15px">${steps.map(x => `<li>${x}</li>`).join('')}</ol>
    <button class="btn" id="iclose">${t('close')}</button>`, (o, close) => { o.querySelector('#iclose').onclick = close; });
}

/* ---------- sheets ---------- */
function sheet(html, mount) {
  const o = document.createElement('div');
  o.className = 'overlay';
  o.innerHTML = `<div class="sheet">${html}</div>`;
  o.addEventListener('click', e => { if (e.target === o) o.remove(); });
  document.body.appendChild(o);
  mount && mount(o, () => o.remove());
}
function editPerson(id) {
  const p = id ? person(id) : null;
  let color = p ? p.color : COLORS[S.people.length % COLORS.length];
  sheet(`<h3>${p ? t('editPerson') : t('addPerson')}</h3><input type="text" id="pname" maxlength="30" placeholder="${t('name')}" value="${p ? esc(p.name) : ''}">
  <p class="small" id="perr" style="color:var(--danger);display:none;margin:6px 0 0">${t('enterName')}</p>
  <div class="swatches">${COLORS.map(c => `<button data-c="${c}" class="${c === color ? 'on' : ''}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>
  <button class="btn primary" id="psave">${t('save')}</button>${p ? `<button class="btn danger" style="margin-top:8px" id="pdel">${t('delPerson')}</button>` : ''}`, (o, close) => {
    const inp = o.querySelector('#pname');
    if (!p) setTimeout(() => inp.focus(), 50);
    inp.addEventListener('input', () => { o.querySelector('#perr').style.display = 'none'; });
    o.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => { color = b.dataset.c; o.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b)); }; });
    o.querySelector('#psave').onclick = () => {
      const name = inp.value.trim();
      if (!name) { o.querySelector('#perr').style.display = 'block'; return; }
      if (p) S.people = S.people.map(x => (x.id === p.id ? { ...x, name, color } : x));
      else { const nid = 'u' + Date.now().toString(36); S.people = [...S.people, { id: nid, name, color }]; S.sel = nid; }
      savePeople(); close(); render();
    };
    if (p) o.querySelector('#pdel').onclick = () => {
      close();
      confirmSheet(t('delPersonQ', p.name), t('delPersonText', p.name), t('del'), () => {
        Object.keys(S.months).filter(k => k.startsWith(`m_${p.id}_`)).forEach(k => {
          Object.values(S.months[k]).forEach(d => (d.photos || []).forEach(x => store.del(x)));
          store.remove(k);
          delete S.months[k];
        });
        S.people = S.people.filter(x => x.id !== p.id);
        if (S.sel === p.id) S.sel = S.people[0] ? S.people[0].id : null;
        savePeople(); render();
      });
    };
  });
}
function confirmSheet(title, text, label, fn) {
  sheet(`<h3>${esc(title)}</h3><p class="small" style="font-size:15px;margin:0 0 16px">${esc(text)}</p><button class="btn primary" style="background:var(--danger);border-color:var(--danger);color:#fff" id="cy">${esc(label)}</button><button class="btn" style="margin-top:8px" id="cn">${t('cancel')}</button>`,
    (o, close) => { o.querySelector('#cy').onclick = () => { close(); fn(); }; o.querySelector('#cn').onclick = close; });
}

/* ---------- crop / resize ---------- */
async function openCrop() {
  const pid = S.dayPid, k = S.dayKey;
  const photo = photosOf(pid, k)[S.idx];
  if (!photo || photo.type === 'video') return;
  const src = await store.load(photo, 'full').catch(() => '');
  if (!src) { toast(t('cropFail')); return; }
  const o = document.createElement('div');
  o.className = 'editor';
  const ratios = [[t('cropFree'), NaN], [t('cropCell'), 1 / CELL_RATIO], ['1:1', 1], ['4:5', 4 / 5], ['3:4', 3 / 4], ['9:16', 9 / 16], ['16:9', 16 / 9]];
  o.innerHTML = `<div class="ed-top"><button class="ed-btn" id="ecancel">${t('cancel')}</button><button class="ed-btn strong" id="esave">${t('save')}</button></div>
  <div class="ed-stage"><img id="eimg" alt=""></div>
  <div class="ed-ratios">${ratios.map(([l], i) => `<button class="ed-chip ${i === 0 ? 'on' : ''}" data-r="${i}">${l}</button>`).join('')}</div>
  <div class="ed-tools"><button class="ed-btn" id="erot">⟳ ${t('rotate')}</button><button class="ed-btn" id="ereset">${t('reset')}</button></div>`;
  document.body.appendChild(o);
  const img = o.querySelector('#eimg');
  const stage = o.querySelector('.ed-stage');
  // Give the stage a fixed pixel size before Cropper measures it, so the whole photo fits on screen.
  const fit = () => {
    const used = [...o.children].filter(el => el !== stage).reduce((a, el) => a + el.offsetHeight, 0);
    stage.style.height = Math.max(200, o.clientHeight - used) + 'px';
    stage.style.width = o.clientWidth + 'px';
  };
  fit();
  await new Promise(res => { img.onload = res; img.onerror = res; img.src = src; });
  await new Promise(r => requestAnimationFrame(r));
  fit();
  const cropper = new Cropper(img, { viewMode: 1, dragMode: 'move', autoCropArea: 1, background: false, responsive: true, restore: false, toggleDragModeOnDblclick: false, minContainerWidth: 100, minContainerHeight: 100 });
  const onResize = () => { fit(); };
  window.addEventListener('resize', onResize);
  const close = () => { window.removeEventListener('resize', onResize); cropper.destroy(); o.remove(); };
  o.querySelectorAll('[data-r]').forEach(b => {
    b.onclick = () => { cropper.setAspectRatio(ratios[+b.dataset.r][1]); o.querySelectorAll('[data-r]').forEach(x => x.classList.toggle('on', x === b)); };
  });
  o.querySelector('#erot').onclick = () => cropper.rotate(90);
  o.querySelector('#ereset').onclick = () => cropper.reset();
  o.querySelector('#ecancel').onclick = close;
  o.querySelector('#esave').onclick = async () => {
    const canvas = cropper.getCroppedCanvas({ maxWidth: 1600, maxHeight: 1600, imageSmoothingQuality: 'high' });
    if (!canvas) return;
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.92));
    close();
    toast(t('saving'), true);
    try {
      await store.replace(photo, blob);
      toast(t('cropSaved'));
      render();
    } catch (e) {
      console.error(e);
      toast(t('cropFail'));
    }
  };
}

/* ---------- month screenshot ---------- */
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
function cover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
async function makeShot() {
  const p = person(S.sel);
  const W = 1080, colW = W / 7, cellH = Math.round(colW * CELL_RATIO);
  const first = firstCol(S.y, S.m), total = dim(S.y, S.m);
  const rows = Math.ceil((first + total) / 7);
  const top = 250, wkH = 80, bottom = 40;
  const c = document.createElement('canvas');
  c.width = W; c.height = top + wkH + rows * cellH + bottom;
  const ctx = c.getContext('2d');
  const font = (w, s) => `${w} ${s}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1a1a19';
  ctx.font = font(700, 76);
  ctx.textAlign = 'left';
  ctx.fillText(t('monthTitle', S.y, S.m), 48, 110);
  ctx.fillStyle = p.color;
  ctx.beginPath(); ctx.arc(62, 195, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a19';
  ctx.font = font(600, 44);
  ctx.fillText(p.name, 92, 197);
  ctx.textAlign = 'center';
  ctx.font = font(400, 36);
  t('wk').forEach((w, i) => {
    ctx.fillStyle = i === 5 ? '#185FA5' : i === 6 ? '#C0392B' : '#6b6a66';
    ctx.fillText(w, colW * i + colW / 2, top + wkH / 2);
  });
  const jobs = [];
  const liveBoxes = [];
  for (let d = 1; d <= total; d++) {
    const pos = first + d - 1, col = pos % 7, row = Math.floor(pos / 7);
    const x = Math.round(col * colW), y = top + wkH + row * cellH, w = Math.round((col + 1) * colW) - x;
    const ph = photosOf(p.id, dkey(S.y, S.m, d));
    if ((getDay(p.id, dkey(S.y, S.m, d)) || {}).live) liveBoxes.push([x, y, w, cellH]);
    if (ph.length) {
      jobs.push((async () => {
        const src = await store.load(ph[0], 'thumb');
        const img = await loadImg(src);
        cover(ctx, img, x, y, w, cellH);
        if (ph[0].type === 'video') {
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.beginPath(); ctx.arc(x + w / 2, y + cellH / 2, 30, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.moveTo(x + w / 2 - 10, y + cellH / 2 - 16); ctx.lineTo(x + w / 2 - 10, y + cellH / 2 + 16); ctx.lineTo(x + w / 2 + 16, y + cellH / 2); ctx.fill();
        }
        if (ph.length > 1) {
          const label = `+${ph.length - 1}`;
          ctx.font = font(600, 28);
          const tw = ctx.measureText(label).width + 16;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(x + w - tw - 6, y + cellH - 42, tw, 36);
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.fillText(label, x + w - 6 - tw / 2, y + cellH - 24);
        }
      })());
    } else {
      ctx.fillStyle = col === 5 ? '#185FA5' : col === 6 ? '#C0392B' : '#1a1a19';
      ctx.font = font(400, 46);
      ctx.textAlign = 'center';
      ctx.fillText(String(d), x + w / 2, y + cellH / 2);
    }
  }
  await Promise.all(jobs);
  ctx.strokeStyle = p.color;
  ctx.lineWidth = 8;
  liveBoxes.forEach(([x, y, w, h]) => ctx.strokeRect(x + 4, y + 4, w - 8, h - 8));
  return new Promise(r => c.toBlob(r, 'image/png'));
}
async function shot() {
  if (!person(S.sel)) return;
  toast(t('shotMaking'), true);
  let blob;
  try { blob = await makeShot(); } catch (e) { console.error(e); toast(t('shotFail')); return; }
  if (!blob) { toast(t('shotFail')); return; }
  clearToast();
  const p = person(S.sel);
  const name = `collectbook-${S.y}-${pad(S.m + 1)}-${p.name.replace(/[^\p{L}\p{N}_-]+/gu, '')}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
  sheet(`<img src="${url}" alt="" style="width:100%;max-height:60vh;object-fit:contain;border-radius:8px;border:1px solid var(--line)">
    <a class="btn primary" style="margin-top:12px;text-decoration:none" href="${url}" download="${esc(name)}" id="ssave">${t('shotSave')}</a>
    ${canShare ? `<button class="btn" style="margin-top:8px" id="sshare">${t('shotShare')}</button>` : ''}
    <button class="btn" style="margin-top:8px" id="sclose">${t('close')}</button>`, (o, close) => {
    const done = () => { close(); setTimeout(() => URL.revokeObjectURL(url), 60000); };
    o.querySelector('#ssave').addEventListener('click', () => setTimeout(() => toast(t('shotSaved')), 300));
    if (canShare) o.querySelector('#sshare').onclick = () => navigator.share({ files: [file] }).catch(() => {});
    o.querySelector('#sclose').onclick = done;
  });
}

/* ---------- photos ---------- */
async function addPhotos(files) {
  persist();
  const pid = S.dayPid, k = S.dayKey, arr = [...files];
  let ok = 0;
  for (let i = 0; i < arr.length; i++) {
    toast(arr.length > 1 ? t('addingN', i + 1, arr.length) : t(/^video\//.test(arr[i].type) ? 'addingVideo' : 'adding'), true);
    try {
      const photo = await store.upload(arr[i]);
      const cur = getDay(pid, k) || {};
      setDay(pid, k, { ...cur, photos: [...(cur.photos || []), photo] });
      ok++;
      if (S.view === 'day' && S.dayKey === k && S.dayPid === pid) render();
    } catch (e) {
      console.error(e);
      toast(t(e && e.code === 'unreadable' ? 'photoUnreadable' : e && e.code === 'undecodable' ? 'photoFormat' : 'addFail'));
    }
  }
  if (ok === arr.length) toast(ok > 1 ? t('addedN', ok) : t('added1'));
}
function shiftDay(n) { const { y, m, d } = parseKey(S.dayKey); const dt = new Date(y, m, d + n); S.dayKey = dkey(dt.getFullYear(), dt.getMonth(), dt.getDate()); S.idx = 0; render(); }
function shiftMonth(n) { const dt = new Date(S.y, S.m + n, 1); S.y = dt.getFullYear(); S.m = dt.getMonth(); render(); }

document.addEventListener('click', e => {
  const b = e.target.closest('button, [data-act]');
  if (!b || b.closest('.sheet') || b.closest('.editor')) return;
  const ds = b.dataset;
  if (ds.nav) { S.view = ds.nav; render(); window.scrollTo(0, 0); return; }
  if (ds.sel) { S.sel = ds.sel; render(); return; }
  if (ds.lang) { setLang(ds.lang); render(); return; }
  if (ds.day) { S.dayKey = ds.day; S.idx = 0; S.dayPid = S.sel; S.view = 'day'; render(); window.scrollTo(0, 0); return; }
  if (ds.dp) { S.dayPid = ds.dp; S.idx = 0; render(); return; }
  if (ds.th) { S.idx = +ds.th; const g = $('#gal'); if (g) g.scrollTo({ left: S.idx * g.clientWidth, behavior: 'smooth' }); return; }
  if (ds.edit) { editPerson(ds.edit); return; }
  switch (ds.act) {
    case 'prev': shiftMonth(-1); break;
    case 'next': shiftMonth(1); break;
    case 'addPerson': editPerson(null); break;
    case 'shot': shot(); break;
    case 'back': { const { y, m } = parseKey(S.dayKey); S.y = y; S.m = m; S.sel = S.dayPid; S.view = 'cal'; render(); break; }
    case 'dprev': shiftDay(-1); break;
    case 'dnext': shiftDay(1); break;
    case 'pick': $('#file').value = ''; $('#file').click(); break;
    case 'crop': openCrop(); break;
    case 'live': {
      const cur = getDay(S.dayPid, S.dayKey) || {};
      const on = !cur.live;
      const next = { ...cur, photos: cur.photos || [] };
      if (on) next.live = true; else delete next.live;
      setDay(S.dayPid, S.dayKey, next);
      render(); toast(t(on ? 'liveAdded' : 'liveRemoved'));
      break;
    }
    case 'backup': doBackup(); break;
    case 'restore': doRestore(); break;
    case 'install': if (installEvt) { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; render(); }); } break;
    case 'installHelp': installHelp(); break;
    case 'delPhoto':
      confirmSheet(t('delPhotoQ'), t('delPhotoText'), t('del'), () => {
        const p = S.dayPid, k = S.dayKey, cur = getDay(p, k) || {};
        const ph = [...(cur.photos || [])];
        const [gone] = ph.splice(S.idx, 1);
        setDay(p, k, { ...cur, photos: ph });
        if (gone) store.del(gone);
        S.idx = Math.max(0, S.idx - 1);
        render(); toast(t('photoDeleted'));
      });
      break;
  }
});
$('#file').addEventListener('change', e => { if (e.target.files.length) addPhotos(e.target.files); });

let tx0 = null, ty0 = null;
document.addEventListener('touchstart', e => {
  if ((S.view !== 'cal' && S.view !== 'stats') || !e.target.closest('#grid,.bars')) return;
  tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY;
}, { passive: true });
document.addEventListener('touchend', e => {
  if (tx0 === null) return;
  const dx = e.changedTouches[0].clientX - tx0, dy = e.changedTouches[0].clientY - ty0;
  tx0 = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) shiftMonth(dx < 0 ? 1 : -1);
}, { passive: true });

/* ---------- start ---------- */
function applyData(data) {
  S.people = data.people;
  S.months = data.months;
  S.ready = true;
  render();
  setTimeout(maybeInstallPopup, 800);
}
const loadingMsg = key => { $('#app').innerHTML = `<p class="small" style="text-align:center;margin-top:40vh">${t(key)}</p>`; };
loadingMsg('loading');
openStore()
  .then(async st => { store = st; applyData(await st.readAll()); })
  .catch(e => { console.error(e); loadingMsg('startFail'); });

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
