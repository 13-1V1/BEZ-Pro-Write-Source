// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Word-by-word changes between two versions of the user's own writing, for the
// "What you changed" view. Read-only: it shows edits, it never makes them.

export type Change = { kind: 'same' | 'added' | 'removed'; text: string };

/** Words with the spaces after them kept, so joining the pieces gives the text back. */
const tokens = (s: string): string[] => s.match(/\S+\s*|\s+/g) ?? [];

/** Above this many word pairs the table gets too big; compare whole lines instead. */
const MAX_CELLS = 4_000_000;

export function diffWords(before: string, after: string): Change[] {
  let a = tokens(before);
  let b = tokens(after);
  if (a.length * b.length > MAX_CELLS) {
    a = before.split(/(?<=\n)/);
    b = after.split(/(?<=\n)/);
  }
  const same = (x: string, y: string) => x.trim() === y.trim();
  // Longest common run, filled from the end so the walk below goes forward.
  const w = b.length + 1;
  const lcs = new Uint32Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lcs[i * w + j] = same(a[i], b[j]) ? lcs[(i + 1) * w + j + 1] + 1 : Math.max(lcs[(i + 1) * w + j], lcs[i * w + j + 1]);

  const out: Change[] = [];
  const push = (kind: Change['kind'], text: string) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (same(a[i], b[j])) { push('same', b[j]); i++; j++; }
    else if (lcs[(i + 1) * w + j] >= lcs[i * w + j + 1]) push('removed', a[i++]);
    else push('added', b[j++]);
  }
  while (i < a.length) push('removed', a[i++]);
  while (j < b.length) push('added', b[j++]);
  return out;
}
