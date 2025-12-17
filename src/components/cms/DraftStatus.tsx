import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface DraftStatusProps {
  status: 'saving' | 'saved' | 'error' | 'unsaved';
  hasUnsavedChanges?: boolean;
}

export function DraftStatus({ status, hasUnsavedChanges }: DraftStatusProps) {
  if (status === 'saving') {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving...
      </Badge>
    );
  }

  if (status === 'saved') {
    return (
      <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Saved
      </Badge>
    );
  }

  if (status === 'error') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Error
      </Badge>
    );
  }

  if (hasUnsavedChanges) {
    return (
      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-600">
        Unsaved changes
      </Badge>
    );
  }

  return null;
}
