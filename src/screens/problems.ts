// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Plain-words banner for data files that didn't load.

import type { App } from '../flow/app';
import { h } from '../ui/dom';

export function problemBanner(app: App): HTMLElement | null {
  const { typeProblems, listProblems } = app.data;
  if (typeProblems.length === 0 && listProblems.length === 0) return null;
  const n = typeProblems.length + listProblems.length;
  return h('details', { class: 'problem-banner', role: 'alert' },
    h('summary', null, `${n === 1 ? 'One saved file has a problem' : `${n} problems with saved files`}. The rest of the app works fine. Show details`),
    typeProblems.map((p) =>
      h('div', { class: 'problem' },
        h('strong', null, `${p.file} (${p.where === 'your folder' ? 'in your types folder' : 'built-in'})`),
        h('ul', null, p.problems.map((m) => h('li', null, m))))),
    listProblems.length ? h('ul', null, listProblems.map((m) => h('li', null, m))) : null);
}
