import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Plus, Trash2, ChevronRight, Layers, Clock, Pencil } from 'lucide-react';
import { Factory, Shift, FactoryGroup, GroupLine } from './hooks/useFactoryConfig';
import { Badge } from '@/components/ui/badge';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface Props {
  factory: Factory;
  shifts: Shift[];
  groups: FactoryGroup[];
  lines: GroupLine[];
  onUpdateFactory: (id: string, name: string) => Promise<void>;
  onAddShift: (factoryId: string, shift: Omit<Shift, 'id' | 'factory_id'>) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
  onAddGroup: (factoryId: string, name: string) => Promise<void>;
  onDeleteGroup: (id: string) => Promise<void>;
  onSelectGroup: (group: FactoryGroup) => void;
}

export const FactoryLevel: React.FC<Props> = ({
  factory, shifts, groups, lines,
  onUpdateFactory, onAddShift, onDeleteShift,
  onAddGroup, onDeleteGroup, onSelectGroup,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [factoryName, setFactoryName] = useState(factory.name);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [addingShift, setAddingShift] = useState(false);
  const [newShift, setNewShift] = useState({ days: [0] as number[], shift_name: '', start_time: '06:00', end_time: '14:00' });

  const factoryShifts = shifts.filter(s => s.factory_id === factory.id);
  const factoryGroups = groups.filter(g => g.factory_id === factory.id);

  const handleSaveName = async () => {
    if (factoryName.trim()) {
      await onUpdateFactory(factory.id, factoryName.trim());
      setEditingName(false);
    }
  };

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    await onAddGroup(factory.id, newGroupName.trim());
    setNewGroupName('');
    setAddingGroup(false);
  };

  const handleAddShift = async () => {
    if (!newShift.shift_name.trim() || newShift.days.length === 0) return;
    for (const day of newShift.days) {
      await onAddShift(factory.id, { day_of_week: day, shift_name: newShift.shift_name, start_time: newShift.start_time, end_time: newShift.end_time });
    }
    setNewShift({ days: [0], shift_name: '', start_time: '06:00', end_time: '14:00' });
    setAddingShift(false);
  };

  const getGroupLineCount = (groupId: string) => lines.filter(l => l.group_id === groupId).length;

  // Group shifts by day
  const shiftsByDay = DAYS.map((day, idx) => ({
    day,
    dayIndex: idx,
    shifts: factoryShifts.filter(s => s.day_of_week === idx),
  }));

  return (
    <div className="space-y-6">
      {/* Factory Name */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Factory Details</CardTitle>
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
                <Label className="text-xs">Factory Name *</Label>
                <Input value={factoryName} onChange={(e) => setFactoryName(e.target.value)} autoFocus />
              </div>
              <Button size="sm" onClick={handleSaveName}>Save</Button>
              <Button variant="ghost" size="sm" onClick={() => { setEditingName(false); setFactoryName(factory.name); }}>Cancel</Button>
            </div>
          ) : (
            <p className="font-medium">{factory.name}</p>
          )}
        </CardContent>
      </Card>

      {/* Shift Pattern */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Shift Pattern
            </CardTitle>
            {!addingShift && (
              <Button variant="outline" size="sm" onClick={() => setAddingShift(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Shift
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {addingShift && (
            <div className="border rounded-md p-3 mb-4 space-y-3 border-dashed">
              <div className="space-y-1.5">
                <Label className="text-xs">Days *</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d, i) => {
                    const isSelected = newShift.days.includes(i);
                    return (
                      <Button
                        key={i}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => setNewShift(prev => ({
                          ...prev,
                          days: isSelected
                            ? prev.days.filter(day => day !== i)
                            : [...prev.days, i],
                        }))}
                      >
                        {d.slice(0, 3)}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Shift Name *</Label>
                  <Input value={newShift.shift_name} onChange={(e) => setNewShift(prev => ({ ...prev, shift_name: e.target.value }))} placeholder="e.g. Day" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Start Time</Label>
                  <Input type="time" value={newShift.start_time} onChange={(e) => setNewShift(prev => ({ ...prev, start_time: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">End Time</Label>
                  <Input type="time" value={newShift.end_time} onChange={(e) => setNewShift(prev => ({ ...prev, end_time: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddShift} disabled={!newShift.shift_name.trim() || newShift.days.length === 0}>Add Shift</Button>
                <Button variant="ghost" size="sm" onClick={() => setAddingShift(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {factoryShifts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No shift pattern configured</p>
          ) : (
            <div className="space-y-2">
              {shiftsByDay.filter(d => d.shifts.length > 0).map(({ day, shifts: dayShifts }) => (
                <div key={day} className="flex items-start gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-20 pt-1.5 shrink-0">{day}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {dayShifts.map(s => (
                      <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
                        {s.shift_name} ({s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)})
                        <button onClick={() => onDeleteShift(s.id)} className="ml-0.5 hover:text-destructive">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Groups */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Groups</h3>
          {!addingGroup && (
            <Button variant="outline" size="sm" onClick={() => setAddingGroup(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Group
            </Button>
          )}
        </div>

        {addingGroup && (
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs">Group Name *</Label>
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Packing Hall"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                  />
                </div>
                <Button size="sm" onClick={handleAddGroup} disabled={!newGroupName.trim()}>Add</Button>
                <Button variant="ghost" size="sm" onClick={() => { setAddingGroup(false); setNewGroupName(''); }}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {factoryGroups.length === 0 && !addingGroup && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Layers className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No groups added yet</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-2">
          {factoryGroups.map((group) => {
            const lineCount = getGroupLineCount(group.id);
            return (
              <Card
                key={group.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors group"
                onClick={() => onSelectGroup(group)}
              >
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{group.name}</p>
                      <Badge variant="outline" className="text-xs mt-0.5">{lineCount} line{lineCount !== 1 ? 's' : ''}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); onDeleteGroup(group.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
