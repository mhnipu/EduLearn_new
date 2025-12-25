import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Search, Filter, Star, Users, Clock, User, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { StarRating } from '@/components/StarRating';
import { BackButton } from '@/components/BackButton';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
  difficulty?: string;
  instructor_id?: string | null;
  instructor_name?: string | null;
  estimated_duration_minutes?: number;
  categories?: Category[];
  averageRating?: number;
  totalRatings?: number;
  enrollmentCount?: number;
}

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner': return 'bg-chart-2/10 text-chart-2 border-chart-2/30';
    case 'intermediate': return 'bg-chart-4/10 text-chart-4 border-chart-4/30';
    case 'advanced': return 'bg-destructive/10 text-destructive border-destructive/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchCategories();
    fetchCourses();
  }, [user, navigate]);

  useEffect(() => {
    filterAndSortCourses();
  }, [searchQuery, selectedCategory, selectedDifficulty, sortBy, courses]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (data) {
      setCategories(data);
    }
  };

  const fetchCourses = async () => {
    setLoading(true);
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/81561616-f42a-458a-bfc3-302d8c75cd9a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Courses.tsx:fetchCourses',message:'Fetching courses',data:{userId:user?.id,role},timestamp:Date.now(),sessionId:'debug-session',runId:'visibility-fix',hypothesisId:'N'})}).catch(()=>{});
    // #endregion
    
    // Fetch courses - RLS should filter to only assigned/enrolled courses
    const { data: coursesData, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/81561616-f42a-458a-bfc3-302d8c75cd9a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Courses.tsx:fetchCourses',message:'Courses fetch result',data:{coursesCount:coursesData?.length || 0,courseIds:coursesData?.map(c=>c.id) || [],error:error?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'visibility-fix',hypothesisId:'N'})}).catch(()=>{});
    // #endregion

    if (error) {
      console.error('Error fetching courses:', error);
      setLoading(false);
      return;
    }

    if (!coursesData) {
      setCourses([]);
      setFilteredCourses([]);
      setLoading(false);
      return;
    }

    // Fetch course categories
    const { data: courseCategories } = await supabase
      .from('course_categories')
      .select('course_id, category_id');

    // Fetch ratings for courses
    const { data: ratingsData } = await supabase
      .from('ratings')
      .select('content_id, rating')
      .eq('content_type', 'course');

    // Fetch enrollment counts
    const { data: enrollmentsData } = await supabase
      .from('course_enrollments')
      .select('course_id');

    // Fetch all categories for mapping
    const { data: allCategories } = await supabase
      .from('categories')
      .select('*');

    // Fetch instructor profiles
    const instructorIds = coursesData
      .map((c) => (c as any).instructor_id)
      .filter(Boolean);
    
    let instructorProfiles: Record<string, string> = {};
    if (instructorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', instructorIds);
      
      if (profiles) {
        instructorProfiles = profiles.reduce((acc, p) => {
          acc[p.id] = p.full_name || 'Unknown';
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Process courses with additional data
    const enrichedCourses = coursesData.map((course) => {
      // Get categories for this course
      const courseCatIds = courseCategories
        ?.filter((cc) => cc.course_id === course.id)
        .map((cc) => cc.category_id) || [];
      const courseCategs = allCategories?.filter((cat) => courseCatIds.includes(cat.id)) || [];

      // Calculate average rating
      const courseRatings = ratingsData?.filter((r) => r.content_id === course.id) || [];
      const averageRating = courseRatings.length > 0
        ? courseRatings.reduce((sum, r) => sum + r.rating, 0) / courseRatings.length
        : 0;

      // Count enrollments
      const enrollmentCount = enrollmentsData?.filter((e) => e.course_id === course.id).length || 0;

      const instructorId = (course as any).instructor_id;

      return {
        ...course,
        difficulty: (course as any).difficulty || 'beginner',
        instructor_id: instructorId,
        instructor_name: instructorId ? instructorProfiles[instructorId] : null,
        estimated_duration_minutes: (course as any).estimated_duration_minutes || 0,
        categories: courseCategs,
        averageRating,
        totalRatings: courseRatings.length,
        enrollmentCount,
      };
    });

    setCourses(enrichedCourses);
    setFilteredCourses(enrichedCourses);
    setLoading(false);
  };

  const filterAndSortCourses = () => {
    let filtered = [...courses];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(query) ||
          course.description?.toLowerCase().includes(query) ||
          course.categories?.some((cat) => cat.name.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((course) =>
        course.categories?.some((cat) => cat.id === selectedCategory)
      );
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter((course) => course.difficulty === selectedDifficulty);
    }

    // Sorting
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        break;
      case 'popular':
        filtered.sort((a, b) => (b.enrollmentCount || 0) - (a.enrollmentCount || 0));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    setFilteredCourses(filtered);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600 dark:text-orange-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton 
              fallbackPath="/dashboard"
              fallbackLabel="Back to Dashboard"
              size="icon"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                Explore Courses
              </h1>
              <p className="text-orange-600 dark:text-orange-400 mt-1 font-medium">
                Discover and learn from our collection of courses
              </p>
            </div>
          </div>
          {(role === 'admin' || role === 'super_admin') && (
            <Button 
              onClick={() => navigate('/admin/course-wizard')} 
              className="shrink-0 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          )}
        </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-600 dark:text-orange-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-0 bg-orange-50 dark:bg-orange-900/20 text-foreground placeholder:text-orange-600/60 dark:placeholder:text-orange-400/60 focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:bg-orange-100 dark:focus:bg-orange-900/30 transition-all"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[180px] border-0 bg-orange-50 dark:bg-orange-900/20 text-foreground hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
            <Filter className="mr-2 h-4 w-4 text-orange-600 dark:text-orange-400" />
            <SelectValue placeholder="Category" className="text-foreground" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
          <SelectTrigger className="w-full md:w-[160px] border-0 bg-orange-50 dark:bg-orange-900/20 text-foreground hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
            <SelectValue placeholder="Difficulty" className="text-foreground" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {DIFFICULTY_LEVELS.map((level) => (
              <SelectItem key={level} value={level} className="capitalize">
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full md:w-[180px] border-0 bg-orange-50 dark:bg-orange-900/20 text-foreground hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
            <SelectValue placeholder="Sort by" className="text-foreground" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
          Showing <span className="font-semibold text-orange-700 dark:text-orange-300">{filteredCourses.length}</span> of <span className="font-semibold text-orange-700 dark:text-orange-300">{courses.length}</span> courses
          {searchQuery && (
            <span className="ml-2">for "<span className="font-semibold">{searchQuery}</span>"</span>
          )}
        </p>
        {(selectedCategory !== 'all' || selectedDifficulty !== 'all') && (
          <div className="flex items-center gap-2">
            {(selectedCategory !== 'all' || selectedDifficulty !== 'all') && (
              <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-0">
                Filters active
              </Badge>
            )}
          </div>
        )}
      </div>

        {/* Courses Grid */}
        {filteredCourses.length === 0 ? (
          <Card className="shadow-lg bg-card hover:shadow-xl transition-all duration-300">
            <CardContent className="py-16 text-center bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">No courses found</h3>
              <p className="text-orange-700 dark:text-orange-300 font-medium text-center max-w-md">
                {searchQuery || selectedCategory !== 'all'
                  ? "Try adjusting your search or filter criteria"
                  : "No courses available yet. Check back soon!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className="shadow-md bg-card hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer group overflow-hidden"
              onClick={() => navigate(`/courses/${course.id}`)}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-orange-500/20 to-orange-600/10 relative overflow-hidden">
                {course.thumbnail_url ? (
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover object-center transition-transform group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center group-hover:from-orange-500/30 group-hover:to-orange-600/20 transition-colors">
                    <BookOpen className="h-12 w-12 text-orange-600 dark:text-orange-400" />
                  </div>
                )}
                
                {/* Categories overlay */}
                {course.categories && course.categories.length > 0 && (
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                    {course.categories.slice(0, 2).map((cat) => (
                      <Badge
                        key={cat.id}
                        variant="secondary"
                        className="bg-background/90 backdrop-blur-sm text-xs border-0"
                      >
                        {cat.icon} {cat.name}
                      </Badge>
                    ))}
                    {course.categories.length > 2 && (
                      <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-xs border-0">
                        +{course.categories.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Difficulty badge */}
                {course.difficulty && (
                  <Badge className={`absolute top-2 right-2 ${getDifficultyColor(course.difficulty)} text-xs capitalize border-0`}>
                    {course.difficulty}
                  </Badge>
                )}
              </div>

              <CardHeader className="pb-2">
                <CardTitle className="group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2">
                  {course.title}
                </CardTitle>
                <CardDescription className="line-clamp-2 text-foreground/70">
                  {course.description || 'No description available'}
                </CardDescription>
              </CardHeader>

              <CardContent className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {/* Star Rating */}
                  <div className="flex items-center gap-2">
                    <StarRating
                      rating={course.averageRating || 0}
                      size="sm"
                      showValue
                      totalRatings={course.totalRatings}
                    />
                  </div>
                  
                  {/* Duration & Enrollment */}
                  <div className="flex items-center gap-3 text-sm text-orange-700 dark:text-orange-300">
                    {course.estimated_duration_minutes && course.estimated_duration_minutes > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30 font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{Math.floor(course.estimated_duration_minutes / 60)}h {course.estimated_duration_minutes % 60}m</span>
                      </div>
                    )}
                    {course.enrollmentCount !== undefined && course.enrollmentCount > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30 font-medium">
                        <Users className="h-3.5 w-3.5" />
                        <span>{course.enrollmentCount}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Instructor */}
                {course.instructor_name && (
                  <div className="flex items-center gap-1.5 mt-2 text-sm text-orange-700 dark:text-orange-300">
                    <User className="h-3.5 w-3.5" />
                    <span className="font-medium">{course.instructor_name}</span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-2">
                <Button 
                  variant="outline" 
                  className="w-full bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border-0 text-orange-700 dark:text-orange-300 font-semibold hover:scale-105 hover:shadow-lg transition-all duration-200"
                >
                  View Course
                  <BookOpen className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
          </div>
        )}
      </div>
    </div>
  );
}