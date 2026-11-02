// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// @vitest-environment happy-dom
// Settings files and type files (11/01/2026 seams review). Each failed on the code before the fix.

import { beforeEach, describe, expect, it } from 'vitest';
import email from '../data/types/email.json';
import { loadProfiles, profileText } from '../src/profiles/profiles';
import { damagedFiles, readFile, readJson, writeJson } from '../src/storage/store';
import { validateType } from '../src/types/validate';

beforeEach(() => { localStorage.clear(); damagedFiles.clear(); });

describe('damaged settings files', () => {
  it('a profile field that is not text becomes blank instead of breaking the signature', async () => {
    localStorage.setItem('bez:settings/profiles.json', JSON.stringify([{ id: 'a', name: 'Sam Lee', title: null, phone: 5551234 }]));
    const [p] = await loadProfiles();
    expect(() => profileText(p, ['name', 'title', 'phone'])).not.toThrow();
    expect(profileText(p, ['name', 'title', 'phone'])).toBe('Sam Lee');
  });

  it('an unreadable file is reported, and kept as a copy before it is replaced', async () => {
    localStorage.setItem('bez:settings/wordlists.json', '{ broken');
    expect(await readJson('settings/wordlists.json')).toBeNull();
    expect(damagedFiles.has('settings/wordlists.json')).toBe(true);
    await writeJson('settings/wordlists.json', { vague: [] });
    expect(await readFile('settings/wordlists.json.damaged')).toBe('{ broken');
  });
});

describe('type files', () => {
  const withTopic = (topic: Record<string, unknown>) => ({ ...email, topics: [...email.topics, topic] });
  const base = { id: 'x', name: 'X', tone: 't', dos: [], donts: [] };

  it('a topic override with the wrong shape is a plain problem, not a crash later', () => {
    const v = validateType(withTopic({ ...base, sectionOverrides: { purpose: { phrases: 'abc' } } }));
    expect(v.ok).toBe(false);
  });

  it('two topics with the same id are a plain problem', () => {
    const v = validateType(withTopic({ ...base, id: 'general' }));
    expect(v.ok).toBe(false);
  });

  it('readingTarget uses the same 30–80 range as the Settings slider', () => {
    expect(validateType({ ...email, readingTarget: 90 }).ok).toBe(false);
    expect(validateType({ ...email, readingTarget: 70 }).ok).toBe(true);
  });
});
