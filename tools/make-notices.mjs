// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Builds THIRD_PARTY_NOTICES from the license files of the open-source parts
// the app ships with. Run: node tools/make-notices.mjs

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));

const PARTS = [
  { pkg: 'harper.js', what: 'Harper — offline spelling and grammar checking' },
  { pkg: 'write-good', what: 'write-good — source of the adverb, passive-voice, and weasel-word lists' },
  { pkg: 'adverb-where', what: 'adverb-where — adverb list (via write-good)' },
  { pkg: 'passive-voice', what: 'passive-voice — irregular verb list (via write-good)' },
  { pkg: 'weasel-words', what: 'weasel-words — filler/vague word ideas (via write-good)' },
  { pkg: 'too-wordy', what: 'too-wordy — wordy phrase ideas (via write-good)' },
  { pkg: 'syllable', what: 'syllable — syllable counting for the readability score' },
  { pkg: 'docx', what: 'docx — Word (.docx) export' },
  { pkg: 'mammoth', what: 'mammoth — reading Word (.docx) files in Check something I wrote' },
  { pkg: 'jszip', what: 'JSZip — unzipping .docx files (via mammoth; used under its MIT license)' },
  { pkg: '@xmldom/xmldom', what: 'xmldom — reading .docx XML (via mammoth)' },
  { pkg: 'lop', what: 'lop — parsing (via mammoth)' },
  { pkg: 'underscore', what: 'Underscore.js — helpers (via mammoth)' },
  { pkg: 'dingbat-to-unicode', what: 'dingbat-to-unicode — symbol fonts (via mammoth)' },
  { pkg: 'base64-js', what: 'base64-js — encoding (via mammoth)' },
  { pkg: 'xmlbuilder', what: 'xmlbuilder — XML (via mammoth)' },
  { pkg: 'idb-keyval', what: 'idb-keyval — saving drafts in the browser (web version)' },
  { pkg: 'kokoro-js', what: 'kokoro-js — the natural voice for Read it aloud' },
  { pkg: '@huggingface/transformers', what: 'Transformers.js — runs the voice model (via kokoro-js)' },
  { pkg: 'onnxruntime-web', what: 'ONNX Runtime Web — runs the voice model on the graphics card (via Transformers.js)' },
  { pkg: 'phonemizer', what: 'phonemizer — turns words into speech sounds (via kokoro-js); includes eSpeak NG, below' },
  { pkg: '@tauri-apps/api', what: 'Tauri — desktop app framework' },
];

// Parts that aren't npm packages: the voice model and the eSpeak NG engine built into phonemizer.
const OTHER = [
  { what: 'Kokoro-82M — the voice model and voice files (hexgrad; ONNX version by onnx-community)', license: 'Apache-2.0',
    url: 'https://huggingface.co/hexgrad/Kokoro-82M  and  https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX' },
  { what: 'eSpeak NG — pronunciation rules, compiled into phonemizer', license: 'GPL-3.0-or-later',
    url: 'https://github.com/espeak-ng/espeak-ng (source code)  —  full license: https://www.gnu.org/licenses/gpl-3.0.html' },
];

function pkgDir(name) {
  const p = join(root, 'node_modules', name, 'package.json');
  if (!existsSync(p)) throw new Error(`Missing ${name}; run npm install`);
  return dirname(p);
}

let out = 'BEZ Pro Write — Third-party notices\n\nBEZ Pro Write is built with the following open-source software.\nThank you to their authors.\n';
for (const { pkg, what } of PARTS) {
  const dir = pkgDir(pkg);
  const meta = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const file = ['LICENSE', 'LICENSE.md', 'license', 'license.md', 'LICENSE.txt', 'LICENSE_MIT', 'LICENSE_APACHE-2.0'].map((f) => join(dir, f)).find(existsSync);
  const license = typeof meta.license === 'string' ? meta.license : meta.license?.type ?? 'see project';
  out += `\n${'='.repeat(72)}\n${what}\nPackage: ${pkg} ${meta.version} — License: ${license}\n${meta.homepage ?? ''}\n${'-'.repeat(72)}\n`;
  out += file ? readFileSync(file, 'utf8').trim() + '\n' : `Licensed under ${license}. Full text: https://spdx.org/licenses/${license}.html\n`;
}
for (const { what, license, url } of OTHER) {
  out += `\n${'='.repeat(72)}\n${what}\nLicense: ${license}\n${url}\n${'-'.repeat(72)}\nLicensed under ${license}. Full text: https://spdx.org/licenses/${license}.html\n`;
}
writeFileSync(join(root, 'THIRD_PARTY_NOTICES'), out);
console.log(`Wrote THIRD_PARTY_NOTICES (${PARTS.length} packages, ${OTHER.length} other parts)`);
