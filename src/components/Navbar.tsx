import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap, Moon, Sun, LogOut, User, BookOpen, LayoutDashboard, Library, Shield, Users, Mail, ChevronRight, Settings, FileText, Award, Bell, HelpCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

export const Navbar = () => {
  const { user, signOut, role, roles } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profileData, setProfileData] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);

  const getDashboardPath = () => {
    if (!role) return '/dashboard';
    if (role === 'super_admin' || role === 'admin') return '/dashboard/admin';
    return `/dashboard/${role}`;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setProfileData(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.[0]?.toUpperCase() || 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string | null) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-purple-100 text-purple-700 border-purple-300',
      admin: 'bg-blue-100 text-blue-700 border-blue-300',
      teacher: 'bg-green-100 text-green-700 border-green-300',
      student: 'bg-orange-100 text-orange-700 border-orange-300',
      guardian: 'bg-pink-100 text-pink-700 border-pink-300',
    };
    return colors[role || ''] || 'bg-gray-100 text-gray-700 border-gray-300';
  };

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-primary">
            <GraduationCap className="h-8 w-8" />
            <span>EduLearn</span>
          </Link>

          <div className="flex items-center gap-4">
            {user && (
              <>
                <Link to="/courses">
                  <Button variant="ghost" size="sm">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Courses
                  </Button>
                </Link>
                <Link to="/library">
                  <Button variant="ghost" size="sm">
                    <Library className="h-4 w-4 mr-2" />
                    Library
                  </Button>
                </Link>
                <Link to={getDashboardPath()}>
                  <Button variant="ghost" size="sm">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              </>
            )}

            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={profileData?.avatar_url || undefined} alt={profileData?.full_name || 'User'} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                        {getInitials(profileData?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    {role && (
                      <span className="hidden sm:inline capitalize">{role.replace('_', ' ')}</span>
                    )}
                    <ChevronRight className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-64 p-0 border border-primary/20 shadow-xl backdrop-blur-md bg-background/80"
                >
                  {/* User Info Header - Compact */}
                  <div className="px-3 py-2.5 border-b border-primary/10">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Avatar className="h-9 w-9 border border-primary/20">
                        <AvatarImage src={profileData?.avatar_url || undefined} alt={profileData?.full_name || 'User'} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-semibold">
                          {getInitials(profileData?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {profileData?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    {roles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {roles.map(r => (
                          <Badge 
                            key={r} 
                            variant="secondary" 
                            className={`text-xs px-1.5 py-0 ${getRoleColor(r)} border`}
                          >
                            {r?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Links */}
                  <div className="py-1.5">
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild className="mx-1.5 my-0.5 rounded-md hover:bg-primary/10 transition-colors">
                        <Link to="/courses" className="cursor-pointer flex items-center w-full py-1.5">
                          <BookOpen className="h-4 w-4 mr-2.5 text-primary" />
                          <span className="flex-1 text-sm">Courses</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="mx-1.5 my-0.5 rounded-md hover:bg-primary/10 transition-colors">
                        <Link to="/library" className="cursor-pointer flex items-center w-full py-1.5">
                          <Library className="h-4 w-4 mr-2.5 text-primary" />
                          <span className="flex-1 text-sm">Library</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="mx-1.5 my-0.5 rounded-md hover:bg-primary/10 transition-colors">
                        <Link to={getDashboardPath()} className="cursor-pointer flex items-center w-full py-1.5">
                          <LayoutDashboard className="h-4 w-4 mr-2.5 text-primary" />
                          <span className="flex-1 text-sm">Dashboard</span>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </div>

                  {/* Account Section */}
                  <DropdownMenuSeparator className="bg-primary/10 my-1" />
                  <div className="py-1.5">
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild className="mx-1.5 my-0.5 rounded-md hover:bg-primary/10 transition-colors">
                        <Link to="/profile" className="cursor-pointer flex items-center w-full py-1.5">
                          <User className="h-4 w-4 mr-2.5 text-primary" />
                          <span className="flex-1 text-sm">Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      {role === 'student' && (
                        <DropdownMenuItem asChild className="mx-1.5 my-0.5 rounded-md hover:bg-primary/10 transition-colors">
                          <Link to="/student/assignments" className="cursor-pointer flex items-center w-full py-1.5">
                            <FileText className="h-4 w-4 mr-2.5 text-primary" />
                            <span className="flex-1 text-sm">Assignments</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {(role === 'teacher' || role === 'admin' || role === 'super_admin') && (
                        <DropdownMenuItem asChild className="mx-1.5 my-0.5 rounded-md hover:bg-primary/10 transition-colors">
                          <Link to="/admin/assignments" className="cursor-pointer flex items-center w-full py-1.5">
                            <FileText className="h-4 w-4 mr-2.5 text-primary" />
                            <span className="flex-1 text-sm">Assignments</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                  </div>

                  {/* Admin Section */}
                  {(role === 'super_admin' || role === 'admin') && (
                    <>
                      <DropdownMenuSeparator className="bg-primary/10 my-1" />
                      <div className="py-1.5">
                        <DropdownMenuGroup>
                          {role === 'super_admin' && (
                            <DropdownMenuItem asChild className="mx-1.5 my-0.5 rounded-md hover:bg-primary/10 transition-colors">
                              <Link to="/admin/super" className="cursor-pointer flex items-center w-full py-1.5">
                                <Shield className="h-4 w-4 mr-2.5 text-purple-600" />
                                <span className="flex-1 text-sm">Super Admin</span>
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild className="mx-1.5 my-0.5 rounded-md hover:bg-primary/10 transition-colors">
                            <Link to="/admin/users" className="cursor-pointer flex items-center w-full py-1.5">
                              <Users className="h-4 w-4 mr-2.5 text-blue-600" />
                              <span className="flex-1 text-sm">User Management</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="mx-1.5 my-0.5 rounded-md hover:bg-primary/10 transition-colors">
                            <Link to="/admin/system-monitoring" className="cursor-pointer flex items-center w-full py-1.5">
                              <Settings className="h-4 w-4 mr-2.5 text-green-600" />
                              <span className="flex-1 text-sm">System Monitoring</span>
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </div>
                    </>
                  )}

                  {/* Teacher Section */}
                  {role === 'teacher' && (
                    <>
                      <DropdownMenuSeparator className="bg-primary/10 my-1" />
                      <div className="py-1.5">
                        <DropdownMenuGroup>
                          <DropdownMenuItem asChild className="mx-1.5 my-0.5 rounded-md hover:bg-primary/10 transition-colors">
                            <Link to="/teacher/students" className="cursor-pointer flex items-center w-full py-1.5">
                              <Users className="h-4 w-4 mr-2.5 text-green-600" />
                              <span className="flex-1 text-sm">My Students</span>
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </div>
                    </>
                  )}

                  {/* Actions Section */}
                  <DropdownMenuSeparator className="bg-primary/10 my-1" />
                  <div className="py-1.5">
                    <DropdownMenuGroup>
                      <DropdownMenuItem 
                        onClick={async () => {
                          await signOut();
                          window.location.href = '/auth';
                        }} 
                        className="mx-1.5 my-0.5 rounded-md hover:bg-destructive/10 transition-colors cursor-pointer text-destructive focus:text-destructive py-1.5"
                      >
                        <LogOut className="h-4 w-4 mr-2.5" />
                        <span className="flex-1 text-sm">Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button size="sm">Get Started</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
