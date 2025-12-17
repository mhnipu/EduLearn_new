import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TextField } from './fields/TextField';
import { TextareaField } from './fields/TextareaField';
import { ImageField } from './fields/ImageField';
import { ButtonField } from './fields/ButtonField';
import { ArrayField } from './fields/ArrayField';
import { BooleanField } from './fields/BooleanField';
import { DraftStatus } from './DraftStatus';
import { PublishButton } from './PublishButton';
import { PreviewToggle } from './PreviewToggle';
import { VersionHistory } from './VersionHistory';
import { getSectionSchema, getLayoutVariants } from '@/lib/cms/sectionSchemas';
import { createAutosaveService, AutosaveService } from '@/lib/cms/autosaveService';
import { VersionService } from '@/lib/cms/versionService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

interface PageSection {
  id: string;
  section_type: string;
  title: string | null;
  content: any;
  layout_variant?: string | null;
  is_active: boolean;
  is_locked?: boolean;
}

interface SectionEditorProps {
  section: PageSection | null;
  open: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  userId: string;
}

export function SectionEditor({ section, open, onClose, onSave, userId }: SectionEditorProps) {
  const [editingSection, setEditingSection] = useState<PageSection | null>(null);
  const [draftContent, setDraftContent] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'saving' | 'saved' | 'error' | 'unsaved'>('unsaved');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autosaveService, setAutosaveService] = useState<AutosaveService | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (section && open) {
      setEditingSection(section);
      loadDraft();
    }
  }, [section, open]);

  useEffect(() => {
    if (open && editingSection) {
      const service = createAutosaveService({
        onSaveStart: () => setAutosaveStatus('saving'),
        onSaveComplete: () => {
          setAutosaveStatus('saved');
          setHasUnsavedChanges(false);
        },
        onSaveError: (error) => {
          console.error('Autosave error:', error);
          setAutosaveStatus('error');
        },
        onConflict: () => {
          toast({
            title: 'Conflict detected',
            description: 'Another user may have edited this section. Please refresh.',
            variant: 'destructive',
          });
        },
      });
      setAutosaveService(service);

      return () => {
        service.cancel();
      };
    }
  }, [open, editingSection]);

  const loadDraft = async () => {
    if (!section) return;

    try {
      const { data, error } = await supabase
        .from('page_section_drafts' as any)
        .select('content')
        .eq('section_id', section.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setDraftContent(data.content);
        setEditingSection({ ...section, content: data.content });
      } else {
        setDraftContent(section.content);
        setEditingSection(section);
      }
    } catch (error: any) {
      console.error('Error loading draft:', error);
      setDraftContent(section.content);
      setEditingSection(section);
    }
  };

  const handleContentChange = useCallback((field: string, value: any) => {
    if (!editingSection) return;

    const updatedContent = { ...editingSection.content, [field]: value };
    const updatedSection = { ...editingSection, content: updatedContent };
    
    setEditingSection(updatedSection);
    setDraftContent(updatedContent);
    setHasUnsavedChanges(true);
    setAutosaveStatus('unsaved');

    // Schedule autosave
    if (autosaveService) {
      autosaveService.scheduleSave(section!.id, updatedContent, userId);
    }
  }, [editingSection, autosaveService, section, userId]);

  const handlePublish = async () => {
    if (!section || !editingSection) return;

    try {
      // Create version from current published content
      await VersionService.createVersion(section.id, section.content, userId);

      // Update section with draft content
      const { error: updateError } = await supabase
        .from('page_sections' as any)
        .update({
          content: draftContent,
          published_at: new Date().toISOString(),
          published_by: userId,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', section.id);

      if (updateError) throw updateError;

      // Clear draft
      await supabase
        .from('page_section_drafts' as any)
        .delete()
        .eq('section_id', section.id);

      toast({
        title: 'Published successfully',
        description: 'Section has been published and is now live.',
      });

      await onSave();
      onClose();
    } catch (error: any) {
      console.error('Publish error:', error);
      toast({
        title: 'Publish failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRollback = async (versionId: string) => {
    try {
      await VersionService.rollbackToVersion(section!.id, versionId, userId);
      await loadDraft();
      toast({
        title: 'Rollback successful',
        description: 'Draft restored from version.',
      });
    } catch (error: any) {
      console.error('Rollback error:', error);
      toast({
        title: 'Rollback failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const renderField = (field: any) => {
    if (!editingSection) return null;

    const fieldValue = editingSection.content[field.name];

    switch (field.type) {
      case 'text':
        return (
          <TextField
            key={field.name}
            label={field.label}
            value={fieldValue || ''}
            onChange={(value) => handleContentChange(field.name, value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'textarea':
        return (
          <TextareaField
            key={field.name}
            label={field.label}
            value={fieldValue || ''}
            onChange={(value) => handleContentChange(field.name, value)}
            placeholder={field.placeholder}
            required={field.required}
          />
        );
      case 'image':
        return (
          <ImageField
            key={field.name}
            label={field.label}
            value={fieldValue || ''}
            onChange={(value) => handleContentChange(field.name, value)}
            required={field.required}
          />
        );
      case 'button':
        return (
          <ButtonField
            key={field.name}
            label={field.label}
            value={fieldValue || { text: '', link: '' }}
            onChange={(value) => handleContentChange(field.name, value)}
            required={field.required}
          />
        );
      case 'array':
        return (
          <ArrayField
            key={field.name}
            label={field.label}
            value={fieldValue || []}
            onChange={(value) => handleContentChange(field.name, value)}
            itemSchema={field.itemSchema || {}}
            required={field.required}
          />
        );
      case 'boolean':
        return (
          <BooleanField
            key={field.name}
            label={field.label}
            value={fieldValue || false}
            onChange={(value) => handleContentChange(field.name, value)}
            required={field.required}
          />
        );
      default:
        return null;
    }
  };

  if (!editingSection) return null;

  const schema = getSectionSchema(editingSection.section_type);
  const layoutVariants = getLayoutVariants(editingSection.section_type);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit Section: {editingSection.title || 'Untitled'}</DialogTitle>
            <div className="flex items-center gap-2">
              <DraftStatus status={autosaveStatus} hasUnsavedChanges={hasUnsavedChanges} />
              <PreviewToggle
                previewMode={previewMode}
                onToggle={setPreviewMode}
              />
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="content" className="w-full">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4 mt-4">
            {previewMode ? (
              <div className="border rounded-lg p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground mb-4">Preview Mode</p>
                {/* Preview would render the section here */}
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(draftContent, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="space-y-4">
                {schema?.fields.map((field) => renderField(field))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Section Title</Label>
              <Input
                value={editingSection.title || ''}
                onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
              />
            </div>
            {layoutVariants.length > 0 && (
              <div className="space-y-2">
                <Label>Layout Variant</Label>
                <Select
                  value={editingSection.layout_variant || layoutVariants[0]}
                  onValueChange={(value) => setEditingSection({ ...editingSection, layout_variant: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {layoutVariants.map((variant) => (
                      <SelectItem key={variant} value={variant}>
                        {variant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Switch
                checked={editingSection.is_active}
                onCheckedChange={(checked) => setEditingSection({ ...editingSection, is_active: checked })}
              />
              <Label>Active</Label>
            </div>
          </TabsContent>

          <TabsContent value="versions" className="mt-4">
            <VersionHistory
              sectionId={editingSection.id}
              onRollback={handleRollback}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <PublishButton
            onPublish={handlePublish}
            hasDraft={!!draftContent}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
