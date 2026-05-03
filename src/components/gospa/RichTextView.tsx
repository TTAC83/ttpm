import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";

interface Props {
  html: string;
  className?: string;
}

const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);

const preserveRichTextWhitespace = (html: string) => {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.body.querySelectorAll("p").forEach((paragraph) => {
    const isVisuallyBlank = Array.from(paragraph.childNodes).every((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? "").replace(/\u00a0/g, " ").trim() === "";
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        return (node as Element).tagName === "BR";
      }
      return false;
    });

    if (isVisuallyBlank) {
      paragraph.textContent = "\u00a0";
    }
  });

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  nodes.forEach((node) => {
    node.nodeValue = node.nodeValue?.replace(/ {2,}/g, (spaces) => "\u00a0".repeat(spaces.length)) ?? "";
  });

  return doc.body.innerHTML;
};

export function RichTextView({ html, className }: Props) {
  const content = html ?? "";
  const safe = looksLikeHtml(content)
    ? preserveRichTextWhitespace(DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [
          "p", "br", "strong", "b", "em", "i", "u", "s", "code", "pre",
          "ul", "ol", "li",
          "table", "thead", "tbody", "tr", "th", "td",
          "a", "span", "blockquote", "h1", "h2", "h3", "h4",
        ],
        ALLOWED_ATTR: ["href", "target", "rel", "colspan", "rowspan"],
        FORBID_ATTR: ["style", "class", "id", "width", "height", "align", "face", "color", "bgcolor"],
      }))
    : null;

  if (safe === null) {
    // Legacy plain-text content
    return <div className={cn("text-sm whitespace-pre-wrap break-words", className)}>{content}</div>;
  }

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none break-words prose-inherit",
        "[&_table]:border-collapse [&_table]:w-full [&_table]:my-2",
        "[&_th]:border [&_th]:border-current/20 [&_th]:bg-current/5 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
        "[&_td]:border [&_td]:border-current/20 [&_td]:px-2 [&_td]:py-1",
        "[&_table]:text-inherit [&_th]:text-inherit [&_td]:text-inherit",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_a]:text-primary [&_a]:underline",
        "[&_p]:my-1 [&_p]:min-h-[1.35em] [&_p]:leading-normal [&_p]:text-inherit",
        "[&_p:empty]:before:content-['\\00a0'] [&_p:empty]:before:inline-block [&_p:empty]:before:min-h-[1.35em]",
        "[&_span]:!inline [&_*]:!whitespace-pre-wrap",
        "[&_strong]:text-inherit [&_em]:text-inherit [&_li]:text-inherit",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
