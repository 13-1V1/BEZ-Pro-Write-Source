// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// A settings save that fails says so on the panel, like a failed draft save,
// instead of quietly losing the change on the next start.

import { h } from '../../ui/dom';

export function saveNote(): { el: HTMLElement; run: (save: Promise<void>) => Promise<boolean> } {
  const el = h('p', { class: 'nav-msg', role: 'status', hidden: true });
  return {
    el,
    run: async (save) => {
      try {
        await save;
        el.hidden = true;
        return true;
      } catch (e) {
        console.error('Settings save failed', e);
        el.textContent = "Couldn't save this setting. It works until you close the app, but won't be kept.";
        el.hidden = false;
        return false;
      }
    },
  };
}
