// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// The highlight sweep must produce the same segments as the simple version:
// every flagged piece shows exactly the flags that cover it.

// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import type { Flag } from '../src/checks/types';
import { renderHighlighted } from '../src/ui/highlight';

const f = (c: Flag['c'], start: number, end: number): Flag => ({ c, check: 'x', sectionId: 's', start, end, text: '' });

describe('renderHighlighted', () => {
  const text = 'abcdefghij';
  const flags = [f('clear', 0, 4), f('concise', 2, 6), f('correct', 8, 10), f('complete', 0, 0)];
  const el = renderHighlighted(text, flags, () => {});
  const buttons = [...el.querySelectorAll('.hl')];

  it('keeps all the text, in order', () => {
    expect(el.textContent!.replace(/CL|CS|CR/g, '')).toBe(text);
  });

  it('splits overlaps into pieces covered by the right flags', () => {
    // pieces: ab (clear) | cd (clear+concise) | ef (concise) | gh (none) | ij (correct)
    expect(buttons.map((b) => b.firstChild!.textContent)).toEqual(['ab', 'cd', 'ef', 'ij']);
    expect(buttons[1].getAttribute('aria-label')).toContain('Clear');
    expect(buttons[1].getAttribute('aria-label')).toContain('Concise');
  });

  it('puts each badge at the end of its flag only', () => {
    expect(buttons.map((b) => [...b.querySelectorAll('.hl-badge')].map((x) => x.textContent).join(''))).toEqual(['', 'CL', 'CS', 'CR']);
  });

  it('ignores whole-piece notes with no words to point at', () => {
    expect(el.querySelectorAll('.hl').length).toBe(4);
  });
});

describe('clicking a highlight', () => {
  it('reports exactly the flags covering that piece', () => {
    const picked: Flag[][] = [];
    const el = renderHighlighted('abcdef', [f('clear', 0, 4), f('concise', 2, 6)], (x) => picked.push(x));
    const [, middle] = [...el.querySelectorAll('.hl')];
    (middle as HTMLElement).click();
    expect(picked[0].map((x) => x.c)).toEqual(['clear', 'concise']);
  });
});

describe('highlights behave like text, not boxes', () => {
  it('are inline spans that can be focused and opened with Enter', () => {
    const picked: Flag[][] = [];
    const el = renderHighlighted('abcdef', [f('clear', 0, 6)], (x) => picked.push(x));
    const hl = el.querySelector('.hl') as HTMLElement;
    expect(hl.tagName).toBe('SPAN');
    expect(hl.getAttribute('role')).toBe('button');
    expect(hl.tabIndex).toBe(0);
    hl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(picked.length).toBe(1);
  });
});
