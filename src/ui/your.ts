// Created by: Brennan Meyer with use of Claude Code 10/31/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// "Your greeting", "Your ask" — without doubling it when the section is
// already named "Your writing" or "Your address".

export function yourLabel(label: string, lowercase = true): string {
  const name = label.trim();
  if (/^your\b/i.test(name)) return name.charAt(0).toUpperCase() + name.slice(1);
  return `Your ${lowercase ? name.toLowerCase() : name}`;
}
