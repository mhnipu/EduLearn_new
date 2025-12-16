/**
 * Assessment Analytics Service
 * 
 * Provides reusable analytics functions for assignments, quizzes, and exams.
 * Used by teachers to analyze student performance.
 */

import { supabase } from '@/integrations/supabase/client';

export interface AssessmentStats {
  totalSubmissions: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  submissionTrends: SubmissionTrend[];
}

export interface SubmissionTrend {
  date: string;
  count: number;
  averageScore: number;
}

export interface QuestionAnalysis {
  questionId: string;
  questionText: string;
  totalAttempts: number;
  correctCount: number;
  incorrectCount: number;
  correctnessRate: number;
  averageTimeSpent?: number;
}

export interface StudentRanking {
  studentId: string;
  studentName: string;
  score: number;
  rank: number;
  submittedAt: string;
}

/**
 * Get comprehensive statistics for an assignment
 */
export async function getAssignmentStats(assignmentId: string): Promise<AssessmentStats | null> {
  try {
    const { data: submissions, error } = await supabase
      .from('assignment_submissions')
      .select('score, submitted_at, final_score')
      .eq('assignment_id', assignmentId)
      .not('graded_at', 'is', null);

    if (error) throw error;
    if (!submissions || submissions.length === 0) {
      return {
        totalSubmissions: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        submissionTrends: [],
      };
    }

    // Get assignment max_score for pass rate calculation
    const { data: assignment } = await supabase
      .from('assignments')
      .select('max_score')
      .eq('id', assignmentId)
      .single();

    const maxScore = assignment?.max_score || 100;
    const passingScore = maxScore * 0.7; // 70% passing threshold

    const scores = submissions
      .map(s => s.final_score ?? s.score ?? 0)
      .filter(s => s !== null && s !== undefined);

    const averageScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 0;

    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    const passedCount = scores.filter(s => s >= passingScore).length;
    const passRate = scores.length > 0 ? (passedCount / scores.length) * 100 : 0;

    // Calculate submission trends (last 7 days)
    const trends = calculateSubmissionTrends(submissions);

    return {
      totalSubmissions: submissions.length,
      averageScore: Math.round(averageScore * 100) / 100,
      highestScore,
      lowestScore,
      passRate: Math.round(passRate * 100) / 100,
      submissionTrends: trends,
    };
  } catch (error) {
    console.error('Error fetching assignment stats:', error);
    return null;
  }
}

/**
 * Get comprehensive statistics for a quiz
 */
export async function getQuizStats(quizId: string): Promise<AssessmentStats | null> {
  try {
    const { data: submissions, error } = await supabase
      .from('quiz_submissions')
      .select('score, submitted_at, passed')
      .eq('quiz_id', quizId)
      .not('graded_at', 'is', null);

    if (error) throw error;
    if (!submissions || submissions.length === 0) {
      return {
        totalSubmissions: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passRate: 0,
        submissionTrends: [],
      };
    }

    const scores = submissions
      .map(s => s.score ?? 0)
      .filter(s => s !== null && s !== undefined);

    const averageScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 0;

    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    const passedCount = submissions.filter(s => s.passed === true).length;
    const passRate = submissions.length > 0 ? (passedCount / submissions.length) * 100 : 0;

    const trends = calculateSubmissionTrends(submissions);

    return {
      totalSubmissions: submissions.length,
      averageScore: Math.round(averageScore * 100) / 100,
      highestScore,
      lowestScore,
      passRate: Math.round(passRate * 100) / 100,
      submissionTrends: trends,
    };
  } catch (error) {
    console.error('Error fetching quiz stats:', error);
    return null;
  }
}

/**
 * Get question-wise analysis for a quiz
 */
