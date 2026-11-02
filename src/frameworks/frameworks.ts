// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Writing frameworks (STAR, BLUF, PREP, Apology, SBI) from data/frameworks.json.
// A section with "framework": "<id>" shows one small box per part.

import raw from '../../data/frameworks.json';

export interface FrameworkPart {
  id: string;
  label: string;
  question: string;
  tip: string;
  good: string;
  bad: string;
  targetWords: [number, number];
}

export interface Framework {
  id: string;
  name: string;
  intro: string;
  parts: FrameworkPart[];
}

function load(): { frameworks: Record<string, Framework>; problems: string[] } {
  const frameworks: Record<string, Framework> = {};
  const problems: string[] = [];
  for (const [id, f] of Object.entries(raw as Record<string, any>)) {
    if (id.startsWith('_')) continue;
    const ok =
      typeof f?.name === 'string' && typeof f?.intro === 'string' && Array.isArray(f?.parts) && f.parts.length > 0 &&
      f.parts.every((p: any) => ['id', 'label', 'question', 'tip', 'good', 'bad'].every((k) => typeof p?.[k] === 'string'));
    if (!ok) {
      problems.push(`frameworks.json: "${id}" is missing a name, intro, or a part's id/label/question/tip/good/bad.`);
      continue;
    }
    frameworks[id] = {
      id,
      name: f.name,
      intro: f.intro,
      parts: f.parts.map((p: any) => ({ ...p, targetWords: Array.isArray(p.targetWords) ? p.targetWords : [3, 40] })),
    };
  }
  return { frameworks, problems };
}

export const { frameworks: FRAMEWORKS, problems: FRAMEWORK_PROBLEMS } = load();

/** Join the part answers into the section's text: one paragraph, in order. */
export function joinParts(fw: Framework, answers: Record<string, string>): string {
  return fw.parts
    .map((p) => (answers[p.id] ?? '').trim())
    .filter(Boolean)
    .join(' ');
}
