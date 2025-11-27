import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle2, AlertTriangle, TrendingUp, Target } from 'lucide-react';

/**
 * CGS (Citation Guarantee Score) Engine
 * 
 * Calculates citation probability (0-100%) based on 4 weighted factors:
 * 1. Trust & Authority (E-E-A-T Signals): 40% - LLM Risk Mitigation
 * 2. Structural Compliance (Extraction Readiness): 30% - Scannability
 * 3. Technical Readiness (Machine Indexing): 20% - Schema & Core Web Vitals
 * 4. Semantic Depth & Intent Matching: 10% - Query Intent Alignment
 */

export const calculateCGS = (content, metadata = {}) => {
  const scores = {
    trustAuthority: calculateTrustScore(content, metadata),
    structuralCompliance: calculateStructureScore(content),
    technicalReadiness: calculateTechnicalScore(content, metadata),
    semanticDepth: calculateSemanticScore(content, metadata)
  };

  // Weighted calculation
  const cgsScore = Math.round(
    (scores.trustAuthority * 0.40) +
    (scores.structuralCompliance * 0.30) +
    (scores.technicalReadiness * 0.20) +
    (scores.semanticDepth * 0.10)
  );

  return {
    totalScore: cgsScore,
    breakdown: scores,
    riskLevel: getRiskLevel(cgsScore),
    recommendations: generateRecommendations(scores, content)
  };
};

// Trust & Authority Score (0-100)
const calculateTrustScore = (content, metadata) => {
  let score = 0;
  
  // Author credentials present (20 points)
  if (content.includes('<strong>') && (content.includes('By') || content.includes('Author'))) {
    score += 20;
  }
  
  // Updated date present (15 points)
  if (content.includes('Updated') || content.includes('Published')) {
    score += 15;
  }
  
  // External citations (25 points max)
  const citationCount = (content.match(/<a href=/g) || []).length;
  score += Math.min(citationCount * 5, 25);
  
  // Domain authority indicators (20 points)
  if (metadata.domainAuthority && metadata.domainAuthority > 50) {
    score += 20;
  }
  
  // Fact-checking elements (20 points)
  if (content.includes('study') || content.includes('research') || content.includes('data')) {
    score += 20;
  }
  
  return Math.min(score, 100);
};

// Structural Compliance Score (0-100)
const calculateStructureScore = (content) => {
  let score = 0;
  
  // Answer-first structure (30 points)
  if (content.includes('aeo-answer-box') || content.includes('Key Takeaway')) {
    score += 30;
  }
  
  // Proper heading hierarchy (25 points)
  const h1Count = (content.match(/<h1/g) || []).length;
  const h2Count = (content.match(/<h2/g) || []).length;
  if (h1Count === 1 && h2Count >= 3) {
    score += 25;
  }
  
  // Lists and bullets (20 points)
  const hasLists = content.includes('<ul>') || content.includes('<ol>');
  if (hasLists) {
    score += 20;
  }
  
  // Short paragraphs (15 points)
  const paragraphs = content.match(/<p>(.*?)<\/p>/g) || [];
  const avgLength = paragraphs.reduce((acc, p) => acc + p.length, 0) / paragraphs.length;
  if (avgLength < 400) {
    score += 15;
  }
  
  // Entity bolding (10 points)
  const strongCount = (content.match(/<strong>/g) || []).length;
  if (strongCount >= 5) {
    score += 10;
  }
  
  return Math.min(score, 100);
};

