"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActionCard, ActionModal } from "./ai-action";
import { ChatWelcome } from "./ai-welcome";
import { Markdown, StudentQuickView, useStudentClicks, useWhatsAppRequests, type WhatsAppRequest } from "./ai-answer";
import { WhatsAppDrawer } from "./whatsapp-send";
import { Drawer, errorMessage, useDebounced } from "./data";
import { Button, Icon, Skeleton, cx } from "./ui";
import { CHAT_LANGUAGES, TOOL_LABEL, TOOL_SOURCE, readChatLanguage, saveChatLanguage, setAiUsage, type AiAction, type ChatLanguage, type WriteLanguage, useAiStatus, type AiChatSummary, type AiChatThread } from "@/lib/ai";
import { ApiError, api, apiStream } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const SPARKLE_ICON = "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8zM5 3l.6 1.4L7 5l-1.4.6L5 7l-.6-1.4L3 5l1.4-.6z";
const SEND_ICON = "M5 12h14M13 6l6 6-6 6";
const STOP_ICON = "M7 7h10v10H7z";
const HISTORY_ICON = "M3 12a9 9 0 103-6.7M3 4v5h5M12 7v5l3 2";
const NEW_ICON = "M12 5v14M5 12h14";
const PIN_ICON = "M9 4h6l-1 6 4 3H6l4-3-1-6zM12 13v7";
const EDIT_ICON = "M4 20h4L18.5 9.5a2.1 2.1 0 00-4-4L4 16v4z";
const TRASH_ICON = "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3";
const BACK_ICON = "M15 6l-6 6 6 6";
const COPY_ICON = "M9 9h11v11H9zM5 15H4V4h11v1";
const FOLLOW_ICON = "M5 5v6a4 4 0 004 4h10M15 11l4 4-4 4";
const CHECK_ICON = "M5 12l5 5L20 7";

interface Message {
  role: "user" | "model";
  text: string;
  /** What it's looking up right now (while answering) */
  working?: string;
  error?: boolean;
  /** Data the answer used (model messages) */
  tools?: string[];
  /** Changes the answer prepared, to confirm (AiAction ids) */
  actions?: string[];
  /** While answering: the lookups so far (the last one is running) */
  steps?: string[];
  /** Text is still arriving */
  streaming?: boolean;
  /** Suggested next questions (shown under the latest answer) */
  followups?: string[];
}

/** Starter questions per role, in the chosen reply language ("auto" shows English). */
const SUGGESTIONS: Record<WriteLanguage, Record<string, string[]>> = {
  en: {
    owner: ["Who has overdue fees?", "How much fee did we collect this month?", "Which classes haven't marked attendance today?", "Students below 75% attendance this month"],
    admin: ["Who has overdue fees?", "How much fee did we collect this month?", "Which classes haven't marked attendance today?", "Top 5 students this month"],
    teacher: ["Who is absent today?", "Students below 75% attendance this month", "How did my class do in the last test?", "Top 5 students in my class this month"],
    accountant: ["Who has overdue fees?", "How much did we collect this month, by mode?", "Fees due in class 5", "What does Riya owe?"],
  },
  hi: {
    owner: ["किन बच्चों की फीस बकाया है?", "इस महीने कितनी फीस जमा हुई?", "आज किन कक्षाओं की हाजिरी नहीं लगी?", "इस महीने 75% से कम हाजिरी वाले बच्चे"],
    admin: ["किन बच्चों की फीस बकाया है?", "इस महीने कितनी फीस जमा हुई?", "आज किन कक्षाओं की हाजिरी नहीं लगी?", "इस महीने के टॉप 5 बच्चे"],
    teacher: ["आज कौन-कौन अनुपस्थित है?", "इस महीने 75% से कम हाजिरी वाले बच्चे", "पिछली परीक्षा में मेरी कक्षा का परिणाम कैसा रहा?", "इस महीने मेरी कक्षा के टॉप 5 बच्चे"],
    accountant: ["किन बच्चों की फीस बकाया है?", "इस महीने कितनी फीस जमा हुई, किस माध्यम से?", "कक्षा 5 की बकाया फीस", "रिया की कितनी फीस बाकी है?"],
  },
  mr: {
    owner: ["कोणाची फी थकबाकी आहे?", "या महिन्यात किती फी जमा झाली?", "आज कोणत्या वर्गांची हजेरी झाली नाही?", "या महिन्यात 75% पेक्षा कमी हजेरी असलेले विद्यार्थी"],
    admin: ["कोणाची फी थकबाकी आहे?", "या महिन्यात किती फी जमा झाली?", "आज कोणत्या वर्गांची हजेरी झाली नाही?", "या महिन्यातील टॉप 5 विद्यार्थी"],
    teacher: ["आज कोण गैरहजर आहे?", "या महिन्यात 75% पेक्षा कमी हजेरी असलेले विद्यार्थी", "मागील परीक्षेत माझ्या वर्गाचा निकाल कसा लागला?", "या महिन्यातील माझ्या वर्गाचे टॉप 5 विद्यार्थी"],
    accountant: ["कोणाची फी थकबाकी आहे?", "या महिन्यात किती फी जमा झाली, कोणत्या पद्धतीने?", "इयत्ता 5 ची थकबाकी फी", "रियाची किती फी बाकी आहे?"],
  },
};

