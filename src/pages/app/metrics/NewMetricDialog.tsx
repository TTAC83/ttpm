import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { metricsService, type MetricCategory, type MetricDirection } from "@/lib/metricsService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const CATEGORIES: MetricCategory[] = ['financial', 'operational', 'customer', 'people', 'quality', 'other'];
const DIRECTIONS: { value: MetricDirection; label: string }[] = [
  { value: 'higher_is_better', label: 'Higher is better' },
  { value: 'lower_is_better', label: 'Lower is better' },
  { value: 'on_target', label: 'On target (±tolerance)' },
];

export function NewMetricDialog({ open, onOpenChange, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MetricCategory>('operational');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('');
  const [unit, setUnit] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [direction, setDirection] = useState<MetricDirection>('higher_is_better');
  const [tolerance, setTolerance] = useState('0');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      await metricsService.createMetric({
        title: title.trim(),
        category,
        description: description.trim() || null,
        owner: owner.trim() || null,
        unit: unit.trim() || null,
        target_value: targetValue ? Number(targetValue) : null,
        direction,
        tolerance: tolerance ? Number(tolerance) : 0,
      });
      toast.success('Metric created');
      onCreated?.();
      onOpenChange(false);
      setTitle(''); setDescription(''); setOwner(''); setUnit(''); setTargetValue(''); setTolerance('0');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to create metric');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New Metric</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly Recurring Revenue" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as MetricCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Owner</Label>
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Name" />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Target</Label>
              <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="£, %, hrs" />
            </div>
            <div>
              <Label>Tolerance</Label>
              <Input type="number" value={tolerance} onChange={(e) => setTolerance(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Direction</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as MetricDirection)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIRECTIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
