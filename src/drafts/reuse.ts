// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Start a new draft from an old one: keeps the type, topic, sender, and plan,
// but none of the writing — the user still types every word.

import { newDraft, type Draft } from './model';

/** A draft for checking something written elsewhere: opens straight to the one big box. */
export function ownWritingDraft(): Draft {
  const d = newDraft();
  d.typeId = 'own';
  d.stepKey = 'write:writing';
  return d;
}

export function copyAsNew(old: Draft): Draft {
  const d = newDraft();
  d.typeId = old.typeId;
  d.topicId = old.topicId;
  d.profileId = old.profileId;
  d.prep = { ...old.prep };
  d.stepKey = 'prep';
  return d;
}
