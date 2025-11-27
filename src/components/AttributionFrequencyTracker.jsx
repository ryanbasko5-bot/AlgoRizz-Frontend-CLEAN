import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Eye, Link2, CheckCircle, ExternalLink, BarChart3, Globe } from 'lucide-react';

/**
 * Attribution Frequency Tracker
 * 
 * Monitors and reports explicit citations (where URL is linked) across:
 * - Google AI Overview (AIO)
 * - Google Gemini
 * - Perplexity AI
 * - Microsoft Copilot
 * 
 * Critical for accurate ROI calculation and citation validation.
 */

export const AttributionFrequencyTracker = ({ domain, dateRange = '30d' }) => {
  const [attributionData, setAttributionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  useEffect(() => {
    // Simulate fetching attribution data
    setTimeout(() => {
      setAttributionData(generateMockData(domain, dateRange));
      setIsLoading(false);
    }, 1500);
  }, [domain, dateRange]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-8 border-2 border-slate-200 flex items-center justify-center">
        <Activity className="h-8 w-8 animate-pulse text-blue-500" />
        <span className="ml-3 text-slate-600">Loading attribution data...</span>
      </div>
    );
  }

  const platforms = [
    { id: 'all', name: 'All Platforms', color: '#64748b' },
    { id: 'google-aio', name: 'Google AIO', color: '#4285F4', icon: Globe },
    { id: 'gemini', name: 'Gemini', color: '#F4B400', icon: Activity },
    { id: 'perplexity', name: 'Perplexity', color: '#20808D', icon: Eye },
    { id: 'copilot', name: 'Copilot', color: '#00A4EF', icon: Link2 },
  ];

  const filteredData = selectedPlatform === 'all' 
    ? attributionData 
    : {
        ...attributionData,
        platforms: attributionData.platforms.filter(p => p.id === selectedPlatform)
      };

  const totalCitations = filteredData.platforms.reduce((sum, p) => sum + p.citations, 0);
  const totalImpressions = filteredData.platforms.reduce((sum, p) => sum + p.impressions, 0);
  const avgCitationRate = ((totalCitations / totalImpressions) * 100).toFixed(2);

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Attribution Tracker</h2>
            <p className="text-blue-100 text-sm">
              Monitoring citations for <span className="font-semibold">{domain}</span>
            </p>
          </div>
          <Activity className="h-12 w-12 opacity-50" />
        </div>
      </div>

      {/* Platform Filter */}
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex gap-2 overflow-x-auto">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatform(platform.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                selectedPlatform === platform.id
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              {platform.name}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
        <MetricCard
          icon={<Link2 className="h-6 w-6 text-blue-600" />}
          label="Total Citations"
          value={totalCitations.toLocaleString()}
          change="+24%"
          changeType="positive"
        />
        <MetricCard
          icon={<Eye className="h-6 w-6 text-purple-600" />}
          label="Total Impressions"
          value={totalImpressions.toLocaleString()}
          change="+12%"
          changeType="positive"
        />
        <MetricCard
          icon={<TrendingUp className="h-6 w-6 text-green-600" />}
          label="Citation Rate"
          value={`${avgCitationRate}%`}
          change="+8.5x"
          changeType="positive"
        />
      </div>

      {/* Platform Breakdown */}
      <div className="p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Platform Breakdown
        </h3>
        <div className="space-y-4">
          {filteredData.platforms.map((platform) => (
            <PlatformRow key={platform.id} platform={platform} />
          ))}
        </div>
      </div>

      {/* Top Cited Pages */}
      <div className="p-6 border-t border-slate-200 bg-slate-50">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Top Cited Pages
        </h3>
        <div className="space-y-3">
          {filteredData.topPages.map((page, idx) => (
            <TopPageCard key={idx} page={page} rank={idx + 1} />
          ))}
        </div>
      </div>

      {/* ROI Calculator */}
      <div className="p-6 border-t border-slate-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <h3 className="text-lg font-bold text-slate-900 mb-3">Citation ROI Impact</h3>
        <div className="bg-white rounded-lg p-4 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Conversion Rate Improvement</p>
              <p className="text-3xl font-bold text-green-600">8.5x</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600 mb-1">Estimated Monthly Value</p>
              <p className="text-3xl font-bold text-slate-900">
                ${(totalCitations * 8.5 * 12).toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Based on industry average: AI-optimized traffic converts 8.5x better than organic search
          </p>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, change, changeType }) => (
  <div className="bg-white rounded-lg p-4 border border-slate-200">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
        {label}
      </span>
    </div>
    <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
    <div className={`text-xs font-semibold ${
      changeType === 'positive' ? 'text-green-600' : 'text-red-600'
    }`}>
      {change} vs last period
    </div>
  </div>
);

