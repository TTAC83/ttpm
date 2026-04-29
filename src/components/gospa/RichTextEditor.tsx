import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon,
  List, ListOrdered, RemoveFormatting, Link2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const normalizeUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px"];

const BLOCK_TAGS = new Set(["P", "DIV", "LI", "TR", "BLOCKQUOTE", "H1", "H2", "H3", "H4", "H5", "H6", "BR", "SECTION", "ARTICLE", "HEADER", "FOOTER"]);
const STRIP_ATTRS = ["style", "class", "id", "width", "height", "align", "face", "color", "bgcolor", "lang", "dir"];

function cleanPastedHtml(html: string): string {
  if (typeof window === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");

  doc.querySelectorAll("style, script, meta, link, title").forEach(el => el.remove());

  doc.querySelectorAll("*").forEach(el => {
    STRIP_ATTRS.forEach(a => el.removeAttribute(a));
    [...el.attributes].forEach(attr => {
      if (/^(mso-|o:|w:|v:|x:|data-)/i.test(attr.name)) el.removeAttribute(attr.name);
    });
  });

  // Insert a space between adjacent inline siblings that have no whitespace between them
  // (PDFs often output <span>word1</span><span>word2</span> with no separator)
  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (let i = 1; i < children.length; i++) {
      const prev = children[i - 1];
      const curr = children[i];
      const prevIsInlineEl = prev.nodeType === 1 && !BLOCK_TAGS.has((prev as Element).tagName);
      const currIsInlineEl = curr.nodeType === 1 && !BLOCK_TAGS.has((curr as Element).tagName);
      const prevText = prev.textContent ?? "";
      const currText = curr.textContent ?? "";
      if (
        (prevIsInlineEl || prev.nodeType === 3) &&
        (currIsInlineEl || curr.nodeType === 3) &&
        prevText.length > 0 && currText.length > 0 &&
        !/\s$/.test(prevText) && !/^\s/.test(currText)
      ) {
        node.insertBefore(doc.createTextNode(" "), curr);
      }
    }
    children.forEach(walk);
  };
  walk(doc.body);

  return doc.body.innerHTML;
}

export function RichTextEditor({ value, onChange, placeholder, autoFocus, className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      TextStyle.configure({ mergeNestedSpanStyles: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none min-h-[80px] px-3 py-2 focus:outline-none",
          "[&_table]:border-collapse [&_table]:w-full",
          "[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
          "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_p:empty]:before:content-['\\00a0']",
        ),
      },
      transformPastedHTML: (html: string) => cleanPastedHtml(html),
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "";
    const same = incoming === current || (incoming === "" && current === "<p></p>");
    if (!same) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  if (!editor) return null;

  const currentSize =
    FONT_SIZES.find(s => editor.isActive("textStyle", { fontSize: s })) ?? "default";

  const applySize = (size: string) => {
    if (size === "default") {
      editor.chain().focus().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
    } else {
      editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
    }
  };

  const openLinkPopover = () => {
    const { from, to, empty } = editor.state.selection;
    const isLink = editor.isActive("link");
    let existingHref = "";
    let existingText = "";

    if (isLink) {
      const attrs = editor.getAttributes("link");
      existingHref = (attrs?.href as string) ?? "";
      editor.chain().focus().extendMarkRange("link").run();
      const { from: lf, to: lt } = editor.state.selection;
      existingText = editor.state.doc.textBetween(lf, lt, " ");
    } else if (!empty) {
      existingText = editor.state.doc.textBetween(from, to, " ");
    }

    setLinkText(existingText);
    setLinkUrl(existingHref);
    setLinkOpen(true);
  };

  const applyLink = () => {
    const href = normalizeUrl(linkUrl);
    if (!href) return;
    const text = linkText.trim() || href;
    const linkMark = { type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer" } };
    const node = { type: "text", text, marks: [linkMark] };

    const chain = editor.chain().focus();
    const isLink = editor.isActive("link");
    const { empty } = editor.state.selection;

    if (isLink) {
      chain.extendMarkRange("link").insertContent(node).run();
    } else if (!empty) {
      chain.deleteSelection().insertContent(node).run();
    } else {
      chain.insertContent(node).run();
    }

    setLinkOpen(false);
    setLinkText("");
    setLinkUrl("");
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetMark("link").run();
    setLinkOpen(false);
    setLinkText("");
    setLinkUrl("");
  };

  return (
    <div className={cn("border rounded-md bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b px-1 py-1">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => editor.chain().focus().toggleBold().run()} aria-label="Bold">
          <BoldIcon className={cn("h-3.5 w-3.5", editor.isActive("bold") && "text-primary")} />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => editor.chain().focus().toggleItalic().run()} aria-label="Italic">
          <ItalicIcon className={cn("h-3.5 w-3.5", editor.isActive("italic") && "text-primary")} />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => editor.chain().focus().toggleUnderline().run()} aria-label="Underline">
          <UnderlineIcon className={cn("h-3.5 w-3.5", editor.isActive("underline") && "text-primary")} />
        </Button>

        <Select value={currentSize} onValueChange={applySize}>
          <SelectTrigger className="h-7 w-[92px] text-xs">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            {FONT_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="w-px h-5 bg-border mx-1" />

        <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="Bullet list">
          <List className={cn("h-3.5 w-3.5", editor.isActive("bulletList") && "text-primary")} />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-label="Numbered list">
          <ListOrdered className={cn("h-3.5 w-3.5", editor.isActive("orderedList") && "text-primary")} />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Popover open={linkOpen} onOpenChange={(open) => { setLinkOpen(open); if (!open) { setLinkText(""); setLinkUrl(""); } }}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
              onClick={openLinkPopover} aria-label="Insert link">
              <Link2 className={cn("h-3.5 w-3.5", editor.isActive("link") && "text-primary")} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="rte-link-text" className="text-xs">Text to display</Label>
                <Input
                  id="rte-link-text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link name"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rte-link-url" className="text-xs">URL</Label>
                <Input
                  id="rte-link-url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="h-8 text-sm"
                  type="url"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink(); } }}
                />
              </div>
              <div className="flex justify-between gap-2">
                {editor.isActive("link") ? (
                  <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={removeLink}>
                    Remove
                  </Button>
                ) : <span />}
                <div className="flex gap-2 ml-auto">
                  <Button type="button" size="sm" variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
                  <Button type="button" size="sm" onClick={applyLink} disabled={!linkUrl.trim()}>Save</Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          aria-label="Clear formatting">
          <RemoveFormatting className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="relative">
        <EditorContent editor={editor} />
        {editor.isEmpty && placeholder && (
          <div className="absolute top-2 left-3 text-sm text-muted-foreground pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
