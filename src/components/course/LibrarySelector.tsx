import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Book, Video, Search, Plus, X, Play, Grid, List, Filter } from 'lucide-react';

interface LibraryBook {
  id: string;
  title: string;
  author: string | null;
  thumbnail_url: string | null;
  pdf_url: string;
  category_id: string | null;
}

interface LibraryVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  youtube_url: string;
  duration_minutes: number | null;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface LibrarySelectorProps {
  selectedBooks: string[];
  selectedVideos: string[];
  onBooksChange: (bookIds: string[]) => void;
  onVideosChange: (videoIds: string[]) => void;
  disabled?: boolean;
}

// YouTube thumbnail extraction
const getYouTubeThumbnail = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg`;
  }
  return null;
};

export function LibrarySelector({
  selectedBooks,
  selectedVideos,
  onBooksChange,
  onVideosChange,
  disabled = false,
}: LibrarySelectorProps) {
  const [open, setOpen] = useState(false);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bookSearch, setBookSearch] = useState('');
  const [videoSearch, setVideoSearch] = useState('');
  const [bookCategory, setBookCategory] = useState<string>('all');
  const [videoCategory, setVideoCategory] = useState<string>('all');
  const [bookViewMode, setBookViewMode] = useState<'grid' | 'list'>('list');
  const [videoViewMode, setVideoViewMode] = useState<'grid' | 'list'>('list');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchLibraryItems();
    }
  }, [open]);

  const fetchLibraryItems = async () => {
    setLoading(true);
    try {
      const [booksResult, videosResult, categoriesResult] = await Promise.all([
        supabase.from('books').select('id, title, author, thumbnail_url, pdf_url, category_id').eq('is_active', true),
        supabase.from('videos').select('id, title, thumbnail_url, youtube_url, duration_minutes, category_id').eq('is_active', true),
        supabase.from('categories').select('id, name').order('name'),
      ]);

      if (booksResult.data) setBooks(booksResult.data);
      if (videosResult.data) setVideos(videosResult.data);
      if (categoriesResult.data) setCategories(categoriesResult.data);
    } catch (error) {
      console.error('Error fetching library items:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBook = (bookId: string) => {
    if (selectedBooks.includes(bookId)) {
      onBooksChange(selectedBooks.filter((id) => id !== bookId));
    } else {
      onBooksChange([...selectedBooks, bookId]);
    }
  };

  const toggleVideo = (videoId: string) => {
    if (selectedVideos.includes(videoId)) {
      onVideosChange(selectedVideos.filter((id) => id !== videoId));
    } else {
      onVideosChange([...selectedVideos, videoId]);
    }
  };

  const selectAllBooks = () => {
    const filteredIds = filteredBooks.map((b) => b.id);
    onBooksChange([...new Set([...selectedBooks, ...filteredIds])]);
  };

  const selectAllVideos = () => {
    const filteredIds = filteredVideos.map((v) => v.id);
    onVideosChange([...new Set([...selectedVideos, ...filteredIds])]);
  };

  const filteredBooks = books.filter((book) => {
    const matchesSearch = book.title.toLowerCase().includes(bookSearch.toLowerCase()) ||
      book.author?.toLowerCase().includes(bookSearch.toLowerCase());
    const matchesCategory = bookCategory === 'all' || book.category_id === bookCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.title.toLowerCase().includes(videoSearch.toLowerCase());
    const matchesCategory = videoCategory === 'all' || video.category_id === videoCategory;
    return matchesSearch && matchesCategory;
  });

  const selectedBookItems = books.filter((b) => selectedBooks.includes(b.id));
  const selectedVideoItems = videos.filter((v) => selectedVideos.includes(v.id));

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories.find((c) => c.id === categoryId)?.name;
  };

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" disabled={disabled} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Attach Library Items
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Select Library Items</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="books" className="mt-4">
            <TabsList 
              className="grid w-full grid-cols-2"
            >
              <TabsTrigger value="books" className="flex items-center gap-2">
                <Book className="h-4 w-4" />
                Books ({selectedBooks.length} selected)
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Videos ({selectedVideos.length} selected)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="books" className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search books..."
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={bookCategory} onValueChange={setBookCategory}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ToggleGroup type="single" value={bookViewMode} onValueChange={(v) => v && setBookViewMode(v as 'grid' | 'list')}>
                  <ToggleGroupItem value="list" aria-label="List view">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="grid" aria-label="Grid view">
                    <Grid className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{filteredBooks.length} books found</span>
                <Button variant="ghost" size="sm" onClick={selectAllBooks}>
                  Select All Visible
                </Button>
              </div>
              
              <ScrollArea className="h-[350px] pr-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : filteredBooks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No books found
                  </div>
                ) : bookViewMode === 'list' ? (
                  <div className="space-y-2">
                    {filteredBooks.map((book) => {
                      const isSelected = selectedBooks.includes(book.id);
                      return (
                        <div
                          key={book.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => toggleBook(book.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleBook(book.id)}
                          />
                          <div className="w-12 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                            {book.thumbnail_url ? (
                              <img
                                src={book.thumbnail_url}
                                alt={book.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Book className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{book.title}</p>
                            {book.author && (
                              <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                            )}
                            {getCategoryName(book.category_id) && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {getCategoryName(book.category_id)}
                              </Badge>
                            )}
                          </div>
                          {isSelected && (
                            <Badge variant="default" className="flex-shrink-0">Selected</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredBooks.map((book) => {
                      const isSelected = selectedBooks.includes(book.id);
                      return (
                        <div
                          key={book.id}
                          className={`relative p-2 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => toggleBook(book.id)}
                        >
                          <div className="aspect-[3/4] bg-muted rounded overflow-hidden mb-2">
                            {book.thumbnail_url ? (
                              <img
                                src={book.thumbnail_url}
                                alt={book.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Book className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-medium truncate">{book.title}</p>
                          {book.author && (
                            <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                          )}
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                              <X className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="videos" className="space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search videos..."
                    value={videoSearch}
                    onChange={(e) => setVideoSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={videoCategory} onValueChange={setVideoCategory}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <ToggleGroup type="single" value={videoViewMode} onValueChange={(v) => v && setVideoViewMode(v as 'grid' | 'list')}>
                  <ToggleGroupItem value="list" aria-label="List view">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="grid" aria-label="Grid view">
                    <Grid className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{filteredVideos.length} videos found</span>
                <Button variant="ghost" size="sm" onClick={selectAllVideos}>
                  Select All Visible
                </Button>
              </div>
              
              <ScrollArea className="h-[350px] pr-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : filteredVideos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No videos found
                  </div>
                ) : videoViewMode === 'list' ? (
                  <div className="space-y-2">
                    {filteredVideos.map((video) => {
                      const thumbnail = video.thumbnail_url || getYouTubeThumbnail(video.youtube_url);
                      const isSelected = selectedVideos.includes(video.id);
                      return (
                        <div
                          key={video.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => toggleVideo(video.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleVideo(video.id)}
                          />
                          <div className="w-20 h-12 bg-muted rounded overflow-hidden flex-shrink-0 relative">
                            {thumbnail ? (
                              <img
                                src={thumbnail}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Video className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Play className="h-4 w-4 text-white" fill="white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{video.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {video.duration_minutes && (
                                <span className="text-sm text-muted-foreground">
                                  {video.duration_minutes} min
                                </span>
                              )}
                              {getCategoryName(video.category_id) && (
                                <Badge variant="outline" className="text-xs">
                                  {getCategoryName(video.category_id)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <Badge variant="default" className="flex-shrink-0">Selected</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredVideos.map((video) => {
                      const thumbnail = video.thumbnail_url || getYouTubeThumbnail(video.youtube_url);
                      const isSelected = selectedVideos.includes(video.id);
                      return (
                        <div
                          key={video.id}
                          className={`relative p-2 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => toggleVideo(video.id)}
                        >
                          <div className="aspect-video bg-muted rounded overflow-hidden mb-2 relative">
                            {thumbnail ? (
                              <img
                                src={thumbnail}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Video className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Play className="h-6 w-6 text-white" fill="white" />
                            </div>
                            {video.duration_minutes && (
                              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                                {video.duration_minutes}m
                              </div>
                            )}
                          </div>
                          <p className="text-sm font-medium truncate">{video.title}</p>
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                              <X className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedBooks.length} books, {selectedVideos.length} videos selected
            </p>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Display selected items */}
      {(selectedBookItems.length > 0 || selectedVideoItems.length > 0) && (
        <div className="space-y-3">
          {selectedBookItems.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Book className="h-4 w-4" />
                Attached Books ({selectedBookItems.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedBookItems.map((book) => (
                  <div
                    key={book.id}
                    className="flex items-center gap-2 bg-muted rounded-lg p-2 pr-3"
                  >
                    <div className="w-8 h-10 bg-background rounded overflow-hidden flex-shrink-0">
                      {book.thumbnail_url ? (
                        <img
                          src={book.thumbnail_url}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Book className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium truncate max-w-[150px]">{book.title}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleBook(book.id)}
                      disabled={disabled}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedVideoItems.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2">
                <Video className="h-4 w-4" />
                Attached Videos ({selectedVideoItems.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedVideoItems.map((video) => {
                  const thumbnail = video.thumbnail_url || getYouTubeThumbnail(video.youtube_url);
                  return (
                    <div
                      key={video.id}
                      className="flex items-center gap-2 bg-muted rounded-lg p-2 pr-3"
                    >
                      <div className="w-12 h-8 bg-background rounded overflow-hidden flex-shrink-0">
                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium truncate max-w-[150px]">{video.title}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleVideo(video.id)}
                        disabled={disabled}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
