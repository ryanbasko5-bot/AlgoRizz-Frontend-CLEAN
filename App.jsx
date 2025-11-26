import React, { useState, useEffect, useRef } from 'react';
import { Copy, RefreshCw, ArrowRight, Code, FileText, Check, AlertCircle, Palette, Globe, ImageIcon, Wand2, Sparkles, Type, Image as LucideImage, UploadCloud, X, Lock, Mic, Music, Upload, Settings, Activity, ShieldCheck, ShieldAlert, Terminal, Download, BrainCircuit, Link as LinkIcon, Library, Search, Save, Trash2 } from 'lucide-react';

// --- SAFE MODE CONFIGURATION ---
// Firebase imports and logic are completely removed to guarantee build success.
// We will add them back once the site is live.

const defaultApiKey = "AIzaSyCOIRET7L3XeLbq4HWlEYgR358riSMuybo"; 
const algorizzAccentColor = "#ff7a59"; 
const algorizzLogoPath = "/files/696b9b03-71ec-432f-9c09-7f06b5d91942.jpeg"; 

// Helper: Fetch with Timeout & Retry
const fetchWithRetry = async (url, options, retries = 3, backoff = 1000, timeout = 240000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  options.signal = controller.signal;

  try {
    const response = await fetch(url, options);
    clearTimeout(id);
    
    if (response.status === 401 || response.status === 403) return response;

    if (!response.ok && (response.status === 429 || response.status >= 500)) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, { ...options, signal: null }, retries - 1, backoff * 2, timeout);
      }
    }
    return response;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error("Request timed out. The file may be too large or your connection is slow. Try a smaller file.");
    }
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, { ...options, signal: null }, retries - 1, backoff * 2, timeout);
    }
    throw err;
  }
};

// Helper: Robust JSON Parser
const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    try {
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch (e2) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error("Could not parse JSON response from AI");
    }
  }
};

// Helper: Color Utils
const hexToRgb = (hex) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const getLuminance = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const a = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

