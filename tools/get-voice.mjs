// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Fetches what Read it aloud needs to work offline, once (later runs skip files already there):
//   voice-pack/   the Kokoro voice model and voice files (~330 MB), bundled next to the desktop app.
// The folder is gitignored. Runs before `npm run build` and `npm run dev`. (The web version
// downloads the same files from Hugging Face instead; the voice engine itself is bundled by Vite.)
//
// Usage:  node tools/get-voice.mjs

import { createWriteStream, existsSync, mkdirSync, renameSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const REPO = 'onnx-community/Kokoro-82M-v1.0-ONNX';
// Pinned so every build ships the same model.
const REVISION = '1939ad2a8e416c0acfeecc08a694d14ef25f2231';
const MODEL_FILES = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'onnx/model.onnx'];
const VOICES = ['af_heart', 'af_bella', 'af_sarah', 'am_fenrir', 'am_michael', 'am_puck'];

const PACK = 'voice-pack';

async function download(rel, out) {
  if (existsSync(out) && statSync(out).size > 0) return false;
  mkdirSync(dirname(out), { recursive: true });
  const url = `https://huggingface.co/${REPO}/resolve/${REVISION}/${rel}`;
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}): ${url}`);
  const tmp = `${out}.part`;
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
  renameSync(tmp, out);
  return true;
}

let fetched = 0;
for (const f of MODEL_FILES) if (await download(f, join(PACK, REPO, f))) fetched++;
for (const v of VOICES) if (await download(`voices/${v}.bin`, join(PACK, 'voices', `${v}.bin`))) fetched++;

console.log(fetched ? `Voice files ready (${fetched} downloaded).` : 'Voice files ready.');
