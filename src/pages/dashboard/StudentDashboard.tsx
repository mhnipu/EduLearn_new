import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BookOpen, Award, Clock, Bookmark, Play, Library, FileText, TrendingUp, Target, CheckCircle2, 
  Zap, Star, Trophy, GraduationCap, ClipboardList, MessageSquare, Search, Filter, 
  AlertCircle, Loader2, Book, Video, Calendar, ExternalLink, ChevronRight, ArrowRight
} from 'lucide-react';
import {
  RadialBarChart, RadialBar, PieChart as RechartsPieChart, Pie, Cell,
  ResponsiveContainer, Legend, Tooltip
} from 'recharts';
import { format, isPast } from 'date-fns';

interface EnrolledCourse {
  id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  courses: {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
  };
}

interface BookmarkItem {
  id: string;
  content_id: string;
  content_type: string;
  created_at: string;
}

interface Certificate {
  id: string;
  course_id: string;
  certificate_url: string;
  issued_at: string;
  courses: {
    title: string;
  };
}

interface Assessment {
  id: string;
  title: string;
  assessment_type: string;
  course_id: string | null;
  course_title: string | null;
  due_date: string | null;
  max_score: number;
  is_active: boolean;
  submission_status: 'not_started' | 'submitted' | 'graded';
  score: number | null;
  submitted_at: string | null;
  created_at: string;
}

interface LibraryItem {
  id: string;
  title: string;
  type: 'book' | 'video';
  thumbnail_url: string | null;
  author?: string;
  duration_minutes?: number;
}

interface AttendanceRecord {
  id: string;
  session_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string | null;
  attendance_sessions: {
    id: string;
    session_date: string;
    session_time: string | null;
    title: string | null;
    courses: {
      title: string;
    };
  };
}

interface GradeResult {
  id: string;
  title: string;
  assessment_type: string;
  course_title: string;
  score: number | null;
  max_score: number;
  submitted_at: string | null;
  graded_at: string | null;
  feedback: string | null;
  due_date: string | null;
}

const ASSESSMENT_TYPES = [
  { value: 'all', label: 'All Types', icon: FileText },
  { value: 'assignment', label: 'Assignments', icon: ClipboardList },
  { value: 'quiz', label: 'Quizzes', icon: Target },
  { value: 'exam', label: 'Exams', icon: Award },
  { value: 'project', label: 'Projects', icon: BookOpen },
  { value: 'presentation', label: 'Presentations', icon: MessageSquare },
];

