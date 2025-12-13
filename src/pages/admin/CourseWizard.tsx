import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { CategoryMultiSelect } from '@/components/CategoryMultiSelect';
import { LibrarySelector } from '@/components/course/LibrarySelector';
import { AttachedLibraryItems, AttachedBook, AttachedVideo } from '@/components/course/AttachedLibraryItems';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  X,
  Image,
  Clock,
  User,
  Users,
  Check,
  Layers,
  BookOpen,
  Eye,
  Edit,
  AlertCircle,
  Video,
  Book,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  FileText,
  FolderTree,
} from 'lucide-react';
import { z } from 'zod';

const STEPS = [
  { id: 'details', label: 'Details', icon: BookOpen },
  { id: 'library', label: 'Library', icon: Layers },
  { id: 'structure', label: 'Structure', icon: FolderTree },
  { id: 'review', label: 'Review', icon: Eye },
];

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

type Teacher = { id: string; full_name: string };
type Category = { id: string; name: string; icon: string | null };

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: Lesson[];
  selectedBooks: string[];
  selectedVideos: string[];
}

interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  pdf_url: string | null;
  order_index: number;
  module_id: string | null;
  selectedBooks: string[];
  selectedVideos: string[];
}

const courseSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(1000).optional(),
});

export default function CourseWizard() {
  const { courseId } = useParams();
  const isEditing = !!courseId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);

  // Step 1: Details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [instructorId, setInstructorId] = useState('');
  const [maxCapacity, setMaxCapacity] = useState<number | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Duration controls
  const [durationHours, setDurationHours] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [durationWeeks, setDurationWeeks] = useState(0);

  // Step 2: Library
  const [courseBooks, setCourseBooks] = useState<string[]>([]);
  const [courseVideos, setCourseVideos] = useState<string[]>([]);
  const [allBooks, setAllBooks] = useState<AttachedBook[]>([]);
  const [allVideos, setAllVideos] = useState<AttachedVideo[]>([]);

  // Step 3: Structure (Modules & Lessons)
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Saved course ID
  const [savedCourseId, setSavedCourseId] = useState<string | null>(courseId || null);

  const isAdmin = role === 'admin' || role === 'super_admin';

  // Calculate total duration in minutes
  const totalDurationMinutes = (durationWeeks * 7 * 24 * 60) + (durationHours * 60) + durationMinutes;

  // Format duration for display
  const formatDuration = () => {
    const parts = [];
    if (durationWeeks > 0) parts.push(`${durationWeeks} week${durationWeeks !== 1 ? 's' : ''}`);
    if (durationHours > 0) parts.push(`${durationHours} hour${durationHours !== 1 ? 's' : ''}`);
    if (durationMinutes > 0) parts.push(`${durationMinutes} min`);
    return parts.length > 0 ? parts.join(' ') : 'Not set';
  };

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/dashboard');
    }
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (isEditing && courseId) {
      fetchCourseData();
    }
  }, [courseId, isEditing]);

  const fetchInitialData = async () => {
    // Fetch teachers
    const { data: teacherRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'teacher');

    if (teacherRoles && teacherRoles.length > 0) {
      const teacherIds = teacherRoles.map((r) => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', teacherIds);

      if (profiles) {
        setTeachers(profiles.map((p) => ({ id: p.id, full_name: p.full_name || 'Unknown' })));
      }
    }

    // Fetch categories
    const { data: cats } = await supabase.from('categories').select('id, name, icon').order('name');
    if (cats) setCategories(cats);

    // Fetch library items
    const [booksRes, videosRes] = await Promise.all([
      supabase.from('books').select('id, title, author, thumbnail_url, pdf_url').eq('is_active', true),
      supabase.from('videos').select('id, title, thumbnail_url, youtube_url, duration_minutes').eq('is_active', true),
    ]);

    if (booksRes.data) setAllBooks(booksRes.data);
    if (videosRes.data) setAllVideos(videosRes.data);
  };

  const fetchCourseData = async () => {
    try {
      const { data: course, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) throw error;

      setTitle(course.title);
      setDescription(course.description || '');
      setDifficulty(course.difficulty || 'beginner');
      setInstructorId(course.instructor_id || '');
      setMaxCapacity(course.max_capacity);
      if (course.thumbnail_url) setThumbnailPreview(course.thumbnail_url);

      // Parse duration
      const totalMins = course.estimated_duration_minutes || 0;
      const weeks = Math.floor(totalMins / (7 * 24 * 60));
      const remainingAfterWeeks = totalMins % (7 * 24 * 60);
      const hours = Math.floor(remainingAfterWeeks / 60);
      const mins = remainingAfterWeeks % 60;
      setDurationWeeks(weeks);
      setDurationHours(hours);
      setDurationMinutes(mins);

      // Fetch categories
      const { data: courseCats } = await supabase
        .from('course_categories')
        .select('category_id')
        .eq('course_id', courseId);
      setSelectedCategories((courseCats || []).map((c) => c.category_id));

      // Fetch library attachments
      const [booksRes, videosRes] = await Promise.all([
        supabase.from('course_library_books').select('book_id').eq('course_id', courseId),
        supabase.from('course_library_videos').select('video_id').eq('course_id', courseId),
      ]);
      setCourseBooks((booksRes.data || []).map((b) => b.book_id));
      setCourseVideos((videosRes.data || []).map((v) => v.video_id));

      // Fetch modules and lessons
      await fetchModulesAndLessons(courseId);
    } catch (error) {
      console.error('Error loading course:', error);
      toast({ title: 'Error loading course', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchModulesAndLessons = async (cId: string) => {
    // Fetch modules
    const { data: modulesData } = await supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', cId)
      .order('order_index');

    // Fetch lessons
    const { data: lessonsData } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', cId)
      .order('order_index');

    // Fetch module library attachments
    const moduleIds = (modulesData || []).map((m: any) => m.id);
    let moduleBookMap: Record<string, string[]> = {};
    let moduleVideoMap: Record<string, string[]> = {};

    if (moduleIds.length > 0) {
      const [modBooksRes, modVideosRes] = await Promise.all([
        supabase.from('module_library_books').select('module_id, book_id').in('module_id', moduleIds),
        supabase.from('module_library_videos').select('module_id, video_id').in('module_id', moduleIds),
      ]);
      
      (modBooksRes.data || []).forEach((item: any) => {
        if (!moduleBookMap[item.module_id]) moduleBookMap[item.module_id] = [];
        moduleBookMap[item.module_id].push(item.book_id);
      });
      (modVideosRes.data || []).forEach((item: any) => {
        if (!moduleVideoMap[item.module_id]) moduleVideoMap[item.module_id] = [];
        moduleVideoMap[item.module_id].push(item.video_id);
      });
    }

    // Fetch lesson library attachments
    const lessonIds = (lessonsData || []).map((l: any) => l.id);
    let lessonBookMap: Record<string, string[]> = {};
    let lessonVideoMap: Record<string, string[]> = {};

    if (lessonIds.length > 0) {
      const [lessBooksRes, lessVideosRes] = await Promise.all([
        supabase.from('lesson_library_books').select('lesson_id, book_id').in('lesson_id', lessonIds),
        supabase.from('lesson_library_videos').select('lesson_id, video_id').in('lesson_id', lessonIds),
      ]);

      (lessBooksRes.data || []).forEach((item: any) => {
        if (!lessonBookMap[item.lesson_id]) lessonBookMap[item.lesson_id] = [];
        lessonBookMap[item.lesson_id].push(item.book_id);
      });
      (lessVideosRes.data || []).forEach((item: any) => {
        if (!lessonVideoMap[item.lesson_id]) lessonVideoMap[item.lesson_id] = [];
        lessonVideoMap[item.lesson_id].push(item.video_id);
      });
    }

    // Build module structure with lessons
    const modulesWithLessons: Module[] = (modulesData || []).map((mod: any) => ({
      ...mod,
      lessons: (lessonsData || [])
        .filter((l: any) => l.module_id === mod.id)
        .map((l: any) => ({
          ...l,
          selectedBooks: lessonBookMap[l.id] || [],
          selectedVideos: lessonVideoMap[l.id] || [],
        })),
      selectedBooks: moduleBookMap[mod.id] || [],
      selectedVideos: moduleVideoMap[mod.id] || [],
    }));

    setModules(modulesWithLessons);
    setExpandedModules(new Set(modulesWithLessons.map((m: Module) => m.id)));
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
    if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailPreview(null);
  };

  const uploadThumbnail = async (id: string): Promise<string | null> => {
    if (!thumbnailFile) return null;

    const fileExt = thumbnailFile.name.split('.').pop();
    const fileName = `courses/${id}/thumbnail.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('library-files')
      .upload(fileName, thumbnailFile, { upsert: true });

    if (uploadError) {
      console.error('Thumbnail upload error:', uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage.from('library-files').getPublicUrl(fileName);
    return urlData?.publicUrl || null;
  };

  const saveCourse = async (): Promise<string | null> => {
    try {
      courseSchema.parse({ title, description });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: error.errors[0].message, variant: 'destructive' });
      }
      return null;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        description: description || null,
        difficulty,
        instructor_id: instructorId || null,
        estimated_duration_minutes: totalDurationMinutes || 0,
        max_capacity: maxCapacity || null,
        created_by: user!.id,
      };

      let id = savedCourseId;

      if (id) {
        const { error } = await supabase.from('courses').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('courses').insert(payload).select().single();
        if (error) throw error;
        id = data.id;
        setSavedCourseId(id);
      }

      // Upload thumbnail if new
      if (thumbnailFile && id) {
        const thumbnailUrl = await uploadThumbnail(id);
        if (thumbnailUrl) {
          await supabase.from('courses').update({ thumbnail_url: thumbnailUrl }).eq('id', id);
        }
      }

      // Update categories
      await supabase.from('course_categories').delete().eq('course_id', id);
      if (selectedCategories.length > 0) {
        await supabase.from('course_categories').insert(
          selectedCategories.map((catId) => ({ course_id: id, category_id: catId }))
        );
      }

      return id;
    } catch (error: any) {
      console.error('Error saving course:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      toast({ 
        title: 'Error saving course', 
        description: errorMessage,
        variant: 'destructive' 
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveLibraryAttachments = async (id: string) => {
    await supabase.from('course_library_books').delete().eq('course_id', id);
    await supabase.from('course_library_videos').delete().eq('course_id', id);

    if (courseBooks.length > 0) {
      await supabase.from('course_library_books').insert(
        courseBooks.map((bookId, idx) => ({ course_id: id, book_id: bookId, order_index: idx }))
      );
    }
    if (courseVideos.length > 0) {
      await supabase.from('course_library_videos').insert(
        courseVideos.map((videoId, idx) => ({ course_id: id, video_id: videoId, order_index: idx }))
      );
    }
  };

  const saveStructure = async (id: string) => {
    // Save modules and lessons
    for (let i = 0; i < modules.length; i++) {
      const mod = modules[i];
      let moduleId = mod.id;

      if (mod.id.startsWith('temp-')) {
        const { data, error } = await supabase
          .from('course_modules')
          .insert({
            course_id: id,
            title: mod.title || `Module ${i + 1}`,
            description: mod.description,
            order_index: i,
          })
          .select()
          .single();
        if (error) throw error;
        moduleId = data.id;
        modules[i].id = moduleId;
      } else {
        await supabase
          .from('course_modules')
          .update({
            title: mod.title || `Module ${i + 1}`,
            description: mod.description,
            order_index: i,
          })
          .eq('id', mod.id);
      }

      // Save module library attachments
      await supabase.from('module_library_books').delete().eq('module_id', moduleId);
      await supabase.from('module_library_videos').delete().eq('module_id', moduleId);

      if (mod.selectedBooks.length > 0) {
        await supabase.from('module_library_books').insert(
          mod.selectedBooks.map((bookId, idx) => ({ module_id: moduleId, book_id: bookId, order_index: idx }))
        );
      }
      if (mod.selectedVideos.length > 0) {
        await supabase.from('module_library_videos').insert(
          mod.selectedVideos.map((videoId, idx) => ({ module_id: moduleId, video_id: videoId, order_index: idx }))
        );
      }

      // Save lessons in module
      for (let j = 0; j < mod.lessons.length; j++) {
        const lesson = mod.lessons[j];
        let lessonId = lesson.id;

        if (lesson.id.startsWith('temp-')) {
          const { data, error } = await supabase
            .from('lessons')
            .insert({
              course_id: id,
              module_id: moduleId,
              title: lesson.title || `Lesson ${j + 1}`,
              video_url: lesson.video_url,
              pdf_url: lesson.pdf_url,
              order_index: j,
            })
            .select()
            .single();
          if (error) throw error;
          lessonId = data.id;
          mod.lessons[j].id = lessonId;
        } else {
          await supabase
            .from('lessons')
            .update({
              module_id: moduleId,
              title: lesson.title || `Lesson ${j + 1}`,
              video_url: lesson.video_url,
              pdf_url: lesson.pdf_url,
              order_index: j,
            })
            .eq('id', lesson.id);
        }

        // Save lesson library attachments
        await supabase.from('lesson_library_books').delete().eq('lesson_id', lessonId);
        await supabase.from('lesson_library_videos').delete().eq('lesson_id', lessonId);

        if (lesson.selectedBooks.length > 0) {
          await supabase.from('lesson_library_books').insert(
            lesson.selectedBooks.map((bookId, idx) => ({ lesson_id: lessonId, book_id: bookId, order_index: idx }))
          );
        }
        if (lesson.selectedVideos.length > 0) {
          await supabase.from('lesson_library_videos').insert(
            lesson.selectedVideos.map((videoId, idx) => ({ lesson_id: lessonId, video_id: videoId, order_index: idx }))
          );
        }
      }
    }
  };

  // Module management functions
  const addModule = () => {
    const newModule: Module = {
      id: `temp-${Date.now()}`,
      title: '',
      description: null,
      order_index: modules.length,
      lessons: [],
      selectedBooks: [],
      selectedVideos: [],
    };
    setModules([...modules, newModule]);
    setExpandedModules(new Set([...expandedModules, newModule.id]));
  };

  const updateModule = (index: number, field: keyof Module, value: any) => {
    const updated = [...modules];
    updated[index] = { ...updated[index], [field]: value };
    setModules(updated);
  };

  const removeModule = (index: number) => {
    setModules(modules.filter((_, i) => i !== index));
  };

  const addLessonToModule = (moduleIndex: number) => {
    const updated = [...modules];
    const mod = updated[moduleIndex];
    const newLesson: Lesson = {
      id: `temp-${Date.now()}`,
      title: '',
      video_url: null,
      pdf_url: null,
      order_index: mod.lessons.length,
      module_id: mod.id,
      selectedBooks: [],
      selectedVideos: [],
    };
    mod.lessons.push(newLesson);
    setModules(updated);
  };

  const updateLessonInModule = (moduleIndex: number, lessonIndex: number, field: keyof Lesson, value: any) => {
    const updated = [...modules];
    updated[moduleIndex].lessons[lessonIndex] = {
      ...updated[moduleIndex].lessons[lessonIndex],
      [field]: value,
    };
    setModules(updated);
  };

  const removeLessonFromModule = (moduleIndex: number, lessonIndex: number) => {
    const updated = [...modules];
    updated[moduleIndex].lessons = updated[moduleIndex].lessons.filter((_, i) => i !== lessonIndex);
    setModules(updated);
  };

  const toggleModuleExpanded = (moduleId: string) => {
    const newSet = new Set(expandedModules);
    if (newSet.has(moduleId)) {
      newSet.delete(moduleId);
    } else {
      newSet.add(moduleId);
    }
    setExpandedModules(newSet);
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      const id = await saveCourse();
      if (!id) return;
    }
    if (currentStep === 1 && savedCourseId) {
      setSaving(true);
      try {
        await saveLibraryAttachments(savedCourseId);
      } finally {
        setSaving(false);
      }
    }
    if (currentStep === 2 && savedCourseId) {
      setSaving(true);
      try {
        await saveStructure(savedCourseId);
      } catch (error) {
        console.error('Error saving structure:', error);
        toast({ title: 'Error saving course structure', variant: 'destructive' });
        setSaving(false);
        return;
      } finally {
        setSaving(false);
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const goToStep = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const handlePublish = async () => {
    if (!savedCourseId) return;

    setSaving(true);
    try {
      await saveLibraryAttachments(savedCourseId);
      await saveStructure(savedCourseId);
      toast({ title: 'Course published successfully!' });
      navigate(`/courses/${savedCourseId}`);
    } catch (error) {
      console.error('Error publishing:', error);
      toast({ title: 'Error publishing course', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getBookById = (id: string) => allBooks.find((b) => b.id === id);
  const getVideoById = (id: string) => allVideos.find((v) => v.id === id);
  const getInstructorName = () => teachers.find((t) => t.id === instructorId)?.full_name || 'Not assigned';
  const getCategoryNames = () => categories.filter((c) => selectedCategories.includes(c.id)).map((c) => c.name);

  // Count total lessons
  const totalLessons = modules.reduce((sum, mod) => sum + mod.lessons.length, 0);

  // Validation checklist for review
  const validationChecks = [
    { label: 'Course title', valid: title.trim().length >= 3 },
    { label: 'Description', valid: description.trim().length > 0 },
    { label: 'Duration set', valid: totalDurationMinutes > 0 },
    { label: 'Instructor assigned', valid: !!instructorId },
    { label: 'Categories selected', valid: selectedCategories.length > 0 },
    { label: 'Thumbnail uploaded', valid: !!thumbnailPreview },
    { label: 'At least one module', valid: modules.length > 0 },
    { label: 'At least one lesson', valid: totalLessons > 0 },
  ];

  const requiredValidations = validationChecks.slice(0, 1);
  const isReadyToPublish = requiredValidations.every((v) => v.valid);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isEditing ? 'Edit Course' : 'Create New Course'}
            </h1>
            <p className="text-muted-foreground">Step {currentStep + 1} of {STEPS.length}</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 overflow-x-auto pb-2">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isClickable = index < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => isClickable && goToStep(index)}
                  disabled={!isClickable}
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    isActive
                      ? 'border-primary bg-primary text-primary-foreground'
                      : isCompleted
                      ? 'border-primary bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                      : 'border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </button>
                <span
                  className={`ml-2 text-sm font-medium hidden sm:block ${
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 sm:w-12 h-0.5 mx-2 sm:mx-4 ${
                      isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-6">
            {/* Step 1: Details */}
            {currentStep === 0 && (
              <div className="space-y-6">
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What will students learn..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger>
                        <SelectValue />
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
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Instructor
                    </Label>
                    <Select
                      value={instructorId || 'none'}
                      onValueChange={(v) => setInstructorId(v === 'none' ? '' : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select instructor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No instructor</SelectItem>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Duration Controls */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Course Duration
                  </Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Weeks</Label>
                      <Select
                        value={durationWeeks.toString()}
                        onValueChange={(v) => setDurationWeeks(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 53 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i} week{i !== 1 ? 's' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Hours</Label>
                      <Select
                        value={durationHours.toString()}
                        onValueChange={(v) => setDurationHours(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 168 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i} hour{i !== 1 ? 's' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Minutes</Label>
                      <Select
                        value={durationMinutes.toString()}
                        onValueChange={(v) => setDurationMinutes(parseInt(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 60 }, (_, i) => (
                            <SelectItem key={i} value={i.toString()}>
                              {i} min
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {totalDurationMinutes > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Total: {formatDuration()}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Users className="h-4 w-4" /> Max Capacity
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxCapacity || ''}
                    onChange={(e) => setMaxCapacity(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Unlimited"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Thumbnail</Label>
                  {thumbnailPreview ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
                      <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
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
                      <span className="text-sm text-muted-foreground">Click to upload</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
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
              </div>
            )}

            {/* Step 2: Library */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Attach Library Resources</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select books and videos from your library to include in this course.
                  </p>
                </div>
                <LibrarySelector
                  selectedBooks={courseBooks}
                  selectedVideos={courseVideos}
                  onBooksChange={setCourseBooks}
                  onVideosChange={setCourseVideos}
                />
                {(courseBooks.length > 0 || courseVideos.length > 0) && (
                  <AttachedLibraryItems
                    books={courseBooks.map((id) => getBookById(id)).filter(Boolean) as AttachedBook[]}
                    videos={courseVideos.map((id) => getVideoById(id)).filter(Boolean) as AttachedVideo[]}
                    showActions={false}
                  />
                )}
              </div>
            )}

            {/* Step 3: Course Structure */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Course Structure</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Organize your course into modules and lessons. Each module can contain multiple lessons with their own resources.
                  </p>
                </div>

                {/* Add Module Button */}
                <div className="flex justify-end">
                  <Button onClick={addModule} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Module
                  </Button>
                </div>

                {/* Modules List */}
                {modules.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <FolderTree className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No modules yet. Create your first module to organize lessons!</p>
                    <Button onClick={addModule}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Module
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {modules.map((mod, moduleIndex) => (
                      <Card key={mod.id} className="border-l-4 border-l-primary">
                        <Collapsible
                          open={expandedModules.has(mod.id)}
                          onOpenChange={() => toggleModuleExpanded(mod.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                                  {expandedModules.has(mod.id) ? (
                                    <ChevronDown className="h-5 w-5" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5" />
                                  )}
                                  <div>
                                    <span className="text-xs text-muted-foreground">Module {moduleIndex + 1}</span>
                                    <p className="font-medium">{mod.title || 'Untitled Module'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">
                                    {mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeModule(moduleIndex);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <CardContent className="pt-0 space-y-4">
                              {/* Module details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label>Module Title</Label>
                                  <Input
                                    value={mod.title}
                                    onChange={(e) => updateModule(moduleIndex, 'title', e.target.value)}
                                    placeholder="e.g., Introduction to the Course"
                                  />
                                </div>
                                <div>
                                  <Label>Description (optional)</Label>
                                  <Input
                                    value={mod.description || ''}
                                    onChange={(e) => updateModule(moduleIndex, 'description', e.target.value)}
                                    placeholder="Brief description"
                                  />
                                </div>
                              </div>

                              {/* Module library attachments */}
                              <div>
                                <Label className="mb-2 block">Module Resources</Label>
                                <LibrarySelector
                                  selectedBooks={mod.selectedBooks}
                                  selectedVideos={mod.selectedVideos}
                                  onBooksChange={(ids) => updateModule(moduleIndex, 'selectedBooks', ids)}
                                  onVideosChange={(ids) => updateModule(moduleIndex, 'selectedVideos', ids)}
                                />
                              </div>

                              {/* Lessons in module */}
                              <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <Label className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Lessons
                                  </Label>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addLessonToModule(moduleIndex)}
                                  >
                                    <Plus className="mr-1 h-3 w-3" />
                                    Add Lesson
                                  </Button>
                                </div>
                                {mod.lessons.length === 0 ? (
                                  <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded">
                                    No lessons in this module yet.
                                  </p>
                                ) : (
                                  <div className="space-y-3">
                                    {mod.lessons.map((lesson, lessonIndex) => (
                                      <Card key={lesson.id} className="bg-muted/30">
                                        <CardContent className="p-4 space-y-3">
                                          <div className="flex items-start gap-3">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                                              <GripVertical className="h-4 w-4" />
                                              <span>#{lessonIndex + 1}</span>
                                            </div>
                                            <div className="flex-1 space-y-3">
                                              <Input
                                                value={lesson.title}
                                                onChange={(e) =>
                                                  updateLessonInModule(moduleIndex, lessonIndex, 'title', e.target.value)
                                                }
                                                placeholder="Lesson title"
                                              />
                                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                  <Label className="text-xs flex items-center gap-1">
                                                    <Video className="h-3 w-3" />
                                                    Video URL
                                                  </Label>
                                                  <Input
                                                    value={lesson.video_url || ''}
                                                    onChange={(e) =>
                                                      updateLessonInModule(moduleIndex, lessonIndex, 'video_url', e.target.value || null)
                                                    }
                                                    placeholder="YouTube or video URL"
                                                    className="mt-1"
                                                  />
                                                </div>
                                                <div>
                                                  <Label className="text-xs flex items-center gap-1">
                                                    <Book className="h-3 w-3" />
                                                    PDF URL
                                                  </Label>
                                                  <Input
                                                    value={lesson.pdf_url || ''}
                                                    onChange={(e) =>
                                                      updateLessonInModule(moduleIndex, lessonIndex, 'pdf_url', e.target.value || null)
                                                    }
                                                    placeholder="PDF file URL"
                                                    className="mt-1"
                                                  />
                                                </div>
                                              </div>
                                              {/* Lesson library attachments */}
                                              <div className="pt-2">
                                                <Label className="text-xs mb-1 block">Lesson Resources</Label>
                                                <LibrarySelector
                                                  selectedBooks={lesson.selectedBooks}
                                                  selectedVideos={lesson.selectedVideos}
                                                  onBooksChange={(ids) =>
                                                    updateLessonInModule(moduleIndex, lessonIndex, 'selectedBooks', ids)
                                                  }
                                                  onVideosChange={(ids) =>
                                                    updateLessonInModule(moduleIndex, lessonIndex, 'selectedVideos', ids)
                                                  }
                                                />
                                              </div>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => removeLessonFromModule(moduleIndex, lessonIndex)}
                                            >
                                              <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium mb-1">Review Your Course</h3>
                    <p className="text-sm text-muted-foreground">
                      Review the details before publishing your course.
                    </p>
                  </div>
                </div>

                {/* Course Summary */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <div className="flex gap-4">
                    {thumbnailPreview ? (
                      <img
                        src={thumbnailPreview}
                        alt="Thumbnail"
                        className="w-32 h-20 object-cover rounded"
                      />
                    ) : (
                      <div className="w-32 h-20 bg-muted rounded flex items-center justify-center">
                        <BookOpen className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h4 className="font-semibold text-lg">{title || 'Untitled Course'}</h4>
                        <Button variant="ghost" size="sm" onClick={() => goToStep(0)}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <Badge variant="outline" className="capitalize mt-1">
                        {difficulty}
                      </Badge>
                    </div>
                  </div>

                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}

                  <Separator />

                  {/* Course Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Instructor</p>
                      <p className="font-medium">{getInstructorName()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">{formatDuration()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Capacity</p>
                      <p className="font-medium">{maxCapacity || 'Unlimited'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Structure</p>
                      <p className="font-medium">{modules.length} modules, {totalLessons} lessons</p>
                    </div>
                  </div>

                  {/* Categories */}
                  {selectedCategories.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Categories</p>
                        <div className="flex flex-wrap gap-2">
                          {getCategoryNames().map((name) => (
                            <Badge key={name} variant="secondary">{name}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Course Structure Summary */}
                {modules.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center gap-2">
                        <FolderTree className="h-4 w-4" />
                        Course Structure
                      </h4>
                      <Button variant="ghost" size="sm" onClick={() => goToStep(2)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {modules.map((mod, idx) => (
                        <div key={mod.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{idx + 1}</Badge>
                              <span className="font-medium">{mod.title || 'Untitled Module'}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {mod.lessons.length > 0 && (
                            <div className="mt-2 pl-6 space-y-1">
                              {mod.lessons.map((lesson, lIdx) => (
                                <div key={lesson.id} className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span className="text-xs">{idx + 1}.{lIdx + 1}</span>
                                  <span>{lesson.title || 'Untitled Lesson'}</span>
                                  {lesson.video_url && <Video className="h-3 w-3" />}
                                  {lesson.pdf_url && <FileText className="h-3 w-3" />}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached Library Items */}
                {(courseBooks.length > 0 || courseVideos.length > 0) && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Attached Resources</h4>
                      <Button variant="ghost" size="sm" onClick={() => goToStep(1)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Books */}
                      {courseBooks.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Book className="h-4 w-4" />
                            Books ({courseBooks.length})
                          </p>
                          <div className="space-y-2">
                            {courseBooks.map((id) => {
                              const book = getBookById(id);
                              if (!book) return null;
                              return (
                                <div key={id} className="flex items-center gap-2 p-2 bg-muted rounded">
                                  {book.thumbnail_url ? (
                                    <img src={book.thumbnail_url} alt={book.title} className="w-8 h-10 object-cover rounded" />
                                  ) : (
                                    <div className="w-8 h-10 bg-background rounded flex items-center justify-center">
                                      <Book className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{book.title}</p>
                                    {book.author && (
                                      <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Videos */}
                      {courseVideos.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Video className="h-4 w-4" />
                            Videos ({courseVideos.length})
                          </p>
                          <div className="space-y-2">
                            {courseVideos.map((id) => {
                              const video = getVideoById(id);
                              if (!video) return null;
                              return (
                                <div key={id} className="flex items-center gap-2 p-2 bg-muted rounded">
                                  {video.thumbnail_url ? (
                                    <img src={video.thumbnail_url} alt={video.title} className="w-12 h-8 object-cover rounded" />
                                  ) : (
                                    <div className="w-12 h-8 bg-background rounded flex items-center justify-center">
                                      <Video className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{video.title}</p>
                                    {video.duration_minutes && (
                                      <p className="text-xs text-muted-foreground">{video.duration_minutes} min</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Validation Checklist */}
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Completion Checklist
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {validationChecks.map((check, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {check.valid ? (
                          <Check className="h-4 w-4 text-chart-2" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={check.valid ? 'text-foreground' : 'text-muted-foreground'}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {currentStep === STEPS.length - 1 ? (
            <Button onClick={handlePublish} disabled={saving || !isReadyToPublish}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Publish Course
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={saving || (currentStep === 0 && !title.trim())}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
