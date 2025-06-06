/**
 * Kura-Inspired Conversation Analysis System
 * 
 * Based on the methodology from the conference presentation:
 * 1. Start small - Manual review when possible
 * 2. Extract structure - Pull out frustration, errors, satisfaction
 * 3. Find clusters - Group similar conversations
 * 4. Compare metrics - Understand segment performance  
 * 5. Make decisions - Build, fix, or ignore based on data
 */

import OpenAI from 'openai';
import { ConversationDetail } from './conversationService';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types for our analysis pipeline
export interface ConversationSummary {
  conversation_id: string;
  account_email: string;
  artist_name: string;
  summary: string;
  is_frustrated: number; // 0-1 score
  made_errors: boolean;
  tools_used: string[];
  customer_satisfaction: number; // 0-1 score
  topic_category: string;
  message_count: number;
  session_length_minutes: number;
}

export interface ConversationCluster {
  id: string;
  label: string;
  description: string;
  conversations: ConversationSummary[];
  avg_satisfaction: number;
  avg_frustration: number;
  error_rate: number;
  total_conversations: number;
  common_tools: string[];
  patterns: string[];
}

export interface MetaCluster {
  id: string;
  name: string;
  clusters: ConversationCluster[];
  total_conversations: number;
  performance_metrics: {
    satisfaction: number;
    frustration: number;
    completion_rate: number;
    error_rate: number;
  };
  insights: string[];
  recommendations: string[];
}

export interface KuraAnalysisResult {
  summaries: ConversationSummary[];
  clusters: ConversationCluster[];
  meta_clusters: MetaCluster[];
  overall_insights: {
    total_conversations: number;
    hot_topics: Array<{topic: string; count: number; satisfaction: number}>;
    pain_points: string[];
    opportunities: string[];
    user_segments: Array<{segment: string; size: number; performance: number}>;
  };
}

/**
 * Step 1: Extract Structured Summaries from Conversations
 * Following the Kura approach of using LLMs to extract structured data
 */
