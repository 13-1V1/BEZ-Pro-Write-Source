// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// One-time importer: copies write-good's adverb and passive-voice word lists
// into data/wordlists/ so they stay editable. Run: node tools/import-write-good.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HEADER = 'Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA / brennanmmeyer@gmail.com';

// Pull the first `[ ... ]` array literal out of a source file.
function firstArray(file) {
  const src = readFileSync(require.resolve(file), 'utf8');
  const body = src.slice(src.indexOf('['), src.indexOf('];') + 1);
  return JSON.parse(body.replace(/'/g, '"').replace(/,\s*]/, ']'));
}

const adverbStems = firstArray('adverb-where/adverbs.js');
// "many" and "very" sneak in from stems "man"/"ver" but aren't -ly adverbs ("very" is on the filler list).
const NOT_ADVERBS = new Set(['many', 'very']);
const adverbs = adverbStems.map((s) => s + 'y').filter((w) => !NOT_ADVERBS.has(w));
const irregulars = firstArray('passive-voice/passive.js');

const write = (name, data) =>
  writeFileSync(new URL(`../data/wordlists/${name}`, import.meta.url), JSON.stringify(data, null, 2) + '\n');

write('adverbs.json', {
  _header: HEADER,
  _source: 'Adverb list from adverb-where (MIT, Matt Blair), used by write-good (MIT, Brian Ford).',
  words: adverbs,
});
write('passive.json', {
  _header: HEADER,
  _source: 'Irregular past participles from passive-voice (MIT), used by write-good (MIT, Brian Ford). Regular "-ed" forms are matched automatically.',
  helpers: ['am', 'are', 'were', 'being', 'is', 'been', 'was', 'be'],
  words: irregulars,
});
console.log(`adverbs: ${adverbs.length}, passive: ${irregulars.length}`);
