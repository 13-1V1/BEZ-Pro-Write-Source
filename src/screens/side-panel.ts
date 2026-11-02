// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Right-hand panel: the small stats box, the practice situation, the topic's
// tone and Do's and Don'ts (so they stay in view while writing), and "Your plan".

import type { Relationship } from '../drafts/model';
import type { App } from '../flow/app';
import { computeStats } from '../scores/stats';
import { h } from '../ui/dom';
import { lock } from '../ui/lock';
import { scenarioById } from '../practice/practice';
import { RELATIONSHIP_LABELS } from './prep';
import { CS } from '../checks/cs';

export function sidePanel(app: App): HTMLElement {
  const d = app.draft!;
  const p = d.prep;
  const row = (label: string, value: string) =>
    value.trim() ? h('div', { class: 'plan-row' }, h('dt', null, label), h('dd', null, value)) : null;
  const facts = p.facts.split('\n').map((f) => f.trim()).filter(Boolean);
  const empty = !p.readerName && !p.readerRole && !p.relationship && !p.goal && facts.length === 0 && !p.deadline;

  const scenario = scenarioById(d.practiceId);
  return h('aside', { class: 'side', 'aria-label': 'Your plan and stats' },
    statsBox(app),
    scenario
      ? lock(h('section', { class: 'plan practice-box' }, h('h2', null, `Practice: ${scenario.title}`), h('p', null, scenario.situation),
          h('p', { class: 'muted' }, `This one works on ${CS[scenario.focus].name}: ${CS[scenario.focus].definition}`)))
      : null,
    topicBox(app),
    lock(h('section', { class: 'plan' },
      h('h2', null, 'Your plan'),
      empty
        ? h('p', { class: 'muted' }, 'Fill in the Plan step to see it here.')
        : h('dl', null,
            row('Reader', [p.readerName, p.readerRole].filter(Boolean).join(', ')),
            row('You know them as', p.relationship ? RELATIONSHIP_LABELS[p.relationship as Relationship] : ''),
            row('Goal', p.goal),
            facts.length ? h('div', { class: 'plan-row' }, h('dt', null, 'Key facts'), h('dd', null, h('ul', null, facts.map((f) => h('li', null, f))))) : null,
            row('Deadline', p.deadline)))));
}

/** The topic's tone note and Do's and Don'ts, which used to show only on the topic screen. */
function topicBox(app: App): HTMLElement | null {
  const t = app.topic;
  if (!t || (!t.tone && t.dos.length === 0 && t.donts.length === 0)) return null;
  return lock(h('details', { class: 'plan topic-box', open: true },
    h('summary', null, h('strong', null, `Topic: ${t.name}`)),
    t.tone ? h('p', { class: 'tone' }, t.tone) : null,
    t.dos.length ? h('div', { class: 'dos' }, h('strong', null, 'Do'), h('ul', null, t.dos.map((x) => h('li', null, x)))) : null,
    t.donts.length ? h('div', { class: 'donts' }, h('strong', null, "Don't"), h('ul', null, t.donts.map((x) => h('li', null, x)))) : null));
}

function statsBox(app: App): HTMLElement {
  const s = computeStats(app);
  const stat = (label: string, value: string, level?: string | null, note?: string) =>
    h('div', { class: `stat ${level ?? ''}` }, h('span', { class: 'stat-label' }, label), h('span', { class: 'stat-value' }, value), note ? h('span', { class: 'stat-note' }, note) : null);
  return h('section', { class: 'stats', 'aria-label': 'Stats' },
    stat('Words', String(s.words)),
    stat('Reading time', s.words ? `${s.minutes} min` : '—'),
    stat('Readability', s.reading === null ? '—' : String(s.reading), s.readingLevel, s.readingText),
    stat('Style score', s.style === null ? '—' : String(s.style), s.styleLevel, s.styleText));
}
