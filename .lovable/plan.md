## Goal

When inserting a hyperlink in a GOSPA question (and any insight that uses the rich text editor), let the user enter a **display name** alongside the URL. The displayed text in the question / read-only view / presentation mode should show that name, not the raw URL.

## Current behaviour

`src/components/gospa/RichTextEditor.tsx` includes the TipTap `Link` extension with `autolink: true`, but there is no toolbar control to insert a link. Users typing or pasting a URL get an auto-link whose visible text is the URL itself, with no way to give it a friendly name.

## Changes

### 1. `src/components/gospa/RichTextEditor.tsx` — add an "Insert link" toolbar button

- Add a `Link2` (lucide) icon button to the toolbar, placed next to the formatting controls.
- Clicking it opens a small popover (using existing `Popover` from `@/components/ui/popover`) with two inputs:
  - **Text to display** (defaults to the currently selected text, if any)
  - **URL** (defaults to the existing link's `href` if the cursor is inside a link)
- Two actions: **Save** and (when editing an existing link) **Remove link**.
- On Save:
  - Normalize the URL (prepend `https://` if no protocol, same rule used in `LinkManager`).
  - If text differs from the current selection / link text, replace the selection with the new text and apply the link mark to it. If no selection and no existing link, insert the text as new content with the link mark.
  - Use TipTap commands: `editor.chain().focus().extendMarkRange('link').insertContent(...).setLink({ href, target: '_blank', rel: 'noopener noreferrer' }).run()` (or `unsetLink` for remove).
- Highlight the button when the cursor is inside an existing link (`editor.isActive('link')`).
- Keep `autolink: true` so plain URLs still become links automatically; this only adds the explicit "named link" path.

### 2. `src/components/gospa/RichTextView.tsx` — no logic change needed

`a` and `href`/`target`/`rel` are already in the DOMPurify allow-lists, so a named anchor (`<a href="…">My label</a>`) will render with the label as visible text. Confirm `rel` stays in `ALLOWED_ATTR` (it already is).

## Out of scope

- No data migration. Existing auto-linked URLs stay as-is; users can click them, open the new dialog, and rename them if they want.
- No changes to `LinkManager` (separate "Links" feature, already supports names).

## Files touched

- `src/components/gospa/RichTextEditor.tsx` (toolbar button + popover + insert/edit link logic)
