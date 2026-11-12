"use client";

// "Today at a glance" on the dashboard: the AI's short briefing of what needs attention,
// in the chat's reply language. Each point links to its page and can be asked about.
import Link from "next/link";
import { useEffect, useState } from "react";
import { openAsk } from "./ai-chat";
import { SPARKLE } from "./ai-welcome";
import { Icon, Skeleton, cx } from "./ui";
import { readChatLanguage, useAiStatus } from "@/lib/ai";
import { ApiError, api } from "@/lib/api";

interface Item {
  tone: "bad" | "warn" | "good" | "info";
  title: string;
  detail: string;
  link: string | null;
  ask: string | null;
}
interface Summary {
  headline: string;
  items: Item[];
  date: string;
  ai: boolean;
  generatedAt: string;
  refreshAfter: string;
}

const TONE = {
  bad: { dot: "bg-danger", tile: "bg-danger-soft text-danger", icon: "M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" },
  warn: { dot: "bg-warning", tile: "bg-warning-soft text-warning", icon: "M12 8v4M12 16h.01M12 21a9 9 0 100-18 9 9 0 000 18z" },
  good: { dot: "bg-success", tile: "bg-success-soft text-success", icon: "M5 12l5 5L20 7" },
  info: { dot: "bg-accent", tile: "bg-accent-soft text-accent", icon: "M12 16v-4M12 8h.01M12 21a9 9 0 100-18 9 9 0 000 18z" },
};

const LABEL = {
  en: { title: "Today at a glance", ask: "Ask", view: "View", refresh: "Refresh", preparing: "Reading today's records…", by: "AI summary", plain: "Summary" },
  hi: { title: "आज एक नज़र में", ask: "पूछें", view: "देखें", refresh: "फिर से", preparing: "आज का डेटा पढ़ रहे हैं…", by: "AI सारांश", plain: "सारांश" },
  mr: { title: "आज एका दृष्टीक्षेपात", ask: "विचारा", view: "पहा", refresh: "पुन्हा", preparing: "आजची माहिती वाचत आहे…", by: "AI सारांश", plain: "सारांश" },
};

const REFRESH_ICON = "M20 11a8 8 0 10-2.3 5.7M20 4v7h-7";

export function DailySummary() {
  const status = useAiStatus();
  const ready = status?.state === "ready" || status?.state === "quota";
  const [language] = useState(() => {
    const l = readChatLanguage();
    return l === "auto" ? "en" : l;
  });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const t = LABEL[language];

  const fetchSummary = (refresh: boolean) => api<{ summary: Summary }>(`/api/ai/summary?language=${language}${refresh ? "&refresh=1" : ""}`);
  const failed = (err: unknown) => setError(err instanceof ApiError ? err.message : "Couldn't load the summary.");

  async function refresh() {
    setRefreshing(true);
    try {
      setSummary((await fetchSummary(true)).summary);
      setError(null);
    } catch (err) {
      failed(err);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    fetchSummary(false)
      .then((r) => !cancelled && setSummary(r.summary))
      .catch((err) => !cancelled && failed(err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready || (error && !summary)) return null;
  const canRefresh = summary && new Date(summary.refreshAfter) < new Date();

  return (
    <section className="relative overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-accent-soft/70 via-surface to-surface p-4 shadow-sm motion-safe:animate-rise sm:p-5">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[conic-gradient(from_0deg,var(--accent),#8b5cf6,#10b981,var(--accent))] opacity-15 blur-3xl motion-safe:animate-spin-slow" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-violet-600 text-white shadow-md shadow-accent/25">
            <Icon d={SPARKLE} className={cx("size-5", !summary && "motion-safe:animate-spin-slow")} />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
              {t.title}
              <span className="rounded-full bg-surface px-1.5 py-px text-[10px] font-medium normal-case tracking-normal text-muted ring-1 ring-border">{summary && !summary.ai ? t.plain : t.by}</span>
            </p>
            {summary ? (
              <h2 className="mt-0.5 text-base font-semibold leading-snug text-balance sm:text-lg">{summary.headline}</h2>
            ) : (
              <p className="mt-1 bg-[linear-gradient(90deg,var(--muted)_20%,var(--foreground)_50%,var(--muted)_80%)] bg-[length:200%_100%] bg-clip-text text-sm font-medium text-transparent motion-safe:animate-shimmer motion-reduce:text-muted">
                {t.preparing}
              </p>
            )}
          </div>
        </div>
        {summary && (
          <button
            onClick={refresh}
            disabled={!canRefresh || refreshing}
            title={canRefresh ? t.refresh : `${t.refresh} · ${new Date(summary.refreshAfter).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-40"
          >
            <Icon d={REFRESH_ICON} className={cx("size-3.5", refreshing && "motion-safe:animate-spin")} />
            {t.refresh}
          </button>
        )}
      </div>

      <div className="relative mt-4">
        {!summary ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[72px] rounded-xl" />
            ))}
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {summary.items.map((it, i) => {
              const tone = TONE[it.tone];
              return (
                <li
                  key={i}
                  style={{ animationDelay: `${80 + i * 70}ms` }}
                  className="group flex gap-3 rounded-xl border border-border bg-surface/90 p-3 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md motion-safe:animate-rise"
                >
                  <span className={cx("grid size-8 shrink-0 place-items-center rounded-lg", tone.tile)}>
                    <Icon d={tone.icon} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{it.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{it.detail}</p>
                    {(it.link || it.ask) && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
                        {it.link && (
                          <Link href={it.link} className="text-accent hover:underline">
                            {t.view} →
                          </Link>
                        )}
                        {it.ask && (
                          <button onClick={() => openAsk(it.ask!)} className="inline-flex items-center gap-1 text-accent opacity-80 transition-opacity hover:opacity-100">
                            <Icon d={SPARKLE} className="size-3" />
                            {t.ask}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
