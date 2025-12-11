import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { BookOpen, Award, Clock, Bookmark, Play, Library, FileText, TrendingUp, Target, CheckCircle2, Zap, Star, Trophy, GraduationCap } from 'lucide-react';
import {
  RadialBarChart, RadialBar, PieChart as RechartsPieChart, Pie, Cell,
  ResponsiveContainer, Legend, Tooltip
} from 'recharts';

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

const StudentDashboard = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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

      setEnrolledCourses(enrollments || []);

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
    } catch (error) {
      console.error('Error fetching student data:', error);
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
          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
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

          <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">Certificates</CardTitle>
              <div className="p-3 rounded-xl bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors shadow-lg">
                <Trophy className="h-5 w-5 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {certificates.length}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Achievements earned</p>
            </CardContent>
          </Card>
        </div>

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

        <Separator className="my-8" />

        {/* Enhanced Quick Actions */}
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

        {/* Enhanced Enrolled Courses */}
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
                          <span>{enrollment.completed_at ? '100%' : '45%'}</span>
                        </div>
                        <Progress 
                          value={enrollment.completed_at ? 100 : 45} 
                          className="h-2"
                        />
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

        {/* Enhanced Certificates */}
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
                        <span>Issued: {new Date(cert.issued_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</span>
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
      </div>
    </div>
  );
};

export default StudentDashboard;
