// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Settings → Backup (web version only): save all writing to a file, or load one back.

import type { App } from '../../flow/app';
import { downloadBackup, loadBackup } from '../../storage/backup';
import { h } from '../../ui/dom';

export function backupPanel(app: App): HTMLElement {
  const msg = h('p', { class: 'rule-msg', role: 'status' });
  const save = async () => {
    try {
      await app.flush();
      const n = await downloadBackup();
      msg.textContent = `Backup saved to your Downloads folder (${n} ${n === 1 ? 'piece' : 'pieces'} of writing).`;
    } catch (e) {
      console.error('Backup failed', e);
      msg.textContent = "Couldn't make the backup. Try again, or try another browser.";
    }
  };
  const load = async () => {
    try {
      const said = await loadBackup();
      if (!said) return;
      msg.textContent = said;
      if (said.startsWith('Backup loaded')) setTimeout(() => location.reload(), 800);
    } catch (e) {
      console.error('Loading a backup failed', e);
      msg.textContent = "Couldn't load that backup. Nothing was changed.";
    }
  };
  return h('div', null,
    h('h2', null, 'Backup'),
    h('p', { class: 'hint' }, 'Your writing is saved in this web browser, on this computer only. Clearing your browser data erases it, and another computer or browser will not see it.'),
    h('p', { class: 'hint' }, 'Save a backup now and then. To move your writing, load the backup on the other computer. Loading a backup adds its pieces and replaces any with the same name.'),
    h('div', { class: 'button-row' },
      h('button', { class: 'btn primary', on: { click: () => void save() } }, 'Save a backup'),
      h('button', { class: 'btn', on: { click: () => void load() } }, 'Load a backup…')),
    msg);
}
