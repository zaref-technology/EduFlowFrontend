"use client";

// Download a presentation as PowerPoint (editable text, native charts and tables, speaker
// notes) or as PDF (each slide as drawn on screen, so Hindi/Marathi always look right).
// The libraries load only when exporting.
import type PptxTypes from "pptxgenjs";
import { createElement } from "react";
import { THEMES, formatValue, type Deck, type Slide, type Theme } from "./slides";
import type { Brand } from "@/components/slides/slide-view";

const fileName = (title: string, ext: string) => `${title.replace(/[^\p{L}\p{N} _-]+/gu, "").trim().slice(0, 60) || "Presentation"}.${ext}`;
const hex = (c: string) => c.replace("#", "").toUpperCase();
// The slides are designed at 1280×720 px; PowerPoint's wide layout is 13.333×7.5 in
const IN = (px: number) => px / 96;

/** The logo as a data URL (null if it can't be loaded), so the export doesn't depend on CORS later. */
async function logoData(url?: string): Promise<{ data: string; ratio: number } | null> {
  if (!url) return null;
  try {
    const blob = await (await fetch(url, { mode: "cors" })).blob();
    const data = await new Promise<string>((ok, fail) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.onerror = fail;
      r.readAsDataURL(blob);
    });
    const ratio = await new Promise<number>((ok) => {
      const img = new Image();
      img.onload = () => ok(img.naturalWidth / Math.max(1, img.naturalHeight));
      img.onerror = () => ok(1);
      img.src = data;
    });
    return { data, ratio };
  } catch {
    return null;
  }
}

