import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Star, Users, Clock, Award, ArrowLeft 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '@/components/BackButton';
import { cn } from '@/lib/utils';

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
    <div className="relative bg-gradient-to-br from-orange-500/10 via-background to-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <BackButton 
          fallbackPath="/courses"
          fallbackLabel="Back to Courses"
          variant="ghost"
          className="mb-6 text-orange-700 dark:text-orange-300 hover:text-orange-800 dark:hover:text-orange-200"
        />

        <div className="space-y-6">
          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Badge 
                  key={cat.id} 
                  variant="secondary" 
                  className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700"
                >
                  {cat.icon} {cat.name}
                </Badge>
              ))}
            </div>
          )}

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">{course.title}</h1>
          
          <p className="text-lg text-foreground/80 max-w-3xl leading-relaxed">{course.description}</p>

          {/* Instructor */}
          {instructorName && (
            <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
              Created by <span className="text-orange-600 dark:text-orange-400 font-semibold">{instructorName}</span>
            </p>
          )}

          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            {averageRating > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 shadow-sm">
                <Star className="h-5 w-5 fill-orange-500 text-orange-500" />
                <span className="font-semibold text-orange-700 dark:text-orange-300">{averageRating.toFixed(1)}</span>
                <span className="text-orange-600 dark:text-orange-400 text-sm">({totalRatings} ratings)</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 shadow-sm text-orange-700 dark:text-orange-300">
              <Users className="h-4 w-4" />
              <span className="font-medium">{enrollmentCount} enrolled</span>
            </div>
            {course.estimated_duration_minutes && course.estimated_duration_minutes > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 shadow-sm text-orange-700 dark:text-orange-300">
                <Clock className="h-4 w-4" />
                <span className="font-medium">{Math.round(course.estimated_duration_minutes / 60)}h total</span>
              </div>
            )}
            {course.difficulty && (
              <Badge 
                variant="outline" 
                className="capitalize bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700"
              >
                {course.difficulty}
              </Badge>
            )}
          </div>

          {/* Progress Bar for enrolled */}
          {isEnrolled && totalItems > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 shadow-sm max-w-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">Your Progress</span>
                <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">{completedCount}/{totalItems} completed</span>
              </div>
              <Progress 
                value={progressPercentage} 
                className="h-2.5 bg-orange-200 dark:bg-orange-800 [&>div]:bg-orange-600 [&>div]:dark:bg-orange-500" 
              />
              {progressPercentage === 100 && (
                <div className="flex items-center gap-2 mt-3 text-orange-600 dark:text-orange-400">
                  <Award className="h-5 w-5" />
                  <span className="text-sm font-semibold">Course Completed! 🎉</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
