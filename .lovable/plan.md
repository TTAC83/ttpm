

## Integrate Customer Contact with Contacts System

### Current State
When creating a new Solutions Project, users fill in four free-text fields under "Customer Contact Information":
- Customer Lead (name)
- Job Title
- Email
- Phone

These values are stored directly as columns on the `solutions_projects` table (`customer_lead`, `customer_email`, `customer_phone`, `customer_job_title`). They are not connected to the centralised contacts system used elsewhere in the app.

### What Will Change
When a user fills in the customer contact details during project creation, the system will:
1. Check if a contact with that email already exists (using `findContactByEmail`)
2. If found, link the existing contact to the new project
3. If not found, create a new contact record and link it to the project
4. Still store the flat fields on `solutions_projects` for backward compatibility

The UI will also be enhanced to let users search for and select an existing contact, auto-filling the fields.

### Implementation Steps

**Step 1: Add contact search/autocomplete to the form**
- Add a "Search existing contacts" combobox above the manual fields in the "Customer Contact Information" section of `NewSolutionsProject.tsx`
- When a user selects an existing contact, auto-populate the name, email, phone, and job title fields
- Track the selected contact ID in state so it can be linked after project creation

**Step 2: Update the submit handler**
- After the project is created, use the contact matching service to:
  - If a contact was selected from search: link it to the new project via `linkContactToSolutionsProject`
  - If no contact was selected but contact fields are filled: create a new contact record in the `contacts` table, then link it via `linkContactToSolutionsProject`, and also link the contact to the company via `linkContactToCompany`
- Continue storing the flat fields on `solutions_projects` for backward compatibility

**Step 3: Create a reusable contact search component**
- Build a small `ContactSearchCombobox` component that queries `v_contacts_enriched` and returns matching contacts
- This can be reused in the implementation `NewProject.tsx` form later if desired

### Technical Details

**Files to modify:**
- `src/pages/app/solutions/NewSolutionsProject.tsx` -- add contact search, update submit logic
- `src/lib/contactMatchingService.ts` -- may add a `createAndLinkContact` helper function

**New file:**
- `src/components/contacts/ContactSearchCombobox.tsx` -- reusable contact search dropdown

**Key logic in submit handler (pseudo-code):**
```text
after project is created with project ID:
  if selectedContactId exists:
    linkContactToSolutionsProject(selectedContactId, projectId)
    linkContactToCompany(selectedContactId, companyId)
  else if customer_lead name is filled:
    create contact in 'contacts' table (name, phone, title)
    add email to 'contact_emails' table
    linkContactToCompany(newContactId, companyId)
    linkContactToSolutionsProject(newContactId, projectId)
```

**No database migrations needed** -- the contacts table, contact_emails, contact_companies, and contact_solutions_projects tables already exist.

