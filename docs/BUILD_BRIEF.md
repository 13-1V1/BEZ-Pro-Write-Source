<!-- Created by: Brennan Meyer with use of Claude Code 10/28/2026 Santa Clarita, CA -->
<!-- brennanmmeyer@gmail.com -->

# BEZ Pro Write — Build Brief

> The original plan. Later decisions (Mac support, no emoji, the Checks tab, more word lists, and others) live in `CLAUDE.md`, and where they differ, `CLAUDE.md` and the code win.

## 1. What it is
A small Windows desktop app that walks a beginner, step by step, through writing a professional piece (email, memo, letter, etc.) using the **7 C's**: Clear, Concise, Concrete, Correct, Coherent, Complete, Courteous.

**The #1 rule: the app never writes or rewrites the user's words.** It asks questions, shows tips and good/bad examples, and points at spots worth a second look. The user types every word. (The only text the app fills in is the user's own saved profile info, like their name and address, which they typed once in Settings.)

**Who it's for:** someone who has never written a professional message and wants it to come out right the first time. Stupid-proof: one thing per screen, plain words, no jargon.

## 2. Before you build
- Search first. As of 10/2026 no app was found that does this guided 7 C's flow; re-check before building. Assemble from free parts:
  - **Harper** (Rust, offline) for spelling/grammar underlines. Use `harper-core` from Rust or `harper.js` in the frontend, whichever is simpler in Tauri.
  - **write-good** (MIT, JavaScript) as the source for passive-voice, adverb, wordy, and weasel-word lists. Copy its lists into our data files (with license credit) so every list stays editable; don't call its built-in lists from code.
  - **syllable** (MIT, npm) for the readability score (Flesch Reading Ease formula computed directly).
  - **docx** (npm) for Word export.
- Check for useful Claude Code skills before starting (e.g. `frontend-design` for the UI pass).

**Inspired by (no AI in any of these features):**
- WriteExpress: sub-topics, do's and don'ts, phrase bank.
- Write a Letter: saved sender profiles.
- StyleWriter: jargon buster, simpler words, live style score, custom rules.
- Hemingway: readability, color-coded issues, stats.
- Rubin Propel: slang, capitals, formal greeting, wall of text, vague dates, exclamation limit.

## 3. Stack
- **Tauri 2** (Rust backend, web frontend). Windows installer (.msi or .exe).
- Tauri plugins: `dialog` (Save As), `fs` (file writes), `clipboard-manager` (copy).
- Frontend: plain TypeScript + Vite. A small framework (Svelte or Preact) is fine if it keeps code simpler. No heavy UI kits.
- Fully offline. No accounts, no internet, no AI.
- Dark theme.

## 4. The flow (one screen at a time; Back / Next on every flow screen after Home)

1. **Home**
   - "Start new writing" button.
   - Recent drafts list (title, last saved time; click to resume where they left off).
   - Settings button (profiles, word rules, font size, spell underlines, About).
2. **Pick a type**
   - Big cards: Email, Memo, Business Letter, Cover Letter, Short Report, Something Else.
   - Each card has a one-line "use this when…" description.
3. **Pick a topic** (skipped if the type has no topics)
   - Example, Business Letter → General, Thank You, Apology, Complaint, Request, Resignation, Reference Request.
   - Each topic shows a short **Do's and Don'ts** list and a **tone note** (e.g. Apology: "Own it. No excuses. Say how you'll fix it.").
