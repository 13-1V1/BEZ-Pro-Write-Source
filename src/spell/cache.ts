// Created by: Brennan Meyer with use of Claude Code 10/29/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// One shared cache of Harper results, so the write-box underlines and the live
// scores never check the same text twice, and the scores only ask for a check
// once typing pauses (not on every keystroke).

import { checkSpelling, type SpellIssue } from './harper';

const MAX_ENTRIES = 200;
export const IDLE_MS = 500;

const cache = new Map<string, SpellIssue[]>();
const inFlight = new Map<string, Promise<SpellIssue[]>>();
/** Bumped when the cache is cleared, so a check started before the clear isn't cached after it. */
let generation = 0;
let failed = false;

/** True after Harper failed to check something; failed results are never cached. */
export function spellUnavailable(): boolean {
  return failed;
}

/** Results already in hand for exactly this text, or undefined. */
export function cachedSpelling(text: string): SpellIssue[] | undefined {
  return cache.get(text);
}

/** Check a text (or join a check already running for it), then cache the result. */
export function spellingFor(text: string): Promise<SpellIssue[]> {
  const hit = cache.get(text);
  if (hit) return Promise.resolve(hit);
  const running = inFlight.get(text);
  if (running) return running;
  const gen = generation;
  const job = checkSpelling(text)
    .then((issues) => {
      failed = false;
      if (gen !== generation) return issues;
      if (cache.size >= MAX_ENTRIES) cache.clear();
      cache.set(text, issues);
      return issues;
    })
    .catch((e) => {
      failed = true;
      throw e;
    })
    .finally(() => inFlight.delete(text));
  inFlight.set(text, job);
  return job;
}

/** Forget every result, e.g. after new names were added to the dictionary. */
export function clearSpellCache(): void {
  cache.clear();
  inFlight.clear();
  generation++;
}

let idleTimer: ReturnType<typeof setTimeout> | undefined;
let wanted: string[] = [];

/**
 * Ask for these texts to be checked once the user stops typing for IDLE_MS.
 * Each call replaces the previous wish list, so only the latest text is checked.
 */
export function checkWhenIdle(texts: string[], onDone: () => void, before?: () => Promise<void>): void {
  wanted = texts.filter((t) => !cache.has(t));
  clearTimeout(idleTimer);
  if (wanted.length === 0) return;
  idleTimer = setTimeout(async () => {
    const batch = wanted;
    wanted = [];
    try {
      await before?.();
      await Promise.all(batch.map(spellingFor));
    } catch (e) {
      // Don't redraw (which would ask again, forever); screens say spelling is unavailable.
      console.warn('Spell check unavailable', e);
      return;
    }
    onDone();
  }, IDLE_MS);
}
