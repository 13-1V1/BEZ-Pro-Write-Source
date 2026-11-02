// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Pick which saved sender profile fills your name, address, and signature.
// Only shown when two or more profiles are saved.

import type { App, ScreenView } from '../flow/app';
import { profileLabel } from '../profiles/profiles';
import { h } from '../ui/dom';

export function pickProfileScreen(app: App): ScreenView {
  const d = app.draft!;
  const pick = (id: string) => {
    if (d.profileId !== id) {
      d.profileId = id;
      d.profileFilled = {};
    }
    app.changed();
    app.next();
  };
  const cards = app.data.profiles.map((p) =>
    h('button', { class: `pick-card${d.profileId === p.id ? ' selected' : ''}`, 'aria-pressed': d.profileId === p.id ? 'true' : 'false', on: { click: () => pick(p.id) } },
      h('span', { class: 'pick-name' }, profileLabel(p)),
      h('span', { class: 'pick-desc' }, [p.email, p.phone].filter(Boolean).join(' · ') || 'No contact info yet')));
  const body = h('div', null,
    h('h1', { tabindex: -1 }, 'Who is this from?'),
    h('p', { class: 'lead' }, 'Your saved info fills in your name and contact details. You can still change them while writing.'),
    h('div', { class: 'pick-grid' }, cards));
  return {
    body,
    focus: body.querySelector<HTMLElement>('.pick-card.selected') ?? body.querySelector<HTMLElement>('.pick-card') ?? undefined,
    beforeNext: () => (app.profile ? null : 'Pick who this is from to keep going.'),
  };
}
