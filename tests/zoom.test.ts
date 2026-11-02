// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Ctrl +/- zoom steps (the browser steps, 25% to 500%), Ctrl+0 back to 100%.

import { describe, expect, it } from 'vitest';
import { cleanZoom, zoomFor } from '../src/ui/zoom';

describe('zoomFor', () => {
  it('steps up and down like a browser', () => {
    expect(zoomFor('Equal', '=', 1)).toBe(1.1);
    expect(zoomFor('NumpadAdd', '+', 1.1)).toBe(1.25);
    expect(zoomFor('Minus', '-', 1)).toBe(0.9);
    expect(zoomFor('NumpadSubtract', '-', 0.9)).toBe(0.8);
  });
  it('a level between steps moves to the next step', () => {
    expect(zoomFor('Equal', '=', 1.2)).toBe(1.25);
    expect(zoomFor('Minus', '-', 1.2)).toBe(1.1);
  });
  it('stays between 25% and 500%', () => {
    expect(zoomFor('Equal', '=', 5)).toBe(5);
    expect(zoomFor('Minus', '-', 0.25)).toBe(0.25);
  });
  it('Ctrl+0 resets, other keys are not zoom keys', () => {
    expect(zoomFor('Digit0', '0', 1.75)).toBe(1);
    expect(zoomFor('KeyS', 's', 1)).toBeNull();
  });
});

describe('cleanZoom', () => {
  it('rounds and clamps what the window reports', () => {
    expect(cleanZoom(1.2500001)).toBe(1.25);
    expect(cleanZoom(9)).toBe(5);
  });
});
