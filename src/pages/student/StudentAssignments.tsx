import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { FileDropzone } from '@/components/library/FileDropzone';
import {
  ArrowLeft,
  Loader2,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  Upload,
  Send,
  AlertCircle,
} from 'lucide-react';
import { format, isPast } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_score: number | null;
  is_active: boolean | null;
}

interface Submission {
  id: string;
  assignment_id: string;
  submission_text: string | null;
  attachment_url: string | null;
  submitted_at: string;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
}

export default function StudentAssignments() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [submittingTo, setSubmittingTo] = useState<Assignment | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch active assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('is_active', true)
        .order('due_date', { ascending: true });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Fetch user's submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', user!.id);

      if (submissionsError) throw submissionsError;

      const subMap: Record<string, Submission> = {};
      submissionsData?.forEach((s) => {
        subMap[s.assignment_id] = s;
      });
      setSubmissions(subMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading assignments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openSubmitDialog = (assignment: Assignment) => {
    const existing = submissions[assignment.id];
    setSubmittingTo(assignment);
    setSubmissionText(existing?.submission_text || '');
    setAttachmentFile(null);
  };

  const handleSubmit = async () => {
    if (!submittingTo || (!submissionText.trim() && !attachmentFile)) {
      toast({ title: 'Please provide a response or attachment', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      let attachmentUrl = submissions[submittingTo.id]?.attachment_url || null;

      // Upload attachment if provided
      if (attachmentFile) {
        const fileExt = attachmentFile.name.split('.').pop();
        const fileName = `submissions/${user!.id}/${submittingTo.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('library-files')
          .upload(fileName, attachmentFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('library-files')
          .getPublicUrl(fileName);

        attachmentUrl = urlData?.publicUrl || null;
      }

      const existing = submissions[submittingTo.id];

      if (existing) {
        // Update existing submission
        const { error } = await supabase
          .from('assignment_submissions')
          .update({
            submission_text: submissionText.trim() || null,
            attachment_url: attachmentUrl,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
        toast({ title: 'Submission updated successfully' });
      } else {
        // Create new submission
        const { error } = await supabase.from('assignment_submissions').insert({
          assignment_id: submittingTo.id,
          student_id: user!.id,
          submission_text: submissionText.trim() || null,
          attachment_url: attachmentUrl,
        });

        if (error) throw error;
        toast({ title: 'Assignment submitted successfully' });
      }

      setSubmittingTo(null);
      setSubmissionText('');
      setAttachmentFile(null);
      fetchData();
    } catch (error) {
      console.error('Error submitting:', error);
      toast({ title: 'Error submitting assignment', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const pendingAssignments = assignments.filter((a) => !submissions[a.id]?.graded_at);
  const completedAssignments = assignments.filter((a) => submissions[a.id]?.graded_at);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const AssignmentCard = ({ assignment }: { assignment: Assignment }) => {
    const submission = submissions[assignment.id];
    const isOverdue = assignment.due_date && isPast(new Date(assignment.due_date));
    const isGraded = !!submission?.graded_at;
    const isSubmitted = !!submission;

    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{assignment.title}</h3>
                {assignment.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {assignment.description}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                {isGraded ? (
                  <Badge variant="default">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {submission.score}/{assignment.max_score}
                  </Badge>
                ) : isSubmitted ? (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Submitted
                  </Badge>
                ) : isOverdue ? (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Overdue
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {assignment.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Due: {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}
                </span>
              )}
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Max: {assignment.max_score} pts
              </span>
            </div>

            {isGraded && submission.feedback && (
              <div className="border-l-2 border-primary pl-3 bg-muted/30 py-2 rounded-r">
                <p className="text-xs font-medium text-muted-foreground mb-1">Feedback:</p>
                <p className="text-sm text-foreground">{submission.feedback}</p>
              </div>
            )}

            <div className="flex justify-end">
              {!isGraded && (
                <Button variant="outline" size="sm" onClick={() => openSubmitDialog(assignment)}>
                  {isSubmitted ? (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Update Submission
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/student')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Assignments</h1>
            <p className="text-muted-foreground">View and submit your assignments</p>
          </div>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingAssignments.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedAssignments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingAssignments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending assignments!</p>
                </CardContent>
              </Card>
            ) : (
              pendingAssignments.map((a) => <AssignmentCard key={a.id} assignment={a} />)
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedAssignments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No completed assignments yet.</p>
                </CardContent>
              </Card>
            ) : (
              completedAssignments.map((a) => <AssignmentCard key={a.id} assignment={a} />)
            )}
          </TabsContent>
        </Tabs>

        {/* Submit Dialog */}
        <Dialog open={!!submittingTo} onOpenChange={(open) => !open && setSubmittingTo(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{submittingTo?.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {submittingTo?.description && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">{submittingTo.description}</p>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="response">Your Response</Label>
                <Textarea
                  id="response"
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Write your response here..."
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Attachment (optional)</Label>
                <FileDropzone
                  accept="*"
                  maxSizeMB={20}
                  selectedFile={attachmentFile}
                  onFileSelect={setAttachmentFile}
                  onClear={() => setAttachmentFile(null)}
                  label="Upload file"
                  description="Max 20MB"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSubmittingTo(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Submit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
