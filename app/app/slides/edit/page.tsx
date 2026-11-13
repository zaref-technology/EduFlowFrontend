"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Present } from "@/components/slides/present";
import { SlideFrame } from "@/components/slides/slide-view";
import { ThemePicker, useBrand } from "@/components/slides/common";
import { SlidePanel, area } from "@/components/slides/fields";
import { errorMessage } from "@/components/data";
import { Alert, Button, ICONS, Icon, Input, cx } from "@/components/ui";
import { WRITE_LANGUAGES, refreshAiStatus, useAiStatus, type WriteLanguage } from "@/lib/ai";
import { api } from "@/lib/api";
import { exportPdf, exportPptx } from "@/lib/slides-export";
import { DECK_UNITS, LAYOUT_LABEL, blankSlide, isLocked, type Deck, type Layout, type Slide } from "@/lib/slides";

const SPARK = "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z";
const MAX = 20;
type Snapshot = Pick<Deck, "title" | "theme" | "slides" | "language">;

export default function DeckPage() {
  return (
    <Suspense fallback={null}>
      <DeckEditor />
    </Suspense>
  );
}

/** Undo/redo: snapshots before each change; typing in one field within a second is one step. */
function useHistory() {
  const h = useRef({ past: [] as Snapshot[], future: [] as Snapshot[], lastKey: "", lastAt: 0 });
  const [, bump] = useState(0);
  return {
    record(before: Snapshot, key?: string) {
      const now = Date.now();
      if (!(key && key === h.current.lastKey && now - h.current.lastAt < 1000)) {
        h.current.past = [...h.current.past.slice(-79), before];
        h.current.future = [];
        bump((x) => x + 1);
      }
      h.current.lastKey = key ?? "";
      h.current.lastAt = now;
    },
    undo(current: Snapshot) {
      const prev = h.current.past.at(-1);
      if (!prev) return null;
      h.current.past = h.current.past.slice(0, -1);
      h.current.future = [current, ...h.current.future];
      h.current.lastKey = "";
      bump((x) => x + 1);
      return prev;
    },
    redo(current: Snapshot) {
      const next = h.current.future[0];
      if (!next) return null;
      h.current.future = h.current.future.slice(1);
      h.current.past = [...h.current.past, current];
      h.current.lastKey = "";
      bump((x) => x + 1);
      return next;
    },
    get canUndo() {
      return h.current.past.length > 0;
    },
    get canRedo() {
      return h.current.future.length > 0;
    },
  };
}

const snap = (d: Deck): Snapshot => ({ title: d.title, theme: d.theme, slides: d.slides, language: d.language });

