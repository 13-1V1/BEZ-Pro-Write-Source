// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Export checks: block-format .docx on US Letter with 1" margins and 12 pt
// Times New Roman, and .txt with Windows line endings. Writes sample files
// to tests/out/ so they can be opened in Word by hand.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import letter from '../data/types/letter.json';
import { normalizeDraft } from '../src/drafts/model';
import { assemble } from '../src/export/assemble';
import { toDocx } from '../src/export/docx';
import { toTxt } from '../src/export/txt';
import { validateType } from '../src/types/validate';

function sampleLetter(): string {
  const v = validateType(letter);
  if (!v.ok) throw new Error('bad type');
  const raw = readFileSync(new URL('./samples/clean-letter.txt', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const text: Record<string, string> = {};
  for (const b of raw.split(/^## /m).slice(1)) {
    const [id, ...r] = b.split('\n');
    text[id.trim()] = r.join('\n').trim();
  }
  return assemble(normalizeDraft({ id: 't', text }), v.value.sections).text;
}

/** Pull word/document.xml out of the .docx (a zip) without extra libraries. */
async function documentXml(bytes: Uint8Array): Promise<string> {
  const { unzipSync, strFromU8 } = await import('fflate');
  return strFromU8(unzipSync(bytes)['word/document.xml']);
}

describe('export', () => {
  const text = sampleLetter();

  it('assembles the letter in block format (blank line between parts, 3 lines above the signature)', () => {
    expect(text.startsWith('24510 Main Street, Apt 3\nSanta Clarita, CA 91321\n\nOctober 28, 2026\n\nMs. Dana Alvarez')).toBe(true);
    expect(text).toContain('Sincerely,\n\n\n\nJordan Reyes');
  });

  it('writes a .docx on US Letter, 1" margins, 12 pt Times New Roman, all left-aligned', async () => {
    const bytes = await toDocx(text, 'Lease copy request');
    mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
    writeFileSync(new URL('./out/sample-letter.docx', import.meta.url), bytes);
    const xml = await documentXml(bytes);
    expect(xml).toMatch(/<w:pgSz w:w="12240" w:h="15840"/);
    expect(xml).toMatch(/<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/);
    expect(xml).toContain('Times New Roman');
    expect(xml).toContain('<w:sz w:val="24"/>');
    expect(xml).not.toMatch(/<w:jc w:val="(center|right|both)"/);
    expect((xml.match(/<w:p>|<w:p /g) ?? []).length).toBe(text.split('\n').length);
  });

  it('writes .txt with Windows line endings', () => {
    const txt = toTxt('a\nb');
    expect(txt).toBe('a\r\nb\r\n');
    mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
    writeFileSync(new URL('./out/sample-letter.txt', import.meta.url), toTxt(text));
  });
});
