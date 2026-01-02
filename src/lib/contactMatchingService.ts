import { supabase } from '@/integrations/supabase/client';

export interface ContactMatch {
  id: string;
  name: string;
  emails: { email: string; is_primary: boolean }[];
  companies: { id: string; name: string; is_primary: boolean }[];
}

/**
 * Find existing contacts by email address
 * Searches across all emails in the JSONB array
 */
export async function findContactsByEmail(emails: string[]): Promise<ContactMatch[]> {
  if (emails.length === 0) return [];
  
  // Normalize emails to lowercase
  const normalizedEmails = emails.map(e => e.toLowerCase().trim());
  
  // Use the enriched view to get full contact info
  const { data, error } = await supabase
    .from('v_contacts_enriched')
    .select('id, name, emails, companies');
  
  if (error) {
    console.error('Error searching contacts by email:', error);
    return [];
  }
  
  // Filter contacts that have any matching email
  const matches = (data || []).filter(contact => {
    const contactEmails = (contact.emails as any[] || []).map((e: any) => e.email?.toLowerCase());
    return normalizedEmails.some(email => contactEmails.includes(email));
  });
  
  return matches.map(c => ({
    id: c.id,
    name: c.name,
    emails: c.emails as { email: string; is_primary: boolean }[],
    companies: c.companies as { id: string; name: string; is_primary: boolean }[],
  }));
}

/**
 * Find a single contact by any of their emails
 */
export async function findContactByEmail(email: string): Promise<ContactMatch | null> {
  const matches = await findContactsByEmail([email]);
  return matches[0] || null;
}

/**
 * Check if a contact already has a specific company linked
 */
export function hasCompany(contact: ContactMatch, companyId: string): boolean {
  return contact.companies.some(c => c.id === companyId);
}

/**
 * Link a contact to a company
 */
export async function linkContactToCompany(
  contactId: string, 
  companyId: string, 
  isPrimary: boolean = false
): Promise<boolean> {
  const { error } = await supabase
    .from('contact_companies')
    .upsert({
      contact_id: contactId,
      company_id: companyId,
      is_primary: isPrimary,
    }, {
      onConflict: 'contact_id,company_id',
    });
  
  if (error) {
    console.error('Error linking contact to company:', error);
    return false;
  }
  return true;
}

/**
 * Link a contact to an implementation project
 */
export async function linkContactToProject(
  contactId: string, 
  projectId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('contact_projects')
    .upsert({
      contact_id: contactId,
      project_id: projectId,
    }, {
      onConflict: 'contact_id,project_id',
      ignoreDuplicates: true,
    });
  
  if (error && !error.message.includes('duplicate')) {
    console.error('Error linking contact to project:', error);
    return false;
  }
  return true;
}

/**
 * Link a contact to a solutions project
 */
export async function linkContactToSolutionsProject(
  contactId: string, 
  projectId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('contact_solutions_projects')
    .upsert({
      contact_id: contactId,
      solutions_project_id: projectId,
    }, {
      onConflict: 'contact_id,solutions_project_id',
      ignoreDuplicates: true,
    });
  
  if (error && !error.message.includes('duplicate')) {
    console.error('Error linking contact to solutions project:', error);
    return false;
  }
  return true;
}

/**
 * Unlink a contact from an implementation project
 */
export async function unlinkContactFromProject(
  contactId: string, 
  projectId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('contact_projects')
    .delete()
    .eq('contact_id', contactId)
    .eq('project_id', projectId);
  
  if (error) {
    console.error('Error unlinking contact from project:', error);
    return false;
  }
  return true;
}

/**
 * Unlink a contact from a solutions project
 */
export async function unlinkContactFromSolutionsProject(
  contactId: string, 
  projectId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('contact_solutions_projects')
    .delete()
    .eq('contact_id', contactId)
    .eq('solutions_project_id', projectId);
  
  if (error) {
    console.error('Error unlinking contact from solutions project:', error);
    return false;
  }
  return true;
}
