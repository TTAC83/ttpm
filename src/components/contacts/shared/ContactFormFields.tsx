import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ContactFormData {
  name: string;
  phone: string;
  notes: string;
}

interface ContactFormFieldsProps {
  formData: ContactFormData;
  onChange: (data: ContactFormData) => void;
  disabled?: boolean;
}

export function ContactFormFields({ formData, onChange, disabled }: ContactFormFieldsProps) {
  const updateField = (field: keyof ContactFormData, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="John Doe"
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            placeholder="+44 7700 900000"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Additional notes about this contact..."
          rows={3}
          disabled={disabled}
        />
      </div>
    </>
  );
}
