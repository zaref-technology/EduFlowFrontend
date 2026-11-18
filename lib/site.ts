// The public website: its address and how it's described to search engines, link previews and
// AI assistants. Set NEXT_PUBLIC_SITE_URL on the host to serve it from another address.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://eduflow.zaref.in").replace(/\/+$/, "");

export const SITE = {
  name: "Zaref Campus",
  title: "Zaref Campus: School management software for fees, attendance and parents",
  description:
    "Zaref Campus helps schools, tuition centres and coaching institutes in India collect fees, take attendance, publish report cards and message parents on WhatsApp, with an AI assistant built in. 7-day free trial.",
  tagline: "Manage · Track · Grow",
  maker: { name: "Zaref", url: "https://zaref.in" },
};
