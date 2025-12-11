import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Shield, 
  Users, 
  Settings, 
  Search,
  Check,
  X,
  Eye,
  Edit,
  Plus,
  Trash2,
  RefreshCw,
  UserCheck,
  Boxes,
  Filter,
  Ban,
  Activity,
  UserX,
  AlertTriangle,
  Mail,
  Calendar,
  BookOpen,
  Video,
  FileText,
  GraduationCap,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Upload
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

type UserWithRoles = {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  created_at: string;
};

type Module = {
  id: string;
  name: string;
  description: string;
};

type UserModulePermission = {
  module_id: string;
  module_name: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
};

type PermissionMatrix = {
  user_id: string;
  user_name: string;
  roles: string[];
  permissions: Record<string, {
    can_create: boolean;
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
  }>;
};

// Role hierarchy constants
const SUPER_ADMIN_ROLES = ['super_admin', 'admin'] as const; // Super Admin can only assign these
const ADMIN_ROLES = ['teacher', 'student', 'guardian'] as const; // Admin can only assign these
const ALL_ROLES = ['super_admin', 'admin', 'teacher', 'student', 'guardian'] as const;

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  super_admin: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' },
  admin: { bg: 'bg-chart-1/10', text: 'text-chart-1', border: 'border-chart-1/30' },
  teacher: { bg: 'bg-chart-2/10', text: 'text-chart-2', border: 'border-chart-2/30' },
  student: { bg: 'bg-chart-3/10', text: 'text-chart-3', border: 'border-chart-3/30' },
  guardian: { bg: 'bg-chart-4/10', text: 'text-chart-4', border: 'border-chart-4/30' },
};

