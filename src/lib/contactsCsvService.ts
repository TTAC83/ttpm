import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

export interface ContactCsvRow {
  name: string;
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
}

const CSV_HEADERS = ['name', 'phone', 'company', 'primary_email', 'additional_emails', 'roles', 'notes'];

// Generate empty template with example row
export function generateTemplate(): string {
  const exampleRow = [
    'John Doe',
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

// Export contacts to CSV format
export function exportContactsToCsv(contacts: any[]): string {
  const rows = [CSV_HEADERS];
  
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
      contact.phone || '',
      contact.company || '',
      primaryEmail,
      additionalEmails,
      roleNames,
      contact.notes || ''
    ]);
  }
  
  return rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
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
  const result: ImportResult = { success: 0, failed: 0, errors: [] };
  const companyMap = new Map(existingCompanies.map(c => [c.name.toLowerCase(), c.name]));
  const roleMap = new Map(existingRoles.map(r => [r.name.toLowerCase(), r.id]));
  
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
      
      // Insert contact
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          name: row.name.trim(),
          phone: row.phone?.trim() || null,
          company: companyName,
          notes: row.notes?.trim() || null,
          emails: emails as any,
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
