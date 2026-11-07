/*!
 * ALCYE CAR — ponte entre Oficina e Dinamômetro
 * localStorage (config/cv) + IndexedDB (snapshot 3D .glb do carro customizado)
 */
(function (global) {
  'use strict';
  const LS_SHARED = 'alcye.shared.v1';
  const LS_AUTOSAVE = 'golap.autosave';
  const IDB_NAME = 'alcye-car-db';
  const IDB_STORE = 'blobs';
  const IDB_KEY_GLB = 'car-snapshot-glb';
  const IDB_KEY_META = 'car-snapshot-meta';

  function lsGet(k, d) {
    try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; }
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB indisponível'));
    });
  }

  async function idbPut(key, value) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGet(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  const TUNING = {
    carb_brosol2e: { hp: 0, tq: 0 }, weber_40idf: { hp: 16, tq: 1.3 }, fueltech_ft450: { hp: 11, tq: 1.0 },
    turbo_masterpower: { hp: 62, tq: 7.6 }, samcams_276: { hp: 14, tq: 0.8 }, forged_internals: { hp: 10, tq: 0.6 },
    exh_original: { hp: 0, tq: 0 }, exh_4x1_carbon: { hp: 6, tq: 0.4 }, exh_4x1_inox: { hp: 9, tq: 0.6 }, exh_barenwald: { hp: 12, tq: 0.7 }
  };
  const BASE_HP = 99, BASE_TQ = 14.9;

  function computeStats(cfg) {
    if (!cfg) return { hp: BASE_HP, tq: BASE_TQ, turbo: false, syn: false };
    const on = cfg.on || {}, sel = cfg.sel || {};
    let hp = BASE_HP, tq = BASE_TQ;
    const ids = [sel.fuel, sel.exhaust, ...Object.keys(on).filter(k => on[k])].filter(Boolean);
    ids.forEach(id => { const it = TUNING[id]; if (it) { hp += it.hp || 0; tq += it.tq || 0; } });
    const syn = !!on.turbo_masterpower && sel.fuel === 'fueltech_ft450' && !!on.forged_internals;
    if (syn) { hp += 45; tq += 4.5; }
    return { hp, tq, turbo: !!on.turbo_masterpower, syn, colors: cfg.colors || null, sel, on };
  }

  function readConfig() {
    try {
      const shared = JSON.parse(lsGet(LS_SHARED, 'null'));
      if (shared && shared.config) return shared.config;
      if (shared && shared.sel) return shared;
      const auto = JSON.parse(lsGet(LS_AUTOSAVE, 'null'));
      return auto && auto.sel ? auto : null;
    } catch (e) { return null; }
  }

  function publishShared(cfg, stats) {
    const s = stats || computeStats(cfg);
    const payload = {
      v: 2,
      updated: Date.now(),
      name: 'Gol Quadrado 1.8 AP',
      vehicle: 'gol_ap',
      hp: Math.round(s.hp),
      tq: +(s.tq).toFixed(2),
      colors: (cfg && cfg.colors) || null,
      sel: (cfg && cfg.sel) || null,
      on: (cfg && cfg.on) || null,
      labor: (cfg && cfg.labor) || 20,
      model: (cfg && cfg.model) || { type: 'procedural' },
      config: cfg,
      hasSnapshot: false
    };
    lsSet(LS_SHARED, JSON.stringify(payload));
    return payload;
  }

  async function saveCarSnapshot(arrayBuffer, meta) {
    if (!arrayBuffer) return false;
    await idbPut(IDB_KEY_GLB, arrayBuffer);
    await idbPut(IDB_KEY_META, Object.assign({ saved: Date.now() }, meta || {}));
    try {
      const shared = JSON.parse(lsGet(LS_SHARED, '{}')) || {};
      shared.hasSnapshot = true;
      shared.snapshotAt = Date.now();
      lsSet(LS_SHARED, JSON.stringify(shared));
    } catch (e) {}
    return true;
  }

  async function loadCarSnapshot() {
    const buf = await idbGet(IDB_KEY_GLB);
    const meta = await idbGet(IDB_KEY_META);
    return buf ? { buffer: buf, meta: meta || {} } : null;
  }

  global.ALCYEBridge = {
    LS_SHARED, LS_AUTOSAVE, BASE_HP, BASE_TQ,
    computeStats, readConfig, publishShared,
    saveCarSnapshot, loadCarSnapshot,
    lsGet, lsSet
  };
})(typeof window !== 'undefined' ? window : globalThis);
