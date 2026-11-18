"use client";

// Small pieces shared by the presentation pages.
import Link from "next/link";
import { useEffect, useState } from "react";
import { SlideFrame, type Brand } from "./slide-view";
import { Icon, buttonClass, cx } from "@/components/ui";
import { useAiStatus } from "@/lib/ai";
import { loadSchool } from "@/lib/school";
import { THEMES, type Slide, type ThemeId } from "@/lib/slides";


// just add thsi 
export const SLIDES_ICON = "M3 4h18v12H3zM12 16v4M8 20h8M7 8h6M7 12h10";

/** The school's name and logo for the slides. */
export function useBrand(): Brand {
  const [brand, setBrand] = useState<Brand>({ name: "" });
  useEffect(() => {
    let cancelled = false;
    loadSchool()
      .then((s) => !cancelled && setBrand({ name: s.name, logoUrl: s.logoUrl || undefined }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return brand;
}

const SAMPLE: Slide = { layout: "bullets", title: "Aa", bullets: ["One", "Two"] };

/** Four themes as small slide previews. */
export function ThemePicker({ value, onChange, brand, compact }: { value: ThemeId; onChange: (t: ThemeId) => void; brand: Brand; /** Two across (narrow side panels) */ compact?: boolean }) {
  return (
    <div className={cx("grid grid-cols-2 gap-2", !compact && "sm:grid-cols-4")} role="radiogroup" aria-label="Theme">
      {(Object.keys(THEMES) as ThemeId[]).map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          aria-label={THEMES[id].name}
          onClick={() => onChange(id)}
          className={cx("group overflow-hidden rounded-xl border-2 text-left transition-all", value === id ? "border-accent shadow-md" : "border-border hover:border-accent/40")}
        >
          <span aria-hidden className="block">
            <SlideFrame slide={{ ...SAMPLE, title: THEMES[id].name }} theme={id} brand={brand} index={0} total={1} />
          </span>
          <span className="flex items-center justify-between px-2.5 py-1.5 text-xs font-medium">
            {THEMES[id].name}
            {value === id && <Icon d="M5 12l5 5L20 7" className="size-3.5 text-accent" />}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Shown instead of the tools when the school can't use AI right now. */
export function AiUnavailable() {
  const status = useAiStatus();
  if (!status) return null;
  const off = status.state === "off";
  const plan = status.state === "not_in_plan";
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center">
      <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Icon d={SLIDES_ICON} className="size-6" />
      </span>
      <p className="font-semibold">{plan ? "AI presentations are part of the Pro plan" : off ? "The AI assistant is off for your school" : status.state === "quota" ? "This month's AI questions are used up" : "AI isn't available right now"}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">
        {plan ? "Upgrade to make presentations from a topic or your school's records." : off ? (status.canManage ? "Turn it on in Settings to start making presentations." : "Ask your school's owner or admin to turn it on.") : status.state === "quota" ? "They reset on the 1st. Your saved presentations are still here." : "Please try again later."}
      </p>
      {status.canManage && (plan || off) && (
        <Link href={plan ? "/app/settings/billing" : "/app/settings/ai"} className={cx(buttonClass("primary", "sm"), "mt-4")}>
          {plan ? "See plans" : "Turn it on"}
        </Link>
      )}
    </div>
  );
}

export const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
