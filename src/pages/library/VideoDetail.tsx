import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Star, MessageCircle, Loader2, Clock, Eye, Play, ExternalLink } from 'lucide-react';
import { VideoPlayer, detectVideoType, getVideoThumbnail } from '@/components/library/VideoPlayer';
import { useVideoProgress } from '@/hooks/useVideoProgress';

interface VideoItem {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  thumbnail_url: string | null;
  tags: string[];
  view_count: number;
  duration_minutes: number;
  created_at: string;
}

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

export default function VideoDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const { saveProgress, resumeTime, progress: savedProgress } = useVideoProgress(id || '');

  useEffect(() => {
    if (id) {
      fetchVideo();
      fetchComments();
      fetchRatings();
    }
  }, [id]);

  useEffect(() => {
    if (video && user && id) {
      trackView();
    }
  }, [video, user, id]);

  const fetchVideo = async () => {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      toast({ title: 'Video not found', variant: 'destructive' });
      navigate('/library');
      return;
    }

    setVideo(data);
    setLoading(false);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('content_type', 'video')
      .eq('content_id', id)
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

  const fetchRatings = async () => {
    const { data: allRatings } = await supabase
      .from('ratings')
      .select('rating')
      .eq('content_type', 'video')
      .eq('content_id', id);

    if (allRatings && allRatings.length > 0) {
      const avg = allRatings.reduce((acc, r) => acc + r.rating, 0) / allRatings.length;
      setAverageRating(avg);
    }

    if (user) {
      const { data: userRatingData } = await supabase
        .from('ratings')
        .select('rating')
        .eq('content_type', 'video')
        .eq('content_id', id)
        .eq('user_id', user.id)
        .single();

      if (userRatingData) setUserRating(userRatingData.rating);
    }
  };

  const trackView = async () => {
    if (!user || !id || !video) return;

    await supabase
      .from('recently_viewed')
      .upsert({
        user_id: user.id,
        content_type: 'video',
        content_id: id,
        viewed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,content_type,content_id' });

    await supabase
      .from('videos')
      .update({ view_count: (video.view_count || 0) + 1 })
      .eq('id', id);
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
        content_type: 'video',
        content_id: id!,
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
      content_type: 'video',
      content_id: id!,
      comment_text: newComment,
    });

    if (!error) {
      setNewComment('');
      fetchComments();
      toast({ title: 'Comment posted!' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!video) return null;

  const videoType = detectVideoType(video.youtube_url);
  const thumbnailUrl = video.thumbnail_url || getVideoThumbnail(video.youtube_url, videoType);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Button variant="ghost" onClick={() => navigate('/library')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Library
      </Button>

      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            {/* Video Player */}
            <div className="mb-6">
              <VideoPlayer
                url={video.youtube_url}
                title={video.title}
                thumbnailUrl={thumbnailUrl}
                type={videoType}
                resumeTime={resumeTime}
                onProgress={saveProgress}
              />
              {savedProgress && savedProgress.progress_percentage > 0 && savedProgress.progress_percentage < 95 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Resume from {Math.round(savedProgress.progress_percentage)}% progress
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{video.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {video.view_count || 0} views
                    </span>
                    {video.duration_minutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {video.duration_minutes} minutes
                      </span>
                    )}
                    <Badge variant="outline" className="capitalize">
                      {videoType === 'direct' ? 'Video File' : videoType}
                    </Badge>
                  </div>
                </div>

                {(videoType === 'youtube' || videoType === 'vimeo') && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(video.youtube_url, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open on {videoType === 'youtube' ? 'YouTube' : 'Vimeo'}
                  </Button>
                )}
              </div>

              {video.description && (
                <p className="text-muted-foreground">{video.description}</p>
              )}

              {video.tags && video.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {video.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Rate this video</h3>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRating(star)}
                      className="transition-colors"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= userRating ? 'fill-primary text-primary' : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                  {averageRating > 0 && (
                    <span className="ml-4 text-sm text-muted-foreground">
                      Average: {averageRating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Comments ({comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleComment}>Post Comment</Button>
              </div>
            )}

            <div className="space-y-4 mt-6">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No comments yet. Be the first to comment!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border-l-2 pl-4">
                    <p className="font-semibold text-sm">{comment.profiles?.full_name || 'User'}</p>
                    <p className="text-sm text-muted-foreground">{comment.comment_text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
