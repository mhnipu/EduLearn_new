import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { X, Image as ImageIcon, Loader2, Crop, Move } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ImageCropper } from './ImageCropper';

interface ThumbnailUploadProps {
  onUpload: (url: string) => void;
  currentUrl?: string;
  userId: string;
  aspectRatio?: 'video' | 'book';
}

export function ThumbnailUpload({ onUpload, currentUrl, userId, aspectRatio = 'video' }: ThumbnailUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl || null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image file', variant: 'destructive' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image must be less than 5MB', variant: 'destructive' });
      return;
    }

    // Read file and open cropper
    const reader = new FileReader();
    reader.onload = (e) => {
      setPendingImage(e.target?.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperOpen(false);
    setPendingImage(null);

    // Show preview immediately
    const previewReader = new FileReader();
    previewReader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    previewReader.readAsDataURL(croppedBlob);

    // Upload to Supabase
    setUploading(true);
    try {
      const fileName = `${userId}/thumbnails/${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('library-files')
        .upload(fileName, croppedBlob, { contentType: 'image/jpeg' });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('library-files').getPublicUrl(fileName);
      onUpload(data.publicUrl);
      toast({ title: 'Thumbnail uploaded successfully!' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Failed to upload thumbnail', variant: 'destructive' });
      setPreviewUrl(currentUrl || null);
    } finally {
      setUploading(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropCancel = () => {
    setCropperOpen(false);
    setPendingImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const aspectClass = aspectRatio === 'book' ? 'aspect-[2/3]' : 'aspect-video';
  const cropAspect = aspectRatio === 'book' ? 2/3 : 16/9;

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <Crop className="h-4 w-4" />
        Thumbnail / Cover Image
      </Label>
      <p className="text-xs text-muted-foreground mb-2">
        Upload an image and position it for the perfect crop
      </p>
      <div 
        className={`relative ${aspectClass} rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors overflow-hidden bg-muted/30`}
      >
        {previewUrl ? (
          <>
            <img 
              src={previewUrl} 
              alt="Thumbnail preview" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <Button 
                  type="button"
                  variant="secondary" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Move className="h-4 w-4 mr-1" />
                  )}
                  {uploading ? 'Uploading...' : 'Change Image'}
                </Button>
                <Button 
                  type="button"
                  variant="destructive" 
                  size="sm"
                  onClick={handleRemove}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-white/70">Click to reposition</p>
            </div>
          </>
        ) : (
          <div 
            className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4 text-center group"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
            ) : (
              <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-3">
                <ImageIcon className="h-8 w-8 text-primary" />
              </div>
            )}
            <p className="text-sm font-medium text-foreground">
              {uploading ? 'Uploading...' : 'Click to upload'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, WebP up to 5MB
            </p>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Crop className="h-3 w-3" />
              Includes drag-to-position cropper
            </p>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      {/* Image Cropper Dialog */}
      {pendingImage && (
        <ImageCropper
          image={pendingImage}
          open={cropperOpen}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={cropAspect}
        />
      )}
    </div>
  );
}
