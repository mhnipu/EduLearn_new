import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface TextareaFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
}

export function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
  rows = 3,
}: TextareaFieldProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
      />
    </div>
  );
}