function DeckEditor() {
  const id = useSearchParams().get("id") ?? "";
  const brand = useBrand();
  const status = useAiStatus();
  const aiReady = status?.state === "ready";
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [view, setView] = useState<"edit" | "grid">("edit");
  const [save, setSave] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [presenting, setPresenting] = useState(false);
  const [exporting, setExporting] = useState<"pptx" | "pdf" | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [menu, setMenu] = useState<"add-thumb" | "add-bar" | "translate" | "keys" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<Deck | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const history = useHistory();
  const dragFrom = useRef<number | null>(null);
  const chartPanel = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ deck: Deck }>(`/api/ai/decks/${id}`)
      .then((r) => {
        if (cancelled) return;
        latest.current = r.deck;
        setDeck(r.deck);
      })
      .catch((err) => !cancelled && setLoadError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const d = latest.current;
    if (!d) return;
    setSave("saving");
    try {
      await api(`/api/ai/decks/${d.id}`, { method: "PATCH", body: { title: d.title, theme: d.theme, slides: d.slides } });
      setSave((s) => (s === "saving" ? "saved" : s));
    } catch (err) {
      setSave("error");
      setError(errorMessage(err));
    }
  }, []);

  // Save what's left when leaving: another page in the app, the tab hidden, or closing/reloading
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && timer.current) flush();
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!timer.current) return;
      flush();
      e.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
      if (timer.current) flush();
    };
  }, [flush]);

  const schedule = () => {
    setSave("unsaved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 900);
  };

  /** Changes the deck (one undo step; `key` merges quick typing in one field) and saves a moment later. */
  const change = (fn: (d: Deck) => Deck, key?: string) => {
    const d = latest.current;
    if (!d) return;
    history.record(snap(d), key);
    const next = fn(d);
    latest.current = next;
    setDeck(next);
    schedule();
  };
  /** A deck the server already saved (AI changes): one undo step, nothing to save. */
  const accept = (next: Deck) => {
    if (latest.current) history.record(snap(latest.current));
    latest.current = next;
    setDeck(next);
  };
  const restore = (s: Snapshot | null) => {
    if (!s || !latest.current) return;
    const next = { ...latest.current, ...s };
    latest.current = next;
    setDeck(next);
    setCurrent((c) => Math.min(c, s.slides.length - 1));
    schedule();
  };
  const undo = () => latest.current && restore(history.undo(snap(latest.current)));
  const redo = () => latest.current && restore(history.redo(snap(latest.current)));

  const idx = deck ? Math.min(current, deck.slides.length - 1) : 0;
  const setSlide = (i: number, patch: Partial<Slide>, key?: string) => change((d) => ({ ...d, slides: d.slides.map((s, k) => (k === i ? { ...s, ...patch } : s)) }), key);
  const moveTo = (from: number, to: number) => {
    if (!deck || from === to || to < 0 || to >= deck.slides.length) return;
    change((d) => {
      const s = [...d.slides];
      const [x] = s.splice(from, 1);
      s.splice(to, 0, x);
      return { ...d, slides: s };
    });
    setCurrent(to);
  };
  const insert = (slide: Slide) => {
    if (!deck || deck.slides.length >= MAX) return;
    change((d) => ({ ...d, slides: [...d.slides.slice(0, idx + 1), slide, ...d.slides.slice(idx + 1)] }));
    setCurrent(idx + 1);
    setView("edit");
  };
  const duplicate = () => deck && insert(structuredClone(deck.slides[idx]));
  const remove = () => {
    if (!deck || deck.slides.length <= 1) return;
    change((d) => ({ ...d, slides: d.slides.filter((_, k) => k !== idx) }));
    setCurrent(Math.max(0, idx - 1));
  };

  // Keyboard: ↑/↓ slides, Ctrl+Z / Ctrl+Shift+Z, Ctrl+D duplicate, Delete, Ctrl+Enter present
  // The latest handlers for the key listener registered once (state setters never change)
  const keys = useRef({ undo, redo, duplicate, remove, deck, idx, presenting });
  useEffect(() => {
    keys.current = { undo, redo, duplicate, remove, deck, idx, presenting };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current;
      if (!k.deck || k.presenting) return;
      const el = e.target as HTMLElement;
      const typing = el.closest("input, textarea, select, [contenteditable]:not([contenteditable=false])");
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) k.redo();
        else k.undo();
      } else if (mod && e.key.toLowerCase() === "y" && !typing) {
        e.preventDefault();
        k.redo();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        k.duplicate();
      } else if (mod && e.key === "Enter") {
        e.preventDefault();
        setPresenting(true);
      } else if (typing || mod) {
        return;
      } else if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        setCurrent(Math.min(k.idx + 1, k.deck.slides.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setCurrent(Math.max(k.idx - 1, 0));
      } else if (e.key === "Delete") {
        k.remove();
      } else if (e.key === "?") {
        setMenu((m) => (m === "keys" ? null : "keys"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function download(kind: "pptx" | "pdf") {
    if (!deck) return;
    setExporting(kind);
    setError(null);
    try {
      if (kind === "pptx") await exportPptx(deck, brand);
      else await exportPdf(deck, brand);
    } catch (err) {
      setError(`Couldn't make the ${kind === "pptx" ? "PowerPoint" : "PDF"} file: ${errorMessage(err)}`);
    } finally {
      setExporting(null);
    }
  }

  /** Runs an AI change on the server (after saving any pending edits). */
  async function ai(label: string, run: () => Promise<{ deck: Deck; index?: number }>) {
    setAiBusy(label);
    setError(null);
    setMenu(null);
    try {
      if (timer.current) await flush();
      const r = await run();
      accept(r.deck);
      if (r.index !== undefined) setCurrent(r.index);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setAiBusy(null);
      refreshAiStatus();
    }
  }
  const translate = (language: WriteLanguage) => {
    const name = WRITE_LANGUAGES.find((l) => l.id === language)?.label;
    if (!confirm(`Translate every slide into ${name}? Uses ${DECK_UNITS.translate} AI questions. Numbers and names stay the same; you can undo it.`)) return;
    ai("translate", () => api<{ deck: Deck }>(`/api/ai/decks/${id}/translate`, { method: "POST", body: { language } }));
  };

  if (loadError)
    return (
      <div className="space-y-3">
        <Alert>{loadError}</Alert>
        <Link href="/app/slides" className="text-sm font-medium text-accent hover:underline">
          ← All presentations
        </Link>
      </div>
    );
  if (!deck)
    return (
      <div className="grid gap-5 lg:grid-cols-[150px_minmax(0,1fr)_320px]">
        <div className="hidden space-y-2 lg:block">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-video animate-pulse rounded-md bg-surface-muted" />
          ))}
        </div>
        <div className="aspect-video animate-pulse rounded-2xl bg-surface-muted" />
        <div className="h-80 animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    );

  const slide = deck.slides[idx];
  const locked = isLocked(slide, deck.kind);
  const full = deck.slides.length >= MAX;

  return (
    <div>
      {/* Top bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/app/slides" aria-label="All presentations" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground">
          <Icon d={ICONS.chevronLeft} />
        </Link>
        <input
          value={deck.title}
          onChange={(e) => change((d) => ({ ...d, title: e.target.value }), "deck-title")}
          onBlur={() => !deck.title.trim() && change((d) => ({ ...d, title: "Presentation" }))}
          maxLength={140}
          aria-label="Presentation title"
          className="min-w-0 flex-1 basis-48 rounded-lg bg-transparent px-2 py-1 text-xl font-semibold tracking-tight outline-none hover:bg-surface-muted focus:bg-surface focus:ring-2 focus:ring-accent/20"
        />
        <span className={cx("text-xs", save === "error" ? "text-danger" : "text-muted")} aria-live="polite">
          {save === "saving" ? "Saving…" : save === "unsaved" ? "Unsaved" : save === "error" ? "Not saved" : "Saved"}
        </span>
        <div className="flex items-center rounded-lg border border-border bg-surface">
          <IconButton label="Undo (Ctrl+Z)" icon="M9 14L4 9l5-5M4 9h11a5 5 0 010 10h-3" onClick={undo} disabled={!history.canUndo} />
          <IconButton label="Redo (Ctrl+Shift+Z)" icon="M15 14l5-5-5-5M20 9H9a5 5 0 000 10h3" onClick={redo} disabled={!history.canRedo} />
        </div>
        <div className="flex items-center rounded-lg border border-border bg-surface">
          <IconButton label="Slide editor" icon="M3 5h18v14H3zM3 9h18" onClick={() => setView("edit")} pressed={view === "edit"} />
          <IconButton label="All slides (grid)" icon="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" onClick={() => setView("grid")} pressed={view === "grid"} />
        </div>
        {aiReady && (
          <div className="relative">
            <Button variant="secondary" size="sm" onClick={() => setMenu(menu === "translate" ? null : "translate")} loading={aiBusy === "translate"} disabled={aiBusy !== null}>
              <Icon d="M4 5h8M8 3v2M6 5c0 4 3 7 6 8M10 5c-1 4-4 7-7 8M13 21l4-10 4 10M14.5 17h5" />
              Translate
            </Button>
            {menu === "translate" && (
              <Popover onClose={() => setMenu(null)}>
                <p className="px-3 pb-1 pt-2 text-xs text-muted">Translate all slides into · {DECK_UNITS.translate} AI questions</p>
                {WRITE_LANGUAGES.filter((l) => l.id !== deck.language).map((l) => (
                  <MenuItem key={l.id} onClick={() => translate(l.id)}>
                    {l.label}
                  </MenuItem>
                ))}
              </Popover>
            )}
          </div>
        )}
        <Button variant="secondary" size="sm" onClick={() => download("pptx")} loading={exporting === "pptx"} disabled={exporting !== null}>
          <Icon d={ICONS.download} />
          PowerPoint
        </Button>
        <Button variant="secondary" size="sm" onClick={() => download("pdf")} loading={exporting === "pdf"} disabled={exporting !== null}>
          <Icon d={ICONS.download} />
          PDF
        </Button>
        <Button size="sm" onClick={() => setPresenting(true)} title="Present (Ctrl+Enter)">
          <Icon d="M8 5v14l11-7z" />
          Present
        </Button>
        <div className="relative">
          <IconButton label="Keyboard shortcuts (?)" icon="M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M7 14h10" onClick={() => setMenu(menu === "keys" ? null : "keys")} bordered />
          {menu === "keys" && (
            <Popover onClose={() => setMenu(null)} align="right">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 p-3 text-xs">
                {[
                  ["↑ ↓", "Previous / next slide"],
                  ["Ctrl Z", "Undo"],
                  ["Ctrl Shift Z", "Redo"],
                  ["Ctrl D", "Duplicate slide"],
                  ["Delete", "Delete slide"],
                  ["Ctrl Enter", "Present"],
                  ["N", "Notes while presenting"],
                ].map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt>
                      <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-sans text-[10px]">{k}</kbd>
                    </dt>
                    <dd className="text-muted">{v}</dd>
                  </div>
                ))}
              </dl>
            </Popover>
          )}
        </div>
      </div>
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {aiBusy && aiBusy !== "translate" && aiBusy !== "rewrite" && (
        <p className="mb-3 flex items-center gap-2 text-sm text-muted" aria-live="polite">
          <span className="size-4 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
          Writing a new slide…
        </p>
      )}
      {aiBusy === "translate" && (
        <p className="mb-3 flex items-center gap-2 text-sm text-muted" aria-live="polite">
          <span className="size-4 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
          Translating every slide…
        </p>
      )}

      {view === "grid" ? (
        // All slides: drag to reorder, click to open
        <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {deck.slides.map((s, i) => (
            <li
              key={i}
              draggable
              onDragStart={() => (dragFrom.current = i)}
              onDragOver={(e) => (e.preventDefault(), setDragOver(i))}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => {
                if (dragFrom.current !== null) moveTo(dragFrom.current, i);
                dragFrom.current = null;
                setDragOver(null);
              }}
              className={cx("group cursor-grab rounded-xl p-1.5 transition-all active:cursor-grabbing", dragOver === i ? "bg-accent-soft ring-2 ring-accent" : "hover:bg-surface-muted", i === idx && "ring-2 ring-accent/50")}
            >
              <button onClick={() => (setCurrent(i), setView("edit"))} className="block w-full overflow-hidden rounded-lg text-left shadow-sm ring-1 ring-border" aria-label={`Slide ${i + 1}: ${s.title}`}>
                <SlideFrame slide={s} theme={deck.theme} brand={brand} index={i} total={deck.slides.length} />
              </button>
              <p className="mt-1.5 flex items-center gap-1.5 px-1 text-xs text-muted">
                <span className="tabular-nums">{i + 1}</span>
                <span className="truncate">{s.title || LAYOUT_LABEL[s.layout]}</span>
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[150px_minmax(0,1fr)_320px]">
          {/* Thumbnails: click, drag to reorder */}
          <ol className="flex gap-2 overflow-x-auto pb-2 lg:max-h-[calc(100dvh-12rem)] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:pb-0 lg:pr-1">
            {deck.slides.map((s, i) => (
              <li
                key={i}
                className={cx("shrink-0 rounded-lg transition-colors", dragOver === i && "bg-accent-soft")}
                draggable
                onDragStart={() => (dragFrom.current = i)}
                onDragOver={(e) => (e.preventDefault(), setDragOver(i))}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => {
                  if (dragFrom.current !== null) moveTo(dragFrom.current, i);
                  dragFrom.current = null;
                  setDragOver(null);
                }}
              >
                <button
                  onClick={() => setCurrent(i)}
                  aria-label={`Slide ${i + 1}: ${s.title}`}
                  aria-current={i === idx ? "true" : undefined}
                  className={cx("flex items-start gap-1.5 rounded-lg p-1 text-left transition-colors", i === idx ? "bg-accent-soft" : "hover:bg-surface-muted")}
                >
                  <span className="w-4 pt-0.5 text-right text-[10px] tabular-nums text-muted">{i + 1}</span>
                  <span className={cx("overflow-hidden rounded-md ring-2", i === idx ? "ring-accent" : "ring-border")}>
                    <SlideFrame slide={s} theme={deck.theme} brand={brand} index={i} total={deck.slides.length} width={120} />
                  </span>
                </button>
              </li>
            ))}
            <li className="relative shrink-0">
              <button onClick={() => setMenu(menu === "add-thumb" ? null : "add-thumb")} disabled={full || aiBusy !== null} className="ml-5 grid h-[68px] w-[120px] place-items-center rounded-md border border-dashed border-border text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-40">
                + Slide
              </button>
              {menu === "add-thumb" && <AddMenu place="side" onPick={(l) => (insert(blankSlide(l)), setMenu(null))} onAi={aiReady ? (text) => ai("insert", () => api<{ deck: Deck; index: number }>(`/api/ai/decks/${id}/slides`, { method: "POST", body: { after: idx, instruction: text } })) : undefined} onClose={() => setMenu(null)} />}
            </li>
          </ol>

          {/* The slide */}
          <div className="min-w-0 space-y-3">
            <div className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-border">
              {/* Click any text to edit it in place */}
              <SlideFrame
                key={idx}
                slide={slide}
                theme={deck.theme}
                brand={brand}
                index={idx}
                total={deck.slides.length}
                edit={{
                  locked,
                  onChange: (p) => setSlide(idx, p, `slide-${idx}-${Object.keys(p).join()}`),
                  onChart: () => {
                    chartPanel.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    chartPanel.current?.animate([{ boxShadow: "0 0 0 0 var(--accent)" }, { boxShadow: "0 0 0 6px color-mix(in oklab, var(--accent) 35%, transparent)" }, { boxShadow: "0 0 0 0 transparent" }], { duration: 900 });
                  },
                }}
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <ToolButton label="Move up" icon="M15 6l-6 6 6 6" onClick={() => moveTo(idx, idx - 1)} disabled={idx === 0} />
              <ToolButton label="Move down" icon="M9 6l6 6-6 6" onClick={() => moveTo(idx, idx + 1)} disabled={idx === deck.slides.length - 1} />
              <ToolButton label="Duplicate (Ctrl+D)" icon="M9 9h11v11H9zM5 15H4V4h11v1" onClick={duplicate} disabled={full} />
              <ToolButton label="Delete slide" icon="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" onClick={remove} disabled={deck.slides.length <= 1} danger />
              <div className="relative">
                <Button variant="secondary" size="sm" onClick={() => setMenu(menu === "add-bar" ? null : "add-bar")} disabled={full || aiBusy !== null}>
                  <Icon d="M12 5v14M5 12h14" />
                  Add slide
                </Button>
                {menu === "add-bar" && <AddMenu place="below" onPick={(l) => (insert(blankSlide(l)), setMenu(null))} onAi={aiReady ? (text) => ai("insert", () => api<{ deck: Deck; index: number }>(`/api/ai/decks/${id}/slides`, { method: "POST", body: { after: idx, instruction: text } })) : undefined} onClose={() => setMenu(null)} />}
              </div>
              <span className="ml-auto text-xs text-muted">
                Slide {idx + 1} of {deck.slides.length}
                {full ? " · full" : ""}
              </span>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">Speaker notes</span>
              <textarea value={slide.notes ?? ""} onChange={(e) => setSlide(idx, { notes: e.target.value }, `notes-${idx}`)} rows={3} maxLength={2000} placeholder="What to say on this slide" className={area} />
            </label>
          </div>

          {/* Editing panel */}
          <aside className="space-y-4">
            <section className="rounded-2xl border border-border bg-surface p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">This slide</p>
              <SlidePanel key={`${idx}-${slide.layout}-${locked}`} slide={slide} locked={locked} onChange={(p) => setSlide(idx, p, `panel-${idx}-${Object.keys(p).join()}`)} onUnlock={() => setSlide(idx, { fromRecords: false })} chartRef={chartPanel} />
            </section>
            {aiReady && <Rewrite busy={aiBusy !== null} dataSlide={locked || Boolean(slide.chart)} onRun={(text) => ai("rewrite", () => api<{ deck: Deck }>(`/api/ai/decks/${id}/slides/${idx}/regenerate`, { method: "POST", body: { instruction: text } }))} running={aiBusy === "rewrite"} />}
            <section className="rounded-2xl border border-border bg-surface p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Theme</p>
              <ThemePicker value={deck.theme} onChange={(theme) => change((d) => ({ ...d, theme }))} brand={brand} compact />
            </section>
          </aside>
        </div>
      )}

      {presenting && (
        <Present
          deck={deck}
          brand={brand}
          start={idx}
          onClose={(at) => {
            setPresenting(false);
            setCurrent(at);
          }}
        />
      )}
    </div>
  );
}

