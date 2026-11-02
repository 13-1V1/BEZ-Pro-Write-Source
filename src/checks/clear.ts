// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// CLEAR: long sentences, walls of text, passive voice, jargon,
// unexplained acronyms, and hard words with a simpler option.

import { wordsOf } from '../scores/words';
import { capsWords, findPhrases, paragraphs, sentences } from './text';
import { flag, isProse, type CheckInput, type Flag } from './types';

const MAX_SENTENCE_WORDS = 25;
const MAX_PARAGRAPH_SENTENCES = 5;
const MAX_PARAGRAPH_WORDS = 100;

export function passiveMatches(
  text: string,
  helpers: string[],
  participles: string[],
  describing: string[] = [],
): { start: number; end: number; text: string }[] {
  const states = new Set(describing.map((w) => w.toLowerCase()));
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // An empty participle list must not leave an empty choice ("is" + anything).
  const irregular = participles.length ? `|${participles.map(esc).join('|')}` : '';
  const re = new RegExp(`\\b(${helpers.map(esc).join('|')})\\s+(\\w+ed${irregular})\\b`, 'gi');
  const out: { start: number; end: number; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    // "indeed", "need", "seed" end in -ed but aren't participles.
    if (/^(indeed|need|seed|speed|feed|bleed|breed|deed|weed|heed|reed|bed|red|shed|sled|wed|fled)$/i.test(m[2])) continue;
    // "I was tired" describes a state, not an action done to someone, unless "by" follows.
    if (states.has(m[2].toLowerCase()) && !/^\s+by\b/i.test(text.slice(m.index + m[0].length))) continue;
    out.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return out;
}

/** Acronyms spelled out earlier as "Full Name (ABC)" anywhere before this point. */
function definedAcronyms(texts: string[]): Set<string> {
  const set = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(/\(([A-Z]{2,5})\)/g)) set.add(m[1]);
  return set;
}

export function clear(input: CheckInput): Flag[] {
  const out: Flag[] = [];
  const { lists } = input;
  const skip = new Set([...lists['common-acronyms'], ...lists['vague-dates']].map((w) => w.toUpperCase()));
  const simpler = new Map(lists.simpler.map((p) => [p.word.toLowerCase(), p.use]));
  const seen: string[] = [];

  for (const { section, text } of input.sections) {
    const id = section.id;
    if (isProse(section.role)) {
      for (const s of sentences(text)) {
        if (wordsOf(s.text).length > MAX_SENTENCE_WORDS)
          out.push(flag('clear', 'long-sentence', id, s.start, s.end, s.text, { detail: `${wordsOf(s.text).length} words` }));
      }
      for (const p of paragraphs(text)) {
        const n = sentences(p.text).length;
        const w = wordsOf(p.text).length;
        if (n > MAX_PARAGRAPH_SENTENCES || w > MAX_PARAGRAPH_WORDS)
          out.push(flag('clear', 'wall-of-text', id, p.start, p.end, p.text, { detail: `${n} sentences, ${w} words` }));
      }
      for (const m of passiveMatches(text, lists.passiveHelpers, lists.passive, lists['passive-exceptions'])) out.push(flag('clear', 'passive', id, m.start, m.end, m.text));

      // Acronyms: a lone 2–5 letter caps word that isn't common and wasn't spelled out
      // earlier as "Full Name (ABC)". Caps words in a run are shouting (Courteous), not acronyms.
      for (const w of capsWords(text, skip)) {
        if (w.inRun || w.text.length > 5 || /['’]/.test(w.text)) continue;
        const isDefinition = text[w.start - 1] === '(' && text[w.end] === ')';
        const definedBefore = definedAcronyms([...seen, text.slice(0, w.start)]).has(w.text);
        if (isDefinition || definedBefore) continue;
        out.push(flag('clear', 'acronym', id, w.start, w.end, w.text));
      }
    }
    for (const r of findPhrases(text, lists.jargon)) out.push(flag('clear', 'jargon', id, r.start, r.end, r.text));
    for (const r of findPhrases(text, [...simpler.keys()]))
      out.push(flag('clear', 'simpler', id, r.start, r.end, r.text, { use: simpler.get(r.text.toLowerCase().replace(/\s+/g, ' ')) }));
    seen.push(text);
  }
  return out;
}
