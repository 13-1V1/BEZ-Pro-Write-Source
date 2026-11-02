// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// The 7 C's: order, colors, badges, plain definitions, and checklist questions.

export const C_IDS = ['clear', 'concise', 'concrete', 'correct', 'coherent', 'complete', 'courteous'] as const;
export type CId = (typeof C_IDS)[number];

/**
 * The order of the 7 C's check screens: big issues first (is anything missing,
 * is the point clear, does the order work, is the tone right), then the
 * sentence-level polish. Purdue OWL teaches revising in this order.
 */
export const CHECK_ORDER: readonly CId[] = ['complete', 'clear', 'coherent', 'courteous', 'concise', 'concrete', 'correct'];

export interface CInfo {
  id: CId;
  name: string;
  badge: string;
  color: string;
  definition: string;
  questions: string[];
  /** What to look at again when a question gets a "No". Same order as questions. */
  reminders: string[];
}

export const CS: Record<CId, CInfo> = {
  clear: {
    id: 'clear',
    name: 'Clear',
    badge: 'CL',
    color: 'var(--c-clear)',
    definition: 'The reader gets your point on the first read, with no guessing.',
    questions: [
      'Is your main point in the first 2 sentences?',
      'Does each sentence have one idea?',
      'Would a stranger understand every word?',
    ],
    reminders: [
      'Move your main point up into your first part.',
      'Split long sentences where you see "and" or "but" joining two ideas.',
      'Swap jargon and acronyms for everyday words, or spell them out once.',
    ],
  },
  concise: {
    id: 'concise',
    name: 'Concise',
    badge: 'CS',
    color: 'var(--c-concise)',
    definition: 'Every word earns its place. Nothing extra.',
    questions: ['Did you cut words that add nothing?', 'Is anything said twice?'],
    reminders: ['Look at the yellow highlights for filler and wordy phrases.', 'Read it out loud and cut any repeat.'],
  },
  concrete: {
    id: 'concrete',
    name: 'Concrete',
    badge: 'CT',
    color: 'var(--c-concrete)',
    definition: 'Real dates, numbers, and names instead of fuzzy words.',
    questions: [
      'Did you use real dates, numbers, and names instead of "soon," "some," "tomorrow"?',
      'Did you name exact places, amounts, or people instead of "they" or "it"?',
    ],
    reminders: ['Swap "soon" or "tomorrow" for a real date like "Friday, Nov 6."', 'Replace "they" or "it" with the real name of the person, place, or item.'],
  },
  correct: {
    id: 'correct',
    name: 'Correct',
    badge: 'CR',
    color: 'var(--c-correct)',
    definition: 'Right facts, right spelling, right grammar.',
    questions: ['Are all names, dates, and numbers right?', 'Did you fix the flagged spelling, grammar, and slang?'],
    reminders: ['Check each name, date, and number against your notes.', 'Look at the red highlights one by one.'],
  },
  coherent: {
    id: 'coherent',
    name: 'Coherent',
    badge: 'CO',
    color: 'var(--c-coherent)',
    definition: 'Your ideas follow a sensible order and stay on topic.',
    questions: ['Does each paragraph stick to one topic?', 'Does the order make sense from start to finish?'],
    reminders: ['Split a paragraph that covers two topics.', 'Try putting the facts in the order they happen.'],
  },
  complete: {
    id: 'complete',
    name: 'Complete',
    badge: 'CP',
    color: 'var(--c-complete)',
    definition: 'The reader has everything they need to act.',
    questions: ['Does it answer who, what, when, where, and why?', 'Does the reader know what to do next, and by when?'],
    reminders: ['Check your plan: is every key fact in the text?', 'Make your request one clear action with a date.'],
  },
  courteous: {
    id: 'courteous',
    name: 'Courteous',
    badge: 'CU',
    color: 'var(--c-courteous)',
    definition: 'Polite and respectful, even when you\'re asking for help.',
    questions: [
      'Did you greet and thank the reader properly (if this type has a greeting)?',
      'Is there any word that sounds bossy, annoyed, or too excited?',
    ],
    reminders: ['Use their name in the greeting (if there is one) and thank them in the closing.', 'Soften bossy words: "Could you…" instead of "You must…".'],
  },
};
