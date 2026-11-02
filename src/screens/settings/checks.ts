// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Settings → Checks: switch off any check you disagree with, and set how easy
// each type of writing should read. Saved to settings\prefs.json.

import { CHECK_INFO } from '../../checks';
import { CS, C_IDS } from '../../checks/cs';
import type { App } from '../../flow/app';
import { READING_TARGET_MAX, READING_TARGET_MIN, savePrefs } from '../../prefs/prefs';
import { h } from '../../ui/dom';
import { badge } from '../check';
import { saveNote } from './save-note';

const TARGET_STEP = 5;

function easeWords(n: number): string {
  // Flesch Reading Ease bands: 80+ easy, 70s fairly easy, 60s plain English.
  if (n >= 80) return 'easy';
  if (n >= 70) return 'fairly easy';
  if (n >= 60) return 'plain English';
  if (n >= 50) return 'a little formal';
  return 'formal';
}

export function checksPanel(app: App): HTMLElement {
  const prefs = app.data.prefs;
  const note = saveNote();
  const save = () => void note.run(savePrefs(prefs));

  const groups = C_IDS.map((c) => {
    const checks = Object.entries(CHECK_INFO).filter(([, ci]) => ci.c === c);
    return h('fieldset', { class: 'group check-toggles' },
      h('legend', null, badge(c), ` ${CS[c].name}`),
      checks.map(([id, ci]) =>
        h('label', { class: 'radio-pill' },
          h('input', { type: 'checkbox', checked: !prefs.disabledChecks.includes(id),
            on: { change: (e: Event) => {
              const on = (e.target as HTMLInputElement).checked;
              prefs.disabledChecks = on ? prefs.disabledChecks.filter((x) => x !== id) : [...prefs.disabledChecks, id];
              save();
            } } }),
          h('span', null, ci.label))));
  });

  const sliders = app.data.types.map((t) => {
    const id = `target-${t.id}`;
    const value = prefs.readingTargets[t.id] ?? t.readingTarget;
    const out = h('output', { for: id, class: 'target-out' }, `${value} (${easeWords(value)})`);
    const reset = h('button', { class: 'btn small', hidden: prefs.readingTargets[t.id] === undefined, on: { click: () => {
      delete prefs.readingTargets[t.id];
      slider.value = String(t.readingTarget);
      out.textContent = `${t.readingTarget} (${easeWords(t.readingTarget)})`;
      reset.hidden = true;
      save();
    } } }, 'Reset');
    const slider = h('input', { type: 'range', id, min: READING_TARGET_MIN, max: READING_TARGET_MAX, step: TARGET_STEP, value,
      on: { input: () => {
        const n = Number(slider.value);
        prefs.readingTargets[t.id] = n;
        out.textContent = `${n} (${easeWords(n)})`;
        reset.hidden = false;
        save();
      } } });
    return h('div', { class: 'target-row' }, h('label', { for: id }, t.name), slider, out, reset);
  });

  return h('div', null,
    h('h2', null, 'Checks'),
    note.el,
    h('p', { class: 'hint' }, 'Turn off anything you don\'t want pointed out. Spots from a check that\'s off don\'t show up and don\'t count against your style score.'),
    groups,
    h('h2', null, 'Readability goal'),
    h('p', { class: 'hint' }, 'How easy each kind of writing should read, from 30 (formal) to 80 (easy). Your readability score turns green at or above this number.'),
    h('div', { class: 'group' }, sliders));
}
