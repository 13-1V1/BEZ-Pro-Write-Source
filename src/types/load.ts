// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Load built-in type files plus any the user dropped in the data folder's types/ folder.
// A user file with the same id wins. Broken files are reported, never fatal.

import { listFiles, readFile } from '../storage/store';
import type { LoadedType } from './schema';
import { validateType } from './validate';

const builtInFiles = import.meta.glob('../../data/types/*.json', { eager: true, import: 'default' });

export interface LoadProblem {
  file: string;
  where: 'built-in' | 'your folder';
  problems: string[];
}

export interface TypeLoadResult {
  types: LoadedType[];
  problems: LoadProblem[];
}

function fileName(path: string): string {
  return path.split('/').pop()!;
}

export function parseTypeText(text: string): { ok: true; value: unknown } | { ok: false; problems: string[] } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, problems: [`This isn't valid JSON (a comma, quote, or bracket is probably off). Details: ${msg}`] };
  }
}

export async function loadTypes(): Promise<TypeLoadResult> {
  const byId = new Map<string, LoadedType>();
  const problems: LoadProblem[] = [];

  for (const [path, raw] of Object.entries(builtInFiles)) {
    const checked = validateType(raw);
    if (checked.ok) byId.set(checked.value.id, { ...checked.value, source: 'built-in', file: fileName(path) });
    else problems.push({ file: fileName(path), where: 'built-in', problems: checked.problems });
  }

  let userFiles: string[] = [];
  try {
    userFiles = (await listFiles('types')).filter((n) => n.toLowerCase().endsWith('.json'));
  } catch (e) {
    problems.push({ file: 'types folder', where: 'your folder', problems: [String(e)] });
  }
  for (const name of userFiles) {
    const text = await readFile(`types/${name}`);
    if (text === null) continue;
    const parsed = parseTypeText(text);
    const checked = parsed.ok ? validateType(parsed.value) : parsed;
    if (checked.ok) byId.set(checked.value.id, { ...checked.value, source: 'your folder', file: name });
    else problems.push({ file: name, where: 'your folder', problems: checked.problems });
  }

  const types = [...byId.values()].sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name));
  return { types, problems };
}
