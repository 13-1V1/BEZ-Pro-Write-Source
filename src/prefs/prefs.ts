// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Font size, the spell-underline toggle, checks the user turned off, and
// per-type readability targets.

import { readJson, writeJson } from '../storage/store';
import { DEFAULT_VOICE, PITCH_MAX, PITCH_MIN, SPEED_MAX, SPEED_MIN, VOICES } from '../speech/voices';

export type FontSize = 'small' | 'medium' | 'large';

export interface Prefs {
  fontSize: FontSize;
  spellUnderlines: boolean;
  /** Check ids (keys of data/checks.json) the user switched off. */
  disabledChecks: string[];
  /** Readability target per type id, overriding the type file's readingTarget. */
  readingTargets: Record<string, number>;
  /** Whole-window zoom from Ctrl +/- (1 = 100%). */
  zoom: number;
  /** Read it aloud: voice id (src/speech/voices.ts), speed (1 = normal), and pitch (1 = normal). */
  voice: string;
  voiceSpeed: number;
  voicePitch: number;
}

export const READING_TARGET_MIN = 30;
export const READING_TARGET_MAX = 80;
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 5;

const FILE = 'settings/prefs.json';
const DEFAULTS: Prefs = { fontSize: 'medium', spellUnderlines: true, disabledChecks: [], readingTargets: {}, zoom: 1, voice: DEFAULT_VOICE, voiceSpeed: 1, voicePitch: 1 };

export async function loadPrefs(): Promise<Prefs> {
  const saved = await readJson<Partial<Prefs>>(FILE);
  const p = { ...DEFAULTS, ...(saved ?? {}) };
  if (!['small', 'medium', 'large'].includes(p.fontSize)) p.fontSize = 'medium';
  p.spellUnderlines = p.spellUnderlines !== false;
  p.disabledChecks = Array.isArray(p.disabledChecks) ? p.disabledChecks.filter((x): x is string => typeof x === 'string') : [];
  const targets: Record<string, number> = {};
  if (p.readingTargets && typeof p.readingTargets === 'object')
    for (const [k, v] of Object.entries(p.readingTargets))
      if (typeof v === 'number' && v >= READING_TARGET_MIN && v <= READING_TARGET_MAX) targets[k] = Math.round(v);
  p.readingTargets = targets;
  p.zoom = typeof p.zoom === 'number' && p.zoom >= ZOOM_MIN && p.zoom <= ZOOM_MAX ? Math.round(p.zoom * 100) / 100 : 1;
  if (!VOICES.some((v) => v.id === p.voice)) p.voice = DEFAULT_VOICE;
  p.voiceSpeed = inRange(p.voiceSpeed, SPEED_MIN, SPEED_MAX);
  p.voicePitch = inRange(p.voicePitch, PITCH_MIN, PITCH_MAX);
  return p;
}

/** A saved slider value, or 1 (normal) if it's missing or out of range. */
function inRange(v: unknown, min: number, max: number): number {
  return typeof v === 'number' && v >= min && v <= max ? Math.round(v * 100) / 100 : 1;
}

export async function savePrefs(p: Prefs): Promise<void> {
  await writeJson(FILE, p);
}

export function applyPrefs(p: Prefs): void {
  document.documentElement.dataset.font = p.fontSize;
}
