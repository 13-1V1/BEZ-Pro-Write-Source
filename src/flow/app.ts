// Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA
// brennanmmeyer@gmail.com

// Holds the current draft and loaded data, draws the shell (progress bar,
// screen, side panel, Back/Next), and moves between screens.

import { autoTitle } from '../drafts/drafts';
import { isWeb } from '../storage/store';
import { scenarioById } from '../practice/practice';
import type { Draft, Relationship } from '../drafts/model';
import type { Profile } from '../profiles/profiles';
import type { Prefs } from '../prefs/prefs';
import type { LoadProblem } from '../types/load';
import { findTopic, sectionsFor } from '../types/merge';
import type { LoadedType, Section, Topic } from '../types/schema';
import type { WordLists } from '../wordlists/load';
import { clear, h } from '../ui/dom';
import { cmdKey, keyLabel } from '../ui/platform';
import { stopSpeaking } from '../ui/speak';
import { outline } from './outline';
import { buildSteps, progressFor, type Step } from './steps';

export const SAVE_FAILED = "Couldn't save your latest changes. Copy your writing somewhere safe, then try File > Save now.";

export interface ScreenView {
  body: HTMLElement;
  /** Show the "Your plan" + stats side panel. */
  side?: boolean;
  /** Return a plain message to stop Next, or null to go on. */
  beforeNext?: () => string | null;
  nextLabel?: string;
  /** Extra button(s) shown between Back and Next, e.g. Skip. */
  middle?: HTMLElement;
  /** Element to focus after drawing. */
  focus?: HTMLElement;
  /** Redraw what depends on spelling results when they arrive. */
  refresh?: () => void;
}

export type ScreenFn = (app: App, step: Step) => ScreenView;

export interface AppData {
  types: LoadedType[];
  typeProblems: LoadProblem[];
  profiles: Profile[];
  prefs: Prefs;
  lists: WordLists;
  listProblems: string[];
  relationships: Record<Relationship, { tip: string; formalGreeting: boolean }>;
}

export interface Hooks {
  screens: Record<string, ScreenFn>;
  home: (app: App) => HTMLElement;
  settings: (app: App, back: () => void, tab?: string) => HTMLElement;
  sidePanel: (app: App) => HTMLElement;
  save: (draft: Draft) => Promise<void>;
  /** Called on every text change so side stats can refresh. */
  onChange?: (app: App) => void;
  /** Called after a save worked (status bar "Saved" time). */
  onSaved?: (app: App) => void;
  /** Called after any screen is drawn (menu bar title, etc.). */
  onRender?: (app: App) => void;
  /** Called when the user moves from one step to another (e.g. to save a version). */
  onStep?: (app: App, from: Step | undefined, to: Step) => void;
}

export class App {
  draft: Draft | null = null;
  steps: Step[] = [];
  /** Set when a 7 C's screen sends the user back to edit a section. */
  returnTo: string | null = null;
  private root: HTMLElement;
  private dirty = false;
  private saving: Promise<void> = Promise.resolve();
  private sideEl: HTMLElement | null = null;
  private msgEl: HTMLElement | null = null;
  private view: ScreenView | null = null;
  /** The "All steps" list under the top bar is open. */
  private outlineOpen = false;
  /** The draft left open while a page (guide, practice, settings) is showing. */
  private paused: Draft | null = null;

  constructor(root: HTMLElement, public data: AppData, private hooks: Hooks) {
    this.root = root;
    document.addEventListener('keydown', (e) => this.onKey(e));
    setInterval(() => void this.flush(), 3000);
    window.addEventListener('beforeunload', (e) => {
      // A web page can be closed before a save finishes: ask the browser to hold it.
      if (isWeb && this.dirty) e.preventDefault();
      void this.flush();
    });
    // Save when the window loses focus or is hidden, too (switching apps, minimizing).
    window.addEventListener('blur', () => void this.flush());
    document.addEventListener('visibilitychange', () => { if (document.hidden) void this.flush(); });
  }

  get type(): LoadedType | undefined {
    return this.data.types.find((t) => t.id === this.draft?.typeId);
  }
  get topic(): Topic | undefined {
    return findTopic(this.type, this.draft?.topicId ?? null);
  }
  get sections(): Section[] {
    return this.type ? sectionsFor(this.type, this.topic) : [];
  }
  get profile(): Profile | undefined {
    return this.data.profiles.find((p) => p.id === this.draft?.profileId);
  }

