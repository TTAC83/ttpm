import ProjectActions from '@/pages/app/projects/tabs/ProjectActions';

interface SharedActionsTabProps {
  projectId: string;
  projectType: 'implementation' | 'solutions';
}

export function SharedActionsTab({ projectId }: SharedActionsTabProps) {
  // Actions component currently only supports implementation projects
  // as it uses project_tasks which are implementation-specific
  return <ProjectActions projectId={projectId} />;
}
