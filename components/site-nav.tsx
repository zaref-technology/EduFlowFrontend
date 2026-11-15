"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ThemeToggle } from "./theme-toggle";
import { Button, Logo, buttonClass } from "./ui";

const LINKS = [
  ["/#features", "Features"],
  ["/#ai", "AI"],
  ["/#how-it-works", "How it works"],
  ["/pricing", "Pricing"],
  ["/#faq", "FAQ"],
] as const;

export function SiteNav() {
  const { session, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-foreground/[0.06] bg-background/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo size="sm" />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-1.5 text-[13px] text-foreground/70 transition-colors hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle className="mr-1 origin-right scale-[0.85] max-sm:hidden" />
          {session.status === "authenticated" ? (
            <>
              <Link href={session.isSuperAdmin ? "/console" : "/app/dashboard"} className={buttonClass("primary", "xs")}>
                {session.isSuperAdmin ? "Console" : "Open app"}
              </Link>
              <Button variant="ghost" size="xs" onClick={logout} className="max-sm:hidden">
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClass("ghost", "xs")}>
                Log in
              </Link>
              <Link href="/register" className={buttonClass("primary", "xs")}>
                <span className="sm:hidden">Free trial</span>
                <span className="max-sm:hidden">Start free trial</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
