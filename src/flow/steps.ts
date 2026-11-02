// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Build the ordered list of screens for a draft, leaving out skipped steps:
// no topics → no topic screen; 0 or 1 profiles → no profile screen.

import { CHECK_ORDER, type CId } from '../checks/cs';
import type { Section, WritingType } from '../types/schema';

export type Stage = 'type' | 'topic' | 'profile' | 'prep' | 'write' | 'check' | 'finish';

export const STAGE_NAMES: Record<Stage, string> = {
  type: 'Pick a type',
  topic: 'Pick a topic',
  profile: 'Pick a sender',
  prep: 'Plan',
  write: 'Write',
  check: '7 C\'s check',
  finish: 'Finish',
};

export interface Step {
  key: string;
  stage: Stage;
  sectionId?: string;
  cId?: CId;
}

/** `checkFirst` (a practice scenario's focus C) moves that C's check screen to the front. */
export function buildSteps(type: WritingType | undefined, sections: Section[], profileCount: number, checkFirst?: CId): Step[] {
  const steps: Step[] = [{ key: 'type', stage: 'type' }];
  // Before a type is picked, assume a topic screen so the count doesn't jump around much.
  if (!type || type.topics.length > 0) steps.push({ key: 'topic', stage: 'topic' });
  if (profileCount >= 2) steps.push({ key: 'profile', stage: 'profile' });
  steps.push({ key: 'prep', stage: 'prep' });
  for (const s of sections) steps.push({ key: `write:${s.id}`, stage: 'write', sectionId: s.id });
  if (!type) steps.push({ key: 'write:?', stage: 'write' });
  const order = checkFirst ? [checkFirst, ...CHECK_ORDER.filter((c) => c !== checkFirst)] : CHECK_ORDER;
  for (const c of order) steps.push({ key: `check:${c}`, stage: 'check', cId: c });
  steps.push({ key: 'finish', stage: 'finish' });
  return steps;
}

export interface Progress {
  stageIndex: number;
  stageCount: number;
  stageName: string;
  /** e.g. "Greeting (2 of 7)" inside the Write stage. */
  detail: string;
  fraction: number;
}

export function progressFor(steps: Step[], index: number, sectionLabel?: string): Progress {
  const stages = [...new Set(steps.map((s) => s.stage))];
  const step = steps[index];
  const inStage = steps.filter((s) => s.stage === step.stage);
  const pos = inStage.indexOf(step) + 1;
  let detail = '';
  if (step.stage === 'write' && sectionLabel) detail = `${sectionLabel} (${pos} of ${inStage.length})`;
  if (step.stage === 'check') detail = `${pos} of ${inStage.length}`;
  return {
    stageIndex: stages.indexOf(step.stage) + 1,
    stageCount: stages.length,
    stageName: STAGE_NAMES[step.stage],
    detail,
    fraction: steps.length > 1 ? index / (steps.length - 1) : 0,
  };
}
