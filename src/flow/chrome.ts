// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Window parts around the screens: menu bar, toolbar, and status bar.

import { savedAgo } from '../drafts/drafts';
import { newDraft } from '../drafts/model';
import { addSnapshot, hasWriting } from '../drafts/snapshots';
import { computeStats } from '../scores/stats';
import { createMenubar } from '../ui/menubar';
import { createStatusbar, type Cell } from '../ui/statusbar';
import { createToolbar } from '../ui/toolbar';
import type { App } from './app';
import { progressFor } from './steps';
import { keyLabel } from '../ui/platform';
import { isWeb } from '../storage/store';
import { spellLoading } from '../spell/harper';
import { guidePage } from '../screens/guide';
import { practicePage } from '../screens/practice';
import { progressPage } from '../screens/progress-page';

export function mountChrome(app: App): { refresh(): void } {
  const inFlow = () => app.draft !== null;
  const newWriting = () => void app.flush().then((ok) => { if (ok || !app.draft) app.open(newDraft()); });
  const openGuide = () => void app.goPage(guidePage);
  const saveNow = () => void app.saveNow().then((ok) => { if (ok) app.say('Saved.'); refresh(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'F1') { e.preventDefault(); openGuide(); } });

  const menubar = createMenubar(
    [
      { title: 'File', access: 'f', items: [
        // Browsers keep Ctrl+N for a new window, so the web version doesn't list it.
        { label: 'New writing', key: isWeb ? undefined : 'Ctrl+N', run: newWriting },
        { label: 'Save now', key: 'Ctrl+S', run: saveNow, enabled: inFlow },
        { label: 'Save a version to come back to', run: () => { if (app.draft) void addSnapshot(app.draft, 'Saved by hand').then((added) => app.say(added ? 'Version saved. Find it on the Finish screen under "Earlier versions".' : hasWriting(app.draft!) ? 'Nothing has changed since the last saved version.' : 'Write something first, then save a version.')); }, enabled: inFlow },
        ...(isWeb ? ['sep' as const, { label: 'Save a backup…', run: () => void app.goSettings('backup') }] : []),
        'sep',
        { label: 'Home', run: () => void app.goHome() },
      ] },
      { title: 'Go', access: 'g', items: [
        { label: 'Next step', key: 'Ctrl+Enter', run: () => app.next(), enabled: inFlow },
        { label: 'Back', key: 'Ctrl+Shift+Enter', run: () => app.back(), enabled: inFlow },
      ] },
      { title: 'Tools', access: 't', items: [{ label: 'Settings…', run: () => void app.goSettings() }] },
      { title: 'Help', access: 'h', items: [
        { label: "The 7 C's guide", key: 'F1', run: openGuide },
        { label: 'Practice…', run: () => void app.goPage(practicePage) },
        { label: 'Your progress', run: () => void app.goPage(progressPage) },
        'sep',
        { label: 'About BEZ Pro Write', run: () => void app.goSettings('about') },
      ] },
    ],
    () => (app.draft ? `${app.draft.title} — BEZ Pro Write` : 'BEZ Pro Write'),
  );

  const toolbar = createToolbar([
    { icon: 'new', label: 'New writing', run: newWriting },
    { icon: 'home', label: 'Home', run: () => void app.goHome() },
    { icon: 'save', label: `Save now (${keyLabel('Ctrl+S')})`, run: saveNow, enabled: inFlow },
    'sep',
    { icon: 'back', label: `Back (${keyLabel('Ctrl+Shift+Enter')})`, run: () => app.back(), enabled: inFlow },
    { icon: 'next', label: `Next (${keyLabel('Ctrl+Enter')})`, run: () => app.next(), enabled: inFlow },
    'sep',
    { icon: 'settings', label: 'Settings', run: () => void app.goSettings() },
    { icon: 'help', label: "The 7 C's guide (F1)", run: openGuide },
  ]);

  const statusbar = createStatusbar();

  document.getElementById('menubar')!.replaceWith(menubar.el);
  document.getElementById('toolbar')!.replaceWith(toolbar.el);
  document.getElementById('statusbar')!.replaceWith(statusbar.el);

  function refresh(): void {
    menubar.refreshTitle();
    toolbar.refresh();
    const d = app.draft;
    if (!d) {
      statusbar.set([{ text: 'Ready', grow: true }, { text: 'English (USA)' }]);
      return;
    }
    const prog = progressFor(app.steps, app.index);
    const s = computeStats(app);
    const cells: Cell[] = [
      { text: `Step ${prog.stageIndex} of ${prog.stageCount}` },
      { text: prog.stageName, grow: true },
      { text: `${s.words} words` },
      { text: s.reading === null ? 'Readability —' : `Readability ${s.reading}`, level: s.readingLevel },
      { text: s.style === null ? 'Style —' : `Style ${s.style}`, level: s.styleLevel },
      // The web version downloads the spell checker on first use, which takes a few seconds.
      { text: isWeb && spellLoading() ? 'Spelling loading…' : 'English (USA)' },
      { text: d.saved ? `Saved ${savedAgo(d.saved)}` : 'Not saved yet' },
    ];
    statusbar.set(cells);
  }
  refresh();
  return { refresh };
}
