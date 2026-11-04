// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Copy / Save .txt / Save .docx / Print buttons on the Finish screen, with a
// plain status line (no popups). An email copies its subject and message apart.

import { tidyEnds } from '../export/assemble';
import { copyText } from '../export/clipboard';
import { toDocx } from '../export/docx';
import { openInEmailApp } from '../export/email-app';
import { printText } from '../export/print';
import { fileNameFor, saveAs } from '../export/save';
import { toTxt } from '../export/txt';
import type { App } from '../flow/app';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { isMac } from '../ui/platform';

/** Every way the piece leaves the app goes through these buttons, so the end-of-line tidy happens here. */
export function exportButtons(app: App, piece: string, split: { subject: string; message: string } | null = null): HTMLElement {
  const text = tidyEnds(piece);
  const message = tidyEnds(split?.message ?? '');
  const status = h('p', { class: 'export-status', role: 'status' });
  const say = (msg: string, ok = true) => {
    status.textContent = msg;
    status.className = `export-status ${ok ? 'ok' : 'bad'}`;
  };
  const title = () => app.draft?.title ?? 'My writing';
  const guard = (fn: () => Promise<void>) => async () => {
    if (!text.trim()) return say('There is nothing to export yet.', false);
    try {
      await fn();
    } catch (e) {
      say(`That didn't work: ${e instanceof Error ? e.message : String(e)}`, false);
    }
  };

  const btn = (ic: string, label: string, run: () => Promise<void>) =>
    h('button', { class: 'btn export-btn', on: { click: guard(run) } }, icon(ic), h('span', null, label));

  const paste = isMac ? '⌘V' : 'Ctrl+V';
  const copyButtons = split
    ? [
        btn('copy', 'Copy subject', async () => {
          await copyText(split.subject);
          say(`Copied the subject. Paste it into your email with ${paste}.`);
        }),
        btn('copy', 'Copy message', async () => {
          await copyText(message);
          say(`Copied the message. Paste it into your email with ${paste}.`);
        }),
        btn('copy', 'Open in my email app', async () => {
          try {
            const whole = await openInEmailApp(split.subject, message);
            say(whole ? 'Your email app has it. Add who it goes to, then send it from there.' : `Your message is long, so it's copied. Paste it into the new email with ${paste}.`);
          } catch (e) {
            console.error('Opening the email app failed', e);
            say('No email app opened. Use Copy subject and Copy message instead.', false);
          }
        }),
      ]
    : [btn('copy', 'Copy', async () => {
        await copyText(text);
        say(`Copied. Paste it into your email or document with ${paste}.`);
      })];

  return h('div', null,
    h('div', { class: 'export-row' },
      ...copyButtons,
      btn('save', 'Save as .txt', async () => {
        const r = await saveAs(toTxt(text), fileNameFor(title(), 'txt'), { name: 'Text file', ext: 'txt' });
        if (r.saved) say(`Saved to ${r.where}`);
      }),
      btn('save', 'Save as Word (.docx)', async () => {
        const r = await saveAs(await toDocx(text, title()), fileNameFor(title(), 'docx'), { name: 'Word document', ext: 'docx' });
        if (r.saved) say(`Saved to ${r.where}`);
      }),
      btn('print', 'Print / Save as PDF', async () => {
        await printText(text, title());
        say(isMac ? 'For a PDF, click the PDF menu at the bottom of the print window, then Save as PDF.' : 'For a PDF, choose "Microsoft Print to PDF" as the printer.');
      })),
    status);
}
