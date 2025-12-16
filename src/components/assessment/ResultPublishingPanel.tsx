import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  publishAssignmentResult,
  publishAllAssignmentResults,
  publishQuizResult,
  publishAllQuizResults,
  getAssignmentResultStatusSummary,
  getQuizResultStatusSummary,
  type ResultStatus,
} from '@/lib/resultPublishing';
import { Loader2, Send, Eye, EyeOff, CheckCircle } from 'lucide-react';

interface ResultPublishingPanelProps {
  type: 'assignment' | 'quiz';
  assessmentId: string;
  submissionId?: string; // For single submission publish
  onPublished?: () => void;
}

export function ResultPublishingPanel({
  type,
  assessmentId,
  submissionId,
  onPublished,
}: ResultPublishingPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [statusSummary, setStatusSummary] = useState({
    draft: 0,
    reviewed: 0,
    published: 0,
    total: 0,
  });

  useEffect(() => {
    loadStatusSummary();
  }, [type, assessmentId]);

  const loadStatusSummary = async () => {
    const summary = type === 'assignment'
      ? await getAssignmentResultStatusSummary(assessmentId)
      : await getQuizResultStatusSummary(assessmentId);
    setStatusSummary(summary);
  };

  const handlePublish = async (status: ResultStatus, publishAll = false) => {
    setLoading(true);
    try {
      let success = false;
      let count = 0;

      if (publishAll) {
        const result = type === 'assignment'
          ? await publishAllAssignmentResults(assessmentId, status)
          : await publishAllQuizResults(assessmentId, status);
        success = result.success > 0;
        count = result.success;
      } else if (submissionId) {
        success = type === 'assignment'
          ? await publishAssignmentResult(submissionId, status)
          : await publishQuizResult(submissionId, status);
        count = success ? 1 : 0;
      }

      if (success) {
        toast({
          title: 'Results published',
          description: publishAll
            ? `${count} result${count !== 1 ? 's' : ''} published successfully`
            : 'Result published successfully',
        });
        await loadStatusSummary();
        onPublished?.();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to publish results',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error publishing results:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while publishing results',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500';
      case 'reviewed':
        return 'bg-blue-500';
      case 'draft':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Result Publishing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Summary */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-2xl font-bold">{statusSummary.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-2xl font-bold">{statusSummary.draft}</div>
            <div className="text-xs text-muted-foreground">Draft</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-2xl font-bold">{statusSummary.reviewed}</div>
            <div className="text-xs text-muted-foreground">Reviewed</div>
          </div>
          <div className="text-center p-2 bg-muted rounded">
            <div className="text-2xl font-bold">{statusSummary.published}</div>
            <div className="text-xs text-muted-foreground">Published</div>
          </div>
        </div>

        {/* Publish Actions */}
        <div className="space-y-2">
          {submissionId ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePublish('reviewed', false)}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                Mark as Reviewed
              </Button>
              <Button
                size="sm"
                onClick={() => handlePublish('published', false)}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Publish to Student
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePublish('reviewed', true)}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                Mark All as Reviewed
              </Button>
              <Button
                size="sm"
                onClick={() => handlePublish('published', true)}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Publish All to Students
              </Button>
            </>
          )}
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p>• Draft: Results are not visible to students</p>
          <p>• Reviewed: Results are reviewed but not yet published</p>
          <p>• Published: Results are visible to students</p>
        </div>
      </CardContent>
    </Card>
  );
}
