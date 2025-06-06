'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Brain, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { KuraAnalysisResult } from '@/lib/kuraAnalysis';

interface KuraAnalysisPanelProps {
  className?: string;
}

export function KuraAnalysisPanel({ className }: KuraAnalysisPanelProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<KuraAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisParams, setAnalysisParams] = useState({
    limit: 10,
    excludeTestEmails: true,
    timeFilter: 'Last 30 Days'
  });

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      console.log('Starting Kura analysis with params:', analysisParams);
      
      const response = await fetch('/api/kura-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisParams),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        console.log('Kura analysis completed:', data.analysis);
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Error running Kura analysis:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header & Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Kura Conversation Analysis
          </CardTitle>
          <CardDescription>
            Systematic analysis of user conversations using the Kura methodology: extract structure, find clusters, compare metrics, and generate insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Conversations:</label>
              <select 
                value={analysisParams.limit} 
                onChange={(e) => setAnalysisParams(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                className="px-2 py-1 border rounded text-sm"
                aria-label="Number of conversations to analyze"
              >
                <option value={5}>5 (quick test)</option>
                <option value={10}>10 (small sample)</option>
                <option value={20}>20 (medium sample)</option>
                <option value={50}>50 (large sample)</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Time Range:</label>
              <select 
                value={analysisParams.timeFilter} 
                onChange={(e) => setAnalysisParams(prev => ({ ...prev, timeFilter: e.target.value }))}
                className="px-2 py-1 border rounded text-sm"
                aria-label="Time range for analysis"
              >
                <option value="Last 7 Days">Last 7 Days</option>
                <option value="Last 30 Days">Last 30 Days</option>
                <option value="Last 90 Days">Last 90 Days</option>
              </select>
            </div>
            
            <label className="flex items-center gap-2 text-sm">
              <input 
                type="checkbox" 
                checked={analysisParams.excludeTestEmails}
                onChange={(e) => setAnalysisParams(prev => ({ ...prev, excludeTestEmails: e.target.checked }))}
              />
              Exclude test emails
            </label>
          </div>

          <Button 
            onClick={runAnalysis} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing conversations...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Run Kura Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Analysis Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Analysis Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{analysis.summaries.length}</div>
                  <div className="text-sm text-gray-500">Conversations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{analysis.clusters.length}</div>
                  <div className="text-sm text-gray-500">Clusters</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{analysis.meta_clusters.length}</div>
                  <div className="text-sm text-gray-500">Meta-clusters</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{analysis.overall_insights.hot_topics.length}</div>
                  <div className="text-sm text-gray-500">Hot Topics</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hot Topics */}
          {analysis.overall_insights.hot_topics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>🔥 Hot Topics</CardTitle>
                <CardDescription>Most discussed topics and their satisfaction scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.overall_insights.hot_topics.map((topic, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{topic.topic}</div>
                        <div className="text-sm text-gray-500">{topic.count} conversations</div>
                      </div>
                      <Badge 
                        variant={topic.satisfaction > 0.7 ? "default" : topic.satisfaction > 0.5 ? "secondary" : "destructive"}
                      >
                        {formatPercentage(topic.satisfaction)} satisfaction
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meta-Clusters */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Meta-Clusters</CardTitle>
              <CardDescription>High-level conversation groups and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.meta_clusters.map((metaCluster, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{metaCluster.name}</h3>
                      <Badge variant="outline">{metaCluster.total_conversations} conversations</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-lg font-medium text-green-600">
                          {formatPercentage(metaCluster.performance_metrics.satisfaction)}
                        </div>
                        <div className="text-xs text-gray-500">Satisfaction</div>
                      </div>
                      <div>
                        <div className="text-lg font-medium text-red-600">
                          {formatPercentage(metaCluster.performance_metrics.frustration)}
                        </div>
                        <div className="text-xs text-gray-500">Frustration</div>
                      </div>
                      <div>
                        <div className="text-lg font-medium text-blue-600">
                          {formatPercentage(metaCluster.performance_metrics.completion_rate)}
                        </div>
                        <div className="text-xs text-gray-500">Completion</div>
                      </div>
                      <div>
                        <div className="text-lg font-medium text-orange-600">
                          {formatPercentage(metaCluster.performance_metrics.error_rate)}
                        </div>
                        <div className="text-xs text-gray-500">Error Rate</div>
                      </div>
                    </div>

                    {/* Clusters within this meta-cluster */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-700">Clusters:</h4>
                      {metaCluster.clusters.map((cluster, clusterIdx) => (
                        <div key={clusterIdx} className="text-sm bg-gray-100 p-2 rounded flex items-center justify-between">
                          <span>{cluster.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{cluster.total_conversations} convos</span>
                            <Badge 
                              size="sm" 
                              variant={cluster.avg_satisfaction > 0.7 ? "default" : cluster.avg_satisfaction > 0.5 ? "secondary" : "destructive"}
                            >
                              {formatPercentage(cluster.avg_satisfaction)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Insights & Recommendations */}
                    {(metaCluster.insights.length > 0 || metaCluster.recommendations.length > 0) && (
                      <div className="space-y-2">
                        {metaCluster.insights.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 flex items-center gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Insights:
                            </h4>
                            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                              {metaCluster.insights.map((insight, insightIdx) => (
                                <li key={insightIdx}>{insight}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {metaCluster.recommendations.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 flex items-center gap-1">
                              <TrendingUp className="h-4 w-4" />
                              Recommendations:
                            </h4>
                            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                              {metaCluster.recommendations.map((rec, recIdx) => (
                                <li key={recIdx}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sample Summaries */}
          <Card>
            <CardHeader>
              <CardTitle>📝 Sample Conversation Summaries</CardTitle>
              <CardDescription>First few analyzed conversations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.summaries.slice(0, 5).map((summary, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-gray-600">{summary.account_email}</div>
                      <div className="flex items-center gap-2">
                        <Badge size="sm" variant="outline">{summary.topic_category}</Badge>
                        <Badge 
                          size="sm" 
                          variant={summary.customer_satisfaction > 0.7 ? "default" : summary.customer_satisfaction > 0.5 ? "secondary" : "destructive"}
                        >
                          {formatPercentage(summary.customer_satisfaction)}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{summary.summary}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{summary.message_count} messages</span>
                      <span>{summary.session_length_minutes} min</span>
                      {summary.made_errors && <span className="text-red-500">⚠️ Errors detected</span>}
                      {summary.is_frustrated > 0.5 && <span className="text-orange-500">😤 High frustration</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 