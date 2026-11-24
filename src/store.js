// On-device storage. Everything (people, days, notes, photos) is kept in this
// phone's browser storage (IndexedDB). Nothing is sent to any server.
import { Zip, ZipPassThrough, Unzip, UnzipInflate, strToU8 } from 'fflate';

const DB_NAME = 'photopub';
const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// Turn whatever the phone gives us into something we can draw. Reads the bytes
// first, so a photo that can't be downloaded (e.g. cloud-only while offline) fails
// here instead of being saved as a broken file. HEIC/HEIF photos are converted.
const loadImgEl = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
async function decode(file) {
  let bytes;
  try { bytes = new Blob([await file.arrayBuffer()], { type: file.type || 'image/jpeg' }); }
  catch (e) { const err = new Error('unreadable'); err.code = 'unreadable'; throw err; }
  try { return await createImageBitmap(bytes, { imageOrientation: 'from-image' }); } catch (e) {}
  try {
    const url = URL.createObjectURL(bytes);
    try { return await loadImgEl(url); } finally { URL.revokeObjectURL(url); }
  } catch (e) {}
  {
    try {
      const { default: heic2any } = await import('heic2any');
      const out = await heic2any({ blob: bytes, toType: 'image/jpeg', quality: 0.92 });
      return await createImageBitmap(Array.isArray(out) ? out[0] : out);
    } catch (e) {}
  }
  const err = new Error('undecodable'); err.code = 'undecodable'; throw err;
}
async function encode(src, max, quality) {
  const w = src.videoWidth || src.width, h = src.videoHeight || src.height;
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  const b = await new Promise(r => c.toBlob(r, 'image/jpeg', quality));
  if (!b || !b.size) throw new Error('encode failed');
  return b;
}
// First frame of a video as a JPEG thumbnail. Falls back to a plain tile with a
// play mark if this phone can't decode the video.
async function videoThumb(file) {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; setTimeout(() => rej(new Error('timeout')), 15000); });
    const at = Math.min(0.1, (v.duration || 1) / 2);
    if (v.currentTime !== at) await new Promise(res => { v.onseeked = res; v.currentTime = at; setTimeout(res, 4000); });
    if (!v.videoWidth) throw new Error('no frame');
    return await encode(v, 480, 0.8);
  } catch (e) {
    const c = document.createElement('canvas'); c.width = 270; c.height = 480;
    const x = c.getContext('2d'); x.fillStyle = '#444441'; x.fillRect(0, 0, 270, 480);
    x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(105, 200); x.lineTo(105, 280); x.lineTo(175, 240); x.fill();
    return await new Promise(r => c.toBlob(r, 'image/jpeg', 0.8));
  } finally { URL.revokeObjectURL(url); }
}
const isVideo = f => /^video\//.test(f.type || '') || /\.(mp4|mov|m4v|webm|3gp|mkv)$/i.test(f.name || '');
const CHUNK = 4 * 1024 * 1024;

async function prepare(file) {
  const src = await decode(file);
  return { full: await encode(src, 1600, 0.85), thumb: await encode(src, 480, 0.8) };
}

