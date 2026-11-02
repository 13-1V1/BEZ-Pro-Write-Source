// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Apply a topic's sectionOverrides on top of the type's base sections.
// An override replaces only the fields it names.

import type { Section, Topic, WritingType } from './schema';

export function sectionsFor(type: WritingType, topic: Topic | undefined): Section[] {
  const overrides = topic?.sectionOverrides ?? {};
  return type.sections.map((s) => ({ ...s, ...(overrides[s.id] ?? {}), id: s.id, role: s.role }));
}

export function findTopic(type: WritingType | undefined, topicId: string | null): Topic | undefined {
  return type?.topics.find((t) => t.id === topicId);
}
