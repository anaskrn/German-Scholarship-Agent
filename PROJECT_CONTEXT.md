# PROJECT_CONTEXT.md

> Kontextdatei für Cursor / Claude Code / Mitwirkende.
> Diese Datei beschreibt Vision, Entscheidungen, Architektur, Datenmodell und Roadmap.
> Bei Unsicherheit gilt: **Diese Datei ist die Quelle der Wahrheit.** Wenn sich Entscheidungen ändern, hier aktualisieren.
> Tipp: Für Claude Code zusätzlich als `CLAUDE.md` ablegen (oder in `CLAUDE.md` mit `@PROJECT_CONTEXT.md` referenzieren). Für Cursor eine Kurzfassung in `.cursor/rules/` legen (siehe Abschnitt 13).

---

## 1. Vision

Ein **AI-gestütztes Stipendien-Such-Tool für Deutschland**, das Menschen hilft,
1. das **passende Stipendium** zu finden (Start: die 13 Begabtenförderungswerke),
2. sich **besser zu bewerben** (Essay-/Motivationsschreiben-Coach),
3. später auch bei der **Uni-Bewerbung** zu unterstützen.

Ziele:
- **Kostenlos** nutzbar für Endnutzer:innen.
- **Europäisches, möglichst offenes KI-Modell** (Mistral, EU-gehostet).
- **Modern, futuristisch, spaßig** in der Nutzung (kein trockenes Formular).
- **Open Source** auf GitHub, langfristig von der Community erweiterbar.
- Gleichzeitig: **Lernprojekt** und Vorbereitung auf einen Hackathon (Samstag). Ziel ist ein Bautag mit AI-Coding (Cursor, Claude Code, GitHub).

Arbeitstitel (offen): `Stipendium Radar` / `FörderKompass` / `GrantPilot`.

---

## 2. Grundprinzipien (wichtige Entscheidungen)

1. **Kein Training / kein Fine-Tuning.** Der Datensatz (13 Werke) ist klein und passt komplett in den Prompt. Wissen kommt aus strukturierten Daten + gutem Prompting. Keine Vektordatenbank im MVP.
2. **Hybrid-Matching:** Ein deterministischer Algorithmus (TypeScript) filtert und bewertet. Die KI schreibt nur die **Begründung** für die Top-Treffer. Grund: schneller, testbar, nachvollziehbar, spart API-Anfragen.
3. **Essay-Coach statt Ghostwriter.** Die KI stellt Fragen, gibt Feedback, schlägt Struktur vor, arbeitet Persönlichkeit heraus. Sie schreibt **nicht** den kompletten Text. Begründung: Auswahlkommissionen wollen Persönlichkeit sehen, generische KI-Texte fallen auf. Das ist auch ethisch sauberer und ein Alleinstellungsmerkmal.
4. **Anbieter-unabhängige KI-Schicht.** Alle Modellaufrufe laufen über **eine Datei** (`lib/ai.ts`). Anbieter/Modell lassen sich mit einer Zeile wechseln.
5. **Datenschutz ist Feature.** Nutzerprofil im MVP nur im Browser (kein Backend-Speicher). Transparenter Hinweis, dass Texte an die KI-API gesendet werden.
6. **Daten müssen prüfbar sein.** Jedes Stipendium hat `lastVerified` und eine offizielle `url`. Nie Fristen oder Beträge "aus dem Gedächtnis" eintragen, immer von der offiziellen Seite verifizieren.
7. **MVP zuerst.** Uni-Bewerbung, Accounts, weitere Stipendien kommen **nach** dem MVP. Lieber ein fertiges Feature als drei halbe.

---

## 3. Zielgruppe

- Studierende (Bachelor, Master), Promovierende, Studieninteressierte/Schüler:innen kurz vor dem Studium.
- Besonders: **Erstakademiker:innen**, internationale Studierende, Menschen, die nicht wissen, dass sie förderfähig sind.
- Sprachen: **Deutsch (primär)**, **Englisch (sekundär)**. i18n von Anfang an (`next-intl`).

