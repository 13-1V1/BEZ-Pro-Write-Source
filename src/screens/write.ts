// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Write one section: what goes here, tip, good/bad example, phrase bank,
// one text box (or one small box per framework part), live word count
// against the target, and a full preview.

import type { Draft } from '../drafts/model';
import { assemble } from '../export/assemble';
import type { App, ScreenView } from '../flow/app';
import type { Step } from '../flow/steps';
import { FRAMEWORKS, joinParts, partSpot, type Framework } from '../frameworks/frameworks';
import { profileText } from '../profiles/profiles';
import { countWords, targetState } from '../scores/words';
import { attachSpell } from '../spell/attach';
import type { Section } from '../types/schema';
import { h } from '../ui/dom';
import { createEditor, selectWords } from '../ui/editor';
import { speakButton } from '../ui/speak';
import { OWN_TYPE } from '../checks/run';
import { ownTools } from './own-tools';
import { lock } from '../ui/lock';
import { yourLabel } from '../ui/your';

const STATE_TEXT = { empty: 'Not started', under: 'A bit short', on: 'Right on target', over: 'A bit long — can you trim it?' };

function drawCounter(el: HTMLElement, text: string, target: [number, number], extra = ''): void {
  const n = countWords(text);
  const state = targetState(n, target);
  el.className = `counter ${state} ${extra}`.trim();
  el.replaceChildren(
    h('strong', null, `${n} word${n === 1 ? '' : 's'}`),
    ` · Target: ${target[0]}–${target[1]} words · `,
    h('span', { class: 'state' }, (state === 'on' ? '✓ ' : '') + STATE_TEXT[state]));
}

function examples(good: string, bad: string): HTMLElement {
  return lock(h('div', { class: 'examples' },
    h('div', { class: 'example good' }, h('span', { class: 'ex-label' }, 'Good example'), h('p', null, good)),
    h('div', { class: 'example bad' }, h('span', { class: 'ex-label' }, 'Not like this'), h('p', null, bad))));
}

export function writeScreen(app: App, step: Step): ScreenView {
  const d = app.draft!;
  const section = app.sections.find((s) => s.id === step.sectionId)!;
  const fw = section.framework ? FRAMEWORKS[section.framework] : undefined;

  // Fill from the sender profile once, only if the box is empty.
  const profile = app.profile;
  if (profile && section.profileFields.length && !d.profileFilled[section.id] && !(d.text[section.id] ?? '').trim()) {
    d.text[section.id] = profileText(profile, section.profileFields);
    d.profileFilled[section.id] = true;
    app.changed();
  }

  const counter = h('p', { class: 'counter', 'aria-live': 'polite' });
  const preview = h('pre', { class: 'preview', hidden: true, 'aria-label': 'Preview of your full piece' });
  const updatePreview = () => {
    if (preview.hidden) return;
    preview.textContent = assemble(d, app.sections).text || 'Nothing written yet.';
  };
  const own = d.typeId === OWN_TYPE ? ownTools(app, d, section.id) : null;
  const textChanged = () => {
    own?.refresh();
    if ((d.text[section.id] ?? '').trim()) delete d.skipped[section.id];
    drawCounter(counter, d.text[section.id] ?? '', section.targetWords);
    updatePreview();
    app.changed();
  };

  const input = fw ? frameworkBoxes(app, d, section, fw, textChanged) : singleBox(app, d, section, textChanged);
  own?.watchDrops(input.el);
  drawCounter(counter, d.text[section.id] ?? '', section.targetWords);
  // Sent here by "Change my words": select those words once the screen is showing.
  const spot = app.spot;
  app.spot = null;
  if (spot) queueMicrotask(() => input.select(spot.start, spot.end));

  const phrases = section.phrases.length
    ? lock(h('div', { class: 'phrase-bank', id: `phrases-${section.id}`, hidden: true },
        h('p', { class: 'hint' }, 'Ideas to get you started. Read them, then write it your own way.'),
        h('ul', null, section.phrases.map((p) => h('li', null, p)))))
    : null;
  const phraseBtn = phrases
    ? h('button', { class: 'btn small', 'aria-expanded': 'false', 'aria-controls': phrases.id, on: { click: () => {
        phrases.hidden = !phrases.hidden;
        phraseBtn!.setAttribute('aria-expanded', String(!phrases.hidden));
        phraseBtn!.textContent = phrases.hidden ? 'Show phrase ideas' : 'Hide phrase ideas';
      } } }, 'Show phrase ideas')
    : null;
  const previewBtn = h('button', { class: 'btn small', 'aria-expanded': 'false', on: { click: () => {
    preview.hidden = !preview.hidden;
    previewBtn.setAttribute('aria-expanded', String(!preview.hidden));
    previewBtn.textContent = preview.hidden ? 'Show full preview' : 'Hide full preview';
    updatePreview();
  } } }, 'Show full preview');

  const relTip = app.data.relationships[d.prep.relationship as keyof typeof app.data.relationships];
  const body = h('div', { class: 'write' },
    h('h1', { tabindex: -1 }, section.label, section.optional ? h('span', { class: 'tag' }, 'Optional') : null,
      fw ? h('span', { class: 'tag fw' }, fw.name) : null,
      d.skipped[section.id] ? h('span', { class: 'tag' }, 'Skipped') : null),
    lock(h('p', { class: 'what' }, section.what ?? section.tip)),
    lock(h('div', { class: 'tip-box' }, h('strong', null, 'Tip: '), section.tip)),
    fw
      ? h('details', { class: 'fw-examples' }, h('summary', null, 'See an example of the whole part'), examples(section.good, section.bad))
      : examples(section.good, section.bad),
    relTip && (section.role === 'greeting' || section.role === 'closing')
      ? lock(h('p', { class: 'hint' }, h('strong', null, 'For this reader: '), relTip.tip))
      : null,
    h('div', { class: 'tool-row' }, phraseBtn, previewBtn, speakButton(() => d.text[section.id] ?? '')),
    phrases,
    input.el,
    own?.el,
    h('p', { class: 'hint' }, fw ? 'Whole section:' : null),
    counter,
    profile && d.profileFilled[section.id] && (d.text[section.id] ?? '').trim()
      ? h('p', { class: 'hint' }, 'Filled in from your saved profile. Change anything you like.')
      : null,
    d.skipped[section.id]
      ? h('p', { class: 'hint' }, "You skipped this part, so it's left out of the finished piece. Type in the box to use it again.")
      : null,
    preview);

  const skip = section.optional
    ? h('button', { class: 'btn', on: { click: () => { d.skipped[section.id] = true; app.changed(); app.next(); } } }, 'Skip this part')
    : undefined;
  // Came here from a 7 C's screen to fix something? Offer the way back.
  const back = app.returnTo
    ? h('button', { class: 'btn primary', on: { click: () => app.go(app.returnTo!) } }, "Return to the 7 C's check")
    : undefined;
  return { body, side: true, middle: back ?? skip, focus: input.focus };
}

