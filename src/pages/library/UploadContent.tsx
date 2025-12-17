import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Upload, BookOpen, Video, Loader2, Link, FileVideo, ImageIcon } from 'lucide-react';
import { ThumbnailUpload } from '@/components/library/ThumbnailUpload';
import { FileDropzone } from '@/components/library/FileDropzone';
import { generatePdfThumbnailBlob } from '@/lib/pdfThumbnail';
import { z } from 'zod';

const bookSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  author: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  category_id: z.string().uuid('Please select a category'),
  tags: z.string().optional(),
});

const videoUrlSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  video_url: z.string().url('Must be a valid URL'),
  description: z.string().max(1000).optional(),
  category_id: z.string().uuid('Please select a category'),
  duration_minutes: z.string().optional(),
  tags: z.string().optional(),
});

interface Category {
  id: string;
  name: string;
  icon: string;
}

export default function UploadContent() {
  const { user, role, hasPermission, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSource, setVideoSource] = useState<'url' | 'upload'>('url');
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [autoThumbnailUrl, setAutoThumbnailUrl] = useState<string | null>(null);

  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    description: '',
    category_id: '',
    tags: '',
    thumbnail_url: '',
  });

  const [videoForm, setVideoForm] = useState({
    title: '',
    video_url: '',
    description: '',
    category_id: '',
    duration_minutes: '',
    tags: '',
    thumbnail_url: '',
  });

  useEffect(() => {
    if (!authLoading) {
      // Check if user has permission to create library content
      const canUpload = role === 'super_admin' || hasPermission('library', 'create');
      if (!canUpload) {
        navigate('/library');
        toast({ 
          title: 'Access denied', 
          description: 'You do not have permission to upload library content.',
          variant: 'destructive' 
        });
        return;
      }
      fetchCategories();
    }
  }, [role, hasPermission, authLoading, navigate, toast]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) setCategories(data);
  };

  const handlePdfSelect = async (file: File) => {
    setPdfFile(file);
    
    // Auto-generate thumbnail if no custom one is set
    if (!bookForm.thumbnail_url) {
      setGeneratingThumbnail(true);
      try {
        const thumbnailBlob = await generatePdfThumbnailBlob(file);
        if (thumbnailBlob) {
          // Upload the auto-generated thumbnail
          const thumbnailFile = new File([thumbnailBlob], `${Date.now()}_thumbnail.jpg`, { type: 'image/jpeg' });
          const thumbnailUrl = await uploadFile(thumbnailFile, 'thumbnails');
          if (thumbnailUrl) {
            setAutoThumbnailUrl(thumbnailUrl);
            setBookForm(prev => ({ ...prev, thumbnail_url: thumbnailUrl }));
            toast({ title: 'Thumbnail generated from PDF!' });
          }
        }
      } catch (error) {
        console.error('Failed to generate thumbnail:', error);
      } finally {
        setGeneratingThumbnail(false);
      }
    }
  };

  const handleVideoFileSelect = (file: File) => {
    setVideoFile(file);
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}/${folder}/${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('library-files')
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: `Failed to upload file`, variant: 'destructive' });
      return null;
    }

    const { data } = supabase.storage.from('library-files').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      bookSchema.parse(bookForm);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: error.errors[0].message, variant: 'destructive' });
        return;
      }
    }

    if (!pdfFile) {
      toast({ title: 'Please select a PDF file', variant: 'destructive' });
      return;
    }

    setUploading(true);

    const pdfUrl = await uploadFile(pdfFile, 'books');
    if (!pdfUrl) {
      setUploading(false);
      return;
    }

    const tags = bookForm.tags ? bookForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const { error } = await supabase.from('books').insert({
      title: bookForm.title,
      author: bookForm.author || null,
      description: bookForm.description || null,
      category_id: bookForm.category_id,
      tags,
      pdf_url: pdfUrl,
      thumbnail_url: bookForm.thumbnail_url || null,
      file_size_mb: pdfFile.size / (1024 * 1024),
      uploaded_by: user!.id,
    });

    setUploading(false);

    if (error) {
      toast({ title: 'Failed to upload book', variant: 'destructive' });
    } else {
      toast({ title: 'Book uploaded successfully!' });
      navigate('/library');
    }
  };

  const handleVideoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setUploading(true);
    let videoUrl = videoForm.video_url;

    // If uploading a video file
    if (videoSource === 'upload') {
      if (!videoFile) {
        toast({ title: 'Please select a video file', variant: 'destructive' });
        setUploading(false);
        return;
      }
      const uploadedUrl = await uploadFile(videoFile, 'videos');
      if (!uploadedUrl) {
        setUploading(false);
        return;
      }
      videoUrl = uploadedUrl;
    } else {
      // Validate URL
      try {
        videoUrlSchema.parse(videoForm);
      } catch (error) {
        if (error instanceof z.ZodError) {
          toast({ title: error.errors[0].message, variant: 'destructive' });
          setUploading(false);
          return;
        }
      }
    }

    if (!videoForm.title || !videoForm.category_id) {
      toast({ title: 'Please fill in required fields', variant: 'destructive' });
      setUploading(false);
      return;
    }

    const tags = videoForm.tags ? videoForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const { error } = await supabase.from('videos').insert({
      title: videoForm.title,
      youtube_url: videoUrl, // Using youtube_url field for all video URLs
      description: videoForm.description || null,
      category_id: videoForm.category_id,
      duration_minutes: videoForm.duration_minutes ? parseInt(videoForm.duration_minutes) : null,
      tags,
      thumbnail_url: videoForm.thumbnail_url || null,
      uploaded_by: user!.id,
    });

    setUploading(false);

    if (error) {
      toast({ title: 'Failed to upload video', variant: 'destructive' });
    } else {
      toast({ title: 'Video uploaded successfully!' });
      navigate('/library');
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Upload Content</h1>
        <p className="text-muted-foreground">Add books or videos to the library</p>
      </div>

      <Tabs defaultValue="book" className="w-full">
        <TabsList 
          className="grid w-full grid-cols-2"
        >
          <TabsTrigger value="book">
            <BookOpen className="mr-2 h-4 w-4" />
            Upload Book (PDF)
          </TabsTrigger>
          <TabsTrigger value="video">
            <Video className="mr-2 h-4 w-4" />
            Add Video
          </TabsTrigger>
        </TabsList>

        <TabsContent value="book">
          <Card>
            <CardHeader>
              <CardTitle>Upload Book</CardTitle>
              <CardDescription>Upload a PDF book to the library with an optional cover image</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBookSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>PDF File *</Label>
                      <FileDropzone
                        accept=".pdf,application/pdf"
                        onFileSelect={handlePdfSelect}
                        selectedFile={pdfFile}
                        onClear={() => {
                          setPdfFile(null);
                          if (autoThumbnailUrl) {
                            setBookForm(prev => ({ ...prev, thumbnail_url: '' }));
                            setAutoThumbnailUrl(null);
                          }
                        }}
                        label="Drop PDF here"
                        description="or click to browse"
                        maxSizeMB={50}
                        onValidationError={(error) => {
                          toast({ title: 'File Validation Error', description: error, variant: 'destructive' });
                        }}
                      />
                      {generatingThumbnail && (
                        <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Generating thumbnail from PDF...
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="book-title">Title *</Label>
                      <Input
                        id="book-title"
                        value={bookForm.title}
                        onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                        placeholder="Enter book title"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="book-author">Author</Label>
                      <Input
                        id="book-author"
                        value={bookForm.author}
                        onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                        placeholder="Author name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="book-category">Category *</Label>
                      <Select
                        value={bookForm.category_id}
                        onValueChange={(value) => setBookForm({ ...bookForm, category_id: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.icon} {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <ThumbnailUpload
                      onUpload={(url) => setBookForm({ ...bookForm, thumbnail_url: url })}
                      currentUrl={bookForm.thumbnail_url}
                      userId={user.id}
                      aspectRatio="book"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="book-description">Description</Label>
                  <Textarea
                    id="book-description"
                    value={bookForm.description}
                    onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                    placeholder="Brief description of the book"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="book-tags">Tags (comma-separated)</Label>
                  <Input
                    id="book-tags"
                    value={bookForm.tags}
                    onChange={(e) => setBookForm({ ...bookForm, tags: e.target.value })}
                    placeholder="e.g., science, physics, beginner"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Book
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="video">
          <Card>
            <CardHeader>
              <CardTitle>Add Video</CardTitle>
              <CardDescription>Add a video from YouTube, Vimeo, or upload your own video file</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVideoSubmit} className="space-y-4">
                {/* Video Source Selection */}
                <div className="space-y-3">
                  <Label>Video Source *</Label>
                  <RadioGroup 
                    value={videoSource} 
                    onValueChange={(v) => setVideoSource(v as 'url' | 'upload')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="url" id="url" />
                      <Label htmlFor="url" className="flex items-center gap-1 cursor-pointer">
                        <Link className="h-4 w-4" />
                        URL (YouTube, Vimeo)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="upload" id="upload" />
                      <Label htmlFor="upload" className="flex items-center gap-1 cursor-pointer">
                        <FileVideo className="h-4 w-4" />
                        Upload Video File
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {videoSource === 'url' ? (
                      <div>
                        <Label htmlFor="video-url">Video URL *</Label>
                        <Input
                          id="video-url"
                          value={videoForm.video_url}
                          onChange={(e) => setVideoForm({ ...videoForm, video_url: e.target.value })}
                          placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports YouTube (including Shorts) and Vimeo
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Label>Video File *</Label>
                        <FileDropzone
                          accept="video/*"
                          onFileSelect={handleVideoFileSelect}
                          selectedFile={videoFile}
                          onClear={() => setVideoFile(null)}
                          label="Drop video here"
                          description="MP4, WebM, and other formats"
                          maxSizeMB={500}
                          onValidationError={(error) => {
                            toast({ title: 'File Validation Error', description: error, variant: 'destructive' });
                          }}
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="video-title">Title *</Label>
                      <Input
                        id="video-title"
                        value={videoForm.title}
                        onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                        placeholder="Enter video title"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="video-category">Category *</Label>
                      <Select
                        value={videoForm.category_id}
                        onValueChange={(value) => setVideoForm({ ...videoForm, category_id: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.icon} {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="video-duration">Duration (minutes)</Label>
                      <Input
                        id="video-duration"
                        type="number"
                        value={videoForm.duration_minutes}
                        onChange={(e) => setVideoForm({ ...videoForm, duration_minutes: e.target.value })}
                        placeholder="e.g., 45"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <ThumbnailUpload
                      onUpload={(url) => setVideoForm({ ...videoForm, thumbnail_url: url })}
                      currentUrl={videoForm.thumbnail_url}
                      userId={user.id}
                      aspectRatio="video"
                    />
                    <p className="text-xs text-muted-foreground">
                      For YouTube videos, a thumbnail will be auto-generated if not provided
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="video-description">Description</Label>
                  <Textarea
                    id="video-description"
                    value={videoForm.description}
                    onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                    placeholder="Brief description of the video"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="video-tags">Tags (comma-separated)</Label>
                  <Input
                    id="video-tags"
                    value={videoForm.tags}
                    onChange={(e) => setVideoForm({ ...videoForm, tags: e.target.value })}
                    placeholder="e.g., tutorial, python, beginner"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={uploading}>
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {videoSource === 'upload' ? 'Upload Video' : 'Add Video'}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
