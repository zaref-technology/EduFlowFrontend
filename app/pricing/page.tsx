import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { ICONS, Icon } from "@/components/ui";
import { SITE, SITE_URL } from "@/lib/site";
import { PricingSection } from "../_components/pricing-section";

const TRIAL_DAYS = 7;

export const metadata: Metadata = {
  title: "Pricing",
  description: `EduFlow plans for schools, tuition centres and coaching institutes. Pay monthly, or yearly and save, with UPI, card or netbanking. ${TRIAL_DAYS}-day free trial, no credit card.`,
  alternates: { canonical: "/pricing" },
  openGraph: { type: "website", url: "/pricing", siteName: SITE.name, title: "EduFlow pricing", locale: "en_IN" },
};

// Questions about paying (every answer matches how billing works in the app)
const BILLING_FAQ = [
  { q: "Can we try EduFlow before paying?", a: `Yes. Every school starts with a ${TRIAL_DAYS}-day free trial with no credit card. Choose a plan any time from Settings → Plan & billing; everything you added during the trial stays.` },
  { q: "How do we pay?", a: "Online, from Settings → Plan & billing in the app: UPI, debit or credit card, or netbanking, through Razorpay. Your plan is extended the moment the payment goes through, and it appears in your payment history." },
  { q: "Monthly or yearly?", a: "Either. Paying for a year costs less than twelve monthly payments; the yearly price shows how much you save." },
  { q: "What happens when we renew?", a: "Renewing the same plan adds the new period after your current one ends, so you never lose paid days." },
  { q: "Can we change plans?", a: "Yes, any time from Plan & billing. The new plan starts the day you pay for it." },
  { q: "What if our plan runs out?", a: "You get a few days' grace to renew. After that the app becomes read-only: you can still see everything, nothing is deleted, and renewing unlocks it straight away." },
  { q: "Is the price per student?", a: "No, prices are per school. Each plan includes up to a number of students, shown on the plan." },
];

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  url: `${SITE_URL}/pricing`,
  mainEntity: BILLING_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

export default function PricingPage() {
  return (
    <div className="landing flex min-h-dvh flex-1 flex-col bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }} />
      <SiteNav />
      <main className="flex-1 overflow-x-clip">
        <section className="relative px-4 pb-28 pt-20 sm:px-6 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">Pricing</p>
            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.05em] text-balance sm:text-7xl sm:leading-[1.02]">
              Simple pricing. <span className="text-glow">Every school.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-pretty text-muted sm:text-xl">
              One price per school, whatever your size. Start free for {TRIAL_DAYS} days, then pay monthly or yearly with UPI, card or netbanking.
            </p>
          </div>
          <div className="mt-14">
            <PricingSection trialDays={TRIAL_DAYS} compare />
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-28 sm:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Questions about paying</h2>
          <div className="mt-10 divide-y divide-foreground/[0.07] rounded-[28px] border border-foreground/[0.08] bg-foreground/[0.035]">
            {BILLING_FAQ.map((f) => (
              <details key={f.q} className="group px-6 py-5 sm:px-7">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-muted transition-transform group-open:rotate-45">
                    <Icon d={ICONS.plus} className="size-3.5" />
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-pretty text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-t border-foreground/[0.06]">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-24 text-center sm:px-6">
            <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.045em] text-balance sm:text-5xl">
              Try it free for {TRIAL_DAYS} days. <span className="text-glow">No card needed.</span>
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-base font-semibold text-background transition-[background-color,transform] hover:bg-foreground/85 active:scale-[0.97]">
                Start your free trial
                <Icon d="M5 12h14M13 6l6 6-6 6" />
              </Link>
              <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-full border border-foreground/15 px-7 text-base font-medium transition-[background-color,transform] hover:bg-foreground/[0.06] active:scale-[0.97]">
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
