import { supabase } from '@/integrations/supabase/client';

// Task date mapping for Kettle Produce project
const taskUpdates: Record<string, { planned_start?: string; planned_end?: string; actual_start?: string; actual_end?: string; }> = {
  "Discovery & Launch": { 
    planned_start: "2025-04-30", 
    planned_end: "2025-04-30" 
  },
  "Meeting the customer": { 
    planned_start: "2025-04-30", 
    planned_end: "2025-04-30", 
    actual_start: "2025-04-30", 
    actual_end: "2025-04-30" 
  },
  "Sales Handover": { 
    planned_start: "2025-04-30", 
    planned_end: "2025-04-30", 
    actual_start: "2025-04-30", 
    actual_end: "2025-05-01" 
  },
  "Discovery Day & all relevant activities on WBS": { 
    planned_start: "2025-04-30", 
    planned_end: "2025-04-30", 
    actual_start: "2025-04-30", 
    actual_end: "2025-05-01" 
  },
  "Hardware Configuration at Quattro": { 
    planned_start: "2025-05-01", 
    planned_end: "2025-05-06" 
  },
  "Customer Product Information": { 
    planned_start: "2025-05-01", 
    planned_end: "2025-05-08" 
  },
  "Notifications": { 
    planned_start: "2025-05-01", 
    planned_end: "2025-05-08" 
  },
  "Hardware delivery to customer": { 
    planned_start: "2025-05-06", 
    planned_end: "2025-05-09" 
  },
  "Project Initialisation": { 
    planned_start: "2025-04-30", 
    planned_end: "2025-05-11" 
  },
  "Portal Configuration": { 
    planned_start: "2025-05-01", 
    planned_end: "2025-05-11" 
  },
  "Portal Reporting": { 
    planned_start: "2025-05-12", 
    planned_end: "2025-05-15" 
  },
  "Vision Specific Requirements": { 
    planned_start: "2025-05-12", 
    planned_end: "2025-05-17" 
  },
  "Portal Configuration (Remaining)": { 
    planned_start: "2025-05-12", 
    planned_end: "2025-05-17" 
  },
  "Hardware Configuration": { 
    planned_start: "2025-04-30", 
    planned_end: "2025-05-21" 
  },
  "Hardware Ordering": { 
    planned_start: "2025-04-30", 
    planned_end: "2025-05-21" 
  },
  "Machine Signal Prep": { 
    planned_start: "2025-05-01", 
    planned_end: "2025-05-22" 
  },
  "Customer Network Configuration": { 
    planned_start: "2025-05-01", 
    planned_end: "2025-05-22" 
  },
  "Hardware installed": { 
    planned_start: "2025-05-10", 
    planned_end: "2025-06-07" 
  },
  "Customer Prep": { 
    planned_start: "2025-05-01", 
    planned_end: "2025-06-08" 
  },
  "Confirmation by customer all hardware is installed": { 
    planned_start: "2025-06-07", 
    planned_end: "2025-06-08" 
  },
  "Arrange Site Visit": { 
    planned_start: "2025-06-08", 
    planned_end: "2025-06-15" 
  },
  "On Site Configuration": { 
    planned_start: "2025-06-08", 
    planned_end: "2025-06-17" 
  },
  "IoT Device Configuration": { 
    planned_start: "2025-06-16", 
    planned_end: "2025-06-17" 
  },
  "Vision Camera Configuration": { 
    planned_start: "2025-06-16", 
    planned_end: "2025-06-17" 
  },
  "Other Install": { 
    planned_start: "2025-06-16", 
    planned_end: "2025-06-17" 
  },
  "Super User Training": { 
    planned_start: "2025-04-30", 
    planned_end: "2025-06-29" 
  },
  "Portal Training": { 
    planned_start: "2025-04-30", 
    planned_end: "2025-06-29" 
  },
  "Job Schedule": { 
    planned_start: "2025-05-01", 
    planned_end: "2025-06-30" 
  },
  "ERP Setup": { 
    planned_start: "2025-05-01", 
    planned_end: "2025-06-30" 
  },
  "Vision Model Training": { 
    planned_start: "2025-06-17", 
    planned_end: "2025-07-08" 
  },
  "Arange Vision Validation Site Visit": { 
    planned_start: "2025-07-08", 
    planned_end: "2025-07-15" 
  },
  "Notification validation": { 
    planned_start: "2025-07-16", 
    planned_end: "2025-07-17" 
  },
  "Validation": { 
    planned_start: "2025-06-17", 
    planned_end: "2025-07-18" 
  },
  "Camera model validation": { 
    planned_start: "2025-07-16", 
    planned_end: "2025-07-18" 
  },
  "Arrange Site Visit (Adoption)": { 
    planned_start: "2025-07-18", 
    planned_end: "2025-07-25" 
  },
  "Adoption & Handover": { 
    planned_start: "2025-07-18", 
    planned_end: "2025-07-27" 
  },
  "Guided Session 1": { 
    planned_start: "2025-07-26", 
    planned_end: "2025-07-27" 
  },
  "Guided Session 2 - Operational Training": { 
    planned_start: "2025-07-26", 
    planned_end: "2025-07-27" 
  },
  "Project charter for customer engagement": { 
    planned_start: "2025-07-26", 
    planned_end: "2025-07-27" 
  },
  "Performance Training Modules": { 
    planned_start: "2025-07-26", 
    planned_end: "2025-07-27" 
  }
};

export const updateKettleProduceDates = async (): Promise<{ status: string; taskTitle: string; message?: string }[]> => {
  const results: { status: string; taskTitle: string; message?: string }[] = [];

  try {
    // Find the Kettle Produce project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, companies!inner(name)')
      .ilike('companies.name', '%Kettle%');

    if (projectError) throw projectError;
    
    if (!projects || projects.length === 0) {
      return [{ status: 'error', taskTitle: 'Project', message: 'Kettle Produce project not found' }];
    }

    const kettleProject = projects[0];

    // Get all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', kettleProject.id);

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
    console.error('Error updating Kettle Produce dates:', error);
    return [{ status: 'error', taskTitle: 'General', message: error.message }];
  }
};