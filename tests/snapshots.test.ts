// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Earlier versions: added only when the writing changed, capped, and restorable.

import { describe, expect, it } from 'vitest';
import { normalizeDraft } from '../src/drafts/model';
import { MAX_SNAPSHOTS, withSnapshot, type Snapshot } from '../src/drafts/snapshots';

describe('snapshots', () => {
  const d = normalizeDraft({ id: 'd', text: { purpose: 'First try.' } });

  it('adds one, then skips an identical one', () => {
    const a = withSnapshot([], d, 'Before the check', 1);
    expect(a.length).toBe(1);
    expect(withSnapshot(a, d, 'Again', 2)).toBe(a);
  });

  it('adds again once the writing changes, and copies (does not share) the text', () => {
    const a = withSnapshot([], d, 'one', 1);
    d.text.purpose = 'Second try.';
    const b = withSnapshot(a, d, 'two', 2);
    expect(b.map((s) => s.text.purpose)).toEqual(['First try.', 'Second try.']);
    d.text.purpose = 'Third.';
    expect(b[1].text.purpose).toBe('Second try.');
  });

  it('skips a draft with no writing yet', () => {
    expect(withSnapshot([], normalizeDraft({ id: 'e' }), 'x')).toEqual([]);
  });

  it(`keeps only the newest ${MAX_SNAPSHOTS}`, () => {
    let list: Snapshot[] = [];
    for (let i = 0; i < MAX_SNAPSHOTS + 5; i++) list = withSnapshot(list, normalizeDraft({ id: 'f', text: { a: `v${i}` } }), `v${i}`, i);
    expect(list.length).toBe(MAX_SNAPSHOTS);
    expect(list[0].label).toBe('v5');
  });
});
