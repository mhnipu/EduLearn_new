/**
 * Basic Plagiarism Detection
 * 
 * Simple text similarity detection using Levenshtein distance and word matching.
 * For production, consider using external APIs like Copyscape, Turnitin, etc.
 */

/**
 * Calculate text similarity percentage (0-100)
 * Uses a combination of word matching and character similarity
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;
  if (text1 === text2) return 100;

  // Normalize texts
  const normalize = (text: string) =>
    text.toLowerCase().trim().replace(/\s+/g, ' ');

  const normalized1 = normalize(text1);
  const normalized2 = normalize(text2);

  // Word-based similarity
  const words1 = normalized1.split(/\s+/);
  const words2 = normalized2.split(/\s+/);
  const wordSimilarity = calculateWordSimilarity(words1, words2);

  // Character-based similarity (Levenshtein distance)
  const charSimilarity = calculateLevenshteinSimilarity(normalized1, normalized2);

  // Weighted average (60% word, 40% character)
  return Math.round(wordSimilarity * 0.6 + charSimilarity * 0.4);
}

/**
 * Calculate word-based similarity
 */
function calculateWordSimilarity(words1: string[], words2: string[]): number {
  if (words1.length === 0 && words2.length === 0) return 100;
  if (words1.length === 0 || words2.length === 0) return 0;

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  // Jaccard similarity
  return union.size > 0 ? (intersection.size / union.size) * 100 : 0;
}

/**
 * Calculate similarity using Levenshtein distance
 */
function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;

  if (len1 === 0) return len2 === 0 ? 100 : 0;
  if (len2 === 0) return 0;

  // Create matrix
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return maxLen > 0 ? ((maxLen - distance) / maxLen) * 100 : 0;
}

/**
 * Check plagiarism for a submission against all other submissions
 */
export async function checkPlagiarismForSubmission(
  submissionId: string,
  assignmentId: string,
  threshold: number = 70
): Promise<{
  isPlagiarized: boolean;
  similarityScore: number;
  similarSubmissions: Array<{ submissionId: string; similarity: number }>;
}> {
  try {
    // Get current submission
    const { data: currentSubmission, error: currentError } = await supabase
      .from('assignment_submissions')
      .select('submission_text, student_id')
      .eq('id', submissionId)
      .single();

    if (currentError || !currentSubmission || !currentSubmission.submission_text) {
      return {
        isPlagiarized: false,
        similarityScore: 0,
        similarSubmissions: [],
      };
    }

    // Get all other submissions for this assignment
    const { data: otherSubmissions, error: othersError } = await supabase
      .from('assignment_submissions')
      .select('id, submission_text, student_id')
      .eq('assignment_id', assignmentId)
      .neq('id', submissionId)
      .not('submission_text', 'is', null);

    if (othersError || !otherSubmissions || otherSubmissions.length === 0) {
      return {
        isPlagiarized: false,
        similarityScore: 0,
        similarSubmissions: [],
      };
    }

    // Calculate similarity with each submission
    const similarities: Array<{ submissionId: string; similarity: number }> = [];

    otherSubmissions.forEach(sub => {
      if (sub.submission_text && sub.student_id !== currentSubmission.student_id) {
        const similarity = calculateTextSimilarity(
          currentSubmission.submission_text,
          sub.submission_text
        );
        if (similarity >= threshold) {
          similarities.push({
            submissionId: sub.id,
            similarity,
          });
        }
      }
    });

    const maxSimilarity = similarities.length > 0
      ? Math.max(...similarities.map(s => s.similarity))
      : 0;

    return {
      isPlagiarized: maxSimilarity >= threshold,
      similarityScore: maxSimilarity,
      similarSubmissions: similarities.sort((a, b) => b.similarity - a.similarity),
    };
  } catch (error) {
    console.error('Error checking plagiarism:', error);
    return {
      isPlagiarized: false,
      similarityScore: 0,
      similarSubmissions: [],
    };
  }
}

/**
 * Mark submission with plagiarism flag
 */
export async function markPlagiarism(
  submissionId: string,
  similarityScore: number,
  checkedBy: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('assignment_submissions')
      .update({
        plagiarism_flag: similarityScore >= 70,
        plagiarism_score: similarityScore,
        plagiarism_checked_at: new Date().toISOString(),
        plagiarism_checked_by: checkedBy,
      })
      .eq('id', submissionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking plagiarism:', error);
    return false;
  }
}
