

## Add Infrastructure Tab to Feasibility Gate

Move all 8 infrastructure requirement fields into a new dedicated "Infrastructure" tab within the Feasibility Gate row, with completeness tracking and Feasibility Gate integration.

### What Changes

| File | Action |
|------|--------|
| `src/pages/app/solutions/tabs/SolutionsInfrastructure.tsx` | **New** -- Form with 8 infrastructure selects (Required / Not Required), auto-saves on change |
| `src/pages/app/solutions/SolutionsProjectDetail.tsx` | **Edit** -- Add "Infrastructure" tab trigger + content in Feasibility Gate row, pass data, include completeness dot |
| `src/pages/app/solutions/hooks/useTabCompleteness.ts` | **Edit** -- Add `infrastructure: boolean` to completeness, check all 8 `infra_*` fields are set |
| `src/components/FeasibilityGateDialog.tsx` | **Edit** -- Accept and display `infrastructure` in the gaps panel; include in `allTabsGreen` requirement |

### Infrastructure Tab Form

The new `SolutionsInfrastructure.tsx` component will display 8 fields, each as a select dropdown with three states:

- **Blank** (unset) -- default, blocks completeness
- **Required**
- **Not Required**

Fields:
1. Network Ports (`infra_network_ports`)
2. VLAN (`infra_vlan`)
3. Static IP (`infra_static_ip`)
4. 10Gb Connection (`infra_10gb_connection`)
5. Mount Fabrication (`infra_mount_fabrication`)
6. VPN (`infra_vpn`)
7. Storage (`infra_storage`)
8. Load Balancer (`infra_load_balancer`)

Each field auto-saves to `solutions_projects` on selection change (matching the existing OverviewTab pattern).

### Completeness Logic

A green dot requires **all 8** `infra_*` fields to be either "Required" or "Not Required" (no nulls/blanks). This check is added to `useTabCompleteness`.

### Feasibility Gate Integration

- The `allTabsGreen` calculation in `SolutionsProjectDetail.tsx` will be updated to include `completeness.infrastructure`.
- The Feasibility Gate dialog's gaps panel will show "Infrastructure requirements incomplete" when the infrastructure tab is not green.
- The completeness prop passed to `FeasibilityGateDialog` will include `infrastructure`.

### Tab Placement

The "Infrastructure" tab trigger will appear in Feasibility Gate row 1, after "Lines" and before "Factory Hardware", with a red/green completeness dot.

### Technical Details

- The form reads initial values from `project` data already fetched by `SolutionsProjectDetail` (the `infra_*` columns are on `solutions_projects`).
- On select change, a targeted `.update({ [field]: value })` is performed against Supabase.
- The `SolutionsProject` interface in `SolutionsProjectDetail.tsx` will be extended with the 8 `infra_*` fields.
- No database migrations needed -- all columns already exist.
