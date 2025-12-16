import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';

interface RubricCriterion {
  id: string;
  criterion_name: string;
  description: string | null;
  max_points: number;
  order_index: number;
}

interface RubricScore {
  criterion_id: string;
  points_awarded: number;
  feedback: string;
}

interface RubricGradingProps {
  assignmentId: string;
  submissionId: string;
  onScoreUpdate?: (totalScore: number) => void;
}

export function RubricGrading({ assignmentId, submissionId, onScoreUpdate }: RubricGradingProps) {
  const { toast } = useToast();
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [scores, setScores] = useState<Record<string, RubricScore>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCriteria();
    loadScores();
  }, [assignmentId, submissionId]);

  const loadCriteria = async () => {
    try {
      const { data, error } = await supabase
        .from('rubric_criteria')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('order_index');

      if (error) throw error;
      setCriteria(data || []);
    } catch (error) {
      console.error('Error loading criteria:', error);
      toast({ title: 'Error loading rubric criteria', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadScores = async () => {
    try {
      const { data, error } = await supabase
        .from('rubric_scores')
        .select('*')
        .eq('submission_id', submissionId);

      if (error) throw error;

      const scoresMap: Record<string, RubricScore> = {};
      data?.forEach(score => {
        scoresMap[score.criterion_id] = {
          criterion_id: score.criterion_id,
          points_awarded: score.points_awarded,
          feedback: score.feedback || '',
        };
      });
      setScores(scoresMap);
      calculateTotalScore(scoresMap);
    } catch (error) {
      console.error('Error loading scores:', error);
    }
  };

  const calculateTotalScore = (currentScores: Record<string, RubricScore>) => {
    const total = criteria.reduce((sum, criterion) => {
      const score = currentScores[criterion.id];
      return sum + (score?.points_awarded || 0);
    }, 0);
    onScoreUpdate?.(total);
  };

  const handleScoreChange = (criterionId: string, points: number, feedback: string) => {
    const maxPoints = criteria.find(c => c.id === criterionId)?.max_points || 0;
    const clampedPoints = Math.max(0, Math.min(points, maxPoints));

    const newScores = {
      ...scores,
      [criterionId]: {
        criterion_id: criterionId,
        points_awarded: clampedPoints,
        feedback,
      },
    };
    setScores(newScores);
    calculateTotalScore(newScores);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { user } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save/update each score
      for (const criterion of criteria) {
        const score = scores[criterion.id];
        if (score) {
          const { error } = await supabase
            .from('rubric_scores')
            .upsert({
              submission_id: submissionId,
              criterion_id: criterion.id,
              points_awarded: score.points_awarded,
              feedback: score.feedback || null,
              graded_by: user.id,
            }, {
              onConflict: 'submission_id,criterion_id',
            });

          if (error) throw error;
        }
      }

      // Update assignment submission total score
      const totalScore = criteria.reduce((sum, criterion) => {
        const score = scores[criterion.id];
        return sum + (score?.points_awarded || 0);
      }, 0);

      const { error: updateError } = await supabase
        .from('assignment_submissions')
        .update({ score: totalScore })
        .eq('id', submissionId);

      if (updateError) throw updateError;

      toast({ title: 'Rubric scores saved successfully' });
      onScoreUpdate?.(totalScore);
    } catch (error) {
      console.error('Error saving rubric scores:', error);
      toast({ title: 'Error saving rubric scores', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (criteria.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No rubric criteria defined for this assignment.</p>
          <p className="text-sm mt-2">Create rubric criteria in assignment settings.</p>
        </CardContent>
      </Card>
    );
  }

  const totalMaxPoints = criteria.reduce((sum, c) => sum + c.max_points, 0);
  const totalAwarded = criteria.reduce((sum, c) => {
    const score = scores[c.id];
    return sum + (score?.points_awarded || 0);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Rubric-Based Grading</CardTitle>
          <Badge variant="outline">
            {totalAwarded} / {totalMaxPoints} points
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {criteria.map((criterion, index) => {
          const score = scores[criterion.id];
          const pointsAwarded = score?.points_awarded || 0;
          const feedback = score?.feedback || '';

          return (
            <div key={criterion.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">
                      {index + 1}. {criterion.criterion_name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {criterion.max_points} pts max
                    </Badge>
                  </div>
                  {criterion.description && (
                    <p className="text-sm text-muted-foreground">{criterion.description}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`points-${criterion.id}`}>
                    Points Awarded (0 - {criterion.max_points})
                  </Label>
                  <Input
                    id={`points-${criterion.id}`}
                    type="number"
                    min="0"
                    max={criterion.max_points}
                    value={pointsAwarded}
                    onChange={(e) => {
                      const points = parseInt(e.target.value) || 0;
                      handleScoreChange(criterion.id, points, feedback);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Progress</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${(pointsAwarded / criterion.max_points) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {Math.round((pointsAwarded / criterion.max_points) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`feedback-${criterion.id}`}>Feedback (Optional)</Label>
                <Textarea
                  id={`feedback-${criterion.id}`}
                  value={feedback}
                  onChange={(e) => {
                    handleScoreChange(criterion.id, pointsAwarded, e.target.value);
                  }}
                  placeholder="Provide specific feedback for this criterion..."
                  rows={2}
                />
              </div>
            </div>
          );
        })}

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Rubric Scores
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
