
# Full-Width Toggle for Presentation Mode

## Problem
The presentation content is constrained to `max-w-[1100px]`, leaving large blank margins on wide screens. You want a button to expand the content to fill the entire page width.

## Solution
Add a Maximize/Minimize toggle button in the presentation header bar. When toggled:
- **Normal mode**: Content stays at `max-w-[1100px]` (current behavior)
- **Expanded mode**: Content stretches to full width with only small padding

## Changes

### `src/components/gospa/PresentObjectiveDialog.tsx`

1. Replace `ZoomIn` import with `Maximize2, Minimize2`
2. Replace `zoomedHtml` state with `isExpanded` boolean state
3. Remove the entire zoom overlay at the bottom of the component
4. Remove the `group relative cursor-pointer hover:border-white/20` and zoom icon button from answer/insight blocks (revert to simple styling)
5. Add a toggle button in the header next to the slide counter:
   ```
   <button onClick={() => setIsExpanded(e => !e)}>
     {isExpanded ? <Minimize2 /> : <Maximize2 />}
   </button>
   ```
6. Change the content container class from hardcoded `max-w-[1100px]` to conditional:
   ```
   className={`mx-auto px-10 py-12 gospa-present-content ${isExpanded ? "max-w-none px-16" : "max-w-[1100px]"}`}
   ```
7. Revert the Escape key handler to the simpler version (no zoom overlay to dismiss)

This is a single-file change with no database or dependency changes.
