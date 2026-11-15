"use client";

import { useState } from "react";
import { refreshTenantStatus, supportLink, useTenantStatus } from "@/components/plan-banner";
import { CycleSwitch, PlanCards } from "@/components/pricing";
import { errorMessage, useResource } from "@/components/data";
import { Alert, Badge, Button, Icon, Skeleton, buttonClass, cx } from "@/components/ui";
import { WA_ICON } from "@/components/whatsapp-send";
import { api } from "@/lib/api";
import { payForPlan, type BillingOverview, type Cycle, type OfferedPlan } from "@/lib/billing";
import { MODE_LABEL, formatMoney, type PaymentMode } from "@/lib/fees";
import { FEATURE_LABEL, STATUS_META, endsText, type Feature } from "@/lib/platform";
import { SettingsCard } from "./card";

const CHECK = "M5 12l5 5L20 7";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** The school's EduFlow plan: what it includes, when it ends, and paying to renew or upgrade (Razorpay). */
export function BillingSettings() {
  const status = useTenantStatus();
  const res = useResource(() => api<BillingOverview>("/api/billing"), "billing");
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const data = res.data;
  if (!data || !status) return res.error ? <Alert>{res.error}</Alert> : <Skeleton className="h-72 rounded-2xl" />;

  const sub = data.subscription;
  const meta = STATUS_META[sub.status];
  const endsOn = sub.status === "trial" ? sub.trialEndsAt : sub.currentPeriodEnd;
  const ask = (text: string) => supportLink(status, text);
  // Yearly first: it's what most schools pick (and it's cheaper); a paying school sees its own cycle
  const shown = cycle ?? (sub.status === "active" || sub.status === "overdue" ? sub.cycle : "yearly");
  const renewing = sub.status === "active" || sub.status === "overdue" || sub.status === "expired";

  async function pay(p: OfferedPlan) {
    // Switching plans starts the new one today: say so when paid time on the current plan would be lost
    // ("active" means the paid period hasn't ended yet)
    if (p.id !== sub.planId && sub.status === "active" && sub.currentPeriodEnd) {
      const ok = confirm(`Your ${sub.planName} plan is paid until ${day(sub.currentPeriodEnd!)}. Switching starts ${p.name} today and ends ${sub.planName} now; the unused time isn't refunded. Continue?`);
      if (!ok) return;
    }
    setPaying(p.id);
    setMessage(null);
    try {
      const next = await payForPlan(p.id, shown);
      if (next) {
        res.setData(next);
        refreshTenantStatus();
        const until = next.subscription.currentPeriodEnd;
        setMessage({ tone: "success", text: `Payment received, thank you! You're on ${p.name}${until ? ` until ${day(until)}` : ""}.` });
      }
    } catch (err) {
      setMessage({ tone: "danger", text: errorMessage(err) });
    } finally {
      setPaying(null);
    }
  }

  const action = (p: OfferedPlan) => {
    const current = p.id === sub.planId && sub.status !== "trial" && sub.status !== "none";
    const price = shown === "yearly" ? p.priceYearly : p.priceMonthly;
    const label = current ? (renewing ? `Renew · ${formatMoney(price)}` : `Pay ${formatMoney(price)}`) : sub.status === "trial" || sub.status === "none" ? `Get ${p.name} · ${formatMoney(price)}` : `Switch to ${p.name} · ${formatMoney(price)}`;
    if (!data.onlinePayments) {
      return (
        <a href={ask(`Hi, we'd like the EduFlow ${p.name} plan (${shown}).`)} target="_blank" rel="noopener noreferrer" className={cx(buttonClass(p.popular ? "primary" : "secondary"), "w-full")}>
          <Icon d={WA_ICON} />
          {current ? "Renew with support" : `Get ${p.name}`}
        </a>
      );
    }
    return (
      <Button variant={p.popular ? "primary" : "secondary"} className="w-full" onClick={() => pay(p)} loading={paying === p.id} disabled={paying !== null || !price}>
        {label}
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      <SettingsCard title="Your plan" description="What your school's EduFlow subscription includes.">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-semibold tracking-tight">{sub.planName ?? (sub.status === "none" ? "Full access" : "No plan")}</p>
              <Badge tone={meta.tone}>{sub.status === "none" ? "Free" : meta.label}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              {sub.status === "none" ? "Your school has full access with no end date." : `${endsText(sub)}${endsOn ? ` · ${sub.status === "trial" ? "trial ends" : "renews"} ${day(endsOn)}` : ""}`}
              {sub.status === "active" && ` · billed ${sub.cycle}`}
            </p>
          </div>
          {!data.onlinePayments && (
            <a href={ask(sub.status === "trial" ? "Hi, we'd like to start a paid EduFlow plan." : "Hi, I'd like to renew our EduFlow plan.")} target="_blank" rel="noopener noreferrer" className={buttonClass("primary")}>
              <Icon d={WA_ICON} />
              {sub.status === "active" || sub.status === "none" ? "Contact support" : sub.status === "trial" ? "Choose a plan" : "Renew now"}
            </a>
          )}
        </div>
        {sub.readOnly && (
          <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm">
            Your school is read-only: everything can be viewed, but nothing can be added or changed until the plan is renewed.{data.onlinePayments && sub.status === "expired" ? " Renew below to continue straight away." : ""}
          </p>
        )}
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-surface-muted px-4 py-3">
            <dt className="text-xs text-muted">Students</dt>
            <dd className="mt-0.5 font-medium">{sub.studentLimit ? `Up to ${sub.studentLimit.toLocaleString("en-IN")} active students` : "Unlimited"}</dd>
          </div>
          <div className="rounded-xl bg-surface-muted px-4 py-3">
            <dt className="text-xs text-muted">Features</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {(Object.keys(FEATURE_LABEL) as Feature[]).map((f) => (
                <span key={f} className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs", sub.features[f] ? "bg-success-soft text-success" : "bg-surface text-muted line-through")}>
                  {sub.features[f] && <Icon d={CHECK} className="size-3" />}
                  {FEATURE_LABEL[f]}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </SettingsCard>

      {data.plans.length > 0 && (
        <SettingsCard
          title={renewing ? "Renew or change plan" : "Choose a plan"}
          description={data.onlinePayments ? "Pay securely with UPI, card or netbanking through Razorpay. Your plan is extended the moment the payment goes through." : "Prices per school. Payments go through EduFlow support for now."}
          action={<CycleSwitch cycle={shown} onChange={setCycle} plans={data.plans} />}
        >
          {message && <Alert tone={message.tone}>{message.text}</Alert>}
          <PlanCards plans={data.plans} cycle={shown} currentPlanId={sub.status === "trial" || sub.status === "none" ? null : sub.planId} action={action} />
          {data.onlinePayments && <p className="text-xs text-muted">Renewing your plan adds the time after your current period ends. Switching to another plan starts it today.</p>}
          {status.support.email && (
            <p className="text-sm text-muted">
              Questions? Email{" "}
              <a href={`mailto:${status.support.email}`} className="text-accent hover:underline">
                {status.support.email}
              </a>
            </p>
          )}
        </SettingsCard>
      )}

      {data.payments.length > 0 && (
        <SettingsCard title="Payment history" description="What your school has paid for EduFlow.">
          <ul className="divide-y divide-border">
            {data.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium">
                    {p.planName} · {p.cycle === "yearly" ? `${p.periods > 1 ? `${p.periods} years` : "1 year"}` : `${p.periods > 1 ? `${p.periods} months` : "1 month"}`}
                  </p>
                  <p className="text-xs text-muted">
                    {day(p.paidAt)} · {p.method === "razorpay" ? "Paid online" : (MODE_LABEL[p.method as PaymentMode] ?? p.method)}
                    {p.reference && ` · ${p.reference}`} · covers {day(p.periodStart)} – {day(p.periodEnd)}
                  </p>
                </div>
                <span className="font-semibold tabular-nums">{formatMoney(p.amount)}</span>
              </li>
            ))}
          </ul>
        </SettingsCard>
      )}
    </div>
  );
}
