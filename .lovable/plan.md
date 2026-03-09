

## Plan: Add Media Uploads to Line Information

### Summary

Add image/video upload capability to the Line Information section. Users can capture media directly from the tablet camera or select from device storage. Each media item has an editable description. Media is stored in Supabase Storage with metadata in a new `line_media` table. Offline-first via existing PWA caching, with Workbox Background Sync for queued uploads.

**Recommended browser**: Google Chrome on the Lenovo tablet (best PWA, camera capture, and service worker support).

### Changes

#### 1. Database Migration

Create `line_media` table:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | default gen_random_uuid() |
| line_id | uuid FK → lines(id) ON DELETE CASCADE | nullable |
| solutions_line_id | uuid FK → solutions_lines(id) ON DELETE CASCADE | nullable |
| file_path | text NOT NULL | Storage bucket path |
| file_name | text NOT NULL | Original filename |
| file_type | text NOT NULL | MIME type |
| file_size | bigint | Bytes |
| description | text | User-entered |
| sort_order | integer DEFAULT 0 | Display ordering |
| created_at | timestamptz DEFAULT now() | |
| created_by | uuid DEFAULT auth.uid() | |

CHECK constraint: exactly one of `line_id` or `solutions_line_id` must be non-null.

RLS policies: authenticated SELECT, INSERT, DELETE (using `is_internal()` or company membership via joins to projects/solutions_projects).

Create private `line-media` storage bucket with authenticated upload/download/delete policies.

#### 2. New Component: `src/components/line-builder/LineMediaUploader.tsx`

- Props: `lineId: string`, `tableName: 'lines' | 'solutions_lines'`
- Fetches existing media from `line_media` on mount
- Two upload buttons:
  - "Choose File" — `<input type="file" accept="image/*,video/*" multiple>`
  - "Take Photo/Video" — `<input type="file" accept="image/*,video/*" capture="environment">`
- Validates: max 20MB per file, image/* or video/* MIME only
- Uploads to `line-media/{lineId}/{uuid}-{filename}` in Supabase Storage
- Inserts row into `line_media` table
- Displays grid of thumbnails (signed URLs for images, video icon for videos)
- Inline editable description per item
- Delete button per item
- Shows upload progress indicator

#### 3. Update `src/components/line-builder/steps/LineBasicInfo.tsx`

- Import and render `LineMediaUploader` below the existing form fields
- Pass `lineId` prop (available when editing; hidden when creating — media upload only available after initial line save)
- Show a note during creation: "Save the line first to enable media uploads"

#### 4. Update Completeness Check: `lineCompletenessCheck.ts`

- Add a check for whether the line has at least one media item uploaded (query `line_media` count)
- Add "Line Media" to the gaps list if no media exists

#### 5. PWA Offline Support: `vite.config.ts`

- Add a Workbox `backgroundSync` plugin for POST/PUT requests to the Supabase storage endpoint, so uploads queued offline are retried when connectivity returns
- Existing `StaleWhileRevalidate` rule for `/storage/v1/object/` already caches viewed media for offline access

### Files Modified

| File | Action |
|------|--------|
| `supabase/migrations/...` | New migration: `line_media` table + storage bucket + RLS |
| `src/components/line-builder/LineMediaUploader.tsx` | New component |
| `src/components/line-builder/steps/LineBasicInfo.tsx` | Add media uploader section |
| `src/pages/app/solutions/hooks/lineCompletenessCheck.ts` | Add media completeness check |
| `vite.config.ts` | Add background sync for storage uploads |

