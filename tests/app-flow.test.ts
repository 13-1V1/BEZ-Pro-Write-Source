// Created by: Brennan Meyer with use of Claude Code 11/01/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// @vitest-environment happy-dom
// Saving and moving around (11/01/2026 seams review). Each failed on the code before the fix.

import { describe, expect, it } from 'vitest';
import email from '../data/types/email.json';
import { App, type AppData, type Hooks } from '../src/flow/app';
import { newDraft, type Draft } from '../src/drafts/model';
import { summarize, type ProgressRecord } from '../src/progress/progress';
import { validateType } from '../src/types/validate';
import { defaultLists } from '../src/wordlists/load';
import type { Prefs } from '../src/prefs/prefs';

const defaultPrefs = (): Prefs => ({ fontSize: 'medium', spellUnderlines: false, disabledChecks: [], readingTargets: {}, zoom: 1, voice: 'heart', voiceSpeed: 1, voicePitch: 1 });

const T = (() => { const v = validateType(email); if (!v.ok) throw new Error('bad type'); return { ...v.value, source: 'built-in' as const, file: 'email.json' }; })();
const screen = () => ({ body: document.createElement('div') });

function makeApp(save: (d: Draft) => Promise<void> = async () => {}) {
  const data: AppData = { types: [T], typeProblems: [], profiles: [], prefs: defaultPrefs(), lists: defaultLists(), listProblems: [], relationships: {} as never };
  const pages: string[] = [];
  const hooks: Hooks = {
    screens: { type: screen, topic: screen, profile: screen, prep: screen, write: screen, check: screen, finish: screen },
    home: () => { pages.push('home'); return document.createElement('div'); },
    settings: () => { pages.push('settings'); return document.createElement('div'); },
    sidePanel: () => document.createElement('div'),
    save,
  };
  const root = document.createElement('div');
  return { app: new App(root, data, hooks), pages };
}

const emailDraft = (stepKey: string): Draft => ({ ...newDraft(), typeId: 'email', topicId: 'general', stepKey });

describe('saving', () => {
  it('a second flush in the same moment waits for the save the first one started', async () => {
    const order: string[] = [];
    const { app } = makeApp(async () => { order.push('save start'); await new Promise((r) => setTimeout(r, 20)); order.push('save done'); });
    app.open(emailDraft('prep'));
    app.changed();
    const a = app.flush();
    const b = app.flush().then(() => order.push('second returned'));
    await Promise.all([a, b]);
    expect(order).toEqual(['save start', 'save done', 'second returned']);
  });

  it('a failed save is reported, and Home keeps the draft open', async () => {
    const { app, pages } = makeApp(async () => { throw new Error('disk full'); });
    app.open(emailDraft('prep'));
    app.changed();
    expect(await app.flush()).toBe(false);
    await app.goHome();
    expect(app.draft).not.toBeNull();
    expect(pages).not.toContain('home');
  });
});

describe('moving around', () => {
  it('opening another draft forgets "Return to the 7 C\'s check"', () => {
    const { app } = makeApp();
    app.open(emailDraft('check:clear'));
    app.returnTo = 'check:clear';
    app.open(emailDraft('write:purpose'));
    expect(app.returnTo).toBeNull();
  });

  it('a draft with no type opens on Pick a type, never a write step', () => {
    const { app } = makeApp();
    app.open({ ...newDraft(), stepKey: 'prep' });
    expect(app.draft!.stepKey).toBe('type');
  });

  it('Back from a page opened from another page still returns to the draft', async () => {
    const { app } = makeApp();
    const d = emailDraft('prep');
    app.open(d);
    let back1 = () => {};
    let back2 = () => {};
    await app.goPage((_a, back) => { back1 = back; return document.createElement('div'); });
    await app.goPage((_a, back) => { back2 = back; return document.createElement('div'); });
    back2();
    expect(app.draft).toBe(d);
    void back1;
  });

  it('Settings returns to the draft', async () => {
    const { app } = makeApp();
    const d = emailDraft('prep');
    app.open(d);
    let backFn = () => {};
    (app as unknown as { hooks: Hooks }).hooks.settings = (_a, back) => { backFn = back; return document.createElement('div'); };
    await app.goSettings();
    backFn();
    expect(app.draft).toBe(d);
  });
});

