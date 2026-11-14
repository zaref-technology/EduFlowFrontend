"use client";

// Changes the assistant prepared (record a fee payment, mark attendance, add a note): a card in
// the answer, and a dialog to choose the student when several match and to confirm. Nothing is
// written until "Confirm"; the server checks everything again with the member's own permissions.
import Link from "next/link";
import { useState } from "react";
import { Modal, requestWhatsApp } from "./ai-answer";
import { errorMessage } from "./data";
import { Alert, Button, Icon, Input, cx } from "./ui";
import { WhatsAppButton } from "./whatsapp-send";
import type { AiAction } from "@/lib/ai";
import { ApiError, api } from "@/lib/api";
import { formatMoney } from "@/lib/fees";

const KIND = {
  fee_payment: { title: "Record fee payment", icon: "M7 4h10M7 8h10M7 4c4 0 6 2 6 4s-2 4-6 4l7 8" },
  attendance: { title: "Mark attendance", icon: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4" },
  class_attendance: { title: "Mark class attendance", icon: "M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 12a3 3 0 100-6 3 3 0 000 6zM20 18c0-1.7-1-3-2.5-3.6M17 6.5a2.5 2.5 0 010 5M4 18c0-1.7 1-3 2.5-3.6M7 6.5a2.5 2.5 0 000 5" },
  student_note: { title: "Add a note", icon: "M4 20h4L18.5 9.5a2.1 2.1 0 00-4-4L4 16v4z" },
} as const;

const MODES = ["cash", "upi", "card", "bank", "cheque", "other"] as const;
const MODE_LABEL: Record<string, string> = { cash: "Cash", upi: "UPI", card: "Card", bank: "Bank", cheque: "Cheque", other: "Other" };
const STATUSES = ["present", "absent", "late", "leave"] as const;
const NOTE_KINDS = ["note", "praise", "concern", "meeting"] as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const prettyDate = (d?: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "");

/** One line about the change, e.g. "₹1,000 · Cash · 12 Nov 2026". */
function summary(a: AiAction) {
  const p = a.params;
  if (a.kind === "fee_payment") return [p.amount ? formatMoney(p.amount) : "", MODE_LABEL[p.mode ?? ""] ?? p.mode, prettyDate(p.date)].filter(Boolean).join(" · ");
  if (a.kind === "attendance") return `${cap(p.status ?? "")} · ${prettyDate(p.date)}`;
  if (a.kind === "class_attendance") {
    const e = p.entries ?? [];
    const n = (st: string) => e.filter((x) => x.status === st).length;
    return [prettyDate(p.date), `${n("present")} present`, `${n("absent")} absent`, n("late") && `${n("late")} late`, n("leave") && `${n("leave")} on leave`].filter(Boolean).join(" · ");
  }
  return `${cap(p.kind ?? "note")}: ${p.text ?? ""}`;
}

const expired = (a: AiAction) => a.status === "pending" && new Date(a.expiresAt) < new Date();

/** The card under an answer. */
export function ActionCard({ action, onReview }: { action: AiAction | undefined; onReview: () => void }) {
  if (!action) return <div className="mt-3 h-[68px] animate-pulse rounded-2xl border border-border bg-surface" />;
  const k = KIND[action.kind];
  const chosen = action.candidates.find((c) => c.id === action.studentId);
  const who = action.kind === "class_attendance" ? `Class ${action.query}` : chosen ? chosen.name : action.candidates.length === 1 ? action.candidates[0].name : `“${action.query}” · ${action.candidates.length} students match`;
  const state = expired(action)
    ? { label: "Expired", tone: "bg-surface-muted text-muted" }
    : action.status === "done"
      ? { label: action.result?.receiptNo ? `Done · Receipt ${action.result.receiptNo}` : "Done", tone: "bg-success-soft text-success" }
      : action.status === "cancelled"
        ? { label: "Cancelled", tone: "bg-surface-muted text-muted" }
        : { label: "Waiting for you to confirm", tone: "bg-warning-soft text-foreground" };
  const open = action.status === "pending" && !expired(action);

  return (
    <div className={cx("mt-3 flex items-center gap-3 rounded-xl border p-3", open ? "border-accent/40 bg-accent-soft/40 motion-safe:animate-glow" : "border-border bg-surface motion-safe:animate-pop")}>
      <span className={cx("grid size-9 shrink-0 place-items-center rounded-lg", action.status === "done" ? "bg-success-soft text-success" : "bg-accent-soft text-accent")}>
        <Icon d={action.status === "done" ? "M5 12l5 5L20 7" : k.icon} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {k.title} <span className="font-normal text-muted">· {who}</span>
        </p>
        <p className="truncate text-xs text-muted">{summary(action)}</p>
        <span className={cx("mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium", state.tone)}>{state.label}</span>
      </div>
      {open && (
        <Button size="sm" onClick={onReview}>
          Review
        </Button>
      )}
      {action.status === "done" && action.kind === "fee_payment" && action.result?.paymentId && (
        <Button size="sm" variant="secondary" onClick={onReview}>
          Receipt
        </Button>
      )}
    </div>
  );
}

/** Choose the student (when several match), check and edit the details, confirm. */
export function ActionModal(props: { action: AiAction; onClose: () => void; onChange: (a: AiAction) => void; /** Leaving for another page: close the chat too */ onNavigate: () => void }) {
  return props.action.kind === "class_attendance" ? <ClassRegister {...props} /> : <OneStudentAction {...props} />;
}

function OneStudentAction({ action, onClose, onChange, onNavigate }: { action: AiAction; onClose: () => void; onChange: (a: AiAction) => void; onNavigate: () => void }) {
  const single = action.candidates.length === 1;
  const [studentId, setStudentId] = useState<string | null>(action.studentId ?? (single ? action.candidates[0].id : null));
  const [picking, setPicking] = useState(!studentId);
  const p = action.params;
  const [amount, setAmount] = useState(p.amount ? String(p.amount / 100) : "");
  const [mode, setMode] = useState(p.mode ?? "cash");
  const [date, setDate] = useState(p.date ?? today());
  const [note, setNote] = useState(p.note ?? "");
  const [status, setStatus] = useState(p.status ?? "present");
  const [noteKind, setNoteKind] = useState(p.kind ?? "note");
  const [text, setText] = useState(p.text ?? "");
  const [busy, setBusy] = useState<"confirm" | "discard" | null>(null);
  const [error, setError] = useState<string | null>(action.status === "pending" ? action.error : null);

  const student = action.candidates.find((c) => c.id === studentId);
  const k = KIND[action.kind];
  const paise = Math.round(Number(amount) * 100);
  const validAmount = Number.isFinite(paise) && paise >= 100;

  async function confirm() {
    if (!studentId) return;
    setBusy("confirm");
    setError(null);
    const edits =
      action.kind === "fee_payment" ? { amount: paise, mode, date, note: note.trim() } : action.kind === "attendance" ? { status, date } : { kind: noteKind, text: text.trim() };
    try {
      const r = await api<{ action: AiAction }>(`/api/ai/actions/${action.id}/confirm`, { method: "POST", body: { studentId, ...edits } });
      onChange(r.action);
    } catch (err) {
      setError(err instanceof ApiError ? (err.details?.[0]?.message ?? err.message) : errorMessage(err));
      // Expired or already handled elsewhere: show the latest state
      if (err instanceof ApiError && (err.status === 409 || err.status === 410)) api<{ action: AiAction }>(`/api/ai/actions/${action.id}`).then((r) => onChange(r.action)).catch(() => {});
    } finally {
      setBusy(null);
    }
  }

  async function discard() {
    setBusy("discard");
    try {
      const r = await api<{ action: AiAction }>(`/api/ai/actions/${action.id}/cancel`, { method: "POST" });
      onChange(r.action);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  // Done
  if (action.status === "done") {
    const done = action.candidates.find((c) => c.id === action.studentId);
    const r = action.result ?? {};
    return (
      <Modal title={k.title} onClose={onClose}>
        <div className="space-y-4 p-5 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-success-soft text-success">
            <Icon d="M5 12l5 5L20 7" className="size-6" />
          </span>
          <div>
            <p className="text-lg font-semibold">
              {action.kind === "fee_payment" ? `${formatMoney(action.params.amount ?? 0)} recorded` : action.kind === "attendance" ? `Marked ${action.params.status}` : "Note added"}
            </p>
            <p className="text-sm text-muted">
              {done?.name} · {done?.class}
              {r.receiptNo ? ` · Receipt ${r.receiptNo}` : ""}
            </p>
            {action.kind === "fee_payment" && (
              <p className="mt-1 text-sm text-muted">
                Balance now {formatMoney(r.balance ?? 0)}
                {r.advance ? ` · ${formatMoney(r.advance)} advance` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {r.paymentId && (
              <WhatsAppButton
                size="sm"
                onClick={() => {
                  onClose();
                  requestWhatsApp({ type: "fee_receipt", refs: [{ paymentId: r.paymentId! }], title: `Receipt ${r.receiptNo}` });
                }}
              >
                Send receipt
              </WhatsAppButton>
            )}
            {r.paymentId && (
              <Link href={`/app/fees?receipt=${r.paymentId}`} onClick={onNavigate} className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-surface-muted">
                Open receipt
              </Link>
            )}
            {done && (
              <Link href={action.kind === "fee_payment" ? `/app/fees?student=${done.id}` : `/app/students?student=${done.id}`} onClick={onNavigate} className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-surface-muted">
                {action.kind === "fee_payment" ? "Open fees" : "Open student"}
              </Link>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Which student?
  if (picking) {
    return (
      <Modal title={`Which “${action.query}”?`} onClose={onClose}>
        <div className="space-y-3 overflow-y-auto p-5">
          <p className="text-sm text-muted">
            {action.candidates.length} students in your school match. Choose the one for this {action.kind === "fee_payment" ? "payment" : action.kind === "attendance" ? "attendance" : "note"}.
          </p>
          <ul className="space-y-2">
            {action.candidates.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    setStudentId(c.id);
                    setPicking(false);
                  }}
                  className={cx("flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors hover:border-accent/50 hover:bg-accent-soft", c.id === studentId ? "border-accent bg-accent-soft" : "border-border bg-surface")}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                    {c.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.name}</span>
                    <span className="block truncate text-xs text-muted">
                      Class {c.class || "—"} · Adm. {c.admissionNo}
                      {c.guardianName ? ` · ${c.guardianName}` : ""}
                    </span>
                  </span>
                  {action.kind === "fee_payment" && c.balance !== null && (
                    <span className={cx("shrink-0 text-right text-xs", c.balance > 0 ? "font-medium text-danger" : c.hasFeePlan === false ? "font-medium text-warning" : "text-muted")}>
                      {c.balance > 0 ? `${formatMoney(c.balance)} due` : c.hasFeePlan === false ? "No fee plan" : "Nothing due"}
                    </span>
                  )}
                  {action.kind === "attendance" && c.attendance && <span className="shrink-0 text-xs capitalize text-muted">{c.attendance}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
    );
  }

  // Check and confirm
  const due = student?.balance ?? 0;
  return (
    <Modal title={`${k.title}?`} onClose={onClose}>
      <div className="space-y-4 overflow-y-auto p-5">
        {error && <Alert>{error}</Alert>}
        {student && (
          <div className="flex items-center gap-3 rounded-xl bg-surface-muted px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{student.name}</p>
              <p className="truncate text-xs text-muted">
                Class {student.class || "—"} · Adm. {student.admissionNo}
                {student.guardianName ? ` · ${student.guardianName}` : ""}
              </p>
            </div>
            {!single && (
              <button type="button" onClick={() => setPicking(true)} className="shrink-0 text-sm font-medium text-accent hover:underline">
                Change
              </button>
            )}
          </div>
        )}

        {action.kind === "fee_payment" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Amount (₹)</span>
                <Input type="number" inputMode="decimal" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount in rupees" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Date</span>
                <Input type="date" max={today()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
              </label>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium">Paid by</p>
              <div className="flex flex-wrap gap-1.5">
                {MODES.map((m) => (
                  <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={cx("rounded-full border px-3 py-1 text-sm", mode === m ? "border-accent bg-accent text-white" : "border-border bg-surface hover:border-accent/40")}>
                    {MODE_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>
            <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Note on the receipt (optional)" aria-label="Note" />
            {student?.hasFeePlan === false ? (
              <div className="space-y-2 rounded-xl border border-warning/50 bg-warning-soft px-3.5 py-3 text-sm">
                <p className="font-semibold">No fee plan is assigned to {student.name.split(" ")[0]} yet</p>
                <p className="text-muted">
                  You can still record this: {validAmount ? formatMoney(paise) : "the amount"} is kept as advance and used automatically once a plan is assigned. To assign one:
                </p>
                <ol className="list-decimal space-y-0.5 pl-5">
                  <li>
                    Go to <span className="font-medium">Fees → Fee plans</span>
                  </li>
                  <li>
                    Open the plan for Class {student.class || "—"} (or create one with <span className="font-medium">New fee plan</span>)
                  </li>
                  <li>
                    Click <span className="font-medium">Assign to students</span>, choose the class or {student.name.split(" ")[0]}, and assign
                  </li>
                </ol>
                <Link href="/app/fees?tab=plans" onClick={onNavigate} className="inline-flex items-center gap-1 font-semibold text-accent hover:underline">
                  Open Fee plans →
                </Link>
              </div>
            ) : validAmount && (
              <p className="rounded-lg bg-surface-muted px-3 py-2 text-sm">
                Due now <span className="font-medium">{formatMoney(due)}</span> → after this <span className="font-medium">{formatMoney(Math.max(0, due - paise))}</span>
                {paise > due && <span className="block text-xs text-muted">{formatMoney(paise - due)} will be kept as advance for future dues.</span>}
              </p>
            )}
          </>
        )}

        {action.kind === "attendance" && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)} aria-pressed={status === s} className={cx("rounded-full border px-3 py-1 text-sm", status === s ? "border-accent bg-accent text-white" : "border-border bg-surface hover:border-accent/40")}>
                  {cap(s)}
                </button>
              ))}
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Date</span>
              <Input type="date" max={today()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </label>
            {student?.attendance && <p className="text-xs text-muted">Currently: {student.attendance}</p>}
          </>
        )}

        {action.kind === "student_note" && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {NOTE_KINDS.map((n) => (
                <button key={n} type="button" onClick={() => setNoteKind(n)} aria-pressed={noteKind === n} className={cx("rounded-full border px-3 py-1 text-sm", noteKind === n ? "border-accent bg-accent text-white" : "border-border bg-surface hover:border-accent/40")}>
                  {cap(n)}
                </button>
              ))}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} aria-label="Note" className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent" />
            <p className="text-xs text-muted">Staff notes are never sent to parents.</p>
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
        <Button variant="ghost" size="sm" onClick={discard} loading={busy === "discard"} disabled={busy !== null}>
          Discard
        </Button>
        <Button
          onClick={confirm}
          loading={busy === "confirm"}
          disabled={busy !== null || !studentId || (action.kind === "fee_payment" && !validAmount) || (action.kind === "student_note" && text.trim().length < 2)}
        >
          {action.kind === "fee_payment" ? `Confirm ${validAmount ? formatMoney(paise) : ""}` : "Confirm"}
        </Button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Whole-class attendance: the register, prefilled from what was said, to check and confirm
// ---------------------------------------------------------------------------

const STATUS_LOOK: Record<string, { short: string; on: string }> = {
  present: { short: "P", on: "bg-success text-white" },
  absent: { short: "A", on: "bg-danger text-white" },
  late: { short: "L", on: "bg-warning text-white" },
  leave: { short: "Lv", on: "bg-sky-600 text-white" },
};

function ClassRegister({ action, onClose, onChange, onNavigate }: { action: AiAction; onClose: () => void; onChange: (a: AiAction) => void; onNavigate: () => void }) {
  const p = action.params;
  const [date, setDate] = useState(p.date ?? today());
  const [marks, setMarks] = useState<Record<string, string>>(() => Object.fromEntries((p.entries ?? []).map((e) => [e.studentId, e.status])));
  const [busy, setBusy] = useState<"confirm" | "discard" | null>(null);
  const [error, setError] = useState<string | null>(action.status === "pending" ? action.error : null);
  const entries = p.entries ?? [];
  // Names that matched several students: those rows are highlighted to set by hand
  const flagged = new Map((p.ambiguous ?? []).flatMap((a) => a.ids.map((id) => [id, a] as const)));
  const counts = Object.fromEntries(STATUSES.map((st) => [st, Object.values(marks).filter((m) => m === st).length]));

  async function confirm() {
    setBusy("confirm");
    setError(null);
    try {
      const r = await api<{ action: AiAction }>(`/api/ai/actions/${action.id}/confirm`, { method: "POST", body: { date, entries: entries.map((e) => ({ studentId: e.studentId, status: marks[e.studentId] })) } });
      onChange(r.action);
    } catch (err) {
      setError(err instanceof ApiError ? (err.details?.[0]?.message ?? err.message) : errorMessage(err));
      if (err instanceof ApiError && (err.status === 409 || err.status === 410)) api<{ action: AiAction }>(`/api/ai/actions/${action.id}`).then((r) => onChange(r.action)).catch(() => {});
    } finally {
      setBusy(null);
    }
  }

  async function discard() {
    setBusy("discard");
    try {
      onChange((await api<{ action: AiAction }>(`/api/ai/actions/${action.id}/cancel`, { method: "POST" })).action);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (action.status === "done") {
    const c = action.result?.counts ?? {};
    return (
      <Modal title="Mark class attendance" onClose={onClose}>
        <div className="space-y-4 p-5 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-success-soft text-success motion-safe:animate-pop">
            <Icon d="M5 12l5 5L20 7" className="size-6" />
          </span>
          <div>
            <p className="text-lg font-semibold">Attendance saved for Class {action.query}</p>
            <p className="text-sm text-muted">
              {prettyDate(action.params.date)} · {c.present ?? 0} present · {c.absent ?? 0} absent
              {c.late ? ` · ${c.late} late` : ""}
              {c.leave ? ` · ${c.leave} on leave` : ""}
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Link href="/app/attendance" onClick={onNavigate} className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-surface-muted">
              Open attendance
            </Link>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Class ${action.query} attendance?`} onClose={onClose} size="lg">
      <div className="space-y-3 border-b border-border px-5 py-3">
        {error && <Alert>{error}</Alert>}
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" max={today()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-9 w-auto" aria-label="Date" />
          <span className="flex-1" />
          <span className="text-xs text-muted">Set everyone:</span>
          {STATUSES.slice(0, 2).map((st) => (
            <button key={st} type="button" onClick={() => setMarks(Object.fromEntries(entries.map((e) => [e.studentId, st])))} className="rounded-full border border-border px-2.5 py-0.5 text-xs hover:border-accent/40">
              {cap(st)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {STATUSES.map((st) => (
            <div key={st} className="rounded-xl bg-surface-muted px-2 py-1.5">
              <p className="text-lg font-semibold tabular-nums">{counts[st]}</p>
              <p className="text-[11px] capitalize text-muted">{st === "leave" ? "On leave" : st}</p>
            </div>
          ))}
        </div>
        {(p.unmatched?.length ?? 0) > 0 && (
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs">
            <span className="font-semibold">Not found in this class:</span> {p.unmatched!.join(", ")}. Set them below if they&apos;re listed under another name.
          </p>
        )}
        {(p.ambiguous?.length ?? 0) > 0 && (
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs">
            <span className="font-semibold">Several students match</span> {p.ambiguous!.map((a) => `“${a.query}” (${a.status})`).join(", ")}. They&apos;re highlighted: set the right one.
          </p>
        )}
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {entries.map((e) => {
          const flag = flagged.get(e.studentId);
          const m = marks[e.studentId];
          return (
            <li key={e.studentId} className={cx("flex items-center gap-3 px-5 py-2", flag && "bg-warning-soft/60")}>
              <span className="w-7 shrink-0 text-right text-xs tabular-nums text-muted">{e.rollNo}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.name}</p>
                {(flag || (e.was && e.was !== m)) && (
                  <p className="truncate text-[11px] text-muted">
                    {flag ? `Matches “${flag.query}” (${flag.status})` : ""}
                    {flag && e.was && e.was !== m ? " · " : ""}
                    {e.was && e.was !== m ? `was ${e.was}` : ""}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1" role="group" aria-label={`${e.name} attendance`}>
                {STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setMarks((x) => ({ ...x, [e.studentId]: st }))}
                    aria-pressed={m === st}
                    title={cap(st)}
                    className={cx("h-7 min-w-8 rounded-lg px-1.5 text-xs font-semibold transition-colors", m === st ? STATUS_LOOK[st].on : "bg-surface-muted text-muted hover:text-foreground")}
                  >
                    {STATUS_LOOK[st].short}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
        <Button variant="ghost" size="sm" onClick={discard} loading={busy === "discard"} disabled={busy !== null}>
          Discard
        </Button>
        <Button onClick={confirm} loading={busy === "confirm"} disabled={busy !== null}>
          Save attendance for {entries.length}
        </Button>
      </div>
    </Modal>
  );
}
