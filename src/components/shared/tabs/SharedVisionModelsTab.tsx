import ProjectVisionModels from '@/pages/app/projects/tabs/ProjectVisionModels';

interface SharedVisionModelsTabProps {
  projectId: string;
  projectType: 'implementation' | 'solutions';
}

export function SharedVisionModelsTab({ projectId, projectType }: SharedVisionModelsTabProps) {
  // VisionModels currently uses direct supabase queries
  // The component itself handles both project types via the service layer
  return <ProjectVisionModels projectId={projectId} projectType={projectType} />;
}
