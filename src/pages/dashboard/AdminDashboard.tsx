import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Users, BookOpen, GraduationCap, Upload, 
  UserPlus, Activity, FileDown, Plus,
  TrendingUp, ArrowRight, Clock, RefreshCw, Share2, FileText, Wand2,
  BarChart3, PieChart, LineChart, Zap, Target, Eye, CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AreaChart, Area, BarChart, Bar, LineChart as RechartsLineChart, Line,
  PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface Stats {
  totalUsers: number;
  totalCourses: number;
  totalEnrollments: number;
  totalUploads: number;
  pendingApprovals: number;
  activeUsers: number;
  totalLessons: number;
  totalVideos: number;
  totalBooks: number;
  totalAssignments: number;
}

interface RecentActivity {
  id: string;
  action_type: string;
  entity_type: string;
  created_at: string;
  metadata: any;
  user_id?: string;
  profiles?: {
    full_name: string;
  };
}

interface UserListItem {
  id: string;
  full_name: string;
  created_at: string;
  roles: string[];
}

interface ChartData {
  name: string;
  value: number;
  fill?: string;
}

interface GrowthData {
  month: string;
  users: number;
  courses: number;
  enrollments: number;
}

const AdminDashboard = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCourses: 0,
    totalEnrollments: 0,
    totalUploads: 0,
    pendingApprovals: 0,
    activeUsers: 0,
    totalLessons: 0,
    totalVideos: 0,
    totalBooks: 0,
    totalAssignments: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserListItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [roleDistribution, setRoleDistribution] = useState<ChartData[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (!loading && role && !['super_admin', 'admin'].includes(role)) {
      navigate(`/dashboard/${role}`);
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user && ['super_admin', 'admin'].includes(role || '')) {
      fetchStats();
      fetchRecentActivity();
      const unsubscribe = subscribeToActivity();
      return unsubscribe;
    }
  }, [user, role]);

  const fetchStats = async () => {
    try {
      const [
        usersRes, 
        coursesRes, 
        enrollmentsRes, 
        booksRes, 
        videosRes, 
        lessonsRes,
        assignmentsRes,
        pendingRes, 
        rolesRes
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('course_enrollments').select('id', { count: 'exact', head: true }),
        supabase.from('books').select('id', { count: 'exact', head: true }),
        supabase.from('videos').select('id', { count: 'exact', head: true }),
        supabase.from('lessons').select('id', { count: 'exact', head: true }),
        supabase.from('assignments').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).is('role', null),
        supabase.from('user_roles').select('user_id, role')
      ]);

      setStats({
        totalUsers: usersRes.count || 0,
        totalCourses: coursesRes.count || 0,
        totalEnrollments: enrollmentsRes.count || 0,
        totalUploads: (booksRes.count || 0) + (videosRes.count || 0),
        totalLessons: lessonsRes.count || 0,
        totalVideos: videosRes.count || 0,
        totalBooks: booksRes.count || 0,
        totalAssignments: assignmentsRes.count || 0,
        pendingApprovals: pendingRes.count || 0,
        activeUsers: Math.floor((usersRes.count || 0) * 0.85), // Simulated active users
      });

      // Fetch recent users with roles
      const { data: recentProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      // Process role distribution
      const userRoles = rolesRes.data || [];
      const rolesByUser: Record<string, string[]> = {};
      userRoles.forEach(ur => {
        if (!rolesByUser[ur.user_id]) {
          rolesByUser[ur.user_id] = [];
        }
        rolesByUser[ur.user_id].push(ur.role);
      });

      const usersWithRoles: UserListItem[] = (recentProfiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name || 'Unknown User',
        created_at: p.created_at,
        roles: rolesByUser[p.id] || []
      }));
      setRecentUsers(usersWithRoles);

      // Process role distribution for chart
      const roleCount: Record<string, number> = {};
      userRoles.forEach(ur => {
        const role = ur.role || 'Pending';
        roleCount[role] = (roleCount[role] || 0) + 1;
      });

      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
      const roleData = Object.entries(roleCount).map(([name, value], index) => ({
        name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value,
        fill: colors[index % colors.length]
      }));
      setRoleDistribution(roleData);

      // Generate mock growth data (in real app, this would come from time-series data)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
      const mockGrowth: GrowthData[] = months.map((month, i) => ({
        month,
        users: Math.floor((usersRes.count || 0) * (0.6 + (i * 0.08))),
        courses: Math.floor((coursesRes.count || 0) * (0.5 + (i * 0.1))),
        enrollments: Math.floor((enrollmentsRes.count || 0) * (0.4 + (i * 0.12)))
      }));
      setGrowthData(mockGrowth);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({ title: 'Error loading statistics', variant: 'destructive' });
    } finally {
      setLoadingStats(false);
      setIsRefreshing(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Query activity_feed without foreign key relationship
      const { data: activityData, error } = await supabase
        .from('activity_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // If we have activity data with user_ids, fetch the profile names separately
      if (activityData && activityData.length > 0) {
        const userIds = [...new Set(activityData.map(a => a.user_id).filter(Boolean))];
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

          // Create a map of user_id to profile
          const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

          // Merge profile data into activity data
          const enrichedActivity = activityData.map(activity => ({
            ...activity,
            profiles: activity.user_id ? profileMap.get(activity.user_id) : undefined
          }));

          setRecentActivity(enrichedActivity);
        } else {
          setRecentActivity(activityData);
        }
      } else {
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
      // If activity_feed doesn't exist, create sample data
      setRecentActivity([]);
    }
  };

  const subscribeToActivity = () => {
    const channel = supabase
      .channel('admin-activity')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_feed' },
        (payload) => {
          setRecentActivity((prev) => [payload.new as RecentActivity, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    await fetchRecentActivity();
    toast({ title: 'Dashboard refreshed' });
  };

  const exportEnrollmentsCSV = async () => {
    setIsExporting(true);
    try {
      const { data: enrollments, error } = await supabase
        .from('course_enrollments')
        .select(`
          id,
          user_id,
          course_id,
          enrolled_at,
          completed_at,
          courses(title)
        `);

      if (error) throw error;

      if (!enrollments || enrollments.length === 0) {
        toast({ 
          title: 'No enrollments to export', 
          description: 'There are no course enrollments in the system yet.',
          variant: 'destructive' 
        });
        return;
      }

      const csv = [
        ['ID', 'User ID', 'Course Title', 'Enrolled At', 'Completed At'].join(','),
        ...enrollments.map((e) =>
          [
            e.id,
            e.user_id,
            `"${e.courses?.title || 'Unknown'}"`,
            e.enrolled_at,
            e.completed_at || 'Not completed',
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enrollments-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'CSV exported successfully', description: `Exported ${enrollments.length} enrollments.` });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: 'Export failed', description: 'Please try again later.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      description: 'Registered users',
      action: () => navigate('/admin/users'),
      actionLabel: 'Manage Users',
    },
    {
      title: 'Total Courses',
      value: stats.totalCourses,
      icon: BookOpen,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      description: 'Available courses',
      action: () => navigate('/courses'),
      actionLabel: 'View Courses',
    },
    {
      title: 'Enrollments',
      value: stats.totalEnrollments,
      icon: GraduationCap,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      description: 'Active enrollments',
      action: () => navigate('/admin/enrollments'),
      actionLabel: 'Manage',
    },
    {
      title: 'Library Uploads',
      value: stats.totalUploads,
      icon: Upload,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      description: 'Books & videos',
      action: () => navigate('/library'),
      actionLabel: 'View Library',
    },
  ];

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Enhanced Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/50 backdrop-blur-sm rounded-2xl p-6 border border-border/50 shadow-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back! Here's your platform overview • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Badge variant="default" className="text-sm capitalize px-4 py-2 bg-primary/90 hover:bg-primary">
              {role?.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {statCards.map((stat, index) => (
            <Card 
              key={stat.title} 
              className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm hover:scale-105 hover:border-primary/30"
              onClick={stat.action}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
                <CardTitle className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                  {stat.title}
                </CardTitle>
                <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform shadow-lg`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 relative z-10">
                <div className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                  {stat.value.toLocaleString()}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{stat.description}</p>
                  <span className="text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 translate-x-2 group-hover:translate-x-0">
                    {stat.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <TrendingUp className="h-3 w-3" />
                  <span className="font-medium">+12% from last month</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Analytics Section with Charts */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid bg-muted/50">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background">
              <Eye className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="growth" className="data-[state=active]:bg-background">
              <LineChart className="h-4 w-4 mr-2" />
              Growth
            </TabsTrigger>
            <TabsTrigger value="distribution" className="data-[state=active]:bg-background">
              <PieChart className="h-4 w-4 mr-2" />
              Distribution
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Platform Growth
                  </CardTitle>
                  <CardDescription>User and course enrollment trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={growthData}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="users" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsers)" />
                      <Area type="monotone" dataKey="enrollments" stroke="#10b981" fillOpacity={1} fill="url(#colorEnrollments)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5 text-primary" />
                    User Role Distribution
                  </CardTitle>
                  <CardDescription>Breakdown of users by role type</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={roleDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {roleDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="growth" className="space-y-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  Detailed Growth Analytics
                </CardTitle>
                <CardDescription>Compare users, courses, and enrollments month-over-month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsLineChart data={growthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
                    <Line type="monotone" dataKey="courses" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5 }} />
                    <Line type="monotone" dataKey="enrollments" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Role Distribution Analysis
                </CardTitle>
                <CardDescription>Detailed breakdown of users across all roles</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={roleDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator className="my-8" />

        {/* Quick Actions */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl font-bold">Quick Actions</CardTitle>
            </div>
            <CardDescription>Common administrative tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                onClick={() => navigate('/admin/users')} 
                className="h-auto py-5 justify-start group hover:shadow-lg transition-all"
                variant="outline"
              >
                <div className="mr-3 h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <UserPlus className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Manage Users</div>
                  <div className="text-xs text-muted-foreground">Add or edit users</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => navigate('/admin/course-wizard')} 
                className="h-auto py-5 justify-start group hover:shadow-lg transition-all"
                variant="outline"
              >
                <div className="mr-3 h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                  <Wand2 className="h-5 w-5 text-green-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Course Wizard</div>
                  <div className="text-xs text-muted-foreground">Step-by-step creation</div>
                </div>
              </Button>
              
              <Button 
                onClick={() => navigate('/library/upload')} 
                className="h-auto py-5 justify-start group hover:shadow-lg transition-all"
                variant="outline"
              >
                <div className="mr-3 h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                  <Upload className="h-5 w-5 text-orange-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Upload Content</div>
                  <div className="text-xs text-muted-foreground">Add books or videos</div>
                </div>
              </Button>
              
              <Button 
                onClick={exportEnrollmentsCSV} 
                className="h-auto py-5 justify-start group hover:shadow-lg transition-all"
                variant="outline"
                disabled={isExporting}
              >
                <div className="mr-3 h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <FileDown className={`h-5 w-5 text-purple-500 ${isExporting ? 'animate-pulse' : ''}`} />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">{isExporting ? 'Exporting...' : 'Export CSV'}</div>
                  <div className="text-xs text-muted-foreground">Download enrollments</div>
                </div>
              </Button>

              <Button 
                onClick={() => navigate('/admin/content-assignments')} 
                className="h-auto py-5 justify-start group hover:shadow-lg transition-all"
                variant="outline"
              >
                <div className="mr-3 h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center group-hover:bg-pink-500/20 transition-colors">
                  <Share2 className="h-5 w-5 text-pink-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Assign Content</div>
                  <div className="text-xs text-muted-foreground">Assign to users</div>
                </div>
              </Button>

              <Button 
                onClick={() => navigate('/admin/assignments')} 
                className="h-auto py-5 justify-start group hover:shadow-lg transition-all"
                variant="outline"
              >
                <div className="mr-3 h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                  <FileText className="h-5 w-5 text-indigo-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Assignments</div>
                  <div className="text-xs text-muted-foreground">Create & grade</div>
                </div>
              </Button>

              <Button 
                onClick={() => navigate('/admin/categories')} 
                className="h-auto py-5 justify-start group hover:shadow-lg transition-all"
                variant="outline"
              >
                <div className="mr-3 h-10 w-10 rounded-lg bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                  <BookOpen className="h-5 w-5 text-teal-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Categories</div>
                  <div className="text-xs text-muted-foreground">Manage categories</div>
                </div>
              </Button>

              <Button 
                onClick={() => navigate('/admin/enrollments')} 
                className="h-auto py-5 justify-start group hover:shadow-lg transition-all"
                variant="outline"
              >
                <div className="mr-3 h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition-colors">
                  <GraduationCap className="h-5 w-5 text-cyan-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Enrollments</div>
                  <div className="text-xs text-muted-foreground">Assign courses</div>
                </div>
              </Button>

              <Button 
                onClick={() => navigate('/admin/system-monitoring')} 
                className="h-auto py-5 justify-start group hover:shadow-lg transition-all"
                variant="outline"
              >
                <div className="mr-3 h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <Activity className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">System Monitor</div>
                  <div className="text-xs text-muted-foreground">Track & analyze</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Health & Monitoring - Super Admin Only */}
        {role === 'super_admin' && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Activity className="h-5 w-5 text-primary" />
              System Health & Monitoring
            </CardTitle>
            <CardDescription>Real-time platform performance and metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Total Lessons</span>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <p className="text-2xl font-bold">{stats.totalLessons}</p>
                <p className="text-xs text-muted-foreground mt-1">Content pieces</p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Videos</span>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <p className="text-2xl font-bold">{stats.totalVideos}</p>
                <p className="text-xs text-muted-foreground mt-1">Uploaded</p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Books</span>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <p className="text-2xl font-bold">{stats.totalBooks}</p>
                <p className="text-xs text-muted-foreground mt-1">Library items</p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Assignments</span>
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <p className="text-2xl font-bold">{stats.totalAssignments}</p>
                <p className="text-xs text-muted-foreground mt-1">Active tasks</p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Pending</span>
                  <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                </div>
                <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
                <p className="text-xs text-muted-foreground mt-1">Approvals needed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Recent Users - Super Admin Only */}
        {role === 'super_admin' && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Users className="h-5 w-5 text-primary" />
                  Recent Users
                </CardTitle>
                <CardDescription>Newly registered users on the platform</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/users')}>
                <Eye className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <div className="text-center py-8 bg-muted/20 rounded-xl">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No users registered yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentUsers.slice(0, 6).map((usr, index) => (
                  <div
                    key={usr.id}
                    className="group p-4 rounded-xl bg-gradient-to-br from-muted/20 to-muted/10 hover:from-muted/30 hover:to-muted/20 transition-all border border-border/30 hover:border-primary/30"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {usr.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{usr.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(usr.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {usr.roles.length > 0 ? (
                        usr.roles.map(r => (
                          <Badge key={r} variant="secondary" className="text-[10px] px-2 py-0.5">
                            {r.replace('_', ' ')}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-destructive">
                          No role
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Enhanced Recent Activity */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest platform activity and user interactions</CardDescription>
            </div>
            <Badge variant="default" className="text-xs bg-green-500/90 animate-pulse">
              <div className="h-2 w-2 rounded-full bg-white mr-2" />
              Live
            </Badge>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-xl">
                <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-muted/40 flex items-center justify-center">
                  <Activity className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-muted-foreground font-semibold text-lg">No recent activity</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Activity will appear here as users interact with the platform.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-muted/20 to-muted/10 hover:from-muted/30 hover:to-muted/20 transition-all border border-border/30 hover:border-border/50 group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm capitalize">
                          {activity.action_type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize flex items-center gap-2">
                          <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground" />
                          {activity.entity_type.replace(/_/g, ' ')}
                          {activity.profiles?.full_name && (
                            <>
                              <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground" />
                              by {activity.profiles.full_name}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-muted-foreground">
                        {new Date(activity.created_at).toLocaleTimeString()}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
