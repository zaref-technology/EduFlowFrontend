"use client";

import Link from "next/link";
import { useState } from "react";
import { SPARKLE_ICON, openAsk } from "@/components/ai-chat";
import { errorMessage, formatDate, useResource } from "@/components/data";
import { Alert, Badge, Button, Icon, Skeleton, buttonClass, cx } from "@/components/ui";
import { setAiStatus, useAiStatus, type AiQueryRow, type AiStatus } from "@/lib/ai";
import { api } from "@/lib/api";
import { SettingsCard } from "./card";

const STATE_BADGE = {
  ready: { tone: "success", label: "On" },
  quota: { tone: "danger", label: "Monthly limit reached" },
  off: { tone: "neutral", label: "Off" },
  not_in_plan: { tone: "neutral", label: "Pro plan" },
  unavailable: { tone: "neutral", label: "Unavailable" },
} as const;

const CAN_SEE = [
  ["Owners & admins", "Students, attendance, fees, tests and rankings"],
  ["Teachers", "Students, attendance, tests and rankings of their own classes; no fees"],
  ["Accountants", "Students and fees; no attendance or tests"],
];

/** Owners and admins turn the AI assistant on for the school, and see how it's used. */
export function AiSettings() {
  const status = useAiStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  if (!status) return <Skeleton className="h-72 rounded-2xl" />;
  const on = status.state === "ready" || status.state === "quota";
  const badge = STATE_BADGE[status.state];

  async function toggle(enabled: boolean) {
    setBusy(true);
    setError(null);
    try {
      setAiStatus(await api<AiStatus>("/api/ai/settings", { method: "PUT", body: { enabled } }));
      setAgreed(false);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const { used, quota } = status.usage;
  const pct = quota ? Math.min(100, Math.round((used / quota) * 100)) : 100;

  return (
    <div className="space-y-6">
      <SettingsCard title="Ask Zia" description="An assistant that answers questions about your school's records, and helps write notices and messages." action={<Badge tone={badge.tone}>{badge.label}</Badge>}>
        {error && <Alert>{error}</Alert>}
        {status.state === "unavailable" ? (
          <p className="text-sm text-muted">The AI assistant isn&apos;t available right now. Please check again later.</p>
        ) : status.state === "not_in_plan" ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-surface-muted px-4 py-3.5 text-sm">
            <p>The AI assistant is part of the Pro plan. Upgrade to ask questions like &ldquo;Who has overdue fees in class 8?&rdquo;</p>
            <Link href="/app/settings/billing" className={buttonClass("primary", "sm")}>
              See plans
            </Link>
          </div>
        ) : on ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                Turned on{status.enabledBy?.name ? ` by ${status.enabledBy.name}` : ""}
                {status.enabledBy?.at ? ` on ${formatDate(status.enabledBy.at)}` : ""}. Every staff member can use it from the top bar.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => openAsk()}>
                  <Icon d={SPARKLE_ICON} />
                  Try it
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggle(false)} loading={busy}>
                  Turn off
                </Button>
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-medium">Questions this month</span>
                <span className="tabular-nums text-muted">
                  {used} of {quota}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className={cx("h-full rounded-full", pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-accent")} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted">Questions and drafts both count. The count resets on the 1st of every month.</p>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-2 text-sm">
              <li>• Ask in plain English, Hindi or Marathi: &ldquo;Who was absent in 5-A today?&rdquo;, &ldquo;How much did we collect this week?&rdquo;</li>
              <li>• Get answers with links straight to the student or fee record.</li>
              <li>• Draft notices, homework, WhatsApp messages and fee reminders in a few words.</li>
            </ul>
            <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
              <span>
                I understand that to answer, Zaref Campus sends the question and the records it needs (such as student names, attendance, marks and fee amounts) to Google&apos;s Gemini AI.
                The assistant can only read; it can&apos;t change or send anything.
              </span>
            </label>
            <Button onClick={() => toggle(true)} disabled={!agreed} loading={busy}>
              <Icon d={SPARKLE_ICON} />
              Turn on for my school
            </Button>
          </div>
        )}
      </SettingsCard>

      {status.state !== "unavailable" && (
        <SettingsCard title="Who sees what" description="The assistant only uses what each person can already see in Zaref Campus.">
          <dl className="divide-y divide-border text-sm">
            {CAN_SEE.map(([who, what]) => (
              <div key={who} className="grid gap-1 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[10rem_1fr]">
                <dt className="font-medium">{who}</dt>
                <dd className="text-muted">{what}</dd>
              </div>
            ))}
          </dl>
        </SettingsCard>
      )}

      {(on || status.usage.used > 0) && <RecentQuestions />}
    </div>
  );
}

function RecentQuestions() {
  const { data, error, loading } = useResource(() => api<{ queries: AiQueryRow[] }>("/api/ai/history?limit=50"), "ai-history");
  return (
    <SettingsCard title="Recent questions" description="What your staff asked the assistant (kept for 6 months).">
      {error ? (
        <Alert>{error}</Alert>
      ) : loading && !data ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : !data?.queries.length ? (
        <p className="text-sm text-muted">No questions yet.</p>
      ) : (
        <ul className="-my-2 divide-y divide-border text-sm">
          {data.queries.map((q) => (
            <li key={q.id} className="flex items-start justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className={cx("break-words", !q.ok && "text-muted line-through")}>
                  {q.kind === "write" && <span className="mr-1.5 rounded bg-surface-muted px-1.5 py-0.5 text-[11px] text-muted">Draft</span>}
                  {q.kind === "write" ? q.question.replace(/^\[\w+\]\s*/, "") : q.question}
                </p>
                <p className="text-xs text-muted">{q.by || "Former staff"}</p>
              </div>
              <span className="shrink-0 text-xs text-muted">{formatDate(q.at, true)}</span>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  );
}
