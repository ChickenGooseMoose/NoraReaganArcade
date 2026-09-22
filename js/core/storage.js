import { createDefaultData, migrateData, normalizeData, STORAGE_VERSION } from './data.js';

export const STORAGE_KEY = 'pixel-arcade-save-v4';
const LEGACY_KEYS = ['pixel-arcade-save-v3', 'pixel-arcade-save-v2', 'pixel-arcade-save'];

export class ArcadeStorage {
  constructor(store = window.localStorage) { this.store = store; this.data = createDefaultData(); }

  load() {
    let raw = this.store.getItem(STORAGE_KEY);
    if (!raw) {
      for (const key of LEGACY_KEYS) {
        raw = this.store.getItem(key);
        if (raw) break;
      }
    }
    if (!raw) return this.data;
    try {
      this.data = migrateData(JSON.parse(raw));
      this.save();
    } catch (error) {
      console.warn('Saved progress could not be read; a safe new save was created.', error);
      this.data = createDefaultData();
    }
    return this.data;
  }

  save() {
    this.data.version = STORAGE_VERSION;
    this.data.meta.updatedAt = new Date().toISOString();
    try { this.store.setItem(STORAGE_KEY, JSON.stringify(this.data)); }
    catch (error) { console.warn('Progress could not be saved on this device.', error); }
    return this.data;
  }

  replace(candidate) { this.data = normalizeData(candidate); return this.save(); }
  reset() { this.data = createDefaultData(); return this.save(); }
  exportText() { return JSON.stringify({ app: 'Nora & Reagan Pixel Arcade', exportedAt: new Date().toISOString(), data: this.data }, null, 2); }
  importText(text) {
    const parsed = JSON.parse(text);
    const candidate = parsed?.data || parsed;
    if (!candidate || !Array.isArray(candidate.profiles)) throw new Error('This file is not a Pixel Arcade backup.');
    return this.replace(migrateData(candidate));
  }
}
