"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button, Field, ICONS, Icon, Input, Skeleton, cx } from "@/components/ui";
import { PhoneOtp, type OtpChallenge } from "@/components/phone-otp";
import { api } from "@/lib/api";
import { PageHeader, errorMessage, formatDate, useResource } from "./shared";

interface Settings {
  supportWhatsapp: string;
  supportEmail: string;
  updatedAt: string | null;
  cloudinary: { cloudName: string; apiKey: string; folder: string; secretSet: boolean; secretReadable: boolean };
  otp: { enabled: boolean; keySet: boolean; keyReadable: boolean; template: string; requireOnRegister: boolean };
  ai: { enabled: boolean; keySet: boolean; keyReadable: boolean; model: string; monthlyQuota: number };
  encryptionAvailable: boolean;
}

/** The console's platform settings (one request shared by the settings pages). */
function useAdminSettings() {
  return useResource(() => api<Settings>("/api/admin/settings"), "console-settings");
}

const SETTINGS_PAGES = [
  {
    href: "/console/settings/support",
    label: "Support contact",
    description: "The WhatsApp number and email schools reach from Renew, Choose a plan and Get Pro.",
    icon: "M4 20l1.3-3.9A8 8 0 1112 20a8 8 0 01-3.9-1L4 20z",
  },
  {
    href: "/console/settings/sms-otp",
    label: "SMS OTP (2Factor)",
    description: "Sign in with a mobile number and a one-time code, and verify numbers at sign-up.",
    icon: "M7 3h10v18H7zM11 18h2",
  },
  {
    href: "/console/settings/uploads",
    label: "Image uploads (Cloudinary)",
    description: "Where schools' logos are stored. Keys are checked with a test upload before saving.",
    icon: "M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01",
  },
  {
    href: "/console/settings/ai",
    label: "AI assistant (Gemini)",
    description: "Ask EduFlow and Write with AI for Pro schools: Gemini key, model and monthly limit per school.",
    icon: "M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8zM5 3l.6 1.4L7 5l-1.4.6L5 7l-.6-1.4L3 5l1.4-.6z",
  },
] as const;