---

## 4. Funktionsumfang

### MVP (Bautag)
- [ ] Landing Page mit futuristischem Look
- [ ] **Onboarding-Quiz** (Karte für Karte, ~8-10 Fragen)
- [ ] **Matching-Engine** (deterministisch) mit Score je Werk
- [ ] **Ergebnis-Screen:** animierte Match-Karten mit Prozent-Ring
- [ ] **KI-Begründung** je Top-Match (warum passt das?)
- [ ] **Detailseite** je Werk (Fristen, Voraussetzungen, Auswahlverfahren, Link)
- [ ] **Essay-Coach-Chat** mit werkspezifischem System-Prompt (Streaming)
- [ ] Deployment auf Vercel
- [ ] README mit Screenshot, Lizenz, CONTRIBUTING

### V2
- Weitere Stipendien (Deutschlandstipendium, DAAD, größere Stiftungen, Unternehmensstipendien)
- Fristen-Dashboard + Kalender-Export (.ics)
- Bewerbungs-Checklisten je Stipendium (Gutachten, Lebenslauf, Zeugnisse ...)
- Englische UI vollständig
- Community-Beiträge per Pull Request (JSON)

### V3: Uni-Bewerbung
- Studiengangs-Matching
- Hilfe bei Motivationsschreiben für Master-/Uni-Bewerbungen
- uni-assist-Erklärungen für internationale Bewerbende

### V4
- Accounts + EU-gehostete Datenbank (Postgres)
- Community-gepflegte Stipendien-Datenbank mit Review-Prozess
- Mentoring-Vermittlung zu ehemaligen Stipendiat:innen

---

## 5. Tech-Stack

| Bereich | Wahl | Anmerkung |
|---|---|---|
| Framework | **Next.js** (App Router) | TypeScript strict |
| Styling | **Tailwind CSS** + **shadcn/ui** | |
| Animation | **Framer Motion** | Quiz-Übergänge, Karten, Prozent-Ring |
| KI-SDK | **Vercel AI SDK** | Streaming, Mistral-Provider vorhanden |
| KI-Modell | **Mistral** (La Plateforme) | EU-Anbieter (Paris), Open-Weight-Modelle |
| Daten (MVP) | JSON-Dateien im Repo | `data/scholarships.json` |
| Daten (V4) | Postgres (z. B. Supabase EU-Region) | Schema siehe Abschnitt 9 |
| i18n | **next-intl** | `de` (default), `en` |
| Hosting | **Vercel** (Region Frankfurt `fra1`) | Hobby-Plan |
| Validierung | **Zod** | Profil, Daten-Schema, API-Inputs |
| Tests | **Vitest** | mindestens für die Matching-Engine |
| Lint/Format | ESLint + Prettier | |

Code, Variablennamen, Kommentare, Commits, README: **Englisch**. UI-Texte: über i18n-Dateien (de/en).

---

## 6. KI-Modell und Kosten

**Aktuelle Wahl:** Mistral über die kostenlose "Experiment"-Stufe der La Plateforme.

Nach meinem Recherchestand (bitte vor dem Bauen in der Mistral-Console prüfen, das ändert sich):
- Zugriff auf alle Modelle inkl. Mistral Large, keine Kreditkarte, Telefonverifizierung.
- Sehr knappe Rate Limits (ca. **2 Anfragen/Minute**), großes Monatskontingent (ca. 1 Mrd. Tokens).
- **Wichtiger Haken:** Die Experiment-Stufe setzt voraus, dass Eingaben fürs Training genutzt werden dürfen. Für persönliche Essays ist das heikel. Deshalb muss die UI einen klaren **Datenschutzhinweis** zeigen. Für Produktion auf bezahlte Stufe wechseln.
- Die 2-Anfragen-Grenze reicht für Entwicklung und Demo, **nicht** für viele gleichzeitige Nutzer.

