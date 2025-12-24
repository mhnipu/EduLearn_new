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
import { cn } from '@/lib/utils';

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
        <Card className="shadow-lg bg-card hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Star className="h-5 w-5 text-orange-600 dark:text-orange-400 fill-orange-500" />
              Course Rating
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-orange-700 dark:text-orange-300">{averageRating.toFixed(1)}</p>
              <div className="flex justify-center mt-2">
                <StarRating rating={averageRating} size="lg" />
              </div>
              <p className="text-sm text-orange-600 dark:text-orange-400 font-medium mt-2">{totalRatings} ratings</p>
            </div>
            
            <div className="pt-4 border-t border-border/50">
              <RatingBreakdown ratings={ratingBreakdown} totalRatings={totalRatings} />
            </div>
          </CardContent>
        </Card>

        {/* Rate This Course */}
        {isLoggedIn && (
          <Card className="shadow-lg bg-card hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-base text-orange-700 dark:text-orange-300">Rate this Course</CardTitle>
              <CardDescription className="text-orange-600 dark:text-orange-400">Share your experience</CardDescription>
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
                <p className="text-center text-sm text-orange-600 dark:text-orange-400 font-medium">
                  Your rating: {userRating}/5
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reviews List */}
      <div className="lg:col-span-2">
        <Card className="shadow-lg bg-card hover:shadow-xl hover:scale-[1.01] transition-all duration-300">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <MessageCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                Reviews ({comments.length})
              </CardTitle>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] border-0 bg-muted hover:bg-muted/80 transition-colors">
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
              <div className="space-y-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                <Textarea
                  placeholder="Write your review..."
                  value={newComment}
                  onChange={(e) => onCommentChange(e.target.value)}
                  rows={3}
                  className="resize-none border-0 bg-background focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 transition-all"
                />
                <div className="flex justify-end">
                  <Button 
                    onClick={onSubmitComment} 
                    disabled={!newComment.trim()}
                    className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
                  >
                    Post Review
                  </Button>
                </div>
              </div>
            )}

            {/* Reviews */}
            <ScrollArea className="h-[500px] pr-4">
              {sortedComments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="h-12 w-12 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <p className="text-orange-700 dark:text-orange-300 font-medium">No reviews yet. Be the first to share your experience!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedComments.map((comment) => (
                    <div 
                      key={comment.id} 
                      className={cn(
                        "p-4 rounded-lg bg-card shadow-sm",
                        "hover:shadow-lg hover:scale-[1.01] hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-all duration-200"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-semibold">
                            {getInitials(comment.profiles?.full_name || 'User')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-sm text-foreground">
                              {comment.profiles?.full_name || 'Anonymous'}
                            </p>
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                              {new Date(comment.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{comment.comment_text}</p>
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
