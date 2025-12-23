import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, Edit, Play, CheckCircle, Clock, Share2, 
  GraduationCap, Settings, Users, BarChart3, Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CourseSidebarProps {
  course: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    max_capacity: number | null;
  };
  enrollmentCount: number;
  totalItems: number;
  isEnrolled: boolean;
  enrolling: boolean;
  isCourseFull: boolean;
  waitlistInfo: { isOnWaitlist: boolean; position: number | null };
  joiningWaitlist: boolean;
  role: string | null;
  onEnroll: () => void;
  onJoinWaitlist: () => void;
  onContinueLearning: () => void;
}

export function CourseSidebar({
  course,
  enrollmentCount,
  totalItems,
  isEnrolled,
  enrolling,
  isCourseFull,
  waitlistInfo,
  joiningWaitlist,
  role,
  onEnroll,
  onJoinWaitlist,
  onContinueLearning,
}: CourseSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: course.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Link copied to clipboard!' });
      }
    } catch (error) {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied to clipboard!' });
    }
  };

  const isInstructor = role === 'admin' || role === 'super_admin' || role === 'teacher';

  return (
    <Card className={cn(
      "sticky top-4 overflow-hidden border-orange-200 dark:border-orange-800",
      "hover:shadow-xl transition-all duration-300"
    )}>
      {course.thumbnail_url ? (
        <div className="relative">
          <img 
            src={course.thumbnail_url} 
            alt={course.title}
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
      ) : (
        <div className="w-full aspect-video bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center border-b border-orange-200 dark:border-orange-800">
          <GraduationCap className="h-16 w-16 text-orange-600/50 dark:text-orange-400/50" />
        </div>
      )}
      
      <CardContent className="p-6 space-y-4">
        {/* Student Actions */}
        {role === 'student' && !isEnrolled && !waitlistInfo.isOnWaitlist ? (
          isCourseFull ? (
            <div className="space-y-3">
              <div className="text-center p-3 bg-chart-1/10 rounded-lg border border-chart-1/30">
                <p className="text-chart-1 font-medium text-sm">Course is at full capacity</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {course.max_capacity} / {course.max_capacity} seats taken
                </p>
              </div>
              <Button onClick={onJoinWaitlist} disabled={joiningWaitlist} className="w-full" variant="secondary">
                <Clock className="mr-2 h-4 w-4" />
                {joiningWaitlist ? 'Joining...' : 'Join Waitlist'}
              </Button>
            </div>
          ) : (
            <Button onClick={onEnroll} disabled={enrolling} className="w-full" size="lg">
              <BookOpen className="mr-2 h-5 w-5" />
              {enrolling ? 'Enrolling...' : 'Enroll Now — Free'}
            </Button>
          )
        ) : waitlistInfo.isOnWaitlist ? (
          <div className="space-y-3">
            <div className="text-center p-3 bg-chart-4/10 rounded-lg border border-chart-4/30">
              <p className="text-chart-4 font-medium text-sm">You're on the waitlist</p>
              <p className="text-2xl font-bold text-chart-4 mt-1">#{waitlistInfo.position}</p>
              <p className="text-xs text-muted-foreground mt-1">
                We'll notify you when a spot opens up
              </p>
            </div>
          </div>
        ) : isEnrolled ? (
          <div className="space-y-3">
            <Badge className="w-full justify-center py-2 bg-chart-1/10 text-chart-1 border-chart-1/30">
              <CheckCircle className="mr-2 h-4 w-4" />
              Enrolled
            </Badge>
            <Button className="w-full" size="lg" onClick={onContinueLearning}>
              <Play className="mr-2 h-5 w-5" />
              Continue Learning
            </Button>
          </div>
        ) : null}

        {/* Instructor Actions */}
        {isInstructor && (
          <div className="space-y-2">
            <Button 
              onClick={() => navigate(`/admin/courses/${course.id}/edit`)} 
              variant="outline" 
              className="w-full border-orange-300 dark:border-orange-700 hover:border-orange-500 dark:hover:border-orange-500 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Course
            </Button>
            <Button 
              onClick={() => navigate(`/admin/courses/${course.id}/modules`)} 
              variant="outline" 
              className="w-full border-orange-300 dark:border-orange-700 hover:border-orange-500 dark:hover:border-orange-500 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30"
            >
              <Settings className="mr-2 h-4 w-4" />
              Manage Structure
            </Button>
            <Button 
              onClick={() => navigate(`/admin/courses/${course.id}/materials`)} 
              variant="outline" 
              className="w-full border-orange-300 dark:border-orange-700 hover:border-orange-500 dark:hover:border-orange-500 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Manage Materials
            </Button>
          </div>
        )}

        <Separator className="bg-orange-200 dark:bg-orange-800" />

        {/* Course Stats */}
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <span className="text-orange-700 dark:text-orange-300 flex items-center gap-2 font-medium">
              <BookOpen className="h-4 w-4" />
              Lessons
            </span>
            <span className="font-semibold text-orange-600 dark:text-orange-400">{totalItems}</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <span className="text-orange-700 dark:text-orange-300 flex items-center gap-2 font-medium">
              <Users className="h-4 w-4" />
              Students
            </span>
            <span className="font-semibold text-orange-600 dark:text-orange-400">
              {enrollmentCount}
              {course.max_capacity && (
                <span className="text-orange-500 dark:text-orange-400 font-normal"> / {course.max_capacity}</span>
              )}
            </span>
          </div>
          {course.max_capacity && (
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <span className="text-orange-700 dark:text-orange-300 flex items-center gap-2 font-medium">
                <BarChart3 className="h-4 w-4" />
                Availability
              </span>
              <span className={`font-semibold ${isCourseFull ? 'text-orange-600 dark:text-orange-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {isCourseFull ? 'Full' : `${course.max_capacity - enrollmentCount} spots left`}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 border-orange-300 dark:border-orange-700 hover:border-orange-500 dark:hover:border-orange-500 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30" 
            size="sm" 
            onClick={handleShare}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="border-orange-300 dark:border-orange-700 hover:border-orange-500 dark:hover:border-orange-500 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast({ title: 'Link copied!' });
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
