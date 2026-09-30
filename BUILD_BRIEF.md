# ScholarPath: Build Brief

> **Audience:** an AI coding assistant (Claude in Cursor, Gemini, or similar) that must build this product.
> **Owner:** Anas. The owner is learning AI-assisted web coding and will iterate on this repo over time. Keep the code readable, small-file, and well commented.
> **Status:** design is finished in Figma. Nothing is built yet. The job is to build the app so it looks and behaves like the design below.
> **Precedence:** if this brief conflicts with an older `PROJECT_CONTEXT.md`, **this brief wins** (the product moved from a quiz-first flow to a chat-first flow, and the visual design is now final).

---

## 0. TL;DR (read this first)

- **What:** a free, open-source web app that helps people in Germany find the scholarship that fits them (starting with the 13 *Begabtenförderungswerke*) and then helps them write the application. Later: university applications and interview training.
- **How it feels:** modern, calm, "glassy" light-lavender UI. Chat-first: the user describes themselves in a text box, the app analyses, then shows ranked matches, then opens a workspace with a writing coach.
- **AI:** European, open-weight, free where possible (Mistral). AI writes **explanations and coaching**, it does **not** invent facts and does **not** ghostwrite whole essays.
- **Languages:** English (source), German, Chinese (Simplified). A language toggle **EN | DE | 中文** is in the nav.
- **Design source of truth:** the Figma file (see section 3). The chosen theme is **Lavender**. A dark **Obsidian + Lime** theme is a designed backup (section 5).
- **Hackathon context:** the owner has a hackathon on Saturday. A working end-to-end demo matters more than completeness.

---

## 1. Product

### 1.1 Problem
Germany has 13 state-funded gifted-student foundations plus many other scholarships. Most students do not know which one fits them, or that they are eligible at all. Applications (motivation letters, CV, references, interviews) are intimidating.

### 1.2 Solution (three steps)
1. **Match:** the user describes their background in free text (optionally attaches a CV). The app extracts a structured profile, filters and scores the scholarships, and shows ranked matches with a personal explanation.
2. **Apply:** for a chosen scholarship, a workspace gives a document checklist and an **application assistant** (writing coach) tailored to that foundation's values.
3. **Prepare (later):** interview trainer (text first, voice optional), then university applications.

### 1.3 Target users
Students (Bachelor, Master, PhD), pre-university students, first-generation academics, international students in Germany (including many Chinese students, hence the Chinese UI).

### 1.4 Principles (non-negotiable)
1. **No fine-tuning, no vector DB.** The dataset is small (13 core scholarships). Structured JSON plus good prompts is enough.
2. **Hybrid matching.** A deterministic TypeScript function filters and scores. The LLM only (a) extracts the profile from free text and (b) writes the human-readable explanation. Matching must work without the LLM (fallback texts).
3. **Coach, not ghostwriter.** The assistant asks questions, gives feedback, suggests structure and alternative phrasings for short passages. It must not write a whole letter in the chat. Reason: selection committees want the applicant's own voice. **Owner decision (2026-09-30):** a separate "Generate letter" button in the editor writes a first draft from the uploaded CV in the chosen language (EN/DE/ZH), using only facts from the CV; the student then edits it. The chat assistant points to that button instead of writing the letter itself.
4. **Never invent facts.** Deadlines, amounts, criteria come only from the data files. Every scholarship has `url` and `lastVerified`. Show a "verify on the official site" hint.
5. **Sensitive data is optional and local.** Religion, political leaning, migration background, union membership are only used for eligibility/affinity matching, always optional ("prefer not to say"), never logged, never stored server-side in the MVP.
6. **Clean first screen.** The landing page must look very clean: **no names of specific scholarships on the landing page** (this was an explicit owner decision).
7. **Provider-agnostic AI layer.** All model calls go through one file (`src/lib/ai.ts`). Swapping provider or model must be a one-line change.

---

## 2. Screens and user flow

Desktop design frames are **1440 × 900**. Content column width is **1200 px**, centered. There is no mobile design yet (see 9.3).

