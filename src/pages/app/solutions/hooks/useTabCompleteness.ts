import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TabCompleteness {
  overview: boolean;
  contacts: boolean;
  factory: boolean;
  lines: boolean;
  hardwareSummary: boolean;
}

interface ProjectData {
  id: string;
  company_id: string;
  domain: string;
  site_name: string;
  site_address?: string;
  servers_required?: number;
  gateways_required?: number;
  tv_display_devices_required?: number;
  receivers_required?: number;
  lines_required?: number;
  companies?: { name: string };
}

export const useTabCompleteness = (project: ProjectData | null) => {
  const [completeness, setCompleteness] = useState<TabCompleteness>({
    overview: false,
    contacts: false,
    factory: false,
    lines: false,
    hardwareSummary: false,
  });

  useEffect(() => {
    if (!project) return;

    // Overview: check key fields
    const overviewComplete = !!(
      project.companies?.name &&
      project.domain &&
      project.site_name &&
      project.site_address
    );

    // Hardware Summary: at least one quantity > 0
    const hardwareSummaryComplete =
      (project.servers_required ?? 0) > 0 ||
      (project.gateways_required ?? 0) > 0 ||
      (project.tv_display_devices_required ?? 0) > 0 ||
      (project.receivers_required ?? 0) > 0 ||
      (project.lines_required ?? 0) > 0;

    setCompleteness(prev => ({
      ...prev,
      overview: overviewComplete,
      hardwareSummary: hardwareSummaryComplete,
    }));

    // Async checks
    const checkAsync = async () => {
      const [contactsRes, factoryRes, linesRes] = await Promise.all([
        supabase
          .from('contact_solutions_projects')
          .select('id', { count: 'exact', head: true })
          .eq('solutions_project_id', project.id),
        supabase
          .from('solutions_projects')
          .select('website_url, job_scheduling')
          .eq('id', project.id)
          .single(),
        supabase
          .from('solutions_lines')
          .select('id', { count: 'exact', head: true })
          .eq('solutions_project_id', project.id),
      ]);

      const contactsComplete = (contactsRes.count ?? 0) > 0;
      const factoryComplete = !!(
        factoryRes.data?.website_url && factoryRes.data?.job_scheduling
      );
      const linesComplete = (linesRes.count ?? 0) > 0;

      setCompleteness(prev => ({
        ...prev,
        overview: overviewComplete,
        hardwareSummary: hardwareSummaryComplete,
        contacts: contactsComplete,
        factory: factoryComplete,
        lines: linesComplete,
      }));
    };

    checkAsync();
  }, [project]);

  return completeness;
};
