import { supabase } from '@/integrations/supabase/client';

// Task date mapping for Finsbury project
const taskUpdates: Record<string, { planned_start?: string; planned_end?: string; actual_start?: string; actual_end?: string; }> = {
  "Sales Handover": { 
    planned_start: "2024-12-17", 
    planned_end: "2024-12-17", 
    actual_start: "2024-12-17", 
    actual_end: "2024-12-17" 
  },
  "Meeting the customer": { 
    planned_start: "2024-12-17", 
    planned_end: "2024-12-17", 
    actual_start: "2024-12-17", 
    actual_end: "2024-12-17" 
  },
  "Project Initialisation": { 
    planned_start: "2024-12-17", 
    planned_end: "2024-12-28" 
  },
  "Portal Configuration": { 
    planned_start: "2024-12-18", 
    planned_end: "2024-12-28", 
    actual_start: "2025-07-28", 
    actual_end: "2025-07-28" 
  },
  "Portal Reporting": { 
    planned_start: "2024-12-29", 
    planned_end: "2025-01-01" 
  },
  "Hardware Ordering": { 
    planned_start: "2024-12-17", 
    planned_end: "2025-01-07", 
    actual_start: "2025-07-27", 
    actual_end: "2025-07-28" 
  },
  "Super User Training": { 
    planned_start: "2024-12-17", 
    planned_end: "2025-02-15" 
  },
  "Portal Training": { 
    planned_start: "2024-12-17", 
    planned_end: "2025-02-15", 
    actual_start: "2025-07-28" 
  },
  "Discovery & Launch": { 
    planned_start: "2025-04-10", 
    planned_end: "2025-04-10" 
  },
  "Discovery Day & all relevant activities on WBS": { 
    planned_start: "2025-04-10", 
    planned_end: "2025-04-10", 
    actual_start: "2025-04-10", 
    actual_end: "2025-04-10" 
  },
  "Hardware Configuration at Quattro": { 
    planned_start: "2025-04-11", 
    planned_end: "2025-04-16", 
    actual_start: "2025-07-27", 
    actual_end: "2025-07-28" 
  },
  "Portal Configuration (Remaining)": { 
    planned_start: "2025-04-11", 
    planned_end: "2025-04-16", 
    actual_start: "2025-07-28", 
    actual_end: "2025-07-28" 
  },
  "Customer Product Information": { 
    planned_start: "2025-04-11", 
    planned_end: "2025-04-18", 
    actual_start: "2025-07-27", 
    actual_end: "2025-07-28" 
  },
  "Notifications": { 
    planned_start: "2025-04-11", 
    planned_end: "2025-04-18", 
    actual_start: "2025-07-27", 
    actual_end: "2025-07-28" 
  },
  "Hardware Configuration": { 
    planned_start: "2024-12-17", 
    planned_end: "2025-04-19" 
  },
  "Hardware delivery to customer": { 
    planned_start: "2025-04-16", 
    planned_end: "2025-04-19", 
    actual_start: "2025-07-27", 
    actual_end: "2025-07-28" 
  },
  "Vision Specific Requirements": { 
    planned_start: "2025-04-17", 
    planned_end: "2025-04-22", 
    actual_start: "2025-07-27", 
    actual_end: "2025-07-28" 
  },
  "Customer Network Configuration": { 
    planned_start: "2025-04-11", 
    planned_end: "2025-05-02", 
    actual_start: "2025-07-27", 
    actual_end: "2025-07-28" 
  },
  "Machine Signal Prep": { 
    planned_start: "2025-04-11", 
    planned_end: "2025-05-02", 
    actual_start: "2025-07-27", 
    actual_end: "2025-07-28" 
  },
  "Hardware installed": { 
    planned_start: "2025-04-20", 
    planned_end: "2025-05-18", 
    actual_start: "2025-07-27", 
    actual_end: "2025-07-28" 
  },
  "Customer Prep": { 
    planned_start: "2025-04-11", 
    planned_end: "2025-05-19" 
  },
  "Confirmation by customer all hardware is installed": { 
    planned_start: "2025-05-18", 
    planned_end: "2025-05-19", 
    actual_start: "2025-07-27", 
    actual_end: "2025-08-04" 
  },
  "Job Schedule": { 
    planned_start: "2025-04-11", 
    planned_end: "2025-06-10" 
  },
  "ERP Setup": { 
    planned_start: "2025-04-11", 
    planned_end: "2025-06-10" 
  },
  "Arrange Site Visit": { 
    planned_start: "2025-05-19", 
    planned_end: "2025-05-26", 
    actual_start: "2025-07-27", 
    actual_end: "2025-07-28" 
  },
  "On Site Configuration": { 
    planned_start: "2025-05-19", 
    planned_end: "2025-05-28" 
  },
  "IoT Device Configuration": { 
    planned_start: "2025-05-27", 
    planned_end: "2025-05-28" 
  },
  "Vision Camera Configuration": { 
    planned_start: "2025-05-27", 
    planned_end: "2025-05-28" 
  },
  "Other Install": { 
    planned_start: "2025-05-27", 
    planned_end: "2025-05-28", 
    actual_start: "2025-07-27", 
    actual_end: "2025-07-28" 
  },
  "Vision Model Training": { 
    planned_start: "2025-05-28", 
    planned_end: "2025-06-18", 
    actual_start: "2025-07-27", 
    actual_end: "2025-07-28" 
  },
  "Arange Vision Validation Site Visit": { 
    planned_start: "2025-06-18", 
    planned_end: "2025-06-25", 
    actual_start: "2025-07-27", 
    actual_end: "2025-07-28" 
  },
  "Notification validation": { 
    planned_start: "2025-06-26", 
    planned_end: "2025-06-27" 
  },
  "Validation": { 
    planned_start: "2025-05-28", 
    planned_end: "2025-06-28" 
  },
  "Camera model validation": { 
    planned_start: "2025-06-26", 
    planned_end: "2025-06-28", 
    actual_start: "2025-07-27", 
    actual_end: "2025-07-28" 
  },
  "Adoption & Handover": { 
    planned_start: "2025-06-28", 
    planned_end: "2025-07-07" 
  },
  "Guided Session 1": { 
    planned_start: "2025-07-06", 
    planned_end: "2025-07-07" 
  },
  "Guided Session 2 - Operational Training": { 
    planned_start: "2025-07-06", 
    planned_end: "2025-07-07" 
  },
  "Project charter for customer engagement": { 
    planned_start: "2025-07-06", 
    planned_end: "2025-07-07" 
  },
  "Performance Training Modules": { 
    planned_start: "2025-07-06", 
    planned_end: "2025-07-07" 
  }
};

export const updateFinsburyDates = async (): Promise<{ status: string; taskTitle: string; message?: string }[]> => {
  const results: { status: string; taskTitle: string; message?: string }[] = [];

  try {
    // Find the Finsbury project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, companies!inner(name)')
      .ilike('companies.name', '%Finsbury%');

    if (projectError) throw projectError;
    
    if (!projects || projects.length === 0) {
      return [{ status: 'error', taskTitle: 'Project', message: 'Finsbury project not found' }];
    }

    const finsburyProject = projects[0];

    // Get all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', finsburyProject.id);

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
    console.error('Error updating Finsbury dates:', error);
    return [{ status: 'error', taskTitle: 'General', message: error.message }];
  }
};