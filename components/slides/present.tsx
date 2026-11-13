"use client";

// Full-screen present mode: arrows / space / click to move, N for speaker notes, Esc to leave.
import { useEffect, useRef, useState } from "react";
import { SlideFrame, type Brand } from "./slide-view";
import { Icon, cx } from "@/components/ui";
import type { Deck } from "@/lib/slides";

export function Present({ deck, brand, start, onClose }: { deck: Deck; brand: Brand; start: number; onClose: (at: number) => void }) {
  const [i, setI] = useState(start);
  const [notes, setNotes] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const root = useRef<HTMLDivElement>(null);
  const n = deck.slides.length;
  // The slide shown, for the exit handler registered once
  const at = useRef(start);
  useEffect(() => {
    at.current = i;
  }, [i]);

  useEffect(() => {
    const el = root.current;
    el?.requestFullscreen?.().catch(() => {});
    const measure = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    const onFs = () => {
      if (!document.fullscreenElement) onClose(at.current);
    };
    document.addEventListener("fullscreenchange", onFs);
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) setI((x) => Math.min(x + 1, n - 1));
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(e.key)) setI((x) => Math.max(x - 1, 0));
      else if (e.key === "Home") setI(0);
      else if (e.key === "End") setI(n - 1);
      else if (e.key.toLowerCase() === "n") setNotes((v) => !v);
      else if (e.key === "Escape") onClose(at.current);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("fullscreenchange", onFs);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notesH = notes ? Math.min(220, size.h * 0.28) : 0;
  const w = Math.min(size.w, ((size.h - notesH) * 16) / 9);
  const slide = deck.slides[i];

  return (
    <div ref={root} className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black text-white" role="dialog" aria-label="Presenting">
      <div className="relative" style={{ width: w }}>
        {w > 0 && <SlideFrame key={i} slide={slide} theme={deck.theme} brand={brand} index={i} total={n} width={w} className="motion-safe:animate-fade-in" />}
        {/* Click halves to move */}
        <button aria-label="Previous slide" onClick={() => setI((x) => Math.max(x - 1, 0))} className="absolute inset-y-0 left-0 w-1/3 cursor-w-resize" />
        <button aria-label="Next slide" onClick={() => setI((x) => Math.min(x + 1, n - 1))} className="absolute inset-y-0 right-0 w-2/3 cursor-e-resize" />
      </div>
      {notes && (
        <div className="w-full overflow-y-auto border-t border-white/10 bg-neutral-900 px-8 py-4 text-base leading-relaxed text-white/85" style={{ height: notesH }}>
          {slide.notes || <span className="text-white/40">No notes for this slide.</span>}
        </div>
      )}
      <div className="group fixed inset-x-0 bottom-0 flex justify-center p-4">
        <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-sm opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button onClick={() => setI((x) => Math.max(x - 1, 0))} aria-label="Previous" className="grid size-8 place-items-center rounded-full hover:bg-white/15">
            <Icon d="M15 6l-6 6 6 6" />
          </button>
          <span className="px-2 tabular-nums">
            {i + 1} / {n}
          </span>
          <button onClick={() => setI((x) => Math.min(x + 1, n - 1))} aria-label="Next" className="grid size-8 place-items-center rounded-full hover:bg-white/15">
            <Icon d="M9 6l6 6-6 6" />
          </button>
          <button onClick={() => setNotes((v) => !v)} className={cx("rounded-full px-3 py-1 hover:bg-white/15", notes && "bg-white/20")}>
            Notes
          </button>
          <button onClick={() => onClose(at.current)} className="rounded-full px-3 py-1 hover:bg-white/15">
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}
