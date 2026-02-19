

## SOW Professional Hardening (Scale-Up SaaS v1)

This plan transforms the SOW from an engineering-oriented document into a professional, customer-acceptable SaaS implementation document that protects against variance and scope creep.

---

### Files to Edit

| File | Summary |
|------|---------|
| `src/components/sow/SOWDocument.tsx` | Major restructure: remove engineering noise, add Deliverables section, add Post-Go-Live Support clause, clean presentation, update Responsibilities Matrix, improve executive summary, restructure acceptance section |
| `src/pages/app/solutions/tabs/SolutionsSOW.tsx` | Update PDF export to match new section structure, remove engineering detail from PDF |
| `src/lib/sowService.ts` | Minor: no structural changes needed, service already supports all required fields |

---

### Changes by Requirement

**1. Remove Engineering Noise from Customer-Facing SOW**

In the Inspection and Monitoring Scope section (lines 345-395 of SOWDocument.tsx), remove:
- H-FOV field
- Working Distance field
- Placement position description
- Relay outputs list
- HMI model details
- PLC model details
- Light model details
- Camera view description
- Attributes list

Keep visible per camera:
- Camera type (model)
- Use cases
- Lighting required (Yes/No)
- PLC integration (Yes/No)

Keep visible per IoT device:
- Device name
- Hardware model name

Remove the "Speed inverted" badge from line headers -- speed is auto-corrected silently. Remove the speed validation warning banner entirely (requirement 4: do not display internal validation messages).

**2. Clean Executive Summary Generation**

Update `buildExecutiveSummary()` to:
- Silently normalise min/max order (already done, just remove the external warning)
- Improve the template to: "This Statement of Work defines the deployment of a {Type} system at {Customer}, {Site} to monitor {Process} operating within a throughput range of {Min}--{Max} ppm. The deployment encompasses {N} vision inspection point(s) covering {use cases}. The system will {transformed goals} within the defined operational performance envelope."
- Ensure use case list uses "and" before last item instead of comma

**3. Add Deliverables Section**

Insert new section after Deployment Overview (section 3, shifting subsequent sections). Content:

"ThingTrax will deliver:"
- Configured cloud portal instance
- Supplied hardware as defined in this SOW
- Initial configuration and system commissioning
- Superuser training sessions
- Initial model training for defined SKU count (Vision/Hybrid only)
- Go-live support window (14 days unless otherwise specified)

**4. Strengthen Operational Performance Envelope**

Update the boundary clause text to the full version:
"Performance commitments apply only within the defined operational envelope. Operation outside the defined throughput range, SKU count, environmental stability, or product presentation conditions may require retraining or scope reassessment."

Keep red highlights for missing fields. Keep the "cannot be defined" banner for draft mode. Do not show internal validation warnings.

**5. Tighten Acceptance and Go-Live Structure**

Restructure the existing section into three clearly labelled sub-blocks:

- **Technical Completion**: "System considered technically complete when:" followed by bullet list (Hardware online, Network validated, Data streaming confirmed)
- **Model Acceptance** (Vision only): Detection Accuracy >= {Target}, False Positive Rate <= {Max}, "Stable operation for {stabilityPeriod} consecutive production hours"
- **Operational Go-Live**: "Go-Live occurs upon:" followed by bullets (Successful completion of stability window, Customer operational sign-off)

Keep red warnings for missing fields.

**6. Align Responsibilities Matrix**

Update the matrix rows to reflect actual operating model:
- Add "Physical Fabrication & Camera Mounting" as Customer responsibility
- Change "Camera Installation & Alignment" to clarify ThingTrax handles configuration, Customer handles physical mounting
- Ensure "Sample Product Provision" is present for Vision
- Remove any inconsistencies

Updated matrix:

| Responsibility | ThingTrax | Customer |
|---|---|---|
| Hardware Supply | X | |
| Physical Fabrication and Mounting | | X |
| Network Infrastructure (VLAN, Switching, Cabling) | | X |
| Power Supply to Server Location | | X |
| Software Deployment and Configuration | X | |
| Network Configuration (VLAN/Firewall Rules) | | X |
| Production Line Access for Installation | | X |
| Ongoing Platform Maintenance | X | |
| Camera Configuration and Alignment (Vision) | X | |
| Vision Model Training and Validation (Vision) | X | |
| Sample Product Provision for Training (Vision) | | X |
| IoT Device Installation | X | |

**7. Add Post-Go-Live Support Boundary**

Add a new section after Acceptance and Go-Live:

"Post Go-Live support is provided under standard SaaS support terms. Additional retraining, new SKU onboarding, environmental changes, or scope expansion are subject to formal change control."

This can be appended to the existing Exclusions section or as a standalone clause after it.

**8. Clean Infrastructure Section**

Already mostly done. Changes:
- Ensure no "Not configured" text appears (already handled by sanitise function)
- Keep port table, VLAN requirement, bandwidth fields
- Remove the `infraDetail.notes` section from customer-facing output (internal engineering detail)
- Keep the readiness statement

**9. Improve Professional Presentation**

- Remove stray numbering artifacts
- Ensure no empty hardware blocks render
- Clean spacing throughout
- Ensure proper capitalisation in section titles
- Remove the speed "inverted" badge (internal debug)

**10. Signature Readiness Logic**

Already implemented. No changes needed -- status modes (Draft/Ready/Signed) and watermark logic are in place.

**11. Maintain Governance Traceability**

Keep: SOW ID, Version, Signed Off By, Signed Off Timestamp, Generation Timestamp.
Remove: internal change logs (not currently shown in customer view, so no change needed).

---

### Technical Detail

**SOWDocument.tsx -- Section order after changes:**

1. Executive Summary (cleaned)
2. Deployment Overview (unchanged)
3. Deliverables (NEW)
4. Inspection and Monitoring Scope (stripped of engineering noise)
5. Hardware Architecture (unchanged, empty rows filtered)
6. Operational Performance Envelope (Vision -- strengthened clause)
7. Infrastructure Requirements (cleaned, notes removed)
8. Responsibilities Matrix (updated rows)
9. Model Training Scope (Vision only, unchanged)
10. Acceptance and Go-Live Criteria (restructured into 3 sub-blocks)
11. Data Ownership and Retention (unchanged)
12. Post-Go-Live Support (NEW)
13. Assumptions (unchanged)
14. Exclusions (unchanged)
15. Delivery Milestones (unchanged)
16. Governance and Version Control (unchanged)

**SolutionsSOW.tsx -- PDF export changes:**

Update `handleExportPDF` to:
- Remove H-FOV, Working Distance, Placement, Relay Outputs, HMI, Attributes from camera detail in PDF
- Add Deliverables section to PDF
- Add Post-Go-Live Support clause to PDF
- Update Responsibilities Matrix rows to match new structure
- Keep watermark logic as-is (already working)