export async function exportPptx(deck: Deck, brand: Brand) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = deck.title;
  pptx.company = brand.name;
  const t = THEMES[deck.theme];
  const font = deck.language === "en" ? "Calibri" : "Nirmala UI";
  const logo = await logoData(brand.logoUrl);
  // The slides' pictures, loaded once (an unreachable one is left out)
  const pictures = new Map<string, { data: string; ratio: number }>();
  for (const url of new Set(deck.slides.map((x) => x.image?.url).filter((u): u is string => Boolean(u)))) {
    const d = await logoData(url);
    if (d) pictures.set(url, d);
  }
  const total = deck.slides.length;

  const addLogo = (s: PptxTypes.Slide, x: number, y: number, h: number) => {
    if (!logo) return;
    const w = Math.min(h * logo.ratio, h * 4);
    s.addImage({ data: logo.data, x, y, w, h });
  };
  const text = (s: PptxTypes.Slide, value: string, o: PptxTypes.TextPropsOptions) => s.addText(value, { fontFace: font, color: hex(t.fg), margin: 0, valign: "top", ...o });

  deck.slides.forEach((slide, i) => {
    const s = pptx.addSlide();
    s.background = { color: hex(t.bg) };
    // The soft circle in the corner, like the on-screen design
    s.addShape(pptx.ShapeType.ellipse, { x: IN(1280 - 360), y: IN(-160), w: IN(520), h: IN(520), fill: { color: hex(t.accent), transparency: t.dark ? 84 : 92 }, line: { type: "none" } });
    if (slide.notes) s.addNotes(slide.notes);

    if (slide.layout === "title" || slide.layout === "closing") {
      const closing = slide.layout === "closing";
      const align = closing ? "center" : "left";
      if (logo) addLogo(s, closing ? IN(640) - (IN(72) * Math.min(logo.ratio, 4)) / 2 : IN(110), IN(150), IN(72));
      else text(s, brand.name, { x: IN(110), y: IN(170), w: IN(1060), h: IN(40), fontSize: 16, bold: true, color: hex(t.accent), align });
      s.addShape(pptx.ShapeType.roundRect, { x: closing ? IN(592) : IN(110), y: IN(262), w: IN(96), h: IN(8), fill: { color: hex(t.accent) }, line: { type: "none" }, rectRadius: 0.05 });
      text(s, slide.title, { x: IN(110), y: IN(300), w: IN(1060), h: IN(190), fontSize: closing ? 50 : 46, bold: true, align, valign: "middle", fit: "shrink" });
      const sub = slide.subtitle || (closing ? "" : brand.name);
      if (sub) text(s, sub, { x: IN(110), y: IN(500), w: IN(1060), h: IN(80), fontSize: 22, color: hex(t.muted), align });
      return;
    }

    // Footer
    text(s, brand.name, { x: IN(logo ? 104 : 64), y: IN(676), w: IN(900), h: IN(24), fontSize: 11, color: hex(t.muted), valign: "middle" });
    text(s, `${i + 1} / ${total}`, { x: IN(1080), y: IN(676), w: IN(136), h: IN(24), fontSize: 11, color: hex(t.muted), align: "right", valign: "middle" });
    if (logo) addLogo(s, IN(64), IN(675), IN(26));

    const titleBox = (size = 32) => {
      text(s, slide.title, { x: IN(80), y: IN(60), w: IN(1120), h: IN(70), fontSize: size, bold: true, valign: "middle", fit: "shrink" });
      s.addShape(pptx.ShapeType.roundRect, { x: IN(80), y: IN(140), w: IN(64), h: IN(6), fill: { color: hex(t.accent) }, line: { type: "none" }, rectRadius: 0.03 });
    };
    const caption = () => {
      if (!slide.caption) return;
      s.addShape(pptx.ShapeType.rect, { x: IN(80), y: IN(598), w: IN(5), h: IN(46), fill: { color: hex(t.accent) }, line: { type: "none" } });
      text(s, slide.caption, { x: IN(100), y: IN(598), w: IN(1100), h: IN(46), fontSize: 15, color: hex(t.muted), valign: "middle", fit: "shrink" });
    };
    const bullets = (items: string[], x: number, y: number, w: number, h: number, size: number) =>
      s.addText(
        items.map((b) => ({ text: b, options: { bullet: { indent: 22 }, paraSpaceAfter: 10 } })),
        { x, y, w, h, fontFace: font, fontSize: size, color: hex(t.fg), valign: "top", fit: "shrink", margin: 0 }
      );

    switch (slide.layout) {
      case "section":
        text(s, slide.subtitle ?? "", { x: IN(80), y: IN(220), w: IN(1100), h: IN(40), fontSize: 16, bold: true, color: hex(t.accent), charSpacing: 3 });
        text(s, slide.title, { x: IN(80), y: IN(270), w: IN(1100), h: IN(200), fontSize: 50, bold: true, valign: "middle", fit: "shrink" });
        break;
      case "quote":
        text(s, `“${slide.quote || slide.title}”`, { x: IN(140), y: IN(160), w: IN(1000), h: IN(300), fontSize: 32, bold: true, align: "center", valign: "middle", fit: "shrink" });
        if (slide.attribution || slide.quote) text(s, `— ${slide.attribution || slide.title}`, { x: IN(140), y: IN(480), w: IN(1000), h: IN(40), fontSize: 18, color: hex(t.muted), align: "center" });
        break;
      case "two_column":
        titleBox();
        [slide.left, slide.right].forEach((col, k) => {
          const x = IN(80 + k * 576);
          s.addShape(pptx.ShapeType.roundRect, { x, y: IN(180), w: IN(544), h: IN(400), fill: { color: hex(t.surface) }, line: { type: "none" }, rectRadius: 0.2 });
          s.addShape(pptx.ShapeType.rect, { x, y: IN(180), w: IN(544), h: IN(6), fill: { color: hex(k ? t.accent2 : t.accent) }, line: { type: "none" } });
          if (col?.heading) text(s, col.heading, { x: x + IN(30), y: IN(206), w: IN(484), h: IN(44), fontSize: 22, bold: true, color: hex(k ? t.accent2 : t.accent) });
          bullets(col?.bullets ?? [], x + IN(30), IN(262), IN(484), IN(300), 18);
        });
        caption();
        break;
      case "stats": {
        titleBox();
        const stats = slide.stats ?? [];
        const cols = Math.min(stats.length, 3) || 1;
        const rows = Math.ceil(stats.length / cols);
        const gap = 26;
        const w = (1120 - gap * (cols - 1)) / cols;
        const h = Math.min(190, (400 - gap * (rows - 1)) / rows);
        stats.forEach((st, k) => {
          const x = 80 + (k % cols) * (w + gap);
          const y = 190 + Math.floor(k / cols) * (h + gap);
          const color = hex(t.palette[k % t.palette.length]);
          s.addShape(pptx.ShapeType.roundRect, { x: IN(x), y: IN(y), w: IN(w), h: IN(h), fill: { color: hex(t.surface) }, line: { type: "none" }, rectRadius: 0.2 });
          s.addShape(pptx.ShapeType.rect, { x: IN(x), y: IN(y), w: IN(8), h: IN(h), fill: { color }, line: { type: "none" } });
          text(s, st.value, { x: IN(x + 30), y: IN(y + 22), w: IN(w - 50), h: IN(64), fontSize: 38, bold: true, color, valign: "middle", fit: "shrink" });
          text(s, st.label, { x: IN(x + 30), y: IN(y + 92), w: IN(w - 50), h: IN(34), fontSize: 16, bold: true });
          if (st.hint) text(s, st.hint, { x: IN(x + 30), y: IN(y + 128), w: IN(w - 50), h: IN(28), fontSize: 13, color: hex(t.muted) });
        });
        caption();
        break;
      }
      case "table":
        titleBox();
        if (slide.table) {
          const { head, rows } = slide.table;
          const size = rows.length > 9 ? 11 : rows.length > 6 ? 13 : 15;
          s.addTable(
            [
              head.map((h, k) => ({ text: h, options: { bold: true, color: hex(t.dark ? t.bg : "#FFFFFF"), fill: { color: hex(t.accent) }, align: k ? ("right" as const) : ("left" as const) } })),
              ...rows.map((r, n) => head.map((_, k) => ({ text: r[k] ?? "", options: { color: hex(t.fg), fill: { color: hex(n % 2 ? t.surface : t.bg) }, align: k ? ("right" as const) : ("left" as const) } }))),
            ],
            { x: IN(80), y: IN(180), w: IN(1120), fontFace: font, fontSize: size, border: { type: "solid", pt: 0.5, color: hex(t.surface) }, margin: 0.08, autoPage: false }
          );
        }
        caption();
        break;
      case "image": {
        // Words on the left, the picture on the right (cropped to fill, like on screen)
        text(s, slide.title, { x: IN(80), y: IN(150), w: IN(500), h: IN(110), fontSize: 30, bold: true, valign: "bottom", fit: "shrink" });
        s.addShape(pptx.ShapeType.roundRect, { x: IN(80), y: IN(272), w: IN(64), h: IN(6), fill: { color: hex(t.accent) }, line: { type: "none" }, rectRadius: 0.03 });
        bullets(slide.bullets ?? [], IN(80), IN(300), IN(500), IN(280), 20);
        caption();
        const pic = pictures.get(slide.image?.url ?? "");
        if (pic) s.addImage({ data: pic.data, x: IN(624), y: IN(64), w: IN(576), h: IN(572), sizing: { type: "cover", w: IN(576), h: IN(572) }, rounding: false });
        else s.addShape(pptx.ShapeType.roundRect, { x: IN(624), y: IN(64), w: IN(576), h: IN(572), fill: { color: hex(t.surface) }, line: { type: "none" }, rectRadius: 0.2 });
        break;
      }
      case "chart":
        titleBox(30);
        if (slide.chart) addChart(pptx, s, slide.chart, t, font);
        caption();
        break;
      default:
        titleBox();
        if (slide.subtitle) text(s, slide.subtitle, { x: IN(80), y: IN(160), w: IN(1120), h: IN(36), fontSize: 18, color: hex(t.muted) });
        bullets(slide.bullets ?? [], IN(80), IN(slide.subtitle ? 210 : 180), IN(1120), IN(400), (slide.bullets?.length ?? 0) > 5 ? 20 : 24);
        caption();
    }
  });

  await pptx.writeFile({ fileName: fileName(deck.title, "pptx") });
}

