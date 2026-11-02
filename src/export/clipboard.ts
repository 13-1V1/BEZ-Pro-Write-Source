// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Copy the finished piece to the clipboard as plain text.

import { inTauri } from '../storage/store';

export async function copyText(text: string): Promise<void> {
  if (inTauri) {
    const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    await writeText(text);
    return;
  }
  await navigator.clipboard.writeText(text);
}
