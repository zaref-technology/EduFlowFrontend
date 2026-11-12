import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";
import { ICONS, Icon, buttonClass, cx } from "@/components/ui";

const TRIAL_DAYS = 7;

// ---------------------------------------------------------------------------
// Content (every feature listed here exists in the product)
// ---------------------------------------------------------------------------

/** Smaller features, listed together in one tile of the features grid. */
const ALSO_INCLUDED = [
  { title: "Students & Excel import", body: "Profiles, guardians and classes; bring your list (and fees already paid) from Excel.", icon: ICONS.users },
  { title: "Homework & syllabus", body: "Post homework to a class and send it to parents; track syllabus per subject.", icon: "M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v14zM8 7h8M8 11h6" },
  { title: "Timetable & notices", body: "Every teacher sees today's periods; notices for staff or parents.", icon: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h3M13 14h3" },
  { title: "Reports in Excel", body: "Collections, dues by class, concessions and registers, ready to download.", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  { title: "The right access", body: "Owners, admins, teachers and accountants each see only what their job needs.", icon: "M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7l8-4z" },
  { title: "Several branches", body: "One login for every institute you run, with a different role in each.", icon: "M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" },
];

const AUDIENCES = ["Schools", "Tuition centres", "Coaching institutes", "Academies"];

const STEPS = [
  { title: "Create your institute", body: "Sign up with your name and your school's name. You're the owner, ready in under a minute." },
  { title: "Bring in your students", body: "Upload your existing Excel sheet. Columns like “Adm No”, “Class” and “Father Name” are recognised automatically." },
  { title: "Run your day", body: "Take attendance, collect fees, enter marks, send receipts and results on WhatsApp. Invite your staff whenever you're ready." },
];

const INCLUDED = [
  "Your whole team, each with their own login",
  "Daily attendance, even without internet",
  "Fee plans, concessions, receipts and reminders",
  "Tests, report cards and class rankings",
  "Receipts and report cards with your logo, as PDF",
  "WhatsApp messages to parents",
  "Excel import & export for students and marks",
  "Works on phone, tablet and computer, or as an app",
];

const FAQ = [
  {
    q: `How does the ${TRIAL_DAYS}-day free trial work?`,
    a: `Create an account and start using EduFlow straight away. The trial lasts ${TRIAL_DAYS} days, needs no credit card, and everything you add stays when you choose a plan.`,
  },
  {
    q: "Do I need to install anything?",
    a: "No. EduFlow runs in the browser on any phone, tablet or computer. If you like, install it as an app from the browser (Android: Install app; iPhone: Share → Add to Home Screen) for an icon and full-screen use.",
  },
  {
    q: "Does it work without internet?",
    a: "Attendance can be marked offline and is sent as soon as you're back online, and pages you've opened before still open. Everything else needs an internet connection.",
  },
  {
    q: "Can I bring my existing student list?",
    a: "Yes. Upload the Excel (.xlsx, .xls) or CSV file you already have. Common column names are matched automatically, and you see a preview before anything is saved. Add a “Fees paid” column for fees collected before you joined.",
  },
  {
    q: "Is it only for schools?",
    a: "No. Tuition centres and coaching institutes use it too: a class can be a batch, and everything else (attendance, fees, tests, WhatsApp) works the same.",
  },
  {
    q: "How do WhatsApp messages reach parents?",
    a: "Out of the box, EduFlow opens WhatsApp with the message ready and you tap Send. Free, no setup. Schools with a WhatsApp Business account can switch on automatic sending with delivered and read ticks.",
  },
  {
    q: "Can we use our own logo on receipts and report cards?",
    a: "Yes. Upload your logo, then choose the colour, title, what's shown, signatures and receipt numbering. Every receipt and report card follows it, on screen, as a PDF and in print.",
  },
  {
    q: "Can staff sign in with their mobile number?",
    a: "Yes. They can sign in with a one-time code sent by SMS to the number on their account, or with their email and password.",
  },
  {
    q: "Is our data safe?",
    a: "Every school's data is kept separate, passwords are hashed, sessions expire automatically, and sensitive keys are stored encrypted. Only the roles you choose can see fees.",
  },
  {
    q: "We have more than one branch. Does that work?",
    a: "Yes. One login can belong to several institutes with a different role in each, and switching between them takes a click.",
  },
];

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Check({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={cx("size-4 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth={2.4} aria-hidden>
      <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">{children}</p>;
}

function SectionTitle({ eyebrow, title, body, center }: { eyebrow: string; title: string; body?: string; center?: boolean }) {
  return (
    <div className={cx("max-w-2xl", center && "mx-auto text-center")}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {body && <p className="mt-4 text-lg text-pretty text-muted">{body}</p>}
    </div>
  );
}

/** A framed piece of product UI, used as illustration. */
function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_60px_-24px_rgba(20,27,58,0.35)]", className)}>
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-muted/60 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Illustrations (built from the same styles as the real app)
// ---------------------------------------------------------------------------

function HeroMockup() {
  const bars = [38, 52, 30, 64, 46, 72, 40, 58, 84, 50, 66, 92];
  return (
    <div aria-hidden>
      <Frame>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Fees · This month</p>
              <p className="text-2xl font-semibold tracking-tight text-success tabular-nums">₹4,69,250</p>
            </div>
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">36 receipts</span>
          </div>
          <div className="flex h-24 items-end gap-[3px]">
            {bars.map((h, i) => (
              <span key={i} className="flex-1 rounded-t-[4px] bg-accent" style={{ height: `${h}%`, opacity: i === bars.length - 1 ? 1 : 0.85 }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs text-muted">Overdue</p>
              <p className="font-semibold text-danger tabular-nums">₹3,83,750</p>
              <p className="text-[11px] text-muted">23 students</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted">Class 5 - A</p>
                <span className="rounded-full bg-success-soft px-1.5 text-[10px] font-medium text-success">Done</span>
              </div>
              <p className="font-semibold tabular-nums">28 / 30 present</p>
              <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <span className="bg-success" style={{ width: "86%" }} />
                <span className="bg-warning" style={{ width: "4%" }} />
                <span className="bg-danger" style={{ width: "6%" }} />
              </div>
            </div>
          </div>
        </div>
      </Frame>
      {/* WhatsApp receipt bubble: tucked under the frame's bottom edge, never over its content */}
      <div className="relative z-10 -mt-3 ml-auto mr-2 w-64 rounded-2xl border border-border bg-surface p-3 shadow-xl sm:-mr-6">
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="grid size-6 place-items-center rounded-full bg-[#128c4a] text-white">
            <Icon d="M4 20l1.3-3.9A8 8 0 1112 20a8 8 0 01-3.9-1L4 20z" className="size-3.5" />
          </span>
          WhatsApp · just now
        </div>
        <div className="mt-2 rounded-xl bg-wa-bubble p-2.5 text-[12px] leading-relaxed">
          We have received <strong>₹14,000</strong> towards the fees of <strong>Navya</strong>. Receipt <strong>R00041</strong>. Thank you!
          <span className="mt-1 block text-right text-[10px] text-success">✓✓ Read</span>
        </div>
      </div>
    </div>
  );
}

function FeesVisual() {
  return (
    <Frame>
      <div className="p-5" aria-hidden>
        <div className="mx-auto max-w-sm rounded-lg border border-zinc-200 bg-white p-4 text-[12px] text-zinc-900">
          <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-2">
            <div>
              <p className="font-bold">Sunrise Public School</p>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Fee receipt</p>
            </div>
            <p className="font-mono font-semibold">R00041</p>
          </div>
          <div className="flex justify-between py-2">
            <span>Q2 (Jul–Sep) · Tuition</span>
            <span className="tabular-nums">₹9,000</span>
          </div>
          <div className="flex justify-between border-t-2 border-zinc-900 pt-2 font-bold">
            <span>Total received</span>
            <span className="tabular-nums">₹9,000</span>
          </div>
          <p className="mt-1.5 italic text-zinc-600">Rupees Nine Thousand Only</p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          {["Cash", "UPI", "Cheque"].map((m, i) => (
            <span key={m} className={cx("rounded-lg border py-2 font-medium", i === 1 ? "border-accent bg-accent-soft text-accent" : "border-border")}>
              {m}
            </span>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function AttendanceVisual() {
  const rows: [string, string, number][] = [
    ["1", "Aarav Sharma", 0],
    ["2", "Zara Khan", 1],
    ["3", "Vihaan Patel", 0],
    ["4", "Ananya Iyer", 2],
  ];
  const opts = ["Present", "Absent", "Late"];
  const on = ["bg-success text-background border-success", "bg-danger text-background border-danger", "bg-warning text-background border-warning"];
  return (
    <Frame>
      <ul className="divide-y divide-border" aria-hidden>
        {rows.map(([roll, name, sel]) => (
          <li key={roll} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="w-4 text-right font-mono text-xs text-muted">{roll}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
            <span className="flex gap-1.5">
              {opts.map((o, i) => (
                <span key={o} className={cx("rounded-md border px-2 py-1 text-[11px] font-medium", i === sel ? on[i] : "border-border text-muted")}>
                  {o}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between border-t border-border bg-surface-muted/50 px-4 py-3 text-xs">
        <span className="text-muted">All students marked · 90% present</span>
        <span className="rounded-md bg-accent px-2.5 py-1 font-medium text-accent-foreground">Save attendance</span>
      </div>
    </Frame>
  );
}

function WhatsAppVisual() {
  return (
    <Frame>
      <div className="space-y-3 p-5 text-[13px] leading-relaxed" aria-hidden>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-wa-bubble p-3">
          Dear Ravi Rao, <strong>Asha</strong> was marked <strong>absent</strong> today. Remark: Fever.
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-wa-bubble p-3">
          📋 Attendance report of <strong>Asha</strong> for <strong>October</strong>: ✅ Present 20 · ❌ Absent 2 · <strong>90.9%</strong>
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-wa-bubble p-3">
          Gentle reminder: fees of <strong>₹9,000</strong> are pending. ⚠️ Overdue since 10 Oct.
          <span className="mt-1 block text-right text-[10px] text-success">✓✓ Delivered</span>
        </div>
      </div>
    </Frame>
  );
}

function ResultsVisual() {
  const rows: [string, number, string][] = [
    ["English", 86, "A2"],
    ["Mathematics", 92, "A1"],
    ["Science", 78, "B1"],
    ["Social Science", 81, "A2"],
  ];
  return (
    <Frame>
      <div className="p-5" aria-hidden>
        <div className="mx-auto max-w-sm rounded-lg border border-zinc-200 bg-white p-4 text-[12px] text-zinc-900">
          <div className="flex items-start justify-between border-b-2 border-indigo-900 pb-2">
            <div>
              <p className="font-bold">Sunrise Public School</p>
              <p className="text-[10px] font-medium uppercase tracking-widest text-indigo-800">Report card</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">Half-yearly</p>
              <p className="text-[10px] text-zinc-500">Aarav Sharma · 5-A</p>
            </div>
          </div>
          <table className="mt-2 w-full">
            <tbody>
              {rows.map(([subject, marks, grade]) => (
                <tr key={subject} className="border-b border-zinc-100">
                  <td className="py-1">{subject}</td>
                  <td className="py-1 text-right tabular-nums">{marks}/100</td>
                  <td className="py-1 text-right font-semibold">{grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              ["Percentage", "84.3%", ""],
              ["Rank", "4 / 38", ""],
              ["Result", "Pass", "border-emerald-300 bg-emerald-50 text-emerald-700"],
            ].map(([k, v, tone]) => (
              <div key={k} className={cx("rounded border border-zinc-200 p-1.5", tone)}>
                <p className="text-[9px] uppercase tracking-wide text-zinc-500">{k}</p>
                <p className="text-sm font-bold">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs">
          {["Download PDF", "Share on WhatsApp", "Print"].map((m, i) => (
            <span key={m} className={cx("rounded-lg border px-3 py-1.5 font-medium", i === 1 ? "border-[#128c4a] bg-[#128c4a] text-white" : "border-border")}>
              {m}
            </span>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Features: a bento grid of tiles, each with a small preview of the real thing
// ---------------------------------------------------------------------------

function Tile({ title, body, icon, className, children, tone = "accent" }: { title: string; body: string; icon: string; className?: string; children?: ReactNode; tone?: "accent" | "green" }) {
  return (
    <div
      className={cx(
        "group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_20px_50px_-24px_rgba(20,27,58,0.35)]",
        className
      )}
    >
      {/* Soft glow in the corner, brighter on hover */}
      <div
        aria-hidden
        className={cx(
          "pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-60 blur-3xl transition-opacity group-hover:opacity-100",
          tone === "green" ? "bg-[color-mix(in_oklab,var(--brand-green)_18%,transparent)]" : "bg-[color-mix(in_oklab,var(--accent)_14%,transparent)]"
        )}
      />
      <span className={cx("relative grid size-11 place-items-center rounded-xl", tone === "green" ? "bg-success-soft text-success" : "bg-accent-soft text-accent")}>
        <Icon d={icon} className="size-5" />
      </span>
      <h3 className="relative mt-5 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="relative mt-1.5 text-sm leading-6 text-pretty text-muted">{body}</p>
      {children && (
        <div aria-hidden className="relative mt-5 flex-1">
          {children}
        </div>
      )}
    </div>
  );
}

function FeatureBento() {
  return (
    <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto_auto]">
      {/* Fees: the big one */}
      <Tile
        className="sm:col-span-2"
        title="Fees without the chasing"
        body="Fee plans with installments, one-tap concessions, advance and part payments, and a live list of who owes what."
        icon="M7 4h10M7 8h10M7 4c4 0 6 2 6 4s-2 4-6 4l7 8"
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Collected this month", "₹4,69,250", "text-success"],
            ["Overdue", "₹83,750", "text-danger"],
            ["Concessions given", "₹41,200", "text-accent"],
          ].map(([k, v, tone]) => (
            <div key={k} className="rounded-2xl border border-border bg-background/60 p-3">
              <p className="text-[11px] text-muted">{k}</p>
              <p className={cx("text-xl font-semibold tabular-nums tracking-tight", tone)}>{v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Sibling 10%", "Staff child 50%", "RTE · free", "Scholarship 25%"].map((c) => (
            <span key={c} className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] font-medium">
              {c}
            </span>
          ))}
        </div>
      </Tile>

      {/* Attendance: tall */}
      <Tile className="lg:row-span-2" title="Attendance in a minute" body="Mark everyone present, fix the few who aren't, save. Works without internet." icon={ICONS.calendarCheck} tone="green">
        <ul className="space-y-1.5">
          {[
            ["Aarav Sharma", "P"],
            ["Zara Khan", "A"],
            ["Vihaan Patel", "P"],
            ["Ananya Iyer", "L"],
            ["Kabir Singh", "P"],
            ["Myra Das", "P"],
          ].map(([name, st]) => (
            <li key={name} className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2 text-sm">
              <span className="truncate">{name}</span>
              <span
                className={cx(
                  "grid size-6 place-items-center rounded-md text-[11px] font-bold text-white",
                  st === "P" ? "bg-success" : st === "A" ? "bg-danger" : "bg-warning"
                )}
              >
                {st}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted">28 / 30 present</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 font-medium text-success">
            <span className="size-1.5 rounded-full bg-success" />
            Saved offline
          </span>
        </div>
      </Tile>

      {/* Tests */}
      <Tile title="Tests & report cards" body="Type marks or upload the class's Excel template. Grades, ranks and report cards are made for you." icon="M9 4h6M8 4H6v16h12V4h-2M9 10h6M9 14h6M9 18h3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            ["Maths", "A1"],
            ["English", "A2"],
            ["Science", "B1"],
          ].map(([sub, g]) => (
            <span key={sub} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background/60 px-2.5 py-1.5 text-xs">
              {sub}
              <span className="rounded-md bg-accent-soft px-1.5 font-bold text-accent">{g}</span>
            </span>
          ))}
          <span className="rounded-xl bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-foreground">Rank 4 / 38</span>
        </div>
      </Tile>

      {/* WhatsApp */}
      <Tile title="Parents on WhatsApp" body="Receipts, reminders, absence alerts and results, from your phone or the school's number." icon="M4 20l1.3-3.9A8 8 0 1112 20a8 8 0 01-3.9-1L4 20z" tone="green">
        <div className="rounded-2xl rounded-tl-sm bg-wa-bubble p-3 text-[12px] leading-relaxed">
          Received <strong>₹9,000</strong> for <strong>Navya</strong>. Receipt <strong>R00041</strong>. Thank you!
          <span className="mt-1 block text-right text-[10px] text-success">✓✓ Read</span>
        </div>
      </Tile>

      {/* Leaderboard */}
      <Tile title="Performance leaderboards" body="Top students of every class by marks and attendance, shared with parents in a tap." icon="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3">
        <div className="flex items-end justify-center gap-2">
          {[
            ["Myra", "2", "h-14", "bg-zinc-300 text-zinc-800"],
            ["Aarav", "1", "h-20", "bg-amber-400 text-amber-950"],
            ["Zara", "3", "h-10", "bg-orange-300 text-orange-950"],
          ].map(([name, place, h, tone]) => (
            <div key={name} className="flex w-16 flex-col items-center gap-1">
              <span className="text-xs font-medium">{name}</span>
              <span className={cx("grid w-full place-items-start justify-center rounded-t-xl pt-1.5 text-sm font-bold", h, tone)}>{place}</span>
            </div>
          ))}
        </div>
      </Tile>

      {/* Branding */}
      <Tile className="sm:col-span-2" title="Your logo on everything" body="Receipts and report cards with your logo, colours, signatures and numbering. Download as PDF, share as an image, or print two copies." icon="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="w-full max-w-xs rounded-xl border border-zinc-200 bg-white p-3 text-[11px] text-zinc-900 shadow-sm">
            <div className="flex items-center justify-between border-b-2 border-rose-900 pb-1.5">
              <span className="flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded bg-rose-900 text-[10px] font-bold text-white">SP</span>
                <span className="font-bold">Sunrise Public School</span>
              </span>
              <span className="font-mono font-bold">SPS-00042</span>
            </div>
            <div className="mt-2 flex justify-between rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5">
              <span className="text-zinc-500">Amount received</span>
              <span className="font-bold">₹15,000</span>
            </div>
            <div className="mt-3 flex justify-end">
              <span className="border-t border-zinc-400 pt-0.5 text-[9px] text-zinc-500">Principal</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex gap-1.5">
              {["bg-indigo-700", "bg-emerald-700", "bg-teal-700", "bg-rose-900 ring-2 ring-offset-2 ring-rose-900 ring-offset-surface", "bg-orange-600", "bg-zinc-900"].map((c) => (
                <span key={c} className={cx("size-6 rounded-full ring-1 ring-border", c)} />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-medium">
              {["PDF", "Image", "2 copies"].map((x) => (
                <span key={x} className="rounded-full border border-border bg-background/60 px-2.5 py-1">
                  {x}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Tile>

      {/* App */}
      <Tile title="Works like an app" body="Install it from the browser, open it full screen, sign in with a one-time code." icon="M7 3h10v18H7zM11 18h2" tone="green">
        <div className="mx-auto w-36 rounded-[1.4rem] border-4 border-foreground/80 bg-background p-2 shadow-lg">
          <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-foreground/20" />
          <p className="text-center text-[10px] text-muted">Your code</p>
          <p className="text-center font-mono text-lg font-bold tracking-[0.2em]">482 913</p>
          <div className="mt-2 rounded-lg bg-accent py-1 text-center text-[10px] font-semibold text-accent-foreground">Sign in</div>
        </div>
      </Tile>

      {/* Everything else */}
      <div className="rounded-3xl border border-border bg-surface-muted/50 p-6 sm:col-span-2">
        <p className="text-sm font-semibold">Also included</p>
        <ul className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {ALSO_INCLUDED.map((f) => (
            <li key={f.title} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-accent shadow-sm">
                <Icon d={f.icon} className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{f.title}</span>
                <span className="block text-xs leading-5 text-muted">{f.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Spotlight({ eyebrow, title, body, points, visual, flip }: { eyebrow: string; title: string; body: string; points: string[]; visual: ReactNode; flip?: boolean }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <div className={cx(flip && "lg:order-2")}>
        <SectionTitle eyebrow={eyebrow} title={title} body={body} />
        <ul className="mt-6 space-y-3">
          {points.map((p) => (
            <li key={p} className="flex gap-3">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <Check className="size-3" />
              </span>
              <span className="text-pretty">{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={cx(flip && "lg:order-1")}>{visual}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="flex-1 overflow-x-clip">
        {/* Hero */}
        <section className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_70%_0%,color-mix(in_oklab,var(--accent)_16%,transparent),transparent),radial-gradient(ellipse_50%_40%_at_10%_20%,color-mix(in_oklab,var(--brand-green)_10%,transparent),transparent)]" />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-24 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-medium text-muted backdrop-blur">
                <span className="rounded-full bg-[#128c4a] px-1.5 py-px text-[10px] font-semibold text-white">NEW</span>
                Install EduFlow as an app · sign in with your mobile
              </p>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.6rem] lg:leading-[1.05]">
                Fees, attendance and parents. <span className="text-brand-green">All in one place.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-pretty text-muted">
                EduFlow helps schools, tuition centres and coaching institutes collect fees on time, take attendance in a minute, publish results and keep
                every parent in the loop, from any phone or computer.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className={cx(buttonClass("primary"), "h-12 px-6 text-base")}>
                  Start your {TRIAL_DAYS}-day free trial
                  <Icon d="M5 12h14M13 6l6 6-6 6" />
                </Link>
                <a href="#features" className={cx(buttonClass("secondary"), "h-12 px-6 text-base")}>
                  See what&apos;s inside
                </a>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
                {[`${TRIAL_DAYS} days free`, "No credit card", "Set up in minutes"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="text-brand-green" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-2 sm:px-6 lg:px-0">
              <HeroMockup />
            </div>
          </div>
        </section>

        {/* Built for */}
        <section className="border-y border-border bg-surface/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-6 sm:flex-row sm:justify-between sm:px-6">
            <p className="text-sm font-medium text-muted">Made for</p>
            <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2">
              {AUDIENCES.map((a) => (
                <li key={a} className="text-base font-semibold tracking-tight text-foreground/80">
                  {a}
                </li>
              ))}
            </ul>
            <p className="hidden text-sm font-semibold tracking-[0.25em] text-muted md:block">MANAGE · TRACK · GROW</p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <SectionTitle
            center
            eyebrow="Everything you need"
            title="One app for the work that fills your day"
            body="No more registers, receipt books and WhatsApp groups to keep in sync. Your staff learn it in an afternoon."
          />
          <FeatureBento />
        </section>

        {/* Spotlights */}
        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto max-w-6xl space-y-28 px-4 py-24 sm:px-6">
            <Spotlight
              eyebrow="Fees"
              title="Collect fees on time, without the paperwork"
              body="Set up a fee plan once and every student's dues follow. Record a payment in seconds and the receipt is ready to print or send."
              points={[
                "Monthly, quarterly or yearly installments with one-tap concessions",
                "Cash, UPI, card, bank transfer or cheque, with part payments and advance",
                "Receipts with your logo and the amount in words, as PDF, image or print",
                "Fees paid before EduFlow carried over, so nobody is asked twice",
                "One tap to see every overdue student and remind their parents",
              ]}
              visual={<FeesVisual />}
            />
            <Spotlight
              flip
              eyebrow="Attendance"
              title="A whole class marked in under a minute"
              body="Built for the morning rush. Mark everyone present, fix the few exceptions, and save. On a phone or a computer."
              points={[
                "Big tap targets on phones, keyboard shortcuts on computers",
                "See which classes are done today at a glance",
                "Monthly report per class, ready to download as Excel",
                "Students under 75% attendance flagged automatically",
              ]}
              visual={<AttendanceVisual />}
            />
            <Spotlight
              eyebrow="WhatsApp"
              title="Parents hear from you the moment it matters"
              body="Every message is written for you from your records, so the amount, date and name are always right."
              points={[
                "Fee receipts the moment a payment is recorded",
                "Polite reminders for pending and overdue fees",
                "Absence and late alerts straight from the register",
                "Free click-to-send, or automatic from your school's number",
              ]}
              visual={<WhatsAppVisual />}
            />
            <Spotlight
              flip
              eyebrow="Tests & results"
              title="Marks in, report cards out"
              body="Enter marks on the sheet or upload the class template from Excel. Totals, grades and ranks are worked out for you, and every report card is ready to share."
              points={[
                "Spreadsheet-style entry, or an Excel template for the whole class with checks before anything is saved",
                "Grades (CBSE or simple), pass marks and class ranks, worked out automatically",
                "Report cards and monthly progress reports with your logo and signatures",
                "Download as PDF or send to parents on WhatsApp",
              ]}
              visual={<ResultsVisual />}
            />
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <SectionTitle center eyebrow="How it works" title="Up and running today" />
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-border bg-surface p-6">
                <span className="grid size-10 place-items-center rounded-full bg-accent text-base font-semibold text-accent-foreground">{i + 1}</span>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Free trial */}
        <section id="pricing" className="scroll-mt-20 px-4 pb-24 sm:px-6">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[#141b3a] px-6 py-14 text-white sm:px-14">
            <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-[#3ddc97]/20 blur-3xl" />
            <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 size-80 rounded-full bg-[#6671ac]/30 blur-3xl" />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#3ddc97]">Free trial</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Try EduFlow free for {TRIAL_DAYS} days</h2>
                <p className="mt-4 max-w-md text-white/70">Set up your institute, import your students and collect your first fee before the week is out. No credit card needed.</p>
                <Link
                  href="/register"
                  className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-base font-semibold text-[#141b3a] transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Start your free trial
                  <Icon d="M5 12h14M13 6l6 6-6 6" />
                </Link>
              </div>
              <ul className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#3ddc97] text-[#141b3a]">
                      <Check className="size-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-24 sm:px-6">
          <SectionTitle center eyebrow="FAQ" title="Questions, answered" />
          <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-surface">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-5 py-4 sm:px-6">
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

        {/* Closing CTA */}
        <section className="border-t border-border bg-surface/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance">Spend less time on admin and more on teaching</h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/register" className={cx(buttonClass("primary"), "h-12 px-6 text-base")}>
                Start your {TRIAL_DAYS}-day free trial
              </Link>
              <Link href="/login" className={cx(buttonClass("secondary"), "h-12 px-6 text-base")}>
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Image src="/images/brand/logo-light.png" alt="EduFlow: Manage · Track · Grow" width={983} height={200} className="logo-light h-12 w-auto" />
            <Image src="/images/brand/logo-dark.png" alt="" aria-hidden width={965} height={200} className="logo-dark h-12 w-auto" />
            <p className="mt-4 max-w-xs text-sm text-muted">The simple way to run a school, tuition centre or coaching institute.</p>
          </div>
          <nav aria-label="Product" className="text-sm">
            <p className="font-semibold">Product</p>
            <ul className="mt-3 space-y-2 text-muted">
              <li><a href="#features" className="hover:text-foreground">Features</a></li>
              <li><a href="#how-it-works" className="hover:text-foreground">How it works</a></li>
              <li><a href="#pricing" className="hover:text-foreground">Free trial</a></li>
              <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
            </ul>
          </nav>
          <nav aria-label="Account" className="text-sm">
            <p className="font-semibold">Account</p>
            <ul className="mt-3 space-y-2 text-muted">
              <li><Link href="/register" className="hover:text-foreground">Start free trial</Link></li>
              <li><Link href="/login" className="hover:text-foreground">Log in</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-sm text-muted sm:flex-row sm:px-6">
            <span>© EduFlow · Manage · Track · Grow</span>
            <span>
              Built by{" "}
              <a href="https://zaref.in" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline-offset-4 hover:text-accent hover:underline">
                Zaref
              </a>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