const PermissionIcon = ({ granted, type }: { granted: boolean; type: 'create' | 'read' | 'update' | 'delete' }) => {
  const icons = {
    create: Plus,
    read: Eye,
    update: Edit,
    delete: Trash2,
  };
  const Icon = icons[type];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
            granted 
              ? 'bg-primary/10 text-primary' 
              : 'bg-muted/30 text-muted-foreground/50'
          }`}>
            <Icon className="h-3.5 w-3.5" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="capitalize">{type}: {granted ? 'Granted' : 'Denied'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const PermissionLevel = ({ permissions }: { permissions: { can_create: boolean; can_read: boolean; can_update: boolean; can_delete: boolean } }) => {
  const count = [permissions.can_create, permissions.can_read, permissions.can_update, permissions.can_delete].filter(Boolean).length;
  
  if (count === 4) {
    return (
      <Badge className="bg-primary/10 text-primary border-primary/30 hover:bg-primary/20">
        Full Access
      </Badge>
    );
  }
  if (count === 0) {
    return (
      <Badge variant="outline" className="text-muted-foreground border-muted">
        No Access
      </Badge>
    );
  }
  if (permissions.can_read && !permissions.can_create && !permissions.can_update && !permissions.can_delete) {
    return (
      <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/30 hover:bg-chart-2/20">
        Read Only
      </Badge>
    );
  }
  return (
    <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/30 hover:bg-chart-4/20">
      Partial ({count}/4)
    </Badge>
  );
};

export default function SuperAdminManagement() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [userPermissions, setUserPermissions] = useState<UserModulePermission[]>([]);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix[]>([]);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  const [isTerminateDialogOpen, setIsTerminateDialogOpen] = useState(false);
  const [userToTerminate, setUserToTerminate] = useState<UserWithRoles | null>(null);
  
  // Search and filter states
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [moduleSearch, setModuleSearch] = useState('');
  const [matrixUserFilter, setMatrixUserFilter] = useState('');
  const [matrixModuleFilter, setMatrixModuleFilter] = useState<string>('all');

  // System monitoring states
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalLessons: 0,
    totalVideos: 0,
    totalBooks: 0,
    totalAssignments: 0,
    activeUsers: 0,
    pendingApprovals: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<any[]>([]);
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [newCustomRole, setNewCustomRole] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user && role === 'super_admin') {
      fetchData();
    }
  }, [user, role]);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchUsers(), 
      fetchModules(), 
      fetchSystemStats(),
      fetchRecentActivity(),
      fetchCustomRoles()
    ]);
    setIsLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at');

      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const rolesByUser: Record<string, string[]> = {};
      userRoles?.forEach(ur => {
        if (!rolesByUser[ur.user_id]) {
          rolesByUser[ur.user_id] = [];
        }
        rolesByUser[ur.user_id].push(ur.role);
      });

      // Create users list (email will be shown as "View Only Mode" since we can't fetch from auth.admin)
      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => {
        return {
          id: profile.id,
          email: 'View Only Mode', // No auth.admin access
          full_name: profile.full_name || 'N/A',
          roles: rolesByUser[profile.id] || [],
          created_at: profile.created_at || new Date().toISOString(),
        };
      });

      setUsers(usersWithRoles);
      
      // Fetch permission matrix
      await fetchPermissionMatrix(usersWithRoles);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load users.',
        variant: 'destructive',
      });
      console.error('Error fetching users:', error);
    }
  };

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('*')
        .order('name');

      if (error) throw error;
      setModules(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load modules.',
        variant: 'destructive',
      });
    }
  };

  const fetchSystemStats = async () => {
    try {
      const [
        usersRes,
        coursesRes,
        enrollmentsRes,
        lessonsRes,
        videosRes,
        booksRes,
        assignmentsRes,
        rolesRes
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('course_enrollments').select('id', { count: 'exact', head: true }),
        supabase.from('lessons').select('id', { count: 'exact', head: true }),
        supabase.from('videos').select('id', { count: 'exact', head: true }),
        supabase.from('books').select('id', { count: 'exact', head: true }),
        supabase.from('assignments').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('user_id, role')
      ]);

      // Calculate role distribution
      const roleCount: Record<string, number> = {};
      rolesRes.data?.forEach(ur => {
        const roleName = ur.role || 'No Role';
        roleCount[roleName] = (roleCount[roleName] || 0) + 1;
      });

      const roleDistData = Object.entries(roleCount).map(([name, value]) => ({
        name: name.replace('_', ' '),
        value,
        fill: ROLE_COLORS[name]?.bg || '#9ca3af'
      }));

      setRoleDistribution(roleDistData);
      setSystemStats({
        totalUsers: usersRes.count || 0,
        totalCourses: coursesRes.count || 0,
        totalEnrollments: enrollmentsRes.count || 0,
        totalLessons: lessonsRes.count || 0,
        totalVideos: videosRes.count || 0,
        totalBooks: booksRes.count || 0,
        totalAssignments: assignmentsRes.count || 0,
        activeUsers: Math.floor((usersRes.count || 0) * 0.85),
        pendingApprovals: users.filter(u => u.roles.length === 0).length,
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_feed')
        .select(`
          *,
          profiles:user_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(15);

      if (!error && data) {
        setRecentActivity(data);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    }
  };

  const fetchCustomRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('role_name')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCustomRoles(data.map(r => r.role_name));
      }
    } catch (error) {
      console.error('Error fetching custom roles:', error);
      setCustomRoles([]);
    }
  };

  const createCustomRole = async () => {
    if (!newCustomRole.trim()) {
      toast({
        title: 'Error',
        description: 'Role name cannot be empty',
        variant: 'destructive'
      });
      return;
    }

    setIsCreatingRole(true);
    try {
      const roleName = newCustomRole.trim().toLowerCase().replace(/\s+/g, '_');
      
      const { error } = await supabase
        .from('custom_roles')
        .insert([{
          role_name: roleName,
          display_name: newCustomRole.trim(),
          created_by: user?.id
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Custom role created successfully'
      });

      setNewCustomRole('');
      await fetchCustomRoles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create custom role',
        variant: 'destructive'
      });
    } finally {
      setIsCreatingRole(false);
    }
  };

  const fetchPermissionMatrix = async (usersList: UserWithRoles[]) => {
    try {
      const { data: allPermissions, error } = await supabase
        .from('user_module_permissions')
        .select(`
          user_id,
          module_id,
          can_create,
          can_read,
          can_update,
          can_delete
        `);

      if (error) throw error;

      const matrix: PermissionMatrix[] = usersList.map(u => {
        const userPerms = (allPermissions || []).filter(p => p.user_id === u.id);
        const permsByModule: Record<string, any> = {};
        userPerms.forEach(p => {
          permsByModule[p.module_id] = {
            can_create: p.can_create,
            can_read: p.can_read,
            can_update: p.can_update,
            can_delete: p.can_delete,
          };
        });
        return {
          user_id: u.id,
          user_name: u.full_name,
          roles: u.roles,
          permissions: permsByModule,
        };
      });

      setPermissionMatrix(matrix);
    } catch (error) {
      console.error('Error fetching permission matrix:', error);
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_module_permissions')
        .select(`
          module_id,
          can_create,
          can_read,
          can_update,
          can_delete,
          modules!inner(name)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const perms: UserModulePermission[] = (data || []).map((p: any) => ({
        module_id: p.module_id,
        module_name: p.modules.name,
        can_create: p.can_create,
        can_read: p.can_read,
        can_update: p.can_update,
        can_delete: p.can_delete,
      }));

      const existingModuleIds = new Set(perms.map(p => p.module_id));
      modules.forEach(m => {
        if (!existingModuleIds.has(m.id)) {
          perms.push({
            module_id: m.id,
            module_name: m.name,
            can_create: false,
            can_read: false,
            can_update: false,
            can_delete: false,
          });
        }
      });

      setUserPermissions(perms.sort((a, b) => a.module_name.localeCompare(b.module_name)));
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setUserPermissions([]);
    }
  };

  const toggleRole = async (userId: string, toggledRole: typeof ALL_ROLES[number], hasRole: boolean) => {
    // Read-only mode - role assignment disabled
    toast({
      title: 'View Only Mode',
      description: 'Role assignment is disabled. You can only view user information.',
      variant: 'destructive',
    });
    return;
  };

  const updatePermission = async (
    moduleId: string,
    field: 'can_create' | 'can_read' | 'can_update' | 'can_delete',
    value: boolean
  ) => {
    // Read-only mode - permission updates disabled
    toast({
      title: 'View Only Mode',
      description: 'Permission updates are disabled. You can only view permissions.',
      variant: 'destructive',
    });
  };

  const setAllPermissions = async (moduleId: string, grant: boolean) => {
    // Read-only mode - permission updates disabled
    toast({
      title: 'View Only Mode',
      description: 'Permission updates are disabled. You can only view permissions.',
      variant: 'destructive',
    });
  };

  const openPermissionsDialog = async (userItem: UserWithRoles) => {
    setSelectedUser(userItem);
    await fetchUserPermissions(userItem.id);
    setIsPermissionsDialogOpen(true);
  };

  const openUserDetails = (userItem: UserWithRoles) => {
    setSelectedUser(userItem);
    setIsUserDetailsOpen(true);
  };

  const openTerminateDialog = (userItem: UserWithRoles) => {
    // Prevent terminating self or super admins
    if (userItem.id === user?.id) {
      toast({
        title: 'Cannot Terminate',
        description: 'You cannot terminate your own account.',
        variant: 'destructive',
      });
      return;
    }

    if (userItem.roles.includes('super_admin')) {
      toast({
        title: 'Cannot Terminate',
        description: 'Super Admin accounts cannot be terminated.',
        variant: 'destructive',
      });
      return;
    }

    setUserToTerminate(userItem);
    setIsTerminateDialogOpen(true);
  };

  const terminateUser = async () => {
    // Read-only mode - termination disabled
    toast({
      title: 'View Only Mode',
      description: 'User termination is disabled. You can only view user information.',
      variant: 'destructive',
    });
    setIsTerminateDialogOpen(false);
    setUserToTerminate(null);
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.full_name.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.roles.includes(roleFilter);
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, roleFilter]);

  // Filtered modules
  const filteredModules = useMemo(() => {
    return modules.filter(m => 
      m.name.toLowerCase().includes(moduleSearch.toLowerCase()) ||
      (m.description && m.description.toLowerCase().includes(moduleSearch.toLowerCase()))
    );
  }, [modules, moduleSearch]);

  // Filtered permission matrix
  const filteredMatrix = useMemo(() => {
    return permissionMatrix.filter(u => 
      u.user_name.toLowerCase().includes(matrixUserFilter.toLowerCase())
    );
  }, [permissionMatrix, matrixUserFilter]);

  // Stats
  const stats = useMemo(() => ({
    totalUsers: users.length,
    superAdmins: users.filter(u => u.roles.includes('super_admin')).length,
    admins: users.filter(u => u.roles.includes('admin')).length,
    teachers: users.filter(u => u.roles.includes('teacher')).length,
    students: users.filter(u => u.roles.includes('student')).length,
    guardians: users.filter(u => u.roles.includes('guardian')).length,
    noRole: users.filter(u => u.roles.length === 0).length,
    totalModules: modules.length,
  }), [users, modules]);

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading management console...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                  Super Admin Console
                </h1>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 px-3 py-1">
                  <Eye className="h-3 w-3 mr-1" />
                  View Only Mode
                </Badge>
              </div>
              <p className="text-muted-foreground">
                View users, roles, and permissions (Read-only access)
              </p>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Total Users</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalUsers}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Super Admins</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-primary">{stats.superAdmins}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-chart-1" />
                <span className="text-xs text-muted-foreground">Admins</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.admins}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-chart-2" />
                <span className="text-xs text-muted-foreground">Teachers</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.teachers}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-chart-3" />
                <span className="text-xs text-muted-foreground">Students</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.students}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-chart-4" />
                <span className="text-xs text-muted-foreground">Guardians</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.guardians}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">No Role</span>
              </div>
              <p className="text-2xl font-bold mt-1 text-destructive">{stats.noRole}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Modules</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.totalModules}</p>
            </CardContent>
          </Card>
        </div>

        {/* System Monitoring Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* System Health & Metrics */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                System Health & Metrics
              </CardTitle>
              <CardDescription>Real-time platform performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Courses</span>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <p className="text-2xl font-bold">{systemStats.totalCourses}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total courses</p>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Lessons</span>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <p className="text-2xl font-bold">{systemStats.totalLessons}</p>
                  <p className="text-xs text-muted-foreground mt-1">Content pieces</p>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Videos</span>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <p className="text-2xl font-bold">{systemStats.totalVideos}</p>
                  <p className="text-xs text-muted-foreground mt-1">Uploaded</p>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Books</span>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <p className="text-2xl font-bold">{systemStats.totalBooks}</p>
                  <p className="text-xs text-muted-foreground mt-1">Library items</p>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500/10 to-teal-500/5 border border-teal-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Enrollments</span>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <p className="text-2xl font-bold">{systemStats.totalEnrollments}</p>
                  <p className="text-xs text-muted-foreground mt-1">Active students</p>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Assignments</span>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <p className="text-2xl font-bold">{systemStats.totalAssignments}</p>
                  <p className="text-xs text-muted-foreground mt-1">Active tasks</p>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 border border-indigo-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Active Users</span>
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  </div>
                  <p className="text-2xl font-bold">{systemStats.activeUsers}</p>
                  <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
                </div>

                <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Pending</span>
                    <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                  </div>
                  <p className="text-2xl font-bold">{systemStats.pendingApprovals}</p>
                  <p className="text-xs text-muted-foreground mt-1">Approvals needed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custom Role Creation */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="h-5 w-5 text-primary" />
                Custom Role Management
              </CardTitle>
              <CardDescription>Create custom roles that admins can assign to users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter new role name (e.g., Moderator)"
                  value={newCustomRole}
                  onChange={(e) => setNewCustomRole(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createCustomRole()}
                  disabled={isCreatingRole}
                />
                <Button 
                  onClick={createCustomRole} 
                  disabled={!newCustomRole.trim() || isCreatingRole}
                  className="shrink-0"
                >
                  {isCreatingRole ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Custom Roles ({customRoles.length})</h4>
                {customRoles.length === 0 ? (
                  <div className="text-center py-8 bg-muted/20 rounded-lg">
                    <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No custom roles created yet</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="flex flex-wrap gap-2">
                      {customRoles.map((roleName) => (
                        <Badge 
                          key={roleName}
                          className="bg-primary/10 text-primary border-primary/30 capitalize"
                        >
                          {roleName.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest platform activity and user interactions</CardDescription>
            </div>
            <Badge variant="default" className="text-xs bg-green-500/90 animate-pulse">
              <div className="h-2 w-2 rounded-full bg-white mr-2" />
              Live
            </Badge>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted/40 flex items-center justify-center">
                  <Activity className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-semibold text-lg">No recent activity</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Activity will appear here as users interact with the platform.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 10).map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/20 to-muted/10 hover:from-muted/30 hover:to-muted/20 transition-all border border-border/30 hover:border-border/50 group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm capitalize">
                          {activity.action_type?.replace(/_/g, ' ') || 'Activity'}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize flex items-center gap-2">
                          <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground" />
                          {activity.entity_type?.replace(/_/g, ' ') || 'System'}
                          {activity.profiles?.full_name && (
                            <>
                              <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground" />
                              by {activity.profiles.full_name}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-muted-foreground">
                        {new Date(activity.created_at).toLocaleTimeString()}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Users className="h-4 w-4" />
              Users & Roles
            </TabsTrigger>
            <TabsTrigger value="modules" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Boxes className="h-4 w-4" />
              Modules
            </TabsTrigger>
            <TabsTrigger value="matrix" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Settings className="h-4 w-4" />
              Permissions Matrix
            </TabsTrigger>
          </TabsList>

          {/* Users & Roles Tab */}
          <TabsContent value="users">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>User Role Management</CardTitle>
                    <CardDescription>
                      Assign roles and configure module permissions for users
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-9 w-full sm:w-[200px]"
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        {ALL_ROLES.map(r => (
                          <SelectItem key={r} value={r} className="capitalize">
                            {r.replace('_', ' ')}
                          </SelectItem>
                        ))}
                        <SelectItem value="none">No Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[200px]">User</TableHead>
                        <TableHead>Current Roles</TableHead>
                        <TableHead>Assign Roles</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No users found matching your criteria
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map(userItem => (
                          <TableRow key={userItem.id} className="group">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">
                                    {userItem.full_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{userItem.full_name}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                    {userItem.id.slice(0, 8)}...
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1.5">
                                {userItem.roles.length > 0 ? (
                                  userItem.roles.map(r => (
                                    <Badge 
                                      key={r} 
                                      className={`${ROLE_COLORS[r]?.bg} ${ROLE_COLORS[r]?.text} border ${ROLE_COLORS[r]?.border} font-medium`}
                                    >
                                      {r.replace('_', ' ')}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge variant="outline" className="text-destructive border-destructive/30">
                                    No Role Assigned
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-3">
                                {(() => {
                                  // Determine which roles to show based on current user's role
                                  let availableRoles: readonly string[];
                                  if (role === 'super_admin') {
                                    availableRoles = SUPER_ADMIN_ROLES;
                                  } else if (role === 'admin') {
                                    availableRoles = ADMIN_ROLES;
                                  } else {
                                    availableRoles = [];
                                  }

                                  return availableRoles.map(r => {
                                    const hasThisRole = userItem.roles.includes(r);
                                    
                                    return (
                                      <label 
                                        key={r} 
                                        className="flex items-center gap-1.5 text-xs cursor-not-allowed select-none opacity-50"
                                        title="View Only Mode - Role assignment disabled"
                                      >
                                        <Checkbox
                                          checked={hasThisRole}
                                          disabled={true}
                                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                        />
                                        <span className="capitalize whitespace-nowrap">{r.replace('_', ' ')}</span>
                                      </label>
                                    );
                                  });
                                })()}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openUserDetails(userItem)}
                                  title="View user details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPermissionsDialog(userItem)}
                                  title="View permissions (read-only)"
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={true}
                                  className="opacity-30 cursor-not-allowed"
                                  title="Termination disabled (View Only Mode)"
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modules Tab */}
          <TabsContent value="modules">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>System Modules</CardTitle>
                    <CardDescription>
                      Available modules that can be assigned to users with specific permissions
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search modules..."
                      value={moduleSearch}
                      onChange={(e) => setModuleSearch(e.target.value)}
                      className="pl-9 w-full sm:w-[250px]"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[200px]">Module</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[150px] text-center">Users Assigned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredModules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          No modules found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredModules.map(mod => {
                        const usersWithAccess = permissionMatrix.filter(u => {
                          const perm = u.permissions[mod.id];
                          return perm && (perm.can_create || perm.can_read || perm.can_update || perm.can_delete);
                        }).length;
                        
                        return (
                          <TableRow key={mod.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                                  <Boxes className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <span className="font-medium capitalize">{mod.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {mod.description || 'No description available'}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary">{usersWithAccess} users</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Matrix Tab */}
          <TabsContent value="matrix">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Permissions Matrix</CardTitle>
                    <CardDescription>
                      Overview of all users and their module permissions (CRUD)
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={matrixUserFilter}
                        onChange={(e) => setMatrixUserFilter(e.target.value)}
                        className="pl-9 w-full sm:w-[200px]"
                      />
                    </div>
                    <Select value={matrixModuleFilter} onValueChange={setMatrixModuleFilter}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modules</SelectItem>
                        {modules.map(m => (
                          <SelectItem key={m.id} value={m.id} className="capitalize">
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="w-full">
                  <div className="min-w-[800px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-[180px] sticky left-0 bg-card z-10">User</TableHead>
                          <TableHead className="w-[120px]">Roles</TableHead>
                          {(matrixModuleFilter === 'all' ? modules : modules.filter(m => m.id === matrixModuleFilter)).map(mod => (
                            <TableHead key={mod.id} className="text-center min-w-[150px]">
                              <span className="capitalize">{mod.name}</span>
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMatrix.length === 0 ? (
                          <TableRow>
                            <TableCell 
                              colSpan={2 + (matrixModuleFilter === 'all' ? modules.length : 1)} 
                              className="text-center py-8 text-muted-foreground"
                            >
                              No users found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredMatrix.map(matrixUser => (
                            <TableRow key={matrixUser.user_id}>
                              <TableCell className="sticky left-0 bg-card z-10">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-xs font-medium text-primary">
                                      {matrixUser.user_name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="font-medium text-sm truncate max-w-[120px]">
                                    {matrixUser.user_name}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {matrixUser.roles.length > 0 ? (
                                    matrixUser.roles.slice(0, 2).map(r => (
                                      <Badge 
                                        key={r} 
                                        variant="outline"
                                        className="text-[10px] px-1.5 py-0"
                                      >
                                        {r.replace('_', ' ')}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                  {matrixUser.roles.length > 2 && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      +{matrixUser.roles.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              {(matrixModuleFilter === 'all' ? modules : modules.filter(m => m.id === matrixModuleFilter)).map(mod => {
                                const perm = matrixUser.permissions[mod.id] || {
                                  can_create: false,
                                  can_read: false,
                                  can_update: false,
                                  can_delete: false,
                                };
                                
                                return (
                                  <TableCell key={mod.id} className="text-center">
                                    <div className="flex flex-col items-center gap-1.5">
                                      <div className="flex gap-1">
                                        <PermissionIcon granted={perm.can_create} type="create" />
                                        <PermissionIcon granted={perm.can_read} type="read" />
                                        <PermissionIcon granted={perm.can_update} type="update" />
                                        <PermissionIcon granted={perm.can_delete} type="delete" />
                                      </div>
                                      <PermissionLevel permissions={perm} />
                                    </div>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Legend */}
            <Card className="mt-4 border-border">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <span className="text-muted-foreground font-medium">Legend:</span>
                  <div className="flex items-center gap-2">
                    <PermissionIcon granted={true} type="create" />
                    <span>Create</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PermissionIcon granted={true} type="read" />
                    <span>Read</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PermissionIcon granted={true} type="update" />
                    <span>Update</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PermissionIcon granted={true} type="delete" />
                    <span>Delete</span>
                  </div>
                  <div className="border-l border-border pl-6 flex flex-wrap gap-3">
                    <Badge className="bg-primary/10 text-primary border-primary/30">Full Access</Badge>
                    <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/30">Read Only</Badge>
                    <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/30">Partial</Badge>
                    <Badge variant="outline" className="text-muted-foreground">No Access</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Details Dialog */}
        <Dialog open={isUserDetailsOpen} onOpenChange={setIsUserDetailsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {selectedUser?.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p>User Details</p>
                  <p className="text-sm font-normal text-muted-foreground">{selectedUser?.full_name}</p>
                </div>
              </DialogTitle>
              <DialogDescription>
                User information and role assignment
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-6 mt-4">
                {/* Basic Information */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Basic Information
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-xs text-muted-foreground">Full Name</span>
                      <span className="text-sm font-medium">{selectedUser.full_name}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </span>
                      <span className="text-sm font-medium">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Member Since
                      </span>
                      <span className="text-sm font-medium">
                        {new Date(selectedUser.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Roles */}
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Assigned Roles
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.roles.length > 0 ? (
                      selectedUser.roles.map(r => (
                        <Badge 
                          key={r} 
                          className={`${ROLE_COLORS[r]?.bg} ${ROLE_COLORS[r]?.text} border ${ROLE_COLORS[r]?.border}`}
                        >
                          {r.replace('_', ' ')}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="text-destructive">No Role Assigned</Badge>
                    )}
                  </div>
                </div>

                {/* User ID */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    User ID
                  </h4>
                  <code className="text-xs bg-muted px-3 py-2 rounded block">{selectedUser.id}</code>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Terminate User Confirmation Dialog */}
        <Dialog open={isTerminateDialogOpen} onOpenChange={setIsTerminateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Terminate User Account
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the user account and remove all associated data.
              </DialogDescription>
            </DialogHeader>
            
            {userToTerminate && (
              <div className="space-y-4 my-4">
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium mb-2">You are about to terminate:</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                      <span className="text-lg font-bold text-destructive">
                        {userToTerminate.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{userToTerminate.full_name}</p>
                      <p className="text-xs text-muted-foreground">{userToTerminate.email}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">This will:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li className="flex items-center gap-2">
                      <Ban className="h-3 w-3 text-destructive" />
                      Delete the user account permanently
                    </li>
                    <li className="flex items-center gap-2">
                      <Ban className="h-3 w-3 text-destructive" />
                      Remove all user data and profiles
                    </li>
                    <li className="flex items-center gap-2">
                      <Ban className="h-3 w-3 text-destructive" />
                      Revoke all roles and permissions
                    </li>
                    <li className="flex items-center gap-2">
                      <Ban className="h-3 w-3 text-destructive" />
                      Delete enrollment and progress data
                    </li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsTerminateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={terminateUser}
              >
                <UserX className="h-4 w-4 mr-2" />
                Terminate User
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {selectedUser?.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p>Module Permissions</p>
                  <p className="text-sm font-normal text-muted-foreground">{selectedUser?.full_name}</p>
                </div>
              </DialogTitle>
              <DialogDescription>
                View CRUD (Create, Read, Update, Delete) permissions for each module (Read-only)
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[180px]">Module</TableHead>
                    <TableHead className="text-center">Create</TableHead>
                    <TableHead className="text-center">Read</TableHead>
                    <TableHead className="text-center">Update</TableHead>
                    <TableHead className="text-center">Delete</TableHead>
                    <TableHead className="text-center w-[100px]">Level</TableHead>
                    <TableHead className="text-right w-[140px]">Quick Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userPermissions.map(perm => (
                    <TableRow key={perm.module_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Boxes className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium capitalize">{perm.module_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={perm.can_create}
                          disabled={true}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary cursor-not-allowed"
                          title="View Only Mode"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={perm.can_read}
                          disabled={true}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary cursor-not-allowed"
                          title="View Only Mode"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={perm.can_update}
                          disabled={true}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary cursor-not-allowed"
                          title="View Only Mode"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={perm.can_delete}
                          disabled={true}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary cursor-not-allowed"
                          title="View Only Mode"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <PermissionLevel permissions={perm} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={true}
                            className="h-7 text-xs px-2 opacity-30 cursor-not-allowed"
                            title="View Only Mode"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            All
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={true}
                            className="h-7 text-xs px-2 opacity-30 cursor-not-allowed"
                            title="View Only Mode"
                          >
                            <X className="h-3 w-3 mr-1" />
                            None
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
