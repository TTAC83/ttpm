# Hardware Catalog System - Critical Usage Guide

## ⚠️ CRITICAL: Single Source of Truth

**ALL hardware data MUST come from the `hardware_master` table.**

The following tables are **DEPRECATED** and should **NEVER** be used in application code:
- `cameras_master` ❌ DEPRECATED
- `plc_master` ❌ DEPRECATED  
- `lights` ❌ DEPRECATED

## Why This Matters

Previously, the application had separate tables for different hardware types, leading to:
- Data inconsistency
- Duplication
- Maintenance nightmares
- Bugs when switching between old and new data sources

## How to Access Hardware Data

### ✅ CORRECT: Use the Hardware Catalog Service

```typescript
import { hardwareCatalog } from "@/lib/hardwareCatalogService";

// Get cameras
const cameras = await hardwareCatalog.getCameras();

// Get lights
const lights = await hardwareCatalog.getLights();

// Get PLCs
const plcs = await hardwareCatalog.getPlcs();
```

### ❌ WRONG: Direct Supabase Queries to Old Tables

```typescript
// NEVER DO THIS:
const { data } = await supabase.from('cameras_master').select('*');
const { data } = await supabase.from('plc_master').select('*');
const { data } = await supabase.from('lights').select('*');
```

### ✅ CORRECT: Direct Supabase Queries to hardware_master

```typescript
// If you need to query hardware_master directly:
const { data } = await supabase
  .from('hardware_master')
  .select('*')
  .eq('hardware_type', 'Camera');
```

## Hardware Master Table Structure

The `hardware_master` table uses a `hardware_type` column to differentiate hardware:

```sql
hardware_master (
  id: uuid,
  hardware_type: text,  -- 'Camera', 'Light', 'PLC', 'HMI', etc.
  sku_no: text,         -- Maps to model_number in old tables
  product_name: text,   -- Maps to manufacturer in old tables
  description: text,    -- Maps to camera_type/plc_type in old tables
  price_gbp: numeric,
  minimum_quantity: integer,
  required_optional: text,
  tags: text,
  comments: text
)
```

## Field Mapping

When working with hardware data, fields are mapped as follows:

| hardwareCatalog     | hardware_master | Old Tables (cameras_master/plc_master/lights) |
|---------------------|-----------------|-----------------------------------------------|
| manufacturer        | product_name    | manufacturer                                  |
| model_number        | sku_no          | model_number                                  |
| camera_type/plc_type| description     | camera_type/plc_type/description              |

## Admin Pages

Admin pages for managing hardware have been migrated to use `hardware_master`:

- **Hardware Management** (`/app/admin/hardware`) - Unified catalog for ALL hardware types
- ~~Cameras Management~~ - **REMOVED** (use Hardware Management)
- ~~PLC Management~~ - **REMOVED** (use Hardware Management)  
- ~~Lights Management~~ - **REMOVED** (use Hardware Management)

## For Developers

### When Adding New Features

1. **ALWAYS** use `hardwareCatalog` service for cameras, lights, and PLCs
2. **NEVER** import from old master tables
3. If you need to add a new hardware type, extend the `hardware_master` table with a new `hardware_type` value

### Code Review Checklist

Before merging any PR, verify:
- [ ] No queries to `cameras_master`, `plc_master`, or `lights` tables
- [ ] All hardware queries use `hardwareCatalog` service or `hardware_master` table
- [ ] Admin pages only manage `hardware_master` table

### Testing

When testing hardware-related features:
1. Ensure data exists in `hardware_master` with correct `hardware_type`
2. Verify old tables (`cameras_master`, `plc_master`, `lights`) are NOT being queried
3. Check browser network tab for queries - should only see `hardware_master`

## Migration Status

✅ **Completed:**
- Created unified `hardwareCatalogService.ts`
- Migrated Line Builder (`LineVisualization.tsx`, `DeviceAssignment.tsx`)
- Migrated admin pages to use `hardware_master`
- Added guard comments in critical files

🔄 **Pending:**
- Data migration from old tables to `hardware_master` (if needed)
- Database-level deprecation of old tables (remove/rename)

## Emergency Rollback

If issues arise, do NOT revert to old tables. Instead:
1. Check data exists in `hardware_master` with correct `hardware_type`
2. Verify field mappings are correct in `hardwareCatalogService.ts`
3. Check console for errors in data transformation

## Questions?

If you're unsure whether to use the hardware catalog service:
- **Does it involve cameras, lights, or PLCs?** → Use `hardwareCatalog`
- **Is it a new hardware type?** → Add to `hardware_master` with new `hardware_type`
- **Admin interface for hardware?** → Use HardwareManagement page

---

**Last Updated:** 2025  
**Maintained By:** Development Team  
**Critical Priority:** HIGH - Do not bypass this system
