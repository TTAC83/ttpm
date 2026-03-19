

## Add Drag-and-Drop to Image Upload

### Current State
The upload zone in `ProductDialog.tsx` (lines ~237-248) is a `<label>` with a hidden file input. It handles click-to-upload only. No reusable upload component exists in the project.

### Approach
Create a small reusable `ImageDropZone` component that handles both click and drag-and-drop, then use it in `ProductDialog` (and anywhere else later).

### Files

**Create: `src/components/shared/ImageDropZone.tsx`**
- Accepts `onFileSelect(file: File)`, `maxSizeMB`, `preview` (existing image URL), `onClear`
- Renders a drop zone with `onDragOver`, `onDragEnter`, `onDragLeave`, `onDrop` handlers
- Visual feedback: border highlight on drag-over
- Click delegates to hidden file input
- Shows preview with remove button when an image is set
- Validates file type and size, shows toast on error

**Modify: `src/components/products/ProductDialog.tsx`**
- Replace the inline `<label>` upload zone and preview block (~lines 233-255) with `<ImageDropZone>`
- Remove the local `fileInputRef` and `handleFileSelect` — delegated to the component
- Keep the upload-to-storage and URL tab logic unchanged

### Scope
~80 lines for the new component, ~20 lines net reduction in ProductDialog. The component is immediately reusable for `ProductViewDialog` or any future upload need.

