// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Spell underlines for a write box: checks shortly after typing pauses,
// only when the "underline while I type" setting is on. Never pops anything up.

import type { App } from '../flow/app';
import type { Editor } from '../ui/editor';
import { spellingFor } from './cache';
import { warmUp } from './harper';
import { teachNames } from './names';

const PAUSE_MS = 450;

/** Display > underline setting, and the Spelling check not turned off in Settings > Checks. */
const underlinesOn = (app: App) => app.data.prefs.spellUnderlines && !app.data.prefs.disabledChecks.includes('spelling');

export function attachSpell(app: App, editor: Editor): { check(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let run = 0;

  const check = () => {
    clearTimeout(timer);
    if (!underlinesOn(app)) return editor.setMarks([]);
    timer = setTimeout(async () => {
      const mine = ++run;
      const text = editor.textarea.value;
      try {
        await teachNames(app);
        const issues = await spellingFor(text);
        // Skip stale results if the user kept typing.
        if (mine !== run || editor.textarea.value !== text || !editor.el.isConnected) return;
        editor.setMarks(issues.map((i) => ({ start: i.start, end: i.end, title: i.message })));
      } catch (e) {
        console.warn('Spell check unavailable', e);
      }
    }, PAUSE_MS);
  };

  if (underlinesOn(app)) {
    warmUp();
    check();
  }
  return { check };
}
