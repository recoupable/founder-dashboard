'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Brain, TrendingUp, AlertTriangle } from 'lucide-react';

interface UserAnalysisButtonProps {
  userEmail: string;
  className?: string;
}

interface UserAnalysis {
  user_profile: string;
  engagement_level: string;
  primary_use_cases: string[];
  strengths: string[];
  pain_points: string[];
  satisfaction_level: string;
  ai_performance: string;
  recommendations: string[];
  monetization_potential: string;
  user_journey_stage: string;
  key_insights: string[];
  conversation_themes: string[];
  growth_opportunities: string[];
}

export function UserAnalysisButton({ userEmail, className }: UserAnalysisButtonProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<UserAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [metadata, setMetadata] = useState<{
    conversations_analyzed: number;
    total_messages: number;
    analysis_timestamp: string;
    tokens_used: number;
  } | null>(null);

  const runUserAnalysis = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      console.log('Starting user analysis for:', userEmail);
      
      const response = await fetch('/api/user-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        setMetadata(data.metadata);
        setShowAnalysis(true);
        console.log('User analysis completed:', data.analysis);
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Error running user analysis:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getBadgeVariant = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className={className}>
      <Button 
        onClick={runUserAnalysis} 
        disabled={loading}
        variant="outline"
        size="sm"
        className="mb-2"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Brain className="mr-2 h-4 w-4" />
            Analyze User
          </>
        )}
      </Button>

      {error && (
        <Card className="border-red-200 bg-red-50 mb-4">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {showAnalysis && analysis && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              User Analysis: {userEmail}
            </CardTitle>
            <CardDescription>
              AI-powered insights based on {metadata?.conversations_analyzed || 0} conversations ({metadata?.total_messages || 0} messages)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Profile & Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm font-medium text-gray-600">Profile</div>
                <div className="text-lg font-semibold">{analysis.user_profile}</div>
              </div>
              <div className="text-center">
                <Badge variant={getBadgeVariant(analysis.engagement_level)}>
                  {analysis.engagement_level} engagement
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant={getBadgeVariant(analysis.satisfaction_level)}>
                  {analysis.satisfaction_level} satisfaction
                </Badge>
              </div>
              <div className="text-center">
                <Badge variant={getBadgeVariant(analysis.monetization_potential)}>
                  {analysis.monetization_potential} revenue potential
                </Badge>
              </div>
            </div>

            {/* Key Insights */}
            {analysis.key_insights && analysis.key_insights.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Key Insights
                </h4>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  {analysis.key_insights.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Use Cases & Themes */}
            <div className="grid md:grid-cols-2 gap-4">
              {analysis.primary_use_cases && analysis.primary_use_cases.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Primary Use Cases</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.primary_use_cases.map((useCase, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {useCase}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {analysis.conversation_themes && analysis.conversation_themes.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Conversation Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.conversation_themes.map((theme, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Strengths & Pain Points */}
            <div className="grid md:grid-cols-2 gap-4">
              {analysis.strengths && analysis.strengths.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-700 mb-2">✅ Strengths</h4>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                    {analysis.strengths.map((strength, idx) => (
                      <li key={idx}>{strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.pain_points && analysis.pain_points.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-700 mb-2">⚠️ Pain Points</h4>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                    {analysis.pain_points.map((pain, idx) => (
                      <li key={idx}>{pain}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {analysis.recommendations && analysis.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-blue-700 mb-2">💡 Recommendations</h4>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Growth Opportunities */}
            {analysis.growth_opportunities && analysis.growth_opportunities.length > 0 && (
              <div>
                <h4 className="font-medium text-purple-700 mb-2">🚀 Growth Opportunities</h4>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  {analysis.growth_opportunities.map((opp, idx) => (
                    <li key={idx}>{opp}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-gray-500 border-t pt-3">
              Journey Stage: {analysis.user_journey_stage} • AI Performance: {analysis.ai_performance} • 
              Analyzed: {new Date(metadata?.analysis_timestamp || '').toLocaleString()} • 
              Tokens: {metadata?.tokens_used || 0}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 