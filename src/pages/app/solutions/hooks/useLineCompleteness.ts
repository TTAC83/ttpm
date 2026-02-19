import { useState, useEffect } from "react";
import {
  type LineGap,
  type LineCompletenessResult,
  getSolutionTypeMap,
  checkLineCompleteness,
} from "./lineCompletenessCheck";

// Re-export types for existing consumers
export type { LineGap, LineCompletenessResult };

interface SolutionsLine {
  id: string;
  line_name: string;
  min_speed?: number;
  max_speed?: number;
  line_description?: string;
  product_description?: string;
  photos_url?: string;
  number_of_products?: number;
  number_of_artworks?: number;
}

export function useLineCompleteness(
  lines: SolutionsLine[],
  solutionsProjectId: string
) {
  const [results, setResults] = useState<Record<string, LineCompletenessResult>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lines.length === 0) return;
    checkAllLines();
  }, [lines, solutionsProjectId]);

  const checkAllLines = async () => {
    setLoading(true);
    try {
      const solutionTypeMap = await getSolutionTypeMap(solutionsProjectId);
      const resultsMap: Record<string, LineCompletenessResult> = {};

      await Promise.all(
        lines.map(async (line) => {
          const result = await checkLineCompleteness(line, solutionTypeMap);
          resultsMap[line.id] = result;
        })
      );

      setResults(resultsMap);
    } catch (error) {
      console.error("Error checking line completeness:", error);
    } finally {
      setLoading(false);
    }
  };

  return { results, loading, refresh: checkAllLines };
}