export async function extractConversationSummary(
  conversation: ConversationDetail
): Promise<ConversationSummary> {
  const messages = conversation.messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n');

  const prompt = `
Analyze this conversation and extract key information:

<conversation>
${messages}
</conversation>

Extract structured data about this conversation in the following JSON format:
{
  "summary": "Brief description of what the user was trying to accomplish",
  "is_frustrated": 0.0-1.0, // How frustrated was the user? 0=calm, 1=very frustrated
  "made_errors": true/false, // Did the AI make any errors or give bad advice?
  "tools_used": ["tool1", "tool2"], // What features/tools did they use?
  "customer_satisfaction": 0.0-1.0, // How satisfied did the user seem? 0=very unsatisfied, 1=very satisfied
  "topic_category": "string", // Main category (e.g., "visual design", "music production", "business advice")
  "session_length_minutes": number // Estimated time user spent (based on message timestamps/content)
}

Focus on:
- User intent and goals
- Frustration signals (repeated questions, expressions of confusion)
- Success indicators (positive feedback, task completion)
- Error patterns (AI giving wrong info, misunderstanding)
- Feature usage patterns
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      conversation_id: conversation.room_id,
      account_email: conversation.account_email,
      artist_name: conversation.artist_name,
      summary: analysis.summary || 'Unknown topic',
      is_frustrated: Math.max(0, Math.min(1, analysis.is_frustrated || 0)),
      made_errors: Boolean(analysis.made_errors),
      tools_used: Array.isArray(analysis.tools_used) ? analysis.tools_used : [],
      customer_satisfaction: Math.max(0, Math.min(1, analysis.customer_satisfaction || 0.5)),
      topic_category: analysis.topic_category || 'Uncategorized',
      message_count: conversation.messages.length,
      session_length_minutes: analysis.session_length_minutes || 5
    };
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    // Return fallback summary
    return {
      conversation_id: conversation.room_id,
      account_email: conversation.account_email,
      artist_name: conversation.artist_name,
      summary: 'Analysis failed',
      is_frustrated: 0.5,
      made_errors: false,
      tools_used: [],
      customer_satisfaction: 0.5,
      topic_category: 'Unknown',
      message_count: conversation.messages.length,
      session_length_minutes: 5
    };
  }
}

/**
 * Step 2: Generate Base Clusters from Conversation Summaries
 * Group similar conversations together
 */
export async function generateBaseClusters(
  summaries: ConversationSummary[]
): Promise<ConversationCluster[]> {
  if (summaries.length === 0) return [];

  // For small datasets (< 20), use manual clustering
  if (summaries.length < 20) {
    return manualClusteringApproach(summaries);
  }

  // For larger datasets, use LLM-based clustering
  return await llmBasedClustering(summaries);
}

/**
 * Manual clustering for small datasets (following Kura's "start small" principle)
 */
function manualClusteringApproach(summaries: ConversationSummary[]): ConversationCluster[] {
  // Group by topic category first
  const topicGroups = new Map<string, ConversationSummary[]>();
  
  for (const summary of summaries) {
    const topic = summary.topic_category;
    if (!topicGroups.has(topic)) {
      topicGroups.set(topic, []);
    }
    topicGroups.get(topic)!.push(summary);
  }

  const clusters: ConversationCluster[] = [];
  let clusterId = 1;

  for (const [topic, conversations] of topicGroups) {
    const avgSatisfaction = conversations.reduce((sum, c) => sum + c.customer_satisfaction, 0) / conversations.length;
    const avgFrustration = conversations.reduce((sum, c) => sum + c.is_frustrated, 0) / conversations.length;
    const errorRate = conversations.filter(c => c.made_errors).length / conversations.length;
    
    // Get common tools
    const toolCounts = new Map<string, number>();
    for (const conv of conversations) {
      for (const tool of conv.tools_used) {
        toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
      }
    }
    const commonTools = Array.from(toolCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([tool]) => tool);

    clusters.push({
      id: `cluster-${clusterId++}`,
      label: topic,
      description: `Conversations about ${topic.toLowerCase()}`,
      conversations,
      avg_satisfaction: avgSatisfaction,
      avg_frustration: avgFrustration,
      error_rate: errorRate,
      total_conversations: conversations.length,
      common_tools: commonTools,
      patterns: [] // Will be filled by analysis
    });
  }

  return clusters;
}

/**
 * LLM-based clustering for larger datasets
 */
async function llmBasedClustering(summaries: ConversationSummary[]): Promise<ConversationCluster[]> {
  const summaryTexts = summaries.map(s => 
    `ID:${s.conversation_id} Topic:${s.topic_category} Summary:${s.summary} Satisfaction:${s.customer_satisfaction} Frustrated:${s.is_frustrated}`
  ).join('\n');

  const prompt = `
Analyze these conversation summaries and group them into 5-10 meaningful clusters based on user intent and patterns:

${summaryTexts}

Return clusters as JSON:
{
  "clusters": [
    {
      "label": "Cluster name",
      "description": "What this cluster represents",
      "conversation_ids": ["id1", "id2", ...],
      "patterns": ["Common pattern 1", "Common pattern 2"]
    }
  ]
}

Focus on grouping by:
- Similar user intents/goals
- Common pain points or success patterns
- Similar tool usage patterns
- Workflow similarities
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    const clusters: ConversationCluster[] = [];
    
    if (result.clusters && Array.isArray(result.clusters)) {
      for (let i = 0; i < result.clusters.length; i++) {
        const clusterDef = result.clusters[i];
        const conversations = summaries.filter(s => 
          clusterDef.conversation_ids?.includes(s.conversation_id)
        );
        
        if (conversations.length > 0) {
          const avgSatisfaction = conversations.reduce((sum, c) => sum + c.customer_satisfaction, 0) / conversations.length;
          const avgFrustration = conversations.reduce((sum, c) => sum + c.is_frustrated, 0) / conversations.length;
          const errorRate = conversations.filter(c => c.made_errors).length / conversations.length;
          
          // Get common tools
          const toolCounts = new Map<string, number>();
          for (const conv of conversations) {
            for (const tool of conv.tools_used) {
              toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
            }
          }
          const commonTools = Array.from(toolCounts.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([tool]) => tool);

          clusters.push({
            id: `cluster-${i + 1}`,
            label: clusterDef.label || `Cluster ${i + 1}`,
            description: clusterDef.description || 'No description available',
            conversations,
            avg_satisfaction: avgSatisfaction,
            avg_frustration: avgFrustration,
            error_rate: errorRate,
            total_conversations: conversations.length,
            common_tools: commonTools,
            patterns: clusterDef.patterns || []
          });
        }
      }
    }

    return clusters;
  } catch (error) {
    console.error('Error in LLM clustering:', error);
    // Fall back to manual clustering
    return manualClusteringApproach(summaries);
  }
}

/**
 * Step 3: Build Cluster Hierarchy (Meta-Clusters)
 * Merge related clusters into higher-level categories
 */
