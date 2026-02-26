

## Add Team Completeness Indicator

### What changes

Add a red/green dot to the "Team" tab trigger under the Sale & Launch Gate, matching the existing indicator pattern on Feasibility Gate tabs. The dot turns green when **all** team roles have someone assigned, red otherwise.

### Technical details

**File 1: `src/pages/app/solutions/hooks/useTabCompleteness.ts`**

- Add `team: boolean` to the `TabCompleteness` interface
- Initialize it as `false`
- Compute team completeness synchronously from the project data: check that all 12 role fields (`salesperson`, `solutions_consultant`, `customer_lead`, `implementation_lead`, `account_manager`, `sales_lead`, `ai_iot_engineer`, `technical_project_lead`, `project_coordinator`, `tech_lead`, `tech_sponsor`, `vp_customer_success`) are non-null
- Set `completeness.team` in the same `setCompleteness` call as the other synchronous checks

**File 2: `src/pages/app/solutions/SolutionsProjectDetail.tsx`**

- On the Team `TabsTrigger` (currently line 355), append the same dot indicator used by the other tabs:
  ```tsx
  <TabsTrigger value="team">
    Team
    <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${completeness.team ? 'bg-green-500' : 'bg-red-500'}`} />
  </TabsTrigger>
  ```

No new files. No database changes. No new dependencies.

