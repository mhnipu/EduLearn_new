import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  EyeOff,
  GripVertical,
  Save,
  X
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PageSection {
  id: string;
  section_type: string;
  title: string | null;
  content: any;
  order_index: number;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

const SECTION_TYPES = [
  { value: 'hero', label: 'Hero Section' },
  { value: 'features', label: 'Features Section' },
  { value: 'cta', label: 'Call to Action' },
  { value: 'custom', label: 'Custom Section' },
];

export default function LandingPageCMS() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading: authLoading } = useAuth();
  const [sections, setSections] = useState<PageSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingSection, setEditingSection] = useState<PageSection | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSectionType, setNewSectionType] = useState('hero');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && role !== 'super_admin') {
      navigate('/dashboard');
      toast({
        title: 'Access Denied',
        description: 'Only Super Admin can manage landing page sections.',
        variant: 'destructive',
      });
    }
  }, [authLoading, user, role, navigate, toast]);

  useEffect(() => {
    if (user && role === 'super_admin') {
      fetchSections();
    }
  }, [user, role]);

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from('page_sections')
        .select('*')
        .eq('page_type', 'landing')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDefaultContent = (sectionType: string) => {
    switch (sectionType) {
      case 'hero':
        return {
          badge: 'Modern E-Learning Platform',
          title_line_1: 'Learn Anything,',
          title_line_2: 'Anytime, Anywhere',
          subtitle: 'Access high-quality courses, watch engaging video lessons, and download comprehensive study materials.',
          cta_primary: { text: 'Get Started Free', link: '/auth' },
          cta_secondary: { text: 'Browse Courses', link: '/courses' },
        };
      case 'features':
        return {
          title: 'Why Choose EduLearn?',
          subtitle: 'Everything you need to succeed in your learning journey',
          features: [
            { icon: 'Video', title: 'Video Lessons', description: 'Watch high-quality video tutorials from expert instructors' },
            { icon: 'FileText', title: 'Study Materials', description: 'Download comprehensive PDF resources and notes' },
            { icon: 'Users', title: 'Expert Teachers', description: 'Learn from experienced educators and industry professionals' },
          ],
        };
      case 'cta':
        return {
          title: 'Ready to Start Learning?',
          subtitle: 'Join thousands of students already learning on our platform.',
          cta_text: 'Get Started Free',
          cta_link: '/auth',
          show_when_logged_in: false,
        };
      case 'custom':
        return {
          html: '<div class="text-center"><h2>Custom Section</h2><p>Add your custom content here</p></div>',
        };
      default:
        return {};
    }
  };

  const createSection = async () => {
    if (!user) return;

    try {
      setIsSaving(true);
      const maxOrder = sections.length > 0 
        ? Math.max(...sections.map(s => s.order_index)) 
        : -1;

      const defaultContent = getDefaultContent(newSectionType);

      const { data, error } = await supabase
        .from('page_sections')
        .insert({
          page_type: 'landing',
          section_type: newSectionType,
          title: SECTION_TYPES.find(t => t.value === newSectionType)?.label || 'New Section',
          content: defaultContent,
          order_index: maxOrder + 1,
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Section created successfully.',
      });

      setEditingSection(data);
      setIsDialogOpen(false);
      await fetchSections();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSection = async (section: PageSection) => {
    if (!user) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('page_sections')
        .update({
          title: section.title,
          content: section.content,
          is_active: section.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', section.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Section updated successfully.',
      });

      setEditingSection(null);
      await fetchSections();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    try {
      const { error } = await supabase
        .from('page_sections')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Section deleted successfully.',
      });

      await fetchSections();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const toggleSectionActive = async (section: PageSection) => {
    const updated = { ...section, is_active: !section.is_active };
    await updateSection(updated);
  };

  const moveSection = async (sectionId: string, direction: 'up' | 'down') => {
    const currentIndex = sections.findIndex(s => s.id === sectionId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const updatedSections = [...sections];
    const [moved] = updatedSections.splice(currentIndex, 1);
    updatedSections.splice(newIndex, 0, moved);

    // Update order_index for all affected sections
    try {
      setIsSaving(true);
      const updates = updatedSections.map((section, index) => ({
        id: section.id,
        order_index: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('page_sections')
          .update({ order_index: update.order_index })
          .eq('id', update.id);

        if (error) throw error;
      }

      await fetchSections();
      toast({
        title: 'Success',
        description: 'Section order updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderContentEditor = (section: PageSection) => {
    const { section_type, content } = section;

    switch (section_type) {
      case 'hero':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Badge Text</Label>
              <Input
                value={content?.badge || ''}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, badge: e.target.value },
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title Line 1</Label>
                <Input
                  value={content?.title_line_1 || ''}
                  onChange={(e) => setEditingSection({
                    ...section,
                    content: { ...content, title_line_1: e.target.value },
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Title Line 2</Label>
                <Input
                  value={content?.title_line_2 || ''}
                  onChange={(e) => setEditingSection({
                    ...section,
                    content: { ...content, title_line_2: e.target.value },
                  })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Textarea
                value={content?.subtitle || ''}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, subtitle: e.target.value },
                })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary CTA Text</Label>
                <Input
                  value={content?.cta_primary?.text || ''}
                  onChange={(e) => setEditingSection({
                    ...section,
                    content: {
                      ...content,
                      cta_primary: { ...content?.cta_primary, text: e.target.value },
                    },
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Primary CTA Link</Label>
                <Input
                  value={content?.cta_primary?.link || ''}
                  onChange={(e) => setEditingSection({
                    ...section,
                    content: {
                      ...content,
                      cta_primary: { ...content?.cta_primary, link: e.target.value },
                    },
                  })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Secondary CTA Text</Label>
                <Input
                  value={content?.cta_secondary?.text || ''}
                  onChange={(e) => setEditingSection({
                    ...section,
                    content: {
                      ...content,
                      cta_secondary: { ...content?.cta_secondary, text: e.target.value },
                    },
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>Secondary CTA Link</Label>
                <Input
                  value={content?.cta_secondary?.link || ''}
                  onChange={(e) => setEditingSection({
                    ...section,
                    content: {
                      ...content,
                      cta_secondary: { ...content?.cta_secondary, link: e.target.value },
                    },
                  })}
                />
              </div>
            </div>
          </div>
        );

      case 'features':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Section Title</Label>
              <Input
                value={content?.title || ''}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, title: e.target.value },
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Section Subtitle</Label>
              <Textarea
                value={content?.subtitle || ''}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, subtitle: e.target.value },
                })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Features (JSON Array)</Label>
              <Textarea
                value={JSON.stringify(content?.features || [], null, 2)}
                onChange={(e) => {
                  try {
                    const features = JSON.parse(e.target.value);
                    setEditingSection({
                      ...section,
                      content: { ...content, features },
                    });
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                rows={10}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Format: [{"{"}"icon": "Video", "title": "Title", "description": "Description"{"}"}]
              </p>
            </div>
          </div>
        );

      case 'cta':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={content?.title || ''}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, title: e.target.value },
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Textarea
                value={content?.subtitle || ''}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, subtitle: e.target.value },
                })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CTA Text</Label>
                <Input
                  value={content?.cta_text || ''}
                  onChange={(e) => setEditingSection({
                    ...section,
                    content: { ...content, cta_text: e.target.value },
                  })}
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Link</Label>
                <Input
                  value={content?.cta_link || ''}
                  onChange={(e) => setEditingSection({
                    ...section,
                    content: { ...content, cta_link: e.target.value },
                  })}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={content?.show_when_logged_in || false}
                onCheckedChange={(checked) => setEditingSection({
                  ...section,
                  content: { ...content, show_when_logged_in: checked },
                })}
              />
              <Label>Show when user is logged in</Label>
            </div>
          </div>
        );

      case 'custom':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>HTML Content</Label>
              <Textarea
                value={content?.html || ''}
                onChange={(e) => setEditingSection({
                  ...section,
                  content: { ...content, html: e.target.value },
                })}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
          </div>
        );

      default:
        return <div className="text-muted-foreground">No editor available for this section type.</div>;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (role !== 'super_admin') {
    return null;
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Landing Page CMS</h1>
            <p className="text-muted-foreground">Manage landing page sections (Super Admin Only)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/dashboard/admin')}>
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              View Landing Page
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Section
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Section</DialogTitle>
                  <DialogDescription>Choose a section type to add to the landing page.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Section Type</Label>
                    <Select value={newSectionType} onValueChange={setNewSectionType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createSection} disabled={isSaving}>
                      {isSaving ? 'Creating...' : 'Create'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            Only Super Admin can manage landing page sections. Other users can only view the landing page.
            Layout structure, animations, and gradient styles are fixed and cannot be modified.
          </AlertDescription>
        </Alert>

        {sections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No sections found. Create your first section to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sections.map((section, index) => (
              <Card key={section.id} className={!section.is_active ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {section.title || 'Untitled Section'}
                          <Badge variant={section.is_active ? 'default' : 'secondary'}>
                            {section.section_type}
                          </Badge>
                          {!section.is_active && (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Order: {section.order_index} | Created: {new Date(section.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSection(section.id, 'up')}
                        disabled={index === 0 || isSaving}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSection(section.id, 'down')}
                        disabled={index === sections.length - 1 || isSaving}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSectionActive(section)}
                        disabled={isSaving}
                      >
                        {section.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingSection(section)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSection(section.id)}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {editingSection && (
          <Dialog open={!!editingSection} onOpenChange={(open) => !open && setEditingSection(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Section: {editingSection.title}</DialogTitle>
                <DialogDescription>
                  Modify the content for this section. Layout and styling are fixed.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Section Title</Label>
                  <Input
                    value={editingSection.title || ''}
                    onChange={(e) => setEditingSection({
                      ...editingSection,
                      title: e.target.value,
                    })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={editingSection.is_active}
                    onCheckedChange={(checked) => setEditingSection({
                      ...editingSection,
                      is_active: checked,
                    })}
                  />
                  <Label>Active</Label>
                </div>
                {renderContentEditor(editingSection)}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditingSection(null)}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                  <Button onClick={() => updateSection(editingSection)} disabled={isSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
