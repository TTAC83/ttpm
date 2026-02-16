import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Pencil, Cable } from 'lucide-react';
import { FactoryGroup, GroupLine } from './hooks/useFactoryConfig';
import { Badge } from '@/components/ui/badge';

interface Props {
  group: FactoryGroup;
  lines: GroupLine[];
  onUpdateGroup: (id: string, name: string) => Promise<void>;
  onAddLine: (groupId: string, name: string, solutionType: 'vision' | 'iot' | 'both') => Promise<void>;
  onUpdateLine: (id: string, updates: Partial<Pick<GroupLine, 'name' | 'solution_type'>>) => Promise<void>;
  onDeleteLine: (id: string) => Promise<void>;
}

const SOLUTION_COLORS: Record<string, string> = {
  vision: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  iot: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  both: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export const GroupLevel: React.FC<Props> = ({
  group, lines,
  onUpdateGroup, onAddLine, onUpdateLine, onDeleteLine,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [addingLine, setAddingLine] = useState(false);
  const [newLine, setNewLine] = useState({ name: '', solution_type: 'vision' as 'vision' | 'iot' | 'both' });
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  const groupLines = lines.filter(l => l.group_id === group.id);

  const handleSaveName = async () => {
    if (groupName.trim()) {
      await onUpdateGroup(group.id, groupName.trim());
      setEditingName(false);
    }
  };

  const handleAddLine = async () => {
    if (!newLine.name.trim()) return;
    await onAddLine(group.id, newLine.name.trim(), newLine.solution_type);
    setNewLine({ name: '', solution_type: 'vision' });
    setAddingLine(false);
  };

  return (
    <div className="space-y-6">
      {/* Group Name */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Group Details</CardTitle>
            {!editingName && (
              <Button variant="ghost" size="sm" onClick={() => setEditingName(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingName ? (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Group Name *</Label>
                <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} autoFocus />
              </div>
              <Button size="sm" onClick={handleSaveName}>Save</Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditingName(false); setGroupName(group.name); }}>Cancel</Button>
            </div>
          ) : (
            <p className="font-medium">{group.name}</p>
          )}
        </CardContent>
      </Card>

      {/* Lines */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Lines</h3>
          {!addingLine && (
            <Button variant="outline" size="sm" onClick={() => setAddingLine(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Line
            </Button>
          )}
        </div>

        {addingLine && (
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3 space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Line Name *</Label>
                  <Input
                    value={newLine.name}
                    onChange={(e) => setNewLine(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Line 1"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLine()}
                  />
                </div>
                <div className="w-36 space-y-1.5">
                  <Label className="text-xs">Solution Type *</Label>
                  <Select value={newLine.solution_type} onValueChange={(v) => setNewLine(prev => ({ ...prev, solution_type: v as 'vision' | 'iot' | 'both' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vision">Vision</SelectItem>
                      <SelectItem value="iot">IoT</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddLine} disabled={!newLine.name.trim()}>Add Line</Button>
                <Button variant="ghost" size="sm" onClick={() => { setAddingLine(false); setNewLine({ name: '', solution_type: 'vision' }); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {groupLines.length === 0 && !addingLine && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Cable className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No lines added yet</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-2">
          {groupLines.map((line) => (
            <Card key={line.id} className="group">
              <CardContent className="py-3 px-4">
                {editingLineId === line.id ? (
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Input
                        defaultValue={line.name}
                        autoFocus
                        onBlur={(e) => {
                          if (e.target.value.trim() && e.target.value !== line.name) {
                            onUpdateLine(line.id, { name: e.target.value.trim() });
                          }
                          setEditingLineId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          if (e.key === 'Escape') setEditingLineId(null);
                        }}
                      />
                    </div>
                    <Select
                      defaultValue={line.solution_type}
                      onValueChange={(v) => onUpdateLine(line.id, { solution_type: v as 'vision' | 'iot' | 'both' })}
                    >
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vision">Vision</SelectItem>
                        <SelectItem value="iot">IoT</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Cable className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium text-sm">{line.name}</p>
                      <Badge className={`text-xs ${SOLUTION_COLORS[line.solution_type]}`}>
                        {line.solution_type === 'both' ? 'Vision + IoT' : line.solution_type === 'vision' ? 'Vision' : 'IoT'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingLineId(line.id)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDeleteLine(line.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
