import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
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

  useEffect(() => {
    if (!loading) {
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
        navigate('/dashboard', { replace: true });
        return;
      }

      // Check allowed roles
      if (allowRoles && role && !allowRoles.includes(role)) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/e3b1e8a7-7650-401d-8383-a5f7a7ee6da4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.tsx:46',message:'role blocked by allowRoles',data:{role,allowRoles,path:location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        console.log(`🚫 Role not allowed. Allowed: ${allowRoles.join(', ')}, Current: ${role}`);
        navigate('/dashboard', { replace: true });
        return;
      }

      // Check permission requirements
      if (requiredPermission) {
        const hasPerm = role === 'super_admin' || hasPermission(requiredPermission.module, requiredPermission.action);
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/e3b1e8a7-7650-401d-8383-a5f7a7ee6da4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProtectedRoute.tsx:53',message:'permission check',data:{role,requiredPermission,hasPerm,path:location.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        if (!hasPerm) {
          console.log(`🚫 Permission denied. Required: ${requiredPermission.module}.${requiredPermission.action}`);
          navigate('/dashboard', { replace: true });
          return;
        }
      }
    }
  }, [user, role, loading, requiredRole, requiredPermission, allowRoles, navigate, location, hasPermission]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
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
