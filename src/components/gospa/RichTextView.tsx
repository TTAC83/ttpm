import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";

interface Props {
  html: string;
  className?: string;
}

const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);

export function RichTextView({ html, className }: Props) {
  const content = html ?? "";
  const safe = looksLikeHtml(content)
    ? DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [
          "p", "br", "strong", "b", "em", "i", "u", "s", "code", "pre",
          "ul", "ol", "li",
          "table", "thead", "tbody", "tr", "th", "td",
          "a", "span", "blockquote", "h1", "h2", "h3", "h4",
        ],
        ALLOWED_ATTR: ["href", "target", "rel", "colspan", "rowspan"],
        FORBID_ATTR: ["style", "class", "id", "width", "height", "align", "face", "color", "bgcolor"],
      })
    : null;

  if (safe === null) {
    // Legacy plain-text content
    return <div className={cn("text-sm whitespace-pre-wrap break-words", className)}>{content}</div>;
  }

  return (
    <div
      className={cn(
        "prose prose-sm max-w-none break-words",
        "[&_table]:border-collapse [&_table]:w-full [&_table]:my-2",
        "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
        "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_a]:text-primary [&_a]:underline",
        "[&_p]:my-1",
        "[&_span]:!inline [&_*]:!whitespace-normal",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
