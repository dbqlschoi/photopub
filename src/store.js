// On-device storage. Everything (people, days, notes, photos) is kept in this
// phone's browser storage (IndexedDB). Nothing is sent to any server.
import { zip, unzip, strToU8, strFromU8 } from 'fflate';

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
  const w = src.width, h = src.height;
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  const b = await new Promise(r => c.toBlob(r, 'image/jpeg', quality));
  if (!b || !b.size) throw new Error('encode failed');
  return b;
}
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
    async upload(file) { const id = newId(); await put(id, file); return { id }; },
    async replace(p, blob) { await put(p.id, blob); return p; },
    url: p => urls[p.id] || '',
    thumb: p => urls[p.id + '_t'] || urls[p.id] || '',
    load: async (p, kind) => urls[kind === 'full' ? p.id : p.id + '_t'] || urls[p.id] || '',
    del: p => req(db, 'blobs', 'readwrite', s => { s.delete(p.id); s.delete(p.id + '_t'); }).catch(() => {}),

    /** Everything in one .zip file: data.json plus every photo. */
    async exportZip(onProgress) {
      const keys = await req(db, 'docs', 'readonly', s => s.getAllKeys());
      const vals = await req(db, 'docs', 'readonly', s => s.getAll());
      const docs = {};
      keys.forEach((k, i) => { docs[k] = vals[i]; });
      const files = { 'data.json': strToU8(JSON.stringify({ app: 'photopub', version: 1, savedAt: new Date().toISOString(), docs })) };
      const bk = await req(db, 'blobs', 'readonly', s => s.getAllKeys());
      for (let i = 0; i < bk.length; i++) {
        const blob = await req(db, 'blobs', 'readonly', s => s.get(bk[i]));
        files[`photos/${bk[i]}.jpg`] = new Uint8Array(await blob.arrayBuffer());
        onProgress && onProgress(i + 1, bk.length);
      }
      return new Blob([await zipAsync(files)], { type: 'application/zip' });
    },
    /** Replace everything on this phone with the contents of a backup file. */
    async importZip(file) {
      const all = await unzipAsync(new Uint8Array(await file.arrayBuffer()));
      if (!all['data.json']) throw new Error('not a backup');
      const data = JSON.parse(strFromU8(all['data.json']));
      if (data.app !== 'photopub' || !data.docs) throw new Error('not a backup');
      await req(db, 'docs', 'readwrite', s => { s.clear(); Object.entries(data.docs).forEach(([k, v]) => s.put(v, k)); });
      await req(db, 'blobs', 'readwrite', s => {
        s.clear();
        Object.entries(all).forEach(([name, bytes]) => {
          const m = name.match(/^photos\/(.+)\.jpg$/);
          if (m) s.put(new Blob([bytes], { type: 'image/jpeg' }), m[1]);
        });
      });
      return readAll();
    }
  };
}
