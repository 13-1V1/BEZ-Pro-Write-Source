// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// One 7 C's check screen: plain definition, yes/no checklist, the user's text
// with highlights for this C (or all C's), click-to-explain, and jump-to-edit.
// Points at things; never fixes them.

import { CHECK_INFO, flagKey } from '../checks';
import { CS, C_IDS, type CId } from '../checks/cs';
import { flagsFor } from '../checks/run';
import { spellUnavailable } from '../spell/cache';
import type { Flag } from '../checks/types';
import { usedSections } from '../export/assemble';
import type { App, ScreenView } from '../flow/app';
import type { Step } from '../flow/steps';
import { h } from '../ui/dom';
import { renderHighlighted } from '../ui/highlight';
import { lock } from '../ui/lock';
import { speakButton } from '../ui/speak';
import { guidePage } from './guide';

let showAll = false;

/** What to call the suggestion line for each kind of check. */
const USE_LABEL: Record<string, string> = { simpler: 'Simpler word: ', wordy: 'Shorter way: ', spelling: 'Spelling ideas: ', 'lowercase-i': 'Should be: ' };

export function badge(c: CId): HTMLElement {
  return h('span', { class: 'c-badge', style: `background:${CS[c].color}` }, CS[c].badge);
}

export function checkScreen(app: App, step: Step): ScreenView {
  const d = app.draft!;
  const c = step.cId!;
  const info = CS[c];
  const answers = (d.checklist[c] ??= {});

  // --- checklist ---
  const questions = info.questions.map((q, i) => {
    const reminder = lock(h('p', { class: 'reminder', hidden: answers[i] !== 'no' }, h('strong', null, 'Look at: '), info.reminders[i]));
    const name = `q-${c}-${i}`;
    const opt = (val: 'yes' | 'no', label: string) =>
      h('label', { class: 'yn' },
        h('input', { type: 'radio', name, value: val, checked: answers[i] === val,
          on: { change: () => { answers[i] = val; reminder.hidden = val !== 'no'; app.changed(); drawText(); } } }),
        h('span', null, label));
    return h('li', { class: 'question' },
      h('span', { class: 'q-text', id: `${name}-label` }, q),
      h('span', { class: 'yn-row', role: 'radiogroup', 'aria-labelledby': `${name}-label` }, opt('yes', 'Yes'), opt('no', 'No')),
      reminder);
  });

  // --- explanation box (inline, never a popup) ---
  const explain = h('div', { class: 'explain', 'aria-live': 'polite' },
    h('p', { class: 'muted' }, 'Click a highlighted word (or Tab to it and press Enter) to see why it was pointed out.'));
  const showFlags = (flags: Flag[]) => {
    explain.replaceChildren(...flags.map((f) => {
      const ci = CHECK_INFO[f.check];
      return h('div', { class: 'explain-item', style: `border-left-color:${CS[f.c].color}` },
        h('div', { class: 'explain-head' }, badge(f.c), h('strong', null, ci?.label ?? f.check), f.text ? h('span', { class: 'muted' }, ` — “${f.text.length > 60 ? f.text.slice(0, 60) + '…' : f.text}”`) : null),
        lock(h('p', null, ci?.why ?? '')),
        f.detail ? lock(h('p', { class: 'muted' }, f.detail)) : null,
        f.use ? lock(h('p', null, h('strong', null, USE_LABEL[f.check] ?? 'For example: '), f.use)) : null,
        lock(h('p', { class: 'try' }, h('strong', null, 'Try this instead: '), ci?.try ?? '')),
        h('p', null, h('button', { class: 'btn small', on: { click: () => toggleFine(f) } },
          f.fine ? 'Look at it again' : "This one's fine")));
    }));
  };
  // "This one's fine": the user looked and decided to keep it. It stays (grayed)
  // and stops counting; the words are never touched.
  const toggleFine = (f: Flag) => {
    const key = flagKey(f);
    d.fine = f.fine ? d.fine.filter((k) => k !== key) : [...d.fine, key];
    app.changed();
    drawText();
    const now = flagsFor(app).find((x) => flagKey(x) === key);
    showFlags(now ? [now] : []);
    app.refreshSide();
  };

  // --- the user's text, one block per section ---
  const textView = h('div', { class: 'check-text' });
  const notes = h('div', { class: 'check-notes' });
  const drawText = () => {
    const all = flagsFor(app);
    const flags = showAll ? all : all.filter((f) => f.c === c);
    const sections = usedSections(d, app.sections);
    textView.replaceChildren(
      ...sections.map((s) =>
        h('section', { class: 'check-section' },
          h('div', { class: 'check-section-head' },
            h('span', { class: 'check-section-label' }, s.label),
            h('button', { class: 'btn small', on: { click: () => { app.returnTo = step.key; app.go(`write:${s.id}`); } } }, 'Edit this part')),
          renderHighlighted(d.text[s.id] ?? '', flags.filter((f) => f.sectionId === s.id), showFlags))));
    if (sections.length === 0) textView.append(h('p', { class: 'muted' }, 'Nothing written yet.'));

    // Whole-piece notes (missing facts, empty Ask) have no words to point at.
    const whole = flags.filter((f) => f.end <= f.start);
    notes.replaceChildren(
      whole.length
        ? h('ul', { class: 'note-list' }, whole.map((f) =>
            h('li', null, h('button', { class: 'note', on: { click: () => showFlags([f]) } },
              badge(f.c), ` ${CHECK_INFO[f.check]?.label ?? f.check}${f.text ? `: “${f.text}”` : ''}`, f.fine ? h('span', { class: 'muted' }, ' (marked fine)') : null))))
        : '');
    const mine = all.filter((f) => f.c === c && !f.fine).length;
    count.textContent = mine === 0 ? `Nothing flagged for ${info.name}. Nice work.` : `${mine} spot${mine === 1 ? '' : 's'} to look at for ${info.name}.`;
    count.className = mine === 0 ? 'count good' : 'count';
    const allYes = info.questions.every((_, i) => answers[i] === 'yes');
    disagree.hidden = !(allYes && mine > 0);
    disagree.textContent = `You answered yes to everything, and the app still sees ${mine} spot${mine === 1 ? '' : 's'}. Worth one more look, or mark the ones you're keeping as fine.`;
    if (c === 'correct' && spellUnavailable()) {
      count.textContent = `${mine === 0 ? 'Nothing else' : `${mine} spot${mine === 1 ? '' : 's'}`} flagged, but the spelling check isn't working right now, so read it over yourself.`;
      count.className = 'count';
    }
  };
  const count = h('p', { class: 'count', 'aria-live': 'polite' });
  const disagree = h('p', { class: 'reminder', hidden: true });

  // Next / previous spot (F3 / Shift+F3): walk the highlights one at a time, each explained.
  let at = -1;
  const stepCount = h('span', { class: 'muted', 'aria-live': 'polite' });
  const stepTo = (dir: 1 | -1) => {
    const spots = [...textView.querySelectorAll<HTMLElement>('.hl')];
    if (spots.length === 0) return void (stepCount.textContent = 'No spots to step through.');
    at = (at + dir + spots.length) % spots.length;
    const spot = spots[at];
    spot.scrollIntoView({ block: 'center' });
    spot.focus({ preventScroll: true });
    spot.click();
    stepCount.textContent = `Spot ${at + 1} of ${spots.length}`;
  };
  const onF3 = (e: KeyboardEvent) => {
    if (!body.isConnected) return document.removeEventListener('keydown', onF3);
    if (e.key !== 'F3') return;
    e.preventDefault();
    stepTo(e.shiftKey ? -1 : 1);
  };
  document.addEventListener('keydown', onF3);
  const stepper = h('div', { class: 'spot-stepper' },
    h('button', { class: 'btn small', title: 'Previous spot (Shift+F3)', on: { click: () => stepTo(-1) } }, '← Previous spot'),
    h('button', { class: 'btn small', title: 'Next spot (F3)', on: { click: () => stepTo(1) } }, 'Next spot →'),
    stepCount);

  const allToggle = h('label', { class: 'toggle' },
    h('input', { type: 'checkbox', checked: showAll, on: { change: (e: Event) => { showAll = (e.target as HTMLInputElement).checked; drawText(); } } }),
    h('span', null, 'Show all C\'s at once'));
  const legend = h('div', { class: 'legend', 'aria-label': 'Color key' },
    C_IDS.map((id) => h('span', { class: `legend-item${id === c ? ' current' : ''}` }, badge(id), CS[id].name)));

  drawText();

  const body = h('div', { class: 'check' },
    h('h1', { tabindex: -1 }, badge(c), ` ${info.name}`),
    lock(h('p', { class: 'definition' }, info.definition)),
    h('p', null, h('button', { class: 'link-btn', on: { click: () => void app.goPage((a, back) => { const page = guidePage(a, back); queueMicrotask(() => page.querySelector(`#guide-${c}`)?.scrollIntoView()); return page; }) } }, `Learn more about ${info.name} in the 7 C's guide`)),
    h('section', { class: 'checklist' },
      h('h2', null, 'Answer honestly. "No" is fine.'),
      h('ol', null, questions)),
    h('div', { class: 'check-tools' }, count, allToggle),
    stepper,
    h('p', null, speakButton(() => usedSections(d, app.sections).map((s) => d.text[s.id] ?? '').join('\n\n'))),
    disagree,
    legend,
    notes,
    textView,
    explain);
  return { body, side: true, refresh: drawText };
}
