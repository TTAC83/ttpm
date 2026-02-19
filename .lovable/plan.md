

## SOW Discipline: Draft + Risk Mode

This plan implements all 13 requirements from the superprompt across 3 files, adding document status modes, a risk summary panel, sanitised output, improved executive summary, responsibilities matrix, data ownership clause, draft watermarking, and validation -- all without blocking generation.

---

### Files to Edit

| File | Changes |
|------|---------|
| `src/lib/sowService.ts` | Add `imageRetentionDays` to SOWData interface; update `validateSOWReadiness` to return categorised gaps; add `computeSOWStatus` helper |
| `src/components/sow/SOWDocument.tsx` | Major rewrite: status banner, risk summary panel, sanitised Field component, rewritten executive summary engine, hardened performance envelope, structured acceptance section, responsibilities matrix, data ownership clause, infrastructure cleanup, noise removal, non-blocking validation |
| `src/pages/app/solutions/tabs/SolutionsSOW.tsx` | Status badge in header, draft watermark on PDF export, conditional watermark logic, pass status to SOWDocument |

---

### 1. Document Status Modes

Add a `computeSOWStatus` function in `sowService.ts`:

- **Draft -- Incomplete**: Any mandatory field missing
- **Ready for Signature**: All mandatory fields complete AND feasibility signed off
- **Signed**: Reserved for future digital approval (stored as `sow_status` on `sow_versions`)

Display as a coloured banner at the top of the SOW document:
- Yellow banner for Draft
- Green banner for Ready for Signature
- Blue banner for Signed

### 2. Never Block Generation

Generation is already unblocked (feasibility sign-off required, but validation does not block). The `Field` component will be updated so that when a mandatory field is missing it shows:

**"MISSING -- REQUIRES COMPLETION BEFORE SIGNATURE"** in red beside the field label.

Mandatory fields for Vision/Hybrid:
- Throughput Range, SKU Count, Complexity Tier, Detection Accuracy Target, False Positive Rate, Go-Live Definition, Acceptance Criteria, Signed Off By

Mandatory fields for All:
- Infrastructure cable spec + customer confirmed

### 3. Risk Summary Panel

A new `RiskSummaryPanel` component rendered below the SOW header showing four categories:

| Category | Green | Amber | Red |
|----------|-------|-------|-----|
| Performance Targets | All filled | 1-2 missing | 3+ missing |
| Acceptance Criteria | All filled | Partial | Go-Live or Acceptance missing |
| Infrastructure | All filled | Minor gaps | Cable spec or confirmation missing |
| Sign-Off | Signed off | -- | Not signed off |

Each row shows a coloured dot and description.

### 4. Sanitise Customer-Facing Output

Update the `Field` component:
- Replace "Not provided", "Not configured", "Unknown" with **"Field incomplete"** in red
- Filter out any value matching UUID/GUID pattern (`/^[0-9a-f]{8}-/i`)
- Filter out MAC address patterns
- Never render raw database IDs

### 5. Executive Summary Engine

Rewrite Section 1 to generate a proper paragraph:
- Validate min <= max throughput (swap if inverted)
- Convert `projectGoals` from bullet/numbered list into a flowing sentence
- Strip numbered prefixes like "1.", "2." etc.
- Auto-join goals with commas and "and" for the final item
- Template: "This Statement of Work defines the deployment of a {Type} system at {Site} to monitor {Process} operating between {Min--Max} ppm. The system will {goals joined as sentence} within the defined operational envelope."

### 6. Hardened Performance Envelope

Keep the section always visible for Vision/Hybrid. When fields are missing:
- Each missing field shown in red with "MISSING" label
- Banner at top of section: "Performance commitments cannot be defined until highlighted fields are completed."
- Section is never hidden or removed

### 7. Acceptance and Go-Live Section

Restructure into three sub-blocks:

**Technical Completion:**
- Hardware online
- Network validated
- Data streaming confirmed

**Model Acceptance (Vision):**
- Detection >= {Target} (or red "Field incomplete")
- False Positive <= {Max} (or red "Field incomplete")

**Go-Live:**
- {Definition} (or red "Go-Live definition not defined.")

