import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";

interface Entry {
  id: string;
  question_id: string;
  entry_type: "summary" | "risk" | "opportunity" | "link" | "key_insight";
  content: string;
  created_by?: string | null;
}

interface Question {
  id: string;
  question_text: string;
  order_index: number;
}

/* ── Build "slides" identical to PresentObjectiveDialog ── */
interface Slide {
  questionNumber: number;
  questionText: string;
  ownerName: string;
  summaries: Entry[];
  insights: Entry[];
  links: Entry[];
  empty: boolean;
}

function buildSlides(questions: Question[], entries: Entry[], nameOf: (uid?: string | null) => string): Slide[] {
  const slides: Slide[] = [];
  const sorted = [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  for (const q of sorted) {
    const qEntries = entries.filter(
      (e) => e.question_id === q.id && (e.entry_type === "summary" || e.entry_type === "link" || e.entry_type === "key_insight"),
    );

    if (!qEntries.length) {
      slides.push({ questionNumber: q.order_index, questionText: q.question_text, ownerName: "", summaries: [], insights: [], links: [], empty: true });
      continue;
    }

    const byUser = new Map<string, Entry[]>();
    for (const e of qEntries) {
      const key = e.created_by ?? "__unknown__";
      if (!byUser.has(key)) byUser.set(key, []);
      byUser.get(key)!.push(e);
    }

    for (const [uid, list] of byUser) {
      slides.push({
        questionNumber: q.order_index,
        questionText: q.question_text,
        ownerName: nameOf(uid === "__unknown__" ? null : uid),
        summaries: list.filter((e) => e.entry_type === "summary"),
        insights: list.filter((e) => e.entry_type === "key_insight"),
        links: list.filter((e) => e.entry_type === "link"),
        empty: false,
      });
    }
  }
  return slides;
}

/* ── HTML → docx paragraphs ── */

function extractInlineRuns(el: Element, fontSize?: number): TextRun[] {
  const runs: TextRun[] = [];
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || "";
      if (text) runs.push(new TextRun({ text, size: fontSize }));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childEl = child as HTMLElement;
      const tag = childEl.tagName.toLowerCase();
      if (tag === "br") {
        runs.push(new TextRun({ text: "", break: 1, size: fontSize }));
      } else if (tag === "strong" || tag === "b") {
        runs.push(new TextRun({ text: childEl.textContent || "", bold: true, size: fontSize }));
      } else if (tag === "em" || tag === "i") {
        runs.push(new TextRun({ text: childEl.textContent || "", italics: true, size: fontSize }));
      } else if (tag === "u") {
        runs.push(new TextRun({ text: childEl.textContent || "", underline: { type: "single" } as any, size: fontSize }));
      } else if (tag === "img") {
        const alt = childEl.getAttribute("alt") || "image";
        runs.push(new TextRun({ text: `[${alt}]`, italics: true, color: "888888", size: fontSize }));
      } else {
        runs.push(...extractInlineRuns(childEl, fontSize));
      }
    }
  }
  return runs;
}

function htmlToParagraphs(html: string, fontSize?: number): Paragraph[] {
  if (!html) return [];
  const div = document.createElement("div");
  div.innerHTML = html;
  const paragraphs: Paragraph[] = [];

  function processBlock(node: Node): Paragraph[] {
    const results: Paragraph[] = [];
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (["p", "div", "h1", "h2", "h3", "h4", "blockquote"].includes(tag)) {
        const runs = extractInlineRuns(el, fontSize);
        if (runs.length > 0) results.push(new Paragraph({ children: runs, spacing: { after: 120 } }));
      } else if (tag === "ul" || tag === "ol") {
        const items = el.querySelectorAll(":scope > li");
        items.forEach((li, idx) => {
          const bullet = tag === "ul" ? "•  " : `${idx + 1}.  `;
          const runs = extractInlineRuns(li, fontSize);
          results.push(new Paragraph({ children: [new TextRun({ text: bullet, size: fontSize }), ...runs], indent: { left: 720 }, spacing: { after: 60 } }));
        });
      } else if (tag === "table") {
        const rows = el.querySelectorAll("tr");
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll("th, td"));
          const text = cells.map(c => (c.textContent || "").trim()).join("  |  ");
          results.push(new Paragraph({ children: [new TextRun({ text, size: fontSize })], spacing: { after: 60 } }));
        });
      } else {
        for (const child of Array.from(node.childNodes)) results.push(...processBlock(child));
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").trim();
      if (text) results.push(new Paragraph({ children: [new TextRun({ text, size: fontSize })], spacing: { after: 120 } }));
    }
    return results;
  }

  for (const child of Array.from(div.childNodes)) paragraphs.push(...processBlock(child));
  return paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [new TextRun({ text: div.textContent || "", size: fontSize })] })];
}

