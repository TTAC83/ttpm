

## Product Artwork: Upload or URL Option

### Overview
Replace the URL-only artwork field with a dual-mode input: users can either upload a small image (stored in Supabase Storage) or paste a URL. The uploaded image thumbnail displays in the product table and dialog.

### Storage Impact
- Typical product artwork: 100-500KB per image
- 500 products = ~250MB maximum — negligible for Supabase Storage

### Changes

**1. Database Migration**
- Create a `product-artwork` storage bucket (public, so thumbnails render without signed URLs)
- RLS: authenticated users can upload/delete; public read
- No schema change needed — the existing `master_artwork_url` column stores either the external URL or the Supabase public URL

**2. ProductDialog.tsx**
- Add a toggle/tab: "Upload" vs "URL"
- Upload mode: file input accepting `image/*`, max 2MB, preview thumbnail
- On save: upload file to `product-artwork/{productId}/{filename}`, store the public URL in `master_artwork_url`
- URL mode: existing text input (unchanged)
- On edit: detect if current URL is from Supabase storage to pre-select the correct mode
- On replacing an upload: delete the old file from storage

**3. SolutionsProducts.tsx**
- No changes needed — it already renders `<img src={prod.master_artwork_url}>` which works for both uploaded and external URLs

### Files to Create
| File | Purpose |
|------|---------|
| Migration SQL | `product-artwork` bucket + RLS policies |

### Files to Modify
| File | Change |
|------|---------|
| `src/components/products/ProductDialog.tsx` | Add upload/URL toggle, file upload logic, preview |