export async function buildClusterHierarchy(
  clusters: ConversationCluster[]
): Promise<MetaCluster[]> {
  if (clusters.length <= 3) {
    // For small numbers, each cluster becomes its own meta-cluster
    return clusters.map(cluster => ({
      id: `meta-${cluster.id}`,
      name: cluster.label,
      clusters: [cluster],
      total_conversations: cluster.total_conversations,
      performance_metrics: {
        satisfaction: cluster.avg_satisfaction,
        frustration: cluster.avg_frustration,
        completion_rate: 1 - cluster.error_rate,
        error_rate: cluster.error_rate
      },
      insights: [],
      recommendations: []
    }));
  }

  const clusterDescriptions = clusters.map(c => 
    `Cluster "${c.label}": ${c.description} (${c.total_conversations} conversations, satisfaction: ${c.avg_satisfaction.toFixed(2)})`
  ).join('\n');

  const prompt = `
Group these conversation clusters into 2-4 higher-level meta-clusters based on related themes:

${clusterDescriptions}

Return as JSON:
{
  "meta_clusters": [
    {
      "name": "Meta-cluster name",
      "cluster_labels": ["cluster1", "cluster2", ...],
      "theme": "What unifies these clusters"
    }
  ]
}

Group clusters that share:
- Similar user personas or use cases
- Related product areas or features
- Similar performance characteristics
- Common improvement opportunities
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    const metaClusters: MetaCluster[] = [];
    
    if (result.meta_clusters && Array.isArray(result.meta_clusters)) {
      for (let i = 0; i < result.meta_clusters.length; i++) {
        const metaDef = result.meta_clusters[i];
        const relatedClusters = clusters.filter(c => 
          metaDef.cluster_labels?.includes(c.label)
        );
        
        if (relatedClusters.length > 0) {
          const totalConversations = relatedClusters.reduce((sum, c) => sum + c.total_conversations, 0);
          const avgSatisfaction = relatedClusters.reduce((sum, c) => sum + (c.avg_satisfaction * c.total_conversations), 0) / totalConversations;
          const avgFrustration = relatedClusters.reduce((sum, c) => sum + (c.avg_frustration * c.total_conversations), 0) / totalConversations;
          const avgErrorRate = relatedClusters.reduce((sum, c) => sum + (c.error_rate * c.total_conversations), 0) / totalConversations;

          metaClusters.push({
            id: `meta-${i + 1}`,
            name: metaDef.name || `Meta-Cluster ${i + 1}`,
            clusters: relatedClusters,
            total_conversations: totalConversations,
            performance_metrics: {
              satisfaction: avgSatisfaction,
              frustration: avgFrustration,
              completion_rate: 1 - avgErrorRate,
              error_rate: avgErrorRate
            },
            insights: [],
            recommendations: []
          });
        }
      }
    }

    return metaClusters;
  } catch (error) {
    console.error('Error building cluster hierarchy:', error);
    // Fall back to individual clusters as meta-clusters
    return clusters.map(cluster => ({
      id: `meta-${cluster.id}`,
      name: cluster.label,
      clusters: [cluster],
      total_conversations: cluster.total_conversations,
      performance_metrics: {
        satisfaction: cluster.avg_satisfaction,
        frustration: cluster.avg_frustration,
        completion_rate: 1 - cluster.error_rate,
        error_rate: cluster.error_rate
      },
      insights: [],
      recommendations: []
    }));
  }
}

/**
 * Step 4: Generate Insights and Recommendations
 * The "From Analysis to Action" step from the slides
 */
export async function generateInsights(
  metaClusters: MetaCluster[],
  summaries: ConversationSummary[]
): Promise<KuraAnalysisResult> {
  // Calculate overall metrics
  const totalConversations = summaries.length;
  const overallSatisfaction = summaries.reduce((sum, s) => sum + s.customer_satisfaction, 0) / totalConversations;
  const overallFrustration = summaries.reduce((sum, s) => sum + s.is_frustrated, 0) / totalConversations;
  
  // Find hot topics
  const topicCounts = new Map<string, {count: number; satisfaction: number}>();
  for (const summary of summaries) {
    const topic = summary.topic_category;
    const existing = topicCounts.get(topic) || {count: 0, satisfaction: 0};
    topicCounts.set(topic, {
      count: existing.count + 1,
      satisfaction: existing.satisfaction + summary.customer_satisfaction
    });
  }
  
  const hotTopics = Array.from(topicCounts.entries())
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      satisfaction: data.satisfaction / data.count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Generate insights for each meta-cluster
  for (const metaCluster of metaClusters) {
    const clusterData = metaCluster.clusters.map(c => 
      `"${c.label}": ${c.total_conversations} conversations, satisfaction: ${c.avg_satisfaction.toFixed(2)}, frustration: ${c.avg_frustration.toFixed(2)}, error rate: ${c.error_rate.toFixed(2)}`
    ).join('\n');

    const insightPrompt = `
Analyze this meta-cluster and provide actionable insights:

Meta-cluster: ${metaCluster.name}
Total conversations: ${metaCluster.total_conversations}
Performance: Satisfaction ${metaCluster.performance_metrics.satisfaction.toFixed(2)}, Frustration ${metaCluster.performance_metrics.frustration.toFixed(2)}

Clusters:
${clusterData}

Provide insights and recommendations as JSON:
{
  "insights": ["insight 1", "insight 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}

Focus on:
- What's working well vs poorly
- Common patterns causing frustration  
- Specific product improvements needed
- User education opportunities
- Feature gaps or enhancements
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: insightPrompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      metaCluster.insights = result.insights || [];
      metaCluster.recommendations = result.recommendations || [];
    } catch (error) {
      console.error('Error generating insights for meta-cluster:', error);
      metaCluster.insights = ['Analysis failed - manual review needed'];
      metaCluster.recommendations = ['Review conversations manually'];
    }
  }

  // Generate overall insights
  const overallInsightPrompt = `
Analyze these conversation analysis results and provide high-level insights:

Total conversations: ${totalConversations}
Overall satisfaction: ${overallSatisfaction.toFixed(2)}
Overall frustration: ${overallFrustration.toFixed(2)}

Hot topics:
${hotTopics.map(t => `- ${t.topic}: ${t.count} conversations (satisfaction: ${t.satisfaction.toFixed(2)})`).join('\n')}

Meta-clusters:
${metaClusters.map(mc => `- ${mc.name}: ${mc.total_conversations} conversations (satisfaction: ${mc.performance_metrics.satisfaction.toFixed(2)})`).join('\n')}

Provide high-level insights as JSON:
{
  "pain_points": ["pain point 1", "pain point 2", ...],
  "opportunities": ["opportunity 1", "opportunity 2", ...],
  "user_segments": [
    {"segment": "segment name", "size": number, "performance": 0.0-1.0}
  ]
}

Focus on:
- Biggest pain points across all conversations
- Largest improvement opportunities  
- User segment performance differences
- Strategic recommendations for product development
`;

  let painPoints: string[] = [];
  let opportunities: string[] = [];
  let userSegments: Array<{segment: string; size: number; performance: number}> = [];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: overallInsightPrompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    painPoints = result.pain_points || [];
    opportunities = result.opportunities || [];
    userSegments = result.user_segments || [];
  } catch (error) {
    console.error('Error generating overall insights:', error);
    painPoints = ['Analysis failed - manual review needed'];
    opportunities = ['Review data manually for opportunities'];
  }

  return {
    summaries,
    clusters: metaClusters.flatMap(mc => mc.clusters),
    meta_clusters: metaClusters,
    overall_insights: {
      total_conversations: totalConversations,
      hot_topics: hotTopics,
      pain_points: painPoints,
      opportunities: opportunities,
      user_segments: userSegments
    }
  };
}