```
Landing  ──(Match scholarships / example chip)──▶  Analyzing  ──(auto, ~1.8s min)──▶  Matches
                                                                                        │
                                                       (Start application →)            ▼
                                                                                    Workspace
Nav links (Start / Matches / Workspace) work from every screen.
"Refine my answers" (Matches) → back to Landing.
```

### 2.1 Global navigation (all screens)
A floating **glass pill** at the top, 1200 × 60, radius 30, 24 px from the top.
- **Left:** logo mark (30×30, radius 10, violet→pink gradient, white letter "S") + wordmark "ScholarPath" (Outfit SemiBold 19, letter-spacing −1%).
- **Center (exactly centered, independent of left/right widths):** links `Start`, `Matches`, `Workspace`. Active link = white pill (opacity .9) with soft shadow, dark text. Inactive = muted text.
- **Right:** language toggle (segmented control **EN | DE | 中文**, active = white pill), text link `Sign in`, dark pill button `Get started`.

### 2.2 Screen 1: Landing (chat-first, very clean)
Vertically centered hero, top padding ≈ 110 px inside the content area.
- **Badge (glass pill):** small gradient dot + "Free & open source · matched against 13 Begabtenförderungswerke"
- **Headline (Outfit SemiBold, 68/72, letter-spacing −3.5%, centered):**
  `Find the scholarship` (dark ink)
  `that actually fits you.` (**gradient text**, violet → pink → orange, angle ≈100°)
- **Subline (19/30, muted, max width 640):** "Tell us about your studies, background and goals. We match you with Germany's gifted-student foundations and help you write the application."
- **Prompt box (glass, 780 wide, radius 28, padding 26/22):**
  - Placeholder text: "Describe your background, field of study, and what you're looking for…"
  - Bottom row: left = small pill `+ Attach CV`; right = dark pill button `Match scholarships →`.
- **Example chips (glass pills)**, preceded by muted label "Try these examples": `Master's in Software Engineering`, `PhD funding in Berlin`, `Erasmus alternatives`, `No German-language requirement`. Clicking a chip fills the prompt and starts the flow.
- Nothing else. **No scholarship names, no logo wall.**

### 2.3 Screen 2: Analyzing (interstitial)
Centered glass card (520 wide, radius 32, padding 40), everything centered:
- Circular progress ring (84 px, gradient violet→pink, ~68% arc; animate/rotate).
- Title (Outfit SemiBold 28): "Analyzing 13 scholarships…"
- Muted line: "Comparing your profile with each foundation's criteria."
- Three step rows (white glass rows, radius 16): `Reading your background` ✓, `Checking eligibility criteria` ✓, `Scoring your fit` (in progress, violet text, empty ring icon).
- Behavior: steps tick off sequentially while the real work happens (profile extraction, then scoring, then explanations). Minimum display ≈ 1.8 s so it never flashes. Then auto-navigate to Matches.

### 2.4 Screen 3: Matches
Vertical stack, 22 px gaps:
1. **Header row:** left = status pill "● Analysis complete · 13 scholarships compared" (green dot) above H1 "3 strong matches for you" (Outfit SemiBold 42/50, −2.5%). Right = glass button `Refine my answers`.
2. **Top 3 cards** in a row (equal width, 20 px gap; glass, radius 28, padding 24):
   - Top row: rank chip (`Best match` = violet→pink gradient pill with white text; `#2`, `#3` = soft gray pill) and a **match ring** (68 px, gradient arc, percentage inside in Outfit SemiBold 17).
   - Foundation name (Outfit SemiBold 22/27).
   - Orientation tag (small soft-violet pill, e.g. "SPD-nah", "German Academic Scholarship Foundation · neutral").
   - 2-line personalised reason (muted, 14/22). **This text comes from the LLM** (grounded in the data).
   - Button: card 1 = dark primary `Start application →`; cards 2/3 = light glass `View details`.
   - **Card 1 is featured:** stronger glass (opacity .68) and a 1.5 px gradient border (`#A78BFA → #F9A8D4`).
3. **"More scholarships"** (label left, "Sorted by fit" right), then **two columns of 5 rows** (glass rows, radius 16): name (Medium 14) + orientation (muted 12) on the left; a 64×5 px progress bar + percentage on the right.

