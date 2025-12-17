import { Button } from '@/components/ui/button';
import { Eye, Edit } from 'lucide-react';

interface PreviewToggleProps {
  previewMode: boolean;
  onToggle: (preview: boolean) => void;
  disabled?: boolean;
}

export function PreviewToggle({ previewMode, onToggle, disabled }: PreviewToggleProps) {
  return (
    <Button
      type="button"
      variant={previewMode ? 'default' : 'outline'}
      onClick={() => onToggle(!previewMode)}
      disabled={disabled}
      className="gap-2"
    >
      {previewMode ? (
        <>
          <Edit className="h-4 w-4" />
          Edit Mode
        </>
      ) : (
        <>
          <Eye className="h-4 w-4" />
          Preview Mode
        </>
      )}
    </Button>
  );
}
