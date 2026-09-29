"use client";

import { Check } from "lucide-react";
import { docKey, docLabel } from "@/lib/format";
import { DocStatus } from "@/lib/store";
import { Translations } from "@/lib/i18n";

const NEXT: Record<DocStatus, DocStatus> = {
  incomplete: "in-progress",
  "in-progress": "complete",
  complete: "incomplete",
};

interface Props {
  t: Translations;
  documents: string[];
  statuses: Record<string, DocStatus>;
  onChange: (docKey: string, status: DocStatus) => void;
}

/** Default status: the motivation letter is the document being written in the editor. */
export function statusOf(statuses: Record<string, DocStatus>, key: string): DocStatus {
  return statuses[key] ?? (key === "motivation letter" ? "in-progress" : "incomplete");
}

export function DocChecklist({ t, documents, statuses, onChange }: Props) {
  const statusLabel: Record<DocStatus, string> = {
    complete: t.workspace.status.complete,
    "in-progress": t.workspace.status.inProgress,
    incomplete: t.workspace.status.incomplete,
  };

  return (
    <div className="glass flex min-h-0 flex-1 flex-col px-[15px] pb-[15px] pt-[22px]">
      <h2 className="mb-[13px] px-2 text-[15px] font-semibold text-ink">{t.workspace.requiredDocs}</h2>
      <ul className="thin-scroll -mr-1 flex min-h-0 flex-1 flex-col gap-[2px] overflow-y-auto pr-1">
        {documents.map((doc) => {
          const key = docKey(doc);
          const status = statusOf(statuses, key);
          const isActive = key === "motivation letter";
          const label = docLabel(t, doc);
          return (
            <li key={doc}>
              <button
                type="button"
                onClick={() => onChange(key, NEXT[status])}
                aria-label={t.workspace.statusAction(label, statusLabel[status])}
                className={`flex min-h-[44px] w-full items-center gap-[11px] rounded-[14px] px-[10px] py-2 text-left transition-colors ${
                  isActive ? "bg-white shadow-[0_6px_18px_-8px_rgba(75,47,168,0.3)]" : "hover:bg-white/50"
                }`}
              >
                <StatusIcon status={status} />
                <span className={`flex-1 text-[14px] leading-[18px] text-ink ${isActive ? "font-medium" : ""}`}>{label}</span>
                <StatusPill status={status} label={statusLabel[status]} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function StatusIcon({ status }: { status: DocStatus }) {
  if (status === "complete") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-white">
        <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden />
      </span>
    );
  }
  if (status === "in-progress") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[2.5px] border-warning">
        <span className="h-[6px] w-[6px] rounded-full bg-warning" />
      </span>
    );
  }
  return <span className="h-5 w-5 shrink-0 rounded-full border-[1.5px] border-neutral-line" />;
}

function StatusPill({ status, label }: { status: DocStatus; label: string }) {
  const style =
    status === "complete"
      ? "bg-success-bg text-success"
      : status === "in-progress"
        ? "bg-warning-bg text-warning-text"
        : "bg-neutral-bg text-muted";
  return <span className={`shrink-0 rounded-[10px] px-2 py-[3px] text-[11px] font-medium ${style}`}>{label}</span>;
}
