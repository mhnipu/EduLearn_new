import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap, Moon, Sun, LogOut, User, BookOpen, LayoutDashboard, Library, Shield, Users, Mail, ChevronRight, Settings, FileText, Award, Bell, HelpCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
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
  const location = useLocation();
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

  const isActiveRoute = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname.startsWith('/dashboard');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <nav className="border-b border-border/50 bg-background/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section - Enhanced */}
          <Link 
            to="/" 
            className="flex items-center gap-2.5 group transition-all duration-200 hover:opacity-80"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:blur-lg transition-all duration-200" />
              <div className="relative bg-gradient-to-br from-primary to-primary/70 p-2 rounded-lg shadow-lg">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              EduLearn
            </span>
          </Link>

          {/* Navigation Links - Enhanced */}
          <div className="flex items-center gap-1 sm:gap-2">
            {user && (
              <>
                <Link to="/courses">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={cn(
                      "relative h-9 px-3 sm:px-4 transition-all duration-200 font-medium rounded-lg",
                      isActiveRoute('/courses')
                        ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 shadow-sm hover:shadow-md hover:from-primary/25 hover:to-primary/15"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <BookOpen className={cn(
                      "h-4 w-4 mr-2 transition-all duration-200",
                      isActiveRoute('/courses') && "scale-110"
                    )} />
                    <span className="hidden sm:inline font-semibold">Courses</span>
                    {isActiveRoute('/courses') && (
                      <>
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full" />
                      </>
                    )}
                  </Button>
                </Link>
                <Link to="/library">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={cn(
                      "relative h-9 px-3 sm:px-4 transition-all duration-200 font-medium rounded-lg",
                      isActiveRoute('/library')
                        ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 shadow-sm hover:shadow-md hover:from-primary/25 hover:to-primary/15"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <Library className={cn(
                      "h-4 w-4 mr-2 transition-all duration-200",
                      isActiveRoute('/library') && "scale-110"
                    )} />
                    <span className="hidden sm:inline font-semibold">Library</span>
                    {isActiveRoute('/library') && (
                      <>
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full" />
                      </>
                    )}
                  </Button>
                </Link>
                <Link to={getDashboardPath()}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={cn(
                      "relative h-9 px-3 sm:px-4 transition-all duration-200 font-medium rounded-lg",
                      isActiveRoute('/dashboard')
                        ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30 shadow-sm hover:shadow-md hover:from-primary/25 hover:to-primary/15"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <LayoutDashboard className={cn(
                      "h-4 w-4 mr-2 transition-all duration-200",
                      isActiveRoute('/dashboard') && "scale-110"
                    )} />
                    <span className="hidden sm:inline font-semibold">Dashboard</span>
                    {isActiveRoute('/dashboard') && (
                      <>
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full" />
                      </>
                    )}
                  </Button>
                </Link>
              </>
            )}

            {/* Theme Toggle - Enhanced */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="h-9 w-9 rounded-lg hover:bg-accent/50 transition-all duration-200"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
              ) : (
                <Sun className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
              )}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 h-9 px-2 sm:px-3 border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <Avatar className="h-6 w-6 border-2 border-primary/20">
                      <AvatarImage src={profileData?.avatar_url || undefined} alt={profileData?.full_name || 'User'} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
                        {getInitials(profileData?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    {role && (
                      <span className="hidden sm:inline capitalize text-sm font-medium">
                        {role.replace('_', ' ')}
                      </span>
                    )}
                    <ChevronRight className="h-3 w-3 opacity-50 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-64 p-0 border border-primary/20 shadow-2xl backdrop-blur-md bg-background/95 mt-2"
                >
                  {/* User Info Header - Enhanced */}
                  <div className="px-4 py-3 border-b border-primary/10 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-md" />
                        <Avatar className="relative h-10 w-10 border-2 border-primary/30 shadow-md">
                          <AvatarImage src={profileData?.avatar_url || undefined} alt={profileData?.full_name || 'User'} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-sm font-bold">
                            {getInitials(profileData?.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {profileData?.full_name || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    {roles.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {roles.map(r => (
                          <Badge 
                            key={r} 
                            variant="secondary" 
                            className={`text-xs px-2 py-0.5 ${getRoleColor(r)} border font-medium shadow-sm`}
                          >
                            {r?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Links */}
                  <div className="py-2">
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild className="mx-2 my-1 rounded-lg hover:bg-primary/10 transition-all duration-200 cursor-pointer">
                        <Link to="/courses" className="flex items-center w-full py-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 mr-3">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                          <span className="flex-1 text-sm font-medium">Courses</span>
                          {isActiveRoute('/courses') && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="mx-2 my-1 rounded-lg hover:bg-primary/10 transition-all duration-200 cursor-pointer">
                        <Link to="/library" className="flex items-center w-full py-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 mr-3">
                            <Library className="h-4 w-4 text-primary" />
                          </div>
                          <span className="flex-1 text-sm font-medium">Library</span>
                          {isActiveRoute('/library') && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild className="mx-2 my-1 rounded-lg hover:bg-primary/10 transition-all duration-200 cursor-pointer">
                        <Link to={getDashboardPath()} className="flex items-center w-full py-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 mr-3">
                            <LayoutDashboard className="h-4 w-4 text-primary" />
                          </div>
                          <span className="flex-1 text-sm font-medium">Dashboard</span>
                          {isActiveRoute('/dashboard') && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </div>

                  {/* Account Section */}
                  <DropdownMenuSeparator className="bg-primary/10 my-1.5" />
                  <div className="py-2">
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild className="mx-2 my-1 rounded-lg hover:bg-primary/10 transition-all duration-200 cursor-pointer">
                        <Link to="/profile" className="flex items-center w-full py-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 mr-3">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="flex-1 text-sm font-medium">Profile</span>
                          {isActiveRoute('/profile') && (
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </Link>
                      </DropdownMenuItem>
                      {role === 'student' && (
                        <DropdownMenuItem asChild className="mx-2 my-1 rounded-lg hover:bg-primary/10 transition-all duration-200 cursor-pointer">
                          <Link to="/student/assignments" className="flex items-center w-full py-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 mr-3">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <span className="flex-1 text-sm font-medium">Assignments</span>
                            {isActiveRoute('/student/assignments') && (
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {(role === 'teacher' || role === 'admin' || role === 'super_admin') && (
                        <DropdownMenuItem asChild className="mx-2 my-1 rounded-lg hover:bg-primary/10 transition-all duration-200 cursor-pointer">
                          <Link to="/admin/assignments" className="flex items-center w-full py-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 mr-3">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <span className="flex-1 text-sm font-medium">Assignments</span>
                            {isActiveRoute('/admin/assignments') && (
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            )}
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                  </div>

                  {/* Admin Section */}
                  {(role === 'super_admin' || role === 'admin') && (
                    <>
                      <DropdownMenuSeparator className="bg-primary/10 my-1.5" />
                      <div className="py-2">
                        <DropdownMenuGroup>
                          {role === 'super_admin' && (
                            <>
                            <DropdownMenuItem asChild className="mx-2 my-1 rounded-lg hover:bg-primary/10 transition-all duration-200 cursor-pointer">
                              <Link to="/admin/super" className="flex items-center w-full py-2">
                                <div className="flex items-center justify-center w-8 h-8 rounded-md bg-purple-100 dark:bg-purple-900/30 mr-3">
                                  <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </div>
                                <span className="flex-1 text-sm font-medium">Super Admin</span>
                                {isActiveRoute('/admin/super') && (
                                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                )}
                              </Link>
                            </DropdownMenuItem>
                              <DropdownMenuItem asChild className="mx-2 my-1 rounded-lg hover:bg-primary/10 transition-all duration-200 cursor-pointer">
                                <Link to="/admin/role-permissions" className="flex items-center w-full py-2">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-indigo-100 dark:bg-indigo-900/30 mr-3">
                                    <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                  </div>
                                  <span className="flex-1 text-sm font-medium">Role Permissions</span>
                                  {isActiveRoute('/admin/role-permissions') && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                  )}
                                </Link>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem asChild className="mx-2 my-1 rounded-lg hover:bg-primary/10 transition-all duration-200 cursor-pointer">
                            <Link to="/admin/users" className="flex items-center w-full py-2">
                              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-100 dark:bg-blue-900/30 mr-3">
                                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="flex-1 text-sm font-medium">User Management</span>
                              {isActiveRoute('/admin/users') && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              )}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="mx-2 my-1 rounded-lg hover:bg-primary/10 transition-all duration-200 cursor-pointer">
                            <Link to="/admin/system-monitoring" className="flex items-center w-full py-2">
                              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-green-100 dark:bg-green-900/30 mr-3">
                                <Settings className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                              <span className="flex-1 text-sm font-medium">System Monitoring</span>
                              {isActiveRoute('/admin/system-monitoring') && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              )}
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </div>
                    </>
                  )}

                  {/* Teacher Section */}
                  {role === 'teacher' && (
                    <>
                      <DropdownMenuSeparator className="bg-primary/10 my-1.5" />
                      <div className="py-2">
                        <DropdownMenuGroup>
                          <DropdownMenuItem asChild className="mx-2 my-1 rounded-lg hover:bg-primary/10 transition-all duration-200 cursor-pointer">
                            <Link to="/teacher/students" className="flex items-center w-full py-2">
                              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-green-100 dark:bg-green-900/30 mr-3">
                                <Users className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                              <span className="flex-1 text-sm font-medium">My Students</span>
                              {isActiveRoute('/teacher/students') && (
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                              )}
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </div>
                    </>
                  )}

                  {/* Actions Section */}
                  <DropdownMenuSeparator className="bg-primary/10 my-1.5" />
                  <div className="py-2 pb-3">
                    <DropdownMenuGroup>
                      <DropdownMenuItem 
                        onClick={async () => {
                          await signOut();
                          window.location.href = '/auth';
                        }} 
                        className="mx-2 my-1 rounded-lg hover:bg-destructive/10 transition-all duration-200 cursor-pointer text-destructive focus:text-destructive py-2"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-destructive/10 mr-3">
                          <LogOut className="h-4 w-4 text-destructive" />
                        </div>
                        <span className="flex-1 text-sm font-medium">Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link to="/auth">
                <Button 
                  size="sm" 
                  className="h-9 px-4 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
