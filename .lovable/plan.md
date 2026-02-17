

## Fix: Network Topology Not Showing Cameras or PLCs

### Root Cause

The network topology diagram only displays cameras that have been explicitly assigned to a server via the `camera_server_assignments` join table. Currently, no assignment rows exist for this project -- the camera exists but hasn't been mapped to a server yet. So the diagram shows "Server 1 (0 cams)" with no camera nodes beneath it.

The same issue applies to IoT devices -- they only appear if assigned through the receiver/gateway chain.

### Solution

Change the topology to always show **all project cameras and IoT devices**, regardless of assignment status:

1. **Assigned hardware** appears under its parent (camera under its server, device under its receiver/gateway)
2. **Unassigned hardware** appears in a separate "Unassigned" section at the bottom of the topology, so nothing is hidden

This ensures the feasibility summary always reflects the full hardware picture.

### Technical Changes

**File: `src/components/FeasibilityGateDialog.tsx`**

1. In `fetchSummary`, fetch **all project cameras** (via solutions_lines -> positions -> equipment -> cameras) instead of only those in `camera_server_assignments`. Same for IoT devices.

2. Build the server topology as before (cameras matched via `camera_server_assignments`), but then collect any cameras NOT found in assignments into an "Unassigned Cameras" list.

3. Same pattern for IoT devices: devices assigned through the receiver/gateway chain appear nested; unassigned devices appear in a separate section.

4. Also resolve `camera_type` from the master table to show the actual model name instead of a UUID.

5. In the render section, add an "Unassigned" node below servers/gateways if any unassigned cameras or devices exist, visually distinguished with an amber/warning style.

6. Always show the Network Topology section when the project has any cameras, IoT devices, servers, or gateways -- not just when servers/gateways exist.

### Updated Data Flow

```text
All project cameras (via line -> position -> equipment -> cameras)
  |
  +-- Matched to server via camera_server_assignments? --> Show under that server
  +-- Not matched? --> Show in "Unassigned" section

All project IoT devices (via line -> position -> equipment -> iot_devices)  
  |
  +-- Matched to receiver via device_receiver_assignments? --> Show under receiver/gateway
  +-- Not matched? --> Show in "Unassigned" section
```

### Visual Result

```text
Cloud
  |
  +-- Server 1
  |     +-- Camera 1 [Vision] [PLC]
  |
  +-- Gateway 1
  |     +-- Receiver 1
  |           +-- Device A
  |
  +-- Unassigned (if any)
        +-- Camera 2 (not yet assigned)
```

### Files Affected

| File | Change |
|------|--------|
| `src/components/FeasibilityGateDialog.tsx` | Fetch all project cameras/devices; split into assigned vs unassigned; resolve camera_type UUID to name; always show topology when hardware exists |

