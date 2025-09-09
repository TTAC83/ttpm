import { supabase } from "@/integrations/supabase/client";
import { parseUKDate, toISODateString } from "@/lib/dateUtils";

// Mapping of task updates based on the provided schedule
const taskUpdates: Record<string, {
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
}> = {
  "Sales Handover": {
    planned_start: "2024-10-24",
    planned_end: "2024-10-24",
    actual_start: "2024-10-24",
    actual_end: "2024-10-28"
  },
  "Meeting the customer": {
    planned_start: "2024-10-24",
    planned_end: "2024-10-24", 
    actual_start: "2024-10-24",
    actual_end: "2024-10-24"
  },
  "Portal Configuration": {
    planned_start: "2024-10-25",
    planned_end: "2024-11-04",
    actual_start: "2024-10-24",
    actual_end: "2024-10-24"
  },
  "Discovery Day & all relevant activities on WBS": {
    planned_start: "2024-11-04",
    planned_end: "2024-11-04",
    actual_start: "2024-11-04", 
    actual_end: "2024-11-04"
  },
  "Portal Configuration (Remaining)": {
    planned_start: "2024-11-05",
    planned_end: "2024-11-10",
    actual_start: "2024-11-27",
    actual_end: "2024-12-04"
  },
  "Portal Reporting": {
    planned_start: "2024-11-05",
    planned_end: "2024-11-08",
    actual_start: "2024-12-20",
    actual_end: "2024-12-27"
  },
  "Vision Specific Requirements": {
    planned_start: "2024-11-11",
    planned_end: "2024-11-16",
    actual_start: "2024-11-14",
    actual_end: "2024-11-21"
  },
  "Hardware Ordering": {
    planned_start: "2024-10-24",
    planned_end: "2024-11-14",
    actual_start: "2024-10-17",
    actual_end: "2024-10-24"
  },
  "Hardware Configuration at Quattro": {
    planned_start: "2024-11-05",
    planned_end: "2024-11-10",
    actual_start: "2024-10-22",
    actual_end: "2024-10-29"
  },
  "Hardware delivery to customer": {
    planned_start: "2024-11-10",
    planned_end: "2024-11-13",
    actual_start: "2024-10-28",
    actual_end: "2024-11-04"
  },
  "Customer Network Configuration": {
    planned_start: "2024-11-05",
    planned_end: "2024-11-26",
    actual_start: "2024-11-04",
    actual_end: "2024-11-04"
  },
  "Machine Signal Prep": {
    planned_start: "2024-11-05",
    planned_end: "2024-11-26",
    actual_start: "2025-01-23",
    actual_end: "2025-01-30"
  },
  "Customer Product Information": {
    planned_start: "2024-11-05",
    planned_end: "2024-11-12",
    actual_start: "2025-01-23",
    actual_end: "2025-01-30"
  },
  "Notifications": {
    planned_start: "2024-11-05",
    planned_end: "2024-11-12",
    actual_start: "2025-01-23",
    actual_end: "2025-01-30"
  },
  "Hardware installed": {
    planned_start: "2024-11-14",
    planned_end: "2024-12-12",
    actual_start: "2024-10-28",
    actual_end: "2024-11-04"
  },
  "Confirmation by customer all hardware is installed": {
    planned_start: "2024-12-12",
    planned_end: "2024-12-13",
    actual_start: "2024-10-28",
    actual_end: "2024-11-04"
  },
  "Portal Training": {
    planned_start: "2024-10-24",
    planned_end: "2024-12-23"
  },
  "ERP Setup": {
    planned_start: "2024-11-05",
    planned_end: "2025-01-04",
    actual_start: "2024-11-14",
    actual_end: "2024-11-14"
  },
  "Arrange Site Visit": {
    planned_start: "2024-12-13",
    planned_end: "2024-12-20",
    actual_start: "2024-11-14",
    actual_end: "2024-11-14"
  },
  "IoT Device Install": {
    planned_start: "2024-12-21",
    planned_end: "2024-12-22",
    actual_start: "2024-11-14",
    actual_end: "2024-11-14"
  },
  "Vision Camera Install": {
    planned_start: "2024-12-21",
    planned_end: "2024-12-22",
    actual_start: "2024-11-14",
    actual_end: "2024-11-14"
  },
  "Other Install": {
    planned_start: "2024-12-21",
    planned_end: "2024-12-22",
    actual_start: "2024-11-14",
    actual_end: "2024-11-14"
  },
  "Vision Model Training": {
    planned_start: "2024-12-22",
    planned_end: "2025-01-12",
    actual_start: "2024-11-14",
    actual_end: "2024-11-14"
  },
  "Arange Vision Validation Site Visit": {
    planned_start: "2025-01-12",
    planned_end: "2025-01-19",
    actual_start: "2024-11-14",
    actual_end: "2024-11-14"
  },
  "Camera model validation": {
    planned_start: "2025-01-20",
    planned_end: "2025-01-22",
    actual_start: "2024-11-14",
    actual_end: "2024-11-14"
  },
  "Notification validation": {
    planned_start: "2025-01-20",
    planned_end: "2025-01-21"
  },
  // Note: There are two "Arrange Site Visit" tasks, this mapping will update both
  "Guided Session 1": {
    planned_start: "2025-01-30",
    planned_end: "2025-01-31",
    actual_start: "2025-06-05",
    actual_end: "2025-06-05"
  },
  "Guided Session 2 - Operational Training": {
    planned_start: "2025-01-30",
    planned_end: "2025-01-31",
    actual_start: "2025-06-05",
    actual_end: "2025-06-05"
  },
  "Project charter for customer engagement": {
    planned_start: "2025-01-30",
    planned_end: "2025-01-31"
  },
  "Performance Training Modules": {
    planned_start: "2025-01-30",
    planned_end: "2025-01-31"
  }
};

export const updateAquascotDates = async () => {
  try {
    // Get all projects and find Aquascot
    const { data: allProjects, error: projectError } = await supabase
      .from('projects')
      .select('id, companies(name)');

    if (projectError || !allProjects) {
      throw new Error('Failed to fetch projects');
    }

    const aquascotProject = allProjects.find(p => p.companies?.name === 'Aquascot');
    if (!aquascotProject) {
      throw new Error('Aquascot project not found');
    }

    // Get all tasks for the project
    const { data: tasks, error: tasksError } = await supabase
      .from('project_tasks')
      .select('id, task_title')
      .eq('project_id', aquascotProject.id);

    if (tasksError || !tasks) {
      throw new Error('Failed to fetch project tasks');
    }

    const results = [];

    // Update each task
    for (const task of tasks) {
      const updates = taskUpdates[task.task_title];
      if (updates) {
        try {
          const response = await fetch('https://tjbiyyejofdpwybppxhv.supabase.co/functions/v1/update-task', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
            },
            body: JSON.stringify({
              id: task.id,
              ...updates
            })
          });

          if (response.ok) {
            results.push({ task: task.task_title, status: 'updated' });
          } else {
            const errorText = await response.text();
            results.push({ task: task.task_title, status: 'failed', error: errorText });
          }
        } catch (error) {
          results.push({ task: task.task_title, status: 'failed', error: error.message });
        }
      } else {
        results.push({ task: task.task_title, status: 'skipped - no mapping found' });
      }
    }

    return results;
  } catch (error) {
    console.error('Error updating Aquascot dates:', error);
    throw error;
  }
};