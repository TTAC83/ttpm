

## Reorder Solutions Project Tabs and Add Completeness Indicators

### What Will Change

**1. Tab Reordering (Row 1)**

The first row of tabs will be reordered to:
- Customer Overview | Contacts | Factory | Lines | Hardware Summary

All remaining tabs stay in subsequent rows in their current order.

**2. Visual Completeness Indicators on Each Tab**

Each of the five Row 1 tabs will display a small colored dot (green or red) next to the tab label, indicating whether the data in that tab is complete or has missing fields.

Completeness rules per tab:
- **Customer Overview**: Green if `name`, `domain`, `site_name`, and `site_address` are all populated
- **Contacts**: Green if at least one contact is linked to the project (query `contact_solutions_projects`)
- **Factory**: Green if factory configuration record exists with key fields populated (`website_url`, `job_scheduling`)
- **Lines**: Green if at least one line exists for the project (query `solutions_lines`)
- **Hardware Summary**: Green if hardware quantity fields are populated (`servers_required`, `gateways_required`, etc., with at least one > 0)

### Technical Details

**File to modify:**
- `src/pages/app/solutions/SolutionsProjectDetail.tsx`

**Changes:**
1. Reorder the `TabsTrigger` elements in Row 1 to: `overview`, `contacts`, `factory`, `lines`, `hardware-summary`
2. Move other tabs (`contract`, `team`, `account`) to Row 2 alongside the existing Row 2 tabs
3. Add a `useEffect` that runs completeness checks against the project data and Supabase queries for contacts, factory config, and lines
4. Store completeness state as a record like `{ overview: boolean, contacts: boolean, factory: boolean, lines: boolean, hardwareSummary: boolean }`
5. Render a small circle indicator (green/red) inside each Row 1 `TabsTrigger` using a `span` with conditional Tailwind classes (`bg-green-500` / `bg-red-500`, `h-2 w-2 rounded-full inline-block ml-1.5`)

**Data fetching for indicators:**
- Overview completeness: derived from `project` state already loaded (no extra query)
- Contacts: `supabase.from('contact_solutions_projects').select('id', { count: 'exact', head: true }).eq('solutions_project_id', id)`
- Factory: `supabase.from('solutions_factory_config').select('*').eq('solutions_project_id', id).maybeSingle()` (or equivalent table)
- Lines: `supabase.from('solutions_lines').select('id', { count: 'exact', head: true }).eq('solutions_project_id', id)`
- Hardware Summary: derived from `project` state (check if any of `servers_required`, `gateways_required`, `tv_display_devices_required`, `receivers_required`, `lines_required` is > 0)

All queries run once on mount (alongside `fetchProject`) and results are stored in a `tabCompleteness` state object.

