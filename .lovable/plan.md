

## Add Customer Price Column to Solutions Hardware Summary

### Overview

Add an editable "Customer Price" column to the Solutions Hardware Summary table. This field represents the price the customer pays and can only be edited by the salesperson assigned to the project.

### Database Changes

Create a new table `solutions_hardware_customer_prices` to store per-item customer-facing prices, following the same pattern as `project_hardware_prices` used in implementation projects.

```text
solutions_hardware_customer_prices
--------------------------------------
id                  UUID (PK, default gen_random_uuid())
solutions_project_id UUID (FK -> solutions_projects.id, NOT NULL)
hardware_master_id   UUID (FK -> hardware_master.id, NOT NULL)
customer_price_gbp   NUMERIC (NOT NULL)
updated_by           UUID (FK -> auth.users.id)
created_at           TIMESTAMPTZ (default now())
updated_at           TIMESTAMPTZ (default now())
UNIQUE (solutions_project_id, hardware_master_id)
```

RLS policies:
- SELECT: internal users can read all rows
- INSERT/UPDATE: only if the current user is the salesperson on the solutions project

### Code Changes

**1. `src/hooks/useHardwareSummary.tsx`**
- Add `customer_price` field to the `HardwareItem` interface
- After building the hardware list, fetch customer prices from `solutions_hardware_customer_prices` for all hardware_master_ids in this project
- Merge customer prices into each hardware item

**2. `src/pages/app/solutions/tabs/SolutionsHardwareSummary.tsx`**
- Accept a new prop `salespersonId` (the project's salesperson UUID)
- Use `useAuth()` to check if the current user is the salesperson
- Add a "Customer Price (GBP)" column header and a "Total Customer Price" in the header summary
- For each row:
  - If the user IS the salesperson: show an inline-editable price field (click to edit, same pattern as `ProjectHardwareSummary`)
  - If the user is NOT the salesperson: show the customer price as read-only text
- Upsert changes to `solutions_hardware_customer_prices` on save

**3. `src/pages/app/solutions/SolutionsProjectDetail.tsx`**
- Pass `salespersonId={project.salesperson}` to the `SolutionsHardwareSummary` component

### Section Order in Table

| Type | Source | Line/Equipment | SKU/Model | Manufacturer | Description | Price (GBP) | RRP (GBP) | **Customer Price (GBP)** |

### Access Control

- Only the salesperson assigned to the solutions project can edit customer prices
- All other internal users see customer prices as read-only
- The salesperson check uses `useAuth().user.id === salespersonId` on the client, enforced by RLS on the server

