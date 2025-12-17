import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Star, ThumbsUp, Filter } from 'lucide-react';
import { StarRating, RatingBreakdown } from '@/components/StarRating';

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  profiles: { full_name: string };
}

interface CourseReviewsProps {
  userRating: number;
  averageRating: number;
  totalRatings: number;
  ratingBreakdown: { [key: number]: number };
  comments: Comment[];
  newComment: string;
  isLoggedIn: boolean;
  onRatingChange: (rating: number) => void;
  onCommentChange: (comment: string) => void;
  onSubmitComment: () => void;
}

export function CourseReviews({
  userRating,
  averageRating,
  totalRatings,
  ratingBreakdown,
  comments,
  newComment,
  isLoggedIn,
  onRatingChange,
  onCommentChange,
  onSubmitComment,
}: CourseReviewsProps) {
  const [sortBy, setSortBy] = useState('newest');
  const [filterBy, setFilterBy] = useState('all');

  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Rating Summary */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-chart-2" />
              Course Rating
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-foreground">{averageRating.toFixed(1)}</p>
              <div className="flex justify-center mt-2">
                <StarRating rating={averageRating} size="lg" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">{totalRatings} ratings</p>
            </div>
            
            <div className="pt-4 border-t">
              <RatingBreakdown ratings={ratingBreakdown} totalRatings={totalRatings} />
            </div>
          </CardContent>
        </Card>

        {/* Rate This Course */}
        {isLoggedIn && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rate this Course</CardTitle>
              <CardDescription>Share your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center">
                <StarRating
                  rating={userRating}
                  size="lg"
                  interactive
                  onRatingChange={onRatingChange}
                />
              </div>
              {userRating > 0 && (
                <p className="text-center text-sm text-muted-foreground">
                  Your rating: {userRating}/5
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reviews List */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Reviews ({comments.length})
              </CardTitle>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Write a Review */}
            {isLoggedIn && (
              <div className="space-y-3 p-4 bg-course-detail/50 rounded-lg">
                <Textarea
                  placeholder="Write your review..."
                  value={newComment}
                  onChange={(e) => onCommentChange(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button onClick={onSubmitComment} disabled={!newComment.trim()}>
                    Post Review
                  </Button>
                </div>
              </div>
            )}

            {/* Reviews */}
            <ScrollArea className="h-[500px] pr-4">
              {sortedComments.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedComments.map((comment) => (
                    <div key={comment.id} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(comment.profiles?.full_name || 'User')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium text-sm">
                              {comment.profiles?.full_name || 'Anonymous'}
                            </p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">{comment.comment_text}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
