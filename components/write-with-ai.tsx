"use client";

import { useState } from "react";
import { SPARKLE_ICON } from "./ai-chat";
import { errorMessage } from "./data";
import { Alert, Button, Icon, cx } from "./ui";
import { WRITE_LANGUAGES, refreshAiStatus, useAiStatus, type WriteKind, type WriteLanguage } from "@/lib/ai";
import { api } from "@/lib/api";

const PLACEHOLDER: Record<WriteKind, string> = {
  notice: "e.g. School closed on Friday for Diwali, reopens Monday",
  whatsapp: "e.g. Remind parents about the PTM on Saturday at 10 am",
  fee_reminder: "e.g. Second term fees, gentle reminder",
  homework: "e.g. Maths exercise 4.2, questions 1 to 10, show working",
  remark: "e.g. Good in maths, needs to practise handwriting",
};

/**
 * "Write with AI" under a text box: describe it in a few words (or improve what's
 * written) and the draft replaces the text, ready to edit. Shown only when the school
 * has the AI assistant on.
 */
export function WriteWithAi({ kind, current, onText }: { kind: WriteKind; current: string; onText: (text: string) => void }) {
  const status = useAiStatus();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState<WriteLanguage>("en");
  const [busy, setBusy] = useState<"write" | "improve" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status?.state !== "ready") return null;

  async function run(mode: "write" | "improve") {
    setBusy(mode);
    setError(null);
    try {
      const body = mode === "improve" ? { kind, language, prompt: prompt.trim(), draft: current } : { kind, language, prompt: prompt.trim() };
      const r = await api<{ text: string }>("/api/ai/write", { method: "POST", body });
      onText(r.text);
      setOpen(false);
      setPrompt("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
      refreshAiStatus();
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline">
        <Icon d={SPARKLE_ICON} className="size-3.5" />
        Write with AI
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2.5 rounded-xl border border-accent/30 bg-accent-soft/50 p-3">
      {error && <Alert>{error}</Alert>}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-accent">
          <Icon d={SPARKLE_ICON} className="size-3.5" />
          Write with AI
        </span>
        <div className="flex gap-1" role="group" aria-label="Language">
          {WRITE_LANGUAGES.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLanguage(l.id)}
              aria-pressed={language === l.id}
              className={cx("rounded-full px-2 py-0.5 text-xs transition-colors", language === l.id ? "bg-accent font-medium text-white" : "text-muted hover:bg-surface")}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <textarea
        autoFocus
        rows={2}
        maxLength={1000}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && prompt.trim()) run("write");
        }}
        placeholder={current.trim() ? "What to change (optional), or describe a new one" : PLACEHOLDER[kind]}
        aria-label="What should it say?"
        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy !== null}>
          Cancel
        </Button>
        {current.trim() && (
          <Button type="button" variant="secondary" size="sm" onClick={() => run("improve")} loading={busy === "improve"} disabled={busy !== null}>
            Improve my text
          </Button>
        )}
        <Button type="button" size="sm" onClick={() => run("write")} loading={busy === "write"} disabled={busy !== null || !prompt.trim()}>
          Write
        </Button>
      </div>
      <p className="text-[11px] text-muted">Replaces the text above. Read it through before you send.</p>
    </div>
  );
}
