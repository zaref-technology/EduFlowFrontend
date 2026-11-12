"use client";

// The "Ask EduFlow" start screen: a greeting, what the assistant can do, starter questions
// and example actions, in the chosen reply language. Motion is skipped for reduced motion.
import { Icon, cx } from "./ui";
import type { WriteLanguage } from "@/lib/ai";
import { useAuth } from "@/lib/auth";

export const SPARKLE = "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8zM5 3l.6 1.4L7 5l-1.4.6L5 7l-.6-1.4L3 5l1.4-.6z";

const I = {
  rupee: "M7 4h10M7 8h10M7 4c4 0 6 2 6 4s-2 4-6 4l7 8",
  wallet: "M3 7h15a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0V6a2 2 0 012-2h11M16 13h.01",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4",
  alert: "M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  test: "M9 4h6M8 4H6v16h12V4h-2M9 10h6M9 14h6M9 18h3",
  trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-3.5-3.5",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  note: "M4 20h4L18.5 9.5a2.1 2.1 0 00-4-4L4 16v4z",
  shield: "M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3zM9 12l2 2 4-4",
  history: "M3 12a9 9 0 103-6.7M3 4v5h5M12 7v5l3 2",
  arrow: "M5 12h14M13 6l6 6-6 6",
  bolt: "M13 3L4 14h7l-1 7 9-11h-7l1-7z",
  globe: "M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  database: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
};

// Icon and colour for each starter question, in the order of SUGGESTIONS per role
const TONES = {
  amber: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  green: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  blue: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  rose: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  violet: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
} as const;
type Tone = keyof typeof TONES;
const SUGGESTION_LOOK: Record<string, [string, Tone][]> = {
  owner: [[I.rupee, "amber"], [I.wallet, "green"], [I.calendar, "blue"], [I.alert, "rose"]],
  admin: [[I.rupee, "amber"], [I.wallet, "green"], [I.calendar, "blue"], [I.trophy, "violet"]],
  teacher: [[I.calendar, "blue"], [I.alert, "rose"], [I.test, "violet"], [I.trophy, "amber"]],
  accountant: [[I.rupee, "amber"], [I.wallet, "green"], [I.list, "blue"], [I.search, "violet"]],
};

const TEXT: Record<WriteLanguage, {
  greet: [string, string, string];
  headline: (school: string) => string;
  pills: [string, string, string];
  ask: string;
  doTitle: string;
  doHint: string;
  fill: string;
  history: string;
  trust: string;
  actions: { fee: string; attendance: string; note: string };
}> = {
  en: {
    greet: ["Good morning", "Good afternoon", "Good evening"],
    headline: (s) => `What can I do for ${s} today?`,
    pills: ["Live school records", "Prepares changes, you confirm", "English · हिन्दी · मराठी"],
    ask: "Ask",
    doTitle: "Get things done",
    doHint: "Nothing is saved until you confirm",
    fill: "Use",
    history: "Your earlier chats",
    trust: "Uses only what your role can see in EduFlow. Every change waits for your confirmation.",
    actions: { fee: "Record ₹1,000 fee for Sara", attendance: "Mark Riya absent today", note: "Note about Aman: great improvement in maths" },
  },
  hi: {
    greet: ["सुप्रभात", "नमस्ते", "शुभ संध्या"],
    headline: (s) => `आज ${s} के लिए क्या करूँ?`,
    pills: ["स्कूल का लाइव डेटा", "बदलाव तैयार, पुष्टि आप करें", "English · हिन्दी · मराठी"],
    ask: "पूछें",
    doTitle: "काम करवाएँ",
    doHint: "आपकी पुष्टि के बिना कुछ सेव नहीं होता",
    fill: "लिखें",
    history: "पिछली बातचीत",
    trust: "सिर्फ़ वही जानकारी जो आपकी भूमिका EduFlow में देख सकती है। हर बदलाव आपकी पुष्टि के बाद ही।",
    actions: { fee: "सारा की ₹1,000 फीस जमा करो", attendance: "रिया को आज अनुपस्थित मार्क करो", note: "अमन के बारे में नोट: गणित में अच्छा सुधार" },
  },
  mr: {
    greet: ["सुप्रभात", "नमस्कार", "शुभ संध्याकाळ"],
    headline: (s) => `आज ${s} साठी काय करू?`,
    pills: ["शाळेची थेट माहिती", "बदल तयार, पुष्टी तुम्ही करा", "English · हिन्दी · मराठी"],
    ask: "विचारा",
    doTitle: "कामे करून घ्या",
    doHint: "तुमच्या पुष्टीशिवाय काहीही सेव्ह होत नाही",
    fill: "लिहा",
    history: "मागील संभाषणे",
    trust: "फक्त तुमच्या भूमिकेला EduFlow मध्ये दिसणारी माहिती. प्रत्येक बदल तुमच्या पुष्टीनंतरच.",
    actions: { fee: "साराची ₹1,000 फी जमा करा", attendance: "रियाला आज गैरहजर मार्क करा", note: "अमनबद्दल नोंद: गणितात चांगली सुधारणा" },
  },
};

const FEES = ["owner", "admin", "accountant"];
const TEACHING = ["owner", "admin", "teacher"];

/** Delay for the n-th item of a staggered entrance. */
const stagger = (n: number) => ({ animationDelay: `${80 + n * 55}ms` });

