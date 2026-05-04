import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ImageRun,
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

/**
 * Strip HTML tags and decode entities for plain-text rendering in Word.
 * For images, extracts src URLs as "[Image: url]".
 */
function htmlToTextRuns(html: string): TextRun[] {
  if (!html) return [new TextRun("")];

  // Parse HTML to extract text and images
  const div = document.createElement("div");
  div.innerHTML = html;

  const runs: TextRun[] = [];

  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text.trim()) {
        runs.push(new TextRun(text));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === "img") {
        const alt = el.getAttribute("alt") || "image";
        runs.push(new TextRun({ text: `[${alt}]`, italics: true, color: "888888" }));
        return;
      }

      if (tag === "br") {
        runs.push(new TextRun({ text: "", break: 1 }));
        return;
      }

      const isBold = tag === "strong" || tag === "b";
      const isItalic = tag === "em" || tag === "i";

      if (isBold || isItalic) {
        const text = el.textContent || "";
        if (text.trim()) {
          runs.push(new TextRun({ text, bold: isBold, italics: isItalic }));
        }
        return;
      }

      // Recurse children
      for (const child of Array.from(node.childNodes)) {
        walk(child);
      }

      // Add line break after block elements
      if (["p", "div", "li", "tr"].includes(tag)) {
        runs.push(new TextRun({ text: "", break: 1 }));
      }
    }
  }

  walk(div);

  return runs.length > 0 ? runs : [new TextRun("")];
}

function htmlToParagraphs(html: string, options?: { fontSize?: number }): Paragraph[] {
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
        const runs = extractInlineRuns(el, options?.fontSize);
        if (runs.length > 0) {
          results.push(new Paragraph({
            children: runs,
            spacing: { after: 120 },
          }));
        }
      } else if (tag === "ul" || tag === "ol") {
        const items = el.querySelectorAll(":scope > li");
        items.forEach((li, idx) => {
          const bullet = tag === "ul" ? "•  " : `${idx + 1}.  `;
          const runs = extractInlineRuns(li, options?.fontSize);
          results.push(new Paragraph({
            children: [
              new TextRun({ text: bullet, size: options?.fontSize }),
              ...runs,
            ],
            indent: { left: 720 },
            spacing: { after: 60 },
          }));
        });
      } else if (tag === "table") {
        // Render table rows as text
        const rows = el.querySelectorAll("tr");
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll("th, td"));
          const text = cells.map(c => (c.textContent || "").trim()).join("  |  ");
          results.push(new Paragraph({
            children: [new TextRun({ text, size: options?.fontSize })],
            spacing: { after: 60 },
          }));
        });
      } else {
        // Recurse
        for (const child of Array.from(node.childNodes)) {
          results.push(...processBlock(child));
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").trim();
      if (text) {
        results.push(new Paragraph({
          children: [new TextRun({ text, size: options?.fontSize })],
          spacing: { after: 120 },
        }));
      }
    }

    return results;
  }

  for (const child of Array.from(div.childNodes)) {
    paragraphs.push(...processBlock(child));
  }

  return paragraphs.length > 0 ? paragraphs : [new Paragraph({
    children: [new TextRun({ text: div.textContent || "", size: options?.fontSize })],
  })];
}

function extractInlineRuns(el: Element, fontSize?: number): TextRun[] {
  const runs: TextRun[] = [];

  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent || "";
      if (text) {
        runs.push(new TextRun({ text, size: fontSize }));
      }
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
        // Recurse inline
        runs.push(...extractInlineRuns(childEl, fontSize));
      }
    }
  }

  return runs;
}

export async function exportObjectiveToWord(
  objectiveTitle: string,
  questions: Question[],
  entries: Entry[],
  nameOf: (uid?: string | null) => string,
) {
  const sorted = [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

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
      size: 22,
      color: "666666",
      font: "Arial",
    })],
    spacing: { after: 400 },
  }));

  // Divider
  children.push(new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 1 } },
    spacing: { after: 300 },
  }));

  for (const q of sorted) {
    const qEntries = entries.filter(e => e.question_id === q.id);
    const summaries = qEntries.filter(e => e.entry_type === "summary");
    const insights = qEntries.filter(e => e.entry_type === "key_insight");

    // Question heading
    children.push(new Paragraph({
      children: [
        new TextRun({ text: `Q${q.order_index}. `, bold: true, size: 28, font: "Arial", color: "2E75B6" }),
        new TextRun({ text: q.question_text, bold: true, size: 28, font: "Arial" }),
      ],
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 360, after: 200 },
    }));

    if (summaries.length === 0 && insights.length === 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "No answers recorded.", italics: true, size: 22, color: "999999", font: "Arial" })],
        spacing: { after: 200 },
      }));
      continue;
    }

    // Answers
    if (summaries.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "Answer", bold: true, size: 24, font: "Arial" })],
        spacing: { before: 120, after: 80 },
      }));

      for (const s of summaries) {
        if (s.created_by) {
          children.push(new Paragraph({
            children: [new TextRun({ text: nameOf(s.created_by), bold: true, size: 20, color: "555555", font: "Arial" })],
            spacing: { after: 40 },
          }));
        }
        children.push(...htmlToParagraphs(s.content, { fontSize: 22 }));
      }
    }

    // Key Insights
    if (insights.length > 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: "Key Insights", bold: true, size: 24, font: "Arial" })],
        spacing: { before: 200, after: 80 },
      }));

      for (const ins of insights) {
        if (ins.created_by) {
          children.push(new Paragraph({
            children: [new TextRun({ text: nameOf(ins.created_by), bold: true, size: 20, color: "555555", font: "Arial" })],
            spacing: { after: 40 },
          }));
        }
        children.push(...htmlToParagraphs(ins.content, { fontSize: 22 }));
      }
    }

    // Divider between questions
    children.push(new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 1 } },
      spacing: { before: 200, after: 200 },
    }));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 22 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
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