const PLACEHOLDER: Record<WriteLanguage, [string, string]> = {
  en: ["Ask about students, attendance, fees, tests…", "Ask a follow-up…"],
  hi: ["बच्चों, हाजिरी, फीस या परीक्षा के बारे में पूछें…", "आगे पूछें…"],
  mr: ["विद्यार्थी, हजेरी, फी किंवा परीक्षेबद्दल विचारा…", "पुढे विचारा…"],
};

/** A reply that means "go ahead" (English, Hinglish, Hindi, Marathi, common misspellings). */
const CONFIRM_WORDS = /^(yes|yeah|yep|ok|okay|confirm|conform|confirmed|done|go ahead|do it|haan|han|ha|haa|ji|ho|हाँ|हां|हा|हो|ठीक है|करो|कर दो)(?=$|[\s.!,])[\s.!,]*[^\s]*[\s.!]*$/iu;

// The open chat's id, per school, so closing and reopening the panel continues it
const storeKey = (tenantId: string) => `eduflow.ask.${tenantId}`;
function readOpenChat(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeOpenChat(key: string, id: string | null) {
  try {
    if (id) sessionStorage.setItem(key, id);
    else sessionStorage.removeItem(key);
  } catch {
    // Storage blocked: the panel opens on a new chat
  }
}

/** "just now", "5 min ago", "Yesterday", "12 Nov" */
function when(iso: string) {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const today = new Date();
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000);
  if (days === 0) return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) });
}

// ---------------------------------------------------------------------------

/** Whether to offer the assistant: when it can be used, or an owner/admin can switch it on. */
function useAskVisible() {
  const status = useAiStatus();
  if (!status || status.state === "unavailable") return false;
  return status.canManage || status.state === "ready" || status.state === "quota";
}

/** Opens the chat panel from anywhere. */
/** Opens the chat panel; with a question, asks it in a new chat (e.g. from the daily summary). */
export const openAsk = (question?: string) => window.dispatchEvent(new CustomEvent("eduflow:ask", { detail: question ? { question } : null }));

/** "Ask EduFlow" in the top bar: a labelled button on desktop, an icon on phones. */
export function AskButton({ compact }: { compact?: boolean }) {
  if (!useAskVisible()) return null;
  return compact ? (
    <button onClick={() => openAsk()} aria-label="Ask EduFlow" className="grid size-9 place-items-center rounded-full text-accent active:bg-accent-soft">
      <Icon d={SPARKLE_ICON} className="size-5" />
    </button>
  ) : (
    <button
      onClick={() => openAsk()}
      className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft px-3 text-sm font-medium text-accent transition-colors hover:border-accent/60"
    >
      <Icon d={SPARKLE_ICON} />
      Ask EduFlow
    </button>
  );
}

