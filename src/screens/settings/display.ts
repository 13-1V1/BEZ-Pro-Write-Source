// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Display settings: font size and spell underlines. Saved to settings/prefs.json.

import type { App } from '../../flow/app';
import { applyPrefs, savePrefs, type FontSize } from '../../prefs/prefs';
import { saveNote } from './save-note';
import { h } from '../../ui/dom';

const SIZES: { id: FontSize; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];

export function displayPanel(app: App): HTMLElement {
  const prefs = app.data.prefs;
  const note = saveNote();
  const save = () => {
    applyPrefs(prefs);
    void note.run(savePrefs(prefs));
  };
  return h('div', null,
    h('h2', null, 'Display'),
    note.el,
    h('fieldset', { class: 'group' },
      h('legend', null, 'Text size'),
      h('div', { class: 'radio-row' }, SIZES.map((s) =>
        h('label', { class: 'radio-pill' },
          h('input', { type: 'radio', name: 'font', value: s.id, checked: prefs.fontSize === s.id,
            on: { change: () => { prefs.fontSize = s.id; save(); } } }),
          h('span', null, s.label)))),
      h('p', { class: 'hint' }, 'Changes every screen right away.')),
    h('fieldset', { class: 'group' },
      h('legend', null, 'Spelling'),
      h('label', { class: 'radio-pill' },
        h('input', { type: 'checkbox', checked: prefs.spellUnderlines,
          on: { change: (e: Event) => { prefs.spellUnderlines = (e.target as HTMLInputElement).checked; save(); } } }),
        h('span', null, 'Underline spelling and grammar problems while I type')),
      h('p', { class: 'hint' }, 'Works offline. Nothing you write leaves this computer.')));
}
