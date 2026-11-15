"use client";

// The plans side by side, with a Monthly / Yearly switch: used on the website and in Plan & billing.
import type { ReactNode } from "react";
import { Icon, cx } from "@/components/ui";
import { yearlySaving, type Cycle, type OfferedPlan } from "@/lib/billing";
import { formatMoney } from "@/lib/fees";
import { FEATURE_LABEL, type Feature } from "@/lib/platform";

const CHECK = "M5 12l5 5L20 7";
const CROSS = "M6 6l12 12M18 6L6 18";
const SPARK = "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z";

/** The best yearly saving among the plans, as a percentage ("Save 17%"). */
export function bestSavingPercent(plans: OfferedPlan[]) {
  return plans.reduce((m, p) => Math.max(m, yearlySaving(p)?.percent ?? 0), 0);
}

export function CycleSwitch({ cycle, onChange, plans }: { cycle: Cycle; onChange: (c: Cycle) => void; plans: OfferedPlan[] }) {
  const percent = bestSavingPercent(plans);
  return (
    <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-full bg-surface-muted p-1 text-sm">
      {(["monthly", "yearly"] as const).map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={cycle === c}
          onClick={() => onChange(c)}
          className={cx("flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition-all", cycle === c ? "bg-surface text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.12)]" : "text-muted hover:text-foreground")}
        >
          {c === "monthly" ? "Monthly" : "Yearly"}
          {c === "yearly" && percent > 0 && <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">Save {percent}%</span>}
        </button>
      ))}
    </div>
  );
}

/** One card per plan. `action` renders the button for a plan (trial link, pay, current…). */
export function PlanCards({ plans, cycle, currentPlanId, action }: { plans: OfferedPlan[]; cycle: Cycle; currentPlanId?: string | null; action: (p: OfferedPlan) => ReactNode }) {
  return (
    <div className={cx("grid gap-5", plans.length > 1 && "md:grid-cols-2")}>
      {plans.map((p) => {
        const yearly = cycle === "yearly" && p.priceYearly > 0;
        // A year's price per month, to the rupee
        const perMonth = yearly ? Math.round(p.priceYearly / 12 / 100) * 100 : p.priceMonthly;
        const saving = yearlySaving(p);
        const current = p.id === currentPlanId;
        return (
          <div
            key={p.id}
            className={cx(
              "relative flex flex-col rounded-[28px] border bg-surface p-7",
              p.popular ? "border-accent shadow-[0_24px_60px_-28px_color-mix(in_oklab,var(--accent)_55%,transparent)] ring-1 ring-accent" : "border-border"
            )}
          >
            {p.popular && <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Most popular</span>}
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-semibold tracking-[-0.02em]">{p.name}</h3>
              {current && <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">Your plan</span>}
            </div>
            {p.description && <p className="mt-1.5 text-sm text-pretty text-muted">{p.description}</p>}
            <p className="mt-6 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-[-0.04em] tabular-nums">{formatMoney(perMonth)}</span>
              <span className="text-sm text-muted">/ month</span>
            </p>
            <p className="mt-1 h-5 text-sm text-muted">
              {yearly ? (
                <>
                  {formatMoney(p.priceYearly)} billed yearly
                  {saving && (
                    <span className="font-medium text-success">
                      {" "}
                      · save {formatMoney(saving.amount)} ({saving.percent}% off)
                    </span>
                  )}
                </>
              ) : (
                "Billed monthly"
              )}
            </p>
            <div className="mt-6">{action(p)}</div>
            {p.highlights.length > 0 && (
              <ul className="mt-7 space-y-2.5">
                {p.highlights.map((h) => (
                  <li key={h} className="flex gap-2.5 text-sm font-medium">
                    <Icon d={SPARK} className="mt-0.5 size-4 shrink-0 text-accent" />
                    {h}
                  </li>
                ))}
              </ul>
            )}
            <ul className={cx("space-y-2 border-t border-border pt-5 text-sm", p.highlights.length ? "mt-6" : "mt-7")}>
              <li className="flex gap-2.5">
                <Icon d={CHECK} className="mt-0.5 size-4 shrink-0 text-success" />
                {p.studentLimit ? `Up to ${p.studentLimit.toLocaleString("en-IN")} students` : "Unlimited students"}
              </li>
              <li className="flex gap-2.5">
                <Icon d={CHECK} className="mt-0.5 size-4 shrink-0 text-success" />
                Fees, attendance, tests, report cards and WhatsApp messages
              </li>
              {/* What the plan includes first; what it doesn't, at the end */}
              {(Object.keys(FEATURE_LABEL) as Feature[]).sort((a, b) => Number(p.features[b]) - Number(p.features[a])).map((f) => (
                <li key={f} className={cx("flex gap-2.5", !p.features[f] && "text-muted")}>
                  <Icon d={p.features[f] ? CHECK : CROSS} className={cx("mt-0.5 size-4 shrink-0", p.features[f] ? "text-success" : "text-muted/60")} />
                  <span className={cx(!p.features[f] && "line-through decoration-muted/40")}>{FEATURE_LABEL[f]}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** Every plan side by side, row by row (the pricing page). */
export function PlanComparison({ plans }: { plans: OfferedPlan[] }) {
  const yes = <Icon d={CHECK} className="mx-auto size-5 text-success" />;
  const no = <span className="mx-auto block h-px w-4 bg-muted/50" aria-label="Not included" />;
  const rows: { label: string; cell: (p: OfferedPlan) => ReactNode }[] = [
    { label: "Price, paid monthly", cell: (p) => (p.priceMonthly ? `${formatMoney(p.priceMonthly)} / month` : "—") },
    { label: "Price, paid yearly", cell: (p) => (p.priceYearly ? `${formatMoney(p.priceYearly)} / year` : "—") },
    { label: "Students", cell: (p) => (p.studentLimit ? `Up to ${p.studentLimit.toLocaleString("en-IN")}` : "Unlimited") },
    { label: "Fees, receipts & reminders", cell: () => yes },
    { label: "Attendance, also offline", cell: () => yes },
    { label: "Tests, report cards & ranks", cell: () => yes },
    { label: "WhatsApp messages (click to send)", cell: () => yes },
    ...(Object.keys(FEATURE_LABEL) as Feature[]).map((f) => ({ label: FEATURE_LABEL[f], cell: (p: OfferedPlan) => (p.features[f] ? yes : no) })),
  ];
  return (
    <div className="overflow-x-auto rounded-[28px] border border-border bg-surface">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="w-2/5 px-6 py-5 text-left font-medium text-muted">Plan</th>
            {plans.map((p) => (
              <th key={p.id} className="px-4 py-5 text-center">
                <span className="block text-base font-semibold tracking-tight">{p.name}</span>
                {p.popular && <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground">Most popular</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="px-6 py-3.5">{r.label}</td>
              {plans.map((p) => (
                <td key={p.id} className={cx("px-4 py-3.5 text-center tabular-nums", p.popular && "bg-accent-soft/40")}>
                  {r.cell(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
