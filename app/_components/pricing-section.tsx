"use client";

// Landing page pricing: the plans set in the console, with a Monthly / Yearly switch.
import Link from "next/link";
import { useEffect, useState } from "react";
import { CycleSwitch, PlanCards, PlanComparison } from "@/components/pricing";
import { Skeleton, buttonClass, cx } from "@/components/ui";
import { API_URL } from "@/lib/api";
import { AFTER_SIGNUP_KEY, type Cycle, type OfferedPlan } from "@/lib/billing";

export function PricingSection({ trialDays, compare = false }: { trialDays: number; compare?: boolean }) {
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
            action={(p) =>
              // The free trial is on one plan; any other plan is chosen right after signing up
              p.trial ? (
                <Link href="/register" className={cx(buttonClass(p.popular ? "primary" : "secondary"), "w-full")}>
                  Start {trialDays}-day free trial
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    onClick={() => {
                      try {
                        sessionStorage.setItem(AFTER_SIGNUP_KEY, "/app/settings/billing");
                      } catch {}
                    }}
                    className={cx(buttonClass(p.popular ? "primary" : "secondary"), "w-full")}
                  >
                    Get {p.name}
                  </Link>
                  <p className="mt-2 text-center text-xs text-muted">Create your school, then pay in a minute</p>
                </>
              )
            }
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <Skeleton className="h-[34rem] rounded-[28px]" />
            <Skeleton className="h-[34rem] rounded-[28px]" />
          </div>
        )}
      </div>
      <p className="mt-6 text-center text-sm text-muted">Prices are per school. Try Zaref Campus free for {trialDays} days, no credit card needed.</p>
      {compare && plans && plans.length > 1 && (
        <div className="mt-24">
          <h2 className="text-center text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Compare plans</h2>
          <div className="mt-10">
            <PlanComparison plans={plans} />
          </div>
        </div>
      )}
    </div>
  );
}
