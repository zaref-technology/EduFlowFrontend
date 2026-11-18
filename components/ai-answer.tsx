"use client";

// How "Ask Zia" answers are shown: a small, safe markdown renderer (paragraphs, lists,
// tables, **bold**, `code`, links into the app only; never HTML), tables with an
// expanded view (search, sort, CSV), and a quick look at a student without leaving the chat.
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, ICONS, Icon, Skeleton, buttonClass, cx } from "./ui";
import { errorMessage, useEscapeLayer } from "./data";
import { WA_ICON, WhatsAppButton } from "./whatsapp-send";
import { WRITE_LANGUAGES, readChatLanguage, refreshAiStatus, type WriteLanguage } from "@/lib/ai";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { MessageRef, MessageType } from "@/lib/whatsapp";
import type { Ledger } from "@/lib/fees";
import { formatMoney } from "@/lib/fees";
import type { Student } from "@/lib/students";

const EXPAND_ICON = "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5";
const STUDENT_EVENT = "eduflow:ask-student";
const WHATSAPP_EVENT = "eduflow:ask-whatsapp";

export interface WhatsAppRequest {
  type: MessageType;
  refs: MessageRef[];
  title: string;
}

/** Asks the chat panel to open the WhatsApp sender (fee reminder, receipt…). */
export const requestWhatsApp = (r: WhatsAppRequest) => window.dispatchEvent(new CustomEvent(WHATSAPP_EVENT, { detail: r }));

/** The chat panel opens the WhatsApp sender for standard messages (fee reminder…). */
export function useWhatsAppRequests(onRequest: (r: WhatsAppRequest) => void) {
  useEffect(() => {
    const h = (e: Event) => onRequest((e as CustomEvent<WhatsAppRequest>).detail);
    window.addEventListener(WHATSAPP_EVENT, h);
    return () => window.removeEventListener(WHATSAPP_EVENT, h);
  }, [onRequest]);
}

/** Opens the student quick view (the chat panel listens). */
const openStudent = (id: string) => window.dispatchEvent(new CustomEvent(STUDENT_EVENT, { detail: id }));

/** The chat panel shows the quick view for whichever student is clicked. */
export function useStudentClicks(onStudent: (id: string) => void) {
  useEffect(() => {
    const h = (e: Event) => onStudent((e as CustomEvent<string>).detail);
    window.addEventListener(STUDENT_EVENT, h);
    return () => window.removeEventListener(STUDENT_EVENT, h);
  }, [onStudent]);
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

const LINK = /^\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)$/;
const STUDENT_LINK = /^\/app\/(?:students|fees)\?student=([a-f\d]{24})$/i;

