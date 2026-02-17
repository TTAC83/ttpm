

## Camera-to-Server Assignment on Factory Hardware Tab

### Overview

After completing line configuration, users need to assign each camera to a server on the Factory Hardware "Vision" sub-tab. This requires a new database join table and a UI that shows servers as expandable cards with an "Assign Cameras" action, presenting unassigned cameras in a rich, informative table.

### Database Change

Create a new join table `camera_server_assignments`:

```text
camera_server_assignments
- id (uuid, PK)
- camera_id (uuid, FK -> cameras.id, UNIQUE)
- server_requirement_id (uuid, FK -> project_iot_requirements.id)
- created_at (timestamptz)
```

The UNIQUE constraint on `camera_id` enforces one-server-per-camera. RLS policies will mirror existing `project_iot_requirements` access patterns.

### UX Design

Each server card in the Vision sub-tab gets an expandable section:

```text
+---------------------------------------------------------------+
| Server 1  |  Dell PowerEdge R750 - SKU-123       Qty: 1       |
| [Assign Cameras]                            [x Delete]        |
|                                                               |
| Assigned Cameras (2/5)                                        |
| +-----------------------------------------------------------+ |
| | Line       | Position | Equipment | Camera   | Use Cases  | |
| |------------|----------|-----------|----------|------------| |
| | Line A     | Pos 1    | Equip 1   | Cam-001  | Label, QC  | |
| | Line A     | Pos 2    | Equip 3   | Cam-004  | Barcode    | |
| +-----------------------------------------------------------+ |
|                                                 [Unassign]    |
+---------------------------------------------------------------+
```

Clicking "Assign Cameras" opens a dialog/sheet showing **unassigned cameras only**, displayed in a table with columns:

| Column | Source |
|--------|--------|
| Line | `solutions_lines.line_name` |
| Position | `positions.name` |
| Equipment | `equipment.name` |
| Camera Name | `cameras.mac_address` (used as display name) |
| Use Cases | Joined from `camera_use_cases` -> `vision_use_cases_master.name` |
| Attributes | Joined from `camera_attributes.title` as badges |

Users select cameras via checkboxes and confirm to bulk-assign them to the server.

### Technical Changes

**1. New migration** -- Create `camera_server_assignments` table with foreign keys, unique constraint, and RLS policies.

**2. Regenerate Supabase types** -- The new table will appear in `types.ts` after migration.

**3. `src/pages/app/projects/tabs/ProjectHardware.tsx`** -- Main changes:

- Add a new query to fetch all cameras for the project with their full context (line name, position name, equipment name, use cases, attributes) by traversing: `solutions_lines` -> `positions` -> `equipment` -> `cameras` -> `camera_use_cases` / `camera_attributes`.
- Add a query for `camera_server_assignments` to know which cameras are already assigned and to which server.
- For each server card in the Vision tab, render:
  - A count badge showing "X cameras assigned".
  - A collapsible table of assigned cameras with an "Unassign" action per row.
  - An "Assign Cameras" button that opens a dialog.
- Create an `AssignCamerasDialog` component (inline or separate file) containing:
  - A table of unassigned cameras with checkbox selection.
  - Columns: Line, Position, Equipment, Camera Name, Use Cases (as comma-separated text), Attributes (as small badges).
  - A "Select All" header checkbox.
  - An "Assign Selected" confirmation button.
- Add mutations for inserting/deleting rows in `camera_server_assignments`.

**4. Query structure for camera context** (pseudocode):

```text
solutions_lines (where solutions_project_id = projectId)
  -> positions (where line_id in lineIds)
    -> equipment (where position_id in positionIds)
      -> cameras (where equipment_id in equipmentIds)
        -> camera_use_cases -> vision_use_cases_master (name)
        -> camera_attributes (title)
```

This reuses the same traversal pattern already established in the existing `iotDevicesFromLines` query in this file.

### Files Affected

| File | Change |
|------|--------|
| `supabase/migrations/[new]` | New `camera_server_assignments` table |
| `src/integrations/supabase/types.ts` | Auto-regenerated |
| `src/pages/app/projects/tabs/ProjectHardware.tsx` | Server cards get assigned cameras list, assign button, and dialog |

