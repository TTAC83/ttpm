

## Overview

Currently, the Lighting, PLC, and HMI tabs use simple checkboxes that default to "not required." The user wants consultants to explicitly confirm whether each is required or not. If no selection is made, it should appear as a configuration gap.

## Changes

### 1. Update the form data types

In `src/components/shared/camera-config/types.ts`:
- Change `light_required`, `plc_attached`, and `hmi_required` from `boolean` to `boolean | null`
- Update `emptyFormData` to set all three to `null` instead of `false`

### 2. Update the three tab components to use Yes/No radio buttons instead of checkboxes

**Lighting tab** (`src/components/shared/camera-config/tabs/CameraLightingTab.tsx`):
- Replace the checkbox with a Yes/No radio group (or two-button toggle)
- When neither is selected (null state), show a prompt like "Please confirm whether lighting is required"
- When "Yes" is selected, show the light model selector and notes
- When "No" is selected, show a brief confirmation message

**PLC tab** (`src/components/shared/camera-config/tabs/CameraPlcTab.tsx`):
- Same pattern: replace checkbox with Yes/No selection
- Null state prompts the user to decide
- "Yes" shows PLC model and relay outputs
- "No" shows confirmation

**HMI tab** (`src/components/shared/camera-config/tabs/CameraHmiTab.tsx`):
- Same pattern as above

### 3. Update the completeness checker

In `src/pages/app/solutions/hooks/useLineCompleteness.ts`:
- Add checks for when `light_required`, `plc_attached`, and `hmi_required` are `null` (undecided) -- these become config gaps
- Keep existing conditional checks: if light is required but no model selected, that's a gap; if PLC is required but no model or relay outputs, that's a gap; if HMI is required but no model, that's a gap

### 4. Update data loading to preserve null

In `src/components/line-builder/hooks/useLineData.ts`:
- Change the fallback from `false` to preserving `null` when loading camera data (e.g., `cam.light_required ?? null` instead of `cam.light_required || false`)

### 5. Update data saving to persist null

In `src/components/line-builder/hooks/useLineData.ts`:
- When saving, allow `null` values to pass through for these three fields instead of defaulting to `false`

---

## Technical Detail

The database columns (`light_required`, `plc_attached`, `hmi_required`) are already nullable booleans with a default of `false`. Existing cameras will show as `false` (No), so existing data is unaffected. Only newly created cameras will start as `null` (undecided) and require explicit confirmation.

The UI for Yes/No selection will use the existing `RadioGroup` component from the UI library, keeping the design consistent.

