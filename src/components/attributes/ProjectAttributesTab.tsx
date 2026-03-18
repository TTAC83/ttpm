import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Plus, Link2, Unlink, Check, ChevronsUpDown, Pencil, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AttributeDialog, type AttributeFormData } from '@/components/attributes/AttributeDialog';
import { DATA_TYPES, getUnitOptions } from '@/components/attributes/attributeConfig';

interface ProjectAttribute {
  id: string;
  master_attribute_id: string;
  notes: string | null;
  master: {
    id: string;
    name: string;
    data_type: string;
    unit_of_measure: string | null;
    validation_type: string;
  };
}

interface MasterAttribute {
  id: string;
  name: string;
  data_type: string;
  unit_of_measure: string | null;
  validation_type: string;
}

interface Props {
  projectId: string;
  onCompletenessChange?: () => void;
}

export function ProjectAttributesTab({ projectId, onCompletenessChange }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ProjectAttribute[]>([]);
  const [allMaster, setAllMaster] = useState<MasterAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkOpen, setLinkOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesVal, setEditingNotesVal] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [paRes, maRes] = await Promise.all([
      supabase
        .from('project_attributes')
        .select('id, master_attribute_id, notes')
        .eq('solutions_project_id', projectId),
      supabase
        .from('master_attributes')
        .select('id, name, data_type, unit_of_measure, validation_type')
        .order('name'),
    ]);

    const masterList: MasterAttribute[] = (maRes.data || []) as MasterAttribute[];
    setAllMaster(masterList);

    const masterMap = Object.fromEntries(masterList.map(m => [m.id, m]));
    const linked: ProjectAttribute[] = ((paRes.data || []) as any[]).map(pa => ({
      id: pa.id,
      master_attribute_id: pa.master_attribute_id,
      notes: pa.notes,
      master: masterMap[pa.master_attribute_id] || { id: pa.master_attribute_id, name: 'Unknown', data_type: '', unit_of_measure: null, validation_type: '' },
    }));
    setRows(linked);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const linkedIds = new Set(rows.map(r => r.master_attribute_id));
  const unlinked = allMaster.filter(m => !linkedIds.has(m.id));

  const handleLink = async (masterId: string) => {
    const { error } = await supabase
      .from('project_attributes')
      .insert({ solutions_project_id: projectId, master_attribute_id: masterId } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Linked', description: 'Attribute linked to project' });
      fetchData();
      onCompletenessChange?.();
    }
    setLinkOpen(false);
  };

  const handleUnlink = async (id: string) => {
    const { error } = await supabase.from('project_attributes').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Unlinked', description: 'Attribute removed from project' });
      fetchData();
      onCompletenessChange?.();
    }
  };

  const handleSaveNotes = async (id: string) => {
    const { error } = await supabase
      .from('project_attributes')
      .update({ notes: editingNotesVal || null } as any)
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
    setEditingNotesId(null);
    fetchData();
  };

  const handleAddNew = async (data: AttributeFormData) => {
    const payload = {
      name: data.name.trim(),
      data_type: data.data_type,
      unit_of_measure: data.unit_of_measure || null,
      validation_type: data.validation_type,
      default_value: null,
      min_value: null,
      max_value: null,
      apply_min_max_date: data.apply_min_max_date,
    };
    const { data: inserted, error } = await supabase.from('master_attributes').insert(payload).select('id').single();
    if (error) throw error;

    // Link to project
    await supabase
      .from('project_attributes')
      .insert({ solutions_project_id: projectId, master_attribute_id: inserted.id } as any);

    toast({ title: 'Created & Linked', description: 'New attribute created and linked to project' });
    fetchData();
    onCompletenessChange?.();
  };

  const getDataTypeLabel = (v: string) => DATA_TYPES.find(dt => dt.value === v)?.label || v;
  const getUnitLabel = (dt: string, u: string | null) => {
    if (!u) return '-';
    return getUnitOptions(dt).find(o => o.value === u)?.label || u;
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading attributes…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Project Attributes</h3>
          <p className="text-sm text-muted-foreground">Link existing master attributes or create new ones for this project</p>
        </div>
        <div className="flex gap-2">
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={unlinked.length === 0}>
                <Link2 className="mr-2 h-4 w-4" />
                Link Existing
                <ChevronsUpDown className="ml-2 h-3 w-3 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput placeholder="Search attributes…" />
                <CommandList>
                  <CommandEmpty>No unlinked attributes</CommandEmpty>
                  <CommandGroup>
                    {unlinked.map(m => (
                      <CommandItem key={m.id} value={m.name} onSelect={() => handleLink(m.id)}>
                        <Check className="mr-2 h-4 w-4 opacity-0" />
                        <span>{m.name}</span>
                        <Badge variant="secondary" className="ml-auto text-[10px]">{getDataTypeLabel(m.data_type)}</Badge>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">No attributes linked to this project yet</p>
          <p className="text-sm text-muted-foreground mt-1">Link existing attributes or create new ones above</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Data Type</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Validation</TableHead>
                <TableHead>Project Notes</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.master.name}</TableCell>
                  <TableCell><Badge variant="secondary">{getDataTypeLabel(row.master.data_type)}</Badge></TableCell>
                  <TableCell>{getUnitLabel(row.master.data_type, row.master.unit_of_measure)}</TableCell>
                  <TableCell>{row.master.validation_type === 'single_value' ? 'Single Value' : row.master.validation_type === 'range' ? 'Range' : 'Multiple Values'}</TableCell>
                  <TableCell>
                    {editingNotesId === row.id ? (
                      <div className="flex gap-1 items-center">
                        <Textarea
                          value={editingNotesVal}
                          onChange={e => setEditingNotesVal(e.target.value)}
                          className="min-h-[60px] text-sm"
                          autoFocus
                        />
                        <div className="flex flex-col gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveNotes(row.id)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingNotesId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="text-sm text-left w-full hover:bg-muted/50 rounded px-1 py-0.5 cursor-pointer"
                        onClick={() => { setEditingNotesId(row.id); setEditingNotesVal(row.notes || ''); }}
                      >
                        {row.notes || <span className="text-muted-foreground italic">Click to add notes…</span>}
                      </button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleUnlink(row.id)} title="Unlink attribute">
                      <Unlink className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AttributeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={handleAddNew}
      />
    </div>
  );
}
