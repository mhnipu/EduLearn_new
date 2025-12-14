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
import { ArrowLeft, Users, Search, Mail, Phone, Calendar, BookOpen, TrendingUp, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
    }
  }, [user, selectedCourse]);

  const fetchTeacherCourses = async () => {
    try {
      // Fetch courses created by teacher
      const { data: createdCourses } = await supabase
        .from('courses')
        .select('id, title')
        .eq('created_by', user?.id)
        .order('title');

      // Fetch courses assigned to teacher
      const { data: assignedCoursesData } = await supabase
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
      // Get enrolled students for the selected course
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select(`
          user_id,
          enrolled_at,
          course_id,
          courses (
            id,
            title
          )
        `)
        .eq('course_id', selectedCourse)
        .order('enrolled_at', { ascending: false });

      if (!enrollments) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Fetch student profiles and progress
      const studentIds = enrollments.map(e => e.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email, phone')
        .in('id', studentIds);

      // Get course lessons count
      const { count: totalLessons } = await supabase
        .from('lessons')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', selectedCourse);

      // Get progress for each student
      const studentsWithData = await Promise.all(
        enrollments.map(async (enrollment) => {
          const profile = profiles?.find(p => p.id === enrollment.user_id);
          const course = enrollment.courses as any;

          // Get completed lessons count
          const { count: completedLessons } = await supabase
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
            course_title: course?.title || 'Unknown Course',
            progress,
            completed_lessons: completedLessons || 0,
            total_lessons: totalLessons || 0,
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
                      <TableHead>Enrollment Date</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Lessons</TableHead>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/teacher/students/${student.id}`)}
                          >
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
      </div>
    </div>
  );
};

export default StudentManagement;
