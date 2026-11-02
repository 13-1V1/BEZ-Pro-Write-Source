// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// The 7 C's guide: a read-only reference, one click away from anywhere.
// Explains each C, every check the app makes (from data/checks.json), and the
// writing frameworks (from data/frameworks.json), and what the two scores mean.
// All teaching text is locked.

import { CHECK_INFO } from '../checks';
import { CS, C_IDS } from '../checks/cs';
import type { App } from '../flow/app';
import lessonData from '../../data/lessons.json';
import { FRAMEWORKS } from '../frameworks/frameworks';
import { h } from '../ui/dom';
import { lock } from '../ui/lock';
import { badge } from './check';

export function guidePage(app: App, back: () => void): HTMLElement {
  const off = new Set(app.data.prefs.disabledChecks);
  const toc = h('nav', { class: 'guide-toc', 'aria-label': 'Guide sections' },
    C_IDS.map((c) => h('a', { href: `#guide-${c}` }, badge(c), ` ${CS[c].name}`)),
    h('a', { href: '#guide-reader' }, 'Write for your reader'),
    h('a', { href: '#guide-scores' }, 'Your scores'),
    h('a', { href: '#guide-frameworks' }, 'Frameworks'));

  const cSections = C_IDS.map((c) => {
    const info = CS[c];
    const checks = Object.entries(CHECK_INFO).filter(([, ci]) => ci.c === c);
    return h('section', { class: 'guide-c', id: `guide-${c}` },
      h('h2', null, badge(c), ` ${info.name}`),
      lock(h('p', { class: 'definition' }, info.definition)),
      h('h3', null, 'Ask yourself'),
      lock(h('ul', null, info.questions.map((q) => h('li', null, q)))),
      h('h3', null, 'What the app points out'),
      lock(h('dl', { class: 'guide-checks' }, checks.map(([id, ci]) => [
        h('dt', null, ci.label, off.has(id) ? h('span', { class: 'muted' }, ' (turned off in Settings)') : null),
        h('dd', null, ci.why, h('br'), h('span', { class: 'try' }, 'Try: '), ci.try),
      ]))));
  });

  const lessons = h('section', { id: 'guide-reader', class: 'guide-c' },
    h('h2', null, 'Write for your reader'),
    lessonData.lessons.map((l) =>
      h('div', { class: 'guide-fw' },
        h('h3', null, l.title),
        lock(h('ul', null, l.points.map((p) => h('li', null, p)))),
        'good' in l && l.good
          ? lock(h('div', { class: 'examples' },
              h('div', { class: 'example good' }, h('span', { class: 'ex-label' }, 'Good example'), h('p', null, l.good)),
              h('div', { class: 'example bad' }, h('span', { class: 'ex-label' }, 'Not like this'), h('p', null, l.bad))))
          : null)),
    h('p', { class: 'muted' }, lessonData.source));

  const scores = h('section', { id: 'guide-scores', class: 'guide-c' },
    h('h2', null, 'Your scores'),
    lock(h('dl', { class: 'guide-checks' },
      h('dt', null, 'Readability (0 to 100)'),
      h('dd', null, 'How easy your sentences are to read, from the length of your sentences and words. Higher is easier. Most work writing aims for 60 or more. It turns green at the goal for that kind of writing, which you can change in Settings > Checks.'),
      h('dt', null, 'Style score (0 to 100)'),
      h('dd', null, 'Starts at 100 and drops for each spot the checks point out, compared with how long your piece is. Spelling and grammar (Correct) count double. Linking-word hints (Coherent) and notes about missing facts don\'t count, so you can finish your draft first.'),
      h('dt', null, 'Spots flagged'),
      h('dd', null, 'Every place the app points at, hints and notes included. A spot is a place to look again, not a mistake for sure. If you look and decide to keep it, click it and choose "This one\'s fine": it stays grayed out and stops counting.'))),
    lock(h('p', { class: 'hint' }, 'Both scores wait until you have 30 words or more.')));

  const frameworks = h('section', { id: 'guide-frameworks', class: 'guide-c' },
    h('h2', null, 'Writing frameworks'),
    lock(h('p', { class: 'definition' }, 'Some parts of a piece use a framework: a few short boxes, each with one question, that add up to one strong paragraph.')),
    Object.values(FRAMEWORKS).map((fw) =>
      h('div', { class: 'guide-fw' },
        h('h3', null, fw.name),
        lock(h('p', null, fw.intro)),
        lock(h('ol', null, fw.parts.map((p) => h('li', null, h('strong', null, p.label), ` — ${p.question}`)))))));

  return h('div', { class: 'settings-wrap' },
    h('div', { class: 'settings guide' },
      h('div', { class: 'settings-head' },
        h('h1', { tabindex: -1 }, 'The 7 C\'s guide'),
        h('button', { class: 'btn primary', on: { click: back } }, 'Back')),
      h('div', { class: 'guide-body' },
        lock(h('p', { class: 'lead' }, 'Professional writing is easier when you check it seven ways. Here is what each C means and what the app looks for.')),
        toc, cSections, lessons, scores, frameworks)));
}
