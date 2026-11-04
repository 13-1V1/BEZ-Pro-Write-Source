// Created by: Brennan Meyer with use of Claude Code 11/04/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// One two-minute drill: a locked bad line, a box, and the spots clearing as the
// learner rewrites it. Nothing here writes a word for them.

import type { App } from '../flow/app';
import { doneIn, drillClear, drillId, drillSpots, loadDoneDrills, nextLine, saveDoneDrills, spotRows, type DrillSet } from '../practice/drills';
import { h } from '../ui/dom';
import { lock } from '../ui/lock';

export function drillPage(app: App, back: () => void, set: DrillSet): HTMLElement {
  const { lists, prefs } = app.data;
  const spots = (text: string) => drillSpots(text, lists, prefs.disabledChecks);
  const body = h('div', { class: 'guide-body' }, h('p', { class: 'muted' }, 'Loading…'));
  let done = new Set<string>();

  const finished = () => {
    body.replaceChildren(
      h('p', { class: 'lead' }, `You finished all ${set.lines.length} drills in this set.`),
      h('div', { class: 'drill-acts' },
        h('button', { class: 'btn primary', on: { click: back } }, 'Back'),
        h('button', { class: 'btn', on: { click: () => { for (let i = 0; i < set.lines.length; i++) done.delete(drillId(set, i)); void saveDoneDrills(done); show(0); } } }, 'Do them again')));
  };

  const show = (i: number) => {
    const line = set.lines[i];
    const start = spots(line);
    const box = h('textarea', { id: 'drill-box', class: 'editor-input', rows: 4, spellcheck: false, 'aria-label': 'Your version of this line' });
    const list = h('ul', { class: 'items' });
    const count = h('span', { class: 'prog' });
    const next = h('button', { class: 'btn primary', disabled: true, on: { click: () => void advance(true) } }, 'Next drill ›');

    const later = () => {
      for (let n = i + 1; n < set.lines.length; n++) if (!done.has(drillId(set, n))) return n;
      return nextLine(set, done);
    };
    const advance = async (passed: boolean) => {
      if (passed) {
        done.add(drillId(set, i));
        await saveDoneDrills(done).catch((e) => console.error('Saving drills failed', e));
      }
      const n = later();
      if (n < 0 || (n === i && passed)) finished();
      else show(n);
    };

    const draw = () => {
      const rows = spotRows(start, spots(box.value));
      const left = rows.filter((r) => !r.cleared).length;
      count.textContent = `${rows.length - left} of ${rows.length} cleared`;
      list.replaceChildren(...rows.map((r) => h('li', { class: r.cleared ? 'done' : 'open' }, h('div', { class: 'row' },
        h('span', { class: 'mark', 'aria-hidden': 'true' }, r.cleared ? '✓' : '○'),
        h('span', { class: 'what' }, r.label),
        h('span', { class: 'sr-only' }, r.cleared ? ', cleared' : ', still to clear')))));
      next.disabled = !drillClear(rows, box.value, line);
    };
    box.addEventListener('input', draw);
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !next.disabled) { e.preventDefault(); void advance(true); }
    });

    body.replaceChildren(
      h('p', { class: 'muted' }, `Drill ${i + 1} of ${set.lines.length} · ${doneIn(set, done)} done`),
      lock(h('div', { class: 'examples drill-line' }, h('div', { class: 'example bad' }, h('span', { class: 'ex-label' }, 'Rewrite this'), h('p', null, line)))),
      h('label', { class: 'label', for: 'drill-box' }, 'Your version'),
      h('div', { class: 'editor' }, box),
      h('section', { class: 'card items-card drill-spots', 'aria-label': 'Spots still to clear' },
        h('div', { class: 'card-head' }, h('h2', null, 'Spots still to clear'), count), list),
      h('div', { class: 'drill-acts' }, next,
        h('button', { class: 'btn', on: { click: () => void advance(false) } }, 'Skip this one')));
    draw();
    box.focus();
  };

  void loadDoneDrills().then((saved) => {
    done = saved;
    const i = nextLine(set, done);
    if (i < 0) finished();
    else show(i);
  });

  return h('div', { class: 'settings-wrap' },
    h('div', { class: 'settings guide' },
      h('div', { class: 'settings-head' },
        h('h1', { tabindex: -1 }, set.title),
        h('button', { class: 'btn primary', on: { click: back } }, 'Back')),
      body));
}
