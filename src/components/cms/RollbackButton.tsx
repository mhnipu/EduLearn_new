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
import { RotateCcw, Loader2 } from 'lucide-react';
import { VersionService } from '@/lib/cms/versionService';
import { useToast } from '@/hooks/use-toast';

interface RollbackButtonProps {
  sectionId: string;
  versionId: string;
  versionNumber: number;
  onRollbackComplete?: () => void;
  disabled?: boolean;
}

export function RollbackButton({
  sectionId,
  versionId,
  versionNumber,
  onRollbackComplete,
  disabled,
}: RollbackButtonProps) {
  const [isRollingBack, setIsRollingBack] = useState(false);
  const { toast } = useToast();

  const handleRollback = async () => {
    setIsRollingBack(true);
    try {
      // Get current user ID (you'll need to pass this or get from auth context)
      const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      await VersionService.rollbackToVersion(sectionId, versionId, user.id);
      
      toast({
        title: 'Rollback successful',
        description: `Section restored to version ${versionNumber}`,
      });

      if (onRollbackComplete) {
        onRollbackComplete();
      }
    } catch (error: any) {
      console.error('Rollback error:', error);
      toast({
        title: 'Rollback failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isRollingBack}
          className="gap-2"
        >
          {isRollingBack ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Rolling back...
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4" />
              Rollback
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rollback to Version {versionNumber}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a new draft from this version. Your current draft will be replaced.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleRollback} disabled={isRollingBack}>
            {isRollingBack ? 'Rolling back...' : 'Rollback'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
