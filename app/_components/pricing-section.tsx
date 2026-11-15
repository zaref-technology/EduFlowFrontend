"use client";

// Landing page pricing: the plans set in the console, with a Monthly / Yearly switch.
import Link from "next/link";
import { useEffect, useState } from "react";
import { CycleSwitch, PlanCards } from "@/components/pricing";
import { Skeleton, buttonClass, cx } from "@/components/ui";
import { API_URL } from "@/lib/api";
import type { Cycle, OfferedPlan } from "@/lib/billing";

export function PricingSection({ trialDays }: { trialDays: number }) {
  const [plans, setPlans] = useState<OfferedPlan[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [cycle, setCycle] = useState<Cycle>("yearly");

  useEffect(() => {
    let live = true;
    fetch(`${API_URL}/api/public/plans`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { plans: OfferedPlan[] }) => live && setPlans(d.plans))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, []);

  // Without prices the section isn't shown (the free trial below still is)
  if (failed || (plans && !plans.length)) return null;
  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex justify-center">{plans ? <CycleSwitch cycle={cycle} onChange={setCycle} plans={plans} /> : <Skeleton className="h-10 w-60 rounded-full" />}</div>
      <div className="mt-10">
        {plans ? (
          <PlanCards
            plans={plans}
            cycle={cycle}
            action={(p) => (
              <Link href="/register" className={cx(buttonClass(p.popular ? "primary" : "secondary"), "w-full")}>
                Start {trialDays}-day free trial
              </Link>
            )}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <Skeleton className="h-[34rem] rounded-[28px]" />
            <Skeleton className="h-[34rem] rounded-[28px]" />
          </div>
        )}
      </div>
      <p className="mt-6 text-center text-sm text-muted">Prices are per school. Every plan starts with a {trialDays}-day free trial, no credit card needed.</p>
    </div>
  );
}