function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('docs'); r.result.createObjectStore('blobs'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
function req(db, st, mode, fn) {
  return new Promise((res, rej) => {
    const t = db.transaction(st, mode);
    const r = fn(t.objectStore(st));
    t.oncomplete = () => res(r && r.result);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  });
}
const zipAsync = files => new Promise((res, rej) => zip(files, { level: 0 }, (e, d) => (e ? rej(e) : res(d))));
const unzipAsync = data => new Promise((res, rej) => unzip(data, (e, d) => (e ? rej(e) : res(d))));

/** Ask the browser not to clear this app's data when the phone is low on space. */
export async function persist() {
  try {
    if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch (e) {}
}
export async function usage() {
  try { const e = await navigator.storage.estimate(); return e.usage || 0; } catch (e) { return 0; }
}

export async function openStore() {
  const db = await idbOpen();
  const urls = {};
  async function readAll() {
    const keys = await req(db, 'docs', 'readonly', s => s.getAllKeys());
    const vals = await req(db, 'docs', 'readonly', s => s.getAll());
    let people = [];
    const months = {};
    keys.forEach((k, i) => { if (k === 'people') people = vals[i].list || []; else if (String(k).startsWith('m_')) months[k] = vals[i].days || {}; });
    Object.values(urls).forEach(u => URL.revokeObjectURL(u));
    Object.keys(urls).forEach(k => delete urls[k]);
    const bk = await req(db, 'blobs', 'readonly', s => s.getAllKeys());
    const bv = await req(db, 'blobs', 'readonly', s => s.getAll());
    bk.forEach((k, i) => { urls[k] = URL.createObjectURL(bv[i]); });
    return { people, months };
  }
  async function put(id, file) {
    const { full, thumb } = await prepare(file);
    await req(db, 'blobs', 'readwrite', s => { s.put(full, id); s.put(thumb, id + '_t'); });
    [id, id + '_t'].forEach(k => { if (urls[k]) URL.revokeObjectURL(urls[k]); });
    urls[id] = URL.createObjectURL(full);
    urls[id + '_t'] = URL.createObjectURL(thumb);
  }
  return {
    readAll,
    save: (id, body) => req(db, 'docs', 'readwrite', s => s.put(body, id)),
    remove: id => req(db, 'docs', 'readwrite', s => s.delete(id)).catch(() => {}),
    async upload(file) {
      const id = newId();
      if (!isVideo(file)) { await put(id, file); return { id }; }
      // Videos are kept in their original quality. Check the file can be read
      // (e.g. not a cloud-only file while offline) before saving it.
      try { await file.slice(0, 1024).arrayBuffer(); }
      catch (e) { const err = new Error('unreadable'); err.code = 'unreadable'; throw err; }
      const thumb = await videoThumb(file);
      const type = file.type || 'video/mp4';
      const blob = file.type ? file : new Blob([file], { type });
      await req(db, 'blobs', 'readwrite', s => { s.put(blob, id); s.put(thumb, id + '_t'); });
      urls[id] = URL.createObjectURL(blob);
      urls[id + '_t'] = URL.createObjectURL(thumb);
      return { id, type: 'video' };
    },
    async replace(p, blob) { await put(p.id, blob); return p; },
    url: p => urls[p.id] || '',
    thumb: p => urls[p.id + '_t'] || urls[p.id] || '',
    load: async (p, kind) => urls[kind === 'full' ? p.id : p.id + '_t'] || urls[p.id] || '',
    del: p => req(db, 'blobs', 'readwrite', s => { s.delete(p.id); s.delete(p.id + '_t'); }).catch(() => {}),

    /** Everything in one .zip file: data.json, blobs.json and every photo/video.
     *  Written in pieces so large videos don't have to fit in memory at once. */
    async exportZip(onProgress, includeVideos = true) {
      const keys = await req(db, 'docs', 'readonly', s => s.getAllKeys());
      const vals = await req(db, 'docs', 'readonly', s => s.getAll());
      const docs = {};
      const videoIds = new Set();
      keys.forEach((k, i) => {
        let v = vals[i];
        if (String(k).startsWith('m_') && v && v.days) {
          const days = {};
          Object.entries(v.days).forEach(([dk, day]) => {
            const ph = (day.photos || []).filter(x => { if (x.type === 'video') { videoIds.add(x.id); return includeVideos; } return true; });
            days[dk] = { ...day, photos: ph };
          });
          v = { ...v, days };
        }
        docs[k] = v;
      });
      const parts = [];
      let failed = null;
      const zip = new Zip((e, chunk) => { if (e) failed = e; else if (chunk && chunk.length) parts.push(new Blob([chunk])); });
      const addSmall = (name, u8) => { const f = new ZipPassThrough(name); zip.add(f); f.push(u8, true); };
      addSmall('data.json', strToU8(JSON.stringify({ app: 'photopub', version: 2, savedAt: new Date().toISOString(), docs })));
      const bk = (await req(db, 'blobs', 'readonly', s => s.getAllKeys())).filter(k => includeVideos || !videoIds.has(k));
      const types = {};
      for (let i = 0; i < bk.length; i++) {
        const blob = await req(db, 'blobs', 'readonly', s => s.get(bk[i]));
        types[bk[i]] = blob.type || 'image/jpeg';
        const f = new ZipPassThrough(`blobs/${bk[i]}`);
        zip.add(f);
        if (!blob.size) f.push(new Uint8Array(0), true);
        for (let off = 0; off < blob.size; off += CHUNK) {
          f.push(new Uint8Array(await blob.slice(off, off + CHUNK).arrayBuffer()), off + CHUNK >= blob.size);
        }
        if (failed) throw failed;
        onProgress && onProgress(i + 1, bk.length);
      }
      addSmall('blobs.json', strToU8(JSON.stringify(types)));
      zip.end();
      if (failed) throw failed;
      return new Blob(parts, { type: 'application/zip' });
    },
    /** Replace everything on this phone with the contents of a backup file. */
    async importZip(file, onProgress) {
      const files = {};
      let failed = null;
      const uz = new Unzip();
      uz.register(UnzipInflate);
      uz.onfile = f => {
        const parts = [];
        files[f.name] = parts;
        f.ondata = (e, d) => { if (e) failed = e; else if (d && d.length) parts.push(new Blob([d])); };
        f.start();
      };
      if (!file.size) throw new Error('not a backup');
      for (let off = 0; off < file.size; off += CHUNK) {
        uz.push(new Uint8Array(await file.slice(off, off + CHUNK).arrayBuffer()), off + CHUNK >= file.size);
        if (failed) throw failed;
        onProgress && onProgress(Math.min(off + CHUNK, file.size), file.size);
      }
      if (!files['data.json']) throw new Error('not a backup');
      const data = JSON.parse(await new Blob(files['data.json']).text());
      if (data.app !== 'photopub' || !data.docs) throw new Error('not a backup');
      const types = files['blobs.json'] ? JSON.parse(await new Blob(files['blobs.json']).text()) : {};
      await req(db, 'docs', 'readwrite', s => { s.clear(); Object.entries(data.docs).forEach(([k, v]) => s.put(v, k)); });
      await req(db, 'blobs', 'readwrite', s => {
        s.clear();
        Object.entries(files).forEach(([name, parts]) => {
          const m = name.match(/^blobs\/(.+)$/) || name.match(/^photos\/(.+)\.jpg$/);
          if (m) s.put(new Blob(parts, { type: types[m[1]] || 'image/jpeg' }), m[1]);
        });
      });
      return readAll();
    }
  };
}
