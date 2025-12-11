import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, Search, CheckCircle, Clock, GraduationCap,
  TrendingUp, Award
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EnrolledStudent {
  id: string;
  user_id: string;
  enrolled_at: string;
  completed_at: string | null;
  profile: {
    full_name: string | null;
    avatar_url: string | null;
  };
  progress: number;
}

interface EnrolledStudentsProps {
  courseId: string;
  totalLessons: number;
}

export function EnrolledStudents({ courseId, totalLessons }: EnrolledStudentsProps) {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEnrolledStudents();
  }, [courseId]);

  const fetchEnrolledStudents = async () => {
    setLoading(true);

    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('id, user_id, enrolled_at, completed_at')
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });

    if (enrollments) {
      const studentsWithData = await Promise.all(
        enrollments.map(async (enrollment) => {
          // Get profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', enrollment.user_id)
            .single();

          // Get progress
          const { count } = await supabase
            .from('learning_progress')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', enrollment.user_id)
            .eq('completed', true);

          const progress = totalLessons > 0 ? Math.round(((count || 0) / totalLessons) * 100) : 0;

          return {
            ...enrollment,
            profile: profile || { full_name: null, avatar_url: null },
            progress: Math.min(progress, 100),
          };
        })
      );

      setStudents(studentsWithData);
    }

    setLoading(false);
  };

  const filteredStudents = students.filter(student => 
    student.profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedCount = students.filter(s => s.completed_at).length;
  const averageProgress = students.length > 0 
    ? Math.round(students.reduce((acc, s) => acc + s.progress, 0) / students.length)
    : 0;

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{students.length}</p>
                <p className="text-sm text-muted-foreground">Total Enrolled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-chart-1/10">
                <Award className="h-6 w-6 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-chart-2/10">
                <TrendingUp className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">{averageProgress}%</p>
                <p className="text-sm text-muted-foreground">Avg. Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Enrolled Students
              </CardTitle>
              <CardDescription>{students.length} students enrolled</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No students match your search' : 'No students enrolled yet'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <div 
                    key={student.id} 
                    className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(student.profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {student.profile.full_name || 'Unknown Student'}
                        </p>
                        {student.completed_at && (
                          <Badge variant="secondary" className="text-xs bg-chart-1/10 text-chart-1 border-chart-1/30">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex-1 max-w-[200px]">
                          <Progress value={student.progress} className="h-1.5" />
                        </div>
                        <span className="text-xs text-muted-foreground">{student.progress}%</span>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(student.enrolled_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
