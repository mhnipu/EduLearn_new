import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, Video, Download, ExternalLink, FileText, 
  Clock, Eye, Library, Lock, Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
        <Loader2 className="h-8 w-8 animate-spin text-orange-600 dark:text-orange-400" />
      </div>
    );
  }

  const hasResources = books.length > 0 || videos.length > 0;

  // Show resources even if not enrolled (but with message)
  if (!hasResources) {
    return (
      <Card className="shadow-lg bg-card hover:shadow-xl transition-all duration-300">
        <CardContent className="flex flex-col items-center justify-center py-16 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
            <Library className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2 text-foreground">No Resources Available</h3>
          <p className="text-orange-700 dark:text-orange-300 font-medium text-center max-w-md">
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
        <Card className="bg-orange-50 dark:bg-orange-900/20 shadow-md hover:shadow-lg transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300 font-medium">
              <Lock className="h-4 w-4" />
              <span>Enroll in this course to access all resources</span>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Books */}
      {books.length > 0 && (
        <Card className="shadow-lg bg-card hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <BookOpen className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Reading Materials ({books.length})
            </CardTitle>
            <CardDescription className="text-orange-600 dark:text-orange-400">Books and documents for this course</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => (
                <Card 
                  key={book.id} 
                  className={cn(
                    "overflow-hidden shadow-md bg-card",
                    "hover:shadow-2xl hover:scale-105 transition-all duration-300"
                  )}
                >
                  <div className="aspect-[3/4] bg-orange-50 dark:bg-orange-900/20 relative">
                    {book.thumbnail_url ? (
                      <img 
                        src={book.thumbnail_url} 
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-orange-600/10">
                        <FileText className="h-12 w-12 text-orange-600/50 dark:text-orange-400/50" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-sm line-clamp-2 text-foreground">{book.title}</h4>
                    {book.author && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">{book.author}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {book.page_count && (
                        <Badge variant="secondary" className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-0">
                          {book.page_count} pages
                        </Badge>
                      )}
                    </div>
                    {isEnrolled ? (
                      <Button 
                        asChild 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-3 border-0 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:scale-105 hover:shadow-lg transition-all duration-200"
                      >
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
        <Card className="shadow-lg bg-card hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <Video className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              Video Resources ({videos.length})
            </CardTitle>
            <CardDescription className="text-orange-600 dark:text-orange-400">Additional video content for this course</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <Card 
                  key={video.id} 
                  className={cn(
                    "overflow-hidden shadow-md bg-card",
                    "hover:shadow-2xl hover:scale-105 transition-all duration-300"
                  )}
                >
                  <div className="aspect-video bg-orange-50 dark:bg-orange-900/20 relative">
                    {video.thumbnail_url ? (
                      <img 
                        src={video.thumbnail_url} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-orange-600/10">
                        <Video className="h-12 w-12 text-orange-600/50 dark:text-orange-400/50" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-sm line-clamp-2 text-foreground">{video.title}</h4>
                    <div className="flex items-center gap-2 mt-3">
                      {video.duration_minutes && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-0">
                          <Clock className="h-3 w-3" />
                          {video.duration_minutes} min
                        </Badge>
                      )}
                    </div>
                    {isEnrolled ? (
                      <Button 
                        asChild 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-3 border-0 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:scale-105 hover:shadow-lg transition-all duration-200"
                      >
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
