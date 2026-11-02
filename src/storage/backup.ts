// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Web version only: the writing lives in this browser, so let people save all of
// it to one file and load it back (a new computer, cleared browser data).

import { allFiles, restoreFiles } from './store';
import { fileNameFor, saveAs } from '../export/save';

const KIND = 'bez-pro-write-backup';

export interface Backup { kind: typeof KIND; made: string; files: Record<string, string> }

export function makeBackup(files: Record<string, string>, now = new Date()): Backup {
  return { kind: KIND, made: now.toISOString(), files };
}

/** The files inside a backup, or a plain-words reason it can't be used. */
export function readBackup(text: string): { files: Record<string, string> } | { problem: string } {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { problem: "That file isn't a BEZ Pro Write backup (it couldn't be read)." }; }
  const b = data as Partial<Backup> | null;
  if (!b || b.kind !== KIND || typeof b.files !== 'object' || b.files === null) return { problem: "That file isn't a BEZ Pro Write backup." };
  const files = Object.fromEntries(Object.entries(b.files).filter(([k, v]) => typeof v === 'string' && !k.includes('..')));
  return { files };
}

export async function downloadBackup(): Promise<number> {
  const files = await allFiles();
  const d = new Date();
  const day = `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
  await saveAs(JSON.stringify(makeBackup(files)), fileNameFor(`BEZ Pro Write backup ${day}`, 'json'), { name: 'Backup', ext: 'json' });
  return Object.keys(files).filter((f) => f.startsWith('drafts/')).length;
}

/** Ask for a backup file and load it. Returns a message to show, or null if nothing was picked. */
export async function loadBackup(): Promise<string | null> {
  const file = await pickJson();
  if (!file) return null;
  const got = readBackup(await file.text());
  if ('problem' in got) return got.problem;
  await restoreFiles(got.files);
  return 'Backup loaded. Reloading…';
}

function pickJson(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
