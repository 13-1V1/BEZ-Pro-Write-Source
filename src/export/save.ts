// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Save As: the system save dialog + file write inside Tauri; a download in a plain browser.

import { inTauri } from '../storage/store';

export type SaveResult = { saved: true; where: string } | { saved: false };

/** A safe default file name from the draft title. */
export function fileNameFor(title: string, ext: string): string {
  const base = title.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'My writing';
  return `${base}.${ext}`;
}

export async function saveAs(data: string | Uint8Array, name: string, filter: { name: string; ext: string }): Promise<SaveResult> {
  if (inTauri) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const path = await save({ defaultPath: name, filters: [{ name: filter.name, extensions: [filter.ext] }] });
    if (!path) return { saved: false };
    const fs = await import('@tauri-apps/plugin-fs');
    if (typeof data === 'string') await fs.writeTextFile(path, data);
    else await fs.writeFile(path, data);
    return { saved: true, where: path };
  }
  const blob = new Blob([data as BlobPart], { type: typeof data === 'string' ? 'text/plain' : 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return { saved: true, where: `Downloads\\${name}` };
}
