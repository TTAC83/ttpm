

## Add Upload/URL Dual-Mode to ProductViewDialog

### Overview
Replace the plain "View Image URL" text input in `ProductViewDialog.tsx` with the same Upload/URL tab pattern already used in `ProductDialog.tsx`. Reuses the existing `ImageDropZone` and `ImageLightbox` shared components and the same `product-artwork` storage bucket.

### Changes

**Modify: `src/components/products/ProductViewDialog.tsx`**
- Add imports: `Tabs/TabsList/TabsTrigger/TabsContent`, `ImageDropZone`, `ImageLightbox`, `Upload`/`Link` icons
- Add state: `artworkMode` ('upload'|'url'), `uploadFile`, `uploadPreview`, `existingUploadUrl`, `urlLightboxOpen`
- On dialog open: detect if existing `view_image_url` is a Supabase storage URL to pre-select the correct mode
- Replace the single URL input (lines 182-190) with the same Upload/URL tabs pattern from ProductDialog
- Update `handleSave`: upload file to `product-artwork/{viewId}/...` when in upload mode, delete old file when replacing
- Add helper functions `isSupabaseStorageUrl` and `extractStoragePath` (same as ProductDialog)

No database or migration changes needed — uses the same `product-artwork` bucket and `view_image_url` column.

