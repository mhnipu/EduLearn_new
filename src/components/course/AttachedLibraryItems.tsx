import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Book, Video, ExternalLink, Download, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface AttachedBook {
  id: string;
  title: string;
  author: string | null;
  thumbnail_url: string | null;
  pdf_url: string;
}

export interface AttachedVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  youtube_url: string;
  duration_minutes: number | null;
}

interface AttachedLibraryItemsProps {
  books: AttachedBook[];
  videos: AttachedVideo[];
  showActions?: boolean;
}

const getYouTubeThumbnail = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg`;
  }
  return null;
};

export function AttachedLibraryItems({ books, videos, showActions = true }: AttachedLibraryItemsProps) {
  const navigate = useNavigate();

  if (books.length === 0 && videos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {books.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Book className="h-4 w-4 text-primary" />
            Course Books ({books.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {books.map((book) => (
              <Card key={book.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex gap-3">
                    <div className="w-16 h-20 bg-muted flex-shrink-0">
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
                    <div className="flex-1 py-2 pr-2 flex flex-col justify-between min-w-0">
                      <div>
                        <p className="font-medium text-sm truncate">{book.title}</p>
                        {book.author && (
                          <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                        )}
                      </div>
                      {showActions && (
                        <div className="flex gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => navigate(`/library/books/${book.id}`)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={() => window.open(book.pdf_url, '_blank')}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Course Videos ({videos.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {videos.map((video) => {
              const thumbnail = video.thumbnail_url || getYouTubeThumbnail(video.youtube_url);
              return (
                <Card key={video.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="relative aspect-video bg-muted">
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
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="secondary"
                          className="rounded-full"
                          onClick={() => navigate(`/library/videos/${video.id}`)}
                        >
                          <Play className="h-5 w-5" fill="currentColor" />
                        </Button>
                      </div>
                      {video.duration_minutes && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                          {video.duration_minutes} min
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm truncate">{video.title}</p>
                      {showActions && (
                        <Button
                          size="sm"
                          variant="link"
                          className="h-auto p-0 mt-1 text-xs"
                          onClick={() => navigate(`/library/videos/${video.id}`)}
                        >
                          Watch Video
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
