import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Users, Search, Mail, Phone, Calendar, BookOpen, TrendingUp, Clock, CheckCircle2, XCircle, Clock as ClockIcon, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface Student {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string;
  phone?: string;
  enrolled_at: string;
  course_id: string;
  course_title: string;
  progress?: number;
  completed_lessons?: number;
  total_lessons?: number;
  // Guardian information
  guardian_name?: string | null;
  guardian_email?: string | null;
  guardian_phone?: string | null;
  guardian_address?: string | null;
  guardian_relationship?: string | null;
  // Attendance information
  attendanceStatus?: 'present' | 'absent' | 'late' | 'excused' | null;
  attendanceSessionId?: string | null;
}

interface AttendanceSession {
  id: string;
  course_id: string;
  session_date: string;
  session_time: string | null;
  title: string | null;
}

interface Course {
  id: string;
  title: string;
}

const StudentManagement = () => {
  const { courseId } = useParams();
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>(courseId || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [todaySession, setTodaySession] = useState<AttendanceSession | null>(null);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedStudentForAttendance, setSelectedStudentForAttendance] = useState<Student | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'late' | 'excused'>('present');
  const [attendanceNotes, setAttendanceNotes] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (!authLoading && role !== 'teacher' && !['super_admin', 'admin'].includes(role || '')) {
      navigate('/dashboard');
      return;
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTeacherCourses();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedCourse) {
      fetchStudents();
      fetchTodaySession();
    }
  }, [user, selectedCourse]);

  const fetchTodaySession = async () => {
    if (selectedCourse === 'all') {
      setTodaySession(null);
      return;
    }

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await (supabase as any)
        .from('attendance_sessions')
        .select('*')
        .eq('course_id', selectedCourse)
        .eq('session_date', today)
        .order('session_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching today session:', error);
      } else {
        setTodaySession(data || null);
        // If session exists, fetch attendance records for students
        if (data) {
          fetchAttendanceRecords(data.id);
        }
      }
    } catch (error) {
      console.error('Error in fetchTodaySession:', error);
    }
  };

  const fetchAttendanceRecords = async (sessionId: string) => {
    if (!students.length) return;

    try {
      const studentIds = students.map(s => s.id);
      const { data: records } = await (supabase as any)
        .from('attendance_records')
        .select('student_id, status')
        .eq('session_id', sessionId)
        .in('student_id', studentIds as any);

      if (records) {
        setStudents(prev => prev.map(student => {
          const record = (records as any[]).find((r: any) => r.student_id === student.id);
          return {
            ...student,
            attendanceStatus: record?.status as any || null,
            attendanceSessionId: record ? sessionId : null,
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
    }
  };

  const createTodaySession = async () => {
    if (selectedCourse === 'all') return;

    setCreatingSession(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const { data, error } = await (supabase as any)
        .from('attendance_sessions')
        .insert({
          course_id: selectedCourse,
          session_date: today,
          session_time: time,
          title: `Class Session - ${format(new Date(), 'MMM dd, yyyy')}`,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      setTodaySession(data as AttendanceSession);
      toast({
        title: 'Success',
        description: 'Attendance session created',
      });
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create attendance session',
        variant: 'destructive',
      });
    } finally {
      setCreatingSession(false);
    }
  };

  const markAttendance = async () => {
    if (!selectedStudentForAttendance || !todaySession) return;

    setSavingAttendance(true);
    try {
      const { error } = await (supabase as any)
        .from('attendance_records')
        .upsert({
          session_id: todaySession.id,
          student_id: selectedStudentForAttendance.id,
          status: attendanceStatus,
          notes: attendanceNotes || null,
          marked_by: user?.id,
        }, {
          onConflict: 'session_id,student_id',
        });

      if (error) throw error;

      // Update local state
      setStudents(prev => prev.map(s =>
        s.id === selectedStudentForAttendance.id
          ? { ...s, attendanceStatus, attendanceSessionId: todaySession.id }
          : s
      ));

      toast({
        title: 'Success',
        description: `Attendance marked as ${attendanceStatus}`,
      });

      setAttendanceDialogOpen(false);
      setSelectedStudentForAttendance(null);
      setAttendanceNotes('');
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark attendance',
        variant: 'destructive',
      });
    } finally {
      setSavingAttendance(false);
    }
  };

  const openAttendanceDialog = (student: Student) => {
    if (!todaySession) {
      // Create session first
      createTodaySession().then(() => {
        setSelectedStudentForAttendance(student);
        setAttendanceStatus(student.attendanceStatus || 'present');
        setAttendanceDialogOpen(true);
      });
    } else {
      setSelectedStudentForAttendance(student);
      setAttendanceStatus(student.attendanceStatus || 'present');
      setAttendanceDialogOpen(true);
    }
  };

  const getAttendanceIcon = (status: string | null | undefined) => {
    switch (status) {
      case 'present':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'excused':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getAttendanceBadge = (status: string | null | undefined) => {
    if (!status) return null;
    const colors = {
      present: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      absent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      late: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      excused: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    };
    return (
      <Badge className={colors[status as keyof typeof colors] || ''}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const fetchTeacherCourses = async () => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentManagement.tsx:82',message:'fetchTeacherCourses entry',data:{userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Fetch courses created by teacher
      const { data: createdCourses } = await supabase
        .from('courses')
        .select('id, title')
        .eq('created_by', user?.id)
        .order('title');

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentManagement.tsx:90',message:'createdCourses fetched',data:{count:createdCourses?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Fetch courses assigned to teacher
      const { data: assignedCoursesData, error: assignedError } = await (supabase as any)
        .from('teacher_course_assignments')
        .select(`
          course_id,
          courses (
            id,
            title
          )
        `)
        .eq('teacher_id', user?.id);
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentManagement.tsx:102',message:'assignedCoursesData fetched',data:{count:assignedCoursesData?.length||0,error:assignedError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      const assignedCourses = (assignedCoursesData || [])
        .map((ac: any) => ac.courses)
        .filter(Boolean);

      // Combine and deduplicate
      const allCoursesMap = new Map<string, Course>();
      (createdCourses || []).forEach(c => allCoursesMap.set(c.id, c));
      assignedCourses.forEach((c: Course) => {
        if (!allCoursesMap.has(c.id)) {
          allCoursesMap.set(c.id, c);
        }
      });

      const allCourses = Array.from(allCoursesMap.values());
      setCourses(allCourses);

      if (courseId && allCourses.find(c => c.id === courseId)) {
        setSelectedCourse(courseId);
      } else if (allCourses.length > 0 && selectedCourse === 'all') {
        setSelectedCourse(allCourses[0].id);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch courses',
        variant: 'destructive',
      });
    }
  };

  const fetchStudents = async () => {
    if (selectedCourse === 'all') {
      setStudents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentManagement.tsx:141',message:'fetchStudents entry',data:{selectedCourse,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      // Use the new view that includes guardian information
      const { data: studentsWithGuardians, error: viewError } = await (supabase as any)
        .from('teacher_students_with_guardians')
        .select('*')
        .eq('teacher_id', user?.id)
        .eq('course_id', selectedCourse)
        .order('enrolled_at', { ascending: false });
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentManagement.tsx:149',message:'view query result',data:{count:studentsWithGuardians?.length||0,hasError:!!viewError,errorMsg:viewError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // If view has error or returns 0 results, fallback to manual query
      if (viewError || !studentsWithGuardians || studentsWithGuardians.length === 0) {
        if (viewError) {
          console.warn('View not available, falling back to manual query:', viewError);
        } else {
          console.warn('View returned 0 students, falling back to manual query to verify');
        }
        await fetchStudentsManual();
        return;
      }

      // Get course lessons count for progress calculation
      const { count: totalLessons } = await (supabase as any)
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', selectedCourse);

      // Get progress for each student
      const studentsWithData = await Promise.all(
        studentsWithGuardians.map(async (student: any) => {
          // Get completed lessons count
          const { count: completedLessons } = await (supabase as any)
            .from('learning_progress')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.student_id)
            .eq('course_id', selectedCourse)
            .eq('completed', true);

          const progress = totalLessons && totalLessons > 0
            ? Math.round(((completedLessons || 0) / totalLessons) * 100)
            : (student.progress_percentage || 0);

          return {
            id: student.student_id,
            full_name: student.student_name || 'Unknown',
            avatar_url: student.student_avatar || null,
            email: student.student_email || undefined,
            phone: student.student_phone || undefined,
            enrolled_at: student.enrolled_at,
            course_id: student.course_id,
            course_title: student.course_title || 'Unknown Course',
            progress,
            completed_lessons: completedLessons || 0,
            total_lessons: totalLessons || 0,
            // Guardian information
            guardian_name: student.effective_guardian_name || student.guardian_name || null,
            guardian_email: student.effective_guardian_email || student.guardian_email || null,
            guardian_phone: student.effective_guardian_phone || student.guardian_phone || null,
            guardian_address: student.effective_guardian_address || student.guardian_address || null,
            guardian_relationship: student.guardian_relationship || null,
          };
        })
      );

      setStudents(studentsWithData);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsManual = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentManagement.tsx:237',message:'fetchStudentsManual entry',data:{selectedCourse,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    try {
      // Step 1: Get course information
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', selectedCourse)
        .single();

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentManagement.tsx:245',message:'course fetched',data:{courseTitle:courseData?.title,error:courseError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      // Step 2: Get enrollments for this course (without nested relationships)
      const { data: enrollments, error: enrollError } = await supabase
        .from('course_enrollments')
        .select('user_id, enrolled_at, course_id')
        .eq('course_id', selectedCourse)
        .order('enrolled_at', { ascending: false });

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentManagement.tsx:252',message:'enrollments fetched',data:{count:enrollments?.length||0,error:enrollError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      if (enrollError) {
        console.error('Error fetching enrollments:', enrollError);
        setStudents([]);
        setLoading(false);
        return;
      }

      if (!enrollments || enrollments.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Step 3: Filter students by teacher assignment
      // Check which students are assigned to this teacher for this course
      const { data: teacherAssignments, error: assignmentError } = await (supabase as any)
        .from('teacher_course_assignments')
        .select('course_id')
        .eq('teacher_id', user?.id)
        .eq('course_id', selectedCourse);

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentManagement.tsx:270',message:'teacher assignments check',data:{isAssigned:!!teacherAssignments?.length,error:assignmentError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      // If teacher is not assigned to this course, check if they created it
      const isCourseCreator = courseData?.id && courseData?.id === selectedCourse;
      const isAssigned = !!teacherAssignments?.length || isCourseCreator;

      if (!isAssigned) {
        // Teacher doesn't have access to this course's students
        setStudents([]);
        setLoading(false);
        return;
      }

      // Step 4: Get student profiles
      const studentIds = enrollments.map(e => e.user_id);
      const { data: profiles, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, avatar_url, email, phone, guardian_name, guardian_email, guardian_phone, guardian_address')
        .in('id', studentIds);
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentManagement.tsx:285',message:'profiles query result',data:{count:profiles?.length||0,error:profileError?.message||null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      // Step 5: Get guardian relationships
      const { data: guardianRelationships, error: guardianError } = await (supabase as any)
        .from('student_guardians')
        .select('student_id, guardian_id, relationship')
        .in('student_id', studentIds);

      // Get guardian profiles if relationships exist
      const guardianIds = guardianRelationships?.map((gr: any) => gr.guardian_id) || [];
      const { data: guardianProfiles } = guardianIds.length > 0 ? await (supabase as any)
        .from('profiles')
        .select('id, full_name, email, phone, address')
        .in('id', guardianIds) : { data: null };

      // Create a map of student_id -> guardian info
      const guardianMap = new Map();
      if (guardianRelationships && guardianProfiles) {
        guardianRelationships.forEach((gr: any) => {
          const guardian = guardianProfiles.find((gp: any) => gp.id === gr.guardian_id);
          if (guardian) {
            guardianMap.set(gr.student_id, {
              name: guardian.full_name,
              email: guardian.email,
              phone: guardian.phone,
              address: guardian.address,
              relationship: gr.relationship,
            });
          }
        });
      }

      // Step 6: Get total lessons count
      const { count: totalLessons } = await (supabase as any)
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', selectedCourse);

      // Step 7: Build student data with progress
      const studentsWithData = await Promise.all(
        enrollments.map(async (enrollment: any) => {
          const profile = (profiles as any)?.find((p: any) => p.id === enrollment.user_id);
          const guardianInfo = guardianMap.get(enrollment.user_id);

          const { count: completedLessons } = await (supabase as any)
            .from('learning_progress')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', enrollment.user_id)
            .eq('course_id', selectedCourse)
            .eq('completed', true);

          const progress = totalLessons && totalLessons > 0
            ? Math.round(((completedLessons || 0) / totalLessons) * 100)
            : 0;

          return {
            id: enrollment.user_id,
            full_name: profile?.full_name || 'Unknown',
            avatar_url: profile?.avatar_url || null,
            email: profile?.email || undefined,
            phone: profile?.phone || undefined,
            enrolled_at: enrollment.enrolled_at,
            course_id: enrollment.course_id,
            course_title: courseData?.title || 'Unknown Course',
            progress,
            completed_lessons: completedLessons || 0,
            total_lessons: totalLessons || 0,
            // Guardian information - prefer relationship data, fallback to profile fields
            guardian_name: guardianInfo?.name || profile?.guardian_name || null,
            guardian_email: guardianInfo?.email || profile?.guardian_email || null,
            guardian_phone: guardianInfo?.phone || profile?.guardian_phone || null,
            guardian_address: guardianInfo?.address || profile?.guardian_address || null,
            guardian_relationship: guardianInfo?.relationship || null,
          };
        })
      );

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StudentManagement.tsx:350',message:'studentsWithData built',data:{count:studentsWithData.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      setStudents(studentsWithData);
    } catch (error) {
      console.error('Error in fetchStudentsManual:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/teacher')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-8 w-8 text-primary" />
                Student Management
              </h1>
              <p className="text-muted-foreground mt-1">
                View and manage students enrolled in your courses
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Course</label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Search Students</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Enrolled Students</CardTitle>
                <CardDescription>
                  {selectedCourse === 'all'
                    ? 'Select a course to view students'
                    : `${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''} enrolled`}
                </CardDescription>
              </div>
              {selectedCourse !== 'all' && (
                <Button
                  onClick={() => navigate(`/teacher/courses/${selectedCourse}/attendance`)}
                  variant="outline"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Manage Attendance
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedCourse === 'all' ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Please select a course to view enrolled students</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Guardian</TableHead>
                      <TableHead>Enrollment Date</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Lessons</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={student.avatar_url || undefined} />
                              <AvatarFallback>
                                {getInitials(student.full_name || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{student.full_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {student.course_title}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {student.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3 w-3" />
                                <span className="text-muted-foreground">{student.email}</span>
                              </div>
                            )}
                            {student.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3" />
                                <span className="text-muted-foreground">{student.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[200px]">
                            {student.guardian_name ? (
                              <>
                                <div className="font-medium text-sm">{student.guardian_name}</div>
                                {student.guardian_relationship && (
                                  <Badge variant="outline" className="text-xs">
                                    {student.guardian_relationship}
                                  </Badge>
                                )}
                                {student.guardian_email && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    {student.guardian_email}
                                  </div>
                                )}
                                {student.guardian_phone && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    {student.guardian_phone}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">No guardian info</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {new Date(student.enrolled_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getProgressColor(student.progress || 0)}`}
                                style={{ width: `${student.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{student.progress || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <BookOpen className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {student.completed_lessons || 0} / {student.total_lessons || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getAttendanceIcon(student.attendanceStatus)}
                            {getAttendanceBadge(student.attendanceStatus)}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAttendanceDialog(student)}
                              className="h-7 px-2"
                            >
                              {student.attendanceStatus ? 'Update' : 'Mark'}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/teacher/students/${student.id}`)}
                            >
                              View Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Marking Dialog */}
        <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark Attendance</DialogTitle>
              <DialogDescription>
                Mark attendance for {selectedStudentForAttendance?.full_name || 'student'}
                {todaySession && ` - ${format(new Date(todaySession.session_date), 'MMM dd, yyyy')}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={attendanceStatus} onValueChange={(value: any) => setAttendanceStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="excused">Excused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
                <Input
                  placeholder="Add notes..."
                  value={attendanceNotes}
                  onChange={(e) => setAttendanceNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={markAttendance} disabled={savingAttendance}>
                {savingAttendance ? 'Saving...' : 'Save Attendance'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default StudentManagement;
