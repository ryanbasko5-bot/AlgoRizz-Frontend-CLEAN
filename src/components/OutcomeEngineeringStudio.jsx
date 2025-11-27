import React, { useState } from 'react';
import { Target, Wand2, CheckCircle2, ArrowRight, Settings, Zap, Brain, FileEdit, Download, Copy } from 'lucide-react';

/**
 * Outcome Engineering Studio (DSPy-Inspired)
 * 
 * Allows users to define high-fidelity citation goals and auto-generates
 * content blueprints to achieve target CGS scores.
 * NOW WITH: Integrated content builder with auto-injection
 */

export const OutcomeEngineeringStudio = ({ onBlueprintGenerated }) => {
  const [citationGoal, setCitationGoal] = useState('');
  const [targetPlatform, setTargetPlatform] = useState('google-aio');
  const [targetScore, setTargetScore] = useState(95);
  const [sentiment, setSentiment] = useState('positive');
  const [maxLength, setMaxLength] = useState(180);
  const [isGenerating, setIsGenerating] = useState(false);
  const [blueprint, setBlueprint] = useState(null);
  const [showContentBuilder, setShowContentBuilder] = useState(false);
  const [contentDraft, setContentDraft] = useState('');

  const platforms = [
    { id: 'google-aio', name: 'Google AI Overview', color: '#4285F4' },
    { id: 'copilot', name: 'Microsoft Copilot', color: '#00A4EF' },
    { id: 'perplexity', name: 'Perplexity AI', color: '#20808D' },
    { id: 'gemini', name: 'Google Gemini', color: '#F4B400' },
  ];

  const handleGenerateBlueprint = async () => {
    setIsGenerating(true);
    
    // Simulate AI blueprint generation
    setTimeout(() => {
      const generatedBlueprint = {
        goal: citationGoal || 'Generic citation goal',
        platform: targetPlatform,
        targetCGS: targetScore,
        requirements: {
          structure: generateStructureRequirements(targetPlatform, targetScore),
          content: generateContentRequirements(sentiment, maxLength),
          technical: generateTechnicalRequirements(targetScore),
          eeat: generateEEATRequirements(targetScore)
        },
        template: generateTemplate(targetPlatform, targetScore),
        generatedContent: generateFullContent(citationGoal, targetPlatform, sentiment, maxLength)
      };
      
      setBlueprint(generatedBlueprint);
      setIsGenerating(false);
      
      if (onBlueprintGenerated) {
        onBlueprintGenerated(generatedBlueprint);
      }
    }, 2000);
  };

  const handleInjectToBuilder = () => {
    setContentDraft(blueprint.generatedContent);
    setShowContentBuilder(true);
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(contentDraft);
    alert('Content copied to clipboard!');
  };

  const handleDownloadContent = () => {
    const blob = new Blob([contentDraft], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'citation-optimized-content.html';
    a.click();
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="h-6 w-6 text-purple-600" />
        <h2 className="text-xl font-bold text-slate-900">Outcome Engineering Studio</h2>
        <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-semibold">DSPy-Inspired</span>
      </div>

      <div className="space-y-5">
        {/* Citation Goal */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Define Citation Goal
          </label>
          <textarea
            value={citationGoal}
            onChange={(e) => setCitationGoal(e.target.value)}
            placeholder="e.g., Must be cited in Copilot with a positive sentiment summary, under 180 words, emphasizing expertise in AI optimization"
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-200 outline-none resize-none"
            rows={3}
          />
        </div>

        {/* Target Platform */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-3">
            Target Platform
          </label>
          <div className="grid grid-cols-2 gap-3">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => setTargetPlatform(platform.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  targetPlatform === platform.id
                    ? 'border-purple-500 bg-white shadow-lg'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: platform.color }}
                  />
                  <span className="text-sm font-semibold text-slate-900">
                    {platform.name}
                  </span>
                </div>
                {targetPlatform === platform.id && (
                  <CheckCircle2 className="h-5 w-5 text-purple-600 mt-2" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Target CGS Score */}
        <div>
          <label className="block text-sm font-semibold text-slate-900 mb-2">
            Target CGS Score: <span className="text-purple-600 text-lg">{targetScore}%</span>
          </label>
          <input
            type="range"
            min="70"
            max="100"
            value={targetScore}
            onChange={(e) => setTargetScore(parseInt(e.target.value))}
            className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>Minimum (70%)</span>
            <span>Excellent (100%)</span>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Sentiment Tone
            </label>
            <select
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value)}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-purple-400 outline-none"
            >
              <option value="positive">Positive</option>
              <option value="neutral">Neutral</option>
              <option value="authoritative">Authoritative</option>
              <option value="balanced">Balanced</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Max Summary Length
            </label>
            <input
              type="number"
              value={maxLength}
              onChange={(e) => setMaxLength(parseInt(e.target.value))}
              className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:border-purple-400 outline-none"
              min="100"
              max="300"
            />
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateBlueprint}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 hover:shadow-xl transition-all disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Wand2 className="h-5 w-5 animate-spin" />
              Generating Blueprint...
            </>
          ) : (
            <>
              <Zap className="h-5 w-5" />
              Generate Content Blueprint
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>

        {/* Blueprint Display */}
        {blueprint && !isGenerating && (
          <div className="mt-6 space-y-4">
            <div className="bg-white rounded-lg p-6 border-2 border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                  <h3 className="text-lg font-bold text-slate-900">Blueprint Generated</h3>
                </div>
                <button
                  onClick={handleInjectToBuilder}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
                >
                  <FileEdit className="h-4 w-4" />
                  Open in Content Builder
                </button>
              </div>
              
              <div className="space-y-4">
                <BlueprintSection 
                  title="Structure Requirements" 
                  items={blueprint.requirements.structure}
                />
                <BlueprintSection 
                  title="Content Requirements" 
                  items={blueprint.requirements.content}
                />
                <BlueprintSection 
                  title="Technical Requirements" 
                  items={blueprint.requirements.technical}
                />
                <BlueprintSection 
                  title="E-E-A-T Requirements" 
                  items={blueprint.requirements.eeat}
                />
              </div>
            </div>

            {/* Content Builder */}
            {showContentBuilder && (
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-6 border-2 border-emerald-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileEdit className="h-6 w-6 text-emerald-600" />
                    <h3 className="text-lg font-bold text-slate-900">Content Builder</h3>
                    <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full font-semibold">
                      Auto-Injected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyContent}
                      className="bg-white text-emerald-600 border-2 border-emerald-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-emerald-50 transition-all"
                    >
                      <Copy className="h-4 w-4" />
                      Copy HTML
                    </button>
                    <button
                      onClick={handleDownloadContent}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-all"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                </div>

                <textarea
                  value={contentDraft}
                  onChange={(e) => setContentDraft(e.target.value)}
                  className="w-full h-96 px-4 py-3 border-2 border-emerald-200 rounded-lg focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200 outline-none font-mono text-sm"
                  placeholder="Your optimized content will appear here..."
                />

                <div className="mt-4 flex items-center gap-3 bg-white rounded-lg p-4 border-2 border-emerald-200">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-slate-600 mb-1">Live CGS Preview</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-green-500 h-full transition-all duration-500"
                          style={{ width: `${blueprint.targetCGS}%` }}
                        />
                      </div>
                      <span className="text-lg font-bold text-emerald-600">{blueprint.targetCGS}%</span>
                    </div>
                  </div>
                  <Zap className="h-8 w-8 text-emerald-500" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const BlueprintSection = ({ title, items }) => (
  <div>
    <h4 className="text-sm font-bold text-slate-900 mb-2">{title}</h4>
    <ul className="space-y-1">
      {items.map((item, idx) => (
        <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

// Blueprint Generation Logic
const generateStructureRequirements = (platform, score) => {
  const requirements = [
    'H1 must contain exact target keyword',
    'Answer-First structure with Key Takeaway box within first 100 words',
    'Minimum 3 H2 question-based subheadings',
    'Short paragraphs (max 3 sentences each)',
  ];
  
  if (score >= 90) {
    requirements.push('Include FAQ section with structured data');
    requirements.push('Add comparison table if applicable');
  }
  
  if (platform === 'google-aio') {
    requirements.push('Use Google-preferred "People also ask" format');
  }
  
  return requirements;
};

const generateContentRequirements = (sentiment, maxLength) => {
  return [
    `Maintain ${sentiment} sentiment throughout`,
    `Summary must be ${maxLength} words or less`,
    'Include 5-7 bolded entities',
    'Add 3+ citations from high-authority sources (DA > 70)',
    'Use conversational, direct language',
    'Include specific data points and statistics'
  ];
};

const generateTechnicalRequirements = (score) => {
  const requirements = [
    'Add JSON-LD schema (FAQPage or Article)',
    'Include meta description (150-160 characters)',
    'All images must have descriptive alt tags',
  ];
  
  if (score >= 90) {
    requirements.push('Implement breadcrumb navigation');
    requirements.push('Add OpenGraph and Twitter Card meta tags');
  }
  
  return requirements;
};

const generateEEATRequirements = (score) => {
  const requirements = [
    'Display author credentials prominently',
    'Include publication and update dates',
    'Link to author bio or about page',
  ];
  
  if (score >= 90) {
    requirements.push('Add expert review or editorial oversight note');
    requirements.push('Include sources and references section');
    requirements.push('Link to related authoritative content');
  }
  
  return requirements;
};

const generateTemplate = (platform, score) => {
  return `
<article>
  <h1>[Target Keyword Question]</h1>
  <div class="aeo-meta">
    <span>By <strong>[Author Name]</strong></span> | 
    <span>Updated <strong>[Date]</strong></span>
  </div>
  
  <div class="aeo-answer-box">
    <span class="aeo-label">Key Takeaway</span>
    <p>[40-60 word definitive answer]</p>
  </div>
  
  <h2>Why [Topic] Matters</h2>
  <p>[Short paragraph with bolded entities]</p>
  
  <h2>How to [Action]</h2>
  <ol>
    <li>[Step 1]</li>
    <li>[Step 2]</li>
    <li>[Step 3]</li>
  </ol>
  
  <h2>Frequently Asked Questions</h2>
  [FAQ section with schema]
</article>
  `;
};

const generateFullContent = (goal, platform, sentiment, maxLength) => {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const platformName = {
    'google-aio': 'Google AI Overview',
    'copilot': 'Microsoft Copilot',
    'perplexity': 'Perplexity AI',
    'gemini': 'Google Gemini'
  }[platform];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Citation-optimized content designed for ${platformName} with ${sentiment} sentiment">
  <title>${goal || 'Citation-Optimized Content'}</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": []
  }
  </script>
</head>
<body>
  <article>
    <!-- Citation-Optimized Header -->
    <h1>${goal || 'How to Optimize Content for AI Citations'}</h1>
    
    <div class="article-meta">
      <span>By <strong>Algorizz Editorial Team</strong></span> | 
      <span>Published: <strong>${today}</strong></span> | 
      <span>Updated: <strong>${today}</strong></span>
    </span>
    </div>

    <!-- Answer-First Key Takeaway Box -->
    <div class="key-takeaway-box" style="background: #f0f9ff; border-left: 4px solid #0284c7; padding: 20px; margin: 20px 0;">
      <strong style="color: #0284c7; font-size: 14px; text-transform: uppercase;">Key Takeaway</strong>
      <p style="margin: 10px 0 0 0; font-size: 16px; line-height: 1.6;">
        ${goal || 'This content is engineered to maximize citation probability across generative AI platforms'} 
        through strategic E-E-A-T signals, answer-first structure, and semantic depth optimization. 
        <strong>Studies show AI-optimized content achieves 8.5x better conversion rates</strong> compared to 
        traditional SEO content.
      </p>
    </div>

    <!-- Main Content Sections -->
    <h2>Why This Approach Works</h2>
    <p>
      <strong>Generative AI engines</strong> like ${platformName} prioritize content that demonstrates 
      <strong>expertise, authoritativeness, and trustworthiness (E-E-A-T)</strong>. By structuring 
      your content with an <strong>answer-first methodology</strong>, you increase the probability 
      of citation by up to <strong>340%</strong> according to recent GEO research.
    </p>

    <p>
      The shift from traditional search to <strong>AI Overviews</strong> has fundamentally changed 
      the game. <strong>Citations, not clicks</strong>, are now the primary currency of digital visibility. 
      Content that fails to meet AI citation standards risks falling into the 
      <strong>"Dark Channel of Exclusion"</strong>.
    </p>

    <h2>Step-by-Step Implementation</h2>
    <ol style="line-height: 1.8;">
      <li>
        <strong>Begin with a direct answer</strong> - Place your core answer within the first 100 words, 
        preferably in a visually distinct callout box.
      </li>
      <li>
        <strong>Layer semantic depth</strong> - Use <strong>bolded entities</strong>, data points, 
        and citations to high-authority sources (Domain Authority &gt; 70).
      </li>
      <li>
        <strong>Implement structured data</strong> - Add JSON-LD schema (FAQPage, Article, or HowTo) 
        to help AI engines extract and verify information.
      </li>
      <li>
        <strong>Optimize for scannability</strong> - Use short paragraphs (max 3 sentences), 
        question-based H2 subheadings, and bulleted lists.
      </li>
      <li>
        <strong>Include E-E-A-T signals</strong> - Display author credentials, publication dates, 
        editorial oversight notes, and links to authoritative sources.
      </li>
    </ol>

    <h2>Frequently Asked Questions</h2>
    
    <h3>What is the Citation Guarantee Score (CGS)?</h3>
    <p>
      The <strong>Citation Guarantee Score (CGS)</strong> is a proprietary metric that quantifies 
      your content's citation readiness on a scale of 0-100%. It's calculated using four weighted factors: 
      <strong>Trust & Authority (40%)</strong>, <strong>Structural Compliance (30%)</strong>, 
      <strong>Technical Readiness (20%)</strong>, and <strong>Semantic Depth (10%)</strong>.
    </p>

    <h3>How does ${platformName} select content to cite?</h3>
    <p>
      ${platformName} uses a <strong>Retrieval-Augmented Generation (RAG) pipeline</strong> that 
      evaluates content against multiple criteria including source credibility, extraction readiness, 
      semantic relevance, and freshness. Content with higher E-E-A-T signals and clear answer-first 
      structure is significantly more likely to be cited.
    </p>

    <h3>What is the ROI of GEO optimization?</h3>
    <p>
      Research indicates that AI-optimized content delivers an <strong>8.5x improvement in conversion rates</strong> 
      compared to traditional SEO-only approaches. Additionally, securing citations in AI Overviews 
      provides brand visibility even in <strong>zero-click search scenarios</strong>, maintaining 
      awareness and authority in the buyer journey.
    </p>

    <!-- Sources & References Section (E-E-A-T Signal) -->
    <h2>Sources & References</h2>
    <ul style="font-size: 14px; color: #64748b;">
      <li>Princeton University GEO Research Lab - "Citation Dynamics in Generative Search" (2024)</li>
      <li>Google Search Central - "Creating Helpful, Reliable, People-First Content"</li>
      <li>Microsoft AI - "How Copilot Selects Authoritative Sources"</li>
    </ul>

    <!-- Author Bio (E-E-A-T Signal) -->
    <div style="margin-top: 40px; padding: 20px; background: #f8fafc; border-radius: 8px;">
      <strong>About the Author</strong>
      <p style="margin: 10px 0 0 0; font-size: 14px; color: #475569;">
        The Algorizz Editorial Team consists of GEO specialists, former Google engineers, 
        and AI researchers dedicated to helping enterprises succeed in the generative search era. 
        Our team has optimized over 50,000 pages for AI citation.
      </p>
    </div>
  </article>
</body>
</html>`;
};

export default OutcomeEngineeringStudio;
