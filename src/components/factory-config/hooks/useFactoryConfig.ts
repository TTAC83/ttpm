import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Portal {
  id: string;
  solutions_project_id: string;
  url: string;
}

export interface Factory {
  id: string;
  portal_id: string;
  name: string;
}

export interface Shift {
  id: string;
  factory_id: string;
  day_of_week: number;
  shift_name: string;
  start_time: string;
  end_time: string;
}

export interface FactoryGroup {
  id: string;
  factory_id: string;
  name: string;
}

export interface GroupLine {
  id: string;
  group_id: string;
  name: string;
  solution_type: 'vision' | 'iot' | 'both';
}

export type DrillLevel = 'portal' | 'factory' | 'group';

export interface BreadcrumbItem {
  level: DrillLevel;
  id?: string;
  label: string;
}

export function useFactoryConfig(projectId: string) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [portal, setPortal] = useState<Portal | null>(null);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [groups, setGroups] = useState<FactoryGroup[]>([]);
  const [lines, setLines] = useState<GroupLine[]>([]);

  // Navigation state
  const [currentLevel, setCurrentLevel] = useState<DrillLevel>('portal');
  const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<FactoryGroup | null>(null);

  const breadcrumbs: BreadcrumbItem[] = [
    { level: 'portal', label: portal?.url || 'Portal' },
    ...(selectedFactory ? [{ level: 'factory' as DrillLevel, id: selectedFactory.id, label: selectedFactory.name }] : []),
    ...(selectedGroup ? [{ level: 'group' as DrillLevel, id: selectedGroup.id, label: selectedGroup.name }] : []),
  ];

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch portal
      const { data: portalData } = await supabase
        .from('solution_portals')
        .select('*')
        .eq('solutions_project_id', projectId)
        .maybeSingle();

      setPortal(portalData);

      if (portalData) {
        // Fetch factories
        const { data: factoryData } = await supabase
          .from('solution_factories')
          .select('*')
          .eq('portal_id', portalData.id)
          .order('created_at');
        setFactories(factoryData || []);

        if (factoryData && factoryData.length > 0) {
          const factoryIds = factoryData.map(f => f.id);
          
          // Fetch shifts and groups for all factories
          const [shiftsRes, groupsRes] = await Promise.all([
            supabase.from('factory_shifts').select('*').in('factory_id', factoryIds).order('day_of_week').order('start_time'),
            supabase.from('factory_groups').select('*').in('factory_id', factoryIds).order('created_at'),
          ]);
          setShifts(shiftsRes.data || []);
          setGroups(groupsRes.data || []);

          // Fetch lines for all groups
          const groupIds = (groupsRes.data || []).map(g => g.id);
          if (groupIds.length > 0) {
            const { data: lineData } = await supabase
              .from('factory_group_lines')
              .select('*')
              .in('group_id', groupIds)
              .order('created_at');
            setLines((lineData || []) as GroupLine[]);
          } else {
            setLines([]);
          }
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load factory config', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Portal
  const savePortalUrl = async (url: string) => {
    try {
      if (portal) {
        await supabase.from('solution_portals').update({ url }).eq('id', portal.id);
        setPortal({ ...portal, url });
      } else {
        const { data } = await supabase.from('solution_portals').insert({ solutions_project_id: projectId, url }).select().single();
        if (data) setPortal(data);
      }
      toast({ title: 'Saved', description: 'Portal URL saved' });
    } catch { toast({ title: 'Error', description: 'Failed to save portal URL', variant: 'destructive' }); }
  };

  // Factory CRUD
  const addFactory = async (name: string) => {
    if (!portal) return;
    try {
      const { data } = await supabase.from('solution_factories').insert({ portal_id: portal.id, name }).select().single();
      if (data) setFactories(prev => [...prev, data]);
      toast({ title: 'Added', description: `Factory "${name}" created` });
    } catch { toast({ title: 'Error', description: 'Failed to add factory', variant: 'destructive' }); }
  };

  const updateFactory = async (id: string, name: string) => {
    try {
      await supabase.from('solution_factories').update({ name }).eq('id', id);
      setFactories(prev => prev.map(f => f.id === id ? { ...f, name } : f));
      if (selectedFactory?.id === id) setSelectedFactory(prev => prev ? { ...prev, name } : prev);
    } catch { toast({ title: 'Error', description: 'Failed to update factory', variant: 'destructive' }); }
  };

  const deleteFactory = async (id: string) => {
    try {
      await supabase.from('solution_factories').delete().eq('id', id);
      setFactories(prev => prev.filter(f => f.id !== id));
      setShifts(prev => prev.filter(s => s.factory_id !== id));
      const groupIds = groups.filter(g => g.factory_id === id).map(g => g.id);
      setGroups(prev => prev.filter(g => g.factory_id !== id));
      setLines(prev => prev.filter(l => !groupIds.includes(l.group_id)));
      if (selectedFactory?.id === id) { setSelectedFactory(null); setCurrentLevel('portal'); }
      toast({ title: 'Deleted', description: 'Factory removed' });
    } catch { toast({ title: 'Error', description: 'Failed to delete factory', variant: 'destructive' }); }
  };

  // Shift CRUD
  const addShift = async (factoryId: string, shift: Omit<Shift, 'id' | 'factory_id'>) => {
    try {
      const { data } = await supabase.from('factory_shifts').insert({ factory_id: factoryId, ...shift }).select().single();
      if (data) setShifts(prev => [...prev, data]);
    } catch { toast({ title: 'Error', description: 'Failed to add shift', variant: 'destructive' }); }
  };

  const deleteShift = async (id: string) => {
    try {
      await supabase.from('factory_shifts').delete().eq('id', id);
      setShifts(prev => prev.filter(s => s.id !== id));
    } catch { toast({ title: 'Error', description: 'Failed to delete shift', variant: 'destructive' }); }
  };

  // Group CRUD
  const addGroup = async (factoryId: string, name: string) => {
    try {
      const { data } = await supabase.from('factory_groups').insert({ factory_id: factoryId, name }).select().single();
      if (data) setGroups(prev => [...prev, data]);
      toast({ title: 'Added', description: `Group "${name}" created` });
    } catch { toast({ title: 'Error', description: 'Failed to add group', variant: 'destructive' }); }
  };

  const updateGroup = async (id: string, name: string) => {
    try {
      await supabase.from('factory_groups').update({ name }).eq('id', id);
      setGroups(prev => prev.map(g => g.id === id ? { ...g, name } : g));
      if (selectedGroup?.id === id) setSelectedGroup(prev => prev ? { ...prev, name } : prev);
    } catch { toast({ title: 'Error', description: 'Failed to update group', variant: 'destructive' }); }
  };

  const deleteGroup = async (id: string) => {
    try {
      await supabase.from('factory_groups').delete().eq('id', id);
      setGroups(prev => prev.filter(g => g.id !== id));
      setLines(prev => prev.filter(l => l.group_id !== id));
      if (selectedGroup?.id === id) { setSelectedGroup(null); setCurrentLevel('factory'); }
      toast({ title: 'Deleted', description: 'Group removed' });
    } catch { toast({ title: 'Error', description: 'Failed to delete group', variant: 'destructive' }); }
  };

  // Line CRUD
  const addLine = async (groupId: string, name: string, solutionType: 'vision' | 'iot' | 'both') => {
    try {
      const { data } = await supabase.from('factory_group_lines').insert({ group_id: groupId, name, solution_type: solutionType }).select().single();
      if (data) setLines(prev => [...prev, data as GroupLine]);
      toast({ title: 'Added', description: `Line "${name}" created` });
    } catch { toast({ title: 'Error', description: 'Failed to add line', variant: 'destructive' }); }
  };

  const updateLine = async (id: string, updates: Partial<Pick<GroupLine, 'name' | 'solution_type'>>) => {
    try {
      await supabase.from('factory_group_lines').update(updates).eq('id', id);
      setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } as GroupLine : l));
    } catch { toast({ title: 'Error', description: 'Failed to update line', variant: 'destructive' }); }
  };

  const deleteLine = async (id: string) => {
    try {
      await supabase.from('factory_group_lines').delete().eq('id', id);
      setLines(prev => prev.filter(l => l.id !== id));
      toast({ title: 'Deleted', description: 'Line removed' });
    } catch { toast({ title: 'Error', description: 'Failed to delete line', variant: 'destructive' }); }
  };

  // Navigation
  const navigateTo = (level: DrillLevel, factory?: Factory, group?: FactoryGroup) => {
    setCurrentLevel(level);
    if (level === 'portal') { setSelectedFactory(null); setSelectedGroup(null); }
    if (level === 'factory') { setSelectedFactory(factory || null); setSelectedGroup(null); }
    if (level === 'group') { setSelectedGroup(group || null); }
  };

  return {
    loading, portal, factories, shifts, groups, lines,
    currentLevel, selectedFactory, selectedGroup, breadcrumbs,
    savePortalUrl, addFactory, updateFactory, deleteFactory,
    addShift, deleteShift,
    addGroup, updateGroup, deleteGroup,
    addLine, updateLine, deleteLine,
    navigateTo,
  };
}
