// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// "Read it aloud": a voice reads the user's words back, so they can hear what
// the reader will hear (the Concise tip says to read it out loud).
// The natural voice (Kokoro, offline, src/speech/) is used when this computer's
// graphics can run it; otherwise the computer's own voice reads it.

import type { Prefs } from '../prefs/prefs';
import { naturalVoiceAvailable, speakNatural, stopNatural, voiceLoaded } from '../speech/kokoro';
import { h } from './dom';

const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

let prefs: Pick<Prefs, 'voice' | 'voiceSpeed' | 'voicePitch'> = { voice: 'heart', voiceSpeed: 1, voicePitch: 1 };
/** Boot hands over the live prefs, so Settings changes apply on the next press. */
export function useVoicePrefs(p: Prefs): void { prefs = p; }

let natural: Promise<boolean> | null = null;
const hasNatural = () => (natural ??= naturalVoiceAvailable());

/** An American English voice if there is one, else the default. */
function pickVoice(s: SpeechSynthesis): SpeechSynthesisVoice | undefined {
  const voices = s.getVoices().filter((v) => v.localService !== false);
  return voices.find((v) => v.lang === 'en-US') ?? voices.find((v) => v.lang.startsWith('en'));
}

function speakSystem(words: string, onEnd: () => void): boolean {
  const s = synth();
  if (!s) return false;
  const u = new SpeechSynthesisUtterance(words);
  const voice = pickVoice(s);
  if (voice) u.voice = voice;
  u.rate = 0.95 * prefs.voiceSpeed;
  u.pitch = prefs.voicePitch;
  u.onend = onEnd;
  u.onerror = onEnd;
  s.cancel();
  s.speak(u);
  return true;
}

/** Read words aloud with the best voice this computer has. Returns a stop function. */
export function readAloud(words: string, on: { started(): void; ended(): void; preparing?(percent?: number): void }, voice?: string): () => void {
  let stopped = false;
  const stop = () => { stopped = true; stopNatural(); synth()?.cancel(); };
  void hasNatural().then((ok) => {
    if (stopped) return;
    if (!ok) { if (speakSystem(words, on.ended)) on.started(); else on.ended(); return; }
    if (!voiceLoaded()) on.preparing?.();
    void speakNatural(words, { voice: voice ?? prefs.voice, speed: prefs.voiceSpeed, pitch: prefs.voicePitch }, {
      onStart: on.started,
      onEnd: on.ended,
      onProgress: (pct) => on.preparing?.(pct),
      onFail: (err) => {
        console.error('Natural voice failed; using the computer voice', err);
        natural = Promise.resolve(false);
        if (!stopped && speakSystem(words, on.ended)) on.started(); else on.ended();
      },
    }).catch((err) => {
      console.error('Natural voice could not load; using the computer voice', err);
      natural = Promise.resolve(false);
      if (!stopped && speakSystem(words, on.ended)) on.started(); else on.ended();
    });
  });
  return stop;
}

let stopCurrent: (() => void) | null = null;

export function speakButton(text: () => string): HTMLElement | null {
  if (!synth() && !('gpu' in navigator)) return null;
  const btn = h('button', { class: 'btn small', 'aria-pressed': 'false' }, 'Read it aloud');
  let stop: (() => void) | null = null;
  const idle = () => { stop = null; btn.textContent = 'Read it aloud'; btn.setAttribute('aria-pressed', 'false'); };
  btn.addEventListener('click', () => {
    if (stop) { stop(); return idle(); }
    const words = text().trim();
    if (!words) return;
    stopCurrent?.();
    btn.setAttribute('aria-pressed', 'true');
    btn.textContent = 'Stop reading';
    stop = stopCurrent = readAloud(words, {
      preparing: (pct) => { if (stop) btn.textContent = pct === undefined ? 'Getting the voice ready…' : `Downloading the voice… ${pct}%`; },
      started: () => { if (stop) btn.textContent = 'Stop reading'; },
      ended: idle,
    });
  });
  return btn;
}

/** Stop any reading when the screen changes. */
export function stopSpeaking(): void {
  stopCurrent?.();
  stopCurrent = null;
  stopNatural();
  synth()?.cancel();
}
