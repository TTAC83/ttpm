import { supabase } from '@/integrations/supabase/client';

// Task date mapping for Myton Gadbrook Morrisons project
const taskUpdates: Record<string, { planned_start?: string; planned_end?: string; actual_start?: string; actual_end?: string; }> = {
  "Sales Handover": { 
    planned_start: "2025-08-11", 
    planned_end: "2025-08-11", 
    actual_start: "2025-08-11", 
    actual_end: "2025-08-11" 
  },
  "Meeting the customer": { 
    planned_start: "2025-08-20", 
    planned_end: "2025-08-20", 
    actual_start: "2025-08-20", 
    actual_end: "2025-08-28" 
  },
  "Discovery & Launch": { 
    planned_start: "2025-09-09", 
    planned_end: "2025-09-09" 
  },
  "Discovery Day & all relevant activities on WBS": { 
    planned_start: "2025-09-09", 
    planned_end: "2025-09-09", 
    actual_start: "2025-09-09" 
  },
  "Project Initialisation": { 
    planned_start: "2025-08-11", 
    planned_end: "2025-09-14" 
  },
  "Portal Configuration": { 
    planned_start: "2025-09-09", 
    planned_end: "2025-09-14", 
    actual_start: "2025-09-02", 
    actual_end: "2025-09-04" 
  },
  "Customer Product Information": { 
    planned_start: "2025-09-10", 
    planned_end: "2025-09-17" 
  },
  "Notifications": { 
    planned_start: "2025-09-10", 
    planned_end: "2025-09-17" 
  },
  "Portal Reporting": { 
    planned_start: "2025-09-15", 
    planned_end: "2025-09-18" 
  },
  "Portal Configuration (Remaining)": { 
    planned_start: "2025-09-15", 
    planned_end: "2025-09-20" 
  },
  "Hardware Ordering": { 
    planned_start: "2025-09-09", 
    planned_end: "2025-09-30" 
  },
  "Customer Network Configuration": { 
    planned_start: "2025-09-10", 
    planned_end: "2025-10-01" 
  },
  "Machine Signal Prep": { 
    planned_start: "2025-09-10", 
    planned_end: "2025-10-01" 
  },
  "Hardware Configuration at Quattro": { 
    planned_start: "2025-09-30", 
    planned_end: "2025-10-05" 
  },
  "Hardware Configuration": { 
    planned_start: "2025-09-09", 
    planned_end: "2025-10-08" 
  },
  "Hardware delivery to customer": { 
    planned_start: "2025-10-05", 
    planned_end: "2025-10-08" 
  },
  "Portal Configuration (Main)": { 
    planned_start: "2025-09-15", 
    planned_end: "2025-10-11" 
  },
  "Vision Specific Requirements": { 
    planned_start: "2025-10-06", 
    planned_end: "2025-10-11" 
  },
  "Super User Training": { 
    planned_start: "2025-08-20", 
    planned_end: "2025-10-19" 
  },
  "Portal Training": { 
    planned_start: "2025-08-20", 
    planned_end: "2025-10-19" 
  },
  "Hardware installed": { 
    planned_start: "2025-10-09", 
    planned_end: "2025-11-06" 
  },
  "Customer Prep": { 
    planned_start: "2025-09-10", 
    planned_end: "2025-11-07" 
  },
  "Confirmation by customer all hardware is installed": { 
    planned_start: "2025-11-06", 
    planned_end: "2025-11-07" 
  },
  "Job Schedule": { 
    planned_start: "2025-09-10", 
    planned_end: "2025-11-09" 
  },
  "ERP Setup": { 
    planned_start: "2025-09-10", 
    planned_end: "2025-11-09" 
  },
  "Arrange Site Visit": { 
    planned_start: "2025-11-07", 
    planned_end: "2025-11-14" 
  },
  "On Site Configuration": { 
    planned_start: "2025-11-07", 
    planned_end: "2025-11-16" 
  },
  "IoT Device Configuration": { 
    planned_start: "2025-11-15", 
    planned_end: "2025-11-16" 
  },
  "Vision Camera Configuration": { 
    planned_start: "2025-11-15", 
    planned_end: "2025-11-16" 
  },
  "Other Install": { 
    planned_start: "2025-11-15", 
    planned_end: "2025-11-16" 
  },
  "Vision Model Training": { 
    planned_start: "2025-11-16", 
    planned_end: "2025-12-21" 
  },
  "Arange Vision Validation Site Visit": { 
    planned_start: "2025-12-21", 
    planned_end: "2025-12-28" 
  },
  "Notification validation": { 
    planned_start: "2025-12-29", 
    planned_end: "2025-12-30" 
  },
  "Validation": { 
    planned_start: "2025-11-16", 
    planned_end: "2025-12-31" 
  },
  "Camera model validation": { 
    planned_start: "2025-12-29", 
    planned_end: "2025-12-31" 
  },
  "Arrange Site Visit (Adoption)": { 
    planned_start: "2025-12-31", 
    planned_end: "2026-01-07" 
  },
  "Adoption & Handover": { 
    planned_start: "2025-12-31", 
    planned_end: "2026-01-09" 
  },
  "Guided Session 1": { 
    planned_start: "2026-01-08", 
    planned_end: "2026-01-09" 
  },
  "Guided Session 2 - Operational Training": { 
    planned_start: "2026-01-08", 
    planned_end: "2026-01-09" 
  },
  "Project charter for customer engagement": { 
    planned_start: "2026-01-08", 
    planned_end: "2026-01-09" 
  },
  "Performance Training Modules": { 
    planned_start: "2026-01-08", 
    planned_end: "2026-01-09" 
  }
};

export const updateMytonGadbrookMorrisonsDates = async (): Promise<{ status: string; taskTitle: string; message?: string }[]> => {
  const results: { status: string; taskTitle: string; message?: string }[] = [];

  try {
    // Find the Myton Gadbrook Morrisons project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, companies!inner(name)')
      .ilike('companies.name', '%Myton%');

    if (projectError) throw projectError;
    
    if (!projects || projects.length === 0) {
      return [{ status: 'error', taskTitle: 'Project', message: 'Myton Gadbrook Morrisons project not found' }];
    }

    const mytonProject = projects[0];

    // Get all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', mytonProject.id);

    if (tasksError) throw tasksError;

    // Update each task that has mapping data
    for (const task of tasks || []) {
      const updateData = taskUpdates[task.task_title];
      
      if (updateData) {
        try {
          const { error: updateError } = await supabase.functions.invoke('update-task', {
            body: {
              id: task.id,
              ...updateData
            }
          });

          if (updateError) {
            results.push({ 
              status: 'failed', 
              taskTitle: task.task_title, 
              message: updateError.message 
            });
          } else {
            results.push({ 
              status: 'updated', 
              taskTitle: task.task_title 
            });
          }
        } catch (error: any) {
          results.push({ 
            status: 'failed', 
            taskTitle: task.task_title, 
            message: error.message 
          });
        }
      } else {
        results.push({ 
          status: 'skipped', 
          taskTitle: task.task_title,
          message: 'No update data available'
        });
      }
    }

    return results;
  } catch (error: any) {
    console.error('Error updating Myton Gadbrook Morrisons dates:', error);
    return [{ status: 'error', taskTitle: 'General', message: error.message }];
  }
};