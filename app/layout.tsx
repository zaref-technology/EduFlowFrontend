import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import { themeScript } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { PwaRuntime } from "@/components/pwa";
import { SITE, SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// The "Campus" in the Zaref Campus logo
const brandFont = Poppins({
  variable: "--font-brand",
  weight: "700",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Absolute links for canonical URLs, link previews and the sitemap
  metadataBase: new URL(SITE_URL),
  title: { default: "Zaref Campus", template: "%s · Zaref Campus" },
  description: SITE.description,
  applicationName: "Zaref Campus",
  // iPhone / iPad: full screen when added to the home screen
  appleWebApp: { capable: true, title: "Zaref Campus", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

// viewport-fit=cover lets fixed elements use env(safe-area-inset-*) on notched phones
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${brandFont.variable} h-full antialiased`}
      // The theme script sets data-theme on <html> before React hydrates
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>{children}</AuthProvider>
        <PwaRuntime />
      </body>
    </html>
  );
}
