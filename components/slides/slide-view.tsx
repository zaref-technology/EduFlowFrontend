"use client";

// One slide, drawn on a fixed 1280×720 canvas and scaled to the width it's given, so the
// thumbnail, the editor, present mode and the PDF export all look the same. In the editor
// (`edit`), every piece of text on the slide can be clicked and typed into directly.
import { createContext, createElement, useContext, useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent, type CSSProperties, type ElementType, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { THEMES, formatValue, type Slide, type Theme, type ThemeId } from "@/lib/slides";

export const SLIDE_W = 1280;
export const SLIDE_H = 720;

/**
 * Keeps long text on the slide: if the content is taller than its box, it's zoomed down
 * (to at most half size) until it fits. Measured after every render, so edits re-fit.
 */
function Fit({ style, children }: { style: CSSProperties; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    let z = 1;
    i.style.zoom = "1";
    const limit = o.getBoundingClientRect().height + 1;
    while (z > 0.5 && i.getBoundingClientRect().height > limit) {
      z = Math.round((z - 0.05) * 100) / 100;
      i.style.zoom = String(z);
    }
  });
  return (
    <div ref={outer} style={{ ...style, overflow: "hidden" }}>
      <div ref={inner} style={{ display: "flex", flexDirection: "column", minHeight: "100%", justifyContent: style.justifyContent, alignItems: style.alignItems, textAlign: style.textAlign }}>
        {children}
      </div>
    </div>
  );
}

export interface Brand {
  name: string;
  logoUrl?: string;
}

/** What the editor passes to make the slide editable in place. */
export interface SlideEdit {
  onChange: (patch: Partial<Slide>) => void;
  /** Numbers from the school's records: values and table cells can't be typed over */
  locked: boolean;
  /** The chart was clicked (its data is edited beside the slide) */
  onChart?: () => void;
  /** The picture (or its empty spot) was clicked */
  onImage?: () => void;
}

// ---------------------------------------------------------------------------
// In-place editing
// ---------------------------------------------------------------------------

type Path = (string | number)[];
interface EditApi extends SlideEdit {
  slide: Slide;
  set: (path: Path, value: string) => void;
  addItem: (list: Path, at: number) => void;
  removeItem: (list: Path, at: number) => void;
}
const EditCtx = createContext<EditApi | null>(null);
// The slide being drawn, for its text everywhere (thumbnails, present mode, PDF), not only the editor
const SlideCtx = createContext<Slide | null>(null);

const getIn = (obj: unknown, path: Path): unknown => path.reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string | number, unknown>)[k]), obj);
function setIn(obj: unknown, path: Path, value: unknown): unknown {
  if (!path.length) return value;
  const [k, ...rest] = path;
  const base = Array.isArray(obj) ? [...obj] : { ...((obj as Record<string, unknown>) ?? {}) };
  (base as Record<string | number, unknown>)[k] = setIn((obj as Record<string | number, unknown> | undefined)?.[k], rest, value);
  return base;
}
const keyOf = (path: Path) => path.join(".");

