import { supabase } from '@/integrations/supabase/client';

// Task date mapping for Village Bakery project
const taskUpdates: Record<string, { planned_start?: string; planned_end?: string; actual_start?: string; actual_end?: string; }> = {
  "Discovery & Launch": { 
    planned_start: "2025-04-09", 
    planned_end: "2025-04-09" 
  },
  "Sales Handover": { 
    planned_start: "2025-04-09", 
    planned_end: "2025-04-09", 
    actual_start: "2025-04-09", 
    actual_end: "2025-04-09" 
  },
  "Meeting the customer": { 
    planned_start: "2025-04-09", 
    planned_end: "2025-04-09", 
    actual_start: "2025-04-09", 
    actual_end: "2025-04-09" 
  },
  "Discovery Day & all relevant activities on WBS": { 
    planned_start: "2025-04-09", 
    planned_end: "2025-04-09", 
    actual_start: "2025-04-09", 
    actual_end: "2025-04-09" 
  },
  "Hardware Configuration at Quattro": { 
    planned_start: "2025-04-10", 
    planned_end: "2025-04-15", 
    actual_start: "2025-04-14", 
    actual_end: "2025-04-18" 
  },
  "Notifications": { 
    planned_start: "2025-04-10", 
    planned_end: "2025-04-17", 
    actual_start: "2025-05-12", 
    actual_end: "2025-05-29" 
  },
  "Customer Product Information": { 
    planned_start: "2025-04-10", 
    planned_end: "2025-04-17", 
    actual_start: "2025-05-12", 
    actual_end: "2025-05-29" 
  },
  "Hardware delivery to customer": { 
    planned_start: "2025-04-15", 
    planned_end: "2025-04-18", 
    actual_start: "2025-04-14", 
    actual_end: "2025-04-18" 
  },
  "Project Initialisation": { 
    planned_start: "2025-04-09", 
    planned_end: "2025-04-20" 
  },
  "Portal Configuration": { 
    planned_start: "2025-04-10", 
    planned_end: "2025-04-20", 
    actual_start: "2025-04-09", 
    actual_end: "2025-04-14" 
  },
  "Portal Reporting": { 
    planned_start: "2025-04-21", 
    planned_end: "2025-04-24", 
    actual_start: "2025-05-06", 
    actual_end: "2025-05-09" 
  },
  "Portal Configuration (Main)": { 
    planned_start: "2025-04-21", 
    planned_end: "2025-04-26" 
  },
  "Vision Specific Requirements": { 
    planned_start: "2025-04-21", 
    planned_end: "2025-04-26", 
    actual_start: "2025-04-14", 
    actual_end: "2025-04-18" 
  },
  "Portal Configuration (Remaining)": { 
    planned_start: "2025-04-21", 
    planned_end: "2025-04-26", 
    actual_start: "2025-04-14", 
    actual_end: "2025-04-18" 
  },
  "Hardware Configuration": { 
    planned_start: "2025-04-09", 
    planned_end: "2025-04-30" 
  },
  "Hardware Ordering": { 
    planned_start: "2025-04-09", 
    planned_end: "2025-04-30", 
    actual_start: "2025-04-14", 
    actual_end: "2025-04-18" 
  },
  "Machine Signal Prep": { 
    planned_start: "2025-04-10", 
    planned_end: "2025-05-01", 
    actual_start: "2025-04-09", 
    actual_end: "2025-05-13" 
  },
  "Customer Network Configuration": { 
    planned_start: "2025-04-10", 
    planned_end: "2025-05-01", 
    actual_start: "2025-04-09", 
    actual_end: "2025-05-13" 
  },
  "Hardware installed": { 
    planned_start: "2025-04-19", 
    planned_end: "2025-05-17", 
    actual_start: "2025-04-18", 
    actual_end: "2025-05-30" 
  },
  "Customer Prep": { 
    planned_start: "2025-04-10", 
    planned_end: "2025-05-18" 
  },
  "Confirmation by customer all hardware is installed": { 
    planned_start: "2025-05-17", 
    planned_end: "2025-05-18", 
    actual_start: "2025-05-30", 
    actual_end: "2025-05-30" 
  },
  "Arrange Site Visit": { 
    planned_start: "2025-05-18", 
    planned_end: "2025-05-25", 
    actual_start: "2025-04-09", 
    actual_end: "2025-04-09" 
  },
  "On Site Configuration": { 
    planned_start: "2025-05-18", 
    planned_end: "2025-05-27" 
  },
  "Other Install": { 
    planned_start: "2025-05-26", 
    planned_end: "2025-05-27" 
  },
  "IoT Device Configuration": { 
    planned_start: "2025-05-26", 
    planned_end: "2025-05-27", 
    actual_start: "2025-04-09", 
    actual_end: "2025-04-09" 
  },
  "Vision Camera Configuration": { 
    planned_start: "2025-05-26", 
    planned_end: "2025-05-27", 
    actual_start: "2025-05-30", 
    actual_end: "2025-05-30" 
  },
  "Super User Training": { 
    planned_start: "2025-04-09", 
    planned_end: "2025-06-08" 
  },
  "Portal Training": { 
    planned_start: "2025-04-09", 
    planned_end: "2025-06-08", 
    actual_start: "2025-05-05", 
    actual_end: "2025-06-18" 
  },
  "Job Schedule": { 
    planned_start: "2025-04-10", 
    planned_end: "2025-06-09" 
  },
  "ERP Setup": { 
    planned_start: "2025-04-10", 
    planned_end: "2025-06-09", 
    actual_start: "2025-05-05", 
    actual_end: "2025-06-18" 
  },
  "Vision Model Training": { 
    planned_start: "2025-05-27", 
    planned_end: "2025-06-17" 
  },
  "Arange Vision Validation Site Visit": { 
    planned_start: "2025-06-17", 
    planned_end: "2025-06-24" 
  },
  "Notification validation": { 
    planned_start: "2025-06-25", 
    planned_end: "2025-06-26" 
  },
  "Validation": { 
    planned_start: "2025-05-27", 
    planned_end: "2025-06-27" 
  },
  "Camera model validation": { 
    planned_start: "2025-06-25", 
    planned_end: "2025-06-27" 
  },
  "Adoption & Handover": { 
    planned_start: "2025-06-27", 
    planned_end: "2025-07-06" 
  },
  "Guided Session 1": { 
    planned_start: "2025-07-05", 
    planned_end: "2025-07-06" 
  },
  "Guided Session 2 - Operational Training": { 
    planned_start: "2025-07-05", 
    planned_end: "2025-07-06" 
  },
  "Project charter for customer engagement": { 
    planned_start: "2025-07-05", 
    planned_end: "2025-07-06" 
  },
  "Performance Training Modules": { 
    planned_start: "2025-07-05", 
    planned_end: "2025-07-06" 
  }
};

export const updateVillageBakeryDates = async (): Promise<{ status: string; taskTitle: string; message?: string }[]> => {
  const results: { status: string; taskTitle: string; message?: string }[] = [];

  try {
    // Find the Village Bakery project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, companies!inner(name)')
      .ilike('companies.name', '%Village Bakery%');

    if (projectError) throw projectError;
    
    if (!projects || projects.length === 0) {
      return [{ status: 'error', taskTitle: 'Project', message: 'Village Bakery project not found' }];
    }

    const villageBakeryProject = projects[0];

    // Get all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', villageBakeryProject.id);

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
    console.error('Error updating Village Bakery dates:', error);
    return [{ status: 'error', taskTitle: 'General', message: error.message }];
  }
};