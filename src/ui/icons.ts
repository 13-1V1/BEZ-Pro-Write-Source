// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Small 18px line icons for the toolbar (inline SVG, no image files).

const PATHS: Record<string, string> = {
  new: 'M5 2h7l4 4v12H5z M12 2v4h4 M10.5 9v6 M7.5 12h6',
  home: 'M3 10l7-6 7 6 M5 8.5V17h4v-4h2v4h4V8.5',
  save: 'M4 3h10l3 3v11H4z M7 3v5h7V3 M7 17v-5h7v5',
  back: 'M12 5l-5 5 5 5',
  next: 'M8 5l5 5-5 5',
  preview: 'M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z M10 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
  check: 'M4 10.5l4 4 8-9',
  settings: 'M10 7a3 3 0 1 1 0 6 3 3 0 0 1 0-6z M10 2v2.5 M10 15.5V18 M2 10h2.5 M15.5 10H18 M4.3 4.3l1.8 1.8 M13.9 13.9l1.8 1.8 M4.3 15.7l1.8-1.8 M13.9 6.1l1.8-1.8',
  help: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M7.5 7.8a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.8 M10 14.6v.1',
  copy: 'M7 7h9v10H7z M4 13V3h9',
  print: 'M5 8V3h10v5 M3 8h14v6h-2 M5 14H3 M5 11h10v6H5z',
};

export function icon(name: keyof typeof PATHS | string): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('icon');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', PATHS[name] ?? '');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}
