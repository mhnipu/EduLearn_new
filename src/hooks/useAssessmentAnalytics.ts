/**
 * React Hook for Assessment Analytics
 * 
 * Provides easy-to-use hooks for fetching assessment analytics data.
 */

import { useState, useEffect } from 'react';
import {
  getAssignmentStats,
  getQuizStats,
  getQuizQuestionAnalysis,
  getAssignmentRankings,
  getQuizRankings,
  getLateSubmissionStats,
  type AssessmentStats,
  type QuestionAnalysis,
  type StudentRanking,
} from '@/lib/assessmentAnalytics';

export function useAssignmentStats(assignmentId: string | null) {
  const [stats, setStats] = useState<AssessmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!assignmentId) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getAssignmentStats(assignmentId)
      .then(data => {
        setStats(data);
        setError(null);
      })
      .catch(err => {
        setError(err);
        setStats(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [assignmentId]);

  return { stats, loading, error };
}

export function useQuizStats(quizId: string | null) {
  const [stats, setStats] = useState<AssessmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!quizId) {
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getQuizStats(quizId)
      .then(data => {
        setStats(data);
        setError(null);
      })
      .catch(err => {
        setError(err);
        setStats(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [quizId]);

  return { stats, loading, error };
}

export function useQuizQuestionAnalysis(quizId: string | null) {
  const [analysis, setAnalysis] = useState<QuestionAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!quizId) {
      setAnalysis([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getQuizQuestionAnalysis(quizId)
      .then(data => {
        setAnalysis(data);
        setError(null);
      })
      .catch(err => {
        setError(err);
        setAnalysis([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [quizId]);

  return { analysis, loading, error };
}

export function useAssignmentRankings(assignmentId: string | null) {
  const [rankings, setRankings] = useState<StudentRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!assignmentId) {
      setRankings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getAssignmentRankings(assignmentId)
      .then(data => {
        setRankings(data);
        setError(null);
      })
      .catch(err => {
        setError(err);
        setRankings([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [assignmentId]);

  return { rankings, loading, error };
}

export function useQuizRankings(quizId: string | null) {
  const [rankings, setRankings] = useState<StudentRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!quizId) {
      setRankings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getQuizRankings(quizId)
      .then(data => {
        setRankings(data);
        setError(null);
      })
      .catch(err => {
        setError(err);
        setRankings([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [quizId]);

  return { rankings, loading, error };
}

export function useLateSubmissionStats(assignmentId: string | null) {
  const [stats, setStats] = useState({
    totalLate: 0,
    totalOnTime: 0,
    latePercentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!assignmentId) {
      setStats({ totalLate: 0, totalOnTime: 0, latePercentage: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getLateSubmissionStats(assignmentId)
      .then(data => {
        setStats(data);
        setError(null);
      })
      .catch(err => {
        setError(err);
        setStats({ totalLate: 0, totalOnTime: 0, latePercentage: 0 });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [assignmentId]);

  return { stats, loading, error };
}
