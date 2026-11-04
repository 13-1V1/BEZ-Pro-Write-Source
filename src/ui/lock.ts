// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// "Locked" reference text: tips, examples, and phrase banks can be read but
// not selected, copied, or dragged, so the user types every word themselves.

const BLOCKED = ['copy', 'cut', 'dragstart', 'selectstart', 'contextmenu'] as const;

export function lock<T extends HTMLElement>(el: T): T {
  el.classList.add('locked');
  el.setAttribute('draggable', 'false');
  for (const ev of BLOCKED) el.addEventListener(ev, (e) => e.preventDefault());
  return el;
}

// Belt and braces: if a selection somehow reaches locked text (Ctrl+A on the
// page), strip the locked parts out of whatever gets copied.
export function installCopyGuard(): void {
  document.addEventListener('copy', (e) => {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const frag = sel.getRangeAt(0).cloneContents();
    if (!frag.querySelector('.locked') && !sel.anchorNode?.parentElement?.closest('.locked')) return;
    frag.querySelectorAll('.locked').forEach((n) => n.remove());
    e.clipboardData?.setData('text/plain', sel.anchorNode?.parentElement?.closest('.locked') ? '' : frag.textContent ?? '');
    e.preventDefault();
  });
  // A file dropped outside the one box that takes files would replace the whole app window.
  const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
  document.addEventListener('dragover', (e) => {
    if (hasFiles(e)) e.preventDefault();
  });
  // Block dropping anything dragged from inside the app into a text box.
  document.addEventListener('drop', (e) => {
    if (hasFiles(e) || (e.target as HTMLElement)?.closest?.('textarea, input')) e.preventDefault();
  });
}
