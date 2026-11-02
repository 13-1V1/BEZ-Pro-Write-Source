// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Classic menu bar (File / Go / Tools / Help). Alt+letter opens a menu,
// arrow keys move, Enter picks, Esc closes (also after opening one with the mouse).

import { h } from './dom';
import { cmdKey, keyLabel } from './platform';

export interface MenuItem {
  label: string;
  key?: string;
  run?: () => void;
  enabled?: () => boolean;
}
export type MenuEntry = MenuItem | 'sep';

export interface Menu {
  title: string;
  /** Letter for Alt+letter, e.g. "f" for File. */
  access: string;
  items: MenuEntry[];
}

export function createMenubar(menus: Menu[], title: () => string): { el: HTMLElement; refreshTitle(): void } {
  let openIndex = -1;
  const titleEl = h('span', { class: 'menubar-title' });
  const wraps: HTMLElement[] = [];
  const lists: HTMLElement[] = [];
  const heads: HTMLButtonElement[] = [];

  const items = (i: number) => [...lists[i].querySelectorAll<HTMLButtonElement>('.menu-item:not(:disabled)')];
  const close = () => {
    if (openIndex < 0) return;
    lists[openIndex].hidden = true;
    wraps[openIndex].classList.remove('open');
    heads[openIndex].setAttribute('aria-expanded', 'false');
    openIndex = -1;
  };
  const open = (i: number, focusFirst = true) => {
    close();
    openIndex = i;
    // Refresh enabled state each time the menu opens.
    lists[i].querySelectorAll<HTMLButtonElement>('.menu-item').forEach((b, n) => {
      const item = menus[i].items.filter((x) => x !== 'sep')[n] as MenuItem;
      b.disabled = item.enabled ? !item.enabled() : false;
    });
    lists[i].hidden = false;
    wraps[i].classList.add('open');
    heads[i].setAttribute('aria-expanded', 'true');
    if (focusFirst) items(i)[0]?.focus();
  };

  menus.forEach((menu, i) => {
    const list = h('div', { class: 'menu-list', role: 'menu', hidden: true },
      menu.items.map((it) =>
        it === 'sep'
          ? h('div', { class: 'menu-sep', role: 'separator' })
          : h('button', { class: 'menu-item', role: 'menuitem', on: { click: () => { close(); it.run?.(); } } },
              h('span', null, it.label), it.key ? h('span', { class: 'menu-key' }, keyLabel(it.key)) : null)));
    const head = h('button', { class: 'menu-title', 'aria-haspopup': 'true', 'aria-expanded': 'false',
      on: {
        click: () => (openIndex === i ? close() : open(i, false)),
        mouseenter: () => { if (openIndex >= 0 && openIndex !== i) open(i, false); },
        // Opened with the mouse, focus stays on the title: let the keys work from there too.
        keydown: (e: KeyboardEvent) => {
          if (openIndex !== i) return;
          if (e.key === 'ArrowDown') items(i)[0]?.focus();
          else if (e.key === 'ArrowUp') items(i).at(-1)?.focus();
          else if (e.key === 'Escape') close();
          else return;
          e.preventDefault();
        },
      } },
      h('u', null, menu.title[0]), menu.title.slice(1));
    list.addEventListener('keydown', (e) => {
      const list = items(i);
      const at = list.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'ArrowDown') list[(at + 1) % list.length]?.focus();
      else if (e.key === 'ArrowUp') list[(at - 1 + list.length) % list.length]?.focus();
      else if (e.key === 'ArrowRight') open((i + 1) % menus.length);
      else if (e.key === 'ArrowLeft') open((i - 1 + menus.length) % menus.length);
      else if (e.key === 'Escape') { close(); head.focus(); }
      else return;
      e.preventDefault();
    });
    heads.push(head);
    lists.push(list);
    wraps.push(h('div', { class: 'menu' }, head, list));
  });

  document.addEventListener('mousedown', (e) => {
    if (openIndex >= 0 && !(e.target as HTMLElement).closest('.menubar')) close();
  });
  document.addEventListener('keydown', (e) => {
    // e.code is the physical key, so Option+F works on a Mac (where e.key would be "ƒ").
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const i = menus.findIndex((m) => `Key${m.access.toUpperCase()}` === e.code);
      if (i >= 0) {
        e.preventDefault();
        open(i);
        return;
      }
    }
    // Shortcut keys listed in the menus (only simple Ctrl+letter ones).
    if (cmdKey(e) && !e.altKey && !e.shiftKey && e.key.length === 1) {
      for (const m of menus)
        for (const it of m.items)
          if (it !== 'sep' && it.key?.toLowerCase() === `ctrl+${e.key.toLowerCase()}` && (it.enabled?.() ?? true)) {
            e.preventDefault();
            close();
            it.run?.();
            return;
          }
    }
  });

  const el = h('nav', { class: 'menubar', 'aria-label': 'Menu' }, wraps, titleEl);
  const refreshTitle = () => (titleEl.textContent = title());
  refreshTitle();
  return { el, refreshTitle };
}
