import Image from "next/image";
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** The Zaref Campus logo: Zaref's Z and "Campus" (green, mint in dark mode). `tone="dark"` for dark panels. */
export function Logo({ href = "/", size = "md", tone }: { href?: string; size?: "sm" | "md" | "lg"; tone?: "dark" }) {
  const z = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-10 w-10" : "h-7 w-7";
  const text = size === "sm" ? "text-[22px]" : size === "lg" ? "text-[34px]" : "text-[26px]";
  return (
    <Link href={href} aria-label="Zaref Campus home" className="inline-flex shrink-0 items-center gap-1.5">
      <Image src="/images/brand/zaref-z.png" alt="" width={512} height={512} priority className={z} />
      <span className={cx("font-[family-name:var(--font-brand)] font-bold leading-none tracking-[-0.035em]", text, tone === "dark" ? "text-[#3ddc97]" : "text-brand-green")}>Campus</span>
      <span className="sr-only">Zaref Campus</span>
    </Link>
  );
}

/** Just Zaref's Z, for tight spaces such as the phone header. */
export function LogoMark({ href = "/", className = "size-8" }: { href?: string; className?: string }) {
  return (
    <Link href={href} aria-label="Zaref Campus home" className="inline-flex shrink-0 items-center">
      <Image src="/images/brand/zaref-z.png" alt="Zaref Campus" width={512} height={512} priority className={className} />
    </Link>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-foreground shadow-[0_1px_2px_rgb(0_0_0/0.12),inset_0_1px_0_rgb(255_255_255/0.12)] hover:bg-accent-hover",
  secondary: "border border-border bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.05)] hover:bg-surface-muted",
  ghost: "hover:bg-surface-muted",
  danger: "border border-border bg-surface text-danger hover:bg-danger-soft",
};

export type ButtonSize = "xs" | "sm" | "md" | "icon" | "icon-sm";

const buttonSizes: Record<ButtonSize, string> = {
  xs: "h-7 px-3 text-[13px]",
  sm: "h-8 px-3.5 text-sm",
  md: "h-10 px-[18px] text-sm",
  icon: "size-10",
  "icon-sm": "size-8",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return cx(
    // Apple-style pills that press in slightly
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,transform,box-shadow] duration-150 active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
    buttonSizes[size],
    buttonStyles[variant]
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean }) {
  return (
    <button className={cx(buttonClass(variant, size), className)} disabled={disabled || loading} {...props}>
      {loading ? <Spinner /> : null}
      {loading && size.startsWith("icon") ? null : children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("size-4 animate-spin", className)} fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity={0.25} strokeWidth={3} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}

const inputClass =
  "h-10 w-full rounded-2xl border border-border bg-surface px-3.5 text-base outline-none sm:text-sm transition-[border-color,box-shadow] placeholder:text-muted/80 focus:border-accent focus:ring-4 focus:ring-accent/15 aria-invalid:border-danger";

/** Base field classes; an explicit width (w-36, w-auto…) in `className` replaces the default w-full. */
function fieldClass(className?: string) {
  const hasWidth = className ? /(^|\s)w-/.test(className) : false;
  return cx(hasWidth ? inputClass.replace("w-full ", "") : inputClass, className);
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={fieldClass(className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(fieldClass(className), "pr-8")} {...props} />;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "success" | "warning"; children: ReactNode }) {
  const tones = {
    danger: "bg-danger-soft text-danger",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
  };
  return (
    <div role="alert" className={cx("rounded-xl px-3.5 py-3 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "success" | "danger"; children: ReactNode }) {
  const tones = {
    neutral: "bg-surface-muted text-muted",
    accent: "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
  };
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cx("block rounded-lg bg-surface-muted motion-safe:animate-pulse-soft", className)} />;
}

/** Stroke icon from a single SVG path (24×24 grid). */
export function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("size-4 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export const ICONS = {
  plus: "M12 5v14M5 12h14",
  search: "M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-3.5-3.5",
  x: "M6 6l12 12M18 6L6 18",
  filter: "M4 6h16M7 12h10M10 18h4",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3",
  download: "M12 4v12M7 11l5 5 5-5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  message: "M4 5h16v11H9l-5 4V5z",
  menu: "M4 7h16M4 12h16M4 17h16",
  chevronRight: "M9 6l6 6-6 6",
  chevronLeft: "M15 6l-6 6 6 6",
  edit: "M4 20h4L18.5 9.5a2.1 2.1 0 00-4-4L4 16v4zM13.5 6.5l4 4",
  users: "M16 19c0-2.2-1.8-4-4-4s-4 1.8-4 4M12 12a3 3 0 100-6 3 3 0 000 6zM20 18c0-1.7-1-3.1-2.5-3.7M17 6.3a3 3 0 010 5.4",
  mapPin: "M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  calendarCheck: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4",
};
