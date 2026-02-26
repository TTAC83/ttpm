

## Portal Config Checklist — Plan

### Overview

Add a checklist-based "Portal Config" tab with 15 predefined steps. Each step can be toggled complete/incomplete, is auto-assigned to the project's Implementation Lead (but changeable), and records who completed it and when. A green indicator appears on the tab when all 15 steps are done.

### Database Changes

**New table: `portal_config_tasks`**

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | default gen_random_uuid() |
| solutions_project_id | uuid FK → solutions_projects.id | NOT NULL, ON DELETE CASCADE |
| task_key | text NOT NULL | e.g. `portal_creation`, `initial_user_access`, etc. |
| is_complete | boolean | default false |
| assigned_to | uuid FK → profiles.user_id | nullable, auto-filled with implementation_lead |
| completed_by | uuid | nullable, set when marked complete |
| completed_at | timestamptz | nullable, set when marked complete |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |
| UNIQUE(solutions_project_id, task_key) | | prevents duplicates |

RLS: internal users full access (matching existing patterns).

A trigger or the application will seed all 15 rows when the tab is first accessed (if none exist yet), assigning them to the project's `implementation_lead`.

The 15 task keys:
1. `portal_creation`
2. `initial_user_access`
3. `factory`
4. `shifts`
5. `groups`
6. `lines`
7. `positions`
8. `equipments`
9. `downtime_categories`
10. `downtime_reasons`
11. `rejection_reasons`
12. `crews`
13. `crew_rota`
14. `vision_projects`
15. `initial_daily_report`

### Frontend Changes

**New component: `src/pages/app/solutions/tabs/SolutionsPortalConfig.tsx`**

- Accepts `projectId` and `implementationLeadId` props
- On mount, queries `portal_config_tasks` for this project
- If no rows exist, seeds all 15 with `assigned_to = implementationLeadId`
- Renders a card with a table/list of all 15 tasks showing:
  - Checkbox (toggle complete/incomplete)
  - Task name (human-readable label)
  - Assigned to (dropdown of internal users, changeable)
  - Completed by (name) and completed at (date) — shown when complete
- On checkbox toggle:
  - If checking: sets `is_complete = true`, `completed_by = current user`, `completed_at = now()`
  - If unchecking: sets `is_complete = false`, `completed_by = null`, `completed_at = null`
- On assignee change: updates `assigned_to`

**`src/pages/app/solutions/SolutionsProjectDetail.tsx`**

- Import and render `SolutionsPortalConfig` inside the `portal-config` TabsContent (replacing placeholder)
- Add completeness dot to the Portal Config TabsTrigger:
  ```tsx
  <TabsTrigger value="portal-config">
    Portal Config
    <span className={`h-2 w-2 rounded-full inline-block ml-1.5 ${completeness.portalConfig ? 'bg-green-500' : 'bg-red-500'}`} />
  </TabsTrigger>
  ```

**`src/pages/app/solutions/hooks/useTabCompleteness.ts`**

- Add `portalConfig: boolean` to the interface and initial state
- In `checkAsync`, query `portal_config_tasks` for this project, check that rows exist and all have `is_complete = true`
- Include `portalConfig` in the final `setCompleteness` call

### Technical Notes

- The seed-on-first-access pattern avoids needing a migration to backfill existing projects
- The `updated_at` trigger (`set_timestamp_updated_at`) will be attached to the new table
- Task keys are fixed strings — the display labels are mapped in the frontend component