  rebuildSteps(): void {
    // Exactly one saved profile: use it without asking.
    const profiles = this.data.profiles;
    if (this.draft && profiles.length === 1 && this.draft.profileId !== profiles[0].id) {
      this.draft.profileId = profiles[0].id;
      this.draft.profileFilled = {};
    }
    this.steps = buildSteps(this.type, this.sections, this.data.profiles.length, scenarioById(this.draft?.practiceId)?.focus);
  }

  get index(): number {
    const i = this.steps.findIndex((s) => s.key === this.draft?.stepKey);
    return i < 0 ? 0 : i;
  }

  /** Mark the draft as changed; autosave picks it up within a few seconds. */
  changed(): void {
    this.dirty = true;
    this.hooks.onChange?.(this);
  }

  /**
   * Save now if anything changed. Waits for every save already in progress
   * first (one may start while we wait, e.g. the 3 s timer and a close request
   * in the same moment), so closing the window can't cut a save off halfway.
   * Returns false if the latest changes could not be saved.
   */
  async flush(): Promise<boolean> {
    let running: Promise<void>;
    do {
      running = this.saving;
      await running;
    } while (running !== this.saving);
    if (!this.draft || !this.dirty) return !this.dirty;
    this.dirty = false;
    const draft = this.draft;
    this.saving = (async () => {
      try {
        await this.hooks.save(draft);
        this.hooks.onSaved?.(this);
      } catch (e) {
        this.dirty = true;
        console.error('Autosave failed', e);
      }
    })();
    await this.saving;
    if (this.dirty) this.say(SAVE_FAILED);
    return !this.dirty;
  }

  /** Save right away (File > Save now). */
  async saveNow(): Promise<boolean> {
    if (!this.draft) return true;
    this.dirty = true;
    return this.flush();
  }

  /** Before leaving the draft: save, and stay put if that failed. */
  private async leaveDraft(): Promise<boolean> {
    if (!(await this.flush()) && this.draft) return false;
    this.returnTo = null;
    stopSpeaking();
    return true;
  }

  open(draft: Draft): void {
    this.draft = draft;
    this.returnTo = null;
    this.rebuildSteps();
    // The type or topic file may have been removed since this draft was saved.
    if (!draft.typeId || (draft.typeId && !this.type)) draft.stepKey = 'type';
    else if (this.type && this.type.topics.length > 0 && !this.topic && draft.stepKey !== 'type') draft.stepKey = 'topic';
    if (!this.steps.some((s) => s.key === draft.stepKey)) draft.stepKey = this.steps[0].key;
    autoTitle(draft, this.type?.name, this.topic?.name);
    this.render();
  }

  go(key: string): void {
    if (!this.draft) return;
    if (!key.startsWith('write:')) this.returnTo = null;
    this.rebuildSteps();
    const from = this.steps.find((s) => s.key === this.draft!.stepKey);
    this.draft.stepKey = this.steps.some((s) => s.key === key) ? key : this.steps[0].key;
    const to = this.steps.find((s) => s.key === this.draft!.stepKey)!;
    if (from?.key !== to.key) this.hooks.onStep?.(this, from, to);
    this.changed();
    this.render();
  }

  next(): void {
    if (!this.draft || !this.view) return;
    const stop = this.view.beforeNext?.() ?? null;
    if (stop) return this.say(stop);
    this.rebuildSteps();
    const i = this.index;
    if (i < this.steps.length - 1) this.go(this.steps[i + 1].key);
    else void this.goHome();
  }

  back(): void {
    if (!this.draft) return;
    this.rebuildSteps();
    const i = this.index;
    if (i === 0) return void this.goHome();
    this.go(this.steps[i - 1].key);
  }

  async goHome(): Promise<void> {
    if (!(await this.leaveDraft())) return;
    this.draft = null;
    this.paused = null;
    this.view = null;
    clear(this.root);
    this.root.append(this.hooks.home(this));
    this.hooks.onRender?.(this);
  }