export async function getQuizQuestionAnalysis(quizId: string): Promise<QuestionAnalysis[]> {
  try {
    // Fetch quiz questions
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, question_text, order_index')
      .eq('quiz_id', quizId)
      .order('order_index');

    if (questionsError) throw questionsError;
    if (!questions || questions.length === 0) return [];

    // Fetch all submissions with answers
    const { data: submissions, error: submissionsError } = await supabase
      .from('quiz_submissions')
      .select('answers')
      .eq('quiz_id', quizId)
      .not('graded_at', 'is', null);

    if (submissionsError) throw submissionsError;
    if (!submissions || submissions.length === 0) return [];

    // Fetch correct answers
    const { data: correctAnswers } = await supabase
      .from('quiz_questions')
      .select('id, correct_answer')
      .eq('quiz_id', quizId);

    const correctAnswerMap = new Map(
      correctAnswers?.map(q => [q.id, q.correct_answer]) || []
    );

    // Analyze each question
    const analysis: QuestionAnalysis[] = questions.map(question => {
      let correctCount = 0;
      let incorrectCount = 0;
      const totalAttempts = submissions.length;

      submissions.forEach(submission => {
        const answers = submission.answers as Record<string, any>;
        const studentAnswer = answers[question.id];
        const correctAnswer = correctAnswerMap.get(question.id);

        if (studentAnswer !== undefined && studentAnswer !== null) {
          if (String(studentAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()) {
            correctCount++;
          } else {
            incorrectCount++;
          }
        } else {
          incorrectCount++; // Unanswered counts as incorrect
        }
      });

      const correctnessRate = totalAttempts > 0
        ? (correctCount / totalAttempts) * 100
        : 0;

      return {
        questionId: question.id,
        questionText: question.question_text,
        totalAttempts,
        correctCount,
        incorrectCount,
        correctnessRate: Math.round(correctnessRate * 100) / 100,
      };
    });

    return analysis;
  } catch (error) {
    console.error('Error fetching question analysis:', error);
    return [];
  }
}

/**
 * Get student rankings for an assignment
 */
export async function getAssignmentRankings(assignmentId: string): Promise<StudentRanking[]> {
  try {
    const { data: submissions, error } = await supabase
      .from('assignment_submissions')
      .select(`
        student_id,
        final_score,
        score,
        submitted_at,
        profiles!inner(full_name)
      `)
      .eq('assignment_id', assignmentId)
      .not('graded_at', 'is', null)
      .order('final_score', { ascending: false, nullsLast: true })
      .order('score', { ascending: false, nullsLast: true });

    if (error) throw error;
    if (!submissions || submissions.length === 0) return [];

    const rankings: StudentRanking[] = submissions.map((sub, index) => {
      const profile = sub.profiles as any;
      const finalScore = sub.final_score ?? sub.score ?? 0;

      return {
        studentId: sub.student_id,
        studentName: profile?.full_name || 'Unknown',
        score: finalScore,
        rank: index + 1,
        submittedAt: sub.submitted_at,
      };
    });

    return rankings;
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return [];
  }
}

/**
 * Get student rankings for a quiz
 */
export async function getQuizRankings(quizId: string): Promise<StudentRanking[]> {
  try {
    const { data: submissions, error } = await supabase
      .from('quiz_submissions')
      .select(`
        student_id,
        score,
        submitted_at,
        profiles!inner(full_name)
      `)
      .eq('quiz_id', quizId)
      .not('graded_at', 'is', null)
      .order('score', { ascending: false, nullsLast: true });

    if (error) throw error;
    if (!submissions || submissions.length === 0) return [];

    const rankings: StudentRanking[] = submissions.map((sub, index) => {
      const profile = sub.profiles as any;

      return {
        studentId: sub.student_id,
        studentName: profile?.full_name || 'Unknown',
        score: sub.score ?? 0,
        rank: index + 1,
        submittedAt: sub.submitted_at,
      };
    });

    return rankings;
  } catch (error) {
    console.error('Error fetching quiz rankings:', error);
    return [];
  }
}

/**
 * Calculate submission trends from submission data
 */
function calculateSubmissionTrends(
  submissions: Array<{ submitted_at: string; score?: number | null; final_score?: number | null }>
): SubmissionTrend[] {
  const trendsMap = new Map<string, { count: number; totalScore: number }>();

  // Group by date (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  submissions.forEach(sub => {
    const date = new Date(sub.submitted_at);
    if (date < sevenDaysAgo) return;

    const dateKey = date.toISOString().split('T')[0];
    const score = (sub as any).final_score ?? (sub as any).score ?? 0;

    const existing = trendsMap.get(dateKey) || { count: 0, totalScore: 0 };
    trendsMap.set(dateKey, {
      count: existing.count + 1,
      totalScore: existing.totalScore + score,
    });
  });

  // Convert to array and sort by date
  const trends: SubmissionTrend[] = Array.from(trendsMap.entries())
    .map(([date, data]) => ({
      date,
      count: data.count,
      averageScore: data.count > 0 ? data.totalScore / data.count : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return trends;
}

/**
 * Get late submission statistics for an assignment
 */
export async function getLateSubmissionStats(assignmentId: string) {
  try {
    const { data: assignment } = await supabase
      .from('assignments')
      .select('due_date')
      .eq('id', assignmentId)
      .single();

    if (!assignment?.due_date) {
      return { totalLate: 0, totalOnTime: 0, latePercentage: 0 };
    }

    const { data: submissions, error } = await supabase
      .from('assignment_submissions')
      .select('submitted_at, is_late')
      .eq('assignment_id', assignmentId)
      .not('submitted_at', 'is', null);

    if (error) throw error;
    if (!submissions || submissions.length === 0) {
      return { totalLate: 0, totalOnTime: 0, latePercentage: 0 };
    }

    const totalLate = submissions.filter(s => s.is_late === true).length;
    const totalOnTime = submissions.length - totalLate;
    const latePercentage = submissions.length > 0
      ? (totalLate / submissions.length) * 100
      : 0;

    return {
      totalLate,
      totalOnTime,
      latePercentage: Math.round(latePercentage * 100) / 100,
    };
  } catch (error) {
    console.error('Error fetching late submission stats:', error);
    return { totalLate: 0, totalOnTime: 0, latePercentage: 0 };
  }
}
