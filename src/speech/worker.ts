// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Web worker that runs the Kokoro voice on the graphics card (WebGPU), so the
// window stays responsive while it talks. It makes one clip per piece of text
// and sends each back as soon as it's ready.
//
// in:  { type: 'load', modelBase, voiceBase }                -> { type: 'loaded' } | { type: 'failed', error }
//      { type: 'say', job, chunks, mix, speed }               -> { type: 'clip', job, index, audio } ... { type: 'done', job }
//      { type: 'cancel', job }

import { env as hfEnv, Tensor } from '@huggingface/transformers';
import { KokoroTTS } from 'kokoro-js';

const REPO = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const STYLE_SIZE = 256;

let tts: KokoroTTS | null = null;
let voiceBase = '';
const voiceFiles = new Map<string, Promise<Float32Array>>();
let cancelled = -1;

function voiceFile(name: string): Promise<Float32Array> {
  let p = voiceFiles.get(name);
  if (!p) {
    p = fetch(`${voiceBase}${name}.bin`).then(async (r) => {
      if (!r.ok) throw new Error(`Voice file ${name} missing (${r.status})`);
      return new Float32Array(await r.arrayBuffer());
    });
    voiceFiles.set(name, p);
  }
  return p;
}

/** A blend is each voice file times its weight, added up. */
async function blend(mix: [string, number][]): Promise<Float32Array> {
  const parts = await Promise.all(mix.map(async ([name, w]) => [await voiceFile(name), w] as const));
  const out = new Float32Array(parts[0][0].length);
  for (const [arr, w] of parts) for (let i = 0; i < out.length; i++) out[i] += arr[i] * w;
  return out;
}

async function load(msg: { modelBase: string | null; voiceBase: string }): Promise<void> {
  voiceBase = msg.voiceBase;
  // Transformers.js points the engine at a CDN; without a path, the engine uses the copy Vite bundles with this worker.
  delete hfEnv.backends.onnx.wasm!.wasmPaths;
  if (msg.modelBase) {
    // Desktop: the model ships with the app; never reach for the internet.
    hfEnv.allowRemoteModels = false;
    hfEnv.allowLocalModels = true;
    hfEnv.localModelPath = msg.modelBase;
    hfEnv.useBrowserCache = false;
  }
  // Download progress (web version, first time): one message per whole percent of the model file.
  let last = -1;
  tts = await KokoroTTS.from_pretrained(REPO, { dtype: 'fp32', device: 'webgpu', progress_callback: (p) => {
    if (p.status !== 'progress' || !p.file.endsWith('.onnx')) return;
    const pct = Math.floor(p.progress);
    if (pct !== last) { last = pct; (self as unknown as Worker).postMessage({ type: 'progress', percent: pct }); }
  } });
}

async function say(msg: { job: number; chunks: string[]; mix: [string, number][]; speed: number }): Promise<void> {
  const engine = tts!;
  const style = await blend(msg.mix);
  // Use our own style vector (a blend) instead of one of Kokoro's named voices.
  const speak = async (text: string) => {
    let audio: Float32Array | null = null;
    const original = engine.generate_from_ids.bind(engine);
    engine.generate_from_ids = async (ids: Tensor) => {
      const at = STYLE_SIZE * Math.min(Math.max(ids.dims.at(-1)! - 2, 0), 509);
      const { waveform } = await engine.model({
        input_ids: ids,
        style: new Tensor('float32', style.slice(at, at + STYLE_SIZE), [1, STYLE_SIZE]),
        speed: new Tensor('float32', [msg.speed], [1]),
      });
      audio = waveform.data as Float32Array;
      return null as never;
    };
    try {
      // The voice name only picks American English sounds; the style comes from the blend.
      await engine.generate(text, { voice: 'af_heart' });
    } finally {
      engine.generate_from_ids = original;
    }
    return audio!;
  };
  for (let i = 0; i < msg.chunks.length; i++) {
    if (cancelled >= msg.job) return;
    const audio = await speak(msg.chunks[i]);
    if (cancelled >= msg.job) return;
    (self as unknown as Worker).postMessage({ type: 'clip', job: msg.job, index: i, audio }, [audio.buffer]);
  }
  (self as unknown as Worker).postMessage({ type: 'done', job: msg.job });
}

// One job at a time, in order: a new "say" waits for the one before to stop.
let queue: Promise<void> = Promise.resolve();

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type === 'cancel') { cancelled = Math.max(cancelled, msg.job); return; }
  queue = queue.then(async () => {
    try {
      if (msg.type === 'load') { await load(msg); (self as unknown as Worker).postMessage({ type: 'loaded' }); }
      if (msg.type === 'say') await say(msg);
    } catch (err) {
      (self as unknown as Worker).postMessage({ type: 'failed', job: msg.job, error: String(err) });
    }
  });
};
