## Goal

Replace the plain textarea used for **Key Insights** entries in the GOSPA Objective Workspace with a rich-text editor that supports:

- **Bold**, *italic*, **underline**
- Font size selection
- Bulleted and numbered lists
- Pasting formatted content (including tables) directly from Microsoft Word and PowerPoint

Existing per-user attribution and edit-locking remain unchanged — only the content editor and rendering change.

## Approach

Use **TipTap** (ProseMirror-based, React-friendly, MIT-licensed). It supports the entire feature set out-of-the-box, including pasting from Word/PowerPoint with formatting and tables preserved. Content will be stored as **HTML** in the existing `gospa_question_entries.content` column (text type — no schema change required).

### Why TipTap
- First-class clipboard handling for Office paste (Word/PowerPoint produce HTML on the clipboard; TipTap's StarterKit + Table extensions consume it cleanly).
- Modular extensions, headless — styles via Tailwind `prose` classes so it matches the existing design.
- Already commonly paired with shadcn/ui projects.

### Packages to add
- `@tiptap/react`
- `@tiptap/starter-kit` (paragraphs, bold, italic, lists, headings, history)
- `@tiptap/extension-underline`
- `@tiptap/extension-text-style` + `@tiptap/extension-font-size` (font size control)
- `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`
- `@tiptap/extension-link` (preserve hyperlinks pasted from Office)
- `@tailwindcss/typography` (for `prose` rendering of saved HTML) — only if not already present

## What changes

### 1. New component: `src/components/gospa/RichTextEditor.tsx`
- Controlled TipTap editor with a compact toolbar:
  - Bold • Italic • Underline
  - Font size dropdown (12 / 14 / 16 / 18 / 20 / 24 px)
  - Bullet list • Numbered list
  - Clear formatting
- `value: string` (HTML), `onChange(html: string)`, `placeholder`, `autoFocus` props.
- Uses `editor.getHTML()` on update; sanitises pasted Office HTML via TipTap's built-in transformer (StarterKit handles MS-Word junk well; we'll also strip empty `<p>` and Office-specific `class="Mso..."` attributes via a small paste rule).
- Table support enabled with `resizable: true`.

### 2. Read-only renderer: `src/components/gospa/RichTextView.tsx`
- Renders saved HTML safely using `DOMPurify` (already common dep — add `isomorphic-dompurify` if not present) inside a `<div className="prose prose-sm max-w-none">`.
- Used in `EntrySection` list items in place of the current `<div className="whitespace-pre-wrap">`.

### 3. `src/pages/app/gospa/ObjectiveWorkspace.tsx` — `EntrySection` updates
- For `type === "summary"` only:
  - Replace the `<Input>` add field with `<RichTextEditor>` + an "Add" button.
  - Replace the inline edit `<Textarea>` with `<RichTextEditor>`.
  - Replace the display `<div className="whitespace-pre-wrap">` with `<RichTextView html={e.content} />`.
- `risk` / `opportunity` / `link` paths are already removed / remain plain — no change.
- Keep existing save/edit/delete logic; just pass HTML strings through `gospa.createQuestionEntry` / `updateQuestionEntry`.

### 4. Backwards compatibility
- Existing entries are plain text. `RichTextView` renders plain strings unchanged (DOMPurify passes through escaped text). When a user edits a legacy entry, TipTap loads it as a single paragraph automatically.

### 5. Styling
- Add `@tailwindcss/typography` plugin to `tailwind.config.ts` if missing, scoped to `prose` only.
- Toolbar uses existing shadcn `Button` (ghost, size icon) and `Select` for font size — matches surrounding UI.

## Out of scope
- No DB migration (HTML stored in existing `content text` column).
- No changes to risks/opportunities/links rendering.
- No image paste support (Word/PowerPoint images come as `<img>` referencing local clipboard URIs that don't survive — we'll strip them and show a small toast hint if detected).

## QA checklist (post-implementation)
1. Type plain text → bold/underline/list → save → reload → formatting persists.
2. Copy a formatted paragraph + bulleted list from Word → paste → formatting preserved.
3. Copy a table from Word/PowerPoint → paste → table renders with borders.
4. Edit a legacy plain-text entry → still loads correctly.
5. Only the entry's owner sees Edit/Delete buttons (existing behaviour intact).
