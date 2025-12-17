import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface BooleanFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  required?: boolean;
  disabled?: boolean;
}

export function BooleanField({
  label,
  value,
  onChange,
  required,
  disabled,
}: BooleanFieldProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch
        checked={value || false}
        onCheckedChange={onChange}
        disabled={disabled}
      />
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
    </div>
  );
}
