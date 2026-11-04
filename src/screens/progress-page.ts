// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Your progress, the full page: style score over time, spots per C (lately
// and overall), how each kind of writing is going, and every finished piece.
// Opened from Home's "Your progress" panel.

import { CS, C_IDS } from '../checks/cs';
import { draftFileExists, loadDraft, savedAgo } from '../drafts/drafts';
import type { App } from '../flow/app';
import { byType, loadProgress, rate, RECENT, summarize, type ProgressRecord } from '../progress/progress';
import { h } from '../ui/dom';
import { badge } from './check';

const NS = 'http://www.w3.org/2000/svg';
const svg = (tag: string, attrs: Record<string, string | number>) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

/** Style score per finished piece, oldest to newest, with the 60 and 80 lines the scores turn yellow and green at. */
export function styleChart(list: ProgressRecord[]): SVGSVGElement | null {
  const pts = list.filter((r) => r.style !== null);
  if (pts.length < 2) return null;
  const W = 600, H = 160, L = 34, R = 8, T = 8, B = 20;
  const x = (i: number) => L + (i / (pts.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / 100) * (H - T - B);
  const chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'style-chart', role: 'img',
    'aria-label': `Style score over your last ${pts.length} finished pieces, from ${pts[0].style} to ${pts[pts.length - 1].style}.` }) as SVGSVGElement;
  for (const v of [0, 60, 80, 100]) {
    chart.append(svg('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: v === 0 || v === 100 ? 'axis' : 'band' }));
    const t = svg('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'tick' });
    t.textContent = String(v);
    chart.append(t);
  }
  chart.append(svg('polyline', { points: pts.map((r, i) => `${x(i)},${y(r.style!)}`).join(' '), class: 'line' }));
  pts.forEach((r, i) => chart.append(svg('circle', { cx: x(i), cy: y(r.style!), r: 3.5, class: 'dot' })));
  return chart;
}

export function progressPage(app: App, back: () => void): HTMLElement {
  const body = h('div', { class: 'guide-body' }, h('p', { class: 'muted' }, 'Loading…'));
  const typeName = (id: string | null) => app.data.types.find((t) => t.id === id)?.name ?? 'Other';

  void (async () => {
    const list = await loadProgress();
    if (list.length === 0) {
      body.replaceChildren(h('p', null, 'Finish a piece to start seeing your progress here.'));
      return;
    }
    const s = summarize(list);
    const chart = styleChart(list);
    body.replaceChildren(
      h('p', { class: 'lead' }, `${list.length} piece${list.length === 1 ? '' : 's'} finished${s.recentStyle !== null ? `. Average style score lately: ${s.recentStyle}.` : '.'}`),
      h('section', { class: 'guide-c' },
        h('h2', null, 'Style score over time'),
        chart ?? h('p', { class: 'muted' }, 'Finish two pieces of 30 words or more to see a line.'),
        h('p', { class: 'hint' }, 'Green at 80 and up, yellow from 60. Higher is better.')),
      h('section', { class: 'guide-c' },
        h('h2', null, 'Spots per 100 words, by C'),
        h('table', { class: 'score-table' },
          h('thead', null, h('tr', null, h('th', null, 'C'), h('th', null, `Last ${Math.min(RECENT, list.length)}`), h('th', null, 'All pieces'))),
          h('tbody', null, C_IDS.map((c) => {
            const recent = s.perC.find((p) => p.c === c)!.recentRate;
            const all = list.reduce((n, r) => n + rate(r, c), 0) / list.length;
            return h('tr', null, h('th', { scope: 'row' }, badge(c), ` ${CS[c].name}`), h('td', null, recent.toFixed(1)), h('td', null, all.toFixed(1)));
          }))),
        h('p', { class: 'hint' }, 'Fewer is better. Spots you marked "This one\'s fine" don\'t count.')),
      h('section', { class: 'guide-c' },
        h('h2', null, 'By kind of writing'),
        h('table', { class: 'score-table' },
          h('thead', null, h('tr', null, h('th', null, 'Kind'), h('th', null, 'Finished'), h('th', null, 'Average style'), h('th', null, 'Most spots in'))),
          h('tbody', null, byType(list).map((t) =>
            h('tr', null, h('th', { scope: 'row' }, typeName(t.typeId)), h('td', null, String(t.finished)),
              h('td', null, t.style === null ? '—' : String(t.style)),
              h('td', null, t.worst ? [badge(t.worst), ` ${CS[t.worst].name}`] : 'None')))))),
      h('section', { class: 'guide-c' },
        h('h2', null, 'Finished pieces'),
        h('ul', { class: 'version-list' }, [...list].reverse().map((r) =>
          h('li', { class: 'version-row' },
            h('span', { class: 'version-label' }, h('strong', null, typeName(r.typeId)),
              h('span', { class: 'muted' }, ` · ${savedAgo(r.at)} · ${r.words} words · style ${r.style ?? '—'}`)),
            h('button', { class: 'btn small', on: { click: async (e: Event) => {
              const d = await loadDraft(r.draftId).catch(() => null);
              if (d) return app.open(d);
              const btn = e.target as HTMLButtonElement;
              btn.textContent = (await draftFileExists(r.draftId)) ? "Can't open" : 'Deleted';
              btn.disabled = true;
            } } }, 'Open'))))));
  })();

  return h('div', { class: 'settings-wrap' },
    h('div', { class: 'settings guide' },
      h('div', { class: 'settings-head' },
        h('h1', { tabindex: -1 }, 'Your progress'),
        h('button', { class: 'btn primary', on: { click: back } }, 'Back')),
      body));
}
