import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ParentTable, ColumnDef } from '@/components/ui/parent-table';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  User,
  Search,
  Eye,
  Edit,
  Plus,
  Trash2,
  RefreshCw,
  Save,
  Users,
  AlertCircle,
  CheckCircle2,
  Loader2,
  UserCheck,
  Info
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/BackButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  can_assign: boolean;
  can_approve: boolean;
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

type UserData = {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string | null;
  roles: string[];
};

const PermissionIcon = ({ granted, type, source }: { 
  granted: boolean; 
  type: 'create' | 'read' | 'update' | 'delete' | 'assign' | 'approve';
  source?: 'role' | 'user_override';
}) => {
  const icons = {
    create: Plus,
    read: Eye,
    update: Edit,
    delete: Trash2,
    assign: Users,
    approve: CheckCircle2,
  };
  const Icon = icons[type];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center justify-center w-6 h-6 rounded transition-colors relative ${
            granted 
              ? source === 'user_override' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-primary/10 text-primary' 
              : 'bg-muted/30 text-muted-foreground/50'
          }`}>
            <Icon className="h-3.5 w-3.5" />
            {source === 'user_override' && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full border border-background" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="capitalize">
            {type}: {granted ? 'Granted' : 'Denied'}
            {source === 'user_override' && ' (User Override)'}
            {source === 'role' && ' (Inherited from Role)'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default function UserPermissionManagement() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [modules, setModules] = useState<Module[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, UserModulePermission>>({});
  const [rolePermissions, setRolePermissions] = useState<Record<string, RoleModulePermission>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (!loading && role !== 'super_admin' && role !== 'admin') {
      navigate('/dashboard');
      return;
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (role === 'super_admin' || role === 'admin') {
      fetchData();
    }
  }, [role]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchModules(),
        fetchUsers(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const { data, error } = await supabase
        .from('modules')
        .select('id, name, description')
        .order('name');

      if (error) throw error;
      setModules(data || []);
    } catch (error) {
      console.error('Error fetching modules:', error);
      throw error;
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          return {
            id: profile.id,
            full_name: profile.full_name || 'Unknown',
            email: profile.email || undefined,
            avatar_url: profile.avatar_url,
            roles: (userRoles || []).map(r => r.role),
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      // Fetch user-specific permissions
      const { data: userPerms, error: userPermsError } = await supabase
        .from('user_module_permissions')
        .select(`
          module_id,
          can_create,
          can_read,
          can_update,
          can_delete,
          can_assign,
          can_approve,
          modules (id, name)
        `)
        .eq('user_id', userId);

      if (userPermsError) throw userPermsError;

      const userPermsMap: Record<string, UserModulePermission> = {};
      (userPerms || []).forEach((perm: any) => {
        userPermsMap[perm.module_id] = {
          module_id: perm.module_id,
          module_name: perm.modules?.name || '',
          can_create: perm.can_create || false,
          can_read: perm.can_read || false,
          can_update: perm.can_update || false,
          can_delete: perm.can_delete || false,
          can_assign: perm.can_assign || false,
          can_approve: perm.can_approve || false,
        };
      });

      setUserPermissions(userPermsMap);

      // Fetch role permissions for this user to show what they inherit
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (userRoles && userRoles.length > 0) {
        const roleNames = userRoles.map(r => r.role);
        const { data: rolePerms, error: rolePermsError } = await supabase
          .from('role_module_permissions')
          .select(`
            module_id,
            can_create,
            can_read,
            can_update,
            can_delete,
            can_assign,
            can_approve,
            modules (id, name)
          `)
          .in('role', roleNames);

        if (rolePermsError) throw rolePermsError;

        const rolePermsMap: Record<string, RoleModulePermission> = {};
        (rolePerms || []).forEach((perm: any) => {
          const moduleId = perm.module_id;
          // If multiple roles have permissions for same module, use OR logic (union)
          if (!rolePermsMap[moduleId]) {
            rolePermsMap[moduleId] = {
              module_id: moduleId,
              module_name: perm.modules?.name || '',
              can_create: false,
              can_read: false,
              can_update: false,
              can_delete: false,
              can_assign: false,
              can_approve: false,
            };
          }
          // Union permissions (if any role has it, user has it)
          rolePermsMap[moduleId].can_create = rolePermsMap[moduleId].can_create || perm.can_create || false;
          rolePermsMap[moduleId].can_read = rolePermsMap[moduleId].can_read || perm.can_read || false;
          rolePermsMap[moduleId].can_update = rolePermsMap[moduleId].can_update || perm.can_update || false;
          rolePermsMap[moduleId].can_delete = rolePermsMap[moduleId].can_delete || perm.can_delete || false;
          rolePermsMap[moduleId].can_assign = rolePermsMap[moduleId].can_assign || perm.can_assign || false;
          rolePermsMap[moduleId].can_approve = rolePermsMap[moduleId].can_approve || perm.can_approve || false;
        });

        setRolePermissions(rolePermsMap);
      } else {
        setRolePermissions({});
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user permissions',
        variant: 'destructive',
      });
    }
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setHasChanges(false);
    fetchUserPermissions(userId);
    setIsUserDialogOpen(false);
  };

  const togglePermission = (moduleId: string, permission: 'can_create' | 'can_read' | 'can_update' | 'can_delete' | 'can_assign' | 'can_approve') => {
    if (!selectedUserId) return;

    setHasChanges(true);
    setUserPermissions(prev => {
      // Get role permission as default if no user override exists
      const rolePerm = rolePermissions[moduleId];
      const current = prev[moduleId] || {
        module_id: moduleId,
        module_name: modules.find(m => m.id === moduleId)?.name || '',
        can_create: rolePerm?.can_create || false,
        can_read: rolePerm?.can_read || false,
        can_update: rolePerm?.can_update || false,
        can_delete: rolePerm?.can_delete || false,
        can_assign: rolePerm?.can_assign || false,
        can_approve: rolePerm?.can_approve || false,
      };

      // Toggle the permission
      const newValue = !current[permission];

      return {
        ...prev,
        [moduleId]: {
          ...current,
          [permission]: newValue,
        },
      };
    });
  };

  const saveUserPermissions = async () => {
    if (!selectedUserId) return;

    setIsSaving(true);
    try {
      // Delete all existing user permissions for this user
      await supabase
        .from('user_module_permissions')
        .delete()
        .eq('user_id', selectedUserId);

      // Insert new permissions
      const permissionsToInsert = Object.values(userPermissions)
        .filter(perm => 
          perm.can_create || 
          perm.can_read || 
          perm.can_update || 
          perm.can_delete || 
          perm.can_assign || 
          perm.can_approve
        )
        .map(perm => ({
          user_id: selectedUserId,
          module_id: perm.module_id,
          can_create: perm.can_create,
          can_read: perm.can_read,
          can_update: perm.can_update,
          can_delete: perm.can_delete,
          can_assign: perm.can_assign || false,
          can_approve: perm.can_approve || false,
        }));

      if (permissionsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('user_module_permissions')
          .insert(permissionsToInsert);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: 'User permissions saved successfully',
      });

      setHasChanges(false);
      
      // Refresh permissions to show updated state
      await fetchUserPermissions(selectedUserId);
    } catch (error) {
      console.error('Error saving user permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to save user permissions',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const clearUserOverrides = async () => {
    if (!selectedUserId) return;

    setIsSaving(true);
    try {
      await supabase
        .from('user_module_permissions')
        .delete()
        .eq('user_id', selectedUserId);

      setUserPermissions({});
      setHasChanges(false);

      toast({
        title: 'Success',
        description: 'User permission overrides cleared. User will now use role permissions only.',
      });

      await fetchUserPermissions(selectedUserId);
    } catch (error) {
      console.error('Error clearing user overrides:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear user overrides',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredModules = modules.filter(m =>
    m.name.toLowerCase().includes(moduleSearch.toLowerCase()) ||
    (m.description || '').toLowerCase().includes(moduleSearch.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  const tableColumns: ColumnDef<Module>[] = [
    {
      id: 'module',
      header: 'Module',
      minWidth: 200,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.name}</span>
          {row.description && (
            <span className="text-xs text-muted-foreground">{row.description}</span>
          )}
        </div>
      ),
    },
    {
      id: 'create',
      header: 'Create',
      align: 'center',
      minWidth: 100,
      cellType: 'custom',
      cell: (row) => {
        const userPerm = userPermissions[row.id];
        const rolePerm = rolePermissions[row.id];
        const hasUserOverride = !!userPerm;
        const granted = userPerm?.can_create ?? rolePerm?.can_create ?? false;
        return (
          <div 
            onClick={() => togglePermission(row.id, 'can_create')}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <PermissionIcon 
              granted={granted} 
              type="create" 
              source={hasUserOverride ? 'user_override' : 'role'}
            />
          </div>
        );
      },
    },
    {
      id: 'read',
      header: 'Read',
      align: 'center',
      minWidth: 100,
      cellType: 'custom',
      cell: (row) => {
        const userPerm = userPermissions[row.id];
        const rolePerm = rolePermissions[row.id];
        const hasUserOverride = !!userPerm;
        const granted = userPerm?.can_read ?? rolePerm?.can_read ?? false;
        return (
          <div 
            onClick={() => togglePermission(row.id, 'can_read')}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <PermissionIcon 
              granted={granted} 
              type="read" 
              source={hasUserOverride ? 'user_override' : 'role'}
            />
          </div>
        );
      },
    },
    {
      id: 'update',
      header: 'Update',
      align: 'center',
      minWidth: 100,
      cellType: 'custom',
      cell: (row) => {
        const userPerm = userPermissions[row.id];
        const rolePerm = rolePermissions[row.id];
        const hasUserOverride = !!userPerm;
        const granted = userPerm?.can_update ?? rolePerm?.can_update ?? false;
        return (
          <div 
            onClick={() => togglePermission(row.id, 'can_update')}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <PermissionIcon 
              granted={granted} 
              type="update" 
              source={hasUserOverride ? 'user_override' : 'role'}
            />
          </div>
        );
      },
    },
    {
      id: 'delete',
      header: 'Delete',
      align: 'center',
      minWidth: 100,
      cellType: 'custom',
      cell: (row) => {
        const userPerm = userPermissions[row.id];
        const rolePerm = rolePermissions[row.id];
        const hasUserOverride = !!userPerm;
        const granted = userPerm?.can_delete ?? rolePerm?.can_delete ?? false;
        return (
          <div 
            onClick={() => togglePermission(row.id, 'can_delete')}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <PermissionIcon 
              granted={granted} 
              type="delete" 
              source={hasUserOverride ? 'user_override' : 'role'}
            />
          </div>
        );
      },
    },
    {
      id: 'assign',
      header: 'Assign',
      align: 'center',
      minWidth: 100,
      cellType: 'custom',
      cell: (row) => {
        const userPerm = userPermissions[row.id];
        const rolePerm = rolePermissions[row.id];
        const hasUserOverride = !!userPerm;
        const granted = userPerm?.can_assign ?? rolePerm?.can_assign ?? false;
        return (
          <div 
            onClick={() => togglePermission(row.id, 'can_assign')}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <PermissionIcon 
              granted={granted} 
              type="assign" 
              source={hasUserOverride ? 'user_override' : 'role'}
            />
          </div>
        );
      },
    },
    {
      id: 'approve',
      header: 'Approve',
      align: 'center',
      minWidth: 100,
      cellType: 'custom',
      cell: (row) => {
        const userPerm = userPermissions[row.id];
        const rolePerm = rolePermissions[row.id];
        const hasUserOverride = !!userPerm;
        const granted = userPerm?.can_approve ?? rolePerm?.can_approve ?? false;
        return (
          <div 
            onClick={() => togglePermission(row.id, 'can_approve')}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <PermissionIcon 
              granted={granted} 
              type="approve" 
              source={hasUserOverride ? 'user_override' : 'role'}
            />
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'center',
      minWidth: 150,
      cellType: 'custom',
      cell: (row) => {
        const hasUserOverride = !!userPermissions[row.id];
        return (
          <div className="flex items-center justify-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => togglePermission(row.id, 'can_create')}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{hasUserOverride ? 'Edit User Override' : 'Create User Override'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {hasUserOverride && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setUserPermissions(prev => {
                          const newPerms = { ...prev };
                          delete newPerms[row.id];
                          return newPerms;
                        });
                        setHasChanges(true);
                      }}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Remove User Override (revert to role permission)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <UserCheck className="h-8 w-8 text-primary" />
              User Permission Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage individual user permissions that override role-based permissions
            </p>
          </div>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>User Permissions Override Role Permissions:</strong> When you set a user-specific permission, 
          it takes priority over the role permission. User overrides can grant or deny access independently of role permissions.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Select User</CardTitle>
              <CardDescription>
                Choose a user to manage their individual permissions
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setIsUserDialogOpen(true)} variant="outline">
                <User className="h-4 w-4 mr-2" />
                {selectedUser ? selectedUser.full_name : 'Select User'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {selectedUser && (
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{selectedUser.full_name}</span>
                  {selectedUser.roles.map(r => (
                    <Badge key={r} variant="secondary">{r}</Badge>
                  ))}
                </div>
                {selectedUser.email && (
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={saveUserPermissions}
                  disabled={!hasChanges || isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
                <Button
                  onClick={clearUserOverrides}
                  variant="outline"
                  disabled={Object.keys(userPermissions).length === 0 || isSaving}
                >
                  Clear All Overrides
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {selectedUserId && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Permission Matrix</CardTitle>
                <CardDescription>
                  Green dot indicates user override. Click Edit to create/modify user-specific permissions.
                </CardDescription>
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search modules..."
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ParentTable
              data={filteredModules}
              columns={tableColumns}
              emptyMessage="No modules found"
            />
          </CardContent>
        </Card>
      )}

      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select User</DialogTitle>
            <DialogDescription>
              Choose a user to manage their individual permissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => handleUserSelect(u.id)}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{u.full_name}</span>
                        {u.roles.map(r => (
                          <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>
                        ))}
                      </div>
                      {u.email && (
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      )}
                    </div>
                    {selectedUserId === u.id && (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

