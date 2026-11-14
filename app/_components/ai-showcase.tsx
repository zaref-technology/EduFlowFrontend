// Landing page: EduFlow AI. A full-width section in the spirit of Apple's product pages
// (big type, a soft multicolour glow, glass panels). Every mock-up shows a feature that exists
// in the product. Server component; motion is CSS only and skipped for reduced motion.
import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import type { ReactNode } from "react";
import { cx } from "@/components/ui";

// A real picture for the slide mock-up (e.g. one made with "Make with AI" in EduFlow), if it's there
const SLIDE_PHOTO = "/images/landing/slide-plants.jpg";

const SPARK = "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z";
// The glow and headline colours: the brand's light navy, green and a warm amber
const GLOW = "conic-gradient(from 180deg at 50% 50%, #8f9be8, #3ddc97, #fbbf24, #f472b6, #8f9be8)";

function Glyph({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("size-4 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

/** A glass card with a title and a small product mock-up underneath. */
function Card({ title, body, children, className }: { title: string; body: string; children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        "ai-reveal group relative flex flex-col overflow-hidden rounded-[28px] border border-foreground/[0.08] bg-foreground/[0.035] p-7 transition-colors duration-500 hover:border-foreground/[0.16] hover:bg-foreground/[0.05]",
        className
      )}
    >
      <h3 className="text-xl font-semibold tracking-[-0.02em] text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-[15px] leading-6 text-pretty text-foreground/55">{body}</p>
      <div aria-hidden className="relative mt-7 flex-1">
        {children}
      </div>
    </div>
  );
}

const Bubble = ({ children, me }: { children: ReactNode; me?: boolean }) => (
  <div className={cx("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6", me ? "ml-auto rounded-br-md bg-[#2b3a8c] text-white" : "rounded-bl-md bg-foreground/[0.07] text-foreground/85")}>
    {children}
  </div>
);

/** The big chat window under the headline, with the glowing edge. */
function ChatHero() {
  const rows = [
    ["Aarav Sharma", "5-A", "₹6,500", "Overdue"],
    ["Zara Khan", "5-A", "₹5,000", "Overdue"],
    ["Vihaan Patel", "5-A", "₹4,500", "Due 20 Nov"],
    ["Ananya Iyer", "5-A", "₹2,500", "Due 20 Nov"],
  ];
  return (
    <div className="ai-reveal relative mx-auto mt-16 max-w-3xl">
      {/* The glow behind the window */}
      <div aria-hidden className="absolute -inset-10 opacity-50 blur-3xl motion-safe:animate-spin-slow" style={{ background: GLOW, borderRadius: "40%" }} />
      <div
        className="relative rounded-[32px] p-px"
        style={{
          background:
            "linear-gradient(140deg, color-mix(in oklab, var(--foreground) 28%, transparent), color-mix(in oklab, var(--foreground) 4%, transparent) 40%, color-mix(in oklab, var(--foreground) 14%, transparent))",
        }}
      >
        <div className="rounded-[31px] bg-surface/95 p-5 backdrop-blur-xl sm:p-7">
          <div className="flex items-center gap-2.5 border-b border-foreground/[0.07] pb-4">
            <span className="grid size-8 place-items-center rounded-xl text-foreground" style={{ background: GLOW }}>
              <Glyph d={SPARK} className="size-4 text-[#0b0d13]" />
            </span>
            <span className="text-sm font-semibold text-foreground">Ask EduFlow</span>
            <span className="ml-auto rounded-full border border-foreground/10 px-2.5 py-0.5 text-[11px] font-medium text-foreground/50">English · हिंदी · मराठी</span>
          </div>
          <div className="space-y-4 pt-5">
            <Bubble me>Who in Class 5-A hasn&apos;t paid fees yet?</Bubble>
            <div className="max-w-[92%] space-y-3">
              <Bubble>
                <strong className="font-semibold text-foreground">4 students</strong> in Class 5-A have <strong className="font-semibold text-foreground">₹18,500</strong> pending. Two are overdue.
              </Bubble>
              <div className="overflow-hidden rounded-2xl border border-foreground/[0.07] text-[13px]">
                {rows.map(([name, cls, amt, status]) => (
                  <div key={name} className="flex items-center gap-3 border-b border-foreground/[0.06] px-4 py-2.5 last:border-0">
                    <span className="grid size-7 place-items-center rounded-full bg-foreground/[0.08] text-[11px] font-semibold text-foreground/80">{name[0]}</span>
                    <span className="min-w-0 flex-1 truncate text-foreground/85">{name}</span>
                    <span className="hidden text-foreground/40 sm:inline">{cls}</span>
                    <span className="w-16 text-right font-medium tabular-nums text-foreground">{amt}</span>
                    <span className={cx("hidden w-24 text-right text-xs sm:inline", status === "Overdue" ? "text-danger" : "text-foreground/45")}>{status}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#128c4a] px-3.5 py-1.5 text-xs font-semibold text-white">
                  <Glyph d="M21 12a9 9 0 01-13.5 7.8L3 21l1.2-4.5A9 9 0 1121 12z" className="size-3.5" />
                  Send reminders on WhatsApp
                </span>
                {["Who paid this week?", "Show Aarav's fees"].map((q) => (
                  <span key={q} className="rounded-full border border-foreground/10 px-3.5 py-1.5 text-xs text-foreground/60">
                    {q}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.04] px-4 py-3">
            <span className="flex-1 text-sm text-foreground/35">Ask about students, fees, attendance…</span>
            <span className="grid size-8 place-items-center rounded-full bg-foreground/[0.08] text-foreground/70">
              <Glyph d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM5 11a7 7 0 0014 0M12 18v3" className="size-4" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionMock() {
  return (
    <div className="space-y-3">
      <Bubble me>Record ₹1,000 fee for Sara, cash</Bubble>
      <div className="rounded-2xl border border-foreground/[0.08] bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-foreground/40">Which Sara?</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            ["Sara Khan", "Class 5-A · Adm 1042", true],
            ["Sara Patel", "Class 6-A · Adm 1107", false],
          ].map(([n, d, on]) => (
            <div key={String(n)} className={cx("rounded-xl border px-3.5 py-2.5", on ? "border-accent bg-accent/10" : "border-foreground/[0.08]")}>
              <p className="text-sm font-medium text-foreground">{n}</p>
              <p className="text-xs text-foreground/45">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-foreground/[0.07] pt-3">
          <span className="text-sm text-foreground/70">
            ₹1,000 · Cash · <span className="text-foreground">Sara Khan</span>
          </span>
          <span className="rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background">Confirm</span>
        </div>
      </div>
    </div>
  );
}

function SummaryMock() {
  const items = [
    ["#3ddc97", "92% present today", "3 classes still to mark"],
    ["#fbbf24", "₹42,300 collected yesterday", "18 receipts"],
    ["#fb7185", "12 students overdue", "₹61,000 pending"],
  ];
  return (
    <div className="rounded-2xl border border-foreground/[0.08] bg-surface p-4">
      <p className="text-sm font-medium text-foreground">Good morning, Mrs. Mehta</p>
      <ul className="mt-3 space-y-2.5">
        {items.map(([c, t, s]) => (
          <li key={t} className="flex items-start gap-3">
            <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: c }} />
            <span className="text-sm">
              <span className="text-foreground/90">{t}</span>
              <span className="block text-xs text-foreground/40">{s}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SlideMock() {
  const hasSlidePhoto = existsSync(path.join(process.cwd(), "public", SLIDE_PHOTO));
  return (
    <div className="relative">
      <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-30px_rgba(143,155,232,0.5)]">
        <div className="grid h-full grid-cols-[1fr_1.1fr] gap-4 p-[6%]">
          <div className="flex flex-col justify-center">
            <p className="text-[clamp(13px,2.2vw,22px)] font-bold tracking-tight text-[#141b3a]">How plants make food</p>
            <span className="mt-2 h-1 w-8 rounded-full bg-[#2b3a8c]" />
            <ul className="mt-3 space-y-1.5 text-[clamp(8px,1.1vw,12px)] text-zinc-600">
              {["Leaves take in sunlight", "Roots bring up water", "Air gives carbon dioxide"].map((b) => (
                <li key={b} className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-sm bg-[#2b3a8c]" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          {hasSlidePhoto ? (
            <div className="relative overflow-hidden rounded-xl">
              <Image src={SLIDE_PHOTO} alt="" fill sizes="(min-width: 768px) 280px, 45vw" className="object-cover" />
            </div>
          ) : (
            /* Until there's a real picture: one sketched with shapes */
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-b from-sky-200 to-sky-50">
              <span className="absolute right-[14%] top-[12%] size-[22%] rounded-full bg-amber-300 shadow-[0_0_30px_10px_rgba(252,211,77,0.6)]" />
              <span className="absolute -bottom-[30%] -left-[10%] h-[70%] w-[80%] rounded-[50%] bg-emerald-400" />
              <span className="absolute -bottom-[35%] right-[-20%] h-[75%] w-[85%] rounded-[50%] bg-emerald-500" />
              <span className="absolute bottom-[22%] left-[38%] h-[30%] w-[5%] rounded-sm bg-amber-800" />
              <span className="absolute bottom-[42%] left-[28%] size-[26%] rounded-full bg-emerald-600" />
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {["PowerPoint", "PDF", "Present", "Share on WhatsApp"].map((x) => (
          <span key={x} className="rounded-full border border-foreground/10 px-3 py-1 text-foreground/60">
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}

function RemarksMock() {
  const r = [
    ["Aarav", "A curious learner with strong Maths. Reading every day will lift his English further."],
    ["Diya", "Consistent and well prepared, with excellent attendance. Keep up the lovely work!"],
  ];
  return (
    <div className="space-y-2.5">
      {r.map(([n, t]) => (
        <div key={n} className="rounded-2xl border border-foreground/[0.08] bg-surface px-4 py-3">
          <p className="text-xs font-semibold text-accent">{n}</p>
          <p className="mt-1 text-[13px] leading-5 text-foreground/75">{t}</p>
        </div>
      ))}
    </div>
  );
}

function LanguagesMock() {
  const m = [
    ["English", "Hello! Aarav's fee of ₹2,500 is due. Kindly pay by 20 November."],
    ["हिंदी", "नमस्ते! आरव की ₹2,500 फीस बाकी है। कृपया 20 नवंबर तक जमा करें।"],
    ["मराठी", "नमस्कार! आरवची ₹2,500 फी बाकी आहे. कृपया 20 नोव्हेंबरपर्यंत भरा."],
  ];
  return (
    <div className="space-y-2.5">
      {m.map(([l, t]) => (
        <div key={l} className="flex gap-3">
          <span className="w-14 shrink-0 pt-2 text-right text-[11px] font-medium text-foreground/40">{l}</span>
          <p className="rounded-2xl rounded-tl-md bg-wa-bubble px-3.5 py-2 text-[13px] leading-5 text-foreground/90">{t}</p>
        </div>
      ))}
    </div>
  );
}

function VoiceMock() {
  return (
    <div className="flex flex-col items-center gap-5 py-2">
      <div className="flex h-14 items-center gap-1.5">
        {[0.5, 0.9, 0.6, 1, 0.7, 0.4, 0.85, 0.55, 0.95, 0.5, 0.75].map((h, i) => (
          <span
            key={i}
            className="ai-eq w-1.5 rounded-full"
            style={{
              height: `${h * 100}%`,
              background: GLOW,
              animationDelay: `${i * 90}ms`,
            }}
          />
        ))}
      </div>
      <p className="text-center text-sm text-foreground/80">“How do I give a concession?”</p>
      <ol className="w-full space-y-1.5 text-[13px] text-foreground/55">
        {["Open Fees → Concessions", "Choose the student", "Set a % or amount off, then Save"].map((s, i) => (
          <li key={s} className="flex gap-2.5">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-foreground/[0.08] text-[10px] font-semibold text-foreground/70">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AiShowcase() {
  return (
    <section id="ai" className="relative scroll-mt-16 overflow-hidden bg-background text-foreground">
      {/* Faint glow at the top of the section */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-[120px]"
        style={{ background: GLOW }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-28 sm:px-6 sm:py-36">
        <div className="ai-reveal mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/[0.04] px-3.5 py-1.5 text-xs font-medium text-foreground/70 backdrop-blur">
            <Glyph d={SPARK} className="size-3.5 text-[#fbbf24]" />
            EduFlow AI · in the Pro plan
          </p>
          <h2 className="mt-7 text-5xl font-semibold tracking-[-0.045em] text-balance sm:text-7xl sm:leading-[1.02]">
            Your school, <span className="text-glow">now with answers.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-pretty text-foreground/60 sm:text-xl">
            Ask about any student, fee or result in plain words, in English, हिंदी or मराठी. EduFlow AI answers from your own records and does the busywork, always with your OK.
          </p>
        </div>

        <ChatHero />

        <div className="mt-24 grid gap-4 md:grid-cols-6">
          <Card
            className="md:col-span-4"
            title="It does the work. You say yes."
            body="Record a payment or mark a whole class present just by asking. If two students share a name, it asks which one, and nothing is saved until you confirm."
          >
            <ActionMock />
          </Card>
          <Card className="md:col-span-2" title="Your morning, in one glance" body="A short summary on the dashboard: who's absent, what came in and what needs you today.">
            <SummaryMock />
          </Card>
          <Card className="md:col-span-3" title="Presentations in a minute" body="Give a topic, or pick a test or a month. Slides, charts and pictures are made for you; click any text to change it.">
            <SlideMock />
          </Card>
          <Card className="md:col-span-3" title="Every report card, a personal note" body="A remark for each student from their marks and attendance, warm, formal or brief. Read, edit and use.">
            <RemarksMock />
          </Card>
          <Card
            className="md:col-span-3"
            title="Speaks every parent's language"
            body="Personal fee reminders and messages for each parent, written in English, Hindi or Marathi, ready to send on WhatsApp."
          >
            <LanguagesMock />
          </Card>
          <Card className="md:col-span-3" title="Just ask out loud" body="Tap the mic and speak. Ask how to do anything in EduFlow and get the exact steps for your role.">
            <VoiceMock />
          </Card>
        </div>

        <ul className="ai-reveal mx-auto mt-16 grid max-w-4xl gap-6 text-center sm:grid-cols-3">
          {[
            ["Answers from your records", "Every number comes from your school's own data."],
            ["Only what your role allows", "A teacher sees their classes; fees stay with those you choose."],
            ["You stay in control", "An owner turns it on, and every change waits for a confirm."],
          ].map(([t, b]) => (
            <li key={t}>
              <p className="text-sm font-semibold text-foreground">{t}</p>
              <p className="mt-1.5 text-sm leading-6 text-foreground/50">{b}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
