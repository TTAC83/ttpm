import { supabase } from '@/integrations/supabase/client';

// Task date mapping for Park Cakes project
const taskUpdates: Record<string, { planned_start?: string; planned_end?: string; actual_start?: string; actual_end?: string; }> = {
  "Meeting the customer": { 
    planned_start: "2025-06-24", 
    planned_end: "2025-06-24", 
    actual_start: "2025-06-24", 
    actual_end: "2025-06-24" 
  },
  "Portal Configuration": { 
    planned_start: "2025-06-25", 
    planned_end: "2025-07-05", 
    actual_start: "2025-09-05" 
  },
  "Portal Reporting": { 
    planned_start: "2025-07-06", 
    planned_end: "2025-07-09" 
  },
  "Project Initialisation": { 
    planned_start: "2025-06-24", 
    planned_end: "2025-07-18" 
  },
  "Sales Handover": { 
    planned_start: "2025-07-18", 
    planned_end: "2025-07-18", 
    actual_start: "2025-07-18", 
    actual_end: "2025-07-18" 
  },
  "Discovery & Launch": { 
    planned_start: "2025-08-05", 
    planned_end: "2025-08-05" 
  },
  "Discovery Day & all relevant activities on WBS": { 
    planned_start: "2025-08-05", 
    planned_end: "2025-08-05", 
    actual_start: "2025-08-05", 
    actual_end: "2025-08-05" 
  },
  "Portal Configuration (Remaining)": { 
    planned_start: "2025-08-06", 
    planned_end: "2025-08-11", 
    actual_start: "2025-08-05" 
  },
  "Customer Product Information": { 
    planned_start: "2025-08-06", 
    planned_end: "2025-08-13" 
  },
  "Notifications": { 
    planned_start: "2025-08-06", 
    planned_end: "2025-08-13" 
  },
  "Super User Training": { 
    planned_start: "2025-06-24", 
    planned_end: "2025-08-23" 
  },
  "Portal Training": { 
    planned_start: "2025-06-24", 
    planned_end: "2025-08-23" 
  },
  "Hardware Ordering": { 
    planned_start: "2025-08-05", 
    planned_end: "2025-08-26" 
  },
  "Customer Network Configuration": { 
    planned_start: "2025-08-06", 
    planned_end: "2025-08-27" 
  },
  "Machine Signal Prep": { 
    planned_start: "2025-08-06", 
    planned_end: "2025-08-27" 
  },
  "Hardware Configuration at Quattro": { 
    planned_start: "2025-08-27", 
    planned_end: "2025-09-01" 
  },
  "Hardware Configuration": { 
    planned_start: "2025-08-05", 
    planned_end: "2025-09-04" 
  },
  "Hardware delivery to customer": { 
    planned_start: "2025-09-01", 
    planned_end: "2025-09-04" 
  },
  "Portal Configuration (Main)": { 
    planned_start: "2025-07-06", 
    planned_end: "2025-09-07" 
  },
  "Vision Specific Requirements": { 
    planned_start: "2025-09-02", 
    planned_end: "2025-09-07" 
  },
  "Hardware installed": { 
    planned_start: "2025-09-05", 
    planned_end: "2025-10-03" 
  },
  "Customer Prep": { 
    planned_start: "2025-08-06", 
    planned_end: "2025-10-04" 
  },
  "Confirmation by customer all hardware is installed": { 
    planned_start: "2025-10-03", 
    planned_end: "2025-10-04" 
  },
  "Job Schedule": { 
    planned_start: "2025-08-06", 
    planned_end: "2025-10-05" 
  },
  "ERP Setup": { 
    planned_start: "2025-08-06", 
    planned_end: "2025-10-05" 
  },
  "Arrange Site Visit": { 
    planned_start: "2025-10-04", 
    planned_end: "2025-10-11" 
  },
  "On Site Configuration": { 
    planned_start: "2025-10-04", 
    planned_end: "2025-10-13" 
  },
  "IoT Device Configuration": { 
    planned_start: "2025-10-12", 
    planned_end: "2025-10-13" 
  },
  "Vision Camera Configuration": { 
    planned_start: "2025-10-12", 
    planned_end: "2025-10-13" 
  },
  "Other Install": { 
    planned_start: "2025-10-12", 
    planned_end: "2025-10-13" 
  },
  "Vision Model Training": { 
    planned_start: "2025-10-13", 
    planned_end: "2025-11-03" 
  },
  "Arange Vision Validation Site Visit": { 
    planned_start: "2025-11-03", 
    planned_end: "2025-11-10" 
  },
  "Notification validation": { 
    planned_start: "2025-11-11", 
    planned_end: "2025-11-12" 
  },
  "Validation": { 
    planned_start: "2025-10-13", 
    planned_end: "2025-11-13" 
  },
  "Camera model validation": { 
    planned_start: "2025-11-11", 
    planned_end: "2025-11-13" 
  },
  "Arrange Site Visit (Adoption)": { 
    planned_start: "2025-11-13", 
    planned_end: "2025-11-20" 
  },
  "Adoption & Handover": { 
    planned_start: "2025-11-13", 
    planned_end: "2025-11-22" 
  },
  "Guided Session 1": { 
    planned_start: "2025-11-21", 
    planned_end: "2025-11-22" 
  },
  "Guided Session 2 - Operational Training": { 
    planned_start: "2025-11-21", 
    planned_end: "2025-11-22" 
  },
  "Project charter for customer engagement": { 
    planned_start: "2025-11-21", 
    planned_end: "2025-11-22" 
  },
  "Performance Training Modules": { 
    planned_start: "2025-11-21", 
    planned_end: "2025-11-22" 
  }
};

export const updateParkCakesDates = async (): Promise<{ status: string; taskTitle: string; message?: string }[]> => {
  const results: { status: string; taskTitle: string; message?: string }[] = [];

  try {
    // Find the Park Cakes project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, companies!inner(name)')
      .ilike('companies.name', '%Park Cakes%');

    if (projectError) throw projectError;
    
    if (!projects || projects.length === 0) {
      return [{ status: 'error', taskTitle: 'Project', message: 'Park Cakes project not found' }];
    }

    const parkCakesProject = projects[0];

    // Get all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', parkCakesProject.id);

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
    console.error('Error updating Park Cakes dates:', error);
    return [{ status: 'error', taskTitle: 'General', message: error.message }];
  }
};