import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontSize } from "@tiptap/extension-font-size";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon,
  List, ListOrdered, RemoveFormatting,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px"];

export function RichTextEditor({ value, onChange, placeholder, autoFocus, className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      TextStyle,
      FontSize,
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true, HTMLAttributes: { class: "rte-table" } }),
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
        ),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && !(value === "" && current === "<p></p>")) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const currentSize =
    FONT_SIZES.find(s => editor.isActive("textStyle", { fontSize: s })) ?? "default";

  return (
    <div className={cn("border rounded-md bg-background", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b px-1 py-1">
        <Button
          type="button" variant="ghost" size="icon" className="h-7 w-7"
          aria-label="Bold"
          data-active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <BoldIcon className={cn("h-3.5 w-3.5", editor.isActive("bold") && "text-primary")} />
        </Button>
        <Button
          type="button" variant="ghost" size="icon" className="h-7 w-7"
          aria-label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon className={cn("h-3.5 w-3.5", editor.isActive("italic") && "text-primary")} />
        </Button>
        <Button
          type="button" variant="ghost" size="icon" className="h-7 w-7"
          aria-label="Underline"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className={cn("h-3.5 w-3.5", editor.isActive("underline") && "text-primary")} />
        </Button>

        <Select
          value={currentSize}
          onValueChange={(v) => {
            if (v === "default") {
              editor.chain().focus().unsetFontSize().run();
            } else {
              editor.chain().focus().setFontSize(v).run();
            }
          }}
        >
          <SelectTrigger className="h-7 w-[88px] text-xs">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            {FONT_SIZES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="w-px h-5 bg-border mx-1" />

        <Button
          type="button" variant="ghost" size="icon" className="h-7 w-7"
          aria-label="Bullet list"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className={cn("h-3.5 w-3.5", editor.isActive("bulletList") && "text-primary")} />
        </Button>
        <Button
          type="button" variant="ghost" size="icon" className="h-7 w-7"
          aria-label="Numbered list"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className={cn("h-3.5 w-3.5", editor.isActive("orderedList") && "text-primary")} />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button
          type="button" variant="ghost" size="icon" className="h-7 w-7"
          aria-label="Clear formatting"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <RemoveFormatting className="h-3.5 w-3.5" />
        </Button>
      </div>
      <EditorContent editor={editor} />
      {!value && placeholder && (
        <div className="px-3 -mt-[72px] mb-2 pointer-events-none text-sm text-muted-foreground">
          {editor.isEmpty ? placeholder : ""}
        </div>
      )}
    </div>
  );
}
