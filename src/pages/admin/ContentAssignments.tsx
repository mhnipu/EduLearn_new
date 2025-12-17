import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, BookOpen, Video, Users, Plus, Trash2, Loader2 } from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import { getDashboardPath } from '@/lib/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface User {
  id: string;
  full_name: string | null;
  role: string;
}

interface Course {
  id: string;
  title: string;
}

interface Book {
  id: string;
  title: string;
}

interface VideoItem {
  id: string;
  title: string;
}

interface Assignment {
  id: string;
  user_id: string;
  assigned_at: string;
  user_name?: string;
  user_role?: string;
}

export default function ContentAssignments() {
  const { role, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  
  const [selectedContent, setSelectedContent] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [activeTab, setActiveTab] = useState('courses');

  useEffect(() => {
    if (!authLoading && role !== 'admin' && role !== 'super_admin') {
      navigate(getDashboardPath(role));
      toast({ title: 'Access denied', variant: 'destructive' });
    }
  }, [role, authLoading, navigate]);

  useEffect(() => {
    if (role === 'admin' || role === 'super_admin') {
      fetchData();
    }
  }, [role]);

  useEffect(() => {
    if (selectedContent) {
      fetchAssignments();
    }
  }, [selectedContent, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch users with their roles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name');
    
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');
    
    if (profilesData && rolesData) {
      const usersWithRoles = profilesData.map(p => {
        const userRole = rolesData.find(r => r.user_id === p.id);
        return {
          id: p.id,
          full_name: p.full_name,
          role: userRole?.role || 'none'
        };
      }).filter(u => u.role !== 'super_admin' && u.role !== 'admin');
      setUsers(usersWithRoles);
    }

    // Fetch content
    const [coursesRes, booksRes, videosRes] = await Promise.all([
      supabase.from('courses').select('id, title').order('title'),
      supabase.from('books').select('id, title').eq('is_active', true).order('title'),
      supabase.from('videos').select('id, title').eq('is_active', true).order('title'),
    ]);

    if (coursesRes.data) setCourses(coursesRes.data);
    if (booksRes.data) setBooks(booksRes.data);
    if (videosRes.data) setVideos(videosRes.data);
    
    setLoading(false);
  };

  const fetchAssignments = async () => {
    if (!selectedContent) return;

    let data: any[] | null = null;
    let error = null;

    if (activeTab === 'courses') {
      const res = await supabase
        .from('course_assignments')
        .select('*')
        .eq('course_id', selectedContent);
      data = res.data;
      error = res.error;
    } else if (activeTab === 'books') {
      const res = await supabase
        .from('book_assignments')
        .select('*')
        .eq('book_id', selectedContent);
      data = res.data;
      error = res.error;
    } else {
      const res = await supabase
        .from('video_assignments')
        .select('*')
        .eq('video_id', selectedContent);
      data = res.data;
      error = res.error;
    }

    if (error) {
      console.error('Error fetching assignments:', error);
      return;
    }

    // Enrich with user info
    const enrichedAssignments = (data || []).map(a => {
      const userInfo = users.find(u => u.id === a.user_id);
      return {
        ...a,
        user_name: userInfo?.full_name || 'Unknown User',
        user_role: userInfo?.role || 'unknown'
      };
    });

    setAssignments(enrichedAssignments);
  };

  const handleAssign = async () => {
    if (!selectedContent || !selectedUser) {
      toast({ title: 'Please select content and user', variant: 'destructive' });
      return;
    }

    setAssigning(true);
    let error = null;

    if (activeTab === 'courses') {
      const { error: err } = await supabase
        .from('course_assignments')
        .insert({
          course_id: selectedContent,
          user_id: selectedUser,
          assigned_by: user!.id,
        });
      error = err;
    } else if (activeTab === 'books') {
      const { error: err } = await supabase
        .from('book_assignments')
        .insert({
          book_id: selectedContent,
          user_id: selectedUser,
          assigned_by: user!.id,
        });
      error = err;
    } else {
      const { error: err } = await supabase
        .from('video_assignments')
        .insert({
          video_id: selectedContent,
          user_id: selectedUser,
          assigned_by: user!.id,
        });
      error = err;
    }

    setAssigning(false);

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'User already assigned to this content', variant: 'destructive' });
      } else {
        toast({ title: 'Failed to assign', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Content assigned successfully!' });
      setSelectedUser('');
      fetchAssignments();
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    let error = null;

    if (activeTab === 'courses') {
      const { error: err } = await supabase
        .from('course_assignments')
        .delete()
        .eq('id', assignmentId);
      error = err;
    } else if (activeTab === 'books') {
      const { error: err } = await supabase
        .from('book_assignments')
        .delete()
        .eq('id', assignmentId);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('video_assignments')
        .delete()
        .eq('id', assignmentId);
      error = err;
    }

    if (error) {
      toast({ title: 'Failed to remove assignment', variant: 'destructive' });
    } else {
      toast({ title: 'Assignment removed' });
      fetchAssignments();
    }
  };

  const getContentOptions = () => {
    switch (activeTab) {
      case 'courses': return courses;
      case 'books': return books;
      case 'videos': return videos;
      default: return [];
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== 'admin' && role !== 'super_admin') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BackButton 
        fallbackPath="/dashboard/admin"
        fallbackLabel="Back to Admin Dashboard"
        className="mb-6"
      />

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Content Assignments</h1>
        <p className="text-muted-foreground">
          Assign courses, books, and videos to teachers, students, and guardians
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedContent(''); setAssignments([]); }}>
        <TabsList className="mb-6">
          <TabsTrigger value="courses">
            <BookOpen className="mr-2 h-4 w-4" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="books">
            <BookOpen className="mr-2 h-4 w-4" />
            Books
          </TabsTrigger>
          <TabsTrigger value="videos">
            <Video className="mr-2 h-4 w-4" />
            Videos
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Assignment Form */}
            <Card>
              <CardHeader>
                <CardTitle>Assign {activeTab.slice(0, -1)}</CardTitle>
                <CardDescription>
                  Select content and assign it to users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select {activeTab.slice(0, -1)}
                  </label>
                  <Select value={selectedContent} onValueChange={setSelectedContent}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Choose a ${activeTab.slice(0, -1)}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {getContentOptions().map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Select User</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.full_name || 'No Name'} ({u.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleAssign} 
                  disabled={!selectedContent || !selectedUser || assigning}
                  className="w-full"
                >
                  {assigning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Assign to User
                </Button>
              </CardContent>
            </Card>

            {/* Current Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Current Assignments
                </CardTitle>
                <CardDescription>
                  {selectedContent 
                    ? `Users assigned to this ${activeTab.slice(0, -1)}`
                    : `Select a ${activeTab.slice(0, -1)} to view assignments`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedContent ? (
                  <p className="text-muted-foreground text-center py-8">
                    Select content to view assignments
                  </p>
                ) : assignments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No users assigned yet
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="w-[80px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.user_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{a.user_role}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveAssignment(a.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