/* ── Main export ── */

export async function exportObjectiveToWord(
  objectiveTitle: string,
  questions: Question[],
  entries: Entry[],
  nameOf: (uid?: string | null) => string,
) {
  const slides = buildSlides(questions, entries, nameOf);
  const children: Paragraph[] = [];

  // Title
  children.push(new Paragraph({
    children: [new TextRun({ text: objectiveTitle, bold: true, size: 48, font: "Arial" })],
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 400 },
  }));

  // Date
  children.push(new Paragraph({
    children: [new TextRun({
      text: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
      size: 22, color: "666666", font: "Arial",
    })],
    spacing: { after: 400 },
  }));

  // Divider
  children.push(new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 1 } },
    spacing: { after: 300 },
  }));

  for (const slide of slides) {
    // Question heading
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `Question ${slide.questionNumber}`, bold: true, size: 20, font: "Arial", color: "2E75B6" }),
      ],
      spacing: { before: 360, after: 80 },
    }));

    children.push(new Paragraph({
      children: [new TextRun({ text: slide.questionText, bold: true, size: 28, font: "Arial" })],
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 120 },
    }));

    // Answered by
    if (!slide.empty && slide.ownerName) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: "Answered by ", size: 20, color: "666666", font: "Arial" }),
          new TextRun({ text: slide.ownerName, size: 20, font: "Arial" }),
        ],
        spacing: { after: 200 },
      }));
    }

    if (slide.empty) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "No answers have been recorded for this question yet.", italics: true, size: 22, color: "999999", font: "Arial" })],
        spacing: { after: 200 },
      }));
    }

    // Answer (summaries)
    if (slide.summaries.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "Answer", bold: true, size: 22, font: "Arial", color: "2E75B6" })],
        spacing: { before: 120, after: 80 },
      }));
      for (const s of slide.summaries) {
        children.push(...htmlToParagraphs(s.content, 22));
      }
    }

    // Key Insights
    if (slide.insights.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "Key Insight", bold: true, size: 22, font: "Arial", color: "2E75B6" })],
        spacing: { before: 200, after: 80 },
      }));
      for (const ins of slide.insights) {
        children.push(...htmlToParagraphs(ins.content, 22));
      }
    }

    // Supporting evidence (links)
    if (slide.links.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "Supporting Evidence", bold: true, size: 22, font: "Arial", color: "2E75B6" })],
        spacing: { before: 200, after: 80 },
      }));
      for (const link of slide.links) {
        const raw = (link.content ?? "").trim();
        const sep = raw.indexOf("|");
        const name = sep === -1 ? "" : raw.slice(0, sep).trim();
        const urlPart = sep === -1 ? raw : raw.slice(sep + 1).trim();
        const display = name || urlPart;
        children.push(new Paragraph({
          children: [new TextRun({ text: `• ${display}`, size: 22, font: "Arial", color: "2E75B6" })],
          indent: { left: 360 },
          spacing: { after: 60 },
        }));
      }
    }

    // Divider between slides
    children.push(new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 1 } },
      spacing: { before: 200, after: 200 },
    }));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  const buffer = await Packer.toBlob(doc);
  const safeName = objectiveTitle.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-").substring(0, 50);
  saveAs(buffer, `${safeName}.docx`);
}
