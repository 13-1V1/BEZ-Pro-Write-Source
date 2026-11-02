// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// One 7 C's check screen, the same layout for every C (11/02/2026 redesign):
// a row of the 7 C's, what this C means, what to do here, then "Things to look
// at": one row per item, one row open at a time. "It's fine, next" ticks the
// open row and opens the next one right below it, so nobody scrolls up to click.
// On Complete the rows are the Plan's points (found ones already ticked); on
// the other C's they're the spots the app found. Then the writing, with the open
// item outlined, and the yes/no questions last. Points at things; never fixes them.

import { CHECK_INFO, flagKey } from '../checks';
import { planPoints, type PlanPoint } from '../checks/complete';
import { CS, type CId } from '../checks/cs';
import { checkInput, flagsFor } from '../checks/run';
import type { Flag } from '../checks/types';
import { usedSections } from '../export/assemble';
import type { App, ScreenView } from '../flow/app';
import { stepState } from '../flow/outline';
import type { Step } from '../flow/steps';
import { spellUnavailable } from '../spell/cache';
import { h } from '../ui/dom';
import { renderHighlighted } from '../ui/highlight';
import { lock } from '../ui/lock';
import { speakButton } from '../ui/speak';
import { guidePage } from './guide';

/** What to call the suggestion line for each kind of check. */
const USE_LABEL: Record<string, string> = { simpler: 'Simpler word: ', wordy: 'Shorter way: ', spelling: 'Spelling ideas: ', 'lowercase-i': 'Should be: ' };

/** The Complete flag that stands for a Plan point the app couldn't find. */
const POINT_CHECK: Record<PlanPoint['kind'], string> = { fact: 'missing-fact', reader: 'missing-reader', deadline: 'missing-deadline', ask: 'no-ask' };

export function badge(c: CId): HTMLElement {
  return h('span', { class: 'c-badge', style: `background:${CS[c].color}` }, CS[c].badge);
}

/** One row of "Things to look at": a spot the app found, or a Plan point (found or not). */
interface Item {
  key: string;
  label: string;
  /** The flag behind it (spots, and Plan points that weren't found). */
  flag: Flag | null;
  /** Where a found Plan point is in the writing. */
  found: { sectionId: string; start: number; end: number } | null;
}

const short = (t: string, n = 70) => (t.length > n ? `${t.slice(0, n)}…` : t);

function pointLabel(p: PlanPoint): string {
  if (p.kind === 'fact') return `Plan point: ${short(p.text)}`;
  if (p.kind === 'reader') return `Your reader's name: ${p.text}`;
  if (p.kind === 'deadline') return `Your deadline: ${p.text}`;
  return 'A clear ask (a question or request)';
}

function flagLabel(f: Flag): string {
  const name = CHECK_INFO[f.check]?.label ?? f.check;
  return f.text && f.end > f.start ? `${name}: “${short(f.text, 50)}”` : f.text ? `${name}: ${short(f.text)}` : name;
}

/** Items in reading order: whole-piece notes first, then spots by part and position. */
function itemsFor(app: App, c: CId, flags: Flag[]): Item[] {
  const mine = flags.filter((f) => f.c === c);
  const order = new Map(app.sections.map((s, i) => [s.id, i]));
  const pos = (f: Flag) => (f.end <= f.start ? -1 : (order.get(f.sectionId ?? '') ?? 99) * 1e6 + f.start);
  const used = new Set<Flag>();
  const items: Item[] = [];
  if (c === 'complete') {
    for (const p of planPoints(checkInput(app))) {
      const f = p.spot ? undefined : mine.find((x) => !used.has(x) && x.check === POINT_CHECK[p.kind] && (p.kind === 'ask' || x.text === p.text));
      if (f) used.add(f);
      items.push({ key: f ? flagKey(f) : `point|${p.kind}|${p.text}`, label: pointLabel(p), flag: f ?? null, found: p.spot });
    }
  }
  for (const f of [...mine].filter((x) => !used.has(x)).sort((a, b) => pos(a) - pos(b)))
    items.push({ key: flagKey(f), label: flagLabel(f), flag: f, found: null });
  return items;
}

