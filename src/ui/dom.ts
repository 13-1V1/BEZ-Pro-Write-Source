// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Tiny element builder so screens stay readable without a framework.

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown> & { class?: string; on?: Record<string, (e: any) => void> };

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, val] of Object.entries(attrs)) {
      if (val === undefined || val === null || val === false) continue;
      if (key === 'on') {
        for (const [ev, fn] of Object.entries(val as Record<string, (e: Event) => void>)) el.addEventListener(ev, fn);
      } else if (key === 'class') {
        el.className = String(val);
      } else if (key in el && typeof val !== 'string') {
        (el as any)[key] = val;
      } else if (key === 'value' || key === 'checked') {
        (el as any)[key] = val;
      } else {
        el.setAttribute(key, val === true ? '' : String(val));
      }
    }
  }
  append(el, children);
  return el;
}

export function append(el: Node, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}
