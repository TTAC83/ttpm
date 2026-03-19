

## Lightbox for Product Artwork

### Overview
Add a click-to-enlarge lightbox when users click on product artwork thumbnails. Clicking the small image opens it full-size in a centered overlay dialog.

### Approach
Create a small reusable `ImageLightbox` component (a simple Dialog wrapping a large image), then wire it up in two places where thumbnails appear:

1. **Product table** in `SolutionsProducts.tsx` — the 40x40 thumbnail in each row
2. **ImageDropZone preview** in `ImageDropZone.tsx` — the upload preview thumbnail
3. **ProductDialog URL preview** — the inline URL preview image

### Files

**Create: `src/components/shared/ImageLightbox.tsx`**
- A Dialog that shows the image at full size (max-w/max-h constrained to viewport)
- Props: `src`, `alt`, `open`, `onOpenChange`
- Minimal chrome — just the image with a close button

**Modify: `src/pages/app/solutions/tabs/SolutionsProducts.tsx`**
- Wrap the table thumbnail `<img>` with a clickable handler that opens the lightbox
- Add lightbox state (`lightboxSrc`) and render `<ImageLightbox>`

**Modify: `src/components/shared/ImageDropZone.tsx`**
- Make the preview image clickable to open the lightbox

**Modify: `src/components/products/ProductDialog.tsx`**
- Make the URL-mode preview image clickable to open the lightbox

