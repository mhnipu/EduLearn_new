import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ParentTable } from '@/components/ui/parent-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TableEmptyState } from '@/components/ui/table-empty';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { TableActions } from '@/components/ui/table-actions';
import { StatusBadge } from '@/components/ui/badge';
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
  User,
  AlertCircle,
  CheckCircle2,
  Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

type RoleModulePermission = {
  module_id: string;
  module_name: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_assign: boolean;
  can_approve: boolean;
};

type RolePermissions = {
  [moduleId: string]: RoleModulePermission;
};

type RoleData = {
  role: string;
  permissions: RolePermissions;
  userCount: number;
};

// DEPRECATED: grant_permission and revoke_permission removed - permissions are now managed at role level
type BulkAction = 'add_role' | 'remove_role';

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

const PermissionIcon = ({ granted, type }: { granted: boolean; type: 'create' | 'read' | 'update' | 'delete' | 'assign' | 'approve' }) => {
  const icons = { 
    create: Plus, 
    read: Eye, 
    update: Edit, 
    delete: Trash2,
    assign: Users,
    approve: CheckCircle2
  };
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

  // Role Permission Management state
  const [rolesData, setRolesData] = useState<Record<string, RoleData>>({});
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<string>('super_admin');
  const [hasPermissionChanges, setHasPermissionChanges] = useState(false);
  const [rolePermissionModuleSearch, setRolePermissionModuleSearch] = useState('');
  const [rolePermissionModuleFilter, setRolePermissionModuleFilter] = useState<string>('all');

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

  // #region agent log
  useEffect(() => {
    const handleScroll = () => {
      const tabsList = document.querySelector('[data-tabs-list]') as HTMLElement;
      if (tabsList) {
        const rect = tabsList.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
        fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'UserManagement.tsx:207',message:'Scroll event - tabs visibility',data:{scrollY:window.scrollY,tabsTop:rect.top,tabsBottom:rect.bottom,isVisible,windowHeight:window.innerHeight},timestamp:Date.now(),sessionId:'debug-session',runId:'tab-visibility',hypothesisId:'A'})}).catch(()=>{});
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  // #endregion

  const fetchData = async () => {
    setIsLoading(true);
    await Promise.all([fetchUsers(), fetchModules(), fetchCustomRoles()]);
    if (isSuperAdmin) {
      await fetchRolePermissions();
    }
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
      // Fetch effective permissions from roles for each user using the new database function
      const matrix: PermissionMatrix[] = await Promise.all(
        usersList.map(async (u) => {
          const { data: effectivePerms, error } = await supabase
            .rpc('get_user_effective_permissions', { _user_id: u.id });

          if (error) {
            console.error(`Error fetching permissions for user ${u.id}:`, error);
            return {
              user_id: u.id,
              user_name: u.full_name,
              avatar_url: u.avatar_url,
              roles: u.roles,
              created_at: u.created_at,
              permissions: {},
              permission_count: 0,
            };
          }

          const permsByModule: Record<string, any> = {};
          let permCount = 0;

          // Map permissions by module_id (need to get module_id from module_name)
          const moduleIdMap: Record<string, string> = {};
          modules.forEach(m => {
            moduleIdMap[m.name] = m.id;
          });

          (effectivePerms || []).forEach((p: any) => {
            const moduleId = moduleIdMap[p.module_name];
            if (moduleId) {
              permsByModule[moduleId] = {
                can_create: p.can_create || false,
                can_read: p.can_read || false,
                can_update: p.can_update || false,
                can_delete: p.can_delete || false,
              };
              if (p.can_create) permCount++;
              if (p.can_read) permCount++;
              if (p.can_update) permCount++;
              if (p.can_delete) permCount++;
            }
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
        })
      );

      setPermissionMatrix(matrix);
    } catch (error) {
      console.error('Error fetching permission matrix:', error);
    }
  };

  // DEPRECATED: User-level permissions are no longer used in pure RBAC system
  // Permissions are now assigned to roles, and users inherit from their roles
  // Keeping function signature for backward compatibility but it now fetches effective permissions from roles
  const fetchUserPermissions = async (userId: string) => {
    try {
      // Use the new database function to get effective permissions from roles
      const { data: effectivePerms, error } = await supabase
        .rpc('get_user_effective_permissions', { _user_id: userId });

      if (error) throw error;

      const moduleIdMap: Record<string, string> = {};
      modules.forEach(m => {
        moduleIdMap[m.name] = m.id;
      });

      const perms: UserModulePermission[] = (effectivePerms || []).map((p: any) => ({
        module_id: moduleIdMap[p.module_name] || '',
        module_name: p.module_name,
        can_create: p.can_create || false,
        can_read: p.can_read || false,
        can_update: p.can_update || false,
        can_delete: p.can_delete || false,
      }));

      // Add modules that user has no permissions for (for display completeness)
      const existingModuleNames = new Set(perms.map(p => p.module_name));
      modules.forEach(m => {
        if (!existingModuleNames.has(m.name)) {
          perms.push({ 
            module_id: m.id, 
            module_name: m.name, 
            can_create: false, 
            can_read: false, 
            can_update: false, 
            can_delete: false 
          });
        }
      });

      setUserPermissions(perms.sort((a, b) => a.module_name.localeCompare(b.module_name)));
    } catch (error) {
      console.error('Error fetching user effective permissions:', error);
      setUserPermissions([]);
    }
  };

  // Role Permission Management functions
  const fetchRolePermissions = async () => {
    const rolesToFetch = [...ALL_ROLES, ...customRoles];
    const rolesPermissions: Record<string, RoleData> = {};

    // Initialize all roles
    for (const roleName of rolesToFetch) {
      rolesPermissions[roleName] = {
        role: roleName,
        permissions: {},
        userCount: 0,
      };
    }

    // Fetch role permissions
    const { data: rolePerms, error: permsError } = await supabase
      .from('role_module_permissions')
      .select(`
        role,
        module_id,
        can_create,
        can_read,
        can_update,
        can_delete,
        can_assign,
        can_approve,
        modules!inner(name)
      `);

    if (permsError) {
      console.error('Error fetching role permissions:', permsError);
      return;
    }

    // Process role permissions
    (rolePerms || []).forEach((rp: any) => {
      if (!rolesPermissions[rp.role]) {
        rolesPermissions[rp.role] = {
          role: rp.role,
          permissions: {},
          userCount: 0,
        };
      }
      rolesPermissions[rp.role].permissions[rp.module_id] = {
        module_id: rp.module_id,
        module_name: rp.modules.name,
        can_create: rp.can_create || false,
        can_read: rp.can_read || false,
        can_update: rp.can_update || false,
        can_delete: rp.can_delete || false,
        can_assign: rp.can_assign || false,
        can_approve: rp.can_approve || false,
      };
    });

    // Fetch user counts for each role
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('role');

    if (!userRolesError && userRoles) {
      const roleCounts: Record<string, number> = {};
      userRoles.forEach(ur => {
        roleCounts[ur.role] = (roleCounts[ur.role] || 0) + 1;
      });
      Object.keys(rolesPermissions).forEach(roleName => {
        rolesPermissions[roleName].userCount = roleCounts[roleName] || 0;
      });
    }

    setRolesData(rolesPermissions);
  };

  const togglePermission = (
    roleName: string,
    moduleId: string,
    permission: 'can_create' | 'can_read' | 'can_update' | 'can_delete' | 'can_assign' | 'can_approve'
  ) => {
    setRolesData(prev => {
      const updated = { ...prev };
      if (!updated[roleName]) {
        updated[roleName] = {
          role: roleName,
          permissions: {},
          userCount: 0,
        };
      }
      if (!updated[roleName].permissions[moduleId]) {
        const module = modules.find(m => m.id === moduleId);
        updated[roleName].permissions[moduleId] = {
          module_id: moduleId,
          module_name: module?.name || '',
          can_create: false,
          can_read: false,
          can_update: false,
          can_delete: false,
          can_assign: false,
          can_approve: false,
        };
      }
      updated[roleName].permissions[moduleId][permission] = 
        !updated[roleName].permissions[moduleId][permission];
      setHasPermissionChanges(true);
      return updated;
    });
  };

  const saveRolePermissions = async (roleName: string) => {
    try {
      const roleData = rolesData[roleName];
      if (!roleData) return;

      // Save or update each module permission
      for (const [moduleId, perm] of Object.entries(roleData.permissions)) {
        const { error } = await supabase
          .from('role_module_permissions')
          .upsert({
            role: roleName,
            module_id: moduleId,
            can_create: perm.can_create,
            can_read: perm.can_read,
            can_update: perm.can_update,
            can_delete: perm.can_delete,
            can_assign: perm.can_assign || false,
            can_approve: perm.can_approve || false,
          }, {
            onConflict: 'role,module_id'
          });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: `Permissions for ${roleName.replace('_', ' ')} role saved successfully`,
      });

      setHasPermissionChanges(false);
      await fetchRolePermissions();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save permissions',
        variant: 'destructive',
      });
    }
  };

  const setAllPermissions = (roleName: string, moduleId: string, grant: boolean) => {
    setRolesData(prev => {
      const updated = { ...prev };
      if (!updated[roleName]) {
        updated[roleName] = {
          role: roleName,
          permissions: {},
          userCount: 0,
        };
      }
      if (!updated[roleName].permissions[moduleId]) {
        const module = modules.find(m => m.id === moduleId);
        updated[roleName].permissions[moduleId] = {
          module_id: moduleId,
          module_name: module?.name || '',
          can_create: false,
          can_read: false,
          can_update: false,
          can_delete: false,
          can_assign: false,
          can_approve: false,
        };
      }
      updated[roleName].permissions[moduleId] = {
        ...updated[roleName].permissions[moduleId],
        can_create: grant,
        can_read: grant,
        can_update: grant,
        can_delete: grant,
        can_assign: grant,
        can_approve: grant,
      };
      setHasPermissionChanges(true);
      return updated;
    });
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

  // DEPRECATED: User-level permission editing is removed in pure RBAC system
  // Permissions are now managed at the role level via Role Permission Management tab
  // This function is kept for backward compatibility but shows a message directing to role management
  const updatePermission = async (moduleId: string, field: 'can_create' | 'can_read' | 'can_update' | 'can_delete', value: boolean) => {
    toast({ 
      title: 'Permission Management Changed', 
      description: 'Permissions are now managed at the role level. Please use Role Permission Management tab to update role permissions.',
      variant: 'default'
    });
  };

  // DEPRECATED: User-level permission editing removed - redirect to role permission management
  const openPermissionsDialog = async (userItem: UserWithRoles) => {
    setSelectedUser(userItem);
    await fetchUserPermissions(userItem.id); // Fetch to show effective permissions (read-only)
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
      } else if (bulkAction === 'grant_permission' || bulkAction === 'revoke_permission') {
        // DEPRECATED: User-level permission editing removed in pure RBAC system
        toast({ 
          title: 'Permission Management Changed', 
          description: 'Permissions are now managed at the role level. Please use Role Permission Management to update role permissions.',
          variant: 'default'
        });
        navigate('/admin/role-permissions');
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

  // DEPRECATED: Inline permission toggle removed - permissions are now managed at role level
  const handleInlinePermissionToggle = async (userId: string, moduleId: string, field: keyof UserModulePermission, value: boolean) => {
    toast({ 
      title: 'Permission Management Changed', 
      description: 'Permissions are now managed at the role level. Please use Role Permission Management to update role permissions.',
      variant: 'default'
    });
    navigate('/admin/role-permissions');
    // No state update needed - permissions are read-only
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
          <TabsList className="bg-muted/50 p-1 sticky top-0 z-50 mb-6" data-tabs-list>
            <TabsTrigger value="users" className="flex items-center gap-2 data-[state=active]:bg-background">
              <Users className="h-4 w-4" />
              Users & Roles
            </TabsTrigger>
            {/* Permissions Matrix - Super Admin Only */}
            {isSuperAdmin && (
              <>
                <TabsTrigger value="matrix" className="flex items-center gap-2 data-[state=active]:bg-background">
                  <Settings className="h-4 w-4" />
                  Permissions Matrix
                </TabsTrigger>
                <TabsTrigger 
                  value="role-permissions" 
                  className="flex items-center gap-2 data-[state=active]:bg-background"
                >
                  <Shield className="h-4 w-4" />
                  Role Permissions
                </TabsTrigger>
              </>
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
                      Assign roles to users. Permissions are managed at the role level via Role Permission Management.
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
                    <Button size="sm" variant="outline" onClick={() => navigate('/admin/role-permissions')}>
                      <Shield className="h-4 w-4 mr-1" /> Manage Role Permissions
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedUsers(new Set())}>
                      Clear Selection
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <ParentTable
                  columns={[
                    {
                      id: 'select',
                      header: (
                        <Checkbox 
                          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                          onCheckedChange={selectAllUsers}
                        />
                      ),
                      width: 50,
                      cell: (row) => (
                        <Checkbox 
                          checked={selectedUsers.has(row.userItem.id)}
                          onCheckedChange={() => toggleUserSelection(row.userItem.id)}
                        />
                      ),
                    },
                    {
                      id: 'user',
                      header: (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          User Information
                        </div>
                      ),
                      sticky: 'left',
                      minWidth: 300,
                      cell: (row) => (
                        <div className="flex items-center gap-3">
                          {row.userItem.avatar_url ? (
                            <img 
                              src={row.userItem.avatar_url} 
                              alt={row.userItem.full_name}
                              className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-border"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-2 ring-border">
                              <span className="text-base font-semibold text-primary">
                                {row.userItem.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{row.userItem.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(row.userItem.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ),
                    },
                    {
                      id: 'currentRoles',
                      header: 'Current Roles',
                      cell: (row) => (
                        <div className="flex flex-wrap gap-1.5">
                          {row.userItem.roles.length > 0 ? (
                            row.userItem.roles.map(r => (
                              <Badge key={r} className={`${ROLE_COLORS[r]?.bg} ${ROLE_COLORS[r]?.text} border ${ROLE_COLORS[r]?.border} font-medium`}>
                                {r.replace('_', ' ')}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="outline" className="text-destructive border-destructive/30">No Role</Badge>
                          )}
                        </div>
                      ),
                    },
                    {
                      id: 'assignRoles',
                      header: 'Assign Roles',
                      cell: (row) => (
                        <div className="flex flex-wrap gap-3">
                          {/* Built-in roles */}
                          {availableRoles.map(r => {
                            const hasThisRole = row.userItem.roles.includes(r);
                            const isCurrentUser = row.userItem.id === user?.id;
                            const isProtectedRole = (r === 'super_admin') && isCurrentUser;
                            
                            return (
                              <label key={r} className={`flex items-center gap-1.5 text-xs cursor-pointer select-none ${
                                isProtectedRole ? 'opacity-50 cursor-not-allowed' : ''
                              }`}>
                                <Checkbox
                                  checked={hasThisRole}
                                  disabled={isProtectedRole}
                                  onCheckedChange={() => toggleRole(row.userItem.id, r, hasThisRole)}
                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <span className="capitalize whitespace-nowrap">{r.replace('_', ' ')}</span>
                              </label>
                            );
                          })}
                          
                          {/* Custom roles - only for Admin */}
                          {isAdmin && customRoles.map(r => {
                            const hasThisRole = row.userItem.roles.includes(r);
                            
                            return (
                              <label key={r} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                <Checkbox
                                  checked={hasThisRole}
                                  onCheckedChange={() => toggleRole(row.userItem.id, r, hasThisRole)}
                                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                />
                                <span className="capitalize whitespace-nowrap">{r.replace('_', ' ')}</span>
                              </label>
                            );
                          })}
                        </div>
                      ),
                    },
                    {
                      id: 'actions',
                      header: 'Actions',
                      align: 'right',
                      width: 120,
                      cell: (row) => (
                        <TableActions
                          actions={[
                            ...(isSuperAdmin ? [{
                              label: 'View Permissions',
                              icon: Eye,
                              onClick: () => openPermissionsDialog(row.userItem),
                            }] : []),
                          ]}
                        />
                      ),
                    },
                  ]}
                  data={filteredUsers.map(userItem => ({
                    userItem,
                  }))}
                  loading={isLoading}
                  emptyState={
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="h-8 w-8" />
                      <p>No users found</p>
                      <p className="text-xs">Try adjusting your search or filter criteria</p>
                    </div>
                  }
                  scrollHeight="h-[550px]"
                  rowClassName="group"
                  getRowKey={(row) => row.userItem.id}
                />
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
                  <ParentTable
                    columns={[
                      {
                        id: 'user',
                        header: (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            User Information
                          </div>
                        ),
                        sticky: 'left',
                        minWidth: 300,
                        cell: (row) => (
                          <div className="flex items-center gap-3">
                            {row.userRow.avatar_url ? (
                              <img 
                                src={row.userRow.avatar_url} 
                                alt={row.userRow.user_name}
                                className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-border"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 ring-2 ring-border">
                                <span className="text-base font-semibold text-primary">
                                  {row.userRow.user_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate">{row.userRow.user_name}</p>
                              
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {row.userRow.roles.length > 0 ? (
                                  row.userRow.roles.slice(0, 3).map(r => (
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
                                {row.userRow.roles.length > 3 && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5">
                                    +{row.userRow.roles.length - 3}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant={row.userRow.permission_count > 0 ? 'default' : 'outline'} className="text-[10px] py-0 h-5">
                                  <Shield className="h-3 w-3 mr-1" />
                                  {row.userRow.permission_count} perms
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ),
                      },
                      ...(matrixModuleFilter === 'all' ? modules : modules.filter(m => m.id === matrixModuleFilter)).map(m => ({
                        id: `module-${m.id}`,
                        header: (
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
                        ),
                        align: 'center' as const,
                        minWidth: 160,
                        className: 'px-3',
                        cell: (row) => {
                          const perms = row.userRow.permissions[m.id] || { can_create: false, can_read: false, can_update: false, can_delete: false };
                          const permCount = [perms.can_create, perms.can_read, perms.can_update, perms.can_delete].filter(Boolean).length;
                          return (
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
                          );
                        },
                      })),
                    ]}
                    data={filteredMatrix.map(userRow => ({
                      userRow,
                    }))}
                    emptyState={
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-8 w-8" />
                        <p>No users found</p>
                      </div>
                    }
                    scrollHeight="h-[550px]"
                  />
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

          {/* Role Permissions Tab - Super Admin Only */}
          {isSuperAdmin && (
          <TabsContent value="role-permissions">
            <Card className="border-border">
              <CardHeader className="border-b border-border">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Role Permission Management
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Manage module permissions for each role. All users with the same role will have identical permissions.
                      </CardDescription>
                    </div>
                    <Button onClick={fetchRolePermissions} variant="outline" size="sm" className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                  
                  {/* Filters */}
                  <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search modules..."
                        value={rolePermissionModuleSearch}
                        onChange={(e) => setRolePermissionModuleSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={rolePermissionModuleFilter} onValueChange={setRolePermissionModuleFilter}>
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
                <Alert className="m-6 mb-0">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> This is a pure role-based permission system. 
                    Permissions are assigned to roles, and all users with the same role inherit the same permissions. 
                    Changes to role permissions affect all users with that role immediately.
                  </AlertDescription>
                </Alert>

                <Tabs defaultValue={ALL_ROLES[0]} className="space-y-6 mt-6">
                  <TabsList className="bg-muted/50 p-1 mx-6">
                    {ALL_ROLES.map(roleName => {
                      const roleData = rolesData[roleName];
                      const userCount = roleData?.userCount || 0;
                      return (
                        <TabsTrigger 
                          key={roleName} 
                          value={roleName}
                          className="flex items-center gap-2 data-[state=active]:bg-background"
                        >
                          <span className="capitalize">{roleName.replace('_', ' ')}</span>
                          {userCount > 0 && (
                            <Badge variant="secondary" className="ml-1">
                              {userCount} {userCount === 1 ? 'user' : 'users'}
                            </Badge>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {ALL_ROLES.map(roleName => {
                    const roleData = rolesData[roleName] || {
                      role: roleName,
                      permissions: {},
                      userCount: 0,
                    };

                    const filteredModules = (rolePermissionModuleFilter === 'all' 
                      ? modules.filter(m => 
                          m.name.toLowerCase().includes(rolePermissionModuleSearch.toLowerCase()) ||
                          m.description?.toLowerCase().includes(rolePermissionModuleSearch.toLowerCase())
                        )
                      : modules.filter(m => 
                          m.id === rolePermissionModuleFilter &&
                          (m.name.toLowerCase().includes(rolePermissionModuleSearch.toLowerCase()) ||
                          m.description?.toLowerCase().includes(rolePermissionModuleSearch.toLowerCase()))
                        )
                    );

                    return (
                      <TabsContent key={roleName} value={roleName} className="px-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${ROLE_COLORS[roleName]?.bg} ${ROLE_COLORS[roleName]?.text}`}>
                                {roleName.replace('_', ' ').toUpperCase()}
                              </Badge>
                              {roleData.userCount > 0 && (
                                <span className="text-sm font-normal text-muted-foreground">
                                  ({roleData.userCount} {roleData.userCount === 1 ? 'user' : 'users'})
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Configure module permissions for the {roleName.replace('_', ' ')} role. 
                              All users with this role will have these permissions.
                            </p>
                          </div>
                          <Button 
                            onClick={() => saveRolePermissions(roleName)}
                            disabled={!hasPermissionChanges}
                            className="gap-2"
                          >
                            <Save className="h-4 w-4" />
                            Save Changes
                          </Button>
                        </div>

                        <ParentTable
                          columns={[
                            {
                              id: 'module',
                              header: (
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Module
                                </div>
                              ),
                              sticky: 'left',
                              minWidth: 300,
                              cell: (row) => (
                                <div>
                                  <div className="font-medium">{row.module.name}</div>
                                  {row.module.description && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {row.module.description}
                                    </div>
                                  )}
                                </div>
                              ),
                            },
                            {
                              id: 'create',
                              header: 'Create',
                              align: 'center',
                              minWidth: 100,
                              cellType: 'checkbox',
                              checkboxProps: (row) => ({
                                checked: row.permission.can_create,
                                onCheckedChange: () => togglePermission(roleName, row.module.id, 'can_create'),
                              }),
                            },
                            {
                              id: 'read',
                              header: 'Read',
                              align: 'center',
                              minWidth: 100,
                              cellType: 'checkbox',
                              checkboxProps: (row) => ({
                                checked: row.permission.can_read,
                                onCheckedChange: () => togglePermission(roleName, row.module.id, 'can_read'),
                              }),
                            },
                            {
                              id: 'update',
                              header: 'Update',
                              align: 'center',
                              minWidth: 100,
                              cellType: 'checkbox',
                              checkboxProps: (row) => ({
                                checked: row.permission.can_update,
                                onCheckedChange: () => togglePermission(roleName, row.module.id, 'can_update'),
                              }),
                            },
                            {
                              id: 'delete',
                              header: 'Delete',
                              align: 'center',
                              minWidth: 100,
                              cellType: 'checkbox',
                              checkboxProps: (row) => ({
                                checked: row.permission.can_delete,
                                onCheckedChange: () => togglePermission(roleName, row.module.id, 'can_delete'),
                              }),
                            },
                            {
                              id: 'assign',
                              header: 'Assign',
                              align: 'center',
                              minWidth: 100,
                              cellType: 'checkbox',
                              checkboxProps: (row) => ({
                                checked: row.permission.can_assign || false,
                                onCheckedChange: () => togglePermission(roleName, row.module.id, 'can_assign'),
                              }),
                            },
                            {
                              id: 'approve',
                              header: 'Approve',
                              align: 'center',
                              minWidth: 100,
                              cellType: 'checkbox',
                              checkboxProps: (row) => ({
                                checked: row.permission.can_approve || false,
                                onCheckedChange: () => togglePermission(roleName, row.module.id, 'can_approve'),
                              }),
                            },
                            {
                              id: 'all',
                              header: (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs text-muted-foreground cursor-help">All</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Toggle all permissions for module</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ),
                              align: 'right',
                              minWidth: 120,
                              cellType: 'button',
                              buttonProps: (row) => ({
                                onClick: () => setAllPermissions(roleName, row.module.id, !row.allGranted),
                                children: row.allGranted ? 'Clear' : 'Grant All',
                                variant: 'ghost' as const,
                                size: 'sm' as const,
                              }),
                            },
                          ]}
                          data={filteredModules.map(module => {
                            const perm = roleData.permissions[module.id] || {
                              module_id: module.id,
                              module_name: module.name,
                              can_create: false,
                              can_read: false,
                              can_update: false,
                              can_delete: false,
                              can_assign: false,
                              can_approve: false,
                            };

                            const allGranted = perm.can_create && perm.can_read && 
                                              perm.can_update && perm.can_delete && 
                                              perm.can_assign && perm.can_approve;

                            return {
                              module,
                              permission: perm,
                              allGranted,
                            };
                          })}
                          emptyState={
                            <p className="text-center">No modules found</p>
                          }
                          scrollHeight="h-[550px]"
                          getRowKey={(row) => row.module.id}
                        />
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
          )}
        </Tabs>

        {/* Permissions Dialog - Read Only (Effective Permissions from Roles) */}
        <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Effective Permissions for {selectedUser?.full_name}
              </DialogTitle>
              <DialogDescription>
                <div className="space-y-2">
                  <p>Viewing effective permissions derived from user roles ({userPermissions.length} modules)</p>
                  {selectedUser && selectedUser.roles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs font-medium">Roles:</span>
                      {selectedUser.roles.map(role => (
                        <Badge key={role} variant="secondary" className="capitalize">
                          {role.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      Permissions are managed at the role level. To change permissions, update the role permissions.
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-[calc(85vh-200px)] pr-4">
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
                        </div>
                      </CardHeader>
                      <CardContent className="py-3 px-4 border-t">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {(['can_create', 'can_read', 'can_update', 'can_delete'] as const).map(field => (
                            <div key={field} className="flex items-center gap-2">
                              <Checkbox
                                checked={perm[field]}
                                disabled
                                className="cursor-not-allowed opacity-50"
                              />
                              <span className="text-sm capitalize">{field.replace('can_', '')}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                These permissions are inherited from the user's roles
              </p>
              <Button onClick={() => {
                setIsPermissionsDialogOpen(false);
                navigate('/admin/role-permissions');
              }}>
                <Shield className="h-4 w-4 mr-2" />
                Manage Role Permissions
              </Button>
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
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={executeBulkAction}
                disabled={
                  (bulkAction === 'add_role' || bulkAction === 'remove_role') && !bulkRole
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