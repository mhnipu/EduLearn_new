import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface VideoProgressData {
  progress_percentage: number;
  last_position_seconds: number;
}

export function useVideoProgress(videoId: string) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<VideoProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch existing progress on mount
  useEffect(() => {
    if (!user || !videoId) {
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      const { data } = await supabase
        .from('learning_progress')
        .select('progress_percentage')
        .eq('student_id', user.id)
        .eq('content_id', videoId)
        .eq('content_type', 'video')
        .single();

      if (data) {
        // Store last position in localStorage for precise seeking
        const storedPosition = localStorage.getItem(`video_position_${videoId}`);
        setProgress({
          progress_percentage: data.progress_percentage || 0,
          last_position_seconds: storedPosition ? parseFloat(storedPosition) : 0,
        });
      }
      setLoading(false);
    };

    fetchProgress();
  }, [user, videoId]);

  // Save progress to database and localStorage
  const saveProgress = useCallback(
    async (currentTime: number, duration: number) => {
      if (!user || !videoId || duration <= 0) return;

      const progressPercentage = Math.round((currentTime / duration) * 100);
      const completed = progressPercentage >= 95;

      // Save precise position to localStorage
      localStorage.setItem(`video_position_${videoId}`, currentTime.toString());

      // Throttle database updates (save every 10 seconds or on significant change)
      const lastSavedProgress = progress?.progress_percentage || 0;
      if (Math.abs(progressPercentage - lastSavedProgress) < 5 && !completed) {
        return;
      }

      setProgress({
        progress_percentage: progressPercentage,
        last_position_seconds: currentTime,
      });

      const { data: existing } = await supabase
        .from('learning_progress')
        .select('id')
        .eq('student_id', user.id)
        .eq('content_id', videoId)
        .eq('content_type', 'video')
        .single();

      if (existing) {
        await supabase
          .from('learning_progress')
          .update({
            progress_percentage: progressPercentage,
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('learning_progress').insert({
          student_id: user.id,
          content_id: videoId,
          content_type: 'video',
          progress_percentage: progressPercentage,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        });
      }
    },
    [user, videoId, progress]
  );

  // Clear progress when video completes
  const clearProgress = useCallback(() => {
    localStorage.removeItem(`video_position_${videoId}`);
  }, [videoId]);

  return {
    progress,
    loading,
    saveProgress,
    clearProgress,
    resumeTime: progress?.last_position_seconds || 0,
  };
}
