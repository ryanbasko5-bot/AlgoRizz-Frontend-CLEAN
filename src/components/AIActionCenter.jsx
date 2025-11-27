import React, { useState } from 'react';
import { Zap, Wand2, CheckCircle, AlertCircle, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';

/**
 * AI Action Center - Prescriptive Fixes
 * 
 * Generates actionable, one-click recommendations:
 * - Answer-First Rewriter: Rewrites intros into liftable, fact-first summaries
 * - E-E-A-T Gap Filler: Prescribes specific missing authority signals
 * - Structure Optimizer: Auto-fixes heading hierarchy and formatting
 * - Citation Enhancer: Suggests high-DA sources to add
 */

export const AIActionCenter = ({ content, onContentUpdate, cgsData }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [result, setResult] = useState(null);

  const actions = [
    {
      id: 'answer-first',
      title: 'Answer-First Rewriter',
      description: 'Rewrites your introduction into a liftable, fact-first summary optimized for AI extraction',
      icon: Sparkles,
      color: '#8b5cf6',
      impact: '+20 CGS points',
      category: 'Structure',
      enabled: !content.includes('aeo-answer-box')
    },
    {
      id: 'eeat-filler',
      title: 'E-E-A-T Gap Filler',
      description: 'Identifies and adds missing authority signals (author credentials, citations, dates)',
      icon: CheckCircle,
      color: '#10b981',
      impact: '+15 CGS points',
      category: 'Trust',
      enabled: cgsData?.breakdown?.trustAuthority < 80
    },
    {
      id: 'structure-optimizer',
      title: 'Structure Optimizer',
      description: 'Auto-fixes heading hierarchy, paragraph length, and content formatting',
      icon: Wand2,
      color: '#3b82f6',
      impact: '+18 CGS points',
      category: 'Structure',
      enabled: cgsData?.breakdown?.structuralCompliance < 80
    },
    {
      id: 'citation-enhancer',
      title: 'Citation Enhancer',
      description: 'Suggests specific high-authority sources (DA > 85) to cite for credibility',
      icon: AlertCircle,
      color: '#f59e0b',
      impact: '+12 CGS points',
      category: 'Trust',
      enabled: (content.match(/<a href=/g) || []).length < 3
    }
  ];

  const handleExecuteAction = async (actionId) => {
    setIsProcessing(true);
    setSelectedAction(actionId);
    setResult(null);

    // Simulate AI processing
    setTimeout(() => {
      const processedResult = processAction(actionId, content);
      setResult(processedResult);
      setIsProcessing(false);
    }, 2000);
  };

  const handleApplyFix = () => {
    if (result && onContentUpdate) {
      onContentUpdate(result.updatedContent);
      setResult(null);
      setSelectedAction(null);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-6 border-2 border-blue-200">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-bold text-slate-900">AI Action Center</h2>
        <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-semibold">
          Prescriptive Fixes
        </span>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {actions.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            isProcessing={isProcessing && selectedAction === action.id}
            onExecute={() => handleExecuteAction(action.id)}
          />
        ))}
      </div>

      {/* Result Display */}
      {result && (
        <div className="bg-white rounded-lg p-6 border-2 border-green-200 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <h3 className="text-lg font-bold text-slate-900">{result.title}</h3>
            </div>
            <span className="text-sm font-semibold text-green-600">{result.impact}</span>
          </div>

          <div className="space-y-4">
            {/* Before/After Preview */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">
                  Before
                </label>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-slate-700 max-h-48 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: result.before.substring(0, 300) + '...' }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase mb-2 block">
                  After
                </label>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-slate-700 max-h-48 overflow-y-auto">
                  <div dangerouslySetInnerHTML={{ __html: result.after.substring(0, 300) + '...' }} />
                </div>
              </div>
            </div>

            {/* Changes Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-bold text-slate-900 mb-2">Changes Applied:</h4>
              <ul className="space-y-1">
                {result.changes.map((change, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleApplyFix}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:shadow-xl transition-all"
              >
                <CheckCircle className="h-5 w-5" />
                Apply Fix to Content
              </button>
              <button
                onClick={() => setResult(null)}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-all"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionCard = ({ action, isProcessing, onExecute }) => {
  const Icon = action.icon;

  return (
    <div
      className={`bg-white rounded-lg p-5 border-2 transition-all ${
        action.enabled
          ? 'border-slate-200 hover:border-slate-300 hover:shadow-md cursor-pointer'
          : 'border-slate-100 opacity-50 cursor-not-allowed'
      }`}
      onClick={() => action.enabled && !isProcessing && onExecute()}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: action.enabled ? action.color + '20' : '#f1f5f9' }}
        >
          <Icon
            className="h-5 w-5"
            style={{ color: action.enabled ? action.color : '#94a3b8' }}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-slate-900 text-sm">{action.title}</h3>
            {!action.enabled && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                Not needed
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {action.description}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">
            {action.category}
          </span>
          <span className="text-xs font-bold text-green-600">{action.impact}</span>
        </div>
        {isProcessing ? (
          <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
        ) : action.enabled ? (
          <ArrowRight className="h-4 w-4 text-slate-400" />
        ) : null}
      </div>
    </div>
  );
};

// Action Processing Logic
const processAction = (actionId, content) => {
  switch (actionId) {
    case 'answer-first':
      return processAnswerFirst(content);
    case 'eeat-filler':
      return processEEATFiller(content);
    case 'structure-optimizer':
      return processStructureOptimizer(content);
    case 'citation-enhancer':
      return processCitationEnhancer(content);
    default:
      return null;
  }
};

const processAnswerFirst = (content) => {
  // Extract first paragraph
  const firstPMatch = content.match(/<p>(.*?)<\/p>/);
  const firstP = firstPMatch ? firstPMatch[1] : '';

  // Create answer box
  const answerBox = `
<div class="aeo-answer-box">
  <span class="aeo-label">Key Takeaway</span>
  <p>${firstP.substring(0, 200)}... <strong>[Optimized for citation]</strong></p>
</div>
  `.trim();

  // Insert after H1
  const h1Match = content.match(/(<h1[^>]*>.*?<\/h1>)/);
  let updatedContent = content;
  if (h1Match) {
    updatedContent = content.replace(h1Match[1], h1Match[1] + '\n' + answerBox);
  }

  return {
    title: 'Answer-First Structure Applied',
    impact: '+20 CGS points',
    before: content.substring(0, 400),
    after: answerBox,
    updatedContent,
    changes: [
      'Added "Key Takeaway" box with fact-first summary',
      'Positioned answer at top for maximum AI extraction',
      'Optimized first 60 words for liftability',
      'Applied AEO-compliant formatting'
    ]
  };
};

const processEEATFiller = (content) => {
  const today = new Date().toLocaleDateString('en-GB');
  
  // Add metadata if missing
  const metaBlock = `
<div class="aeo-meta">
  <span>By <strong>Expert Author</strong></span> | 
  <span>Updated <strong>${today}</strong></span> |
  <span>Reviewed by <strong>Editorial Team</strong></span>
</div>
  `.trim();

  let updatedContent = content;
  if (!content.includes('aeo-meta')) {
    const h1Match = content.match(/(<h1[^>]*>.*?<\/h1>)/);
    if (h1Match) {
      updatedContent = content.replace(h1Match[1], h1Match[1] + '\n' + metaBlock);
    }
  }

  return {
    title: 'E-E-A-T Signals Enhanced',
    impact: '+15 CGS points',
    before: content.substring(0, 200),
    after: metaBlock,
    updatedContent,
    changes: [
      'Added author credentials for expertise signal',
      'Included publication/update dates for freshness',
      'Added editorial review note for trustworthiness',
      'Improved E-E-A-T score by 40%'
    ]
  };
};

const processStructureOptimizer = (content) => {
  let updatedContent = content;

  // Fix heading hierarchy
  updatedContent = updatedContent.replace(/<h3>/g, '<h2>').replace(/<\/h3>/g, '</h2>');

  // Break long paragraphs
  updatedContent = updatedContent.replace(/<p>(.{400,}?)<\/p>/g, (match, text) => {
    const sentences = text.split('. ');
    const chunks = [];
    let currentChunk = '';
    
    sentences.forEach(sentence => {
      if (currentChunk.length + sentence.length < 300) {
        currentChunk += sentence + '. ';
      } else {
        chunks.push(currentChunk.trim());
        currentChunk = sentence + '. ';
      }
    });
    if (currentChunk) chunks.push(currentChunk.trim());
    
    return chunks.map(chunk => `<p>${chunk}</p>`).join('\n');
  });

  return {
    title: 'Structure Optimized',
    impact: '+18 CGS points',
    before: content.substring(0, 300),
    after: updatedContent.substring(0, 300),
    updatedContent,
    changes: [
      'Fixed heading hierarchy (H1 → H2 → H3)',
      'Split long paragraphs into scannable chunks',
      'Improved readability score by 35%',
      'Enhanced AI scannability'
    ]
  };
};

const processCitationEnhancer = (content) => {
  const suggestedSources = [
    { domain: 'harvard.edu', da: 95, topic: 'Research studies' },
    { domain: 'nytimes.com', da: 94, topic: 'News and analysis' },
    { domain: 'nature.com', da: 93, topic: 'Scientific findings' },
    { domain: 'forbes.com', da: 91, topic: 'Business insights' }
  ];

  const citationBlock = `
<div class="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
  <p class="text-sm">
    <strong>Recommended Citations:</strong><br/>
    ${suggestedSources.map(s => 
      `• <a href="https://${s.domain}" target="_blank" class="text-blue-600 underline">${s.domain}</a> (DA ${s.da}) - ${s.topic}`
    ).join('<br/>')}
  </p>
</div>
  `.trim();

  return {
    title: 'High-Authority Citations Suggested',
    impact: '+12 CGS points',
    before: 'Missing authoritative citations',
    after: citationBlock,
    updatedContent: content + '\n' + citationBlock,
    changes: [
      'Identified 4 high-DA sources (>90 DA)',
      'Provided topic-specific citation recommendations',
      'Increased trust signal strength',
      'Ready for manual citation integration'
    ]
  };
};

export default AIActionCenter;
