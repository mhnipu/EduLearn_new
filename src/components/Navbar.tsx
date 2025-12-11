import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, Moon, Sun, LogOut, User, BookOpen, LayoutDashboard, Library, Shield, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/contexts/ThemeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export const Navbar = () => {
  const { user, signOut, role, roles } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const getDashboardPath = () => {
    if (!role) return '/dashboard';
    if (role === 'super_admin' || role === 'admin') return '/dashboard/admin';
    return `/dashboard/${role}`;
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
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4 mr-2" />
                    {role && <span className="capitalize">{role.replace('_', ' ')}</span>}
                  </Button>
                </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  {roles.length > 0 && (
                    <div className="px-2 py-1.5 mb-1">
                      <div className="flex flex-wrap gap-1">
                        {roles.map(r => (
                          <Badge key={r} variant="secondary" className="text-xs">
                            {r?.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {role === 'super_admin' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/super" className="cursor-pointer">
                          <Shield className="h-4 w-4 mr-2" />
                          Super Admin
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {(role === 'super_admin' || role === 'admin') && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/users" className="cursor-pointer">
                        <Users className="h-4 w-4 mr-2" />
                        User Management
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
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
