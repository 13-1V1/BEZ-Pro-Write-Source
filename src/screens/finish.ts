// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Finish: final full view, title rename, export buttons, and the scorecard
// (which C's got all "yes" answers, readability, style score).

import { CS, C_IDS } from '../checks/cs';
import { flagsFor, spotsIn } from '../checks/run';
import { loadSnapshots } from '../drafts/snapshots';
import { assemble } from '../export/assemble';
import type { App, ScreenView } from '../flow/app';
import { computeStats } from '../scores/stats';
import { h } from '../ui/dom';
import { speakButton } from '../ui/speak';
import { badge } from './check';
import { exportButtons } from './export-buttons';
import { versionsPanel } from './versions';

export function finishScreen(app: App): ScreenView {
  const d = app.draft!;
  const piece = assemble(d, app.sections);
  const stats = computeStats(app);
  const flags = flagsFor(app);

  const rows = C_IDS.map((c) => {
    const info = CS[c];
    const answers = d.checklist[c] ?? {};
    const yes = info.questions.filter((_, i) => answers[i] === 'yes').length;
    const no = info.questions.filter((_, i) => answers[i] === 'no').length;
    const total = info.questions.length;
    const status = yes === total ? 'All yes' : no > 0 ? `${no} to look at` : yes > 0 ? 'Partly answered' : 'Not answered';
    const level = yes === total ? 'green' : no > 0 ? 'yellow' : '';
    const spots = flags.filter((f) => f.c === c && !f.fine).length;
    return h('tr', null,
      h('th', { scope: 'row' }, badge(c), ` ${info.name}`),
      h('td', { class: `score-${level}` }, yes === total ? `✓ ${status}` : status, h('span', { class: 'muted' }, ` (${yes} of ${total} yes)`)),
      h('td', null, spots === 0 ? 'None' : String(spots),
        h('button', { class: 'btn small', on: { click: () => app.go(`check:${c}`) } }, 'Review')));
  });

  const titleInput = h('input', { type: 'text', id: 'draft-title', value: d.title,
    on: { input: (e: Event) => { d.title = (e.target as HTMLInputElement).value || 'Untitled'; d.titleCustom = true; app.changed(); } } });

  const body = h('div', { class: 'finish' },
    h('h1', { tabindex: -1 }, 'You did it'),
    h('p', { class: 'lead' }, 'Read it over one last time, then copy, save, or print it.'),
    fixedNote(app),
    h('div', { class: 'field' }, h('label', { for: 'draft-title' }, 'Name this draft'), titleInput),
    exportButtons(app, piece.text),
    h('p', null, speakButton(() => piece.text)),
    h('pre', { class: 'preview final', 'aria-label': 'Your finished piece' }, piece.text || 'Nothing written yet.'),
    h('section', { class: 'scorecard' },
      h('h2', null, 'Scorecard'),
      h('div', { class: 'score-totals' },
        h('div', { class: `stat ${stats.readingLevel ?? ''}` }, h('span', { class: 'stat-label' }, 'Readability'),
          h('span', { class: 'stat-value' }, stats.reading === null ? '—' : String(stats.reading)), h('span', { class: 'stat-note' }, stats.readingText)),
        h('div', { class: `stat ${stats.styleLevel ?? ''}` }, h('span', { class: 'stat-label' }, 'Style score'),
          h('span', { class: 'stat-value' }, stats.style === null ? '—' : String(stats.style)), h('span', { class: 'stat-note' }, stats.styleText)),
        h('div', { class: 'stat' }, h('span', { class: 'stat-label' }, 'Words'), h('span', { class: 'stat-value' }, String(stats.words)),
          h('span', { class: 'stat-note' }, stats.words ? `${stats.minutes} min read` : 'Nothing written yet'))),
      h('table', { class: 'score-table' },
        h('thead', null, h('tr', null, h('th', null, 'C'), h('th', null, 'Your answers'), h('th', null, 'Spots flagged'))),
        h('tbody', null, rows))),
    versionsPanel(app));
  return { body, side: false };
}

/**
 * "You cleared N spots yourself": spots on the words when the 7 C's check
 * started, against now. Every change was the writer's own; this makes it visible.
 */
function fixedNote(app: App): HTMLElement {
  const note = h('p', { class: 'fixed-note', hidden: true });
  const d = app.draft!;
  void loadSnapshots(d.id).then((list) => {
    const before = [...list].reverse().find((s) => s.label === "Before the 7 C's check");
    if (!before || app.draft !== d) return;
    const cleared = spotsIn(app, before.text) - spotsIn(app, d.text);
    if (cleared <= 0) return;
    note.textContent = `Since you started the 7 C's check, you cleared ${cleared} spot${cleared === 1 ? '' : 's'} yourself. Every change was yours.`;
    note.hidden = false;
  });
  return note;
}
