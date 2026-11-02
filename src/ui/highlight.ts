// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Draw a section's text with flagged words highlighted. Overlapping flags are
// split into segments; each highlighted segment is a focusable button that
// shows its C color AND letter badge(s), never color alone.
//
// Built for long pastes: one left-to-right sweep finds which flags cover each
// piece, elements are made directly (no helper), and one click handler on the
// container serves every highlight. Labels are capped at 40 characters. On a
// 10,000-word paste the all-C's view went from ~517 ms to ~130 ms (build ~717 → ~90);
// see tests/highlight.test.ts for the correctness guard.

import { CS, type CId } from '../checks/cs';
import type { Flag } from '../checks/types';

const LABEL_CHARS = 40;

/** Box-shadow underlines per set of C's, built once per combination. */
const shadowCache = new Map<string, string>();
function shadowsFor(cs: CId[]): string {
  const key = cs.join(',');
  let s = shadowCache.get(key);
  if (!s) {
    s = cs.map((c, n) => `inset 0 -${2 + n * 3}px 0 ${CS[c].color}`).join(', ');
    shadowCache.set(key, s);
  }
  return s;
}

/** `isCurrent` picks the spot being looked at right now; its highlight gets an outline (class "now"). */
export function renderHighlighted(text: string, flags: Flag[], onPick: (flags: Flag[]) => void, isCurrent?: (f: Flag) => boolean): HTMLElement {
  const spans = flags.filter((f) => f.end > f.start);
  const cuts = new Set<number>([0, text.length]);
  for (const f of spans) {
    cuts.add(f.start);
    cuts.add(f.end);
  }
  const points = [...cuts].sort((a, b) => a - b);

  const out = document.createElement('div');
  out.className = 'hl-text';
  const frag = document.createDocumentFragment();
  const covers: Flag[][] = [];

  // One sweep left to right: flags join the active set at their start and
  // leave at their end, instead of re-scanning every flag for every piece.
  const byStart = [...spans].sort((x, y) => x.start - y.start);
  let next = 0;
  let active: Flag[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    while (next < byStart.length && byStart[next].start <= a) active.push(byStart[next++]);
    if (active.length) active = active.filter((f) => f.end > a);
    const piece = text.slice(a, b);
    const covering = active.length ? active.filter((f) => f.end >= b) : active;
    if (covering.length === 0) {
      frag.append(piece);
      continue;
    }
    const cs = [...new Set(covering.map((f) => f.c))];
    // An inline span, not a <button>: buttons render as boxes with centered text,
    // which broke multi-line highlights apart. role/tabindex keep it keyboard-usable.
    const btn = document.createElement('span');
    // Every flag here marked "This one's fine": still there, but quiet.
    btn.className = covering.every((f) => f.fine) ? 'hl fine' : 'hl';
    if (isCurrent && covering.some(isCurrent)) btn.classList.add('now');
    btn.setAttribute('role', 'button');
    btn.tabIndex = 0;
    btn.dataset.i = String(covers.length);
    btn.style.setProperty('--hl', CS[cs[0]].color);
    btn.style.boxShadow = shadowsFor(cs);
    // Short labels: a wall-of-text flag's text is the whole paragraph, and copying
    // it into thousands of labels was the main cost on long pastes.
    const label = covering.map((f) => `${CS[f.c].name}: ${f.text.length > LABEL_CHARS ? `${f.text.slice(0, LABEL_CHARS)}…` : f.text}`).join('; ');
    btn.setAttribute('aria-label', `Flagged — ${label}. Press Enter to see why.`);
    btn.append(piece);
    // Badges go at the end of each flagged run, so each run shows its letters once.
    for (const c of new Set(covering.filter((f) => f.end === b).map((f) => f.c))) {
      const badge = document.createElement('span');
      badge.className = 'hl-badge';
      badge.style.background = CS[c].color;
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = CS[c].badge;
      btn.append(badge);
    }
    covers.push(covering);
    frag.append(btn);
  }

  out.append(frag);
  // One click handler for every highlight; Enter and Space are handled in keydown below.
  out.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.hl');
    if (btn && out.contains(btn)) onPick(covers[Number(btn.dataset.i)]);
  });
  // Enter or Space on a focused highlight explains it, like a button would.
  out.addEventListener('keydown', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.hl');
    if (!btn || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    onPick(covers[Number(btn.dataset.i)]);
  });
  return out;
}
