// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Pick a type: big cards with a "use this when…" line.

import { autoTitle } from '../drafts/drafts';
import type { App, ScreenView } from '../flow/app';
import { h } from '../ui/dom';
import { lock } from '../ui/lock';

export function pickTypeScreen(app: App): ScreenView {
  const d = app.draft!;
  const pick = (id: string) => {
    if (d.typeId !== id) {
      d.typeId = id;
      d.topicId = null;
      const t = app.type!;
      autoTitle(d, t.name);
    }
    app.changed();
    app.next();
  };
  const cards = app.data.types.filter((t) => !t.hidden || t.id === d.typeId).map((t) =>
    h('button', { class: `pick-card${d.typeId === t.id ? ' selected' : ''}`, 'aria-pressed': d.typeId === t.id ? 'true' : 'false', on: { click: () => pick(t.id) } },
      h('span', { class: 'pick-name' }, t.name),
      lock(h('span', { class: 'pick-desc' }, t.useWhen)),
      t.source === 'your folder' ? h('span', { class: 'tag' }, 'From your folder') : null));
  const body = h('div', null,
    h('h1', { tabindex: -1 }, 'What are you writing?'),
    h('p', { class: 'lead' }, 'Pick the one that fits best. You can come back and change it.'),
    h('div', { class: 'pick-grid' }, cards));
  return {
    body,
    focus: body.querySelector<HTMLElement>('.pick-card.selected') ?? body.querySelector<HTMLElement>('.pick-card') ?? undefined,
    beforeNext: () => (d.typeId && app.type ? null : 'Pick a type to keep going.'),
  };
}
