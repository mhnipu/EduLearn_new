import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Star, Users, Clock, Award, ArrowLeft 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface CourseHeaderProps {
  course: {
    title: string;
    description: string | null;
    difficulty: string | null;
    estimated_duration_minutes: number | null;
  };
  categories: Category[];
  averageRating: number;
  totalRatings: number;
  enrollmentCount: number;
  isEnrolled: boolean;
  progressPercentage: number;
  completedCount: number;
  totalItems: number;
  instructorName?: string;
}

export function CourseHeader({
  course,
  categories,
  averageRating,
  totalRatings,
  enrollmentCount,
  isEnrolled,
  progressPercentage,
  completedCount,
  totalItems,
  instructorName,
}: CourseHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="relative bg-gradient-to-br from-primary/10 via-background to-background">
      <div className="container mx-auto px-4 py-8">
        <Button onClick={() => navigate('/courses')} variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Courses
        </Button>

        <div className="space-y-6">
          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Badge key={cat.id} variant="secondary" className="px-3 py-1">
                  {cat.icon} {cat.name}
                </Badge>
              ))}
            </div>
          )}

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">{course.title}</h1>
          
          <p className="text-lg text-muted-foreground max-w-3xl">{course.description}</p>

          {/* Instructor */}
          {instructorName && (
            <p className="text-sm text-muted-foreground">
              Created by <span className="text-primary font-medium">{instructorName}</span>
            </p>
          )}

          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-4 md:gap-6 text-sm">
            {averageRating > 0 && (
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-chart-2 text-chart-2" />
                <span className="font-semibold">{averageRating.toFixed(1)}</span>
                <span className="text-muted-foreground">({totalRatings} ratings)</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{enrollmentCount} enrolled</span>
            </div>
            {course.estimated_duration_minutes && course.estimated_duration_minutes > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{Math.round(course.estimated_duration_minutes / 60)}h total</span>
              </div>
            )}
            {course.difficulty && (
              <Badge variant="outline" className="capitalize">
                {course.difficulty}
              </Badge>
            )}
          </div>

          {/* Progress Bar for enrolled */}
          {isEnrolled && totalItems > 0 && (
            <div className="bg-card rounded-lg p-4 border max-w-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your Progress</span>
                <span className="text-sm text-muted-foreground">{completedCount}/{totalItems} completed</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              {progressPercentage === 100 && (
                <div className="flex items-center gap-2 mt-2 text-chart-1">
                  <Award className="h-4 w-4" />
                  <span className="text-sm font-medium">Course Completed!</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
