import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Loader2, X, Image, Clock, User, Users } from 'lucide-react';
import { z } from 'zod';
import { CategoryMultiSelect } from '@/components/CategoryMultiSelect';

const courseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
});

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

type Teacher = { id: string; full_name: string };

export default function EditCourse() {
  const { courseId } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [instructorId, setInstructorId] = useState<string>('');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(0);
  const [maxCapacity, setMaxCapacity] = useState<number | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && role && role !== 'admin' && role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [role, authLoading, navigate]);

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (courseId && user) {
      fetchCourse();
    }
  }, [courseId, user]);

  const fetchTeachers = async () => {
    const { data: teacherRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'teacher');

    if (teacherRoles && teacherRoles.length > 0) {
      const teacherIds = teacherRoles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', teacherIds);

      if (profiles) {
        setTeachers(profiles.map(p => ({ id: p.id, full_name: p.full_name || 'Unknown' })));
      }
    }
  };

  const fetchCourse = async () => {
    setLoading(true);
    try {
      const { data: course, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) throw error;

      setTitle(course.title);
      setDescription(course.description || '');
      setDifficulty((course as any).difficulty || 'beginner');
      setInstructorId((course as any).instructor_id || '');
      setEstimatedDuration((course as any).estimated_duration_minutes || 0);
      setMaxCapacity((course as any).max_capacity || null);
      if (course.thumbnail_url) {
        setThumbnailPreview(course.thumbnail_url);
      }

      // Fetch categories
      const { data: courseCategories } = await supabase
        .from('course_categories')
        .select('category_id')
        .eq('course_id', courseId);

      if (courseCategories) {
        setSelectedCategories(courseCategories.map((cc) => cc.category_id));
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast({ title: 'Error loading course', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'Image must be less than 5MB', variant: 'destructive' });
        return;
      }
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    if (thumbnailPreview && !thumbnailPreview.includes('supabase')) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailPreview(null);
  };

  const uploadThumbnail = async (): Promise<string | null> => {
    if (!thumbnailFile || !courseId) return null;

    const fileExt = thumbnailFile.name.split('.').pop();
    const fileName = `courses/${courseId}/thumbnail.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('library-files')
      .upload(fileName, thumbnailFile, { upsert: true });

    if (uploadError) {
      console.error('Thumbnail upload error:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('library-files')
      .getPublicUrl(fileName);

    return urlData?.publicUrl || null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      courseSchema.parse({ title, description });

      let thumbnailUrl = thumbnailPreview;

      // Upload new thumbnail if selected
      if (thumbnailFile) {
        const newUrl = await uploadThumbnail();
        if (newUrl) thumbnailUrl = newUrl;
      }

      // Update course
      const { error } = await supabase
        .from('courses')
        .update({
          title,
          description,
          thumbnail_url: thumbnailUrl,
          difficulty,
          instructor_id: instructorId || null,
          estimated_duration_minutes: estimatedDuration || 0,
          max_capacity: maxCapacity || null,
        } as any)
        .eq('id', courseId);

      if (error) throw error;

      // Update categories - delete existing and insert new
      await supabase.from('course_categories').delete().eq('course_id', courseId);

      if (selectedCategories.length > 0) {
        const categoryInserts = selectedCategories.map((categoryId) => ({
          course_id: courseId!,
          category_id: categoryId,
        }));
        await supabase.from('course_categories').insert(categoryInserts);
      }

      toast({ title: 'Course Updated!' });
      navigate(`/courses/${courseId}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ variant: 'destructive', title: 'Validation Error', description: error.errors[0].message });
      } else {
        console.error('Error updating course:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to update course.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!role || (role !== 'admin' && role !== 'super_admin')) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button onClick={() => navigate(-1)} variant="ghost" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Edit Course</CardTitle>
          <CardDescription>Update course details, thumbnail, and categories.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Introduction to Web Development"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Course Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide a brief description..."
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Difficulty Level</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level} className="capitalize">
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Instructor Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Assign Instructor
              </Label>
              <Select value={instructorId || "none"} onValueChange={(val) => setInstructorId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an instructor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No instructor assigned</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estimated Duration */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Estimated Duration (minutes)
              </Label>
              <Input
                type="number"
                min="0"
                value={estimatedDuration || ''}
                onChange={(e) => setEstimatedDuration(parseInt(e.target.value) || 0)}
                placeholder="e.g., 120 for 2 hours"
              />
              {estimatedDuration > 0 && (
                <p className="text-xs text-muted-foreground">
                  ≈ {Math.floor(estimatedDuration / 60)}h {estimatedDuration % 60}m
                </p>
              )}
            </div>

            {/* Max Capacity */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Max Capacity (optional)
              </Label>
              <Input
                type="number"
                min="1"
                value={maxCapacity || ''}
                onChange={(e) => setMaxCapacity(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Leave empty for unlimited"
              />
              <p className="text-xs text-muted-foreground">
                Set a limit for enrollments. Students can join waitlist when full.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Course Thumbnail</Label>
              {thumbnailPreview ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeThumbnail}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed cursor-pointer hover:border-primary transition-colors">
                  <Image className="h-10 w-10 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Click to upload thumbnail</span>
                  <span className="text-xs text-muted-foreground mt-1">Max 5MB, JPG/PNG</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailChange}
                  />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              <CategoryMultiSelect
                selectedIds={selectedCategories}
                onChange={setSelectedCategories}
                allowCreate
                placeholder="Select categories..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}