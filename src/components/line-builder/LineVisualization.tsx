import React from "react";
import { useLineVisualization } from "./useLineVisualization";
import { LineVisualizationView } from "./LineVisualizationView";

interface LineVisualizationProps {
  lineId: string;
  onBack: () => void;
}

export const LineVisualization: React.FC<LineVisualizationProps> = ({
  lineId,
  onBack,
}) => {
  const hookProps = useLineVisualization(lineId);

  return (
    <LineVisualizationView
      lineId={lineId}
      onBack={onBack}
      {...hookProps}
    />
  );
};

export default LineVisualization;