Placeholder data in the design (replace with real scoring): Studienstiftung 96, Friedrich-Ebert 89, Konrad-Adenauer 84; then Böll 78, Naumann 74, Hanns-Seidel 71, Rosa-Luxemburg 66, Cusanuswerk 61, Villigst 55, Ehrlich 48, Avicenna 44, Böckler 39, sdw 35. (The design's top 3 are illustrative, not a recommendation.)

### 2.5 Screen 4: Workspace (application assistant)
Three columns, total height 764, gaps 20: **left 290 | center flexible | right 300**.

**Left column**
- *Scholarship card* (glass): pill "96% MATCH" (gradient), title "Heinrich Böll Foundation" (Outfit SemiBold 24), subtitle "Heinrich-Böll-Stiftung, Germany", "Application progress 3 / 6" with a gradient progress bar.
- *Required Documents* card (glass, fills remaining height). Rows with status icon + name + status pill:
  - `Motivation Letter`: **in-progress** (active row = white raised row, amber ring icon, amber pill)
  - `CV / Resume`: complete
  - `Academic Transcript`: complete
  - `Letter of Recommendation`: incomplete
  - `Language Certificate (TestDaF)`: complete
  - `Research Proposal`: incomplete
  Status styles: complete = green check circle + green pill; in-progress = amber ring + amber pill; incomplete = gray ring + gray pill.

**Center: editor** (glass, radius 28, padding 36/30)
- Toolbar: chips `Improve`, `Shorten`, `Translate to German` (soft violet pills); right side "● Saved 2m ago".
- Title (Outfit SemiBold 30/36): "Letter of Motivation: PhD in Renewable Energy Systems"
- Salutation "To the Selection Committee," (Medium 16), then body paragraphs (16/27, ink at 82%).
- Footer: left "248 words" (live word count), right dark pill `Generate Draft PDF`.
- Tool behavior (coach rules apply): `Improve` returns feedback + alternative phrasings for the selected passage and lets the user accept a suggestion; `Shorten` proposes a shorter version of a selection; `Translate to German` translates a selection or the whole text. None of them replace the user's text without an explicit accept.

**Right: Application Assistant** (glass, radius 26, padding 20/22)
- Header: small gradient orb + "Application Assistant" + subtitle "Coaches, never ghostwrites".
- Suggestion cards (white glass, radius 18): each has a bold title and 2–3 lines. Examples in the design: "Stronger opening", "Link to the foundation", "A question for you" (the last one has violet title and is a question to the user).
- Bottom: chat input pill "Ask the assistant…" with a round dark send button (↑).
- The assistant's system prompt is built per foundation from `values`, `essayFocus`, `selectionProcess` in the data.

---

## 3. Design source (Figma)

- **File:** `Stip Tool` → https://www.figma.com/design/n9puEDXDkXpu1SD6WgZYgQ/Stip-Tool
- **File key:** `n9puEDXDkXpu1SD6WgZYgQ`
- **Frames (Lavender = chosen):** Landing `37:2`, Analyzing `37:57`, Matches `37:103`, Workspace `37:268`.
- **Frames (Obsidian + Lime = backup):** Landing `23:2`, Analyzing `30:2`, Matches `23:24`, Workspace `23:46`.
- **Prototype:** two flows are set up (Lavender, Lime). Press ▶ in Figma to see transitions.
- If the assistant has a **Figma MCP** connection, use it to read design context, variables and screenshots of these node IDs. If not (for example Gemini), ask the owner to export PNGs of the four Lavender frames into `docs/design/` and treat them as the visual reference.
- All values in section 4 were read from that file. If Figma and this document disagree, **Figma wins**.

---

## 4. Design system: Lavender (chosen)

### 4.1 Idea
Light, airy, "frosted glass" over a soft violet atmosphere. One hue family (violet) with a pink→orange accent used sparingly (logo, headline gradient, rings, primary progress). Dark ink for text and primary buttons.

### 4.2 Color tokens

| Token | Value | Use |
|---|---|---|
| `--bg-top` | `#FAF8FF` | page background gradient start |
| `--bg-bottom` | `#F3EFFF` | page background gradient end |
| `--glow-top` | `#B39DFF` @ 60% | large radial glow, top center |
| `--glow-bottom` | `#CFC1FF` @ 50% | radial glow, bottom center |
| `--ink` | `#1B1533` | headings, body, primary button fill |
| `--muted` | `#6B6685` | secondary text |
| `--violet` | `#7C3AED` | accent start, dots, progress |
| `--violet-dark` | `#5B2FC9` | text on soft-violet tags |
| `--violet-light` | `#A78BFA` | featured-card border start |
| `--pink` | `#F472B6` | gradient mid (logo, rings) |
| `--pink-deep` | `#DB4FA0` | headline gradient mid, rank chip end |
| `--pink-light` | `#F9A8D4` | featured-card border end |
| `--orange` | `#F59E6B` | headline gradient end |
| `--success` | `#16A34A` / `#34D399` | complete state |
| `--success-bg` | `#DCFCE7` | complete pill |
| `--warning` | `#F59E0B` / text `#B45309` | in-progress |
| `--warning-bg` | `#FEF3C7` | in-progress pill |
| `--neutral-bg` | `#EDEAF5` | incomplete pill |
| `--neutral-line` | `#B8B3CC` | incomplete ring |

Gradients:
- Page: linear, top→bottom, `--bg-top → --bg-bottom`. Plus two radial glows (**smooth falloff to fully transparent, no hard edges, no blurred blobs**): top glow ≈ 1900×1000 px centered near the top edge; bottom glow ≈ 1500×800 px centered near the bottom edge.
- Brand gradient: `--violet → --pink` at 135°.
- Headline gradient: `--violet → --pink-deep (60%) → --orange` at ≈100°.

### 4.3 Glass recipe
```css
.glass {
  background: rgba(255, 255, 255, 0.50);        /* .62 for prompt/analyzing card, .68 for featured card, .42 for list rows */
  backdrop-filter: blur(30px);                   /* 20–36px depending on element */
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid transparent;                 /* gradient hairline, see below */
  border-radius: 28px;
  box-shadow: 0 16px 40px -8px rgba(75, 47, 168, 0.10);
}
/* gradient hairline border: white .95 → .30 → .70 at 135deg, 1px, drawn inside */
```
Implement the hairline with a `background-clip` / mask trick or a pseudo-element. It must feel like light catching a glass edge, not a flat border.

### 4.4 Typography
- **Headings / numbers:** `Outfit` (SemiBold 600, Bold 700), tight letter-spacing (−1% to −3.5% on large sizes).
- **Body / UI:** `Geist` (Regular 400, Medium 500, SemiBold 600).
- **Chinese fallback:** `Noto Sans SC` (Geist has no CJK glyphs). Use a font stack like `"Geist", "Noto Sans SC", system-ui, sans-serif`.
- Scale used: H1 hero 68/72 · H1 page 42/50 · title 30/36 · card title 22–24 · body 16/27 · UI 14 · small 12–13 · micro 10.5–11.

### 4.5 Radius, spacing, shadows
- Radius: nav 30 · large cards / editor / prompt 26–28 · analyzing card 32 · small cards/rows 16–18 · pills 14–22 · buttons 20–22 · logo 10.
- Spacing rhythm: 8, 10, 12, 14, 16, 20, 22, 24. Card padding 20–26, editor padding 36/30.
- Primary button (dark): `--ink` fill, white text, Medium 14, soft shadow `0 8px 20px -4px rgba(27,21,51,.28)`.
- Soft tags: `rgba(124,58,237,.08)` fill, `--violet-dark` text, radius 14.

### 4.6 Motion (implement with Framer Motion)
Figma only shows page-to-page smooth transitions. In code, add:
- Page transitions: fade + slight translate (≈0.5–0.6 s, ease-in-out), nav stays put.
- Analyzing: ring rotates/progresses; steps tick off one by one.
- Matches: cards enter with a staggered fade-up; **percentage rings animate from 0 to value**; list bars grow.
- Hover: glass elements lift slightly and brighten; buttons press-scale.
- Respect `prefers-reduced-motion` (disable non-essential motion).

### 4.7 Accessibility
Verify text contrast on glass (especially `--muted` on translucent surfaces). Visible focus rings (violet). Keyboard-operable nav, toggle, chips, buttons. Color is never the only status signal (icons and labels accompany status colors).

---

## 5. Backup theme: Obsidian + Lime (designed, not primary)

Build the theme layer so it can be swapped by tokens only (CSS variables), because the owner may switch. Do **not** build it first.

| Token | Value |
|---|---|
| bg | `#0B0B0C` → `#121214` |
| glows | `#2F3A17` (top), `#22221F` (bottom) |
| text | `#F5F5F4` |
| muted | `#A3A3A0` |
| accent | `#C8F169` (buttons, rings, active tags, progress) |
| accent-soft | `#E4FF9A`, `#B7E24F` |
| button text on accent | `#0B0B0C` |
| glass | white at ~9% fill, ~20% hairline, blur 30, black shadow |
| status | complete = lime, in-progress = lime ring / soft gray pill, incomplete = gray |

Rule: **one accent color only**. Frames: `23:2`, `30:2`, `23:24`, `23:46`.

---

## 6. Data

### 6.1 Startup dataset: the 13 Begabtenförderungswerke
| # | Foundation | Orientation (for display and matching) |
|---|---|---|
| 1 | Studienstiftung des deutschen Volkes | non-denominational, non-partisan; academic excellence + personality |
| 2 | Cusanuswerk | Catholic |
| 3 | Evangelisches Studienwerk Villigst | Protestant |
| 4 | Ernst Ludwig Ehrlich Studienwerk | Jewish |
| 5 | Avicenna-Studienwerk | Muslim |
| 6 | Friedrich-Ebert-Stiftung | close to SPD |
| 7 | Friedrich-Naumann-Stiftung für die Freiheit | close to FDP |
| 8 | Hanns-Seidel-Stiftung | close to CSU |
| 9 | Heinrich-Böll-Stiftung | close to Bündnis 90/Die Grünen |
| 10 | Konrad-Adenauer-Stiftung | close to CDU |
| 11 | Rosa-Luxemburg-Stiftung | close to Die Linke |
| 12 | Hans-Böckler-Stiftung | trade-union oriented (DGB) |
| 13 | Stiftung der Deutschen Wirtschaft (sdw) | business-oriented |

> ⚠️ Closeness to a party or denomination does **not** automatically mean membership is required. Criteria differ per foundation. **Fill deadlines, amounts, eligibility and application steps only from each foundation's official website**, set `lastVerified`, and never guess. If something is unknown, store `null` and show "check the official site".

### 6.2 Schema (`data/scholarships.json`, validated with Zod)
```json
{
  "id": "boell",
  "name": "Heinrich-Böll-Stiftung",
  "displayName": { "en": "Heinrich Böll Foundation", "de": "Heinrich-Böll-Stiftung", "zh": "海因里希·伯尔基金会" },
  "type": "begabtenfoerderungswerk",
  "orientation": { "en": "close to the Green party", "de": "Grüne-nah" },
  "values": ["ecology", "democracy", "gender justice"],
  "phases": ["bachelor", "master", "phd"],
  "hardFilters": [],
  "deadlines": [{ "label": "Studies", "date": null, "note": "see official site" }],
  "selectionProcess": "online application, references, selection interview",
  "essayFocus": "societal engagement in line with the foundation's values",
  "documents": ["motivation letter", "CV", "transcript", "reference letter"],
  "funding": { "note": "see official site" },
  "url": "https://…",
  "lastVerified": "YYYY-MM-DD"
}
```
Chinese display names are for UI convenience; verify translations.

---

## 7. Matching and AI

### 7.1 Pipeline
1. **Input:** free text (+ optional CV text/PDF) from the Landing prompt.
2. **Profile extraction (LLM, JSON only):** turn text into a Zod-validated `Profile` (phase, field, grades band, first-generation, engagement areas, values, optional religion / political affinity / union / migration background, language skills, goals, country of study). Unknown fields stay `null`. If critical info is missing, the app may ask **1–2 short follow-up questions** (chips or a small inline form) before scoring; never a long form.
3. **Deterministic matching (`src/lib/matching.ts`, unit-tested):** hard filters (e.g. denomination required, study phase, eligibility) then a weighted 0–100 score from values/engagement overlap, field, phase, first-generation status. Returns `score` and structured `matchedReasons[]`.
4. **Explanations (LLM):** only for the top 3–5. Input = profile + the foundation's data + `matchedReasons`. Output = 2 sentences "why it fits" (+ optionally one "watch out"). **Use only provided facts.**
5. **Fallback:** if the LLM is rate-limited or fails, render explanations from `matchedReasons` templates. The UI must never break.

### 7.2 Model provider
- **Default:** Mistral (EU provider, open-weight models), via the Vercel AI SDK, behind `src/lib/ai.ts`.
- Free "Experiment" tier is very rate-limited (on the order of a couple of requests per minute at the time of writing; **verify current limits**) and may allow the provider to use inputs for training. Therefore: show a clear **privacy notice** before sending personal text; handle HTTP 429 with retry/backoff and a friendly message; keep prompts short; batch explanations for the top matches into **one** call when possible.
- Later options: paid tier, "bring your own key", or an in-browser small model for privacy.
- API keys live only in server env (`MISTRAL_API_KEY`), never in the client or repo. Provide `.env.example`.

### 7.3 Application assistant prompt (per foundation)
Build the system prompt from the foundation record: values, `essayFocus`, `selectionProcess`. Behavior rules:
- Asks questions first (experiences, motivation, engagement), then gives feedback on structure, clarity, authenticity, link to the foundation's values.
- Suggests outlines and alternative phrasings for **short passages**; does **not** produce a complete essay on demand (politely explains why and offers coaching).
- Never invents facts about the user or the foundation. Replies in the user's UI language (EN/DE/ZH).
- The UI states that text is sent to an external AI service.

---

## 8. Tech stack and architecture

| Area | Choice |
|---|---|
| Framework | **Next.js** (App Router), **TypeScript strict** |
| Styling | **Tailwind CSS** + CSS variables for tokens; **shadcn/ui** primitives where useful |
| Motion | **Framer Motion** |
| AI | **Vercel AI SDK** + Mistral provider, isolated in `src/lib/ai.ts` |
| Validation | **Zod** (profile, data, API inputs/outputs) |
| i18n | **next-intl**, locales `en` (default in code), `de`, `zh` |
| Data (MVP) | JSON in `data/`; user profile in browser state (no backend DB) |
| Tests | **Vitest** (matching engine at minimum) |
| Hosting | Vercel (region Frankfurt `fra1`) |
| Lint/format | ESLint + Prettier |

Code, comments, commits: **English**. UI strings only via i18n message files (`messages/en.json`, `de.json`, `zh.json`); never hard-code UI text in components.

### 8.1 Suggested structure
```
.
├── BUILD_BRIEF.md              # this file
├── README.md  CONTRIBUTING.md  LICENSE (MIT)
├── .cursor/rules/              # short rules derived from this brief
├── docs/design/                # exported PNGs of the Lavender frames
├── data/scholarships.json
├── messages/{en,de,zh}.json
└── src/
    ├── app/[locale]/
    │   ├── page.tsx                 # Landing
    │   ├── analyzing/page.tsx       # Analyzing (or an overlay state)
    │   ├── matches/page.tsx
    │   ├── workspace/[id]/page.tsx
    │   └── layout.tsx               # nav, background, glass primitives
    ├── app/api/{profile,explain,coach}/route.ts
    ├── components/                  # Nav, LangToggle, GlassCard, MatchRing, MatchCard, DocChecklist, Editor, Assistant …
    ├── lib/{ai.ts, matching.ts, schema.ts, profile.ts, i18n.ts}
    └── tests/matching.test.ts
```

### 8.2 Language toggle
Segmented control **EN | DE | 中文** in the nav, driven by `next-intl` locale routing (`/en`, `/de`, `/zh`). Persist the choice. AI replies follow the active locale.

---

## 9. Scope, order of work, acceptance

### 9.1 Build order (one focused day; keep the app runnable after every step, commit each)
1. Repo + Next.js + Tailwind + shadcn + Framer Motion + next-intl, deploy an empty shell to Vercel.
2. **Design foundation:** tokens (CSS variables), fonts (Outfit, Geist, Noto Sans SC), page background (gradient + two radial glows), `GlassCard`, buttons, pills, nav with centered links and language toggle.
3. **Landing** exactly as in 2.2 (static first).
4. `data/scholarships.json` (13 entries, verified) + Zod schema.
5. **Matching engine + tests**, then **Matches** screen with animated rings.
6. **Analyzing** screen and routing between screens.
7. **AI layer:** profile extraction, explanations, error/429 fallback.
8. **Workspace:** checklist, editor, assistant chat (streaming) with per-foundation prompt.
9. Polish: motion, responsive behavior, README with screenshot, privacy notice.

### 9.2 MVP definition of done
- [ ] Landing, Analyzing, Matches, Workspace visually match the Lavender Figma frames at 1440 px.
- [ ] Nav links centered; EN | DE | 中文 toggle works and all visible UI strings are translated (AI content follows the locale).
- [ ] A user can type a description, get ranked matches with an explanation, open a workspace for a match, and chat with the assistant.
- [ ] Matching works with the LLM disabled (fallback texts) and has unit tests.
- [ ] All 13 scholarships have verified data (`lastVerified` set) or clearly show "check the official site".
- [ ] No API key in the repo; `.env.example` present; app deployed on Vercel.
- [ ] Landing shows **no scholarship names**.

### 9.3 Out of scope for the first build
Accounts and database, real CV parsing beyond simple text, PDF generation beyond a basic export, university-application module, interview trainer, native mobile design, payments. Mobile layout: implement sensible responsive stacking (nav collapses, columns stack, Workspace becomes tabs) even though there is no Figma mobile design; keep the same tokens.

### 9.4 Roadmap (context only)
- **V2:** more scholarships (Deutschlandstipendium, DAAD, foundations, company scholarships), deadline dashboard with calendar export, per-scholarship checklists, full DE/ZH content, community-contributed data via pull requests.
- **V3:** university-application helper (programme matching, motivation letters, uni-assist guidance).
- **Interview trainer:** first text-based, tailored to each foundation's selection process, with a feedback sheet. Voice is an optional layer (ElevenLabs has a small free tier of agent minutes at the time of writing; **verify current terms**; free-tier audio requires attribution and has no commercial license). Browser speech APIs are a free fallback. Voice must be optional and clearly disclosed.
- **V4:** accounts, EU-hosted Postgres, mentoring with alumni.

---

## 10. Legal, ethics, privacy
- "Unofficial community project." Do not imply affiliation with any foundation; use names factually.
- Results are orientation, not a guarantee or legal advice; the foundation's official page is authoritative. Show `lastVerified` next to dates.
- GDPR: privacy notice before AI use, minimal data, sensitive fields optional, no server-side storage of profile/essays in the MVP, imprint/privacy pages before any public launch.
- Fairness: rank fit to published criteria; never judge a person; never disparage a foundation.
- License: MIT for code; consider CC BY 4.0 for the dataset to invite contributions.

---

## 11. Rules for the AI assistant (paste into `.cursor/rules`)

```
Project: ScholarPath, AI scholarship finder for Germany (13 Begabtenförderungswerke first). Read BUILD_BRIEF.md.
Stack: Next.js App Router, TypeScript strict, Tailwind + CSS variables, shadcn/ui, Framer Motion, Vercel AI SDK (Mistral), Zod, next-intl (en/de/zh), Vitest.
- Match the Lavender design in BUILD_BRIEF.md section 4. Tokens live in CSS variables so a dark "Obsidian + Lime" theme can be swapped in.
- All LLM calls go through src/lib/ai.ts only. Matching is deterministic in src/lib/matching.ts; the LLM only extracts the profile and writes explanations. Never invent facts; use only data/scholarships.json.
- The writing assistant coaches; it never writes a full essay on request.
- Sensitive answers (religion, politics, migration, union) are optional, never logged, never stored server-side.
- The landing page shows no scholarship names.
- No hard-coded UI strings: use next-intl message files.
- Small focused components; keep the app runnable after every change; run lint, tests and build before finishing a task.
- Never commit secrets. Code/comments/commits in English.
```
