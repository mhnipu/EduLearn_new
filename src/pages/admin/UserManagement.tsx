import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  Shield, 
  Users, 
  Settings, 
  Search,
  Eye,
  Edit,
  Plus,
  Trash2,
  RefreshCw,
  UserCheck,
  Boxes,
  Filter,
  ArrowLeft,
  X,
  ChevronDown,
  LayoutGrid,
  LayoutList,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { PermissionMatrixCard } from '@/components/permissions/PermissionMatrixCard';
import { BackButton } from '@/components/BackButton';
import { getDashboardPath } from '@/lib/navigation';

type UserWithRoles = {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string | null;
  roles: string[];
  created_at: string;
  updated_at?: string;
};

type Module = {
  id: string;
  name: string;
  description: string | null;
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
  email?: string;
  avatar_url?: string | null;
  roles: string[];
  created_at: string;
  permissions: Record<string, {
    can_create: boolean;
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
  }>;
  permission_count: number;
};

type BulkAction = 'add_role' | 'remove_role' | 'grant_permission' | 'revoke_permission';

// Super Admin can only assign super_admin role
const SUPER_ADMIN_ASSIGNABLE_ROLES = ['super_admin'] as const;
// Admin can assign all other roles
const ADMIN_ASSIGNABLE_ROLES = ['admin', 'teacher', 'student', 'guardian'] as const;
const ALL_ROLES = ['super_admin', 'admin', 'teacher', 'student', 'guardian'] as const;

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  super_admin: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' },
  admin: { bg: 'bg-chart-1/10', text: 'text-chart-1', border: 'border-chart-1/30' },
  teacher: { bg: 'bg-chart-2/10', text: 'text-chart-2', border: 'border-chart-2/30' },
  student: { bg: 'bg-chart-3/10', text: 'text-chart-3', border: 'border-chart-3/30' },
  guardian: { bg: 'bg-chart-4/10', text: 'text-chart-4', border: 'border-chart-4/30' },
};

const PermissionIcon = ({ granted, type }: { granted: boolean; type: 'create' | 'read' | 'update' | 'delete' }) => {
  const icons = { create: Plus, read: Eye, update: Edit, delete: Trash2 };
  const Icon = icons[type];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
            granted ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-muted-foreground/50'
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
  
  if (count === 4) return <Badge className="bg-primary/10 text-primary border-primary/30">Full Access</Badge>;
  if (count === 0) return <Badge variant="outline" className="text-muted-foreground">No Access</Badge>;
  if (permissions.can_read && !permissions.can_create && !permissions.can_update && !permissions.can_delete) {
    return <Badge className="bg-chart-2/10 text-chart-2 border-chart-2/30">Read Only</Badge>;
  }
  return <Badge className="bg-chart-4/10 text-chart-4 border-chart-4/30">Partial ({count}/4)</Badge>;
};

