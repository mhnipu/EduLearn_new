import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [verifyingRole, setVerifyingRole] = useState(true);

  useEffect(() => {
    const verifyAndRedirect = async () => {
      if (loading || !user) {
        if (!loading && !user) {
          navigate('/auth');
        }
        return;
      }

      // Verify roles from backend (not just from context)
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error verifying roles:', error);
        setVerifyingRole(false);
        return;
      }

      const roles = (userRoles || []).map(r => r.role);
      const hasNonStudentRole = roles.some(r => ['guardian', 'teacher', 'admin', 'super_admin'].includes(r));
      const hasStudentRole = roles.includes('student');

      // Priority: non-student roles take precedence
      if (hasNonStudentRole) {
        // User has guardian/teacher/admin role - redirect to their dashboard
        if (roles.includes('super_admin') || roles.includes('admin')) {
          navigate('/dashboard/admin', { replace: true });
        } else if (roles.includes('teacher')) {
          navigate('/dashboard/teacher', { replace: true });
        } else if (roles.includes('guardian')) {
          navigate('/dashboard/guardian', { replace: true });
        }
        setVerifyingRole(false);
        return;
      }

      // If user has no role, show pending approval
      if (roles.length === 0) {
        navigate('/pending-approval', { replace: true });
        setVerifyingRole(false);
        return;
      }

      // If user has ONLY student role, redirect to student dashboard
      // (profile completion check will happen in ProtectedRoute)
      if (hasStudentRole && !hasNonStudentRole) {
        navigate('/dashboard/student', { replace: true });
        setVerifyingRole(false);
        return;
      }

      // Fallback: use context role
      if (!role) {
        navigate('/pending-approval', { replace: true });
      } else {
        if (role === 'super_admin' || role === 'admin') {
          navigate('/dashboard/admin', { replace: true });
        } else {
          navigate(`/dashboard/${role}`, { replace: true });
        }
      }
      setVerifyingRole(false);
    };

    verifyAndRedirect();
  }, [user, role, loading, navigate]);

  if (loading || verifyingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
