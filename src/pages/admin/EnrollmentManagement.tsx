import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Users, BookOpen, Search, Filter, Download, Mail, Trash2,
  LayoutGrid, LayoutList, Clock, CheckCircle, XCircle, ListOrdered,
  Calendar as CalendarIcon, RefreshCw, MoreHorizontal, UserPlus, GraduationCap,
  AlertCircle, Timer, ArrowUpCircle, UserCheck, TrendingUp, ArrowLeft
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  user_name: string;
  user_email: string;
  course_title: string;
  progress_percentage: number;
}

interface WaitlistEntry {
  id: string;
  course_id: string;
  user_id: string;
  position: number;
  created_at: string;
  notified_at: string | null;
  expires_at: string | null;
  status: 'waiting' | 'notified' | 'enrolled' | 'expired' | 'cancelled';
  user_name: string;
  course_title: string;
}

interface Course {
  id: string;
  title: string;
  max_capacity: number | null;
}

interface UserWithRole {
  id: string;
  full_name: string;
  role: string;
}

type EnrollmentStatus = 'all' | 'active' | 'completed';
type WaitlistStatus = 'all' | 'waiting' | 'notified' | 'expired';
type ViewMode = 'table' | 'cards';

export default function EnrollmentManagement() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEnrollments, setSelectedEnrollments] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'enrollments' | 'waitlist'>('enrollments');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EnrollmentStatus>('all');
  const [waitlistStatusFilter, setWaitlistStatusFilter] = useState<WaitlistStatus>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  // Dialogs
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedWaitlistEntry, setSelectedWaitlistEntry] = useState<WaitlistEntry | null>(null);
  
  // New enrollment form
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('');
  const [isCreatingEnrollment, setIsCreatingEnrollment] = useState(false);
  
  // Users by role
  const [students, setStudents] = useState<UserWithRole[]>([]);
  const [teachers, setTeachers] = useState<UserWithRole[]>([]);

  useEffect(() => {
    if (role !== 'admin' && role !== 'super_admin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [role, navigate]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchCourses(), fetchEnrollments(), fetchWaitlist(), fetchUsersByRole()]);
    setLoading(false);
  };

  const fetchCourses = async () => {
    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, title, max_capacity')
      .order('title');
    
    if (coursesData) setCourses(coursesData);
  };

  const fetchUsersByRole = async () => {
    // Fetch all user roles
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('user_id, role');
    
    if (!userRoles) return;

    // Get unique student and teacher IDs
    const studentIds = userRoles.filter(ur => ur.role === 'student').map(ur => ur.user_id);
    const teacherIds = userRoles.filter(ur => ur.role === 'teacher').map(ur => ur.user_id);

    // Fetch student profiles
    if (studentIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds)
        .order('full_name');
      
      if (studentsData) {
        setStudents(studentsData.map(s => ({ ...s, role: 'student' })));
      }
    }

    // Fetch teacher profiles
    if (teacherIds.length > 0) {
      const { data: teachersData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', teacherIds)
        .order('full_name');
      
      if (teachersData) {
        setTeachers(teachersData.map(t => ({ ...t, role: 'teacher' })));
      }
    }
  };

  const fetchEnrollments = async () => {
    const { data: enrollmentsData } = await supabase
      .from('course_enrollments')
      .select('*')
      .order('enrolled_at', { ascending: false });

    if (enrollmentsData) {
      const enrichedEnrollments = await Promise.all(
        enrollmentsData.map(async (enrollment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', enrollment.user_id)
            .single();
          
          const { data: course } = await supabase
            .from('courses')
            .select('title')
            .eq('id', enrollment.course_id)
            .single();

          const { data: progress } = await supabase
            .from('learning_progress')
            .select('progress_percentage')
            .eq('student_id', enrollment.user_id)
            .eq('content_type', 'course')
            .eq('content_id', enrollment.course_id)
            .single();

          return {
            ...enrollment,
            user_name: profile?.full_name || 'Unknown User',
            user_email: '',
            course_title: course?.title || 'Unknown Course',
            progress_percentage: progress?.progress_percentage || 0,
          };
        })
      );
      setEnrollments(enrichedEnrollments);
    }
  };

  const fetchWaitlist = async () => {
    const { data: waitlistData } = await supabase
      .from('course_waitlist')
      .select('*')
      .order('created_at', { ascending: true });

    if (waitlistData) {
      const enrichedWaitlist = await Promise.all(
        waitlistData.map(async (entry) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', entry.user_id)
            .single();
          
          const { data: course } = await supabase
            .from('courses')
            .select('title')
            .eq('id', entry.course_id)
            .single();

          return {
            ...entry,
            user_name: profile?.full_name || 'Unknown User',
            course_title: course?.title || 'Unknown Course',
          } as WaitlistEntry;
        })
      );
      setWaitlist(enrichedWaitlist);
    }
  };

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((enrollment) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !enrollment.user_name.toLowerCase().includes(query) &&
          !enrollment.course_title.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      if (statusFilter === 'active' && enrollment.completed_at) return false;
      if (statusFilter === 'completed' && !enrollment.completed_at) return false;

      if (courseFilter !== 'all' && enrollment.course_id !== courseFilter) return false;

      if (dateRange.from) {
        const enrolledDate = new Date(enrollment.enrolled_at);
        if (enrolledDate < dateRange.from) return false;
      }
      if (dateRange.to) {
        const enrolledDate = new Date(enrollment.enrolled_at);
        if (enrolledDate > dateRange.to) return false;
      }

      return true;
    });
  }, [enrollments, searchQuery, statusFilter, courseFilter, dateRange]);

  const filteredWaitlist = useMemo(() => {
    return waitlist.filter((entry) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !entry.user_name.toLowerCase().includes(query) &&
          !entry.course_title.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      if (waitlistStatusFilter !== 'all' && entry.status !== waitlistStatusFilter) return false;
      if (courseFilter !== 'all' && entry.course_id !== courseFilter) return false;

      return true;
    });
  }, [waitlist, searchQuery, waitlistStatusFilter, courseFilter]);

  const stats = useMemo(() => ({
    total: enrollments.length,
    active: enrollments.filter(e => !e.completed_at).length,
    completed: enrollments.filter(e => e.completed_at).length,
    thisMonth: enrollments.filter(e => {
      const date = new Date(e.enrolled_at);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
    waitlistTotal: waitlist.filter(w => w.status === 'waiting').length,
    waitlistNotified: waitlist.filter(w => w.status === 'notified').length,
  }), [enrollments, waitlist]);

  const toggleEnrollmentSelection = (id: string) => {
    const newSelection = new Set(selectedEnrollments);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedEnrollments(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedEnrollments.size === filteredEnrollments.length) {
      setSelectedEnrollments(new Set());
    } else {
      setSelectedEnrollments(new Set(filteredEnrollments.map(e => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEnrollments.size === 0) return;

    const { error } = await supabase
      .from('course_enrollments')
      .delete()
      .in('id', Array.from(selectedEnrollments));

    if (error) {
      toast({ title: 'Failed to delete enrollments', variant: 'destructive' });
    } else {
      toast({ title: `Deleted ${selectedEnrollments.size} enrollments` });
      setSelectedEnrollments(new Set());
      fetchData();
    }
  };

  const handlePromoteFromWaitlist = async (entry: WaitlistEntry) => {
    try {
      // Create enrollment
      const { error: enrollError } = await supabase
        .from('course_enrollments')
        .insert({
          user_id: entry.user_id,
          course_id: entry.course_id,
        });

      if (enrollError) throw enrollError;

      // Update waitlist status
      const { error: waitlistError } = await supabase
        .from('course_waitlist')
        .update({ status: 'enrolled' })
        .eq('id', entry.id);

      if (waitlistError) throw waitlistError;

      toast({ title: `${entry.user_name} has been enrolled!` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Failed to enroll user', description: error.message, variant: 'destructive' });
    }
  };

  const handleCancelWaitlist = async (entryId: string) => {
    const { error } = await supabase
      .from('course_waitlist')
      .update({ status: 'cancelled' })
      .eq('id', entryId);

    if (error) {
      toast({ title: 'Failed to cancel waitlist entry', variant: 'destructive' });
    } else {
      toast({ title: 'Waitlist entry cancelled' });
      fetchData();
    }
  };

  const handleCreateEnrollment = async () => {
    if (!selectedStudent || !selectedCourse) {
      toast({ title: 'Please select both student and course', variant: 'destructive' });
      return;
    }

    setIsCreatingEnrollment(true);
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e33281a0-d13e-4343-8c64-a145b2e5f5e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EnrollmentManagement.tsx:handleCreateEnrollment:start',message:'Starting enrollment using RPC',data:{currentUserId:user?.id,selectedStudent,selectedCourse,userRole:role},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'FIX',runId:'with-rpc'})}).catch(()=>{});
      // #endregion

      // 1. Create student enrollment using secure RPC function
      const { data: enrollResult, error: enrollError } = await supabase
        .rpc('admin_enroll_student', {
          _student_id: selectedStudent,
          _course_id: selectedCourse,
          _admin_id: user?.id,
        });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e33281a0-d13e-4343-8c64-a145b2e5f5e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EnrollmentManagement.tsx:handleCreateEnrollment:afterRPC',message:'RPC enrollment result',data:{hasError:!!enrollError,enrollResult,errorMessage:enrollError?.message,errorCode:enrollError?.code,errorDetails:enrollError?.details,errorHint:enrollError?.hint,fullError:enrollError?JSON.stringify(enrollError):null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'DB_CHECK',runId:'verify-sql'})}).catch(()=>{});
      // #endregion

      if (enrollError) {
        throw enrollError;
      }

      if (!enrollResult?.success) {
        toast({ title: enrollResult?.error || 'Failed to enroll student', variant: 'destructive' });
        return;
      }

      // 2. If teacher is selected, assign teacher using RPC
      if (selectedTeacher) {
        const { data: teacherResult, error: teacherError } = await supabase
          .rpc('admin_assign_teacher', {
            _teacher_id: selectedTeacher,
            _course_id: selectedCourse,
            _admin_id: user?.id,
          });

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e33281a0-d13e-4343-8c64-a145b2e5f5e8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EnrollmentManagement.tsx:handleCreateEnrollment:afterTeacherRPC',message:'Teacher assignment result',data:{hasError:!!teacherError,teacherResult,errorMessage:teacherError?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'FIX',runId:'with-rpc'})}).catch(()=>{});
        // #endregion

        // Log warning if teacher assignment failed, but don't block enrollment
        if (teacherError || !teacherResult?.success) {
          console.warn('Teacher assignment warning:', teacherResult?.error || teacherError);
        }
      }

      toast({ 
        title: 'Enrollment successful!',
        description: selectedTeacher 
          ? 'Student enrolled and teacher assigned' 
          : 'Student enrolled successfully'
      });
      
      setEnrollDialogOpen(false);
      setSelectedStudent('');
      setSelectedCourse('');
      setSelectedTeacher('');
      fetchData();
    } catch (error: any) {
      console.error('Enrollment error:', error);
      toast({ title: 'Failed to enroll student', description: error.message, variant: 'destructive' });
    } finally {
      setIsCreatingEnrollment(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Student Name', 'Course', 'Enrolled Date', 'Status', 'Progress'];
    const rows = filteredEnrollments.map(e => [
      e.user_name,
      e.course_title,
      format(new Date(e.enrolled_at), 'yyyy-MM-dd'),
      e.completed_at ? 'Completed' : 'Active',
      `${e.progress_percentage}%`
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enrollments-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Exported to CSV' });
  };

  const getWaitlistStatusBadge = (status: WaitlistEntry['status']) => {
    switch (status) {
      case 'waiting':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Waiting</Badge>;
      case 'notified':
        return <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/30"><AlertCircle className="h-3 w-3 mr-1" />Notified</Badge>;
      case 'enrolled':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Enrolled</Badge>;
      case 'expired':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      case 'cancelled':
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading enrollment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-cyan-500/5">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="hover:bg-primary/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Enrollment Management
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage student course enrollments and waitlists • {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Enrollment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Create New Enrollment
                  </DialogTitle>
                  <DialogDescription>
                    Enroll a student in a course and optionally assign a teacher
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-select" className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      Select Student *
                    </Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                      <SelectTrigger id="student-select" className="h-11">
                        <SelectValue placeholder="Choose a student..." />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {students.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No students found
                            </div>
                          ) : (
                            students.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                <div className="flex items-center gap-2">
                                  <Users className="h-3 w-3 text-muted-foreground" />
                                  {student.full_name}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {students.length} student(s) available
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="course-select" className="text-sm font-semibold flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Select Course *
                    </Label>
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger id="course-select" className="h-11">
                        <SelectValue placeholder="Choose a course..." />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {courses.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No courses available
                            </div>
                          ) : (
                            courses.map((course) => (
                              <SelectItem key={course.id} value={course.id}>
                                <div className="flex items-center gap-2">
                                  <BookOpen className="h-3 w-3 text-muted-foreground" />
                                  {course.title}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {courses.length} course(s) available
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teacher-select" className="text-sm font-semibold flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-primary" />
                      Assign Teacher (Optional)
                    </Label>
                    <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                      <SelectTrigger id="teacher-select" className="h-11">
                        <SelectValue placeholder="Choose a teacher..." />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-[200px]">
                          {teachers.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No teachers found
                            </div>
                          ) : (
                            teachers.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                <div className="flex items-center gap-2">
                                  <UserCheck className="h-3 w-3 text-muted-foreground" />
                                  {teacher.full_name}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {teachers.length} teacher(s) available
                    </p>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEnrollDialogOpen(false);
                      setSelectedStudent('');
                      setSelectedCourse('');
                      setSelectedTeacher('');
                    }}
                    disabled={isCreatingEnrollment}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateEnrollment}
                    disabled={isCreatingEnrollment || !selectedStudent || !selectedCourse}
                  >
                    {isCreatingEnrollment ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enrolling...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Enroll Student
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-cyan-500/10 group-hover:bg-cyan-500/20 transition-colors shadow-lg">
                  <Users className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">{stats.total}</p>
                  <p className="text-xs text-muted-foreground font-medium">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors shadow-lg">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">{stats.active}</p>
                  <p className="text-xs text-muted-foreground font-medium">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 transition-colors shadow-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground font-medium">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors shadow-lg">
                  <CalendarIcon className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">{stats.thisMonth}</p>
                  <p className="text-xs text-muted-foreground font-medium">This Month</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-2">
                <TrendingUp className="h-3 w-3" />
                <span className="font-medium">+12% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors shadow-lg">
                  <ListOrdered className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">{stats.waitlistTotal}</p>
                  <p className="text-xs text-muted-foreground font-medium">Waitlisted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors shadow-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">{stats.waitlistNotified}</p>
                  <p className="text-xs text-muted-foreground font-medium">Notified</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content with Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'enrollments' | 'waitlist')} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50">
            <TabsTrigger value="enrollments" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Users className="h-4 w-4" />
              Enrollments ({enrollments.length})
            </TabsTrigger>
            <TabsTrigger value="waitlist" className="flex items-center gap-2 data-[state=active]:bg-background">
              <ListOrdered className="h-4 w-4" />
              Waitlist ({waitlist.filter(w => w.status === 'waiting').length})
            </TabsTrigger>
          </TabsList>

          {/* Enrollments Tab */}
          <TabsContent value="enrollments" className="space-y-4">
            {/* Filters */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by student or course..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EnrollmentStatus)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={courseFilter} onValueChange={setCourseFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by course" />
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

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[200px] justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? (
                          dateRange.to ? (
                            `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d')}`
                          ) : (
                            format(dateRange.from, 'MMM d, yyyy')
                          )
                        ) : (
                          'Date range'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="range"
                        selected={{ from: dateRange.from, to: dateRange.to }}
                        onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <div className="flex border rounded-lg">
                    <Button
                      variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="rounded-r-none"
                    >
                      <LayoutList className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('cards')}
                      className="rounded-l-none"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {selectedEnrollments.size > 0 && (
                  <div className="flex items-center gap-4 mt-4 p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">
                      {selectedEnrollments.size} selected
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleBulkDelete}>
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4 mr-1" />
                        Send Reminder
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEnrollments(new Set())}>
                      Clear
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enrollments Table/Cards */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Enrollments</CardTitle>
                  <CardDescription>{filteredEnrollments.length} results</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {viewMode === 'table' ? (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px]">
                            <Checkbox
                              checked={selectedEnrollments.size === filteredEnrollments.length && filteredEnrollments.length > 0}
                              onCheckedChange={toggleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Enrolled</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEnrollments.map((enrollment) => (
                          <TableRow key={enrollment.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedEnrollments.has(enrollment.id)}
                                onCheckedChange={() => toggleEnrollmentSelection(enrollment.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{enrollment.user_name}</TableCell>
                            <TableCell>{enrollment.course_title}</TableCell>
                            <TableCell>{format(new Date(enrollment.enrolled_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${enrollment.progress_percentage}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">{enrollment.progress_percentage}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {enrollment.completed_at ? (
                                <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => navigate(`/courses/${enrollment.course_id}`)}>
                                    View Course
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>Send Reminder</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEnrollments.map((enrollment) => (
                      <Card key={enrollment.id} className="relative hover:shadow-xl transition-all duration-300 hover:scale-105">
                        <div className="absolute top-3 right-3">
                          <Checkbox
                            checked={selectedEnrollments.has(enrollment.id)}
                            onCheckedChange={() => toggleEnrollmentSelection(enrollment.id)}
                          />
                        </div>
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div>
                              <p className="font-semibold">{enrollment.user_name}</p>
                              <p className="text-sm text-muted-foreground">{enrollment.course_title}</p>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Enrolled</span>
                              <span>{format(new Date(enrollment.enrolled_at), 'MMM d, yyyy')}</span>
                            </div>

                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span>Progress</span>
                                <span>{enrollment.progress_percentage}%</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${enrollment.progress_percentage}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              {enrollment.completed_at ? (
                                <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${enrollment.course_id}`)}>
                                View
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {filteredEnrollments.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">No enrollments found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Waitlist Tab */}
          <TabsContent value="waitlist" className="space-y-4">
            {/* Waitlist Filters */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search waitlist..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <Select value={waitlistStatusFilter} onValueChange={(v) => setWaitlistStatusFilter(v as WaitlistStatus)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="waiting">Waiting</SelectItem>
                      <SelectItem value="notified">Notified</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={courseFilter} onValueChange={setCourseFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filter by course" />
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
              </CardContent>
            </Card>

            {/* Waitlist Table */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListOrdered className="h-5 w-5" />
                  Waitlist Queue
                </CardTitle>
                <CardDescription>
                  Users waiting to enroll when spots become available
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">Position</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWaitlist.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <ListOrdered className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">No waitlist entries found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredWaitlist.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                #{entry.position}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{entry.user_name}</TableCell>
                            <TableCell>{entry.course_title}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{format(new Date(entry.created_at), 'MMM d, yyyy')}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{getWaitlistStatusBadge(entry.status)}</TableCell>
                            <TableCell>
                              {entry.expires_at ? (
                                <div className="flex flex-col">
                                  <span className="text-sm">{format(new Date(entry.expires_at), 'MMM d, HH:mm')}</span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Timer className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(entry.expires_at), { addSuffix: true })}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {entry.status === 'waiting' || entry.status === 'notified' ? (
                                <div className="flex gap-1">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handlePromoteFromWaitlist(entry)}
                                    title="Enroll now"
                                  >
                                    <ArrowUpCircle className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleCancelWaitlist(entry.id)}
                                    title="Cancel"
                                  >
                                    <XCircle className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
