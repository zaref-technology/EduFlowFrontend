"use client";

// Beside the slide in the editor: layout, chart numbers, table rows/columns. Text is edited on
// the slide itself. Numbers from the school's records are locked unless the member unlocks them.
import { useRef, useState, type ReactNode } from "react";
import { Button, Icon, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { LAYOUT_LABEL, blankSlide, type Layout, type Slide } from "@/lib/slides";

const LAYOUTS: Layout[] = ["title", "section", "bullets", "two_column", "image", "stats", "table", "chart", "quote", "closing"];
export const area = "w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";
const small = "h-8 rounded-md border border-border bg-surface px-2 text-xs outline-none focus:border-accent";

const LAYOUT_ICON: Record<Layout, string> = {
  title: "M4 5h16v14H4zM8 10h8M9 14h6",
  section: "M4 12h16M4 6h10M4 18h10",
  bullets: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  two_column: "M4 5h7v14H4zM13 5h7v14h-7z",
  stats: "M9 4L7 20M17 4l-2 16M4 9h16M3 15h16",
  table: "M3 5h18v14H3zM3 10h18M3 15h18M9 5v14",
  chart: "M4 19h16M7 16V9M12 16V5M17 16v-4",
  quote: "M7 7h4v4H7zM7 11c0 3-1 5-3 6M15 7h4v4h-4zM15 11c0 3-1 5-3 6",
  closing: "M4 5h16v14H4zM9 12l2 2 4-4",
  image: "M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01",
};

/**
 * Beside the slide: only what can't be done by clicking on it. The layout (the AI chose it;
 * change it if you like), a chart's numbers, a table's rows and columns, adding numbers.
 */
export function SlidePanel({
  slide,
  locked,
  onChange,
  onUnlock,
  chartRef,
  pictureRef,
  onAiPicture,
  aiBusy,
}: {
  slide: Slide;
  locked: boolean;
  onChange: (p: Partial<Slide>) => void;
  onUnlock: () => void;
  chartRef?: React.Ref<HTMLDivElement>;
  pictureRef?: React.Ref<HTMLDivElement>;
  /** Make a picture with AI (when the console has turned AI pictures on) */
  onAiPicture?: (prompt: string) => void;
  aiBusy?: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-xl bg-accent-soft/60 px-3 py-2 text-xs text-muted">
        <Icon d="M4 20h4L18.5 9.5a2.1 2.1 0 00-4-4L4 16v4z" className="mt-px size-3.5 shrink-0 text-accent" />
        Click any text on the slide to change it. Press Enter for a new point.
      </p>
      {!locked && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Layout</p>
          <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label="Layout">
            {LAYOUTS.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={slide.layout === l}
                aria-label={LAYOUT_LABEL[l]}
                title={LAYOUT_LABEL[l]}
                onClick={() => slide.layout !== l && onChange(withLayout(slide, l))}
                className={cx("grid aspect-square place-items-center rounded-lg border transition-colors", slide.layout === l ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:border-accent/40 hover:text-foreground")}
              >
                <Icon d={LAYOUT_ICON[l]} className="size-4" />
              </button>
            ))}
          </div>
        </div>
      )}
      {locked && (slide.stats || slide.table || slide.chart) && <Locked onUnlock={onUnlock} />}
      {!locked && slide.layout === "chart" && slide.chart && (
        <div ref={chartRef} className="rounded-xl">
          <ChartEditor chart={slide.chart} onChange={(chart) => onChange({ chart })} />
        </div>
      )}
      {slide.layout === "image" && (
        <div ref={pictureRef} className="rounded-xl">
          <PictureTools slide={slide} onChange={onChange} onAiPicture={onAiPicture} aiBusy={aiBusy} />
        </div>
      )}
      {!locked && slide.layout === "table" && slide.table && <TableTools table={slide.table} onChange={(table) => onChange({ table })} />}
      {!locked && slide.layout === "stats" && slide.stats && (
        <div className="flex gap-3 text-xs font-medium text-accent">
          {slide.stats.length < 6 && (
            <button type="button" onClick={() => onChange({ stats: [...slide.stats!, { label: "Label", value: "0" }] })} className="hover:underline">
              + Add a number
            </button>
          )}
          {slide.stats.length > 1 && (
            <button type="button" onClick={() => onChange({ stats: slide.stats!.slice(0, -1) })} className="text-muted hover:text-danger hover:underline">
              Remove the last
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Uploads a picture straight to Cloudinary (with our short-lived signature); returns its URL. */
async function uploadPicture(file: File) {
  if (file.size > 8 * 1024 * 1024) throw new Error("That picture is over 8 MB. Choose a smaller one.");
  const { uploadUrl, fields } = await api<{ uploadUrl: string; fields: Record<string, string | number> }>("/api/ai/decks/images/signature", { method: "POST" });
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
  form.append("file", file);
  const res = await fetch(uploadUrl, { method: "POST", body: form });
  const out = (await res.json().catch(() => null)) as { secure_url?: string; error?: { message: string } } | null;
  if (!res.ok || !out?.secure_url) throw new Error(out?.error?.message || "Upload failed. Try again.");
  return out.secure_url;
}

/** The slide's picture: upload one, make one with AI, or remove it. */
function PictureTools({ slide, onChange, onAiPicture, aiBusy }: { slide: Slide; onChange: (p: Partial<Slide>) => void; onAiPicture?: (prompt: string) => void; aiBusy?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange({ image: { url: await uploadPicture(file), alt: slide.title, source: "upload" } });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted">Picture</p>
      {error && <p className="rounded-lg bg-danger-soft px-2.5 py-1.5 text-xs">{error}</p>}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <div className="flex gap-1.5">
        <Button type="button" size="sm" variant="secondary" loading={busy} onClick={() => input.current?.click()} className="flex-1">
          <Icon d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
          {slide.image ? "Replace" : "Upload"}
        </Button>
        {slide.image && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ image: undefined })}>
            Remove
          </Button>
        )}
      </div>
      {onAiPicture && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAiPicture(prompt);
          }}
          className="space-y-1.5 rounded-xl border border-accent/30 bg-accent-soft/50 p-2.5"
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <Icon d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" className="size-3.5 text-accent" />
            Make a picture with AI · 2 questions
          </p>
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)} maxLength={300} placeholder={`e.g. ${slide.title || "children planting trees"}`} aria-label="Describe the picture" className={cx(small, "w-full")} />
          <Button type="submit" size="sm" className="w-full" loading={aiBusy} disabled={aiBusy}>
            Make picture
          </Button>
        </form>
      )}
    </div>
  );
}

