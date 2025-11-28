import React, { useState, useEffect } from 'react';
import { 
  Brain, Target, Activity, Zap, Search, DollarSign, Menu, X, 
  Home, FileText, BarChart3, Settings, Crown, ChevronRight 
} from 'lucide-react';

// Import new GEO components
import CGSScoreDisplay from './components/CGSScoreEngine';
import OutcomeEngineeringStudio from './components/OutcomeEngineeringStudio';
import AttributionFrequencyTracker from './components/AttributionFrequencyTracker';
import AIActionCenter from './components/AIActionCenter';
import SourceIntelligenceEngine from './components/SourceIntelligenceEngine';
import PricingSystem from './components/PricingSystem';

/**
 * Algorizz: Generative Engine Optimization Platform
 * 
 * The only platform that uses proprietary Outcome Engineering to provide
 * a real-time, measurable probability (0-100%) that an LLM will cite a page.
 * 
 * Core USP: Citation Guarantee Score (CGS_LLM) - from reactive tracking to prescriptive outcome guarantee
 */

export default function AlgorizzGEOApp() {
  const logout = () => {
    localStorage.removeItem('algorizz_authenticated');
    localStorage.removeItem('algorizz_user');
    location.reload();
  };
  const [activeView, setActiveView] = useState('dashboard'); // dashboard, editor, analytics, intelligence, pricing
  const [showSidebar, setShowSidebar] = useState(true);
  const [currentDomain, setCurrentDomain] = useState('example.com');
  const [userTier, setUserTier] = useState('enterprise'); // 'professional' | 'enterprise'
  const [cgsCredits, setCgsCredits] = useState(3450);
  
  // Content optimization state
  const [optimizedContent, setOptimizedContent] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: Home, tier: 'professional' },
    { id: 'editor', name: 'Content Editor', icon: FileText, tier: 'professional' },
    { id: 'analytics', name: 'Attribution Analytics', icon: BarChart3, tier: 'professional' },
    { id: 'outcome-studio', name: 'Outcome Engineering', icon: Target, tier: 'enterprise', highlight: true },
    { id: 'intelligence', name: 'Source Intelligence', icon: Search, tier: 'enterprise', highlight: true },
    { id: 'pricing', name: 'Upgrade Plan', icon: Crown, tier: 'all' },
  ];

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView domain={currentDomain} tier={userTier} credits={cgsCredits} />;
      case 'editor':
        return (
          <EditorView 
            content={optimizedContent}
            onContentUpdate={setOptimizedContent}
            keyword={targetKeyword}
            onKeywordUpdate={setTargetKeyword}
          />
        );
      case 'analytics':
        return <AttributionFrequencyTracker domain={currentDomain} dateRange="30d" />;
      case 'outcome-studio':
        return userTier === 'enterprise' ? (
          <OutcomeEngineeringStudio />
        ) : (
          <UpgradePrompt feature="Outcome Engineering Studio" />
        );
      case 'intelligence':
        return userTier === 'enterprise' ? (
          <SourceIntelligenceEngine topic={targetKeyword} />
        ) : (
          <UpgradePrompt feature="Source Intelligence Engine" />
        );
      case 'pricing':
        return <PricingSystem onPlanSelected={(plan) => setUserTier(plan.id)} />;
      default:
        return <DashboardView domain={currentDomain} tier={userTier} credits={cgsCredits} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      {/* Sidebar */}
      {showSidebar && (
        <aside className="w-72 bg-slate-900/80 backdrop-blur-xl border-r border-purple-500/20 flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Algorizz</h1>
                <p className="text-xs text-purple-300">GEO Platform</p>
              </div>
            </div>
          </div>

          {/* Credits Display */}
          <div className="p-4 mx-4 mt-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-yellow-200 font-semibold">CGS Credits</span>
              <Zap className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-white">{cgsCredits.toLocaleString()}</div>
            <div className="text-xs text-yellow-300 mt-1">
              {userTier === 'enterprise' ? '5,000/mo included' : '1,000/mo included'}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isLocked = item.tier === 'enterprise' && userTier !== 'enterprise';
              const isActive = activeView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => !isLocked && setActiveView(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
                      : isLocked
                      ? 'text-slate-500 cursor-not-allowed'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  } ${item.highlight && !isActive ? 'border border-purple-500/30' : ''}`}
                  disabled={isLocked}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium flex-1 text-left">{item.name}</span>
                  {isLocked && (
                    <Crown className="h-4 w-4 text-yellow-500" />
                  )}
                  {isActive && <ChevronRight className="h-4 w-4" />}
                </button>
              );
            })}
          </nav>

          {/* User Tier Badge */}
          <div className="p-4 border-t border-purple-500/20">
            <div className={`px-4 py-3 rounded-lg ${
              userTier === 'enterprise' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600' 
                : 'bg-slate-800'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-yellow-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  {userTier}
                </span>
              </div>
              <p className="text-xs text-purple-200">
                {userTier === 'enterprise' ? 'Full platform access' : 'Limited features'}
              </p>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-slate-900/50 backdrop-blur-xl border-b border-purple-500/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-all"
            >
              {showSidebar ? <X className="h-5 w-5 text-slate-400" /> : <Menu className="h-5 w-5 text-slate-400" />}
            </button>
            <div>
              <h2 className="text-lg font-bold text-white">
                {navigation.find(n => n.id === activeView)?.name}
              </h2>
              <p className="text-xs text-slate-400">Tracking: {currentDomain}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg">
              <span className="text-xs font-semibold text-green-400">● System Active</span>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/5 border border-pink-500/30">
              <span className="text-[10px] text-pink-300 font-['VT323']">
                Signed in as {localStorage.getItem('algorizz_user') || 'guest'}
              </span>
            </div>
            <button
              onClick={logout}
              className="px-3 py-2 rounded-lg font-['Press_Start_2P'] text-[10px] border-2 border-[#FF1493] text-[#FF1493] hover:bg-[#FF1493] hover:text-[#0d0520] transition-all duration-200 shadow-[0_0_10px_rgba(255,20,147,0.5)]"
            >
              LOG OUT
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

// Dashboard View
const DashboardView = ({ domain, tier, credits }) => {
  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          icon={<Target className="h-8 w-8 text-blue-500" />}
          label="Avg CGS Score"
          value="87"
          change="+12%"
          color="blue"
        />
        <StatCard
          icon={<Activity className="h-8 w-8 text-purple-500" />}
          label="Total Citations"
          value="2,417"
          change="+24%"
          color="purple"
        />
        <StatCard
          icon={<Zap className="h-8 w-8 text-yellow-500" />}
          label="CGS Credits"
          value={credits.toLocaleString()}
          change="3,450 left"
          color="yellow"
        />
        <StatCard
          icon={<DollarSign className="h-8 w-8 text-green-500" />}
          label="Est. Monthly Value"
          value="$24.5K"
          change="8.5x ROI"
          color="green"
        />
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Citation Guarantee Score</h3>
          <p className="text-purple-200 text-sm mb-4">
            Real-time probability that an LLM will cite your content
          </p>
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl font-bold text-green-400 mb-2">87%</div>
              <div className="text-sm text-purple-300">High Citation Probability</div>
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Platform Coverage</h3>
          <div className="space-y-3">
            <PlatformBar name="Google AI Overview" percentage={92} color="#4285F4" />
            <PlatformBar name="Perplexity AI" percentage={85} color="#20808D" />
            <PlatformBar name="Microsoft Copilot" percentage={78} color="#00A4EF" />
            <PlatformBar name="Google Gemini" percentage={88} color="#F4B400" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Editor View
const EditorView = ({ content, onContentUpdate, keyword, onKeywordUpdate }) => {
  const [localContent, setLocalContent] = useState(content || '<h1>Start optimizing your content</h1><p>Paste your content here...</p>');
  
  const cgsData = {
    totalScore: 87,
    breakdown: {
      trustAuthority: 85,
      structuralCompliance: 90,
      technicalReadiness: 82,
      semanticDepth: 88
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: CGS Score */}
      <div className="lg:col-span-1">
        <CGSScoreDisplay 
          content={localContent}
          metadata={{ targetKeyword: keyword }}
          onRecommendationClick={(rec) => console.log('Clicked:', rec)}
        />
      </div>

      {/* Middle: Content */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl p-6 h-full">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Content Editor</h3>
          <textarea
            value={localContent}
            onChange={(e) => {
              setLocalContent(e.target.value);
              onContentUpdate(e.target.value);
            }}
            className="w-full h-96 p-4 border-2 border-slate-200 rounded-lg font-mono text-sm"
          />
        </div>
      </div>

      {/* Right: AI Actions */}
      <div className="lg:col-span-1">
        <AIActionCenter 
          content={localContent}
          onContentUpdate={setLocalContent}
          cgsData={cgsData}
        />
      </div>
    </div>
  );
};

// Upgrade Prompt
const UpgradePrompt = ({ feature }) => (
  <div className="flex items-center justify-center h-full">
    <div className="bg-white/5 backdrop-blur-sm border-2 border-purple-500/30 rounded-2xl p-12 text-center max-w-2xl">
      <Crown className="h-20 w-20 text-yellow-400 mx-auto mb-6" />
      <h2 className="text-3xl font-bold text-white mb-4">
        {feature} is an Enterprise Feature
      </h2>
      <p className="text-purple-200 mb-8 text-lg">
        Upgrade to Enterprise to unlock Outcome Engineering, Source Intelligence, 
        and prescriptive citation optimization.
      </p>
      <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all">
        Upgrade to Enterprise
      </button>
    </div>
  </div>
);

// Helper Components
const StatCard = ({ icon, label, value, change, color }) => (
  <div className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6">
    <div className="flex items-center justify-between mb-3">
      {icon}
      <span className={`text-xs font-semibold text-${color}-400`}>{change}</span>
    </div>
    <div className="text-3xl font-bold text-white mb-1">{value}</div>
    <div className="text-sm text-purple-300">{label}</div>
  </div>
);

const PlatformBar = ({ name, percentage, color }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="text-purple-200">{name}</span>
      <span className="font-semibold text-white">{percentage}%</span>
    </div>
    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  </div>
);
