import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  TrendingUp,
  CheckCircle2,
  Clock,
  User,
  GraduationCap,
  Award,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

interface StudentProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

interface CourseProgress {
  course_id: string;
  course_title: string;
  enrolled_at: string;
  completed_lessons: number;
  total_lessons: number;
  progress: number;
}

interface GuardianInfo {
  name: string | null;
  email: string | null;
  phone: string | null;
  relationship: string | null;
}

export default function StudentDetail() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [guardian, setGuardian] = useState<GuardianInfo | null>(null);
  const [loading, setLoading] = useState(true);

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
    if (user && studentId) {
      fetchStudentData();
    }
  }, [user, studentId]);

  const fetchStudentData = async () => {
    if (!studentId) return;

    setLoading(true);
    try {
      // Fetch student profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, phone, created_at')
        .eq('id', studentId)
        .single();

      if (profileError) {
        throw profileError;
      }

      setStudent(profile);

      // Fetch student's enrolled courses with progress
      const { data: enrollments, error: enrollError } = await supabase
        .from('course_enrollments')
        .select(`
          course_id,
          enrolled_at,
          courses!inner(id, title)
        `)
        .eq('user_id', studentId);

      if (enrollments) {
        const coursesWithProgress = await Promise.all(
          enrollments.map(async (enrollment: any) => {
            const courseId = enrollment.course_id;

            // Get total lessons
            const { count: totalLessons } = await supabase
              .from('lessons')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', courseId);

            // Get completed lessons
            const { count: completedLessons } = await supabase
              .from('learning_progress')
              .select('*', { count: 'exact', head: true })
              .eq('student_id', studentId)
              .eq('course_id', courseId)
              .eq('completed', true);

            const progress = totalLessons && totalLessons > 0
              ? Math.round(((completedLessons || 0) / totalLessons) * 100)
              : 0;

            return {
              course_id: courseId,
              course_title: enrollment.courses?.title || 'Unknown Course',
              enrolled_at: enrollment.enrolled_at,
              completed_lessons: completedLessons || 0,
              total_lessons: totalLessons || 0,
              progress,
            };
          })
        );

        setCourses(coursesWithProgress);
      }

      // Fetch guardian information
      const { data: guardianRelation } = await supabase
        .from('student_guardians')
        .select(`
          relationship,
          profiles!student_guardians_guardian_id_fkey(id, full_name, email, phone)
        `)
        .eq('student_id', studentId)
        .limit(1)
        .single();

      if (guardianRelation && guardianRelation.profiles) {
        setGuardian({
          name: guardianRelation.profiles.full_name,
          email: guardianRelation.profiles.email,
          phone: guardianRelation.profiles.phone,
          relationship: guardianRelation.relationship,
        });
      } else {
        // Fallback to profile guardian fields
        const { data: profileData } = await supabase
          .from('profiles')
          .select('guardian_name, guardian_email, guardian_phone')
          .eq('id', studentId)
          .single();

        if (profileData && profileData.guardian_name) {
          setGuardian({
            name: profileData.guardian_name,
            email: profileData.guardian_email,
            phone: profileData.guardian_phone,
            relationship: null,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Student not found</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate('/teacher/students')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Students
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalProgress = courses.length > 0
    ? Math.round(courses.reduce((acc, c) => acc + c.progress, 0) / courses.length)
    : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/students')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <User className="h-8 w-8 text-primary" />
              Student Details
            </h1>
            <p className="text-muted-foreground mt-1">View detailed information about the student</p>
          </div>
        </div>

        {/* Student Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Student Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-primary">
                  <AvatarImage src={student.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {getInitials(student.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{student.full_name || 'Unknown Student'}</h2>
                  <div className="flex flex-col gap-2 mt-2">
                    {student.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {student.email}
                      </div>
                    )}
                    {student.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {student.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Joined: {format(new Date(student.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guardian Information */}
        {guardian && (
          <Card>
            <CardHeader>
              <CardTitle>Guardian Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Name</p>
                  <p className="font-semibold">{guardian.name}</p>
                </div>
                {guardian.relationship && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Relationship</p>
                    <Badge variant="outline">{guardian.relationship}</Badge>
                  </div>
                )}
                {guardian.email && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${guardian.email}`} className="text-primary hover:underline">
                        {guardian.email}
                      </a>
                    </div>
                  </div>
                )}
                {guardian.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${guardian.phone}`} className="text-primary hover:underline">
                        {guardian.phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Course Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Course Progress</CardTitle>
                <CardDescription>
                  {courses.length} enrolled course{courses.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Average Progress</p>
                <p className="text-2xl font-bold text-primary">{totalProgress}%</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {courses.length === 0 ? (
              <div className="text-center py-12 bg-course-detail-20 rounded-lg">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No enrolled courses</p>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <div
                    key={course.course_id}
                    className="p-4 rounded-lg border border-border/50 bg-course-detail-20 hover:bg-course-detail-40 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{course.course_title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Enrolled: {format(new Date(course.enrolled_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Badge className="bg-primary text-primary-foreground">
                        {course.progress}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">
                          {course.completed_lessons} / {course.total_lessons} lessons
                        </span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