const StudentDashboard = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [gradeResults, setGradeResults] = useState<GradeResult[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<string>('all');
  const [assessmentSearchQuery, setAssessmentSearchQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && role && role !== 'student' && !['super_admin', 'admin', 'teacher'].includes(role)) {
      navigate(`/dashboard/${role}`);
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    try {
      // Fetch enrolled courses
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          courses(id, title, description, thumbnail_url)
        `)
        .eq('user_id', user?.id)
        .order('enrolled_at', { ascending: false });

      // Calculate actual progress for each course
      if (enrollments && user) {
        const coursesWithProgress = await Promise.all(
          enrollments.map(async (enrollment) => {
            // Get total lessons and materials for this course
            const [lessonsResult, materialsResult] = await Promise.all([
              supabase
                .from('lessons')
                .select('id', { count: 'exact', head: true })
                .eq('course_id', enrollment.course_id),
              supabase
                .from('course_materials')
                .select('id', { count: 'exact', head: true })
                .eq('course_id', enrollment.course_id),
            ]);

            const totalItems = (lessonsResult.count || 0) + (materialsResult.count || 0);

            // Get completed items
            const { count: completedCount } = await supabase
              .from('learning_progress')
              .select('*', { count: 'exact', head: true })
              .eq('student_id', user.id)
              .eq('completed', true)
              .in('content_id', [
                ...(lessonsResult.data?.map(l => l.id) || []),
                ...(materialsResult.data?.map(m => m.id) || []),
              ]);

            const progress = totalItems > 0 
              ? Math.round(((completedCount || 0) / totalItems) * 100)
              : 0;

            return {
              ...enrollment,
              progress: Math.min(progress, 100),
              totalItems,
              completedItems: completedCount || 0,
            };
          })
        );

        setEnrolledCourses(coursesWithProgress);
      } else {
        setEnrolledCourses(enrollments || []);
      }

      // Fetch bookmarks
      const { data: bookmarksData } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setBookmarks(bookmarksData || []);

      // Fetch certificates
      const { data: certsData } = await supabase
        .from('certificates')
        .select(`
          *,
          courses(title)
        `)
        .eq('user_id', user?.id);

      setCertificates(certsData || []);

      // Fetch assessments, library, attendance, and grades in parallel
      await Promise.all([
        fetchAssessments(),
        fetchLibraryContents(),
        fetchAttendanceRecords(),
        fetchGradeResults()
      ]);
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchAssessments = async () => {
    if (!user) return;
    setAssessmentsLoading(true);
    try {
      // Get enrolled course IDs
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user.id);

      const courseIds = enrollments?.map(e => e.course_id) || [];

      if (courseIds.length === 0) {
        setAssessments([]);
        return;
      }

      // Fetch active assessments for enrolled courses
      const { data: assessmentsData } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          assessment_type,
          course_id,
          due_date,
          max_score,
          is_active,
          created_at,
          courses (
            id,
            title
          )
        `)
        .eq('is_active', true)
        .in('course_id', courseIds)
        .order('due_date', { ascending: true });

      // Fetch submissions for these assessments
      const { data: submissionsData } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, score, submitted_at, graded_at')
        .eq('student_id', user.id)
        .in('assignment_id', assessmentsData?.map(a => a.id) || []);

      const submissionsMap = new Map(
        submissionsData?.map(s => [s.assignment_id, s]) || []
      );

      // Combine assessments with submission data
      const assessmentsWithStatus: Assessment[] = (assessmentsData || []).map((a: any) => {
        const submission = submissionsMap.get(a.id);
        let submission_status: 'not_started' | 'submitted' | 'graded' = 'not_started';
        if (submission?.graded_at) {
          submission_status = 'graded';
        } else if (submission?.submitted_at) {
          submission_status = 'submitted';
        }

        return {
          id: a.id,
          title: a.title,
          assessment_type: a.assessment_type || 'assignment',
          course_id: a.course_id,
          course_title: a.courses?.title || null,
          due_date: a.due_date,
          max_score: a.max_score || 0,
          is_active: a.is_active,
          submission_status,
          score: submission?.score || null,
          submitted_at: submission?.submitted_at || null,
          created_at: a.created_at,
        };
      });

      setAssessments(assessmentsWithStatus);
    } catch (error) {
      console.error('Error fetching assessments:', error);
      setAssessments([]);
    } finally {
      setAssessmentsLoading(false);
    }
  };

  const fetchAttendanceRecords = async () => {
    if (!user) return;
    try {
      // Fetch attendance records directly for this student
      const { data: records, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          session_id,
          status,
          notes,
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
        .eq('student_id', user.id)
        .order('marked_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching attendance records:', error);
        setAttendanceRecords([]);
        return;
      }

      if (records && records.length > 0) {
        // Filter out records where session or course data is missing
        const validRecords = records.filter((r: any) => 
          r.attendance_sessions && r.attendance_sessions.courses
        );

        const formattedRecords: AttendanceRecord[] = validRecords.map((r: any) => ({
          id: r.id,
          session_id: r.session_id,
          status: r.status,
          notes: r.notes,
          attendance_sessions: {
            id: r.attendance_sessions.id,
            session_date: r.attendance_sessions.session_date,
            session_time: r.attendance_sessions.session_time,
            title: r.attendance_sessions.title,
            courses: {
              title: r.attendance_sessions.courses.title,
            },
          },
        }));

        // Sort by date descending
        formattedRecords.sort((a, b) => {
          const dateA = new Date(a.attendance_sessions.session_date).getTime();
          const dateB = new Date(b.attendance_sessions.session_date).getTime();
          return dateB - dateA;
        });

        setAttendanceRecords(formattedRecords.slice(0, 20));
      } else {
        setAttendanceRecords([]);
      }
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      setAttendanceRecords([]);
    }
  };

  const fetchGradeResults = async () => {
    if (!user) return;
    try {
      // Get enrolled course IDs
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user.id);

      const courseIds = enrollments?.map(e => e.course_id) || [];
      if (courseIds.length === 0) {
        setGradeResults([]);
        return;
      }

      // Fetch graded assignments
      const { data: assignmentSubmissions } = await supabase
        .from('assignment_submissions')
        .select(`
          id,
          score,
          submitted_at,
          graded_at,
          feedback,
          assignments!inner (
            id,
            title,
            assessment_type,
            max_score,
            due_date,
            courses!inner (
              title
            )
          )
        `)
        .eq('student_id', user.id)
        .not('graded_at', 'is', null)
        .order('graded_at', { ascending: false });

      // Fetch graded quizzes
      const { data: quizSubmissions } = await supabase
        .from('quiz_submissions')
        .select(`
          id,
          score,
          passed,
          submitted_at,
          quizzes!inner (
            id,
            title,
            passing_score,
            courses!inner (
              title
            )
          )
        `)
        .eq('student_id', user.id)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false });

      const grades: GradeResult[] = [];

      // Process assignment submissions
      (assignmentSubmissions || []).forEach((sub: any) => {
        grades.push({
          id: sub.id,
          title: sub.assignments?.title || 'Unknown',
          assessment_type: sub.assignments?.assessment_type || 'assignment',
          course_title: sub.assignments?.courses?.title || 'Unknown Course',
          score: sub.score,
          max_score: sub.assignments?.max_score || 100,
          submitted_at: sub.submitted_at,
          graded_at: sub.graded_at,
          feedback: sub.feedback,
          due_date: sub.assignments?.due_date,
        });
      });

      // Process quiz submissions
      (quizSubmissions || []).forEach((sub: any) => {
        grades.push({
          id: sub.id,
          title: sub.quizzes?.title || 'Unknown',
          assessment_type: 'quiz',
          course_title: sub.quizzes?.courses?.title || 'Unknown Course',
          score: sub.score,
          max_score: sub.quizzes?.passing_score || 100,
          submitted_at: sub.submitted_at,
          graded_at: sub.submitted_at,
          feedback: null,
          due_date: null,
        });
      });

      // Sort by graded_at descending
      grades.sort((a, b) => {
        const dateA = a.graded_at ? new Date(a.graded_at).getTime() : 0;
        const dateB = b.graded_at ? new Date(b.graded_at).getTime() : 0;
        return dateB - dateA;
      });

      setGradeResults(grades.slice(0, 20));
    } catch (error) {
      console.error('Error fetching grade results:', error);
      setGradeResults([]);
    }
  };

  const fetchLibraryContents = async () => {
    setLibraryLoading(true);
    try {
      // Fetch recent/active books and videos
      const [booksRes, videosRes] = await Promise.all([
        supabase
          .from('books')
          .select('id, title, thumbnail_url, author')
          .eq('is_active', true)
          .limit(12)
          .order('created_at', { ascending: false }),
        supabase
          .from('videos')
          .select('id, title, thumbnail_url, duration_minutes')
          .eq('is_active', true)
          .limit(12)
          .order('created_at', { ascending: false })
      ]);

      const libraryItemsList: LibraryItem[] = [];

      if (booksRes.data) {
        booksRes.data.forEach((book: any) => {
          libraryItemsList.push({
            id: book.id,
            title: book.title,
            type: 'book',
            thumbnail_url: book.thumbnail_url,
            author: book.author || undefined,
          });
        });
      }

      if (videosRes.data) {
        videosRes.data.forEach((video: any) => {
          libraryItemsList.push({
            id: video.id,
            title: video.title,
            type: 'video',
            thumbnail_url: video.thumbnail_url,
            duration_minutes: video.duration_minutes || undefined,
          });
        });
      }

      setLibraryItems(libraryItemsList);
    } catch (error) {
      console.error('Error fetching library contents:', error);
      setLibraryItems([]);
    } finally {
      setLibraryLoading(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const completedCourses = enrolledCourses.filter((e) => e.completed_at).length;
  const inProgressCourses = enrolledCourses.filter((e) => !e.completed_at).length;
  const completionRate = enrolledCourses.length > 0 ? (completedCourses / enrolledCourses.length) * 100 : 0;

  // Prepare chart data
  const progressData = [
    {
      name: 'Completed',
      value: completedCourses,
      fill: '#10b981'
    },
    {
      name: 'In Progress',
      value: inProgressCourses,
      fill: '#3b82f6'
    }
  ];

  const completionChartData = [
    {
      name: 'Progress',
      value: Math.round(completionRate),
      fill: completionRate > 70 ? '#10b981' : completionRate > 40 ? '#f59e0b' : '#ef4444'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Student Dashboard
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Track your learning journey and achievements
                </p>
              </div>
            </div>
          </div>
          <Badge variant="default" className="text-sm capitalize px-4 py-2 bg-gradient-to-r from-primary to-primary/80">
            <Star className="h-3 w-3 mr-1" />
            Student
          </Badge>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card 
            className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105 cursor-pointer"
            onClick={() => navigate('/courses')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">Enrolled Courses</CardTitle>
              <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors shadow-lg">
                <BookOpen className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {enrolledCourses.length}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Total courses enrolled</p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">In Progress</CardTitle>
              <div className="p-3 rounded-xl bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors shadow-lg">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {inProgressCourses}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Currently learning</p>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">Completed</CardTitle>
              <div className="p-3 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 transition-colors shadow-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {completedCourses}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Courses finished</p>
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-2">
                <TrendingUp className="h-3 w-3" />
                <span className="font-medium">{Math.round(completionRate)}% completion</span>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105 cursor-pointer"
            onClick={() => navigate('/student/assignments')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">Assessments</CardTitle>
              <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors shadow-lg">
                <ClipboardList className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {assessments.length}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Total assessments</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList 
            className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex"
          >
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Actions */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
            </div>
            <CardDescription>Fast access to your learning tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                onClick={() => navigate('/courses')} 
                className="h-auto py-6 justify-start group hover:shadow-lg transition-all bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              >
                <div className="mr-3 h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">Browse Courses</div>
                  <div className="text-xs text-white/80">Discover new content</div>
                </div>
              </Button>

              <Button 
                onClick={() => navigate('/library')} 
                variant="outline" 
                className="h-auto py-6 justify-start group hover:shadow-lg transition-all hover:border-blue-500/50"
              >
                <div className="mr-3 h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <Library className="h-6 w-6 text-blue-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Visit Library</div>
                  <div className="text-xs text-muted-foreground">Access resources</div>
                </div>
              </Button>

              <Button 
                onClick={() => navigate('/student/assignments')} 
                variant="outline" 
                className="h-auto py-6 justify-start group hover:shadow-lg transition-all hover:border-orange-500/50"
              >
                <div className="mr-3 h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                  <FileText className="h-6 w-6 text-orange-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">My Assignments</div>
                  <div className="text-xs text-muted-foreground">View & submit</div>
                </div>
              </Button>

              <Button 
                onClick={() => navigate('/profile')} 
                variant="outline" 
                className="h-auto py-6 justify-start group hover:shadow-lg transition-all hover:border-purple-500/50"
              >
                <div className="mr-3 h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <Bookmark className="h-6 w-6 text-purple-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">My Bookmarks</div>
                  <div className="text-xs text-muted-foreground">Saved items</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

            {/* Recent Activity Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Recent Assessments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {assessments.slice(0, 3).length > 0 ? (
                    <div className="space-y-2.5">
                      {assessments.slice(0, 3).map((assessment) => (
                        <div 
                          key={assessment.id} 
                          className="group flex items-center justify-between p-3.5 rounded-lg bg-course-detail-50 hover:bg-course-detail-full transition-all cursor-pointer border border-transparent hover:border-course-detail/30 shadow-sm hover:shadow-md"
                          onClick={() => navigate('/student/assignments')}
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{assessment.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                              <BookOpen className="h-3 w-3" />
                              {assessment.course_title}
                            </p>
                          </div>
                          <Badge 
                            className={`shrink-0 ${
                              assessment.submission_status === 'graded' 
                                ? 'bg-green-500 hover:bg-green-600 text-white' 
                                : assessment.submission_status === 'submitted' 
                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                : 'bg-course-detail hover:bg-course-detail/80 text-foreground'
                            } transition-colors`}
                          >
                            {assessment.submission_status === 'graded' ? 'Graded' : assessment.submission_status === 'submitted' ? 'Submitted' : 'Pending'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-course-detail-20 rounded-lg">
                      <ClipboardList className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No assessments yet</p>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 bg-course-detail-50 hover:bg-course-detail-full border-course-detail/30 hover:border-course-detail text-foreground font-medium transition-all" 
                    onClick={() => navigate('/student/assignments')}
                  >
                    View All Assessments
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Certificates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {certificates.length > 0 ? (
                    <div className="space-y-3">
                      {certificates.slice(0, 3).map((cert) => (
                        <div 
                          key={cert.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-course-detail-50 hover:bg-course-detail-full transition-colors"
                        >
                          <div>
                            <p className="font-medium">{cert.courses?.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(cert.issued_at), 'MMM dd, yyyy')}
                            </p>
                          </div>
                          <Badge className="bg-green-500">Earned</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No certificates yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Attendance & Grades Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Recent Attendance
                  </CardTitle>
                  <CardDescription>Your attendance records</CardDescription>
                </CardHeader>
                <CardContent>
                  {attendanceRecords.length > 0 ? (
                    <div className="space-y-3">
                      {attendanceRecords.slice(0, 5).map((record) => (
                        <div 
                          key={record.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-course-detail-50 hover:bg-course-detail-full transition-colors border border-course-detail/30"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {record.attendance_sessions.title || 'Class Session'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {record.attendance_sessions.courses.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(record.attendance_sessions.session_date), 'MMM dd, yyyy')}
                              {record.attendance_sessions.session_time && ` at ${record.attendance_sessions.session_time}`}
                            </p>
                          </div>
                          <Badge 
                            className={`ml-3 shrink-0 ${
                              record.status === 'present' 
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : record.status === 'late'
                                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                : record.status === 'excused'
                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                : 'bg-red-500 hover:bg-red-600 text-white'
                            }`}
                          >
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-course-detail-20 rounded-lg">
                      <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No attendance records yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Grades & Results
                  </CardTitle>
                  <CardDescription>Your graded assessments</CardDescription>
                </CardHeader>
                <CardContent>
                  {gradeResults.length > 0 ? (
                    <div className="space-y-3">
                      {gradeResults.slice(0, 5).map((grade) => {
                        const percentage = grade.max_score > 0 
                          ? Math.round((grade.score || 0) / grade.max_score * 100) 
                          : 0;
                        const isPassing = percentage >= 60;
                        return (
                          <div 
                            key={grade.id} 
                            className="p-3 rounded-lg bg-course-detail-50 hover:bg-course-detail-full transition-colors border border-course-detail/30"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{grade.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {grade.course_title} • {grade.assessment_type}
                                </p>
                              </div>
                              <div className="ml-3 text-right shrink-0">
                                <p className={`font-bold text-lg ${isPassing ? 'text-green-500' : 'text-red-500'}`}>
                                  {grade.score !== null ? grade.score : 'N/A'} / {grade.max_score}
                                </p>
                                <p className={`text-xs font-semibold ${isPassing ? 'text-green-500' : 'text-red-500'}`}>
                                  {percentage}%
                                </p>
                              </div>
                            </div>
                            {grade.feedback && (
                              <div className="mt-2 pt-2 border-t border-course-detail/30">
                                <p className="text-xs text-muted-foreground italic line-clamp-2">
                                  "{grade.feedback}"
                                </p>
                              </div>
                            )}
                            {grade.graded_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Graded: {format(new Date(grade.graded_at), 'MMM dd, yyyy')}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-course-detail-20 rounded-lg">
                      <Award className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No grades available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      My Courses
                    </CardTitle>
                    <CardDescription>Continue your learning journey</CardDescription>
                  </div>
                  {enrolledCourses.length > 0 && (
                    <Badge variant="outline" className="text-sm">
                      {enrolledCourses.length} {enrolledCourses.length === 1 ? 'Course' : 'Courses'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
            {enrolledCourses.length === 0 ? (
              <div className="text-center py-16 bg-muted/20 rounded-xl">
                <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-muted/40 flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Courses Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  You haven't enrolled in any courses yet. Start your learning journey today!
                </p>
                <Button 
                  onClick={() => navigate('/courses')}
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Browse Courses
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((enrollment, index) => (
                  <Card 
                    key={enrollment.id} 
                    className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 cursor-pointer hover:scale-105"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="relative overflow-hidden">
                      {enrollment.courses.thumbnail_url ? (
                        <img
                          src={enrollment.courses.thumbnail_url}
                          alt={enrollment.courses.title}
                          className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-primary/40" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        {enrollment.completed_at ? (
                          <Badge className="bg-green-500 hover:bg-green-600 shadow-lg">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-orange-500/90 text-white hover:bg-orange-500 shadow-lg">
                            <Clock className="h-3 w-3 mr-1" />
                            In Progress
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-5 space-y-4">
                      <div>
                        <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {enrollment.courses.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {enrollment.courses.description || 'No description available'}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>
                            {enrollment.completed_at 
                              ? '100%' 
                              : (enrollment as any).progress !== undefined 
                                ? `${(enrollment as any).progress}%`
                                : '0%'}
                          </span>
                        </div>
                        <Progress 
                          value={
                            enrollment.completed_at 
                              ? 100 
                              : (enrollment as any).progress !== undefined 
                                ? (enrollment as any).progress 
                                : 0
                          } 
                          className="h-2"
                        />
                        {(enrollment as any).totalItems !== undefined && (
                          <p className="text-xs text-muted-foreground">
                            {(enrollment as any).completedItems || 0} of {(enrollment as any).totalItems || 0} lessons completed
                          </p>
                        )}
                      </div>

                      <Button
                        size="sm"
                        className="w-full group-hover:shadow-lg transition-all"
                        onClick={() => navigate(`/courses/${enrollment.course_id}`)}
                      >
                        <Play className="mr-2 h-4 w-4" />
                        {enrollment.completed_at ? 'Review Course' : 'Continue Learning'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="assessments" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-primary" />
                      My Assessments
                    </CardTitle>
                    <CardDescription>Assignments, quizzes, exams, projects, and presentations</CardDescription>
                  </div>
                  <Button onClick={() => navigate('/student/assignments')}>
                    <FileText className="mr-2 h-4 w-4" />
                    View All
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assessments..."
                      value={assessmentSearchQuery}
                      onChange={(e) => setAssessmentSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedAssessmentType} onValueChange={setSelectedAssessmentType}>
                    <SelectTrigger className="w-full sm:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSESSMENT_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {assessmentsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (() => {
                  const filtered = assessments.filter(a => {
                    const matchesType = selectedAssessmentType === 'all' || a.assessment_type === selectedAssessmentType;
                    const matchesSearch = !assessmentSearchQuery || 
                      a.title.toLowerCase().includes(assessmentSearchQuery.toLowerCase()) ||
                      a.course_title?.toLowerCase().includes(assessmentSearchQuery.toLowerCase());
                    return matchesType && matchesSearch;
                  });

                  const pending = filtered.filter(a => a.submission_status === 'not_started');
                  const submitted = filtered.filter(a => a.submission_status === 'submitted');
                  const graded = filtered.filter(a => a.submission_status === 'graded');

                  return (
                    <div className="space-y-6">
                      {/* Stats */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="bg-orange-500/10 border-orange-500/20">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Pending</p>
                                <p className="text-2xl font-bold">{pending.length}</p>
                              </div>
                              <AlertCircle className="h-8 w-8 text-orange-500" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-blue-500/10 border-blue-500/20">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Submitted</p>
                                <p className="text-2xl font-bold">{submitted.length}</p>
                              </div>
                              <Clock className="h-8 w-8 text-blue-500" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-green-500/10 border-green-500/20">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Graded</p>
                                <p className="text-2xl font-bold">{graded.length}</p>
                              </div>
                              <CheckCircle2 className="h-8 w-8 text-green-500" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Assessments List */}
                      {filtered.length === 0 ? (
                        <div className="text-center py-16 bg-muted/20 rounded-xl">
                          <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                          <h3 className="text-lg font-semibold text-foreground mb-2">No Assessments Found</h3>
                          <p className="text-muted-foreground">
                            {assessmentSearchQuery || selectedAssessmentType !== 'all'
                              ? 'Try adjusting your search or filter criteria'
                              : 'No assessments assigned yet'}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filtered.map((assessment) => {
                            const TypeIcon = ASSESSMENT_TYPES.find(t => t.value === assessment.assessment_type)?.icon || FileText;
                            const isOverdue = assessment.due_date && isPast(new Date(assessment.due_date)) && assessment.submission_status === 'not_started';
                            
                            return (
                              <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-5">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className="p-2 rounded-lg bg-primary/10">
                                        <TypeIcon className="h-4 w-4 text-primary" />
                                      </div>
                                      <Badge variant="outline" className="capitalize">
                                        {assessment.assessment_type}
                                      </Badge>
                                    </div>
                                    <Badge 
                                      variant={
                                        assessment.submission_status === 'graded' ? 'default' :
                                        assessment.submission_status === 'submitted' ? 'secondary' :
                                        isOverdue ? 'destructive' : 'outline'
                                      }
                                    >
                                      {assessment.submission_status === 'graded' ? 'Graded' :
                                       assessment.submission_status === 'submitted' ? 'Submitted' :
                                       isOverdue ? 'Overdue' : 'Pending'}
                                    </Badge>
                                  </div>
                                  <h4 className="font-semibold text-lg mb-2 line-clamp-2">{assessment.title}</h4>
                                  <p className="text-sm text-muted-foreground mb-3">{assessment.course_title}</p>
                                  <div className="flex items-center justify-between text-sm mb-4">
                                    <div className="flex items-center gap-4">
                                      {assessment.due_date && (
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                          <Calendar className="h-4 w-4" />
                                          <span>{format(new Date(assessment.due_date), 'MMM dd, yyyy')}</span>
                                        </div>
                                      )}
                                      <div className="text-muted-foreground">
                                        Max: {assessment.max_score} pts
                                      </div>
                                    </div>
                                    {assessment.score !== null && (
                                      <div className="font-semibold text-primary">
                                        Score: {assessment.score}/{assessment.max_score}
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    className="w-full"
                                    variant={assessment.submission_status === 'not_started' ? 'default' : 'outline'}
                                    onClick={() => {
                                      if (assessment.assessment_type === 'quiz' || assessment.assessment_type === 'exam') {
                                        navigate(`/student/quiz/${assessment.id}/take`);
                                      } else {
                                        navigate('/student/assignments');
                                      }
                                    }}
                                  >
                                    {assessment.submission_status === 'not_started' ? 'Start' :
                                     assessment.submission_status === 'submitted' ? 'View Submission' :
                                     'View Results'}
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                  </Button>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="library" className="space-y-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Library className="h-5 w-5 text-primary" />
                      Library Contents
                    </CardTitle>
                    <CardDescription>Books and videos available for learning</CardDescription>
                  </div>
                  <Button onClick={() => navigate('/library')}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {libraryLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : libraryItems.length === 0 ? (
                  <div className="text-center py-16 bg-muted/20 rounded-xl">
                    <Library className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Library Items</h3>
                    <p className="text-muted-foreground mb-6">No books or videos available yet</p>
                    <Button onClick={() => navigate('/library')}>
                      <Library className="mr-2 h-4 w-4" />
                      Browse Library
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {libraryItems.map((item) => (
                      <Card 
                        key={item.id} 
                        className="group hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          if (item.type === 'book') {
                            navigate(`/library/book/${item.id}`);
                          } else {
                            navigate(`/library/video/${item.id}`);
                          }
                        }}
                      >
                        <div className="aspect-video relative overflow-hidden rounded-t-lg bg-muted">
                          {item.thumbnail_url ? (
                            <img
                              src={item.thumbnail_url}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {item.type === 'book' ? (
                                <Book className="h-8 w-8 text-muted-foreground" />
                              ) : (
                                <Video className="h-8 w-8 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          {item.type === 'video' && item.duration_minutes && (
                            <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
                              {item.duration_minutes}m
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <h4 className="font-medium text-sm line-clamp-2 mb-1">{item.title}</h4>
                          {item.author && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{item.author}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            {/* Progress Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Learning Progress
                  </CardTitle>
                  <CardDescription>Your course completion status</CardDescription>
                </CardHeader>
                <CardContent>
                  {enrolledCourses.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsPieChart>
                        <Pie
                          data={progressData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {progressData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Enroll in courses to track progress</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Overall Completion Rate
                  </CardTitle>
                  <CardDescription>Track your learning achievements</CardDescription>
                </CardHeader>
                <CardContent>
                  {enrolledCourses.length > 0 ? (
                    <div className="space-y-6">
                      <ResponsiveContainer width="100%" height={200}>
                        <RadialBarChart 
                          cx="50%" 
                          cy="50%" 
                          innerRadius="70%" 
                          outerRadius="100%" 
                          barSize={20}
                          data={completionChartData}
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
                            className="fill-foreground text-4xl font-bold"
                          >
                            {Math.round(completionRate)}%
                          </text>
                        </RadialBarChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Completed</span>
                          <span className="font-semibold">{completedCourses} / {enrolledCourses.length}</span>
                        </div>
                        <Progress value={completionRate} className="h-2" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No completion data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Certificates */}
            {certificates.length > 0 && (
              <Card className="border-border/50 bg-gradient-to-br from-card/50 to-primary/5 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    My Certificates
                  </CardTitle>
                  <CardDescription>Your achievements and accomplishments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {certificates.map((cert, index) => (
                      <div
                        key={cert.id}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 p-6 border-2 border-yellow-500/20 hover:border-yellow-500/40 transition-all hover:shadow-xl"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full -mr-16 -mt-16" />
                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-4">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
                              <Award className="h-6 w-6 text-white" />
                            </div>
                            <Badge className="bg-green-500 hover:bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          </div>
                          
                          <h4 className="font-bold text-lg mb-2 line-clamp-2">
                            {cert.courses?.title}
                          </h4>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                            <Clock className="h-4 w-4" />
                            <span>Issued: {format(new Date(cert.issued_at), 'MMM dd, yyyy')}</span>
                          </div>

                          {cert.certificate_url && (
                            <Button
                              size="sm"
                              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg"
                              onClick={() => window.open(cert.certificate_url, '_blank')}
                            >
                              <Trophy className="mr-2 h-4 w-4" />
                              Download Certificate
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StudentDashboard;