function IconButton({ label, icon, onClick, disabled, pressed, bordered }: { label: string; icon: string; onClick: () => void; disabled?: boolean; pressed?: boolean; bordered?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      className={cx("grid size-8 place-items-center rounded-lg text-muted transition-colors hover:text-foreground disabled:opacity-30", pressed && "bg-accent-soft text-accent", bordered && "border border-border bg-surface")}
    >
      <Icon d={icon} className="size-4" />
    </button>
  );
}

function ToolButton({ label, icon, onClick, disabled, danger }: { label: string; icon: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={label} aria-label={label} className={cx("grid size-8 place-items-center rounded-lg border border-border bg-surface text-muted transition-colors hover:text-foreground disabled:opacity-30", danger && "hover:text-danger")}>
      <Icon d={icon} className="size-4" />
    </button>
  );
}

function Popover({ children, onClose, align = "left" }: { children: ReactNode; onClose: () => void; align?: "left" | "right" }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <>
      <button aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
      <div className={cx("absolute top-full z-50 mt-1 min-w-48 overflow-hidden rounded-xl border border-border bg-background shadow-xl motion-safe:animate-pop", align === "right" ? "right-0" : "left-0")}>{children}</div>
    </>
  );
}

function MenuItem({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-muted">
      {children}
    </button>
  );
}

