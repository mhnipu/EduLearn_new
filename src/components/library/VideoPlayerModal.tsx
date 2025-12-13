import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VideoPlayer, detectVideoType, getVideoThumbnail } from '@/components/library/VideoPlayer';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Video {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  thumbnail_url: string | null;
  category_id: string | null;
  tags: string[] | null;
  duration_minutes: number | null;
  view_count: number;
}

interface VideoPlayerModalProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
}

export function VideoPlayerModal({ video, isOpen, onClose }: VideoPlayerModalProps) {
  if (!video) return null;

  const videoType = detectVideoType(video.youtube_url);
  const thumbnailUrl = video.thumbnail_url || getVideoThumbnail(video.youtube_url, videoType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full p-0 gap-0 [&>button.absolute]:hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold line-clamp-2 pr-4">
              {video.title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="p-6">
          <div className="mb-4">
            <VideoPlayer
              url={video.youtube_url}
              title={video.title}
              thumbnailUrl={thumbnailUrl}
              type={videoType}
            />
          </div>
          
          {video.description && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {video.description}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