Add red warning banners when criteria are incomplete.

### 8. Responsibilities Matrix

New section added after Infrastructure. Auto-populated based on deployment type:

| Responsibility | ThingTrax | Customer |
|----------------|-----------|----------|
| Hardware Procurement | X | |
| Network Infrastructure | | X |
| Power Supply to Server Location | | X |
| Camera Installation | X | |
| Software Deployment | X | |
| Network Configuration (VLAN/Firewall) | | X |
| Model Training | X | |
| Production Line Access | | X |
| Ongoing Maintenance | X | |

IoT-only deployments will show a reduced matrix (no camera/model rows). Never left blank.

### 9. Data Ownership and Retention Clause

New permanent section with static contractual text:
- "Customer retains ownership of all production data."
- "ThingTrax may retain anonymised diagnostic data for system improvement."
- "Image retention period: {X days}" -- if undefined, show "Field incomplete" in red
- "Remote access is restricted to support purposes only."

Add `imageRetentionDays` to the `SOWData` interface (sourced from `solutions_projects.sow_image_retention_days` if available, otherwise null).

### 10. Infrastructure Cleanup

- Replace all "Not configured" text with "Required" / "Not Required" / "Field incomplete" (red)
- Boolean fields rendered as "Required" or "Not Required" instead of "Yes"/"No"
- Add static readiness statement: "Installation will not proceed until infrastructure readiness is validated." (already present, will keep)

### 11. Version and Export Control

**PDF watermark logic:**
- If status is "Draft": overlay diagonal "DRAFT -- NOT VALID FOR SIGNATURE" watermark on every page
- If status is "Ready for Signature" with no red fields: clean export, no watermark
- Button label changes: "Export Draft PDF" vs "Export PDF"

Implementation: In `handleExportPDF`, after all pages are written, loop through pages and add semi-transparent rotated watermark text when draft.

### 12. Non-Blocking Validation

Before rendering the SOW document:
- Validate min <= max throughput per line (flag in red if inverted, do not block)
- Validate numeric fields are actually numeric (flag if not)
- All validation results passed as props; rendering continues regardless

### 13. Remove Low-Value Noise

- Skip empty hardware rows (servers/gateways/receivers with no name and no model)
- Skip lines with zero positions and zero equipment
- Remove the "Gate ID" field from Governance (internal)
- Remove `feasibilityGateId` prop usage
- Clean up duplicate section numbering logic

---

### Technical Detail

**sowService.ts changes:**

```typescript
// New status computation
export type SOWStatus = 'draft' | 'ready' | 'signed';

export function computeSOWStatus(data: SOWData): SOWStatus {
  // Check all mandatory fields
  const isVision = data.deploymentType === 'Vision' || data.deploymentType === 'Hybrid';
  const hasPerformance = !isVision || (
    data.skuCount && data.complexityTier &&
    data.detectionAccuracyTarget != null && data.falsePositiveRate != null
  );
  const hasThroughput = !isVision || data.lines.some(l => l.minSpeed > 0 && l.maxSpeed > 0);
  const hasAcceptance = !!data.goLiveDefinition && !!data.acceptanceCriteria;
  const hasInfra = !!data.infraDetail?.cableSpec;
  const hasSignOff = data.feasibilitySignedOff && !!data.feasibilitySignedOffBy;

  if (hasPerformance && hasThroughput && hasAcceptance && hasInfra && hasSignOff) {
    return 'ready';
  }
  return 'draft';
}
```

**SOWDocument.tsx changes:**

- New props: `status: SOWStatus`
- Field component updated to show "Field incomplete" instead of "Not provided" and append "MISSING -- REQUIRES COMPLETION BEFORE SIGNATURE"
- New `RiskSummaryPanel` inline component
- New `ResponsibilitiesMatrix` inline component
- New `DataOwnershipSection` inline component
- Restructured Acceptance section with sub-blocks
- Executive summary rewritten with goal sentence flattening

**SolutionsSOW.tsx changes:**

- Import `computeSOWStatus`
- Compute status from SOW data and pass to SOWDocument
- PDF watermark loop added to `handleExportPDF`
- Button labels reflect status

