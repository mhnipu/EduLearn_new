import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Video, Search, Upload, Download, Eye, Bookmark, Clock, Play, FileText, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { EditBookDialog } from '@/components/library/EditBookDialog';
import { EditVideoDialog } from '@/components/library/EditVideoDialog';
import { VideoPlayerModal } from '@/components/library/VideoPlayerModal';

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface Book {
  id: string;
  title: string;
  description: string | null;
  author: string | null;
  thumbnail_url: string | null;
  category_id: string | null;
  tags: string[] | null;
  download_count: number;
  view_count: number;
  file_size_mb: number | null;
  page_count: number | null;
  is_active: boolean;
}

interface VideoItem {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  thumbnail_url: string | null;
  category_id: string | null;
  tags: string[] | null;
  view_count: number;
  duration_minutes: number | null;
  is_active: boolean;
}

import { detectVideoType, getVideoThumbnail } from '@/components/library/VideoPlayer';

export default function Library() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isEditBookOpen, setIsEditBookOpen] = useState(false);
  const [isEditVideoOpen, setIsEditVideoOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchBooks();
    fetchVideos();
  }, [selectedCategory, searchQuery]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchBooks = async () => {
    setLoading(true);
    
    // For students, show only books assigned to their enrolled courses
    if (role === 'student' && user) {
      // Get enrolled courses
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user.id);
      
      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map(e => e.course_id);
        
        // Get books assigned to enrolled courses
        const { data: bookLinks } = await supabase
          .from('course_library_books')
          .select('book_id')
          .in('course_id', courseIds);
        
        if (bookLinks && bookLinks.length > 0) {
          const bookIds = bookLinks.map(l => l.book_id);
          console.log('📚 Student: Fetching books from enrolled courses. Book IDs:', bookIds);
          
          let query = supabase
            .from('books')
            .select('*')
            .eq('is_active', true)
            .in('id', bookIds);
          
          if (selectedCategory !== 'all') {
            query = query.eq('category_id', selectedCategory);
          }
          
          if (searchQuery) {
            query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
          }
          
          const { data, error } = await query.order('created_at', { ascending: false });
          
          if (error) {
            console.error('❌ Error fetching books for student:', error);
            console.error('Error details:', {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
            setBooks([]);
          } else {
            console.log('✅ Student: Fetched books:', data?.length || 0);
            setBooks(data || []);
          }
        } else {
          console.log('ℹ️ Student: No book links found for enrolled courses');
          setBooks([]);
        }
      } else {
        setBooks([]);
      }
    } else {
      // For admins/teachers, show all books
      let query = supabase
        .from('books')
        .select('*')
        .eq('is_active', true);

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (!error && data) {
        setBooks(data);
      }
    }
    
    setLoading(false);
  };

  const fetchVideos = async () => {
    setLoading(true);
    
    // For students, show only videos assigned to their enrolled courses
    if (role === 'student' && user) {
      // Get enrolled courses
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user.id);
      
      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map(e => e.course_id);
        
        // Get videos assigned to enrolled courses
        const { data: videoLinks } = await supabase
          .from('course_library_videos')
          .select('video_id')
          .in('course_id', courseIds);
        
        if (videoLinks && videoLinks.length > 0) {
          const videoIds = videoLinks.map(l => l.video_id);
          console.log('🎥 Student: Fetching videos from enrolled courses. Video IDs:', videoIds);
          
          let query = supabase
            .from('videos')
            .select('*')
            .eq('is_active', true)
            .in('id', videoIds);
          
          if (selectedCategory !== 'all') {
            query = query.eq('category_id', selectedCategory);
          }
          
          if (searchQuery) {
            query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
          }
          
          const { data, error } = await query.order('created_at', { ascending: false });
          
          if (error) {
            console.error('❌ Error fetching videos for student:', error);
            console.error('Error details:', {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint
            });
            setVideos([]);
          } else {
            console.log('✅ Student: Fetched videos:', data?.length || 0);
            setVideos(data || []);
          }
        } else {
          console.log('ℹ️ Student: No video links found for enrolled courses');
          setVideos([]);
        }
      } else {
        setVideos([]);
      }
    } else {
      // For admins/teachers, show all videos
      let query = supabase
        .from('videos')
        .select('*')
        .eq('is_active', true);

      if (selectedCategory !== 'all') {
        query = query.eq('category_id', selectedCategory);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (!error && data) {
        setVideos(data);
      }
    }
    
    setLoading(false);
  };

  const handleBookmark = async (contentType: 'book' | 'video', contentId: string) => {
    if (!user) {
      toast({ title: 'Please login to bookmark', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: user.id,
        content_type: contentType,
        content_id: contentId
      });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already bookmarked!' });
      } else {
        toast({ title: 'Failed to bookmark', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Bookmarked successfully!' });
    }
  };

  const canUpload = role === 'admin' || role === 'super_admin';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Smart E-Library</h1>
          <p className="text-muted-foreground">
            {role === 'student' 
              ? 'Access books and videos from your enrolled courses'
              : 'Explore books, videos, and learning materials'}
          </p>
        </div>
        {canUpload && (
          <Button onClick={() => navigate('/library/upload')}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Content
          </Button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search books, videos, authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs for Books and Videos */}
      <Tabs defaultValue="books" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="books">
            <BookOpen className="mr-2 h-4 w-4" />
            Books ({books.length})
          </TabsTrigger>
          <TabsTrigger value="videos">
            <Video className="mr-2 h-4 w-4" />
            Videos ({videos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="books" className="mt-6">
          {loading ? (
            <div className="text-center py-12">Loading books...</div>
          ) : books.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No books found</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {books.map((book) => (
                <Card key={book.id} className="hover:shadow-lg transition-shadow group">
                  <CardHeader className="pb-3">
                    <div className="aspect-[3/4] mb-4 rounded-md overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border relative">
                      {book.thumbnail_url ? (
                        <img 
                          src={book.thumbnail_url} 
                          alt={book.title} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                          <FileText className="h-12 w-12 text-primary/60 mb-2" />
                          <p className="text-xs font-medium text-foreground/80 line-clamp-2">{book.title}</p>
                        </div>
                      )}
                    </div>
                    <CardTitle className="line-clamp-2 text-base">{book.title}</CardTitle>
                    {book.author && (
                      <CardDescription className="text-sm">by {book.author}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {book.description}
                    </p>
                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {book.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {book.view_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                        {book.download_count || 0}
                      </span>
                      {book.file_size_mb && (
                        <span className="text-xs">
                          {book.file_size_mb.toFixed(1)} MB
                        </span>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2 pt-0">
                    <Button 
                      onClick={() => navigate(`/library/book/${book.id}`)}
                      className="flex-1"
                      size="sm"
                    >
                      View
                    </Button>
                    {canUpload && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBook(book);
                          setIsEditBookOpen(true);
                        }}
                        title="Edit book"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleBookmark('book', book.id)}
                    >
                      <Bookmark className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
          {loading ? (
            <div className="text-center py-12">Loading videos...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No videos found</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => {
                const videoType = detectVideoType(video.youtube_url);
                const thumbnailUrl = video.thumbnail_url || getVideoThumbnail(video.youtube_url, videoType);
                
                return (
                  <Card key={video.id} className="hover:shadow-lg transition-shadow group">
                    <CardHeader className="pb-3">
                      <div 
                        className="aspect-video mb-4 rounded-md overflow-hidden bg-muted relative cursor-pointer"
                        onClick={() => {
                          setPlayingVideo(video);
                          setIsVideoPlayerOpen(true);
                        }}
                      >
                        {thumbnailUrl ? (
                          <>
                            <img 
                              src={thumbnailUrl} 
                              alt={video.title} 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Play className="h-6 w-6 text-primary-foreground ml-1" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        {video.duration_minutes && (
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                            {video.duration_minutes} min
                          </div>
                        )}
                      </div>
                      <CardTitle className="line-clamp-2 text-base">{video.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {video.description}
                      </p>
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {video.tags?.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {video.view_count || 0}
                        </span>
                        {video.duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {video.duration_minutes} min
                          </span>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2 pt-0">
                      <Button 
                        onClick={() => {
                          setPlayingVideo(video);
                          setIsVideoPlayerOpen(true);
                        }}
                        className="flex-1"
                        size="sm"
                      >
                        Watch
                      </Button>
                      {canUpload && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVideo(video);
                            setIsEditVideoOpen(true);
                          }}
                          title="Edit video"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleBookmark('video', video.id)}
                      >
                        <Bookmark className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialogs */}
      <EditBookDialog
        book={selectedBook}
        isOpen={isEditBookOpen}
        onClose={() => {
          setIsEditBookOpen(false);
          setSelectedBook(null);
        }}
        onSuccess={() => {
          fetchBooks();
        }}
      />

      <EditVideoDialog
        video={selectedVideo}
        isOpen={isEditVideoOpen}
        onClose={() => {
          setIsEditVideoOpen(false);
          setSelectedVideo(null);
        }}
        onSuccess={() => {
          fetchVideos();
        }}
      />

      {/* Video Player Modal */}
      <VideoPlayerModal
        video={playingVideo}
        isOpen={isVideoPlayerOpen}
        onClose={() => {
          setIsVideoPlayerOpen(false);
          setPlayingVideo(null);
        }}
      />
    </div>
  );
}
