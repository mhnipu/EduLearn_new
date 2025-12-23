import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Video, Search, Upload, Download, Eye, Bookmark, Clock, Play, FileText, Edit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EditBookDialog } from '@/components/library/EditBookDialog';
import { EditVideoDialog } from '@/components/library/EditVideoDialog';
import { VideoPlayerModal } from '@/components/library/VideoPlayerModal';
import { BackButton } from '@/components/BackButton';
import { cn } from '@/lib/utils';

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
  const { user, role, hasPermission } = useAuth();
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
    
    // RLS policies will automatically filter books based on permissions
    // Only books with explicit permission will be visible
    // Super Admin sees all, others see only what they have permission for
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
    
    if (error) {
      console.error('Error fetching books:', error);
      setBooks([]);
    } else {
      setBooks(data || []);
    }
    
    setLoading(false);
  };

  const fetchVideos = async () => {
    setLoading(true);
    
    // RLS policies will automatically filter videos based on permissions
    // Only videos with explicit permission will be visible
    // Super Admin sees all, others see only what they have permission for
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
    
    if (error) {
      console.error('Error fetching videos:', error);
      setVideos([]);
    } else {
      setVideos(data || []);
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

  // Check if user has permission to upload/create library content
  const canUpload = role === 'super_admin' || hasPermission('library', 'create');
  const canEdit = role === 'super_admin' || hasPermission('library', 'update');

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton 
              fallbackPath="/dashboard"
              fallbackLabel="Back to Dashboard"
              size="icon"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                Smart E-Library
              </h1>
              <p className="text-orange-600 dark:text-orange-400 mt-1 font-medium">
                {role === 'student' 
                  ? 'Access books and videos granted by administrators'
                  : role === 'teacher'
                  ? 'Access books and videos granted by administrators'
                  : role === 'admin'
                  ? 'Access books and videos based on your permissions'
                  : 'Explore books, videos, and learning materials'}
              </p>
            </div>
          </div>
          {canUpload && (
            <Button 
              onClick={() => navigate('/library/upload')}
              className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Content
            </Button>
          )}
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-600 dark:text-orange-400 h-5 w-5" />
            <Input
              placeholder="Search books, videos, authors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-orange-200 dark:border-orange-800 focus:border-orange-500 dark:focus:border-orange-500"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[200px] border-orange-200 dark:border-orange-800">
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
          <TabsList className="grid w-full md:w-[400px] grid-cols-2 bg-orange-100 dark:bg-orange-900/30 p-1 rounded-lg border border-orange-200 dark:border-orange-800">
            <TabsTrigger 
              value="books"
              className="text-orange-700 dark:text-orange-300 data-[state=active]:bg-orange-600 dark:data-[state=active]:bg-orange-500 data-[state=active]:text-white font-semibold transition-all"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Books ({books.length})
            </TabsTrigger>
            <TabsTrigger 
              value="videos"
              className="text-orange-700 dark:text-orange-300 data-[state=active]:bg-orange-600 dark:data-[state=active]:bg-orange-500 data-[state=active]:text-white font-semibold transition-all"
            >
              <Video className="mr-2 h-4 w-4" />
              Videos ({videos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="books" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600 dark:text-orange-400" />
              </div>
            ) : books.length === 0 ? (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardContent className="py-16 text-center bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No books found</h3>
                  <p className="text-orange-700 dark:text-orange-300 font-medium">
                    {searchQuery || selectedCategory !== 'all'
                      ? "Try adjusting your search or filter criteria"
                      : "No books available yet. Check back soon!"}
                  </p>
                </CardContent>
              </Card>
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
                    {canEdit && (
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

          <TabsContent value="videos" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-orange-600 dark:text-orange-400" />
              </div>
            ) : videos.length === 0 ? (
              <Card className="border-orange-200 dark:border-orange-800">
                <CardContent className="py-16 text-center bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                    <Video className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No videos found</h3>
                  <p className="text-orange-700 dark:text-orange-300 font-medium">
                    {searchQuery || selectedCategory !== 'all'
                      ? "Try adjusting your search or filter criteria"
                      : "No videos available yet. Check back soon!"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => {
                const videoType = detectVideoType(video.youtube_url);
                const thumbnailUrl = video.thumbnail_url || getVideoThumbnail(video.youtube_url, videoType);
                
                return (
                  <Card 
                    key={video.id} 
                    className={cn(
                      "border-orange-200 dark:border-orange-800 hover:border-orange-500 dark:hover:border-orange-500",
                      "hover:shadow-xl transition-all duration-300 group"
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div 
                        className="aspect-video mb-4 rounded-md overflow-hidden bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 relative cursor-pointer"
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
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              <div className="w-12 h-12 rounded-full bg-orange-600/90 dark:bg-orange-500/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Play className="h-6 w-6 text-white ml-1" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-12 w-12 text-orange-600 dark:text-orange-400" />
                          </div>
                        )}
                        {video.duration_minutes && (
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">
                            {video.duration_minutes} min
                          </div>
                        )}
                      </div>
                      <CardTitle className="line-clamp-2 text-base group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{video.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <p className="text-sm text-foreground/80 line-clamp-2 mb-3">
                        {video.description}
                      </p>
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {video.tags?.slice(0, 2).map((tag) => (
                          <Badge 
                            key={tag} 
                            variant="secondary" 
                            className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-orange-700 dark:text-orange-300">
                        <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30 font-medium">
                          <Eye className="h-3.5 w-3.5" />
                          {video.view_count || 0}
                        </span>
                        {video.duration_minutes && (
                          <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30 font-medium">
                            <Clock className="h-3.5 w-3.5" />
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
                        className="flex-1 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
                        size="sm"
                      >
                        Watch
                      </Button>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-orange-300 dark:border-orange-700 hover:border-orange-500 dark:hover:border-orange-500 text-orange-700 dark:text-orange-300"
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
                        className="h-8 w-8 border-orange-300 dark:border-orange-700 hover:border-orange-500 dark:hover:border-orange-500 text-orange-700 dark:text-orange-300"
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
    </div>
  );
}
