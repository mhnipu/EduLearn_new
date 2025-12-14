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
import { Users, BookOpen, Award, TrendingUp, Target, Eye, Shield, CheckCircle2, Clock, Trophy, Star, BarChart3, FileText, GraduationCap, ChevronDown, ChevronUp, Mail, Phone, Book, Video, Library } from 'lucide-react';
import {
  RadialBarChart, RadialBar, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

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
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Guardian Dashboard
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

        <Separator className="my-8" />

        {/* Enhanced Student Progress Cards */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Student Progress Overview
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

                          <div className="grid grid-cols-3 gap-6">
                            <div className="text-center">
                              <div className="h-12 w-12 mx-auto rounded-xl bg-blue-500/10 flex items-center justify-center mb-2">
                                <BookOpen className="h-6 w-6 text-blue-500" />
                              </div>
                              <p className="text-2xl font-bold">{student.enrolledCourses}</p>
                              <p className="text-xs text-muted-foreground">Enrolled</p>
                            </div>
                            <div className="text-center">
                              <div className="h-12 w-12 mx-auto rounded-xl bg-green-500/10 flex items-center justify-center mb-2">
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                              </div>
                              <p className="text-2xl font-bold">{student.completedCourses}</p>
                              <p className="text-xs text-muted-foreground">Completed</p>
                            </div>
                            <div className="text-center">
                              <div className="h-12 w-12 mx-auto rounded-xl bg-yellow-500/10 flex items-center justify-center mb-2">
                                <Trophy className="h-6 w-6 text-yellow-500" />
                              </div>
                              <p className="text-2xl font-bold">{student.certificates}</p>
                              <p className="text-xs text-muted-foreground">Certificates</p>
                            </div>
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
                              <Button variant="outline" className="w-full justify-between">
                                <span className="flex items-center gap-2">
                                  <Eye className="h-4 w-4" />
                                  View Detailed Information
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
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {studentCourses[student.studentId] && studentCourses[student.studentId].length > 0 ? (
                                    <div className="space-y-3">
                                      {studentCourses[student.studentId].map((course) => (
                                        <div key={course.courseId} className="p-4 border rounded-lg space-y-3 hover:bg-muted/50 transition-colors">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <p className="font-semibold text-lg">{course.courseTitle}</p>
                                              {course.courseDescription && (
                                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                  {course.courseDescription}
                                                </p>
                                              )}
                                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                <span>Enrolled: {new Date(course.enrolledAt).toLocaleDateString()}</span>
                                                {course.completedAt && (
                                                  <span className="text-green-600">
                                                    Completed: {new Date(course.completedAt).toLocaleDateString()}
                                                  </span>
                                                )}
                                              </div>
                                              {course.teacherName && (
                                                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md">
                                                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Course Teacher:</p>
                                                  <div className="flex items-center gap-2 text-sm">
                                                    <Users className="h-3 w-3" />
                                                    <span className="font-medium">{course.teacherName}</span>
                                              {course.teacherPhone && (
                                                <span className="text-muted-foreground">• {course.teacherPhone}</span>
                                              )}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                            <div className="ml-4 text-right">
                                              {course.completedAt ? (
                                                <Badge className="bg-green-500">Completed</Badge>
                                              ) : (
                                                <Badge variant="outline">In Progress</Badge>
                                              )}
                                              <div className="mt-2">
                                                <div className="text-sm font-semibold">{course.progress}%</div>
                                                <Progress value={course.progress} className="w-20 h-2 mt-1" />
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
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
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {studentAssignments[student.studentId] && studentAssignments[student.studentId].length > 0 ? (
                                    <div className="space-y-3">
                                      {studentAssignments[student.studentId].map((assignment) => (
                                        <div key={assignment.assignmentId} className="p-3 border rounded-lg">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                              <p className="font-medium">{assignment.assignmentTitle}</p>
                                              <p className="text-sm text-muted-foreground">{assignment.courseTitle}</p>
                                            </div>
                                            {assignment.score !== null ? (
                                              <Badge className={assignment.score >= (assignment.maxScore * 0.7) ? 'bg-green-500' : 'bg-orange-500'}>
                                                {assignment.score} / {assignment.maxScore}
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline">Pending</Badge>
                                            )}
                                          </div>
                                          <div className="text-xs text-muted-foreground space-y-1">
                                            {assignment.dueDate && (
                                              <p>Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                                            )}
                                            {assignment.submittedAt && (
                                              <p>Submitted: {new Date(assignment.submittedAt).toLocaleDateString()}</p>
                                            )}
                                            {assignment.gradedAt && (
                                              <p className="text-green-600">Graded: {new Date(assignment.gradedAt).toLocaleDateString()}</p>
                                            )}
                                            {assignment.feedback && (
                                              <p className="mt-2 p-2 bg-muted rounded">Feedback: {assignment.feedback}</p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No assignments submitted</p>
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
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {studentQuizzes[student.studentId] && studentQuizzes[student.studentId].length > 0 ? (
                                    <div className="space-y-3">
                                      {studentQuizzes[student.studentId].map((quiz) => (
                                        <div key={quiz.quizId} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                              <p className="font-medium">{quiz.quizTitle}</p>
                                              <p className="text-sm text-muted-foreground">{quiz.courseTitle}</p>
                                            </div>
                                            {quiz.score !== null ? (
                                              <Badge className={quiz.passed ? 'bg-green-500' : 'bg-red-500'}>
                                                {quiz.score}% {quiz.passed ? '✓' : '✗'}
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline">Not Taken</Badge>
                                            )}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            <p>Passing Score: {quiz.passingScore}%</p>
                                            {quiz.submittedAt && (
                                              <p>Submitted: {new Date(quiz.submittedAt).toLocaleDateString()}</p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No quizzes taken</p>
                                  )}
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
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {studentExams[student.studentId] && studentExams[student.studentId].length > 0 ? (
                                    <div className="space-y-3">
                                      {studentExams[student.studentId].map((exam) => (
                                        <div key={exam.examId} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                                          <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                              <p className="font-medium">{exam.examTitle}</p>
                                              <p className="text-sm text-muted-foreground">{exam.courseTitle}</p>
                                            </div>
                                            {exam.score !== null ? (
                                              <Badge className={exam.score >= (exam.maxScore * 0.7) ? 'bg-green-500' : exam.score >= (exam.maxScore * 0.5) ? 'bg-orange-500' : 'bg-red-500'}>
                                                {exam.score} / {exam.maxScore}
                                              </Badge>
                                            ) : (
                                              <Badge variant="outline">Pending</Badge>
                                            )}
                                          </div>
                                          <div className="text-xs text-muted-foreground space-y-1">
                                            {exam.dueDate && (
                                              <p>Due: {new Date(exam.dueDate).toLocaleDateString()}</p>
                                            )}
                                            {exam.submittedAt && (
                                              <p>Submitted: {new Date(exam.submittedAt).toLocaleDateString()}</p>
                                            )}
                                            {exam.gradedAt && (
                                              <p className="text-green-600">Graded: {new Date(exam.gradedAt).toLocaleDateString()}</p>
                                            )}
                                            {exam.feedback && (
                                              <p className="mt-2 p-2 bg-muted rounded">Feedback: {exam.feedback}</p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No exams taken</p>
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
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {studentLibraryItems[student.studentId] && studentLibraryItems[student.studentId].length > 0 ? (
                                    <div className="space-y-3">
                                      {studentLibraryItems[student.studentId].map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                                          <div className="flex items-center gap-3">
                                            {item.type === 'book' ? (
                                              <Book className="h-5 w-5 text-blue-500" />
                                            ) : (
                                              <Video className="h-5 w-5 text-purple-500" />
                                            )}
                                            <div>
                                              <p className="font-medium">{item.title}</p>
                                              <p className="text-xs text-muted-foreground">
                                                {item.type === 'book' ? 'Book' : 'Video'}
                                                {item.accessedAt && (
                                                  <span className="ml-2">
                                                    • Last accessed: {new Date(item.accessedAt).toLocaleDateString()}
                                                  </span>
                                                )}
                                              </p>
                                            </div>
                                          </div>
                                          {item.progress !== undefined && (
                                            <div className="text-right">
                                              <div className="text-sm font-semibold">{item.progress}%</div>
                                              <Progress value={item.progress} className="w-20 h-2 mt-1" />
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No library items accessed yet</p>
                                  )}
                                </CardContent>
                              </Card>

                              {/* Average Score */}
                              {student.averageScore !== undefined && (
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                      <BarChart3 className="h-5 w-5" />
                                      Overall Performance
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="text-center">
                                      <div className="text-4xl font-bold text-primary mb-2">
                                        {student.averageScore}%
                                      </div>
                                      <p className="text-sm text-muted-foreground">Average Score</p>
                                      <Progress value={student.averageScore} className="mt-4" />
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
      </div>
    </div>
  );
};

export default GuardianDashboard;
