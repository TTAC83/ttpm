

## Enhance Infrastructure Tab and SOW with Detailed Network Requirements

This plan enriches the current Infrastructure tab from simple "Required/Not Required" toggles into a comprehensive network specification form based on the ThingTrax Security & Network document. It also updates the SOW document to include the detailed network specifications.

### Current State

The Infrastructure tab has 8 binary fields (Required/Not Required):
- Network Ports, VLAN, Static IP, 10Gb Connection, Mount Fabrication, VPN, Storage, Load Balancer

The SOW simply echoes "Required" or "Not Required" for each.

### What Changes

#### 1. New Database Columns (Migration)

Add detailed network specification fields to `solutions_projects`:

| Column | Type | Purpose |
|--------|------|---------|
| `infra_internet_speed_mbps` | integer | Minimum internet speed (default guidance: 2-3 Mbps) |
| `infra_lan_speed_gbps` | integer | Internal LAN speed per camera (default: 1 Gbps) |
| `infra_switch_uplink_gbps` | integer | Switch-to-server uplink (5-10 Gbps) |
| `infra_cable_spec` | text | Cable specification (Cat 6 / Cat 7) |
| `infra_max_cable_distance_m` | integer | Max cable run distance in metres |
| `infra_poe_required` | boolean | PoE cameras |
| `infra_dhcp_reservation` | boolean | DHCP IP reservation required |
| `infra_remote_access_method` | text | Remote access method (e.g. "Cloud VNC") |
| `infra_server_mounting` | text | Server mounting type (Wall / Rack) |
| `infra_server_power_supply` | text | Power supply spec |
| `infra_notes` | text | Free-text notes for additional requirements |

#### 2. Infrastructure Tab UI Update (`SolutionsInfrastructure.tsx`)

Restructure into sections:

**Section 1 -- General Requirements** (existing toggles)
Keep the 8 existing Required/Not Required dropdowns as-is.

**Section 2 -- Bandwidth & Cabling** (new)
- Internet Speed (Mbps) -- numeric input with helper text "Minimum 2-3 Mbps recommended"
- Internal LAN Speed (Gbps per camera) -- numeric, default hint "1 Gbps per camera (GigE)"
- Switch to Server Uplink (Gbps) -- numeric, helper "5 Gbps min, 10 Gbps max recommended"
- Cable Specification -- select: Cat 5e / Cat 6 / Cat 7
- Max Cable Distance (m) -- numeric, helper "100m max for Cat6; additional switch needed beyond"
- PoE Required -- checkbox

**Section 3 -- IP & Remote Access** (new)
- DHCP IP Reservation Required -- checkbox, with note "ThingTrax provides MAC addresses for DHCP reservation"
- Remote Access Method -- text input, default suggestion "Cloud VNC"
- Server Mounting -- select: Wall Mount / Rack Mount
- Server Power Supply -- text input, hint "DC 19-36V single supply"

**Section 4 -- Additional Notes** (new)
- Free-text textarea for any customer-specific network requirements

**Section 5 -- Customer Confirmation** (existing checkbox, moved to bottom)

#### 3. SOW Document Update (`SOWDocument.tsx` and `sowService.ts`)

Expand the Infrastructure section of the SOW to include:

- All existing Required/Not Required items
- New subsection: **Bandwidth & Cabling Specifications**
  - Internet speed, LAN speed, switch uplink, cable spec, max distance, PoE
- New subsection: **IP Management & Remote Access**
  - DHCP reservation, remote access method, server mounting, power supply
- New subsection: **Port Requirements** (static reference table rendered in the SOW)
  - Inbound: Port 22 (internal VLAN only)
  - Outbound: Port 8883 (Azure IoT), Port 443 (multiple destinations), Port 123 (NTP), Port 554 (RTSP)
  - This is standard across all deployments and will be hardcoded in the SOW template (not editable per project)
- Additional notes if provided

The `SOWData` interface in `sowService.ts` will be extended with the new fields. The `aggregateSOWData` function will read them from the project record.

#### 4. SOW Validation Update (`sowService.ts`)

The `validateSOWReadiness` function will NOT require the new detailed fields -- they are informational enrichment. The existing 8 infrastructure toggles remain the mandatory gate. This avoids blocking existing projects.

#### 5. No Changes to Feasibility Gate or Completeness

The feasibility gate and tab completeness logic remain unchanged -- they still check the 8 existing infrastructure toggles and customer confirmation. The new fields are additive detail for the SOW document.

### Files Changed

| File | Action |
|------|--------|
| `supabase/migrations/[new].sql` | **Create** -- Add new columns to `solutions_projects` |
| `src/pages/app/solutions/tabs/SolutionsInfrastructure.tsx` | **Edit** -- Add new form sections |
| `src/lib/sowService.ts` | **Edit** -- Extend `SOWData` interface and `aggregateSOWData` |
| `src/components/sow/SOWDocument.tsx` | **Edit** -- Expand Infrastructure section with new subsections and port table |
| `src/integrations/supabase/types.ts` | **Edit** -- Regenerate types |

### Technical Notes

- The port requirements table (Section 5 of the network doc) is standardised across all ThingTrax deployments. It will be rendered as a static reference in the SOW document rather than stored per-project. This ensures accuracy and avoids data entry burden.
- The VNC service endpoints table is also standard and will be included as a static appendix section in the SOW.
- Cable specification guidance (Cat 6 for up to 55m, Cat 7 for up to 100m) will be shown as helper text on the form.
- The bandwidth formula (cameras x 1Gbps = minimum switch uplink) can be auto-calculated and shown as a recommendation based on camera count from the lines data.

