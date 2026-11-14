"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AiUnavailable, SLIDES_ICON, ThemePicker, useBrand } from "@/components/slides/common";
import { errorMessage, useResource } from "@/components/data";
import { Alert, Button, ICONS, Icon, Input, Skeleton, cx } from "@/components/ui";
import { WRITE_LANGUAGES, readChatLanguage, refreshAiStatus, useAiStatus, type WriteLanguage } from "@/lib/ai";
import { api } from "@/lib/api";
import { DECK_UNITS, type Deck, type DeckKind, type DeckSources, type ThemeId } from "@/lib/slides";

export default function NewSlidesPage() {
  return (
    <Suspense fallback={null}>
      <Wizard />
    </Suspense>
  );
}

const KINDS: { kind: DeckKind; title: string; hint: string; icon: string; tone: string }[] = [
  { kind: "topic", title: "From a topic", hint: "A lesson, an event, an orientation for parents… anything.", icon: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z", tone: "bg-violet-500/12 text-violet-600 dark:text-violet-400" },
  { kind: "class_results", title: "Test results for a PTM", hint: "Class average, subjects, grades and toppers, from a test's marks.", icon: "M9 4h6M8 4H6v16h12V4h-2M9 10h6M9 14h6M9 18h3", tone: "bg-sky-500/12 text-sky-600 dark:text-sky-400" },
  { kind: "monthly_review", title: "Monthly school review", hint: "Attendance, fees and tests for a month, for the management.", icon: "M4 19h16M7 16V9M12 16V5M17 16v-4", tone: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
];
const AUDIENCES = ["Class 6 students", "Class 10 students", "Parents", "Teachers", "Management"];

interface OutlineSlide {
  title: string;
  points: string[];
}

function Wizard() {
  const router = useRouter();
  const params = useSearchParams();
  const status = useAiStatus();
  const brand = useBrand();
  const sources = useResource(() => api<DeckSources>("/api/ai/decks/sources"), "deck-sources");
  const [kind, setKind] = useState<DeckKind | null>((params.get("kind") as DeckKind | null) ?? null);
  const [language, setLanguage] = useState<WriteLanguage>(() => {
    const l = readChatLanguage();
    return l === "auto" ? "en" : l;
  });
  const [theme, setTheme] = useState<ThemeId>("classic");
  // Topic
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [count, setCount] = useState(10);
  const [outline, setOutline] = useState<{ title: string; slides: OutlineSlide[] } | null>(null);
  const [pictures, setPictures] = useState(true);
  // Data decks
  const [examId, setExamId] = useState("");
  const [showNames, setShowNames] = useState(true);
  const [month, setMonth] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7));
  const [busy, setBusy] = useState<"outline" | "deck" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const kinds = KINDS.filter((k) => sources.data?.kinds.includes(k.kind));
  const tests = sources.data?.tests ?? [];
  const ready = status?.state === "ready";
  const canDraw = Boolean(status?.images);
  // 2 pictures for a short deck, 3 otherwise (the server's rule)
  const pictureCount = outline ? (outline.slides.filter((s) => s.title.trim()).length <= 6 ? 2 : 3) : 0;
  const withPictures = kind === "topic" && canDraw && pictures;

  // A link to an option this role doesn't have (or no ?kind) starts at the choice
  useEffect(() => {
    if (sources.data && kind && !sources.data.kinds.includes(kind)) router.replace("/app/slides/new");
  }, [sources.data, kind, router]);

  async function makeOutline() {
    setBusy("outline");
    setError(null);
    try {
      const r = await api<{ outline: { title: string; slides: OutlineSlide[] } }>("/api/ai/decks/outline", { method: "POST", body: { topic: topic.trim(), audience: audience.trim(), slides: count, language } });
      setOutline(r.outline);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
      refreshAiStatus();
    }
  }

  async function create() {
    setBusy("deck");
    setError(null);
    const body =
      kind === "topic"
        ? { kind, topic: topic.trim(), audience: audience.trim(), language, theme, pictures: withPictures, outline: { title: outline!.title, slides: outline!.slides.filter((s) => s.title.trim()) } }
        : kind === "class_results"
          ? { kind, examId, showNames, language, theme }
          : { kind, month, language, theme };
    try {
      const r = await api<{ deck: Deck }>("/api/ai/decks", { method: "POST", body });
      router.replace(`/app/slides/edit?id=${r.deck.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    } finally {
      refreshAiStatus();
    }
  }

  const editSlide = (i: number, patch: Partial<OutlineSlide>) => setOutline((o) => o && { ...o, slides: o.slides.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  const moveSlide = (i: number, d: -1 | 1) =>
    setOutline((o) => {
      if (!o) return o;
      const s = [...o.slides];
      const j = i + d;
      if (j < 0 || j >= s.length) return o;
      [s[i], s[j]] = [s[j], s[i]];
      return { ...o, slides: s };
    });

  if (busy === "deck") return <Generating kind={kind!} pictures={withPictures} />;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/app/slides" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground">
        <Icon d={ICONS.chevronLeft} />
        Presentations
      </Link>
      <div className="mb-6 flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent to-violet-600 text-white shadow-lg shadow-accent/25">
          <Icon d={SLIDES_ICON} className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New presentation</h1>
          <p className="text-sm text-muted">{outline ? "Check the plan. Change, add or remove slides, then create it." : kind ? KINDS.find((k) => k.kind === kind)?.hint : "What should it be about?"}</p>
        </div>
      </div>

      {status && !ready ? (
        <AiUnavailable />
      ) : sources.loading && !sources.data ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !kind ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {kinds.map((k, i) => (
            <button
              key={k.kind}
              onClick={() => setKind(k.kind)}
              style={{ animationDelay: `${i * 70}ms` }}
              className="group rounded-2xl border border-border bg-surface p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md motion-safe:animate-rise"
            >
              <span className={cx("grid size-11 place-items-center rounded-xl transition-transform group-hover:scale-110", k.tone)}>
                <Icon d={k.icon} className="size-5" />
              </span>
              <p className="mt-4 font-semibold">{k.title}</p>
              <p className="mt-1 text-sm text-muted">{k.hint}</p>
            </button>
          ))}
        </div>
      ) : outline ? (
        // Topic: the outline to edit
        <div className="space-y-4">
          {error && <Alert>{error}</Alert>}
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Presentation title</span>
            <Input value={outline.title} onChange={(e) => setOutline({ ...outline, title: e.target.value })} maxLength={140} />
          </label>
          <ol className="space-y-2">
            {outline.slides.map((s, i) => (
              <li key={i} className="flex gap-3 rounded-2xl border border-border bg-surface p-3 motion-safe:animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
                <span className="mt-2 grid size-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-xs font-semibold tabular-nums text-accent">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Input value={s.title} onChange={(e) => editSlide(i, { title: e.target.value })} maxLength={140} aria-label={`Slide ${i + 1} title`} className="font-medium" />
                  <Input value={s.points.join(" · ")} onChange={(e) => editSlide(i, { points: e.target.value.split("·").map((p) => p.trim()).filter(Boolean).slice(0, 4) })} placeholder="Key points (separate with ·)" aria-label={`Slide ${i + 1} points`} className="h-9 text-xs" />
                </div>
                <div className="flex shrink-0 flex-col gap-0.5">
                  <button type="button" onClick={() => moveSlide(i, -1)} disabled={i === 0} aria-label="Move up" className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-muted disabled:opacity-30">
                    <Icon d="M6 15l6-6 6 6" className="size-4" />
                  </button>
                  <button type="button" onClick={() => moveSlide(i, 1)} disabled={i === outline.slides.length - 1} aria-label="Move down" className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-muted disabled:opacity-30">
                    <Icon d="M6 9l6 6 6-6" className="size-4" />
                  </button>
                  <button type="button" onClick={() => setOutline({ ...outline, slides: outline.slides.filter((_, k) => k !== i) })} disabled={outline.slides.length <= 2} aria-label="Remove slide" className="grid size-7 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-danger disabled:opacity-30">
                    <Icon d="M6 6l12 12M18 6L6 18" className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {outline.slides.length < 15 && (
            <button type="button" onClick={() => setOutline({ ...outline, slides: [...outline.slides.slice(0, -1), { title: "", points: [] }, ...outline.slides.slice(-1)] })} className="w-full rounded-2xl border border-dashed border-border py-3 text-sm font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent">
              + Add a slide
            </button>
          )}
          <div className="space-y-2">
            <p className="text-sm font-medium">Theme</p>
            <ThemePicker value={theme} onChange={setTheme} brand={brand} />
          </div>
          {canDraw && (
            <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm">
              <input type="checkbox" checked={pictures} onChange={(e) => setPictures(e.target.checked)} className="size-4 accent-[var(--accent)]" />
              <span>
                <span className="font-medium">Add AI pictures</span>
                <span className="text-muted"> to {pictureCount} slides · {pictureCount * DECK_UNITS.image} more AI questions</span>
              </span>
            </label>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => setOutline(null)} className="text-sm font-medium text-muted hover:text-foreground">
              ← Back
            </button>
            <Button onClick={create} disabled={outline.slides.filter((s) => s.title.trim()).length < 2}>
              <Icon d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
              Create presentation · {DECK_UNITS.deck + (withPictures ? pictureCount * DECK_UNITS.image : 0)} AI questions
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {error && <Alert>{error}</Alert>}
          {kind === "topic" && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">What is it about?</span>
                <textarea
                  autoFocus
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  maxLength={300}
                  rows={3}
                  placeholder="e.g. Photosynthesis · Annual Day welcome · Road safety for children · New session orientation for parents"
                  className="w-full resize-none rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                />
              </label>
              <div>
                <span className="mb-1 block text-sm font-medium">For whom?</span>
                <Input value={audience} onChange={(e) => setAudience(e.target.value)} maxLength={120} placeholder="e.g. Class 7 students" />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {AUDIENCES.map((a) => (
                    <button key={a} type="button" onClick={() => setAudience(a)} className={cx("rounded-full border px-2.5 py-0.5 text-xs transition-colors", audience === a ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:border-accent/40")}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="mb-1 flex justify-between text-sm font-medium">
                  Slides <span className="tabular-nums text-muted">{count}</span>
                </span>
                <input type="range" min={5} max={15} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-[var(--accent)]" />
              </label>
            </>
          )}
          {kind === "class_results" &&
            (tests.length ? (
              <>
                <div>
                  <span className="mb-1.5 block text-sm font-medium">Which test?</span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {tests.map((tst) => (
                      <button
                        key={tst.id}
                        type="button"
                        onClick={() => setExamId(tst.id)}
                        aria-pressed={examId === tst.id}
                        className={cx("rounded-xl border px-3.5 py-2.5 text-left transition-colors", examId === tst.id ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent/40")}
                      >
                        <span className="block truncate text-sm font-medium">{tst.name}</span>
                        <span className="block text-xs text-muted">
                          Class {tst.class} · {new Date(`${tst.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          {tst.average !== null ? ` · average ${tst.average}%` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 text-sm">
                  <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
                  <span>
                    <span className="font-medium">Show the toppers&apos; names</span>
                    <span className="block text-xs text-muted">Students who need help are never named; their subjects are discussed as a class.</span>
                  </span>
                </label>
              </>
            ) : (
              <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">No tests with marks yet{status?.canManage ? "" : " in your classes"}. Enter marks in Tests first.</p>
            ))}
          {kind === "monthly_review" && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Month</span>
              <Input type="month" value={month} max={new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-auto" />
            </label>
          )}

          <div>
            <span className="mb-1.5 block text-sm font-medium">Language</span>
            <div className="flex gap-1.5">
              {WRITE_LANGUAGES.map((l) => (
                <button key={l.id} type="button" onClick={() => setLanguage(l.id)} aria-pressed={language === l.id} className={cx("rounded-full border px-3.5 py-1 text-sm transition-colors", language === l.id ? "border-accent bg-accent text-white" : "border-border hover:border-accent/40")}>
                  {l.label}
                </button>
              ))}
            </div>
            {language !== "en" && <p className="mt-1.5 text-xs text-muted">Tip: for Hindi and Marathi, download as PDF. PowerPoint needs the Nirmala UI font on the computer that opens it.</p>}
          </div>

          {kind !== "topic" && (
            <div className="space-y-2">
              <span className="block text-sm font-medium">Theme</span>
              <ThemePicker value={theme} onChange={setTheme} brand={brand} />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <button type="button" onClick={() => (params.get("kind") ? router.push("/app/slides") : setKind(null))} className="text-sm font-medium text-muted hover:text-foreground">
              ← Back
            </button>
            {kind === "topic" ? (
              <Button onClick={makeOutline} loading={busy === "outline"} disabled={topic.trim().length < 3}>
                Plan the slides · {DECK_UNITS.outline} AI question
              </Button>
            ) : (
              <Button onClick={create} disabled={kind === "class_results" && !examId}>
                <Icon d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
                Create presentation · {DECK_UNITS.deck} AI questions
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const STEPS: Record<DeckKind, string[]> = {
  topic: ["Reading your plan", "Writing the slides", "Choosing layouts", "Adding speaker notes"],
  class_results: ["Reading the test's marks", "Working out averages and grades", "Drawing the charts", "Writing the slides"],
  monthly_review: ["Reading attendance", "Adding up the fees", "Drawing the charts", "Writing the slides"],
};

/** While the presentation is written (usually under a minute). */
function Generating({ kind, pictures }: { kind: DeckKind; pictures: boolean }) {
  const steps = pictures ? [...STEPS[kind], "Drawing pictures"] : STEPS[kind];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), 2600);
    return () => clearInterval(id);
  }, [steps.length]);
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center" aria-live="polite">
      <div className="relative mb-8 size-20">
        <div aria-hidden className="absolute -inset-5 rounded-full bg-[conic-gradient(from_0deg,var(--accent),#8b5cf6,#10b981,#f59e0b,var(--accent))] opacity-40 blur-2xl motion-safe:animate-spin-slow" />
        <div className="relative grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-accent to-violet-600 text-white shadow-xl shadow-accent/30 motion-safe:animate-float">
          <Icon d={SLIDES_ICON} className="size-9" />
        </div>
      </div>
      <p className="text-lg font-semibold">Making your presentation</p>
      <ul className="mt-5 w-full space-y-2 text-left">
        {steps.map((s, i) => (
          <li key={s} className={cx("flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-all", i < step ? "text-muted" : i === step ? "bg-accent-soft font-medium" : "text-muted/50")}>
            {i < step ? (
              <span className="grid size-5 place-items-center rounded-full bg-success-soft text-success">
                <Icon d="M5 12l5 5L20 7" className="size-3" />
              </span>
            ) : i === step ? (
              <span className="relative size-5">
                <span className="absolute inset-0 rounded-full border-2 border-accent/20" />
                <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent motion-safe:animate-spin" />
              </span>
            ) : (
              <span className="size-5 rounded-full border-2 border-border" />
            )}
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