/** The chat panel, mounted once in the app layout and opened by AskButton (or Ctrl J). */
export function AskEduFlow() {
  const { session } = useAuth();
  const visible = useAskVisible();
  const [open, setOpen] = useState(false);
  // A question to ask as soon as the panel opens (n changes each time)
  const [start, setStart] = useState<{ question: string; n: number } | null>(null);
  const role = session.status === "authenticated" ? (session.role ?? "") : "";
  const tenantId = session.status === "authenticated" ? (session.tenant?.id ?? "") : "";

  useEffect(() => {
    const onOpen = (e: Event) => {
      const q = (e as CustomEvent<{ question: string } | null>).detail?.question;
      if (q) setStart((s) => ({ question: q, n: (s?.n ?? 0) + 1 }));
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("eduflow:ask", onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("eduflow:ask", onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!visible || !open) return null;
  // `onStarted` clears the question once asked, so opening the chat later doesn't ask it again
  return <ChatPanel key={tenantId} role={role} store={storeKey(tenantId)} startWith={start} onStarted={() => setStart(null)} onClose={() => setOpen(false)} />;
}

// The browser's speech recognition (Chrome, Edge, Safari; not Firefox): free, on the device/browser
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
const SPEECH_LANG: Record<string, string> = { auto: "en-IN", en: "en-IN", hi: "hi-IN", mr: "mr-IN" };
const MIC_ICON = "M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zM5 11a7 7 0 0014 0M12 18v3";

/** Speak a question: fills the box as you talk (in the chat's reply language). */
function useVoice(language: string, onText: (text: string) => void) {
  const rec = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && Boolean((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition);
  useEffect(() => () => rec.current?.stop(), []);
  function toggle() {
    if (listening) return rec.current?.stop();
    const W = window as unknown as Record<string, new () => Recognition>;
    const R = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!R) return;
    const r = new R();
    r.lang = SPEECH_LANG[language] ?? "en-IN";
    r.interimResults = true;
    r.continuous = false;
    let text = "";
    r.onresult = (e) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      text = (final + interim).trim();
      onText(text);
    };
    r.onerror = (e) => setError(e.error === "not-allowed" ? "Allow the microphone to ask by voice." : e.error === "no-speech" ? "Didn't hear anything. Try again." : "Voice didn't work. Try again or type.");
    r.onend = () => setListening(false);
    setError(null);
    rec.current = r;
    r.start();
    setListening(true);
  }
  return { supported, listening, error, toggle };
}

function ChatPanel({ role, store, startWith, onStarted, onClose }: { role: string; store: string; startWith: { question: string; n: number } | null; onStarted: () => void; onClose: () => void }) {
  const status = useAiStatus()!;
  const [view, setView] = useState<"chat" | "history">("chat");
  const [chatId, setChatId] = useState<string | null>(() => readOpenChat(store));
  const [title, setTitle] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChat, setLoadingChat] = useState(Boolean(chatId));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [language, setLanguageState] = useState<ChatLanguage>(readChatLanguage);
  const setLanguage = (l: ChatLanguage) => {
    setLanguageState(l);
    saveChatLanguage(l);
  };
  const uiLanguage: WriteLanguage = language === "auto" ? "en" : language;
  const abort = useRef<AbortController | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const voice = useVoice(language, (text) => setInput(text));
  const [student, setStudent] = useState<string | null>(null);
  useStudentClicks(useCallback((id: string) => setStudent(id), []));
  const [whatsapp, setWhatsapp] = useState<WhatsAppRequest | null>(null);
  // Prepared changes by id, and the one being reviewed
  const [actionsById, setActionsById] = useState<Record<string, AiAction>>({});
  const [reviewing, setReviewing] = useState<string | null>(null);
  const putAction = useCallback((a: AiAction) => setActionsById((m) => ({ ...m, [a.id]: a })), []);

  // Saved chats: load the current state of their actions
  useEffect(() => {
    const missing = messages.flatMap((m) => m.actions ?? []).filter((id) => !actionsById[id]);
    for (const id of new Set(missing)) api<{ action: AiAction }>(`/api/ai/actions/${id}`).then((r) => putAction(r.action)).catch(() => {});
  }, [messages, actionsById, putAction]);
  useWhatsAppRequests(useCallback((r: WhatsAppRequest) => setWhatsapp(r), []));

  // Reopen the chat that was open last time (unless it opened to ask something new)
  useEffect(() => {
    const id = readOpenChat(store);
    if (id && !startWith) openChat(id);
    return () => abort.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (view === "chat") end.current?.scrollIntoView({ block: "end" });
  }, [messages, view]);

  async function openChat(id: string) {
    setView("chat");
    setLoadingChat(true);
    try {
      const { chat } = await api<{ chat: AiChatThread }>(`/api/ai/chats/${id}`);
      setChatId(chat.id);
      setTitle(chat.title);
      setMessages(chat.messages.map(({ role, text, tools, actions, followups }) => ({ role, text, tools, actions, followups })));
      writeOpenChat(store, chat.id);
    } catch {
      newChat();
    } finally {
      setLoadingChat(false);
    }
  }

  function newChat() {
    abort.current?.abort();
    setChatId(null);
    setTitle("");
    setMessages([]);
    setView("chat");
    writeOpenChat(store, null);
    setTimeout(() => box.current?.focus(), 0);
  }

  const update = (fn: (m: Message) => Message) => setMessages((all) => [...all.slice(0, -1), fn(all[all.length - 1])]);

  // Asked from elsewhere (the daily summary): a new chat with that question
  const asked = useRef(0);
  useEffect(() => {
    if (!startWith || startWith.n === asked.current) return;
    // A tick later, and cancelled on unmount: React's development double mount (and Fast
    // Refresh) unmounts once first, and that cleanup would stop a request sent right away
    const timer = setTimeout(() => {
      asked.current = startWith.n;
      abort.current?.abort();
      setView("chat");
      setChatId(null);
      setTitle("");
      setMessages([]);
      setLoadingChat(false);
      writeOpenChat(store, null);
      ask(startWith.question, { fresh: true });
      onStarted();
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startWith]);

  async function ask(question: string, { fresh = false }: { fresh?: boolean } = {}) {
    const q = question.trim();
    if (!q || (busy && !fresh)) return;
    // "yes" / "confirm" while a change waits: open its confirm dialog (the AI can't confirm)
    const waiting = messages
      .flatMap((m) => m.actions ?? [])
      .map((id) => actionsById[id])
      .filter((a) => a && a.status === "pending" && new Date(a.expiresAt) > new Date())
      .at(-1);
    if (waiting && CONFIRM_WORDS.test(q)) {
      setInput("");
      setReviewing(waiting.id);
      return;
    }
    setMessages((m) => [...m, { role: "user", text: q }, { role: "model", text: "", working: "Thinking", steps: [] }]);
    setInput("");
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      await apiStream(
        "/api/ai/chat",
        { question: q, language, ...(chatId && !fresh ? { chatId } : {}) },
        (event, data) => {
          const d = data as Record<string, unknown>;
          if (event === "tool") {
            const label = TOOL_LABEL[d.name as string] ?? "Looking it up";
            update((m) => ({ ...m, working: label, steps: [...(m.steps ?? []), label], tools: [...new Set([...(m.tools ?? []), d.name as string])] }));
          }
          else if (event === "action") {
            const a = d as unknown as AiAction;
            putAction(a);
            update((m) => ({ ...m, actions: [...(m.actions ?? []), a.id] }));
            // Ask right away: which student (if several match), then confirm
            setReviewing(a.id);
          } else if (event === "text") update((m) => ({ ...m, text: m.text + (d.delta as string), working: undefined, streaming: true }));
          else if (event === "chat") {
            setChatId(d.id as string);
            setTitle(d.title as string);
            writeOpenChat(store, d.id as string);
          } else if (event === "followups") update((m) => ({ ...m, followups: (d.questions as string[]).slice(0, 3) }));
          else if (event === "done") {
            update((m) => ({ ...m, working: undefined, streaming: false }));
            const u = d.usage as { used: number; quota: number };
            setAiUsage(u.used, u.quota);
          } else if (event === "error") update((m) => ({ ...m, working: undefined, streaming: false, error: true, text: m.text ? `${m.text}\n\n${d.message}` : (d.message as string) }));
        },
        controller.signal
      );
    } catch (err) {
      if ((err as Error)?.name === "AbortError") update((m) => ({ ...m, working: undefined, streaming: false, text: m.text || "Stopped.", error: !m.text }));
      else {
        if (err instanceof ApiError && err.code === "AI_CHAT_NOT_FOUND") {
          setChatId(null);
          writeOpenChat(store, null);
        }
        update((m) => ({ ...m, working: undefined, streaming: false, error: true, text: err instanceof ApiError ? err.message : "Something went wrong. Please try again." }));
      }
    } finally {
      setBusy(false);
      abort.current = null;
      box.current?.focus();
    }
  }

  const { used, quota } = status.usage;
  const blocked = status.state !== "ready";
  const headerButton = "grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-muted hover:text-foreground";

  return (
    <Drawer
      size="lg"
      title={
        <span className="flex min-w-0 items-center gap-2">
          {view === "history" ? (
            <button onClick={() => setView("chat")} aria-label="Back to chat" className={headerButton}>
              <Icon d={BACK_ICON} />
            </button>
          ) : (
            <span className={cx("grid size-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent to-violet-600 text-white shadow-sm", busy && "motion-safe:animate-glow")}>
              <Icon d={SPARKLE_ICON} className={cx("size-4", busy && "motion-safe:animate-spin-slow")} />
            </span>
          )}
          <span className="min-w-0 truncate">{view === "history" ? "Your chats" : title || "Ask EduFlow"}</span>
          <span className="ml-auto flex shrink-0 items-center gap-0.5 pl-2">
            {view === "chat" && (
              <button onClick={() => setView("history")} aria-label="Chat history" title="Chat history" className={headerButton}>
                <Icon d={HISTORY_ICON} />
              </button>
            )}
            {(messages.length > 0 || view === "history") && (
              <button onClick={newChat} disabled={busy} aria-label="New chat" title="New chat" className={cx(headerButton, "disabled:opacity-40")}>
                <Icon d={NEW_ICON} />
              </button>
            )}
          </span>
        </span>
      }
      onClose={onClose}
      footer={
        view === "history" ? null : blocked ? (
          <Unavailable state={status.state} onClose={onClose} />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="space-y-2"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-1.5 shadow-sm transition-all duration-200 focus-within:border-accent focus-within:shadow-md focus-within:ring-4 focus-within:ring-accent/15">
              <textarea
                ref={box}
                autoFocus
                rows={1}
                value={input}
                maxLength={1000}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    ask(input);
                  }
                }}
                placeholder={PLACEHOLDER[uiLanguage][messages.length ? 1 : 0]}
                aria-label="Your question"
                className="max-h-32 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none field-sizing-content"
              />
              {voice.supported && !busy && (
                <button
                  type="button"
                  onClick={voice.toggle}
                  aria-label={voice.listening ? "Stop listening" : "Ask by voice"}
                  aria-pressed={voice.listening}
                  title={voice.listening ? "Listening… tap to stop" : "Ask by voice"}
                  className={cx("relative grid size-8 shrink-0 place-items-center rounded-xl transition-colors", voice.listening ? "bg-danger text-white" : "text-muted hover:bg-surface-muted hover:text-foreground")}
                >
                  {voice.listening && <span aria-hidden className="absolute inset-0 rounded-xl bg-danger/60 motion-safe:animate-ping" />}
                  <Icon d={MIC_ICON} className="relative size-4" />
                </button>
              )}
              {busy ? (
                <Button type="button" size="icon-sm" variant="secondary" onClick={() => abort.current?.abort()} aria-label="Stop">
                  <Icon d={STOP_ICON} className="size-3.5" />
                </Button>
              ) : (
                <Button type="submit" size="icon-sm" disabled={!input.trim() || loadingChat} aria-label="Send" className="rounded-xl transition-transform hover:scale-105 active:scale-95">
                  <Icon d={SEND_ICON} />
                </Button>
              )}
            </div>
            {voice.error && <p className="text-[11px] text-danger">{voice.error}</p>}
            {voice.listening && <p className="text-[11px] text-muted" aria-live="polite">Listening… speak your question, then tap send.</p>}
            <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
              <div className="flex items-center gap-1" role="group" aria-label="Reply language">
                <span className="mr-0.5">Reply in</span>
                {CHAT_LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLanguage(l.id)}
                    aria-pressed={language === l.id}
                    title={l.label}
                    className={cx("rounded-full px-2 py-0.5 transition-colors", language === l.id ? "bg-accent font-medium text-white" : "hover:bg-surface-muted hover:text-foreground")}
                  >
                    <span className="sm:hidden">{l.short}</span>
                    <span className="hidden sm:inline">{l.label}</span>
                  </button>
                ))}
              </div>
              <span className="shrink-0 tabular-nums">
                {used}/{quota} this month
              </span>
            </div>
          </form>
        )
      }
    >
      {view === "history" ? (
        <ChatHistory currentId={chatId} onOpen={openChat} onDeleted={(id) => (id === null || id === chatId) && newChat()} onRenamed={(id, t) => id === chatId && setTitle(t)} />
      ) : loadingChat ? (
        <div className="space-y-4">
          <Skeleton className="ml-auto h-9 w-2/3 rounded-2xl" />
          <Skeleton className="h-24 w-11/12 rounded-xl" />
        </div>
      ) : messages.length === 0 ? (
        <ChatWelcome
          language={uiLanguage}
          role={role}
          suggestions={SUGGESTIONS[uiLanguage][role] ?? SUGGESTIONS[uiLanguage].owner}
          blocked={blocked}
          onAsk={ask}
          onPrefill={(q) => {
            setInput(q);
            setTimeout(() => {
              box.current?.focus();
              box.current?.setSelectionRange(q.length, q.length);
            }, 0);
          }}
          onHistory={() => setView("history")}
        />
      ) : (
        <div className="space-y-5 text-sm leading-relaxed">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div key={i} className="ml-auto w-fit max-w-[85%] origin-bottom-right rounded-2xl rounded-br-md bg-gradient-to-br from-accent to-violet-600 px-3.5 py-2 text-white shadow-sm shadow-accent/20 motion-safe:animate-pop">
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
              </div>
            ) : (
              <div key={i} className="flex gap-3 motion-safe:animate-rise">
                <span
                  className={cx(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg",
                    m.error ? "bg-danger-soft text-danger" : "bg-gradient-to-br from-accent to-violet-600 text-white shadow-sm",
                    (m.working || m.streaming) && busy && "motion-safe:animate-glow"
                  )}
                >
                  <Icon d={SPARKLE_ICON} className={cx("size-4", m.working && busy && "motion-safe:animate-spin-slow")} />
                </span>
                <div className={cx("min-w-0 flex-1", m.error && "rounded-xl bg-danger-soft px-3.5 py-2.5")}>
                  {m.text && <Markdown text={m.text} onLink={onClose} />}
                  {m.working && <Working label={m.working} steps={m.steps ?? []} />}
                  {m.streaming && busy && <span aria-hidden className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 rounded-full bg-accent motion-safe:animate-caret" />}
                  {m.actions?.map((id) => <ActionCard key={id} action={actionsById[id]} onReview={() => setReviewing(id)} />)}
                  {!m.working && !m.streaming && !m.error && m.text && <AnswerFooter text={m.text} tools={m.tools} />}
                  {i === messages.length - 1 && !busy && !blocked && (m.followups?.length ?? 0) > 0 && <FollowUps questions={m.followups!} onAsk={ask} />}
                </div>
              </div>
            )
          )}
          <div ref={end} />
        </div>
      )}
      {reviewing && actionsById[reviewing] && <ActionModal key={reviewing} action={actionsById[reviewing]} onChange={putAction} onClose={() => setReviewing(null)} onNavigate={onClose} />}
      {whatsapp && (
        <WhatsAppDrawer
          type={whatsapp.type}
          refs={whatsapp.refs}
          title={`${whatsapp.title} · ${whatsapp.refs.length} parent${whatsapp.refs.length === 1 ? "" : "s"}`}
          onClose={() => setWhatsapp(null)}
        />
      )}
      {student && (
        <StudentQuickView
          id={student}
          role={role}
          onClose={() => setStudent(null)}
          onNavigate={onClose}
          onAsk={(q) => {
            setStudent(null);
            setView("chat");
            setInput(q);
            setTimeout(() => box.current?.focus(), 0);
          }}
        />
      )}
    </Drawer>
  );
}

