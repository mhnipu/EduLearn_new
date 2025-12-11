import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (!role) {
        // User has no role assigned - redirect to pending approval
        navigate('/pending-approval', { replace: true });
      } else {
        // Redirect to role-specific dashboard
        if (role === 'super_admin' || role === 'admin') {
          navigate('/dashboard/admin', { replace: true });
        } else {
          navigate(`/dashboard/${role}`, { replace: true });
        }
      }
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