const ADD_LAYOUTS: { layout: Layout; icon: string }[] = [
  { layout: "bullets", icon: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" },
  { layout: "two_column", icon: "M4 5h7v14H4zM13 5h7v14h-7z" },
  { layout: "stats", icon: "M4 19V9M10 19V5M16 19v-7M22 19H2" },
  { layout: "table", icon: "M3 5h18v14H3zM3 10h18M3 15h18M9 5v14" },
  { layout: "chart", icon: "M4 19h16M7 16V9M12 16V5M17 16v-4" },
  { layout: "quote", icon: "M7 7h4v4H7zM7 11c0 3-1 5-3 6M15 7h4v4h-4zM15 11c0 3-1 5-3 6" },
  { layout: "section", icon: "M4 12h16M4 6h10M4 18h10" },
];

/** New slide: a layout to fill in, or one written by the AI from a sentence. */
function AddMenu({ onPick, onAi, onClose, place }: { onPick: (l: Layout) => void; onAi?: (text: string) => void; onClose: () => void; place: "side" | "below" }) {
  const [text, setText] = useState("");
  const panel = (
    <div className={cx("absolute z-50 w-72 rounded-2xl border border-border bg-background p-3 shadow-2xl motion-safe:animate-pop", place === "side" ? "left-0 top-full mt-1 lg:bottom-0 lg:left-full lg:top-auto lg:ml-2 lg:mt-0" : "left-0 top-full mt-1")}>
      {onAi && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim().length >= 3) onAi(text.trim());
          }}
          className="mb-3 rounded-xl border border-accent/30 bg-accent-soft/50 p-2.5"
        >
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
            <Icon d={SPARK} className="size-3.5 text-accent" />
            Write a slide with AI · {DECK_UNITS.insert} question
          </p>
          <div className="flex gap-1.5">
            <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="e.g. a 3-question quiz" className="h-8 text-xs" />
            <Button type="submit" size="sm" className="h-8 shrink-0" disabled={text.trim().length < 3}>
              Add
            </Button>
          </div>
        </form>
      )}
      <p className="mb-1.5 px-1 text-[11px] font-medium uppercase tracking-wide text-muted">Or start from a layout</p>
      <div className="grid grid-cols-2 gap-1">
        {ADD_LAYOUTS.map(({ layout, icon }) => (
          <button key={layout} onClick={() => onPick(layout)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-surface-muted">
            <span className="grid size-6 place-items-center rounded-md bg-surface-muted text-accent">
              <Icon d={icon} className="size-3.5" />
            </span>
            {LAYOUT_LABEL[layout]}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <>
      <button aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
      {panel}
    </>
  );
}

/** "Rewrite with AI" for the current slide. */
function Rewrite({ dataSlide, busy, running, onRun }: { dataSlide: boolean; busy: boolean; running: boolean; onRun: (instruction: string) => void }) {
  const [instruction, setInstruction] = useState("");
  const ideas = dataSlide ? ["Simpler words", "Explain for parents"] : ["Simpler words", "More engaging", "Add an example", "Shorter"];
  return (
    <section className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent-soft/60 to-surface p-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <Icon d={SPARK} className={cx("size-4 text-accent", running && "motion-safe:animate-spin-slow")} />
        Rewrite with AI
      </p>
      <div className="mb-2 flex flex-wrap gap-1">
        {ideas.map((x) => (
          <button key={x} type="button" disabled={busy} onClick={() => onRun(x)} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs transition-colors hover:border-accent/40 disabled:opacity-50">
            {x}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && (onRun(instruction), setInstruction(""))} maxLength={300} placeholder="Or say what to change" className="h-9" />
        <Button size="sm" onClick={() => (onRun(instruction), setInstruction(""))} loading={running} disabled={busy} className="h-9 shrink-0">
          Go
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted">
        {DECK_UNITS.slide} AI question.{dataSlide ? " The numbers stay the same." : ""} Undo with Ctrl+Z.
      </p>
    </section>
  );
}
