import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { AlertCircle, CheckCircle2, Loader2, FileWarning } from 'lucide-react';
import type { ImportParseResult, ImportConflict, ImportValidationError } from '@/lib/productBulkService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ImportParseResult | null;
  onApply: (result: ImportParseResult) => Promise<void>;
}

export function ProductImportReviewDialog({ open, onOpenChange, result, onApply }: Props) {
  const [applying, setApplying] = useState(false);

  if (!result) return null;

  const { conflicts, errors, summary } = result;
  const hasErrors = errors.length > 0;
  const hasConflicts = conflicts.length > 0;

  const toggleConflict = (id: string, accepted: boolean) => {
    const c = conflicts.find(c => c.id === id);
    if (c) c.accepted = accepted;
  };

  const setAllAccepted = (type: ImportConflict['type'], accepted: boolean) => {
    for (const c of conflicts) {
      if (c.type === type) c.accepted = accepted;
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await onApply(result);
      onOpenChange(false);
    } finally {
      setApplying(false);
    }
  };

  const conflictsByType = {
    product: conflicts.filter(c => c.type === 'product'),
    vision_project: conflicts.filter(c => c.type === 'vision_project'),
    view: conflicts.filter(c => c.type === 'view'),
    view_attribute: conflicts.filter(c => c.type === 'view_attribute'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Review</DialogTitle>
          <DialogDescription>Review changes before applying. Accept or reject individual updates.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <SummaryRow label="New Products" count={summary.newProducts} />
              <SummaryRow label="Updated Products" count={summary.updatedProducts} />
              <SummaryRow label="New Vision Projects" count={summary.newVPs} />
              <SummaryRow label="Updated Vision Projects" count={summary.updatedVPs} />
              <SummaryRow label="New Views" count={summary.newViews} />
              <SummaryRow label="Updated Views" count={summary.updatedViews} />
              <SummaryRow label="New Attributes" count={summary.newAttrs} />
              <SummaryRow label="Updated Attributes" count={summary.updatedAttrs} />
            </div>

            {/* Errors */}
            {hasErrors && (
              <div className="border border-destructive/30 rounded-lg p-3 bg-destructive/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-sm text-destructive">{errors.length} Validation Error{errors.length > 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {errors.map((e, i) => (
                    <p key={i} className="text-xs text-destructive">
                      <span className="font-mono">{e.sheet} Row {e.row}</span>: {e.message}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Conflicts */}
            {hasConflicts && (
              <Accordion type="multiple" defaultValue={Object.keys(conflictsByType).filter(k => (conflictsByType as any)[k].length > 0)}>
                {renderConflictSection('product', 'Products', conflictsByType.product, toggleConflict, setAllAccepted)}
                {renderConflictSection('vision_project', 'Vision Projects', conflictsByType.vision_project, toggleConflict, setAllAccepted)}
                {renderConflictSection('view', 'Views', conflictsByType.view, toggleConflict, setAllAccepted)}
                {renderConflictSection('view_attribute', 'View Attributes', conflictsByType.view_attribute, toggleConflict, setAllAccepted)}
              </Accordion>
            )}

            {!hasErrors && !hasConflicts && (
              <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm">No conflicts found — all changes are new inserts</span>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>Cancel</Button>
          <Button onClick={handleApply} disabled={applying || hasErrors}>
            {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 rounded bg-muted/30">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant={count > 0 ? 'secondary' : 'outline'} className="text-xs">{count}</Badge>
    </div>
  );
}

function renderConflictSection(
  type: ImportConflict['type'],
  title: string,
  items: ImportConflict[],
  toggle: (id: string, accepted: boolean) => void,
  setAll: (type: ImportConflict['type'], accepted: boolean) => void,
) {
  if (items.length === 0) return null;

  return (
    <AccordionItem value={type} key={type}>
      <AccordionTrigger className="text-sm">
        <div className="flex items-center gap-2">
          <FileWarning className="h-4 w-4 text-amber-500" />
          {title}
          <Badge variant="outline" className="text-xs">{items.length}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex gap-2 mb-2">
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setAll(type, true)}>Accept All</Button>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setAll(type, false)}>Reject All</Button>
        </div>
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>New</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(c => (
                <ConflictRow key={c.id} conflict={c} onToggle={toggle} />
              ))}
            </TableBody>
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function ConflictRow({ conflict, onToggle }: { conflict: ImportConflict; onToggle: (id: string, accepted: boolean) => void }) {
  const [accepted, setAccepted] = useState(conflict.accepted);

  const handleToggle = (val: boolean) => {
    setAccepted(val);
    onToggle(conflict.id, val);
  };

  return (
    <TableRow className={accepted ? '' : 'opacity-50'}>
      <TableCell>
        <Checkbox checked={accepted} onCheckedChange={handleToggle} />
      </TableCell>
      <TableCell className="text-xs font-mono">{conflict.identifier}</TableCell>
      <TableCell className="text-xs">{conflict.field}</TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">{conflict.currentValue || '—'}</TableCell>
      <TableCell className="text-xs font-medium max-w-[120px] truncate">{conflict.newValue || '—'}</TableCell>
    </TableRow>
  );
}
