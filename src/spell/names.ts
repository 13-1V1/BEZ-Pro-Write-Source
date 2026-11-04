// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// The reader's and sender's names, and My dictionary, are real words: teach them to Harper
// before any check (write-box underlines or the scores), so they're never spelling spots.

import type { App } from '../flow/app';
import { clearSpellCache } from './cache';
import { addKnownWords } from './harper';

/** Names the user typed in Prep or their profile, split into single words. */
export function namesFrom(app: App): string[] {
  const d = app.draft;
  const p = app.profile;
  const raw = [d?.prep.readerName, d?.prep.readerRole, p?.name, p?.title, p?.signature].filter(Boolean).join(' ');
  return raw.split(/[^A-Za-z'’-]+/).filter((w) => /^[A-Z]/.test(w));
}

export async function teachNames(app: App): Promise<void> {
  if (await addKnownWords([...namesFrom(app), ...app.data.lists['my-words']])) clearSpellCache();
}