/** While the assistant works: what it has looked up so far, and a shimmering current step. */
function Working({ label, steps }: { label: string; steps: string[] }) {
  // The current step is the last one; earlier ones are done
  const done = steps.length && steps[steps.length - 1] === label ? steps.slice(0, -1) : steps;
  return (
    <div className="space-y-1.5 py-1" aria-live="polite">
      {done.map((s, i) => (
        <p key={i} className="flex items-center gap-2 text-xs text-muted motion-safe:animate-rise">
          <span className="grid size-4 place-items-center rounded-full bg-success-soft text-success">
            <Icon d={CHECK_ICON} className="size-2.5" />
          </span>
          {s}
        </p>
      ))}
      <p className="flex items-center gap-2 text-sm motion-safe:animate-rise">
        <span aria-hidden className="relative grid size-4 place-items-center">
          <span className="absolute inset-0 rounded-full border-2 border-accent/20" />
          <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent motion-safe:animate-spin" />
        </span>
        <span className="bg-[linear-gradient(90deg,var(--muted)_20%,var(--foreground)_50%,var(--muted)_80%)] bg-[length:200%_100%] bg-clip-text font-medium text-transparent motion-safe:animate-shimmer motion-reduce:text-muted">
          {label}…
        </span>
      </p>
    </div>
  );
}

