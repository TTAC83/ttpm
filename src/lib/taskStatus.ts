export interface TaskStatusData {
  planned_start: string | Date | null;
  planned_end: string | Date | null;
  actual_start: string | Date | null;
  actual_end: string | Date | null;
}

export interface TaskStatusResult {
  status: string;
  color: 'default' | 'secondary' | 'destructive' | 'success' | 'warning';
  bgColor: string;
}

/**
 * Computes task status based on planned and actual dates
 * Priority order:
 * 1. Overdue - Not Complete on Time (highest priority)
 * 2. Overdue - Not Started On Time  
 * 3. Completed Late
 * 4. Completed on time
 * 5. In Progress
 * 6. Planned
 */
export const computeTaskStatus = (task: TaskStatusData): TaskStatusResult => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to midnight

  const plannedStart = task.planned_start ? new Date(task.planned_start) : null;
  const plannedEnd = task.planned_end ? new Date(task.planned_end) : null;
  const actualStart = task.actual_start ? new Date(task.actual_start) : null;
  const actualEnd = task.actual_end ? new Date(task.actual_end) : null;

  // Set dates to midnight for comparison
  if (plannedStart) plannedStart.setHours(0, 0, 0, 0);
  if (plannedEnd) plannedEnd.setHours(0, 0, 0, 0);
  if (actualStart) actualStart.setHours(0, 0, 0, 0);
  if (actualEnd) actualEnd.setHours(0, 0, 0, 0);

  // 1. Overdue - Not Complete on Time (highest priority)
  if (plannedEnd && plannedEnd <= today && !actualEnd) {
    return {
      status: 'Overdue - Not Complete on Time',
      color: 'destructive',
      bgColor: 'bg-red-900/20 text-red-200'
    };
  }

  // 2. Overdue - Not Started On Time
  if (plannedStart && plannedStart <= today && !actualStart) {
    return {
      status: 'Overdue - Not Started On Time',
      color: 'destructive',
      bgColor: 'bg-red-500/20 text-red-300'
    };
  }

  // 3. Completed Late
  if (actualEnd && plannedEnd && actualEnd > plannedEnd) {
    return {
      status: 'Completed Late',
      color: 'destructive',
      bgColor: 'bg-red-500 text-white'
    };
  }

  // 4. Completed on time
  if (actualEnd && plannedEnd && actualEnd <= plannedEnd) {
    return {
      status: 'Completed on time',
      color: 'success',
      bgColor: 'bg-green-500 text-white'
    };
  }

  // 5. In Progress
  if (actualStart && !actualEnd) {
    return {
      status: 'In Progress',
      color: 'warning',
      bgColor: 'bg-blue-500 text-white'
    };
  }

  // 6. Planned (default)
  return {
    status: 'Planned',
    color: 'secondary',
    bgColor: 'bg-gray-400 text-gray-800'
  };
};