import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, Video, Download, ExternalLink, FileText, 
  Clock, Eye, Library, Lock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LibraryBook {
  id: string;
  title: string;
  author: string | null;
  thumbnail_url: string | null;
  pdf_url: string;
  page_count: number | null;
}

interface LibraryVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  youtube_url: string;
  duration_minutes: number | null;
}

interface CourseResourcesProps {
  courseId: string;
  isEnrolled: boolean;
}

export function CourseResources({ courseId, isEnrolled }: CourseResourcesProps) {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
  }, [courseId]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      // Fetch course library books
      const { data: bookLinks, error: bookLinksError } = await supabase
        .from('course_library_books')
        .select('book_id')
        .eq('course_id', courseId);

      if (bookLinksError) {
        console.error('Error fetching course library books:', bookLinksError);
      }

      if (bookLinks && bookLinks.length > 0) {
        const bookIds = bookLinks.map(l => l.book_id);
        console.log('📚 Fetching books for course:', courseId, 'Book IDs:', bookIds);
        
        const { data: booksData, error: booksError } = await supabase
          .from('books')
          .select('id, title, author, thumbnail_url, pdf_url, page_count, is_active')
          .in('id', bookIds)
          .eq('is_active', true);
        
        if (booksError) {
          console.error('❌ Error fetching books:', booksError);
          console.error('Error details:', {
            message: booksError.message,
            code: booksError.code,
            details: booksError.details,
            hint: booksError.hint
          });
          // Still set empty array to show "no resources" message
          setBooks([]);
        } else {
          console.log('✅ Fetched books:', booksData?.length || 0);
          setBooks(booksData || []);
        }
      } else {
        console.log('ℹ️ No book links found for course:', courseId);
        setBooks([]);
      }

      // Fetch course library videos
      const { data: videoLinks, error: videoLinksError } = await supabase
        .from('course_library_videos')
        .select('video_id')
        .eq('course_id', courseId);

      if (videoLinksError) {
        console.error('Error fetching course library videos:', videoLinksError);
      }

      if (videoLinks && videoLinks.length > 0) {
        const videoIds = videoLinks.map(l => l.video_id);
        console.log('🎥 Fetching videos for course:', courseId, 'Video IDs:', videoIds);
        
        const { data: videosData, error: videosError } = await supabase
          .from('videos')
          .select('id, title, thumbnail_url, youtube_url, duration_minutes, is_active')
          .in('id', videoIds)
          .eq('is_active', true);
        
        if (videosError) {
          console.error('❌ Error fetching videos:', videosError);
          console.error('Error details:', {
            message: videosError.message,
            code: videosError.code,
            details: videosError.details,
            hint: videosError.hint
          });
          // Still set empty array to show "no resources" message
          setVideos([]);
        } else {
          console.log('✅ Fetched videos:', videosData?.length || 0);
          setVideos(videosData || []);
        }
      } else {
        console.log('ℹ️ No video links found for course:', courseId);
        setVideos([]);
      }
    } catch (error) {
      console.error('Unexpected error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasResources = books.length > 0 || videos.length > 0;

  // Show resources even if not enrolled (but with message)
  if (!hasResources) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Library className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Resources Available</h3>
          <p className="text-muted-foreground text-center max-w-md">
            {isEnrolled 
              ? "This course doesn't have any additional resources attached yet. Check back later!"
              : "Please enroll in this course to access resources when they become available."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!isEnrolled && (
        <Card className="bg-course-detail/50 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <Lock className="h-4 w-4" />
              <span>Enroll in this course to access all resources</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Books */}
      {books.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Reading Materials ({books.length})
            </CardTitle>
            <CardDescription>Books and documents for this course</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => (
                <Card key={book.id} className="overflow-hidden">
                  <div className="aspect-[3/4] bg-course-detail relative">
                    {book.thumbnail_url ? (
                      <img 
                        src={book.thumbnail_url} 
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <FileText className="h-12 w-12 text-primary/50" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-sm line-clamp-2">{book.title}</h4>
                    {book.author && (
                      <p className="text-xs text-muted-foreground mt-1">{book.author}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {book.page_count && (
                        <Badge variant="secondary" className="text-xs">
                          {book.page_count} pages
                        </Badge>
                      )}
                    </div>
                    {isEnrolled ? (
                      <Button asChild variant="outline" size="sm" className="w-full mt-3">
                        <a href={book.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-3 w-3" />
                          Download
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full mt-3" disabled>
                        <Lock className="mr-2 h-3 w-3" />
                        Enroll to Download
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Video Resources ({videos.length})
            </CardTitle>
            <CardDescription>Additional video content for this course</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <Card key={video.id} className="overflow-hidden">
                  <div className="aspect-video bg-course-detail relative">
                    {video.thumbnail_url ? (
                      <img 
                        src={video.thumbnail_url} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Video className="h-12 w-12 text-primary/50" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-sm line-clamp-2">{video.title}</h4>
                    <div className="flex items-center gap-2 mt-3">
                      {video.duration_minutes && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {video.duration_minutes} min
                        </Badge>
                      )}
                    </div>
                    {isEnrolled ? (
                      <Button asChild variant="outline" size="sm" className="w-full mt-3">
                        <a href={video.youtube_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-3 w-3" />
                          Watch
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full mt-3" disabled>
                        <Lock className="mr-2 h-3 w-3" />
                        Enroll to Watch
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