/** Suggested next questions under the latest answer. */
function FollowUps({ questions, onAsk }: { questions: string[]; onAsk: (q: string) => void }) {
  return (
    <div className="mt-3 flex flex-col items-start gap-1.5" aria-label="Suggested questions">
      {questions.map((q, i) => (
        <button
          key={q}
          onClick={() => onAsk(q)}
          style={{ animationDelay: `${120 + i * 70}ms` }}
          className="group inline-flex max-w-full items-center gap-2 rounded-full border border-accent/25 bg-accent-soft/50 py-1.5 pl-2.5 pr-3.5 text-left text-[13px] text-foreground transition-all duration-200 hover:-translate-y-px hover:border-accent/50 hover:bg-accent-soft hover:shadow-sm motion-safe:animate-rise"
        >
          <Icon d={FOLLOW_ICON} className="size-3.5 shrink-0 text-accent transition-transform duration-200 group-hover:translate-x-0.5" />
          <span className="truncate">{q}</span>
        </button>
      ))}
    </div>
  );
}

/** Under an answer: which records it used, and copy. */
function AnswerFooter({ text, tools }: { text: string; tools?: string[] }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      // Plain text: links and bold markers removed
      await navigator.clipboard.writeText(text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: nothing to do
    }
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {tools?.map((t) => (
        <span key={t} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted">
          {TOOL_SOURCE[t] ?? t}
        </span>
      ))}
      <button type="button" onClick={copy} className="ml-auto flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-muted hover:bg-surface-muted hover:text-foreground">
        <Icon d={copied ? CHECK_ICON : COPY_ICON} className="size-3.5" />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/** The member's saved chats: search, open, pin, rename, delete. */
function ChatHistory({
  currentId,
  onOpen,
  onDeleted,
  onRenamed,
}: {
  currentId: string | null;
  onOpen: (id: string) => void;
  /** null: all chats were deleted */
  onDeleted: (id: string | null) => void;
  onRenamed: (id: string, title: string) => void;
}) {
  const [q, setQ] = useState("");
  const search = useDebounced(q.trim(), 250);
  const [chats, setChats] = useState<AiChatSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ chats: AiChatSummary[] }>(`/api/ai/chats${search ? `?q=${encodeURIComponent(search)}` : ""}`)
      .then((r) => !cancelled && (setChats(r.chats), setError(null)))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [search]);

  async function act(fn: () => Promise<void>) {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  const pin = (c: AiChatSummary) =>
    act(async () => {
      await api(`/api/ai/chats/${c.id}`, { method: "PATCH", body: { pinned: !c.pinned } });
      setChats((all) => sortChats((all ?? []).map((x) => (x.id === c.id ? { ...x, pinned: !c.pinned } : x))));
    });
  const rename = (id: string, title: string) =>
    act(async () => {
      const t = title.trim();
      setEditing(null);
      if (!t) return;
      await api(`/api/ai/chats/${id}`, { method: "PATCH", body: { title: t } });
      setChats((all) => (all ?? []).map((x) => (x.id === id ? { ...x, title: t } : x)));
      onRenamed(id, t);
    });
  const remove = (c: AiChatSummary) =>
    act(async () => {
      if (!confirm(`Delete “${c.title}”?`)) return;
      await api(`/api/ai/chats/${c.id}`, { method: "DELETE" });
      setChats((all) => (all ?? []).filter((x) => x.id !== c.id));
      onDeleted(c.id);
    });
  const removeAll = () =>
    act(async () => {
      if (!confirm("Delete all your chats? This can't be undone.")) return;
      await api("/api/ai/chats", { method: "DELETE" });
      setChats([]);
      onDeleted(null);
    });

  const pinned = chats?.filter((c) => c.pinned) ?? [];
  const recent = chats?.filter((c) => !c.pinned) ?? [];

  const row = (c: AiChatSummary) => (
    <li key={c.id} className={cx("group flex items-center gap-1 rounded-xl pr-1 transition-colors hover:bg-surface-muted", c.id === currentId && "bg-accent-soft hover:bg-accent-soft")}>
      {editing?.id === c.id ? (
        <form
          className="flex-1 p-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            rename(c.id, editing.title);
          }}
        >
          <input
            autoFocus
            value={editing.title}
            maxLength={100}
            onChange={(e) => setEditing({ id: c.id, title: e.target.value })}
            onBlur={() => rename(c.id, editing.title)}
            onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), setEditing(null))}
            aria-label="Chat name"
            className="h-8 w-full rounded-lg border border-accent bg-surface px-2 text-sm outline-none"
          />
        </form>
      ) : (
        <button onClick={() => onOpen(c.id)} className="min-w-0 flex-1 px-3 py-2 text-left">
          <span className="block truncate text-sm font-medium">{c.title}</span>
          <span className="text-xs text-muted">
            {when(c.updatedAt)} · {Math.ceil(c.messages / 2)} question{c.messages > 2 ? "s" : ""}
          </span>
        </button>
      )}
      {editing?.id !== c.id && (
        <span className="flex shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
          <button onClick={() => pin(c)} aria-label={c.pinned ? "Unpin" : "Pin"} title={c.pinned ? "Unpin" : "Pin"} className={cx("grid size-8 place-items-center rounded-lg hover:bg-surface", c.pinned ? "text-accent" : "text-muted")}>
            <Icon d={PIN_ICON} className="size-4" />
          </button>
          <button onClick={() => setEditing({ id: c.id, title: c.title })} aria-label="Rename" title="Rename" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-foreground">
            <Icon d={EDIT_ICON} className="size-4" />
          </button>
          <button onClick={() => remove(c)} aria-label="Delete" title="Delete" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-danger">
            <Icon d={TRASH_ICON} className="size-4" />
          </button>
        </span>
      )}
    </li>
  );

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search your chats"
        aria-label="Search your chats"
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
      />
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm">{error}</p>}
      {!chats ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : chats.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{search ? "No chats match that." : "No saved chats yet. Your questions are saved here so you can come back to them."}</p>
      ) : (
        <>
          {pinned.length > 0 && (
            <section>
              <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wide text-muted">Pinned</p>
              <ul className="space-y-0.5">{pinned.map(row)}</ul>
            </section>
          )}
          {recent.length > 0 && (
            <section>
              {pinned.length > 0 && <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wide text-muted">Recent</p>}
              <ul className="space-y-0.5">{recent.map(row)}</ul>
            </section>
          )}
          {!search && (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted">
              <span>Only you can see your chats. They&apos;re removed after 6 months unused.</span>
              <button onClick={removeAll} className="shrink-0 font-medium text-danger hover:underline">
                Delete all
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const sortChats = (list: AiChatSummary[]) => [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));

function Unavailable({ state, onClose }: { state: string; onClose: () => void }) {
  const text =
    state === "off"
      ? "The AI assistant is off for your school. Turn it on in Settings to start asking."
      : state === "quota"
        ? "Your school has used this month's AI questions. They reset on the 1st."
        : "The AI assistant is part of the Pro plan.";
  const link = state === "off" ? "/app/settings/ai" : state === "not_in_plan" ? "/app/settings/billing" : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted">{text}</p>
      {link && (
        <Link href={link} onClick={onClose} className="font-semibold text-accent hover:underline">
          {state === "off" ? "Turn it on →" : "See plans →"}
        </Link>
      )}
    </div>
  );
}
