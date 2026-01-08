import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { 
  findContactByEmail, 
  linkContactToCompany, 
  linkContactToProject, 
  linkContactToSolutionsProject 
} from './contactMatchingService';

interface ProjectContactCsvRow {
  name: string;
  title: string;
  phone: string;
  primary_email: string;
  additional_emails: string;
  roles: string;
  notes: string;
}

export interface ImportResult {
  success: number;
  linked: number;
  failed: number;
  errors: string[];
  duplicates: string[];
}

function parseCsvFile(file: File): Promise<ProjectContactCsvRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Get raw data to detect header row
        const rawData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1, defval: '' });
        
        // Find the header row by looking for expected column names
        const expectedHeaders = ['name', 'phone', 'primary_email', 'roles'];
        let headerRowIndex = 0;
        
        for (let i = 0; i < Math.min(5, rawData.length); i++) {
          const row = rawData[i] as string[];
          const lowercaseRow = row.map(cell => String(cell).toLowerCase().trim());
          const matchCount = expectedHeaders.filter(h => lowercaseRow.includes(h)).length;
          if (matchCount >= 3) {
            headerRowIndex = i;
            break;
          }
        }
        
        // Parse with correct header row
        const jsonData = XLSX.utils.sheet_to_json<ProjectContactCsvRow>(worksheet, { 
          defval: '',
          range: headerRowIndex // Skip rows before header
        });
        
        resolve(jsonData);
      } catch (error) {
        reject(new Error('Failed to parse file. Please ensure it has the correct format.'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsBinaryString(file);
  });
}

export async function importProjectContacts(
  file: File,
  projectId: string,
  projectType: 'implementation' | 'solutions',
  companyId: string,
  companyName: string,
  existingRoles: { id: string; name: string }[]
): Promise<ImportResult> {
  const result: ImportResult = { success: 0, linked: 0, failed: 0, errors: [], duplicates: [] };
  
  const rows = await parseCsvFile(file);
  if (rows.length === 0) {
    result.errors.push('The CSV file contains no data rows');
    return result;
  }

  const roleMap = new Map(existingRoles.map(r => [r.name.toLowerCase(), r.id]));
  
  // Get current user for created_by
  const { data: { user } } = await supabase.auth.getUser();

  // Get contacts already linked to this project
  let linkedContactIds: Set<string>;
  if (projectType === 'implementation') {
    const { data } = await supabase
      .from('contact_projects')
      .select('contact_id')
      .eq('project_id', projectId);
    linkedContactIds = new Set((data || []).map(d => d.contact_id));
  } else {
    const { data } = await supabase
      .from('contact_solutions_projects')
      .select('contact_id')
      .eq('solutions_project_id', projectId);
    linkedContactIds = new Set((data || []).map(d => d.contact_id));
  }
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    
    try {
      // Validate required fields
      if (!row.name?.trim()) {
        result.errors.push(`Row ${rowNum}: Name is required`);
        result.failed++;
        continue;
      }
      
      // Parse all emails for matching
      const allEmails: string[] = [];
      if (row.primary_email?.trim()) {
        allEmails.push(row.primary_email.trim().toLowerCase());
      }
      if (row.additional_emails?.trim()) {
        allEmails.push(...row.additional_emails.split(';').map(e => e.trim().toLowerCase()).filter(Boolean));
      }

      // Check if any email matches an existing contact
      let existingContact = null;
      for (const email of allEmails) {
        const match = await findContactByEmail(email);
        if (match) {
          existingContact = match;
          break;
        }
      }

      if (existingContact) {
        // Check if already linked to this project
        if (linkedContactIds.has(existingContact.id)) {
          result.duplicates.push(`Row ${rowNum}: "${existingContact.name}" is already linked to this project`);
          result.failed++;
          continue;
        }
        
        // Link existing contact to company and project
        await linkContactToCompany(existingContact.id, companyId);
        
        if (projectType === 'implementation') {
          await linkContactToProject(existingContact.id, projectId);
        } else {
          await linkContactToSolutionsProject(existingContact.id, projectId);
        }
        
        linkedContactIds.add(existingContact.id);
        result.linked++;
        continue;
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
        if (roleIds.length !== roleNames.length) continue;
      }
      
      // Build emails array
      const emails: { email: string; is_primary: boolean }[] = [];
      if (row.primary_email?.trim()) {
        emails.push({ email: row.primary_email.trim().toLowerCase(), is_primary: true });
      }
      if (row.additional_emails?.trim()) {
        const additionalEmails = row.additional_emails.split(';').map(e => e.trim().toLowerCase()).filter(Boolean);
        for (const email of additionalEmails) {
          emails.push({ email, is_primary: false });
        }
      }
      
      // Create new contact with auto-assigned company
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

      // Link to company
      await linkContactToCompany(contact.id, companyId, true);
      
      // Link to project
      if (projectType === 'implementation') {
        await linkContactToProject(contact.id, projectId);
      } else {
        await linkContactToSolutionsProject(contact.id, projectId);
      }
      
      linkedContactIds.add(contact.id);
      
      // Insert role assignments
      if (roleIds.length > 0) {
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
