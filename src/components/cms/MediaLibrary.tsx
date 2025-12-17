import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageIcon, Search, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ImageCropper } from '@/components/library/ImageCropper';

interface MediaLibraryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  accept?: 'image' | 'all';
}

interface MediaFile {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export function MediaLibrary({ open, onClose, onSelect, accept = 'image' }: MediaLibraryProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileInputRef = useState<HTMLInputElement | null>(null)[0];
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadFiles();
    }
  }, [open]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.storage
        .from('library-files')
        .list('cms', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      const mediaFiles: MediaFile[] = (data || [])
        .filter((file) => {
          if (accept === 'image') {
            return file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
          }
          return true;
        })
        .map((file) => ({
          name: file.name,
          url: supabase.storage.from('library-files').getPublicUrl(`cms/${file.name}`).data.publicUrl,
          type: file.metadata?.mimetype || 'image',
          size: file.metadata?.size,
        }));

      setFiles(mediaFiles);
    } catch (error: any) {
      console.error('Error loading files:', error);
      toast({
        title: 'Error loading media',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPendingImage(e.target?.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploading(true);
    try {
      const fileExt = croppedBlob.type.split('/')[1];
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `cms/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('library-files')
        .upload(filePath, croppedBlob, {
          contentType: croppedBlob.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('library-files')
        .getPublicUrl(filePath);

      await loadFiles(); // Refresh list
      setCropperOpen(false);
      setPendingImage(null);
      toast({ title: 'Image uploaded successfully' });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setCropperOpen(false);
    setPendingImage(null);
  };

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Media Library</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => handleFileSelect(e as any);
                  input.click();
                }}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? 'No files found matching your search.' : 'No media files found.'}
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="grid grid-cols-4 gap-4">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.name}
                      className="relative aspect-square border rounded-lg overflow-hidden cursor-pointer hover:border-primary transition-colors group"
                      onClick={() => {
                        onSelect(file.url);
                        onClose();
                      }}
                    >
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                        <p className="text-white text-xs opacity-0 group-hover:opacity-100 text-center px-2 truncate">
                          {file.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {pendingImage && (
        <ImageCropper
          image={pendingImage}
          open={cropperOpen}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