**Strategien für Skalierung / Datenschutz (später):**
1. Upgrade auf bezahlte Stufe, sobald Nutzung da ist.
2. **Bring your own key:** Nutzer:innen tragen eigenen API-Key ein.
3. **Modell im Browser** (z. B. WebLLM mit kleinem Open-Weight-Modell): kostenlos und datenschutzfreundlich, aber schwächeres Essay-Feedback.
4. Rate-Limit-Handling im UI (Warteschlange, freundliche Fehlermeldung, Retry mit Backoff).

**Regeln für `lib/ai.ts`:**
- Einzige Stelle, die den Anbieter kennt.
- Exportiert z. B. `streamEssayCoach(...)` und `explainMatch(...)`.
- API-Key nur serverseitig (`MISTRAL_API_KEY`), nie im Client, nie im Repo.
- Robuste Fehlerbehandlung für Rate Limits (HTTP 429).

---

## 7. Matching-Logik

Zweistufig:

**Stufe 1: deterministisch (`lib/matching.ts`)**
1. **Harte Filter** (Ausschluss): z. B. Konfession/Weltanschauung, wo ein Werk sie voraussetzt; Studienphase außerhalb des Förderbereichs; Staatsangehörigkeit/Aufenthaltsstatus, falls relevant.
2. **Score** (0-100) über gewichtete Übereinstimmungen: Werte/Themen, Engagement-Bereiche, politische/weltanschauliche Nähe, Fachrichtung, Erstakademiker-Status, Notenbereich (grob).
3. Ergebnis: sortierte Liste mit `score` und `matchedReasons[]` (strukturierte Gründe).

**Stufe 2: KI (`lib/ai.ts`)**
- Bekommt nur **Top 3-5** + Nutzerprofil + die strukturierten Gründe.
- Schreibt für jeden Treffer 2-3 Sätze "Warum passt das zu dir?" und ggf. "Worauf du achten solltest".
- Darf **keine Fakten erfinden**: nur Daten aus dem übergebenen JSON verwenden.

**Wichtig:** Die Engine muss ohne KI funktionieren (Fallback: Standard-Texte aus `matchedReasons`). Unit-Tests dafür schreiben.

---

## 8. Datenmodell (JSON, MVP)

Datei: `data/scholarships.json`. Validiert mit Zod-Schema in `lib/schema.ts`.

```json
{
  "id": "boell",
  "name": "Heinrich-Böll-Stiftung",
  "type": "begabtenfoerderungswerk",
  "orientation": "politisch, Bündnis 90/Die Grünen nahe",
  "values": ["Ökologie", "Demokratie", "Geschlechtergerechtigkeit"],
  "phases": ["bachelor", "master", "promotion"],
  "hardFilters": [],
  "deadlines": [{ "label": "Studium", "date": "YYYY-MM-DD", "note": "" }],
  "selectionProcess": "Online-Bewerbung, Gutachten, Auswahlgespräch",
  "essayFocus": "Gesellschaftliches Engagement im Sinne der Stiftungswerte",
  "funding": { "note": "Betrag laut offizieller Seite prüfen" },
  "url": "https://...",
  "lastVerified": "YYYY-MM-DD"
}
```

### Die 13 Begabtenförderungswerke (Startdatensatz)

| # | Werk | Ausrichtung (grob) |
|---|---|---|
| 1 | Studienstiftung des deutschen Volkes | weltanschaulich unabhängig, Leistung + Persönlichkeit |
| 2 | Cusanuswerk | katholisch |
| 3 | Evangelisches Studienwerk Villigst | evangelisch |
| 4 | Ernst Ludwig Ehrlich Studienwerk | jüdisch |
| 5 | Avicenna-Studienwerk | muslimisch |
| 6 | Friedrich-Ebert-Stiftung | SPD-nah |
| 7 | Friedrich-Naumann-Stiftung für die Freiheit | FDP-nah |
| 8 | Hanns-Seidel-Stiftung | CSU-nah |
| 9 | Heinrich-Böll-Stiftung | Grünen-nah |
| 10 | Konrad-Adenauer-Stiftung | CDU-nah |
| 11 | Rosa-Luxemburg-Stiftung | Linke-nah |
| 12 | Hans-Böckler-Stiftung | gewerkschaftsnah |
| 13 | Stiftung der Deutschen Wirtschaft (sdw) | wirtschaftsnah |

