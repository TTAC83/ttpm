

## Add Camera Placement Tab -- Complete the Wiring

### Overview

The previous attempt added the UI components (CameraPlacementTab, types, form state) and database columns but was cancelled before the data persistence and completeness validation were connected. This plan completes the remaining work.

### What Already Exists

- Database columns on `cameras` table: `placement_camera_can_fit`, `placement_fabrication_confirmed`, `placement_fov_suitable`, `placement_position_description`
- UI component: `CameraPlacementTab.tsx` with 3 checkboxes and position description textarea
- Types and empty form defaults in `types.ts`
- CameraConfigDialog already renders the Placement tab
- DeviceAssignment.tsx already maps placement fields in its local state

### What Still Needs to Be Done

**1. Update `get_line_full_data` RPC to return placement fields**

The RPC function builds camera JSON but does not include the four placement columns. The camera object construction needs to add `placement_camera_can_fit`, `placement_fabrication_confirmed`, `placement_fov_suitable`, and `placement_position_description` from the `cameras` table (which already has these columns).

**2. Update `save_camera_full` RPC to persist placement fields**

The RPC's `INSERT ... ON CONFLICT` for the cameras table needs to include the four placement columns so they are saved when the camera is created or updated.

**3. Update `useLineData.ts` -- load path (line ~39-61)**

When mapping camera data from the RPC response, add the four placement fields so they flow through to the edit form.

**4. Update `useLineData.ts` -- save path (line ~244-260)**

When inserting a new camera row via direct SQL, include the four placement fields in the insert statement.

**5. Update Equipment camera interface in `DeviceAssignment.tsx` (line ~29-62)**

Add the four optional placement properties to the camera type definition inside the Equipment interface.

**6. Update `useLineCompleteness.ts` -- add placement checks**

After the existing HMI check block (~line 303-308), add four new completeness checks:
- `placement_camera_can_fit` must be `true`
- `placement_fabrication_confirmed` must be `true`
- `placement_fov_suitable` must be `true`
- `placement_position_description` must be non-empty

This ensures the Lines tab only goes green when all placement fields are complete, which in turn gates the Feasibility sign-off.

### Files to Change

| File | Change |
|------|--------|
| Database migration | Update `save_camera_full` and `get_line_full_data` RPC functions to include placement fields |
| `src/components/line-builder/hooks/useLineData.ts` | Map placement fields on load (~line 61) and save (~line 260) |
| `src/components/line-builder/steps/DeviceAssignment.tsx` | Add placement fields to the Equipment camera interface (~line 29-62) |
| `src/pages/app/solutions/hooks/useLineCompleteness.ts` | Add 4 placement completeness checks after the HMI block |

### Non-mandatory but Required for Completeness

The placement fields remain non-mandatory when saving the camera form (users can save partial data at any time). However, the Lines tab completeness indicator will show gaps for any unfilled placement fields, and the Feasibility Gate will not allow sign-off until they are all filled.

