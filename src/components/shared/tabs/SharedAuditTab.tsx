import ProjectAudit from '@/pages/app/projects/tabs/ProjectAudit';

interface SharedAuditTabProps {
  projectId: string;
  projectType: 'implementation' | 'solutions';
}

export function SharedAuditTab({ projectId }: SharedAuditTabProps) {
  // Audit tab currently only supports implementation projects
  // as audit_logs table doesn't have solutions_project_id yet
  return <ProjectAudit projectId={projectId} />;
}
