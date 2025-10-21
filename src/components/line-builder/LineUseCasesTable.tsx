import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface LineUseCasesTableProps {
  lineId: string;
}

interface UseCaseData {
  camera_name: string;
  equipment_name: string;
  position_name: string;
  use_case_name: string;
  use_case_category: string;
  use_case_description?: string;
  camera_description?: string;
}

export const LineUseCasesTable: React.FC<LineUseCasesTableProps> = ({ lineId }) => {
  const [useCases, setUseCases] = useState<UseCaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLineUseCases();
  }, [lineId]);

  const fetchLineUseCases = async () => {
    try {
      setLoading(true);

      // Determine if this is a solutions line or regular line
      const { data: lineCheck } = await supabase
        .from('solutions_lines')
        .select('id')
        .eq('id', lineId)
        .maybeSingle();

      const isSolutionsLine = !!lineCheck;

      // Fetch all cameras with their use cases for this line
      const { data: equipmentData, error } = isSolutionsLine
        ? await supabase
            .from('equipment')
            .select(`
              id,
              name,
              position_id,
              cameras!inner (
                id,
                camera_type,
                camera_use_cases (
                  id,
                  description,
                  vision_use_case_id,
                  vision_use_cases_master (
                    id,
                    name,
                    category,
                    description
                  )
                )
              )
            `)
            .eq('solutions_line_id', lineId)
        : await supabase
            .from('equipment')
            .select(`
              id,
              name,
              position_id,
              cameras!inner (
                id,
                camera_type,
                camera_use_cases (
                  id,
                  description,
                  vision_use_case_id,
                  vision_use_cases_master (
                    id,
                    name,
                    category,
                    description
                  )
                )
              )
            `)
            .eq('line_id', lineId);


      if (error) throw error;

      // Transform the data into a flat structure
      const useCasesData: UseCaseData[] = [];

      equipmentData?.forEach((equipment: any) => {
        equipment.cameras?.forEach((camera: any) => {
          camera.camera_use_cases?.forEach((cameraUseCase: any) => {
            const visionUseCase = cameraUseCase.vision_use_cases_master;
            if (visionUseCase) {
              useCasesData.push({
                camera_name: camera.camera_type || 'Unknown Camera',
                equipment_name: equipment.name,
                position_name: 'Equipment Position', // Simplified since positions table not accessible
                use_case_name: visionUseCase.name,
                use_case_category: visionUseCase.category || 'Uncategorized',
                use_case_description: visionUseCase.description,
                camera_description: cameraUseCase.description,
              });
            }
          });
        });
      });

      setUseCases(useCasesData);
    } catch (error) {
      console.error('Error fetching line use cases:', error);
      toast({
        title: "Error",
        description: "Failed to fetch line use cases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Group use cases by category
  const useCasesByCategory = useCases.reduce((acc, useCase) => {
    const category = useCase.use_case_category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(useCase);
    return acc;
  }, {} as Record<string, UseCaseData[]>);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (useCases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vision Use Cases</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No vision use cases configured for this line
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vision Use Cases ({useCases.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {Object.entries(useCasesByCategory).map(([category, categoryUseCases]) => (
          <div key={category} className="mb-6 last:mb-0">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Badge variant="outline">{category}</Badge>
              <span className="text-sm text-muted-foreground">({categoryUseCases.length})</span>
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Use Case</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Camera</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryUseCases.map((useCase, index) => (
                  <TableRow key={`${useCase.use_case_name}-${index}`}>
                    <TableCell className="font-medium">{useCase.use_case_name}</TableCell>
                    <TableCell>{useCase.position_name}</TableCell>
                    <TableCell>{useCase.equipment_name}</TableCell>
                    <TableCell>{useCase.camera_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {useCase.camera_description || useCase.use_case_description || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
