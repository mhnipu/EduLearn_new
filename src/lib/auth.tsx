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
  signInWithPhone: (phone: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: any }>;
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
        console.log('🔐 Auth Event:', event, 'Session:', session ? 'Active' : 'None');
        console.log('📡 Using Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

        // Handle sign out event - force redirect
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setRole(null);
          setRoles([]);
          setPermissions([]);
          // Force redirect to auth page
          if (window.location.pathname !== '/auth' && window.location.pathname !== '/') {
            window.location.href = '/auth';
          }
          return;
        }

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
          // If no session and not on public pages, redirect to auth
          if (window.location.pathname !== '/auth' && window.location.pathname !== '/') {
            window.location.href = '/auth';
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('🔍 Checking existing session...');
      console.log('📡 Connected to Supabase:', import.meta.env.VITE_SUPABASE_URL);

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        console.log('✅ User authenticated:', session.user.email);
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
    console.log('🔑 Signing in with email to external Supabase...');
    console.log('📡 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

    // Regular Supabase authentication (must be real session to access DB under RLS)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      console.log('✅ Successfully signed in to external Supabase');

      // Bootstrap: if the default super admin logs in, ensure they have super_admin role in DB
      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail === 'super@gmail.com') {
        console.log('👑 Attempting to bootstrap super_admin role for super@gmail.com...');
        const { error: rpcError } = await supabase.rpc('bootstrap_super_admin');
        if (rpcError) {
          console.warn('⚠️ bootstrap_super_admin failed:', rpcError.message);
        } else {
          console.log('✅ bootstrap_super_admin succeeded');
          // Refresh role/permissions after bootstrap
          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData.session?.user) {
            await Promise.all([
              fetchUserRoles(sessionData.session.user.id),
              fetchUserPermissions(sessionData.session.user.id),
            ]);
          }
        }
      }
    } else {
      console.error('❌ Sign in failed:', error.message);
    }
    
    return { error };
  };

  const signInWithPhone = async (phone: string, password: string) => {
    console.log('🔑 Signing in with phone to external Supabase...');
    console.log('📡 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    
    const { error } = await supabase.auth.signInWithPassword({
      phone,
      password,
    });
    
    if (!error) {
      console.log('✅ Successfully signed in with phone to external Supabase');
    } else {
      console.error('❌ Phone sign in failed:', error.message);
    }
    
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    console.log('📝 Creating new user in external Supabase...');
    console.log('📡 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('📧 Email:', email);
    console.log('📱 Phone:', phone || 'Not provided');
    
    const redirectUrl = `${window.location.origin}/`;
    
    // IMPORTANT: Don't pass 'phone' at top level with email auth
    // Phone should only be in options.data for metadata
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      // phone: phone,  ❌ REMOVED - This conflicts with email auth!
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: phone || '',
        },
      },
    });
    
    if (!error) {
      console.log('✅ User created successfully in external Supabase!');
      console.log('👤 User ID:', data.user?.id);
      console.log('📊 Database trigger will create profile automatically');
    } else {
      console.error('❌ Signup failed:', error.message);
    }
    
    return { error };
  };

  const signOut = async () => {
    console.log('🚪 Signing out from external Supabase...');
    
    // Clear all state first
    setUser(null);
    setSession(null);
    setRole(null);
    setRoles([]);
    setPermissions([]);
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Force redirect to auth page - this ensures user cannot access protected routes
    window.location.href = '/auth';
    
    console.log('✅ Signed out successfully');
  };

  const hasPermission = (
    moduleName: string, 
    permission: 'create' | 'read' | 'update' | 'delete' | 'assign' | 'approve'
  ): boolean => {
    // Super admins have all permissions
    if (role === 'super_admin') {
      return true;
    }
    
    // If no role, no permissions
    if (!role) {
      return false;
    }
    
    const modulePerms = permissions.find(p => p.module_name === moduleName);
    if (!modulePerms) {
      return false;
    }
    
    let result = false;
    switch (permission) {
      case 'create': result = modulePerms.can_create; break;
      case 'read': result = modulePerms.can_read; break;
      case 'update': result = modulePerms.can_update; break;
      case 'delete': result = modulePerms.can_delete; break;
      // For assign and approve, check if user has update permission (can be extended later)
      case 'assign': result = modulePerms.can_update || modulePerms.can_create; break;
      case 'approve': result = modulePerms.can_update || modulePerms.can_delete; break;
      default: result = false;
    }
    
    return result;
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
      signInWithPhone,
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