> ⚠️ **Fristen, Förderbeträge, Bewerbungswege und Voraussetzungen ändern sich.** Nur von den offiziellen Seiten übernehmen, `lastVerified` pflegen. Nähe zu einer Partei/Konfession heißt **nicht**, dass Mitgliedschaft verlangt wird. Die Kriterien je Werk genau prüfen und korrekt abbilden.

---

## 9. Optionales SQL-Schema (ab V4 / wenn eine DB dazukommt)

Postgres (z. B. Supabase, EU-Region). Nur nutzen, wenn Accounts/Community-Daten gebraucht werden. Im MVP **nicht** nötig.

```sql
-- Stipendien
create table scholarships (
  id text primary key,
  name text not null,
  type text not null check (type in ('begabtenfoerderungswerk','stiftung','unternehmen','staatlich','sonstige')),
  orientation text,
  values text[] not null default '{}',
  phases text[] not null default '{}',
  hard_filters jsonb not null default '[]',
  selection_process text,
  essay_focus text,
  funding jsonb,
  url text not null,
  last_verified date not null,
  created_at timestamptz not null default now()
);

create table deadlines (
  id bigserial primary key,
  scholarship_id text not null references scholarships(id) on delete cascade,
  label text not null,
  due_date date not null,
  note text
);

create index on deadlines (due_date);

-- Nutzer (nur mit Accounts, V4)
create table profiles (
  id uuid primary key,              -- = auth user id
  answers jsonb not null,           -- Quiz-Antworten
  created_at timestamptz not null default now()
);

create table applications (
  id bigserial primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  scholarship_id text not null references scholarships(id),
  status text not null default 'planned'
    check (status in ('planned','in_progress','submitted','interview','accepted','rejected')),
  notes text,
  updated_at timestamptz not null default now()
);

-- Row Level Security (wenn Supabase): Nutzer sehen nur eigene Daten
alter table profiles enable row level security;
alter table applications enable row level security;
```

Regeln: Essays/Freitexte möglichst **nicht** serverseitig speichern, solange nicht nötig (Datenschutz). Bei Speicherung: EU-Region, Löschfunktion, DSGVO beachten.

---

## 10. Quiz-Fragen (Vorschlag, ~8-10)

1. Aktuelle Phase (Schule / Bachelor / Master / Promotion)
2. Fachrichtung (Kategorien)
3. Notenbereich (grob, optional)
4. Erstakademiker:in? (ja / nein / keine Angabe)
5. Engagement-Bereiche (Mehrfachauswahl: Umwelt, Soziales, Politik, Religion/Gemeinde, Wirtschaft/Gründung, Kultur, Sport ...)
6. Wichtige Werte/Themen (Mehrfachauswahl)
7. Religion/Weltanschauung (optional, "keine Angabe" möglich)
8. Politische Nähe (optional, "keine Angabe" möglich)
9. Gewerkschaftliches Engagement (optional)
10. Migrationsgeschichte / Staatsangehörigkeit (optional, nur für Filter)

**Sensible Daten** (Religion, politische Haltung, Migrationsgeschichte): immer freiwillig, "keine Angabe" anbieten, erklären *warum* gefragt wird, nichts davon serverseitig speichern oder loggen.

---

## 11. Essay-Coach: Prompting-Leitlinien