/** Settings home: one card per settings page, with whether it's set up. */
export function SettingsHome() {
  const res = useAdminSettings();
  const s = res.data;
  const status = (href: string): { ok: boolean; text: string } | null => {
    if (!s) return null;
    if (href.endsWith("support")) return s.supportWhatsapp || s.supportEmail ? { ok: true, text: [s.supportWhatsapp && `+${s.supportWhatsapp}`, s.supportEmail].filter(Boolean).join(" · ") } : { ok: false, text: "Not set" };
    if (href.endsWith("/ai")) return s.ai.enabled ? { ok: true, text: `On · ${s.ai.model}` } : { ok: false, text: s.ai.keySet ? "Key saved, off" : "Off" };
    if (href.endsWith("sms-otp")) return s.otp.enabled ? { ok: true, text: "On" } : { ok: false, text: s.otp.keySet ? "Key saved, off" : "Off" };
    return s.cloudinary.cloudName && s.cloudinary.secretSet ? { ok: true, text: `On · ${s.cloudinary.cloudName}` } : { ok: false, text: "Off" };
  };
  return (
    <>
      <PageHeader title="Settings" description="Platform-wide settings for every school." icon={SETTINGS_ICON} />
      {res.error && <Alert>{res.error}</Alert>}
      <div className="grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SETTINGS_PAGES.map((p) => {
          const st = status(p.href);
          return (
            <Link key={p.href} href={p.href} className="group flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
              <span className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon d={p.icon} className="size-5" />
                </span>
                <Icon d={ICONS.chevronRight} className="text-muted transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="font-semibold">{p.label}</span>
              <span className="text-xs text-muted">{p.description}</span>
              {st ? (
                <span className={cx("mt-auto inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", st.ok ? "bg-success-soft text-success" : "bg-surface-muted text-muted")}>
                  <span className={cx("size-1.5 rounded-full", st.ok ? "bg-success" : "bg-zinc-400")} />
                  {st.text}
                </span>
              ) : (
                <Skeleton className="mt-auto h-5 w-20" />
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}

/** Back to the settings home, above each settings page's title. */
function SettingsBack() {
  return (
    <Link href="/console/settings" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground">
      <Icon d={ICONS.chevronLeft} />
      Settings
    </Link>
  );
}

export function SmsOtpSettings() {
  const res = useAdminSettings();
  return (
    <>
      <SettingsBack />
      <PageHeader title="SMS OTP (2Factor)" description="Sign in with a mobile number, and verify numbers at sign-up." icon={SETTINGS_PAGES[1].icon} />
      {res.error && <Alert>{res.error}</Alert>}
      {res.data ? <OtpCard settings={res.data} onSaved={res.setData} /> : <Skeleton className="h-72 max-w-2xl" />}
    </>
  );
}

export function UploadsSettings() {
  const res = useAdminSettings();
  return (
    <>
      <SettingsBack />
      <PageHeader title="Image uploads (Cloudinary)" description="Where schools' logos are stored." icon={SETTINGS_PAGES[2].icon} />
      {res.error && <Alert>{res.error}</Alert>}
      {res.data ? <CloudinaryCard settings={res.data} onSaved={res.setData} /> : <Skeleton className="h-72 max-w-2xl" />}
    </>
  );
}

const SETTINGS_ICON = "M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M10 16v4";

/** The support contact schools see on renew and upgrade buttons. */
export function SupportSettings() {
  const res = useAdminSettings();
  const [form, setForm] = useState<{ supportWhatsapp: string; supportEmail: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const s = res.data;
  const values = form ?? { supportWhatsapp: s?.supportWhatsapp ?? "", supportEmail: s?.supportEmail ?? "" };
  const digits = values.supportWhatsapp.replace(/\D/g, "");

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      res.setData(await api<Settings>("/api/admin/settings", { method: "PUT", body: { supportWhatsapp: values.supportWhatsapp, supportEmail: values.supportEmail } }));
      setForm(null);
      setMessage({ tone: "success", text: "Saved. Schools see the new contact the next time they open EduFlow." });
    } catch (err) {
      setMessage({ tone: "danger", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SettingsBack />
      <PageHeader title="Support contact" description="Where schools reach you from Renew, Choose a plan and Get Pro." icon={SETTINGS_PAGES[0].icon} />
      {res.error && <Alert>{res.error}</Alert>}
      {!s ? (
        <Skeleton className="h-56 max-w-2xl" />
      ) : (
        <section className="max-w-2xl rounded-2xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">Support contact</h2>
            <p className="text-sm text-muted">Where schools reach you from &quot;Renew now&quot;, &quot;Choose a plan&quot; and &quot;Get Pro&quot;.</p>
          </div>
          <div className="space-y-4 p-5">
            {message && <Alert tone={message.tone}>{message.text}</Alert>}
            <Field label="WhatsApp number" htmlFor="support-wa" hint="With country code, e.g. 919876543210. Schools open a chat with a ready message.">
              <Input id="support-wa" inputMode="tel" value={values.supportWhatsapp} onChange={(e) => setForm({ ...values, supportWhatsapp: e.target.value })} placeholder="919876543210" />
            </Field>
            <Field label="Email" htmlFor="support-email">
              <Input id="support-email" type="email" value={values.supportEmail} onChange={(e) => setForm({ ...values, supportEmail: e.target.value })} placeholder="support@yourdomain.com" />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted">
                {digits.length >= 10 ? (
                  <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    Test the WhatsApp link →
                  </a>
                ) : s.updatedAt ? (
                  `Last changed ${formatDate(s.updatedAt, true)}`
                ) : (
                  "Not set yet"
                )}
              </span>
              <Button onClick={save} loading={busy} disabled={form === null}>
                Save
              </Button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}

/** Keys for image uploads (school logos). The secret is write-only: it's stored encrypted and never shown again. */
function CloudinaryCard({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const c = settings.cloudinary;
  const [form, setForm] = useState({ cloudName: c.cloudName, apiKey: c.apiKey, apiSecret: "", folder: c.folder });
  const [busy, setBusy] = useState<"save" | "test" | "clear" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const configured = Boolean(c.cloudName && c.apiKey && c.secretSet);
  const dirty = form.cloudName !== c.cloudName || form.apiKey !== c.apiKey || form.folder !== c.folder || form.apiSecret !== "";

  async function run(kind: "save" | "test" | "clear") {
    if (kind === "clear" && !confirm("Turn off logo uploads? Logos already uploaded keep working.")) return;
    setBusy(kind);
    setMessage(null);
    try {
      if (kind === "test") {
        await api("/api/admin/settings/cloudinary/test", { method: "POST" });
        setMessage({ tone: "success", text: "Connected. A test image was uploaded and deleted, so schools can upload logos." });
      } else {
        const body = kind === "clear" ? { cloudName: "", apiKey: "", apiSecret: "", folder: form.folder } : { ...form, cloudName: form.cloudName.trim(), apiKey: form.apiKey.trim(), apiSecret: form.apiSecret.trim() };
        const next = await api<Settings>("/api/admin/settings", { method: "PUT", body: { cloudinary: body } });
        onSaved(next);
        setForm({ cloudName: next.cloudinary.cloudName, apiKey: next.cloudinary.apiKey, apiSecret: "", folder: next.cloudinary.folder });
        setMessage({ tone: "success", text: kind === "clear" ? "Logo uploads turned off." : "Saved and checked with Cloudinary. Schools can now upload their logo in Settings → School profile." });
      }
    } catch (err) {
      setMessage({ tone: "danger", text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="max-w-2xl rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold">Image uploads (Cloudinary)</h2>
          <p className="text-sm text-muted">Schools and tuition centres upload their logo here; it appears on receipts and report cards.</p>
        </div>
        <span className={configured ? "rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success" : "rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted"}>
          {configured ? "On" : "Off"}
        </span>
      </div>
      <div className="space-y-4 p-5">
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        {!settings.encryptionAvailable && <Alert tone="warning">Set DATA_ENCRYPTION_KEY on the server first; the API secret is stored encrypted.</Alert>}
        {c.secretSet && !c.secretReadable && <Alert tone="warning">The saved API secret can&apos;t be read (the encryption key changed). Enter it again.</Alert>}
        <p className="text-xs text-muted">
          Find these in Cloudinary → Settings → API Keys. The key needs a role that can upload and delete images; Save and check tests both.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cloud name" htmlFor="cl-cloud">
            <Input id="cl-cloud" value={form.cloudName} onChange={(e) => setForm({ ...form, cloudName: e.target.value })} placeholder="e.g. dxyz123ab" autoComplete="off" spellCheck={false} />
          </Field>
          <Field label="API key" htmlFor="cl-key">
            <Input id="cl-key" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} inputMode="numeric" autoComplete="off" spellCheck={false} />
          </Field>
          <Field label="API secret" htmlFor="cl-secret" hint={c.secretSet ? "Saved. Leave empty to keep it." : "Stored encrypted; never shown again."}>
            <Input id="cl-secret" type="password" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} placeholder={c.secretSet ? "••••••••••••" : ""} autoComplete="new-password" spellCheck={false} />
          </Field>
          <Field label="Folder" htmlFor="cl-folder" hint="Logos go in <folder>/schools/<school id>/">
            <Input id="cl-folder" value={form.folder} onChange={(e) => setForm({ ...form, folder: e.target.value })} autoComplete="off" spellCheck={false} />
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {configured && (
              <Button variant="secondary" onClick={() => run("test")} loading={busy === "test"} disabled={busy !== null}>
                Test connection
              </Button>
            )}
            {configured && (
              <Button variant="ghost" className="text-danger" onClick={() => run("clear")} loading={busy === "clear"} disabled={busy !== null}>
                Turn off
              </Button>
            )}
          </div>
          <Button onClick={() => run("save")} loading={busy === "save"} disabled={!dirty || busy !== null || !form.cloudName.trim() || !form.apiKey.trim() || (!c.secretSet && !form.apiSecret.trim())}>
            Save and check
          </Button>
        </div>
      </div>
    </section>
  );
}

/** SMS one-time codes through 2Factor.in: sign in with a mobile number, verify it at sign-up. */
function OtpCard({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const o = settings.otp;
  const [form, setForm] = useState({ enabled: o.enabled, apiKey: "", template: o.template, requireOnRegister: o.requireOnRegister });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const dirty = form.enabled !== o.enabled || form.apiKey !== "" || form.template !== o.template || form.requireOnRegister !== o.requireOnRegister;

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const next = await api<Settings>("/api/admin/settings", { method: "PUT", body: { otp: { ...form, apiKey: form.apiKey.trim(), template: form.template.trim() } } });
      onSaved(next);
      setForm({ enabled: next.otp.enabled, apiKey: "", template: next.otp.template, requireOnRegister: next.otp.requireOnRegister });
      setMessage({ tone: "success", text: next.otp.enabled ? "Saved. Sign-in pages now offer Mobile OTP." : "Saved. Mobile OTP is off." });
    } catch (err) {
      setMessage({ tone: "danger", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-2xl rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold">SMS OTP (2Factor)</h2>
          <p className="text-sm text-muted">Sign in with a mobile number and a one-time code, and verify numbers at sign-up.</p>
        </div>
        <span className={o.enabled ? "rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success" : "rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted"}>{o.enabled ? "On" : "Off"}</span>
      </div>
      <div className="space-y-4 p-5">
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        {!settings.encryptionAvailable && <Alert tone="warning">Set DATA_ENCRYPTION_KEY on the server first; the API key is stored encrypted.</Alert>}
        {o.keySet && !o.keyReadable && <Alert tone="warning">The saved API key can&apos;t be read (the encryption key changed). Enter it again.</Alert>}
        <p className="text-xs text-muted">Get the API key from your 2Factor.in dashboard. Each code sent uses your 2Factor SMS credits.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="2Factor API key" htmlFor="otp-key" hint={o.keySet ? "Saved. Leave empty to keep it." : "Stored encrypted; never shown again."}>
            <Input id="otp-key" type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder={o.keySet ? "••••••••••••" : "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"} autoComplete="new-password" spellCheck={false} />
          </Field>
          <Field label="OTP template name" htmlFor="otp-template" hint="Optional. Empty = 2Factor's default message.">
            <Input id="otp-template" value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} placeholder="e.g. EduFlowOTP" spellCheck={false} />
          </Field>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3">
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--accent)]" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          <span>
            <span className="block text-sm font-medium">Turn on mobile OTP</span>
            <span className="block text-xs text-muted">Sign-in pages get a &ldquo;Mobile OTP&rdquo; option; people can add a number in My account.</span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3">
          <input type="checkbox" className="mt-0.5 size-4 accent-[var(--accent)]" checked={form.requireOnRegister} onChange={(e) => setForm({ ...form, requireOnRegister: e.target.checked })} />
          <span>
            <span className="block text-sm font-medium">New schools must verify a mobile number</span>
            <span className="block text-xs text-muted">Sign-up asks for an OTP before the account is created (only while OTP is on).</span>
          </span>
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {o.keySet ? (
            <Button variant="secondary" onClick={() => setTesting((t) => !t)}>
              {testing ? "Close test" : "Send a test OTP"}
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} loading={busy} disabled={!dirty || busy}>
            Save
          </Button>
        </div>
        {testing && (
          <div className="rounded-xl border border-border bg-surface-muted/50 p-4">
            <p className="mb-3 text-sm text-muted">Sends a real SMS with the saved key (works while OTP is off).</p>
            <PhoneOtp
              sendLabel="Send test"
              submitLabel="Check code"
              send={(phone) => api<OtpChallenge>("/api/admin/settings/otp/test", { method: "POST", body: { phone } })}
              verify={async (challengeId, code) => {
                await api("/api/admin/settings/otp/test/verify", { method: "POST", body: { challengeId, code } });
                setTesting(false);
                setMessage({ tone: "success", text: "Test OTP worked: the SMS arrived and the code matched." });
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// AI assistant (Gemini)
// ---------------------------------------------------------------------------

const AI_MODELS = [
  { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash (recommended)" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite (cheapest)" },
  { id: "gemini-flash-latest", label: "Latest Flash (alias, may change)" },
];

interface AiUsage {
  current: AiUsageMonth;
  previous: AiUsageMonth;
}
interface AiUsageMonth {
  month: string;
  questions: number;
  inputTokens: number;
  outputTokens: number;
  schools: { id: string; name: string; questions: number; failed: number; inputTokens: number; outputTokens: number }[];
}

export function AiSettingsPage() {
  const res = useAdminSettings();
  return (
    <>
      <SettingsBack />
      <PageHeader title="AI assistant (Gemini)" description="Ask EduFlow and Write with AI, for schools whose plan includes the AI assistant." icon={SETTINGS_PAGES[3].icon} />
      {res.error && <Alert>{res.error}</Alert>}
      <div className="max-w-3xl space-y-6">
        {res.data ? <AiCard settings={res.data} onSaved={res.setData} /> : <Skeleton className="h-96" />}
        <AiUsageCard />
      </div>
    </>
  );
}

function AiCard({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const a = settings.ai;
  const [form, setForm] = useState({ enabled: a.enabled, apiKey: "", model: a.model, monthlyQuota: String(a.monthlyQuota) });
  const [busy, setBusy] = useState<"save" | "test" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const custom = !AI_MODELS.some((m) => m.id === form.model);
  const dirty = form.enabled !== a.enabled || form.apiKey !== "" || form.model !== a.model || form.monthlyQuota !== String(a.monthlyQuota);

  async function save() {
    setBusy("save");
    setMessage(null);
    try {
      const next = await api<Settings>("/api/admin/settings", {
        method: "PUT",
        body: { ai: { enabled: form.enabled, apiKey: form.apiKey.trim(), model: form.model.trim(), monthlyQuota: Number(form.monthlyQuota) || 0 } },
      });
      onSaved(next);
      setForm({ enabled: next.ai.enabled, apiKey: "", model: next.ai.model, monthlyQuota: String(next.ai.monthlyQuota) });
      setMessage({ tone: "success", text: next.ai.enabled ? "Saved and checked with Gemini. Pro schools can turn on the assistant in Settings → AI assistant." : "Saved. The assistant is off for every school." });
    } catch (err) {
      setMessage({ tone: "danger", text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    setMessage(null);
    try {
      const r = await api<{ reply: string; ms: number }>("/api/admin/settings/ai/test", { method: "POST" });
      setMessage({ tone: "success", text: `Gemini answered in ${(r.ms / 1000).toFixed(1)} s: “${r.reply}”` });
    } catch (err) {
      setMessage({ tone: "danger", text: errorMessage(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold">Google Gemini</h2>
          <p className="text-sm text-muted">Schools also need the AI assistant in their plan (Plans → features) and an owner or admin must turn it on.</p>
        </div>
        <span className={a.enabled ? "rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success" : "rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted"}>{a.enabled ? "On" : "Off"}</span>
      </div>
      <div className="space-y-4 p-5">
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        {!settings.encryptionAvailable && <Alert tone="warning">Set DATA_ENCRYPTION_KEY on the server first; the API key is stored encrypted.</Alert>}
        {a.keySet && !a.keyReadable && <Alert tone="warning">The saved API key can&apos;t be read (the encryption key changed). Enter it again.</Alert>}
        <Field
          label="Gemini API key"
          htmlFor="ai-key"
          hint={a.keySet ? "A key is saved. Leave empty to keep it, or paste a new one." : "Create one at aistudio.google.com → Get API key. Use a key from a project with billing on, so school data isn't used for training."}
        >
          <Input id="ai-key" type="password" autoComplete="off" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder={a.keySet ? "•••••••••••••••• (saved)" : "AIza…"} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Model" htmlFor="ai-model" hint={custom ? "A custom model id." : "Flash answers quickly and costs about ₹1 to ₹2 a question."}>
            <select
              id="ai-model"
              value={custom ? "custom" : form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value === "custom" ? "" : e.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
            >
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
              <option value="custom">Other model id…</option>
            </select>
            {custom && <Input className="mt-2" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="gemini-…" aria-label="Model id" />}
          </Field>
          <Field label="Questions per school, per month" htmlFor="ai-quota" hint="Chat questions and drafts both count. 0 stops all use.">
            <Input id="ai-quota" type="number" min={0} max={100000} inputMode="numeric" value={form.monthlyQuota} onChange={(e) => setForm({ ...form, monthlyQuota: e.target.value })} />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="size-4 accent-[var(--accent)]" />
          <span>
            <span className="font-medium">Turn on the AI assistant</span>
            <span className="text-muted"> for schools whose plan includes it</span>
          </span>
        </label>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {a.keySet && (
            <Button variant="secondary" onClick={test} loading={busy === "test"} disabled={busy !== null}>
              Test the saved key
            </Button>
          )}
          <Button onClick={save} loading={busy === "save"} disabled={!dirty || busy !== null || !form.model.trim()}>
            Save and check
          </Button>
        </div>
      </div>
    </section>
  );
}

const tokens = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
const monthName = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

function AiUsageCard() {
  const { data, error } = useResource(() => api<AiUsage>("/api/admin/settings/ai/usage"), "console-ai-usage");
  const [which, setWhich] = useState<"current" | "previous">("current");
  const m = data?.[which];
  return (
    <section className="rounded-2xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold">Usage</h2>
          <p className="text-sm text-muted">Questions and Gemini tokens per school. Check your Google Cloud billing for the exact cost.</p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5 text-xs">
          {(["current", "previous"] as const).map((w) => (
            <button key={w} onClick={() => setWhich(w)} className={cx("rounded-md px-2.5 py-1 font-medium", which === w ? "bg-accent-soft text-accent" : "text-muted hover:text-foreground")}>
              {w === "current" ? "This month" : "Last month"}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-4 p-5">
        {error && <Alert>{error}</Alert>}
        {!m ? (
          <Skeleton className="h-32" />
        ) : (
          <>
            <dl className="grid grid-cols-3 gap-3">
              {[
                ["Questions", m.questions.toLocaleString("en-IN")],
                ["Input tokens", tokens(m.inputTokens)],
                ["Output tokens", tokens(m.outputTokens)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-surface-muted px-3.5 py-2.5">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="text-lg font-semibold tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            {m.schools.length === 0 ? (
              <p className="text-sm text-muted">No questions in {monthName(m.month)}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted">
                    <tr>
                      <th className="py-2 pr-3 font-medium">School</th>
                      <th className="px-3 py-2 text-right font-medium">Questions</th>
                      <th className="px-3 py-2 text-right font-medium">Failed</th>
                      <th className="py-2 pl-3 text-right font-medium">Tokens in / out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.schools.map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="py-2 pr-3">{s.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{s.questions}</td>
                        <td className={cx("px-3 py-2 text-right tabular-nums", s.failed ? "text-danger" : "text-muted")}>{s.failed}</td>
                        <td className="py-2 pl-3 text-right tabular-nums text-muted">
                          {tokens(s.inputTokens)} / {tokens(s.outputTokens)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
