import { supabase } from '@/integrations/supabase/client';

// Task date mapping for Butlers Farmhouse Cheeses project
const taskUpdates: Record<string, { planned_start?: string; planned_end?: string; actual_start?: string; actual_end?: string; }> = {
  "Sales Handover": { 
    planned_start: "2025-03-04", 
    planned_end: "2025-03-04", 
    actual_start: "2025-03-04", 
    actual_end: "2025-03-06" 
  },
  "Meeting the customer": { 
    planned_start: "2025-03-12", 
    planned_end: "2025-03-12", 
    actual_start: "2025-03-12", 
    actual_end: "2025-03-12" 
  },
  "Portal Configuration": { 
    planned_start: "2025-03-13", 
    planned_end: "2025-03-23", 
    actual_start: "2025-03-13", 
    actual_end: "2025-03-26" 
  },
  "Hardware Ordering": { 
    planned_start: "2025-03-04", 
    planned_end: "2025-03-25", 
    actual_start: "2025-03-01", 
    actual_end: "2025-06-01" 
  },
  "Portal Reporting": { 
    planned_start: "2025-03-24", 
    planned_end: "2025-03-27" 
  },
  "Portal Training": { 
    planned_start: "2025-03-12", 
    planned_end: "2025-04-21", 
    actual_start: "2025-07-01", 
    actual_end: "2025-07-16" 
  },
  "Discovery Day & all relevant activities on WBS": { 
    planned_start: "2025-05-08", 
    planned_end: "2025-05-08", 
    actual_start: "2025-03-18", 
    actual_end: "2025-03-18" 
  },
  "Hardware Configuration at Quattro": { 
    planned_start: "2025-05-09", 
    planned_end: "2025-05-14", 
    actual_start: "2025-03-16", 
    actual_end: "2025-06-01" 
  },
  "Portal Configuration (Remaining)": { 
    planned_start: "2025-05-09", 
    planned_end: "2025-05-14", 
    actual_start: "2025-03-18", 
    actual_end: "2025-08-18" 
  },
  "Customer Product Information": { 
    planned_start: "2025-05-09", 
    planned_end: "2025-05-16", 
    actual_start: "2025-03-18", 
    actual_end: "2025-04-03" 
  },
  "Hardware delivery to customer": { 
    planned_start: "2025-05-14", 
    planned_end: "2025-05-17", 
    actual_start: "2025-05-14", 
    actual_end: "2025-05-14" 
  },
  "Vision Specific Requirements": { 
    planned_start: "2025-05-15", 
    planned_end: "2025-05-20" 
  },
  "Machine Signal Prep": { 
    planned_start: "2025-05-09", 
    planned_end: "2025-05-30" 
  },
  "Notifications": { 
    planned_start: "2025-05-09", 
    planned_end: "2025-05-30" 
  },
  "Customer Network Configuration": { 
    planned_start: "2025-05-09", 
    planned_end: "2025-05-30", 
    actual_start: "2025-08-18", 
    actual_end: "2025-08-18" 
  },
  "Hardware installed": { 
    planned_start: "2025-05-18", 
    planned_end: "2025-06-15", 
    actual_start: "2025-06-01" 
  },
  "Confirmation by customer all hardware is installed": { 
    planned_start: "2025-06-15", 
    planned_end: "2025-06-16", 
    actual_start: "2025-06-01" 
  },
  "ERP Setup": { 
    planned_start: "2025-05-09", 
    planned_end: "2025-07-08", 
    actual_start: "2025-08-01" 
  },
  "Arrange Site Visit (Adoption)": { 
    planned_start: "2025-07-26", 
    planned_end: "2025-08-02" 
  },
  "IoT Device Install": { 
    planned_start: "2025-06-24", 
    planned_end: "2025-06-25" 
  },
  "Other Install": { 
    planned_start: "2025-06-24", 
    planned_end: "2025-06-25" 
  },
  "Vision Camera Install": { 
    planned_start: "2025-06-24", 
    planned_end: "2025-06-25", 
    actual_start: "2025-07-16", 
    actual_end: "2025-07-16" 
  },
  "Vision Model Training": { 
    planned_start: "2025-06-25", 
    planned_end: "2025-07-16", 
    actual_start: "2025-06-01" 
  },
  "Arange Vision Validation Site Visit": { 
    planned_start: "2025-07-16", 
    planned_end: "2025-07-23", 
    actual_start: "2025-08-18", 
    actual_end: "2025-08-18" 
  },
  "Notification validation": { 
    planned_start: "2025-07-24", 
    planned_end: "2025-07-25" 
  },
  "Camera model validation": { 
    planned_start: "2025-07-24", 
    planned_end: "2025-07-26" 
  },
  "Adoption & Handover": { 
    planned_start: "2025-07-26", 
    planned_end: "2025-08-04" 
  },
  "Guided Session 1": { 
    planned_start: "2025-08-03", 
    planned_end: "2025-08-04" 
  },
  "Guided Session 2 - Operational Training": { 
    planned_start: "2025-08-03", 
    planned_end: "2025-08-04" 
  },
  "Project charter for customer engagement": { 
    planned_start: "2025-08-03", 
    planned_end: "2025-08-04" 
  },
  "Performance Training Modules": { 
    planned_start: "2025-08-03", 
    planned_end: "2025-08-04" 
  }
};

export const updateButlersFarmhouseDates = async (): Promise<{ status: string; taskTitle: string; message?: string }[]> => {
  const results: { status: string; taskTitle: string; message?: string }[] = [];

  try {
    // Find the Butlers Farmhouse project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, companies!inner(name)')
      .ilike('companies.name', '%Butlers%');

    if (projectError) throw projectError;
    
    if (!projects || projects.length === 0) {
      return [{ status: 'error', taskTitle: 'Project', message: 'Butlers Farmhouse project not found' }];
    }

    const butlersProject = projects[0];

    // Get all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', butlersProject.id);

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
    console.error('Error updating Butlers Farmhouse dates:', error);
    return [{ status: 'error', taskTitle: 'General', message: error.message }];
  }
};