System-Prompt-Bausteine (je Werk aus `scholarships.json`):
- Rolle: erfahrener Bewerbungscoach, ehrlich, ermutigend, konkret.
- Kontext: Werte, `essayFocus`, `selectionProcess` des gewählten Werks.
- Verhalten:
  - Stellt zuerst **Fragen** zu Erlebnissen, Motivation, Engagement.
  - Gibt **Feedback** zu Struktur, Klarheit, roter Faden, Authentizität.
  - Schlägt **Gliederungen** und **Formulierungsalternativen** vor (kurz, nicht ganze Essays).
  - Schreibt **keinen** kompletten Essay auf Zuruf; verweist freundlich auf den Coaching-Ansatz.
  - Erfindet **keine** Fakten über die Person oder das Werk.
  - Antwortet in der Sprache der Nutzer:in.
- Hinweis im UI: "Dein Text wird zur Verarbeitung an die KI-API gesendet."

---

## 12. Design-Richtlinien

- **Dark Theme**, Neon-Akzent (Violett → Cyan Gradient).
- **Glassmorphism-Karten** (`backdrop-blur`, halbtransparente Ränder).
- Animierter Hintergrund (Gradient-Mesh oder dezente Partikel).
- Quiz als **Karte-für-Karte-Flow** mit Fortschrittsbalken.
- Kurzer "Scan läuft"-Moment vor dem Ergebnis, dann Match-Karten nacheinander einfliegen, mit **Prozent-Ring**.
- Kleine Belohnungen (z. B. Konfetti beim Top-Match).
- Accessibility: ausreichender Kontrast, Fokus-Zustände, `prefers-reduced-motion` respektieren, Tastaturbedienung.
- Mobile first.

---

## 13. Projektstruktur (Vorschlag)

```
.
├── PROJECT_CONTEXT.md        # diese Datei
├── CLAUDE.md                 # optional: verweist auf PROJECT_CONTEXT.md
├── README.md
├── CONTRIBUTING.md           # wie man Stipendien per JSON/PR ergänzt
├── LICENSE                   # MIT
├── .cursor/rules/            # Cursor-Regeln (Kurzfassung dieser Datei)
├── data/
│   └── scholarships.json
├── messages/
│   ├── de.json
│   └── en.json
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── [locale]/
│   │   │   ├── page.tsx              # Landing
│   │   │   ├── quiz/page.tsx
│   │   │   ├── results/page.tsx
│   │   │   ├── scholarship/[id]/page.tsx
│   │   │   └── coach/[id]/page.tsx   # Essay-Coach
│   │   └── api/
│   │       ├── explain/route.ts      # KI-Begründung
│   │       └── coach/route.ts        # Chat-Streaming
│   ├── components/
│   ├── lib/
│   │   ├── ai.ts             # einzige Stelle mit KI-Anbieter
│   │   ├── matching.ts       # deterministische Engine
│   │   ├── schema.ts         # Zod-Schemas
│   │   └── profile.ts        # Quiz-Profil (Browser-State)
│   └── tests/
│       └── matching.test.ts
└── .env.example              # MISTRAL_API_KEY=
```

### Vorschlag für `.cursor/rules/project.mdc` (Kurzfassung)

```
Project: AI scholarship finder for Germany (13 Begabtenförderungswerke first).
Stack: Next.js App Router, TypeScript strict, Tailwind, shadcn/ui, Framer Motion, Vercel AI SDK, Zod, next-intl, Vitest.
Rules:
- All LLM calls go through src/lib/ai.ts only.
- Matching is deterministic in src/lib/matching.ts; LLM only writes explanations. Never invent facts.
- Essay coach never writes full essays; it asks questions and gives feedback.
- Sensitive answers (religion, politics, migration) are optional, never stored server-side or logged.
- Validate all data and inputs with Zod. Never commit secrets.
- Small, focused components; keep the app runnable after every change.
- Code/comments/commits in English; UI strings via next-intl (de default).
Read PROJECT_CONTEXT.md for full context.
```

---

## 14. Bautag-Plan (ca. 10 Stunden)