/** Rows and columns (the cells are typed into on the slide). */
function TableTools({ table, onChange }: { table: NonNullable<Slide["table"]>; onChange: (t: NonNullable<Slide["table"]>) => void }) {
  const cols = table.head.length;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted">
        Table · {table.rows.length} rows × {cols} columns
      </p>
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <button type="button" disabled={table.rows.length >= 15} onClick={() => onChange({ ...table, rows: [...table.rows, Array(cols).fill("")] })} className="rounded-lg border border-border px-2 py-1.5 hover:border-accent/40 disabled:opacity-40">
          + Row
        </button>
        <button type="button" disabled={cols >= 8} onClick={() => onChange({ head: [...table.head, "Column"], rows: table.rows.map((r) => [...r, ""]) })} className="rounded-lg border border-border px-2 py-1.5 hover:border-accent/40 disabled:opacity-40">
          + Column
        </button>
        <button type="button" disabled={table.rows.length <= 1} onClick={() => onChange({ ...table, rows: table.rows.slice(0, -1) })} className="rounded-lg border border-border px-2 py-1.5 text-muted hover:text-danger disabled:opacity-40">
          − Last row
        </button>
        <button type="button" disabled={cols <= 1} onClick={() => onChange({ head: table.head.slice(0, -1), rows: table.rows.map((r) => r.slice(0, cols - 1)) })} className="rounded-lg border border-border px-2 py-1.5 text-muted hover:text-danger disabled:opacity-40">
          − Last column
        </button>
      </div>
    </div>
  );
}

