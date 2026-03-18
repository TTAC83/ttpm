

## Products & Vision Projects System — Updated Plan

### Key Update from Previous Plan
Vision Projects now have a selectable list of attributes drawn from the project's linked attributes (from `project_attributes`). When a product view selects a vision project, it inherits that vision project's attributes for value entry.

### Database Schema

**`vision_projects`** — vision project groupings
- `id` (uuid PK), `solutions_project_id` (FK), `name`, `description`, `created_at`, `updated_at`

**`vision_project_attributes`** (NEW) — attributes assigned to a vision project, selected from project_attributes
- `id` (uuid PK)
- `vision_project_id` (FK → vision_projects)
- `project_attribute_id` (FK → project_attributes)
- unique(vision_project_id, project_attribute_id)

**`products`** — product catalog
- `id` (uuid PK), `solutions_project_id` (FK), `product_code`, `product_name`, `master_artwork_url`, `comments`, `created_at`, `updated_at`

**`product_factory_links`**, **`product_group_links`**, **`product_line_links`** — multi-select junction tables

**`product_views`** — views per product
- `id` (uuid PK), `product_id` (FK), `view_name`, `view_image_url`, `vision_project_id` (FK, nullable), `created_at`, `updated_at`

**`product_view_attributes`** — attribute values per view (attributes come from the selected vision project's attribute list)
- `id` (uuid PK), `product_view_id` (FK), `master_attribute_id` (FK), `value` (text)

**`product_view_positions`**, **`product_view_equipment`** — position/equipment links per view

RLS: `is_internal()` for full CRUD; company members get SELECT via join to `solutions_projects`.

### UI Components

**1. Vision Projects Tab** (`SolutionsVisionProjects.tsx`)
- CRUD table: Name, Description, Attributes count, Product Views count
- Add/Edit dialog with name + description
- **Attributes section**: Multi-select combobox to pick from project-level attributes (from `project_attributes` joined with `master_attributes`). Stored in `vision_project_attributes`.
- Delete with confirmation

**2. Products Tab** (`SolutionsProducts.tsx`)
- Table: Product Code, Product Name, Factory/Group/Lines badges, Artwork thumbnail, Views count, Comments
- Add/Edit product dialog with multi-select factory→group→lines cascade, artwork URL, comments

**3. Product Views Panel** (`ProductViewsPanel.tsx`)
- Per-product sub-panel for managing views
- Each view: View Name, Image, Vision Project dropdown
- When a vision project is selected, the view's attribute list auto-populates from `vision_project_attributes` — user enters values per attribute
- Position + Equipment multi-selects filtered by product's lines

### Flow
```text
Project Attributes (Feasibility Gate)
  ↓ select from
Vision Project Attributes (vision_project_attributes)
  ↓ inherited by
Product View Attributes (product_view_attributes) ← user enters values
```

### Files to Create
| File | Purpose |
|------|---------|
| `src/pages/app/solutions/tabs/SolutionsVisionProjects.tsx` | Vision Projects CRUD + attribute selection |
| `src/pages/app/solutions/tabs/SolutionsProducts.tsx` | Products management tab |
| `src/components/products/ProductDialog.tsx` | Add/Edit product |
| `src/components/products/ProductViewDialog.tsx` | Add/Edit product view |
| `src/components/products/ProductViewsPanel.tsx` | Views sub-panel |
| Migration SQL | All new tables + RLS |

### Files to Modify
| File | Change |
|------|---------|
| `SolutionsProjectDetail.tsx` | Add Products + Vision Projects tabs in Readiness Gate row (Vision/Hybrid only) |

### Implementation Order
1. Database migration (all tables + RLS)
2. Vision Projects tab with attribute selection from project_attributes
3. Products tab with factory/group/line multi-selects
4. Product Views sub-panel with vision project linking + attribute value entry
5. Wire tabs into SolutionsProjectDetail

