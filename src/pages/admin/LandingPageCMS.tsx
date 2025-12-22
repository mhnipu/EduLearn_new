import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Lock, Unlock, Copy } from 'lucide-react';
import { SectionList } from '@/components/cms/SectionList';
import { SectionEditor } from '@/components/cms/SectionEditor';
import { SectionLibrary } from '@/components/cms/SectionLibrary';
import { getDefaultContent, getSectionSchema } from '@/lib/cms/sectionSchemas';
import { BackButton } from '@/components/BackButton';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PageSection {
  id: string;
  section_type: string;
  title: string | null;
  content: any;
  order_index: number;
  is_active: boolean;
  is_locked?: boolean;
  layout_variant?: string | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export default function LandingPageCMS() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading: authLoading } = useAuth();
  const [sections, setSections] = useState<PageSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<PageSection | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);

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
      setIsLoading(true);
      const { data, error } = await supabase
        .from('page_sections' as any)
        .select('*')
        .eq('page_type', 'landing')
        .order('order_index', { ascending: true });

      if (error) throw error;
      setSections((data || []) as unknown as PageSection[]);
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

  const handleAddSection = async (sectionType: string, layoutVariant?: string) => {
    if (!user) return;

    try {
      const maxOrder = sections.length > 0 
        ? Math.max(...sections.map(s => s.order_index)) 
        : -1;

      const schema = getSectionSchema(sectionType);
      const defaultContent = getDefaultContent(sectionType);

      const { data, error } = await supabase
        .from('page_sections' as any)
        .insert({
          page_type: 'landing',
          section_type: sectionType,
          title: schema?.display_name || 'New Section',
          content: defaultContent,
          layout_variant: layoutVariant || null,
          order_index: maxOrder + 1,
          is_active: true,
          is_locked: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Failed to create section');

      toast({
        title: 'Success',
        description: 'Section created successfully.',
      });

      await fetchSections();
      setEditingSection(data as unknown as PageSection);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleReorder = async (newOrder: PageSection[]) => {
    try {
      // Update all sections with new order_index
      const updates = newOrder.map((section, index) => ({
        id: section.id,
        order_index: index,
      }));

      for (const update of updates) {
      const { error } = await supabase
          .from('page_sections' as any)
          .update({ order_index: update.order_index })
          .eq('id', update.id);

      if (error) throw error;
      }

      setSections(newOrder);
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
      await fetchSections(); // Revert on error
    }
  };

  const handleEdit = (section: PageSection) => {
    if (section.is_locked) {
      toast({
        title: 'Section Locked',
        description: 'Please unlock the section before editing.',
        variant: 'destructive',
      });
      return;
    }
    setEditingSection(section);
  };

  const handleDelete = (sectionId: string) => {
    setSectionToDelete(sectionId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!sectionToDelete) return;

    try {
      const { error } = await supabase
        .from('page_sections' as any)
        .delete()
        .eq('id', sectionToDelete);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Section deleted successfully.',
      });

      await fetchSections();
      setDeleteConfirmOpen(false);
      setSectionToDelete(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (section: PageSection) => {
    try {
      const { error } = await supabase
        .from('page_sections' as any)
        .update({ is_active: !section.is_active })
        .eq('id', section.id);

      if (error) throw error;

      await fetchSections();
      toast({
        title: 'Success',
        description: `Section ${!section.is_active ? 'activated' : 'deactivated'}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleLock = async (section: PageSection) => {
    try {
        const { error } = await supabase
        .from('page_sections' as any)
        .update({ is_locked: !section.is_locked } as any)
        .eq('id', section.id);

        if (error) throw error;

      await fetchSections();
      toast({
        title: 'Success',
        description: `Section ${!section.is_locked ? 'locked' : 'unlocked'}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (section: PageSection) => {
    if (!user) return;

    try {
      const maxOrder = sections.length > 0
        ? Math.max(...sections.map(s => s.order_index))
        : -1;

      const { data, error } = await supabase
        .from('page_sections' as any)
        .insert({
          page_type: 'landing',
          section_type: section.section_type,
          title: `${section.title} (Copy)`,
          content: section.content,
          layout_variant: section.layout_variant,
          order_index: maxOrder + 1,
          is_active: false, // Duplicates start as inactive
          is_locked: false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Section duplicated successfully.',
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

  const handleSave = async () => {
    await fetchSections();
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
            <BackButton 
              fallbackPath="/dashboard/admin"
              fallbackLabel="Back to Admin Dashboard"
            />
            <Button variant="outline" onClick={() => navigate('/')}>
              View Landing Page
            </Button>
            <Button onClick={() => setIsLibraryOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Section
                </Button>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            Only Super Admin can manage landing page sections. Other users can only view the landing page.
            Use the section library to add new sections, drag to reorder, and edit content with the enhanced editor.
          </AlertDescription>
        </Alert>

        <SectionList
          sections={sections}
          onReorder={handleReorder}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onToggleLock={handleToggleLock}
          onDuplicate={handleDuplicate}
        />

        <SectionLibrary
          open={isLibraryOpen}
          onClose={() => setIsLibraryOpen(false)}
          onSelect={handleAddSection}
        />

        {editingSection && user && (
          <SectionEditor
            section={editingSection}
            open={!!editingSection}
            onClose={() => setEditingSection(null)}
            onSave={handleSave}
            userId={user.id}
          />
        )}

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Section?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the section
                and all its associated drafts and versions.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}


