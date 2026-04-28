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
