/**
 * Result Publishing Service
 * 
 * Handles publishing of assessment results to students.
 * Supports draft, reviewed, and published states.
 */

import { supabase } from '@/integrations/supabase/client';

export type ResultStatus = 'draft' | 'reviewed' | 'published';

/**
 * Publish a single assignment submission result
 */
export async function publishAssignmentResult(
  submissionId: string,
  status: ResultStatus = 'published'
): Promise<boolean> {
  try {
    const updateData: any = {
      result_status: status,
    };

    if (status === 'published') {
      updateData.published_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('assignment_submissions')
      .update(updateData)
      .eq('id', submissionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error publishing assignment result:', error);
    return false;
  }
}

/**
 * Publish all results for an assignment
 */
export async function publishAllAssignmentResults(
  assignmentId: string,
  status: ResultStatus = 'published'
): Promise<{ success: number; failed: number }> {
  try {
    const updateData: any = {
      result_status: status,
    };

    if (status === 'published') {
      updateData.published_at = new Date().toISOString();
    }

    // Only publish graded submissions
    const { data, error } = await supabase
      .from('assignment_submissions')
      .update(updateData)
      .eq('assignment_id', assignmentId)
      .not('graded_at', 'is', null)
      .select('id');

    if (error) throw error;

    return {
      success: data?.length || 0,
      failed: 0,
    };
  } catch (error) {
    console.error('Error publishing all assignment results:', error);
    return { success: 0, failed: 1 };
  }
}

/**
 * Publish a single quiz submission result
 */
export async function publishQuizResult(
  submissionId: string,
  status: ResultStatus = 'published'
): Promise<boolean> {
  try {
    const updateData: any = {
      result_status: status,
    };

    if (status === 'published') {
      updateData.published_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('quiz_submissions')
      .update(updateData)
      .eq('id', submissionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error publishing quiz result:', error);
    return false;
  }
}

/**
 * Publish all results for a quiz
 */
export async function publishAllQuizResults(
  quizId: string,
  status: ResultStatus = 'published'
): Promise<{ success: number; failed: number }> {
  try {
    const updateData: any = {
      result_status: status,
    };

    if (status === 'published') {
      updateData.published_at = new Date().toISOString();
    }

    // Only publish graded submissions
    const { data, error } = await supabase
      .from('quiz_submissions')
      .update(updateData)
      .eq('quiz_id', quizId)
      .not('graded_at', 'is', null)
      .select('id');

    if (error) throw error;

    return {
      success: data?.length || 0,
      failed: 0,
    };
  } catch (error) {
    console.error('Error publishing all quiz results:', error);
    return { success: 0, failed: 1 };
  }
}

/**
 * Get result status summary for an assignment
 */
export async function getAssignmentResultStatusSummary(assignmentId: string) {
  try {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('result_status')
      .eq('assignment_id', assignmentId)
      .not('graded_at', 'is', null);

    if (error) throw error;

    const summary = {
      draft: 0,
      reviewed: 0,
      published: 0,
      total: data?.length || 0,
    };

    data?.forEach(sub => {
      const status = sub.result_status || 'draft';
      if (status in summary) {
        summary[status as keyof typeof summary]++;
      }
    });

    return summary;
  } catch (error) {
    console.error('Error getting result status summary:', error);
    return { draft: 0, reviewed: 0, published: 0, total: 0 };
  }
}

/**
 * Get result status summary for a quiz
 */
export async function getQuizResultStatusSummary(quizId: string) {
  try {
    const { data, error } = await supabase
      .from('quiz_submissions')
      .select('result_status')
      .eq('quiz_id', quizId)
      .not('graded_at', 'is', null);

    if (error) throw error;

    const summary = {
      draft: 0,
      reviewed: 0,
      published: 0,
      total: data?.length || 0,
    };

    data?.forEach(sub => {
      const status = sub.result_status || 'draft';
      if (status in summary) {
        summary[status as keyof typeof summary]++;
      }
    });

    return summary;
  } catch (error) {
    console.error('Error getting quiz result status summary:', error);
    return { draft: 0, reviewed: 0, published: 0, total: 0 };
  }
}