/** Cell text without markdown, for search, sorting and CSV. */
const plain = (s: string) => s.replace(/\[([^\]]+)\]\((?:[^()\s]|\([^()\s]*\))+\)/g, "$1").replace(/\*\*|`/g, "").trim();

function inline(text: string, onLink: () => void): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((?:[^()\s]|\([^()\s]*\))+\))/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={i} className="break-all rounded bg-surface-muted px-1 text-[0.85em]">{part.slice(1, -1)}</code>;
    const link = part.match(LINK);
    if (link) {
      const student = link[2].match(STUDENT_LINK);
      if (student) {
        return (
          <button key={i} type="button" onClick={() => openStudent(student[1])} className="text-left font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
            {link[1]}
          </button>
        );
      }
      return link[2].startsWith("/app/") ? (
        <Link key={i} href={link[2]} onClick={onLink} className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent">
          {link[1]}
        </Link>
      ) : (
        <Fragment key={i}>{link[1]}</Fragment>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function Markdown({ text, onLink = () => {} }: { text: string; onLink?: () => void }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(<ChatTable key={blocks.length} head={head} rows={body} onLink={onLink} />);
      continue;
    }
    const bullet = /^\s*[-*•]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ""));
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={blocks.length} className={cx("space-y-1 pl-5", ordered ? "list-decimal" : "list-disc")}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, onLink)}</li>
          ))}
        </List>
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith("|") && !bullet.test(lines[i]) && !numbered.test(lines[i])) para.push(lines[i++]);
    blocks.push(
      <p key={blocks.length}>
        {para.map((p, j) => {
          const heading = p.match(/^#{1,6}\s+(.*)$/);
          return (
            <Fragment key={j}>
              {j > 0 && <br />}
              {heading ? <strong>{inline(heading[1], onLink)}</strong> : inline(p, onLink)}
            </Fragment>
          );
        })}
      </p>
    );
  }
  return <div className="space-y-3 break-words">{blocks}</div>;
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

const PREVIEW_ROWS = 6;
const NUMBERISH = /^[-+]?(₹\s?)?[\d,]+(\.\d+)?\s?%?$/;
const numberOf = (s: string) => Number(plain(s).replace(/[₹,%\s]/g, ""));
/** Columns whose values are all numbers, amounts or percentages (blanks allowed). */
function numericColumns(head: string[], rows: string[][]) {
  return head.map((_, j) => {
    const vals = rows.map((r) => plain(r[j] ?? "")).filter((v) => v && v !== "—" && v !== "-");
    return vals.length > 0 && vals.every((v) => NUMBERISH.test(v));
  });
}

function Cells({ row, numeric, onLink, cols }: { row: string[]; numeric: boolean[]; onLink: () => void; cols: number }) {
  return (
    <>
      {Array.from({ length: cols }, (_, j) => (
        <td key={j} className={cx("px-3 py-2 align-top", numeric[j] && "whitespace-nowrap text-right tabular-nums")}>
          {inline(row[j] ?? "", onLink)}
        </td>
      ))}
    </>
  );
}

/** The students a table links to (in row order), for "Message parents". */
function studentsOf(rows: string[][]) {
  const seen = new Map<string, string>();
  for (const r of rows) {
    for (const c of r) {
      const m = [...c.matchAll(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g)].map((x) => [x[1], x[2].match(STUDENT_LINK)?.[1]] as const).find(([, id]) => id);
      if (m) {
        if (!seen.has(m[1]!)) seen.set(m[1]!, m[0]);
        break;
      }
    }
  }
  return [...seen].map(([id, name]) => ({ id, name }));
}

/** What the table is about, from its column names: the message to suggest. */
function suggestFor(head: string[]): Purpose {
  const h = head.join(" ").toLowerCase();
  // English, Hindi and Marathi column names
  if (/balance|due|overdue|fee|paid|amount|फीस|फी|शुल्क|बकाया|बाकी|थकबाकी|रक्कम|राशि/.test(h)) return "fees";
  if (/mark|score|rank|result|grade|test|अंक|गुण|परिणाम|निकाल|परीक्षा|रैंक|रँक/.test(h)) return "progress";
  if (/attend|absent|present|हाजिरी|उपस्थिति|उपस्थिती|हजेरी|अनुपस्थित|गैरहजर/.test(h)) return "attendance";
  return "custom";
}

function ChatTable({ head, rows, onLink }: { head: string[]; rows: string[][]; onLink: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [sharing, setSharing] = useState(false);
  const numeric = useMemo(() => numericColumns(head, rows), [head, rows]);
  const students = useMemo(() => studentsOf(rows), [rows]);
  const shown = rows.slice(0, PREVIEW_ROWS);
  const shareButton = students.length > 0 && (
    <button type="button" onClick={() => setSharing(true)} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-[#128c4a] hover:bg-success-soft dark:text-[#3fcf80]">
      <Icon d={WA_ICON} className="size-3.5" />
      Message parents
    </button>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-muted/60 px-3 py-1.5">
        <span className="text-xs text-muted">
          {rows.length} row{rows.length === 1 ? "" : "s"}
        </span>
        <span className="ml-auto" />
        {shareButton}
        <button type="button" onClick={() => setExpanded(true)} className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-accent hover:bg-accent-soft">
          <Icon d={EXPAND_ICON} className="size-3.5" />
          Expand
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="text-xs text-muted">
            <tr>
              {head.map((c, j) => (
                <th key={j} className={cx("whitespace-nowrap px-3 py-2 font-medium", numeric[j] && "text-right")}>
                  {plain(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, k) => (
              <tr key={k} className="border-t border-border">
                <Cells row={r} numeric={numeric} onLink={onLink} cols={head.length} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > PREVIEW_ROWS && (
        <button type="button" onClick={() => setExpanded(true)} className="w-full border-t border-border py-2 text-xs font-medium text-accent hover:bg-accent-soft">
          Show all {rows.length} rows
        </button>
      )}
      {expanded && <TableModal head={head} rows={rows} numeric={numeric} onLink={onLink} onClose={() => setExpanded(false)} onShare={students.length ? () => setSharing(true) : undefined} />}
      {sharing && (
        <ShareModal
          students={students}
          suggested={suggestFor(head)}
          onClose={() => setSharing(false)}
          onStandard={(req) => {
            setSharing(false);
            setExpanded(false);
            window.dispatchEvent(new CustomEvent(WHATSAPP_EVENT, { detail: req }));
          }}
        />
      )}
    </div>
  );
}

function TableModal({ head, rows, numeric, onLink, onClose, onShare }: { head: string[]; rows: string[][]; numeric: boolean[]; onLink: () => void; onClose: () => void; onShare?: () => void }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);

  const view = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term ? rows.filter((r) => r.map(plain).join(" ").toLowerCase().includes(term)) : [...rows];
    if (sort) {
      const { col, dir } = sort;
      list.sort((a, b) => {
        if (numeric[col]) return ((numberOf(a[col] ?? "") || 0) - (numberOf(b[col] ?? "") || 0)) * dir;
        return plain(a[col] ?? "").localeCompare(plain(b[col] ?? ""), "en", { numeric: true }) * dir;
      });
    }
    return list;
  }, [rows, q, sort, numeric]);

  function download() {
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv = [head, ...view].map((r) => head.map((_, j) => esc(plain(r[j] ?? ""))).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `eduflow-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal title={`${rows.length} row${rows.length === 1 ? "" : "s"}`} onClose={onClose} size="xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
        <div className="relative min-w-0 flex-1">
          <Icon d={ICONS.search} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search the table" className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-accent" />
        </div>
        <Button variant="secondary" size="sm" onClick={download}>
          <Icon d={ICONS.download} />
          CSV
        </Button>
        {onShare && (
          <WhatsAppButton size="sm" onClick={onShare}>
            Message parents
          </WhatsAppButton>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-surface-muted text-xs text-muted shadow-[0_1px_0_var(--border)]">
            <tr>
              <th className="w-10 px-3 py-2.5 text-right font-medium">#</th>
              {head.map((c, j) => (
                <th key={j} className={cx("whitespace-nowrap font-medium", numeric[j] && "text-right")}>
                  <button
                    type="button"
                    onClick={() => setSort((s) => (s?.col === j ? (s.dir === 1 ? { col: j, dir: -1 } : null) : { col: j, dir: numeric[j] ? -1 : 1 }))}
                    className={cx("inline-flex w-full items-center gap-1 px-3 py-2.5 hover:text-foreground", numeric[j] && "justify-end", sort?.col === j && "text-foreground")}
                  >
                    {plain(c)}
                    <span aria-hidden className={cx("text-[10px]", sort?.col !== j && "opacity-0")}>
                      {sort?.col === j && sort.dir === 1 ? "▲" : "▼"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((r, k) => (
              <tr key={k} className="border-t border-border hover:bg-surface-muted/50">
                <td className="px-3 py-2 text-right text-xs tabular-nums text-muted">{k + 1}</td>
                <Cells row={r} numeric={numeric} onLink={onLink} cols={head.length} />
              </tr>
            ))}
          </tbody>
        </table>
        {view.length === 0 && <p className="py-10 text-center text-sm text-muted">Nothing matches &ldquo;{q}&rdquo;.</p>}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Modal (above the chat panel; Escape closes only the top one)
// ---------------------------------------------------------------------------

export function Modal({ title, onClose, children, size = "md" }: { title: ReactNode; onClose: () => void; children: ReactNode; size?: "md" | "lg" | "xl" }) {
  useEscapeLayer(onClose);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
      <button aria-label="Close" className="absolute inset-0 bg-black/50 motion-safe:animate-fade-in" onClick={onClose} />
      <div
        className={cx(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-background shadow-2xl motion-safe:animate-slide-in-up sm:rounded-2xl",
          size === "xl" ? "sm:h-[85dvh] sm:max-w-5xl" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-md"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="min-w-0 flex-1 truncate font-semibold">{title}</div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <Icon d={ICONS.x} />
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Student quick view
// ---------------------------------------------------------------------------

interface History {
  summary: { marked: number; present: number; absent: number; late: number; leave: number; rate: number | null };
}

const TEACHING = ["owner", "admin", "teacher"];
const FEES = ["owner", "admin", "accountant"];

export function StudentQuickView({ id, role, onClose, onAsk, onNavigate }: { id: string; role: string; onClose: () => void; onAsk: (question: string) => void; onNavigate: () => void }) {
  const [sharing, setSharing] = useState(false);
  const [data, setData] = useState<{ student: Student | null; history: History | null; ledger: Ledger | null; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const from = `${today.slice(0, 8)}01`;
    Promise.allSettled([
      api<{ student: Student }>(`/api/students/${id}`),
      TEACHING.includes(role) ? api<History>(`/api/attendance/students/${id}?from=${from}&to=${today}`) : Promise.reject(),
      FEES.includes(role) ? api<Ledger>(`/api/fees/students/${id}`) : Promise.reject(),
    ]).then(([s, h, l]) => {
      if (cancelled) return;
      setData({
        student: s.status === "fulfilled" ? s.value.student : null,
        history: h.status === "fulfilled" ? h.value : null,
        ledger: l.status === "fulfilled" ? l.value : null,
        error: s.status === "rejected" ? "This student couldn't be found." : undefined,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [id, role]);

  const s = data?.student;
  const phone = s?.guardianPhone?.replace(/\D/g, "").slice(-10);
  const rate = data?.history?.summary.rate ?? null;
  const t = data?.ledger?.totals;

  return (
    <Modal title="Student" onClose={onClose}>
      <div className="space-y-5 overflow-y-auto p-5">
        {!data ? (
          <div className="space-y-3">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : !s ? (
          <p className="py-6 text-center text-sm text-muted">{data.error}</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-base font-semibold text-accent">
                {(s.firstName[0] ?? "") + (s.lastName[0] ?? "")}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold leading-tight">{s.fullName}</p>
                <p className="text-sm text-muted">
                  {[s.grade && `Class ${s.section ? `${s.grade}-${s.section}` : s.grade}`, s.rollNo && `Roll ${s.rollNo}`, `Adm. ${s.admissionNo}`].filter(Boolean).join(" · ")}
                </p>
              </div>
              {s.status !== "active" && <span className="ml-auto rounded-full bg-surface-muted px-2 py-0.5 text-xs capitalize text-muted">{s.status}</span>}
            </div>

            {(s.guardianName || phone) && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="text-xs text-muted">Guardian</p>
                  <p className="truncate font-medium">{s.guardianName || "—"}</p>
                </div>
                {phone && (
                  <div className="flex shrink-0 gap-1.5">
                    <a href={`tel:+91${phone}`} className={buttonClass("secondary", "sm")}>
                      <Icon d={ICONS.phone} />
                      Call
                    </a>
                    <a href={`https://wa.me/91${phone}`} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "sm")}>
                      WhatsApp
                    </a>
                  </div>
                )}
              </div>
            )}

            {(data.history || t) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.history && (
                  <div className="rounded-xl border border-border p-3.5">
                    <p className="text-xs text-muted">Attendance this month</p>
                    <p className={cx("mt-0.5 text-2xl font-semibold tabular-nums", rate !== null && rate < 75 ? "text-danger" : "")}>{rate === null ? "—" : `${rate}%`}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                      <div className={cx("h-full rounded-full", rate !== null && rate < 75 ? "bg-danger" : "bg-success")} style={{ width: `${rate ?? 0}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {data.history.summary.present} present · {data.history.summary.absent} absent
                      {data.history.summary.late ? ` · ${data.history.summary.late} late` : ""}
                    </p>
                  </div>
                )}
                {t && (
                  <div className="rounded-xl border border-border p-3.5">
                    <p className="text-xs text-muted">Fees due</p>
                    <p className={cx("mt-0.5 text-2xl font-semibold tabular-nums", t.overdue > 0 && "text-danger")}>{formatMoney(t.balance)}</p>
                    <p className="mt-2 text-xs text-muted">
                      {t.overdue > 0 ? <span className="font-medium text-danger">{formatMoney(t.overdue)} overdue</span> : "Nothing overdue"} · {formatMoney(t.paid)} paid
                      {t.advance ? ` · ${formatMoney(t.advance)} advance` : ""}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {phone && (
                <WhatsAppButton size="sm" onClick={() => setSharing(true)}>
                  Message parent
                </WhatsAppButton>
              )}
              <Button variant="secondary" size="sm" onClick={() => onAsk(`Tell me about ${s.fullName} (${s.admissionNo})`)}>
                Ask about {s.firstName}
              </Button>
              <span className="flex-1" />
              {t && (
                <Link href={`/app/fees?student=${s.id}`} onClick={onNavigate} className={buttonClass("secondary", "sm")}>
                  Fees
                </Link>
              )}
              <Link href={`/app/students?student=${s.id}`} onClick={onNavigate} className={buttonClass("primary", "sm")}>
                Open profile
              </Link>
            </div>
          </>
        )}
      </div>
      {sharing && s && (
        <ShareModal
          students={[{ id: s.id, name: s.fullName }]}
          // What this child's numbers point to: overdue fees, then low attendance, then progress
          suggested={t && t.overdue > 0 ? "fees" : rate !== null && rate < 75 ? "attendance" : TEACHING.includes(role) ? "progress" : "fees"}
          onClose={() => setSharing(false)}
          onStandard={(req) => {
            setSharing(false);
            onClose();
            window.dispatchEvent(new CustomEvent(WHATSAPP_EVENT, { detail: req }));
          }}
        />
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Message parents: a standard WhatsApp message, or a personal one per student written by AI
// ---------------------------------------------------------------------------

type Purpose = "fees" | "attendance" | "progress" | "custom";

const thisMonth = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);

const STANDARD: { purpose: Purpose; type: MessageType; label: string; hint: string; roles: string[]; ref: (id: string) => MessageRef }[] = [
  { purpose: "fees", type: "fee_reminder", label: "Fee reminder", hint: "Amount due and due date, from your fee records", roles: FEES, ref: (studentId) => ({ studentId }) },
  { purpose: "attendance", type: "attendance_summary", label: "Attendance this month", hint: "Days present and absent so far this month", roles: TEACHING, ref: (studentId) => ({ studentId, month: thisMonth() }) },
  { purpose: "progress", type: "progress_report", label: "Progress report this month", hint: "Attendance and test marks this month", roles: TEACHING, ref: (studentId) => ({ studentId, month: thisMonth() }) },
];

const PURPOSE_LABEL: Record<Purpose, string> = { fees: "Fees due", attendance: "Attendance", progress: "Progress", custom: "Something else" };
const PURPOSE_ROLES: Record<Purpose, string[] | null> = { fees: FEES, attendance: TEACHING, progress: TEACHING, custom: null };

interface Drafted {
  studentId: string;
  studentName: string;
  guardianName: string;
  class: string;
  to: string | null;
  text: string;
  skip?: string;
}

const waLink = (to: string, text: string) => `https://wa.me/${to}?text=${encodeURIComponent(text)}`;

export function ShareModal({ students, suggested, onClose, onStandard }: { students: { id: string; name: string }[]; suggested: Purpose; onClose: () => void; onStandard: (r: WhatsAppRequest) => void }) {
  const { session } = useAuth();
  const role = session.status === "authenticated" ? (session.role ?? "") : "";
  const purposes = (Object.keys(PURPOSE_LABEL) as Purpose[]).filter((p) => !PURPOSE_ROLES[p] || PURPOSE_ROLES[p]!.includes(role));
  const [purpose, setPurpose] = useState<Purpose>(purposes.includes(suggested) ? suggested : purposes[0]);
  const [note, setNote] = useState("");
  // Same language as the chat's replies ("Auto" writes English)
  const [language, setLanguage] = useState<WriteLanguage>(() => {
    const l = readChatLanguage();
    return l === "auto" ? "en" : l;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Drafted[] | null>(null);
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const list = students.slice(0, 40);
  const standard = STANDARD.filter((o) => o.roles.includes(role));

  async function write() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ messages: Drafted[] }>("/api/ai/messages", { method: "POST", body: { studentIds: list.map((x) => x.id), purpose, note: note.trim(), language } });
      setDrafts(r.messages);
      setOpened(new Set());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
      refreshAiStatus();
    }
  }

  function open(d: Drafted) {
    if (!d.to) return;
    window.open(waLink(d.to, d.text), "_blank", "noopener,noreferrer");
    setOpened((s) => new Set(s).add(d.studentId));
  }

  const sendable = drafts?.filter((d) => d.to && d.text.trim()) ?? [];
  const next = sendable.find((d) => !opened.has(d.studentId));

  return (
    <Modal title={drafts ? (list.length === 1 ? "Personal message" : "Personal messages") : list.length === 1 ? "Message parent" : "Message parents"} onClose={onClose} size="lg">
      {!drafts ? (
        <div className="space-y-5 overflow-y-auto p-5">
          <p className="text-sm text-muted">
            {list.length === 1 ? (
              <>
                To <span className="font-medium text-foreground">{list[0].name}</span>&apos;s parent.
              </>
            ) : (
              <>
                To the parents of <span className="font-medium text-foreground">{list.length} students</span> in this answer
                {students.length > list.length ? ` (the first 40 of ${students.length})` : ""}.
              </>
            )}
          </p>
          {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm">{error}</p>}

          {standard.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Standard message</h3>
              {standard.map((o) => (
                <button
                  key={o.type}
                  type="button"
                  onClick={() => onStandard({ type: o.type, title: o.label, refs: list.map((x) => o.ref(x.id)) })}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-accent/40 hover:bg-accent-soft"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-success-soft text-[#128c4a] dark:text-[#3fcf80]">
                    <Icon d={WA_ICON} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {o.label}
                      {o.purpose === suggested && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">Suggested</span>}
                    </span>
                    <span className="block text-xs text-muted">{o.hint}</span>
                  </span>
                  <Icon d={ICONS.chevronRight} className="text-muted" />
                </button>
              ))}
            </section>
          )}

          <section className="space-y-3 rounded-xl border border-accent/30 bg-accent-soft/40 p-4">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <Icon d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" className="size-4 text-accent" />
                {list.length === 1 ? "Personal message, written by AI" : "Personal message for each student, by AI"}
              </h3>
              <p className="text-xs text-muted">Written from each child&apos;s own fees, attendance and marks. You can edit every message before sending.</p>
            </div>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="About">
              {purposes.map((p) => (
                <button key={p} type="button" onClick={() => setPurpose(p)} aria-pressed={purpose === p} className={cx("rounded-full border px-3 py-1 text-sm transition-colors", purpose === p ? "border-accent bg-accent text-white" : "border-border bg-surface hover:border-accent/40")}>
                  {PURPOSE_LABEL[p]}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={purpose === "custom" ? "What should the message say? e.g. PTM on Saturday at 10 am" : "Anything to add? (optional) e.g. last date 20 Nov"}
              aria-label="What to say"
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1" role="group" aria-label="Language">
                {WRITE_LANGUAGES.map((l) => (
                  <button key={l.id} type="button" onClick={() => setLanguage(l.id)} aria-pressed={language === l.id} className={cx("rounded-full px-2.5 py-0.5 text-xs transition-colors", language === l.id ? "bg-accent font-medium text-white" : "text-muted hover:bg-surface")}>
                    {l.label}
                  </button>
                ))}
              </div>
              <Button onClick={write} loading={busy} disabled={purpose === "custom" && !note.trim()}>
                {list.length === 1 ? "Write message" : `Write ${list.length} messages`}
              </Button>
            </div>
          </section>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
            <button type="button" onClick={() => setDrafts(null)} className="text-sm font-medium text-muted hover:text-foreground">
              ← Change
            </button>
            <span className="text-sm text-muted">
              {opened.size} of {sendable.length} opened
            </span>
            <span className="flex-1" />
            {next ? (
              <WhatsAppButton size="sm" onClick={() => open(next)}>
                Open next: {next.studentName.split(" ")[0]}
              </WhatsAppButton>
            ) : (
              sendable.length > 0 && <span className="text-sm font-medium text-success">All opened ✓</span>
            )}
          </div>
          <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
            {drafts.map((d, i) => (
              <li key={d.studentId} className={cx("rounded-xl border p-3.5", opened.has(d.studentId) ? "border-success/40 bg-success-soft/40" : "border-border bg-surface")}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {d.studentName} <span className="font-normal text-muted">· {d.class}</span>
                    </p>
                    <p className="text-xs text-muted">
                      {d.guardianName || "Parent"}
                      {d.to ? ` · +${d.to}` : ""}
                    </p>
                  </div>
                  {d.skip ? (
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted">{d.skip}</span>
                  ) : (
                    <WhatsAppButton size="sm" onClick={() => open(d)} disabled={!d.text.trim()}>
                      {opened.has(d.studentId) ? "Opened ✓" : "WhatsApp"}
                    </WhatsAppButton>
                  )}
                </div>
                <textarea
                  value={d.text}
                  onChange={(e) => setDrafts((all) => all!.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                  aria-label={`Message to ${d.studentName}'s parent`}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none field-sizing-content focus:border-accent"
                />
              </li>
            ))}
          </ul>
          <p className="border-t border-border px-5 py-2.5 text-xs text-muted">Each message opens in WhatsApp with the text filled in; press send there. Read it through first.</p>
        </>
      )}
    </Modal>
  );
}
