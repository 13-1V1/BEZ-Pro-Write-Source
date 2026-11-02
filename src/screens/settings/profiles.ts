// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Sender profiles: add, edit, delete. Saved to settings\profiles.json.

import type { App } from '../../flow/app';
import { blankProfile, PROFILE_LABELS, profileLabel, saveProfiles, type Profile } from '../../profiles/profiles';
import { saveNote } from './save-note';
import { PROFILE_FIELDS } from '../../types/schema';
import { h } from '../../ui/dom';

const HINTS: Record<string, string> = {
  name: 'e.g. Jordan Reyes',
  title: 'e.g. Office Manager (optional)',
  address: 'Street on one line, city/state/ZIP on the next',
  phone: 'e.g. (661) 555-0142',
  email: 'e.g. jordan.reyes@example.com',
  signature: 'Optional extra line, like a company name',
};

export function profilesPanel(app: App): HTMLElement {
  const panel = h('div', { class: 'profiles-panel' });
  let editingId: string | null = null;
  let confirmId: string | null = null;

  const note = saveNote();
  const persist = async () => {
    await note.run(saveProfiles(app.data.profiles));
  };

  function draw(): void {
    const list = app.data.profiles;
    panel.replaceChildren(h('div', null,
      h('h2', null, 'Sender profiles'),
      note.el,
      h('p', { class: 'hint' }, 'Save your own name, address, and contact info once. The app fills them into the signature and address parts for you, and you can still change them in each piece.'),
      list.length === 0 ? h('p', { class: 'muted' }, 'No profiles yet.') : null,
      h('ul', { class: 'profile-list' }, list.map((p) =>
        editingId === p.id ? h('li', null, editor(p)) : h('li', { class: 'profile-row' },
          h('div', { class: 'profile-info' },
            h('strong', null, profileLabel(p)),
            h('span', { class: 'muted' }, [p.phone, p.email].filter(Boolean).join(' · ') || 'No contact info')),
          h('button', { class: 'btn small', on: { click: () => { editingId = p.id; confirmId = null; draw(); } } }, 'Edit'),
          h('button', { class: 'btn small', on: { click: () => { confirmId = p.id; draw(); } } }, 'Delete'),
          confirmId === p.id
            ? h('div', { class: 'confirm-row' },
                h('span', null, `Delete “${profileLabel(p)}”? Drafts that used it keep their text.`),
                h('button', { class: 'btn danger', on: { click: async () => {
                  app.data.profiles = list.filter((x) => x.id !== p.id);
                  confirmId = null;
                  await persist();
                  draw();
                } } }, 'Yes, delete'),
                h('button', { class: 'btn', on: { click: () => { confirmId = null; draw(); } } }, 'Keep it'))
            : null))),
      editingId === 'new' ? editor(blankProfile()) : null,
      editingId === null
        ? h('button', { class: 'btn primary', on: { click: () => { editingId = 'new'; draw(); } } }, 'Add a profile')
        : null));
    panel.querySelector<HTMLElement>('.profile-editor input, .profile-editor textarea')?.focus();
  }

  function editor(p: Profile): HTMLElement {
    const working: Profile = { ...p };
    const err = h('p', { class: 'nav-msg', hidden: true });
    const fields = PROFILE_FIELDS.map((f) => {
      const id = `pf-${f}`;
      const attrs = { id, value: working[f], placeholder: HINTS[f], on: { input: (e: Event) => { working[f] = (e.target as HTMLInputElement).value; } } };
      return h('div', { class: 'field compact' },
        h('label', { for: id }, PROFILE_LABELS[f]),
        f === 'address' ? h('textarea', { ...attrs, rows: 3 }) : h('input', { ...attrs, type: 'text' }));
    });
    const save = async () => {
      if (!working.name.trim()) {
        err.textContent = 'Add your full name so the app can sign for you.';
        err.hidden = false;
        return;
      }
      const list = app.data.profiles;
      const i = list.findIndex((x) => x.id === working.id);
      if (i >= 0) list[i] = working;
      else list.push(working);
      editingId = null;
      await persist();
      draw();
    };
    return h('div', { class: 'profile-editor group' },
      h('h2', null, p.name ? `Edit ${p.name}` : 'New profile'),
      fields,
      err,
      h('div', { class: 'button-row' },
        h('button', { class: 'btn primary', on: { click: save } }, 'Save profile'),
        h('button', { class: 'btn', on: { click: () => { editingId = null; draw(); } } }, 'Cancel')));
  }

  draw();
  return panel;
}