const adjustColor = (hex, amount) => {
    return '#' + hex.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

export default function App() {
  // Auth & User State (STUBBED)
  const [user, setUser] = useState({ uid: 'guest' }); // Fake user for UI
  const [isAuthReady, setIsAuthReady] = useState(true);
  const [view, setView] = useState('editor'); 
  
  // API Configuration
  const [customApiKey, setCustomApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [keyStatus, setKeyStatus] = useState('checking'); 
  const [debugLog, setDebugLog] = useState([]);

  // Content State
  const [inputText, setInputText] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingKeyword, setIsGeneratingKeyword] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState(''); 
  const [optimizedContent, setOptimizedContent] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('preview');
  const [inputMode, setInputMode] = useState('text'); 
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); 
  const [totalEstTime, setTotalEstTime] = useState(0);

  // Library State (STUBBED)
  const [savedPosts, setSavedPosts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Brand State
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isAnalyzingBrand, setIsAnalyzingBrand] = useState(false);
  const [brandColor, setBrandColor] = useState('#33475b'); 
  const [colorPalette, setColorPalette] = useState(['#33475b', '#ff7a59', '#ffffff']); 
  const [brandFont, setBrandFont] = useState('Helvetica Neue');
  const [logoUrl, setLogoUrl] = useState(''); 
  const [brandTone, setBrandTone] = useState('Professional and Direct');
  const [headerImage, setHeaderImage] = useState(null);
  const fileInputRef = useRef(null); 
  const contentEditableRef = useRef(null);

  // Publish Integration State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [cmsType, setCmsType] = useState('wordpress'); 
  const [cmsUrl, setCmsUrl] = useState('');
  const [cmsApiKey, setCmsApiKey] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const getEffectiveKey = () => customApiKey || defaultApiKey;

  const addDebug = (msg, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [`[${timestamp}] [${type.toUpperCase()}] ${msg}`, ...prev].slice(0, 50));
  };

  // --- API KEY HEALTH CHECK ---
  const checkKeyHealth = async () => {
    setKeyStatus('checking');
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${getEffectiveKey()}`
      );
      if (response.ok) {
        setKeyStatus('valid');
      } else {
        setKeyStatus('invalid');
        if (response.status === 401) {
           setError("System API Key is being rejected (401). Please check settings.");
        }
      }
    } catch (e) {
      setKeyStatus('invalid');
    }
  };

  useEffect(() => {
    checkKeyHealth();
  }, [customApiKey]);


  // --- STUBBED LIBRARY FUNCTIONS (No Firebase) ---
  const handleSaveToLibrary = async () => {
     setError("Library storage is temporarily disabled for initial deployment.");
  };

  const handleDeletePost = async (postId, e) => {
     // Stub
  };

  const handleLoadPost = (post) => {
     // Stub
  };

  // FIX: Separate useEffect to handle updating the contentEditable div
  useEffect(() => {
    if (view === 'editor' && inputText && contentEditableRef.current) {
        if (contentEditableRef.current.innerHTML !== inputText) {
            contentEditableRef.current.innerHTML = inputText;
        }
    }
  }, [inputText, view]);


  // Countdown Timer Effect
  useEffect(() => {
    let interval;
    if ((isTranscribing || isAnalyzingBrand) && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTranscribing, isAnalyzingBrand, timeLeft]);

  useEffect(() => {
    if (!brandFont) return;
    const safeFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana', 'Tahoma', 'Trebuchet MS', 'system-ui', 'sans-serif', 'serif'];
    const primaryFont = brandFont.split(',')[0].replace(/['"]/g, '').trim();
    const isSafe = safeFonts.some(safe => primaryFont.toLowerCase().includes(safe.toLowerCase()));

    if (!isSafe && primaryFont.length > 2) {
      try {
        const linkId = 'aeo-dynamic-font-loader';
        let link = document.getElementById(linkId);
        if (!link) {
          link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          document.head.appendChild(link);
        }
        const formattedFont = primaryFont.replace(/ /g, '+');
        link.href = `https://fonts.googleapis.com/css2?family=${formattedFont}:wght@400;600;700&display=swap`;
      } catch (e) {
        // ignore
      }
    }
  }, [brandFont]);

  // SMART COLOR SYSTEM
  const isLightColor = getLuminance(brandColor) > 0.5;
  const readableHeaderColor = isLightColor ? adjustColor(brandColor, -100) : brandColor; 
  const rgb = hexToRgb(brandColor);
  const bgTint = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)` : '#f5f8fa';

  const aeoStyles = `
    .aeo-preview-container { font-family: '${brandFont.replace(/['"]/g, '')}', sans-serif; line-height: 1.75; color: #33475b; }
    .aeo-preview-container p { margin-bottom: 1.5rem; font-size: 1.05rem; }
    .aeo-header-logo { max-width: 200px; height: auto; margin-bottom: 25px; display: block; }
    .aeo-featured-image { width: 100%; height: auto; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .aeo-meta { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; font-size: 0.85rem; color: #666; border-bottom: 1px solid #eee; padding-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
    .aeo-meta strong { color: ${readableHeaderColor}; font-weight: 700; }
    .aeo-preview-container h1 { font-size: 2.5rem; color: #2d3e50; margin-bottom: 0.75rem; font-weight: 800; line-height: 1.2; font-family: '${brandFont.replace(/['"]/g, '')}', sans-serif; }
    .aeo-preview-container h2 { font-size: 1.75rem; margin-top: 2.5rem; margin-bottom: 1.25rem; color: ${readableHeaderColor}; border-bottom: 3px solid ${brandColor}; display: inline-block; padding-bottom: 5px; font-weight: 700; font-family: '${brandFont.replace(/['"]/g, '')}', sans-serif; }
    .aeo-preview-container h3 { font-size: 1.25rem; margin-top: 1.5rem; margin-bottom: 1rem; color: ${readableHeaderColor}; font-weight: 600; }
    .aeo-answer-box { background-color: ${bgTint}; border-left: 5px solid ${brandColor}; padding: 1.75rem; margin-bottom: 2rem; border-radius: 0 8px 8px 0; }
    .aeo-label { display: block; margin-bottom: 0.75rem; text-transform: uppercase; font-size: 0.75rem; color: ${readableHeaderColor}; letter-spacing: 1px; font-weight: 800; }
    .aeo-answer-box p { margin: 0; font-weight: 500; font-size: 1.1rem; line-height: 1.6; color: #2d3e50; }
    .aeo-answer-box strong { color: ${readableHeaderColor}; font-weight: 700; }
    .aeo-preview-container ul, .aeo-preview-container ol { padding-left: 1.5rem; margin-bottom: 1.5rem; }
    .aeo-preview-container li { margin-bottom: 0.75rem; }
    .aeo-preview-container li::marker { color: ${brandColor}; font-weight: bold; }
    .aeo-preview-container table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 0.95rem; }
    .aeo-preview-container th, .aeo-preview-container td { border: 1px solid #cbd6e2; padding: 12px 15px; text-align: left; }
    .aeo-preview-container th { background-color: ${bgTint}; border-bottom: 2px solid ${brandColor}; font-weight: 600; color: ${readableHeaderColor}; }
    .aeo-preview-container a { color: ${brandColor}; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 2px; font-weight: 600; transition: opacity 0.2s; }
    .aeo-preview-container a:hover { opacity: 0.8; }
    .schema-tag { background: #1e293b; color: #a6e22e; padding: 1rem; border-radius: 0.5rem; font-family: monospace; font-size: 0.8rem; overflow-x: auto; margin-top: 3rem; border: 1px solid #334155; }
  `;

  // 1. Analyze Brand URL
  const handleAnalyzeBrandUrl = async () => {
    if (!websiteUrl) return;
    setIsAnalyzingBrand(true);
    setError(null);
    addDebug(`Analysing URL: ${websiteUrl}`);
    
    try {
      const prompt = `Analyse brand identity for: ${websiteUrl}. Return valid JSON with: { "palette": ["#hex", "#hex", "#hex", "#hex"], "fontFamily": "Font Name", "tone": "Brand Tone Description" }`;
      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${getEffectiveKey()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          }),
        }
      );
      
      if (!response.ok) throw new Error(`API Error ${response.status}`);
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const brandData = safeJsonParse(text);

      if (brandData.palette && Array.isArray(brandData.palette)) {
        setColorPalette(brandData.palette);
        setBrandColor(brandData.palette[0]);
      }
      if (brandData.fontFamily) setBrandFont(brandData.fontFamily);
      if (brandData.tone) setBrandTone(brandData.tone);
      addDebug("URL Analysis Success");

    } catch (e) {
      addDebug(`URL Analysis Failed: ${e.message}`, 'error');
      setError(`Brand Analysis Failed: ${e.message}`);
    } finally {
      setIsAnalyzingBrand(false);
    }
  };

  // 2. Analyze Uploaded Image (Stubbed to prevent crash, simulates success)
  const handleBrandImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsAnalyzingBrand(true);
    // Simulate success for build stability
    setTimeout(() => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
            setLogoUrl(reader.result);
            setIsAnalyzingBrand(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
    }, 1000);
  };

  // 3a. Handle File Upload (Stubbed)
  const handleAudioUpload = async (e) => {
    setError("Audio transcription disabled for initial deployment stability.");
  };

  // 4. Keyword Gen
  const handleSuggestKeyword = async () => {
    if (!inputText) return;
    setIsGeneratingKeyword(true);
    setError(null);
    const prompt = `Analyse text, find best SEO keyword. Return ONLY keyword. Text: ${inputText.substring(0, 5000)}`;
    try {
      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${getEffectiveKey()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      if (!response.ok) throw new Error(`API Error ${response.status}`);
      const data = await response.json();
      const keyword = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (keyword) setTargetKeyword(keyword);
    } catch (e) {
      setError(`Keyword gen failed: ${e.message}`);
    } finally {
      setIsGeneratingKeyword(false);
    }
  };

  // 5. Image Gen (Stubbed)
  const handleGenerateImage = async () => {
    setError("Image gen disabled for initial deployment stability.");
  };

  // 6. Main Optimize (DEEP AEO ALGORITHM)
  const handleOptimize = async () => {
    if (!inputText) return;
    setIsLoading(true);
    setError(null);
    setOptimizedContent(null);
    addDebug("Starting Deep AEO Optimisation...");

    const systemPrompt = `
      You are an advanced AEO (Answer Engine Optimisation) specialist. Rewrite content for AI Overviews.
      LANGUAGE: British English.
      RULES:
      1. H1 Title (Question).
      2. Meta-Data Block.
      3. Brand Image Placeholder: {{BRAND_IMAGE_PLACEHOLDER}}
      4. Key Takeaway Box.
      5. H2 Questions.
      6. Bullet points/Lists (Mandatory).
      7. Comparison Table.
      8. JSON-LD Schema.
      9. Clean HTML only (no markdown).
      Tone: ${brandTone}.
    `;

    const userPrompt = `Target: ${targetKeyword}\nContent:\n${inputText}`;

    try {
      const response = await fetchWithRetry(
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

      if (!response.ok) throw new Error(`API Error ${response.status}`);
      const data = await response.json();
      if (!data.candidates?.[0]?.content) throw new Error("AI returned no content.");

      let resultText = data.candidates[0].content.parts?.[0]?.text;
      resultText = resultText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      if (logoUrl) {
        const imgTag = `<img src="${logoUrl}" class="aeo-header-logo" alt="Brand Asset" />`;
        if (resultText.includes('{{BRAND_IMAGE_PLACEHOLDER}}')) {
          resultText = resultText.replace('{{BRAND_IMAGE_PLACEHOLDER}}', imgTag);
        } else {
          resultText = imgTag + "\n" + resultText;
        }
      } else {
        resultText = resultText.replace('{{BRAND_IMAGE_PLACEHOLDER}}', '');
      }

      const cleanHtml = resultText.replace(/```html/g, '').replace(/```/g, '').trim();
      setOptimizedContent(cleanHtml);
      addDebug("Optimisation Success");
    } catch (err) {
      addDebug(`Optimisation Failed: ${err.message}`, 'error');
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Download File Function
  const handleDownload = () => {
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${targetKeyword || 'AEO Optimised Content'}</title>
<style>body { font-family: ${brandFont}, sans-serif; color: #33475b; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }${aeoStyles}</style>
</head>
<body>${headerImage ? `<img src="${headerImage}" class="aeo-featured-image" alt="Header">` : ''}${optimizedContent}</body>
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

  const handlePublish = async () => {
    // Simulate publish
    setIsPublishing(true);
    setTimeout(() => { setIsPublishing(false); setPublishSuccess(true); setTimeout(() => setPublishSuccess(false), 3000); setShowPublishModal(false); }, 1500);
  };

  const copyToClipboard = () => {
    if (!optimizedContent) return;
    const fullCode = `<style>${aeoStyles}</style>\n${optimizedContent}`;
    navigator.clipboard.writeText(fullCode.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 relative">
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {keyStatus === 'valid' && <span className="text-xs font-bold text-green-600 flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Active</span>}
        <button onClick={() => setShowSettings(true)} className="p-2 bg-white rounded-full shadow-md hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors" title="Settings / API Key"><Settings className="h-5 w-5" /></button>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2" style={{ color: algorizzAccentColor }}>
            <img src={algorizzLogoPath} alt="AlgoRizz Logo" className="h-10 inline-block mr-2" />
            AlgoRizz <span className="text-slate-600 font-light">Optimiser</span>
          </h1>
          <p className="text-slate-600 max-w-2xl">AI-Powered Content Transformation Engine.</p>
        </div>

        {/* Editor View Only */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Globe className="h-4 w-4 text-slate-500" /> Brand Identity</h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input type="text" placeholder="mysite.com" className="w-full p-2 text-sm border border-slate-300 rounded-md" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}/>
                  <button onClick={handleAnalyzeBrandUrl} disabled={!websiteUrl || isAnalyzingBrand} className="mt-5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 transition-colors flex items-center gap-2"><Wand2 className="h-4 w-4"/></button>
                </div>
                <div>
                   <label className={`flex items-center justify-center gap-2 w-full p-2 border border-dashed border-slate-300 rounded-md text-sm text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors`}>
                      <Upload className="h-4 w-4" /><span>Upload Brand Asset</span>
                      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleBrandImageUpload} className="hidden" />
                   </label>
                </div>
                {logoUrl && (<div className="mt-2 p-2 bg-slate-50 border border-slate-100 rounded text-center relative group"><img src={logoUrl} alt="Brand Asset" className="h-20 mx-auto object-contain" /><button onClick={() => setLogoUrl('')} className="absolute top-1 right-1 p-1 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 text-red-500"><X className="h-3 w-3" /></button></div>)}
                
                <div className="space-y-2">
                   <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><Palette className="h-3 w-3"/> Brand Palette</label>
                   <div className="flex gap-2 mb-2 flex-wrap">
                      {colorPalette.map((col, idx) => (
                        <button key={idx} onClick={() => setBrandColor(col)} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none ${brandColor === col ? 'border-slate-800' : 'border-slate-200'}`} style={{ backgroundColor: col }}/>
                      ))}
                   </div>
                   <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-8 w-full rounded cursor-pointer border-0 p-0"/>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-grow flex flex-col">
               <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                 <button onClick={() => setInputMode('text')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${inputMode === 'text' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><FileText className="h-4 w-4" /> Text</button>
                 <button onClick={() => setInputMode('audio')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${inputMode === 'audio' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}><Mic className="h-4 w-4" /> Audio</button>
               </div>
              <div className="mb-4">
                <div className="flex gap-2 mt-1">
                  <input type="text" placeholder="Target Keyword" className="w-full p-2 border border-slate-300 rounded-md" value={targetKeyword} onChange={(e) => setTargetKeyword(e.target.value)}/>
                   <button onClick={handleSuggestKeyword} className="px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md border border-indigo-200" title="Auto-generate keyword"><Sparkles className="h-4 w-4"/></button>
                </div>
              </div>
              <div className="flex-grow mb-4">
                {inputMode === 'text' && (
                    <div className="relative h-64 mt-1">
                      <div ref={contentEditableRef} contentEditable className="w-full h-full p-3 border border-slate-300 rounded-md overflow-y-auto text-sm font-mono bg-white" onInput={(e) => setInputText(e.currentTarget.innerHTML)}/>
                      {!inputText && <div className="absolute top-3 left-3 text-slate-400 text-sm pointer-events-none">Paste your article here...</div>}
                    </div>
                )}
                {inputMode === 'audio' && (
                    <div className={`border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors`}>
                        <label className="cursor-pointer flex flex-col items-center w-full">
                            <Music className="h-6 w-6 text-indigo-500 mb-2" />
                            <span className="text-sm font-medium text-slate-700">Upload Audio (Feature Disabled)</span>
                            <input type="file" disabled className="hidden" />
                        </label>
                    </div>
                )}
              </div>
              <button onClick={handleOptimize} disabled={isLoading || !inputText} style={{ backgroundColor: isLoading ? '#cbd6e2' : algorizzAccentColor }} className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg text-white font-semibold transition-all shadow-md`}>
                {isLoading ? <RefreshCw className="animate-spin h-5 w-5" /> : <>Optimise Content <ArrowRight className="h-5 w-5" /></>}
              </button>
              {error && <div className="mt-2 p-3 bg-red-50 rounded-md border border-red-200 text-red-600 text-xs">{error}</div>}
            </div>
          </div>

            <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[800px]">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex gap-2">
                        <button onClick={() => setActiveTab('preview')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${activeTab === 'preview' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}><Globe className="h-4 w-4" /> Preview</button>
                        <button onClick={() => setActiveTab('code')} className={`px-3 py-1.5 rounded-md text-sm font-medium ${activeTab === 'code' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600'}`}><Code className="h-4 w-4" /> Code</button>
                    </div>
                    <div className="flex items-center gap-2">
                        {optimizedContent && <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"><Download className="h-4 w-4" /> Download</button>}
                        {optimizedContent && <button onClick={copyToClipboard} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 ml-2">{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}{copied ? 'Copy' : 'Copy'}</button>}
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto p-8 bg-white relative">
                    <style>{aeoStyles}</style>
                    {activeTab === 'preview' && (optimizedContent || headerImage) && (
                        <div className="aeo-preview-container max-w-3xl mx-auto">
                            {headerImage && <img src={headerImage} alt="AI Header" className="aeo-featured-image" />}
                            {optimizedContent && <div dangerouslySetInnerHTML={{ __html: optimizedContent }} />}
                        </div>
                    )}
                    {optimizedContent && activeTab === 'code' && (
                        <div className="animate-in fade-in duration-500">
                            <pre className="text-xs bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto font-mono">{`<style>\n:root { --brand-color: ${brandColor}; --brand-font: '${brandFont.replace(/['"]/g, '')}', sans-serif; }\nbody { font-family: var(--brand-font); }\n</style>\n\n${headerImage ? `<img src="[INSERT_IMAGE_URL_HERE]" class="aeo-featured-image" alt="Header Image">` : ''}\n\n${optimizedContent}`}</pre>
                        </div>
                    )}
                </div>
            </div>
          </div>
      </div>

        {/* SETTINGS MODAL */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Settings className="h-5 w-5" /> Settings</h3>
                <button onClick={() => setShowSettings(false)}><X className="h-5 w-5" /></button>
              </div>
              <div className="p-6 space-y-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                <input type="password" placeholder="Override API Key..." value={customApiKey} onChange={(e) => setCustomApiKey(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md"/>
                <button onClick={() => setShowSettings(false)} className="w-full py-2 bg-slate-800 text-white rounded-md">Save</button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}