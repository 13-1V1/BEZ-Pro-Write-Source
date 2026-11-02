// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Word rules: pick a list, remove entries, add entries (with a replacement for
// "simpler words" and "wordy phrases"), or reset the list to the defaults.
// Changes apply right away and save to settings\wordlists.json.

import type { App } from '../../flow/app';
import { h } from '../../ui/dom';
import { defaultList, LIST_DEFS, LIST_IDS, saveListEdit, type ListId, type Pair } from '../../wordlists/load';

let current: ListId = 'filler';

export function wordRulesPanel(app: App): HTMLElement {
  const panel = h('div', { class: 'word-rules' });

  function draw(message = ''): void {
    const def = LIST_DEFS[current];
    const entries = app.data.lists[current] as string[] | Pair[];
    const isDefault = JSON.stringify(entries) === JSON.stringify(defaultList(current));

    const select = h('select', { id: 'list-pick', on: { change: (e: Event) => { current = (e.target as HTMLSelectElement).value as ListId; draw(); } } },
      LIST_IDS.map((id) => h('option', { value: id, selected: id === current }, LIST_DEFS[id].label)));

    const save = async (next: string[] | Pair[] | null, note: string) => {
      (app.data.lists as unknown as Record<string, unknown>)[current] = next ?? defaultList(current);
      let ok = true;
      await saveListEdit(current, next).catch((e) => { ok = false; console.error('Word list save failed', e); });
      draw(ok ? note : "Couldn't save this change. It works until you close the app, but won't be kept.");
    };

    const word = h('input', { type: 'text', id: 'rule-word', placeholder: def.pairs ? 'Word or phrase to point out' : 'Word or phrase' });
    const use = def.pairs ? h('input', { type: 'text', id: 'rule-use', placeholder: 'Simpler or shorter way to say it' }) : null;
    const add = async () => {
      const w = word.value.trim();
      const u = use?.value.trim() ?? '';
      if (!w) return draw('Type a word first.');
      if (def.pairs && !u) return draw('Add the simpler or shorter way to say it.');
      const exists = def.pairs
        ? (entries as Pair[]).some((p) => p.word.toLowerCase() === w.toLowerCase())
        : (entries as string[]).some((x) => x.toLowerCase() === w.toLowerCase());
      if (exists) return draw(`“${w}” is already on this list.`);
      const next = def.pairs ? [...(entries as Pair[]), { word: w, use: u }] : [...(entries as string[]), w];
      await save(next, `Added “${w}”.`);
      (panel.querySelector('#rule-word') as HTMLInputElement)?.focus();
    };
    const remove = async (i: number) => {
      const removed = def.pairs ? (entries as Pair[])[i].word : (entries as string[])[i];
      const next = (entries as unknown[]).filter((_, n) => n !== i) as string[] | Pair[];
      await save(next, `Removed “${removed}”.`);
    };

    const sorted = (entries as unknown[]).map((e, i) => ({ e, i })).sort((a, b) => label(a.e).localeCompare(label(b.e)));

    panel.replaceChildren(
      h('h2', null, 'Word rules'),
      h('p', { class: 'hint' }, 'These lists decide which words the 7 C\'s checks point out. Add your own, remove ones you don\'t want flagged, or reset a list.'),
      h('div', { class: 'field compact' }, h('label', { for: 'list-pick' }, 'List'), select),
      h('p', { class: 'muted' }, def.help, ` (${entries.length} entries${isDefault ? '' : ', edited by you'})`),
      h('div', { class: 'rule-add' }, word, use, h('button', { class: 'btn primary', on: { click: add } }, 'Add')),
      h('p', { class: 'rule-msg', role: 'status' }, message),
      h('ul', { class: 'chip-list', 'aria-label': `${def.label} entries` },
        sorted.map(({ e, i }) =>
          h('li', { class: 'chip' },
            h('span', null, label(e)),
            h('button', { class: 'chip-x', 'aria-label': `Remove ${label(e)}`, title: 'Remove', on: { click: () => void remove(i) } }, '×')))),
      h('button', { class: 'btn', disabled: isDefault, on: { click: () => void save(null, 'Reset to the default list.') } }, 'Reset this list to defaults'));

    for (const input of [word, use]) input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') void add(); });
  }

  draw();
  return panel;
}

function label(e: unknown): string {
  return typeof e === 'string' ? e : `${(e as Pair).word} → ${(e as Pair).use}`;
}
