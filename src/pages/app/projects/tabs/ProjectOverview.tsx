import { OverviewTab } from '@/components/shared/OverviewTab';

interface ProjectOverviewProps {
  project: any;
  onUpdate: () => void;
}

const ProjectOverview = ({ project, onUpdate }: ProjectOverviewProps) => {
  return <OverviewTab data={project} onUpdate={onUpdate} type="project" />;
};

export default ProjectOverview;
