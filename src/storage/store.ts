// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Read/write small text files in the data folder (%APPDATA%\BEZ Pro Write\ on
// Windows, ~/Library/Application Support/BEZ Pro Write/ on a Mac).
// Inside Tauri this calls the Rust store. The web version (`vite build --mode web`)
// keeps files in the browser's IndexedDB, which holds far more than localStorage.
// Other plain-browser runs (test pages, `npm run dev`) use localStorage so
// screens can be tried fast.

import { invoke } from '@tauri-apps/api/core';
import { createStore, del, entries, get, keys, set, setMany } from 'idb-keyval';

export const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
/** The web version on the BEZ Works site (not the desktop app, not a test page). */
export const isWeb = !inTauri && import.meta.env.MODE === 'web';

const idb = isWeb ? createStore('bez-pro-write', 'files') : null;

const LS_PREFIX = 'bez:';

export async function readFile(rel: string): Promise<string | null> {
  if (inTauri) return invoke<string | null>('store_read', { rel });
  if (idb) return (await get<string>(rel, idb)) ?? null;
  return localStorage.getItem(LS_PREFIX + rel);
}

export async function writeFile(rel: string, content: string): Promise<void> {
  if (inTauri) return invoke('store_write', { rel, content });
  if (idb) return set(rel, content, idb);
  localStorage.setItem(LS_PREFIX + rel, content);
}

export async function listFiles(dir: string): Promise<string[]> {
  if (inTauri) return invoke<string[]>('store_list', { dir });
  if (idb) {
    const prefix = dir.replace(/\/$/, '') + '/';
    return (await keys<string>(idb))
      .filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes('/'))
      .map((k) => k.slice(prefix.length)).sort();
  }
  const prefix = LS_PREFIX + dir.replace(/\/$/, '') + '/';
  const names: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    if (key.startsWith(prefix) && !key.slice(prefix.length).includes('/')) names.push(key.slice(prefix.length));
  }
  return names.sort();
}

export async function deleteFile(rel: string): Promise<void> {
  if (inTauri) return invoke('store_delete', { rel });
  if (idb) return del(rel, idb);
  localStorage.removeItem(LS_PREFIX + rel);
}

export async function storeRoot(): Promise<string> {
  if (inTauri) return invoke<string>('store_root');
  if (isWeb) return 'this web browser, on this computer only';
  return '(browser test mode — localStorage)';
}

/** Web version: every saved file, for "Save a backup". */
export async function allFiles(): Promise<Record<string, string>> {
  if (!idb) return {};
  return Object.fromEntries((await entries<string, string>(idb)).filter(([, v]) => typeof v === 'string'));
}

/** Web version: put back the files from a backup (same names are replaced). */
export async function restoreFiles(files: Record<string, string>): Promise<void> {
  if (!idb) return;
  await setMany(Object.entries(files), idb);
}

/** Files that exist but couldn't be read as JSON this session (shown on Home). */
export const damagedFiles = new Set<string>();

export async function readJson<T>(rel: string): Promise<T | null> {
  const text = await readFile(rel);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    damagedFiles.add(rel);
    return null;
  }
}

export async function writeJson(rel: string, data: unknown): Promise<void> {
  // Never write over an unreadable file without keeping a copy of it first.
  if (damagedFiles.has(rel)) {
    const old = await readFile(rel);
    if (old !== null) await writeFile(`${rel}.damaged`, old);
    damagedFiles.delete(rel);
  }
  await writeFile(rel, JSON.stringify(data, null, 2));
}
