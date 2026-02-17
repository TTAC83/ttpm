

## Factory Hardware Completeness Indicators and Configuration Gaps

### Overview

Add red/green completeness indicators to the IoT and Vision sub-tabs within the Factory Hardware page, and a top-level indicator on the "Factory Hardware" tab in the navigation. Also add a Configuration Gaps info box (matching the style from the Lines page) that tells the user exactly what needs attention.

### Completeness Rules

**IoT tab is green when:**
- Every IoT device (from lines) is assigned to a receiver
- Every receiver is assigned to a gateway
- If there are no IoT devices AND no receivers AND no gateways, treat as green (nothing to configure)

**Vision tab is green when:**
- Every camera (from lines) is assigned to a server
- If there are no cameras AND no servers, treat as green (nothing to configure)

**Factory Hardware nav tab is green when:**
- Both IoT and Vision sub-tabs are green

### Configuration Gaps Info Box

A collapsible panel at the top of each sub-tab (IoT / Vision), styled like the existing "Configuration Gaps" pattern on the Lines page. It lists specific unresolved items:

**IoT gaps examples:**
- "3 IoT devices not assigned to a receiver" (with device names)
- "2 receivers not assigned to a gateway" (with receiver names)

**Vision gaps examples:**
- "4 cameras not assigned to a server" (with camera MAC/line info)

When all items are assigned, the panel shows a green "All hardware assignments complete" message instead.

### Technical Changes

**1. `src/pages/app/projects/tabs/ProjectHardware.tsx`**

- Compute `iotComplete` and `visionComplete` booleans from existing query data already loaded in the component:
  - Compare `iotDevicesFromLines` against `deviceReceiverAssignments` to find unassigned devices
  - Compare `receiverRequirements` against `receiverGatewayAssignments` to find unassigned receivers
  - Compare `camerasWithContext` against `cameraAssignments` to find unassigned cameras
- Add red/green dot indicators to the IoT and Vision `TabsTrigger` elements (same style as the nav tabs)
- Add a Configuration Gaps panel at the top of each `TabsContent` that lists specific unresolved items
- Export `iotComplete` and `visionComplete` (or a combined `hardwareComplete`) so the parent can use it -- achieved by accepting an optional `onCompletenessChange` callback prop

**2. `src/pages/app/solutions/hooks/useTabCompleteness.ts`**

- Add `factoryHardware: boolean` to the `TabCompleteness` interface
- Add an async check that mirrors the assignment logic: fetch IoT devices, cameras, and their assignments to determine completeness
- This value will drive the nav tab indicator

**3. `src/pages/app/solutions/SolutionsProjectDetail.tsx`**

- Add a red/green dot to the "Factory Hardware" `TabsTrigger`, driven by `completeness.factoryHardware`

### Visual Design

The sub-tab indicators will look like:

```text
[IoT (3) *green*]  [Vision (5) *red*]
```

The gaps panel will match the existing Lines pattern:

```text
+------------------------------------------------------+
| CONFIGURATION GAPS -- 3 items remaining              |
|                                                      |
| [Unassigned Devices]        [Unassigned Receivers]   |
| * Sensor A (Line 1)        * Receiver 1              |
| * Sensor B (Line 2)        * Receiver 2              |
| * Sensor C (Line 3)                                  |
+------------------------------------------------------+
```

### Files Affected

| File | Change |
|------|--------|
| `src/pages/app/projects/tabs/ProjectHardware.tsx` | Add completeness computation, sub-tab indicators, gaps panels, and `onCompletenessChange` callback |
| `src/pages/app/solutions/hooks/useTabCompleteness.ts` | Add `factoryHardware` field with assignment-based completeness check |
| `src/pages/app/solutions/SolutionsProjectDetail.tsx` | Add red/green dot to "Factory Hardware" tab trigger |

