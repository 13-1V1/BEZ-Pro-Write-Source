// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// "All steps": every step of the current draft as a clickable list, with a
// mark for each part (written, empty, skipped) and each 7 C's check (all
// questions answered or not), so nobody has to press Back five times.

import { CS } from '../checks/cs';
import type { Draft } from '../drafts/model';
import type { Section } from '../types/schema';
import { h } from '../ui/dom';
import { STAGE_NAMES, type Step } from './steps';

export type StepState = 'done' | 'empty' | 'skipped' | 'none';

export function stepName(step: Step, sections: Section[]): string {
  if (step.stage === 'write') return sections.find((s) => s.id === step.sectionId)?.label ?? STAGE_NAMES.write;
  if (step.stage === 'check' && step.cId) return CS[step.cId].name;
  return STAGE_NAMES[step.stage];
}

export function stepState(step: Step, d: Draft): StepState {
  if (step.stage === 'write' && step.sectionId) {
    if (d.skipped[step.sectionId]) return 'skipped';
    return (d.text[step.sectionId] ?? '').trim() ? 'done' : 'empty';
  }
  if (step.stage === 'check' && step.cId) {
    const answers = d.checklist[step.cId] ?? {};
    return CS[step.cId].questions.every((_, i) => answers[i]) ? 'done' : 'empty';
  }
  return 'none';
}

const MARK: Record<StepState, string> = { done: '●', empty: '○', skipped: '–', none: '' };
const SAYS: Record<StepState, string> = { done: 'done', empty: 'not done yet', skipped: 'skipped', none: '' };

export function outline(steps: Step[], current: number, d: Draft, sections: Section[], go: (key: string) => void): HTMLElement {
  const groups: { stage: Step['stage']; items: HTMLElement[] }[] = [];
  steps.forEach((step, i) => {
    const state = stepState(step, d);
    const name = stepName(step, sections);
    const item = h('li', null,
      h('button', {
        class: `outline-step${i === current ? ' current' : ''}`,
        'aria-current': i === current ? 'step' : null,
        'aria-label': `${name}${SAYS[state] ? `, ${SAYS[state]}` : ''}${i === current ? ', you are here' : ''}`,
        on: { click: () => go(step.key) },
      }, MARK[state] ? h('span', { class: `outline-mark ${state}`, 'aria-hidden': 'true' }, MARK[state]) : null, name));
    const last = groups[groups.length - 1];
    if (last && last.stage === step.stage) last.items.push(item);
    else groups.push({ stage: step.stage, items: [item] });
  });
  return h('nav', { class: 'outline', 'aria-label': 'All steps' },
    // A one-step stage ("Plan") is its own label; only Write and the 7 C's get a heading.
    groups.map((g) => h('div', { class: 'outline-group' },
      g.items.length > 1 ? h('span', { class: 'outline-stage' }, STAGE_NAMES[g.stage]) : null,
      h('ul', null, g.items))));
}
