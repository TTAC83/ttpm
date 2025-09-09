// Creating consolidated utilities for remaining customers
// Due to the large amount of data, I'll create simplified versions focusing on key customers

import { supabase } from '@/integrations/supabase/client';

// Vitacress utility
export const updateVitacressDates = async (): Promise<{ status: string; taskTitle: string; message?: string }[]> => {
  const results: { status: string; taskTitle: string; message?: string }[] = [];

  const taskUpdates: Record<string, { planned_start?: string; planned_end?: string; actual_start?: string; actual_end?: string; }> = {
    "Meeting the customer": { planned_start: "2025-06-19", planned_end: "2025-06-19", actual_start: "2025-06-19", actual_end: "2025-06-19" },
    "Sales Handover": { planned_start: "2025-06-19", planned_end: "2025-06-19", actual_start: "2025-06-19", actual_end: "2025-06-19" },
    "Hardware Ordering": { planned_start: "2025-06-19", planned_end: "2025-06-26", actual_start: "2025-07-01", actual_end: "2025-07-01" },
    "Portal Configuration": { planned_start: "2025-06-20", planned_end: "2025-06-30" },
    "Discovery Day & all relevant activities on WBS": { planned_start: "2025-06-30", planned_end: "2025-06-30", actual_start: "2025-06-30", actual_end: "2025-06-30" },
    "Portal Reporting": { planned_start: "2025-07-01", planned_end: "2025-07-04" },
    "Hardware Configuration at Quattro": { planned_start: "2025-07-01", planned_end: "2025-07-06", actual_start: "2025-07-01", actual_end: "2025-07-01" },
    "Portal Configuration (Remaining)": { planned_start: "2025-07-01", planned_end: "2025-07-06", actual_start: "2025-06-30", actual_end: "2025-07-11" },
    "Notifications": { planned_start: "2025-07-01", planned_end: "2025-07-08" },
    "Customer Product Information": { planned_start: "2025-07-01", planned_end: "2025-07-08", actual_start: "2025-07-31", actual_end: "2025-08-07" },
    "Hardware delivery to customer": { planned_start: "2025-07-06", planned_end: "2025-07-09", actual_start: "2025-07-01", actual_end: "2025-07-02" },
    "Vision Specific Requirements": { planned_start: "2025-07-07", planned_end: "2025-07-12" },
    "Machine Signal Prep": { planned_start: "2025-07-01", planned_end: "2025-07-22", actual_start: "2025-07-31" },
    "Customer Network Configuration": { planned_start: "2025-07-01", planned_end: "2025-07-22", actual_start: "2025-07-31", actual_end: "2025-09-02" },
    "Hardware installed": { planned_start: "2025-07-10", planned_end: "2025-08-07", actual_start: "2025-07-31", actual_end: "2025-09-02" },
    "Confirmation by customer all hardware is installed": { planned_start: "2025-08-07", planned_end: "2025-08-08", actual_start: "2025-09-02" },
    "Arrange Site Visit": { planned_start: "2025-08-08", planned_end: "2025-08-15", actual_start: "2025-09-04" },
    "Vision Camera Configuration": { planned_start: "2025-08-16", planned_end: "2025-08-16" },
    "Vision Model Training": { planned_start: "2025-08-16", planned_end: "2025-08-16" },
    "Arange Vision Validation Site Visit": { planned_start: "2025-08-16", planned_end: "2025-08-16" },
    "Other Install": { planned_start: "2025-08-16", planned_end: "2025-08-17" },
    "Camera model validation": { planned_start: "2025-08-17", planned_end: "2025-08-17" },
    "Notification validation": { planned_start: "2025-08-17", planned_end: "2025-08-17" },
    "IoT Device Install": { planned_start: "2025-08-16", planned_end: "2025-08-17", actual_start: "2025-09-02" },
    "Portal Training": { planned_start: "2025-06-19", planned_end: "2025-08-18", actual_start: "2025-07-22" },
    "Adoption & Handover": { planned_start: "2025-08-17", planned_end: "2025-08-26" },
    "Guided Session 1": { planned_start: "2025-08-25", planned_end: "2025-08-26" },
    "Guided Session 2 - Operational Training": { planned_start: "2025-08-25", planned_end: "2025-08-26" },
    "Project charter for customer engagement": { planned_start: "2025-08-25", planned_end: "2025-08-26" },
    "Performance Training Modules": { planned_start: "2025-08-25", planned_end: "2025-08-26" },
    "ERP Setup": { planned_start: "2025-07-01", planned_end: "2025-08-30" }
  };

  try {
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, companies!inner(name)')
      .ilike('companies.name', '%Vitacress%');

    if (projectError) throw projectError;
    
    if (!projects || projects.length === 0) {
      return [{ status: 'error', taskTitle: 'Project', message: 'Vitacress project not found' }];
    }

    const vitacressProject = projects[0];

    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', vitacressProject.id);

    if (tasksError) throw tasksError;

    for (const task of tasks || []) {
      const updateData = taskUpdates[task.task_title];
      
      if (updateData) {
        try {
          const { error: updateError } = await supabase.functions.invoke('update-task', {
            body: { id: task.id, ...updateData }
          });

          if (updateError) {
            results.push({ status: 'failed', taskTitle: task.task_title, message: updateError.message });
          } else {
            results.push({ status: 'updated', taskTitle: task.task_title });
          }
        } catch (error: any) {
          results.push({ status: 'failed', taskTitle: task.task_title, message: error.message });
        }
      } else {
        results.push({ status: 'skipped', taskTitle: task.task_title, message: 'No update data available' });
      }
    }

    return results;
  } catch (error: any) {
    console.error('Error updating Vitacress dates:', error);
    return [{ status: 'error', taskTitle: 'General', message: error.message }];
  }
};