export function ChatWelcome({
  language,
  role,
  suggestions,
  blocked,
  onAsk,
  onPrefill,
  onHistory,
}: {
  language: WriteLanguage;
  role: string;
  suggestions: string[];
  blocked: boolean;
  onAsk: (q: string) => void;
  /** Puts an example into the box to edit (names in examples are made up) */
  onPrefill: (q: string) => void;
  onHistory: () => void;
}) {
  const { session } = useAuth();
  const t = TEXT[language];
  const first = session.status === "authenticated" ? session.user.name.split(" ")[0] : "";
  const school = session.status === "authenticated" ? (session.tenant?.name ?? "your school") : "your school";
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  const greet = t.greet[hour < 12 ? 0 : hour < 17 ? 1 : 2];
  const look = SUGGESTION_LOOK[role] ?? SUGGESTION_LOOK.owner;
  const actions = [
    FEES.includes(role) && { text: t.actions.fee, icon: I.rupee, tone: "amber" as Tone },
    TEACHING.includes(role) && { text: t.actions.attendance, icon: I.calendar, tone: "blue" as Tone },
    TEACHING.includes(role) && { text: t.actions.note, icon: I.note, tone: "violet" as Tone },
  ].filter(Boolean) as { text: string; icon: string; tone: Tone }[];

  return (
    <div className="space-y-7 pb-2">
      {/* Hero */}
      <div className="relative flex flex-col items-center pt-4 text-center">
        <div className="relative mb-5 size-16 motion-safe:animate-pop">
          {/* A soft, slowly turning glow behind the mark */}
          <div aria-hidden className="absolute -inset-4 rounded-full bg-[conic-gradient(from_0deg,var(--accent),#8b5cf6,#10b981,#f59e0b,var(--accent))] opacity-40 blur-2xl motion-safe:animate-spin-slow" />
          <div className="relative grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-accent to-violet-600 text-white shadow-lg shadow-accent/30 ring-1 ring-white/20 motion-safe:animate-float">
            <Icon d={SPARKLE} className="size-8" />
          </div>
        </div>
        <p className="text-sm text-muted motion-safe:animate-rise" style={stagger(0)}>
          {greet}
          {first ? `, ${first}` : ""} 👋
        </p>
        <h2
          className="mt-1 max-w-md bg-gradient-to-r from-foreground via-accent to-violet-500 bg-clip-text text-2xl font-semibold tracking-tight text-transparent text-balance motion-safe:animate-rise"
          style={stagger(1)}
        >
          {t.headline(school)}
        </h2>
        <div className="mt-4 flex flex-wrap justify-center gap-1.5 motion-safe:animate-rise" style={stagger(2)}>
          {[I.database, I.bolt, I.globe].map((icon, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-muted backdrop-blur">
              <Icon d={icon} className="size-3.5 text-accent" />
              {t.pills[i]}
            </span>
          ))}
        </div>
      </div>

      {!blocked && (
        <>
          {/* Ask */}
          <section>
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted motion-safe:animate-rise" style={stagger(3)}>
              {t.ask}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((s, i) => {
                const [icon, tone] = look[i % look.length];
                return (
                  <button
                    key={s}
                    onClick={() => onAsk(s)}
                    style={stagger(4 + i)}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-3 text-left text-sm shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md active:translate-y-0 motion-safe:animate-rise"
                  >
                    <span className={cx("grid size-9 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-110", TONES[tone])}>
                      <Icon d={icon} className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1 leading-snug">{s}</span>
                    <Icon d={I.arrow} className="size-4 shrink-0 -translate-x-1 text-accent opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Do */}
          {actions.length > 0 && (
            <section className="relative overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent-soft/80 via-surface to-surface p-4 motion-safe:animate-rise" style={stagger(9)}>
              <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-accent/10 blur-2xl" />
              <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                  <Icon d={I.bolt} className="size-4 text-accent" />
                  {t.doTitle}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted ring-1 ring-border">
                  <Icon d={I.shield} className="size-3 text-success" />
                  {t.doHint}
                </span>
              </div>
              <div className="relative space-y-1.5">
                {actions.map((a, i) => (
                  <button
                    key={a.text}
                    onClick={() => onPrefill(a.text)}
                    style={stagger(10 + i)}
                    className="group flex w-full items-center gap-3 rounded-xl bg-surface/70 px-3 py-2.5 text-left text-sm ring-1 ring-border transition-all duration-200 hover:bg-surface hover:ring-accent/40 motion-safe:animate-rise"
                  >
                    <span className={cx("grid size-7 shrink-0 place-items-center rounded-lg", TONES[a.tone])}>
                      <Icon d={a.icon} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">&ldquo;{a.text}&rdquo;</span>
                    <span className="shrink-0 text-xs font-medium text-accent opacity-70 transition-opacity group-hover:opacity-100">{t.fill} ↵</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Footer */}
      <div className="flex flex-col items-center gap-3 text-center motion-safe:animate-rise" style={stagger(13)}>
        <button onClick={onHistory} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent-soft">
          <Icon d={I.history} className="size-4" />
          {t.history}
        </button>
        <p className="flex max-w-sm items-start gap-1.5 text-[11px] leading-relaxed text-muted">
          <Icon d={I.shield} className="mt-px size-3.5 shrink-0 text-success" />
          {t.trust}
        </p>
      </div>
    </div>
  );
}
