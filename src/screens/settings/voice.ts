// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Settings → Voice: which voice Read it aloud uses, how fast, and how high.
// Every voice has a "Hear it" button. Saved to settings\prefs.json.

import type { App } from '../../flow/app';
import { savePrefs } from '../../prefs/prefs';
import { firstUseNote, naturalVoiceAvailable } from '../../speech/kokoro';
import { PITCH_MAX, PITCH_MIN, SPEED_MAX, SPEED_MIN, VOICES } from '../../speech/voices';
import { h } from '../../ui/dom';
import { readAloud } from '../../ui/speak';
import { saveNote } from './save-note';

const SAMPLE = 'Hi Sam. The team meeting moved to Tuesday at 3 p.m. Please tell me by Friday if that time works for you.';

const speedWords = (n: number) => `${n.toFixed(2).replace(/0$/, '')}×${n === 1 ? ' (normal)' : n < 1 ? ' (slower)' : ' (faster)'}`;
const pitchWords = (n: number) => (n === 1 ? 'Normal' : `${Math.round(Math.abs(n - 1) * 100)}% ${n < 1 ? 'lower' : 'higher'}`);

export function voicePanel(app: App): HTMLElement {
  const prefs = app.data.prefs;
  const note = saveNote();
  const save = () => void note.run(savePrefs(prefs));
  const status = h('p', { class: 'hint', role: 'status' });

  // One sample plays at a time; pressing again stops it.
  let stop: (() => void) | null = null;
  let playingBtn: HTMLButtonElement | null = null;
  const reset = () => { if (playingBtn) playingBtn.textContent = 'Hear it'; playingBtn = null; stop = null; };
  const hear = (btn: HTMLButtonElement, voiceId: string) => {
    const was = playingBtn;
    stop?.();
    reset();
    if (was === btn) return;
    playingBtn = btn;
    btn.textContent = 'Stop';
    stop = readAloud(SAMPLE, {
      preparing: (pct) => { if (playingBtn === btn) btn.textContent = pct === undefined ? 'Getting ready…' : `Downloading… ${pct}%`; },
      started: () => { if (playingBtn === btn) btn.textContent = 'Stop'; },
      ended: () => { if (playingBtn === btn) reset(); },
    }, voiceId);
  };

  const groups = (['Women', 'Men'] as const).map((group) =>
    h('fieldset', { class: 'group voice-list' },
      h('legend', null, group),
      VOICES.filter((v) => v.group === group).map((v) => {
        const btn = h('button', { class: 'btn small', on: { click: () => hear(btn, v.id) } }, 'Hear it') as HTMLButtonElement;
        return h('div', { class: 'voice-row' },
          h('label', { class: 'radio-pill' },
            h('input', { type: 'radio', name: 'voice', value: v.id, checked: prefs.voice === v.id,
              on: { change: () => { prefs.voice = v.id; save(); } } }),
            h('span', null, v.name)),
          btn);
      })));

  const slider = (id: string, label: string, min: number, max: number, step: number, get: () => number, set: (n: number) => void, words: (n: number) => string) => {
    const out = h('output', { for: id, class: 'target-out' }, words(get()));
    const input = h('input', { type: 'range', id, min, max, step, value: get(),
      on: { input: () => { set(Number(input.value)); out.textContent = words(get()); save(); } } }) as HTMLInputElement;
    const back = h('button', { class: 'btn small', on: { click: () => { set(1); input.value = '1'; out.textContent = words(1); save(); } } }, 'Normal');
    return h('div', { class: 'target-row' }, h('label', { for: id }, label), input, out, back);
  };

  void naturalVoiceAvailable().then((ok) => {
    status.textContent = ok
      ? `These voices run on this computer; nothing you write is sent anywhere. ${firstUseNote}`.trim()
      : "This computer's graphics can't run these voices, so Read it aloud uses the computer's own voice. Speed and pitch still apply.";
  });

  return h('div', null,
    h('h2', null, 'Voice'),
    note.el,
    h('p', { class: 'hint' }, 'The voice for Read it aloud. Hearing your writing helps you catch long sentences and missing words.'),
    status,
    groups,
    h('h2', null, 'Speed and pitch'),
    h('div', { class: 'group' },
      slider('voice-speed', 'Speed', SPEED_MIN, SPEED_MAX, 0.05, () => prefs.voiceSpeed, (n) => (prefs.voiceSpeed = n), speedWords),
      slider('voice-pitch', 'Pitch', PITCH_MIN, PITCH_MAX, 0.01, () => prefs.voicePitch, (n) => (prefs.voicePitch = n), pitchWords)));
}
