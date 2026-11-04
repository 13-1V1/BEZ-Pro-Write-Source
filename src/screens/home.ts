// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Home: start new writing, find/resume/copy/delete a recent draft, open Settings.

import { autoTitle, deleteDraft, draftPreview, listDrafts, savedAgo, type DraftList } from '../drafts/drafts';
import { sectionsFor } from '../types/merge';
import { newDraft, type Draft } from '../drafts/model';
import { copyAsNew, ownWritingDraft } from '../drafts/reuse';
import { readCopied } from '../export/clipboard';
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
  void fillDrafts(app, list, () => search.value);

  const start = h('button', { class: 'btn primary huge', on: { click: () => app.open(newDraft()) } }, 'Start new writing');
  const checkOwn = h('button', { class: 'btn huge', title: "Paste something you already wrote and run the 7 C's checks on it",
    on: { click: () => app.open(ownWritingDraft()) } }, 'Check something I wrote');
  const copiedNote = h('p', { class: 'export-status bad', role: 'status', hidden: true });
  const say = (msg: string) => { copiedNote.textContent = msg; copiedNote.hidden = false; };
  const checkCopied = async () => {
    const text = await readCopied().catch(() => null);
    if (text === null) return say("The app couldn't read what you copied. Press Check something I wrote and paste it into the box.");
    if (!text.trim()) return say('Nothing is copied yet. Copy your writing first, then press this again.');
    app.open(ownWritingDraft(text.replace(/\r\n/g, '\n').trim()));
  };
  const page = h('div', { class: 'home' },
    h('header', { class: 'home-head' },
      h('div', null,
        h('h1', { class: 'brand' }, 'BEZ Pro Write'),
        h('p', { class: 'lead' }, 'Write a professional email, memo, letter, cover letter, or short report, one easy step at a time. You type every word; we show you how.')),
      h('button', { class: 'btn', on: { click: () => void app.goSettings() } }, 'Settings…')),
    problemBanner(app),
    isWeb ? webNote(app) : null,
    h('div', { class: 'start-row' }, start, checkOwn,
      h('button', { class: 'btn huge', title: "Run the 7 C's checks on the text you copied", on: { click: () => void checkCopied() } }, 'Check what I copied'),
      h('button', { class: 'btn huge', title: 'Practice on made-up situations; your scores count toward your progress',
        on: { click: () => void app.goPage(practicePage) } }, 'Practice')),
    copiedNote,
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

/** A Delete button and its "are you sure" row; a delete that fails says so there. */
function deleteControls(name: string, question: string, id: string, refill: () => void): [HTMLElement, HTMLElement] {
  const say = h('span', null, question);
  const remove = async () => {
    try {
      await deleteDraft(id);
      refill();
    } catch {
      say.textContent = `“${name}” couldn't be deleted.`;
    }
  };
  const confirmRow = h('div', { class: 'confirm-row', hidden: true }, say,
    h('button', { class: 'btn danger', on: { click: () => void remove() } }, 'Yes, delete'),
    h('button', { class: 'btn', on: { click: () => { confirmRow.hidden = true; ask.focus(); } } }, 'Keep it'));
  const ask = h('button', { class: 'btn ghost', 'aria-label': `Delete ${name}`, on: { click: () => { confirmRow.hidden = false; (confirmRow.querySelector('.btn:not(.danger)') as HTMLElement).focus(); } } }, 'Delete');
  return [ask, confirmRow];
}

/** A damaged draft file is never hidden: say it's there, that it was left alone, and let the user remove it. */
function unreadableRows(names: string[], refill: () => void): HTMLElement[] {
  const one = names.length === 1;
  const where = isWeb ? '' : ' The drafts folder is inside the data folder shown in Settings, on the About tab.';
  const note = h('li', { class: 'muted empty', role: 'alert' },
    `${one ? "One saved draft couldn't" : `${names.length} saved drafts couldn't`} be opened. Nothing in ${one ? 'it' : 'them'} was changed.${where}`);
  return [note, ...names.map((name) => {
    const [ask, confirmRow] = deleteControls(name, `Delete “${name}” and its saved versions? This can't be undone.`, name.slice(0, -5), refill);
    return h('li', { class: 'damaged-row' }, h('span', { class: 'damaged-name' }, name), ask, confirmRow);
  })];
}

async function fillDrafts(app: App, list: HTMLElement, query: () => string): Promise<void> {
  let found: DraftList;
  try {
    found = await listDrafts();
  } catch {
    list.replaceChildren(h('li', { class: 'muted empty', role: 'alert' }, "Your drafts couldn't be listed. Nothing was changed. Close the app and open it again."));
    return;
  }
  const { drafts, unreadable } = found;
  const refill = () => void fillDrafts(app, list, query);
  list.replaceChildren();
  if (unreadable.length > 0) list.append(...unreadableRows(unreadable, refill));
  if (drafts.length === 0 && unreadable.length === 0) {
    list.append(h('li', { class: 'muted empty' }, 'No drafts yet. Your writing saves itself as you go.'));
    return;
  }
  for (const d of drafts) {
    const type = app.data.types.find((t) => t.id === d.typeId);
    const topic = type?.topics.find((t) => t.id === d.topicId);
    autoTitle(d, type?.name, topic?.name);
    const preview = type ? draftPreview(d, sectionsFor(type, topic)) : '';
    const [ask, confirmRow] = deleteControls(d.title, `Delete “${d.title}”? This can't be undone.`, d.id, refill);
    const row = h('li', { class: 'draft-row' },
        h('button', { class: 'draft-open', on: { click: () => app.open(d) } },
          h('span', { class: 'draft-name' }, d.title),
          preview ? h('span', { class: 'draft-preview' }, `“${preview}”`) : null,
          h('span', { class: 'muted' }, `${d.saved ? `Saved ${savedAgo(d.saved)}` : 'Not saved yet'} · ${stageOf(d)}`)),
        h('button', { class: 'btn ghost', title: 'Start a new draft with the same type, sender, and plan — the writing starts empty',
          'aria-label': `New draft from ${d.title}`, on: { click: () => app.open(copyAsNew(d)) } }, 'New from this'),
        ask,
        confirmRow);
    rowTests.set(row, (q) => draftMatches(d, q, type?.name));
    list.append(row);
  }
  filterRows(list, query());
}