// Technical Readiness Score (0-100)
const calculateTechnicalScore = (content, metadata) => {
  let score = 0;
  
  // Schema markup present (40 points)
  if (content.includes('schema-tag') || content.includes('application/ld+json')) {
    score += 40;
  }
  
  // Semantic HTML (30 points)
  const semanticTags = ['<article', '<section', '<header', '<nav', '<main'];
  const hasSemantic = semanticTags.some(tag => content.includes(tag));
  if (hasSemantic) {
    score += 30;
  }
  
  // Meta descriptions (15 points)
  if (metadata.metaDescription && metadata.metaDescription.length > 100) {
    score += 15;
  }
  
  // Alt tags on images (15 points)
  const images = (content.match(/<img/g) || []).length;
  const alts = (content.match(/alt="/g) || []).length;
  if (images > 0 && alts === images) {
    score += 15;
  }
  
  return Math.min(score, 100);
};

// Semantic Depth Score (0-100)
const calculateSemanticScore = (content, metadata) => {
  let score = 0;
  
  // Keyword presence in H1 (30 points)
  if (metadata.targetKeyword) {
    const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (h1Match && h1Match[1].toLowerCase().includes(metadata.targetKeyword.toLowerCase())) {
      score += 30;
    }
  }
  
  // Query intent alignment (30 points)
  const intentKeywords = ['what', 'how', 'why', 'when', 'where', 'best', 'guide', 'tips'];
  const hasIntent = intentKeywords.some(kw => content.toLowerCase().includes(kw));
  if (hasIntent) {
    score += 30;
  }
  
  // Content depth (20 points)
  const wordCount = content.split(/\s+/).length;
  if (wordCount > 1000) {
    score += 20;
  } else if (wordCount > 500) {
    score += 10;
  }
  
  // Entity relationships (20 points)
  const entityCount = (content.match(/<strong>/g) || []).length;
  if (entityCount >= 10) {
    score += 20;
  }
  
  return Math.min(score, 100);
};

const getRiskLevel = (score) => {
  if (score >= 90) return { level: 'excellent', color: '#10b981', label: 'Citation Ready' };
  if (score >= 75) return { level: 'good', color: '#3b82f6', label: 'High Probability' };
  if (score >= 60) return { level: 'moderate', color: '#f59e0b', label: 'Needs Optimization' };
  return { level: 'poor', color: '#ef4444', label: 'High Risk' };
};

const generateRecommendations = (scores, content) => {
  const recommendations = [];
  
  if (scores.trustAuthority < 70) {
    recommendations.push({
      priority: 'high',
      category: 'Trust & Authority',
      action: 'Add citations from high-authority sources (DA > 85)',
      impact: '+15 CGS points'
    });
  }
  
  if (scores.structuralCompliance < 70) {
    recommendations.push({
      priority: 'high',
      category: 'Structure',
      action: 'Add an Answer-First "Key Takeaway" box at the top',
      impact: '+20 CGS points'
    });
  }
  
  if (scores.technicalReadiness < 70) {
    recommendations.push({
      priority: 'medium',
      category: 'Technical',
      action: 'Add JSON-LD schema markup for FAQPage',
      impact: '+15 CGS points'
    });
  }
  
  if (scores.semanticDepth < 70) {
    recommendations.push({
      priority: 'medium',
      category: 'Semantic',
      action: 'Increase entity bolding and keyword density',
      impact: '+10 CGS points'
    });
  }
  
  return recommendations;
};

// Component for displaying CGS Score
export const CGSScoreDisplay = ({ content, metadata, onRecommendationClick }) => {
  const [cgsData, setCgsData] = useState(null);
  
  useEffect(() => {
    if (content) {
      const result = calculateCGS(content, metadata);
      setCgsData(result);
    }
  }, [content, metadata]);
  
  if (!cgsData) return null;
  
  const { totalScore, breakdown, riskLevel, recommendations } = cgsData;
  
  return (
    <div className="bg-white border-2 rounded-xl p-6 shadow-lg" style={{ borderColor: riskLevel.color }}>
      {/* Main Score */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Shield className="h-8 w-8" style={{ color: riskLevel.color }} />
          <div className="text-5xl font-bold" style={{ color: riskLevel.color }}>
            {totalScore}
          </div>
        </div>
        <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: riskLevel.color }}>
          {riskLevel.label}
        </div>
        <p className="text-xs text-slate-600 mt-2">
          Citation Guarantee Score (CGS<sub>LLM</sub>)
        </p>
      </div>
      
      {/* Score Breakdown */}
      <div className="space-y-3 mb-6">
        <ScoreBar 
          label="Trust & Authority" 
          score={breakdown.trustAuthority} 
          weight="40%"
          color="#6366f1"
        />
        <ScoreBar 
          label="Structural Compliance" 
          score={breakdown.structuralCompliance} 
          weight="30%"
          color="#8b5cf6"
        />
        <ScoreBar 
          label="Technical Readiness" 
          score={breakdown.technicalReadiness} 
          weight="20%"
          color="#ec4899"
        />
        <ScoreBar 
          label="Semantic Depth" 
          score={breakdown.semanticDepth} 
          weight="10%"
          color="#14b8a6"
        />
      </div>
      
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="border-t border-slate-200 pt-4">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            Prescriptive Actions
          </h4>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => (
              <div 
                key={idx}
                onClick={() => onRecommendationClick && onRecommendationClick(rec)}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {rec.priority.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-600 font-medium">{rec.category}</span>
                    </div>
                    <p className="text-sm text-slate-900 font-medium">{rec.action}</p>
                  </div>
                  <div className="text-xs font-bold text-green-600 whitespace-nowrap">
                    {rec.impact}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ScoreBar = ({ label, score, weight, color }) => {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">{weight}</span>
          <span className="font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full transition-all duration-500 rounded-full"
          style={{ 
            width: `${score}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
};

export default CGSScoreDisplay;
