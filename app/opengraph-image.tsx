// The link preview (WhatsApp, LinkedIn, X, Slack…): made at build time in the landing page's style.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = SITE.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const icon = await readFile(path.join(process.cwd(), "public/icons/icon-512.png"));
  const iconSrc = `data:image/png;base64,${icon.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#050609",
          backgroundImage:
            "radial-gradient(circle at 85% 10%, rgba(10,95,230,0.45), transparent 45%), radial-gradient(circle at 15% 100%, rgba(61,220,151,0.30), transparent 45%), radial-gradient(circle at 100% 100%, rgba(244,114,182,0.25), transparent 40%)",
          color: "#f5f5f7",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={iconSrc} width={72} height={72} style={{ borderRadius: 18 }} alt="" />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Zaref Campus</div>
          <div style={{ display: "flex", marginLeft: 8, fontSize: 22, color: "#9b9ea8", letterSpacing: 4 }}>{SITE.tagline.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 78, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>Fees, attendance and parents.</div>
          <div
            style={{
              display: "flex",
              fontSize: 78,
              fontWeight: 700,
              letterSpacing: -3,
              lineHeight: 1.1,
              backgroundImage: "linear-gradient(90deg, #5b9dff, #3ddc97 45%, #fbbf24 80%, #f472b6)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            All in one place.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: "#9b9ea8" }}>
          <div style={{ display: "flex" }}>Fees · Attendance · Report cards · WhatsApp · AI assistant</div>
          <div style={{ display: "flex", color: "#f5f5f7", background: "rgba(255,255,255,0.08)", padding: "10px 22px", borderRadius: 999 }}>7-day free trial</div>
        </div>
      </div>
    ),
    size
  );
}
