"use client";

import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Assistant } from "@/components/Assistant";
import { DocumentsCard } from "@/components/DocumentsCard";
import { Editor } from "@/components/Editor";
import { PracticeCard } from "@/components/PracticeCard";
import { applicationProgress } from "@/lib/documents";
import { localizedName } from "@/lib/format";
import { getScholarshipById } from "@/lib/matching";
import { useAppStore, useT } from "@/lib/store";
import { useIsMobile } from "@/lib/useMobile";

export default function WorkspacePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useT();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<"docs" | "letter" | "assistant">("letter");
  const hydrated = useAppStore((s) => s.hydrated);
  const match = useAppStore((s) => s.matches.find((m) => m.scholarshipId === id));
  const statuses = useAppStore((s) => s.docStatus[id]);
  const draft = useAppStore((s) => s.drafts[id]);
  const setDocStatus = useAppStore((s) => s.setDocStatus);
  const updateDraft = useAppStore((s) => s.updateDraft);
  const setPracticeScholarship = useAppStore((s) => s.setPracticeScholarship);

  const scholarship = getScholarshipById(id);

  useEffect(() => {
    if (!scholarship) router.replace(hydrated ? "/matches" : "/");
  }, [scholarship, hydrated, router]);

  if (!scholarship) return null;

  const documents = scholarship.documents;
  const { done, total } = applicationProgress(statuses, documents);
  const progress = total ? (done / total) * 100 : 0;
  const name = localizedName(scholarship, lang);
  const openLetter = () => {
    if (isMobile) setTab("letter");
    // wait a frame so the letter panel is visible on mobile before it takes the focus
    requestAnimationFrame(() => document.getElementById("letter-body")?.focus());
  };
  const startPractice = () => {
    setPracticeScholarship(id);
    router.push("/practice");
  };
  // Desktop: panels are plain flex children. Mobile: only the active tab is shown.
  const panel = (key: typeof tab) => (!isMobile ? "contents" : tab === key ? "flex min-h-0 flex-1 flex-col" : "hidden");

  return (
    <div className="mt-3 flex h-[764px] gap-5 mobile:mt-0 mobile:h-full mobile:flex-col mobile:gap-3">
      {/* Mobile only: the three panels become tabs */}
      {isMobile && (
        <div role="tablist" className="glass glass-row flex shrink-0 gap-1 p-1" style={{ borderRadius: 9999 }}>
          {(["docs", "letter", "assistant"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`h-10 flex-1 rounded-full text-[13.5px] transition-all ${
                tab === key
                  ? "bg-white font-semibold text-ink shadow-[0_2px_10px_-3px_rgba(75,47,168,0.3)]"
                  : "font-medium text-muted"
              }`}
            >
              {t.workspace.tabs[key]}
            </button>
          ))}
        </div>
      )}

      {/* All panels stay mounted (chat and editor state survive tab switches); mobile shows one at a time. */}
      <div className={panel("docs")}>
        {/* Left: scholarship + documents */}
        <div className="flex h-full w-[290px] shrink-0 flex-col gap-4 mobile:w-full mobile:min-h-0 mobile:flex-1 mobile:shrink mobile:overflow-y-auto">
          <div className="glass px-[23px] pb-[22px] pt-[23px]">
            <span
              className="inline-flex h-6 items-center rounded-full px-3 text-[10.5px] font-semibold tracking-[0.04em] text-white"
              style={{ background: "linear-gradient(135deg, var(--violet), var(--pink-deep))" }}
            >
              {match ? t.workspace.matchPill(match.score) : t.workspace.noMatchPill}
            </span>
            <h1 className="mt-[14px] font-display text-[24px] font-semibold leading-[29px] tracking-[-0.015em] text-ink">
              {name}
            </h1>
            <p className="mt-2 text-[13px] leading-[18px] text-muted">{t.workspace.subtitle(scholarship.name)}</p>

            <div className="mt-[18px] flex items-baseline justify-between text-[13px]">
              <span className="font-medium text-ink">{t.workspace.progress}</span>
              <span className="text-muted">
                {done} / {total}
              </span>
            </div>
            <div
              className="mt-[10px] h-[6px] overflow-hidden rounded-full bg-neutral-line/30"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
              aria-label={t.workspace.progress}
            >
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, var(--violet), var(--pink))" }}
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>

          <DocumentsCard
            t={t}
            documents={documents}
            statuses={statuses ?? {}}
            onChange={(key, status) => setDocStatus(id, key, status)}
            onOpenLetter={openLetter}
          />

          <PracticeCard t={t} onStart={startPractice} />
        </div>
      </div>

      {/* Center: editor */}
      <div className={panel("letter")}>
        <Editor
          key={`editor-${id}-${lang}`}
          scholarshipId={id}
          name={name}
          draft={draft}
          onDraftChange={(patch) => updateDraft(id, patch)}
        />
      </div>

      {/* Right: assistant */}
      <div className={panel("assistant")}>
        <Assistant key={`assistant-${id}-${lang}`} scholarship={scholarship} draft={draft?.body ?? ""} />
      </div>
    </div>
  );
}
