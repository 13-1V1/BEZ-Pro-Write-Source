// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Prep questions: plan before writing. Answers stay in the "Your plan" panel.

import { RELATIONSHIPS, type Prep, type Relationship } from '../drafts/model';
import type { App, ScreenView } from '../flow/app';
import { h } from '../ui/dom';
import { lock } from '../ui/lock';

export const RELATIONSHIP_LABELS: Record<Relationship, string> = {
  boss: 'My boss or manager',
  coworker: 'A coworker or classmate',
  customer: 'A customer, client, or business',
  stranger: 'Someone I don\'t know',
  teacher: 'A teacher or instructor',
};

export function prepScreen(app: App): ScreenView {
  const prep = app.draft!.prep;
  const bind = (key: keyof Prep) => (e: Event) => {
    (prep as unknown as Record<string, string>)[key] = (e.target as HTMLInputElement).value;
    app.changed();
    app.refreshSide();
  };
  const field = (key: keyof Prep, label: string, hint: string, input: HTMLElement) =>
    h('div', { class: 'field' },
      h('label', { for: `prep-${key}` }, label),
      lock(h('p', { class: 'hint', id: `prep-${key}-hint` }, hint)),
      input);
  const text = (key: keyof Prep, placeholder = '') =>
    h('input', { id: `prep-${key}`, type: 'text', value: prep[key], placeholder, 'aria-describedby': `prep-${key}-hint`, on: { input: bind(key) } });

  const relTips = h('div', { class: 'rel-tip', 'aria-live': 'polite' });
  const showTip = () => {
    const tip = app.data.relationships[prep.relationship as Relationship];
    relTips.replaceChildren(tip ? lock(h('p', null, h('strong', null, 'Tip: '), tip.tip)) : '');
  };
  const radios = h('div', { class: 'radio-row', role: 'radiogroup', 'aria-labelledby': 'rel-label' },
    RELATIONSHIPS.map((r) =>
      h('label', { class: 'radio-pill' },
        h('input', { type: 'radio', name: 'rel', value: r, checked: prep.relationship === r,
          on: { change: () => { prep.relationship = r; app.changed(); app.refreshSide(); showTip(); } } }),
        h('span', null, RELATIONSHIP_LABELS[r]))));
  showTip();

  const first = text('readerName', 'e.g. Ms. Alvarez');
  const body = h('div', { class: 'prep' },
    h('h1', { tabindex: -1 }, 'Plan before you write'),
    h('p', { class: 'lead' }, 'Answer these quickly. They keep you on track, and the app uses them to check your writing later. Skip any that don\'t apply.'),
    field('readerName', 'Who is reading this?', 'Their name, as you would write it. Leave blank if you don\'t know it.', first),
    field('readerRole', 'What is their role?', 'For example: landlord, hiring manager, my professor.', text('readerRole', 'e.g. Property manager')),
    h('div', { class: 'field' },
      h('span', { class: 'label', id: 'rel-label' }, 'Who are they to you?'),
      radios, relTips),
    field('goal', 'What do you want them to do or know after reading?', 'One sentence. This is the heart of your message.', text('goal', 'e.g. Email me a copy of my lease')),
    field('facts', 'Key facts', 'One per line: dates, times, places, numbers, names. The app checks that each one makes it into your writing.',
      h('textarea', { id: 'prep-facts', rows: 5, value: prep.facts, 'aria-describedby': 'prep-facts-hint', placeholder: 'e.g. Unit 4B\nOrder #4471', on: { input: bind('facts') } })),
    field('deadline', 'Deadline, if any', 'A real date, like "Friday, Nov 6."', text('deadline', 'e.g. Friday, Nov 6')));
  return { body, side: true, focus: first };
}
