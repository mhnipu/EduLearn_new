import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Circle,
  AlertCircle,
  Save,
  Send,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  passing_score: number;
  max_attempts: number;
  allow_multiple_attempts: boolean;
}

interface Question {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[] | null;
  correct_answer: string;
  points: number;
  order_index: number;
}

interface Answer {
  questionId: string;
  answer: string | string[];
}

export default function QuizExamTaking() {
  const { quizId } = useParams<{ quizId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [canAttempt, setCanAttempt] = useState(true);

  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if student can attempt this quiz
  useEffect(() => {
    if (!quizId || !user) return;

    const checkAttempts = async () => {
      try {
        // Get existing submissions
        const { data: submissions } = await supabase
          .from('quiz_submissions')
          .select('attempt_number')
          .eq('quiz_id', quizId)
          .eq('student_id', user.id)
          .order('attempt_number', { ascending: false })
          .limit(1);

        if (submissions && submissions.length > 0) {
          const lastAttempt = submissions[0].attempt_number || 1;
          setAttemptNumber(lastAttempt + 1);

          // Check if max attempts reached
          const { data: quizData } = await supabase
            .from('quizzes')
            .select('max_attempts, allow_multiple_attempts')
            .eq('id', quizId)
            .single();

          if (quizData) {
            if (!quizData.allow_multiple_attempts && lastAttempt >= 1) {
              setCanAttempt(false);
              toast({
                title: 'Maximum attempts reached',
                description: 'You have already attempted this quiz.',
                variant: 'destructive',
              });
            } else if (quizData.max_attempts && lastAttempt >= quizData.max_attempts) {
              setCanAttempt(false);
              toast({
                title: 'Maximum attempts reached',
                description: `You have reached the maximum of ${quizData.max_attempts} attempts.`,
                variant: 'destructive',
              });
            }
          }
        }
      } catch (error) {
        console.error('Error checking attempts:', error);
      }
    };

    checkAttempts();
  }, [quizId, user, toast]);

  // Load quiz data and check for in-progress attempt
  useEffect(() => {
    if (!quizId || !user || !canAttempt) return;

    const loadQuiz = async () => {
      try {
        // Load quiz
        const { data: quizData, error: quizError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('id', quizId)
          .eq('is_active', true)
          .single();

        if (quizError) throw quizError;
        if (!quizData) {
          toast({ title: 'Quiz not found', variant: 'destructive' });
          navigate('/dashboard/student');
          return;
        }

        setQuiz({
          id: quizData.id,
          title: quizData.title,
          description: quizData.description,
          time_limit_minutes: quizData.time_limit_minutes,
          passing_score: quizData.passing_score || 70,
          max_attempts: quizData.max_attempts || 1,
          allow_multiple_attempts: quizData.allow_multiple_attempts || false,
        });

        // Load questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('quiz_id', quizId)
          .order('order_index');

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);

        // Check for in-progress attempt
        const { data: attemptData } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', quizId)
          .eq('student_id', user.id)
          .eq('is_submitted', false)
          .order('started_at', { ascending: false })
          .limit(1)
          .single();

        if (attemptData) {
          // Resume existing attempt
          setAnswers(attemptData.answers as Record<string, string | string[]> || {});
          setStartedAt(new Date(attemptData.started_at));
          setAttemptNumber(attemptData.attempt_number);
          setTimeRemaining(attemptData.time_remaining_seconds);
        } else {
          // Start new attempt
          const now = new Date();
          setStartedAt(now);
          setTimeRemaining(quizData.time_limit_minutes ? quizData.time_limit_minutes * 60 : null);

          // Create attempt record
          await supabase.from('quiz_attempts').insert({
            quiz_id: quizId,
            student_id: user.id,
            attempt_number: attemptNumber,
            answers: {},
            started_at: now.toISOString(),
            time_remaining_seconds: quizData.time_limit_minutes ? quizData.time_limit_minutes * 60 : null,
          });
        }
      } catch (error) {
        console.error('Error loading quiz:', error);
        toast({ title: 'Error loading quiz', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    loadQuiz();
  }, [quizId, user, canAttempt, attemptNumber, navigate, toast]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || isSubmitted) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timeRemaining, isSubmitted]);

  // Auto-save answers
  useEffect(() => {
    if (!quizId || !user || isSubmitted) return;

    autoSaveIntervalRef.current = setInterval(async () => {
      try {
        await supabase
          .from('quiz_attempts')
          .update({
            answers,
            last_updated_at: new Date().toISOString(),
            time_remaining_seconds: timeRemaining,
          })
          .eq('quiz_id', quizId)
          .eq('student_id', user.id)
          .eq('is_submitted', false);
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    }, 10000); // Auto-save every 10 seconds

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [quizId, user, answers, timeRemaining, isSubmitted]);

  // Save answers to localStorage as backup
  useEffect(() => {
    if (quizId && Object.keys(answers).length > 0) {
      localStorage.setItem(`quiz_answers_${quizId}`, JSON.stringify(answers));
    }
  }, [answers, quizId]);

  // Load answers from localStorage on mount
  useEffect(() => {
    if (quizId) {
      const saved = localStorage.getItem(`quiz_answers_${quizId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAnswers(prev => ({ ...prev, ...parsed }));
        } catch (error) {
          console.error('Error loading saved answers:', error);
        }
      }
    }
  }, [quizId]);

  const handleAnswerChange = (questionId: string, answer: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleAutoSubmit = async () => {
    if (isSubmitted || isSubmitting) return;
    await submitQuiz(true);
  };

  const submitQuiz = async (isAutoSubmit = false) => {
    if (!quiz || !user || !quizId || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Calculate score
      let totalPoints = 0;
      let earnedPoints = 0;

      questions.forEach(question => {
        totalPoints += question.points;
        const studentAnswer = answers[question.id];
        if (studentAnswer !== undefined && studentAnswer !== null) {
          // For multiple choice, compare the selected option directly
          // For other types, compare as strings
          let isCorrect = false;
          if (question.question_type === 'multiple_choice') {
            isCorrect = String(studentAnswer).trim() === String(question.correct_answer).trim();
          } else {
            isCorrect = String(studentAnswer).trim().toLowerCase() ===
              String(question.correct_answer).trim().toLowerCase();
          }
          if (isCorrect) {
            earnedPoints += question.points;
          }
        }
      });

      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      const passed = score >= quiz.passing_score;

      // Calculate time spent
      const timeSpent = startedAt
        ? Math.floor((new Date().getTime() - startedAt.getTime()) / 1000)
        : null;

      // Create submission
      const { error: submitError } = await supabase
        .from('quiz_submissions')
        .insert({
          quiz_id: quizId,
          student_id: user.id,
          answers,
          score,
          passed,
          attempt_number: attemptNumber,
          started_at: startedAt?.toISOString(),
          time_spent_seconds: timeSpent,
        });

      if (submitError) throw submitError;

      // Mark attempt as submitted
      await supabase
        .from('quiz_attempts')
        .update({ is_submitted: true })
        .eq('quiz_id', quizId)
        .eq('student_id', user.id)
        .eq('is_submitted', false);

      // Clear localStorage
      localStorage.removeItem(`quiz_answers_${quizId}`);

      setIsSubmitted(true);

      toast({
        title: isAutoSubmit ? 'Quiz auto-submitted' : 'Quiz submitted successfully',
        description: `Your score: ${score}% ${passed ? '(Passed)' : '(Failed)'}`,
      });

      // Navigate after a short delay
      setTimeout(() => {
        navigate('/dashboard/student');
      }, 2000);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({ title: 'Error submitting quiz', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return 'No time limit';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).filter(key => {
      const answer = answers[key];
      return answer !== undefined && answer !== null && answer !== '';
    }).length;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAttempt) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-bold mb-2">Maximum Attempts Reached</h2>
              <p className="text-muted-foreground mb-4">
                You have already completed the maximum number of attempts for this quiz.
              </p>
              <Button onClick={() => navigate('/dashboard/student')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Quiz not found or no questions available.</p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h2 className="text-xl font-bold mb-2">Quiz Submitted Successfully!</h2>
              <p className="text-muted-foreground">Redirecting to dashboard...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with timer and progress */}
      <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/student')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-bold text-lg">{quiz.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {timeRemaining !== null && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className={`font-mono font-bold ${timeRemaining < 60 ? 'text-destructive' : ''}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
              <Badge variant="outline">
                {getAnsweredCount()} / {questions.length} answered
              </Badge>
            </div>
          </div>
          <Progress value={progress} className="mt-3" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Question Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 lg:grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
                  {questions.map((q, index) => {
                    const isAnswered = answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '';
                    const isCurrent = index === currentQuestionIndex;

                    return (
                      <Button
                        key={q.id}
                        variant={isCurrent ? 'default' : isAnswered ? 'secondary' : 'outline'}
                        size="sm"
                        className={`justify-start ${isCurrent ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => setCurrentQuestionIndex(index)}
                      >
                        <span className="mr-2">{index + 1}.</span>
                        {isAnswered ? (
                          <CheckCircle className="h-3 w-3 ml-auto" />
                        ) : (
                          <Circle className="h-3 w-3 ml-auto opacity-50" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
                  <Badge variant="outline">{currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="text-lg font-medium">{currentQuestion.question_text}</p>
                </div>

                <div className="space-y-3">
                  {currentQuestion.question_type === 'multiple_choice' && (
                    <div className="space-y-2">
                      {(currentQuestion.options as string[])?.map((option, index) => {
                        const isSelected = answers[currentQuestion.id] === option;

                        return (
                          <Button
                            key={index}
                            variant={isSelected ? 'default' : 'outline'}
                            className="w-full justify-start text-left h-auto py-3"
                            onClick={() => handleAnswerChange(currentQuestion.id, option)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-4 w-4 rounded-full border-2 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                              <span>{option}</span>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.question_type === 'true_false' && (
                    <div className="space-y-2">
                      {['True', 'False'].map((option) => {
                        const isSelected = answers[currentQuestion.id] === option.toLowerCase();

                        return (
                          <Button
                            key={option}
                            variant={isSelected ? 'default' : 'outline'}
                            className="w-full justify-start text-left h-auto py-3"
                            onClick={() => handleAnswerChange(currentQuestion.id, option.toLowerCase())}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-4 w-4 rounded-full border-2 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`} />
                              <span>{option}</span>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.question_type === 'short_answer' && (
                    <textarea
                      className="w-full min-h-[150px] p-3 border rounded-md"
                      placeholder="Type your answer here..."
                      value={(answers[currentQuestion.id] as string) || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    />
                  )}
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    Previous
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await supabase
                          .from('quiz_attempts')
                          .update({
                            answers,
                            last_updated_at: new Date().toISOString(),
                          })
                          .eq('quiz_id', quizId)
                          .eq('student_id', user!.id)
                          .eq('is_submitted', false);
                        toast({ title: 'Progress saved', description: 'Your answers have been saved.' });
                      }}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    {currentQuestionIndex < questions.length - 1 ? (
                      <Button
                        onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button onClick={() => submitQuiz()} disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Submit Quiz
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
