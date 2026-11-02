// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Copy / Save .txt / Save .docx / Print buttons on the Finish screen,
// with a plain status line (no popups).

import { copyText } from '../export/clipboard';
import { toDocx } from '../export/docx';
import { printText } from '../export/print';
import { fileNameFor, saveAs } from '../export/save';
import { toTxt } from '../export/txt';
import type { App } from '../flow/app';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { isMac } from '../ui/platform';

export function exportButtons(app: App, text: string): HTMLElement {
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

  return h('div', null,
    h('div', { class: 'export-row' },
      btn('copy', 'Copy', async () => {
        await copyText(text);
        say(`Copied. Paste it into your email or document with ${isMac ? '⌘V' : 'Ctrl+V'}.`);
      }),
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
