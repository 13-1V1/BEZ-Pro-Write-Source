// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Word (.docx) export in block format: every line left-aligned, blank line
// between parts, Times New Roman 12 pt, 1" margins, US Letter (8.5" x 11").

import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';

const TWIPS_PER_INCH = 1440;
const PAGE = { width: 8.5 * TWIPS_PER_INCH, height: 11 * TWIPS_PER_INCH };
const MARGIN = 1 * TWIPS_PER_INCH;
const FONT = 'Times New Roman';
const HALF_POINTS_12PT = 24;

export async function toDocx(text: string, title: string): Promise<Uint8Array> {
  const paragraphs = text.split(/\r?\n/).map(
    (line) =>
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 240 },
        children: line ? [new TextRun({ text: line, font: FONT, size: HALF_POINTS_12PT })] : [],
      }),
  );
  const doc = new Document({
    title,
    creator: 'BEZ Pro Write',
    styles: { default: { document: { run: { font: FONT, size: HALF_POINTS_12PT } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE.width, height: PAGE.height },
            margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        children: paragraphs,
      },
    ],
  });
  const blob = await Packer.toBlob(doc);
  return new Uint8Array(await blob.arrayBuffer());
}
