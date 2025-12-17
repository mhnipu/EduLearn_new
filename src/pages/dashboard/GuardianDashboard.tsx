import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, BookOpen, Award, TrendingUp, Target, Eye, Shield, CheckCircle2, Clock, Trophy, Star, BarChart3, FileText, GraduationCap, ChevronDown, ChevronUp, Mail, Phone, Book, Video, Library, Calendar, XCircle, UserCheck } from 'lucide-react';
import {
  RadialBarChart, RadialBar, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { format } from 'date-fns';

interface Teacher {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  course_title: string;
}

interface Student {
  id: string;
  student_id: string;
  relationship: string;
  profile: {
    full_name: string;
  } | null;
  teachers?: Teacher[];
}

interface StudentProgress {
  studentId: string;
  studentName: string;
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
  assignments?: number;
  assignmentsCompleted?: number;
  quizzes?: number;
  quizzesPassed?: number;
  averageScore?: number;
}

interface StudentCourse {
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  completedAt: string | null;
  progress: number;
  courseDescription?: string;
  teacherName?: string;
  teacherEmail?: string;
  teacherPhone?: string;
}

interface StudentAssignment {
  assignmentId: string;
  assignmentTitle: string;
  courseTitle: string;
  dueDate: string | null;
  maxScore: number;
  score: number | null;
  submittedAt: string | null;
  gradedAt: string | null;
  feedback: string | null;
}

interface StudentQuiz {
  quizId: string;
  quizTitle: string;
  courseTitle: string;
  passingScore: number;
  score: number | null;
  passed: boolean | null;
  submittedAt: string | null;
}

interface StudentExam {
  examId: string;
  examTitle: string;
  courseTitle: string;
  dueDate: string | null;
  maxScore: number;
  score: number | null;
  submittedAt: string | null;
  gradedAt: string | null;
  feedback: string | null;
}

interface LibraryItem {
  id: string;
  title: string;
  type: 'book' | 'video';
  accessedAt: string | null;
  progress?: number;
}

interface StudentAttendance {
  studentId: string;
  studentName: string;
  records: {
    id: string;
    sessionDate: string;
    sessionTime: string | null;
    sessionTitle: string | null;
    courseTitle: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes: string | null;
  }[];
}

const GuardianDashboard = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [studentCourses, setStudentCourses] = useState<Record<string, StudentCourse[]>>({});
  const [studentAssignments, setStudentAssignments] = useState<Record<string, StudentAssignment[]>>({});
  const [studentQuizzes, setStudentQuizzes] = useState<Record<string, StudentQuiz[]>>({});
  const [studentExams, setStudentExams] = useState<Record<string, StudentExam[]>>({});
  const [studentLibraryItems, setStudentLibraryItems] = useState<Record<string, LibraryItem[]>>({});
  const [studentTeachers, setStudentTeachers] = useState<Record<string, Teacher[]>>({});
  const [studentAttendance, setStudentAttendance] = useState<Record<string, StudentAttendance['records']>>({});
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && role && role !== 'guardian' && !['super_admin', 'admin'].includes(role)) {
      navigate(`/dashboard/${role}`);
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user && role === 'guardian') {
      fetchGuardianData();
    }
  }, [user, role]);

  // Refresh data when component becomes visible (handles new enrollments)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && role === 'guardian') {
        fetchGuardianData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, role]);

  const fetchGuardianData = async () => {
    try {
      setError(null);
      setLoadingData(true);

      // First, try to get students from student_guardians table
      const { data: guardianRelationships, error: relationshipError } = await supabase
        .from('student_guardians')
        .select('student_id, relationship')
        .eq('guardian_id', user?.id);

      if (relationshipError) {
        console.error('Error fetching guardian relationships:', relationshipError);
        setError('Failed to load student data. Please try again.');
        setLoadingData(false);
        return;
      }

      if (!guardianRelationships || guardianRelationships.length === 0) {
        setLoadingData(false);
        return;
      }

      const studentIds = guardianRelationships.map(r => r.student_id);

      // Fetch student profiles
      const { data: studentProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', studentIds);

      if (profileError) {
        console.error('Error fetching student profiles:', profileError);
        setError('Failed to load student profiles.');
      }

      // Try to get teacher information from the view (using rpc or direct query)
      let studentsWithTeachers: any[] = [];
      try {
        // Use a direct SQL query via RPC or try the view with proper error handling
        const { data: viewData, error: viewError } = await (supabase as any)
          .from('guardian_students_with_teachers')
          .select('*')
          .eq('guardian_id', user?.id);

        if (!viewError && viewData) {
          studentsWithTeachers = viewData;
        }
      } catch (e) {
        console.warn('View guardian_students_with_teachers not available, will fetch teachers manually');
      }

      // Group students by student_id (since one student can have multiple teachers)
      const studentsMap = new Map();
      
      // Initialize students from relationships
      guardianRelationships.forEach((rel) => {
        const profile = studentProfiles?.find(p => p.id === rel.student_id);
        if (!studentsMap.has(rel.student_id)) {
          studentsMap.set(rel.student_id, {
            id: rel.student_id,
            student_id: rel.student_id,
            relationship: rel.relationship,
            profile: {
              full_name: profile?.full_name || 'Unknown',
              avatar_url: profile?.avatar_url,
            },
            teachers: [],
          });
        }
      });

      // Add teacher information from view data
      studentsWithTeachers.forEach((item: any) => {
        if (studentsMap.has(item.student_id)) {
          const existingTeacher = studentsMap.get(item.student_id).teachers.find(
            (t: Teacher) => t.id === item.teacher_id && t.course_title === item.course_title
          );
          if (!existingTeacher && item.teacher_id) {
            studentsMap.get(item.student_id).teachers.push({
              id: item.teacher_id,
              name: item.teacher_name,
              email: item.teacher_email,
              phone: item.teacher_phone,
              course_title: item.course_title,
            });
          }
        }
      });

      const studentsWithProfiles = Array.from(studentsMap.values());
      setStudents(studentsWithProfiles);

      // Fetch comprehensive data for each student
      const studentIdsList = studentsWithProfiles.map(s => s.student_id);
      console.log('Fetching data for students:', studentIdsList);
      
      const progressPromises = studentIdsList.map(async (studentId) => {
        console.log(`Fetching data for student: ${studentId}`);
        
        // Fetch course enrollments with detailed information
        // Try using the comprehensive view first, then fallback to direct query
        let coursesData: any[] = [];
        let coursesError: any = null;

        // Try comprehensive view first
        try {
          const { data: viewData, error: viewErr } = await (supabase as any)
            .from('guardian_student_comprehensive_data')
            .select('course_id, course_title, course_description, course_enrolled_at, course_completed_at')
            .eq('student_id', studentId)
            .eq('guardian_id', user?.id);

          if (!viewErr && viewData) {
            // Transform view data to match expected format
            coursesData = viewData.map((item: any) => ({
              course_id: item.course_id,
              enrolled_at: item.course_enrolled_at,
              completed_at: item.course_completed_at,
              courses: {
                id: item.course_id,
                title: item.course_title,
                description: item.course_description,
              }
            }));
            console.log(`Found ${coursesData.length} enrollments via comprehensive view for student ${studentId}`);
          }
        } catch (e) {
          console.warn('Comprehensive view not available, using direct query');
        }

        // Fallback to direct query if view didn't work or returned no data
        if (coursesData.length === 0) {
          const { data: directData, error: directError } = await supabase
            .from('course_enrollments')
            .select(`
              course_id,
              enrolled_at,
              completed_at,
              courses (
                id,
                title,
                description
              )
            `)
            .eq('user_id', studentId);

          if (directError) {
            console.error(`Error fetching courses for student ${studentId}:`, directError);
            coursesError = directError;
          } else {
            coursesData = directData || [];
            console.log(`Found ${coursesData.length} enrollments via direct query for student ${studentId}`);
          }
        }

        const [
          enrollments,
          completed,
          certs,
          assignments,
          assignmentsCompleted,
          quizzes,
          quizzesPassed
        ] = await Promise.all([
          // Course enrollments count
          supabase
            .from('course_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', studentId),
          // Completed courses count
          supabase
            .from('course_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', studentId)
            .not('completed_at', 'is', null),
          // Certificates
          supabase
            .from('certificates')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', studentId),
          // Assignments
          supabase
            .from('assignment_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', studentId),
          supabase
            .from('assignment_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', studentId)
            .not('score', 'is', null),
          // Quizzes
          supabase
            .from('quiz_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', studentId),
          supabase
            .from('quiz_submissions')
            .select('id', { count: 'exact', head: true })
            .eq('student_id', studentId)
            .eq('passed', true),
        ]);

        // Calculate average score
        const { data: allScores } = await supabase
          .from('assignment_submissions')
          .select('score')
          .eq('student_id', studentId)
          .not('score', 'is', null);

        const { data: quizScores } = await supabase
          .from('quiz_submissions')
          .select('score')
          .eq('student_id', studentId)
          .not('score', 'is', null);

        const allScoresList = [
          ...(allScores?.map(s => s.score).filter(Boolean) || []),
          ...(quizScores?.map(s => s.score).filter(Boolean) || [])
        ];
        const averageScore = allScoresList.length > 0
          ? Math.round(allScoresList.reduce((a, b) => a + b, 0) / allScoresList.length)
          : undefined;

        // Calculate course progress using learning_progress
        const coursesWithProgress = await Promise.all(
          (coursesData || []).map(async (ce: any) => {
            console.log(`Processing course ${ce.course_id} for student ${studentId}`);
            // Get total lessons and materials for this course
            const [lessonsResult, materialsResult] = await Promise.all([
              supabase
                .from('lessons')
                .select('id', { count: 'exact', head: true })
                .eq('course_id', ce.course_id),
              supabase
                .from('course_materials')
                .select('id', { count: 'exact', head: true })
                .eq('course_id', ce.course_id),
            ]);

            const totalItems = (lessonsResult.count || 0) + (materialsResult.count || 0);

            // Get completed items
            const { count: completedCount } = await supabase
              .from('learning_progress')
              .select('*', { count: 'exact', head: true })
              .eq('student_id', studentId)
              .eq('completed', true)
              .in('content_id', [
                ...(lessonsResult.data?.map((l: any) => l.id) || []),
                ...(materialsResult.data?.map((m: any) => m.id) || []),
              ]);

            const progress = totalItems > 0 
              ? Math.round(((completedCount || 0) / totalItems) * 100)
              : 0;

            // Get ALL teachers for this course
            const courseTeachers: Teacher[] = [];
            try {
              // Try RPC function first
              const { data: teachersData } = await (supabase as any)
                .rpc('get_course_teachers', { _course_id: ce.course_id });

              if (teachersData && Array.isArray(teachersData)) {
                for (const teacherData of teachersData) {
                  if (teacherData.teacher_id) {
                    const { data: teacherProfile } = await supabase
                      .from('profiles')
                      .select('full_name')
                      .eq('id', teacherData.teacher_id)
                      .single();

                    if (teacherProfile) {
                      courseTeachers.push({
                        id: teacherData.teacher_id,
                        name: teacherProfile.full_name,
                        course_title: ce.courses?.title || 'Unknown Course',
                      });
                    }
                  }
                }
              }
            } catch (e) {
              // Fallback: query teacher_course_assignments directly
              try {
                const { data: tcaData } = await (supabase as any)
                  .from('teacher_course_assignments')
                  .select('teacher_id')
                  .eq('course_id', ce.course_id);

                if (tcaData && Array.isArray(tcaData)) {
                  for (const tca of tcaData) {
                    if (tca.teacher_id) {
                      const { data: teacherProfile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', tca.teacher_id)
                        .single();

                      if (teacherProfile) {
                        courseTeachers.push({
                          id: tca.teacher_id,
                          name: teacherProfile.full_name,
                          course_title: ce.courses?.title || 'Unknown Course',
                        });
                      }
                    }
                  }
                }
              } catch (e2) {
                console.warn('Could not fetch teachers for course:', ce.course_id);
              }
            }

            // Store teachers for this student
            if (courseTeachers.length > 0) {
              setStudentTeachers(prev => {
                const existing = prev[studentId] || [];
                const newTeachers = courseTeachers.filter(t => 
                  !existing.some(et => et.id === t.id && et.course_title === t.course_title)
                );
                return { ...prev, [studentId]: [...existing, ...newTeachers] };
              });
            }

            // Use first teacher for course display (for backward compatibility)
            const teacherName = courseTeachers.length > 0 ? courseTeachers[0].name : undefined;

            return {
              courseId: ce.course_id,
              courseTitle: ce.courses?.title || 'Unknown Course',
              courseDescription: ce.courses?.description,
              enrolledAt: ce.enrolled_at,
              completedAt: ce.completed_at,
              progress: Math.min(progress, 100),
              teacherName,
            };
          })
        );

        setStudentCourses(prev => ({ ...prev, [studentId]: coursesWithProgress }));

        // Fetch library items accessed by this student (including permissions)
        const { data: libraryProgress } = await supabase
          .from('learning_progress')
          .select(`
            content_id,
            content_type,
            last_accessed_at,
            progress_percentage,
            completed
          `)
          .eq('student_id', studentId)
          .in('content_type', ['book', 'video']);

        // Also check library permissions to show what student has access to
        let libraryPermissions: any[] = [];
        try {
          const { data: permData } = await (supabase as any)
            .from('library_user_permissions')
            .select('content_id, content_type')
            .eq('user_id', studentId);
          libraryPermissions = permData || [];
        } catch (e) {
          console.warn('Could not fetch library permissions:', e);
        }

        const libraryItems: LibraryItem[] = [];
        const processedIds = new Set<string>();

        // Add items from learning progress (actually accessed)
        if (libraryProgress) {
          for (const item of libraryProgress) {
            const key = `${item.content_type}-${item.content_id}`;
            if (processedIds.has(key)) continue;
            processedIds.add(key);

            if (item.content_type === 'book') {
              const { data: book } = await supabase
                .from('books')
                .select('id, title')
                .eq('id', item.content_id)
                .single();
              if (book) {
                libraryItems.push({
                  id: book.id,
                  title: book.title,
                  type: 'book',
                  accessedAt: item.last_accessed_at,
                  progress: item.progress_percentage || 0,
                });
              }
            } else if (item.content_type === 'video') {
              const { data: video } = await supabase
                .from('videos')
                .select('id, title')
                .eq('id', item.content_id)
                .single();
              if (video) {
                libraryItems.push({
                  id: video.id,
                  title: video.title,
                  type: 'video',
                  accessedAt: item.last_accessed_at,
                  progress: item.progress_percentage || 0,
                });
              }
            }
          }
        }

        // Add items from permissions (has access but may not have accessed yet)
        if (libraryPermissions && Array.isArray(libraryPermissions)) {
          for (const perm of libraryPermissions) {
            const key = `${perm.content_type}-${perm.content_id}`;
            if (processedIds.has(key)) continue;
            processedIds.add(key);

            if (perm.content_type === 'book') {
              const { data: book } = await supabase
                .from('books')
                .select('id, title')
                .eq('id', perm.content_id)
                .single();
              if (book) {
                libraryItems.push({
                  id: book.id,
                  title: book.title,
                  type: 'book',
                  accessedAt: null,
                  progress: 0,
                });
              }
            } else if (perm.content_type === 'video') {
              const { data: video } = await supabase
                .from('videos')
                .select('id, title')
                .eq('id', perm.content_id)
                .single();
              if (video) {
                libraryItems.push({
                  id: video.id,
                  title: video.title,
                  type: 'video',
                  accessedAt: null,
                  progress: 0,
                });
              }
            }
          }
        }

        setStudentLibraryItems(prev => ({ ...prev, [studentId]: libraryItems }));

        // Fetch assignments for this student (excluding exams)
        const { data: assignmentsData } = await supabase
          .from('assignment_submissions')
          .select(`
            assignment_id,
            score,
            submitted_at,
            graded_at,
            feedback,
            assignments (
              id,
              title,
              due_date,
              max_score,
              assessment_type,
              courses (
                title
              )
            )
          `)
          .eq('student_id', studentId);

        // Separate assignments and exams
        const assignmentsList: StudentAssignment[] = [];
        const examsList: StudentExam[] = [];

        (assignmentsData || []).forEach((sub: any) => {
          const assessmentType = sub.assignments?.assessment_type || 'assignment';
          const baseData = {
            courseTitle: sub.assignments?.courses?.title || 'Unknown Course',
            dueDate: sub.assignments?.due_date || null,
            maxScore: sub.assignments?.max_score || 100,
            score: sub.score,
            submittedAt: sub.submitted_at,
            gradedAt: sub.graded_at,
            feedback: sub.feedback,
          };

          if (assessmentType === 'exam') {
            examsList.push({
              examId: sub.assignment_id,
              examTitle: sub.assignments?.title || 'Unknown Exam',
              ...baseData,
            });
          } else {
            assignmentsList.push({
              assignmentId: sub.assignment_id,
              assignmentTitle: sub.assignments?.title || 'Unknown Assignment',
              ...baseData,
            });
          }
        });

        setStudentAssignments(prev => ({ ...prev, [studentId]: assignmentsList }));
        setStudentExams(prev => ({ ...prev, [studentId]: examsList }));

        // Fetch quizzes for this student
        const { data: quizzesData } = await supabase
          .from('quiz_submissions')
          .select(`
            quiz_id,
            score,
            passed,
            submitted_at,
            quizzes (
              id,
              title,
              passing_score,
              courses (
                title
              )
            )
          `)
          .eq('student_id', studentId);

        const quizzesList: StudentQuiz[] = (quizzesData || []).map((qs: any) => ({
          quizId: qs.quiz_id,
          quizTitle: qs.quizzes?.title || 'Unknown Quiz',
          courseTitle: qs.quizzes?.courses?.title || 'Unknown Course',
          passingScore: qs.quizzes?.passing_score || 70,
          score: qs.score,
          passed: qs.passed,
          submittedAt: qs.submitted_at,
        }));
        setStudentQuizzes(prev => ({ ...prev, [studentId]: quizzesList }));

        // Fetch attendance records for this student
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_records')
          .select(`
            id,
            status,
            notes,
            marked_at,
            attendance_sessions (
              id,
              session_date,
              session_time,
              title,
              course_id,
              courses (
                id,
                title
              )
            )
          `)
          .eq('student_id', studentId)
          .order('marked_at', { ascending: false })
          .limit(50);

        if (attendanceError) {
          console.error(`Error fetching attendance for student ${studentId}:`, attendanceError);
          setStudentAttendance(prev => ({ ...prev, [studentId]: [] }));
        } else {
          // Filter out records where session or course data is missing
          const validRecords = (attendanceData || []).filter((ar: any) => 
            ar.attendance_sessions && ar.attendance_sessions.courses
          );

          const attendanceRecords = validRecords.map((ar: any) => ({
            id: ar.id,
            sessionDate: ar.attendance_sessions.session_date,
            sessionTime: ar.attendance_sessions.session_time,
            sessionTitle: ar.attendance_sessions.title,
            courseTitle: ar.attendance_sessions.courses.title,
            status: ar.status,
            notes: ar.notes,
          }));

          // Sort by date descending
          attendanceRecords.sort((a, b) => {
            const dateA = new Date(a.sessionDate).getTime();
            const dateB = new Date(b.sessionDate).getTime();
            return dateB - dateA;
          });

          setStudentAttendance(prev => ({ ...prev, [studentId]: attendanceRecords.slice(0, 20) }));
        }

        const student = studentsWithProfiles.find(s => s.student_id === studentId);

        return {
          studentId,
          studentName: student?.profile?.full_name || 'Unknown',
          enrolledCourses: enrollments.count || 0,
          completedCourses: completed.count || 0,
          certificates: certs.count || 0,
          assignments: assignments.count || 0,
          assignmentsCompleted: assignmentsCompleted.count || 0,
          quizzes: quizzes.count || 0,
          quizzesPassed: quizzesPassed.count || 0,
          averageScore,
        };
      });

      const progressData = await Promise.all(progressPromises);
      setStudentProgress(progressData);
      
      // Log summary
      console.log('Guardian Dashboard Data Summary:');
      console.log(`- Students: ${studentsWithProfiles.length}`);
      console.log(`- Total Enrollments: ${progressData.reduce((acc, s) => acc + s.enrolledCourses, 0)}`);
      console.log(`- Total Completed: ${progressData.reduce((acc, s) => acc + s.completedCourses, 0)}`);
      console.log(`- Total Certificates: ${progressData.reduce((acc, s) => acc + s.certificates, 0)}`);
      
    } catch (error: any) {
      console.error('Error fetching guardian data:', error);
      setError(`Failed to load dashboard data: ${error.message || 'Unknown error'}. Please ensure you have proper permissions and try refreshing the page.`);
    } finally {
      setLoadingData(false);
    }
  };


  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-destructive text-lg font-semibold">{error}</div>
          <Button onClick={() => fetchGuardianData()}>Retry</Button>
        </div>
      </div>
    );
  }

  const totalStudents = students.length;
  const totalEnrolled = studentProgress.reduce((acc, s) => acc + s.enrolledCourses, 0);
  const totalCompleted = studentProgress.reduce((acc, s) => acc + s.completedCourses, 0);
  const totalCertificates = studentProgress.reduce((acc, s) => acc + s.certificates, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-500/5">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Read-Only Notice Banner */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1 flex items-center gap-2">
                Read-Only Access
                <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 dark:text-blue-300">
                  View Only
                </Badge>
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                As a guardian, you have <strong>read-only access</strong> to your children's educational information. 
                You can view their courses, assignments, grades, attendance, and progress, but cannot modify or update any data.
                All changes must be made through the student's account or by contacting the school administrator.
              </p>
            </div>
          </div>
        </div>

        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-2">
                  Guardian Dashboard
                  <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-700 dark:text-blue-300 ml-2">
                    <Eye className="h-3 w-3 mr-1" />
                    View Only
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Monitor and support your children's learning journey
                </p>
              </div>
            </div>
          </div>
          <Badge variant="default" className="text-sm capitalize px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600">
            <Shield className="h-3 w-3 mr-1" />
            Guardian
          </Badge>
        </div>

        {/* Enhanced Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">My Students</CardTitle>
              <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors shadow-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {totalStudents}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Children under your care</p>
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-2">
                <Shield className="h-3 w-3" />
                <span className="font-medium">Active monitoring</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">Total Enrolled</CardTitle>
              <div className="p-3 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 transition-colors shadow-lg">
                <BookOpen className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {totalEnrolled}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Total course enrollments</p>
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-2">
                <TrendingUp className="h-3 w-3" />
                <span className="font-medium">Learning actively</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">Completed</CardTitle>
              <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors shadow-lg">
                <CheckCircle2 className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {totalCompleted}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Courses completed</p>
              <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 mt-2">
                <CheckCircle2 className="h-3 w-3" />
                <span className="font-medium">
                  {totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0}% completion
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">Certificates</CardTitle>
              <div className="p-3 rounded-xl bg-yellow-500/10 group-hover:bg-yellow-500/20 transition-colors shadow-lg">
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {totalCertificates}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Total achievements</p>
              <div className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                <Star className="h-3 w-3" />
                <span className="font-medium">Excellent progress</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Organized Sections */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList
            className="grid w-full grid-cols-5 max-w-2xl"
          >
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Enhanced Student Progress Cards */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Student Progress Overview
                  <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground ml-2">
                    <Eye className="h-3 w-3 mr-1" />
                    Read-Only
                  </Badge>
                </CardTitle>
                <CardDescription>Detailed insights into each student's learning journey</CardDescription>
              </div>
              {students.length > 0 && (
                <Badge variant="outline" className="text-sm">
                  {students.length} {students.length === 1 ? 'Student' : 'Students'}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-16 bg-muted/20 rounded-xl">
                <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-muted/40 flex items-center justify-center">
                  <Users className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Students Assigned</h3>
                <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                  No students have been assigned to you yet.
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Please contact an administrator to link student accounts and start monitoring their progress.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {studentProgress.map((student, index) => {
                  const completionRate = student.enrolledCourses > 0 
                    ? (student.completedCourses / student.enrolledCourses) * 100 
                    : 0;
                  
                  const chartData = [
                    {
                      name: 'Completion',
                      value: Math.round(completionRate),
                      fill: completionRate > 70 ? '#10b981' : completionRate > 40 ? '#f59e0b' : '#ef4444'
                    }
                  ];

                  const progressData = [
                    { name: 'Enrolled', value: student.enrolledCourses, fill: '#3b82f6' },
                    { name: 'Completed', value: student.completedCourses, fill: '#10b981' },
                    { name: 'Certificates', value: student.certificates, fill: '#f59e0b' }
                  ];

                  return (
                    <Card 
                      key={student.studentId}
                      className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 p-6">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg text-white text-2xl font-bold">
                              {student.studentName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-foreground">{student.studentName}</h3>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="secondary" className="text-xs">
                                  {students.find(s => s.student_id === student.studentId)?.relationship || 'Student'}
                                </Badge>
                                {completionRate > 70 && (
                                  <Badge className="text-xs bg-green-500 hover:bg-green-600">
                                    <Star className="h-3 w-3 mr-1" />
                                    Excellent
                                  </Badge>
                                )}
                              </div>
                              {/* Show ALL teachers for this student */}
                              {(students.find(s => s.student_id === student.studentId)?.teachers && 
                                students.find(s => s.student_id === student.studentId)!.teachers!.length > 0) ||
                               (studentTeachers[student.studentId] && studentTeachers[student.studentId].length > 0) ? (
                                <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    All Associated Teachers
                                  </p>
                                  <div className="space-y-2">
                                    {(() => {
                                      const allTeachers = [
                                        ...(students.find(s => s.student_id === student.studentId)?.teachers || []),
                                        ...(studentTeachers[student.studentId] || [])
                                      ];
                                      // Remove duplicates
                                      const uniqueTeachers = Array.from(
                                        new Map(allTeachers.map(t => [`${t.id}-${t.course_title}`, t])).values()
                                      );
                                      return uniqueTeachers.map((teacher, idx) => (
                                        <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded-md border border-blue-100 dark:border-blue-900">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <p className="font-medium text-sm">{teacher.name}</p>
                                              <p className="text-xs text-muted-foreground mt-1">{teacher.course_title}</p>
                                              <div className="flex items-center gap-3 mt-2">
                                                {teacher.email && (
                                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Mail className="h-3 w-3" />
                                                    <span>{teacher.email}</span>
                                                  </div>
                                                )}
                                                {teacher.phone && (
                                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Phone className="h-3 w-3" />
                                                    <span>{teacher.phone}</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                              <div className="h-10 w-10 mx-auto rounded-lg bg-blue-500/20 flex items-center justify-center mb-2">
                                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <p className="text-2xl font-bold text-foreground">{student.enrolledCourses}</p>
                              <p className="text-xs text-muted-foreground font-medium">Enrolled Courses</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                              <div className="h-10 w-10 mx-auto rounded-lg bg-green-500/20 flex items-center justify-center mb-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                              <p className="text-2xl font-bold text-foreground">{student.completedCourses}</p>
                              <p className="text-xs text-muted-foreground font-medium">Completed</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                              <div className="h-10 w-10 mx-auto rounded-lg bg-yellow-500/20 flex items-center justify-center mb-2">
                                <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              </div>
                              <p className="text-2xl font-bold text-foreground">{student.certificates}</p>
                              <p className="text-xs text-muted-foreground font-medium">Certificates</p>
                            </div>
                            {student.averageScore !== undefined && (
                              <div className="text-center p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                <div className="h-10 w-10 mx-auto rounded-lg bg-purple-500/20 flex items-center justify-center mb-2">
                                  <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <p className="text-2xl font-bold text-foreground">{student.averageScore}%</p>
                                <p className="text-xs text-muted-foreground font-medium">Avg Score</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Progress Chart */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <Target className="h-4 w-4 text-primary" />
                              Overall Completion Rate
                            </h4>
                            {student.enrolledCourses > 0 ? (
                              <div className="flex items-center gap-6">
                                <ResponsiveContainer width={120} height={120}>
                                  <RadialBarChart 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius="60%" 
                                    outerRadius="100%" 
                                    barSize={15}
                                    data={chartData}
                                    startAngle={90}
                                    endAngle={-270}
                                  >
                                    <RadialBar
                                      background
                                      dataKey="value"
                                      cornerRadius={10}
                                    />
                                    <text
                                      x="50%"
                                      y="50%"
                                      textAnchor="middle"
                                      dominantBaseline="middle"
                                      className="fill-foreground text-xl font-bold"
                                    >
                                      {Math.round(completionRate)}%
                                    </text>
                                  </RadialBarChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-3">
                                  <div>
                                    <div className="flex justify-between text-sm mb-1">
                                      <span className="text-muted-foreground">Progress</span>
                                      <span className="font-semibold">{student.completedCourses} / {student.enrolledCourses}</span>
                                    </div>
                                    <Progress value={completionRate} className="h-2" />
                                  </div>
                                  <div className="flex items-center gap-2 text-xs">
                                    {completionRate > 70 ? (
                                      <>
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <span className="text-green-600 dark:text-green-400 font-medium">Excellent Progress!</span>
                                      </>
                                    ) : completionRate > 40 ? (
                                      <>
                                        <Clock className="h-4 w-4 text-orange-500" />
                                        <span className="text-orange-600 dark:text-orange-400 font-medium">Good Progress</span>
                                      </>
                                    ) : (
                                      <>
                                        <TrendingUp className="h-4 w-4 text-blue-500" />
                                        <span className="text-blue-600 dark:text-blue-400 font-medium">Getting Started</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No courses enrolled yet</p>
                            )}
                          </div>

                          {/* Activity Breakdown */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-primary" />
                              Learning Activity
                            </h4>
                            {student.enrolledCourses > 0 ? (
                              <ResponsiveContainer width="100%" height={120}>
                                <BarChart data={progressData}>
                                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                  <XAxis dataKey="name" className="text-xs" />
                                  <YAxis className="text-xs" />
                                  <Tooltip 
                                    contentStyle={{ 
                                      backgroundColor: 'hsl(var(--card))', 
                                      border: '1px solid hsl(var(--border))',
                                      borderRadius: '8px'
                                    }}
                                  />
                                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                    {progressData.map((entry, idx) => (
                                      <Cell key={`cell-${idx}`} fill={entry.fill} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            ) : (
                              <p className="text-sm text-muted-foreground">No activity data available</p>
                            )}
                          </div>
                        </div>

                        {/* Detailed Student Data - Expandable Sections */}
                        <div className="mt-6 space-y-4">
                          <Collapsible
                            open={selectedStudentId === student.studentId}
                            onOpenChange={(open) => setSelectedStudentId(open ? student.studentId : null)}
                          >
                            <CollapsibleTrigger asChild>
                              <Button variant="outline" className="w-full justify-between" disabled={false}>
                                <span className="flex items-center gap-2">
                                  <Eye className="h-4 w-4" />
                                  View Detailed Information
                                  <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground ml-2">
                                    Read-Only
                                  </Badge>
                                </span>
                                {selectedStudentId === student.studentId ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-4 space-y-4">
                              {/* Courses Section */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <BookOpen className="h-5 w-5" />
                                    Enrolled Courses
                                    <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground ml-2">
                                      <Eye className="h-3 w-3 mr-1" />
                                      View Only
                                    </Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {studentCourses[student.studentId] && studentCourses[student.studentId].length > 0 ? (
                                    <div className="space-y-3">
                                      {studentCourses[student.studentId].map((course) => {
                                        const isCompleted = course.completedAt !== null;
                                        const progressColor = course.progress >= 80 ? 'text-green-600 dark:text-green-400' : 
                                                             course.progress >= 50 ? 'text-blue-600 dark:text-blue-400' : 
                                                             'text-orange-600 dark:text-orange-400';
                                        return (
                                          <div key={course.courseId} className="group p-5 border-2 rounded-xl space-y-4 hover:shadow-lg hover:border-primary/30 transition-all duration-300 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-sm">
                                            <div className="flex items-start justify-between gap-4">
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-start gap-3 mb-2">
                                                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${
                                                    isCompleted ? 'bg-green-500/10' : 'bg-blue-500/10'
                                                  }`}>
                                                    <BookOpen className={`h-6 w-6 ${
                                                      isCompleted ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'
                                                    }`} />
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
                                                      {course.courseTitle}
                                                    </h4>
                                                    {course.courseDescription && (
                                                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                                        {course.courseDescription}
                                                      </p>
                                                    )}
                                                  </div>
                                                </div>
                                                
                                                {/* Progress Bar */}
                                                <div className="mb-3">
                                                  <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-medium text-muted-foreground">Progress</span>
                                                    <span className={`text-sm font-bold ${progressColor}`}>
                                                      {course.progress}%
                                                    </span>
                                                  </div>
                                                  <Progress 
                                                    value={course.progress} 
                                                    className="h-2.5"
                                                    style={{
                                                      background: 'hsl(var(--muted))'
                                                    }}
                                                  />
                                                </div>

                                                {/* Course Info */}
                                                <div className="grid grid-cols-2 gap-3 mt-4">
                                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    <span className="font-medium">
                                                      Enrolled: {format(new Date(course.enrolledAt), 'MMM dd, yyyy')}
                                                    </span>
                                                  </div>
                                                  {course.completedAt && (
                                                    <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                                      <span className="font-medium">
                                                        Completed: {format(new Date(course.completedAt), 'MMM dd, yyyy')}
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Teacher Info */}
                                                {course.teacherName && (
                                                  <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                                                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                                                      <Users className="h-3.5 w-3.5" />
                                                      Course Teacher
                                                    </p>
                                                    <div className="flex items-center gap-2 text-sm">
                                                      <span className="font-medium text-blue-800 dark:text-blue-200">{course.teacherName}</span>
                                                      {course.teacherEmail && (
                                                        <a 
                                                          href={`mailto:${course.teacherEmail}`}
                                                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                                          onClick={(e) => e.stopPropagation()}
                                                        >
                                                          <Mail className="h-3 w-3" />
                                                          Contact
                                                        </a>
                                                      )}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                              
                                              {/* Status Badge */}
                                              <div className="flex flex-col items-end gap-2 shrink-0">
                                                {isCompleted ? (
                                                  <Badge className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5">
                                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                                    Completed
                                                  </Badge>
                                                ) : (
                                                  <Badge variant="outline" className="border-blue-500/50 text-blue-700 dark:text-blue-300 px-3 py-1.5">
                                                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                                                    In Progress
                                                  </Badge>
                                                )}
                                                <Badge variant="outline" className="text-xs border-muted-foreground/20 text-muted-foreground">
                                                  <Eye className="h-3 w-3 mr-1" />
                                                  View Only
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No courses enrolled</p>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Assignments Section */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Assignments & Exams
                                    {student.assignments !== undefined && (
                                      <Badge variant="secondary" className="ml-2">
                                        {student.assignmentsCompleted || 0} / {student.assignments || 0} Completed
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground ml-2">
                                      <Eye className="h-3 w-3 mr-1" />
                                      View Only
                                    </Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {studentAssignments[student.studentId] && studentAssignments[student.studentId].length > 0 ? (
                                    <div className="space-y-3">
                                      {studentAssignments[student.studentId].map((assignment) => {
                                        const percentage = assignment.maxScore > 0 
                                          ? Math.round((assignment.score || 0) / assignment.maxScore * 100) 
                                          : 0;
                                        const scoreColor = percentage >= 70 ? 'text-green-600 dark:text-green-400' : 
                                                          percentage >= 50 ? 'text-orange-600 dark:text-orange-400' : 
                                                          'text-red-600 dark:text-red-400';
                                        const badgeColor = percentage >= 70 ? 'bg-green-500 hover:bg-green-600' : 
                                                          percentage >= 50 ? 'bg-orange-500 hover:bg-orange-600' : 
                                                          'bg-red-500 hover:bg-red-600';
                                        return (
                                          <div key={assignment.assignmentId} className="group p-4 border-2 rounded-xl hover:shadow-md hover:border-primary/20 transition-all duration-300 bg-gradient-to-br from-card/50 to-card/30">
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                              <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-base text-foreground mb-1 group-hover:text-primary transition-colors">
                                                  {assignment.assignmentTitle}
                                                </h4>
                                                <p className="text-sm text-muted-foreground mb-2">{assignment.courseTitle}</p>
                                              </div>
                                              {assignment.score !== null ? (
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                  <Badge className={`${badgeColor} text-white px-3 py-1.5`}>
                                                    {assignment.score} / {assignment.maxScore}
                                                  </Badge>
                                                  <span className={`text-xs font-bold ${scoreColor}`}>
                                                    {percentage}%
                                                  </span>
                                                </div>
                                              ) : (
                                                <Badge variant="outline" className="border-yellow-500/50 text-yellow-700 dark:text-yellow-300">
                                                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                                                  Pending
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground mb-3">
                                              {assignment.dueDate && (
                                                <div className="flex items-center gap-1.5">
                                                  <Calendar className="h-3.5 w-3.5" />
                                                  <span>Due: {format(new Date(assignment.dueDate), 'MMM dd, yyyy')}</span>
                                                </div>
                                              )}
                                              {assignment.submittedAt && (
                                                <div className="flex items-center gap-1.5">
                                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                                  <span>Submitted: {format(new Date(assignment.submittedAt), 'MMM dd, yyyy')}</span>
                                                </div>
                                              )}
                                              {assignment.gradedAt && (
                                                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                                  <Award className="h-3.5 w-3.5" />
                                                  <span>Graded: {format(new Date(assignment.gradedAt), 'MMM dd, yyyy')}</span>
                                                </div>
                                              )}
                                            </div>
                                            {assignment.feedback && (
                                              <div className="mt-3 pt-3 border-t border-border/50">
                                                <p className="text-xs font-medium text-muted-foreground mb-1.5">Teacher Feedback:</p>
                                                <p className="text-sm text-foreground/80 bg-muted/50 p-3 rounded-lg italic border-l-2 border-primary/30">
                                                  "{assignment.feedback}"
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                                      <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                                      <p className="text-sm font-medium text-muted-foreground">No assignments submitted</p>
                                      <p className="text-xs text-muted-foreground mt-1">Assignments will appear here once submitted</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Quizzes Section */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5" />
                                    Quizzes & Tests
                                    {student.quizzes !== undefined && (
                                      <Badge variant="secondary" className="ml-2">
                                        {student.quizzesPassed || 0} / {student.quizzes || 0} Passed
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground ml-2">
                                      <Eye className="h-3 w-3 mr-1" />
                                      View Only
                                    </Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {studentQuizzes[student.studentId] && studentQuizzes[student.studentId].length > 0 ? (
                                    <div className="space-y-3">
                                      {studentQuizzes[student.studentId].map((quiz) => {
                                        const passedColor = quiz.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                        const badgeColor = quiz.passed ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600';
                                        return (
                                          <div key={quiz.quizId} className="group p-4 border-2 rounded-xl hover:shadow-md hover:border-primary/20 transition-all duration-300 bg-gradient-to-br from-card/50 to-card/30">
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                              <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-base text-foreground mb-1 group-hover:text-primary transition-colors">
                                                  {quiz.quizTitle}
                                                </h4>
                                                <p className="text-sm text-muted-foreground mb-2">{quiz.courseTitle}</p>
                                              </div>
                                              {quiz.score !== null ? (
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                  <Badge className={`${badgeColor} text-white px-3 py-1.5`}>
                                                    {quiz.score}% {quiz.passed ? '✓' : '✗'}
                                                  </Badge>
                                                  <span className={`text-xs font-bold ${passedColor}`}>
                                                    {quiz.passed ? 'Passed' : 'Failed'}
                                                  </span>
                                                </div>
                                              ) : (
                                                <Badge variant="outline" className="border-gray-500/50 text-gray-700 dark:text-gray-300">
                                                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                                                  Not Taken
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                              <div className="flex items-center gap-1.5">
                                                <Target className="h-3.5 w-3.5" />
                                                <span>Passing: {quiz.passingScore}%</span>
                                              </div>
                                              {quiz.submittedAt && (
                                                <div className="flex items-center gap-1.5">
                                                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                                                  <span>Submitted: {format(new Date(quiz.submittedAt), 'MMM dd, yyyy')}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                                      <GraduationCap className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                                      <p className="text-sm font-medium text-muted-foreground">No quizzes taken</p>
                                      <p className="text-xs text-muted-foreground mt-1">Quiz results will appear here once completed</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Attendance Section */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Attendance Records
                                    <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground ml-2">
                                      <Eye className="h-3 w-3 mr-1" />
                                      View Only
                                    </Badge>
                                  </CardTitle>
                                  <CardDescription>Recent attendance for {student.studentName} (Read-Only)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                  {studentAttendance[student.studentId] && studentAttendance[student.studentId].length > 0 ? (
                                    <div className="space-y-3">
                                      {/* Attendance Summary */}
                                      <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-muted/30 rounded-lg">
                                        {['present', 'absent', 'late', 'excused'].map((status) => {
                                          const count = studentAttendance[student.studentId].filter(r => r.status === status).length;
                                          const colors = {
                                            present: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', icon: CheckCircle2 },
                                            absent: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', icon: XCircle },
                                            late: { bg: 'bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400', icon: Clock },
                                            excused: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', icon: UserCheck }
                                          };
                                          const { bg, text, icon: Icon } = colors[status as keyof typeof colors];
                                          return (
                                            <div key={status} className={`${bg} rounded-lg p-2 text-center`}>
                                              <Icon className={`h-4 w-4 mx-auto mb-1 ${text}`} />
                                              <p className={`text-lg font-bold ${text}`}>{count}</p>
                                              <p className="text-xs text-muted-foreground capitalize">{status}</p>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      {studentAttendance[student.studentId].slice(0, 10).map((record) => {
                                        const statusColors = {
                                          present: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600 dark:text-green-400', badge: 'bg-green-500 hover:bg-green-600' },
                                          absent: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400', badge: 'bg-red-500 hover:bg-red-600' },
                                          late: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', badge: 'bg-yellow-500 hover:bg-yellow-600' },
                                          excused: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-500 hover:bg-blue-600' }
                                        };
                                        const colors = statusColors[record.status];
                                        return (
                                          <div 
                                            key={record.id} 
                                            className={`flex items-center justify-between p-4 rounded-xl ${colors.bg} ${colors.border} border-2 hover:shadow-md transition-all duration-300`}
                                          >
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 mb-1">
                                                <Calendar className={`h-4 w-4 ${colors.text}`} />
                                                <p className="font-semibold text-sm text-foreground">
                                                  {record.sessionTitle || 'Class Session'}
                                                </p>
                                              </div>
                                              <p className="text-xs text-muted-foreground mb-1">
                                                {record.courseTitle}
                                              </p>
                                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                  <Calendar className="h-3 w-3" />
                                                  {format(new Date(record.sessionDate), 'MMM dd, yyyy')}
                                                </span>
                                                {record.sessionTime && (
                                                  <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {record.sessionTime}
                                                  </span>
                                                )}
                                              </div>
                                              {record.notes && (
                                                <div className="mt-2 pt-2 border-t border-border/30">
                                                  <p className="text-xs text-muted-foreground italic">
                                                    <span className="font-medium">Note:</span> {record.notes}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                            <Badge 
                                              className={`ml-3 shrink-0 ${colors.badge} text-white px-3 py-1.5`}
                                            >
                                              {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                            </Badge>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                                      <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                                      <p className="text-sm font-medium text-muted-foreground">No attendance records yet</p>
                                      <p className="text-xs text-muted-foreground mt-1">Attendance will appear here once sessions are marked</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Grades Summary Section */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <Award className="h-5 w-5" />
                                    Grades Summary
                                    <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground ml-2">
                                      <Eye className="h-3 w-3 mr-1" />
                                      View Only
                                    </Badge>
                                  </CardTitle>
                                  <CardDescription>All graded assessments for {student.studentName} (Read-Only)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-6">
                                    {/* Assignments Grades */}
                                    {studentAssignments[student.studentId] && 
                                     studentAssignments[student.studentId].filter(a => a.score !== null).length > 0 && (
                                      <div>
                                        <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-blue-600" />
                                          Assignments
                                          <Badge variant="secondary" className="ml-2 text-xs">
                                            {studentAssignments[student.studentId].filter(a => a.score !== null).length} Graded
                                          </Badge>
                                        </h4>
                                        <div className="space-y-3">
                                          {studentAssignments[student.studentId]
                                            .filter(a => a.score !== null)
                                            .slice(0, 5)
                                            .map((assignment) => {
                                              const percentage = assignment.maxScore > 0 
                                                ? Math.round((assignment.score || 0) / assignment.maxScore * 100) 
                                                : 0;
                                              const scoreColor = percentage >= 70 ? 'text-green-600 dark:text-green-400' : 
                                                                percentage >= 50 ? 'text-orange-600 dark:text-orange-400' : 
                                                                'text-red-600 dark:text-red-400';
                                              return (
                                                <div 
                                                  key={assignment.assignmentId} 
                                                  className="group p-4 rounded-xl border-2 border-border/50 hover:shadow-md hover:border-primary/20 transition-all duration-300 bg-gradient-to-br from-card/50 to-card/30"
                                                >
                                                  <div className="flex items-start justify-between gap-4 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                      <h5 className="font-semibold text-sm text-foreground mb-1 group-hover:text-primary transition-colors truncate">
                                                        {assignment.assignmentTitle}
                                                      </h5>
                                                      <p className="text-xs text-muted-foreground">{assignment.courseTitle}</p>
                                                    </div>
                                                    <div className="ml-3 text-right shrink-0">
                                                      <p className={`font-bold text-xl ${scoreColor}`}>
                                                        {assignment.score} / {assignment.maxScore}
                                                      </p>
                                                      <p className={`text-sm font-bold ${scoreColor}`}>
                                                        {percentage}%
                                                      </p>
                                                      <Progress value={percentage} className="w-16 h-1.5 mt-1.5" />
                                                    </div>
                                                  </div>
                                                  {assignment.feedback && (
                                                    <div className="mt-3 pt-3 border-t border-border/30">
                                                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Teacher Feedback:</p>
                                                      <p className="text-xs text-foreground/80 bg-muted/50 p-2.5 rounded-lg italic border-l-2 border-primary/30">
                                                        "{assignment.feedback}"
                                                      </p>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Quizzes Grades */}
                                    {studentQuizzes[student.studentId] && 
                                     studentQuizzes[student.studentId].filter(q => q.score !== null).length > 0 && (
                                      <div>
                                        <h4 className="font-semibold text-base mb-3 flex items-center gap-2">
                                          <GraduationCap className="h-4 w-4 text-purple-600" />
                                          Quizzes & Tests
                                          <Badge variant="secondary" className="ml-2 text-xs">
                                            {studentQuizzes[student.studentId].filter(q => q.score !== null).length} Completed
                                          </Badge>
                                        </h4>
                                        <div className="space-y-3">
                                          {studentQuizzes[student.studentId]
                                            .filter(q => q.score !== null)
                                            .slice(0, 5)
                                            .map((quiz) => {
                                              const passedColor = quiz.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                                              const badgeColor = quiz.passed ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600';
                                              return (
                                                <div 
                                                  key={quiz.quizId} 
                                                  className="group p-4 rounded-xl border-2 border-border/50 hover:shadow-md hover:border-primary/20 transition-all duration-300 bg-gradient-to-br from-card/50 to-card/30"
                                                >
                                                  <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1 min-w-0">
                                                      <h5 className="font-semibold text-sm text-foreground mb-1 group-hover:text-primary transition-colors truncate">
                                                        {quiz.quizTitle}
                                                      </h5>
                                                      <p className="text-xs text-muted-foreground mb-2">{quiz.courseTitle}</p>
                                                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                          <Target className="h-3.5 w-3.5" />
                                                          Passing: {quiz.passingScore}%
                                                        </span>
                                                      </div>
                                                    </div>
                                                    <div className="ml-3 text-right shrink-0">
                                                      <Badge className={`${badgeColor} text-white px-3 py-1.5 mb-1`}>
                                                        {quiz.score}% {quiz.passed ? '✓' : '✗'}
                                                      </Badge>
                                                      <p className={`text-xs font-bold ${passedColor}`}>
                                                        {quiz.passed ? 'Passed' : 'Failed'}
                                                      </p>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      </div>
                                    )}

                                    {(!studentAssignments[student.studentId] || 
                                      studentAssignments[student.studentId].filter(a => a.score !== null).length === 0) &&
                                     (!studentQuizzes[student.studentId] || 
                                      studentQuizzes[student.studentId].filter(q => q.score !== null).length === 0) && (
                                      <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                                        <Award className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                                        <p className="text-sm font-medium text-muted-foreground">No grades available yet</p>
                                        <p className="text-xs text-muted-foreground mt-1">Grades will appear here once assessments are graded</p>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Exams Section */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Exams
                                    {studentExams[student.studentId] && (
                                      <Badge variant="secondary" className="ml-2">
                                        {studentExams[student.studentId].length} Exam{studentExams[student.studentId].length !== 1 ? 's' : ''}
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground ml-2">
                                      <Eye className="h-3 w-3 mr-1" />
                                      View Only
                                    </Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {studentExams[student.studentId] && studentExams[student.studentId].length > 0 ? (
                                    <div className="space-y-3">
                                      {studentExams[student.studentId].map((exam) => {
                                        const percentage = exam.maxScore > 0 
                                          ? Math.round((exam.score || 0) / exam.maxScore * 100) 
                                          : 0;
                                        const scoreColor = percentage >= 70 ? 'text-green-600 dark:text-green-400' : 
                                                          percentage >= 50 ? 'text-orange-600 dark:text-orange-400' : 
                                                          'text-red-600 dark:text-red-400';
                                        const badgeColor = percentage >= 70 ? 'bg-green-500 hover:bg-green-600' : 
                                                          percentage >= 50 ? 'bg-orange-500 hover:bg-orange-600' : 
                                                          'bg-red-500 hover:bg-red-600';
                                        return (
                                          <div key={exam.examId} className="group p-4 border-2 rounded-xl hover:shadow-md hover:border-primary/20 transition-all duration-300 bg-gradient-to-br from-card/50 to-card/30">
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                              <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold text-base text-foreground mb-1 group-hover:text-primary transition-colors">
                                                  {exam.examTitle}
                                                </h4>
                                                <p className="text-sm text-muted-foreground mb-2">{exam.courseTitle}</p>
                                              </div>
                                              {exam.score !== null ? (
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                  <Badge className={`${badgeColor} text-white px-3 py-1.5`}>
                                                    {exam.score} / {exam.maxScore}
                                                  </Badge>
                                                  <span className={`text-xs font-bold ${scoreColor}`}>
                                                    {percentage}%
                                                  </span>
                                                </div>
                                              ) : (
                                                <Badge variant="outline" className="border-yellow-500/50 text-yellow-700 dark:text-yellow-300">
                                                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                                                  Pending
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground mb-3">
                                              {exam.dueDate && (
                                                <div className="flex items-center gap-1.5">
                                                  <Calendar className="h-3.5 w-3.5" />
                                                  <span>Due: {format(new Date(exam.dueDate), 'MMM dd, yyyy')}</span>
                                                </div>
                                              )}
                                              {exam.submittedAt && (
                                                <div className="flex items-center gap-1.5">
                                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                                  <span>Submitted: {format(new Date(exam.submittedAt), 'MMM dd, yyyy')}</span>
                                                </div>
                                              )}
                                              {exam.gradedAt && (
                                                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                                  <Award className="h-3.5 w-3.5" />
                                                  <span>Graded: {format(new Date(exam.gradedAt), 'MMM dd, yyyy')}</span>
                                                </div>
                                              )}
                                            </div>
                                            {exam.feedback && (
                                              <div className="mt-3 pt-3 border-t border-border/50">
                                                <p className="text-xs font-medium text-muted-foreground mb-1.5">Teacher Feedback:</p>
                                                <p className="text-sm text-foreground/80 bg-muted/50 p-3 rounded-lg italic border-l-2 border-primary/30">
                                                  "{exam.feedback}"
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                                      <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                                      <p className="text-sm font-medium text-muted-foreground">No exams taken</p>
                                      <p className="text-xs text-muted-foreground mt-1">Exam results will appear here once completed</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Library Section */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <Library className="h-5 w-5" />
                                    Library Access
                                    {studentLibraryItems[student.studentId] && (
                                      <Badge variant="secondary" className="ml-2">
                                        {studentLibraryItems[student.studentId].length} Items
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground ml-2">
                                      <Eye className="h-3 w-3 mr-1" />
                                      View Only
                                    </Badge>
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {studentLibraryItems[student.studentId] && studentLibraryItems[student.studentId].length > 0 ? (
                                    <div className="space-y-3">
                                      {studentLibraryItems[student.studentId].map((item) => {
                                        const isBook = item.type === 'book';
                                        return (
                                          <div key={item.id} className="group flex items-center justify-between p-4 border-2 rounded-xl hover:shadow-md hover:border-primary/20 transition-all duration-300 bg-gradient-to-br from-card/50 to-card/30">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                                                isBook ? 'bg-blue-500/10' : 'bg-purple-500/10'
                                              }`}>
                                                {isBook ? (
                                                  <Book className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                ) : (
                                                  <Video className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                                )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-foreground truncate">{item.title}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                  <Badge variant="outline" className="text-xs">
                                                    {isBook ? 'Book' : 'Video'}
                                                  </Badge>
                                                  {item.accessedAt && (
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                      <Clock className="h-3 w-3" />
                                                      {format(new Date(item.accessedAt), 'MMM dd, yyyy')}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            {item.progress !== undefined && item.progress > 0 && (
                                              <div className="text-right shrink-0 ml-4">
                                                <div className={`text-sm font-bold ${
                                                  item.progress >= 80 ? 'text-green-600 dark:text-green-400' :
                                                  item.progress >= 50 ? 'text-blue-600 dark:text-blue-400' :
                                                  'text-orange-600 dark:text-orange-400'
                                                }`}>
                                                  {item.progress}%
                                                </div>
                                                <Progress value={item.progress} className="w-20 h-2 mt-1" />
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed">
                                      <Library className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                                      <p className="text-sm font-medium text-muted-foreground">No library items accessed yet</p>
                                      <p className="text-xs text-muted-foreground mt-1">Library access will appear here once student accesses resources</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Average Score */}
                              {student.averageScore !== undefined && (
                                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                                  <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                      <BarChart3 className="h-5 w-5 text-primary" />
                                      Overall Performance
                                      <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground ml-2">
                                        <Eye className="h-3 w-3 mr-1" />
                                        View Only
                                      </Badge>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-center py-4">
                                      <div className={`text-5xl font-black mb-2 ${
                                        student.averageScore >= 80 ? 'text-green-600 dark:text-green-400' :
                                        student.averageScore >= 60 ? 'text-blue-600 dark:text-blue-400' :
                                        'text-orange-600 dark:text-orange-400'
                                      }`}>
                                        {student.averageScore}%
                                      </div>
                                      <p className="text-sm font-medium text-muted-foreground mb-4">Average Score Across All Assessments</p>
                                      <Progress 
                                        value={student.averageScore} 
                                        className="h-3 mt-2"
                                        style={{
                                          background: 'hsl(var(--muted))'
                                        }}
                                      />
                                      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                          <span className="text-muted-foreground">Excellent (80%+)</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                          <span className="text-muted-foreground">Good (60-79%)</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                          <span className="text-muted-foreground">Needs Improvement (&lt;60%)</span>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6 mt-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  All Students
                  <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground ml-2">
                    <Eye className="h-3 w-3 mr-1" />
                    Read-Only
                  </Badge>
                </CardTitle>
                <CardDescription>Comprehensive read-only view of all students under your care</CardDescription>
              </CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <div className="text-center py-16 bg-muted/20 rounded-xl">
                    <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-muted/40 flex items-center justify-center">
                      <Users className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Students Assigned</h3>
                    <p className="text-muted-foreground mb-2 max-w-md mx-auto">
                      No students have been assigned to you yet.
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Please contact an administrator to link student accounts and start monitoring their progress.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {studentProgress.map((student, index) => {
                      const completionRate = student.enrolledCourses > 0 
                        ? (student.completedCourses / student.enrolledCourses) * 100 
                        : 0;

                      return (
                        <Card 
                          key={student.studentId}
                          className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50"
                        >
                          <div className="bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 p-6">
                            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                              <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg text-white text-2xl font-bold">
                                  {student.studentName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-foreground">{student.studentName}</h3>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <Badge variant="secondary" className="text-xs">
                                      {students.find(s => s.student_id === student.studentId)?.relationship || 'Student'}
                                    </Badge>
                                    {completionRate > 70 && (
                                      <Badge className="text-xs bg-green-500 hover:bg-green-600">
                                        <Star className="h-3 w-3 mr-1" />
                                        Excellent
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 rounded-xl bg-blue-500/10 border-2 border-blue-500/20 hover:shadow-md transition-all">
                              <div className="h-10 w-10 mx-auto rounded-lg bg-blue-500/20 flex items-center justify-center mb-2">
                                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <p className="text-2xl font-bold text-foreground">{student.enrolledCourses}</p>
                              <p className="text-xs text-muted-foreground font-medium mt-1">Enrolled Courses</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-green-500/10 border-2 border-green-500/20 hover:shadow-md transition-all">
                              <div className="h-10 w-10 mx-auto rounded-lg bg-green-500/20 flex items-center justify-center mb-2">
                                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                              <p className="text-2xl font-bold text-foreground">{student.completedCourses}</p>
                              <p className="text-xs text-muted-foreground font-medium mt-1">Completed</p>
                            </div>
                            <div className="text-center p-4 rounded-xl bg-yellow-500/10 border-2 border-yellow-500/20 hover:shadow-md transition-all">
                              <div className="h-10 w-10 mx-auto rounded-lg bg-yellow-500/20 flex items-center justify-center mb-2">
                                <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              </div>
                              <p className="text-2xl font-bold text-foreground">{student.certificates}</p>
                              <p className="text-xs text-muted-foreground font-medium mt-1">Certificates</p>
                            </div>
                            {student.averageScore !== undefined && (
                              <div className="text-center p-4 rounded-xl bg-purple-500/10 border-2 border-purple-500/20 hover:shadow-md transition-all">
                                <div className="h-10 w-10 mx-auto rounded-lg bg-purple-500/20 flex items-center justify-center mb-2">
                                  <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <p className="text-2xl font-bold text-foreground">{student.averageScore}%</p>
                                <p className="text-xs text-muted-foreground font-medium mt-1">Avg Score</p>
                              </div>
                            )}
                          </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assessments Tab */}
          <TabsContent value="assessments" className="space-y-6 mt-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Student Assessments
                  <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground ml-2">
                    <Eye className="h-3 w-3 mr-1" />
                    Read-Only
                  </Badge>
                </CardTitle>
                <CardDescription>View all assignments, quizzes, and exams for your students (Read-Only)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {studentProgress.map((student) => (
                    <div key={student.studentId} className="space-y-4">
                      <h3 className="font-semibold text-lg">{student.studentName}</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        {studentAssignments[student.studentId] && studentAssignments[student.studentId].length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Assignments</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {studentAssignments[student.studentId].slice(0, 3).map((assignment) => (
                                  <div key={assignment.assignmentId} className="p-2 border rounded text-sm">
                                    <p className="font-medium">{assignment.assignmentTitle}</p>
                                    {assignment.score !== null && (
                                      <p className="text-xs text-muted-foreground">
                                        Score: {assignment.score} / {assignment.maxScore}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        {studentQuizzes[student.studentId] && studentQuizzes[student.studentId].length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Quizzes</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                {studentQuizzes[student.studentId].slice(0, 3).map((quiz) => (
                                  <div key={quiz.quizId} className="p-2 border rounded text-sm">
                                    <p className="font-medium">{quiz.quizTitle}</p>
                                    {quiz.score !== null && (
                                      <p className="text-xs text-muted-foreground">
                                        Score: {quiz.score}% {quiz.passed ? '✓' : '✗'}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-6 mt-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Library className="h-5 w-5 text-primary" />
                  Library Access
                  <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground ml-2">
                    <Eye className="h-3 w-3 mr-1" />
                    Read-Only
                  </Badge>
                </CardTitle>
                <CardDescription>Books and videos accessed by your students (Read-Only)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {studentProgress.map((student) => (
                    <div key={student.studentId} className="space-y-4">
                      <h3 className="font-semibold text-lg">{student.studentName}</h3>
                      {studentLibraryItems[student.studentId] && studentLibraryItems[student.studentId].length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-4">
                          {studentLibraryItems[student.studentId].map((item) => (
                            <Card key={item.id}>
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  {item.type === 'book' ? (
                                    <Book className="h-5 w-5 text-blue-500" />
                                  ) : (
                                    <Video className="h-5 w-5 text-purple-500" />
                                  )}
                                  <div className="flex-1">
                                    <p className="font-medium">{item.title}</p>
                                    <p className="text-xs text-muted-foreground">{item.type}</p>
                                  </div>
                                  {item.progress !== undefined && (
                                    <div className="text-right">
                                      <div className="text-sm font-semibold">{item.progress}%</div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No library items accessed</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Analytics & Insights
                  <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground ml-2">
                    <Eye className="h-3 w-3 mr-1" />
                    Read-Only
                  </Badge>
                </CardTitle>
                <CardDescription>Performance metrics and learning analytics (Read-Only)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {studentProgress.map((student) => {
                    const completionRate = student.enrolledCourses > 0 
                      ? (student.completedCourses / student.enrolledCourses) * 100 
                      : 0;
                    
                    const chartData = [{
                      name: 'Completion',
                      value: Math.round(completionRate),
                      fill: completionRate > 70 ? '#10b981' : completionRate > 40 ? '#f59e0b' : '#ef4444'
                    }];

                    return (
                      <Card key={student.studentId}>
                        <CardHeader>
                          <CardTitle className="text-base">{student.studentName}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center gap-6">
                              <ResponsiveContainer width={100} height={100}>
                                <RadialBarChart 
                                  cx="50%" 
                                  cy="50%" 
                                  innerRadius="60%" 
                                  outerRadius="100%" 
                                  barSize={10}
                                  data={chartData}
                                  startAngle={90}
                                  endAngle={-270}
                                >
                                  <RadialBar
                                    background
                                    dataKey="value"
                                    cornerRadius={10}
                                  />
                                  <text
                                    x="50%"
                                    y="50%"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="fill-foreground text-lg font-bold"
                                  >
                                    {Math.round(completionRate)}%
                                  </text>
                                </RadialBarChart>
                              </ResponsiveContainer>
                              <div className="flex-1 space-y-2">
                                <div className="text-sm">
                                  <span className="text-muted-foreground">Progress: </span>
                                  <span className="font-semibold">{student.completedCourses} / {student.enrolledCourses}</span>
                                </div>
                                {student.averageScore !== undefined && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Avg Score: </span>
                                    <span className="font-semibold">{student.averageScore}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GuardianDashboard;
