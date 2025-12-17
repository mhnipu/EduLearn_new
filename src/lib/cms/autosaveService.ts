/**
 * Autosave Service
 * 
 * Handles debounced autosave functionality for section drafts
 * with conflict detection and network failure handling
 */

import { supabase } from '@/integrations/supabase/client';

export interface AutosaveOptions {
  delay?: number; // Debounce delay in milliseconds (default: 3000)
  onSaveStart?: () => void;
  onSaveComplete?: () => void;
  onSaveError?: (error: Error) => void;
  onConflict?: () => void;
}

export class AutosaveService {
  private saveTimeout: NodeJS.Timeout | null = null;
  private isSaving = false;
  private lastSavedContent: any = null;
  private options: Required<AutosaveOptions>;

  constructor(options: AutosaveOptions = {}) {
    this.options = {
      delay: options.delay || 3000,
      onSaveStart: options.onSaveStart || (() => {}),
      onSaveComplete: options.onSaveComplete || (() => {}),
      onSaveError: options.onSaveError || (() => {}),
      onConflict: options.onConflict || (() => {}),
    };
  }

  /**
   * Schedule an autosave (debounced)
   */
  scheduleSave(
    sectionId: string,
    content: any,
    userId: string
  ): void {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Set new timeout
    this.saveTimeout = setTimeout(() => {
      this.save(sectionId, content, userId);
    }, this.options.delay);
  }

  /**
   * Immediately save (cancel debounce and save now)
   */
  async saveNow(
    sectionId: string,
    content: any,
    userId: string
  ): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.save(sectionId, content, userId);
  }

  /**
   * Save draft to database
   */
  private async save(
    sectionId: string,
    content: any,
    userId: string
  ): Promise<void> {
    if (this.isSaving) {
      return; // Already saving, skip
    }

    // Check if content has changed
    if (JSON.stringify(content) === JSON.stringify(this.lastSavedContent)) {
      return; // No changes, skip save
    }

    this.isSaving = true;
    this.options.onSaveStart();

    try {
      // Check for conflicts by getting current draft
      const { data: existingDraft, error: fetchError } = await supabase
        .from('page_section_drafts' as any)
        .select('content, updated_at')
        .eq('section_id', sectionId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine for new drafts
        throw fetchError;
      }

      // If draft exists and was updated by someone else recently, detect conflict
      if (existingDraft && existingDraft.updated_at) {
        const lastUpdate = new Date(existingDraft.updated_at);
        const now = new Date();
        const timeDiff = now.getTime() - lastUpdate.getTime();

        // If updated within last 5 seconds by someone else, potential conflict
        if (timeDiff < 5000 && existingDraft.content) {
          const existingContentStr = JSON.stringify(existingDraft.content);
          const newContentStr = JSON.stringify(content);

          // If content is different, notify about conflict
          if (existingContentStr !== newContentStr) {
            this.options.onConflict();
            // Still save, but user should be aware
          }
        }
      }

      // Upsert draft
      const { error: saveError } = await supabase
        .from('page_section_drafts' as any)
        .upsert({
          section_id: sectionId,
          content,
          status: 'draft',
          updated_by: userId,
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: 'section_id',
        });

      if (saveError) {
        throw saveError;
      }

      this.lastSavedContent = JSON.parse(JSON.stringify(content));
      this.options.onSaveComplete();
    } catch (error: any) {
      console.error('Autosave error:', error);
      this.options.onSaveError(error);
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Cancel pending save
   */
  cancel(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  /**
   * Reset saved content tracking
   */
  reset(): void {
    this.lastSavedContent = null;
    this.cancel();
  }

  /**
   * Check if currently saving
   */
  getSavingState(): boolean {
    return this.isSaving;
  }
}

/**
 * Create a new autosave service instance
 */
export function createAutosaveService(options?: AutosaveOptions): AutosaveService {
  return new AutosaveService(options);
}