const PlatformRow = ({ platform }) => {
  const citationRate = ((platform.citations / platform.impressions) * 100).toFixed(1);
  const barWidth = Math.min((platform.citations / 1000) * 100, 100);

  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: platform.color }}
          />
          <span className="font-semibold text-slate-900">{platform.name}</span>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-slate-900">{platform.citations}</div>
          <div className="text-xs text-slate-600">citations</div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Impressions:</span>
          <span className="font-semibold text-slate-900">{platform.impressions.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-600">Citation Rate:</span>
          <span className="font-semibold text-green-600">{citationRate}%</span>
        </div>
        
        {/* Visual Bar */}
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${barWidth}%`,
              backgroundColor: platform.color
            }}
          />
        </div>
      </div>
    </div>
  );
};

const TopPageCard = ({ page, rank }) => (
  <div className="bg-white rounded-lg p-3 border border-slate-200 flex items-center justify-between hover:border-blue-300 transition-all">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm truncate">{page.title}</p>
        <p className="text-xs text-slate-500 truncate">{page.url}</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="text-right">
        <div className="text-lg font-bold text-blue-600">{page.citations}</div>
        <div className="text-xs text-slate-500">citations</div>
      </div>
      <a 
        href={page.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="p-2 hover:bg-slate-100 rounded transition-all"
      >
        <ExternalLink className="h-4 w-4 text-slate-400" />
      </a>
    </div>
  </div>
);

// Mock Data Generator
const generateMockData = (domain, dateRange) => {
  return {
    domain,
    dateRange,
    platforms: [
      {
        id: 'google-aio',
        name: 'Google AI Overview',
        color: '#4285F4',
        citations: 842,
        impressions: 12450,
        trend: '+24%'
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        color: '#F4B400',
        citations: 654,
        impressions: 8920,
        trend: '+18%'
      },
      {
        id: 'perplexity',
        name: 'Perplexity AI',
        color: '#20808D',
        citations: 523,
        impressions: 6780,
        trend: '+32%'
      },
      {
        id: 'copilot',
        name: 'Microsoft Copilot',
        color: '#00A4EF',
        citations: 398,
        impressions: 5340,
        trend: '+15%'
      }
    ],
    topPages: [
      {
        title: 'Complete Guide to GEO Strategy in 2025',
        url: `https://${domain}/blog/geo-strategy-guide`,
        citations: 234,
        cgsScore: 94
      },
      {
        title: 'How AI Search is Transforming SEO',
        url: `https://${domain}/blog/ai-search-seo`,
        citations: 189,
        cgsScore: 91
      },
      {
        title: 'Answer Engine Optimization Best Practices',
        url: `https://${domain}/blog/aeo-best-practices`,
        citations: 167,
        cgsScore: 88
      },
      {
        title: 'E-E-A-T Signals for Citation Success',
        url: `https://${domain}/blog/eeat-signals`,
        citations: 143,
        cgsScore: 92
      }
    ]
  };
};

export default AttributionFrequencyTracker;
