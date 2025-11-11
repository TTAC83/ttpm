import React from "react";
import { LinesTable } from "@/components/line-builder/LinesTable";
import { LineWizard } from "@/components/line-builder/LineWizard";

interface ProjectLinesProps {
  projectId: string;
}

export const ProjectLines: React.FC<ProjectLinesProps> = ({ projectId }) => {
  return (
    <LinesTable
      projectId={projectId}
      projectType="implementation"
      tableName="lines"
      projectIdField="project_id"
      description="Configure production lines with equipment, devices, and process flow"
      WizardComponent={LineWizard}
    />
  );
};

export default ProjectLines;