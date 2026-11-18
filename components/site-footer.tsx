import { Logo } from "@/components/ui";
import Link from "next/link";

/** The public website's footer (home and pricing pages). */
export function SiteFooter() {
  return (
    <footer className="border-t border-foreground/[0.06]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo size="lg" />
          <p className="mt-2 text-xs font-semibold tracking-[0.25em] text-muted">MANAGE · TRACK · GROW</p>
          <p className="mt-4 max-w-xs text-sm text-muted">The simple way to run a school, tuition centre or coaching institute.</p>
        </div>
        <nav aria-label="Product" className="text-sm">
          <p className="font-semibold">Product</p>
          <ul className="mt-3 space-y-2 text-muted">
            <li><Link href="/#features" className="hover:text-foreground">Features</Link></li>
            <li><Link href="/#how-it-works" className="hover:text-foreground">How it works</Link></li>
            <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
            <li><Link href="/#faq" className="hover:text-foreground">FAQ</Link></li>
          </ul>
        </nav>
        <nav aria-label="Account" className="text-sm">
          <p className="font-semibold">Account</p>
          <ul className="mt-3 space-y-2 text-muted">
            <li><Link href="/register" className="hover:text-foreground">Start free trial</Link></li>
            <li><Link href="/login" className="hover:text-foreground">Log in</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-sm text-muted sm:flex-row sm:px-6">
          <span>© Zaref Campus · Manage · Track · Grow</span>
          <span>
            Built by{" "}
            <a href="https://zaref.in" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline-offset-4 hover:text-accent hover:underline">
              Zaref
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
