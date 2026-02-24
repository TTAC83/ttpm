import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Portal, Factory, Shift, FactoryGroup, GroupLine } from './hooks/useFactoryConfig';

interface Gap {
  area: string;
  issue: string;
  location: string;
}

interface Props {
  portal: Portal | null;
  factories: Factory[];
  shifts: Shift[];
  groups: FactoryGroup[];
  lines: GroupLine[];
}

export const FactoryConfigGaps: React.FC<Props> = ({ portal, factories, shifts, groups, lines }) => {
  const gaps = useMemo<Gap[]>(() => {
    const result: Gap[] = [];

    if (!portal?.url) {
      result.push({ area: 'Portal', issue: 'No portal URL set', location: 'Global' });
    }

    if (factories.length === 0) {
      result.push({ area: 'Factories', issue: 'No factories added', location: 'Global' });
    }

    factories.forEach((f) => {
      if (!shifts.some((s) => s.factory_id === f.id)) {
        result.push({ area: 'Shifts', issue: 'No shift patterns defined', location: f.name });
      }
      if (!groups.some((g) => g.factory_id === f.id)) {
        result.push({ area: 'Groups', issue: 'No groups defined', location: f.name });
      }
    });

    groups.forEach((g) => {
      if (!lines.some((l) => l.group_id === g.id)) {
        const factory = factories.find((f) => f.id === g.factory_id);
        result.push({ area: 'Lines', issue: 'No lines defined', location: `${factory?.name ?? ''} › ${g.name}` });
      }
    });

    return result;
  }, [portal, factories, shifts, groups, lines]);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {gaps.length > 0 ? (
            <>
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Configuration Gaps
              <Badge variant="destructive" className="ml-1">{gaps.length}</Badge>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Configuration Gaps
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {gaps.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            Factory configuration is complete
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Area</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gaps.map((gap, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{gap.area}</TableCell>
                  <TableCell>{gap.issue}</TableCell>
                  <TableCell className="text-muted-foreground">{gap.location}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