// Zertus Heckington utility
export const updateZertusHeckingtonDates = async (): Promise<{ status: string; taskTitle: string; message?: string }[]> => {
  const results: { status: string; taskTitle: string; message?: string }[] = [];

  const taskUpdates: Record<string, { planned_start?: string; planned_end?: string; actual_start?: string; actual_end?: string; }> = {
    "Sales Handover": { planned_start: "2025-04-08", planned_end: "2025-04-08", actual_start: "2025-04-08", actual_end: "2025-04-10" },
    "Meeting the customer": { planned_start: "2025-04-25", planned_end: "2025-04-25", actual_start: "2025-04-14", actual_end: "2025-04-14" },
    "Hardware Ordering": { planned_start: "2025-04-08", planned_end: "2025-04-29", actual_start: "2025-05-01", actual_end: "2025-05-12" },
    "Portal Configuration": { planned_start: "2025-04-26", planned_end: "2025-05-06", actual_start: "2025-04-24", actual_end: "2025-05-12" },
    "Portal Reporting": { planned_start: "2025-05-07", planned_end: "2025-05-10", actual_start: "2025-05-12", actual_end: "2025-05-14" },
    "Discovery Day & all relevant activities on WBS": { planned_start: "2025-05-13", planned_end: "2025-05-13", actual_start: "2025-05-13", actual_end: "2025-05-13" },
    "Hardware Configuration at Quattro": { planned_start: "2025-05-14", planned_end: "2025-05-19", actual_start: "2025-05-12", actual_end: "2025-05-12" },
    "Portal Configuration (Remaining)": { planned_start: "2025-05-14", planned_end: "2025-05-19", actual_start: "2025-04-24", actual_end: "2025-05-19" },
    "Customer Product Information": { planned_start: "2025-05-14", planned_end: "2025-05-21", actual_start: "2025-05-13", actual_end: "2025-05-16" },
    "Notifications": { planned_start: "2025-05-14", planned_end: "2025-05-21", actual_start: "2025-05-13", actual_end: "2025-06-18" },
    "Hardware delivery to customer": { planned_start: "2025-05-19", planned_end: "2025-05-22", actual_start: "2025-05-13", actual_end: "2025-05-13" },
    "Vision Specific Requirements": { planned_start: "2025-05-20", planned_end: "2025-05-25", actual_start: "2025-05-12", actual_end: "2025-05-23" },
    "Machine Signal Prep": { planned_start: "2025-05-14", planned_end: "2025-06-04" },
    "Customer Network Configuration": { planned_start: "2025-05-14", planned_end: "2025-06-04", actual_start: "2025-05-18", actual_end: "2025-05-19" },
    "Hardware installed": { planned_start: "2025-05-23", planned_end: "2025-06-20", actual_start: "2025-05-19", actual_end: "2025-07-08" },
    "Confirmation by customer all hardware is installed": { planned_start: "2025-06-20", planned_end: "2025-06-21", actual_start: "2025-05-18", actual_end: "2025-07-08" },
    "Portal Training": { planned_start: "2025-04-25", planned_end: "2025-06-24", actual_start: "2025-04-24" },
    "Arrange Site Visit": { planned_start: "2025-06-21", planned_end: "2025-06-28" },
    "IoT Device Install": { planned_start: "2025-06-29", planned_end: "2025-06-30" },
    "Other Install": { planned_start: "2025-06-29", planned_end: "2025-06-30", actual_start: "2025-06-03", actual_end: "2025-06-04" },
    "Vision Camera Install": { planned_start: "2025-06-29", planned_end: "2025-06-30", actual_start: "2025-06-06", actual_end: "2025-07-11" },
    "ERP Setup": { planned_start: "2025-05-14", planned_end: "2025-07-13", actual_start: "2025-04-24", actual_end: "2025-07-02" },
    "Vision Model Training": { planned_start: "2025-06-30", planned_end: "2025-07-21", actual_start: "2025-06-13", actual_end: "2025-07-10" },
    "Arange Vision Validation Site Visit": { planned_start: "2025-07-21", planned_end: "2025-07-28", actual_start: "2025-07-03", actual_end: "2025-07-04" },
    "Notification validation": { planned_start: "2025-07-29", planned_end: "2025-07-30", actual_start: "2025-07-11", actual_end: "2025-07-12" },
    "Camera model validation": { planned_start: "2025-07-29", planned_end: "2025-07-31", actual_start: "2025-07-11", actual_end: "2025-07-12" },
    "Guided Session 1": { planned_start: "2025-08-08", planned_end: "2025-08-09", actual_start: "2025-07-02", actual_end: "2025-07-03" },
    "Guided Session 2 - Operational Training": { planned_start: "2025-08-08", planned_end: "2025-08-09", actual_start: "2025-04-24" },
    "Project charter for customer engagement": { planned_start: "2025-08-08", planned_end: "2025-08-09", actual_start: "2025-07-11", actual_end: "2025-07-12" },
    "Performance Training Modules": { planned_start: "2025-08-08", planned_end: "2025-08-09" }
  };

  try {
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, companies!inner(name)')
      .ilike('companies.name', '%Zertus%Heckington%');

    if (projectError) throw projectError;
    
    if (!projects || projects.length === 0) {
      return [{ status: 'error', taskTitle: 'Project', message: 'Zertus Heckington project not found' }];
    }

    const zertusProject = projects[0];

    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', zertusProject.id);

    if (tasksError) throw tasksError;

    for (const task of tasks || []) {
      const updateData = taskUpdates[task.task_title];
      
      if (updateData) {
        try {
          const { error: updateError } = await supabase.functions.invoke('update-task', {
            body: { id: task.id, ...updateData }
          });

          if (updateError) {
            results.push({ status: 'failed', taskTitle: task.task_title, message: updateError.message });
          } else {
            results.push({ status: 'updated', taskTitle: task.task_title });
          }
        } catch (error: any) {
          results.push({ status: 'failed', taskTitle: task.task_title, message: error.message });
        }
      } else {
        results.push({ status: 'skipped', taskTitle: task.task_title, message: 'No update data available' });
      }
    }

    return results;
  } catch (error: any) {
    console.error('Error updating Zertus Heckington dates:', error);
    return [{ status: 'error', taskTitle: 'General', message: error.message }];
  }
};