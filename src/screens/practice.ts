// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// The Practice page: pick a made-up situation and write it start to finish.
// Shows levels, what's done, what's locked, and a recommended next one.

import { CS } from '../checks/cs';
import type { App } from '../flow/app';
import { finishedIds, practiceDraft, recommend, SCENARIOS, TO_UNLOCK, unlockedLevel, type Scenario } from '../practice/practice';
import { loadProgress, summarize } from '../progress/progress';
import { h } from '../ui/dom';
import { lock } from '../ui/lock';
import { badge } from './check';

const LEVEL_NAMES: Record<number, string> = { 1: 'Level 1 — Everyday emails', 2: 'Level 2 — Trickier asks', 3: 'Level 3 — Formal pieces' };

export function practicePage(app: App, back: () => void): HTMLElement {
  const body = h('div', { class: 'guide-body' }, h('p', { class: 'muted' }, 'Loading…'));
  void (async () => {
    const records = await loadProgress();
    const done = finishedIds(records);
    const open = unlockedLevel(records);
    const next = recommend(records, summarize(records).focus);
    const levels = [...new Set(SCENARIOS.map((s) => s.level))].sort();

    const card = (s: Scenario) => {
      const locked = s.level > open;
      const typeName = app.data.types.find((t) => t.id === s.typeId)?.name ?? s.typeId;
      return h('button', {
        class: `pick-card practice-card${s.id === next?.id ? ' selected' : ''}`,
        disabled: locked,
        on: { click: () => app.open(practiceDraft(s)) },
      },
        h('span', { class: 'pick-name' }, s.title,
          done.has(s.id) ? h('span', { class: 'tag done' }, 'Done') : null,
          s.id === next?.id ? h('span', { class: 'tag' }, 'Try this next') : null),
        h('span', { class: 'pick-desc' }, `${typeName} · works on `, badge(s.focus), ` ${CS[s.focus].name}`),
        lock(h('span', { class: 'situation' }, locked ? `Finish ${TO_UNLOCK} at the level before this one to open it.` : s.situation)));
    };

    body.replaceChildren(
      lock(h('p', { class: 'lead' }, 'Practice on made-up situations. Each one fills in your plan — who you\'re writing to and the key facts — and you write every word. Your scores count toward your progress.')),
      ...levels.map((level) =>
        h('section', { class: 'practice-level' },
          h('h2', null, LEVEL_NAMES[level] ?? `Level ${level}`, level > open ? h('span', { class: 'tag' }, 'Locked') : null),
          h('div', { class: 'pick-grid topics' }, SCENARIOS.filter((s) => s.level === level).map(card)))));
  })();

  return h('div', { class: 'settings-wrap' },
    h('div', { class: 'settings guide' },
      h('div', { class: 'settings-head' },
        h('h1', { tabindex: -1 }, 'Practice'),
        h('button', { class: 'btn primary', on: { click: back } }, 'Back')),
      body));
}
