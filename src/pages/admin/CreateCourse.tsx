import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Loader2, Upload, X, Image, Clock, User, Users } from 'lucide-react';
import { z } from 'zod';
import { CategoryMultiSelect } from '@/components/CategoryMultiSelect';

const courseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
});

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

type Teacher = { id: string; full_name: string };

export default function CreateCourse() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string>('beginner');
  const [instructorId, setInstructorId] = useState<string>('');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(0);
  const [maxCapacity, setMaxCapacity] = useState<number | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && role && role !== 'admin' && role !== 'super_admin') {
      navigate('/dashboard');
    }
  }, [role, loading, navigate]);

  useEffect(() => {
    fetchTeachers();
  }, []);

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
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(null);
    }
  };

  const uploadThumbnail = async (courseId: string): Promise<string | null> => {
    if (!thumbnailFile) return null;

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

    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    try {
      courseSchema.parse({ title, description });

      // Create course
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title,
          description,
          created_by: user?.id,
          difficulty,
          instructor_id: instructorId || null,
          estimated_duration_minutes: estimatedDuration || 0,
          max_capacity: maxCapacity || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Upload thumbnail if provided
      if (thumbnailFile) {
        const thumbnailUrl = await uploadThumbnail(data.id);
        if (thumbnailUrl) {
          await supabase
            .from('courses')
            .update({ thumbnail_url: thumbnailUrl })
            .eq('id', data.id);
        }
      }

      // Create course-category relationships
      if (selectedCategories.length > 0) {
        const categoryInserts = selectedCategories.map((categoryId) => ({
          course_id: data.id,
          category_id: categoryId,
        }));

        await supabase.from('course_categories').insert(categoryInserts);
      }

      toast({
        title: 'Course Created!',
        description: 'Your course has been successfully created.',
      });

      navigate(`/admin/courses/${data.id}/materials`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: error.errors[0].message,
        });
      } else {
        console.error('Error creating course:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to create course. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!role || (role !== 'admin' && role !== 'super_admin')) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button onClick={() => navigate('/dashboard/admin')} variant="ghost" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Create New Course</CardTitle>
          <CardDescription>
            Fill in the details to create a new course. You can add materials after creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Introduction to Web Development"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Course Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Provide a brief description of what students will learn..."
                rows={5}
              />
            </div>

            {/* Difficulty Level */}
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

            {/* Thumbnail Upload */}
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

            {/* Category Selection */}
            <div className="space-y-2">
              <Label>Categories</Label>
              <CategoryMultiSelect
                selectedIds={selectedCategories}
                onChange={setSelectedCategories}
                allowCreate
                placeholder="Select categories for this course..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Course
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}