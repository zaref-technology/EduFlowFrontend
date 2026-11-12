"use client";

import { useSyncExternalStore } from "react";
import { api } from "./api";

/** ready: can ask · off: the school hasn't turned it on · quota: this month's questions are used · not_in_plan / unavailable */
export type AiState = "ready" | "off" | "quota" | "not_in_plan" | "unavailable";

export interface AiStatus {
  state: AiState;
  canManage: boolean;
  enabledBy: { name: string; at: string | null } | null;
  usage: { used: number; quota: number; month: string };
}

export interface AiQueryRow {
  id: string;
  kind: "chat" | "write";
  question: string;
  tools: string[];
  ok: boolean;
  by: string;
  at: string;
}

export interface AiChatSummary {
  id: string;
  title: string;
  pinned: boolean;
  /** Messages in the chat (a question and its answer are two) */
  messages: number;
  updatedAt: string;
}

export interface AiChatThread {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  messages: { role: "user" | "model"; text: string; tools: string[]; actions?: string[]; at: string }[];
}

/** A change the assistant prepared; nothing is written until the member confirms. */
export type AiActionKind = "fee_payment" | "attendance" | "class_attendance" | "student_note";
export interface AiAction {
  id: string;
  kind: AiActionKind;
  status: "pending" | "running" | "done" | "cancelled" | "failed";
  /** The name the assistant searched for */
  query: string;
  params: {
    amount?: number;
    mode?: string;
    date?: string;
    note?: string;
    status?: string;
    kind?: string;
    text?: string;
    // Whole-class attendance
    grade?: string;
    section?: string;
    everyone?: string;
    entries?: { studentId: string; name: string; rollNo: string; status: string; was: string | null }[];
    unmatched?: string[];
    ambiguous?: { query: string; status: string; ids: string[] }[];
  };
  candidates: { id: string; name: string; class: string; admissionNo: string; guardianName: string; balance: number | null; hasFeePlan: boolean | null; attendance: string | null }[];
  studentId: string | null;
  result: { paymentId?: string; receiptNo?: string; balance?: number; advance?: number; status?: string; date?: string; noteId?: string; counts?: Record<string, number> } | null;
  error: string | null;
  expiresAt: string;
  createdAt: string;
}

export type WriteKind = "notice" | "whatsapp" | "fee_reminder" | "homework" | "remark";
export type WriteLanguage = "en" | "hi" | "mr";
export const WRITE_LANGUAGES: { id: WriteLanguage; label: string }[] = [
  { id: "en", label: "English" },
  { id: "hi", label: "हिन्दी" },
  { id: "mr", label: "मराठी" },
];

/** The language "Ask EduFlow" answers in ("auto": the question's language). Remembered per browser. */
export type ChatLanguage = "auto" | WriteLanguage;
export const CHAT_LANGUAGES: { id: ChatLanguage; label: string; short: string }[] = [
  { id: "auto", label: "Auto", short: "Auto" },
  { id: "en", label: "English", short: "EN" },
  { id: "hi", label: "हिन्दी", short: "हि" },
  { id: "mr", label: "मराठी", short: "म" },
];
const LANGUAGE_KEY = "eduflow.ask-language";
export function readChatLanguage(): ChatLanguage {
  try {
    const v = localStorage.getItem(LANGUAGE_KEY);
    return v === "en" || v === "hi" || v === "mr" ? v : "auto";
  } catch {
    return "auto";
  }
}
export function saveChatLanguage(l: ChatLanguage) {
  try {
    localStorage.setItem(LANGUAGE_KEY, l);
  } catch {
    // Storage blocked: it resets next visit
  }
}

/** What the assistant is doing while a tool runs, e.g. "Checking fees…". */
export const TOOL_LABEL: Record<string, string> = {
  list_classes: "Looking at classes",
  find_students: "Finding students",
  student_details: "Opening the student's record",
  attendance_today: "Checking today's attendance",
  attendance_report: "Checking attendance",
  fee_dues: "Checking fee dues",
  fee_collections: "Checking collections",
  test_results: "Reading test results",
  leaderboard: "Checking rankings",
  prepare_fee_payment: "Preparing the payment",
  prepare_attendance: "Preparing attendance",
  prepare_class_attendance: "Preparing the class register",
  prepare_student_note: "Preparing the note",
};

/** Short names for "Used: …" under an answer. */
export const TOOL_SOURCE: Record<string, string> = {
  list_classes: "Classes",
  find_students: "Students",
  student_details: "Student record",
  attendance_today: "Today's attendance",
  attendance_report: "Attendance",
  fee_dues: "Fee dues",
  fee_collections: "Collections",
  test_results: "Test results",
  leaderboard: "Rankings",
  prepare_fee_payment: "Fee payment",
  prepare_attendance: "Attendance change",
  prepare_class_attendance: "Class attendance",
  prepare_student_note: "Student note",
};

// One shared copy of the school's AI status (the chat button, settings page and composers)
let current: AiStatus | null = null;
let loading: Promise<void> | null = null;
let loadedAt = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load(force = false) {
  if (!force && (loading || Date.now() - loadedAt < 5 * 60_000)) return;
  loading = api<AiStatus>("/api/ai/status")
    .then((s) => {
      current = s;
      loadedAt = Date.now();
      emit();
    })
    .catch(() => {})
    .finally(() => {
      loading = null;
    });
}

export function useAiStatus() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      load();
      return () => listeners.delete(cb);
    },
    () => current,
    () => null
  );
}

export const refreshAiStatus = () => load(true);
export function setAiStatus(s: AiStatus) {
  current = s;
  loadedAt = Date.now();
  emit();
}
/** After a question: the server's new count (and "quota" once it's used up). */
export function setAiUsage(used: number, quota: number) {
  if (!current) return;
  current = { ...current, usage: { ...current.usage, used, quota }, state: current.state === "ready" && used >= quota ? "quota" : current.state };
  emit();
}
/** A super admin switching schools: forget the old school's status. */
export function resetAiStatus() {
  current = null;
  loadedAt = 0;
  emit();
}
