// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Read it aloud: how writing is cut into spoken pieces, the voice list, and the speed/pitch math.

import { describe, expect, it } from 'vitest';
import { finishLine, speechChunks } from '../src/speech/chunks';
import { DEFAULT_VOICE, VOICES, modelSpeed, voiceById } from '../src/speech/voices';

describe('speechChunks', () => {
  it('reads a greeting line as its own finished sentence', () => {
    expect(speechChunks('Hi Sam,\n\nThe meeting moved to Tuesday at 3 p.m. Please reply by Friday.\n\nThanks,\nAlex Kim'))
      .toEqual(['Hi Sam.', 'The meeting moved to Tuesday at 3 p.m.', 'Please reply by Friday.', 'Thanks.', 'Alex Kim.']);
  });
  it('keeps the writer\'s own ending punctuation', () => {
    expect(finishLine('Can you make it?')).toBe('Can you make it?');
    expect(finishLine('Subject: Shop schedule')).toBe('Subject: Shop schedule.');
    expect(finishLine('Best regards,')).toBe('Best regards.');
  });
  it('skips lines with nothing to say', () => {
    expect(speechChunks('---\n\n   \nOkay.')).toEqual(['Okay.']);
  });
  it('cuts a very long sentence at a comma', () => {
    const long = `${'We checked the first shelf, '.repeat(15)}and then we stopped.`;
    const parts = speechChunks(long);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((p) => p.length <= 300)).toBe(true);
    expect(parts.join(' ').replace(/\s+/g, ' ')).toBe(long);
  });
});

describe('voices', () => {
  it('has 3 women\'s and 3 men\'s voices whose blends add up to 1', () => {
    expect(VOICES.filter((v) => v.group === 'Women')).toHaveLength(3);
    expect(VOICES.filter((v) => v.group === 'Men')).toHaveLength(3);
    for (const v of VOICES) expect(v.mix.reduce((s, [, w]) => s + w, 0)).toBeCloseTo(1);
  });
  it('an unknown voice id falls back to the default', () => {
    expect(voiceById('nope').id).toBe(DEFAULT_VOICE);
  });
  it('a higher pitch plays faster, so the voice talks slower to keep the chosen speed', () => {
    expect(modelSpeed(1, 1.1)).toBeCloseTo(0.909, 3);
    expect(modelSpeed(1.2, 1)).toBe(1.2);
  });
});
