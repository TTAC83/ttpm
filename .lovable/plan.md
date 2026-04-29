## Fix empty-paragraph spacing in GOSPA Key Insights renderer

### Problem
TipTap editor produces empty `<p></p>` tags when the user presses Enter on a blank line. The editor displays these as visible blank rows (it has a CSS rule for `p:empty`), but `RichTextView` collapses them to zero height, so vertical spacing disappears once the edit window closes.

### Change
Edit `src/components/gospa/RichTextView.tsx` — add a Tailwind arbitrary selector so empty paragraphs render a non-breaking space placeholder, giving them visible height that matches the editor.

Add to the className list on the rendered `<div>`:
- `[&_p:empty]:before:content-['\\00a0']`
- `[&_p:empty]:before:inline-block`

This mirrors the editor's behavior, so spacing in the read-only view (workspace + presentation mode) matches what the user sees while editing.

### Files
- `src/components/gospa/RichTextView.tsx`
