import { useState, useEffect } from 'react';
import { VideoPlayer, detectVideoType, getVideoThumbnail } from '@/components/library/VideoPlayer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Video, AlertCircle, ExternalLink } from 'lucide-react';

interface SmartVideoPlayerProps {
  url: string;
  title: string;
  customThumbnail?: string;
  resumeTime?: number;
  onProgress?: (currentTime: number, duration: number) => void;
  onComplete?: () => void;
  className?: string;
}

// Validate YouTube URL
const isValidYouTubeUrl = (url: string): boolean => {
  if (!url) return false;
  const patterns = [
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
    /^(https?:\/\/)?(m\.youtube\.com)\/.+$/,
    /^(https?:\/\/)?(music\.youtube\.com)\/.+$/,
  ];
  return patterns.some(pattern => pattern.test(url));
};

// Validate Vimeo URL
const isValidVimeoUrl = (url: string): boolean => {
  if (!url) return false;
  return /^(https?:\/\/)?(www\.)?(vimeo\.com|player\.vimeo\.com)\/.+$/.test(url);
};

// Validate direct video URL
const isValidDirectVideoUrl = (url: string): boolean => {
  if (!url) return false;
  const videoExtensions = /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i;
  return videoExtensions.test(url) || url.includes('storage.googleapis.com') || url.includes('supabase');
};

// Extract YouTube video ID for thumbnail
const getYouTubeVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/watch\?.+&v=)([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
};

export function SmartVideoPlayer({
  url,
  title,
  customThumbnail,
  resumeTime = 0,
  onProgress,
  onComplete,
  className = '',
}: SmartVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnail, setThumbnail] = useState<string | null>(customThumbnail || null);
  const [videoType, setVideoType] = useState<'youtube' | 'vimeo' | 'direct' | 'invalid'>('invalid');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setVideoType('invalid');
      setError('No video URL provided');
      return;
    }

    // Detect video type
    if (isValidYouTubeUrl(url)) {
      setVideoType('youtube');
      setError(null);
      // Auto-fetch YouTube thumbnail if no custom one
      if (!customThumbnail) {
        const videoId = getYouTubeVideoId(url);
        if (videoId) {
          // Try high quality first, fall back to default
          const img = new Image();
          img.onload = () => setThumbnail(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
          img.onerror = () => setThumbnail(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
          img.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
      }
    } else if (isValidVimeoUrl(url)) {
      setVideoType('vimeo');
      setError(null);
    } else if (isValidDirectVideoUrl(url)) {
      setVideoType('direct');
      setError(null);
    } else if (url.startsWith('http')) {
      // Try as direct video even if extension doesn't match
      setVideoType('direct');
      setError(null);
    } else {
      setVideoType('invalid');
      setError('Invalid video URL format');
    }
  }, [url, customThumbnail]);

  const handleProgress = (currentTime: number, duration: number) => {
    onProgress?.(currentTime, duration);
    // Auto-complete at 90%
    if (duration > 0 && currentTime / duration >= 0.9) {
      onComplete?.();
    }
  };

  // Invalid URL state
  if (videoType === 'invalid' || error) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="flex flex-col items-center justify-center aspect-video bg-muted p-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground font-medium mb-2">Unable to load video</p>
          <p className="text-sm text-muted-foreground">{error || 'Invalid video URL'}</p>
          {url && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => window.open(url, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Link Externally
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Thumbnail preview state (before playing)
  if (!isPlaying && thumbnail && videoType !== 'youtube' && videoType !== 'vimeo') {
    return (
      <div className={`relative aspect-video rounded-lg overflow-hidden cursor-pointer group ${className}`} onClick={() => setIsPlaying(true)}>
        <img
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
          <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Play className="h-8 w-8 text-primary-foreground ml-1" fill="currentColor" />
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-white font-medium truncate drop-shadow-lg">{title}</p>
        </div>
      </div>
    );
  }

  // Render the actual video player
  return (
    <div className={className}>
      <VideoPlayer
        url={url}
        title={title}
        thumbnailUrl={thumbnail || undefined}
        type={videoType as 'youtube' | 'vimeo' | 'direct'}
        resumeTime={resumeTime}
        onProgress={handleProgress}
      />
    </div>
  );
}

// Helper component for video URL input with validation feedback
export function VideoUrlInput({
  value,
  onChange,
  placeholder = 'Enter YouTube, Vimeo, or direct video URL',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [validationType, setValidationType] = useState<'valid' | 'invalid' | 'empty'>('empty');

  useEffect(() => {
    if (!value) {
      setValidationType('empty');
    } else if (isValidYouTubeUrl(value) || isValidVimeoUrl(value) || isValidDirectVideoUrl(value)) {
      setValidationType('valid');
    } else {
      setValidationType('invalid');
    }
  }, [value]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 bg-background ${
            validationType === 'valid'
              ? 'border-green-500 focus:ring-green-500/20'
              : validationType === 'invalid'
              ? 'border-destructive focus:ring-destructive/20'
              : 'border-input focus:ring-primary/20'
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {validationType === 'valid' && <Video className="h-4 w-4 text-green-500" />}
          {validationType === 'invalid' && <AlertCircle className="h-4 w-4 text-destructive" />}
        </div>
      </div>
      {validationType === 'valid' && (
        <p className="text-xs text-green-600">
          {isValidYouTubeUrl(value) ? 'YouTube' : isValidVimeoUrl(value) ? 'Vimeo' : 'Direct'} video detected
        </p>
      )}
      {validationType === 'invalid' && value && (
        <p className="text-xs text-destructive">Enter a valid YouTube, Vimeo, or direct video URL</p>
      )}
    </div>
  );
}
