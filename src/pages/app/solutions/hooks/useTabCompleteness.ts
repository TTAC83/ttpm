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

      // Factory complete: portal URL, every factory has ≥1 shift + ≥1 group, every group has ≥1 line
      let factoryComplete = false;
      if (portalRes.data?.url) {
        const portalId = portalRes.data.id;
        const { data: factories } = await supabase
          .from('solution_factories' as any)
          .select('id')
          .eq('portal_id', portalId);

        const factoryList = (factories as any[] | null) ?? [];
        if (factoryList.length > 0) {
          const factoryIds = factoryList.map((f: any) => f.id);

          const [shiftsRes, groupsRes] = await Promise.all([
            supabase.from('factory_shifts' as any).select('factory_id').in('factory_id', factoryIds),
            supabase.from('factory_groups' as any).select('id, factory_id').in('factory_id', factoryIds),
          ]);

          const shiftsData = (shiftsRes.data as any[] | null) ?? [];
          const groupsData = (groupsRes.data as any[] | null) ?? [];

          const allFactoriesHaveShifts = factoryIds.every((fid: string) =>
            shiftsData.some((s: any) => s.factory_id === fid)
          );
          const allFactoriesHaveGroups = factoryIds.every((fid: string) =>
            groupsData.some((g: any) => g.factory_id === fid)
          );

          if (allFactoriesHaveShifts && allFactoriesHaveGroups && groupsData.length > 0) {
            const groupIds = groupsData.map((g: any) => g.id);
            const { data: glLines } = await supabase
              .from('factory_group_lines' as any)
              .select('group_id')
              .in('group_id', groupIds);

            const linesData = (glLines as any[] | null) ?? [];
            const allGroupsHaveLines = groupIds.every((gid: string) =>
              linesData.some((l: any) => l.group_id === gid)
            );
            factoryComplete = allGroupsHaveLines;
          }
        }
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
