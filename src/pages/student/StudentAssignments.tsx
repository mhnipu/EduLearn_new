import { useEffect, useState, useMemo } from 'react';
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
  Download,
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import { BackButton } from '@/components/BackButton';
import { cn } from '@/lib/utils';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_score: number | null;
  is_active: boolean | null;
  attachment_url?: string | null;
  created_at?: string;
  assessment_type?: string | null;
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
      // Fetch active assignments, sorted by created_at (newest first) for initial load
      // Client-side sorting will prioritize by status
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

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
        if (!fileExt) {
          throw new Error('File must have an extension');
        }
        
        const fileName = `submissions/${user!.id}/${submittingTo.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('library-files')
          .upload(fileName, attachmentFile, { upsert: true });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

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

  // Sort assignments: prioritize by status (overdue > pending > submitted), then by due_date, then by created_at (newest first)
  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => {
      const submissionA = submissions[a.id];
      const submissionB = submissions[b.id];
      const isGradedA = !!submissionA?.graded_at;
      const isGradedB = !!submissionB?.graded_at;
      const isSubmittedA = !!submissionA && !isGradedA;
      const isSubmittedB = !!submissionB && !isGradedB;
      const isOverdueA = a.due_date && isPast(new Date(a.due_date)) && !isGradedA;
      const isOverdueB = b.due_date && isPast(new Date(b.due_date)) && !isGradedB;

      // Priority: Overdue > Pending > Submitted > Completed
      if (isOverdueA && !isOverdueB) return -1;
      if (!isOverdueA && isOverdueB) return 1;
      if (!isGradedA && isGradedB) return -1;
      if (isGradedA && !isGradedB) return 1;
      if (!isSubmittedA && isSubmittedB) return -1;
      if (isSubmittedA && !isSubmittedB) return 1;

      // For same status, sort by due_date (earliest first), then by created_at (newest first)
      if (a.due_date && b.due_date) {
        const dueDateA = new Date(a.due_date).getTime();
        const dueDateB = new Date(b.due_date).getTime();
        if (dueDateA !== dueDateB) return dueDateA - dueDateB;
      } else if (a.due_date) return -1;
      else if (b.due_date) return 1;

      // Finally, sort by created_at (newest first) - this ensures latest assignments show first
      const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return createdB - createdA;
    });
  }, [assignments, submissions]);

  const pendingAssignments = sortedAssignments.filter((a) => !submissions[a.id]?.graded_at);
  const completedAssignments = sortedAssignments.filter((a) => submissions[a.id]?.graded_at);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const AssignmentCard = ({ assignment }: { assignment: Assignment }) => {
    const submission = submissions[assignment.id];
    const isOverdue = assignment.due_date && isPast(new Date(assignment.due_date)) && !submission?.graded_at;
    const isGraded = !!submission?.graded_at;
    const isSubmitted = !!submission && !isGraded;
    const daysUntilDue = assignment.due_date 
      ? Math.ceil((new Date(assignment.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <Card className={cn(
        "group hover:shadow-xl transition-all duration-300 border-orange-200 dark:border-orange-800",
        isOverdue && "border-destructive/50 hover:border-destructive",
        isGraded && "border-green-500/30 hover:border-green-500/50",
        !isGraded && !isOverdue && "hover:border-orange-500 dark:hover:border-orange-500"
      )}>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "h-11 w-11 rounded-xl flex items-center justify-center transition-all shrink-0",
                    isOverdue && "bg-destructive/10 group-hover:bg-destructive/20",
                    isGraded && "bg-green-500/10 group-hover:bg-green-500/20",
                    !isGraded && !isOverdue && "bg-primary/10 group-hover:bg-primary/20"
                  )}>
                    <FileText className={cn(
                      "h-5 w-5 transition-colors",
                      isOverdue && "text-destructive",
                      isGraded && "text-green-600 dark:text-green-400",
                      !isGraded && !isOverdue && "text-orange-600 dark:text-orange-400"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-bold text-lg text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {assignment.title}
                      </h3>
                      {assignment.assessment_type && (
                        <Badge variant="outline" className="text-xs font-medium">
                          {assignment.assessment_type}
                        </Badge>
                      )}
                    </div>
                    {assignment.description && (
                      <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                        {assignment.description}
                      </p>
                    )}
                    {assignment.created_at && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 font-medium">
                        Posted {format(new Date(assignment.created_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {isGraded ? (
                  <Badge className="bg-green-500 hover:bg-green-600 text-white font-semibold shadow-md">
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                    {submission.score}/{assignment.max_score}
                  </Badge>
                ) : isSubmitted ? (
                  <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-md">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    Submitted
                  </Badge>
                ) : isOverdue ? (
                  <Badge variant="destructive" className="font-semibold shadow-md">
                    <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                    Overdue
                  </Badge>
                ) : (
                  <Badge className="bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-md">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    Pending
                  </Badge>
                )}
                {daysUntilDue !== null && daysUntilDue >= 0 && !isGraded && (
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded-md",
                    daysUntilDue === 0 && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
                    daysUntilDue > 0 && daysUntilDue <= 3 && "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
                    daysUntilDue > 3 && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  )}>
                    {daysUntilDue === 0 ? 'Due today' : `${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''} left`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs pl-14">
              {assignment.due_date && (
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors",
                  isOverdue 
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700"
                )}>
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Due: {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700 font-medium">
                <FileText className="h-3.5 w-3.5" />
                <span>Max: {assignment.max_score || 0} pts</span>
              </div>
              {submission?.submitted_at && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Submitted: {format(new Date(submission.submitted_at), 'MMM d, h:mm a')}</span>
                </div>
              )}
            </div>

            {assignment.attachment_url && (
              <div className="flex items-center gap-2.5 p-3 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors border border-orange-200 dark:border-orange-800">
                <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                <a
                  href={assignment.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:underline flex items-center gap-1.5 font-medium"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Assignment File
                </a>
              </div>
            )}

            {isGraded && submission.feedback && (
              <div className="border-l-4 border-orange-500 dark:border-orange-400 pl-4 bg-orange-50 dark:bg-orange-900/20 py-3 rounded-r-lg">
                <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1.5 uppercase tracking-wide">Feedback:</p>
                <p className="text-sm text-foreground leading-relaxed">{submission.feedback}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              {!isGraded && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => openSubmitDialog(assignment)}
                  className="bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border-orange-300 dark:border-orange-700 hover:border-orange-500 dark:hover:border-orange-500 text-orange-700 dark:text-orange-300 font-semibold transition-all"
                >
                  {isSubmitted ? (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Update Submission
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Assignment
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
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton 
              fallbackPath="/dashboard/student"
              fallbackLabel="Back to Student Dashboard"
              size="icon"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                My Assignments
              </h1>
              <p className="text-orange-600 dark:text-orange-400 mt-1 font-medium">View and submit your assignments</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-medium">
              {pendingAssignments.length} Pending
            </Badge>
            <Badge variant="outline" className="font-medium text-green-600 dark:text-green-400 border-green-500/50">
              {completedAssignments.length} Completed
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-orange-100 dark:bg-orange-900/30 p-1 rounded-lg border border-orange-200 dark:border-orange-800">
          <TabsTrigger 
            value="pending" 
            className="text-orange-700 dark:text-orange-300 data-[state=active]:bg-orange-600 dark:data-[state=active]:bg-orange-500 data-[state=active]:text-white font-semibold transition-all"
          >
            <Clock className="h-4 w-4 mr-2" />
            Pending ({pendingAssignments.length})
          </TabsTrigger>
          <TabsTrigger 
            value="completed"
            className="text-orange-700 dark:text-orange-300 data-[state=active]:bg-orange-600 dark:data-[state=active]:bg-orange-500 data-[state=active]:text-white font-semibold transition-all"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Completed ({completedAssignments.length})
          </TabsTrigger>
        </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-6">
            {pendingAssignments.length === 0 ? (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardContent className="py-16 text-center bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Pending Assignments!</h3>
                  <p className="text-orange-700 dark:text-orange-300 font-medium">You're all caught up. Great work!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingAssignments.map((a) => <AssignmentCard key={a.id} assignment={a} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-6">
            {completedAssignments.length === 0 ? (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardContent className="py-16 text-center bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                    <FileText className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Completed Assignments</h3>
                  <p className="text-orange-700 dark:text-orange-300 font-medium">Complete your pending assignments to see them here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedAssignments.map((a) => <AssignmentCard key={a.id} assignment={a} />)}
              </div>
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
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-foreground leading-relaxed">{submittingTo.description}</p>
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
                  accept=".pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  maxSizeMB={20}
                  selectedFile={attachmentFile}
                  onFileSelect={setAttachmentFile}
                  onClear={() => setAttachmentFile(null)}
                  label="Upload file"
                  description="PDF, Word, PowerPoint (Max 20MB)"
                  onValidationError={(error) => {
                    toast({ title: error, variant: 'destructive' });
                  }}
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
