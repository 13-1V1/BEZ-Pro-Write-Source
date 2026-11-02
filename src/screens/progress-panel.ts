// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Home's "Your progress" panel: pieces finished, which C's are getting better,
// and the one C to work on next (with a link to it in the guide).

import { CS } from '../checks/cs';
import type { App } from '../flow/app';
import { loadProgress, RECENT, summarize, type Trend } from '../progress/progress';
import { h } from '../ui/dom';
import { lock } from '../ui/lock';
import { badge } from './check';
import { guidePage } from './guide';
import { practicePage } from './practice';
import { progressPage } from './progress-page';

const TREND_TEXT: Record<Trend, string> = { better: 'getting better', worse: 'needs a look', same: 'steady', new: '' };

export function progressPanel(app: App): HTMLElement {
  const panel = h('section', { class: 'card-panel progress-panel', hidden: true });
  void (async () => {
    const list = await loadProgress();
    if (list.length === 0) return;
    const s = summarize(list);
    const most = Math.max(...s.perC.map((p) => p.recentRate), 1);
    const openGuide = (c: string) => void app.goPage((a, back) => {
      const page = guidePage(a, back);
      queueMicrotask(() => page.querySelector(`#guide-${c}`)?.scrollIntoView());
      return page;
    });
    panel.replaceChildren(
      h('h2', null, 'Your progress'),
      h('p', { class: 'progress-totals' },
        h('strong', null, `${s.finished} piece${s.finished === 1 ? '' : 's'} finished`),
        s.recentStyle !== null ? ` · average style score lately: ${s.recentStyle}` : ''),
      s.focus
        ? h('p', { class: 'focus' }, 'Work on next: ', badge(s.focus), ` ${CS[s.focus].name} — `, lock(h('span', null, CS[s.focus].definition)), ' ',
            h('button', { class: 'link-btn', on: { click: () => openGuide(s.focus!) } }, 'How?'))
        : h('p', { class: 'focus good' }, 'No C stands out in your last pieces. Nice work.'),
      h('ul', { class: 'c-bars', 'aria-label': `Spots per 100 words over your last ${Math.min(RECENT, s.finished)} pieces` },
        s.perC.map((p) =>
          h('li', null,
            h('span', { class: 'c-bar-name' }, badge(p.c), ` ${CS[p.c].name}`),
            h('span', { class: 'c-bar-track', 'aria-hidden': 'true' },
              h('span', { class: 'c-bar-fill', style: `width:${(p.recentRate / most) * 100}%; background:${CS[p.c].color}` })),
            h('span', { class: `c-bar-num trend-${p.trend}` },
              `${p.recentRate.toFixed(1)} per 100 words${TREND_TEXT[p.trend] ? ` · ${TREND_TEXT[p.trend]}` : ''}`)))),
      h('p', null,
        h('button', { class: 'link-btn', on: { click: () => void app.goPage(progressPage) } }, 'See all your progress'),
        ' · ',
        h('button', { class: 'link-btn', on: { click: () => void app.goPage(practicePage) } }, 'Practice on a made-up situation')),
      h('p', { class: 'hint' }, `Fewer spots is better. Based on your last ${Math.min(RECENT, s.finished)} finished piece${s.finished === 1 ? '' : 's'}.`));
    panel.hidden = false;
  })();
  return panel;
}
