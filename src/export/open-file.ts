// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// "Open a file I wrote": read the user's own .txt or Word (.docx) file into
// the Check something I wrote box. Uses the webview's file picker (no file
// access permission needed); .docx text comes from mammoth (BSD-2-Clause),
// loaded only when a Word file is picked.

export type OpenResult = { ok: true; text: string; name: string } | { ok: false; message: string } | null;

/** Plain text from a Word file: one paragraph per line, a blank line between them. */
export async function docxText(data: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth');
  // The webview build reads `arrayBuffer`; the Node build (tests) reads `buffer`. Both unzip the same bytes.
  const { value } = await mammoth.extractRawText({ arrayBuffer: data, buffer: data } as unknown as { arrayBuffer: ArrayBuffer });
  return value.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export async function readPicked(file: File): Promise<OpenResult> {
  const name = file.name;
  try {
    if (/\.docx$/i.test(name)) return { ok: true, name, text: await docxText(await file.arrayBuffer()) };
    if (/\.(txt|text|md)$/i.test(name) || file.type.startsWith('text/')) return { ok: true, name, text: (await file.text()).replace(/\r\n/g, '\n').trim() };
    return { ok: false, message: `"${name}" isn't a .txt or Word (.docx) file. For a PDF or an old .doc file, copy the text and paste it here.` };
  } catch (e) {
    console.error('Opening a file failed', e);
    return { ok: false, message: `Couldn't read "${name}". If it opens in Word, copy the text and paste it here.` };
  }
}

/** Show the system file picker; resolves null if the user cancels. */
export function pickFile(): Promise<OpenResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.docx,text/plain';
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      resolve(f ? readPicked(f) : null);
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
