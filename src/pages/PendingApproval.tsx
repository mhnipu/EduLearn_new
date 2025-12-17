import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getDashboardPath } from '@/lib/navigation';

export default function PendingApproval() {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else if (role) {
        // User now has a role, redirect to their dashboard
        navigate(getDashboardPath(role), { replace: true });
      }
    }
  }, [user, role, loading, navigate]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking your status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-10 w-10 text-amber-500" />
            </div>
          </div>
          <CardTitle className="text-2xl">Pending Approval</CardTitle>
          <CardDescription>Your account is awaiting role assignment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Thank you for signing up! An administrator needs to assign you a role before you can access the platform.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Please check back later or contact your administrator.
          </p>
          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={handleRefresh} variant="outline" className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Check Status
            </Button>
            <Button onClick={handleSignOut} variant="ghost" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
