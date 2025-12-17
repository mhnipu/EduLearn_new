import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { getDashboardPath } from '@/lib/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Phone, 
  MapPin, 
  Edit2, 
  Save, 
  X, 
  Camera,
  BookOpen,
  Award,
  FileText,
  Clock,
  TrendingUp,
  Settings,
  LogOut
} from 'lucide-react';
import { BackButton } from '@/components/BackButton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProfileData {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function Profile() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [stats, setStats] = useState({
    enrolledCourses: 0,
    completedCourses: 0,
    assignmentsSubmitted: 0,
    certificatesEarned: 0,
  });
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user, loading, navigate]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      setLoadingProfile(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfileData({
          full_name: data.full_name,
          email: data.email || user.email || null,
          phone: data.phone || null,
          address: data.address || null,
          avatar_url: data.avatar_url,
          created_at: data.created_at,
          updated_at: data.updated_at,
        });

        setEditForm({
          full_name: data.full_name || '',
          phone: data.phone || '',
          address: data.address || '',
        });
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to load profile data',
        variant: 'destructive',
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchStats = async () => {
    if (!user || role !== 'student') return;

    try {
      const [enrollmentsResult, submissionsResult, certificatesResult] = await Promise.all([
        supabase
          .from('course_enrollments')
          .select('id, progress_percentage', { count: 'exact' })
          .eq('student_id', user.id),
        supabase
          .from('assignment_submissions')
          .select('id', { count: 'exact' })
          .eq('student_id', user.id),
        supabase
          .from('certificates')
          .select('id', { count: 'exact' })
          .eq('student_id', user.id),
      ]);

      const enrolledCount = enrollmentsResult.count || 0;
      const completedCount = enrollmentsResult.data?.filter(e => e.progress_percentage === 100).length || 0;
      const submittedCount = submissionsResult.count || 0;
      const certificatesCount = certificatesResult.count || 0;

      setStats({
        enrolledCourses: enrolledCount,
        completedCourses: completedCount,
        assignmentsSubmitted: submittedCount,
        certificatesEarned: certificatesCount,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name || null,
          phone: editForm.phone || null,
          address: editForm.address || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile();
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (url: string) => {
    if (!user) return;

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:195',message:'handleAvatarUpload called',data:{userId:user.id,avatarUrl:url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    try {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:200',message:'Before profiles table update',data:{userId:user.id,avatarUrl:url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:207',message:'After profiles table update',data:{hasError:!!error,errorCode:error?.code,errorMessage:error?.message,errorDetails:error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (error) throw error;

      await fetchProfile();
      toast({
        title: 'Success',
        description: 'Avatar updated successfully',
      });
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:218',message:'handleAvatarUpload error',data:{errorMessage:error?.message,errorCode:error?.code,errorDetails:error},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      toast({
        title: 'Error',
        description: 'Failed to update avatar',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
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

  const getRoleColor = (role: string | null) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-purple-100 text-purple-700 border-purple-300',
      admin: 'bg-blue-100 text-blue-700 border-blue-300',
      teacher: 'bg-green-100 text-green-700 border-green-300',
      student: 'bg-orange-100 text-orange-700 border-orange-300',
      guardian: 'bg-pink-100 text-pink-700 border-pink-300',
    };
    return colors[role || ''] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  if (loading || loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !profileData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              My Profile
            </h1>
        <p className="text-muted-foreground text-lg">
              Manage your account information and preferences
        </p>
      </div>
          <BackButton />
        </div>

        {/* Profile Header Card */}
        <Card className="mb-6 border-2">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar Section */}
              <div className="relative group">
                <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                  <AvatarImage src={profileData.avatar_url || undefined} alt={profileData.full_name || 'User'} />
                  <AvatarFallback className="text-3xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                    {getInitials(profileData.full_name)}
                  </AvatarFallback>
                </Avatar>
                {user && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="h-6 w-6 text-white" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        if (!file.type.startsWith('image/')) {
                          toast({
                            title: 'Please select an image file',
                            variant: 'destructive',
                          });
                          return;
                        }

                        if (file.size > 5 * 1024 * 1024) {
                          toast({
                            title: 'Image must be less than 5MB',
                            variant: 'destructive',
                          });
                          return;
                        }

                        try {
                          // #region agent log
                          fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:318',message:'Avatar upload started',data:{userId:user?.id,userRole:role,fileSize:file.size,fileType:file.type,fileName:file.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                          // #endregion
                          
                          const fileExt = file.name.split('.').pop();
                          const fileName = `${user.id}/avatars/${Date.now()}.${fileExt}`;

                          // #region agent log
                          fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:322',message:'File path generated',data:{fileName,fileExt,userId:user.id,pathPattern:`${user.id}/avatars/`},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                          // #endregion

                          // #region agent log
                          fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:324',message:'Before storage upload',data:{bucket:'library-files',fileName,contentType:file.type},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                          // #endregion

                          const { error: uploadError } = await supabase.storage
                            .from('library-files')
                            .upload(fileName, file, { contentType: file.type });

                          // #region agent log
                          fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:330',message:'After storage upload',data:{hasError:!!uploadError,errorCode:uploadError?.statusCode,errorMessage:uploadError?.message,errorDetails:uploadError},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                          // #endregion

                          if (uploadError) throw uploadError;

                          const { data } = supabase.storage.from('library-files').getPublicUrl(fileName);
                          
                          // #region agent log
                          fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:336',message:'Got public URL, updating profile',data:{publicUrl:data?.publicUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                          // #endregion
                          
                          await handleAvatarUpload(data.publicUrl);
                        } catch (error: any) {
                          // #region agent log
                          fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Profile.tsx:340',message:'Avatar upload error caught',data:{errorMessage:error?.message,errorCode:error?.statusCode,errorDetails:error,stack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                          // #endregion
                          
                          toast({
                            title: 'Failed to upload avatar',
                            description: error.message,
                            variant: 'destructive',
                          });
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {profileData.full_name || 'User'}
                  </h2>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className={`${getRoleColor(role)} border`}>
                      <Shield className="h-3 w-3 mr-1" />
                      {role ? role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'No Role'}
                    </Badge>
                    {profileData.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">{profileData.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Member since {new Date(profileData.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)} variant="outline">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? (
                        <>
                          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button onClick={() => setIsEditing(false)} variant="outline">
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
                <Button onClick={() => setLogoutDialogOpen(true)} variant="outline" className="text-destructive hover:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards (for students) */}
        {role === 'student' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Enrolled Courses</p>
                    <p className="text-3xl font-bold">{stats.enrolledCourses}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Completed</p>
                    <p className="text-3xl font-bold">{stats.completedCourses}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Assignments</p>
                    <p className="text-3xl font-bold">{stats.assignmentsSubmitted}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Certificates</p>
                    <p className="text-3xl font-bold">{stats.certificatesEarned}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <Award className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your basic account details</CardDescription>
          </CardHeader>
                <CardContent className="space-y-4">
                  {isEditing ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={editForm.full_name}
                          onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder="Enter your phone number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          placeholder="Enter your address"
                          rows={3}
                        />
                      </div>
                    </>
                  ) : (
                    <>
            <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                <p className="text-lg font-semibold">
                            {profileData.full_name || 'Not set'}
                </p>
              </div>
            </div>

                      <Separator />

            <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Email Address</p>
                          <p className="text-lg font-semibold">{profileData.email || 'Not set'}</p>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
                          <p className="text-lg font-semibold">{profileData.phone || 'Not set'}</p>
              </div>
            </div>

                      <Separator />

                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground">Address</p>
                          <p className="text-lg font-semibold">{profileData.address || 'Not set'}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Account Details</CardTitle>
                  <CardDescription>Your account status and role information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Role</p>
                      <Badge className={`mt-1 ${getRoleColor(role)} border`}>
                        {role ? role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'No Role'}
                      </Badge>
              </div>
            </div>

                  <Separator />

            <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Member Since</p>
                <p className="text-lg font-semibold">
                        {new Date(profileData.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                      <p className="text-lg font-semibold">
                        {new Date(profileData.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and navigation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => navigate('/courses')}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
              Browse Courses
            </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => navigate(getDashboardPath(role))}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
                {role === 'student' && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => navigate('/student/assignments')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Assignments
                  </Button>
                )}
                {role === 'student' && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start" 
                    onClick={() => navigate('/library')}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Access Library
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your recent actions and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Activity tracking coming soon</p>
                </div>
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Logout Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Logout</DialogTitle>
            <DialogDescription>
              Are you sure you want to logout? You'll need to sign in again to access your account.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
      </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}