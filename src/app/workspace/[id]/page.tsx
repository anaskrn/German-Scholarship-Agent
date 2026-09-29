"use client";

import { motion } from "framer-motion";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Assistant } from "@/components/Assistant";
import { DocChecklist, statusOf } from "@/components/DocChecklist";
import { Editor } from "@/components/Editor";
import { docKey, localizedName } from "@/lib/format";
import { getScholarshipById } from "@/lib/matching";
import { useAppStore, useT } from "@/lib/store";

export default function WorkspacePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useT();
  const hydrated = useAppStore((s) => s.hydrated);
  const match = useAppStore((s) => s.matches.find((m) => m.scholarshipId === id));
  const statuses = useAppStore((s) => s.docStatus[id]);
  const draft = useAppStore((s) => s.drafts[id]);
  const setDocStatus = useAppStore((s) => s.setDocStatus);
  const updateDraft = useAppStore((s) => s.updateDraft);

  const scholarship = getScholarshipById(id);

  useEffect(() => {
    if (!scholarship) router.replace(hydrated ? "/matches" : "/");
  }, [scholarship, hydrated, router]);

  if (!scholarship) return null;

  const documents = scholarship.documents;
  const done = documents.filter((d) => statusOf(statuses ?? {}, docKey(d)) === "complete").length;
  const progress = documents.length ? (done / documents.length) * 100 : 0;
  const name = localizedName(scholarship, lang);

  return (
    <div className="flex h-[764px] gap-5 pt-0" style={{ marginTop: 12 }}>
      {/* Left: scholarship + documents */}
      <div className="flex h-full w-[290px] shrink-0 flex-col gap-4">
        <div className="glass px-[23px] pb-[22px] pt-[23px]">
          <span
            className="inline-flex h-6 items-center rounded-full px-3 text-[10.5px] font-semibold tracking-[0.04em] text-white"
            style={{ background: "linear-gradient(135deg, var(--violet), var(--pink-deep))" }}
          >
            {match ? t.workspace.matchPill(match.score) : t.workspace.noMatchPill}
          </span>
          <h1 className="mt-[14px] font-display text-[24px] font-semibold leading-[29px] tracking-[-0.015em] text-ink">{name}</h1>
          <p className="mt-2 text-[13px] leading-[18px] text-muted">{t.workspace.subtitle(scholarship.name)}</p>

          <div className="mt-[18px] flex items-baseline justify-between text-[13px]">
            <span className="font-medium text-ink">{t.workspace.progress}</span>
            <span className="text-muted">
              {done} / {documents.length}
            </span>
          </div>
          <div
            className="mt-[10px] h-[6px] overflow-hidden rounded-full bg-neutral-line/30"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={documents.length}
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

        <DocChecklist
          t={t}
          documents={documents}
          statuses={statuses ?? {}}
          onChange={(key, status) => setDocStatus(id, key, status)}
        />
      </div>

      {/* Center: editor */}
      <Editor key={`editor-${id}-${lang}`} scholarshipId={id} name={name} draft={draft} onDraftChange={(patch) => updateDraft(id, patch)} />

      {/* Right: assistant */}
      <Assistant key={`assistant-${id}-${lang}`} scholarship={scholarship} draft={draft?.body ?? ""} />
    </div>
  );
}
