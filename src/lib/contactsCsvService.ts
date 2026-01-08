import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

export interface ContactCsvRow {
  name: string;
  title: string;
  phone: string;
  company: string;
  primary_email: string;
  additional_emails: string;
  roles: string;
  notes: string;
}

export interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  duplicates: string[];
}

const CSV_HEADERS = ['name', 'title', 'phone', 'company', 'primary_email', 'additional_emails', 'roles', 'notes'];

// Generate empty template with example row
export function generateTemplate(): string {
  const exampleRow = [
    'John Doe',
    'Operations Manager',
    '+44 7700 900000',
    'Acme Corp',
    'john@example.com',
    'john.personal@example.com;john.work@example.com',
    'Project Lead;Technical Contact',
    'Key stakeholder for Phase 1'
  ];
  
  const rows = [CSV_HEADERS, exampleRow];
  return rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

// Format cell for Excel - prevents leading zeros from being stripped
function formatCellForExcel(value: string, preserveLeadingZeros = false): string {
  const escaped = (value || '').replace(/"/g, '""');
  // Use Excel formula format for fields that might have leading zeros
  if (preserveLeadingZeros && value && /^0\d/.test(value)) {
    return `"=""${escaped}"""`;
  }
  return `"${escaped}"`;
}

// Export contacts to CSV format
export function exportContactsToCsv(contacts: any[]): string {
  const rows: string[][] = [];
  rows.push(CSV_HEADERS);
  
  for (const contact of contacts) {
    const emails = contact.emails || [];
    const primaryEmail = emails.find((e: any) => e.is_primary)?.email || emails[0]?.email || '';
    const additionalEmails = emails
      .filter((e: any) => e.email !== primaryEmail)
      .map((e: any) => e.email)
      .join(';');
    
    const roleNames = (contact.roles || []).map((r: any) => r.name).join(';');
    
    rows.push([
      contact.name || '',
      contact.title || '',
      contact.phone || '',
      contact.company || '',
      primaryEmail,
      additionalEmails,
      roleNames,
      contact.notes || ''
    ]);
  }
  
  // Format cells, preserving leading zeros for phone column (index 2 now)
  return rows.map(row => 
    row.map((cell, colIndex) => formatCellForExcel(cell, colIndex === 2)).join(',')
  ).join('\n');
}

// Parse CSV file
export function parseCsvFile(file: File): Promise<ContactCsvRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ContactCsvRow>(worksheet, { defval: '' });
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Failed to parse CSV file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

// Validate and import contacts
export async function importContacts(
  rows: ContactCsvRow[],
  existingCompanies: { id: string; name: string }[],
  existingRoles: { id: string; name: string }[]
): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, errors: [], duplicates: [] };
  const companyMap = new Map(existingCompanies.map(c => [c.name.toLowerCase(), c.name]));
  const roleMap = new Map(existingRoles.map(r => [r.name.toLowerCase(), r.id]));
  
  // Fetch existing contacts for duplicate detection
  const { data: existingContacts } = await supabase
    .from('contacts')
    .select('name, company');
  
  const existingSet = new Set(
    (existingContacts || []).map(c => 
      `${c.name.toLowerCase()}|${(c.company || '').toLowerCase()}`
    )
  );

  // Get current user for created_by
  const { data: { user } } = await supabase.auth.getUser();
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for header row and 0-indexing
    
    try {
      // Validate required fields
      if (!row.name?.trim()) {
        result.errors.push(`Row ${rowNum}: Name is required`);
        result.failed++;
        continue;
      }
      
      // Validate company exists if provided
      let companyName: string | null = null;
      if (row.company?.trim()) {
        const matchedCompany = companyMap.get(row.company.trim().toLowerCase());
        if (!matchedCompany) {
          result.errors.push(`Row ${rowNum}: Company "${row.company}" not found`);
          result.failed++;
          continue;
        }
        companyName = matchedCompany;
      }
      
      // Check for duplicates
      const duplicateKey = `${row.name.trim().toLowerCase()}|${(companyName || '').toLowerCase()}`;
      if (existingSet.has(duplicateKey)) {
        result.duplicates.push(`Row ${rowNum}: "${row.name}" at "${companyName || 'no company'}" already exists`);
        result.errors.push(`Row ${rowNum}: Duplicate contact - "${row.name}" already exists${companyName ? ` at ${companyName}` : ''}`);
        result.failed++;
        continue;
      }
      existingSet.add(duplicateKey); // Prevent duplicates within same import
      
      // Parse and validate roles
      const roleIds: string[] = [];
      if (row.roles?.trim()) {
        const roleNames = row.roles.split(';').map(r => r.trim()).filter(Boolean);
        for (const roleName of roleNames) {
          const roleId = roleMap.get(roleName.toLowerCase());
          if (!roleId) {
            result.errors.push(`Row ${rowNum}: Role "${roleName}" not found`);
            result.failed++;
            continue;
          }
          roleIds.push(roleId);
        }
        if (roleIds.length !== roleNames.length) continue; // Skip if any role failed
      }
      
      // Parse emails
      const emails: { email: string; is_primary: boolean }[] = [];
      if (row.primary_email?.trim()) {
        emails.push({ email: row.primary_email.trim(), is_primary: true });
      }
      if (row.additional_emails?.trim()) {
        const additionalEmails = row.additional_emails.split(';').map(e => e.trim()).filter(Boolean);
        for (const email of additionalEmails) {
          emails.push({ email, is_primary: false });
        }
      }
      
      // Insert contact with created_by for audit
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          name: row.name.trim(),
          title: row.title?.trim() || null,
          phone: row.phone?.trim() || null,
          company: companyName,
          notes: row.notes?.trim() || null,
          emails: emails as any,
          created_by: user?.id || null,
        })
        .select()
        .single();
      
      if (contactError) {
        result.errors.push(`Row ${rowNum}: ${contactError.message}`);
        result.failed++;
        continue;
      }
      
      // Insert role assignments
      if (roleIds.length > 0 && contact) {
        const { error: roleError } = await supabase
          .from('contact_role_assignments')
          .insert(roleIds.map(roleId => ({
            contact_id: contact.id,
            role_id: roleId,
          })));
        
        if (roleError) {
          result.errors.push(`Row ${rowNum}: Failed to assign roles - ${roleError.message}`);
        }
      }
      
      result.success++;
    } catch (error: any) {
      result.errors.push(`Row ${rowNum}: ${error.message}`);
      result.failed++;
    }
  }
  
  return result;
}

// Download helper
export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
