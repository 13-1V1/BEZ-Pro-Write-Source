// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Build a progress record from the draft that was just finished.

import { C_IDS, type CId } from '../checks/cs';
import { flagsFor } from '../checks/run';
import type { App } from '../flow/app';
import { computeStats } from '../scores/stats';
import type { ProgressRecord } from './progress';

export function progressRecordFor(app: App): ProgressRecord {
  const d = app.draft!;
  const flags = flagsFor(app);
  const stats = computeStats(app);
  const spots = Object.fromEntries(C_IDS.map((c) => [c, flags.filter((f) => f.c === c && !f.fine).length])) as Record<CId, number>;
  return { draftId: d.id, at: Date.now(), typeId: d.typeId, practiceId: d.practiceId, words: stats.words, style: stats.style, spots };
}
