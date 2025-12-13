import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Lock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Book {
  id: string;
  title: string;
  description: string | null;
  author: string | null;
  pdf_url: string;
  thumbnail_url: string | null;
  category_id: string | null;
  tags: string[] | null;
  file_size_mb: number | null;
  page_count: number | null;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface EditBookDialogProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditBookDialog({ book, isOpen, onClose, onSuccess }: EditBookDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLockChecking, setIsLockChecking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    author: '',
    pdf_url: '',
    thumbnail_url: '',
    category_id: '',
    tags: '',
    file_size_mb: '',
    page_count: '',
    is_active: true,
  });

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        description: book.description || '',
        author: book.author || '',
        pdf_url: book.pdf_url || '',
        thumbnail_url: book.thumbnail_url || '',
        category_id: book.category_id || '',
        tags: book.tags?.join(', ') || '',
        file_size_mb: book.file_size_mb?.toString() || '',
        page_count: book.page_count?.toString() || '',
        is_active: book.is_active,
      });
    }
  }, [book]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (isOpen && book) {
      acquireLock();
    }
    
    return () => {
      if (book) {
        releaseLock();
      }
    };
  }, [isOpen, book]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('id, name').order('name');
    if (data) setCategories(data);
  };

  const acquireLock = async () => {
    if (!book) return;
    
    setIsLockChecking(true);
    setLockError(null);
    
    try {
      const { data, error } = await (supabase.rpc as any)('acquire_edit_lock', {
        _content_type: 'book',
        _content_id: book.id,
      });
      
      if (error) throw error;
      
      const result = data as unknown as { success: boolean; error?: string; lock_id?: string; message?: string };
      if (!result.success) {
        setLockError(result.error || 'Could not acquire edit lock');
        toast({
          title: 'Edit Locked',
          description: 'This book is currently being edited by another user.',
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
    if (!book) return;
    
    try {
      await (supabase.rpc as any)('release_edit_lock', {
        _content_type: 'book',
        _content_id: book.id,
      });
    } catch (error) {
      console.error('Failed to release lock:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!book) return;
    if (lockError) {
      toast({
        title: 'Cannot Edit',
        description: 'This book is locked by another user.',
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
        .from('books')
        .update({
          title: formData.title,
          description: formData.description || null,
          author: formData.author || null,
          pdf_url: formData.pdf_url,
          thumbnail_url: formData.thumbnail_url || null,
          category_id: formData.category_id || null,
          tags: tagsArray,
          file_size_mb: formData.file_size_mb ? parseFloat(formData.file_size_mb) : null,
          page_count: formData.page_count ? parseInt(formData.page_count) : null,
          is_active: formData.is_active,
        })
        .eq('id', book.id);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Book updated successfully',
      });
      
      await releaseLock();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to update book:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update book',
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

  if (!book) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Book
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
            <Label htmlFor="author">Author</Label>
            <Input
              id="author"
              value={formData.author}
              onChange={(e) => setFormData({ ...formData, author: e.target.value })}
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
            <Label htmlFor="pdf_url">PDF URL *</Label>
            <Input
              id="pdf_url"
              type="url"
              value={formData.pdf_url}
              onChange={(e) => setFormData({ ...formData, pdf_url: e.target.value })}
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
              placeholder="math, calculus, advanced"
              disabled={!!lockError}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="file_size_mb">File Size (MB)</Label>
              <Input
                id="file_size_mb"
                type="number"
                step="0.01"
                value={formData.file_size_mb}
                onChange={(e) => setFormData({ ...formData, file_size_mb: e.target.value })}
                disabled={!!lockError}
              />
            </div>
            
            <div>
              <Label htmlFor="page_count">Page Count</Label>
              <Input
                id="page_count"
                type="number"
                value={formData.page_count}
                onChange={(e) => setFormData({ ...formData, page_count: e.target.value })}
                disabled={!!lockError}
              />
            </div>
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