/** Puts the caret at the end of an editable element. */
function focusEnd(key: string) {
  setTimeout(() => {
    const el = document.querySelector<HTMLElement>(`[data-edit="${key}"]`);
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, 30);
}

function EditProvider({ slide, edit, children }: { slide: Slide; edit?: SlideEdit; children: ReactNode }) {
  if (!edit) return <SlideCtx.Provider value={slide}>{children}</SlideCtx.Provider>;
  const top = (path: Path, value: unknown) => edit.onChange({ [path[0]]: setIn(slide[path[0] as keyof Slide], path.slice(1), value) } as Partial<Slide>);
  const api: EditApi = {
    ...edit,
    slide,
    set: (path, value) => top(path, value),
    addItem: (list, at) => {
      const items = [...((getIn(slide, list) as string[]) ?? [])];
      if (items.length >= 8) return;
      items.splice(at, 0, "");
      top(list, items);
      focusEnd(keyOf([...list, at]));
    },
    removeItem: (list, at) => {
      const items = [...((getIn(slide, list) as string[]) ?? [])];
      if (items.length <= 1) return;
      items.splice(at, 1);
      top(list, items);
      focusEnd(keyOf([...list, Math.max(0, at - 1)]));
    },
  };
  return (
    <SlideCtx.Provider value={slide}>
      <EditCtx.Provider value={api}>{children}</EditCtx.Provider>
    </SlideCtx.Provider>
  );
}

/**
 * Text on the slide. In the editor it can be clicked and typed into; elsewhere it's plain.
 * `list` makes it one item of a list: Enter adds the next item, Backspace on an empty one removes it.
 */
function T({ path, as = "span", style, placeholder, list, readOnly }: { path: Path; as?: string; style?: CSSProperties; placeholder?: string; list?: { path: Path; index: number }; readOnly?: boolean }) {
  const ed = useContext(EditCtx);
  const value = String(getIn(useContext(SlideCtx), path) ?? "");
  if (!ed || readOnly) return createElement(as, { style }, value);
  return <Editable key={keyOf(path)} as={as} style={style} value={value} placeholder={placeholder} id={keyOf(path)} onInput={(v) => ed.set(path, v)} onEnter={list ? () => ed.addItem(list.path, list.index + 1) : undefined} onEmptyBackspace={list ? () => ed.removeItem(list.path, list.index) : undefined} />;
}

/** A contentEditable element React doesn't re-render while you type (so the caret stays put). */
function Editable({ as, style, value, placeholder, id, onInput, onEnter, onEmptyBackspace }: { as: string; style?: CSSProperties; value: string; placeholder?: string; id: string; onInput: (v: string) => void; onEnter?: () => void; onEmptyBackspace?: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const [initial] = useState(value);
  // Changes from outside (undo, AI rewrite, translate) while not being typed in
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerText !== value) el.innerText = value;
  }, [value]);
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const el = e.currentTarget;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (onEnter) onEnter();
      else el.blur();
    } else if (e.key === "Backspace" && onEmptyBackspace && !el.innerText.trim()) {
      e.preventDefault();
      onEmptyBackspace();
    } else if (e.key === "Escape") {
      e.preventDefault();
      el.blur();
    }
  };
  const Tag = as as ElementType;
  return (
    <Tag
      ref={ref}
      style={{ ...style, minWidth: 40 }}
      className="slide-edit"
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck
      data-edit={id}
      data-ph={placeholder ?? "Type here"}
      onKeyDown={onKeyDown}
      onInput={(e: FormEvent<HTMLElement>) => {
        const el = e.currentTarget;
        // An emptied field shows its placeholder again
        if (!el.innerText.trim() && el.innerHTML) el.innerHTML = "";
        onInput(el.innerText.replace(/\n+$/, ""));
      }}
      onPaste={(e: ClipboardEvent<HTMLElement>) => {
        e.preventDefault();
        document.execCommand("insertText", false, e.clipboardData.getData("text/plain").replace(/\s*\n\s*/g, " "));
      }}
      // Clicks on text don't also hit what's under it (e.g. the chart)
      onClick={(e: MouseEvent) => e.stopPropagation()}
    >
      {initial}
    </Tag>
  );
}

/** Optional text: shown when it has something, or (in the editor) as a faint "add …" spot. */
function useShown(value?: string) {
  const ed = useContext(EditCtx);
  return Boolean(value) || Boolean(ed);
}

// ---------------------------------------------------------------------------
// Slide
// ---------------------------------------------------------------------------

