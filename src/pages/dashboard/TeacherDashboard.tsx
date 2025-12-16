import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, Video, FileText, Users, Plus, Upload, TrendingUp, Target, Zap, 
  GraduationCap, BarChart3, Eye, Clock, CheckCircle2, Search, Filter,
  ClipboardList, Award, AlertCircle, Loader2, Book, Play, Calendar,
  MessageSquare, ExternalLink, ChevronRight
} from 'lucide-react';
import {
  BarChart, Bar, LineChart as RechartsLineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

interface Course {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

interface Stats {
  myCourses: number;
  totalLessons: number;
  totalStudents: number;
}

interface EnrolledStudent {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string;
  course_id: string;
  course_title: string;
  enrolled_at: string;
  progress: number;
  completed_lessons: number;
  total_lessons: number;
}

interface LibraryItem {
  id: string;
  title: string;
  type: 'book' | 'video';
  thumbnail_url: string | null;
  course_id?: string | null;
  course_title?: string | null;
  author?: string;
  duration_minutes?: number;
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
  submission_count: number;
  created_at: string;
}

const ASSESSMENT_TYPES = [
  { value: 'all', label: 'All Types', icon: FileText },
  { value: 'assignment', label: 'Assignments', icon: ClipboardList },
  { value: 'quiz', label: 'Quizzes', icon: Target },
  { value: 'exam', label: 'Exams', icon: Award },
  { value: 'project', label: 'Projects', icon: BookOpen },
  { value: 'presentation', label: 'Presentations', icon: MessageSquare },
];

const TeacherDashboard = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<Stats>({
    myCourses: 0,
    totalLessons: 0,
    totalStudents: 0,
  });
  const [loadingData, setLoadingData] = useState(true);
  const [courseStats, setCourseStats] = useState<{ name: string; students: number; lessons: number }[]>([]);
  
  // New state for enrolled students
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  
  // New state for library
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  
  // New state for assessments
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<string>('all');
  const [assessmentSearchQuery, setAssessmentSearchQuery] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && role && role !== 'teacher' && !['super_admin', 'admin'].includes(role)) {
      navigate(`/dashboard/${role}`);
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTeacherData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // Always fetch library contents (not dependent on courses)
      fetchLibraryContents();
      
      // Fetch assessments only if teacher has courses
      if (courses.length > 0) {
        fetchAssessments();
      }
    }
  }, [user, courses]);

  useEffect(() => {
    if (user && courses.length > 0) {
      fetchEnrolledStudents();
    } else if (user && courses.length === 0) {
      // If no courses, clear students
      setEnrolledStudents([]);
    }
  }, [user, selectedCourseFilter, courses]);

  useEffect(() => {
    if (user) {
      fetchAssessments();
    }
  }, [user, selectedAssessmentType]);

  const fetchTeacherData = async () => {
    try {
      // Fetch teacher's created courses
      const { data: createdCourses } = await supabase
        .from('courses')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      // Fetch courses assigned to teacher
      let assignedCourses: any[] = [];
      try {
        const { data } = await supabase
          .from('teacher_course_assignments' as any)
          .select(`
            course_id,
            courses (
              id,
              title,
              description,
              thumbnail_url,
              created_by,
              created_at,
              updated_at
            )
          `)
          .eq('teacher_id', user?.id);
        
        assignedCourses = data || [];
      } catch (error) {
        console.log('Teacher course assignments table not yet available:', error);
      }

      // Combine and deduplicate courses
      const createdCoursesMap = new Map((createdCourses || []).map(c => [c.id, c]));
      
      assignedCourses.forEach((ac: any) => {
        if (ac.courses && !createdCoursesMap.has(ac.courses.id)) {
          createdCoursesMap.set(ac.courses.id, ac.courses);
        }
      });

      const allCourses = Array.from(createdCoursesMap.values());
      setCourses(allCourses);

      // Fetch stats
      const courseIds = allCourses.map((c) => c.id) || [];
      
      let lessonsCount = 0;
      let studentsCount = 0;

      if (courseIds.length > 0) {
        const { count: lessons } = await supabase
          .from('lessons')
          .select('id', { count: 'exact', head: true })
          .in('course_id', courseIds);
        
        lessonsCount = lessons || 0;

        const { count: students } = await supabase
          .from('course_enrollments')
          .select('id', { count: 'exact', head: true })
          .in('course_id', courseIds);
        
        studentsCount = students || 0;
      }

      setStats({
        myCourses: allCourses.length || 0,
        totalLessons: lessonsCount,
        totalStudents: studentsCount,
      });

      // Fetch detailed stats for each course (for charts)
      if (allCourses && allCourses.length > 0) {
        const courseStatsPromises = allCourses.slice(0, 5).map(async (course) => {
          const [lessonsRes, studentsRes] = await Promise.all([
            supabase
              .from('lessons')
              .select('id', { count: 'exact', head: true })
              .eq('course_id', course.id),
            supabase
              .from('course_enrollments')
              .select('id', { count: 'exact', head: true })
              .eq('course_id', course.id)
          ]);

          return {
            name: course.title.substring(0, 15) + (course.title.length > 15 ? '...' : ''),
            students: studentsRes.count || 0,
            lessons: lessonsRes.count || 0
          };
        });

        const statsData = await Promise.all(courseStatsPromises);
        setCourseStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const fetchEnrolledStudents = async () => {
    try {
      // Get all course IDs for teacher
      const courseIds = courses.map(c => c.id);
      if (!courseIds || courseIds.length === 0) {
        setEnrolledStudents([]);
        return;
      }

      // Build query based on course filter
      let enrollmentsQuery: any = supabase
        .from('course_enrollments')
        .select(`
          user_id,
          course_id,
          enrolled_at,
          courses!inner (
            id,
            title
          )
        `)
        .in('course_id', courseIds);

      if (selectedCourseFilter !== 'all') {
        enrollmentsQuery = enrollmentsQuery.eq('course_id', selectedCourseFilter);
      }

      const { data: enrollments, error } = await enrollmentsQuery.order('enrolled_at', { ascending: false });

      if (error) throw error;
      if (!enrollments || enrollments.length === 0) {
        setEnrolledStudents([]);
        return;
      }

      // Fetch student profiles and progress
      const studentIds = [...new Set(enrollments.map((e: any) => e.user_id as string))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', studentIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      // Calculate progress for each student
      const studentsWithProgress = await Promise.all(
        enrollments.map(async (enrollment: any) => {
          const profile = profileMap.get(enrollment.user_id);
          const course = enrollment.courses;
          const courseId = (enrollment as any).course_id;
          const studentId = (enrollment as any).user_id;

          // Get total lessons for course
          const { count: totalLessons } = await supabase
            .from('lessons')
            .select('id', { count: 'exact', head: true })
            .eq('course_id', courseId);

          // Get all lessons for this course
          const { data: lessonsData } = await supabase
            .from('lessons')
            .select('id')
            .eq('course_id', courseId);

          const lessonIds = lessonsData?.map(l => l.id) || [];
          
          // Check learning_progress for completed items
          // Note: Lessons completion tracking varies - some may be stored as 'video' type
          // We'll check for any completed progress entries that match lesson IDs
          let completedLessons = 0;
          if (lessonIds.length > 0) {
            // Try to find completed progress for these lessons
            // Lessons might be tracked as 'video' type when they have video_url
            const { count: videoTypeCount } = await supabase
              .from('learning_progress')
              .select('id', { count: 'exact', head: true })
              .eq('student_id', studentId)
              .eq('content_type', 'video')
              .eq('completed', true)
              .in('content_id', lessonIds);
            
            completedLessons = videoTypeCount || 0;
          }

          // Calculate progress (0% if no lessons or no completion tracking)
          const progress = totalLessons && totalLessons > 0 && completedLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;

          return {
            id: studentId,
            full_name: (profile as any)?.full_name || 'Unknown',
            avatar_url: (profile as any)?.avatar_url || null,
            email: undefined,
            course_id: courseId,
            course_title: (course as any)?.title || 'Unknown Course',
            enrolled_at: (enrollment as any).enrolled_at,
            progress,
            completed_lessons: completedLessons,
            total_lessons: totalLessons,
          };
        })
      );

      setEnrolledStudents(studentsWithProgress);
    } catch (error) {
      console.error('Error fetching enrolled students:', error);
    }
  };

  const fetchLibraryContents = async () => {
    setLibraryLoading(true);
    try {
      // Fetch all active books and videos (teacher has access to all active items)
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

      // Add books
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

      // Add videos
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
      
      if (libraryItemsList.length === 0) {
        console.log('No library items found');
      }
    } catch (error) {
      console.error('Error fetching library contents:', error);
      setLibraryItems([]);
    } finally {
      setLibraryLoading(false);
    }
  };

  const fetchAssessments = async () => {
    try {
      const courseIds = courses.map(c => c.id);
      if (courseIds.length === 0) {
        setAssessments([]);
        return;
      }

      // @ts-expect-error - Supabase type complexity with nested queries
      let assessmentsQuery: any = supabase
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
        .in('course_id', courseIds)
        .order('created_at', { ascending: false });

      if (selectedAssessmentType !== 'all') {
        assessmentsQuery = assessmentsQuery.eq('assessment_type', selectedAssessmentType);
      }

      const { data: assessmentsData, error } = await assessmentsQuery;

      if (error) throw error;

      // Fetch submission counts for each assessment
      if (assessmentsData && assessmentsData.length > 0) {
        const assessmentIds = assessmentsData.map(a => a.id);
        const { data: submissions } = await supabase
          .from('assignment_submissions')
          .select('assignment_id')
          .in('assignment_id', assessmentIds);

        const submissionCountMap = new Map<string, number>();
        submissions?.forEach(sub => {
          submissionCountMap.set(sub.assignment_id, (submissionCountMap.get(sub.assignment_id) || 0) + 1);
        });

        const assessmentsWithCounts: Assessment[] = (assessmentsData || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          assessment_type: a.assessment_type || 'assignment',
          course_id: a.course_id,
          course_title: (a.courses as any)?.title || null,
          due_date: a.due_date,
          max_score: a.max_score || 100,
          is_active: a.is_active ?? true,
          submission_count: submissionCountMap.get(a.id) || 0,
          created_at: a.created_at,
        }));

        setAssessments(assessmentsWithCounts);
      } else {
        setAssessments([]);
      }
    } catch (error) {
      console.error('Error fetching assessments:', error);
    }
  };

  // Filter students by search query
  const filteredStudents = enrolledStudents.filter(student =>
    student.full_name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.course_title?.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  // Filter assessments by search query
  const filteredAssessments = assessments.filter(assessment =>
    assessment.title.toLowerCase().includes(assessmentSearchQuery.toLowerCase()) ||
    assessment.course_title?.toLowerCase().includes(assessmentSearchQuery.toLowerCase())
  );

  // Get assessment type stats
  const assessmentTypeStats = ASSESSMENT_TYPES.slice(1).map(type => {
    const typeAssessments = assessments.filter(a => a.assessment_type === type.value);
    return {
      type: type.label,
      count: typeAssessments.length,
      submissions: typeAssessments.reduce((sum, a) => sum + a.submission_count, 0),
    };
  });

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAssessmentTypeIcon = (type: string) => {
    const typeConfig = ASSESSMENT_TYPES.find(t => t.value === type);
    return typeConfig?.icon || FileText;
  };

  const getAssessmentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      assignment: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      quiz: 'bg-green-500/10 text-green-600 dark:text-green-400',
      exam: 'bg-red-500/10 text-red-600 dark:text-red-400',
      project: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      presentation: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    };
    return colors[type] || 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-green-500/5">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Teacher Dashboard
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Manage your courses, lessons, and student progress
                </p>
              </div>
            </div>
          </div>
          <Badge variant="default" className="text-sm capitalize px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600">
            <Users className="h-3 w-3 mr-1" />
            Teacher
          </Badge>
        </div>

        {/* Enhanced Stats Grid - Now Clickable */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <Card 
            className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105 cursor-pointer"
            onClick={() => navigate('/courses')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">My Courses</CardTitle>
              <div className="p-3 rounded-xl bg-green-500/10 group-hover:bg-green-500/20 transition-colors shadow-lg">
                <BookOpen className="h-5 w-5 text-green-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {stats.myCourses}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Total courses created</p>
              <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-2">
                <TrendingUp className="h-3 w-3" />
                <span className="font-medium">Click to view</span>
                <ChevronRight className="h-3 w-3 ml-1" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105 cursor-pointer"
            onClick={() => {
              if (courses.length > 0) {
                navigate(`/teacher/courses/${courses[0].id}/lessons`);
              }
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">Total Lessons</CardTitle>
              <div className="p-3 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors shadow-lg">
                <Video className="h-5 w-5 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {stats.totalLessons}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Lessons published</p>
              <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-2">
                <CheckCircle2 className="h-3 w-3" />
                <span className="font-medium">Click to manage</span>
                <ChevronRight className="h-3 w-3 ml-1" />
              </div>
            </CardContent>
          </Card>

          <Card 
            className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105 cursor-pointer"
            onClick={() => navigate('/teacher/students')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">Students Enrolled</CardTitle>
              <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors shadow-lg">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {stats.totalStudents}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Total enrollments</p>
              <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 mt-2">
                <TrendingUp className="h-3 w-3" />
                <span className="font-medium">Click to view</span>
                <ChevronRight className="h-3 w-3 ml-1" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for Organized Sections */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Actions */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
                </div>
                <CardDescription>Common teaching tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button 
                    onClick={() => navigate('/teacher/students')} 
                    className="h-auto py-6 justify-start group hover:shadow-lg transition-all bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                  >
                    <div className="mr-3 h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-white">My Students</div>
                      <div className="text-xs text-white/80">View enrolled students</div>
                    </div>
                  </Button>

                  <Button 
                    onClick={() => navigate('/admin/assignments')} 
                    variant="outline" 
                    className="h-auto py-6 justify-start group hover:shadow-lg transition-all hover:border-blue-500/50"
                  >
                    <div className="mr-3 h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <FileText className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-foreground">Assignments</div>
                      <div className="text-xs text-muted-foreground">Create & manage</div>
                    </div>
                  </Button>

                  <Button 
                    onClick={() => navigate('/library/upload')} 
                    variant="outline" 
                    className="h-auto py-6 justify-start group hover:shadow-lg transition-all hover:border-orange-500/50"
                  >
                    <div className="mr-3 h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                      <Upload className="h-6 w-6 text-orange-500" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-foreground">Upload Content</div>
                      <div className="text-xs text-muted-foreground">Add to library</div>
                    </div>
                  </Button>

                  <Button 
                    onClick={() => navigate('/courses')} 
                    variant="outline" 
                    className="h-auto py-6 justify-start group hover:shadow-lg transition-all hover:border-green-500/50"
                  >
                    <div className="mr-3 h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                      <Eye className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-foreground">Browse Courses</div>
                      <div className="text-xs text-muted-foreground">View all courses</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* My Courses */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      My Courses
                    </CardTitle>
                    <CardDescription>Manage and monitor your teaching content</CardDescription>
                  </div>
                  {courses.length > 0 && (
                    <Badge variant="outline" className="text-sm">
                      {courses.length} {courses.length === 1 ? 'Course' : 'Courses'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {courses.length === 0 ? (
                  <div className="text-center py-16 bg-muted/20 rounded-xl">
                    <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-muted/40 flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Courses Yet</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      Start creating engaging courses for your students. Share your knowledge and expertise!
                    </p>
                    <Button 
                      onClick={() => navigate('/admin/courses/new')}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Course
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course, index) => (
                      <Card 
                        key={course.id} 
                        className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 hover:scale-105"
                      >
                        <div className="relative overflow-hidden bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 p-6">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full -mr-12 -mt-12" />
                          <div className="relative z-10">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg mb-3">
                              <BookOpen className="h-6 w-6 text-white" />
                            </div>
                            <Badge variant="secondary" className="bg-green-500/20 text-green-700 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          </div>
                        </div>
                        <CardContent className="p-5 space-y-4">
                          <div>
                            <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                              {course.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {course.description || 'No description available'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Created {new Date(course.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => navigate(`/courses/${course.id}`)}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                              onClick={() => navigate(`/teacher/courses/${course.id}/lessons`)}
                            >
                              <FileText className="mr-1 h-3 w-3" />
                              Manage
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6 mt-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Enrolled Students
                    </CardTitle>
                    <CardDescription>View and manage students across your courses</CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search students..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="pl-9 w-full sm:w-64"
                      />
                    </div>
                    <Select value={selectedCourseFilter} onValueChange={setSelectedCourseFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by course" />
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
                </div>
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-16 bg-muted/20 rounded-xl">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Students Found</h3>
                    <p className="text-muted-foreground">
                      {studentSearchQuery || selectedCourseFilter !== 'all'
                        ? 'Try adjusting your search or filter criteria'
                        : 'No students enrolled in your courses yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredStudents.map((student) => (
                        <Card key={`${student.id}-${student.course_id}`} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={student.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {getInitials(student.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm truncate">{student.full_name}</h4>
                                    <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="mt-2 text-xs">
                                  {student.course_title}
                                </Badge>
                                <div className="mt-3 space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Progress</span>
                                    <span className="font-medium">{student.progress}%</span>
                                  </div>
                                  <Progress value={student.progress} className="h-2" />
                                  <p className="text-xs text-muted-foreground">
                                    {student.completed_lessons} / {student.total_lessons} lessons
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                                  <Calendar className="h-3 w-3" />
                                  <span>Enrolled {format(new Date(student.enrolled_at), 'MMM d, yyyy')}</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="flex justify-center pt-4">
                      <Button variant="outline" onClick={() => navigate('/teacher/students')}>
                        View All Students
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assessments Tab */}
          <TabsContent value="assessments" className="space-y-6 mt-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Assessments
                    </CardTitle>
                    <CardDescription>Manage assignments, quizzes, exams, projects, and presentations</CardDescription>
                  </div>
                  <Button onClick={() => navigate('/admin/assignments')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Assessment
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Assessment Type Filter */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assessments..."
                      value={assessmentSearchQuery}
                      onChange={(e) => setAssessmentSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={selectedAssessmentType} onValueChange={setSelectedAssessmentType}>
                    <SelectTrigger className="w-full sm:w-64">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSESSMENT_TYPES.map(type => {
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

                {/* Assessment Type Stats */}
                {assessmentTypeStats.some(s => s.count > 0) && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {assessmentTypeStats.map(stat => (
                      <Card key={stat.type} className="p-3 text-center">
                        <div className="text-2xl font-bold">{stat.count}</div>
                        <div className="text-xs text-muted-foreground">{stat.type}</div>
                        <div className="text-xs text-muted-foreground mt-1">{stat.submissions} submissions</div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Assessments List */}
                {filteredAssessments.length === 0 ? (
                  <div className="text-center py-16 bg-muted/20 rounded-xl">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Assessments Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {assessmentSearchQuery || selectedAssessmentType !== 'all'
                        ? 'Try adjusting your search or filter criteria'
                        : 'Create your first assessment to get started'}
                    </p>
                    <Button onClick={() => navigate('/admin/assignments')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Assessment
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAssessments.map((assessment) => {
                      const TypeIcon = getAssessmentTypeIcon(assessment.assessment_type);
                      return (
                        <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge className={getAssessmentTypeColor(assessment.assessment_type)}>
                                    <TypeIcon className="h-3 w-3 mr-1" />
                                    {assessment.assessment_type}
                                  </Badge>
                                  {!assessment.is_active && (
                                    <Badge variant="secondary">Inactive</Badge>
                                  )}
                                </div>
                                <h4 className="font-semibold text-sm line-clamp-2">{assessment.title}</h4>
                                {assessment.course_title && (
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {assessment.course_title}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span>{assessment.submission_count} submissions</span>
                              </div>
                              {assessment.due_date && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{format(new Date(assessment.due_date), 'MMM d')}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => navigate(`/admin/assignments/${assessment.id}/submissions`)}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => navigate('/admin/assignments')}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
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

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-6 mt-6">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Library Contents
                    </CardTitle>
                    <CardDescription>Books and videos available in your courses</CardDescription>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/library')}>
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
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Library Items</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload books and videos to make them available to students
                    </p>
                    <Button onClick={() => navigate('/library/upload')}>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Content
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {libraryItems.map((item) => (
                      <Card key={item.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                        if (item.type === 'book') {
                          navigate(`/library/book/${item.id}`);
                        } else {
                          navigate(`/library/video/${item.id}`);
                        }
                      }}>
                        <CardContent className="p-0">
                          <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                            {item.thumbnail_url ? (
                              <img
                                src={item.thumbnail_url}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                {item.type === 'book' ? (
                                  <Book className="h-8 w-8 text-muted-foreground" />
                                ) : (
                                  <Play className="h-8 w-8 text-muted-foreground" />
                                )}
                              </div>
                            )}
                            <Badge className="absolute top-2 right-2">
                              {item.type === 'book' ? 'Book' : 'Video'}
                            </Badge>
                          </div>
                          <div className="p-3">
                            <h4 className="font-medium text-sm line-clamp-2 mb-1">{item.title}</h4>
                            {item.author && (
                              <p className="text-xs text-muted-foreground truncate">{item.author}</p>
                            )}
                            {item.duration_minutes && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.duration_minutes} min
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
            {courseStats.length > 0 && (
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Course Analytics
                  </CardTitle>
                  <CardDescription>Student enrollment and lesson distribution across your courses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={courseStats}>
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
                      <Legend />
                      <Bar dataKey="students" fill="#8b5cf6" radius={[8, 8, 0, 0]} name="Students" />
                      <Bar dataKey="lessons" fill="#10b981" radius={[8, 8, 0, 0]} name="Lessons" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {courseStats.length === 0 && (
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="py-16 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Analytics Data</h3>
                  <p className="text-muted-foreground">
                    Analytics will appear once you have courses with students and lessons
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TeacherDashboard;