/**
 * Main Pipeline Function - Execute the full Kura methodology
 */
export async function runKuraAnalysis(
  conversations: ConversationDetail[]
): Promise<KuraAnalysisResult> {
  console.log(`Starting Kura analysis on ${conversations.length} conversations`);
  
  // Step 1: Extract structured summaries
  console.log('Step 1: Extracting conversation summaries...');
  const summaries: ConversationSummary[] = [];
  
  for (const conversation of conversations) {
    try {
      const summary = await extractConversationSummary(conversation);
      summaries.push(summary);
    } catch (error) {
      console.error(`Failed to analyze conversation ${conversation.room_id}:`, error);
    }
  }
  
  console.log(`Extracted ${summaries.length} summaries`);
  
  // Step 2: Generate base clusters
  console.log('Step 2: Generating base clusters...');
  const clusters = await generateBaseClusters(summaries);
  console.log(`Generated ${clusters.length} clusters`);
  
  // Step 3: Build cluster hierarchy
  console.log('Step 3: Building cluster hierarchy...');
  const metaClusters = await buildClusterHierarchy(clusters);
  console.log(`Built ${metaClusters.length} meta-clusters`);
  
  // Step 4: Generate insights
  console.log('Step 4: Generating insights and recommendations...');
  const result = await generateInsights(metaClusters, summaries);
  
  console.log('Kura analysis complete!');
  return result;
} 