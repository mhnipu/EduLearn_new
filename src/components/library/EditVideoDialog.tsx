import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Video {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  thumbnail_url: string | null;
  category_id: string | null;
  tags: string[] | null;
  duration_minutes: number | null;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface EditVideoDialogProps {
  video: Video | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditVideoDialog({ video, isOpen, onClose, onSuccess }: EditVideoDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLockChecking, setIsLockChecking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    youtube_url: '',
    thumbnail_url: '',
    category_id: '',
    tags: '',
    duration_minutes: '',
    is_active: true,
  });

  useEffect(() => {
    if (video) {
      setFormData({
        title: video.title || '',
        description: video.description || '',
        youtube_url: video.youtube_url || '',
        thumbnail_url: video.thumbnail_url || '',
        category_id: video.category_id || '',
        tags: video.tags?.join(', ') || '',
        duration_minutes: video.duration_minutes?.toString() || '',
        is_active: video.is_active,
      });
    }
  }, [video]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (isOpen && video) {
      acquireLock();
    }
    
    return () => {
      if (video) {
        releaseLock();
      }
    };
  }, [isOpen, video]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name').order('name');
    if (data) setCategories(data);
  };

  const acquireLock = async () => {
    if (!video) return;
    
    setIsLockChecking(true);
    setLockError(null);
    
    try {
      const { data, error } = await (supabase.rpc as any)('acquire_edit_lock', {
        _content_type: 'video',
        _content_id: video.id,
      });
      
      if (error) throw error;
      
      const result = data as unknown as { success: boolean; error?: string; lock_id?: string; message?: string };
      if (!result.success) {
        setLockError(result.error || 'Could not acquire edit lock');
        toast({
          title: 'Edit Locked',
          description: 'This video is currently being edited by another user.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Failed to acquire lock:', error);
      setLockError('Failed to check edit lock');
    } finally {
      setIsLockChecking(false);
    }
  };

  const releaseLock = async () => {
    if (!video) return;
    
    try {
      await (supabase.rpc as any)('release_edit_lock', {
        _content_type: 'video',
        _content_id: video.id,
      });
    } catch (error) {
      console.error('Failed to release lock:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!video) return;
    if (lockError) {
      toast({
        title: 'Cannot Edit',
        description: 'This video is locked by another user.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const tagsArray = formData.tags
        ? formData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : [];
      
      const { error } = await supabase
        .from('videos')
        .update({
          title: formData.title,
          description: formData.description || null,
          youtube_url: formData.youtube_url,
          thumbnail_url: formData.thumbnail_url || null,
          category_id: formData.category_id || null,
          tags: tagsArray,
          duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
          is_active: formData.is_active,
        })
        .eq('id', video.id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Video updated successfully',
      });
      
      await releaseLock();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to update video:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update video',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    await releaseLock();
    onClose();
  };

  if (!video) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Video
            {isLockChecking && <Loader2 className="h-4 w-4 animate-spin" />}
          </DialogTitle>
        </DialogHeader>
        
        {lockError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{lockError}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              disabled={!!lockError}
            />
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              disabled={!!lockError}
            />
          </div>
          
          <div>
            <Label htmlFor="youtube_url">YouTube URL *</Label>
            <Input
              id="youtube_url"
              type="url"
              value={formData.youtube_url}
              onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
              required
              disabled={!!lockError}
            />
          </div>
          
          <div>
            <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
            <Input
              id="thumbnail_url"
              type="url"
              value={formData.thumbnail_url}
              onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
              disabled={!!lockError}
            />
          </div>
          
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              disabled={!!lockError}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="physics, mechanics, intro"
              disabled={!!lockError}
            />
          </div>
          
          <div>
            <Label htmlFor="duration_minutes">Duration (minutes)</Label>
            <Input
              id="duration_minutes"
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
              disabled={!!lockError}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              disabled={!!lockError}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !!lockError}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
