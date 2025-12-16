/**
 * Late Submission Penalty Calculator
 * 
 * Calculates penalties for late assignment submissions.
 */

import { supabase } from '@/integrations/supabase/client';

export interface LatePenaltyResult {
  isLate: boolean;
  daysLate: number;
  penaltyPercentage: number;
  originalScore: number;
  finalScore: number;
  penaltyAmount: number;
}

/**
 * Calculate late submission penalty for an assignment submission
 */
export async function calculateLatePenalty(
  assignmentId: string,
  submissionId: string
): Promise<LatePenaltyResult | null> {
  try {
    // Get assignment details
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('due_date, late_submission_allowed, late_penalty_per_day, max_score')
      .eq('id', assignmentId)
      .single();

    if (assignmentError) throw assignmentError;
    if (!assignment) return null;

    // Get submission details
    const { data: submission, error: submissionError } = await supabase
      .from('assignment_submissions')
      .select('submitted_at, score')
      .eq('id', submissionId)
      .single();

    if (submissionError) throw submissionError;
    if (!submission || !submission.score) return null;

    const originalScore = submission.score;
    const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
    const submittedAt = new Date(submission.submitted_at);

    // Check if late
    if (!dueDate || submittedAt <= dueDate) {
      return {
        isLate: false,
        daysLate: 0,
        penaltyPercentage: 0,
        originalScore,
        finalScore: originalScore,
        penaltyAmount: 0,
      };
    }

    // Calculate days late
    const diffTime = submittedAt.getTime() - dueDate.getTime();
    const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Calculate penalty
    const penaltyPerDay = assignment.late_penalty_per_day || 0;
    const penaltyPercentage = Math.min(daysLate * penaltyPerDay, 100); // Cap at 100%
    const penaltyAmount = (originalScore * penaltyPercentage) / 100;
    const finalScore = Math.max(0, originalScore - penaltyAmount);

    return {
      isLate: true,
      daysLate,
      penaltyPercentage,
      originalScore,
      finalScore: Math.round(finalScore),
      penaltyAmount: Math.round(penaltyAmount),
    };
  } catch (error) {
    console.error('Error calculating late penalty:', error);
    return null;
  }
}

/**
 * Apply late penalty to a submission and update the database
 */
export async function applyLatePenalty(
  assignmentId: string,
  submissionId: string
): Promise<boolean> {
  try {
    const penaltyResult = await calculateLatePenalty(assignmentId, submissionId);
    if (!penaltyResult) return false;

    const { error } = await supabase
      .from('assignment_submissions')
      .update({
        is_late: penaltyResult.isLate,
        late_penalty_percentage: penaltyResult.penaltyPercentage,
        final_score: penaltyResult.finalScore,
      })
      .eq('id', submissionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error applying late penalty:', error);
    return false;
  }
}

/**
 * Apply late penalties to all submissions for an assignment
 */
export async function applyLatePenaltiesToAll(assignmentId: string): Promise<number> {
  try {
    // Get all submissions
    const { data: submissions, error } = await supabase
      .from('assignment_submissions')
      .select('id')
      .eq('assignment_id', assignmentId)
      .not('submitted_at', 'is', null);

    if (error) throw error;
    if (!submissions || submissions.length === 0) return 0;

    let updated = 0;
    for (const submission of submissions) {
      const success = await applyLatePenalty(assignmentId, submission.id);
      if (success) updated++;
    }

    return updated;
  } catch (error) {
    console.error('Error applying late penalties to all:', error);
    return 0;
  }
}
