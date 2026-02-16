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
  segment?: string;
  line_description?: string;
  product_description?: string;
  project_goals?: string;
  final_scoping_complete?: boolean;
  contract_signed?: boolean;
  implementation_handover?: boolean;
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

    // Overview: ALL displayed fields must be complete
    const overviewComplete = !!(
      project.companies?.name &&
      project.domain &&
      project.site_name &&
      project.site_address &&
      project.segment &&
      project.line_description &&
      project.product_description &&
      project.project_goals &&
      project.final_scoping_complete &&
      project.contract_signed &&
      project.implementation_handover
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
      const [contactsRes, portalRes, linesRes] = await Promise.all([
        supabase
          .from('contact_solutions_projects')
          .select('id', { count: 'exact', head: true })
          .eq('solutions_project_id', project.id),
        supabase
          .from('solution_portals')
          .select('id, url')
          .eq('solutions_project_id', project.id)
          .maybeSingle(),
        supabase
          .from('solutions_lines')
          .select('id', { count: 'exact', head: true })
          .eq('solutions_project_id', project.id),
      ]);

      const contactsComplete = (contactsRes.count ?? 0) > 0;

      // Factory complete: portal exists with URL, and at least one factory
      let factoryComplete = false;
      if (portalRes.data?.url) {
        const { count } = await supabase
          .from('solution_factories')
          .select('id', { count: 'exact', head: true })
          .eq('portal_id', portalRes.data.id);
        factoryComplete = (count ?? 0) > 0;
      }

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
