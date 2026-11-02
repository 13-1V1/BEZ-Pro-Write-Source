// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Extra tools on the Check something I wrote screen: open a .txt or Word file
// the user wrote, and mark which pasted paragraph is the greeting, the Ask, or
// the closing, so those checks can run too. The words stay exactly as written.

import { paragraphs } from '../checks/text';
import { TAG_ROLES, type TagRole } from '../checks/tagged';
import type { Draft } from '../drafts/model';
import { pickFile } from '../export/open-file';
import type { App } from '../flow/app';
import { h } from '../ui/dom';

const ROLE_LABEL: Record<TagRole | 'body', string> = { body: 'Body', greeting: 'Greeting', ask: 'Ask (what you want them to do)', closing: 'Closing' };

export function ownTools(app: App, d: Draft, sectionId: string): { el: HTMLElement; refresh(): void } {
  const msg = h('p', { class: 'nav-msg', role: 'status', hidden: true });
  const say = (text: string) => { msg.textContent = text; msg.hidden = false; };
  const confirm = h('div', { class: 'confirm-row', hidden: true });

  const load = (text: string, name: string) => {
    d.text[sectionId] = text;
    d.tags = {};
    app.changed();
    app.render();
    app.say(`Opened "${name}". Every word is yours; the checks only point at spots.`);
  };
  const open = async () => {
    const r = await pickFile();
    if (!r) return;
    if (!r.ok) return say(r.message);
    if (!(d.text[sectionId] ?? '').trim()) return load(r.text, r.name);
    confirm.replaceChildren(
      h('span', null, `Replace what's in the box with "${r.name}"?`),
      h('button', { class: 'btn primary', on: { click: () => load(r.text, r.name) } }, 'Yes, replace it'),
      h('button', { class: 'btn', on: { click: () => (confirm.hidden = true) } }, 'Keep what I have'));
    confirm.hidden = false;
  };

  const list = h('ol', { class: 'tag-list' });
  const refresh = () => {
    const text = d.text[sectionId] ?? '';
    const paras = paragraphs(text);
    list.replaceChildren(...paras.map((p, i) => {
      const id = `tag-${i}`;
      return h('li', null,
        h('label', { for: id, class: 'tag-text' }, p.text.length > 70 ? `${p.text.slice(0, 70)}…` : p.text),
        h('select', { id, on: { change: (e: Event) => {
          const v = (e.target as HTMLSelectElement).value as TagRole | 'body';
          if (v === 'body') delete d.tags[String(i)];
          else d.tags[String(i)] = v;
          app.changed();
        } } },
          (['body', ...TAG_ROLES] as const).map((r) => h('option', { value: r, selected: (d.tags[String(i)] ?? 'body') === r }, ROLE_LABEL[r]))));
    }));
    if (paras.length === 0) list.append(h('li', { class: 'muted' }, 'Paste or open your writing first.'));
  };
  refresh();

  const el = h('div', { class: 'own-tools' },
    h('p', null, h('button', { class: 'btn small', on: { click: () => void open() } }, 'Open a file I wrote (.txt or Word)…')),
    confirm,
    msg,
    h('details', { class: 'group' },
      h('summary', null, 'Which paragraph is which? (optional)'),
      h('p', { class: 'hint' }, 'Mark your greeting, your Ask, and your closing, and the app checks those too: a name in the greeting, a clear request, and a polite sign-off. Leave a blank line between paragraphs.'),
      list));
  return { el, refresh };
}
