// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Plain .txt export with Windows line endings (CRLF), which every editor on Windows
// and Mac shows right.

export function toTxt(text: string): string {
  return text.replace(/\r?\n/g, '\r\n') + '\r\n';
}
