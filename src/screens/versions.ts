// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// "Earlier versions" on the Finish screen: view any saved version of the
// writing, and restore it (the current version is saved first, so nothing is lost).

import { savedAgo } from '../drafts/drafts';
import { loadSnapshots, restoreSnapshot, type Snapshot } from '../drafts/snapshots';
import { assemble } from '../export/assemble';
import { diffWords } from '../drafts/diff';
import type { App } from '../flow/app';
import { countWords } from '../scores/words';
import { h } from '../ui/dom';

export function versionsPanel(app: App): HTMLElement {
  const panel = h('section', { class: 'versions' }, h('h2', null, 'Earlier versions'), h('p', { class: 'muted' }, 'Loading…'));
  void draw();
  return panel;

  async function draw(): Promise<void> {
    const d = app.draft;
    if (!d) return;
    const list = (await loadSnapshots(d.id)).reverse();
    const viewer = h('pre', { class: 'preview version-view', hidden: true });
    const rows = list.map((s) => row(s, viewer));
    panel.replaceChildren(
      h('h2', null, 'Earlier versions'),
      list.length === 0
        ? h('p', { class: 'muted' }, 'None yet. A version is saved when you start the 7 C\'s check and when you finish, or any time from File → "Save a version to come back to."')
        : h('p', { class: 'hint' }, 'Look back at your writing from before your changes. Restoring saves your current version first, so you can always switch back.'),
      h('ul', { class: 'version-list' }, rows),
      viewer);
  }

  function row(s: Snapshot, viewer: HTMLElement): HTMLElement {
    const d = app.draft!;
    // Same parts the live word count uses: this type's sections, not leftovers from another type.
    const words = countWords(app.sections.map((sec) => s.text[sec.id] ?? '').join(' '));
    const confirm = h('div', { class: 'confirm-row', hidden: true },
      h('span', null, 'Replace your current writing with this version? Your current version is saved first.'),
      h('button', { class: 'btn primary', on: { click: async () => {
        await restoreSnapshot(d, s);
        app.changed();
        await app.flush();
        app.render();
      } } }, 'Yes, restore it'),
      h('button', { class: 'btn', on: { click: () => (confirm.hidden = true) } }, 'Cancel'));
    return h('li', { class: 'version-row' },
      h('span', { class: 'version-label' }, h('strong', null, s.label), h('span', { class: 'muted' }, ` · ${savedAgo(s.at)} · ${words} words`)),
      h('button', { class: 'btn small', on: { click: () => {
        viewer.hidden = false;
        viewer.textContent = assemble({ ...d, text: s.text }, app.sections).text || '(empty)';
        viewer.scrollIntoView({ block: 'nearest' });
      } } }, 'View'),
      h('button', { class: 'btn small', on: { click: () => {
        // What you changed: this version against the writing now, word by word.
        const then = assemble({ ...d, text: s.text }, app.sections).text;
        const now = assemble(d, app.sections).text;
        viewer.hidden = false;
        viewer.replaceChildren(
          h('span', { class: 'diff-key' }, h('del', null, 'crossed out'), ' = taken out since then, ', h('ins', null, 'underlined'), ' = added since then\n\n'),
          ...diffWords(then, now).map((c) => (c.kind === 'same' ? c.text : h(c.kind === 'added' ? 'ins' : 'del', null, c.text))));
        viewer.scrollIntoView({ block: 'nearest' });
      } } }, 'What I changed since'),
      h('button', { class: 'btn small', on: { click: () => { confirm.hidden = false; } } }, 'Restore'),
      confirm);
  }
}
