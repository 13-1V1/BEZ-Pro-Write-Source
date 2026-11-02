// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// The natural voice, seen from the window: starts the worker once, finds the
// voice files (bundled with the desktop app, downloaded once on the web), and
// plays the clips in order as they arrive. Pitch is the playback rate.

import { inTauri, isWeb } from '../storage/store';
import { speechChunks } from './chunks';
import { modelSpeed, voiceById } from './voices';

const HF = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/1939ad2a8e416c0acfeecc08a694d14ef25f2231/';

export interface SpeakOptions { voice: string; speed: number; pitch: number }
export interface SpeakEvents { onStart?(): void; onEnd?(): void; onFail?(error: string): void }

/** Download progress of the voice model, 0-100 (web version, first use only). */
let progressListener: ((percent: number) => void) | null = null;

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let job = 0;
let current: { job: number; ctx: AudioContext; events: SpeakEvents } | null = null;

/** The natural voice needs WebGPU (on the processor alone it talks slower than it reads). */
export async function naturalVoiceAvailable(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try { return (await gpu.requestAdapter()) !== null; } catch { return false; }
}

async function bases(): Promise<{ modelBase: string | null; voiceBase: string }> {
  if (inTauri) {
    const { resolveResource } = await import('@tauri-apps/api/path');
    const { convertFileSrc } = await import('@tauri-apps/api/core');
    const root = convertFileSrc(await resolveResource('voice-pack'));
    return { modelBase: `${root}/`, voiceBase: `${root}/voices/` };
  }
  // Dev server: the downloaded copy in voice-pack/ (Vite serves the project folder).
  if (import.meta.env.DEV) return { modelBase: '/voice-pack/', voiceBase: '/voice-pack/voices/' };
  // Web version: Hugging Face, kept by the browser after the first time.
  return { modelBase: null, voiceBase: `${HF}voices/` };
}

/** Start loading the voice (the first time takes several seconds). */
export function loadVoice(): Promise<void> {
  ready ??= (async () => {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.addEventListener('message', onMessage);
    const b = await bases();
    await new Promise<void>((resolve, reject) => {
      const once = (e: MessageEvent) => {
        if (e.data.type === 'loaded') { worker!.removeEventListener('message', once); resolve(); }
        if (e.data.type === 'failed' && e.data.job === undefined) { worker!.removeEventListener('message', once); reject(new Error(e.data.error)); }
      };
      worker!.addEventListener('message', once);
      worker!.postMessage({ type: 'load', ...b });
    });
  })().catch((e) => { ready = null; worker?.terminate(); worker = null; throw e; });
  return ready;
}

export function voiceLoaded(): boolean {
  return worker !== null && ready !== null;
}

let playAt = 0;
let pitch = 1;
let pending = 0;
let finished = false;

function onMessage(e: MessageEvent): void {
  const m = e.data;
  if (m.type === 'progress') { progressListener?.(m.percent); return; }
  if (!current || m.job !== current.job) return;
  if (m.type === 'clip') {
    const { ctx } = current;
    const audio = m.audio as Float32Array;
    const buf = ctx.createBuffer(1, audio.length, 24000);
    buf.copyToChannel(audio as Float32Array<ArrayBuffer>, 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = pitch;
    src.connect(ctx.destination);
    // A short breath between sentences, the way people read.
    const start = Math.max(playAt, ctx.currentTime + 0.05);
    src.start(start);
    if (m.index === 0) current.events.onStart?.();
    playAt = start + buf.duration / pitch + 0.12;
    pending++;
    src.onended = () => { pending--; if (finished && pending === 0) end(); };
  } else if (m.type === 'done') {
    finished = true;
    if (pending === 0) end();
  } else if (m.type === 'failed') {
    const ev = current.events;
    stopNatural();
    ev.onFail?.(m.error);
  }
}

function end(): void {
  const c = current;
  if (!c) return;
  current = null;
  void c.ctx.close();
  c.events.onEnd?.();
}

/** Read the text aloud with the natural voice. Resolves once the voice is loaded and the job is sent. */
export async function speakNatural(text: string, opts: SpeakOptions, events: SpeakEvents & { onProgress?(percent: number): void }): Promise<void> {
  stopNatural();
  const chunks = speechChunks(text);
  if (chunks.length === 0) return events.onEnd?.();
  const my = ++job;
  // The AudioContext is made before any waiting, while the click still counts as the user's.
  const ctx = new AudioContext();
  current = { job: my, ctx, events };
  playAt = 0; pending = 0; finished = false; pitch = opts.pitch;
  // Only the web version downloads; the desktop reads the bundled files in a moment.
  progressListener = isWeb ? events.onProgress ?? null : null;
  try { await loadVoice(); } finally { progressListener = null; }
  if (current?.job !== my) return;
  void ctx.resume();
  worker!.postMessage({ type: 'say', job: my, chunks, mix: voiceById(opts.voice).mix, speed: modelSpeed(opts.speed, opts.pitch) });
}

export function stopNatural(): void {
  if (!current) return;
  worker?.postMessage({ type: 'cancel', job: current.job });
  const c = current;
  current = null;
  void c.ctx.close();
}

/** On the web the first use downloads the voice; say how big it is. */
export const firstUseNote = isWeb ? 'The first time downloads the voice (about 350 MB).' : '';
