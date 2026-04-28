## Goal

Add a "Present" mode to the Objective Workspace (`/app/gospa/objectives/:id`) so a user can walk an audience through every question and the answers it has received. Output is fullscreen, Thingtrax-branded, and renders the existing rich-text answers (including clickable links) at presentation size.

## UX design

**Trigger**
- Add a `Present` button (Play icon) in the Objective header next to the RAG selector. Only visible when at least one question exists.

**Layout (per slide)**
```
┌──────────────────────────────────────────────────────────────┐
│ [Thingtrax logo]            Objective title    1 / 14   [✕]  │
│──────────────────────────────────────────────────────────────│
│  Q3.  How do we reduce changeover time on Line 4?            │
│                                                              │
│  Answered by: Allan Carney                                   │
│                                                              │
│  ┌── Key insights ──────────────────────────────────────┐   │
│  │  <RichTextView> rendered at presentation size         │   │
│  │  • bullet                                             │   │
│  │  • bullet with [hyperlink ↗]                          │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌── Supporting evidence ───────────────────────────────┐   │
│  │  • https://… (opens new tab)                          │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│──────────────────────────────────────────────────────────────│
│  ◀ Prev          • • • ● • • • • • • •          Next ▶       │
└──────────────────────────────────────────────────────────────┘
```

- Black/white branded chrome using existing `--thingtrax-black` and `--thingtrax-green` tokens; logo is `@/assets/thingtrax-logo-full.png` top-left.
- Body uses a centered max-width column (~1100px) with generous line-height. Base font 22–24px so text reads from a meeting room. Rich-text styles inherit through a scoped wrapper that bumps `prose` sizes (similar to the slides skill pattern).
- Hyperlinks open in new tab — `RichTextView` already renders `<a>`; we'll wrap rendered content with a click handler that forces `target="_blank" rel="noopener"` on any anchor without one.
- Long answers scroll inside the slide body (no clipping); slide chrome stays fixed.

**Slide ordering**

For each question (ordered by `order_index`), generate one slide per user who has contributed an answer entry of type `summary` or `link`.
- Group entries by `created_by` within the question.
- A user's slide shows ALL of their entries for that question (their `summary` insights + their `link` evidence stacked).
- If a question has no answers, render a single "No answers yet" slide so audiences see the question was asked.
- Title block on each slide always shows the question text + "Answered by {name}" (or "Awaiting answer").

Slide order: `Q1/UserA → Q1/UserB → Q2/UserA → Q2/UserC → …`

**Navigation**
- `→` / `Space` / `PageDown` / on-screen Next → next slide.
- `←` / `PageUp` / on-screen Prev → previous slide.
- `Home` / `End` jump to first / last.
- `Esc` or the ✕ button exits present mode.
- Bottom progress dots; current slide highlighted in Thingtrax green.

**Fullscreen behaviour**
- On Present: call `document.documentElement.requestFullscreen()` (best-effort, fall back to a fixed-position cover if the API rejects).
- Listen to `fullscreenchange` and exit cleanly if the user presses browser ESC.
- Hide cursor after 3s of inactivity inside the presenter.

## Technical implementation

**New files**
- `src/components/gospa/PresentObjectiveDialog.tsx`
  - Props: `open`, `onOpenChange`, `objective`, `questions`, `entries`, `nameOf`.
  - Builds the slide list (memoised) from `questions` + `entries`.
  - Renders a fixed-position branded overlay (no shadcn Dialog — we want full control over fullscreen & keyboard).
  - Handles fullscreen lifecycle, keyboard nav, cursor auto-hide.
  - Uses `RichTextView` for answer content inside a `.gospa-present-content` scoped wrapper.

**Modifications**
- `src/pages/app/gospa/ObjectiveWorkspace.tsx`
  - Import `Play` icon and `PresentObjectiveDialog`.
  - Add `presentOpen` state.
  - Add `<Button variant="outline" onClick={() => setPresentOpen(true)}><Play/> Present</Button>` in the header (next to the RAG select). Disable if no questions.
  - Render `<PresentObjectiveDialog ... />` at the bottom of the page, passing already-loaded `questionsQ.data`, `entriesQ.data`, `obj`, and `nameOf`.

- `src/index.css`
  - Add a small scoped block to upscale `RichTextView` content inside the presenter:
  ```css
  .gospa-present-content { font-size: 22px; line-height: 1.6; }
  .gospa-present-content h1 { font-size: 40px; }
  .gospa-present-content h2 { font-size: 32px; }
  .gospa-present-content h3 { font-size: 26px; }
  .gospa-present-content a  { color: hsl(var(--thingtrax-green)); text-decoration: underline; }
  .gospa-present-content ul, .gospa-present-content ol { padding-left: 1.5rem; }
  .gospa-present-content li { margin: 0.4rem 0; }
  ```

**Link safety**

After `RichTextView` renders, run a small effect on the slide container that finds `a[href]` and sets `target="_blank"` and `rel="noopener noreferrer"` if missing. (Keeps the existing DOMPurify allow-list intact — no schema changes needed.)

**Data**

No DB or service changes. Uses existing:
- `gospa.listQuestions(objectiveId)`
- `gospa.listQuestionEntriesForObjective(objectiveId)` (already loaded by the page)
- `useUserNames` for owner display names

## Out of scope

- Editing answers inside Present mode.
- Exporting slides to PDF/PPTX.
- Cross-objective presenting (single objective only for this iteration).
