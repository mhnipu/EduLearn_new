import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calendar, Plus, CheckCircle2, XCircle, Clock, UserCheck, Users, TrendingUp, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { getDashboardPath } from '@/lib/navigation';

interface AttendanceSession {
  id: string;
  course_id: string;
  session_date: string;
  session_time: string | null;
  title: string | null;
  description: string | null;
  created_at: string;
  course_title?: string;
}

interface Student {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  enrolled_at: string;
}

interface AttendanceRecord {
  id?: string;
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes: string | null;
  student_name?: string;
}

const AttendanceManagement = () => {
  const { courseId } = useParams();
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]); // Used for dialog editing
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecord[]>([]); // Used for displaying counts
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);

  // New session form
  const [newSession, setNewSession] = useState({
    session_date: format(new Date(), 'yyyy-MM-dd'),
    session_time: '',
    title: '',
    description: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (!authLoading && role !== 'teacher' && !['super_admin', 'admin'].includes(role || '')) {
      navigate(getDashboardPath(role));
      return;
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && courseId) {
      fetchData();
    }
  }, [user, courseId]);

  const fetchData = async () => {
    if (!courseId) return;

    setLoading(true);
    try {
      await Promise.all([
        fetchSessions(),
        fetchStudents(),
        fetchAllAttendanceRecords(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAttendanceRecords = async () => {
    if (!courseId) return;

    // First get all session IDs for this course
    const { data: sessionsData } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('course_id', courseId);

    if (!sessionsData || sessionsData.length === 0) {
      setAllAttendanceRecords([]);
      return;
    }

    const sessionIds = sessionsData.map(s => s.id);

    // Fetch all attendance records for all sessions
    const { data: records, error } = await supabase
      .from('attendance_records')
      .select('*')
      .in('session_id', sessionIds);

    if (error) {
      console.error('Error fetching attendance records:', error);
      setAllAttendanceRecords([]);
      return;
    }

    setAllAttendanceRecords((records || []).map((r: any) => ({
      id: r.id,
      session_id: r.session_id,
      student_id: r.student_id,
      status: r.status,
      notes: r.notes,
    })));
  };

  const fetchSessions = async () => {
    if (!courseId) return;

    const { data, error } = await supabase
      .from('attendance_sessions')
      .select(`
        *,
        courses (
          title
        )
      `)
      .eq('course_id', courseId)
      .order('session_date', { ascending: false })
      .order('session_time', { ascending: false });

    if (error) throw error;

    const sessionsWithTitle = (data || []).map((s: any) => ({
      ...s,
      course_title: s.courses?.title || 'Unknown Course',
    }));

    setSessions(sessionsWithTitle);
  };

  const fetchStudents = async () => {
    if (!courseId) return;

    // Fetch enrollments first
    const { data: enrollments, error: enrollError } = await supabase
      .from('course_enrollments')
      .select('user_id, enrolled_at')
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });

    if (enrollError) throw enrollError;

    if (!enrollments || enrollments.length === 0) {
      setStudents([]);
      return;
    }

    // Extract user IDs
    const userIds = enrollments.map(e => e.user_id);

    // Fetch profiles separately
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', userIds);

    if (profileError) throw profileError;

    // Create a map for quick lookup
    const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // Combine enrollment and profile data
    const studentsData = enrollments.map((e: any) => {
      const profile = profilesMap.get(e.user_id);
      return {
        id: e.user_id,
        full_name: profile?.full_name || 'Unknown',
        avatar_url: profile?.avatar_url || null,
        enrolled_at: e.enrolled_at,
      };
    });

    setStudents(studentsData);
  };


  const createSession = async () => {
    if (!courseId || !user) return;

    setCreatingSession(true);
    try {
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert({
          course_id: courseId,
          session_date: newSession.session_date,
          session_time: newSession.session_time || null,
          title: newSession.title || null,
          description: newSession.description || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Attendance session created successfully',
      });

      setSessionDialogOpen(false);
      setNewSession({
        session_date: format(new Date(), 'yyyy-MM-dd'),
        session_time: '',
        title: '',
        description: '',
      });
      fetchSessions();
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create session',
        variant: 'destructive',
      });
    } finally {
      setCreatingSession(false);
    }
  };

  const openAttendanceDialog = async (session: AttendanceSession) => {
    setSelectedSession(session);
    setAttendanceDialogOpen(true);

    // Fetch existing attendance records
    const { data: existingData, error: recordsError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('session_id', session.id);

    if (recordsError) {
      console.error('Error fetching attendance records:', recordsError);
    }

    // Get student IDs from records
    const studentIds = (existingData || []).map((r: any) => r.student_id);
    
    // Fetch profiles separately if we have student IDs
    let profilesMap = new Map();
    if (studentIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds);
      
      if (profiles) {
        profilesMap = new Map(profiles.map((p: any) => [p.id, p]));
      }
    }

    const existingRecords = (existingData || []).map((r: any) => ({
      ...r,
      student_name: profilesMap.get(r.student_id)?.full_name || 'Unknown',
    }));

    const existingRecordsMap = new Map(
      existingRecords.map((r: any) => [r.student_id, r])
    );

    const initialRecords: AttendanceRecord[] = students.map(student => {
      const existing = existingRecordsMap.get(student.id);
      return existing || {
        session_id: session.id,
        student_id: student.id,
        status: 'present' as const,
        notes: null,
        student_name: student.full_name || 'Unknown',
      };
    });

    setAttendanceRecords(initialRecords);
  };

  const saveAttendance = async () => {
    if (!selectedSession || !user) return;

    setSavingAttendance(true);
    try {
      // Delete existing records for this session
      const { error: deleteError } = await supabase
        .from('attendance_records')
        .delete()
        .eq('session_id', selectedSession.id);

      if (deleteError) {
        console.error('Error deleting existing records:', deleteError);
        throw deleteError;
      }

      // Insert new records
      const recordsToInsert = attendanceRecords
        .filter(record => record.student_id) // Ensure student_id exists
        .map(record => ({
          session_id: record.session_id,
          student_id: record.student_id,
          status: record.status,
          notes: record.notes || null,
          marked_by: user.id,
        }));

      if (recordsToInsert.length === 0) {
        toast({
          title: 'Warning',
          description: 'No attendance records to save',
          variant: 'destructive',
        });
        return;
      }

      const { data, error: insertError } = await supabase
        .from('attendance_records')
        .insert(recordsToInsert)
        .select();

      if (insertError) {
        console.error('Error inserting attendance records:', insertError);
        throw insertError;
      }

      console.log('Attendance records saved successfully:', data);

      toast({
        title: 'Success',
        description: `Attendance saved for ${recordsToInsert.length} student${recordsToInsert.length !== 1 ? 's' : ''}`,
      });

      setAttendanceDialogOpen(false);
      // Refresh sessions and attendance records to update counts
      await Promise.all([
        fetchSessions(),
        fetchAllAttendanceRecords(),
      ]);
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save attendance. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingAttendance(false);
    }
  };

  const updateAttendanceStatus = (studentId: string, status: AttendanceRecord['status']) => {
    setAttendanceRecords(prev =>
      prev.map(record =>
        record.student_id === studentId
          ? { ...record, status }
          : record
      )
    );
  };

  const updateAttendanceNotes = (studentId: string, notes: string) => {
    setAttendanceRecords(prev =>
      prev.map(record =>
        record.student_id === studentId
          ? { ...record, notes }
          : record
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-500';
      case 'late': return 'bg-yellow-500';
      case 'excused': return 'bg-blue-500';
      case 'absent': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusCounts = (sessionId: string) => {
    // Use allAttendanceRecords for display counts (fetched on load)
    // Use attendanceRecords for dialog editing (only when dialog is open)
    const records = allAttendanceRecords.filter(r => r.session_id === sessionId);
    return {
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      excused: records.filter(r => r.status === 'excused').length,
    };
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
              onClick={() => navigate('/teacher/students')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Calendar className="h-8 w-8 text-primary" />
                Attendance Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Create sessions and mark student attendance
              </p>
            </div>
          </div>
          <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Create Attendance Session
                </DialogTitle>
                <DialogDescription>
                  Create a new class session for attendance tracking
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="session_date" className="font-semibold">Date *</Label>
                  <Input
                    id="session_date"
                    type="date"
                    value={newSession.session_date}
                    onChange={(e) => setNewSession({ ...newSession, session_date: e.target.value })}
                    className="h-11 bg-course-detail-50 border-course-detail/30 focus:border-course-detail"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session_time" className="font-semibold">Time (Optional)</Label>
                  <Input
                    id="session_time"
                    type="time"
                    value={newSession.session_time}
                    onChange={(e) => setNewSession({ ...newSession, session_time: e.target.value })}
                    className="h-11 bg-course-detail-50 border-course-detail/30 focus:border-course-detail"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title" className="font-semibold">Title (Optional)</Label>
                  <Input
                    id="title"
                    value={newSession.title}
                    onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                    placeholder="e.g., Week 1 - Introduction"
                    className="h-11 bg-course-detail-50 border-course-detail/30 focus:border-course-detail"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-semibold">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newSession.description}
                    onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                    placeholder="Session notes or description"
                    rows={3}
                    className="bg-course-detail-50 border-course-detail/30 focus:border-course-detail"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSessionDialogOpen(false)}
                  className="hover:bg-course-detail-50"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createSession} 
                  disabled={creatingSession}
                  className="bg-primary hover:bg-primary/90 font-semibold"
                >
                  {creatingSession ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Session
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Stats */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sessions</p>
                    <p className="text-2xl font-bold">{sessions.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Enrolled Students</p>
                    <p className="text-2xl font-bold text-blue-500">{students.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Today's Sessions</p>
                    <p className="text-2xl font-bold text-green-500">
                      {sessions.filter(s => format(new Date(s.session_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')).length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Week</p>
                    <p className="text-2xl font-bold text-purple-500">
                      {sessions.filter(s => {
                        const sessionDate = new Date(s.session_date);
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return sessionDate >= weekAgo;
                      }).length}
                    </p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sessions List */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Attendance Sessions
                </CardTitle>
                <CardDescription>
                  {sessions.length} session{sessions.length !== 1 ? 's' : ''} created
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-16 bg-course-detail-20 rounded-xl">
                <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-course-detail-40 flex items-center justify-center">
                  <Calendar className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Sessions Yet</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Create your first attendance session to start tracking student attendance
                </p>
                <Button onClick={() => setSessionDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Session
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const counts = getStatusCounts(session.id);
                  const totalMarked = counts.present + counts.absent + counts.late + counts.excused;
                  return (
                    <Card 
                      key={session.id} 
                      className="group hover:shadow-lg transition-all border-border/50 hover:border-course-detail/30"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-4 mb-3">
                              <div className="h-12 w-12 rounded-lg bg-course-detail-50 group-hover:bg-course-detail-full flex items-center justify-center transition-colors shrink-0">
                                <Calendar className="h-6 w-6 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors mb-1">
                                      {session.title || 'Untitled Session'}
                                    </h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge className="bg-course-detail hover:bg-course-detail/80 text-foreground font-semibold">
                                        {format(new Date(session.session_date), 'MMM dd, yyyy')}
                                        {session.session_time && ` at ${session.session_time}`}
                                      </Badge>
                                      {session.course_title && (
                                        <Badge variant="outline" className="text-xs">
                                          {session.course_title}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {session.description && (
                                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                    {session.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                      {counts.present} Present
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/10">
                                    <XCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                                      {counts.absent} Absent
                                    </span>
                                  </div>
                                  {counts.late > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-yellow-500/10">
                                      <Clock className="h-4 w-4 text-yellow-500" />
                                      <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                                        {counts.late} Late
                                      </span>
                                    </div>
                                  )}
                                  {counts.excused > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-500/10">
                                      <UserCheck className="h-4 w-4 text-blue-500" />
                                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                        {counts.excused} Excused
                                      </span>
                                    </div>
                                  )}
                                  {totalMarked < students.length && (
                                    <Badge variant="outline" className="bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400">
                                      {students.length - totalMarked} Pending
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => openAttendanceDialog(session)}
                            className="bg-course-detail-50 hover:bg-course-detail-full border-course-detail/30 hover:border-course-detail text-foreground font-semibold transition-all shrink-0"
                          >
                            <Users className="mr-2 h-4 w-4" />
                            Mark Attendance
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

        {/* Attendance Marking Dialog */}
        <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Mark Attendance - {selectedSession?.title || 'Session'}
              </DialogTitle>
              <DialogDescription className="text-base">
                {selectedSession && (
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedSession.session_date), 'MMMM dd, yyyy')}
                    {selectedSession.session_time && ` at ${selectedSession.session_time}`}
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Quick Actions */}
              <div className="flex items-center gap-2 p-3 bg-course-detail-20 rounded-lg border border-course-detail/30">
                <span className="text-sm font-semibold">Quick Actions:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAttendanceRecords(prev =>
                      prev.map(r => ({ ...r, status: 'present' as const }))
                    );
                  }}
                  className="h-8 text-xs bg-green-500/10 hover:bg-green-500/20 border-green-500/30"
                >
                  Mark All Present
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAttendanceRecords(prev =>
                      prev.map(r => ({ ...r, status: 'absent' as const }))
                    );
                  }}
                  className="h-8 text-xs bg-red-500/10 hover:bg-red-500/20 border-red-500/30"
                >
                  Mark All Absent
                </Button>
              </div>
              
              <div className="overflow-x-auto -mx-4 px-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-course-detail/20">
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Student</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow 
                        key={record.student_id} 
                        className="hover:bg-course-detail/10 transition-colors"
                      >
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-course-detail-50 flex items-center justify-center text-xs font-bold">
                              {(record.student_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            {record.student_name || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={record.status}
                            onValueChange={(value: AttendanceRecord['status']) =>
                              updateAttendanceStatus(record.student_id, value)
                            }
                          >
                            <SelectTrigger className={`w-36 font-semibold ${
                              record.status === 'present' ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' :
                              record.status === 'late' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400' :
                              record.status === 'excused' ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400' :
                              'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                            }`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                  <span className="font-medium">Present</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="late">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                  <span className="font-medium">Late</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="excused">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                  <span className="font-medium">Excused</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="absent">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500" />
                                  <span className="font-medium">Absent</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Optional notes..."
                            value={record.notes || ''}
                            onChange={(e) => updateAttendanceNotes(record.student_id, e.target.value)}
                            className="w-full bg-course-detail-50 border-course-detail/30 focus:border-course-detail"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => setAttendanceDialogOpen(false)}
                className="hover:bg-course-detail-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={saveAttendance} 
                disabled={savingAttendance}
                className="bg-primary hover:bg-primary/90 font-semibold"
              >
                {savingAttendance ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Save Attendance
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AttendanceManagement;
