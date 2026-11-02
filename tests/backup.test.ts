// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Web version backups: what makeBackup writes, readBackup reads back, and bad files are refused in plain words.

import { describe, expect, it } from 'vitest';
import { makeBackup, readBackup } from '../src/storage/backup';

describe('backup files', () => {
  it('reads back what it wrote', () => {
    const files = { 'drafts/a.json': '{"id":"a"}', 'settings/prefs.json': '{}' };
    const got = readBackup(JSON.stringify(makeBackup(files)));
    expect(got).toEqual({ files });
  });

  it('refuses a file that is not JSON', () => {
    expect(readBackup('hello')).toEqual({ problem: "That file isn't a BEZ Pro Write backup (it couldn't be read)." });
  });

  it('refuses JSON that is not a backup', () => {
    expect(readBackup('{"id":"a","text":{}}')).toHaveProperty('problem');
    expect(readBackup('null')).toHaveProperty('problem');
  });

  it('skips entries that are not text or that climb out of the folder', () => {
    const got = readBackup(JSON.stringify({ kind: 'bez-pro-write-backup', made: '', files: { 'drafts/ok.json': 'x', 'drafts/n.json': 5, '../evil.json': 'y' } }));
    expect(got).toEqual({ files: { 'drafts/ok.json': 'x' } });
  });
});
