// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Mac vs Windows differences: Cmd instead of Ctrl, and how shortcuts are shown.

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** The "command" key for shortcuts: Cmd on Mac, Ctrl on Windows. */
export function cmdKey(e: KeyboardEvent): boolean {
  return isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
}

/** Show a shortcut written as "Ctrl+N" the way this computer labels it ("⌘N" on Mac). */
export function keyLabel(k: string): string {
  if (!isMac) return k;
  return k.replace(/Ctrl\+/g, '⌘').replace(/Shift\+/g, '⇧').replace(/Alt\+/g, '⌥').replace(/Enter/g, '↩');
}
