// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Print / Save as PDF: fills a white print-only page and opens the system
// print dialog (Windows: "Microsoft Print to PDF"; Mac: the PDF menu). Layout in print.css.

import '../styles/print.css';

export async function printText(text: string, title: string): Promise<void> {
  const root = document.getElementById('print-root')!;
  const page = document.createElement('div');
  page.className = 'print-page';
  page.textContent = text;
  // 1" spacer rows repeat at the top and bottom of every printed page.
  const spacerRow = () => {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.className = 'print-spacer';
    tr.append(td);
    return tr;
  };
  const table = document.createElement('table');
  table.className = 'print-table';
  const head = table.createTHead();
  head.append(spacerRow());
  const foot = table.createTFoot();
  foot.append(spacerRow());
  const cell = table.createTBody().insertRow().insertCell();
  cell.append(page);
  root.replaceChildren(table);
  const oldTitle = document.title;
  document.title = title; // becomes the suggested PDF file name
  const done = () => {
    document.title = oldTitle;
    root.replaceChildren();
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  // On a Mac, Tauri makes window.print() a promise; wait so a refusal reaches the status line.
  try {
    await (window.print() as unknown as Promise<void> | undefined);
  } catch (e) {
    done();
    throw e;
  }
}
