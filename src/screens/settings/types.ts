// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Settings → Writing types: save a copy of any type into the data folder's
// types/ folder, as a starting file to edit by hand (the installed app has
// its built-in types inside it, so there's nothing else to copy from).

import type { App } from '../../flow/app';
import type { LoadedType, WritingType } from '../../types/schema';
import { listFiles, storeRoot, writeJson } from '../../storage/store';
import { h } from '../../ui/dom';

/** The type as a plain file: the loader's own bookkeeping (source, file) left out. */
export function typeFileFor(t: LoadedType, id: string): WritingType & { _header: string } {
  const { source: _source, file: _file, ...rest } = t;
  return {
    _header: 'Your copy of a BEZ Pro Write type. Change the text, then restart the app. A file with the same "id" as a built-in type replaces it.',
    ...rest,
    id,
    name: `${t.name} (my copy)`,
    hidden: false,
  };
}

/** "email-copy", or "email-copy-2" if that name is taken. */
export function freeId(base: string, taken: Set<string>): string {
  let id = `${base}-copy`;
  for (let n = 2; taken.has(id); n++) id = `${base}-copy-${n}`;
  return id;
}

export function typesPanel(app: App): HTMLElement {
  const msg = h('p', { class: 'rule-msg', role: 'status' });
  const folder = h('code', null, '…');
  void storeRoot().then((p) => (folder.textContent = p)).catch(() => (folder.textContent = '(the data folder)'));

  const save = async (t: LoadedType) => {
    try {
      const files = await listFiles('types');
      const taken = new Set([...app.data.types.map((x) => x.id), ...files.map((f) => f.replace(/\.json$/i, ''))]);
      const id = freeId(t.id, taken);
      await writeJson(`types/${id}.json`, typeFileFor(t, id));
      msg.textContent = `Saved as types/${id}.json in the data folder. Edit it in Notepad or TextEdit, then restart the app to see "${t.name} (my copy)".`;
    } catch (e) {
      console.error('Saving a type copy failed', e);
      msg.textContent = "Couldn't save the copy. Check that the data folder isn't read-only.";
    }
  };

  const rows = app.data.types.filter((t) => !t.hidden).map((t) =>
    h('li', { class: 'profile-row' },
      h('div', { class: 'profile-info' },
        h('strong', null, t.name),
        h('span', { class: 'muted' }, t.source === 'your folder' ? `From your types folder (${t.file})` : 'Built in')),
      h('button', { class: 'btn small', on: { click: () => void save(t) } }, 'Save a copy I can edit')));

  return h('div', null,
    h('h2', null, 'Writing types'),
    h('p', { class: 'hint' }, 'Want your own kind of writing, or different tips? Save a copy of a type, change its words in a text editor, and restart the app. If a file has a mistake, Home tells you what to fix.'),
    h('p', { class: 'muted' }, 'Copies go in the types folder inside: ', folder),
    msg,
    h('ul', { class: 'profile-list' }, rows));
}
