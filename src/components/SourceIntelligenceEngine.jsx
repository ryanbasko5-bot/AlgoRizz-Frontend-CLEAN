import React, { useState } from 'react';
import { Search, TrendingUp, Link2, Award, ExternalLink, Filter, BarChart } from 'lucide-react';

/**
 * Source Intelligence Engine
 * 
 * Performs deep competitive analysis to reveal which external, third-party domains
 * (Earned Media) LLMs trust most for specific topics. Guides strategic PR investment
 * to build "AI-Perceived Authority."
 */

export const SourceIntelligenceEngine = ({ topic, onSourceSelected }) => {
  const [searchQuery, setSearchQuery] = useState(topic || '');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const handleAnalyze = async () => {
    if (!searchQuery) return;
    
    setIsAnalyzing(true);
    
    // Simulate deep competitive analysis
    setTimeout(() => {
      setResults(generateSourceIntelligence(searchQuery));
      setIsAnalyzing(false);
    }, 2500);
  };

  const filters = [
    { id: 'all', label: 'All Sources', count: results?.trustedSources.length || 0 },
    { id: 'editorial', label: 'Editorial', count: results?.trustedSources.filter(s => s.type === 'Editorial').length || 0 },
    { id: 'academic', label: 'Academic', count: results?.trustedSources.filter(s => s.type === 'Academic').length || 0 },
    { id: 'industry', label: 'Industry', count: results?.trustedSources.filter(s => s.type === 'Industry').length || 0 },
  ];

  const filteredSources = results ? (
    selectedFilter === 'all' 
      ? results.trustedSources 
      : results.trustedSources.filter(s => s.type === selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1))
  ) : [];

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Source Intelligence Engine</h2>
            <p className="text-indigo-100 text-sm">
              Competitive analysis of AI-trusted domains
            </p>
          </div>
          <Search className="h-12 w-12 opacity-50" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <div className="flex gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="Enter topic or keyword (e.g., 'AI optimization', 'digital marketing')"
            className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 outline-none"
          />
          <button
            onClick={handleAnalyze}
            disabled={!searchQuery || isAnalyzing}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                Analyze
              </>
            )}
          </button>
        </div>
      </div>

      {results && !isAnalyzing && (
        <>
          {/* Key Insights */}
          <div className="p-6 border-b border-slate-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Key Insights</h3>
            <div className="grid grid-cols-3 gap-4">
              <InsightCard
                icon={<Link2 className="h-6 w-6 text-blue-600" />}
                label="Trusted Domains"
                value={results.trustedSources.length}
                sublabel="High-authority sources"
              />
              <InsightCard
                icon={<Award className="h-6 w-6 text-purple-600" />}
                label="Avg Domain Authority"
                value={results.avgDA}
                sublabel="Across all sources"
              />
              <InsightCard
                icon={<TrendingUp className="h-6 w-6 text-green-600" />}
                label="Citation Frequency"
                value={`${results.avgCitationFreq}%`}
                sublabel="LLM citation rate"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-2">
            <Filter className="h-5 w-5 text-slate-400" />
            <div className="flex gap-2 overflow-x-auto">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                    selectedFilter === filter.id
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          </div>

          {/* Trusted Sources List */}
          <div className="p-6">
            <div className="space-y-3">
              {filteredSources.map((source, idx) => (
                <SourceCard
                  key={idx}
                  source={source}
                  rank={idx + 1}
                  onSelect={() => onSourceSelected && onSourceSelected(source)}
                />
              ))}
            </div>
          </div>

          {/* PR Investment Recommendations */}
          <div className="p-6 border-t border-slate-200 bg-gradient-to-br from-green-50 to-emerald-50">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              PR Investment Strategy
            </h3>
            <div className="space-y-3">
              {results.prRecommendations.map((rec, idx) => (
                <div key={idx} className="bg-white rounded-lg p-4 border-2 border-green-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{rec.action}</h4>
                      <p className="text-xs text-slate-600 mt-1">{rec.rationale}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {rec.priority.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span>Expected Impact: <strong className="text-green-600">{rec.impact}</strong></span>
                    <span>Est. Investment: <strong className="text-slate-900">{rec.investment}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const InsightCard = ({ icon, label, value, sublabel }) => (
  <div className="bg-white rounded-lg p-4 border border-slate-200">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
        {label}
      </span>
    </div>
    <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
    <div className="text-xs text-slate-500">{sublabel}</div>
  </div>
);

const SourceCard = ({ source, rank, onSelect }) => {
  const daColor = source.da >= 90 ? 'text-green-600' : source.da >= 80 ? 'text-blue-600' : 'text-yellow-600';
  const daBgColor = source.da >= 90 ? 'bg-green-50' : source.da >= 80 ? 'bg-blue-50' : 'bg-yellow-50';

  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-bold text-slate-900 text-sm">{source.domain}</h4>
              <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {source.type}
              </span>
            </div>
            <p className="text-xs text-slate-600">{source.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`${daBgColor} ${daColor} px-3 py-1 rounded-lg text-center`}>
            <div className="text-xl font-bold">{source.da}</div>
            <div className="text-xs">DA</div>
          </div>
          <a
            href={`https://${source.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-slate-200 rounded transition-all"
          >
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200">
        <div>
          <div className="text-xs text-slate-500 mb-1">Citation Rate</div>
          <div className="text-sm font-bold text-indigo-600">{source.citationRate}%</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Monthly Mentions</div>
          <div className="text-sm font-bold text-slate-900">{source.mentions.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 mb-1">Trust Score</div>
          <div className="text-sm font-bold text-green-600">{source.trustScore}/100</div>
        </div>
      </div>

      {source.topTopics && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500 mb-2">Top Topics:</div>
          <div className="flex flex-wrap gap-1">
            {source.topTopics.map((topic, idx) => (
              <span key={idx} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Mock Data Generator
const generateSourceIntelligence = (topic) => {
  const sources = [
    { domain: 'nature.com', type: 'Academic', da: 95, citationRate: 87, mentions: 12450, trustScore: 98, topTopics: ['Research', 'Science', 'Studies'] },
    { domain: 'harvard.edu', type: 'Academic', da: 94, citationRate: 85, mentions: 10230, trustScore: 97, topTopics: ['Education', 'Research', 'Policy'] },
    { domain: 'forbes.com', type: 'Editorial', da: 93, citationRate: 82, mentions: 15670, trustScore: 94, topTopics: ['Business', 'Finance', 'Technology'] },
    { domain: 'nytimes.com', type: 'Editorial', da: 94, citationRate: 84, mentions: 18920, trustScore: 96, topTopics: ['News', 'Analysis', 'Opinion'] },
    { domain: 'mit.edu', type: 'Academic', da: 93, citationRate: 83, mentions: 8560, trustScore: 95, topTopics: ['Technology', 'Engineering', 'Innovation'] },
    { domain: 'techcrunch.com', type: 'Industry', da: 88, citationRate: 76, mentions: 14320, trustScore: 89, topTopics: ['Startups', 'Tech', 'Innovation'] },
    { domain: 'wired.com', type: 'Editorial', da: 87, citationRate: 74, mentions: 11450, trustScore: 88, topTopics: ['Technology', 'Culture', 'Science'] },
    { domain: 'stanford.edu', type: 'Academic', da: 92, citationRate: 81, mentions: 7890, trustScore: 94, topTopics: ['Research', 'Innovation', 'Policy'] },
  ];

  sources.forEach(s => {
    s.description = `Leading ${s.type.toLowerCase()} source for ${topic} with high AI citation rate`;
  });

  const avgDA = Math.round(sources.reduce((sum, s) => sum + s.da, 0) / sources.length);
  const avgCitationFreq = Math.round(sources.reduce((sum, s) => sum + s.citationRate, 0) / sources.length);

  return {
    topic,
    trustedSources: sources,
    avgDA,
    avgCitationFreq,
    prRecommendations: [
      {
        priority: 'high',
        action: `Secure guest contribution on nature.com or harvard.edu`,
        rationale: 'Academic sources have 98% trust score and 85%+ citation rates',
        impact: '+35 CGS points',
        investment: '$5,000 - $15,000'
      },
      {
        priority: 'high',
        action: `Get featured quote in Forbes or NY Times article`,
        rationale: 'Editorial coverage drives immediate authority signal boost',
        impact: '+28 CGS points',
        investment: '$3,000 - $8,000'
      },
      {
        priority: 'medium',
        action: `Build backlink from MIT or Stanford research pages`,
        rationale: 'University citations signal deep expertise to LLMs',
        impact: '+22 CGS points',
        investment: '$2,000 - $5,000'
      }
    ]
  };
};

export default SourceIntelligenceEngine;
