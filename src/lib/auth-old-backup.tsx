import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type AppRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'guardian' | null;

interface ModulePermission {
  module_name: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole;
  roles: AppRole[]; // Multi-role support
  permissions: ModulePermission[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasPermission: (moduleName: string, permission: 'create' | 'read' | 'update' | 'delete') => boolean;
  hasRole: (checkRole: AppRole) => boolean;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role priority for determining primary dashboard
const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 5,
  admin: 4,
  teacher: 3,
  guardian: 2,
  student: 1,
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<ModulePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;

      const userRoles = (data || []).map(r => r.role as AppRole);
      setRoles(userRoles);

      // Set primary role based on priority
      if (userRoles.length > 0) {
        const primaryRole = userRoles.reduce((highest, current) => {
          const currentPriority = ROLE_PRIORITY[current || ''] || 0;
          const highestPriority = ROLE_PRIORITY[highest || ''] || 0;
          return currentPriority > highestPriority ? current : highest;
        }, userRoles[0]);
        setRole(primaryRole);
      } else {
        setRole(null);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
      setRole(null);
      setRoles([]);
    }
  };

  const fetchUserPermissions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_module_permissions')
        .select(`
          can_create,
          can_read,
          can_update,
          can_delete,
          modules!inner(name)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const modulePermissions: ModulePermission[] = (data || []).map((p: any) => ({
        module_name: p.modules.name,
        can_create: p.can_create,
        can_read: p.can_read,
        can_update: p.can_update,
        can_delete: p.can_delete,
      }));

      setPermissions(modulePermissions);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    }
  };

  const refreshPermissions = async () => {
    if (user) {
      await Promise.all([
        fetchUserRoles(user.id),
        fetchUserPermissions(user.id),
      ]);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(async () => {
            await Promise.all([
              fetchUserRoles(session.user.id),
              fetchUserPermissions(session.user.id),
            ]);
          }, 0);
        } else {
          setRole(null);
          setRoles([]);
          setPermissions([]);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await Promise.all([
          fetchUserRoles(session.user.id),
          fetchUserPermissions(session.user.id),
        ]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setRoles([]);
    setPermissions([]);
  };

  const hasPermission = (moduleName: string, permission: 'create' | 'read' | 'update' | 'delete'): boolean => {
    // Super admins have all permissions
    if (role === 'super_admin') return true;
    
    const modulePerms = permissions.find(p => p.module_name === moduleName);
    if (!modulePerms) return false;
    
    switch (permission) {
      case 'create': return modulePerms.can_create;
      case 'read': return modulePerms.can_read;
      case 'update': return modulePerms.can_update;
      case 'delete': return modulePerms.can_delete;
      default: return false;
    }
  };

  const hasRole = (checkRole: AppRole): boolean => {
    if (!checkRole) return false;
    return roles.includes(checkRole);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      role, 
      roles, 
      permissions, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      hasPermission, 
      hasRole,
      refreshPermissions 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
