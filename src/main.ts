// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Boot: load data, settings, and profiles, then show Home.

import './styles/app.css';
import relationships from '../data/relationships.json';
import { whenSpellUpdates } from './checks/run';
import { FRAMEWORK_PROBLEMS } from './frameworks/frameworks';
import { saveDraft } from './drafts/drafts';
import { addSnapshot } from './drafts/snapshots';
import { recordFinish } from './progress/progress';
import { progressRecordFor } from './progress/record';
import { MIN_WORDS_FOR_READING } from './scores/stats';
import { damagedFiles, inTauri, isWeb } from './storage/store';
import { App, type AppData } from './flow/app';
import { applyPrefs, loadPrefs } from './prefs/prefs';
import { setupZoom } from './ui/zoom';
import { useVoicePrefs } from './ui/speak';
import { loadProfiles } from './profiles/profiles';
import { homeScreen } from './screens/home';
import { pickProfileScreen } from './screens/pick-profile';
import { pickTopicScreen } from './screens/pick-topic';
import { pickTypeScreen } from './screens/pick-type';
import { prepScreen } from './screens/prep';
import { sidePanel } from './screens/side-panel';
import { settingsScreen, type SettingsTab } from './screens/settings';
import { checkScreen } from './screens/check';
import { finishScreen } from './screens/finish';
import { writeScreen } from './screens/write';
import { loadTypes } from './types/load';
import { installCopyGuard } from './ui/lock';
import { mountChrome } from './flow/chrome';
import { loadWordLists } from './wordlists/load';

async function boot(): Promise<void> {
  const root = document.getElementById('app')!;
  installCopyGuard();
  const [typeResult, prefs, profiles, lists] = await Promise.all([loadTypes(), loadPrefs(), loadProfiles(), loadWordLists()]);
  applyPrefs(prefs);
  useVoicePrefs(prefs);
  const data: AppData = {
    types: typeResult.types,
    typeProblems: typeResult.problems,
    profiles,
    prefs,
    lists: lists.lists,
    listProblems: [
      ...lists.problems,
      ...FRAMEWORK_PROBLEMS,
      ...[...damagedFiles].map((f) => `Your saved file "${f}" couldn't be read, so the defaults are used. If you change that setting, the old file is kept as "${f}.damaged".`),
    ],
    relationships: relationships as unknown as AppData['relationships'],
  };
  let chrome: { refresh(): void } | undefined;
  let statsTimer: ReturnType<typeof setTimeout> | undefined;
  const STATS_PAUSE_MS = 150;
  const app = new App(root, data, {
    screens: {
      type: pickTypeScreen,
      topic: pickTopicScreen,
      profile: pickProfileScreen,
      prep: prepScreen,
      write: writeScreen,
      check: checkScreen,
      finish: finishScreen,
    },
    home: homeScreen,
    settings: (a, back, tab) => settingsScreen(a, back, tab as SettingsTab | undefined),
    sidePanel,
    save: saveDraft,
    // Stats redraw once typing pauses, not on every keystroke (it cost ~20 ms per key on long drafts).
    onChange: (a) => {
      clearTimeout(statsTimer);
      statsTimer = setTimeout(() => { a.refreshSide(); chrome?.refresh(); }, STATS_PAUSE_MS);
    },
    onRender: () => chrome?.refresh(),
    onSaved: () => chrome?.refresh(),
    // Keep an earlier version when the user starts checking, and when they finish.
    onStep: (a, from, to) => {
      const d = a.draft;
      if (!d) return;
      if (from?.stage === 'write' && to.stage === 'check') void addSnapshot(d, "Before the 7 C's check");
      if (to.stage === 'finish') {
        void addSnapshot(d, 'Finished');
        // A piece too short to score doesn't count as finished (progress, practice unlocks).
        const record = progressRecordFor(a);
        if (record.words >= MIN_WORDS_FOR_READING) void recordFinish(record);
      }
    },
  });
  chrome = mountChrome(app);
  setupZoom(prefs, (msg) => app.say(msg));
  // Ask the browser not to clear the writing on its own when the disk runs low.
  if (isWeb) void navigator.storage?.persist?.().catch(() => undefined);
  // Spelling results arrive a moment later; refresh the live scores when they do.
  whenSpellUpdates(() => {
    app.refreshView();
    app.refreshSide();
    chrome?.refresh();
  });
  (window as unknown as { bez: App }).bez = app;
  await saveBeforeClosing(app);
  void app.goHome();
}

/**
 * Closing the window waits for the last few seconds of typing to be saved.
 * Tauri awaits this handler before it destroys the window.
 */
async function saveBeforeClosing(app: App): Promise<void> {
  if (!inTauri) return;
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    let warned = false;
    await getCurrentWindow().onCloseRequested(async (event) => {
      // A failed save keeps the window open once, so the user can copy their writing.
      if (!(await app.flush()) && !warned) {
        warned = true;
        event.preventDefault();
      }
    });
  } catch (e) {
    // The 3-second autosave and the blur/hidden saves still cover this case.
    console.error('Could not hook window close', e);
  }
}

boot().catch((e) => {
  document.getElementById('app')!.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'fatal';
  p.textContent = `BEZ Pro Write couldn't start: ${e instanceof Error ? e.message : String(e)}`;
  document.getElementById('app')!.append(p);
});
