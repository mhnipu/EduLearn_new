import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Send, Loader2 } from 'lucide-react';

interface PublishButtonProps {
  onPublish: () => Promise<void>;
  disabled?: boolean;
  hasDraft?: boolean;
}

export function PublishButton({ onPublish, disabled, hasDraft }: PublishButtonProps) {
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await onPublish();
    } finally {
      setIsPublishing(false);
    }
  };

  if (!hasDraft) {
    return (
      <Button disabled variant="outline">
        No draft to publish
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={disabled || isPublishing} className="gap-2">
          {isPublishing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Publish
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publish Section?</AlertDialogTitle>
          <AlertDialogDescription>
            This will publish the current draft and make it visible on the landing page.
            A version snapshot will be created automatically.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? 'Publishing...' : 'Publish'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
