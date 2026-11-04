// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Plain-text box with an underline layer behind it (for spell marks).
// The textarea is transparent over a mirror div that draws the underlines.

import { h } from './dom';

export interface Mark {
  start: number;
  end: number;
  title: string;
}

export interface Editor {
  el: HTMLElement;
  textarea: HTMLTextAreaElement;
  setMarks(marks: Mark[]): void;
}

/** Select words in a box and bring them into view. A textarea can't say where a line wraps, so a hidden copy measures it. */
export function selectWords(box: HTMLTextAreaElement, start: number, end: number): void {
  const cs = getComputedStyle(box);
  const probe = h('div', { 'aria-hidden': 'true' }, box.value.slice(0, start));
  probe.style.cssText = `position:absolute;visibility:hidden;box-sizing:border-box;white-space:pre-wrap;overflow-wrap:break-word;width:${box.clientWidth}px;font:${cs.font};line-height:${cs.lineHeight};letter-spacing:${cs.letterSpacing};padding:${cs.padding}`;
  box.parentElement?.append(probe);
  box.scrollTop = Math.max(0, probe.scrollHeight - box.clientHeight / 2);
  probe.remove();
  box.focus({ preventScroll: true });
  box.setSelectionRange(start, end);
  box.scrollIntoView({ block: 'center' });
}

export function createEditor(opts: { id: string; value: string; label: string; rows?: number; onInput: (v: string) => void }): Editor {
  const mirror = h('div', { class: 'editor-mirror', 'aria-hidden': 'true', hidden: true });
  const textarea = h('textarea', {
    id: opts.id,
    class: 'editor-input',
    rows: opts.rows ?? 6,
    spellcheck: false,
    'aria-label': opts.label,
    value: opts.value,
  });
  let marks: Mark[] = [];
  let showing = false;

  // The underline layer is only drawn while there are underlines. Rebuilding it
  // on every keystroke cost ~57 ms at 5,000 words, and typing clears the marks anyway.
  const draw = () => {
    if (marks.length === 0) {
      if (showing) {
        mirror.replaceChildren();
        mirror.hidden = true;
        showing = false;
      }
      return;
    }
    const text = textarea.value;
    const parts: (string | HTMLElement)[] = [];
    let at = 0;
    for (const m of [...marks].sort((a, b) => a.start - b.start)) {
      if (m.start < at || m.end > text.length) continue;
      parts.push(text.slice(at, m.start), h('mark', { class: 'spell' }, text.slice(m.start, m.end)));
      at = m.end;
    }
    // Trailing newline needs a character after it or the mirror is one line short.
    parts.push(text.slice(at) + '​');
    mirror.replaceChildren(...parts);
    mirror.hidden = false;
    showing = true;
    mirror.scrollTop = textarea.scrollTop;
  };

  textarea.addEventListener('input', () => {
    marks = [];
    draw();
    opts.onInput(textarea.value);
  });
  textarea.addEventListener('scroll', () => {
    if (showing) mirror.scrollTop = textarea.scrollTop;
  });

  const el = h('div', { class: 'editor' }, mirror, textarea);
  draw();
  return {
    el,
    textarea,
    setMarks(next) {
      marks = next;
      draw();
    },
  };
}
