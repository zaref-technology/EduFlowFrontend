"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, Button, Field, ICONS, Icon, Input, Skeleton, cx } from "@/components/ui";
import { PhoneOtp, type OtpChallenge } from "@/components/phone-otp";
import { API_URL, api } from "@/lib/api";
import { PageHeader, errorMessage, formatDate, useResource } from "./shared";

interface Settings {
  supportWhatsapp: string;
  supportEmail: string;
  updatedAt: string | null;
  cloudinary: { cloudName: string; apiKey: string; folder: string; secretSet: boolean; secretReadable: boolean };
  razorpay: { enabled: boolean; keyId: string; secretSet: boolean; secretReadable: boolean; webhookSecretSet: boolean };
  otp: { enabled: boolean; keySet: boolean; keyReadable: boolean; template: string; requireOnRegister: boolean };
  ai: { enabled: boolean; keySet: boolean; keyReadable: boolean; model: string; monthlyQuota: number; thinking: "minimal" | "low" | "default"; priceInputUsd: number; priceOutputUsd: number; usdToInr: number; imageProvider: "gemini" | "cloudflare"; imageModel: string; cfAccountId: string; cfTokenSet: boolean; imagePriceUsd: number };
  encryptionAvailable: boolean;
}

/** The console's platform settings (one request shared by the settings pages). */
function useAdminSettings() {
  return useResource(() => api<Settings>("/api/admin/settings"), "console-settings");
}

