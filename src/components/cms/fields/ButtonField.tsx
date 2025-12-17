import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ButtonFieldProps {
  label: string;
  value: { text: string; link: string };
  onChange: (value: { text: string; link: string }) => void;
  required?: boolean;
  disabled?: boolean;
}

export function ButtonField({
  label,
  value,
  onChange,
  required,
  disabled,
}: ButtonFieldProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Text</Label>
          <Input
            value={value?.text || ''}
            onChange={(e) => onChange({ ...value, text: e.target.value })}
            placeholder="Button text"
            required={required}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Link</Label>
          <Input
            value={value?.link || ''}
            onChange={(e) => onChange({ ...value, link: e.target.value })}
            placeholder="/path"
            required={required}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
