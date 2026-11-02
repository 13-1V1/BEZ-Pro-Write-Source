// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// About: version, credits, and third-party license notices.

import notices from '../../../THIRD_PARTY_NOTICES?raw';
import type { App } from '../../flow/app';
import { isWeb, storeRoot } from '../../storage/store';
import { h } from '../../ui/dom';

/** Where anyone who has the app can get its source code (GPL-3.0). */
export const SOURCE_URL = 'https://github.com/13-1V1/BEZ-Pro-Write-Source';

export function aboutPanel(_app: App): HTMLElement {
  const folder = h('code', null, '…');
  void storeRoot().then((p) => (folder.textContent = p)).catch(() => (folder.textContent = "(couldn't find the data folder)"));
  return h('div', { class: 'about' },
    h('h2', null, 'About BEZ Pro Write'),
    h('p', null, h('strong', null, 'Version 1.4.0')),
    h('p', null, 'A step-by-step guide to professional writing with the 7 C\'s: Clear, Concise, Concrete, Correct, Coherent, Complete, and Courteous.'),
    h('p', { class: 'muted' }, isWeb
      ? 'Made by Brennan Meyer, Santa Clarita, CA. No accounts, no AI, and your writing never leaves this browser. You write every word.'
      : 'Made by Brennan Meyer, Santa Clarita, CA. Works fully offline. No accounts, no internet, no AI. You write every word.'),
    h('p', { class: 'muted' }, 'Your drafts and settings are saved in: ', folder),
    h('p', { class: 'muted' }, 'BEZ Pro Write is free software under the GNU General Public License, version 3 or later. Its source code is at ',
      h('code', null, SOURCE_URL), '.'),
    h('h2', null, 'Open-source software'),
    h('pre', { class: 'notices', tabindex: 0, 'aria-label': 'Third-party license notices' }, notices));
}