function singleBox(app: App, d: Draft, section: Section, changed: () => void) {
  const editor = createEditor({
    id: `write-${section.id}`,
    value: d.text[section.id] ?? '',
    label: section.label,
    rows: section.role === 'greeting' || (section.role === 'header' && section.targetWords[1] <= 12) ? 2 : 8,
    onInput: (v) => {
      d.text[section.id] = v;
      changed();
      spell.check();
    },
  });
  const spell = attachSpell(app, editor);
  return {
    el: h('div', null, h('label', { class: 'label', for: `write-${section.id}` }, yourLabel(section.label)), editor.el),
    focus: editor.textarea,
    select: (start: number, end: number) => selectWords(editor.textarea, start, end),
  };
}

/** One small box per framework part; the parts join into the section's text. */
function frameworkBoxes(app: App, d: Draft, section: Section, fw: Framework, changed: () => void) {
  const answers = (d.parts[section.id] ??= {});
  // The section's text is what gets checked and exported. If the boxes don't add
  // up to it (text written before this framework, or answers left from another
  // topic's framework), start over from that text in the first box.
  const text = d.text[section.id] ?? '';
  if (text.trim() && joinParts(fw, answers) !== text) {
    for (const p of fw.parts) delete answers[p.id];
    answers[fw.parts[0].id] = text;
  }

  let first: HTMLTextAreaElement | undefined;
  const areas: Record<string, HTMLTextAreaElement> = {};
  const boxes = fw.parts.map((part, i) => {
    const id = `write-${section.id}-${part.id}`;
    const counter = h('p', { class: 'counter small' });
    const editor = createEditor({
      id,
      value: answers[part.id] ?? '',
      label: `${part.label}: ${part.question}`,
      rows: 3,
      onInput: (v) => {
        answers[part.id] = v;
        d.text[section.id] = joinParts(fw, answers);
        drawCounter(counter, v, part.targetWords, 'small');
        changed();
        spell.check();
      },
    });
    const spell = attachSpell(app, editor);
    drawCounter(counter, answers[part.id] ?? '', part.targetWords, 'small');
    first ??= editor.textarea;
    areas[part.id] = editor.textarea;
    return h('div', { class: 'fw-part' },
      h('label', { class: 'fw-label', for: id }, h('span', { class: 'fw-step' }, String(i + 1)), part.label, h('span', { class: 'fw-q' }, ` — ${part.question}`)),
      lock(h('p', { class: 'hint' }, part.tip)),
      h('details', { class: 'fw-examples' }, h('summary', null, 'See an example'), examples(part.good, part.bad)),
      editor.el,
      counter);
  });
  return {
    el: h('div', { class: 'framework' }, lock(h('p', { class: 'fw-intro' }, h('strong', null, `${fw.name}: `), fw.intro)), boxes),
    focus: first,
    select: (start: number, end: number) => {
      const at = partSpot(fw, answers, start, end);
      if (at) selectWords(areas[at.partId], at.start, at.end);
    },
  };
}
