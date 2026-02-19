

## Remove General Requirements Section from Infrastructure Tab

### Why

The 8 binary "Required/Not Required" toggles are now redundant. The detailed Bandwidth & Cabling and IP & Remote Access sections we just added capture the same information with far more precision. Keeping both creates duplication and user confusion.

### What Changes

| File | Action |
|------|--------|
| `SolutionsInfrastructure.tsx` | **Edit** -- Remove the General Requirements card (Section 1) entirely |
| `useTabCompleteness.ts` | **Edit** -- Replace the 8-field check with new completeness criteria |
| `sowService.ts` | **Edit** -- Remove old INFRA_FIELDS validation; update SOW data aggregation |
| `SOWDocument.tsx` | **Edit** -- Remove the old toggle list from the rendered SOW |

### New Completeness Criteria for Infrastructure Tab

Instead of checking that all 8 toggles are set, the Infrastructure tab will turn green when:

1. At least one bandwidth field is filled (internet speed, LAN speed, or switch uplink)
2. Cable specification is selected
3. Customer confirmation checkbox is checked

This reflects the minimum viable network specification a Solutions Consultant should capture.

### SOW Impact

The SOW currently renders a list of "Network Ports: Required", "VLAN: Not Required", etc. This will be removed. The SOW already renders the detailed Bandwidth & Cabling and IP & Remote Access subsections plus the static Port Requirements table, which is more useful for the customer.

### SOW Validation Impact

The `validateSOWReadiness` function currently requires all 8 toggles to be set. This will be replaced with the same new completeness criteria listed above, so existing projects that have the new fields filled will pass validation.

### Technical Detail

**useTabCompleteness.ts** -- new infrastructure check:
```
const infraComplete =
  (project.infra_cable_spec) &&
  (project.infra_internet_speed_mbps || project.infra_lan_speed_gbps || project.infra_switch_uplink_gbps) &&
  project.infra_customer_confirmed;
```

**sowService.ts** -- `validateSOWReadiness` removes the `INFRA_FIELDS` loop and replaces with:
```
if (!project.infra_cable_spec) missing.push('Infrastructure: Cable Specification');
if (!project.infra_customer_confirmed) missing.push('Infrastructure: Customer Confirmation');
```

The 8 database columns (`infra_network_ports`, `infra_vlan`, etc.) will be left in the database for now -- no migration needed. They simply won't be referenced in the UI or logic any longer.
