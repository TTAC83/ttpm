import { supabase } from '@/integrations/supabase/client';

const customers = [
  'Aquascot',
  'Butlers Farmhouse Cheeses',
  'Butternut Box',
  'Cranswick Watton',
  'Finsbury',
  'HFUK',
  'Kettle Produce',
  'MBC',
  'Myton Gadbrook Morrisons',
  'Park Cakes',
  'R&G Fresh',
  'Sofina Hull',
  'Sofina Malton',
  'Village Bakery',
  'Vitacress',
  'Zertus Fakenham',
  'Zertus Heckington'
];

const domains = ['IoT', 'Vision', 'Hybrid'] as const;
const siteNames = [
  'Main Production Facility',
  'Processing Plant',
  'Distribution Center',
  'Manufacturing Site',
  'Production Line A',
  'Factory Floor',
  'Processing Center'
];

const addresses = [
  'Unit 1, Industrial Estate, Manchester, M1 1AA',
  '23 Business Park, Birmingham, B2 2BB',
  'Factory Road, Leeds, LS3 3CC',
  '45 Manufacturing Way, Liverpool, L4 4DD',
  'Innovation Drive, Sheffield, S5 5EE',
  '67 Production Street, Newcastle, NE6 6FF',
  '89 Industry Lane, Bristol, BS7 7GG'
];

// Generate a random date within the last 3 months
const getRandomContractDate = () => {
  const today = new Date();
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
  const timeDiff = today.getTime() - threeMonthsAgo.getTime();
  const randomTime = Math.random() * timeDiff;
  const randomDate = new Date(threeMonthsAgo.getTime() + randomTime);
  return randomDate.toISOString().split('T')[0];
};

export const createBulkProjects = async () => {
  const results = [];
  
  // First, get internal profiles for team assignments
  const { data: internalProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, name')
    .eq('is_internal', true)
    .order('name');

  if (profilesError) {
    throw new Error(`Failed to fetch internal profiles: ${profilesError.message}`);
  }

  if (!internalProfiles || internalProfiles.length === 0) {
    throw new Error('No internal profiles found for team assignments');
  }

  // Get a random internal user for assignments
  const getRandomInternalUser = () => {
    return internalProfiles[Math.floor(Math.random() * internalProfiles.length)].user_id;
  };

  for (let i = 0; i < customers.length; i++) {
    const customerName = customers[i];
    
    try {
      // First, find or create the company
      let company_id;
      let { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .ilike('name', customerName.trim())
        .single();

      if (existingCompany) {
        company_id = existingCompany.id;
      } else {
        // Create new company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({ name: customerName.trim(), is_internal: false })
          .select('id')
          .single();
        
        if (companyError) throw companyError;
        company_id = newCompany.id;
      }

      // Create the project
      const projectData = {
        company_id: company_id,
        name: 'Phase 1',
        site_name: siteNames[i % siteNames.length],
        site_address: addresses[i % addresses.length],
        domain: domains[i % domains.length],
        contract_signed_date: getRandomContractDate(),
        customer_project_lead: getRandomInternalUser(),
        implementation_lead: getRandomInternalUser(),
        ai_iot_engineer: getRandomInternalUser(),
        technical_project_lead: getRandomInternalUser(),
        project_coordinator: getRandomInternalUser(),
      };

      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single();

      if (projectError) throw projectError;

      results.push({
        customer: customerName,
        projectId: project.id,
        status: 'success'
      });

    } catch (error: any) {
      results.push({
        customer: customerName,
        status: 'error',
        error: error.message
      });
    }
  }

  return results;
};