import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, BookOpen, MessageCircle, Users, BarChart3, Library, Loader2
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { CourseHeader } from '@/components/course/CourseHeader';
import { CourseSidebar } from '@/components/course/CourseSidebar';
import { CourseOverview } from '@/components/course/CourseOverview';
import { CourseCurriculum } from '@/components/course/CourseCurriculum';
import { CourseReviews } from '@/components/course/CourseReviews';
import { CourseResources } from '@/components/course/CourseResources';
import { EnrolledStudents } from '@/components/course/EnrolledStudents';
import { BackButton } from '@/components/BackButton';

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
  difficulty: string | null;
  estimated_duration_minutes: number | null;
  max_capacity: number | null;
  instructor_id: string | null;
}

interface WaitlistInfo {
  isOnWaitlist: boolean;
  position: number | null;
  status: string | null;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number | null;
}

interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  pdf_url: string | null;
  order_index: number;
  module_id: string | null;
}

interface CourseMaterial {
  id: string;
  title: string;
  material_type: string;
  video_url: string | null;
  pdf_url: string | null;
  duration_minutes: number | null;
  order_index: number;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  profiles: { full_name: string };
}

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [selectedItem, setSelectedItem] = useState<Lesson | CourseMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [instructorName, setInstructorName] = useState<string>('');
  
  // Ratings state
  const [userRating, setUserRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [ratingBreakdown, setRatingBreakdown] = useState<{ [key: number]: number }>({});
  
  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  
  // Active tab
  const [activeTab, setActiveTab] = useState('overview');
  
  // Waitlist state
  const [waitlistInfo, setWaitlistInfo] = useState<WaitlistInfo>({ isOnWaitlist: false, position: null, status: null });
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

  const isInstructor = role === 'admin' || role === 'super_admin' || role === 'teacher';

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchCourseData();
    fetchRatings();
    fetchCategories();
    fetchComments();
    fetchEnrollmentCount();
    fetchWaitlistStatus();
  }, [courseId, user, navigate]);

  const fetchCourseData = async () => {
    setLoading(true);

    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError) {
      console.error('Error fetching course:', courseError);
      setLoading(false);
      return;
    }

    setCourse(courseData);

    // Fetch instructor name
    if (courseData.instructor_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', courseData.instructor_id)
        .single();
      
      if (profile?.full_name) {
        setInstructorName(profile.full_name);
      }
    }

    // Fetch modules
    const { data: modulesData } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    setModules(modulesData || []);

    // Fetch lessons (with module_id)
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    setLessons(lessonsData || []);

    const { data: materialsData } = await supabase
      .from('course_materials')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    setMaterials(materialsData || []);

    const firstLesson = lessonsData?.[0];
    const firstMaterial = materialsData?.[0];
    setSelectedItem(firstLesson || firstMaterial || null);

    if (user && courseId) {
      // Use RPC function to check course access (includes enrollment and role-based access)
      const { data: hasAccess, error: accessError } = await supabase.rpc('has_course_access', {
        _user_id: user.id,
        _course_id: courseId,
      });

      if (!accessError && hasAccess === true) {
        setIsEnrolled(true);
      } else {
        // Fallback to direct enrollment check
        const { data: enrollment } = await supabase
          .from('course_enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();

        setIsEnrolled(!!enrollment);
      }

      const { data: progressData } = await supabase
        .from('learning_progress')
        .select('content_id')
        .eq('student_id', user.id)
        .eq('completed', true);

      if (progressData) {
        setCompletedLessons(new Set(progressData.map(p => p.content_id)));
      }
    }

    setLoading(false);
  };

  const fetchEnrollmentCount = async () => {
    const { count } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);
    
    setEnrollmentCount(count || 0);
  };

  const fetchWaitlistStatus = async () => {
    if (!user || !courseId) return;
    
    const { data: waitlistEntry } = await supabase
      .from('course_waitlist')
      .select('position, status')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .eq('status', 'waiting')
      .maybeSingle();

    if (waitlistEntry) {
      setWaitlistInfo({
        isOnWaitlist: true,
        position: waitlistEntry.position,
        status: waitlistEntry.status,
      });
    } else {
      setWaitlistInfo({ isOnWaitlist: false, position: null, status: null });
    }
  };

  const handleJoinWaitlist = async () => {
    if (!user || !courseId) return;
    setJoiningWaitlist(true);

    try {
      const { data: positionData } = await supabase.rpc('get_next_waitlist_position', { p_course_id: courseId });
      
      const { error } = await supabase
        .from('course_waitlist')
        .insert({
          course_id: courseId,
          user_id: user.id,
          position: positionData || 1,
          status: 'waiting',
        });

      if (error) throw error;

      toast({ title: 'You\'ve been added to the waitlist!' });
      fetchWaitlistStatus();
    } catch (error: any) {
      console.error('Waitlist error:', error);
      toast({ title: 'Failed to join waitlist', variant: 'destructive' });
    } finally {
      setJoiningWaitlist(false);
    }
  };

  const isCourseFull = course?.max_capacity ? enrollmentCount >= course.max_capacity : false;

  const fetchRatings = async () => {
    if (!courseId) return;

    const { data: allRatings } = await supabase
      .from('ratings')
      .select('rating')
      .eq('content_type', 'course')
      .eq('content_id', courseId);

    if (allRatings && allRatings.length > 0) {
      const avg = allRatings.reduce((acc, r) => acc + r.rating, 0) / allRatings.length;
      setAverageRating(avg);
      setTotalRatings(allRatings.length);

      const breakdown: { [key: number]: number } = {};
      allRatings.forEach((r) => {
        breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
      });
      setRatingBreakdown(breakdown);
    }

    if (user) {
      const { data: userRatingData } = await supabase
        .from('ratings')
        .select('rating')
        .eq('content_type', 'course')
        .eq('content_id', courseId)
        .eq('user_id', user.id)
        .single();

      if (userRatingData) setUserRating(userRatingData.rating);
    }
  };

  const fetchCategories = async () => {
    if (!courseId) return;

    const { data: courseCategories } = await supabase
      .from('course_categories')
      .select('category_id')
      .eq('course_id', courseId);

    if (courseCategories && courseCategories.length > 0) {
      const categoryIds = courseCategories.map((cc) => cc.category_id);
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .in('id', categoryIds);

      if (categoriesData) {
        setCategories(categoriesData);
      }
    }
  };

  const fetchComments = async () => {
    if (!courseId) return;

    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('content_type', 'course')
      .eq('content_id', courseId)
      .order('created_at', { ascending: false });

    if (data) {
      const commentsWithProfiles = await Promise.all(
        data.map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', comment.user_id)
            .single();
          return { ...comment, profiles: profile || { full_name: 'User' } };
        })
      );
      setComments(commentsWithProfiles);
    }
  };

  const handleRating = async (rating: number) => {
    if (!user) {
      toast({ title: 'Please login to rate', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('ratings')
      .upsert({
        user_id: user.id,
        content_type: 'course',
        content_id: courseId!,
        rating,
      });

    if (!error) {
      setUserRating(rating);
      fetchRatings();
      toast({ title: 'Rating submitted!' });
    }
  };

  const handleComment = async () => {
    if (!user) {
      toast({ title: 'Please login to comment', variant: 'destructive' });
      return;
    }

    if (!newComment.trim()) return;

    const { error } = await supabase.from('comments').insert({
      user_id: user.id,
      content_type: 'course',
      content_id: courseId!,
      comment_text: newComment,
    });

    if (!error) {
      setNewComment('');
      fetchComments();
      toast({ title: 'Comment posted!' });
    }
  };

  const handleEnroll = async () => {
    if (!user || !courseId) return;
    setEnrolling(true);

    try {
      const { error } = await supabase
        .from('course_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
        });

      if (error) throw error;

      await supabase.from('activity_feed').insert({
        user_id: user.id,
        action_type: 'enrolled',
        entity_type: 'course',
        entity_id: courseId,
      });

      setIsEnrolled(true);
      setEnrollmentCount(prev => prev + 1);
      toast({ title: 'Successfully enrolled in course!' });
    } catch (error) {
      console.error('Enrollment error:', error);
      toast({ title: 'Failed to enroll', variant: 'destructive' });
    } finally {
      setEnrolling(false);
    }
  };

  const markLessonComplete = async (lessonId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('learning_progress')
        .upsert({
          student_id: user.id,
          content_id: lessonId,
          content_type: 'video',
          completed: true,
          progress_percentage: 100,
        });

      if (error) throw error;

      setCompletedLessons(prev => new Set([...prev, lessonId]));
      toast({ title: 'Lesson marked as complete!' });

      const allLessonIds = [...lessons.map(l => l.id), ...materials.map(m => m.id)];
      const newCompleted = new Set([...completedLessons, lessonId]);
      const allComplete = allLessonIds.every(id => newCompleted.has(id));

      if (allComplete && allLessonIds.length > 0) {
        await supabase
          .from('course_enrollments')
          .update({ completed_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('course_id', courseId);

        await supabase.from('certificates').insert({
          user_id: user.id,
          course_id: courseId,
        });

        toast({ title: 'Congratulations! You completed the course!' });
      }
    } catch (error) {
      console.error('Error marking complete:', error);
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-orange-600 dark:text-orange-400" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-orange-200 dark:border-orange-800">
            <CardContent className="py-16 text-center bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Course not found</h3>
              <p className="text-orange-700 dark:text-orange-300 font-medium mb-4">The course you're looking for doesn't exist or has been removed.</p>
              <BackButton 
                fallbackPath="/courses"
                fallbackLabel="Back to Courses"
                variant="outline"
                className="bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 border-orange-300 dark:border-orange-700"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const allItems = [...lessons, ...materials];
  const totalItems = allItems.length;
  const completedCount = allItems.filter(item => completedLessons.has(item.id)).length;
  const progressPercentage = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <CourseHeader 
        course={course}
        categories={categories}
        averageRating={averageRating}
        totalRatings={totalRatings}
        enrollmentCount={enrollmentCount}
        isEnrolled={isEnrolled}
        progressPercentage={progressPercentage}
        completedCount={completedCount}
        totalItems={totalItems}
        instructorName={instructorName}
      />

      {/* Main Content */}
      <div className="bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList 
                  className={`grid w-full ${isInstructor ? 'grid-cols-5' : 'grid-cols-4'} bg-orange-100 dark:bg-orange-900/30 p-1 rounded-lg shadow-sm max-w-2xl`}
                >
                  <TabsTrigger 
                    value="overview" 
                    className="flex items-center gap-2 text-xs sm:text-sm text-orange-700 dark:text-orange-300 data-[state=active]:bg-orange-600 dark:data-[state=active]:bg-orange-500 data-[state=active]:text-white font-semibold transition-all"
                  >
                    <BarChart3 className="h-4 w-4 hidden sm:block" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger 
                    value="curriculum" 
                    className="flex items-center gap-2 text-xs sm:text-sm text-orange-700 dark:text-orange-300 data-[state=active]:bg-orange-600 dark:data-[state=active]:bg-orange-500 data-[state=active]:text-white font-semibold transition-all"
                  >
                    <BookOpen className="h-4 w-4 hidden sm:block" />
                    Curriculum
                  </TabsTrigger>
                  <TabsTrigger 
                    value="resources" 
                    className="flex items-center gap-2 text-xs sm:text-sm text-orange-700 dark:text-orange-300 data-[state=active]:bg-orange-600 dark:data-[state=active]:bg-orange-500 data-[state=active]:text-white font-semibold transition-all"
                  >
                    <Library className="h-4 w-4 hidden sm:block" />
                    Resources
                  </TabsTrigger>
                  <TabsTrigger 
                    value="reviews" 
                    className="flex items-center gap-2 text-xs sm:text-sm text-orange-700 dark:text-orange-300 data-[state=active]:bg-orange-600 dark:data-[state=active]:bg-orange-500 data-[state=active]:text-white font-semibold transition-all"
                  >
                    <MessageCircle className="h-4 w-4 hidden sm:block" />
                    Reviews
                  </TabsTrigger>
                  {isInstructor && (
                    <TabsTrigger 
                      value="students" 
                      className="flex items-center gap-2 text-xs sm:text-sm text-orange-700 dark:text-orange-300 data-[state=active]:bg-orange-600 dark:data-[state=active]:bg-orange-500 data-[state=active]:text-white font-semibold transition-all"
                    >
                      <Users className="h-4 w-4 hidden sm:block" />
                      Students
                    </TabsTrigger>
                  )}
                </TabsList>

              <TabsContent value="overview">
                <CourseOverview
                  course={course}
                  lessons={lessons}
                  totalItems={totalItems}
                  enrollmentCount={enrollmentCount}
                  averageRating={averageRating}
                  totalRatings={totalRatings}
                  ratingBreakdown={ratingBreakdown}
                  instructorName={instructorName}
                />
              </TabsContent>

              <TabsContent value="curriculum">
                <CourseCurriculum
                  modules={modules}
                  lessons={lessons}
                  materials={materials}
                  selectedItem={selectedItem}
                  completedLessons={completedLessons}
                  isEnrolled={isEnrolled}
                  onSelectItem={setSelectedItem}
                  onMarkComplete={markLessonComplete}
                  getYouTubeEmbedUrl={getYouTubeEmbedUrl}
                />
              </TabsContent>

              <TabsContent value="resources">
                <CourseResources courseId={course.id} isEnrolled={isEnrolled} />
              </TabsContent>

              <TabsContent value="reviews">
                <CourseReviews
                  userRating={userRating}
                  averageRating={averageRating}
                  totalRatings={totalRatings}
                  ratingBreakdown={ratingBreakdown}
                  comments={comments}
                  newComment={newComment}
                  isLoggedIn={!!user}
                  onRatingChange={handleRating}
                  onCommentChange={setNewComment}
                  onSubmitComment={handleComment}
                />
              </TabsContent>

              {isInstructor && (
                <TabsContent value="students">
                  <EnrolledStudents courseId={course.id} totalLessons={totalItems} />
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <CourseSidebar
              course={course}
              enrollmentCount={enrollmentCount}
              totalItems={totalItems}
              isEnrolled={isEnrolled}
              enrolling={enrolling}
              isCourseFull={isCourseFull}
              waitlistInfo={waitlistInfo}
              joiningWaitlist={joiningWaitlist}
              role={role}
              onEnroll={handleEnroll}
              onJoinWaitlist={handleJoinWaitlist}
              onContinueLearning={() => setActiveTab('curriculum')}
            />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