| Zeit | Ziel |
|---|---|
| 09:00-10:00 | Repo, Next.js + Tailwind + shadcn, Cursor öffnen, erster Commit, **sofort auf Vercel deployen** |
| 10:00-11:30 | `scholarships.json` mit allen 13 Werken (offizielle Seiten prüfen!) + Zod-Schema |
| 11:30-13:00 | Quiz-Flow + Profil-State |
| 13:00-13:30 | Pause |
| 13:30-15:00 | Matching-Engine + Tests + Ergebnis-Karten |
| 15:00-16:30 | Mistral anbinden (`lib/ai.ts`), Begründungen für Top-Matches |
| 16:30-18:00 | Essay-Coach-Chat (Streaming, werkspezifischer System-Prompt) |
| 18:00-19:00 | Design-Politur, README, Deploy, Demo-Durchlauf |

**Goldene Regel:** Nach jedem Block läuft die App und ist committet.

---

## 15. Workflow: Git, Cursor, Claude Code

- **Branch pro Feature** (`feat/quiz`, `feat/matching`, `feat/coach`), kleine Commits, Pull Request, Merge.
- Commit-Nachrichten im Stil **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`).
- Prompts an die KI-Tools: **klein und konkret**.
  - Gut: "Build a `QuizCard` component with a Framer Motion slide transition. Props: `question`, `options`, `onAnswer`."
  - Schlecht: "Bau mir die ganze App."
- Vor größeren Änderungen: Claude Code/Cursor erst einen **Plan** schreiben lassen, dann umsetzen.
- Nach jeder Änderung: `npm run lint`, `npm run test`, `npm run build`.
- Gute Prompts in `docs/prompts.md` sammeln (Lernnotizen für den Hackathon).

### Hackathon-Vorbereitung (Do/Fr)
- Cursor-Rules und `CLAUDE.md` einrichten.
- Git-Workflow mit Branch/PR üben.
- 2-Minuten-Pitch mit Live-Demo proben (Problem → Demo → Wirkung → Zukunft).
- Backup: Screenshots/kurzes Video der Demo, falls Internet/API ausfällt.

---

## 16. Rechtliches, Ethik, Datenschutz

- **Keine Rechtsberatung / kein Garantieversprechen:** Ergebnisse sind Orientierung. Offizielle Seiten der Werke sind maßgeblich. Hinweis im UI und README.
- **Haftungsausschluss** für Fristen und Kriterien; `lastVerified` sichtbar anzeigen.
- **Sensible Daten:** freiwillig, minimal, lokal. DSGVO beachten (Datenschutzerklärung, Impressum, falls öffentlich betrieben).
- **Markennutzung:** Namen/Logos der Stiftungen nur sachlich nutzen, keinen offiziellen Anschein erwecken ("inoffizielles Community-Projekt").
- **Fairness:** Keine Bewertung von Personen, nur Passung zu Kriterien. Kein Werk "schlechtmachen".
- Lizenz: **MIT** (Code). Datensatz ggf. separat lizenzieren (z. B. CC BY 4.0), wenn Community-Beiträge erwünscht.

---

## 17. Offene Fragen / Entscheidungen

- [ ] Endgültiger Projektname und Domain
- [ ] Umgang mit dem Training-Haken der kostenlosen Mistral-Stufe (Hinweistext, BYO-Key, Upgrade)
- [ ] Wie fein sollen politische/weltanschauliche Fragen sein?
- [ ] Wann kommt die Datenbank dazu (erst bei Accounts)?
- [ ] Sollen Erfahrungsberichte von Stipendiat:innen integriert werden (Quelle + Einwilligung)?

---

## 18. Definition of Done (MVP)

- [ ] Nutzer:in kann Quiz durchlaufen und sieht Top-Matches mit Begründung
- [ ] Alle 13 Werke sind mit verifizierten Daten im JSON (`lastVerified` gesetzt)
- [ ] Essay-Coach funktioniert für mindestens 3 Werke mit spezifischem Prompt, für alle 13 generisch
- [ ] Matching-Engine hat Unit-Tests
- [ ] App ist live auf Vercel (Frankfurt)
- [ ] README mit Screenshot, Setup-Anleitung, Lizenz, Haftungshinweis
- [ ] Kein API-Key im Repo, `.env.example` vorhanden
