

## Updated Multi-Sheet Excel Import/Export — Including Vision Projects

### What was missing
The previous plan exported Vision Project **name** on Sheet 2 as a reference column, but did not export or import the Vision Projects themselves. If a user imports on a fresh project (or adds new vision projects via Excel), those references would fail to resolve.

### Updated Sheet Structure (4 Sheets)

**Sheet 1: Products** — one row per product
| Product Code* | Product Name* | Factory | Group | Line | Attributes | Comments |

**Sheet 2: Vision Projects** — one row per vision project (NEW)
| Vision Project Name* | Description | Attributes |

- Attributes = comma-separated master attribute names linked via `vision_project_attributes`
- On import: upsert by name within the solutions project; sync `vision_project_attributes`

**Sheet 3: Views** — one row per view
| Product Code* | View Name* | Vision Project | Positions | Equipment |

- Vision Project = name from Sheet 2 (resolved to ID on import)
- Positions/Equipment = comma-separated names

**Sheet 4: View Attributes** — one row per attribute per view
| Product Code* | View Name* | Attribute Name* | Set/Variable | Value |

### Import behaviour for Vision Projects
- Match by name (case-insensitive) within the solutions project
- If exists: offer update (description, attributes) via the conflict review dialog
- If new: create the vision project and link its attributes
- If a View references a Vision Project name not on Sheet 2 AND not in the DB: flag as validation error

### Export behaviour
- Sheet 2 populated from `vision_projects` + `vision_project_attributes` → `project_attributes` → `master_attributes` for attribute names

### Conflict review
Vision projects follow the same accept/reject pattern as products and views — the review dialog gains a "Vision Projects" section.

### Files

| File | Change |
|------|--------|
| `src/lib/productBulkService.ts` | New — export/import logic for all 4 sheets |
| `src/components/products/ProductImportReviewDialog.tsx` | New — conflict review dialog with sections for Products, Vision Projects, Views, View Attributes |
| `src/pages/app/solutions/tabs/SolutionsProducts.tsx` | Add Export/Import buttons, file input, wire dialogs |

### Mitigations (carried forward + new)
- Orphan detection across all sheets (Sheet 3 refs Sheet 1 & 2; Sheet 4 refs Sheet 3)
- Data validation dropdowns in exported Excel (Product Code, Vision Project Name)
- Case-insensitive name matching for all resolutions
- Duplicate name detection per sheet
- Dry-run summary before applying
- Vision Project attribute names validated against project's `project_attributes`

