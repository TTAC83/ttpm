import React from "react";
import { LinesTable } from "@/components/line-builder/LinesTable";
import { SolutionsLineWizard } from "@/components/solutions-line-builder/SolutionsLineWizard";

interface SolutionsLinesProps {
  solutionsProjectId: string;
}

export const SolutionsLines: React.FC<SolutionsLinesProps> = ({ solutionsProjectId }) => {
  return (
    <LinesTable
      projectId={solutionsProjectId}
      projectType="solutions"
      tableName="solutions_lines"
      projectIdField="solutions_project_id"
      description="Configure production lines for this solutions project"
      WizardComponent={SolutionsLineWizard}
    />
  );
};

export default SolutionsLines;