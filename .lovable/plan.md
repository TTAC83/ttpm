

## Add Hardware Summary Completeness Indicator

### What changes

Add a red/green dot to the "Hardware Summary" tab trigger under the Sale & Launch Gate. The dot turns green when every hardware row has a customer price set, red otherwise.

### Technical details

**File 1: `src/pages/app/solutions/hooks/useTabCompleteness.ts`**

- Add `hardwareSummary: boolean` to the `TabCompleteness` interface and initialize as `false`
- In the `checkAsync` function, after the existing hardware queries, add a check: fetch all hardware items for the project (reusing the same data the `useHardwareSummary` hook would produce) and check that every item with a `hardware_master_id` has a corresponding entry in `solutions_hardware_customer_prices`. A simpler approach: query `solutions_hardware_customer_prices` for this project, count the entries, and compare against the count of distinct `hardware_master_id` values across line hardware (cameras, IoT devices, accessories) and direct hardware (`project_iot_requirements`). If all master IDs have a customer price row, mark complete.
- Specifically:
  1. Collect all `hardware_master_id` values from cameras (via `hardware_master` lookup), camera accessories (light, PLC, HMI), IoT devices, and direct requirements — the same sources `useHardwareSummary` uses
  2. Query `solutions_hardware_customer_prices` for this project to get the set of master IDs that have prices
  3. Set `hardwareSummary = true` only if every collected master ID has a matching customer price entry, and there is at least one hardware item

**File 2: `src/pages/app/solutions/SolutionsProjectDetail.tsx`**

- On the Hardware Summary `TabsTrigger` (line 352), append the dot indicator:
  ```tsx
  <TabsTrigger value="hardware-summary">
    Hardware Summary
    <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${completeness.hardwareSummary ? 'bg-green-500' : 'bg-red-500'}`} />
  </TabsTrigger>
  ```

No new files. No database changes. No new dependencies.

