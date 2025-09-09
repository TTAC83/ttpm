import { supabase } from '@/integrations/supabase/client';

// Task date mapping for R&G Fresh project
const taskUpdates: Record<string, { planned_start?: string; planned_end?: string; actual_start?: string; actual_end?: string; }> = {
  "Sales Handover": { 
    planned_start: "2024-12-01", 
    planned_end: "2024-12-01", 
    actual_start: "2024-12-01", 
    actual_end: "2024-12-05" 
  },
  "Meeting the customer": { 
    planned_start: "2024-12-02", 
    planned_end: "2024-12-02", 
    actual_start: "2024-12-02", 
    actual_end: "2024-12-02" 
  },
  "Discovery & Launch": { 
    planned_start: "2024-12-03", 
    planned_end: "2024-12-03" 
  },
  "Discovery Day & all relevant activities on WBS": { 
    planned_start: "2024-12-03", 
    planned_end: "2024-12-03", 
    actual_start: "2024-12-03", 
    actual_end: "2024-12-03" 
  },
  "Hardware Configuration at Quattro": { 
    planned_start: "2024-12-04", 
    planned_end: "2024-12-09", 
    actual_start: "2025-01-03", 
    actual_end: "2025-04-13" 
  },
  "Notifications": { 
    planned_start: "2024-12-04", 
    planned_end: "2024-12-11" 
  },
  "Customer Product Information": { 
    planned_start: "2024-12-04", 
    planned_end: "2024-12-11", 
    actual_start: "2024-12-03" 
  },
  "Hardware delivery to customer": { 
    planned_start: "2024-12-09", 
    planned_end: "2024-12-12", 
    actual_start: "2024-12-03", 
    actual_end: "2025-04-16" 
  },
  "Project Initialisation": { 
    planned_start: "2024-12-01", 
    planned_end: "2024-12-13" 
  },
  "Portal Configuration": { 
    planned_start: "2024-12-03", 
    planned_end: "2024-12-13", 
    actual_start: "2024-12-03", 
    actual_end: "2024-12-03" 
  },
  "Portal Reporting": { 
    planned_start: "2024-12-14", 
    planned_end: "2024-12-17", 
    actual_start: "2025-01-10", 
    actual_end: "2025-01-13" 
  },
  "Portal Configuration (Remaining)": { 
    planned_start: "2024-12-14", 
    planned_end: "2024-12-19", 
    actual_start: "2024-12-20" 
  },
  "Vision Specific Requirements": { 
    planned_start: "2024-12-14", 
    planned_end: "2024-12-19", 
    actual_start: "2025-02-17", 
    actual_end: "2025-02-17" 
  },
  "Hardware Configuration": { 
    planned_start: "2024-12-01", 
    planned_end: "2024-12-22" 
  },
  "Hardware Ordering": { 
    planned_start: "2024-12-01", 
    planned_end: "2024-12-22", 
    actual_start: "2024-12-01", 
    actual_end: "2024-12-01" 
  },
  "Machine Signal Prep": { 
    planned_start: "2024-12-04", 
    planned_end: "2024-12-25" 
  },
  "Customer Network Configuration": { 
    planned_start: "2024-12-04", 
    planned_end: "2024-12-25", 
    actual_start: "2024-12-03", 
    actual_end: "2025-08-22" 
  },
  "Hardware installed": { 
    planned_start: "2024-12-13", 
    planned_end: "2025-01-10", 
    actual_start: "2025-08-22" 
  },
  "Customer Prep": { 
    planned_start: "2024-12-04", 
    planned_end: "2025-01-11" 
  },
  "Confirmation by customer all hardware is installed": { 
    planned_start: "2025-01-10", 
    planned_end: "2025-01-11", 
    actual_start: "2025-08-22" 
  },
  "Arrange Site Visit": { 
    planned_start: "2025-01-11", 
    planned_end: "2025-01-18" 
  },
  "On Site Configuration": { 
    planned_start: "2025-01-11", 
    planned_end: "2025-01-20" 
  },
  "IoT Device Configuration": { 
    planned_start: "2025-01-19", 
    planned_end: "2025-01-20" 
  },
  "Other Install": { 
    planned_start: "2025-01-19", 
    planned_end: "2025-01-20" 
  },
  "Vision Camera Configuration": { 
    planned_start: "2025-01-19", 
    planned_end: "2025-01-20", 
    actual_start: "2024-12-09" 
  },
  "Super User Training": { 
    planned_start: "2024-12-02", 
    planned_end: "2025-01-31" 
  },
  "Portal Training": { 
    planned_start: "2024-12-02", 
    planned_end: "2025-01-31", 
    actual_start: "2024-12-10" 
  },
  "Job Schedule": { 
    planned_start: "2024-12-04", 
    planned_end: "2025-02-02" 
  },
  "ERP Setup": { 
    planned_start: "2024-12-04", 
    planned_end: "2025-02-02", 
    actual_start: "2025-08-27" 
  },
  "Vision Model Training": { 
    planned_start: "2025-01-20", 
    planned_end: "2025-02-10", 
    actual_start: "2025-08-28" 
  },
  "Arange Vision Validation Site Visit": { 
    planned_start: "2025-02-10", 
    planned_end: "2025-02-17" 
  },
  "Notification validation": { 
    planned_start: "2025-02-18", 
    planned_end: "2025-02-19" 
  },
  "Validation": { 
    planned_start: "2025-01-20", 
    planned_end: "2025-02-20" 
  },
  "Camera model validation": { 
    planned_start: "2025-02-18", 
    planned_end: "2025-02-20" 
  },
  "Adoption & Handover": { 
    planned_start: "2025-02-20", 
    planned_end: "2025-03-01" 
  },
  "Guided Session 1": { 
    planned_start: "2025-02-28", 
    planned_end: "2025-03-01" 
  },
  "Guided Session 2 - Operational Training": { 
    planned_start: "2025-02-28", 
    planned_end: "2025-03-01" 
  },
  "Project charter for customer engagement": { 
    planned_start: "2025-02-28", 
    planned_end: "2025-03-01" 
  },
  "Performance Training Modules": { 
    planned_start: "2025-02-28", 
    planned_end: "2025-03-01" 
  }
};

export const updateRGFreshDates = async (): Promise<{ status: string; taskTitle: string; message?: string }[]> => {
  const results: { status: string; taskTitle: string; message?: string }[] = [];

  try {
    // Find the R&G Fresh project
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id, name, companies!inner(name)')
      .ilike('companies.name', '%R&G Fresh%');

    if (projectError) throw projectError;
    
    if (!projects || projects.length === 0) {
      return [{ status: 'error', taskTitle: 'Project', message: 'R&G Fresh project not found' }];
    }

    const rgFreshProject = projects[0];

    // Get all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', rgFreshProject.id);

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
    console.error('Error updating R&G Fresh dates:', error);
    return [{ status: 'error', taskTitle: 'General', message: error.message }];
  }
};