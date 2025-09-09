import { supabase } from '@/integrations/supabase/client';

// Task date mapping for HFUK project
const taskUpdates: Record<string, { planned_start?: string; planned_end?: string; actual_start?: string; actual_end?: string; }> = {
  "Sales Handover": { 
    planned_start: "2025-04-22", 
    planned_end: "2025-04-22", 
    actual_start: "2025-04-22", 
    actual_end: "2025-05-12" 
  },
  "Meeting the customer": { 
    planned_start: "2025-05-06", 
    planned_end: "2025-05-06", 
    actual_start: "2025-05-06", 
    actual_end: "2025-05-12" 
  },
  "Hardware Ordering": { 
    planned_start: "2025-04-22", 
    planned_end: "2025-05-13", 
    actual_start: "2025-05-01", 
    actual_end: "2025-05-10" 
  },
  "Portal Configuration": { 
    planned_start: "2025-05-07", 
    planned_end: "2025-05-17", 
    actual_start: "2025-05-12", 
    actual_end: "2025-05-19" 
  },
  "Discovery Day & all relevant activities on WBS": { 
    planned_start: "2025-05-15", 
    planned_end: "2025-05-15", 
    actual_start: "2025-05-15", 
    actual_end: "2025-05-15" 
  },
  "Hardware Configuration at Quattro": { 
    planned_start: "2025-05-16", 
    planned_end: "2025-05-21", 
    actual_start: "2025-05-10", 
    actual_end: "2025-05-13" 
  },
  "Portal Reporting": { 
    planned_start: "2025-05-18", 
    planned_end: "2025-05-21", 
    actual_start: "2025-05-23", 
    actual_end: "2025-05-28" 
  },
  "Notifications": { 
    planned_start: "2025-05-16", 
    planned_end: "2025-05-23" 
  },
  "Portal Configuration (Remaining)": { 
    planned_start: "2025-05-18", 
    planned_end: "2025-05-23", 
    actual_start: "2025-05-12", 
    actual_end: "2025-05-28" 
  },
  "Customer Product Information": { 
    planned_start: "2025-05-16", 
    planned_end: "2025-05-23", 
    actual_start: "2025-05-15", 
    actual_end: "2025-05-28" 
  },
  "Hardware delivery to customer": { 
    planned_start: "2025-05-21", 
    planned_end: "2025-05-24", 
    actual_start: "2025-05-15", 
    actual_end: "2025-05-22" 
  },
  "Vision Specific Requirements": { 
    planned_start: "2025-05-22", 
    planned_end: "2025-05-27", 
    actual_start: "2025-05-12", 
    actual_end: "2025-05-30" 
  },
  "Machine Signal Prep": { 
    planned_start: "2025-05-16", 
    planned_end: "2025-06-06", 
    actual_start: "2025-05-01", 
    actual_end: "2025-05-01" 
  },
  "Customer Network Configuration": { 
    planned_start: "2025-05-16", 
    planned_end: "2025-06-06", 
    actual_start: "2025-06-02", 
    actual_end: "2025-06-13" 
  },
  "Hardware installed": { 
    planned_start: "2025-05-25", 
    planned_end: "2025-06-22", 
    actual_start: "2025-05-15", 
    actual_end: "2025-06-11" 
  },
  "Confirmation by customer all hardware is installed": { 
    planned_start: "2025-06-22", 
    planned_end: "2025-06-23", 
    actual_start: "2025-05-21", 
    actual_end: "2025-06-11" 
  },
  "Portal Training": { 
    planned_start: "2025-05-06", 
    planned_end: "2025-06-15", 
    actual_start: "2025-05-09" 
  },
  "Arrange Site Visit": { 
    planned_start: "2025-06-23", 
    planned_end: "2025-06-30", 
    actual_start: "2025-06-11", 
    actual_end: "2025-06-11" 
  },
  "IoT Device Install": { 
    planned_start: "2025-07-01", 
    planned_end: "2025-07-02" 
  },
  "Vision Camera Install": { 
    planned_start: "2025-07-01", 
    planned_end: "2025-07-02", 
    actual_start: "2025-06-11", 
    actual_end: "2025-06-11" 
  },
  "Other Install": { 
    planned_start: "2025-07-01", 
    planned_end: "2025-07-02", 
    actual_start: "2025-06-11", 
    actual_end: "2025-06-11" 
  },
  "ERP Setup": { 
    planned_start: "2025-05-16", 
    planned_end: "2025-07-15", 
    actual_start: "2025-05-01" 
  },
  "Vision Model Training": { 
    planned_start: "2025-07-02", 
    planned_end: "2025-07-23", 
    actual_start: "2025-06-11", 
    actual_end: "2025-06-30" 
  },
  "Arange Vision Validation Site Visit": { 
    planned_start: "2025-07-23", 
    planned_end: "2025-07-30", 
    actual_start: "2025-06-23", 
    actual_end: "2025-06-23" 
  },
  "Notification validation": { 
    planned_start: "2025-07-31", 
    planned_end: "2025-08-01", 
    actual_start: "2025-07-09", 
    actual_end: "2025-07-09" 
  },
  "Camera model validation": { 
    planned_start: "2025-07-31", 
    planned_end: "2025-08-02", 
    actual_start: "2025-07-09", 
    actual_end: "2025-07-09" 
  },
  "Arrange Site Visit (Adoption)": { 
    planned_start: "2025-08-02", 
    planned_end: "2025-08-09" 
  },
  "Guided Session 1": { 
    planned_start: "2025-08-10", 
    planned_end: "2025-08-11" 
  },
  "Project charter for customer engagement": { 
    planned_start: "2025-08-10", 
    planned_end: "2025-08-11" 
  },
  "Performance Training Modules": { 
    planned_start: "2025-08-10", 
    planned_end: "2025-08-11" 
  },
  "Guided Session 2 - Operational Training": { 
    planned_start: "2025-08-10", 
    planned_end: "2025-08-11", 
    actual_start: "2025-07-09" 
  }
};

export const updateHFUKDates = async (): Promise<{ status: string; taskTitle: string; message?: string }[]> => {
  const results: { status: string; taskTitle: string; message?: string }[] = [];

  try {
    // Find the HFUK project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, companies!inner(name)')
      .ilike('companies.name', '%HFUK%');

    if (projectError) throw projectError;
    
    if (!projects || projects.length === 0) {
      return [{ status: 'error', taskTitle: 'Project', message: 'HFUK project not found' }];
    }

    const hfukProject = projects[0];

    // Get all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', hfukProject.id);

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
    console.error('Error updating HFUK dates:', error);
    return [{ status: 'error', taskTitle: 'General', message: error.message }];
  }
};