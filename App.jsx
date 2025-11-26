import React, { useState } from 'react';
import { Copy, RefreshCw, ArrowRight, Code, FileText, Check, AlertCircle, Palette, Globe, Download, Wand2, Sparkles, Type, UploadCloud, X, Settings, Save, Trash2, Library, Search, BrainCircuit, Mic } from 'lucide-react';

const algorizzAccentColor = "#ff7a59";

export default function App() {
  const [inputText, setInputText] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [optimizedContent, setOptimizedContent] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('preview');
  const [copied, setCopied] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [keyStatus, setKeyStatus] = useState('checking');
  const [brandColor, setBrandColor] = useState('#33475b');
  const [brandFont, setBrandFont] = useState('Helvetica Neue');
  const [brandTone, setBrandTone] = useState('Professional and Direct');

  const defaultApiKey = "AIzaSyCOIRET7L3XeLbq4HWlEYgR358riSMuybo";
  const getEffectiveKey = () => customApiKey || defaultApiKey;

  const checkKeyHealth = async () => {
    setKeyStatus('checking');
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${getEffectiveKey()}`
      );
      setKeyStatus(response.ok ? 'valid' : 'invalid');
    } catch (e) {
      setKeyStatus('invalid');
    }
  };

  React.useEffect(() => {
    checkKeyHealth();
  }, [customApiKey]);

  const handleOptimize = async () => {
    if (!inputText) return;
    setIsLoading(true);
    setError(null);
    setOptimizedContent(null);

    const systemPrompt = `
      You are an advanced AEO (Answer Engine Optimisation) specialist.
      Rewrite the user's content to rank #1 in AI Overviews.
      
      Rules:
      1. Use British English spelling (colour, optimise, centre)
      2. Start with the absolute answer immediately
      3. Bold key terms using <strong> tags
      4. Break content into short paragraphs
      5. Use HTML formatting only (no markdown)
      6. Return only inner HTML (no <html>, <head>, <body> tags)
      
      Brand Tone: ${brandTone}
    `;

    const userPrompt = `Target Keyword: ${targetKeyword}\n\nContent:\n${inputText}`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${getEffectiveKey()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API Error ${response.status}`);
      }

      const data = await response.json();
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!resultText) {
        throw new Error("AI returned no content.");
      }

      const cleanHtml = resultText.replace(/```html/g, '').replace(/```/g, '').trim();
      setOptimizedContent(cleanHtml);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!optimizedContent) return;
    navigator.clipboard.writeText(optimizedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${targetKeyword || 'AEO Optimised Content'}</title>
<style>
  body { font-family: ${brandFont}, sans-serif; color: #33475b; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { font-size: 2.5rem; color: #2d3e50; margin-bottom: 1rem; }
  h2 { font-size: 1.75rem; margin-top: 2rem; margin-bottom: 1rem; color: ${brandColor}; border-bottom: 3px solid ${brandColor}; }
  p { margin-bottom: 1.5rem; }
  strong { color: ${brandColor}; font-weight: 700; }
  a { color: ${brandColor}; text-decoration: underline; }
</style>
</head>
<body>
${optimizedContent}
</body>
</html>`;
    
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetKeyword.replace(/\s+/g, '-').toLowerCase() || 'post'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      {/* TOP NAV */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {keyStatus === 'valid' && <span className="text-xs font-bold text-green-600">✓ API Active</span>}
        {keyStatus === 'invalid' && <span className="text-xs font-bold text-red-600">✗ API Error</span>}
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 bg-white rounded-full shadow-md hover:bg-slate-50 text-slate-600"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: algorizzAccentColor }}>
            AlgoRizz <span className="text-slate-600 font-light">Optimiser</span>
          </h1>
          <p className="text-slate-600">AI-Powered AEO Content Engine</p>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: CONTROLS */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Brand Settings */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">Brand Identity</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Brand Colour</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-10 w-10 rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="flex-1 p-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Font</label>
                  <input
                    type="text"
                    value={brandFont}
                    onChange={(e) => setBrandFont(e.target.value)}
                    className="w-full p-2 mt-1 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Brand Tone</label>
                  <input
                    type="text"
                    value={brandTone}
                    onChange={(e) => setBrandTone(e.target.value)}
                    className="w-full p-2 mt-1 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Content Input */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-grow flex flex-col">
              <label className="text-xs font-semibold text-slate-500 uppercase mb-2">Target Keyword</label>
              <input
                type="text"
                placeholder="e.g. AEO Strategy"
                className="w-full p-2 mb-4 border border-slate-300 rounded-md"
                value={targetKeyword}
                onChange={(e) => setTargetKeyword(e.target.value)}
              />

              <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Content</label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste your blog post or content here..."
                className="flex-grow p-3 border border-slate-300 rounded-md text-sm font-mono mb-4"
              />

              <button
                onClick={handleOptimize}
                disabled={isLoading || !inputText}
                style={{ backgroundColor: isLoading ? '#cbd6e2' : algorizzAccentColor }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-white font-semibold transition-all"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="animate-spin h-5 w-5" />
                    <span>Optimising...</span>
                  </>
                ) : (
                  <>
                    Optimise Content <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              {error && (
                <div className="mt-2 p-3 bg-red-50 rounded-md border border-red-200 text-red-600 text-xs flex gap-1">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: OUTPUT */}
          <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[800px]">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    activeTab === 'preview'
                      ? 'bg-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    activeTab === 'code'
                      ? 'bg-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  HTML Code
                </button>
              </div>
              <div className="flex items-center gap-2">
                {optimizedContent && (
                  <>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
                    >
                      <Download className="h-4 w-4" /> Download
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-grow overflow-y-auto p-8 bg-white">
              {!optimizedContent && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center">
                  <BrainCircuit className="h-12 w-12 mb-4 opacity-20" />
                  <p>Paste content on the left to start AEO optimisation.</p>
                </div>
              )}

              {isLoading && (
                <div className="flex flex-col items-center justify-center h-full">
                  <div
                    className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4"
                    style={{ borderColor: algorizzAccentColor }}
                  ></div>
                  <p className="text-slate-600 font-medium">Optimising your content...</p>
                </div>
              )}

              {activeTab === 'preview' && optimizedContent && (
                <div
                  className="max-w-3xl mx-auto prose prose-sm"
                  style={{ fontFamily: `'${brandFont}', sans-serif` }}
                  dangerouslySetInnerHTML={{ __html: optimizedContent }}
                />
              )}

              {activeTab === 'code' && optimizedContent && (
                <pre className="text-xs bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto font-mono">
                  {optimizedContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Google Gemini API Key</label>
                <p className="text-xs text-slate-500 mb-2">System Key: {defaultApiKey ? 'Loaded' : 'Missing'}</p>
                <input
                  type="password"
                  placeholder="Override with your API key..."
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-md"
                />
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-2 bg-slate-800 text-white rounded-md font-medium hover:bg-slate-700"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
