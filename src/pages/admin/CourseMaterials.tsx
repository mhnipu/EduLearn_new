import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Video, FileText, Trash2, Edit, Eye, BookOpen, Library } from 'lucide-react';
import { z } from 'zod';
import { LibrarySelector } from '@/components/course/LibrarySelector';
import { AttachedLibraryItems, AttachedBook, AttachedVideo } from '@/components/course/AttachedLibraryItems';
import { BackButton } from '@/components/BackButton';

const materialSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  material_type: z.enum(['video', 'pdf']),
  video_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  pdf_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  duration_minutes: z.number().min(0).optional(),
});

interface Material {
  id: string;
  title: string;
  material_type: string;
  video_url: string | null;
  pdf_url: string | null;
  duration_minutes: number | null;
}

export default function CourseMaterials() {
  const { courseId } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Library integration state
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [attachedBooks, setAttachedBooks] = useState<AttachedBook[]>([]);
  const [attachedVideos, setAttachedVideos] = useState<AttachedVideo[]>([]);
  const [isSavingLibrary, setIsSavingLibrary] = useState(false);

  // Only admin and teacher can access
  if (role !== 'admin' && role !== 'teacher' && role !== 'super_admin') {
    navigate('/dashboard');
    return null;
  }

  useEffect(() => {
    fetchCourseAndMaterials();
    fetchAttachedLibraryItems();
  }, [courseId]);

  const fetchCourseAndMaterials = async () => {
    // Fetch course
    const { data: courseData } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single();

    if (courseData) setCourseTitle(courseData.title);

    // Fetch materials
    const { data: materialsData } = await supabase
      .from('course_materials')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');

    setMaterials(materialsData || []);
  };

  const fetchAttachedLibraryItems = async () => {
    if (!courseId) return;

    // Fetch attached books
    const { data: bookLinks } = await supabase
      .from('course_library_books')
      .select('book_id, books(id, title, author, thumbnail_url, pdf_url)')
      .eq('course_id', courseId);

    if (bookLinks) {
      const books = bookLinks
        .filter((link: any) => link.books)
        .map((link: any) => ({
          id: link.books.id,
          title: link.books.title,
          author: link.books.author,
          thumbnail_url: link.books.thumbnail_url,
          pdf_url: link.books.pdf_url,
        }));
      setAttachedBooks(books);
      setSelectedBooks(books.map((b: AttachedBook) => b.id));
    }

    // Fetch attached videos
    const { data: videoLinks } = await supabase
      .from('course_library_videos')
      .select('video_id, videos(id, title, thumbnail_url, youtube_url, duration_minutes)')
      .eq('course_id', courseId);

    if (videoLinks) {
      const videos = videoLinks
        .filter((link: any) => link.videos)
        .map((link: any) => ({
          id: link.videos.id,
          title: link.videos.title,
          thumbnail_url: link.videos.thumbnail_url,
          youtube_url: link.videos.youtube_url,
          duration_minutes: link.videos.duration_minutes,
        }));
      setAttachedVideos(videos);
      setSelectedVideos(videos.map((v: AttachedVideo) => v.id));
    }
  };

  const handleSaveLibraryItems = async () => {
    if (!courseId) return;
    setIsSavingLibrary(true);

    try {
      // Delete existing links
      await supabase.from('course_library_books').delete().eq('course_id', courseId);
      await supabase.from('course_library_videos').delete().eq('course_id', courseId);

      // Insert new book links
      if (selectedBooks.length > 0) {
        const bookInserts = selectedBooks.map((bookId, index) => ({
          course_id: courseId,
          book_id: bookId,
          order_index: index,
        }));
        await supabase.from('course_library_books').insert(bookInserts);
      }

      // Insert new video links
      if (selectedVideos.length > 0) {
        const videoInserts = selectedVideos.map((videoId, index) => ({
          course_id: courseId,
          video_id: videoId,
          order_index: index,
        }));
        await supabase.from('course_library_videos').insert(videoInserts);
      }

      toast({
        title: 'Library Items Saved',
        description: 'Course library attachments have been updated.',
      });

      fetchAttachedLibraryItems();
    } catch (error) {
      console.error('Error saving library items:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save library items.',
      });
    } finally {
      setIsSavingLibrary(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const material_type = formData.get('material_type') as string;
    const video_url = formData.get('video_url') as string;
    const pdf_url = formData.get('pdf_url') as string;
    const duration_minutes = formData.get('duration_minutes') as string;

    try {
      materialSchema.parse({
        title,
        material_type,
        video_url: video_url || undefined,
        pdf_url: pdf_url || undefined,
        duration_minutes: duration_minutes ? parseInt(duration_minutes) : undefined,
      });

      const { error } = await supabase.from('course_materials').insert({
        course_id: courseId,
        title,
        material_type,
        video_url: video_url || null,
        pdf_url: pdf_url || null,
        duration_minutes: duration_minutes ? parseInt(duration_minutes) : null,
        order_index: materials.length,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Material Added!',
        description: 'The course material has been added successfully.',
      });

      fetchCourseAndMaterials();
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to add material. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('course_materials')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete material.',
      });
    } else {
      toast({
        title: 'Material Deleted',
        description: 'The material has been removed.',
      });
      fetchCourseAndMaterials();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <BackButton 
          fallbackPath="/dashboard/admin"
          fallbackLabel="Back to Admin Dashboard"
        />
        <Button onClick={() => navigate(`/admin/courses/${courseId}/edit`)} variant="outline">
          <Edit className="mr-2 h-4 w-4" />
          Edit Course Details
        </Button>
        <Button onClick={() => navigate(`/admin/courses/${courseId}/modules`)} variant="outline">
          <BookOpen className="mr-2 h-4 w-4" />
          Manage Structure
        </Button>
        <Button onClick={() => navigate(`/courses/${courseId}`)} variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          Preview Course
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{courseTitle}</h1>
        <p className="text-muted-foreground text-lg">Manage course materials and library items</p>
      </div>

      {/* Library Integration Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Library Content
          </CardTitle>
          <CardDescription>
            Attach existing books and videos from your library to this course
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LibrarySelector
            selectedBooks={selectedBooks}
            selectedVideos={selectedVideos}
            onBooksChange={setSelectedBooks}
            onVideosChange={setSelectedVideos}
          />
          
          <Button 
            onClick={handleSaveLibraryItems} 
            disabled={isSavingLibrary}
            className="w-full sm:w-auto"
          >
            {isSavingLibrary ? 'Saving...' : 'Save Library Attachments'}
          </Button>

          {(attachedBooks.length > 0 || attachedVideos.length > 0) && (
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Currently Attached</h4>
              <AttachedLibraryItems books={attachedBooks} videos={attachedVideos} showActions />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Add Material Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add Custom Material</CardTitle>
            <CardDescription>Add a video or PDF by URL (for content not in library)</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Material Title *</Label>
                <Input id="title" name="title" placeholder="e.g., Lesson 1: Introduction" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="material_type">Material Type *</Label>
                <Select name="material_type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="video_url">YouTube Video URL</Label>
                <Input
                  id="video_url"
                  name="video_url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pdf_url">PDF URL</Label>
                <Input
                  id="pdf_url"
                  name="pdf_url"
                  type="url"
                  placeholder="https://example.com/file.pdf"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                <Input
                  id="duration_minutes"
                  name="duration_minutes"
                  type="number"
                  min="0"
                  placeholder="30"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Material
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Materials List */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Materials ({materials.length})</CardTitle>
            <CardDescription>Materials added by URL</CardDescription>
          </CardHeader>
          <CardContent>
            {materials.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No custom materials added yet
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {material.material_type === 'video' ? (
                        <Video className="h-5 w-5 text-primary" />
                      ) : (
                        <FileText className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{material.title}</p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {material.material_type}
                        {material.duration_minutes && ` • ${material.duration_minutes} min`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(material.id)}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completion Actions */}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button 
          size="lg" 
          onClick={() => navigate(`/courses/${courseId}`)}
        >
          <Eye className="mr-2 h-4 w-4" />
          View Course
        </Button>
        <Button 
          size="lg" 
          variant="outline"
          onClick={() => navigate('/dashboard/admin')}
        >
          Finish & Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
