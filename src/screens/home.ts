// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Home: start new writing, find/resume/copy/delete a recent draft, open Settings.

import { autoTitle, deleteDraft, draftPreview, listDrafts, savedAgo } from '../drafts/drafts';
import { sectionsFor } from '../types/merge';
import { newDraft, type Draft } from '../drafts/model';
import { copyAsNew, ownWritingDraft } from '../drafts/reuse';
import { draftMatches } from '../drafts/search';
import type { App } from '../flow/app';
import { STAGE_NAMES, type Stage } from '../flow/steps';
import { h } from '../ui/dom';
import { isWeb } from '../storage/store';
import { problemBanner } from './problems';
import { progressPanel } from './progress-panel';
import { practicePage } from './practice';

export function homeScreen(app: App): HTMLElement {
  const list = h('ul', { class: 'draft-list', 'aria-label': 'Recent drafts' }, h('li', { class: 'muted' }, 'Loading…'));
  const search = h('input', { type: 'search', id: 'draft-search', class: 'draft-search', placeholder: 'Search your drafts (name, reader, or words you wrote)',
    'aria-label': 'Search your drafts', on: { input: () => filterRows(list, search.value) } });
  void fillDrafts(app, list).then(() => filterRows(list, search.value));

  const start = h('button', { class: 'btn primary huge', on: { click: () => app.open(newDraft()) } }, 'Start new writing');
  const checkOwn = h('button', { class: 'btn huge', title: "Paste something you already wrote and run the 7 C's checks on it",
    on: { click: () => app.open(ownWritingDraft()) } }, 'Check something I wrote');
  const page = h('div', { class: 'home' },
    h('header', { class: 'home-head' },
      h('div', null,
        h('h1', { class: 'brand' }, 'BEZ Pro Write'),
        h('p', { class: 'lead' }, 'Write a professional email, memo, letter, cover letter, or short report, one easy step at a time. You type every word; we show you how.')),
      h('button', { class: 'btn', on: { click: () => void app.goSettings() } }, 'Settings…')),
    problemBanner(app),
    isWeb ? webNote(app) : null,
    h('div', { class: 'start-row' }, start, checkOwn,
      h('button', { class: 'btn huge', title: 'Practice on made-up situations; your scores count toward your progress',
        on: { click: () => void app.goPage(practicePage) } }, 'Practice')),
    progressPanel(app),
    h('section', { class: 'card-panel' },
      h('h2', null, 'Pick up where you left off'),
      search,
      list));
  queueMicrotask(() => start.focus());
  return page;
}

/** Web version: where the writing lives, and the desktop app for people who want files. */
function webNote(app: App): HTMLElement {
  return h('p', { class: 'web-note' },
    'Your writing is saved in this browser only. ',
    h('button', { class: 'link-btn', on: { click: () => void app.goSettings('backup') } }, 'Save a backup'),
    ' now and then, or ',
    h('a', { href: '../../#bez-pro-write', target: '_top' }, 'get the desktop app'),
    '.');
}

function stageOf(d: Draft): string {
  const stage = d.stepKey.split(':')[0] as Stage;
  return STAGE_NAMES[stage] ?? '';
}

/** Each row's search test, so typing in the box only shows matching drafts. */
const rowTests = new WeakMap<HTMLElement, (query: string) => boolean>();

/** Hide rows that don't match the search box; say so when nothing does. */
function filterRows(list: HTMLElement, query: string): void {
  let shown = 0;
  for (const row of list.querySelectorAll<HTMLElement>('.draft-row')) {
    const match = rowTests.get(row)?.(query) ?? true;
    row.hidden = !match;
    if (match) shown++;
  }
  let none = list.querySelector<HTMLElement>('.no-match');
  if (!none) {
    none = h('li', { class: 'muted empty no-match', hidden: true }, 'No drafts match that search.');
    list.append(none);
  }
  none.hidden = shown > 0 || list.querySelectorAll('.draft-row').length === 0;
}

async function fillDrafts(app: App, list: HTMLElement): Promise<void> {
  const drafts = await listDrafts();
  list.replaceChildren();
  if (drafts.length === 0) {
    list.append(h('li', { class: 'muted empty' }, 'No drafts yet. Your writing saves itself as you go.'));
    return;
  }
  for (const d of drafts) {
    const type = app.data.types.find((t) => t.id === d.typeId);
    const topic = type?.topics.find((t) => t.id === d.topicId);
    autoTitle(d, type?.name, topic?.name);
    const preview = type ? draftPreview(d, sectionsFor(type, topic)) : '';
    const confirmRow = h('div', { class: 'confirm-row', hidden: true },
      h('span', null, `Delete “${d.title}”? This can't be undone.`),
      h('button', { class: 'btn danger', on: { click: async () => { await deleteDraft(d.id); void fillDrafts(app, list); } } }, 'Yes, delete'),
      h('button', { class: 'btn', on: { click: () => { confirmRow.hidden = true; } } }, 'Keep it'));
    const row = h('li', { class: 'draft-row' },
        h('button', { class: 'draft-open', on: { click: () => app.open(d) } },
          h('span', { class: 'draft-name' }, d.title),
          preview ? h('span', { class: 'draft-preview' }, `“${preview}”`) : null,
          h('span', { class: 'muted' }, `${d.saved ? `Saved ${savedAgo(d.saved)}` : 'Not saved yet'} · ${stageOf(d)}`)),
        h('button', { class: 'btn ghost', title: 'Start a new draft with the same type, sender, and plan — the writing starts empty',
          'aria-label': `New draft from ${d.title}`, on: { click: () => app.open(copyAsNew(d)) } }, 'New from this'),
        h('button', { class: 'btn ghost', 'aria-label': `Delete ${d.title}`, on: { click: () => { confirmRow.hidden = false; (confirmRow.querySelector('.btn:not(.danger)') as HTMLElement).focus(); } } }, 'Delete'),
        confirmRow);
    rowTests.set(row, (q) => draftMatches(d, q, type?.name));
    list.append(row);
  }
}
