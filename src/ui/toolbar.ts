// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Toolbar row of small icon buttons under the menu bar (word-processor style).

import { h } from './dom';
import { icon } from './icons';

export interface Tool {
  icon: string;
  label: string;
  /** Show the text next to the icon, not just as a tooltip. */
  showLabel?: boolean;
  run: () => void;
  enabled?: () => boolean;
}
export type ToolEntry = Tool | 'sep';

export function createToolbar(tools: ToolEntry[]): { el: HTMLElement; refresh(): void } {
  const buttons: [HTMLButtonElement, Tool][] = [];
  const el = h('div', { class: 'toolbar', role: 'toolbar', 'aria-label': 'Toolbar' },
    tools.map((t) => {
      if (t === 'sep') return h('span', { class: 'tool-sep', role: 'separator' });
      const b = h('button', { class: 'tool', title: t.label, 'aria-label': t.label, on: { click: () => t.run() } },
        icon(t.icon), t.showLabel ? h('span', null, t.label) : null);
      buttons.push([b, t]);
      return b;
    }));
  const refresh = () => {
    for (const [b, t] of buttons) b.disabled = t.enabled ? !t.enabled() : false;
  };
  refresh();
  return { el, refresh };
}
