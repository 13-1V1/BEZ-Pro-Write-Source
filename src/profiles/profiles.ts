// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Sender profiles: the user's own name, title, address, etc., typed once in Settings.

import { readJson, writeJson } from '../storage/store';
import type { ProfileField } from '../types/schema';

export type Profile = { id: string } & Record<ProfileField, string>;

export const PROFILE_LABELS: Record<ProfileField, string> = {
  name: 'Full name',
  title: 'Job title',
  address: 'Address',
  phone: 'Phone',
  email: 'Email',
  signature: 'Signature line',
};

const FILE = 'settings/profiles.json';

export function blankProfile(): Profile {
  return { id: Date.now().toString(36), name: '', title: '', address: '', phone: '', email: '', signature: '' };
}

export async function loadProfiles(): Promise<Profile[]> {
  const list = await readJson<Profile[]>(FILE);
  if (!Array.isArray(list)) return [];
  // A damaged file can't break the write screen: any field that isn't text becomes blank.
  return list.filter((p) => p && typeof p.id === 'string').map((p) => {
    const clean = blankProfile();
    for (const k of Object.keys(clean) as (keyof Profile)[]) if (typeof p[k] === 'string') clean[k] = p[k];
    return clean;
  });
}

export async function saveProfiles(list: Profile[]): Promise<void> {
  await writeJson(FILE, list);
}

/** Text for one section from a profile: the asked-for fields in order, one per line, blanks left out. */
export function profileText(profile: Profile, fields: ProfileField[]): string {
  return fields
    .map((f) => profile[f].trim())
    .filter(Boolean)
    .join('\n');
}

export function profileLabel(p: Profile): string {
  return [p.name || 'Unnamed profile', p.title].filter(Boolean).join(' — ');
}
