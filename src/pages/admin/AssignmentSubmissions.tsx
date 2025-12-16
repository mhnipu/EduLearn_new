import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Loader2,
  User,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  Download,
  MessageSquare,
} from 'lucide-react';
import { format } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_score: number | null;
}

interface Submission {
  id: string;
  student_id: string;
  submission_text: string | null;
  attachment_url: string | null;
  submitted_at: string;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
  student_name?: string;
}

export default function AssignmentSubmissions() {
  const { assignmentId } = useParams();
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const canGrade = role === 'admin' || role === 'super_admin' || role === 'teacher';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (assignmentId && user && canGrade) {
      fetchData();
    }
  }, [assignmentId, user, canGrade]);

  const fetchData = async () => {
    try {
      // Fetch assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('id, title, description, due_date, max_score')
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      setAssignment(assignmentData);

      // Fetch submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('submitted_at', { ascending: false });

      if (submissionsError) throw submissionsError;

      // Fetch student names
      if (submissionsData && submissionsData.length > 0) {
        const studentIds = [...new Set(submissionsData.map((s) => s.student_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', studentIds);

        const nameMap: Record<string, string> = {};
        profiles?.forEach((p) => {
          nameMap[p.id] = p.full_name || 'Unknown';
        });

        setSubmissions(
          submissionsData.map((s) => ({
            ...s,
            student_name: nameMap[s.student_id] || 'Unknown',
          }))
        );
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading submissions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openGradeDialog = (submission: Submission) => {
    setGradingSubmission(submission);
    setScore(submission.score || 0);
    setFeedback(submission.feedback || '');
  };

  const handleGrade = async () => {
    if (!gradingSubmission) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('assignment_submissions')
        .update({
          score,
          feedback: feedback.trim() || null,
          graded_at: new Date().toISOString(),
          graded_by: user!.id,
        })
        .eq('id', gradingSubmission.id);

      if (error) throw error;

      toast({ title: 'Submission graded successfully' });
      setGradingSubmission(null);
      fetchData();
    } catch (error) {
      console.error('Error grading:', error);
      toast({ title: 'Error grading submission', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canGrade) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/assignments')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{assignment?.title}</h1>
            <p className="text-muted-foreground">
              {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
              {assignment?.due_date && (
                <> · Due: {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}</>
              )}
            </p>
          </div>
        </div>

        {assignment?.description && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{assignment.description}</p>
            </CardContent>
          </Card>
        )}

        {submissions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No submissions yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {submissions.map((submission) => (
              <Card key={submission.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{submission.student_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Submitted: {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>
                        {submission.graded_at ? (
                          <Badge variant="default" className="ml-auto">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Graded: {submission.score}/{assignment?.max_score}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="ml-auto">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>

                      {submission.submission_text && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {submission.submission_text}
                          </p>
                        </div>
                      )}

                      {submission.attachment_url && (
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                          <FileText className="h-4 w-4 text-primary" />
                          <a
                            href={submission.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            <Download className="h-4 w-4" />
                            Download Student Submission
                          </a>
                        </div>
                      )}

                      {submission.feedback && (
                        <div className="border-l-2 border-primary pl-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Feedback:</p>
                          <p className="text-sm text-foreground">{submission.feedback}</p>
                        </div>
                      )}
                    </div>

                    <Button variant="outline" size="sm" onClick={() => openGradeDialog(submission)}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {submission.graded_at ? 'Update Grade' : 'Grade'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Grading Dialog */}
        <Dialog open={!!gradingSubmission} onOpenChange={(open) => !open && setGradingSubmission(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grade Submission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Student</Label>
                <p className="text-sm text-foreground">{gradingSubmission?.student_name}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="score">Score (out of {assignment?.max_score})</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max={assignment?.max_score || 100}
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback to the student..."
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setGradingSubmission(null)}>
                  Cancel
                </Button>
                <Button onClick={handleGrade} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Grade
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
