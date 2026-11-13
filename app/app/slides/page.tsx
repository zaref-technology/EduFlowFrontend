"use client";

import Link from "next/link";
import { useState } from "react";
import { AiUnavailable, SLIDES_ICON, timeAgo, useBrand } from "@/components/slides/common";
import { SlideFrame } from "@/components/slides/slide-view";
import { PageHeader, errorMessage, useResource } from "@/components/data";
import { Alert, Icon, Skeleton, buttonClass, cx } from "@/components/ui";
import { useAiStatus } from "@/lib/ai";
import { api } from "@/lib/api";
import { KIND_LABEL, type DeckKind, type DeckSummary } from "@/lib/slides";

const TEMPLATES: { kind: DeckKind; title: string; hint: string; icon: string; tone: string }[] = [
  { kind: "topic", title: "From a topic", hint: "A lesson, an event, an orientation… in English, Hindi or Marathi", icon: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z", tone: "bg-violet-500/12 text-violet-600 dark:text-violet-400" },
  { kind: "class_results", title: "Test results for a PTM", hint: "Averages, subjects, grades and toppers from a test", icon: "M9 4h6M8 4H6v16h12V4h-2M9 10h6M9 14h6M9 18h3", tone: "bg-sky-500/12 text-sky-600 dark:text-sky-400" },
  { kind: "monthly_review", title: "Monthly school review", hint: "Attendance, fees and tests for the management", icon: "M4 19h16M7 16V9M12 16V5M17 16v-4", tone: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
];

export default function SlidesPage() {
  const status = useAiStatus();
  const brand = useBrand();
  const { data, error, loading, setData } = useResource(() => api<{ decks: DeckSummary[] }>("/api/ai/decks"), "decks");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const ready = status?.state === "ready";

  async function remove(d: DeckSummary) {
    if (!confirm(`Delete “${d.title}”?`)) return;
    setDeleteError(null);
    try {
      await api(`/api/ai/decks/${d.id}`, { method: "DELETE" });
      setData((x) => (x ? { decks: x.decks.filter((y) => y.id !== d.id) } : x));
    } catch (err) {
      setDeleteError(errorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader
        title="Presentations"
        description="Made with AI, from a topic or from your school's records. Edit, present, or download as PowerPoint or PDF."
        icon={SLIDES_ICON}
        actions={
          ready && (
            <Link href="/app/slides/new" className={buttonClass("primary")}>
              <Icon d="M12 5v14M5 12h14" />
              New presentation
            </Link>
          )
        }
      />
      {status && !ready && status.state !== "quota" && (
        <div className="mb-6">
          <AiUnavailable />
        </div>
      )}
      {(error || deleteError) && <Alert>{error || deleteError}</Alert>}

      {loading && !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="aspect-[16/12] rounded-2xl" />
          ))}
        </div>
      ) : !data?.decks.length ? (
        ready && (
          <div className="rounded-3xl border border-dashed border-border bg-surface/60 p-6 sm:p-10">
            <p className="text-center text-lg font-semibold">Make your first presentation</p>
            <p className="mt-1 text-center text-sm text-muted">Pick a starting point. You can change everything afterwards.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {TEMPLATES.map((tp, i) => (
                <Link
                  key={tp.kind}
                  href={`/app/slides/new?kind=${tp.kind}`}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className="group rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md motion-safe:animate-rise"
                >
                  <span className={cx("grid size-10 place-items-center rounded-xl", tp.tone)}>
                    <Icon d={tp.icon} className="size-5" />
                  </span>
                  <p className="mt-3 font-semibold">{tp.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{tp.hint}</p>
                </Link>
              ))}
            </div>
          </div>
        )
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.decks.map((d, i) => (
            <li key={d.id} style={{ animationDelay: `${i * 40}ms` }} className="group relative overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md motion-safe:animate-rise">
              <Link href={`/app/slides/edit?id=${d.id}`} className="block">
                <div className="border-b border-border">{d.cover && <SlideFrame slide={d.cover} theme={d.theme} brand={brand} index={0} total={d.slides} />}</div>
                <div className="p-3.5">
                  <p className="truncate font-semibold">{d.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {KIND_LABEL[d.kind]} · {d.slides} slides · {timeAgo(d.updatedAt)}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => remove(d)}
                aria-label={`Delete ${d.title}`}
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-lg bg-background/80 text-muted opacity-0 backdrop-blur transition-opacity hover:text-danger focus:opacity-100 group-hover:opacity-100"
              >
                <Icon d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
