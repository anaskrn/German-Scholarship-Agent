# ScholarPath

Free, open-source web app that matches students with Germany's 13 *Begabtenförderungswerke* and helps them write the application. UI in **English, German and Chinese**. See [BUILD_BRIEF.md](BUILD_BRIEF.md) for the vision and design system.

## Run it

```bash
npm install
cp .env.example .env.local   # then put your Mistral API key into .env.local
npm run dev                  # http://localhost:3000
npm test                     # matching engine + profile helpers
npm run typecheck && npm run lint && npm run format:check
npm run build
```

`MISTRAL_API_KEY` stays on the server (never sent to the browser). `MISTRAL_MODEL` is optional; the default is `ministral-8b-latest`, because on the free "Experiment" tier `mistral-small-latest` can have a quota of 0 requests/minute.

## How it works

1. **Describe** (`/`): free text and/or a PDF CV → `POST /api/profile` extracts a structured profile. Text PDFs are read by `POST /api/cv`; scanned PDFs are read in the browser with OCR (German, English, Chinese), so the file never leaves the device for that step. A keyword extractor (`src/lib/profile.ts`) fills gaps and is the fallback if the AI is down.
2. **Matches** (`/analyzing` → `/matches`): `src/lib/matching.ts` scores all 13 scholarships deterministically (0-100). `POST /api/explain` writes the "why it fits" text for the top 3 in the active language; template texts are used if the AI fails.
3. **Apply** (`/workspace/[id]`): document checklist, letter editor (Improve / Shorten / Translate, only applied when you click "Use this"; "Generate Draft PDF" opens the print dialog), and a coaching assistant (`/api/coach`, `/api/coach/suggestions`, `/api/coach/edit`) that never writes the whole letter.

All LLM calls live in `src/lib/ai.ts`. Facts (deadlines, criteria) only come from `data/scholarships.json`; the UI never shows past dates as current and always points to the official site.

## Loading screen

While the analysis runs, `/analyzing` shows a live picture of it (`src/components/analyzing/AnalyzingOrbit.tsx`): the profile rows and chips are the facts extracted from your text/CV, the foundations and bars are the real scores, recomputed as each fact is read. The original spinner screen is kept as a backup (`AnalyzingClassic.tsx`):

- `NEXT_PUBLIC_ANALYZING_SCREEN=classic` in `.env.local` (then rebuild/restart) makes the classic screen the default
- `/analyzing?loader=classic` or `?loader=orbit` overrides it for one visit
- if the orbit screen ever crashes, the classic screen takes over automatically

## No invented facts

Everything the AI extracts is checked against the user's own text before it is used (`verifyProfile` in `src/lib/profile.ts`): religion, party, union and first-generation status are taken only from explicit statements ("I am Catholic", "member of the SPD"), never from a mere mention; grades, study level, field, goal, country and languages must be traceable to the text; AI explanations containing numbers that are not in the data are discarded. Anything unsupported shows as "not mentioned".

## Privacy

Profile, matches and drafts are stored only in your browser (`localStorage`). Text you write is sent to Mistral (EU) for analysis and is not logged or stored by this app.

## Layout

- **Desktop:** designed at 1440×900 and scaled uniformly to fit any window (`src/components/Stage.tsx`), so every screen is one full-screen view.
- **Mobile (< 900px):** a fluid full-height layout with a compact nav; the workspace becomes Documents / Letter / Assistant tabs.
- The page itself never scrolls; long mobile screens scroll inside their content area.
