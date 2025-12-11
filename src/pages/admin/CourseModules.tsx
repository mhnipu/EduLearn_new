import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { LibrarySelector } from '@/components/course/LibrarySelector';
import { AttachedLibraryItems } from '@/components/course/AttachedLibraryItems';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  ChevronDown,
  ChevronRight,
  Book,
  Video,
  Layers,
  FileText,
  Loader2,
} from 'lucide-react';

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

interface Course {
  id: string;
  title: string;
  instructor_id: string | null;
}

interface LibraryBook {
  id: string;
  title: string;
  author: string | null;
  thumbnail_url: string | null;
  pdf_url: string;
}

interface LibraryVideo {
  id: string;
  title: string;
  thumbnail_url: string | null;
  youtube_url: string;
  duration_minutes: number | null;
}

export default function CourseModules() {
  const { courseId } = useParams();
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [standaloneLesson, setStandaloneLessons] = useState<Lesson[]>([]);
  const [courseBooks, setCourseBooks] = useState<string[]>([]);
  const [courseVideos, setCourseVideos] = useState<string[]>([]);
  const [allBooks, setAllBooks] = useState<LibraryBook[]>([]);
  const [allVideos, setAllVideos] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const isAdmin = role === 'admin' || role === 'super_admin';
  const canEdit = isAdmin || (role === 'teacher' && course?.instructor_id === user?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (courseId && user) {
      fetchData();
    }
  }, [courseId, user]);

  const fetchData = async () => {
    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, instructor_id')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch library items for reference
      const [booksResult, videosResult] = await Promise.all([
        supabase.from('books').select('id, title, author, thumbnail_url, pdf_url').eq('is_active', true),
        supabase.from('videos').select('id, title, thumbnail_url, youtube_url, duration_minutes').eq('is_active', true),
      ]);
      if (booksResult.data) setAllBooks(booksResult.data);
      if (videosResult.data) setAllVideos(videosResult.data);

      // Fetch course-level attached items
      const [courseLibBooksRes, courseLibVideosRes] = await Promise.all([
        supabase.from('course_library_books').select('book_id').eq('course_id', courseId!),
        supabase.from('course_library_videos').select('video_id').eq('course_id', courseId!),
      ]);
      setCourseBooks((courseLibBooksRes.data || []).map((b: any) => b.book_id));
      setCourseVideos((courseLibVideosRes.data || []).map((v: any) => v.video_id));

      // Fetch modules
      const { data: modulesData } = await supabase
        .from('course_modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
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

      // Standalone lessons (no module)
      const standalone = (lessonsData || [])
        .filter((l: any) => !l.module_id)
        .map((l: any) => ({
          ...l,
          selectedBooks: lessonBookMap[l.id] || [],
          selectedVideos: lessonVideoMap[l.id] || [],
        }));

      setModules(modulesWithLessons);
      setStandaloneLessons(standalone);
      
      // Expand all modules by default
      setExpandedModules(new Set(modulesWithLessons.map((m: Module) => m.id)));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading course data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

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

  const removeModule = async (index: number) => {
    const mod = modules[index];
    if (!mod.id.startsWith('temp-')) {
      try {
        await supabase.from('course_modules').delete().eq('id', mod.id);
      } catch (error) {
        toast({ title: 'Error deleting module', variant: 'destructive' });
        return;
      }
    }
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

  const removeLessonFromModule = async (moduleIndex: number, lessonIndex: number) => {
    const lesson = modules[moduleIndex].lessons[lessonIndex];
    if (!lesson.id.startsWith('temp-')) {
      try {
        await supabase.from('lessons').delete().eq('id', lesson.id);
      } catch (error) {
        toast({ title: 'Error deleting lesson', variant: 'destructive' });
        return;
      }
    }
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

  const saveAll = async () => {
    setSaving(true);
    try {
      // Save course-level library attachments
      await supabase.from('course_library_books').delete().eq('course_id', courseId!);
      await supabase.from('course_library_videos').delete().eq('course_id', courseId!);

      if (courseBooks.length > 0) {
        await supabase.from('course_library_books').insert(
          courseBooks.map((bookId, idx) => ({ course_id: courseId, book_id: bookId, order_index: idx }))
        );
      }
      if (courseVideos.length > 0) {
        await supabase.from('course_library_videos').insert(
          courseVideos.map((videoId, idx) => ({ course_id: courseId, video_id: videoId, order_index: idx }))
        );
      }

      // Save modules
      for (let i = 0; i < modules.length; i++) {
        const mod = modules[i];
        let moduleId = mod.id;

        if (mod.id.startsWith('temp-')) {
          const { data, error } = await supabase
            .from('course_modules')
            .insert({
              course_id: courseId,
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
                course_id: courseId,
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

      toast({ title: 'Course structure saved successfully' });
      fetchData();
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Error saving course structure', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getBookById = (id: string) => allBooks.find((b) => b.id === id);
  const getVideoById = (id: string) => allVideos.find((v) => v.id === id);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canEdit && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">You don't have permission to edit this course.</p>
          <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Course Structure</h1>
              <p className="text-muted-foreground">{course?.title}</p>
            </div>
          </div>
          <Button onClick={saveAll} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save All Changes
          </Button>
        </div>

        {/* Course-level Library Attachments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Course Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <LibrarySelector
              selectedBooks={courseBooks}
              selectedVideos={courseVideos}
              onBooksChange={setCourseBooks}
              onVideosChange={setCourseVideos}
            />
            <AttachedLibraryItems
              books={courseBooks.map((id) => getBookById(id)).filter(Boolean) as any}
              videos={courseVideos.map((id) => getVideoById(id)).filter(Boolean) as any}
              showActions={false}
            />
          </CardContent>
        </Card>

        {/* Modules */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Modules & Lessons
            </CardTitle>
            <Button onClick={addModule} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Module
            </Button>
          </CardHeader>
          <CardContent>
            {modules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">No modules yet. Create your first module to organize lessons!</p>
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
                        <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <GripVertical className="h-5 w-5 text-muted-foreground" />
                              {expandedModules.has(mod.id) ? (
                                <ChevronDown className="h-5 w-5" />
                              ) : (
                                <ChevronRight className="h-5 w-5" />
                              )}
                              <div>
                                <span className="text-sm text-muted-foreground">Module {moduleIndex + 1}</span>
                                <p className="font-medium">{mod.title || 'Untitled Module'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}
                              </span>
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
                              <Label>Lessons</Label>
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
                              <p className="text-sm text-muted-foreground text-center py-4">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
