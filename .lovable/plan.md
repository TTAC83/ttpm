

## Add Capex Field to Contract Information Tab

### Database Migration
Add two columns to `solutions_projects` table:
- `capex` boolean DEFAULT false
- `capex_fee` numeric DEFAULT null

### Frontend Changes — `src/components/shared/ContractInformationTab.tsx`

**Form state** — add `capex` (boolean) and `capex_fee` (string) to `formData`, initialized from `data`.

**Edit mode:**
1. Add a Capex switch (similar to Break Clause pattern) between the fees grid and the Standard Terms section
2. When Capex is ON:
   - Grey out / disable the Hardware Fee input
   - Show a new "Capex Fee (£)" number input
3. When Capex is OFF:
   - Hardware Fee behaves normally
   - Capex Fee is hidden

**Save handler:**
- Include `capex` and `capex_fee` in the update payload
- When `capex` is true, set `hardware_fee` to null (or keep existing — user preference, but greyed out means not editable)
- Validate `capex_fee` ≥ 0 when capex is enabled

**Read-only mode:**
- Show "Capex: Yes/No"
- When Yes, show Capex Fee value and show Hardware Fee as "N/A (Capex)"

### Completeness Hook — `useTabCompleteness.ts`
- Update contract completeness: when `capex` is true, require `capex_fee` instead of `hardware_fee`

