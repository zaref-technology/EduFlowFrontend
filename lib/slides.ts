// AI presentations: the slide JSON (shared with the server) and the themes, used by both the
// on-screen slides and the PowerPoint export so they look the same.
import type { WriteLanguage } from "./ai";

export type DeckKind = "topic" | "class_results" | "monthly_review";
export type ThemeId = "classic" | "midnight" | "sunrise" | "chalk";
export type Layout = "title" | "section" | "bullets" | "two_column" | "stats" | "chart" | "table" | "quote" | "closing";

export interface Slide {
  layout: Layout;
  title: string;
  subtitle?: string;
  caption?: string;
  notes?: string;
  bullets?: string[];
  left?: { heading: string; bullets: string[] };
  right?: { heading: string; bullets: string[] };
  quote?: string;
  attribution?: string;
  stats?: { label: string; value: string; hint?: string }[];
  table?: { head: string[]; rows: string[][] };
  chart?: { type: "bar" | "line" | "pie"; labels: string[]; series: { name: string; values: number[] }[]; unit: "%" | "₹" | "" };
  /** Numbers from the school's records: locked in the editor unless the member unlocks them */
  fromRecords?: boolean;
}

export interface Deck {
  id: string;
  kind: DeckKind;
  title: string;
  language: WriteLanguage;
  theme: ThemeId;
  source: Record<string, unknown>;
  slides: Slide[];
  createdAt: string;
  updatedAt: string;
}

export interface DeckSummary {
  id: string;
  title: string;
  kind: DeckKind;
  theme: ThemeId;
  language: WriteLanguage;
  slides: number;
  cover: Slide | null;
  updatedAt: string;
  createdAt: string;
}

export interface DeckSources {
  kinds: DeckKind[];
  tests: { id: string; name: string; class: string; date: string; average: number | null }[];
}

/** Each step's cost in the school's monthly AI questions (as the server counts them). */
export const DECK_UNITS = { outline: 1, deck: 4, slide: 1, insert: 1, translate: 2 };

export interface Theme {
  id: ThemeId;
  name: string;
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  accent2: string;
  surface: string;
  /** Series colours for charts */
  palette: string[];
  dark: boolean;
}

export const THEMES: Record<ThemeId, Theme> = {
  classic: { id: "classic", name: "Classic", bg: "#FFFFFF", fg: "#14213D", muted: "#5B6475", accent: "#2B3A8C", accent2: "#7C3AED", surface: "#F1F3F9", palette: ["#2B3A8C", "#7C3AED", "#0EA5E9", "#10B981", "#F59E0B", "#EF4444", "#64748B"], dark: false },
  midnight: { id: "midnight", name: "Midnight", bg: "#0F172A", fg: "#F8FAFC", muted: "#94A3B8", accent: "#818CF8", accent2: "#22D3EE", surface: "#1E293B", palette: ["#818CF8", "#22D3EE", "#F472B6", "#34D399", "#FBBF24", "#F87171", "#A3A3A3"], dark: true },
  sunrise: { id: "sunrise", name: "Sunrise", bg: "#FFF8F1", fg: "#3B1D0F", muted: "#8A5A44", accent: "#EA580C", accent2: "#DB2777", surface: "#FFEDD8", palette: ["#EA580C", "#DB2777", "#CA8A04", "#0D9488", "#7C3AED", "#2563EB", "#78716C"], dark: false },
  chalk: { id: "chalk", name: "Chalkboard", bg: "#1F3B2D", fg: "#F1F5E9", muted: "#B8C9AE", accent: "#FACC15", accent2: "#7DD3FC", surface: "#29483A", palette: ["#FACC15", "#7DD3FC", "#FDA4AF", "#86EFAC", "#FDBA74", "#C4B5FD", "#E5E7EB"], dark: true },
};

export const KIND_LABEL: Record<DeckKind, string> = {
  topic: "Topic",
  class_results: "Test results",
  monthly_review: "Monthly review",
};

export const LAYOUT_LABEL: Record<Layout, string> = {
  title: "Title",
  section: "Section",
  bullets: "Bullets",
  two_column: "Two columns",
  stats: "Big numbers",
  chart: "Chart",
  table: "Table",
  quote: "Quote",
  closing: "Closing",
};

/** Slides whose numbers come from the school's records (only their words can be edited or rewritten).
 *  Decks made before the flag existed: their number slides are from the records. */
export const isLocked = (s: Slide, kind: DeckKind) => s.fromRecords ?? (kind !== "topic" && Boolean(s.chart || s.table || s.stats));

/** A new slide of each layout, ready to edit (made by the member, so never locked). */
export function blankSlide(layout: Layout): Slide {
  return { ...sample(layout), fromRecords: false };
}

function sample(layout: Layout): Slide {
  switch (layout) {
    case "two_column":
      return { layout, title: "Compare", left: { heading: "Before", bullets: ["First point"] }, right: { heading: "After", bullets: ["First point"] } };
    case "stats":
      return { layout, title: "Key numbers", stats: [{ label: "Students", value: "120" }, { label: "Attendance", value: "92%" }, { label: "Results", value: "A+" }] };
    case "table":
      return { layout, title: "Table", table: { head: ["Item", "Details"], rows: [["", ""], ["", ""]] } };
    case "chart":
      return { layout, title: "Chart", chart: { type: "bar", labels: ["A", "B", "C"], series: [{ name: "Value", values: [40, 65, 80] }], unit: "" } };
    case "quote":
      return { layout, title: "Quote", quote: "Education is the most powerful weapon which you can use to change the world.", attribution: "Nelson Mandela" };
    case "section":
      return { layout, title: "New section", subtitle: "Part 2" };
    case "title":
    case "closing":
      return { layout, title: layout === "closing" ? "Thank you" : "Title" };
    default:
      return { layout: "bullets", title: "New slide", bullets: ["First point", "Second point"] };
  }
}

/** "1,24,500" style numbers, with the chart's unit. */
export function formatValue(v: number, unit: "%" | "₹" | "") {
  const n = Math.round(v * 10) / 10;
  if (unit === "₹") return `₹${n.toLocaleString("en-IN")}`;
  return `${n.toLocaleString("en-IN")}${unit}`;
}
