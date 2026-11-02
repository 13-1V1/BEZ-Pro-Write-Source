// Created by: Brennan Meyer with use of Claude Code 10/30/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Progress across drafts: each finished piece's scores are kept in
// settings/progress.json, and a summary says which C's are improving and
// which one to work on next.

import { C_IDS, type CId } from '../checks/cs';
import scoring from '../../data/scoring.json';
import { readJson, writeJson } from '../storage/store';

/** C's that only give hints (weight 0, e.g. Coherent) are never picked as the one to work on. */
const HINT_ONLY = new Set(Object.entries(scoring.byC as Record<string, number>).filter(([, w]) => w === 0).map(([c]) => c));

export interface ProgressRecord {
  draftId: string;
  at: number;
  typeId: string | null;
  practiceId?: string;
  words: number;
  style: number | null;
  /** Spots flagged per C when the piece was finished. */
  spots: Record<CId, number>;
}

const FILE = 'settings/progress.json';
export const MAX_RECORDS = 300;
/** How many recent pieces count as "lately". */
export const RECENT = 5;
/** Earlier pieces needed before showing "getting better" / "needs a look". */
export const MIN_TO_COMPARE = 3;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Pure: keep only well-formed records, so one damaged entry can't hide the
 * whole progress panel. Missing C counts become 0; non-number counts drop the record.
 */
export function cleanRecords(raw: unknown): ProgressRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((v): ProgressRecord[] => {
    const r = v as Record<string, unknown>;
    if (!r || typeof r !== 'object' || typeof r.draftId !== 'string' || !isNum(r.at) || !isNum(r.words)) return [];
    const s = r.spots;
    if (!s || typeof s !== 'object' || Array.isArray(s)) return [];
    const counts = s as Record<string, unknown>;
    if (Object.values(counts).some((n) => !isNum(n))) return [];
    const spots = Object.fromEntries(C_IDS.map((c) => [c, isNum(counts[c]) ? counts[c] : 0])) as Record<CId, number>;
    return [{
      draftId: r.draftId,
      at: r.at,
      typeId: typeof r.typeId === 'string' ? r.typeId : null,
      ...(typeof r.practiceId === 'string' ? { practiceId: r.practiceId } : {}),
      words: r.words,
      style: isNum(r.style) ? r.style : null,
      spots,
    }];
  });
}

export async function loadProgress(): Promise<ProgressRecord[]> {
  return cleanRecords(await readJson<unknown>(FILE));
}

/** Pure: add or replace this draft's record (finishing again updates it), newest last. */
export function withRecord(list: ProgressRecord[], rec: ProgressRecord): ProgressRecord[] {
  return [...list.filter((r) => r.draftId !== rec.draftId), rec].sort((a, b) => a.at - b.at).slice(-MAX_RECORDS);
}

export async function recordFinish(rec: ProgressRecord): Promise<void> {
  await writeJson(FILE, withRecord(await loadProgress(), rec));
}

/** Spots per 100 words, so a long letter and a short email compare fairly. */
export function rate(r: ProgressRecord, c: CId): number {
  return r.words > 0 ? ((r.spots[c] ?? 0) / r.words) * 100 : 0;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export type Trend = 'better' | 'worse' | 'same' | 'new';

export interface CSummary {
  c: CId;
  /** Spots per 100 words, averaged over the recent pieces. */
  recentRate: number;
  trend: Trend;
}

export interface ProgressSummary {
  finished: number;
  recentStyle: number | null;
  perC: CSummary[];
  /** The C with the most spots lately, or null when everything is clean. */
  focus: CId | null;
}

/** Pure: compare the last RECENT pieces with the RECENT before them. */
export function summarize(list: ProgressRecord[]): ProgressSummary {
  const recent = list.slice(-RECENT);
  const before = list.slice(-RECENT * 2, -RECENT);
  const perC = C_IDS.map((c): CSummary => {
    const now = avg(recent.map((r) => rate(r, c)));
    // A trend needs enough earlier pieces to compare against, or it's just noise.
    if (before.length < MIN_TO_COMPARE) return { c, recentRate: now, trend: 'new' };
    const then = avg(before.map((r) => rate(r, c)));
    const change = now - then;
    const trend: Trend = Math.abs(change) < 0.25 ? 'same' : change < 0 ? 'better' : 'worse';
    return { c, recentRate: now, trend };
  });
  const styles = recent.map((r) => r.style).filter((s): s is number => s !== null);
  const worst = perC.filter((p) => !HINT_ONLY.has(p.c)).sort((a, b) => b.recentRate - a.recentRate)[0];
  return {
    finished: list.length,
    recentStyle: styles.length ? Math.round(avg(styles)) : null,
    perC,
    focus: worst && worst.recentRate > 0 ? worst.c : null,
  };
}
export interface TypeSummary {
  typeId: string | null;
  finished: number;
  /** Average style score, or null if none of these pieces had one. */
  style: number | null;
  /** All spots per 100 words, averaged. */
  rate: number;
  /** The C with the most spots for this kind of writing (hints left out). */
  worst: CId | null;
}

/** Pure: how each kind of writing is going, most-written first. */
export function byType(list: ProgressRecord[]): TypeSummary[] {
  const groups = new Map<string | null, ProgressRecord[]>();
  for (const r of list) groups.set(r.typeId, [...(groups.get(r.typeId) ?? []), r]);
  return [...groups.entries()].map(([typeId, rs]): TypeSummary => {
    const styles = rs.map((r) => r.style).filter((s): s is number => s !== null);
    const perC = C_IDS.filter((c) => !HINT_ONLY.has(c)).map((c) => ({ c, r: avg(rs.map((x) => rate(x, c))) }));
    const top = [...perC].sort((a, b) => b.r - a.r)[0];
    return {
      typeId,
      finished: rs.length,
      style: styles.length ? Math.round(avg(styles)) : null,
      rate: avg(rs.map((r) => C_IDS.reduce((n, c) => n + rate(r, c), 0))),
      worst: top && top.r > 0 ? top.c : null,
    };
  }).sort((a, b) => b.finished - a.finished);
}