function Locked({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="space-y-2 rounded-xl bg-accent-soft px-3 py-2.5 text-xs text-muted">
      <p className="flex gap-2">
        <Icon d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z" className="mt-px size-3.5 shrink-0 text-accent" />
        These numbers come from your school&apos;s records, so they&apos;re locked. The words can still be changed.
      </p>
      <button
        type="button"
        onClick={() => confirm("Edit these numbers by hand? They will no longer match your school's records.") && onUnlock()}
        className="font-medium text-accent hover:underline"
      >
        Edit numbers anyway
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-medium text-muted">{label}</span>}
      {children}
    </label>
  );
}

function RowButton({ label, icon, onClick, disabled }: { label: string; icon: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="grid size-7 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-muted hover:text-foreground disabled:opacity-30">
      <Icon d={icon} className="size-3.5" />
    </button>
  );
}
const X = "M6 6l12 12M18 6L6 18";

function ChartEditor({ chart, onChange }: { chart: NonNullable<Slide["chart"]>; onChange: (c: NonNullable<Slide["chart"]>) => void }) {
  const values = chart.series[0]?.values ?? [];
  const setRow = (i: number, label: string, value: number) =>
    onChange({ ...chart, labels: chart.labels.map((l, k) => (k === i ? label : l)), series: [{ name: chart.series[0]?.name ?? "Value", values: values.map((v, k) => (k === i ? value : v)) }] });
  return (
    <Field label="Chart">
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <select value={chart.type} onChange={(e) => onChange({ ...chart, type: e.target.value as typeof chart.type })} aria-label="Chart type" className={small}>
            <option value="bar">Bars</option>
            <option value="line">Line</option>
            <option value="pie">Doughnut</option>
          </select>
          <select value={chart.unit} onChange={(e) => onChange({ ...chart, unit: e.target.value as typeof chart.unit })} aria-label="Unit" className={small}>
            <option value="">Number</option>
            <option value="%">Percent (%)</option>
            <option value="₹">Rupees (₹)</option>
          </select>
        </div>
        {chart.labels.map((l, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input value={l} onChange={(e) => setRow(i, e.target.value, values[i] ?? 0)} maxLength={40} aria-label={`Label ${i + 1}`} className={cx(small, "min-w-0 flex-1")} />
            <input type="number" value={values[i] ?? 0} onChange={(e) => setRow(i, l, Number(e.target.value) || 0)} aria-label={`Value ${i + 1}`} className={cx(small, "w-24 text-right tabular-nums")} />
            <RowButton
              label="Remove"
              icon={X}
              onClick={() => onChange({ ...chart, labels: chart.labels.filter((_, k) => k !== i), series: [{ name: chart.series[0]?.name ?? "Value", values: values.filter((_, k) => k !== i) }] })}
              disabled={chart.labels.length <= 1}
            />
          </div>
        ))}
        {chart.labels.length < 31 && (
          <button type="button" onClick={() => onChange({ ...chart, labels: [...chart.labels, `Item ${chart.labels.length + 1}`], series: [{ name: chart.series[0]?.name ?? "Value", values: [...values, 0] }] })} className="text-xs font-medium text-accent hover:underline">
            + Add a bar
          </button>
        )}
      </div>
    </Field>
  );
}

/** Switching layout keeps the words where it can (points ↔ columns), and starts tables/charts/numbers from a sample. */
export function withLayout(s: Slide, layout: Layout): Partial<Slide> {
  const points = s.bullets?.length ? s.bullets : [...(s.left?.bullets ?? []), ...(s.right?.bullets ?? [])];
  if (layout === "two_column") {
    const half = Math.ceil(points.length / 2);
    return { layout, left: s.left ?? { heading: "", bullets: points.slice(0, half) }, right: s.right ?? { heading: "", bullets: points.slice(half) } };
  }
  if (layout === "bullets") return { layout, bullets: points.length ? points : ["First point"] };
  if (layout === "quote") return { layout, quote: s.quote || points[0] || s.title };
  if (layout === "image") return { layout, bullets: points.length ? points : ["What this shows"] };
  // Numbers typed in by the member: theirs to edit
  if (layout === "stats") return { layout, stats: s.stats ?? blankSlide("stats").stats, fromRecords: false };
  if (layout === "table") return { layout, table: s.table ?? (points.length ? { head: ["Point"], rows: points.map((p) => [p]) } : blankSlide("table").table), fromRecords: false };
  if (layout === "chart") return { layout, chart: s.chart ?? blankSlide("chart").chart, fromRecords: false };
  return { layout };
}