4. **Pick a sender profile** (skipped if none saved; if exactly one is saved, it's used automatically)
   - Fills the user's own name, title, address, phone, email, signature into the matching sections.
5. **Prep questions** (before any writing)
   - Who is reading this? (name, role)
   - How well do you know them? (boss / coworker / customer / stranger / teacher). Sets courtesy tips and the greeting check.
   - What do you want them to do or know after reading? (one sentence)
   - Key facts: one per line (dates, times, places, numbers, names).
   - Deadline, if any.
   - Answers stay visible in a "Your plan" side panel for the rest of the flow.
6. **Write, one section per screen**
   - Each section is its own screen with one text box (e.g. Greeting → Purpose → Details → Ask → Closing). Next goes to the next section.
   - Each section shows: what goes here, a plain-words tip, one ✅ good example, one ❌ bad example.
   - **Phrase bank** button per section: a list of sample sentences to read for ideas. Read-only, no insert button.
   - **Locked reference text:** examples, phrase bank, and tips can't be selected, copied, or dragged into a text box, so the user still types every word.
   - Live word count per section with a soft target (e.g. "Purpose: 15–40 words").
   - **Stats panel** (always visible, small): word count, reading time, readability, style score.
   - Toggle a live preview of the full piece.
7. **7 C's check** — one C per screen, in order:
   - Short definition in plain words.
   - 2–4 yes/no checklist questions the user answers honestly.
   - Highlights in their text for that C only (see §6). Clicking a highlight (or Tab to it + Enter) explains why it's flagged and, where there is one, shows a simpler word or a "try this instead" tip. Never auto-fixes.
   - User can jump back to any section to edit, then return.
   - "No" answers are fine; the app reminds them what to look at. Nothing blocks.
   - An "All C's" view shows every highlight at once, color-coded.
8. **Finish**
   - Final full view.
   - Copy to clipboard, Save as .txt, Save as .docx, Print / Save as PDF.
   - Scorecard: which C's got all "yes" answers, final readability score, final style score.

## 5. 7 C's checklist (v1 content)

| C | Checklist questions |
|---|---|
| **Clear** | Is your main point in the first 2 sentences? Does each sentence have one idea? Would a stranger understand every word? |
| **Concise** | Did you cut words that add nothing? Is each point said only once? |
| **Concrete** | Did you use real dates, numbers, and names instead of "soon," "some," "tomorrow"? Did you name exact places, amounts, or people instead of "they" or "it"? |
| **Correct** | Are all names, dates, and numbers right? Did you fix the flagged spelling, grammar, and slang? |
| **Coherent** | Does each paragraph stick to one topic? Does the order make sense from start to finish? |
| **Complete** | Does it answer who, what, when, where, and why? Does the reader know exactly what to do next? |
| **Courteous** | Did you greet and thank the reader properly (if this type has a greeting)? Does every word sound calm and polite, with nothing bossy, annoyed, or too excited? (Every question is worded so "Yes" is the good answer.) |

## 6. Highlights (point, never fix)

Each C has its own color **plus a letter badge** (so it works for colorblind users):

| C | Color | Badge |
|---|---|---|
| Clear | blue | CL |
| Concise | yellow | CS |
| Concrete | orange | CT |
| Correct | red | CR |
| Coherent | purple | CO |
| Complete | teal | CP |
| Courteous | pink | CU |

**Which text gets checked:** checks use each section's `role` (see §8), not its name, so new types work with no code changes.
- `header` and `signature` sections (addresses, date, To/From, signature) skip the sentence checks (capitals, ALL CAPS, acronyms, long sentences, passive voice, transitions).
- Greeting checks run only on the `greeting` section; ask checks only on `ask`; close checks only on `closing`. If a type has no section with that role, the check is skipped.
- A **paragraph** is text separated by a blank line.

**What each C flags:**
- **Clear**
  - Sentences over 25 words.
  - Wall of text: a paragraph over 5 sentences or over 100 words.
  - Passive voice.
  - Jargon words (from the jargon list).
  - Unexplained acronyms: 2–5 letter all-caps words that aren't in the common-acronyms list and weren't spelled out earlier as "Full Name (ABC)."
  - Hard words that have a simpler option ("utilize" → shows "use").
- **Concise**
  - Wordy phrases ("in order to" → shows "to," "due to the fact that" → shows "because").
  - Filler words ("very," "really," "just," "basically").
  - Adverbs.
- **Concrete**
  - Vague words ("some," "stuff," "things," "a lot").
  - Vague dates and times ("tomorrow," "next week," "soon," "ASAP," "EOD," "later"). Tip: use a real date like "Friday, Nov 6."
- **Correct**
  - Harper spelling/grammar.
  - Slang and text-speak ("thx," "u," "bruh," "gonna," "lol").
  - Sentences that don't start with a capital letter.
  - Lowercase "i" used as a word.
- **Coherent**
  - `body` paragraphs (after the first one) with no transition words. Soft hint only.
- **Complete**
  - Prep facts (each Key facts line, the reader's name, the deadline) not found in the text. Match is case-insensitive and ignores extra spaces and punctuation.
  - No ask phrase or next step in the `ask` section.
- **Courteous**
  - Bossy or harsh words ("you must," "obviously," "immediately").
  - ALL CAPS: words of 6+ letters, or 2+ all-caps words in a row. Words already flagged as acronyms or vague dates don't also count here.
  - More than 2 exclamation marks in the whole piece.
  - Greeting check: if the reader is a boss, customer, stranger, or teacher and the greeting is informal ("Hey," "Yo"), suggest "Dear Mr./Ms./Dr. [Last name]" or "Hello [Name]." If Prep has a reader name and the greeting doesn't use it, suggest adding it. Greetings on the no-name-OK list ("Dear Hiring Manager," "To Whom It May Concern,") pass when Prep has no reader name.
  - No thank-you or polite close in the `closing` section.

**Overlaps:** one word can be flagged by more than one C. In the "All C's" view it shows every badge that applies. The style score counts each flag once per C.

**Explanations:** every check has a "why it's flagged" line and a "try this instead" tip, stored in `data/checks.json`. Simpler words and wordy phrases store their replacements.

All word lists live in editable data files, not in code.

## 7. Scores
- **Readability (0–100):** Flesch Reading Ease, higher = easier. No school grade levels anywhere in the app (decided 10/28/2026: a grade number can read as an insult to the writer's intelligence). Each type sets `readingTarget` (default 60).
  - Green "Easy to read": at or above the target. Yellow "A little hard": up to 10 points under. Red "Hard to read": more than 10 under.
  - Shown only once there are 30+ words of prose; before that it says "Write a bit more."
- **Style score:** 0–100. `score = max(0, 100 − (sum of weighted flags ÷ word count × 100))`.
  - Weights live in `data/scoring.json`. Default: 1 per flag; Correct flags 2; Coherent hints 0.
  - Green 80+, yellow 60–79, red under 60. Updates live as the user types.
- **Reading time:** words ÷ 230 per minute, rounded up.

## 8. Writing types as data
Each type is one JSON file. Adding a type or topic = adding or editing a file. No code changes.
- Built-in types ship in `data/types/`.
- Users can drop extra type files in `%APPDATA%\BEZ Pro Write\types\`. They load too, and win over a built-in type with the same `id`.

```json
{
  "_header": "Created by: Brennan Meyer with use of Claude Code MM/DD/YYYY Santa Clarita, CA / brennanmmeyer@gmail.com",
  "id": "letter",
  "name": "Business Letter",
  "useWhen": "Formal message on paper or PDF to a company, landlord, school, or office.",
  "readingTarget": 60,
  "sections": [
    {
      "id": "greeting",
      "label": "Greeting",
      "role": "greeting",
      "optional": false,
      "tip": "Use their title and last name if you know it.",
      "good": "Dear Ms. Alvarez,",
      "bad": "Hey there!",
      "targetWords": [2, 5],
      "phrases": ["Dear Mr. Lee,", "Dear Hiring Manager,", "To Whom It May Concern,"],
      "profileFields": []
    },
    {
      "id": "purpose",
      "label": "Purpose",
      "role": "body",
      "optional": false,
      "tip": "Say why you're writing in one or two sentences.",
      "good": "I'm writing to request a copy of my lease by Friday, Nov 6.",
      "bad": "I just wanted to reach out about some stuff.",
      "targetWords": [15, 40],
      "phrases": ["I'm writing to…", "I'd like to request…"],
      "profileFields": []
    },
    {
      "id": "signature",
      "label": "Signature",
      "role": "signature",
      "optional": false,
      "tip": "Your full name, then how to reach you.",
      "good": "Jordan Reyes\n(661) 555-0142",
      "bad": "J",
      "targetWords": [2, 20],
      "phrases": [],
      "profileFields": ["name", "title", "phone", "email"]
    }
  ],
  "topics": [
    {
      "id": "apology",
      "name": "Apology",
      "tone": "Own it. No excuses. Say how you'll fix it.",
      "dos": ["Say sorry in the first sentence", "Name exactly what went wrong", "Say what you'll do next"],
      "donts": ["Blame others", "Over-explain", "Say 'sorry if you were offended'"],
      "sectionOverrides": {
        "purpose": { "tip": "Say what happened and that you're sorry.", "phrases": ["I'm sorry for…", "I apologize for…"] }
      }
    }
  ]
}
```

**Writing frameworks (added 10/28/2026):** `data/frameworks.json` holds STAR, BLUF, PREP, Apology formula, and SBI. Any section (or a topic's `sectionOverrides`) can set `"framework": "star"` to show one guided box per part; the parts join into the section's text.

**Schema rules:**
- `_header`: holds the byline (JSON has no comments). The loader ignores it.
- `role`: one of `header`, `greeting`, `body`, `ask`, `closing`, `signature`.
- `optional`: if true, the user can skip the section with a "Skip" button.
- `profileFields`: any of `name`, `title`, `address`, `phone`, `email`, `signature`. Filled in that order, one per line.
- `sectionOverrides`: replaces only the fields it names; everything else comes from the base section.

**v1 types and sections (role in brackets):**
- **Email:** Subject [header], Greeting [greeting], Purpose [body], Details [body], Ask [ask], Closing [closing], Signature [signature]
- **Memo:** To/From/Date/Subject [header], Purpose [body], Background [body], Details [body], Action needed [ask]
- **Business Letter:** Your address [header], Date [header], Their address [header], Greeting [greeting], Purpose [body], Details [body], Ask [ask], Closing [closing], Signature [signature]
- **Cover Letter:** Greeting [greeting], Job + why you're writing [body], Your skills [body], Why this company [body], Ask for interview [ask], Closing [closing], Signature [signature]
- **Short Report:** Title [header], Summary [body], Background [body], Findings [body], Recommendation [ask]
- **Something Else:** Greeting [greeting, optional], Purpose [body], Details [body], Ask [ask], Closing [closing]

**v1 topics (each with do's, don'ts, tone, phrase bank):**
- **Email:** General, Request, Follow-up, Thank You, Asking a Teacher/Instructor, Calling Out Sick, Meeting Request
- **Business Letter:** General, Thank You, Apology, Complaint, Request, Resignation, Reference Request
- **Memo:** General, Policy Change, Meeting Notice, Announcement
- **Cover Letter:** General, Entry-Level, Career Change
- **Short Report:** General, Incident Report, Progress Report

**Reader relationships:** `data/relationships.json` holds the courtesy tips for each answer to "How well do you know them?" (boss, coworker, customer, stranger, teacher), and whether a formal greeting is expected.

The app validates every JSON file on load and shows a plain error if one is broken (instead of crashing).

## 9. Settings
- **Sender profiles:** add, edit, delete. Fields: name, job title, address, phone, email, signature line. Sections with `profileFields` fill from the chosen profile (still editable).
- **Word rules:** add or remove entries in any word list (wordy, filler, vague, vague dates, jargon, common acronyms, simpler words, slang, harsh, transitions, adverbs, passive, greetings, polite closings, ask phrases). Simpler words and wordy phrases take a word plus its replacement. Reset to defaults button.
- **Font size:** small / medium / large.
- **Spell underlines while typing:** on / off.
- **About:** version, credits, and `THIRD_PARTY_NOTICES` (licenses for Harper, write-good, docx, syllable).

## 10. Saving
- The app builds its data folder as `%APPDATA%\BEZ Pro Write\` itself (not Tauri's default app-data folder, which is named after the bundle identifier).
- Autosave the current draft every few seconds to `drafts\`.
- Drafts store: title (auto: type + topic + date, renameable), last saved time, current step, type, topic, profile, prep answers, section text, checklist answers.
- Profiles, custom word rules, font size, and the spell toggle save to `settings\`.
- Delete draft from the Home list (with confirm).

## 11. Export
- **Clipboard:** plain text.
- **.txt**
- **.docx:** clean layout in **block format** for every type (everything left-aligned, blank line between parts). (Decided 10/29/2026: one layout for all types; it's the standard business layout and memos and reports read cleanly in it too.)
- **Print / PDF:** print-styled page (white paper, black text, 1" margins, 12 pt font, US Letter 8.5" × 11") through the Windows print dialog. "Microsoft Print to PDF" covers PDF.

## 12. UI rules
- Dark theme, large readable text, high contrast. (Print view is white.)
- Look (decided 10/28/2026): classic word-processor layout like OpenOffice Writer, in dark: menu bar, icon toolbar, the screen as a "page" on a darker workspace, status bar. Slightly rounded corners, soft gradients. Accents: muted green (main actions, progress), purple (selection, tags), amber orange (attention). Professional, nothing flashy.
- One task per screen. Progress bar at top ("Step 3 of 8"). Skipped steps don't count.
- Back / Next always in the same spot.
- Full keyboard use: Tab through fields and highlights, Enter on a highlight explains it, Ctrl+Enter = Next, Ctrl+Shift+Enter = Back.
- No popups mid-typing. C's highlights show only on the 7 C's screens. Spell underlines can show while typing (toggleable).
- Highlights never use color alone. Always a color plus a badge.

## 13. Module layout (small pieces, one job each)
```
src/
  flow/        screen order, skip logic, navigation
  screens/     home, pick-type, pick-topic, pick-profile, prep, write, check, finish, settings
  types/       load + validate type JSON (built-in + user folder), merge topic overrides
  checks/      one file per C (clear.ts, concise.ts, ...) → returns highlight ranges
  wordlists/   load default + user word lists
  spell/       Harper wrapper (frontend side, if harper.js)
  scores/      readability, style score, reading time
  profiles/    sender profiles CRUD
  drafts/      autosave, load, delete
  prefs/       font size, spell toggle
  export/      clipboard, txt, docx, print
src-tauri/     Rust side: app setup, file paths, Tauri plugins (dialog, fs, clipboard-manager);
               Harper here instead if harper-core is used
data/
  types/       email.json, memo.json, letter.json, cover-letter.json, report.json, other.json
  wordlists/   wordy.json, filler.json, vague.json, vague-dates.json, jargon.json,
               common-acronyms.json, simpler.json, slang.json, harsh.json, transitions.json,
               adverbs.json, passive.json, greetings.json, polite-closings.json, ask-phrases.json
  checks.json        "why" + "try this instead" text per check
  scoring.json       style-score weights
  relationships.json courtesy tips per reader type
THIRD_PARTY_NOTICES
tests/         test pages + sample texts (not shipped)
```

## 14. Build order (verify each step before the next)
1. **Shell:** Tauri app opens, dark window, Home screen, progress bar, Back/Next, keyboard shortcuts. ✔ Launches on Windows; Ctrl+Enter / Ctrl+Shift+Enter move between screens.
2. **Types + topics loader:** reads built-in and user-folder JSON, shows type and topic cards, merges topic overrides. ✔ Add a test JSON in the user folder, it appears; break one, plain error shows.
3. **Prep + Write screens:** full flow for Email → General with tips, examples, phrase bank, word count targets, live preview. ✔ Write a full email start to finish; examples, phrase bank, and tips can't be selected, copied, or dragged; word count turns from under-target to on-target.
4. **Drafts:** autosave, resume at the right step, delete with confirm. ✔ Close mid-draft, reopen, it's all there on the same step; delete asks first.
5. **Profiles:** Settings screen, pick-profile screen, fill into sections. ✔ With two profiles the pick screen shows; with one it's skipped and used; the Signature fills and stays editable.
6. **Harper:** underlines in the write boxes + on/off toggle. ✔ Misspellings underline offline; toggle hides them.
7. **Checks:** one C at a time, each tested on sample texts in `tests/` before wiring into the UI. ✔ Each check flags the planted problems and doesn't flag a clean sample text (including clean address and signature lines).
8. **Scores + stats panel:** readability, style score, reading time. ✔ Numbers match a sample worked out by hand with the §7 formulas.
9. **7 C's screens + Finish scorecard:** checklist, color + badge highlights, click/keyboard-to-explain, jump-back-to-edit, "All C's" view, scorecard. ✔ Full pass on a sample email; scorecard matches the answers given.
10. **Settings extras:** word rules (add/remove/reset), font size, About + notices. ✔ Add a word, it gets flagged; reset restores defaults; font size changes all screens and survives a restart.
11. **Export:** clipboard, .txt, .docx, print/PDF. ✔ .docx opens clean in Word in block format; PDF prints on US Letter with 1" margins.
12. **Remaining types and topics.** ✔ Walk through each once; Memo and Short Report run with no greeting/closing flags.
13. **Installer.** ✔ Install on a clean Windows user account and run.

Test each feature in a small test page in `tests/` first, then wire it into the real app and verify once there.

## 15. Out of scope (v1)
- Any AI or auto-writing.
- Click-to-insert phrases, copyable examples, or auto-fix buttons.
- Cloud sync, accounts.
- Linux/mobile. (Mac was added 10/28/2026 at the user's request: a universal `.dmg` built by GitHub Actions, data in `~/Library/Application Support/BEZ Pro Write/`, Cmd in place of Ctrl.)
- Rich text formatting (bold, fonts). Plain text only.

## 16. File headers
Every source file (code, styles, HTML, Markdown) starts with the two-line Brennan Meyer header in its own comment syntax, with the real date written. JSON data files put it in a `"_header"` field instead. Files the app writes at runtime (drafts, settings) and test sample texts don't get one.