/** A slide at `width` pixels wide (or filling its container when width is omitted). */
export function SlideFrame({ slide, theme, brand, index, total, width, className, edit }: { slide: Slide; theme: ThemeId; brand: Brand; index: number; total: number; width?: number; className?: string; edit?: SlideEdit }) {
  const box = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(width ?? 0);
  useEffect(() => {
    if (width || !box.current) return;
    const el = box.current;
    const ro = new ResizeObserver(() => setMeasured(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  const w = width ?? measured;
  const scale = w / SLIDE_W;
  return (
    <div ref={box} className={className} style={{ width: width ?? "100%", aspectRatio: "16 / 9", position: "relative", overflow: "hidden" }}>
      {w > 0 && (
        <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: "top left", position: "absolute", inset: 0 }}>
          <SlideCanvas slide={slide} theme={THEMES[theme]} brand={brand} index={index} total={total} edit={edit} />
        </div>
      )}
    </div>
  );
}

/** The slide at full size (1280×720), e.g. for the PDF export. */
export function SlideCanvas({ slide, theme: t, brand, index, total, edit }: { slide: Slide; theme: Theme; brand: Brand; index: number; total: number; edit?: SlideEdit }) {
  const base: CSSProperties = {
    width: SLIDE_W,
    height: SLIDE_H,
    background: t.bg,
    color: t.fg,
    position: "relative",
    overflow: "hidden",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Noto Sans', 'Noto Sans Devanagari', 'Nirmala UI', sans-serif",
  };
  const hero = slide.layout === "title" || slide.layout === "closing";
  return (
    <EditProvider slide={slide} edit={edit}>
      <div style={base}>
        {/* Soft shapes in the theme's colours */}
        <div aria-hidden style={{ position: "absolute", right: -160, top: -160, width: 520, height: 520, borderRadius: "50%", background: t.accent, opacity: t.dark ? 0.16 : 0.08 }} />
        <div aria-hidden style={{ position: "absolute", left: -120, bottom: -200, width: 420, height: 420, borderRadius: "50%", background: t.accent2, opacity: t.dark ? 0.12 : 0.06 }} />
        {hero ? <Hero slide={slide} t={t} brand={brand} /> : <Body slide={slide} t={t} />}
        {!hero && (
          <div style={{ position: "absolute", left: 64, right: 64, bottom: 28, display: "flex", alignItems: "center", gap: 12, fontSize: 16, color: t.muted }}>
            {/* A plain <img>: the slide is also captured for the PDF, which next/image would get in the way of */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {brand.logoUrl && <img src={brand.logoUrl} alt="" crossOrigin="anonymous" style={{ height: 26, width: "auto", objectFit: "contain" }} />}
            <span style={{ flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{brand.name}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {index + 1} / {total}
            </span>
          </div>
        )}
      </div>
    </EditProvider>
  );
}

function Hero({ slide, t, brand }: { slide: Slide; t: Theme; brand: Brand }) {
  const closing = slide.layout === "closing";
  const ed = useContext(EditCtx);
  const subtitle = { fontSize: 30, color: t.muted, marginTop: 24, marginBottom: 0, maxWidth: 950, lineHeight: 1.3 };
  return (
    <Fit style={{ position: "absolute", left: 110, right: 110, top: 50, bottom: 50, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: closing ? "center" : "left", alignItems: closing ? "center" : "flex-start" }}>
      {brand.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={brand.logoUrl} alt="" crossOrigin="anonymous" style={{ height: 72, width: "auto", maxWidth: 260, objectFit: "contain", marginBottom: 36 }} />
      ) : (
        <div style={{ fontSize: 22, fontWeight: 700, color: t.accent, marginBottom: 28, letterSpacing: 1 }}>{brand.name}</div>
      )}
      <div style={{ width: 96, height: 8, borderRadius: 4, background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})`, marginBottom: 32 }} />
      <T path={["title"]} as="h1" placeholder="Add a title" style={{ fontSize: closing ? 76 : 68, lineHeight: 1.08, fontWeight: 800, margin: 0, letterSpacing: -1.5, maxWidth: 1000 }} />
      {ed ? (
        <T path={["subtitle"]} as="p" placeholder={closing ? "Add a line (optional)" : "Add a subtitle"} style={subtitle} />
      ) : (
        (slide.subtitle || (!closing && brand.logoUrl)) && <p style={subtitle}>{slide.subtitle || brand.name}</p>
      )}
      {closing && slide.bullets?.length ? <p style={{ fontSize: 26, color: t.muted, marginTop: 20 }}>{slide.bullets.join(" · ")}</p> : null}
    </Fit>
  );
}

function Title({ t, size = 46 }: { t: Theme; size?: number }) {
  return (
    <div style={{ marginBottom: 34 }}>
      <T path={["title"]} as="h2" placeholder="Add a title" style={{ fontSize: size, lineHeight: 1.15, fontWeight: 800, margin: 0, letterSpacing: -0.8, display: "block" }} />
      <div style={{ width: 64, height: 6, borderRadius: 3, background: t.accent, marginTop: 18 }} />
    </div>
  );
}

function Bullets({ path, items, t, size = 30 }: { path: Path; items: string[]; t: Theme; size?: number }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: size * 0.62 }}>
      {items.map((_, i) => (
        <li key={i} style={{ display: "flex", gap: 22, fontSize: size, lineHeight: 1.3 }}>
          <span style={{ flex: "none", width: 14, height: 14, marginTop: size * 0.38, borderRadius: 4, background: i % 2 ? t.accent2 : t.accent }} />
          <T path={[...path, i]} placeholder="Type a point" list={{ path, index: i }} style={{ flex: 1 }} />
        </li>
      ))}
    </ul>
  );
}

function Caption({ text, t }: { text?: string; t: Theme }) {
  if (!useShown(text)) return null;
  return <T path={["caption"]} as="p" placeholder="Add a caption (optional)" style={{ margin: "26px 0 0", paddingLeft: 18, borderLeft: `5px solid ${t.accent}`, fontSize: 22, lineHeight: 1.35, color: t.muted }} />;
}

function Body({ slide, t }: { slide: Slide; t: Theme }) {
  const ed = useContext(EditCtx);
  const locked = Boolean(ed?.locked);
  const pad: CSSProperties = { position: "absolute", left: 80, right: 80, top: 64, bottom: 84, display: "flex", flexDirection: "column" };

  if (slide.layout === "section") {
    return (
      <Fit style={{ ...pad, justifyContent: "center" }}>
        <T path={["subtitle"]} as="div" placeholder="Part 1" style={{ fontSize: 22, fontWeight: 700, color: t.accent, letterSpacing: 3, textTransform: "uppercase", marginBottom: 18, minHeight: 26 }} />
        <T path={["title"]} as="h2" placeholder="Section title" style={{ fontSize: 72, fontWeight: 800, margin: 0, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 1000 }} />
        <div style={{ width: 120, height: 8, borderRadius: 4, background: `linear-gradient(90deg, ${t.accent}, ${t.accent2})`, marginTop: 30 }} />
      </Fit>
    );
  }

  if (slide.layout === "quote") {
    return (
      <Fit style={{ ...pad, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontSize: 160, lineHeight: 0.6, color: t.accent, fontFamily: "Georgia, serif", height: 80 }}>“</div>
        {ed || slide.quote ? (
          <T path={["quote"]} as="p" placeholder="Type the quote" style={{ fontSize: 44, lineHeight: 1.3, fontWeight: 600, margin: "10px 0 0", maxWidth: 1000 }} />
        ) : (
          <p style={{ fontSize: 44, lineHeight: 1.3, fontWeight: 600, margin: "10px 0 0", maxWidth: 1000 }}>{slide.title}</p>
        )}
        {(ed || slide.attribution || (slide.quote && slide.title)) && (
          <p style={{ fontSize: 24, color: t.muted, marginTop: 28 }}>
            — {ed || slide.attribution ? <T path={["attribution"]} placeholder="Who said it" /> : slide.title}
          </p>
        )}
      </Fit>
    );
  }

  if (slide.layout === "two_column") {
    return (
      <Fit style={pad}>
        <Title t={t} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, flex: 1, minHeight: 0 }}>
          {(["left", "right"] as const).map((side, i) => {
            const col = slide[side];
            return (
              <div key={side} style={{ background: t.surface, borderRadius: 24, padding: "30px 34px", borderTop: `6px solid ${i ? t.accent2 : t.accent}` }}>
                {(ed || col?.heading) && <T path={[side, "heading"]} as="div" placeholder="Heading" style={{ fontSize: 30, fontWeight: 700, marginBottom: 22, color: i ? t.accent2 : t.accent }} />}
                <Bullets path={[side, "bullets"]} items={col?.bullets?.length ? col.bullets : ed ? [""] : []} t={t} size={26} />
              </div>
            );
          })}
        </div>
        <Caption text={slide.caption} t={t} />
      </Fit>
    );
  }

  if (slide.layout === "stats") {
    const stats = slide.stats ?? [];
    return (
      <Fit style={pad}>
        <Title t={t} />
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(stats.length, 3) || 1}, 1fr)`, gap: 26, flex: 1, alignContent: "center" }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: t.surface, borderRadius: 24, padding: "28px 30px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 8, background: t.palette[i % t.palette.length] }} />
              <T path={["stats", i, "value"]} as="div" readOnly={locked} placeholder="0" style={{ fontSize: 60, fontWeight: 800, color: t.palette[i % t.palette.length], lineHeight: 1, letterSpacing: -1 }} />
              <T path={["stats", i, "label"]} as="div" placeholder="Label" style={{ fontSize: 24, fontWeight: 600, marginTop: 14 }} />
              {(s.hint || (ed && !locked)) && <T path={["stats", i, "hint"]} as="div" placeholder="Add a note" style={{ fontSize: 19, color: t.muted, marginTop: 6 }} />}
            </div>
          ))}
        </div>
        <Caption text={slide.caption} t={t} />
      </Fit>
    );
  }

  if (slide.layout === "table" && slide.table) {
    const { head, rows } = slide.table;
    const size = rows.length > 9 ? 18 : rows.length > 6 ? 21 : 24;
    return (
      <Fit style={pad}>
        <Title t={t} />
        <div style={{ borderRadius: 18, overflow: "hidden", border: `2px solid ${t.surface}` }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: size }}>
            <thead>
              <tr style={{ background: t.accent, color: t.dark ? t.bg : "#fff" }}>
                {head.map((_, i) => (
                  <th key={i} style={{ textAlign: i ? "right" : "left", padding: "14px 22px", fontWeight: 700 }}>
                    <T path={["table", "head", i]} placeholder="Heading" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((_, k) => (
                <tr key={k} style={{ background: k % 2 ? t.surface : "transparent" }}>
                  {head.map((__, i) => (
                    <td key={i} style={{ textAlign: i ? "right" : "left", padding: `${size * 0.45}px 22px`, fontVariantNumeric: "tabular-nums" }}>
                      <T path={["table", "rows", k, i]} readOnly={locked} placeholder="–" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Caption text={slide.caption} t={t} />
      </Fit>
    );
  }

  if (slide.layout === "image") {
    const items = slide.bullets?.length ? slide.bullets : ed ? [""] : [];
    return (
      <div style={{ ...pad, flexDirection: "row", gap: 44 }}>
        <Fit style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Title t={t} size={42} />
          <Bullets path={["bullets"]} items={items} t={t} size={items.length > 4 ? 24 : 27} />
          <Caption text={slide.caption} t={t} />
        </Fit>
        <div
          onClick={ed?.onImage}
          className={ed?.onImage ? "slide-chart" : undefined}
          title={ed?.onImage ? "Change the picture" : undefined}
          style={{ flex: "1.15 1 0", borderRadius: 28, overflow: "hidden", background: t.surface, display: "grid", placeItems: "center", cursor: ed?.onImage ? "pointer" : undefined }}
        >
          {slide.image?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slide.image.url} alt={slide.image.alt ?? ""} crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ textAlign: "center", color: t.muted, fontSize: 24 }}>
              <svg viewBox="0 0 24 24" width={72} height={72} fill="none" stroke="currentColor" strokeWidth={1.4} style={{ margin: "0 auto 12px", display: "block", opacity: 0.6 }}>
                <path d="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01" />
              </svg>
              {ed ? "Click to add a picture" : ""}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (slide.layout === "chart" && slide.chart) {
    return (
      <Fit style={pad}>
        <Title t={t} size={42} />
        <div
          style={{ flex: 1, minHeight: 0, cursor: ed?.onChart ? "pointer" : undefined, borderRadius: 16 }}
          className={ed?.onChart ? "slide-chart" : undefined}
          onClick={ed?.onChart}
          title={ed?.onChart ? (locked ? "These numbers come from your records" : "Edit the chart's numbers") : undefined}
        >
          <Chart chart={slide.chart} t={t} />
        </div>
        <Caption text={slide.caption} t={t} />
      </Fit>
    );
  }

  // bullets (and anything unknown)
  const items = slide.bullets?.length ? slide.bullets : ed ? [""] : [];
  return (
    <Fit style={pad}>
      <Title t={t} />
      {slide.subtitle && <T path={["subtitle"]} as="p" style={{ fontSize: 26, color: t.muted, margin: "-14px 0 26px" }} />}
      <Bullets path={["bullets"]} items={items} t={t} size={items.length > 5 ? 26 : 30} />
      <Caption text={slide.caption} t={t} />
    </Fit>
  );
}

// ---------------------------------------------------------------------------
// Charts (SVG, sized for the slide's content area: 1120×~380)
// ---------------------------------------------------------------------------

function Chart({ chart, t }: { chart: NonNullable<Slide["chart"]>; t: Theme }) {
  const W = 1120;
  const H = 400;
  const values = chart.series[0]?.values ?? [];
  if (chart.type === "pie") {
    const total = values.reduce((a, b) => a + Math.max(0, b), 0) || 1;
    // Where each slice starts and ends (radians, from 12 o'clock)
    const ends = values.reduce<number[]>((acc, v) => [...acc, (acc.at(-1) ?? 0) + (Math.max(0, v) / total) * Math.PI * 2], []);
    const cx = 230;
    const cy = H / 2;
    const r = 170;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMinYMid meet">
        {values.map((v, i) => {
          const from = -Math.PI / 2 + (i ? ends[i - 1] : 0);
          const to = -Math.PI / 2 + ends[i];
          const a = to - from;
          const x1 = cx + r * Math.cos(from);
          const y1 = cy + r * Math.sin(from);
          const x2 = cx + r * Math.cos(to);
          const y2 = cy + r * Math.sin(to);
          const large = a > Math.PI ? 1 : 0;
          const d = values.length === 1 ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z` : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
          return <path key={i} d={d} fill={t.palette[i % t.palette.length]} stroke={t.bg} strokeWidth={4} />;
        })}
        <circle cx={cx} cy={cy} r={r * 0.52} fill={t.bg} />
        {chart.labels.map((l, i) => (
          <g key={i} transform={`translate(500, ${H / 2 - (chart.labels.length * 46) / 2 + i * 46})`}>
            <rect width={22} height={22} rx={6} fill={t.palette[i % t.palette.length]} />
            <text x={36} y={18} fontSize={24} fill={t.fg}>
              {l}
            </text>
            <text x={560} y={18} fontSize={24} fill={t.muted} textAnchor="end" style={{ fontVariantNumeric: "tabular-nums" }}>
              {formatValue(values[i] ?? 0, chart.unit)} · {Math.round(((values[i] ?? 0) / total) * 100)}%
            </text>
          </g>
        ))}
      </svg>
    );
  }

  const max = Math.max(...values, chart.unit === "%" ? 100 : 0, 1);
  const top = chart.unit === "%" ? 100 : niceMax(max);
  const left = 90;
  const bottom = 64;
  const plotW = W - left - 20;
  const plotH = H - bottom - 20;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * top);
  const y = (v: number) => 20 + plotH - (v / top) * plotH;
  const n = Math.max(values.length, 1);
  const longLabels = chart.labels.some((l) => l.length > 10) && n > 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={left} x2={W - 20} y1={y(v)} y2={y(v)} stroke={t.muted} strokeOpacity={0.25} strokeWidth={1.5} />
          <text x={left - 14} y={y(v) + 7} fontSize={20} fill={t.muted} textAnchor="end">
            {formatValue(v, chart.unit)}
          </text>
        </g>
      ))}
      {chart.type === "line" ? (
        <>
          <polyline
            fill="none"
            stroke={t.accent}
            strokeWidth={5}
            strokeLinejoin="round"
            strokeLinecap="round"
            points={values.map((v, i) => `${left + (plotW / Math.max(n - 1, 1)) * i},${y(v)}`).join(" ")}
          />
          {values.map((v, i) => (
            <circle key={i} cx={left + (plotW / Math.max(n - 1, 1)) * i} cy={y(v)} r={7} fill={t.bg} stroke={t.accent} strokeWidth={4} />
          ))}
          {chart.labels.map((l, i) =>
            n <= 12 || i % Math.ceil(n / 12) === 0 ? (
              <text key={i} x={left + (plotW / Math.max(n - 1, 1)) * i} y={H - bottom + 34} fontSize={20} fill={t.muted} textAnchor="middle">
                {l}
              </text>
            ) : null
          )}
        </>
      ) : (
        values.map((v, i) => {
          const slot = plotW / n;
          const bw = Math.min(110, slot * 0.6);
          const x = left + slot * i + (slot - bw) / 2;
          return (
            <g key={i}>
              <rect x={x} y={y(v)} width={bw} height={Math.max(0, 20 + plotH - y(v))} rx={10} fill={t.palette[i % t.palette.length]} />
              <text x={x + bw / 2} y={y(v) - 12} fontSize={22} fontWeight={700} fill={t.fg} textAnchor="middle">
                {formatValue(v, chart.unit)}
              </text>
              <text
                x={x + bw / 2}
                y={H - bottom + 32}
                fontSize={longLabels ? 17 : 21}
                fill={t.muted}
                textAnchor={longLabels ? "end" : "middle"}
                transform={longLabels ? `rotate(-18 ${x + bw / 2} ${H - bottom + 32})` : undefined}
              >
                {chart.labels[i]?.length > 24 ? `${chart.labels[i].slice(0, 23)}…` : chart.labels[i]}
              </text>
            </g>
          );
        })
      )}
    </svg>
  );
}

function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