function addChart(pptx: PptxTypes, s: PptxTypes.Slide, chart: NonNullable<Slide["chart"]>, t: Theme, font: string) {
  const data = chart.series.map((x) => ({ name: x.name, labels: chart.labels, values: x.values }));
  const format = chart.unit === "%" ? '0.0"%"' : chart.unit === "₹" ? '"₹"#,##0' : "#,##0";
  const box = { x: IN(80), y: IN(170), w: IN(1120), h: IN(410) };
  const common = { ...box, chartColors: t.palette.map(hex), dataLabelColor: hex(t.fg), dataLabelFontFace: font, dataLabelFontSize: 12, showValue: chart.type !== "pie", dataLabelFormatCode: format, catAxisLabelColor: hex(t.muted), valAxisLabelColor: hex(t.muted), catAxisLabelFontFace: font, valAxisLabelFontFace: font, catAxisLabelFontSize: 12, valAxisLabelFontSize: 11, valAxisLabelFormatCode: format, valGridLine: { color: hex(t.muted), style: "dash" as const, size: 0.5 }, catGridLine: { style: "none" as const } };
  if (chart.type === "pie") {
    s.addChart(pptx.ChartType.doughnut, data, { ...box, chartColors: t.palette.map(hex), holeSize: 52, showLegend: true, legendPos: "r", legendColor: hex(t.fg), legendFontFace: font, legendFontSize: 14, showPercent: true, dataLabelColor: hex(t.bg) });
  } else if (chart.type === "line") {
    s.addChart(pptx.ChartType.line, data, { ...common, lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 8, showValue: chart.labels.length <= 12, ...(chart.unit === "%" ? { valAxisMaxVal: 100, valAxisMinVal: 0 } : {}) });
  } else {
    s.addChart(pptx.ChartType.bar, data, { ...common, barDir: "col", barGapWidthPct: 60, ...(chart.series.length === 1 ? { varyColors: true } : {}), ...(chart.unit === "%" ? { valAxisMaxVal: 100, valAxisMinVal: 0 } : {}) });
  }
}

