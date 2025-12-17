import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Calendar,
  FileText,
  Users,
  CheckCircle,
  Clock,
  Settings,
  AlertCircle,
  ListChecks,
  Download,
  Search,
  Filter,
  TrendingUp,
  Award,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { FileDropzone } from '@/components/library/FileDropzone';

interface Assignment {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_score: number | null;
  is_active: boolean | null;
  created_at: string;
  category_id: string | null;
  course_id: string | null;
  assessment_type: string | null;
  guidelines: string | null;
  late_submission_allowed: boolean | null;
  late_penalty_per_day: number | null;
  attachment_url: string | null;
  submission_count?: number;
  course_title?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Course {
  id: string;
  title: string;
}

const ASSESSMENT_TYPES = [
  { value: 'assignment', label: 'Assignment' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'exam', label: 'Exam' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'project', label: 'Project' },
] as const;

export default function AssignmentManagement() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [guidelines, setGuidelines] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [maxScore, setMaxScore] = useState<string>('100');
  const [categoryId, setCategoryId] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [assessmentType, setAssessmentType] = useState<string>('assignment');
  const [isActive, setIsActive] = useState(true);
  const [lateSubmissionAllowed, setLateSubmissionAllowed] = useState(true);
  const [latePenaltyPerDay, setLatePenaltyPerDay] = useState<string>('0');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCourse, setFilterCourse] = useState<string>('all');

  const canManage = role === 'admin' || role === 'super_admin' || role === 'teacher';

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && canManage) {
      fetchData();
      fetchCourses();
    }
  }, [user, canManage]);

  const fetchCourses = async () => {
    try {
      if (role === 'teacher') {
        // Fetch teacher's assigned courses
        const { data: createdCourses } = await supabase
          .from('courses')
          .select('id, title')
          .eq('created_by', user?.id)
          .order('title');

        // teacher_course_assignments table exists but types may not be up to date
        const { data: assignedCoursesData } = await (supabase as any)
          .from('teacher_course_assignments')
          .select(`
            course_id,
            courses (
              id,
              title
            )
          `)
          .eq('teacher_id', user?.id);

        const assignedCourses = (assignedCoursesData || [])
          .map((ac: any) => ac.courses)
          .filter(Boolean);

        const allCoursesMap = new Map<string, Course>();
        (createdCourses || []).forEach(c => allCoursesMap.set(c.id, c));
        assignedCourses.forEach((c: Course) => {
          if (!allCoursesMap.has(c.id)) {
            allCoursesMap.set(c.id, c);
          }
        });

        setCourses(Array.from(allCoursesMap.values()));
      } else {
        // Admins can see all courses
        const { data: allCourses } = await supabase
          .from('courses')
          .select('id, title')
          .order('title');
        if (allCourses) setCourses(allCourses);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchData = async () => {
    try {
      let assignmentsQuery = supabase
        .from('assignments')
        .select(`
          id,
          title,
          description,
          due_date,
          max_score,
          is_active,
          created_at,
          category_id,
          course_id,
          assessment_type,
          guidelines,
          late_submission_allowed,
          late_penalty_per_day,
          attachment_url,
          courses (
            id,
            title
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by teacher's courses if teacher
      if (role === 'teacher') {
        // teacher_course_assignments table exists but types may not be up to date
        const { data: teacherCourses } = await (supabase as any)
          .from('teacher_course_assignments')
          .select('course_id')
          .eq('teacher_id', user?.id);

        const { data: createdCourses } = await supabase
          .from('courses')
          .select('id')
          .eq('created_by', user?.id);

        const courseIds = [
          ...(teacherCourses?.map((tc: any) => tc.course_id) || []),
          ...(createdCourses?.map((c: any) => c.id) || [])
        ];

        if (courseIds.length > 0) {
          // @ts-expect-error - Supabase type complexity with nested queries
          assignmentsQuery = assignmentsQuery.in('course_id', courseIds);
        } else {
          // Teacher has no courses, show only their own assignments
          assignmentsQuery = assignmentsQuery.eq('created_by', user?.id);
        }
      }

      const [assignmentsRes, categoriesRes] = await Promise.all([
        assignmentsQuery,
        supabase.from('categories').select('id, name').order('name'),
      ]);

      if (assignmentsRes.data && !assignmentsRes.error) {
        // Fetch submission counts
        const assignmentIds = (assignmentsRes.data as any[]).map((a: any) => a.id);
        const { data: submissions } = await supabase
          .from('assignment_submissions')
          .select('assignment_id')
          .in('assignment_id', assignmentIds);

        const countMap: Record<string, number> = {};
        submissions?.forEach((s) => {
          countMap[s.assignment_id] = (countMap[s.assignment_id] || 0) + 1;
        });

        setAssignments(
          assignmentsRes.data.map((a: any) => ({
            ...a,
            course_title: a.courses?.title || null,
            submission_count: countMap[a.id] || 0,
          }))
        );
      }
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading assignments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Filter assignments based on search and filters
  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = !searchQuery || 
      assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.course_title?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || assignment.assessment_type === filterType;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && assignment.is_active) ||
      (filterStatus === 'inactive' && !assignment.is_active);
    const matchesCourse = filterCourse === 'all' || assignment.course_id === filterCourse;

    return matchesSearch && matchesType && matchesStatus && matchesCourse;
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGuidelines('');
    setDueDate('');
    setDueTime('');
    setMaxScore('100');
    setCategoryId('');
    setCourseId('');
    setAssessmentType('assignment');
    setIsActive(true);
    setLateSubmissionAllowed(true);
    setLatePenaltyPerDay('0');
    setAttachmentFile(null);
    setAttachmentUrl(null);
    setEditingAssignment(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setTitle(assignment.title);
    setDescription(assignment.description || '');
    setGuidelines(assignment.guidelines || '');
    setAssessmentType(assignment.assessment_type || 'assignment');
    setCourseId(assignment.course_id || '');
    setAttachmentUrl(assignment.attachment_url || null);
    setAttachmentFile(null);
    
    // Format date and time separately
    if (assignment.due_date) {
      const date = new Date(assignment.due_date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setDueDate(`${year}-${month}-${day}`);
      
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      setDueTime(`${hours}:${minutes}`);
    } else {
      setDueDate('');
      setDueTime('');
    }
    
    setMaxScore(assignment.max_score?.toString() || '100');
    setCategoryId(assignment.category_id || '');
    setIsActive(assignment.is_active ?? true);
    setLateSubmissionAllowed(assignment.late_submission_allowed ?? true);
    setLatePenaltyPerDay(assignment.late_penalty_per_day?.toString() || '0');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Combine date and time for due_date
      let dueDateISO: string | null = null;
      if (dueDate) {
        if (dueTime) {
          // Combine date and time
          const dateTimeString = `${dueDate}T${dueTime}:00`;
          dueDateISO = new Date(dateTimeString).toISOString();
        } else {
          // Only date, set to end of day
          const dateTimeString = `${dueDate}T23:59:59`;
          dueDateISO = new Date(dateTimeString).toISOString();
        }
      }

      // Parse max_score safely
      const maxScoreNum = maxScore ? parseInt(maxScore, 10) : 100;
      if (isNaN(maxScoreNum) || maxScoreNum < 1) {
        toast({ title: 'Max Score must be a valid number greater than 0', variant: 'destructive' });
        setSaving(false);
        return;
      }

      // Parse late penalty
      const latePenaltyNum = latePenaltyPerDay ? parseInt(latePenaltyPerDay, 10) : 0;
      if (isNaN(latePenaltyNum) || latePenaltyNum < 0 || latePenaltyNum > 100) {
        toast({ title: 'Late penalty must be between 0 and 100', variant: 'destructive' });
        setSaving(false);
        return;
      }

      // Handle file upload
      let finalAttachmentUrl = attachmentUrl;
      
      // For editing, upload file before updating
      if (attachmentFile && editingAssignment) {
        const fileExt = attachmentFile.name.split('.').pop();
        if (!fileExt) {
          throw new Error('File must have an extension');
        }
        
        const fileName = `assignments/${user!.id}/${editingAssignment.id}/${Date.now()}.${fileExt}`;

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

        finalAttachmentUrl = urlData?.publicUrl || null;
      }

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        guidelines: guidelines.trim() || null,
        due_date: dueDateISO,
        max_score: maxScoreNum,
        category_id: categoryId || null,
        course_id: courseId || null,
        assessment_type: assessmentType,
        is_active: isActive,
        late_submission_allowed: lateSubmissionAllowed,
        late_penalty_per_day: latePenaltyNum,
        attachment_url: finalAttachmentUrl,
        created_by: user!.id,
      };

      let assignmentId: string;
      if (editingAssignment) {
        const { error } = await supabase
          .from('assignments')
          .update(payload)
          .eq('id', editingAssignment.id);
        if (error) throw error;
        assignmentId = editingAssignment.id;
        toast({ title: 'Assignment updated successfully' });
      } else {
        // For new assignments, create first, then upload file
        const { data, error } = await supabase.from('assignments').insert(payload).select('id').single();
        if (error) throw error;
        assignmentId = data.id;
        
        // Now upload file to assignment-specific folder
        if (attachmentFile) {
          const fileExt = attachmentFile.name.split('.').pop();
          if (!fileExt) {
            throw new Error('File must have an extension');
          }
          
          const fileName = `assignments/${user!.id}/${assignmentId}/${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('library-files')
            .upload(fileName, attachmentFile, { upsert: true });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            // Don't fail the assignment creation if upload fails, just log it
            toast({ title: 'Assignment created but file upload failed', variant: 'destructive' });
          } else {
            const { data: urlData } = supabase.storage
              .from('library-files')
              .getPublicUrl(fileName);

            if (urlData?.publicUrl) {
              // Update assignment with attachment URL
              await supabase
                .from('assignments')
                .update({ attachment_url: urlData.publicUrl })
                .eq('id', assignmentId);
            }
          }
        }
        
        toast({ title: 'Assignment created successfully' });
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast({ title: 'Error saving assignment', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const { error } = await supabase.from('assignments').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Assignment deleted' });
      fetchData();
    } catch (error) {
      console.error('Error deleting:', error);
      toast({ title: 'Error deleting assignment', variant: 'destructive' });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground">
                <FileText className="h-8 w-8 text-primary" />
                Assignment Management
              </h1>
              <p className="text-muted-foreground mt-1">Create and manage assignments for students</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 font-semibold">
                <Plus className="mr-2 h-4 w-4" />
                New Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAssignment ? 'Edit Assignment' : 'Create Assignment'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-course-detail-20 p-1">
                    <TabsTrigger 
                      value="basic"
                      className="data-[state=active]:bg-course-detail-full data-[state=active]:text-foreground font-semibold transition-all"
                    >
                      Basic Info
                    </TabsTrigger>
                    <TabsTrigger 
                      value="settings"
                      className="data-[state=active]:bg-course-detail-full data-[state=active]:text-foreground font-semibold transition-all"
                    >
                      Settings
                    </TabsTrigger>
                    <TabsTrigger 
                      value="grading"
                      className="data-[state=active]:bg-course-detail-full data-[state=active]:text-foreground font-semibold transition-all"
                    >
                      Grading
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Assignment title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Assessment Type *</Label>
                      <Select value={assessmentType} onValueChange={setAssessmentType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assessment type" />
                        </SelectTrigger>
                        <SelectContent>
                          {ASSESSMENT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Course (Optional)</Label>
                      <Select value={courseId || 'none'} onValueChange={(v) => setCourseId(v === 'none' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No specific course</SelectItem>
                          {courses.map((course) => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={categoryId || 'none'} onValueChange={(v) => setCategoryId(v === 'none' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No category</SelectItem>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Assignment instructions..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guidelines">Guidelines & Instructions</Label>
                      <Textarea
                        id="guidelines"
                        value={guidelines}
                        onChange={(e) => setGuidelines(e.target.value)}
                        placeholder="Provide detailed guidelines, instructions, and requirements for students..."
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground">
                        Clear instructions help students understand what is expected and how to participate
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dueTime">Due Time (Optional)</Label>
                        <Input
                          id="dueTime"
                          type="time"
                          value={dueTime}
                          onChange={(e) => setDueTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Attachment (Optional)</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Upload supporting files (PDF, PPT, DOC, etc.) for students to download
                      </p>
                      {attachmentUrl && !attachmentFile && (
                        <div className="mb-3 p-3 bg-course-detail-50 rounded-lg border border-course-detail/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Current attachment</span>
                            <a
                              href={attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </a>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAttachmentUrl(null)}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
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
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-4 mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-course-detail/30 rounded-lg bg-course-detail-20">
                        <div className="space-y-0.5">
                          <Label htmlFor="isActive" className="text-base font-semibold cursor-pointer">
                            Active Status
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Make this assignment visible to students
                          </p>
                        </div>
                        <Switch
                          id="isActive"
                          checked={isActive}
                          onCheckedChange={setIsActive}
                        />
                      </div>

                      <Separator />

                      <div className="space-y-4 p-4 border border-course-detail/30 rounded-lg bg-course-detail-20">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          <Label className="text-base font-semibold">Late Submission Policy</Label>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="lateAllowed" className="cursor-pointer">
                              Allow Late Submissions
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Students can submit after the due date
                            </p>
                          </div>
                          <Switch
                            id="lateAllowed"
                            checked={lateSubmissionAllowed}
                            onCheckedChange={setLateSubmissionAllowed}
                          />
                        </div>

                        {lateSubmissionAllowed && (
                          <div className="space-y-2 pt-2 border-t">
                            <Label htmlFor="latePenalty">
                              Penalty Per Day (%)
                            </Label>
                            <Input
                              id="latePenalty"
                              type="number"
                              min="0"
                              max="100"
                              value={latePenaltyPerDay}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100)) {
                                  setLatePenaltyPerDay(val);
                                }
                              }}
                              placeholder="0"
                            />
                            <p className="text-xs text-muted-foreground">
                              Percentage of score deducted per day late (0-100). 
                              Example: 5% per day means 5 points deducted from a 100-point assignment for each day late.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="grading" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxScore">Max Score</Label>
                      <Input
                        id="maxScore"
                        type="number"
                        min="1"
                        step="1"
                        value={maxScore}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
                            setMaxScore(val);
                          }
                        }}
                        placeholder="100"
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum points students can earn for this assessment
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-4 p-4 border border-course-detail/30 rounded-lg bg-course-detail-20">
                      <div className="flex items-center gap-2 mb-2">
                        <ListChecks className="h-4 w-4 text-primary" />
                        <Label className="text-base font-semibold">Rubric Criteria</Label>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create rubric criteria for detailed grading. You can add criteria after creating the assignment.
                      </p>
                      {editingAssignment && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setDialogOpen(false);
                            // Navigate to rubric management (we'll create this)
                            toast({
                              title: 'Rubric Management',
                              description: 'Rubric criteria management will be available after assignment is created.',
                            });
                          }}
                          className="bg-course-detail-50 hover:bg-course-detail-full border-course-detail/30"
                        >
                          <ListChecks className="mr-2 h-4 w-4" />
                          Manage Rubric Criteria
                        </Button>
                      )}
                      {!editingAssignment && (
                        <p className="text-xs text-muted-foreground italic">
                          Save the assignment first, then you can add rubric criteria from the assignment details page.
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <Separator />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={saving}
                    className="hover:bg-course-detail-50"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Statistics */}
        {assignments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Assignments</p>
                    <p className="text-2xl font-bold">{assignments.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-green-500">
                      {assignments.filter(a => a.is_active).length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Submissions</p>
                    <p className="text-2xl font-bold text-blue-500">
                      {assignments.reduce((acc, a) => acc + (a.submission_count || 0), 0)}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Submissions</p>
                    <p className="text-2xl font-bold text-purple-500">
                      {assignments.length > 0 
                        ? Math.round(assignments.reduce((acc, a) => acc + (a.submission_count || 0), 0) / assignments.length)
                        : 0}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        {assignments.length > 0 && (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Search Assignments
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by title, description, or course..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-11"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {ASSESSMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {courses.length > 0 && (
                <div className="mt-4">
                  <Label className="text-sm font-medium mb-2 block">Course</Label>
                  <Select value={filterCourse} onValueChange={setFilterCourse}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Assignments List */}
        {assignments.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-16 text-center bg-course-detail-20 rounded-lg">
              <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-course-detail-40 flex items-center justify-center">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Assignments Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Create your first assignment to start engaging with students
              </p>
              <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Create First Assignment
              </Button>
            </CardContent>
          </Card>
        ) : filteredAssignments.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-16 text-center bg-course-detail-20 rounded-lg">
              <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-course-detail-40 flex items-center justify-center">
                <Search className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Assignments Found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filter criteria
              </p>
              <Button variant="outline" onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setFilterStatus('all');
                setFilterCourse('all');
              }}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredAssignments.map((assignment) => (
              <Card 
                key={assignment.id} 
                className="group hover:shadow-lg transition-all border-border/50 hover:border-course-detail/30"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-4 mb-3">
                        <div className="h-12 w-12 rounded-lg bg-course-detail-50 group-hover:bg-course-detail-full flex items-center justify-center transition-colors shrink-0">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors mb-1">
                                {assignment.title}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge 
                                  className={`${
                                    assignment.is_active 
                                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                                      : 'bg-gray-500 hover:bg-gray-600 text-white'
                                  } font-semibold`}
                                >
                                  {assignment.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                <Badge variant="outline" className="bg-course-detail-50 border-course-detail/30 capitalize font-medium">
                                  {assignment.assessment_type || 'assignment'}
                                </Badge>
                                {assignment.course_title && (
                                  <Badge variant="outline" className="text-xs">
                                    <FileText className="h-3 w-3 mr-1" />
                                    {assignment.course_title}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {assignment.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {assignment.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            {assignment.due_date && (
                              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-course-detail-20">
                                <Calendar className="h-4 w-4 text-primary" />
                                <span className="font-medium text-foreground">
                                  Due: {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-course-detail-20">
                              <Award className="h-4 w-4 text-primary" />
                              <span className="font-medium text-foreground">
                                Max: {assignment.max_score || 100} pts
                              </span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-course-detail-20">
                              <Users className="h-4 w-4 text-primary" />
                              <span className="font-medium text-foreground">
                                {assignment.submission_count || 0} submissions
                              </span>
                            </div>
                            {assignment.late_submission_allowed === false && (
                              <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400">
                                <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                                No late submissions
                              </Badge>
                            )}
                            {assignment.late_submission_allowed && assignment.late_penalty_per_day && assignment.late_penalty_per_day > 0 && (
                              <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400">
                                <Clock className="h-3.5 w-3.5 mr-1.5" />
                                {assignment.late_penalty_per_day}% penalty/day
                              </Badge>
                            )}
                          </div>
                          {assignment.guidelines && (
                            <div className="mt-3 p-3 bg-course-detail-50 rounded-lg border border-course-detail/30">
                              <p className="text-xs font-semibold text-primary mb-1 uppercase tracking-wide">Guidelines:</p>
                              <p className="text-sm text-foreground leading-relaxed line-clamp-2">
                                {assignment.guidelines}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 lg:flex-col lg:items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/assignments/${assignment.id}/submissions`)}
                        className="bg-course-detail-50 hover:bg-course-detail-full border-course-detail/30 hover:border-course-detail text-foreground font-semibold transition-all"
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Submissions
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openEditDialog(assignment)}
                          className="h-9 w-9 hover:bg-course-detail-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10 h-9 w-9"
                          onClick={() => deleteAssignment(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
