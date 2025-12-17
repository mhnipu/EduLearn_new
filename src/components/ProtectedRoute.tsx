import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'admin' | 'teacher' | 'student' | 'guardian';
  requiredPermission?: {
    module: string;
    action: 'create' | 'read' | 'update' | 'delete';
  };
  allowRoles?: Array<'super_admin' | 'admin' | 'teacher' | 'student' | 'guardian'>;
}

export function ProtectedRoute({ 
  children, 
  requiredRole,
  requiredPermission,
  allowRoles 
}: ProtectedRouteProps) {
  const { user, role, loading, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileComplete, setProfileComplete] = useState(true);

  // Check profile completion ONLY for students with admin-assigned student role
  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (loading || !user) {
        setCheckingProfile(false);
        return;
      }

      // Skip check for profile completion page itself
      if (location.pathname === '/profile-completion') {
        setCheckingProfile(false);
        return;
      }

      // CRITICAL: Only check profile completion for users with 'student' role
      // AND ensure they don't have guardian/teacher/admin roles (which take priority)
      if (role !== 'student') {
        setCheckingProfile(false);
        return;
      }

      try {
        // Verify user actually has student role (backend validation)
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (rolesError) {
          console.error('Error fetching user roles:', rolesError);
          setCheckingProfile(false);
          return;
        }

        const roles = (userRoles || []).map(r => r.role);
        const hasStudentRole = roles.includes('student');
        const hasNonStudentRole = roles.some(r => ['guardian', 'teacher', 'admin', 'super_admin'].includes(r));

        // If user has guardian/teacher/admin role, they should NOT see profile completion
        if (hasNonStudentRole) {
          setCheckingProfile(false);
          return;
        }

        // Only proceed if user has ONLY student role (no other roles)
        if (!hasStudentRole || hasNonStudentRole) {
          setCheckingProfile(false);
          return;
        }

        // Use the database function to check profile completion
        const { data: dbCheck, error: rpcError } = await supabase.rpc('is_profile_complete', {
          _user_id: user.id,
        });

        if (rpcError) {
          console.error('Error checking profile completion:', rpcError);
          // Fallback to manual check
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('profile_completed, full_name, guardian_name, guardian_email, guardian_phone')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
            setCheckingProfile(false);
            return;
          }

          // Check if guardian relationship exists
          const { data: guardianRel } = await supabase
            .from('student_guardians')
            .select('id')
            .eq('student_id', user.id)
            .limit(1)
            .maybeSingle();

          const hasGuardianInfo = (profile?.guardian_name && profile?.guardian_email && profile?.guardian_phone) || !!guardianRel;
          const isComplete = profile?.profile_completed || (profile?.full_name && hasGuardianInfo);

          setProfileComplete(isComplete);

          if (!isComplete) {
            navigate('/profile-completion', { replace: true });
          }
        } else {
          const finalCheck = dbCheck === true;
          setProfileComplete(finalCheck);

          if (!finalCheck) {
            navigate('/profile-completion', { replace: true });
          }
        }
      } catch (error) {
        console.error('Error checking profile completion:', error);
      } finally {
        setCheckingProfile(false);
      }
    };

    checkProfileCompletion();
  }, [user, role, loading, location.pathname, navigate]);

  useEffect(() => {
    if (!loading && !checkingProfile) {
      // If no user, redirect to auth
      if (!user) {
        console.log('🚫 No user session, redirecting to /auth');
        navigate('/auth', { 
          state: { from: location.pathname },
          replace: true 
        });
        return;
      }

      // Check role requirements
      if (requiredRole && role !== requiredRole) {
        console.log(`🚫 Role mismatch. Required: ${requiredRole}, Current: ${role}`);
        navigate('/dashboard', { 
          state: { from: location.pathname },
          replace: true 
        });
        return;
      }

      // Check allowed roles
      if (allowRoles && role && !allowRoles.includes(role)) {
        console.log(`🚫 Role not allowed. Allowed: ${allowRoles.join(', ')}, Current: ${role}`);
        navigate('/dashboard', { 
          state: { from: location.pathname },
          replace: true 
        });
        return;
      }

      // Check permission requirements
      if (requiredPermission) {
        const hasPerm = role === 'super_admin' || hasPermission(requiredPermission.module, requiredPermission.action);
        if (!hasPerm) {
          console.log(`🚫 Permission denied. Required: ${requiredPermission.module}.${requiredPermission.action}`);
          navigate('/dashboard', { 
            state: { from: location.pathname },
            replace: true 
          });
          return;
        }
      }
    }
  }, [user, role, loading, checkingProfile, requiredRole, requiredPermission, allowRoles, navigate, location, hasPermission]);

  // Show loading while checking auth or profile
  if (loading || checkingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If profile not complete, don't render (redirect will happen)
  if (role === 'student' && !profileComplete && location.pathname !== '/profile-completion') {
    return null;
  }

  // If no user, don't render children (redirect will happen)
  if (!user) {
    return null;
  }

  // Check role requirements
  if (requiredRole && role !== requiredRole) {
    return null;
  }

  // Check allowed roles
  if (allowRoles && role && !allowRoles.includes(role)) {
    return null;
  }

  // Check permission requirements
  if (requiredPermission) {
    if (role !== 'super_admin' && !hasPermission(requiredPermission.module, requiredPermission.action)) {
      return null;
    }
  }

  return <>{children}</>;
}
