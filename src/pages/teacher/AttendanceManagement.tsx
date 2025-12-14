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
import { ArrowLeft, Calendar, Plus, CheckCircle2, XCircle, Clock, UserCheck, Users } from 'lucide-react';
import { format } from 'date-fns';

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
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
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
      navigate('/dashboard');
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

    const { data: enrollments, error } = await supabase
      .from('course_enrollments')
      .select(`
        user_id,
        enrolled_at,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('course_id', courseId)
      .order('enrolled_at', { ascending: false });

    if (error) throw error;

    const studentsData = (enrollments || []).map((e: any) => ({
      id: e.user_id,
      full_name: e.profiles?.full_name || 'Unknown',
      avatar_url: e.profiles?.avatar_url || null,
      enrolled_at: e.enrolled_at,
    }));

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
    const { data: existingData, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        profiles (
          full_name
        )
      `)
      .eq('session_id', session.id);

    if (error) {
      console.error('Error fetching attendance records:', error);
    }

    const existingRecords = (existingData || []).map((r: any) => ({
      ...r,
      student_name: r.profiles?.full_name || 'Unknown',
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
    if (!selectedSession) return;

    setSavingAttendance(true);
    try {
      // Delete existing records
      await supabase
        .from('attendance_records')
        .delete()
        .eq('session_id', selectedSession.id);

      // Insert new records
      const recordsToInsert = attendanceRecords.map(record => ({
        session_id: record.session_id,
        student_id: record.student_id,
        status: record.status,
        notes: record.notes,
        marked_by: user?.id,
      }));

      const { error } = await supabase
        .from('attendance_records')
        .insert(recordsToInsert);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Attendance saved successfully',
      });

      setAttendanceDialogOpen(false);
      fetchSessions();
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save attendance',
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
    const records = attendanceRecords.filter(r => r.session_id === sessionId);
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Attendance Session</DialogTitle>
                <DialogDescription>
                  Create a new class session for attendance tracking
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="session_date">Date</Label>
                  <Input
                    id="session_date"
                    type="date"
                    value={newSession.session_date}
                    onChange={(e) => setNewSession({ ...newSession, session_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="session_time">Time (Optional)</Label>
                  <Input
                    id="session_time"
                    type="time"
                    value={newSession.session_time}
                    onChange={(e) => setNewSession({ ...newSession, session_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="title">Title (Optional)</Label>
                  <Input
                    id="title"
                    value={newSession.title}
                    onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                    placeholder="e.g., Week 1 - Introduction"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newSession.description}
                    onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                    placeholder="Session notes or description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSessionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createSession} disabled={creatingSession}>
                  {creatingSession ? 'Creating...' : 'Create Session'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Sessions</CardTitle>
            <CardDescription>
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} created
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No attendance sessions yet. Create your first session to start tracking attendance.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => {
                  const counts = getStatusCounts(session.id);
                  return (
                    <Card key={session.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">
                                {session.title || 'Untitled Session'}
                              </h3>
                              <Badge variant="outline">
                                {format(new Date(session.session_date), 'MMM dd, yyyy')}
                                {session.session_time && ` at ${session.session_time}`}
                              </Badge>
                            </div>
                            {session.description && (
                              <p className="text-sm text-muted-foreground mb-4">
                                {session.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>{counts.present} Present</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span>{counts.absent} Absent</span>
                              </div>
                              {counts.late > 0 && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4 text-yellow-500" />
                                  <span>{counts.late} Late</span>
                                </div>
                              )}
                              {counts.excused > 0 && (
                                <div className="flex items-center gap-1">
                                  <UserCheck className="h-4 w-4 text-blue-500" />
                                  <span>{counts.excused} Excused</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => openAttendanceDialog(session)}
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Mark Attendance - {selectedSession?.title || 'Session'}
              </DialogTitle>
              <DialogDescription>
                {selectedSession && format(new Date(selectedSession.session_date), 'MMMM dd, yyyy')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record) => (
                    <TableRow key={record.student_id}>
                      <TableCell className="font-medium">
                        {record.student_name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={record.status}
                          onValueChange={(value: AttendanceRecord['status']) =>
                            updateAttendanceStatus(record.student_id, value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                Present
                              </div>
                            </SelectItem>
                            <SelectItem value="late">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                                Late
                              </div>
                            </SelectItem>
                            <SelectItem value="excused">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                Excused
                              </div>
                            </SelectItem>
                            <SelectItem value="absent">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                Absent
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
                          className="w-full"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveAttendance} disabled={savingAttendance}>
                {savingAttendance ? 'Saving...' : 'Save Attendance'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AttendanceManagement;
