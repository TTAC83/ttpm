import { supabase } from '@/integrations/supabase/client';

// Task date mapping for Cranswick Watton project
const taskUpdates: Record<string, { planned_start?: string; planned_end?: string; actual_start?: string; actual_end?: string; }> = {
  "Sales Handover": { 
    planned_start: "2025-03-04", 
    planned_end: "2025-03-04", 
    actual_start: "2025-03-04", 
    actual_end: "2025-03-04" 
  },
  "Meeting the customer": { 
    planned_start: "2025-03-13", 
    planned_end: "2025-03-13", 
    actual_start: "2025-03-13", 
    actual_end: "2025-03-14" 
  },
  "Portal Training": { 
    planned_start: "2025-03-13", 
    planned_end: "2025-03-18", 
    actual_start: "2025-06-17" 
  },
  "Hardware Ordering": { 
    planned_start: "2025-03-04", 
    planned_end: "2025-03-18", 
    actual_start: "2025-03-01", 
    actual_end: "2025-03-31" 
  },
  "Portal & Sharepoint Configuration": { 
    planned_start: "2025-03-14", 
    planned_end: "2025-03-19", 
    actual_start: "2025-03-14", 
    actual_end: "2025-03-24" 
  },
  "Portal Reporting": { 
    planned_start: "2025-03-20", 
    planned_end: "2025-03-23", 
    actual_start: "2025-03-28", 
    actual_end: "2025-04-08" 
  },
  "Discovery Day & all relevant activities on WBS": { 
    planned_start: "2025-03-25", 
    planned_end: "2025-03-25", 
    actual_start: "2025-03-25", 
    actual_end: "2025-03-25" 
  },
  "Hardware Configuration at Quattro": { 
    planned_start: "2025-03-26", 
    planned_end: "2025-03-31", 
    actual_start: "2025-03-25", 
    actual_end: "2025-04-11" 
  },
  "Portal Configuration (Remaining)": { 
    planned_start: "2025-03-26", 
    planned_end: "2025-03-31", 
    actual_start: "2025-03-25", 
    actual_end: "2025-04-23" 
  },
  "Notifications": { 
    planned_start: "2025-03-26", 
    planned_end: "2025-04-02" 
  },
  "Customer Product Information": { 
    planned_start: "2025-03-26", 
    planned_end: "2025-04-02", 
    actual_start: "2025-03-25", 
    actual_end: "2025-04-28" 
  },
  "Hardware delivery to customer": { 
    planned_start: "2025-03-31", 
    planned_end: "2025-04-03", 
    actual_start: "2025-03-25", 
    actual_end: "2025-04-15" 
  },
  "Vision Specific Requirements": { 
    planned_start: "2025-04-01", 
    planned_end: "2025-04-06", 
    actual_start: "2025-04-07", 
    actual_end: "2025-04-21" 
  },
  "Machine Signal Prep": { 
    planned_start: "2025-03-26", 
    planned_end: "2025-04-16" 
  },
  "Customer Network Configuration": { 
    planned_start: "2025-03-26", 
    planned_end: "2025-04-16", 
    actual_start: "2025-03-25", 
    actual_end: "2025-07-21" 
  },
  "Hardware installed": { 
    planned_start: "2025-04-04", 
    planned_end: "2025-05-02", 
    actual_start: "2025-03-25", 
    actual_end: "2025-05-27" 
  },
  "Confirmation by customer all hardware is installed": { 
    planned_start: "2025-05-02", 
    planned_end: "2025-05-30", 
    actual_start: "2025-03-25", 
    actual_end: "2025-06-17" 
  },
  "ERP Setup": { 
    planned_start: "2025-03-26", 
    planned_end: "2025-05-25", 
    actual_start: "2025-03-27" 
  },
  "Arrange Site Visit": { 
    planned_start: "2025-05-30", 
    planned_end: "2025-06-06", 
    actual_start: "2025-05-20", 
    actual_end: "2025-05-20" 
  },
  "IoT Device Install": { 
    planned_start: "2025-06-07", 
    planned_end: "2025-06-08" 
  },
  "Other Install": { 
    planned_start: "2025-06-07", 
    planned_end: "2025-06-08" 
  },
  "Vision Camera Install": { 
    planned_start: "2025-06-07", 
    planned_end: "2025-06-08", 
    actual_start: "2025-05-27", 
    actual_end: "2025-06-17" 
  },
  "Vision Model Training": { 
    planned_start: "2025-06-08", 
    planned_end: "2025-06-29", 
    actual_start: "2025-06-03", 
    actual_end: "2025-08-05" 
  },
  "Arange Vision Validation Site Visit": { 
    planned_start: "2025-06-29", 
    planned_end: "2025-07-06", 
    actual_start: "2025-08-07", 
    actual_end: "2025-08-07" 
  },
  "Notification validation": { 
    planned_start: "2025-07-07", 
    planned_end: "2025-07-08" 
  },
  "Camera model validation": { 
    planned_start: "2025-07-07", 
    planned_end: "2025-07-09", 
    actual_start: "2025-08-07", 
    actual_end: "2025-08-07" 
  },
  "Arrange Site Visit (Adoption)": { 
    planned_start: "2025-07-09", 
    planned_end: "2025-07-16" 
  },
  "Adoption & Handover": { 
    planned_start: "2025-07-09", 
    planned_end: "2025-07-18" 
  },
  "Guided Session 1": { 
    planned_start: "2025-07-17", 
    planned_end: "2025-07-18" 
  },
  "Guided Session 2 - Operational Training": { 
    planned_start: "2025-07-17", 
    planned_end: "2025-07-18" 
  },
  "Project charter for customer engagement": { 
    planned_start: "2025-07-17", 
    planned_end: "2025-07-18" 
  },
  "Performance Training Modules": { 
    planned_start: "2025-07-17", 
    planned_end: "2025-07-18" 
  }
};

export const updateCranswickWattonDates = async (): Promise<{ status: string; taskTitle: string; message?: string }[]> => {
  const results: { status: string; taskTitle: string; message?: string }[] = [];

  try {
    // Find the Cranswick Watton project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, companies!inner(name)')
      .ilike('companies.name', '%Cranswick%');

    if (projectError) throw projectError;
    
    if (!projects || projects.length === 0) {
      return [{ status: 'error', taskTitle: 'Project', message: 'Cranswick project not found' }];
    }

    const cranswickProject = projects[0];

    // Get all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', cranswickProject.id);

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
    console.error('Error updating Cranswick Watton dates:', error);
    return [{ status: 'error', taskTitle: 'General', message: error.message }];
  }
};