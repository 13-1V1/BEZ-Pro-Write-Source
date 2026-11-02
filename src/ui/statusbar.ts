// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Status bar along the bottom of the window: a row of small cells.

import { h } from './dom';

export interface Cell {
  text: string;
  /** Grow to fill leftover space (pushes later cells right). */
  grow?: boolean;
  level?: 'green' | 'yellow' | 'red' | null;
}

export function createStatusbar(): { el: HTMLElement; set(cells: Cell[]): void } {
  const el = h('footer', { class: 'statusbar', role: 'status', 'aria-live': 'off' });
  return {
    el,
    set(cells) {
      el.replaceChildren(
        ...cells.map((c) => h('span', { class: `status-cell${c.grow ? ' grow' : ''}${c.level ? ` ${c.level}` : ''}` }, c.text)));
    },
  };
}