describe('check and Finish screens (11/01/2026 ideas)', () => {
  it('counts the spots an earlier version had, so Finish can say how many the writer cleared', async () => {
    const { spotsIn } = await import('../src/checks/run');
    const { app } = makeApp();
    const d = emailDraft('finish');
    d.text.purpose = 'I am writing to ask for a copy of my lease by Friday, Nov 6.';
    app.open(d);
    const before = { purpose: 'I just really want some stuff about my lease soon.' };
    expect(spotsIn(app, before)).toBeGreaterThan(spotsIn(app, d.text));
  });

  it('says so when every answer is yes but spots are left', async () => {
    const { checkScreen } = await import('../src/screens/check');
    const { app } = makeApp();
    const d = emailDraft('check:concise');
    d.text.purpose = 'I just wanted to really ask about the lease.';
    d.checklist.concise = { 0: 'yes', 1: 'yes' };
    app.open(d);
    const view = checkScreen(app, app.steps.find((s) => s.key === 'check:concise')!);
    const note = [...view.body.querySelectorAll('p.reminder')].find((p) => p.textContent?.startsWith('You answered yes'));
    expect(note && !(note as HTMLElement).hidden).toBe(true);
  });
});

describe('spot stepper (11/01/2026 ideas)', () => {
  it('Next spot walks the highlights and explains each one', async () => {
    const { checkScreen } = await import('../src/screens/check');
    const { app } = makeApp();
    const d = emailDraft('check:concise');
    d.text.purpose = 'I just wanted to really ask about the lease.';
    app.open(d);
    const view = checkScreen(app, app.steps.find((s) => s.key === 'check:concise')!);
    document.body.append(view.body);
    const next = [...view.body.querySelectorAll('button')].find((b) => b.textContent === 'Next spot →')!;
    next.click();
    expect(view.body.querySelector('.spot-stepper')?.textContent).toContain('Spot 1 of');
    expect(view.body.querySelector('.explain-item')).not.toBeNull();
    view.body.remove();
  });
});

describe('Read it aloud (11/01/2026 ideas)', () => {
  it('reads the words, the same button stops, and there is no button without voices', async () => {
    const { speakButton } = await import('../src/ui/speak');
    const w = window as unknown as Record<string, unknown>;
    const saved = w.speechSynthesis;
    delete w.speechSynthesis;
    expect(speakButton(() => 'hi')).toBeNull();
    const spoken: string[] = [];
    const fake = { speaking: false, getVoices: () => [], cancel() { this.speaking = false; }, speak(u: { text: string }) { spoken.push(u.text); this.speaking = true; } };
    w.speechSynthesis = fake;
    w.SpeechSynthesisUtterance ??= class { constructor(public text: string) {} };
    const btn = speakButton(() => 'Please send the lease.')!;
    btn.click();
    // No graphics support here (no WebGPU), so after the quick check it uses the computer's voice.
    await new Promise((r) => setTimeout(r, 0));
    expect(spoken).toEqual(['Please send the lease.']);
    expect(btn.textContent).toBe('Stop reading');
    btn.click();
    expect(fake.speaking).toBe(false);
    expect(btn.textContent).toBe('Read it aloud');
    w.speechSynthesis = saved;
  });
});

