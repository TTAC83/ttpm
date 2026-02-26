import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

const TASK_KEYS = [
  'portal_creation',
  'initial_user_access',
  'factory',
  'shifts',
  'groups',
  'lines',
  'positions',
  'equipments',
  'downtime_categories',
  'downtime_reasons',
  'rejection_reasons',
  'crews',
  'crew_rota',
  'vision_projects',
  'initial_daily_report',
] as const;

const TASK_LABELS: Record<string, string> = {
  portal_creation: 'Portal Creation',
  initial_user_access: 'Initial User Access',
  factory: 'Factory',
  shifts: 'Shifts',
  groups: 'Groups',
  lines: 'Lines',
  positions: 'Positions',
  equipments: 'Equipments',
  downtime_categories: 'Downtime Categories',
  downtime_reasons: 'Downtime Reasons',
  rejection_reasons: 'Rejection Reasons',
  crews: 'Crews',
  crew_rota: 'Crew Rota',
  vision_projects: 'Vision Projects',
  initial_daily_report: 'Initial Daily Report',
};

interface PortalTask {
  id: string;
  task_key: string;
  is_complete: boolean;
  assigned_to: string | null;
  completed_by: string | null;
  completed_at: string | null;
}

interface InternalUser {
  user_id: string;
  name: string | null;
}

interface SolutionsPortalConfigProps {
  projectId: string;
  implementationLeadId: string | null;
  onCompletenessChange?: () => void;
}

export const SolutionsPortalConfig = ({ projectId, implementationLeadId, onCompletenessChange }: SolutionsPortalConfigProps) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<PortalTask[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('portal_config_tasks')
      .select('id, task_key, is_complete, assigned_to, completed_by, completed_at')
      .eq('solutions_project_id', projectId)
      .order('created_at');

    if (data && data.length > 0) {
      setTasks(data);
      return data;
    }
    return null;
  }, [projectId]);

  const seedTasks = useCallback(async () => {
    const rows = TASK_KEYS.map(key => ({
      solutions_project_id: projectId,
      task_key: key,
      assigned_to: implementationLeadId,
    }));

    await supabase.from('portal_config_tasks').insert(rows);
    return fetchTasks();
  }, [projectId, implementationLeadId, fetchTasks]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      // Fetch internal users
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, name')
        .eq('is_internal', true);
      setUsers(profileData || []);
      const nameMap: Record<string, string> = {};
      (profileData || []).forEach(p => { nameMap[p.user_id] = p.name || 'Unknown'; });
      setUserNames(nameMap);

      // Fetch or seed tasks
      const existing = await fetchTasks();
      if (!existing) await seedTasks();
      setLoading(false);
    };
    init();
  }, [fetchTasks, seedTasks]);

  const toggleComplete = async (task: PortalTask) => {
    const newComplete = !task.is_complete;
    const updates: any = {
      is_complete: newComplete,
      completed_by: newComplete ? user?.id : null,
      completed_at: newComplete ? new Date().toISOString() : null,
    };

    await supabase.from('portal_config_tasks').update(updates).eq('id', task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...updates } : t));
    onCompletenessChange?.();
  };

  const changeAssignee = async (taskId: string, userId: string) => {
    const val = userId === '__none__' ? null : userId;
    await supabase.from('portal_config_tasks').update({ assigned_to: val }).eq('id', taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assigned_to: val } : t));
  };

  // Sort tasks by TASK_KEYS order
  const sortedTasks = [...tasks].sort((a, b) => TASK_KEYS.indexOf(a.task_key as any) - TASK_KEYS.indexOf(b.task_key as any));

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const completedCount = tasks.filter(t => t.is_complete).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Portal Configuration Checklist</CardTitle>
            <CardDescription>Track portal setup tasks for this project</CardDescription>
          </div>
          <Badge variant={completedCount === tasks.length ? 'default' : 'secondary'}>
            {completedCount} / {tasks.length} complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left w-10">Done</th>
                <th className="p-3 text-left">Task</th>
                <th className="p-3 text-left w-48">Assigned To</th>
                <th className="p-3 text-left w-44">Completed</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map(task => (
                <tr key={task.id} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="p-3">
                    <Checkbox
                      checked={task.is_complete}
                      onCheckedChange={() => toggleComplete(task)}
                    />
                  </td>
                  <td className="p-3 font-medium">
                    {TASK_LABELS[task.task_key] || task.task_key}
                  </td>
                  <td className="p-3">
                    <Select
                      value={task.assigned_to || '__none__'}
                      onValueChange={(v) => changeAssignee(task.id, v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Unassigned</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.user_id} value={u.user_id}>
                            {u.name || u.user_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {task.is_complete && task.completed_at ? (
                      <span>
                        {userNames[task.completed_by || ''] || '—'} · {format(new Date(task.completed_at), 'dd MMM yyyy')}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
