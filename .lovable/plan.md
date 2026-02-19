

## SOW Hardening Update

This plan converts the current SOW from a debug-level data dump into a contractual execution document. The DB columns needed (sow_*, infra_*) already exist from a previous migration.

### Overview of Changes

**3 files rewritten, 1 file edited:**

| File | Action |
|------|--------|
| `src/lib/sowService.ts` | Major rewrite: add validation, read new DB fields, strip internal IDs, add executive summary generation |
| `src/components/sow/SOWDocument.tsx` | Full rewrite: new section structure (12 sections), remove all internal fields, add Executive Summary, Performance Envelope, Assumptions, Exclusions, Milestones |
| `src/pages/app/solutions/tabs/SolutionsSOW.tsx` | Major rewrite: add pre-generation validation UI, role-based access (Solutions Architect, Sr Solutions Architect, VP Customer Success), validation blocker panel |
| `src/pages/app/solutions/SolutionsProjectDetail.tsx` | Minor edit: pass additional project fields to SolutionsSOW |

No database migrations needed -- all required columns already exist.

---

### 1. Validation Gate (sowService.ts)

Add a `validateSOWReadiness()` function that checks:

**Vision/Hybrid deployments:**
- `sow_sku_count` is set
- Lines have min_speed AND max_speed > 0
- `sow_complexity_tier` is set (Green/Amber/Red)
- `sow_detection_accuracy_target` is set
- `sow_false_positive_rate` is set
- `sow_go_live_definition` is set

**All deployments:**
- All 8 `infra_*` fields are either "Required" or "Not Required" (no nulls/blanks)
- `sow_acceptance_criteria` is set
- `feasibility_signed_off` = true

Returns a list of missing field names. If any are missing, SOW generation is blocked.

### 2. Strip Internal Fields (sowService.ts)

Remove from SOWData interface and aggregation:
- All `id` fields from hardware, cameras, IoT devices
- `hardwareMasterId` from IoT devices
- `receiverMacAddress` from IoT devices
- `cameraIp` from cameras
- Camera `name` field (which is actually the MAC address)
- `userId` from contacts
- Replace any empty/null string rendering with omission rather than "Not provided"/"Not configured"

### 3. Read Real DB Fields (sowService.ts)

Update `aggregateSOWData()` to read the actual `sow_*` and `infra_*` columns from `solutions_projects` instead of hardcoded "Not configured" stubs:
- `sow_sku_count`, `sow_complexity_tier`, `sow_detection_accuracy_target`, `sow_false_positive_rate`
- `sow_go_live_definition`, `sow_acceptance_criteria`
- `sow_stability_period`, `sow_hypercare_window`
- `sow_initial_training_cycle`, `sow_validation_period`, `sow_retraining_exclusions`
- `sow_product_presentation_assumptions`, `sow_environmental_stability_assumptions`
- All 8 `infra_*` fields

### 4. Executive Summary (SOWDocument.tsx)

New Section 1: Auto-generated narrative paragraph:

> "This Statement of Work defines the scope for a {deploymentType} deployment at {customerLegalName}, {siteAddress}. The deployment covers {lineCount} production line(s) operating at {minSpeed}-{maxSpeed} ppm, with {cameraCount} vision inspection point(s) across {useCaseList}. The intended outcome is: {projectGoals}."

### 5. New SOW Document Sections (SOWDocument.tsx)

Restructured section numbering:

1. Executive Summary (new, auto-generated)
2. Deployment Overview (existing, cleaned)
3. Inspection and Monitoring Scope (existing, cleaned -- no MACs, IPs, internal IDs)
4. Hardware Architecture (existing, cleaned -- no IDs)
5. Operational Performance Envelope (new)
6. Infrastructure Requirements (redesigned -- Required/Not Required only)
7. Model Training Scope (vision only, reads real DB fields)
8. Acceptance and Go-Live Criteria (new, reads real DB fields)
9. Assumptions (new, auto-generated)
10. Exclusions (new, auto-generated)
11. Delivery Milestones (new, indicative sequence)
12. Governance and Version Control (existing)

### 6. Operational Performance Envelope (Section 5)

Display: throughput range, SKU count, complexity tier, product presentation assumptions, environmental stability assumptions. Add contractual clause: "Performance commitments apply only within the defined operational envelope."

### 7. Infrastructure Redesign (Section 6)

Each of the 8 infra fields displays as "Required" or "Not Required". Add clause: "Installation will not proceed until infrastructure readiness is validated."

### 8. Model Training Scope (Section 7)

Read from DB: SKU count, initial training cycle, validation period, retraining exclusions.

### 9. Assumptions Section (Section 9)

Auto-generated list:
- Stable and consistent lighting conditions
- Stable camera mounting and positioning
- Consistent product presentation and orientation
- Accurate ERP inputs (if ERP integration applicable)
- Plus any custom assumptions from `sow_product_presentation_assumptions` and `sow_environmental_stability_assumptions`

### 10. Exclusions Section (Section 10)

Auto-generated:
- New SKU onboarding beyond the defined count
- Additional inspection types not specified in this SOW
- Mechanical redesign of mounting or conveyor systems
- Environmental changes affecting lighting or product presentation
- ERP system expansion or reconfiguration

### 11. Delivery Milestones (Section 11)

Indicative sequence (no dates):
1. Portal Provision
2. Hardware Dispatch
3. Installation
4. Model Training
5. Go-Live Target

### 12. Role-Based Permissions (SolutionsSOW.tsx)

Replace the current `profile?.is_internal === true` check with a role whitelist:
- Solutions Consultant (existing `solutions_consultant` field)
- Senior Solutions Architect (via profile role)
- VP Customer Success (existing `vp_customer_success` field)

The check will verify that the current user's profile role matches one of: `solutions_consultant`, `senior_solutions_architect`, `vp_customer_success`, OR that they are an `internal_admin`.

### 13. Validation UI (SolutionsSOW.tsx)

When validation fails, display a card listing all missing fields with the message: "SOW cannot be generated until all mandatory feasibility and performance fields are complete." The Generate button remains disabled.

### 14. PDF Export Update (SolutionsSOW.tsx)

The PDF export logic will be updated to match the new section structure, removing internal fields and including all new sections.

