import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Award } from 'lucide-react';

interface ProgressData {
  averageScore: number;
  totalAssessments: number;
  completedAssessments: number;
  passedAssessments: number;
  recentScores: Array<{ name: string; score: number; date: string }>;
  strengths: string[];
  weaknesses: string[];
}

interface ProgressVisualizationProps {
  data: ProgressData;
  studentName?: string;
}

export function ProgressVisualization({ data, studentName }: ProgressVisualizationProps) {
  const completionRate = data.totalAssessments > 0
    ? (data.completedAssessments / data.totalAssessments) * 100
    : 0;

  const passRate = data.completedAssessments > 0
    ? (data.passedAssessments / data.completedAssessments) * 100
    : 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 80) return 'default';
    if (score >= 70) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className={`text-2xl font-bold ${getScoreColor(data.averageScore)}`}>
                  {data.averageScore.toFixed(1)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">{completionRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">
                  {data.completedAssessments} / {data.totalAssessments}
                </p>
              </div>
              <Award className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pass Rate</p>
                <p className="text-2xl font-bold">{passRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">
                  {data.passedAssessments} passed
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assessments</p>
                <p className="text-2xl font-bold">{data.totalAssessments}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentScores.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent assessments</p>
          ) : (
            <div className="space-y-3">
              {data.recentScores.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={item.score}
                      className="w-24"
                    />
                    <Badge variant={getScoreBadgeVariant(item.score)}>
                      {item.score}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.strengths.length === 0 ? (
              <p className="text-muted-foreground text-sm">No strengths identified yet</p>
            ) : (
              <ul className="space-y-2">
                {data.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-600 mt-2" />
                    <span className="text-sm">{strength}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.weaknesses.length === 0 ? (
              <p className="text-muted-foreground text-sm">No weaknesses identified yet</p>
            ) : (
              <ul className="space-y-2">
                {data.weaknesses.map((weakness, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-600 mt-2" />
                    <span className="text-sm">{weakness}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
