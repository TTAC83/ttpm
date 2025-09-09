import { supabase } from '@/integrations/supabase/client';

// Task date mapping for Butternut Box project
const taskUpdates: Record<string, { planned_start?: string; planned_end?: string; actual_start?: string; actual_end?: string; }> = {
  "Sales Handover": { 
    planned_start: "2025-07-30", 
    planned_end: "2025-07-30", 
    actual_start: "2025-07-30", 
    actual_end: "2025-07-30" 
  },
  "Meeting the customer": { 
    planned_start: "2025-08-08", 
    planned_end: "2025-08-08", 
    actual_start: "2025-08-08", 
    actual_end: "2025-08-08" 
  },
  "Project Initialisation": { 
    planned_start: "2025-07-30", 
    planned_end: "2025-08-19" 
  },
  "Discovery & Launch": { 
    planned_start: "2025-08-19", 
    planned_end: "2025-08-19" 
  },
  "Discovery Day & all relevant activities on WBS": { 
    planned_start: "2025-08-19", 
    planned_end: "2025-08-19", 
    actual_start: "2025-08-19", 
    actual_end: "2025-08-19" 
  },
  "Portal Configuration": { 
    planned_start: "2025-08-09", 
    planned_end: "2025-08-19", 
    actual_start: "2025-08-19", 
    actual_end: "2025-08-25" 
  },
  "Portal Reporting": { 
    planned_start: "2025-08-20", 
    planned_end: "2025-08-23", 
    actual_start: "2025-08-28", 
    actual_end: "2025-09-03" 
  },
  "Portal Configuration (Remaining)": { 
    planned_start: "2025-08-20", 
    planned_end: "2025-08-25", 
    actual_start: "2025-08-28" 
  },
  "Notifications": { 
    planned_start: "2025-08-20", 
    planned_end: "2025-08-27" 
  },
  "Customer Product Information": { 
    planned_start: "2025-08-20", 
    planned_end: "2025-08-27", 
    actual_start: "2025-08-22" 
  },
  "Hardware Ordering": { 
    planned_start: "2025-08-19", 
    planned_end: "2025-09-09", 
    actual_start: "2025-08-15", 
    actual_end: "2025-09-17" 
  },
  "Customer Network Configuration": { 
    planned_start: "2025-08-20", 
    planned_end: "2025-09-10" 
  },
  "Machine Signal Prep": { 
    planned_start: "2025-08-20", 
    planned_end: "2025-09-10" 
  },
  "Hardware Configuration at Quattro": { 
    planned_start: "2025-09-09", 
    planned_end: "2025-09-14" 
  },
  "Hardware Configuration": { 
    planned_start: "2025-08-19", 
    planned_end: "2025-09-17" 
  },
  "Hardware delivery to customer": { 
    planned_start: "2025-09-14", 
    planned_end: "2025-09-17" 
  },
  "Portal Configuration (Main)": { 
    planned_start: "2025-08-20", 
    planned_end: "2025-09-20" 
  },
  "Vision Specific Requirements": { 
    planned_start: "2025-09-15", 
    planned_end: "2025-09-20" 
  },
  "Super User Training": { 
    planned_start: "2025-08-08", 
    planned_end: "2025-10-07" 
  },
  "Portal Training": { 
    planned_start: "2025-08-08", 
    planned_end: "2025-10-07" 
  },
  "Hardware installed": { 
    planned_start: "2025-09-18", 
    planned_end: "2025-10-16" 
  },
  "Customer Prep": { 
    planned_start: "2025-08-20", 
    planned_end: "2025-10-17" 
  },
  "Confirmation by customer all hardware is installed": { 
    planned_start: "2025-10-16", 
    planned_end: "2025-10-17" 
  },
  "Job Schedule": { 
    planned_start: "2025-08-20", 
    planned_end: "2025-10-19" 
  },
  "ERP Setup": { 
    planned_start: "2025-08-20", 
    planned_end: "2025-10-19" 
  },
  "Arrange Site Visit": { 
    planned_start: "2025-10-17", 
    planned_end: "2025-10-24" 
  },
  "On Site Configuration": { 
    planned_start: "2025-10-17", 
    planned_end: "2025-10-26" 
  },
  "IoT Device Configuration": { 
    planned_start: "2025-10-25", 
    planned_end: "2025-10-26" 
  },
  "Vision Camera Configuration": { 
    planned_start: "2025-10-25", 
    planned_end: "2025-10-26" 
  },
  "Other Install": { 
    planned_start: "2025-10-25", 
    planned_end: "2025-10-26" 
  },
  "Vision Model Training": { 
    planned_start: "2025-10-26", 
    planned_end: "2025-12-07" 
  },
  "Arange Vision Validation Site Visit": { 
    planned_start: "2025-12-07", 
    planned_end: "2025-12-14" 
  },
  "Notification validation": { 
    planned_start: "2025-12-15", 
    planned_end: "2025-12-16" 
  },
  "Validation": { 
    planned_start: "2025-10-26", 
    planned_end: "2025-12-17" 
  },
  "Camera model validation": { 
    planned_start: "2025-12-15", 
    planned_end: "2025-12-17" 
  },
  "Adoption & Handover": { 
    planned_start: "2025-12-17", 
    planned_end: "2025-12-26" 
  },
  "Guided Session 1": { 
    planned_start: "2025-12-25", 
    planned_end: "2025-12-26" 
  },
  "Guided Session 2 - Operational Training": { 
    planned_start: "2025-12-25", 
    planned_end: "2025-12-26" 
  },
  "Project charter for customer engagement": { 
    planned_start: "2025-12-25", 
    planned_end: "2025-12-26" 
  },
  "Performance Training Modules": { 
    planned_start: "2025-12-25", 
    planned_end: "2025-12-26" 
  }
};

export const updateButternutBoxDates = async (): Promise<{ status: string; taskTitle: string; message?: string }[]> => {
  const results: { status: string; taskTitle: string; message?: string }[] = [];

  try {
    // Find the Butternut Box project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, companies!inner(name)')
      .ilike('companies.name', '%Butternut%');

    if (projectError) throw projectError;
    
    if (!projects || projects.length === 0) {
      return [{ status: 'error', taskTitle: 'Project', message: 'Butternut Box project not found' }];
    }

    const butternutProject = projects[0];

    // Get all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', butternutProject.id);

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
    console.error('Error updating Butternut Box dates:', error);
    return [{ status: 'error', taskTitle: 'General', message: error.message }];
  }
};