const SETTINGS_PAGES = [
  {
    href: "/console/settings/payments",
    label: "Online payments (Razorpay)",
    description: "Schools pay for their plan by UPI, card or netbanking, and it renews automatically.",
    icon: "M3 7h18v12H3zM3 11h18M7 15h3",
  },
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
    description: "Ask Zia and Write with AI for Pro schools: Gemini key, model and monthly limit per school.",
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
    if (href.endsWith("payments")) return s.razorpay.enabled ? { ok: true, text: `On · ${s.razorpay.keyId.startsWith("rzp_test_") ? "test mode" : "live"}` } : { ok: false, text: s.razorpay.secretSet ? "Keys saved, off" : "Off" };
    if (href.endsWith("sms-otp")) return s.otp.enabled ? { ok: true, text: s.otp.requireOnRegister ? "On · required at sign-up" : "On · optional at sign-up" } : { ok: false, text: s.otp.keySet ? "Key saved, off" : "Off" };
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
      <PageHeader title="SMS OTP (2Factor)" description="Sign in with a mobile number, and verify numbers at sign-up." icon={SETTINGS_PAGES[2].icon} />
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
      <PageHeader title="Image uploads (Cloudinary)" description="Where schools' logos are stored." icon={SETTINGS_PAGES[3].icon} />
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
      setMessage({ tone: "success", text: "Saved. Schools see the new contact the next time they open Zaref Campus." });
    } catch (err) {
      setMessage({ tone: "danger", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SettingsBack />
      <PageHeader title="Support contact" description="Where schools reach you from Renew, Choose a plan and Get Pro." icon={SETTINGS_PAGES[1].icon} />
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

export function PaymentsSettings() {
  const res = useAdminSettings();
  return (
    <>
      <SettingsBack />
      <PageHeader title="Online payments (Razorpay)" description="How schools pay for their Zaref Campus plan." icon={SETTINGS_PAGES[0].icon} />
      {res.error && <Alert>{res.error}</Alert>}
      {res.data ? <RazorpayCard settings={res.data} onSaved={res.setData} /> : <Skeleton className="h-72 max-w-2xl" />}
    </>
  );
}

function RazorpayCard({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const r = settings.razorpay;
  const fromSettings = (x: Settings["razorpay"]) => ({ enabled: x.enabled, keyId: x.keyId, keySecret: "", webhookSecret: "" });
  const [form, setForm] = useState(() => fromSettings(r));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(fromSettings(r));
  const testMode = form.keyId.startsWith("rzp_test_");
  // Razorpay calls the API directly (or this site, which forwards /api to it)
  const webhookUrl = `${API_URL || (typeof window === "undefined" ? "" : window.location.origin)}/api/billing/webhook`;

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const next = await api<Settings>("/api/admin/settings", { method: "PUT", body: { razorpay: { enabled: form.enabled, keyId: form.keyId.trim(), keySecret: form.keySecret.trim(), webhookSecret: form.webhookSecret.trim() } } });
      onSaved(next);
      setForm(fromSettings(next.razorpay));
      setMessage({ tone: "success", text: next.razorpay.enabled ? "Saved and checked with Razorpay. Owners and admins can now pay in Settings → Plan & billing." : "Saved. Online payments are off; schools see the support contact instead." });
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
          <h2 className="font-semibold">Razorpay</h2>
          <p className="text-sm text-muted">Schools pay by UPI, card or netbanking; the plan is extended as soon as the payment goes through.</p>
        </div>
        <span className={r.enabled ? "rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success" : "rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-muted"}>{r.enabled ? (r.keyId.startsWith("rzp_test_") ? "Test mode" : "Live") : "Off"}</span>
      </div>
      <div className="space-y-4 p-5">
        {message && <Alert tone={message.tone}>{message.text}</Alert>}
        {!settings.encryptionAvailable && <Alert tone="warning">Set DATA_ENCRYPTION_KEY on the server first; the secrets are stored encrypted.</Alert>}
        {r.secretSet && !r.secretReadable && <Alert tone="warning">The saved key secret can&apos;t be read (the encryption key changed). Enter it again.</Alert>}
        <p className="text-xs text-muted">Razorpay Dashboard → Account &amp; Settings → API Keys. Use test keys (rzp_test_…) to try it; switch to live keys after Razorpay activates your account.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Key id" htmlFor="rp-key">
            <Input id="rp-key" value={form.keyId} onChange={(e) => setForm({ ...form, keyId: e.target.value })} placeholder="rzp_live_…" autoComplete="off" spellCheck={false} />
          </Field>
          <Field label="Key secret" htmlFor="rp-secret" hint={r.secretSet ? "Saved. Leave empty to keep it." : "Stored encrypted; never shown again."}>
            <Input id="rp-secret" type="password" value={form.keySecret} onChange={(e) => setForm({ ...form, keySecret: e.target.value })} placeholder={r.secretSet ? "••••••••••••" : ""} autoComplete="new-password" spellCheck={false} />
          </Field>
        </div>
        <div className="space-y-3 rounded-xl border border-border px-4 py-3 text-sm">
          <p className="font-medium">Webhook (recommended)</p>
          <p className="text-xs text-muted">
            Razorpay Dashboard → Webhooks → Add new webhook. URL below, choose a secret, and tick <b>payment.captured</b>. It makes sure a payment is applied even if the school closes the window before it finishes.
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-muted px-3 py-2 text-xs">{webhookUrl}</code>
            <Button variant="secondary" size="sm" onClick={() => navigator.clipboard?.writeText(webhookUrl)}>
              Copy
            </Button>
          </div>
          <Field label="Webhook secret" htmlFor="rp-hook" hint={r.webhookSecretSet ? "Saved. Leave empty to keep it." : "The secret you chose in Razorpay."}>
            <Input id="rp-hook" type="password" value={form.webhookSecret} onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })} placeholder={r.webhookSecretSet ? "••••••••••••" : ""} autoComplete="new-password" spellCheck={false} />
          </Field>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="size-4 accent-[var(--accent)]" />
          <span>
            <span className="font-medium">Turn on online payments</span>
            <span className="text-muted"> {testMode ? "(test mode: no real money is taken)" : "for every school"}</span>
          </span>
        </label>
        <div className="flex justify-end">
          <Button onClick={save} loading={busy} disabled={!dirty || busy || (form.enabled && (!form.keyId.trim() || (!r.secretSet && !form.keySecret.trim())))}>
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
          <div className="rounded-2xl border border-border bg-surface-muted/50 p-4">
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
  price: { input: number; output: number; rate: number; image: number };
  current: AiUsageMonth;
  previous: AiUsageMonth;
}
interface AiUsageMonth {
  month: string;
  avgAnswerSeconds: number | null;
  costInr: number;
  costPerQuestionInr: number | null;
  images: number;
  questions: number;
  inputTokens: number;
  outputTokens: number;
  schools: { id: string; name: string; questions: number; quota: number; ownQuota: boolean; failed: number; images: number; inputTokens: number; outputTokens: number; costInr: number; avgAnswerSeconds: number | null }[];
}

export function AiSettingsPage() {
  const res = useAdminSettings();
  return (
    <>
      <SettingsBack />
      <PageHeader title="AI assistant (Gemini)" description="Ask Zia and Write with AI, for schools whose plan includes the AI assistant." icon={SETTINGS_PAGES[4].icon} />
      {res.error && <Alert>{res.error}</Alert>}
      <div className="max-w-3xl space-y-6">
        {res.data ? <AiCard settings={res.data} onSaved={res.setData} /> : <Skeleton className="h-96" />}
        <AiUsageCard />
      </div>
    </>
  );
}

const CF_IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";

function AiCard({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const a = settings.ai;
  const fromSettings = (x: Settings["ai"]) => ({
    enabled: x.enabled,
    apiKey: "",
    model: x.model,
    monthlyQuota: String(x.monthlyQuota),
    thinking: x.thinking,
    priceInputUsd: String(x.priceInputUsd),
    priceOutputUsd: String(x.priceOutputUsd),
    usdToInr: String(x.usdToInr),
    imagesOn: Boolean(x.imageModel),
    imageProvider: x.imageProvider,
    imageModel: x.imageModel,
    cfAccountId: x.cfAccountId,
    cfToken: "",
    imagePriceUsd: String(x.imagePriceUsd),
  });
  const [form, setForm] = useState(() => fromSettings(a));
  const [busy, setBusy] = useState<"save" | "test" | "image" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [testImage, setTestImage] = useState<string | null>(null);
  const custom = !AI_MODELS.some((m) => m.id === form.model);
  const dirty = JSON.stringify(form) !== JSON.stringify(fromSettings(a));

  async function save() {
    setBusy("save");
    setMessage(null);
    try {
      const next = await api<Settings>("/api/admin/settings", {
        method: "PUT",
        body: {
          ai: {
            enabled: form.enabled,
            apiKey: form.apiKey.trim(),
            model: form.model.trim(),
            monthlyQuota: Number(form.monthlyQuota) || 0,
            thinking: form.thinking,
            priceInputUsd: Number(form.priceInputUsd) || 0,
            priceOutputUsd: Number(form.priceOutputUsd) || 0,
            usdToInr: Number(form.usdToInr) || 88,
            imageProvider: form.imageProvider,
            imageModel: !form.imagesOn ? "" : form.imageModel.trim() || (form.imageProvider === "cloudflare" ? CF_IMAGE_MODEL : ""),
            cfAccountId: form.cfAccountId.trim(),
            cfToken: form.cfToken.trim(),
            imagePriceUsd: Number(form.imagePriceUsd) || 0,
          },
        },
      });
      onSaved(next);
      setForm(fromSettings(next.ai));
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

  async function testPicture() {
    setBusy("image");
    setMessage(null);
    setTestImage(null);
    try {
      const r = await api<{ image: string; ms: number }>("/api/admin/settings/ai/test-image", { method: "POST" });
      setTestImage(r.image);
      setMessage({ tone: "success", text: `${a.imageProvider === "cloudflare" ? "Cloudflare FLUX" : a.imageModel} made a picture in ${(r.ms / 1000).toFixed(1)} s. AI pictures on slides will work.` });
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
        {/* eslint-disable-next-line @next/next/no-img-element -- a one-off data: URL */}
        {testImage && <img src={testImage} alt="Test picture from the image model" className="size-40 rounded-xl border border-border object-cover" />}
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
        <div>
          <p className="mb-1.5 text-sm font-medium">Answer speed</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["minimal", "Fastest", "Least thinking. Quick lookups; may miss nuance."],
                ["low", "Fast (recommended)", "A little thinking. Good answers in a few seconds."],
                ["default", "Thorough", "The model's full thinking. Slowest and costs more."],
              ] as const
            ).map(([id, label, hint]) => (
              <button
                key={id}
                type="button"
                onClick={() => setForm({ ...form, thinking: id })}
                aria-pressed={form.thinking === id}
                className={cx("rounded-xl border px-3 py-2.5 text-left transition-colors", form.thinking === id ? "border-accent bg-accent-soft" : "border-border hover:border-accent/40")}
              >
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted">{hint}</span>
              </button>
            ))}
          </div>
        </div>
        <details className="rounded-xl border border-border px-4 py-3 text-sm">
          <summary className="cursor-pointer font-medium">Pricing for cost estimates</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Field label="Input, US$ per 1M tokens" htmlFor="ai-pin">
              <Input id="ai-pin" inputMode="decimal" value={form.priceInputUsd} onChange={(e) => setForm({ ...form, priceInputUsd: e.target.value })} />
            </Field>
            <Field label="Output, US$ per 1M tokens" htmlFor="ai-pout">
              <Input id="ai-pout" inputMode="decimal" value={form.priceOutputUsd} onChange={(e) => setForm({ ...form, priceOutputUsd: e.target.value })} />
            </Field>
            <Field label="₹ per US$" htmlFor="ai-rate">
              <Input id="ai-rate" inputMode="decimal" value={form.usdToInr} onChange={(e) => setForm({ ...form, usdToInr: e.target.value })} />
            </Field>
          </div>
          <p className="mt-1.5 text-xs text-muted">Used for the cost estimates below. Copy them from Google&apos;s Gemini pricing page for your model.</p>
        </details>
        <div className="rounded-xl border border-border px-4 py-3 text-sm">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.imagesOn} onChange={(e) => setForm({ ...form, imagesOn: e.target.checked })} className="size-4 accent-[var(--accent)]" />
            <span>
              <span className="font-medium">AI pictures on slides</span>
              <span className="text-muted"> (schools can always upload their own)</span>
            </span>
          </label>
          {form.imagesOn && (
            <div className="mt-3 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ["cloudflare", "Cloudflare FLUX (free)", "About 150 free pictures a day across all schools, then they stop until tomorrow."],
                    ["gemini", "Google Gemini", "Uses the Gemini key above. About US$0.04 a picture; needs billing on."],
                  ] as const
                ).map(([id, label, hint]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setForm({ ...form, imageProvider: id, imageModel: "", imagePriceUsd: id === "cloudflare" ? "0" : "0.04" })}
                    aria-pressed={form.imageProvider === id}
                    className={cx("rounded-xl border px-3 py-2.5 text-left transition-colors", form.imageProvider === id ? "border-accent bg-accent-soft" : "border-border hover:border-accent/40")}
                  >
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted">{hint}</span>
                  </button>
                ))}
              </div>
              {form.imageProvider === "cloudflare" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Cloudflare account ID" htmlFor="ai-cfacc" hint="Cloudflare dashboard → Account home → ⋯ next to the account → Copy account ID.">
                    <Input id="ai-cfacc" value={form.cfAccountId} onChange={(e) => setForm({ ...form, cfAccountId: e.target.value })} placeholder="32 letters and digits" autoComplete="off" />
                  </Field>
                  <Field label="Workers AI API token" htmlFor="ai-cftok" hint={a.cfTokenSet ? "A token is saved. Leave empty to keep it." : "Profile → API Tokens → Create token → Workers AI template."}>
                    <Input id="ai-cftok" type="password" autoComplete="off" value={form.cfToken} onChange={(e) => setForm({ ...form, cfToken: e.target.value })} placeholder={a.cfTokenSet ? "•••••••••••••••• (saved)" : "Token"} />
                  </Field>
                </div>
              ) : (
                <Field label="Gemini image model" htmlFor="ai-img" hint="Such as gemini-2.5-flash-image or gemini-3.1-flash-image.">
                  <Input id="ai-img" value={form.imageModel} onChange={(e) => setForm({ ...form, imageModel: e.target.value })} placeholder="gemini-2.5-flash-image" />
                </Field>
              )}
              <Field label="US$ per picture (for cost estimates)" htmlFor="ai-imgp">
                <Input id="ai-imgp" inputMode="decimal" value={form.imagePriceUsd} onChange={(e) => setForm({ ...form, imagePriceUsd: e.target.value })} className="max-w-32" />
              </Field>
            </div>
          )}
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
          {a.imageModel && (a.imageProvider === "cloudflare" ? a.cfTokenSet : a.keySet) && (
            <Button variant="secondary" onClick={testPicture} loading={busy === "image"} disabled={busy !== null}>
              Test a picture
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

const rupees = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: n < 10 ? 2 : 0 })}`;
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
          <p className="text-sm text-muted">Questions, estimated cost and Gemini tokens per school (● = its own limit, set in the school&apos;s page). Google&apos;s bill is the exact cost.</p>
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
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Estimated cost", rupees(m.costInr)],
                ["Per question", m.costPerQuestionInr === null ? "—" : rupees(m.costPerQuestionInr)],
                ["Questions", m.questions.toLocaleString("en-IN")],
                ["Avg answer time", m.avgAnswerSeconds === null ? "—" : `${m.avgAnswerSeconds} s`],
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
                      <th className="px-3 py-2 text-right font-medium">Questions / limit</th>
                      <th className="px-3 py-2 text-right font-medium">Cost</th>
                      <th className="px-3 py-2 text-right font-medium">Failed</th>
                      <th className="px-3 py-2 text-right font-medium">Avg time</th>
                      <th className="py-2 pl-3 text-right font-medium">Tokens in / out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.schools.map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="py-2 pr-3">{s.name}</td>
                        <td className={cx("px-3 py-2 text-right tabular-nums", s.questions >= s.quota && "font-medium text-danger")} title={s.ownQuota ? "This school's own limit" : "Platform limit"}>
                          {s.questions} / {s.quota}
                          {s.ownQuota && <span className="ml-1 text-[10px] text-accent">●</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-medium tabular-nums">{rupees(s.costInr)}</td>
                        <td className={cx("px-3 py-2 text-right tabular-nums", s.failed ? "text-danger" : "text-muted")}>{s.failed}</td>
                        <td className={cx("px-3 py-2 text-right tabular-nums", (s.avgAnswerSeconds ?? 0) > 20 ? "text-warning" : "text-muted")}>{s.avgAnswerSeconds === null ? "—" : `${s.avgAnswerSeconds} s`}</td>
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
