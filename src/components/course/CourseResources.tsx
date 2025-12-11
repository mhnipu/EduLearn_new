import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BookOpen, Video, Download, ExternalLink, FileText, 
  Clock, Eye, Library
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

    // Fetch course library books
    const { data: bookLinks } = await supabase
      .from('course_library_books')
      .select('book_id')
      .eq('course_id', courseId);

    if (bookLinks && bookLinks.length > 0) {
      const bookIds = bookLinks.map(l => l.book_id);
      const { data: booksData } = await supabase
        .from('books')
        .select('id, title, author, thumbnail_url, pdf_url, page_count')
        .in('id', bookIds);
      
      setBooks(booksData || []);
    }

    // Fetch course library videos
    const { data: videoLinks } = await supabase
      .from('course_library_videos')
      .select('video_id')
      .eq('course_id', courseId);

    if (videoLinks && videoLinks.length > 0) {
      const videoIds = videoLinks.map(l => l.video_id);
      const { data: videosData } = await supabase
        .from('videos')
        .select('id, title, thumbnail_url, youtube_url, duration_minutes')
        .in('id', videoIds);
      
      setVideos(videosData || []);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasResources = books.length > 0 || videos.length > 0;

  if (!hasResources) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Library className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Resources Available</h3>
          <p className="text-muted-foreground text-center max-w-md">
            This course doesn't have any additional resources attached yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
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
                  <div className="aspect-[3/4] bg-muted relative">
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
                    {isEnrolled && (
                      <Button asChild variant="outline" size="sm" className="w-full mt-3">
                        <a href={book.pdf_url} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 h-3 w-3" />
                          Download
                        </a>
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
                  <div className="aspect-video bg-muted relative">
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
                    {isEnrolled && (
                      <Button asChild variant="outline" size="sm" className="w-full mt-3">
                        <a href={video.youtube_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-3 w-3" />
                          Watch
                        </a>
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
