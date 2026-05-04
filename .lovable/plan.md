
# Uniform Question Cards with Presentation Preview & Expandable Editors

## What changes

### 1. Fixed-height question cards with scrollable content
All 6 question cards will have a consistent fixed height (approximately 400px). The answer and key insight sections inside each card will be placed in a scrollable container, so cards align neatly in the 2-column grid regardless of content length.

### 2. "Open" button on each question card
Each card header will get an "Open" button (eye/expand icon). Clicking it opens the `PresentObjectiveDialog` but pre-navigated to that question's slide, so the user sees the presentation view for that specific question immediately.

### 3. Expandable editors when editing
When a user clicks to add or edit an answer/insight, the editor area will expand (removing the fixed height constraint temporarily) so they have room to work with tables and rich content. Once done, it returns to the fixed-height scrollable view.

## Technical details

### File: `src/pages/app/gospa/ObjectiveWorkspace.tsx`

**Card layout** (lines 149-192):
- Add a fixed height class to each `<Card>` (e.g. `h-[420px] flex flex-col`)
- Wrap `<CardContent>` inner content in a scrollable div (`overflow-y-auto flex-1 min-h-0`)
- Add an "Open" button in the card header next to the delete button
- Track which question is being "presented" via new state: `presentQuestionId`
- Pass `initialSlideQuestionId` prop to `PresentObjectiveDialog`

**PresentObjectiveDialog** (lines 121-128):
- Accept new `initialQuestionId?: string` prop
- On open, find the slide index matching that question and set `index` accordingly

**EntrySection** (lines 446-662):
- Add local state `isAdding` / `isEditing` to track when editor is active
- When editor is active, the parent card removes its fixed height constraint (communicated via a callback prop `onEditingChange`)
- The card toggles between `h-[420px]` (browsing) and `h-auto` (editing) based on whether any EntrySection is in edit mode

### File: `src/components/gospa/PresentObjectiveDialog.tsx`
- Add `initialQuestionId` prop
- In the `useEffect` for open lifecycle, look up the slide index for the matching `questionId` and call `setIndex()`

### File: `src/components/gospa/RichTextEditor.tsx`
- No changes needed; it already grows with content naturally

## UX rationale
- **Uniform cards**: The 2-column grid looks tidy with equal-height cards; users scan questions without layout jitter
- **Scrollable content**: Long answers with tables don't blow out the card height; users scroll within the card
- **Open button**: Quick access to the polished presentation view per question, without cycling through all slides
- **Expandable editor**: When composing, users need space -- especially for pasted Excel tables. The card temporarily grows to accommodate, then snaps back when done
