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
import { ArrowLeft, Users, Search, Mail, Phone, Calendar, BookOpen, TrendingUp, Clock, CheckCircle2, XCircle, Clock as ClockIcon, AlertCircle, Eye } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { getDashboardPath } from '@/lib/navigation';
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
      navigate(getDashboardPath(role));
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
      // Fetch courses created by teacher
      const { data: createdCourses } = await supabase
        .from('courses')
        .select('id, title')
        .eq('created_by', user?.id)
        .order('title');

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

      const assignedCourses = (assignedCoursesData || [])
        .map((ac: any) => ac.courses)
        .filter(Boolean);

      // Combine created and assigned courses first
      const allCoursesMap = new Map<string, Course>();
      (createdCourses || []).forEach(c => allCoursesMap.set(c.id, c));
      assignedCourses.forEach((c: Course) => {
        if (!allCoursesMap.has(c.id)) {
          allCoursesMap.set(c.id, c);
        }
      });

      // Fetch courses where teacher has students enrolled (via teacher_students_with_guardians view)
      try {
        const { data: studentsViewData } = await (supabase as any)
          .from('teacher_students_with_guardians')
          .select('course_id, courses!inner(id, title)')
          .eq('teacher_id', user?.id);

        const coursesFromView = (studentsViewData || [])
          .map((item: any) => item.courses)
          .filter(Boolean);

        coursesFromView.forEach((c: Course) => {
          if (!allCoursesMap.has(c.id)) {
            allCoursesMap.set(c.id, c);
          }
        });
      } catch (viewError) {
        console.warn('Could not fetch courses from view, trying alternative method:', viewError);
        
        // Fallback: Get courses from enrollments where teacher might have students
        // This is a broader approach - get all courses and check if teacher has access
        try {
          const teacherCourseIds = Array.from(allCoursesMap.keys());
          
          if (teacherCourseIds.length > 0) {
            // Get enrollments for courses teacher has access to
            const { data: enrollmentsData } = await supabase
              .from('course_enrollments')
              .select('course_id, courses!inner(id, title)')
              .in('course_id', teacherCourseIds);

            const coursesWithEnrollments = (enrollmentsData || [])
              .map((e: any) => e.courses)
              .filter(Boolean);

            coursesWithEnrollments.forEach((c: Course) => {
              if (!allCoursesMap.has(c.id)) {
                allCoursesMap.set(c.id, c);
              }
            });
          }
        } catch (fallbackError) {
          console.warn('Fallback course fetch also failed:', fallbackError);
        }
      }

      const allCourses = Array.from(allCoursesMap.values()).sort((a, b) => 
        a.title.localeCompare(b.title)
      );
      setCourses(allCourses);

      if (courseId && allCourses.find(c => c.id === courseId)) {
        setSelectedCourse(courseId);
      }
      // Don't auto-select first course - keep 'all' to show all students initially
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
    setLoading(true);
    try {
      let studentsWithGuardians: any[] = [];
      let viewError: any = null;

      if (selectedCourse === 'all') {
        // Fetch all students from all courses
        const { data, error } = await (supabase as any)
          .from('teacher_students_with_guardians')
          .select('*')
          .eq('teacher_id', user?.id)
          .order('enrolled_at', { ascending: false });
        studentsWithGuardians = data || [];
        viewError = error;
      } else {
        // Fetch students for specific course
        const { data, error } = await (supabase as any)
          .from('teacher_students_with_guardians')
          .select('*')
          .eq('teacher_id', user?.id)
          .eq('course_id', selectedCourse)
          .order('enrolled_at', { ascending: false });
        
        studentsWithGuardians = data || [];
        viewError = error;
      }
      
      // If view has error or returns 0 results, try alternative approach for 'all' courses
      if (viewError || !studentsWithGuardians || studentsWithGuardians.length === 0) {
        if (selectedCourse === 'all') {
          // For 'all' courses, try fetching from enrollments directly
          // Get teacher's courses first
          const { data: teacherCourses } = await supabase
            .from('courses')
            .select('id, title')
            .eq('created_by', user?.id);
          
          const { data: assignedCoursesData } = await (supabase as any)
            .from('teacher_course_assignments')
            .select('course_id, courses!inner(id, title)')
            .eq('teacher_id', user?.id);
          
          const assignedCourses = (assignedCoursesData || [])
            .map((ac: any) => ac.courses)
            .filter(Boolean);
          
          const allCourseIds = [
            ...(teacherCourses || []).map(c => c.id),
            ...assignedCourses.map((c: any) => c.id)
          ];
          
          if (allCourseIds.length > 0) {
            // Fetch enrollments for all teacher's courses (without nested profiles)
            const { data: enrollments, error: enrollError } = await supabase
              .from('course_enrollments')
              .select(`
                user_id,
                course_id,
                enrolled_at,
                courses!inner(id, title)
              `)
              .in('course_id', allCourseIds)
              .order('enrolled_at', { ascending: false });
            
            if (enrollments && enrollments.length > 0) {
              // Extract unique user IDs
              const userIds = [...new Set(enrollments.map((e: any) => e.user_id))];
              
              // Fetch profiles separately
              const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, email, phone')
                .in('id', userIds);
              
              if (profileError) {
                console.warn('Error fetching profiles:', profileError);
              }
              
              // Create a map for quick lookup
              const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));
              
              // Transform to match expected format
              studentsWithGuardians = enrollments.map((e: any) => {
                const profile = profilesMap.get(e.user_id);
                return {
                  student_id: e.user_id,
                  student_name: profile?.full_name || 'Unknown',
                  student_email: profile?.email || null,
                  student_phone: profile?.phone || null,
                  student_avatar: profile?.avatar_url || null,
                  course_id: e.course_id,
                  course_title: e.courses?.title || 'Unknown Course',
                  enrolled_at: e.enrolled_at,
                  effective_guardian_name: null,
                  effective_guardian_email: null,
                  effective_guardian_phone: null,
                  guardian_name: null,
                  guardian_email: null,
                  guardian_phone: null,
                  guardian_relationship: null,
                };
              });
            }
          }
        } else {
          // For specific course, use manual fetch
          if (viewError) {
            console.warn('View not available, falling back to manual query:', viewError);
          } else {
            console.warn('View returned 0 students, falling back to manual query to verify');
          }
          await fetchStudentsManual();
          return;
        }
      }

      // Get progress for each student - fetch all data in parallel for better performance
      const courseIds = [...new Set(studentsWithGuardians.map((s: any) => s.course_id))];
      
      // Fetch all lessons counts for all courses at once
      const lessonsCountPromises = courseIds.map(async (courseId: string) => {
        const { count } = await (supabase as any)
          .from('lessons')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', courseId);
        return { courseId, count: count || 0 };
      });
      
      const lessonsCounts = await Promise.all(lessonsCountPromises);
      const lessonsCountMap = new Map(lessonsCounts.map(l => [l.courseId, l.count]));

      // Get progress for each student
      const studentsWithData = await Promise.all(
        studentsWithGuardians.map(async (student: any) => {
          const courseId = student.course_id;
          const totalLessons = lessonsCountMap.get(courseId) || 0;

          // Get completed lessons count for this specific student-course combination
          const { count: completedLessons, error: progressError } = await (supabase as any)
            .from('learning_progress')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', student.student_id)
            .eq('course_id', courseId)
            .eq('completed', true);

          if (progressError) {
            console.warn(`Error fetching progress for student ${student.student_id} in course ${courseId}:`, progressError);
          }

          const completedCount = completedLessons || 0;
          const progress = totalLessons > 0
            ? Math.round((completedCount / totalLessons) * 100)
            : 0;

          return {
            id: student.student_id,
            full_name: student.student_name || 'Unknown',
            avatar_url: student.student_avatar || null,
            email: student.student_email || undefined,
            phone: student.student_phone || undefined,
            enrolled_at: student.enrolled_at,
            course_id: courseId,
            course_title: student.course_title || 'Unknown Course',
            progress: Math.min(progress, 100), // Ensure progress doesn't exceed 100%
            completed_lessons: completedCount,
            total_lessons: totalLessons,
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
    // Manual fetch only works for specific courses, not 'all'
    if (selectedCourse === 'all') {
      setStudents([]);
      setLoading(false);
      return;
    }
    
    try {
      // Step 1: Get course information
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('id', selectedCourse)
        .single();

      // Step 2: Get enrollments for this course (without nested relationships)
      const { data: enrollments, error: enrollError } = await supabase
        .from('course_enrollments')
        .select('user_id, enrolled_at, course_id')
        .eq('course_id', selectedCourse)
        .order('enrolled_at', { ascending: false });

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
      const { count: totalLessons, error: lessonsError } = await (supabase as any)
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', selectedCourse);

      if (lessonsError) {
        console.warn('Error fetching lessons count:', lessonsError);
      }

      // Step 7: Build student data with progress
      const studentsWithData = await Promise.all(
        enrollments.map(async (enrollment: any) => {
          const profile = (profiles as any)?.find((p: any) => p.id === enrollment.user_id);
          const guardianInfo = guardianMap.get(enrollment.user_id);

          // Get completed lessons count for this student in this course
          const { count: completedLessons, error: progressError } = await (supabase as any)
            .from('learning_progress')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', enrollment.user_id)
            .eq('course_id', selectedCourse)
            .eq('completed', true);

          if (progressError) {
            console.warn(`Error fetching progress for student ${enrollment.user_id}:`, progressError);
          }

          const completedCount = completedLessons || 0;
          const totalCount = totalLessons || 0;
          const progress = totalCount > 0
            ? Math.round((completedCount / totalCount) * 100)
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
            progress: Math.min(progress, 100), // Ensure progress doesn't exceed 100%
            completed_lessons: completedCount,
            total_lessons: totalCount,
            // Guardian information - prefer relationship data, fallback to profile fields
            guardian_name: guardianInfo?.name || profile?.guardian_name || null,
            guardian_email: guardianInfo?.email || profile?.guardian_email || null,
            guardian_phone: guardianInfo?.phone || profile?.guardian_phone || null,
            guardian_address: guardianInfo?.address || profile?.guardian_address || null,
            guardian_relationship: guardianInfo?.relationship || null,
          };
        })
      );

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
    student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.course_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.guardian_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
            <BackButton 
              fallbackPath="/dashboard/teacher"
              fallbackLabel="Back to Teacher Dashboard"
              size="icon"
            />
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
          {selectedCourse !== 'all' && (
            <Button
              onClick={() => navigate(`/teacher/courses/${selectedCourse}/attendance`)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all"
              size="lg"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Manage Attendance
            </Button>
          )}
        </div>

        {/* Summary Stats */}
        {selectedCourse !== 'all' && filteredStudents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{filteredStudents.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Average Progress</p>
                    <p className="text-2xl font-bold">
                      {Math.round(filteredStudents.reduce((acc, s) => acc + (s.progress || 0), 0) / filteredStudents.length)}%
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed Lessons</p>
                    <p className="text-2xl font-bold">
                      {filteredStudents.reduce((acc, s) => acc + (s.completed_lessons || 0), 0)}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Lessons</p>
                    <p className="text-2xl font-bold">
                      {filteredStudents.reduce((acc, s) => acc + (s.total_lessons || 0), 0)}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Course
                </label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses ({courses.length})</SelectItem>
                    {courses.map(course => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search Students
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by name, email, or course..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11"
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
                    ? `${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''} across all courses`
                    : `${filteredStudents.length} student${filteredStudents.length !== 1 ? 's' : ''} enrolled`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {selectedCourse === 'all' && (
              <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                  <p className="text-sm text-muted-foreground">
                    Select a specific course to manage attendance for that course.
                  </p>
                </div>
              </div>
            )}
            {filteredStudents.length === 0 ? (
              <div className="text-center py-16 bg-course-detail/20 rounded-xl">
                <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-course-detail/40 flex items-center justify-center">
                  <Users className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Students Found</h3>
                <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                  {searchQuery 
                    ? `No students match "${searchQuery}". Try a different search term.`
                    : 'No students are enrolled in this course yet.'}
                </p>
                {!searchQuery && (
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => navigate('/admin/enrollments')}
                  >
                    Enroll Students
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4 scrollbar-thin">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow className="bg-course-detail/20 hover:bg-course-detail/30">
                      <TableHead className="sticky left-0 z-30 font-semibold text-xs uppercase tracking-wider bg-course-detail/20 border-r">Student</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Contact</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Guardian</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Enrollment Date</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Progress</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Lessons</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={`${student.id}-${student.course_id}`} className="hover:bg-course-detail/10 transition-colors border-b border-border/50">
                        <TableCell className="sticky left-0 z-10 min-w-[200px] bg-background border-r">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-course-detail/30">
                              <AvatarImage src={student.avatar_url || undefined} />
                              <AvatarFallback className="bg-course-detail/20 text-foreground font-semibold">
                                {getInitials(student.full_name || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-sm truncate">{student.full_name}</div>
                              <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {student.course_title}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[180px]">
                          <div className="space-y-1.5">
                            {student.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-3.5 w-3.5 text-primary" />
                                <span className="text-muted-foreground truncate">{student.email}</span>
                              </div>
                            )}
                            {student.phone && (
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3.5 w-3.5 text-primary" />
                                <span className="text-muted-foreground">{student.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          <div className="space-y-1.5">
                            {student.guardian_name ? (
                              <>
                                <div className="font-semibold text-sm">{student.guardian_name}</div>
                                {student.guardian_relationship && (
                                  <Badge variant="outline" className="text-xs bg-course-detail/10 border-course-detail/30">
                                    {student.guardian_relationship}
                                  </Badge>
                                )}
                                {student.guardian_email && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Mail className="h-3 w-3 text-primary" />
                                    <span className="truncate">{student.guardian_email}</span>
                                  </div>
                                )}
                                {student.guardian_phone && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Phone className="h-3 w-3 text-primary" />
                                    <span>{student.guardian_phone}</span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No guardian info</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[140px]">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            <span className="text-muted-foreground">{new Date(student.enrolled_at).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[140px]">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-[80px] bg-course-detail rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${getProgressColor(student.progress || 0)}`}
                                style={{ width: `${Math.min(student.progress || 0, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold min-w-[35px] text-right">{student.progress || 0}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[100px]">
                          <div className="flex items-center gap-2 text-sm">
                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                            <span className="text-muted-foreground">
                              {student.completed_lessons || 0} / {student.total_lessons || 0}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[140px] text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/teacher/students/${student.id}`)}
                            className="bg-course-detail-50 hover:bg-course-detail-full border-course-detail/30 hover:border-course-detail text-foreground font-semibold transition-all"
                          >
                            <Eye className="mr-2 h-3.5 w-3.5" />
                            View Details
                          </Button>
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