  async goSettings(tab?: string): Promise<void> {
    await this.goPage((app, back) => this.hooks.settings(app, back, tab));
  }

  /**
   * Show a page outside the writing flow (the guide, practice list, settings).
   * If a draft was open, `back()` on the page returns to it on the same step,
   * even after going from one page to another.
   */
  async goPage(render: (app: App, back: () => void) => HTMLElement): Promise<void> {
    if (!(await this.leaveDraft())) return;
    if (this.draft) this.paused = this.draft;
    this.draft = null;
    this.view = null;
    const back = () => {
      const d = this.paused;
      this.paused = null;
      if (d) this.open(d);
      else void this.goHome();
    };
    clear(this.root);
    this.root.append(render(this, back));
    this.hooks.onRender?.(this);
  }

  /** Show a short note above the nav bar (never a popup). */
  say(msg: string): void {
    if (!this.msgEl) return;
    this.msgEl.textContent = msg;
    this.msgEl.hidden = false;
  }

  /** New spelling results: redraw the screen's own highlights, if it has any. */
  refreshView(): void {
    this.view?.refresh?.();
  }

  refreshSide(): void {
    if (!this.sideEl || !this.view?.side) return;
    this.sideEl.replaceWith((this.sideEl = this.hooks.sidePanel(this)));
  }

  render(): void {
    if (!this.draft) return;
    stopSpeaking();
    this.rebuildSteps();
    const step = this.steps[this.index];
    const fn = this.hooks.screens[step.stage];
    const view = (this.view = fn(this, step));
    const section = this.sections.find((s) => s.id === step.sectionId);
    const prog = progressFor(this.steps, this.index, section?.label);

    this.msgEl = h('p', { class: 'nav-msg', role: 'status', hidden: true });
    this.sideEl = view.side ? this.hooks.sidePanel(this) : null;

    clear(this.root);
    this.root.append(
      h('header', { class: 'topbar' },
        h('button', { class: 'btn small', on: { click: () => void this.goHome() } }, 'Home'),
        h('div', { class: 'progress' },
          h('div', { class: 'progress-label' },
            h('strong', null, `Step ${prog.stageIndex} of ${prog.stageCount}`), ` · ${prog.stageName}`,
            prog.detail ? h('span', { class: 'muted' }, ` · ${prog.detail}`) : null),
          h('div', { class: 'progress-track', role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(prog.fraction * 100) },
            h('div', { class: 'progress-fill', style: `width:${Math.max(2, prog.fraction * 100)}%` }))),
        h('button', { class: 'btn small', 'aria-expanded': String(this.outlineOpen), 'aria-controls': 'outline',
          on: { click: () => { this.outlineOpen = !this.outlineOpen; this.render(); } } }, this.outlineOpen ? 'Hide steps' : 'All steps')),
      ...(this.outlineOpen ? [h('div', { id: 'outline' }, outline(this.steps, this.index, this.draft, this.sections, (key) => this.go(key)))] : []),
      h('div', { class: view.side ? 'stage with-side' : 'stage' },
        h('main', { class: 'screen', id: 'screen' }, view.body),
        this.sideEl),
      h('footer', { class: 'navbar' },
        this.msgEl,
        h('div', { class: 'nav-row' },
          h('button', { class: 'btn nav-back', title: `Back (${keyLabel('Ctrl+Shift+Enter')})`, on: { click: () => this.back() } }, '← Back'),
          h('div', { class: 'nav-middle' }, view.middle),
          this.index < this.steps.length - 1
            ? h('button', { class: 'btn primary nav-next', title: `Next (${keyLabel('Ctrl+Enter')})`, on: { click: () => this.next() } }, view.nextLabel ?? 'Next →')
            : h('button', { class: 'btn primary nav-next', on: { click: () => void this.goHome() } }, 'Done — back to Home'))),
    );
    const screen = this.root.querySelector('#screen') as HTMLElement;
    screen.scrollTop = 0;
    (view.focus ?? screen.querySelector<HTMLElement>('h1'))?.focus({ preventScroll: true });
    this.hooks.onRender?.(this);
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.draft || !(cmdKey(e) && e.key === 'Enter')) return;
    e.preventDefault();
    if (e.shiftKey) this.back();
    else this.next();
  }
}
