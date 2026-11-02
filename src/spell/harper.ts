// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Harper (offline spelling + grammar) wrapper. Loads lazily in a web worker
// the first time it's needed, so app start stays fast.

import type { Linter } from 'harper.js';

export interface SpellIssue {
  start: number;
  end: number;
  kind: string;
  message: string;
  suggestions: string[];
}

/** Harper lint kinds we show. Style-type kinds are left to our own 7 C's checks. */
const SHOWN_KINDS = new Set(['Spelling', 'Typo', 'Grammar', 'Agreement', 'Punctuation', 'Repetition', 'BoundaryError', 'Eggcorn', 'Malapropism', 'Usage', 'WordOrder']);

let linterPromise: Promise<Linter> | null = null;
let knownWords = new Set<string>();
let loaded = false;

/** True once the spell checker has started loading but isn't ready yet. */
export function spellLoading(): boolean {
  return linterPromise !== null && !loaded;
}

function getLinter(): Promise<Linter> {
  linterPromise ??= (async () => {
    const { WorkerLinter, Dialect } = await import('harper.js');
    const { binary } = await import('harper.js/binary');
    const linter = new WorkerLinter({ binary, dialect: Dialect.American });
    await linter.setup();
    loaded = true;
    return linter;
  })();
  return linterPromise;
}

/** Start loading Harper in the background (call when a write screen opens). */
export function warmUp(): void {
  void getLinter().catch(() => undefined);
}

/**
 * Teach Harper names the user already gave us (reader, profile) so they aren't flagged.
 * Returns true if any new word was added (so cached results may be out of date).
 */
export async function addKnownWords(words: string[]): Promise<boolean> {
  const fresh = words.map((w) => w.trim()).filter((w) => w.length > 1 && !knownWords.has(w));
  if (fresh.length === 0) return false;
  fresh.forEach((w) => knownWords.add(w));
  const linter = await getLinter();
  await linter.importWords(fresh);
  return true;
}

/** Harper spans count Unicode characters; JavaScript strings count UTF-16 units. */
function charToUnitIndex(text: string): (i: number) => number {
  if (!/[\uD800-\uDFFF]/.test(text)) return (i) => i;
  const map: number[] = [];
  let unit = 0;
  for (const ch of text) {
    map.push(unit);
    unit += ch.length;
  }
  map.push(unit);
  return (i) => map[Math.min(i, map.length - 1)];
}

export async function checkSpelling(text: string): Promise<SpellIssue[]> {
  if (!text.trim()) return [];
  const linter = await getLinter();
  const lints = await linter.lint(text, { language: 'plaintext' });
  const toUnit = charToUnitIndex(text);
  const out: SpellIssue[] = [];
  for (const lint of lints) {
    const kind = lint.lint_kind();
    if (!SHOWN_KINDS.has(kind)) continue;
    const span = lint.span();
    out.push({
      start: toUnit(span.start),
      end: toUnit(span.end),
      kind,
      message: lint.message(),
      suggestions: lint.suggestions().map((s) => s.get_replacement_text()).filter(Boolean).slice(0, 3),
    });
  }
  return out;
}
