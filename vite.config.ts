// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com
import { defineConfig } from 'vitest/config';

// `vite build --mode web` makes the web version for the BEZ Works site: relative
// paths so it runs from any folder (play/bez-pro-write/), output in dist-web/.
export default defineConfig(({ mode }) => ({
  clearScreen: false,
  base: mode === 'web' ? './' : '/',
  server: { port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
  build: { target: 'es2022', ...(mode === 'web' ? { outDir: 'dist-web' } : {}) },
  // The voice worker loads parts of its engine on demand, which needs module workers.
  worker: { format: 'es' },
  test: { include: ['tests/**/*.test.ts'] },
}));
