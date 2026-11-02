// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// The natural voices for Read it aloud (Kokoro, offline). The names are our own;
// `mix` names the Kokoro voice files behind each one. A blend mixes two of
// them; each mix's weights add up to 1.

export interface Voice {
  id: string;
  name: string;
  group: 'Women' | 'Men';
  /** Kokoro voice files and how much of each. */
  mix: [string, number][];
}

export const VOICES: Voice[] = [
  { id: 'heart', name: 'Katie', group: 'Women', mix: [['af_heart', 1]] },
  { id: 'heart-bella', name: 'Bella', group: 'Women', mix: [['af_heart', 0.6], ['af_bella', 0.4]] },
  { id: 'heart-sarah', name: 'Sarah', group: 'Women', mix: [['af_heart', 0.6], ['af_sarah', 0.4]] },
  { id: 'fenrir', name: 'Amir', group: 'Men', mix: [['am_fenrir', 1]] },
  { id: 'michael-fenrir', name: 'Mike', group: 'Men', mix: [['am_michael', 0.5], ['am_fenrir', 0.5]] },
  { id: 'fenrir-puck', name: 'Chuck', group: 'Men', mix: [['am_fenrir', 0.5], ['am_puck', 0.5]] },
];

export const DEFAULT_VOICE = 'heart';
export const SPEED_MIN = 0.7;
export const SPEED_MAX = 1.5;
/** Pitch is a playback-rate factor: 0.85 is 15% lower, 1.15 is 15% higher. */
export const PITCH_MIN = 0.85;
export const PITCH_MAX = 1.15;

export function voiceById(id: string): Voice {
  return VOICES.find((v) => v.id === id) ?? VOICES[0];
}

/**
 * Playing a clip faster raises its pitch and also speeds it up, so the voice is
 * asked to talk slower by the same amount: the listener hears the chosen speed.
 */
export function modelSpeed(speed: number, pitch: number): number {
  return speed / pitch;
}
