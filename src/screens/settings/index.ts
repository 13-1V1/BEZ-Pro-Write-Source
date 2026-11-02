// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Settings: classic options dialog with tabs down the left side.

import type { App } from '../../flow/app';
import { h } from '../../ui/dom';
import { aboutPanel } from './about';
import { backupPanel } from './backup';
import { checksPanel } from './checks';
import { displayPanel } from './display';
import { profilesPanel } from './profiles';
import { typesPanel } from './types';
import { voicePanel } from './voice';
import { wordRulesPanel } from './word-rules';
import { isWeb } from '../../storage/store';

export type SettingsTab = 'profiles' | 'display' | 'voice' | 'checks' | 'words' | 'types' | 'backup' | 'about';

const TABS: { id: SettingsTab; label: string; panel: (app: App) => HTMLElement }[] = [
  { id: 'profiles', label: 'Sender profiles', panel: profilesPanel },
  { id: 'display', label: 'Display', panel: displayPanel },
  { id: 'voice', label: 'Voice', panel: voicePanel },
  { id: 'checks', label: 'Checks', panel: checksPanel },
  { id: 'words', label: 'Word rules', panel: wordRulesPanel },
  // Type files are edited in a text editor, which the web version can't reach; it gets Backup instead.
  isWeb ? { id: 'backup', label: 'Backup', panel: backupPanel } : { id: 'types', label: 'Writing types', panel: typesPanel },
  { id: 'about', label: 'About', panel: aboutPanel },
];

export function settingsScreen(app: App, back: () => void, start: SettingsTab = 'profiles'): HTMLElement {
  const body = h('div', { class: 'settings-body' });
  const tabButtons = TABS.map((t) =>
    h('button', { class: 'settings-tab', role: 'tab', id: `tab-${t.id}`, 'aria-controls': 'settings-panel',
      on: { click: () => show(t.id, true), keydown: (e: KeyboardEvent) => arrow(e, t.id) } }, t.label));

  function show(id: SettingsTab, focusTab = false): void {
    TABS.forEach((t, i) => {
      const on = t.id === id;
      tabButtons[i].setAttribute('aria-selected', String(on));
      tabButtons[i].tabIndex = on ? 0 : -1;
      if (on && focusTab) tabButtons[i].focus();
    });
    body.replaceChildren(h('div', { id: 'settings-panel', role: 'tabpanel', 'aria-labelledby': `tab-${id}` }, TABS.find((t) => t.id === id)!.panel(app)));
  }
  function arrow(e: KeyboardEvent, id: SettingsTab): void {
    const i = TABS.findIndex((t) => t.id === id);
    if (e.key === 'ArrowDown') show(TABS[(i + 1) % TABS.length].id, true);
    else if (e.key === 'ArrowUp') show(TABS[(i - 1 + TABS.length) % TABS.length].id, true);
    else return;
    e.preventDefault();
  }
  show(start);

  return h('div', { class: 'settings-wrap' },
    h('div', { class: 'settings' },
      h('div', { class: 'settings-head' },
        h('h1', null, 'Settings'),
        h('button', { class: 'btn primary', on: { click: back } }, 'Done')),
      h('div', { class: 'settings-main' },
        h('div', { class: 'settings-tabs', role: 'tablist', 'aria-orientation': 'vertical' }, tabButtons),
        body)));
}
