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
  Settings, 
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
  Loader2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/BackButton';

type Module = {
  id: string;
  name: string;
  description: string;
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

const ALL_ROLES = ['super_admin', 'admin', 'teacher', 'student', 'guardian'] as const;
type AppRole = typeof ALL_ROLES[number];

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
    approve: CheckCircle2,
  };
  const Icon = icons[type];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center justify-center w-6 h-6 rounded transition-colors ${
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

export default function RolePermissionManagement() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [modules, setModules] = useState<Module[]>([]);
  const [rolesData, setRolesData] = useState<Record<string, RoleData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  const [customRoles, setCustomRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (!loading && role !== 'super_admin') {
      navigate('/dashboard');
      return;
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (role === 'super_admin') {
      fetchData();
    }
  }, [role]);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/346748d1-2e19-4d58-affc-c5851b8a5962',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RolePermissionManagement.tsx:135',message:'Component mounted',data:{hasNavigate:!!navigate,currentPath:window.location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'navigation',hypothesisId:'A'})}).catch(()=>{});
  }, [navigate]);
  // #endregion

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchModules(),
        fetchRolePermissions(),
        fetchCustomRoles(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load role permissions data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModules = async () => {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('name');

    if (error) throw error;
    setModules(data || []);
  };

  const fetchCustomRoles = async () => {
    const { data, error } = await supabase
      .from('custom_roles')
      .select('role_name');

    if (error) {
      console.error('Error fetching custom roles:', error);
      setCustomRoles([]);
      return;
    }
    setCustomRoles(data?.map(r => r.role_name) || []);
  };

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

    if (permsError) throw permsError;

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
      setHasChanges(true);
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

      setHasChanges(false);
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
      setHasChanges(true);
      return updated;
    });
  };

  const filteredModules = modules.filter(m => 
    m.name.toLowerCase().includes(moduleSearch.toLowerCase()) ||
    m.description?.toLowerCase().includes(moduleSearch.toLowerCase())
  );

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (role !== 'super_admin') {
    return null;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton 
            fallbackPath="/admin/users" 
            fallbackLabel="Back to User Management"
          />
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Role Permission Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage module permissions for each role. All users with the same role will have identical permissions.
            </p>
          </div>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> This is a pure role-based permission system. 
          Permissions are assigned to roles, and all users with the same role inherit the same permissions. 
          Changes to role permissions affect all users with that role immediately.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue={ALL_ROLES[0]} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
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

          return (
            <TabsContent key={roleName} value={roleName}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Badge className={ROLE_COLORS[roleName]?.bg + ' ' + ROLE_COLORS[roleName]?.text}>
                          {roleName.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {roleData.userCount > 0 && (
                          <span className="text-sm font-normal text-muted-foreground">
                            ({roleData.userCount} {roleData.userCount === 1 ? 'user' : 'users'})
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Configure module permissions for the {roleName.replace('_', ' ')} role. 
                        All users with this role will have these permissions.
                      </CardDescription>
                    </div>
                    <Button 
                      onClick={() => saveRolePermissions(roleName)}
                      disabled={!hasChanges}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Input
                      placeholder="Search modules..."
                      value={moduleSearch}
                      onChange={(e) => setModuleSearch(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>

                  <ParentTable
                    columns={[
                      {
                        id: 'module',
                        header: 'Module',
                        sticky: 'left',
                        minWidth: 250,
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
                    scrollHeight="h-[600px]"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

