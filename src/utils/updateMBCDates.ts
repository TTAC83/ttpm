import { supabase } from '@/integrations/supabase/client';

// Task date mapping for MBC project
const taskUpdates: Record<string, { planned_start?: string; planned_end?: string; actual_start?: string; actual_end?: string; }> = {
  "Sales Handover": { 
    planned_start: "2024-04-30", 
    planned_end: "2024-04-30", 
    actual_start: "2024-04-30", 
    actual_end: "2024-04-30" 
  },
  "Meeting the customer": { 
    planned_start: "2024-04-30", 
    planned_end: "2024-04-30", 
    actual_start: "2024-04-30", 
    actual_end: "2024-04-30" 
  },
  "Project Initialisation": { 
    planned_start: "2024-04-30", 
    planned_end: "2024-05-11" 
  },
  "Portal Configuration": { 
    planned_start: "2024-05-01", 
    planned_end: "2024-05-11", 
    actual_start: "2024-03-27", 
    actual_end: "2024-04-30" 
  },
  "Portal Reporting": { 
    planned_start: "2024-05-12", 
    planned_end: "2024-05-15", 
    actual_start: "2025-04-07", 
    actual_end: "2025-05-22" 
  },
  "Hardware Ordering": { 
    planned_start: "2024-04-30", 
    planned_end: "2024-05-21", 
    actual_start: "2025-04-19", 
    actual_end: "2025-04-19" 
  },
  "Super User Training": { 
    planned_start: "2024-04-30", 
    planned_end: "2024-06-29" 
  },
  "Portal Training": { 
    planned_start: "2024-04-30", 
    planned_end: "2024-06-29", 
    actual_start: "2025-03-27", 
    actual_end: "2025-05-22" 
  },
  "Discovery & Launch": { 
    planned_start: "2025-03-27", 
    planned_end: "2025-03-27" 
  },
  "Discovery Day & all relevant activities on WBS": { 
    planned_start: "2025-03-27", 
    planned_end: "2025-03-27", 
    actual_start: "2025-03-27", 
    actual_end: "2025-03-27" 
  },
  "Portal Configuration (Remaining)": { 
    planned_start: "2025-03-28", 
    planned_end: "2025-04-02", 
    actual_start: "2025-03-27", 
    actual_end: "2025-04-07" 
  },
  "Hardware Configuration at Quattro": { 
    planned_start: "2025-03-28", 
    planned_end: "2025-04-02", 
    actual_start: "2025-04-14", 
    actual_end: "2025-04-17" 
  },
  "Notifications": { 
    planned_start: "2025-03-28", 
    planned_end: "2025-04-04" 
  },
  "Customer Product Information": { 
    planned_start: "2025-03-28", 
    planned_end: "2025-04-04", 
    actual_start: "2025-03-27", 
    actual_end: "2025-04-10" 
  },
  "Hardware Configuration": { 
    planned_start: "2024-04-30", 
    planned_end: "2025-04-05" 
  },
  "Hardware delivery to customer": { 
    planned_start: "2025-04-02", 
    planned_end: "2025-04-05", 
    actual_start: "2025-04-19", 
    actual_end: "2025-04-22" 
  },
  "Vision Specific Requirements": { 
    planned_start: "2025-04-03", 
    planned_end: "2025-04-08", 
    actual_start: "2025-04-07", 
    actual_end: "2025-05-22" 
  },
  "Customer Network Configuration": { 
    planned_start: "2025-03-28", 
    planned_end: "2025-04-18", 
    actual_start: "2025-03-27", 
    actual_end: "2025-04-10" 
  },
  "Machine Signal Prep": { 
    planned_start: "2025-03-28", 
    planned_end: "2025-04-18", 
    actual_start: "2025-03-27", 
    actual_end: "2025-04-10" 
  },
  "Hardware installed": { 
    planned_start: "2025-04-06", 
    planned_end: "2025-05-04" 
  },
  "Customer Prep": { 
    planned_start: "2025-03-28", 
    planned_end: "2025-05-05" 
  },
  "Confirmation by customer all hardware is installed": { 
    planned_start: "2025-05-04", 
    planned_end: "2025-05-05", 
    actual_start: "2025-05-12", 
    actual_end: "2025-05-22" 
  },
  "Arrange Site Visit": { 
    planned_start: "2025-05-05", 
    planned_end: "2025-05-12" 
  },
  "On Site Configuration": { 
    planned_start: "2025-05-05", 
    planned_end: "2025-05-14" 
  },
  "IoT Device Configuration": { 
    planned_start: "2025-05-13", 
    planned_end: "2025-05-14" 
  },
  "Vision Camera Configuration": { 
    planned_start: "2025-05-13", 
    planned_end: "2025-05-14" 
  },
  "Other Install": { 
    planned_start: "2025-05-13", 
    planned_end: "2025-05-14" 
  },
  "Job Schedule": { 
    planned_start: "2025-03-28", 
    planned_end: "2025-05-27" 
  },
  "ERP Setup": { 
    planned_start: "2025-03-28", 
    planned_end: "2025-05-27" 
  },
  "Vision Model Training": { 
    planned_start: "2025-05-14", 
    planned_end: "2025-06-04" 
  },
  "Arange Vision Validation Site Visit": { 
    planned_start: "2025-06-04", 
    planned_end: "2025-06-11" 
  },
  "Notification validation": { 
    planned_start: "2025-06-12", 
    planned_end: "2025-06-13" 
  },
  "Validation": { 
    planned_start: "2025-05-14", 
    planned_end: "2025-06-14" 
  },
  "Camera model validation": { 
    planned_start: "2025-06-12", 
    planned_end: "2025-06-14" 
  },
  "Adoption & Handover": { 
    planned_start: "2025-06-14", 
    planned_end: "2025-06-23" 
  },
  "Guided Session 1": { 
    planned_start: "2025-06-22", 
    planned_end: "2025-06-23" 
  },
  "Guided Session 2 - Operational Training": { 
    planned_start: "2025-06-22", 
    planned_end: "2025-06-23" 
  },
  "Project charter for customer engagement": { 
    planned_start: "2025-06-22", 
    planned_end: "2025-06-23" 
  },
  "Performance Training Modules": { 
    planned_start: "2025-06-22", 
    planned_end: "2025-06-23" 
  }
};

export const updateMBCDates = async (): Promise<{ status: string; taskTitle: string; message?: string }[]> => {
  const results: { status: string; taskTitle: string; message?: string }[] = [];

  try {
    // Find the MBC project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, companies!inner(name)')
      .ilike('companies.name', '%MBC%');

    if (projectError) throw projectError;
    
    if (!projects || projects.length === 0) {
      return [{ status: 'error', taskTitle: 'Project', message: 'MBC project not found' }];
    }

    const mbcProject = projects[0];

    // Get all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', mbcProject.id);

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
    console.error('Error updating MBC dates:', error);
    return [{ status: 'error', taskTitle: 'General', message: error.message }];
  }
};