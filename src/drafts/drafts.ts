// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Save, list, load, and delete drafts in the data folder's drafts/ folder.

import { deleteFile, listFiles, readJson, writeJson } from '../storage/store';
import type { Section } from '../types/schema';
import { deleteSnapshots } from './snapshots';
import { normalizeDraft, type Draft } from './model';

const path = (id: string) => `drafts/${id}.json`;

/** Only marks the draft saved once the file is really written, so "Saved" never lies. */
export async function saveDraft(d: Draft): Promise<void> {
  const before = d.saved;
  d.saved = Date.now();
  try {
    await writeJson(path(d.id), d);
  } catch (e) {
    d.saved = before;
    throw e;
  }
}

export async function loadDraft(id: string): Promise<Draft | null> {
  const raw = await readJson<Partial<Draft>>(path(id));
  return raw && typeof raw.id === 'string' ? normalizeDraft(raw) : null;
}

export interface DraftList {
  drafts: Draft[];
  /** Draft files that exist but couldn't be read, so Home can say so instead of hiding them. */
  unreadable: string[];
}

export async function listDrafts(): Promise<DraftList> {
  const names = (await listFiles('drafts')).filter((n) => n.endsWith('.json'));
  // A file that isn't text at all makes the read itself fail; one bad file never hides the rest.
  const loaded = await Promise.all(names.map((n) => loadDraft(n.slice(0, -5)).catch(() => null)));
  const drafts = loaded.filter((d) => d !== null).sort((a, b) => b.saved - a.saved);
  return { drafts, unreadable: names.filter((_, i) => !loaded[i]) };
}

/** Tells a damaged draft from a deleted one, since loadDraft gives nothing for both. */
export async function draftFileExists(id: string): Promise<boolean> {
  try {
    return (await listFiles('drafts')).includes(`${id}.json`);
  } catch {
    return true;
  }
}

export async function deleteDraft(id: string): Promise<void> {
  await deleteFile(path(id));
  await deleteSnapshots(id);
}

/** "Email · Request · Oct 28, 2026, 9:05 AM" — stops updating once the user renames it. */
export function autoTitle(d: Draft, typeName?: string, topicName?: string): void {
  if (d.titleCustom) return;
  const when = new Date(d.created).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  d.title = [typeName ?? 'New writing', topicName, when].filter(Boolean).join(' · ');
}

const PREVIEW_WORDS = 10;

/**
 * A short line to tell drafts apart on Home: the subject/title line if there is
 * one, otherwise the first words of the first part with real sentences.
 */
export function draftPreview(d: Draft, sections: Section[]): string {
  const filled = sections.filter((s) => (d.text[s.id] ?? '').trim() && !d.skipped[s.id]);
  const titled = filled.find((s) => s.role === 'header' && s.prefix);
  if (titled) return d.text[titled.id].trim().split('\n')[0];
  const body = filled.find((s) => s.role === 'body' || s.role === 'ask');
  if (!body) return '';
  const words = d.text[body.id].trim().split(/\s+/);
  return words.length > PREVIEW_WORDS ? `${words.slice(0, PREVIEW_WORDS).join(' ')}…` : words.join(' ');
}

export function savedAgo(ms: number): string {
  if (!ms) return 'not saved yet';
  return new Date(ms).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
