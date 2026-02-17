

## Line-by-Line Summary Section in Feasibility Gate Dialog

### Overview

Add a new "Line Detail" section to the Feasibility Gate dialog that provides a breakdown of each line showing its positions, equipment, and attached hardware (cameras with use cases/attributes/lights/PLCs, and IoT devices with HMI/energy monitoring status).

Given the dialog is already content-heavy, the recommended approach is to **widen the dialog to `max-w-4xl`** and organise the content into **horizontal tabs** (Summary | Line Detail | Network Topology). This keeps each section focused and avoids an endlessly scrolling popup. A carousel would feel odd here as each "slide" has different heights and content types -- tabs give users direct access to the section they need.

### Layout Change

The dialog currently uses `max-w-2xl`. It will be widened to `max-w-4xl` and the existing content will be split into three tabs:

| Tab | Content |
|-----|---------|
| **Summary** | KPI cards, use cases, site structure (existing content) |
| **Line Detail** | New line-by-line hardware breakdown |
| **Network** | Network topology and unassigned hardware (existing content) |

The sign-off section remains fixed at the bottom, outside the tabs.

### Line Detail Tab Content

For each solutions line, render a collapsible card:

```
Line 1 Name
  Position 1 > Equipment A (Camera)
    Use Cases: Label Check, OCR
    Attributes: Colour, Orientation
    Light: Yes (model name)
    PLC: Yes (model name) - 3 outputs
    HMI: Yes (model name)
  Position 2 > Equipment B (IoT)
    Device: Sensor X
    HMI/Energy: Yes (model name)
```

Each piece of equipment shows:
- **Cameras**: use cases (from `camera_use_cases` + `vision_use_cases_master`), attributes (from `camera_attributes`), light status (resolved from `hardware_master` if `light_id` set), PLC status (resolved from `hardware_master` if `plc_master_id` set) with relay output count, HMI status (resolved from `tv_displays_master` if `hmi_master_id` set)
- **IoT Devices**: device name, hardware model (from `hardware_master`), HMI/energy monitoring indicated by presence of `hmi_master_id` on the parent camera or co-located equipment

### Data Fetching

Extend `fetchSummary` to also collect:
1. All positions per line (via `solutions_line_id`)
2. Equipment per position (via `position_id`)
3. Cameras per equipment with: use cases, attributes, light/PLC/HMI master IDs
4. IoT devices per equipment with: name, hardware model
5. Resolve master IDs to names in bulk from `hardware_master`, `tv_displays_master`, `vision_use_cases_master`

All fetched in parallel where possible to minimise load time.

### Technical Changes

**File: `src/components/FeasibilityGateDialog.tsx`**

1. **Widen dialog**: Change `max-w-2xl` to `max-w-4xl`
2. **Add Tabs**: Wrap existing content sections in a `Tabs` component with three tabs: Summary, Line Detail, Network
3. **New interfaces**: Add `LineDetail`, `PositionDetail`, `EquipmentDetail` types to the summary data
4. **Extended fetch**: In `fetchSummary`, after existing queries, fetch the full position/equipment/camera/device hierarchy with related master data
5. **Line Detail rendering**: Collapsible cards per line, with nested position > equipment > hardware detail using the same tree-style indentation pattern as the site structure section
6. **Icons**: Camera icon for vision equipment, MonitorSmartphone for IoT, Lightbulb for lights, Cpu for PLC, Monitor for HMI, with colour-coded badges matching the process flow chart conventions (green camera, yellow light, purple PLC, orange HMI)
7. **Sign-off section**: Moved outside the tabs so it's always visible regardless of which tab is active

### New Data Structures

```typescript
interface LineDetailData {
  id: string;
  name: string;
  positions: PositionDetailData[];
}

interface PositionDetailData {
  id: string;
  name: string;
  equipment: EquipmentDetailData[];
}

interface EquipmentDetailData {
  id: string;
  name: string;
  type: string; // equipment_type
  cameras: CameraDetailData[];
  iotDevices: IoTDeviceDetailData[];
}

interface CameraDetailData {
  id: string;
  mac_address: string;
  camera_model: string; // resolved from hardware_master
  use_cases: string[];
  attributes: { title: string; description: string }[];
  light: { required: boolean; model?: string } | null;
  plc: { attached: boolean; model?: string; outputCount: number } | null;
  hmi: { required: boolean; model?: string } | null;
}

interface IoTDeviceDetailData {
  id: string;
  name: string;
  hardware_model: string; // resolved from hardware_master
}
```

### Files Affected

| File | Change |
|------|--------|
| `src/components/FeasibilityGateDialog.tsx` | Widen dialog, add tabs, add line detail data fetching, add line detail tab rendering |

