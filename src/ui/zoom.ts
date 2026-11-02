// Created by: Brennan Meyer with use of Claude Code 11/02/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Ctrl +/- zooms the whole window, Ctrl+0 goes back to 100% (Cmd on a Mac).
// The level is saved and comes back next time.
// - Windows: WebView2 keeps these keys for itself, so its own zoom is turned on
//   (zoomHotkeysEnabled in tauri.windows.conf.json; Ctrl+mouse wheel works too).
//   A zoom change shows up as a new devicePixelRatio, which is what gets saved.
// - Mac: the keys reach the page, so this file steps the zoom itself.
// - Web version: the browser already zooms the page; nothing to do here.

import { inTauri } from '../storage/store';
import { ZOOM_MAX, ZOOM_MIN, savePrefs, type Prefs } from '../prefs/prefs';
import { cmdKey, isMac, keyLabel } from './platform';

/** The same steps browsers use, so Windows and Mac zoom alike. */
const STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];

/** The next zoom level for a key, or null if the key isn't a zoom key. */
export function zoomFor(code: string, key: string, now: number): number | null {
  if (code === 'Digit0' || code === 'Numpad0') return 1;
  if (code === 'Equal' || code === 'NumpadAdd' || key === '+') return STEPS.find((s) => s > now + 0.001) ?? STEPS[STEPS.length - 1];
  if (code === 'Minus' || code === 'NumpadSubtract' || key === '-') return [...STEPS].reverse().find((s) => s < now - 0.001) ?? STEPS[0];
  return null;
}

/** A zoom level worth saving: two decimals, inside the allowed range. */
export function cleanZoom(z: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

export function setupZoom(prefs: Prefs, say: (msg: string) => void): void {
  if (!inTauri) return;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  const remember = (z: number) => {
    if (z === prefs.zoom) return;
    prefs.zoom = z;
    say(`Zoom ${Math.round(z * 100)}%${z === 1 ? '' : ` (${keyLabel('Ctrl+0')} for 100%)`}`);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void savePrefs(prefs).catch((e) => console.error('Saving zoom failed', e)), 500);
  };

  void (async () => {
    const { getCurrentWebview } = await import('@tauri-apps/api/webview');
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const webview = getCurrentWebview();
    if (prefs.zoom !== 1) await webview.setZoom(prefs.zoom);

    if (isMac) {
      document.addEventListener('keydown', (e) => {
        if (!cmdKey(e) || e.altKey) return;
        const next = zoomFor(e.code, e.key, prefs.zoom);
        if (next === null) return;
        e.preventDefault();
        void webview.setZoom(next).then(() => remember(next)).catch((err) => console.error('Zoom failed', err));
      });
      return;
    }
    // Windows: zoom = page pixels per screen pixel, over the screen's own scaling.
    const scale = getCurrentWindow();
    window.addEventListener('resize', () => {
      void scale.scaleFactor().then((s) => remember(cleanZoom(window.devicePixelRatio / s)));
    });
  })().catch((e) => console.error('Zoom setup failed', e));
}
