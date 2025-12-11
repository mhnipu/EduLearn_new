import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Target, Users, Award, Clock, BookOpen } from 'lucide-react';
import { RatingBreakdown } from '@/components/StarRating';

interface Lesson {
  id: string;
  title: string;
}

interface CourseOverviewProps {
  course: {
    description: string | null;
    difficulty: string | null;
    estimated_duration_minutes: number | null;
  };
  lessons: Lesson[];
  totalItems: number;
  enrollmentCount: number;
  averageRating: number;
  totalRatings: number;
  ratingBreakdown: { [key: number]: number };
  instructorName?: string;
}

export function CourseOverview({
  course,
  lessons,
  totalItems,
  enrollmentCount,
  averageRating,
  totalRatings,
  ratingBreakdown,
  instructorName,
}: CourseOverviewProps) {
  // Generate learning objectives from lessons
  const learningObjectives = lessons.slice(0, 6).map(l => l.title);
  
  // Prerequisites based on difficulty
  const getPrerequisites = () => {
    switch (course.difficulty) {
      case 'beginner':
        return ['No prior experience required', 'Basic computer skills'];
      case 'intermediate':
        return ['Basic understanding of the subject', 'Completed beginner courses'];
      case 'advanced':
        return ['Strong foundational knowledge', 'Prior practical experience recommended'];
      default:
        return ['No specific prerequisites'];
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* What You'll Learn */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              What You'll Learn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {learningObjectives.map((objective, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm">{objective}</span>
                </li>
              ))}
              {lessons.length > 6 && (
                <li className="text-muted-foreground pl-8 text-sm">
                  + {lessons.length - 6} more topics
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Course Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Course Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-primary">{totalItems}</p>
                <p className="text-xs text-muted-foreground">Total Lessons</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-primary">{enrollmentCount}</p>
                <p className="text-xs text-muted-foreground">Students</p>
              </div>
            </div>
            {averageRating > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3 text-sm">Rating Distribution</h4>
                <RatingBreakdown ratings={ratingBreakdown} totalRatings={totalRatings} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Prerequisites */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prerequisites</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {getPrerequisites().map((prereq, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {prereq}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Course Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Course Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {course.difficulty && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Difficulty</span>
                <Badge variant="outline" className="capitalize">{course.difficulty}</Badge>
              </div>
            )}
            {course.estimated_duration_minutes && course.estimated_duration_minutes > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {Math.round(course.estimated_duration_minutes / 60)} hours
                </span>
              </div>
            )}
            {instructorName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Instructor</span>
                <span className="text-sm font-medium">{instructorName}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Certificate</span>
              <Badge variant="secondary" className="text-xs">
                <Award className="h-3 w-3 mr-1" />
                On Completion
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
