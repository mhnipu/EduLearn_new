import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Trash2, GripVertical, Video, FileText, Save } from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  pdf_url: string | null;
  order_index: number;
}

interface Course {
  id: string;
  title: string;
  created_by: string;
}

const LessonManagement = () => {
  const { courseId } = useParams();
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (courseId && user) {
      fetchCourseAndLessons();
    }
  }, [courseId, user]);

  const fetchCourseAndLessons = async () => {
    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, created_by')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      // Check permission
      if (courseData.created_by !== user?.id && !['super_admin', 'admin'].includes(role || '')) {
        toast({ title: 'Access denied', variant: 'destructive' });
        navigate('/dashboard/teacher');
        return;
      }

      setCourse(courseData);

      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      setLessons(lessonsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error loading course', variant: 'destructive' });
    } finally {
      setLoadingData(false);
    }
  };

  const addLesson = () => {
    const newLesson: Lesson = {
      id: `temp-${Date.now()}`,
      title: '',
      video_url: null,
      pdf_url: null,
      order_index: lessons.length,
    };
    setLessons([...lessons, newLesson]);
  };

  const updateLesson = (index: number, field: keyof Lesson, value: string) => {
    const updated = [...lessons];
    updated[index] = { ...updated[index], [field]: value || null };
    setLessons(updated);
  };

  const removeLesson = async (index: number) => {
    const lesson = lessons[index];
    
    if (!lesson.id.startsWith('temp-')) {
      try {
        await supabase.from('lessons').delete().eq('id', lesson.id);
        toast({ title: 'Lesson deleted' });
      } catch (error) {
        toast({ title: 'Error deleting lesson', variant: 'destructive' });
        return;
      }
    }
    
    const updated = lessons.filter((_, i) => i !== index);
    setLessons(updated);
  };

  const handlePdfUpload = async (index: number, file: File) => {
    const lesson = lessons[index];
    setUploadingPdf(lesson.id);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `lessons/${courseId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('library-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('library-files')
        .getPublicUrl(filePath);

      updateLesson(index, 'pdf_url', urlData.publicUrl);
      toast({ title: 'PDF uploaded successfully' });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: 'Error uploading PDF', variant: 'destructive' });
    } finally {
      setUploadingPdf(null);
    }
  };

  const saveLessons = async () => {
    setSaving(true);

    try {
      for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        const lessonData = {
          course_id: courseId,
          title: lesson.title || `Lesson ${i + 1}`,
          video_url: lesson.video_url,
          pdf_url: lesson.pdf_url,
          order_index: i,
        };

        if (lesson.id.startsWith('temp-')) {
          // Create new lesson
          const { data, error } = await supabase
            .from('lessons')
            .insert(lessonData)
            .select()
            .single();

          if (error) throw error;
          lessons[i] = data;
        } else {
          // Update existing lesson
          const { error } = await supabase
            .from('lessons')
            .update(lessonData)
            .eq('id', lesson.id);

          if (error) throw error;
        }
      }

      toast({ title: 'Lessons saved successfully' });
      fetchCourseAndLessons();
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Error saving lessons', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Lessons</h1>
            <p className="text-muted-foreground">{course?.title}</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Course Lessons</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={addLesson}>
                <Plus className="mr-2 h-4 w-4" />
                Add Lesson
              </Button>
              <Button onClick={saveLessons} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No lessons yet. Add your first lesson!</p>
                <Button onClick={addLesson}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Lesson
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {lessons.map((lesson, index) => (
                  <Card key={lesson.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center h-10">
                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                          <span className="ml-2 text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                        </div>
                        
                        <div className="flex-1 space-y-4">
                          <div>
                            <Label>Lesson Title</Label>
                            <Input
                              value={lesson.title}
                              onChange={(e) => updateLesson(index, 'title', e.target.value)}
                              placeholder="Enter lesson title"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="flex items-center gap-2">
                                <Video className="h-4 w-4" />
                                YouTube URL
                              </Label>
                              <Input
                                value={lesson.video_url || ''}
                                onChange={(e) => updateLesson(index, 'video_url', e.target.value)}
                                placeholder="https://youtube.com/watch?v=..."
                              />
                            </div>

                            <div>
                              <Label className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                PDF File
                              </Label>
                              {lesson.pdf_url ? (
                                <div className="flex items-center gap-2">
                                  <Input value="PDF uploaded" disabled className="flex-1" />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateLesson(index, 'pdf_url', '')}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              ) : (
                                <Input
                                  type="file"
                                  accept=".pdf"
                                  disabled={uploadingPdf === lesson.id}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handlePdfUpload(index, file);
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeLesson(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LessonManagement;