/** PDF: each slide drawn off-screen at full size and captured as an image. Downloads it, or with `asFile` returns it (to share). */
export async function exportPdf(deck: Deck, brand: Brand, { asFile = false } = {}): Promise<File | null> {
  const [{ toJpeg }, { jsPDF }, { createRoot }, { SlideCanvas }] = await Promise.all([import("html-to-image"), import("jspdf"), import("react-dom/client"), import("@/components/slides/slide-view")]);
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-20000px;top:0;width:1280px;";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(
      createElement(
        "div",
        null,
        deck.slides.map((slide, i) => createElement("div", { key: i, "data-slide": i, style: { width: 1280, height: 720 } }, createElement(SlideCanvas, { slide, theme: THEMES[deck.theme], brand, index: i, total: deck.slides.length })))
      )
    );
    // Wait for React to draw and the logo to load
    await new Promise((r) => setTimeout(r, 120));
    await Promise.all([...host.querySelectorAll("img")].map((img) => (img.complete ? null : new Promise((r) => ((img.onload = r), (img.onerror = r))))));
    await document.fonts?.ready;
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1280, 720], hotfixes: ["px_scaling"] });
    const nodes = [...host.querySelectorAll<HTMLElement>("[data-slide]")];
    for (const [i, node] of nodes.entries()) {
      const img = await toJpeg(node, { quality: 0.92, pixelRatio: 1.5, width: 1280, height: 720, cacheBust: true });
      if (i > 0) pdf.addPage([1280, 720], "landscape");
      pdf.addImage(img, "JPEG", 0, 0, 1280, 720);
    }
    if (asFile) return new File([pdf.output("blob")], fileName(deck.title, "pdf"), { type: "application/pdf" });
    pdf.save(fileName(deck.title, "pdf"));
    return null;
  } finally {
    root.unmount();
    host.remove();
  }
}

export { formatValue };
