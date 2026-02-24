

## Create Grupo Bimbo Solutions Consulting Project

### What We'll Do

Insert a new Solutions project pre-filled with data from the existing Grupo Bimbo implementation project, so you have a realistic test project in the Solutions pipeline.

### Data Mapping

The following fields from the implementation project will be carried over:

| Field | Value |
|-------|-------|
| Company | Grupo Bimbo (existing company record `e3f3c364-e305-468f-be84-f416d26855e2`) |
| Domain | Vision |
| Site Name | Grupo Bimbo |
| Site Address | Twenty Business Estate, Units 1-7 Saint Laurence Ave Twenty, Maidstone, ME16 0LL |
| Salesperson | Same user (`68034b82-463b-46f2-befb-df6824737e17`) |
| Solutions Consultant | Same user (`e526fa27-96f2-4e2b-a538-b234eced2056`) |
| Customer Lead | (from project_goals context) |
| Potential Contract Start Date | 2026-03-01 (set to a near-future date for testing) |

### Technical Steps

1. **Database Migration** -- Insert a single row into `solutions_projects` using the Grupo Bimbo company ID and mapped fields from the implementation project. No new tables or schema changes needed.

2. **No code changes required** -- The existing Solutions UI will pick up the new project automatically.