const isDone = (it: Item) => (it.flag ? !!it.flag.fine : true);

export function checkScreen(app: App, step: Step): ScreenView {
  const d = app.draft!;
  const c = step.cId!;
  const info = CS[c];
  const answers = (d.checklist[c] ??= {});
  const sectionLabel = (id: string | null) => app.sections.find((s) => s.id === id)?.label ?? 'your writing';

  // The open row, kept by key so it survives redraws; skipped rows only for this visit.
  let currentKey: string | null = null;
  const skipped = new Set<string>();
  let items: Item[] = [];

  // --- the row of 7 C's ---
  const checkSteps = app.steps.filter((s) => s.stage === 'check' && s.cId);
  const at = checkSteps.findIndex((s) => s.key === step.key);
  const cbar = h('nav', { class: 'cbar', 'aria-label': "The 7 C's" },
    checkSteps.map((s) => {
      const id = s.cId!;
      const done = s.key !== step.key && stepState(s, d) === 'done';
      return h('button', { class: `cdot${s.key === step.key ? ' on' : ''}${done ? ' done' : ''}`, style: `--c:${CS[id].color}`,
        title: `${CS[id].name}${done ? ' (questions answered)' : ''}`, 'aria-current': s.key === step.key ? 'step' : null,
        on: { click: () => { if (s.key !== step.key) app.go(s.key); } } }, CS[id].badge, done ? ' ✓' : '');
    }),
    h('span', { class: 'muted small' }, `Check ${at + 1} of ${checkSteps.length}`));

  // --- "Things to look at" ---
  const progress = h('span', { class: 'prog' });
  const list = h('ul', { class: 'items' });
  const listCard = h('section', { class: 'card items-card', 'aria-label': 'Things to look at' },
    h('div', { class: 'card-head' }, h('h2', null, 'Things to look at'), progress), list);

  const goEdit = (sectionId: string | null) => {
    // A whole-piece note (a missing fact) has no part of its own: open the first body part.
    const id = sectionId ?? usedSections(d, app.sections).find((s) => s.role === 'body')?.id ?? app.sections.find((s) => s.role === 'body')?.id;
    if (!id) return;
    app.returnTo = step.key;
    app.go(`write:${id}`);
  };

  /** Open the next row that still needs a look, after `from`; none left closes them all. */
  const advance = (from: string | null) => {
    const i = items.findIndex((it) => it.key === from);
    const after = [...items.slice(i + 1), ...items.slice(0, Math.max(i, 0))];
    currentKey = after.find((it) => !isDone(it) && !skipped.has(it.key))?.key ?? null;
  };

  // "It's fine": the user looked and decided to keep it. The words are never touched.
  const setFine = (f: Flag, fine: boolean) => {
    const key = flagKey(f);
    d.fine = fine ? [...new Set([...d.fine, key])] : d.fine.filter((k) => k !== key);
    app.changed();
    app.refreshSide();
  };

  const openBody = (it: Item): HTMLElement => {
    const f = it.flag;
    const btn = (label: string, run: () => void, primary = false) => h('button', { class: `btn small${primary ? ' primary' : ''}`, on: { click: run } }, label);
    if (!f) {
      // A Plan point the app found: say where, and move on.
      const where = it.found!;
      const said = (d.text[where.sectionId] ?? '').slice(where.start, where.end).trim();
      return h('div', { class: 'body' },
        h('p', null, `Found in ${sectionLabel(where.sectionId)}: `, h('span', { class: 'muted' }, `“${short(said, 120)}”`)),
        h('div', { class: 'acts' }, btn('Next ›', () => { advance(it.key); draw(); })));
    }
    const ci = CHECK_INFO[f.check];
    const fineNow = !!f.fine;
    return h('div', { class: 'body' },
      lock(h('p', null, ci?.why ?? '')),
      f.detail ? lock(h('p', { class: 'muted' }, f.detail)) : null,
      f.use ? lock(h('p', null, h('strong', null, USE_LABEL[f.check] ?? 'For example: '), f.use)) : null,
      lock(h('p', { class: 'try' }, h('strong', null, 'Try this: '), ci?.try ?? '')),
      h('div', { class: 'acts' },
        btn('Change my words', () => goEdit(f.sectionId), true),
        fineNow
          ? btn('Look at it again', () => { setFine(f, false); draw(); })
          : btn("It's fine, next ›", () => { setFine(f, true); advance(it.key); draw(); }),
        fineNow ? null : btn('Skip for now', () => { skipped.add(it.key); advance(it.key); draw(); })));
  };

  const drawList = () => {
    const done = items.filter(isDone).length;
    progress.replaceChildren(
      items.length ? `${done} of ${items.length} done ` : 'Nothing to look at ',
      h('span', { class: 'bar', 'aria-hidden': 'true' }, h('i', { style: `width:${items.length ? Math.round((done / items.length) * 100) : 100}%` })));
    if (items.length === 0) {
      list.replaceChildren(h('li', { class: 'all-done' }, h('div', { class: 'row' }, h('span', { class: 'mark' }, '✓'),
        h('span', { class: 'what' }, `The app found nothing to point out for ${info.name}. Answer the questions below, then press Next.`))));
      return;
    }
    const rows = items.map((it) => {
      const open = it.key === currentKey;
      const doneNow = isDone(it);
      const tag = it.flag ? (it.flag.fine ? 'marked fine' : it.flag.sectionId ? `in ${sectionLabel(it.flag.sectionId)}` : 'not found') : `found in ${sectionLabel(it.found!.sectionId)}`;
      const head = h('button', { class: 'row', 'aria-expanded': String(open),
        on: { click: () => { currentKey = open ? null : it.key; draw(); } } },
        h('span', { class: 'mark', 'aria-hidden': 'true' }, doneNow ? '✓' : '○'),
        h('span', { class: 'what' }, it.label),
        h('span', { class: 'tag' }, tag),
        h('span', { class: 'sr-only' }, doneNow ? ', done' : ', still to look at'));
      return h('li', { class: `${doneNow ? 'done' : 'open'}${open ? ' cur' : ''}`, 'data-key': it.key }, head, open ? openBody(it) : null);
    });
    if (!currentKey && items.every(isDone)) rows.push(h('li', { class: 'all-done' }, h('div', { class: 'row' }, h('span', { class: 'mark' }, '✓'),
      h('span', { class: 'what' }, 'All looked at. Answer the questions below, then press Next.'))));
    list.replaceChildren(...rows);
  };

  // --- the writing, with the open item outlined ---
  const textView = h('div', { class: 'check-text' });
  const drawText = (flags: Flag[]) => {
    const current = items.find((it) => it.key === currentKey);
    const mine = flags.filter((f) => f.c === c && f.end > f.start);
    // A found Plan point is outlined where it was found, like a spot.
    const extra: Flag[] = current?.found && !current.flag
      ? [{ c, check: 'plan-point', sectionId: current.found.sectionId, start: current.found.start, end: current.found.end, text: '' }]
      : [];
    const isCurrent = (f: Flag) => (current?.flag ? flagKey(f) === current.key : f.check === 'plan-point');
    const sections = usedSections(d, app.sections);
    textView.replaceChildren(
      h('div', { class: 'check-text-head' }, h('h2', null, 'Your writing'), speakButton(() => sections.map((s) => d.text[s.id] ?? '').join('\n\n'))),
      ...sections.map((s) =>
        h('section', { class: 'check-section' },
          h('div', { class: 'check-section-head' },
            h('span', { class: 'check-section-label' }, s.label),
            h('button', { class: 'btn small', on: { click: () => goEdit(s.id) } }, 'Edit this part')),
          renderHighlighted(d.text[s.id] ?? '', [...mine, ...extra].filter((f) => f.sectionId === s.id), (picked) => {
            // Clicking a highlight opens its row.
            const it = items.find((x) => x.flag && picked.some((p) => flagKey(p) === x.key));
            if (it) { currentKey = it.key; draw(); }
          }, isCurrent))));
    if (sections.length === 0) textView.append(h('p', { class: 'muted' }, 'Nothing written yet.'));
  };

  // --- the questions, last ---
  const questions = info.questions.map((q, i) => {
    const reminder = lock(h('p', { class: 'reminder', hidden: answers[i] !== 'no' }, h('strong', null, 'Look at: '), info.reminders[i]));
    const name = `q-${c}-${i}`;
    const opt = (val: 'yes' | 'no', label: string) =>
      h('label', { class: 'yn' },
        h('input', { type: 'radio', name, value: val, checked: answers[i] === val,
          on: { change: () => { answers[i] = val; reminder.hidden = val !== 'no'; app.changed(); } } }),
        h('span', null, label));
    return h('li', { class: 'question' },
      h('span', { class: 'q-text', id: `${name}-label` }, q),
      h('span', { class: 'yn-row', role: 'radiogroup', 'aria-labelledby': `${name}-label` }, opt('yes', 'Yes'), opt('no', 'No')),
      reminder);
  });
  const n = info.questions.length;
  const questionCard = h('section', { class: 'card checklist' },
    h('div', { class: 'card-head' }, h('h2', null, `Last: ${n} quick question${n === 1 ? '' : 's'}`), h('span', { class: 'muted small' }, '"No" is fine. It just means take another look.')),
    h('ol', null, questions));

  const spellNote = h('p', { class: 'reminder', hidden: true }, "The spelling check isn't working right now, so read it over for spelling yourself.");

  const draw = () => {
    const flags = flagsFor(app);
    items = itemsFor(app, c, flags);
    // Keep the open row if it's still there (a fixed spot disappears); otherwise open the first that needs a look.
    if (currentKey && !items.some((it) => it.key === currentKey)) currentKey = null;
    if (currentKey === null && !opened) { opened = true; advance(null); }
    drawList();
    drawText(flags);
    spellNote.hidden = !(c === 'correct' && spellUnavailable());
    // After a move, the open row's spot comes into view under the list, which stays put.
    // Not on the first draw: the screen opens at the top, with the C and what to do.
    if (!firstDraw) queueMicrotask(() => {
      textView.querySelector<HTMLElement>('.hl.now')?.scrollIntoView({ block: 'nearest' });
      list.querySelector<HTMLElement>('li.cur')?.scrollIntoView({ block: 'nearest' });
    });
    firstDraw = false;
  };
  let opened = false;
  let firstDraw = true;

  // F3 / Shift+F3: next or previous row.
  const onF3 = (e: KeyboardEvent) => {
    if (!body.isConnected) return document.removeEventListener('keydown', onF3);
    if (e.key !== 'F3' || items.length === 0) return;
    e.preventDefault();
    const i = items.findIndex((it) => it.key === currentKey);
    const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i + 1) % items.length;
    currentKey = items[next].key;
    draw();
  };
  document.addEventListener('keydown', onF3);

  const guideLink = h('button', { class: 'link-btn', on: { click: () => void app.goPage((a, back) => { const page = guidePage(a, back); queueMicrotask(() => page.querySelector(`#guide-${c}`)?.scrollIntoView()); return page; }) } }, `More about ${info.name}`);

  const body = h('div', { class: 'check' },
    cbar,
    h('h1', { tabindex: -1 }, badge(c), ` ${info.name}`),
    h('p', { class: 'definition' }, lock(h('span', null, info.definition)), ' ', guideLink),
    h('p', { class: 'todo' }, h('strong', null, 'What to do here: '),
      c === 'complete'
        ? 'go down the list. Anything from your Plan the app can\'t find is left open: add it, or tell the app it\'s fine. Then answer the questions at the bottom.'
        : 'go down the list. For each open item, change your words or tell the app it\'s fine. Then answer the questions at the bottom.'),
    spellNote,
    listCard,
    textView,
    questionCard);

  draw();
  return { body, side: true, refresh: draw };
}
