// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Earlier versions of a draft's writing ("before the 7 C's check", "finished",
// or saved by hand), kept in snapshots\<draft id>.json. Restoring brings back
// the user's own earlier words — nothing is written for them.

import { deleteFile, readJson, writeJson } from '../storage/store';
import type { Draft } from './model';

export const MAX_SNAPSHOTS = 20;

export interface Snapshot {
  at: number;
  label: string;
  text: Record<string, string>;
  parts: Record<string, Record<string, string>>;
}

const path = (draftId: string) => `snapshots/${draftId}.json`;

/** The last snapshot save, so a list loaded right after a step change includes it. */
let pending: Promise<unknown> = Promise.resolve();

function isSnapshot(v: unknown): v is Snapshot {
  const s = v as Snapshot;
  return !!s && typeof s.at === 'number' && typeof s.label === 'string' && typeof s.text === 'object' && s.text !== null;
}

export async function loadSnapshots(draftId: string): Promise<Snapshot[]> {
  await pending.catch(() => undefined);
  const raw = await readJson<unknown[]>(path(draftId));
  return Array.isArray(raw) ? raw.filter(isSnapshot).map((s) => ({ ...s, parts: s.parts ?? {} })) : [];
}

const sameWriting = (a: Snapshot, d: Draft) => JSON.stringify(a.text) === JSON.stringify(d.text);
export const hasWriting = (d: Draft) => Object.values(d.text).some((t) => t.trim());

/** Pure: the list with a new snapshot added — skipped if nothing changed since the last one. */
export function withSnapshot(list: Snapshot[], d: Draft, label: string, now = Date.now()): Snapshot[] {
  if (!hasWriting(d)) return list;
  const last = list[list.length - 1];
  if (last && sameWriting(last, d)) return list;
  const snap: Snapshot = { at: now, label, text: { ...d.text }, parts: JSON.parse(JSON.stringify(d.parts)) };
  return [...list, snap].slice(-MAX_SNAPSHOTS);
}

/** Save a snapshot of the draft's writing. Returns true if one was added. */
export function addSnapshot(d: Draft, label: string): Promise<boolean> {
  // Copy the writing now, not after the storage read, so later typing can't leak in.
  const frozen = { ...d, text: { ...d.text }, parts: JSON.parse(JSON.stringify(d.parts)) } as Draft;
  const job = (async () => {
    const list = await loadSnapshots(frozen.id);
    const next = withSnapshot(list, frozen, label);
    if (next === list) return false;
    await writeJson(path(frozen.id), next);
    return true;
  })();
  pending = job;
  return job;
}

/** Put an earlier version's writing back into the draft (after saving the current one). */
export async function restoreSnapshot(d: Draft, snap: Snapshot): Promise<void> {
  await addSnapshot(d, 'Before restoring an earlier version');
  d.text = { ...snap.text };
  d.parts = JSON.parse(JSON.stringify(snap.parts));
}

export async function deleteSnapshots(draftId: string): Promise<void> {
  await deleteFile(path(draftId));
}
