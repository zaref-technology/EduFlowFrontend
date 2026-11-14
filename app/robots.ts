import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** robots.txt: the public website is open to every crawler; the signed-in app and the console are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app/", "/console", "/api/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
