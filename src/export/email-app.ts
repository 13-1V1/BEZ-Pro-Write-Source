// Created by: Brennan Meyer with use of Claude Code 11/04/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// "Open in my email app": a new email with the subject and message filled in,
// through a mailto: link. The user picks who it goes to and sends it themselves.

import { inTauri } from '../storage/store';
import { copyText } from './clipboard';

/** Email programs and Windows cut off longer mailto links, so a longer message goes by clipboard. */
const MAX_LINK = 2000;

export function mailtoLink(subject: string, message: string): string {
  const body = message ? `&body=${encodeURIComponent(message.replace(/\n/g, '\r\n'))}` : '';
  return `mailto:?subject=${encodeURIComponent(subject)}${body}`;
}

async function openLink(url: string): Promise<void> {
  if (inTauri) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.click();
}

/** Returns true when the whole message went in, false when it's on the clipboard to paste. */
export async function openInEmailApp(subject: string, message: string): Promise<boolean> {
  const link = mailtoLink(subject, message);
  if (link.length <= MAX_LINK) {
    await openLink(link);
    return true;
  }
  await copyText(message);
  await openLink(mailtoLink(subject, ''));
  return false;
}
