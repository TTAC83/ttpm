import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

export interface ProductFormData {
  product_code: string;
  product_name: string;
  master_artwork_url: string;
  comments: string;
  factory_ids: string[];
  group_ids: string[];
  line_ids: string[];
}

interface FactoryItem { id: string; name: string; }
interface GroupItem { id: string; name: string; factory_id: string; }
interface LineItem { id: string; name: string; group_id: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  initialData?: ProductFormData | null;
  factories: FactoryItem[];
  groups: GroupItem[];
  lines: LineItem[];
}

export function ProductDialog({ open, onOpenChange, onSubmit, initialData, factories, groups, lines }: Props) {
  const [saving, setSaving] = useState(false);
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [artworkUrl, setArtworkUrl] = useState('');
  const [comments, setComments] = useState('');
  const [selectedFactories, setSelectedFactories] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedLines, setSelectedLines] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setProductCode(initialData?.product_code || '');
      setProductName(initialData?.product_name || '');
      setArtworkUrl(initialData?.master_artwork_url || '');
      setComments(initialData?.comments || '');
      setSelectedFactories(initialData?.factory_ids || []);
      setSelectedGroups(initialData?.group_ids || []);
      setSelectedLines(initialData?.line_ids || []);
    }
  }, [open, initialData]);

  // Filter groups by selected factories
  const filteredGroups = groups.filter(g => selectedFactories.includes(g.factory_id));
  // Filter lines by selected groups
  const filteredLines = lines.filter(l => selectedGroups.includes(l.group_id));

  // Clean up selections when parent changes
  useEffect(() => {
    setSelectedGroups(prev => prev.filter(gId => filteredGroups.some(g => g.id === gId)));
  }, [selectedFactories.join(',')]);

  useEffect(() => {
    setSelectedLines(prev => prev.filter(lId => filteredLines.some(l => l.id === lId)));
  }, [selectedGroups.join(',')]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSubmit({
        product_code: productCode.trim(),
        product_name: productName.trim(),
        master_artwork_url: artworkUrl.trim(),
        comments: comments.trim(),
        factory_ids: selectedFactories,
        group_ids: selectedGroups,
        line_ids: selectedLines,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const toggle = (list: string[], id: string, setter: (v: string[]) => void) => {
    setter(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Update product details and factory assignments' : 'Add a new product to this project'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Product Code *</Label>
              <Input value={productCode} onChange={e => setProductCode(e.target.value)} placeholder="e.g. SKU-001" />
            </div>
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Orange Juice 1L" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Master Artwork URL</Label>
            <Input value={artworkUrl} onChange={e => setArtworkUrl(e.target.value)} placeholder="https://..." />
            {artworkUrl && (
              <div className="mt-2 border rounded-lg p-2 inline-block">
                <img src={artworkUrl} alt="Artwork preview" className="max-h-24 rounded" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Comments</Label>
            <Textarea value={comments} onChange={e => setComments(e.target.value)} placeholder="Optional comments" />
          </div>

          {/* Factory multi-select */}
          <div className="space-y-2">
            <Label>Factories</Label>
            {factories.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No factories configured</p>
            ) : (
              <div className="border rounded-lg max-h-32 overflow-y-auto p-2 space-y-1">
                {factories.map(f => (
                  <label key={f.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={selectedFactories.includes(f.id)} onCheckedChange={() => toggle(selectedFactories, f.id, setSelectedFactories)} />
                    <span className="text-sm">{f.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Group multi-select (filtered) */}
          {filteredGroups.length > 0 && (
            <div className="space-y-2">
              <Label>Groups</Label>
              <div className="border rounded-lg max-h-32 overflow-y-auto p-2 space-y-1">
                {filteredGroups.map(g => (
                  <label key={g.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={selectedGroups.includes(g.id)} onCheckedChange={() => toggle(selectedGroups, g.id, setSelectedGroups)} />
                    <span className="text-sm">{g.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Line multi-select (filtered) */}
          {filteredLines.length > 0 && (
            <div className="space-y-2">
              <Label>Lines</Label>
              <div className="border rounded-lg max-h-32 overflow-y-auto p-2 space-y-1">
                {filteredLines.map(l => (
                  <label key={l.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/50 cursor-pointer">
                    <Checkbox checked={selectedLines.includes(l.id)} onCheckedChange={() => toggle(selectedLines, l.id, setSelectedLines)} />
                    <span className="text-sm">{l.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !productCode.trim() || !productName.trim()}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
