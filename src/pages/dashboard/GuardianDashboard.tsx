import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Users, BookOpen, Award, TrendingUp, Target, Eye, Shield, CheckCircle2, Clock, Trophy, Star, BarChart3 } from 'lucide-react';
import {
  RadialBarChart, RadialBar, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface Student {
  id: string;
  student_id: string;
  relationship: string;
  profile: {
    full_name: string;
  } | null;
}

interface StudentProgress {
  studentId: string;
  studentName: string;
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
}

const GuardianDashboard = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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

  const fetchGuardianData = async () => {
    try {
      // Fetch assigned students
      const { data: studentsData } = await supabase
        .from('student_guardians')
        .select('id, student_id, relationship')
        .eq('guardian_id', user?.id);

      if (!studentsData || studentsData.length === 0) {
        setLoadingData(false);
        return;
      }

      // Fetch student profiles separately
      const studentIds = studentsData.map(s => s.student_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);

      const studentsWithProfiles = studentsData.map(s => ({
        ...s,
        profile: profiles?.find(p => p.id === s.student_id) || null
      }));

      setStudents(studentsWithProfiles);

      // Fetch progress for each student
      const progressPromises = studentIds.map(async (studentId) => {
        const [enrollments, completed, certs] = await Promise.all([
          supabase
            .from('course_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', studentId),
          supabase
            .from('course_enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', studentId)
            .not('completed_at', 'is', null),
          supabase
            .from('certificates')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', studentId),
        ]);

        const student = studentsWithProfiles.find(s => s.student_id === studentId);

        return {
          studentId,
          studentName: student?.profile?.full_name || 'Unknown',
          enrolledCourses: enrollments.count || 0,
          completedCourses: completed.count || 0,
          certificates: certs.count || 0,
        };
      });

      const progressData = await Promise.all(progressPromises);
      setStudentProgress(progressData);
    } catch (error) {
      console.error('Error fetching guardian data:', error);
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
                              <div className="flex items-center gap-2 mt-1">
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