export default function UserManagement() {
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
  
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [matrixUserFilter, setMatrixUserFilter] = useState('');
  const [matrixModuleFilter, setMatrixModuleFilter] = useState<string>('all');

  // Bulk actions state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [bulkRole, setBulkRole] = useState<string>('');
  const [bulkModule, setBulkModule] = useState<string>('');
  const [bulkPermission, setBulkPermission] = useState<string>('all');

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';
  const availableRoles = isSuperAdmin ? SUPER_ADMIN_ASSIGNABLE_ROLES : ADMIN_ASSIGNABLE_ROLES;
  
  // Custom roles state
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [newCustomRole, setNewCustomRole] = useState('');
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && role !== 'super_admin' && role !== 'admin') {
      navigate(getDashboardPath(role));
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user && (role === 'super_admin' || role === 'admin')) {
      fetchData();
    }
  }, [user, role]);

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchUsers(), fetchModules(), fetchCustomRoles()]);
    setIsLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get emails from auth (we'll use user IDs to show a placeholder)
      const rolesByUser: Record<string, string[]> = {};
      userRoles?.forEach(ur => {
        if (!rolesByUser[ur.user_id]) rolesByUser[ur.user_id] = [];
        rolesByUser[ur.user_id].push(ur.role);
      });

      const usersWithRoles: UserWithRoles[] = (profiles || []).map(profile => ({
        id: profile.id,
        full_name: profile.full_name || 'Unknown User',
        avatar_url: profile.avatar_url,
        roles: rolesByUser[profile.id] || [],
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      }));

      setUsers(usersWithRoles);
      await fetchPermissionMatrix(usersWithRoles);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase.from('modules').select('*').order('name');
      if (error) throw error;
      setModules(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to load modules.', variant: 'destructive' });
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
      setIsRoleDialogOpen(false);
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
        .select('user_id, module_id, can_create, can_read, can_update, can_delete');

      if (error) throw error;

      const matrix: PermissionMatrix[] = usersList.map(u => {
        const userPerms = (allPermissions || []).filter(p => p.user_id === u.id);
        const permsByModule: Record<string, any> = {};
        let permCount = 0;
        userPerms.forEach(p => {
          permsByModule[p.module_id] = {
            can_create: p.can_create,
            can_read: p.can_read,
            can_update: p.can_update,
            can_delete: p.can_delete,
          };
          if (p.can_create) permCount++;
          if (p.can_read) permCount++;
          if (p.can_update) permCount++;
          if (p.can_delete) permCount++;
        });
        return { 
          user_id: u.id, 
          user_name: u.full_name, 
          avatar_url: u.avatar_url,
          roles: u.roles, 
          created_at: u.created_at,
          permissions: permsByModule,
          permission_count: permCount,
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
        .select('module_id, can_create, can_read, can_update, can_delete, modules!inner(name)')
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
          perms.push({ module_id: m.id, module_name: m.name, can_create: false, can_read: false, can_update: false, can_delete: false });
        }
      });

      setUserPermissions(perms.sort((a, b) => a.module_name.localeCompare(b.module_name)));
    } catch (error) {
      setUserPermissions([]);
    }
  };

  const toggleRole = async (userId: string, toggledRole: string, hasRole: boolean) => {
    // Prevent non-super_admin from modifying admin roles
    if (!isSuperAdmin && (toggledRole === 'super_admin' || toggledRole === 'admin')) {
      toast({ title: 'Permission denied', variant: 'destructive' });
      return;
    }

    try {
      if (hasRole) {
        const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', toggledRole as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: toggledRole as any });
        if (error) throw error;
      }
      toast({ title: 'Role Updated', description: hasRole ? `Removed ${toggledRole.replace('_', ' ')} role` : `Added ${toggledRole.replace('_', ' ')} role` });
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const updatePermission = async (moduleId: string, field: 'can_create' | 'can_read' | 'can_update' | 'can_delete', value: boolean) => {
    if (!selectedUser) return;

    try {
      const { data: existing } = await supabase
        .from('user_module_permissions')
        .select('id')
        .eq('user_id', selectedUser.id)
        .eq('module_id', moduleId)
        .single();

      if (existing) {
        const { error } = await supabase.from('user_module_permissions').update({ [field]: value }).eq('user_id', selectedUser.id).eq('module_id', moduleId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_module_permissions').insert({ user_id: selectedUser.id, module_id: moduleId, [field]: value });
        if (error) throw error;
      }

      setUserPermissions(prev => prev.map(p => p.module_id === moduleId ? { ...p, [field]: value } : p));
      toast({ title: 'Permission Updated' });
      fetchPermissionMatrix(users);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const setAllPermissions = async (moduleId: string, grant: boolean) => {
    if (!selectedUser) return;

    try {
      const permData = { can_create: grant, can_read: grant, can_update: grant, can_delete: grant };
      const { data: existing } = await supabase.from('user_module_permissions').select('id').eq('user_id', selectedUser.id).eq('module_id', moduleId).single();

      if (existing) {
        const { error } = await supabase.from('user_module_permissions').update(permData).eq('user_id', selectedUser.id).eq('module_id', moduleId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_module_permissions').insert({ user_id: selectedUser.id, module_id: moduleId, ...permData });
        if (error) throw error;
      }

      setUserPermissions(prev => prev.map(p => p.module_id === moduleId ? { ...p, ...permData } : p));
      toast({ title: 'Permissions Updated', description: grant ? 'Granted full access' : 'Revoked all access' });
      fetchPermissionMatrix(users);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openPermissionsDialog = async (userItem: UserWithRoles) => {
    setSelectedUser(userItem);
    await fetchUserPermissions(userItem.id);
    setIsPermissionsDialogOpen(true);
  };

  // Bulk actions
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const executeBulkAction = async () => {
    if (!bulkAction || selectedUsers.size === 0) return;

    try {
      const userIds = Array.from(selectedUsers);

      if (bulkAction === 'add_role' && bulkRole) {
        for (const userId of userIds) {
          const user = users.find(u => u.id === userId);
          if (user && !user.roles.includes(bulkRole)) {
            await supabase.from('user_roles').insert({ user_id: userId, role: bulkRole as any });
          }
        }
        toast({ title: 'Bulk Action Complete', description: `Added ${bulkRole} role to ${userIds.length} users` });
      } else if (bulkAction === 'remove_role' && bulkRole) {
        for (const userId of userIds) {
          await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', bulkRole as any);
        }
        toast({ title: 'Bulk Action Complete', description: `Removed ${bulkRole} role from ${userIds.length} users` });
      } else if (bulkAction === 'grant_permission' && bulkModule) {
        const permData = bulkPermission === 'all' 
          ? { can_create: true, can_read: true, can_update: true, can_delete: true }
          : { [`can_${bulkPermission}`]: true };

        for (const userId of userIds) {
          const { data: existing } = await supabase.from('user_module_permissions')
            .select('id').eq('user_id', userId).eq('module_id', bulkModule).single();
          
          if (existing) {
            await supabase.from('user_module_permissions').update(permData).eq('user_id', userId).eq('module_id', bulkModule);
          } else {
            await supabase.from('user_module_permissions').insert({ user_id: userId, module_id: bulkModule, ...permData });
          }
        }
        toast({ title: 'Bulk Action Complete', description: `Granted permissions to ${userIds.length} users` });
      } else if (bulkAction === 'revoke_permission' && bulkModule) {
        const permData = bulkPermission === 'all'
          ? { can_create: false, can_read: false, can_update: false, can_delete: false }
          : { [`can_${bulkPermission}`]: false };

        for (const userId of userIds) {
          await supabase.from('user_module_permissions').update(permData).eq('user_id', userId).eq('module_id', bulkModule);
        }
        toast({ title: 'Bulk Action Complete', description: `Revoked permissions from ${userIds.length} users` });
      }

      setIsBulkDialogOpen(false);
      setSelectedUsers(new Set());
      setBulkAction(null);
      setBulkRole('');
      setBulkModule('');
      setBulkPermission('all');
      fetchUsers();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.full_name.toLowerCase().includes(userSearch.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.roles.includes(roleFilter) || (roleFilter === 'none' && u.roles.length === 0);
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, roleFilter]);

  const filteredMatrix = useMemo(() => {
    return permissionMatrix.filter(u => u.user_name.toLowerCase().includes(matrixUserFilter.toLowerCase()));
  }, [permissionMatrix, matrixUserFilter]);

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

  const isMobile = useIsMobile();
  const [matrixViewMode, setMatrixViewMode] = useState<'table' | 'cards'>('table');

  // Auto-switch to cards on mobile
  useEffect(() => {
    if (isMobile) {
      setMatrixViewMode('cards');
    }
  }, [isMobile]);

  // Handle inline permission toggle for mobile cards
  const handleInlinePermissionToggle = async (userId: string, moduleId: string, field: keyof UserModulePermission, value: boolean) => {
    try {
      const { data: existing } = await supabase
        .from('user_module_permissions')
        .select('id')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('user_module_permissions')
          .update({ [field]: value })
          .eq('user_id', userId)
          .eq('module_id', moduleId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_module_permissions')
          .insert({ user_id: userId, module_id: moduleId, [field]: value });
        if (error) throw error;
      }

      // Update local state
      setPermissionMatrix(prev => prev.map(u => {
        if (u.user_id !== userId) return u;
        const newPermissions = { ...u.permissions };
        if (!newPermissions[moduleId]) {
          newPermissions[moduleId] = { can_create: false, can_read: false, can_update: false, can_delete: false };
        }
        newPermissions[moduleId] = { ...newPermissions[moduleId], [field]: value };
        
        // Recalculate permission count
        let permCount = 0;
        Object.values(newPermissions).forEach(p => {
          if (p.can_create) permCount++;
          if (p.can_read) permCount++;
          if (p.can_update) permCount++;
          if (p.can_delete) permCount++;
        });
        
        return { ...u, permissions: newPermissions, permission_count: permCount };
      }));

      toast({ title: 'Permission updated' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <BackButton 
                fallbackPath="/dashboard/admin"
                fallbackLabel="Back to Admin Dashboard"
                size="icon"
              />
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3 text-foreground">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  User Management
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage user roles and module-level permissions
                </p>
              </div>
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

        {/* Main Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Users className="h-4 w-4" />
              Users & Roles
            </TabsTrigger>
            {/* Permissions Matrix - Super Admin Only */}
            {isSuperAdmin && (
              <TabsTrigger value="matrix" className="flex items-center gap-2 data-[state=active]:bg-background">
                <Settings className="h-4 w-4" />
                Permissions Matrix
              </TabsTrigger>
            )}
          </TabsList>

          {/* Users & Roles Tab */}
          <TabsContent value="users">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>User Role Management</CardTitle>
                    <CardDescription>
                      {isSuperAdmin ? 'You have full access to manage all roles.' : 'You can only edit non-admin roles.'}
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
                          <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>
                        ))}
                        {customRoles.map(r => (
                          <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>
                        ))}
                        <SelectItem value="none">No Role</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {/* Create Role Button */}
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => setIsRoleDialogOpen(true)}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Role
                    </Button>
                  </div>
                </div>
                {/* Bulk Actions Bar */}
                {selectedUsers.size > 0 && (
                  <div className="flex items-center gap-3 mt-4 p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">{selectedUsers.size} user(s) selected</span>
                    <Button size="sm" variant="outline" onClick={() => { setBulkAction('add_role'); setIsBulkDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> Add Role
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setBulkAction('remove_role'); setIsBulkDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4 mr-1" /> Remove Role
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setBulkAction('grant_permission'); setIsBulkDialogOpen(true); }}>
                      <Eye className="h-4 w-4 mr-1" /> Grant Permission
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setBulkAction('revoke_permission'); setIsBulkDialogOpen(true); }}>
                      <X className="h-4 w-4 mr-1" /> Revoke Permission
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedUsers(new Set())}>
                      Clear Selection
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[50px]">
                          <Checkbox 
                            checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                            onCheckedChange={selectAllUsers}
                          />
                        </TableHead>
                        <TableHead className="w-[200px]">User</TableHead>
                        <TableHead>Current Roles</TableHead>
                        <TableHead>Assign Roles</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUsers.map(userItem => (
                          <TableRow key={userItem.id} className="group">
                            <TableCell>
                              <Checkbox 
                                checked={selectedUsers.has(userItem.id)}
                                onCheckedChange={() => toggleUserSelection(userItem.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">
                                    {userItem.full_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium">{userItem.full_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {new Date(userItem.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1.5">
                                {userItem.roles.length > 0 ? (
                                  userItem.roles.map(r => (
                                    <Badge key={r} className={`${ROLE_COLORS[r]?.bg} ${ROLE_COLORS[r]?.text} border ${ROLE_COLORS[r]?.border} font-medium`}>
                                      {r.replace('_', ' ')}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge variant="outline" className="text-destructive border-destructive/30">No Role</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-3">
                                {/* Built-in roles */}
                                {availableRoles.map(r => {
                                  const hasThisRole = userItem.roles.includes(r);
                                  const isCurrentUser = userItem.id === user?.id;
                                  const isProtectedRole = (r === 'super_admin') && isCurrentUser;
                                  
                                  return (
                                    <label key={r} className={`flex items-center gap-1.5 text-xs cursor-pointer select-none ${
                                      isProtectedRole ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}>
                                      <Checkbox
                                        checked={hasThisRole}
                                        disabled={isProtectedRole}
                                        onCheckedChange={() => toggleRole(userItem.id, r, hasThisRole)}
                                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                      />
                                      <span className="capitalize whitespace-nowrap">{r.replace('_', ' ')}</span>
                                    </label>
                                  );
                                })}
                                
                                {/* Custom roles - only for Admin */}
                                {isAdmin && customRoles.map(r => {
                                  const hasThisRole = userItem.roles.includes(r);
                                  
                                  return (
                                    <label key={r} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                      <Checkbox
                                        checked={hasThisRole}
                                        onCheckedChange={() => toggleRole(userItem.id, r, hasThisRole)}
                                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                      />
                                      <span className="capitalize whitespace-nowrap">{r.replace('_', ' ')}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {/* Permissions Button - Super Admin Only */}
                              {isSuperAdmin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openPermissionsDialog(userItem)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Settings className="h-4 w-4 mr-1" />
                                  Permissions
                                </Button>
                              )}
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

          {/* Permissions Matrix Tab - Super Admin Only */}
          {isSuperAdmin && (
          <TabsContent value="matrix">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Permissions Matrix
                      </CardTitle>
                      <CardDescription>Overview of all user permissions across {modules.length} modules</CardDescription>
                    </div>
                    
                    {/* View Toggle */}
                    <div className="flex items-center gap-2 border rounded-lg p-1 bg-muted/30">
                      <Button
                        variant={matrixViewMode === 'table' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setMatrixViewMode('table')}
                        className="h-8"
                      >
                        <LayoutList className="h-4 w-4 mr-1" />
                        Table
                      </Button>
                      <Button
                        variant={matrixViewMode === 'cards' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setMatrixViewMode('cards')}
                        className="h-8"
                      >
                        <LayoutGrid className="h-4 w-4 mr-1" />
                        Cards
                      </Button>
                    </div>
                  </div>
                  
                  {/* Filters */}
                  <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={matrixUserFilter}
                        onChange={(e) => setMatrixUserFilter(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={matrixModuleFilter} onValueChange={setMatrixModuleFilter}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Modules</SelectItem>
                        {modules.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {matrixViewMode === 'table' ? (
                  /* Table View */
                  <ScrollArea className="h-[550px]">
                    <div className="min-w-max">
                      <Table>
                        <TableHeader className="sticky top-0 z-20">
                          <TableRow className="hover:bg-transparent bg-muted/80 backdrop-blur-sm">
                            <TableHead className="sticky left-0 z-30 min-w-[300px] border-r bg-muted/80 backdrop-blur-sm">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                User Information
                              </div>
                            </TableHead>
                            {(matrixModuleFilter === 'all' ? modules : modules.filter(m => m.id === matrixModuleFilter)).map(m => (
                              <TableHead key={m.id} className="text-center min-w-[160px] px-3 bg-muted/80 backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-1.5">
                                  <Badge variant="outline" className="font-medium">
                                    {m.name}
                                  </Badge>
                                  <div className="flex gap-1 text-[10px] font-medium text-muted-foreground">
                                    <span className="w-6 text-center bg-muted rounded px-1">C</span>
                                    <span className="w-6 text-center bg-muted rounded px-1">R</span>
                                    <span className="w-6 text-center bg-muted rounded px-1">U</span>
                                    <span className="w-6 text-center bg-muted rounded px-1">D</span>
                                  </div>
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredMatrix.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={modules.length + 1} className="text-center py-12">
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                  <Users className="h-8 w-8" />
                                  <p>No users found</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredMatrix.map(userRow => (
                              <TableRow key={userRow.user_id} className="group hover:bg-muted/30 transition-colors">
                                <TableCell className="sticky left-0 z-10 border-r min-w-[300px] bg-background group-hover:bg-muted/30 transition-colors">
                                  <div className="flex items-center gap-3">
                                    {userRow.avatar_url ? (
                                      <img 
                                        src={userRow.avatar_url} 
                                        alt={userRow.user_name}
                                        className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-border"
                                      />
                                    ) : (
                                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-2 ring-border">
                                        <span className="text-base font-semibold text-primary">
                                          {userRow.user_name.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-sm truncate">{userRow.user_name}</p>
                                      
                                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                                        {userRow.roles.length > 0 ? (
                                          userRow.roles.slice(0, 3).map(r => (
                                            <Badge 
                                              key={r} 
                                              className={`${ROLE_COLORS[r]?.bg} ${ROLE_COLORS[r]?.text} border ${ROLE_COLORS[r]?.border} text-[10px] py-0 px-1.5 h-5`}
                                            >
                                              {r.replace('_', ' ')}
                                            </Badge>
                                          ))
                                        ) : (
                                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 text-muted-foreground">
                                            No Role
                                          </Badge>
                                        )}
                                        {userRow.roles.length > 3 && (
                                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5">
                                            +{userRow.roles.length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-2 mt-1.5">
                                        <Badge variant={userRow.permission_count > 0 ? 'default' : 'outline'} className="text-[10px] py-0 h-5">
                                          <Shield className="h-3 w-3 mr-1" />
                                          {userRow.permission_count} perms
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                                {(matrixModuleFilter === 'all' ? modules : modules.filter(m => m.id === matrixModuleFilter)).map(m => {
                                  const perms = userRow.permissions[m.id] || { can_create: false, can_read: false, can_update: false, can_delete: false };
                                  const permCount = [perms.can_create, perms.can_read, perms.can_update, perms.can_delete].filter(Boolean).length;
                                  return (
                                    <TableCell key={m.id} className="text-center px-3">
                                      <div className="flex flex-col items-center gap-1">
                                        <div className="flex justify-center gap-1">
                                          <PermissionIcon granted={perms.can_create} type="create" />
                                          <PermissionIcon granted={perms.can_read} type="read" />
                                          <PermissionIcon granted={perms.can_update} type="update" />
                                          <PermissionIcon granted={perms.can_delete} type="delete" />
                                        </div>
                                        <span className={`text-[10px] ${permCount === 4 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                                          {permCount}/4
                                        </span>
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
                ) : (
                  /* Card View (Mobile-Friendly) */
                  <ScrollArea className="h-[550px] p-4">
                    <div className="space-y-3">
                      {filteredMatrix.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <Users className="h-12 w-12 mb-2" />
                          <p>No users found</p>
                        </div>
                      ) : (
                        filteredMatrix.map(userRow => (
                          <PermissionMatrixCard
                            key={userRow.user_id}
                            userRow={userRow}
                            modules={modules}
                            matrixModuleFilter={matrixModuleFilter}
                            onPermissionToggle={handleInlinePermissionToggle}
                          />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}
        </Tabs>

        {/* Permissions Dialog */}
        <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Module Permissions for {selectedUser?.full_name}
              </DialogTitle>
              <DialogDescription>
                Configure what this user can do in each module ({userPermissions.length} modules)
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-[calc(85vh-150px)] pr-4">
                <div className="space-y-3 pb-4">
                  {userPermissions.map(perm => (
                    <Card key={perm.module_id} className="border">
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <Boxes className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{perm.module_name}</span>
                            <PermissionLevel permissions={perm} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setAllPermissions(perm.module_id, true)}>
                              Grant All
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setAllPermissions(perm.module_id, false)}>
                              Revoke All
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="py-3 px-4 border-t">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {(['can_create', 'can_read', 'can_update', 'can_delete'] as const).map(field => (
                            <label key={field} className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={perm[field]}
                                onCheckedChange={(checked) => updatePermission(perm.module_id, field, !!checked)}
                              />
                              <span className="text-sm capitalize">{field.replace('can_', '')}</span>
                            </label>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Actions Dialog */}
        <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {bulkAction === 'add_role' && 'Add Role to Selected Users'}
                {bulkAction === 'remove_role' && 'Remove Role from Selected Users'}
                {bulkAction === 'grant_permission' && 'Grant Permission to Selected Users'}
                {bulkAction === 'revoke_permission' && 'Revoke Permission from Selected Users'}
              </DialogTitle>
              <DialogDescription>
                This action will affect {selectedUsers.size} user(s)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {(bulkAction === 'add_role' || bulkAction === 'remove_role') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Role</label>
                  <Select value={bulkRole} onValueChange={setBulkRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map(r => (
                        <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>
                      ))}
                      {isAdmin && customRoles.map(r => (
                        <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {(bulkAction === 'grant_permission' || bulkAction === 'revoke_permission') && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Module</label>
                    <Select value={bulkModule} onValueChange={setBulkModule}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a module" />
                      </SelectTrigger>
                      <SelectContent>
                        {modules.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Permission Type</label>
                    <Select value={bulkPermission} onValueChange={setBulkPermission}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Permissions</SelectItem>
                        <SelectItem value="create">Create Only</SelectItem>
                        <SelectItem value="read">Read Only</SelectItem>
                        <SelectItem value="update">Update Only</SelectItem>
                        <SelectItem value="delete">Delete Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={executeBulkAction}
                disabled={
                  ((bulkAction === 'add_role' || bulkAction === 'remove_role') && !bulkRole) ||
                  ((bulkAction === 'grant_permission' || bulkAction === 'revoke_permission') && !bulkModule)
                }
              >
                Apply to {selectedUsers.size} Users
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Custom Role Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Create Custom Role
              </DialogTitle>
              <DialogDescription>
                Create a new custom role that can be assigned to users by admins.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role Name</label>
                <Input
                  placeholder="Enter role name (e.g., Moderator)"
                  value={newCustomRole}
                  onChange={(e) => setNewCustomRole(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createCustomRole()}
                  disabled={isCreatingRole}
                />
                <p className="text-xs text-muted-foreground">
                  This role will be available for admins to assign to users.
                </p>
              </div>

              {customRoles.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Existing Custom Roles ({customRoles.length})</label>
                  <ScrollArea className="h-24 rounded-md border p-2">
                    <div className="flex flex-wrap gap-2">
                      {customRoles.map((roleName) => (
                        <Badge 
                          key={roleName}
                          variant="secondary"
                          className="capitalize"
                        >
                          {roleName.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setIsRoleDialogOpen(false);
                setNewCustomRole('');
              }}>
                Cancel
              </Button>
              <Button 
                onClick={createCustomRole} 
                disabled={!newCustomRole.trim() || isCreatingRole}
              >
                {isCreatingRole ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Role
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}