// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Word counting shared by the counters, scores, and checks.

const WORD_RE = /[A-Za-z0-9À-ɏ]+(?:['’.-][A-Za-z0-9À-ɏ]+)*/g;

export function countWords(text: string): number {
  return text.match(WORD_RE)?.length ?? 0;
}

export function wordsOf(text: string): string[] {
  return text.match(WORD_RE) ?? [];
}

export type TargetState = 'empty' | 'under' | 'on' | 'over';

export function targetState(count: number, [min, max]: [number, number]): TargetState {
  if (count === 0) return 'empty';
  if (count < min) return 'under';
  if (count > max) return 'over';
  return 'on';
}
