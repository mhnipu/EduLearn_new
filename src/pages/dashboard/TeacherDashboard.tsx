import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Video, FileText, Users, Plus, Upload, TrendingUp, Target, Zap, GraduationCap, BarChart3, Eye, Clock, CheckCircle2 } from 'lucide-react';
import {
  BarChart, Bar, LineChart as RechartsLineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

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

  const fetchTeacherData = async () => {
    try {
      // Fetch teacher's created courses
      const { data: createdCourses } = await supabase
        .from('courses')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      // Fetch courses assigned to teacher (if table exists)
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
        // Table doesn't exist yet, that's okay
      }

      // Combine and deduplicate courses
      const createdCoursesMap = new Map((createdCourses || []).map(c => [c.id, c]));
      
      // Add assigned courses (if not already in created courses)
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

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
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
                <span className="font-medium">Active</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
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
                <span className="font-medium">Published</span>
              </div>
            </CardContent>
          </Card>

          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
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
                <span className="font-medium">Growing</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Analytics */}
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

        <Separator className="my-8" />

        {/* Enhanced Quick Actions */}
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

        {/* Enhanced My Courses */}
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
                    style={{ animationDelay: `${index * 100}ms` }}
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
      </div>
    </div>
  );
};

export default TeacherDashboard;
