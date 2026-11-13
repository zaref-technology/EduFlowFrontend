"use client";

// "Remarks with AI": a report-card remark for every student of the test, written from their
// marks and attendance. They're shown to check and edit; "Use these remarks" puts them in the
// marks sheet, which saves them with the usual Save.
import { useState } from "react";
import { Drawer, errorMessage } from "@/components/data";
import { Alert, Button, Icon, cx } from "@/components/ui";
import { WRITE_LANGUAGES, readChatLanguage, refreshAiStatus, type WriteLanguage } from "@/lib/ai";
import { api } from "@/lib/api";
import type { ExamRow } from "@/lib/exams";

const SPARK = "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z";
const TONES = [
  ["warm", "Warm"],
  ["formal", "Formal"],
  ["brief", "Brief"],
] as const;

export function AiRemarksDrawer({ examId, rows, currentRemark, onUse, onClose }: { examId: string; rows: ExamRow[]; currentRemark: (studentId: string) => string; onUse: (remarks: { studentId: string; remark: string }[]) => void; onClose: () => void }) {
  const [language, setLanguage] = useState<WriteLanguage>(() => {
    const l = readChatLanguage();
    return l === "auto" ? "en" : l;
  });
  const [tone, setTone] = useState<(typeof TONES)[number][0]>("warm");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<{ studentId: string; remark: string; use: boolean }[] | null>(null);
  const names = new Map(rows.map((r) => [r.student.id, r.student.fullName]));
  const marked = rows.filter((r) => r.result.status === "pass" || r.result.status === "fail").length;
  const questions = Math.max(1, Math.ceil(marked / 10));

  async function write() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ remarks: { studentId: string; remark: string }[] }>("/api/ai/remarks", { method: "POST", body: { examId, language, tone } });
      setDrafts(r.remarks.map((x) => ({ ...x, use: true })));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      refreshAiStatus();
    }
  }

  const chosen = drafts?.filter((d) => d.use && d.remark.trim()) ?? [];

  return (
    <Drawer
      title={
        <span className="flex items-center gap-2">
          <Icon d={SPARK} className="size-4 text-accent" />
          Report-card remarks with AI
        </span>
      }
      onClose={onClose}
      size="lg"
      footer={
        drafts ? (
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setDrafts(null)} className="text-sm font-medium text-muted hover:text-foreground">
              ← Start again
            </button>
            <Button
              onClick={() => {
                onUse(chosen.map(({ studentId, remark }) => ({ studentId, remark: remark.trim() })));
                onClose();
              }}
              disabled={!chosen.length}
            >
              Use {chosen.length} remark{chosen.length === 1 ? "" : "s"}
            </Button>
          </div>
        ) : null
      }
    >
      {error && <Alert>{error}</Alert>}
      {!drafts ? (
        <div className="space-y-5">
          <p className="text-sm text-muted">
            One short remark for each of the {marked} student{marked === 1 ? "" : "s"} with marks, from their subjects and attendance: a real strength and, where needed, one thing to work on. You can edit every remark before using it.
          </p>
          <div>
            <p className="mb-1.5 text-sm font-medium">Language</p>
            <div className="flex gap-1.5">
              {WRITE_LANGUAGES.map((l) => (
                <button key={l.id} type="button" onClick={() => setLanguage(l.id)} aria-pressed={language === l.id} className={cx("rounded-full border px-3.5 py-1 text-sm", language === l.id ? "border-accent bg-accent text-white" : "border-border hover:border-accent/40")}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium">Tone</p>
            <div className="flex gap-1.5">
              {TONES.map(([id, label]) => (
                <button key={id} type="button" onClick={() => setTone(id)} aria-pressed={tone === id} className={cx("rounded-full border px-3.5 py-1 text-sm", tone === id ? "border-accent bg-accent text-white" : "border-border hover:border-accent/40")}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={write} loading={busy} disabled={!marked}>
            <Icon d={SPARK} />
            Write remarks · {questions} AI question{questions === 1 ? "" : "s"}
          </Button>
          {!marked && <p className="text-sm text-muted">Enter and save the marks first.</p>}
        </div>
      ) : (
        <ul className="space-y-3">
          {drafts.map((d, i) => {
            const existing = currentRemark(d.studentId);
            return (
              <li key={d.studentId} className={cx("rounded-xl border p-3 transition-colors", d.use ? "border-accent/30 bg-accent-soft/30" : "border-border opacity-70")}>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={d.use} onChange={(e) => setDrafts((x) => x!.map((y, k) => (k === i ? { ...y, use: e.target.checked } : y)))} className="size-4 accent-[var(--accent)]" />
                  {names.get(d.studentId) ?? "Student"}
                  {existing && <span className="text-xs font-normal text-muted">· replaces the current remark</span>}
                </label>
                <textarea
                  value={d.remark}
                  onChange={(e) => setDrafts((x) => x!.map((y, k) => (k === i ? { ...y, remark: e.target.value } : y)))}
                  maxLength={300}
                  rows={2}
                  aria-label={`Remark for ${names.get(d.studentId) ?? "student"}`}
                  className="w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </li>
            );
          })}
        </ul>
      )}
    </Drawer>
  );
}
