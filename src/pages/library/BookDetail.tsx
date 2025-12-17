import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Download, BookOpen, ArrowLeft, Star, MessageCircle, Loader2, FileText, ExternalLink, Eye } from 'lucide-react';
import { PDFViewer } from '@/components/library/PDFViewer';
import { BackButton } from '@/components/BackButton';

interface Book {
  id: string;
  title: string;
  description: string;
  author: string;
  pdf_url: string;
  thumbnail_url: string | null;
  tags: string[];
  download_count: number;
  view_count: number;
  file_size_mb: number;
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

export default function BookDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [book, setBook] = useState<Book | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userRating, setUserRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('reader');

  useEffect(() => {
    if (id) {
      fetchBook();
      fetchComments();
      fetchRatings();
    }
  }, [id]);

  useEffect(() => {
    if (book && user && id) {
      trackView();
    }
  }, [book, user, id]);

  const fetchBook = async () => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      toast({ title: 'Book not found', variant: 'destructive' });
      navigate('/library');
      return;
    }

    setBook(data);
    setLoading(false);
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('content_type', 'book')
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
      .eq('content_type', 'book')
      .eq('content_id', id);

    if (allRatings && allRatings.length > 0) {
      const avg = allRatings.reduce((acc, r) => acc + r.rating, 0) / allRatings.length;
      setAverageRating(avg);
    }

    if (user) {
      const { data: userRatingData } = await supabase
        .from('ratings')
        .select('rating')
        .eq('content_type', 'book')
        .eq('content_id', id)
        .eq('user_id', user.id)
        .single();

      if (userRatingData) setUserRating(userRatingData.rating);
    }
  };

  const trackView = async () => {
    if (!user || !id || !book) return;

    await supabase
      .from('recently_viewed')
      .upsert({
        user_id: user.id,
        content_type: 'book',
        content_id: id,
        viewed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,content_type,content_id' });

    await supabase
      .from('books')
      .update({ view_count: (book.view_count || 0) + 1 })
      .eq('id', id);
  };

  const handleDownload = async () => {
    if (!book) return;

    setDownloading(true);
    
    try {
      await supabase
        .from('books')
        .update({ download_count: (book.download_count || 0) + 1 })
        .eq('id', id!);

      if (user) {
        await supabase.from('learning_progress').upsert({
          student_id: user.id,
          content_type: 'book',
          content_id: id!,
          progress_percentage: 100,
          completed: true,
          completed_at: new Date().toISOString(),
        });
      }

      const response = await fetch(book.pdf_url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${book.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({ title: 'Download started!' });
    } catch (error) {
      console.error('Download error:', error);
      window.open(book.pdf_url, '_blank');
      toast({ title: 'Opening PDF in new tab...' });
    } finally {
      setDownloading(false);
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
        content_type: 'book',
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
      content_type: 'book',
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

  if (!book) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <BackButton 
        label="Back to Library"
        fallbackPath="/library"
        className="mb-6"
      />

      {/* Book Header */}
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        {/* Thumbnail */}
        <div className="w-full md:w-48 shrink-0">
          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border">
            {book.thumbnail_url ? (
              <img 
                src={book.thumbnail_url} 
                alt={book.title} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                <FileText className="h-12 w-12 text-primary/60 mb-2" />
                <p className="text-xs font-medium text-foreground/80 line-clamp-2">{book.title}</p>
              </div>
            )}
          </div>
        </div>

        {/* Book Info */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{book.title}</h1>
            {book.author && (
              <p className="text-lg text-muted-foreground">by {book.author}</p>
            )}
          </div>

          {book.description && (
            <p className="text-muted-foreground">{book.description}</p>
          )}

          {book.tags && book.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {book.tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {book.view_count || 0} views
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              {book.download_count || 0} downloads
            </span>
            {book.file_size_mb && (
              <span>{book.file_size_mb.toFixed(2)} MB</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleDownload} disabled={downloading}>
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download PDF
            </Button>
            <Button variant="outline" onClick={() => window.open(book.pdf_url, '_blank')}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in New Tab
            </Button>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Rate:</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                className="transition-colors"
              >
                <Star
                  className={`h-5 w-5 ${
                    star <= userRating ? 'fill-primary text-primary' : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
            {averageRating > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">
                ({averageRating.toFixed(1)} avg)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs for Reader and Comments */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reader">
            <BookOpen className="mr-2 h-4 w-4" />
            Read Book
          </TabsTrigger>
          <TabsTrigger value="comments">
            <MessageCircle className="mr-2 h-4 w-4" />
            Comments ({comments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reader" className="mt-4">
          <PDFViewer 
            url={book.pdf_url} 
            title={book.title}
            onDownload={handleDownload}
          />
        </TabsContent>

        <TabsContent value="comments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
