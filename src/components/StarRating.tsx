import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  showValue?: boolean;
  totalRatings?: number;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  interactive = false,
  onRatingChange,
  showValue = false,
  totalRatings,
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const handleClick = (starValue: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starValue);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: maxRating }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= rating;
          const isPartiallyFilled = starValue > rating && starValue - 1 < rating;
          const fillPercentage = isPartiallyFilled ? (rating - (starValue - 1)) * 100 : 0;

          return (
            <button
              key={index}
              type="button"
              disabled={!interactive}
              onClick={() => handleClick(starValue)}
              className={cn(
                'relative transition-transform',
                interactive && 'hover:scale-110 cursor-pointer',
                !interactive && 'cursor-default'
              )}
            >
              {/* Background star (empty) */}
              <Star className={cn(sizeClasses[size], 'text-muted-foreground/30')} />
              
              {/* Filled star (overlay) */}
              {(isFilled || isPartiallyFilled) && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: isFilled ? '100%' : `${fillPercentage}%` }}
                >
                  <Star
                    className={cn(
                      sizeClasses[size],
                      'fill-primary text-primary'
                    )}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {showValue && (
        <span className="text-sm text-muted-foreground ml-1">
          {rating.toFixed(1)}
          {totalRatings !== undefined && (
            <span className="ml-1">({totalRatings})</span>
          )}
        </span>
      )}
    </div>
  );
}

interface RatingBreakdownProps {
  ratings: { [key: number]: number };
  totalRatings: number;
}

export function RatingBreakdown({ ratings, totalRatings }: RatingBreakdownProps) {
  return (
    <div className="space-y-1">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = ratings[star] || 0;
        const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
        
        return (
          <div key={star} className="flex items-center gap-2 text-sm">
            <span className="w-3 text-muted-foreground">{star}</span>
            <Star className="h-3 w-3 fill-primary text-primary" />
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="w-8 text-muted-foreground text-right">{count}</span>
          </div>
        );
      })}
    </div>
  );
}