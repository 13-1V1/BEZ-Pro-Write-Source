// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Pick a topic: each card shows its tone note and Do's and Don'ts.

import { autoTitle } from '../drafts/drafts';
import type { App, ScreenView } from '../flow/app';
import { h } from '../ui/dom';
import { lock } from '../ui/lock';

export function pickTopicScreen(app: App): ScreenView {
  const d = app.draft!;
  const type = app.type!;
  const pick = (id: string) => {
    d.topicId = id;
    autoTitle(d, type.name, app.topic?.name);
    app.changed();
    app.next();
  };
  const cards = type.topics.map((t) =>
    h('button', { class: `pick-card topic${d.topicId === t.id ? ' selected' : ''}`, 'aria-pressed': d.topicId === t.id ? 'true' : 'false', on: { click: () => pick(t.id) } },
      h('span', { class: 'pick-name' }, t.name),
      lock(h('span', { class: 'tone' }, t.tone)),
      lock(h('span', { class: 'dos-donts' },
        h('span', { class: 'dos' }, h('strong', null, 'Do'), h('ul', null, t.dos.map((x) => h('li', null, x)))),
        h('span', { class: 'donts' }, h('strong', null, 'Don\'t'), h('ul', null, t.donts.map((x) => h('li', null, x))))))));
  const body = h('div', null,
    h('h1', { tabindex: -1 }, `What kind of ${type.name.toLowerCase()}?`),
    h('p', { class: 'lead' }, 'Each one has its own tips. Read the Do\'s and Don\'ts, then pick.'),
    h('div', { class: 'pick-grid topics' }, cards));
  return {
    body,
    focus: body.querySelector<HTMLElement>('.pick-card.selected') ?? body.querySelector<HTMLElement>('.pick-card') ?? undefined,
    beforeNext: () => (app.topic ? null : 'Pick a topic to keep going.'),
  };
}
