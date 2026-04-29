## Problem

When a user copies text (e.g. from a PDF, Word, Google Docs, browser page) into the **Key insights** field of a GOSPA question, the resulting display shows words flowing onto separate lines with no spaces between them.

Two root causes in `src/components/gospa/RichTextEditor.tsx` and `src/components/gospa/RichTextView.tsx`:

1. **No paste sanitisation in the TipTap editor.** Pasted HTML from PDFs/Word frequently wraps every word or run in its own `<span>` / `<p>` / `<div>` with explicit `style` attributes (e.g. `display:block`, `white-space:nowrap`, absolute positioning, font sizes per span). Adjacent runs often have no whitespace text node between them, so when rendered they visually concatenate or break per word.
2. **`RichTextView` allows the `style` attribute** through DOMPurify, so any leftover inline styles from paste (block display, fixed line-heights, transforms) are honoured at render time and break the flow.

## Fix

### 1. Add a paste transformer to `RichTextEditor`

In the `useEditor` config, add `editorProps.transformPastedHTML` that:

- Parses the pasted HTML in a detached `DOMParser`.
- Strips all `style`, `class`, `id`, `width`, `height`, `align`, `face`, `color`, `bgcolor` attributes from every element (TipTap extensions will reapply only the formatting they support).
- Unwraps presentational tags that often come from PDFs (`font`, `o:p`, `xml`, MS Office namespaced tags, empty `span`s).
- For every element whose previous sibling is a non-whitespace text/element on the same logical line, ensures a space character is inserted before it if the original had visual whitespace (use `getComputedStyle`-free heuristic: if the element or its parent has `display:block` / is a `<p>`, `<div>`, `<br>`, leave the line break; otherwise insert ` ` text node between adjacent inline runs that have no whitespace between them).
- Returns the cleaned HTML string.

Also add `transformPastedText` to keep plain-text paste intact (TipTap default already does, but make it explicit so newlines become `<br>` and runs of spaces are preserved).

### 2. Tighten `RichTextView` sanitisation

In `src/components/gospa/RichTextView.tsx`:

- Remove `"style"` from `ALLOWED_ATTR` so any rogue inline styles that slipped past the editor cannot affect rendering.
- Keep `href`, `target`, `rel`, `colspan`, `rowspan`.
- Add a hook (`DOMPurify.addHook('uponSanitizeAttribute', ...)`) scoped to this component, or a one-off sanitize call with `FORBID_ATTR: ['class','style']`, to guarantee no layout-affecting attributes survive.

### 3. Render-side safety net

In the `RichTextView` wrapper `div` className, add Tailwind utilities so any residual block-level pasted nodes still flow naturally:

- `[&_span]:!inline` — force spans inline.
- `[&_*]:!whitespace-normal` — never honour `white-space: nowrap`.
- Keep existing `break-words` so long URLs still wrap.

### 4. Backfill existing data (optional, no-op if not needed)

Existing `gospa_question_entries` rows of type `summary` saved before this fix may still contain dirty HTML. They will render correctly after change #2/#3 because the renderer strips/overrides the bad attributes — no migration required.

## Files to change

- `src/components/gospa/RichTextEditor.tsx` — add `transformPastedHTML` cleaner.
- `src/components/gospa/RichTextView.tsx` — drop `style` from allowed attrs, add inline/whitespace overrides.

## Out of scope

- No DB migration.
- No change to the Present mode dialog (it consumes `RichTextView`, so it inherits the fix automatically).
- No change to other GOSPA entry types (risk/opportunity/link) — they use `Textarea` / plain rendering and aren't affected.

## Verification

After approval and implementation:
1. Copy a paragraph from a PDF into Key insights → words display with normal spacing and natural wrapping.
2. Copy from Google Docs / Word → bold/italic preserved, no broken layout.
3. Open Present mode on the same objective → same clean rendering.
4. Existing entries continue to render (and now look better if previously affected).