describe('progress page (11/01/2026 ideas)', () => {
  const rec = (draftId: string, typeId: string, style: number, concrete: number): ProgressRecord => ({ draftId, at: Date.now(), typeId, words: 100, style,
    spots: { clear: 0, concise: 0, concrete, correct: 0, coherent: 3, complete: 0, courteous: 0 } });

  it('sums up each kind of writing, hints left out of "most spots in"', async () => {
    const { byType } = await import('../src/progress/progress');
    const t = byType([rec('a', 'email', 90, 2), rec('b', 'email', 70, 4), rec('c', 'letter', 60, 0)]);
    expect(t[0]).toMatchObject({ typeId: 'email', finished: 2, style: 80, worst: 'concrete' });
    expect(t[1]).toMatchObject({ typeId: 'letter', worst: null });
  });

  it('draws the style line once there are two scores', async () => {
    const { styleChart } = await import('../src/screens/progress-page');
    expect(styleChart([rec('a', 'email', 90, 0)])).toBeNull();
    const chart = styleChart([rec('a', 'email', 60, 0), rec('b', 'email', 90, 0)])!;
    expect(chart.querySelectorAll('circle')).toHaveLength(2);
    expect(chart.getAttribute('aria-label')).toContain('from 60 to 90');
  });
});

describe('side panel (11/01/2026 ideas)', () => {
  it("keeps the topic's tone and Do's and Don'ts in view while writing", async () => {
    const { sidePanel } = await import('../src/screens/side-panel');
    const { app } = makeApp();
    app.open(emailDraft('write:purpose'));
    const text = sidePanel(app).textContent ?? '';
    const topic = T.topics.find((t) => t.id === 'general')!;
    expect(text).toContain(topic.tone);
    expect(text).toContain(topic.dos[0]);
  });
});

describe('All steps outline (11/01/2026 ideas)', () => {
  it('lists every step with its state, and a click jumps there', async () => {
    const { outline } = await import('../src/flow/outline');
    const { app } = makeApp();
    const d = emailDraft('prep');
    d.text.subject = 'Lease copy by Friday';
    app.open(d);
    const jumps: string[] = [];
    const nav = outline(app.steps, app.index, d, app.sections, (k) => jumps.push(k));
    const buttons = [...nav.querySelectorAll('button')];
    expect(buttons).toHaveLength(app.steps.length);
    expect(buttons.find((b) => b.textContent?.includes('Subject line'))?.getAttribute('aria-label')).toBe('Subject line, done');
    expect(buttons.find((b) => b.getAttribute('aria-current'))?.textContent).toContain('Plan');
    buttons.find((b) => b.textContent?.includes('Subject line'))!.click();
    expect(jumps).toEqual(['write:subject']);
  });
});

describe('framework boxes', () => {
  it('switching topics shows boxes that match the text that gets checked and exported', async () => {
    const letter = (await import('../data/types/letter.json')).default;
    const { writeScreen } = await import('../src/screens/write');
    const { FRAMEWORKS } = await import('../src/frameworks/frameworks');
    const v = validateType(letter);
    if (!v.ok) throw new Error('bad type');
    const { app } = makeApp();
    app.data.types = [{ ...v.value, source: 'built-in', file: 'letter.json' }];
    const d: Draft = { ...newDraft(), typeId: 'letter', topicId: 'apology', stepKey: 'write:details' };
    // Apology answers left over, while the section's text came from the Complaint topic's SBI boxes.
    d.parts.details = Object.fromEntries(FRAMEWORKS.apology.parts.map((p) => [p.id, `old ${p.id}`]));
    d.text.details = 'The SBI answers that get exported.';
    app.open(d);
    writeScreen(app, app.steps.find((s) => s.key === 'write:details')!);
    const { joinParts } = await import('../src/frameworks/frameworks');
    expect(joinParts(FRAMEWORKS.apology, d.parts.details)).toBe(d.text.details);
  });
});

describe('progress focus', () => {
  it('Coherent hints are never the C to work on', () => {
    const rec = (coherent: number, clear: number): ProgressRecord => ({ draftId: String(Math.random()), at: 0, typeId: 'email', words: 100, style: 90,
      spots: { clear, concise: 0, concrete: 0, correct: 0, coherent, complete: 0, courteous: 0 } } as ProgressRecord);
    expect(summarize([rec(5, 1), rec(5, 1)]).focus).toBe('clear');
  });
});
