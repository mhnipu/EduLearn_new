/**
 * Version Service
 * 
 * Handles version history management for page sections
 * including creating versions, retrieving history, and rollback
 */

import { supabase } from '@/integrations/supabase/client';

export interface SectionVersion {
  id: string;
  section_id: string;
  version_number: number;
  content: any;
  created_at: string;
  created_by: string | null;
  created_by_name?: string;
}

export class VersionService {
  /**
   * Create a new version from current section content
   */
  static async createVersion(
    sectionId: string,
    content: any,
    userId: string
  ): Promise<void> {
    try {
      // Call the database function to create version
      const { error } = await supabase.rpc('create_section_version', {
        p_section_id: sectionId,
        p_content: content,
        p_created_by: userId,
      });

      if (error) {
        // If function doesn't exist, create version manually
        if (error.code === '42883') {
          await this.createVersionManually(sectionId, content, userId);
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      console.error('Error creating version:', error);
      throw error;
    }
  }

  /**
   * Create version manually (fallback if function doesn't exist)
   */
  private static async createVersionManually(
    sectionId: string,
    content: any,
    userId: string
  ): Promise<void> {
    // Get current max version number
    const { data: versions, error: fetchError } = await supabase
      .from('page_section_versions' as any)
      .select('version_number')
      .eq('section_id', sectionId)
      .order('version_number', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    const nextVersion = versions && versions.length > 0
      ? versions[0].version_number + 1
      : 1;

    // Insert new version
    const { error: insertError } = await supabase
      .from('page_section_versions' as any)
      .insert({
        section_id: sectionId,
        version_number: nextVersion,
        content,
        created_by: userId,
      } as any);

    if (insertError) throw insertError;

    // Keep only last 5 versions
    const { data: allVersions, error: countError } = await supabase
      .from('page_section_versions' as any)
        .select('id, version_number')
        .eq('section_id', sectionId)
        .order('version_number', { ascending: false });

    if (countError) throw countError;

    if (allVersions && allVersions.length > 5) {
      // Delete oldest versions
      const versionsToDelete = allVersions.slice(5);
      const idsToDelete = versionsToDelete.map(v => v.id);

      const { error: deleteError } = await supabase
        .from('page_section_versions' as any)
        .delete()
        .in('id', idsToDelete);

      if (deleteError) throw deleteError;
    }
  }

  /**
   * Get version history for a section
   */
  static async getVersionHistory(sectionId: string): Promise<SectionVersion[]> {
    try {
      const { data, error } = await supabase
        .from('page_section_versions' as any)
        .select(`
          id,
          section_id,
          version_number,
          content,
          created_at,
          created_by,
          profiles:created_by (
            full_name,
            email
          )
        `)
        .eq('section_id', sectionId)
        .order('version_number', { ascending: false })
        .limit(5);

      if (error) throw error;

      return (data || []).map((version: any) => ({
        id: version.id,
        section_id: version.section_id,
        version_number: version.version_number,
        content: version.content,
        created_at: version.created_at,
        created_by: version.created_by,
        created_by_name: version.profiles?.full_name || version.profiles?.email || 'Unknown',
      }));
    } catch (error: any) {
      console.error('Error fetching version history:', error);
      throw error;
    }
  }

  /**
   * Get a specific version by ID
   */
  static async getVersion(versionId: string): Promise<SectionVersion | null> {
    try {
      const { data, error } = await supabase
        .from('page_section_versions' as any)
        .select(`
          id,
          section_id,
          version_number,
          content,
          created_at,
          created_by,
          profiles:created_by (
            full_name,
            email
          )
        `)
        .eq('id', versionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return {
        id: data.id,
        section_id: data.section_id,
        version_number: data.version_number,
        content: data.content,
        created_at: data.created_at,
        created_by: data.created_by,
        created_by_name: data.profiles?.full_name || data.profiles?.email || 'Unknown',
      };
    } catch (error: any) {
      console.error('Error fetching version:', error);
      throw error;
    }
  }

  /**
   * Rollback to a specific version (creates draft from version)
   */
  static async rollbackToVersion(
    sectionId: string,
    versionId: string,
    userId: string
  ): Promise<void> {
    try {
      // Get version content
      const version = await this.getVersion(versionId);
      if (!version) {
        throw new Error('Version not found');
      }

      // Create draft from version content
      const { error } = await supabase
        .from('page_section_drafts' as any)
        .upsert({
          section_id: sectionId,
          content: version.content,
          status: 'draft',
          updated_by: userId,
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: 'section_id',
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error rolling back to version:', error);
      throw error;
    }
  }

  /**
   * Delete a version
   */
  static async deleteVersion(versionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('page_section_versions' as any)
        .delete()
        .eq('id', versionId);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error deleting version:', error);
      throw error;
    }
  }
}
