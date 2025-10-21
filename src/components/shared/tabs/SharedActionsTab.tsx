import ProjectActions from '@/pages/app/projects/tabs/ProjectActions';

interface SharedActionsTabProps {
  projectId: string;
  projectType: 'implementation' | 'solutions';
}

export function SharedActionsTab({ projectId, projectType }: SharedActionsTabProps) {
  // Actions component now supports both implementation and solutions projects
  return <ProjectActions projectId={projectId} projectType={projectType} />;
}
