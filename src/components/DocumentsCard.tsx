"use client";

import { Check } from "lucide-react";
import { additionalDocuments, isTicked, LETTER_KEY, readyCount, toggledStatus } from "@/lib/documents";
import { docKey, docLabel } from "@/lib/format";
import { Translations } from "@/lib/i18n";
import { DocStatus } from "@/lib/store";

interface Props {
  t: Translations;
  /** the scholarship's `documents` field */
  documents: string[];
  statuses: Record<string, DocStatus>;
  onChange: (docKey: string, status: DocStatus) => void;
  /** moves the focus to the letter editor */
  onOpenLetter: () => void;
}

const microLabel = "text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted/90";

/**
 * Two clearly separated parts:
 * - WRITE HERE: the motivation letter, the only document written inside ScholarPath
 * - ADDITIONAL DOCUMENTS: a plain checklist (tick / untick only, no links, no hover highlight)
 */
export function DocumentsCard({ t, documents, statuses, onChange, onOpenLetter }: Props) {
  const extras = additionalDocuments(documents);
  const ready = readyCount(statuses, documents);
  const letterLabel = docLabel(t, LETTER_KEY);

  return (
    <section
      className="glass flex min-h-0 flex-1 flex-col gap-[10px] px-[22px] py-5 mobile:flex-none"
      aria-label={t.workspace.additionalDocs}
    >
      <h2 className={microLabel}>{t.workspace.writeHere}</h2>
      <button
        type="button"
        onClick={onOpenLetter}
        aria-label={t.workspace.openLetter(letterLabel)}
        className="flex w-full items-center gap-[10px] rounded-[14px] bg-white/80 px-3 py-[11px] text-left shadow-[0_6px_14px_-6px_rgba(75,47,168,0.22)]"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[2.5px] border-warning">
          <span className="h-[6px] w-[6px] rounded-full bg-warning" />
        </span>
        <span className="min-w-0 flex-1 text-[14px] font-medium leading-[18px] text-ink">{letterLabel}</span>
        <span className="shrink-0 rounded-lg bg-warning-bg px-2 py-[3px] text-[10.5px] font-medium text-warning-text">
          {t.workspace.writing}
        </span>
      </button>

      {extras.length > 0 && (
        <>
          <div className="h-px w-full bg-ink/[0.08]" aria-hidden />
          <div className="flex items-center justify-between">
            <h2 className={microLabel}>{t.workspace.additionalDocs}</h2>
            <span className="text-[12px] font-medium text-muted" aria-live="polite">
              {t.workspace.readyCount(ready, extras.length)}
            </span>
          </div>
          <p className="text-[12px] leading-[16px] text-muted">{t.workspace.prepareHint}</p>
          <ul className="thin-scroll -mr-1 flex min-h-0 flex-col overflow-y-auto pr-1">
            {extras.map((doc) => {
              const key = docKey(doc);
              const ticked = isTicked(statuses, key);
              return (
                <li key={doc}>
                  <label className="flex cursor-pointer items-center gap-[11px] py-[5px]">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={ticked}
                      onChange={() => onChange(key, toggledStatus(statuses[key]))}
                    />
                    <span
                      aria-hidden
                      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-violet ${
                        ticked ? "" : "border-[1.8px] border-neutral-line"
                      }`}
                      style={ticked ? { background: "linear-gradient(225deg, #34d399, #16a34a)" } : undefined}
                    >
                      {ticked && <Check className="h-[11px] w-[11px]" strokeWidth={3.5} />}
                    </span>
                    <span
                      className={`min-w-0 flex-1 text-[13.5px] font-medium leading-[18px] ${ticked ? "text-ink/60" : "text-ink"}`}
                    >
                      {docLabel(t, doc)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
