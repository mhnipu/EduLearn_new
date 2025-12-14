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
} from 'lucide-react';
import { format } from 'date-fns';

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

        const { data: assignedCoursesData } = await supabase
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
          *,
          courses (
            id,
            title
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by teacher's courses if teacher
      if (role === 'teacher') {
        const { data: teacherCourses } = await supabase
          .from('teacher_course_assignments')
          .select('course_id')
          .eq('teacher_id', user?.id);

        const { data: createdCourses } = await supabase
          .from('courses')
          .select('id')
          .eq('created_by', user?.id);

        const courseIds = [
          ...(teacherCourses?.map(tc => tc.course_id) || []),
          ...(createdCourses?.map(c => c.id) || [])
        ];

        if (courseIds.length > 0) {
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

      if (assignmentsRes.data) {
        // Fetch submission counts
        const assignmentIds = assignmentsRes.data.map((a) => a.id);
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
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e3b1e8a7-7650-401d-8383-a5f7a7ee6da4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssignmentManagement.tsx:155',message:'handleSubmit entry',data:{title,dueDate,dueTime,maxScore,assessmentType,courseId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

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

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/e3b1e8a7-7650-401d-8383-a5f7a7ee6da4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AssignmentManagement.tsx:175',message:'payload before save',data:{dueDateISO,maxScoreNum,assessmentType,courseId:courseId||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

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
        created_by: user!.id,
      };

      if (editingAssignment) {
        const { error } = await supabase
          .from('assignments')
          .update(payload)
          .eq('id', editingAssignment.id);
        if (error) throw error;
        toast({ title: 'Assignment updated successfully' });
      } else {
        const { error } = await supabase.from('assignments').insert(payload);
        if (error) throw error;
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
              <h1 className="text-2xl font-bold text-foreground">Assignment Management</h1>
              <p className="text-muted-foreground">Create and manage assignments for students</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                New Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingAssignment ? 'Edit Assignment' : 'Create Assignment'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    Active (visible to students)
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No assignments created yet.</p>
              <Button className="mt-4" onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Assignment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {assignments.map((assignment) => (
              <Card key={assignment.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">{assignment.title}</h3>
                        <Badge variant={assignment.is_active ? 'default' : 'secondary'}>
                          {assignment.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {assignment.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {assignment.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {assignment.assessment_type || 'assignment'}
                        </Badge>
                        {assignment.course_title && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {assignment.course_title}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        {assignment.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {format(new Date(assignment.due_date), 'MMM d, yyyy h:mm a')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Max: {assignment.max_score || 100} pts
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {assignment.submission_count || 0} submissions
                        </span>
                      </div>
                      {assignment.guidelines && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                          <strong>Guidelines:</strong> {assignment.guidelines}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/assignments/${assignment.id}/submissions`)}
                      >
                        View Submissions
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(assignment)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteAssignment(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
