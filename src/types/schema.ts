// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Shape of a writing-type JSON file (see docs/BUILD_BRIEF.md §8).

export const ROLES = ['header', 'greeting', 'body', 'ask', 'closing', 'signature'] as const;
export type Role = (typeof ROLES)[number];

export const PROFILE_FIELDS = ['name', 'title', 'address', 'phone', 'email', 'signature'] as const;
export type ProfileField = (typeof PROFILE_FIELDS)[number];

export interface Section {
  id: string;
  label: string;
  role: Role;
  optional: boolean;
  /** Optional plain-words "what goes here" line. Falls back to the tip. */
  what?: string;
  tip: string;
  good: string;
  bad: string;
  targetWords: [number, number];
  phrases: string[];
  profileFields: ProfileField[];
  /** Optional label put in front of the text in the finished piece, e.g. "Subject: ". */
  prefix?: string;
  /** Blank lines before this section in the finished piece. Default 1. */
  gapBefore?: number;
  /** Optional writing framework id from data/frameworks.json (e.g. "star"). */
  framework?: string;
}

export interface Topic {
  id: string;
  name: string;
  tone: string;
  dos: string[];
  donts: string[];
  sectionOverrides?: Record<string, Partial<Omit<Section, 'id' | 'role'>>>;
}

export interface WritingType {
  id: string;
  name: string;
  useWhen: string;
  /** Sort order for the type cards. Lower comes first. */
  order?: number;
  /** Not shown on the Pick a type screen (e.g. "My own writing", opened from Home). */
  hidden?: boolean;
  /** Readability target (Flesch Reading Ease, 0–100). Green at or above it. Default 60. */
  readingTarget: number;
  sections: Section[];
  topics: Topic[];
}

export interface LoadedType extends WritingType {
  source: 'built-in' | 'your folder';
  file: string;
}
