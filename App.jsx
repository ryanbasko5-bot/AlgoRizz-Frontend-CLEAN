import React, { useState, useEffect, useRef } from 'react';
import { Copy, RefreshCw, ArrowRight, Code, FileText, Check, AlertCircle, Palette, Globe, ImageIcon, Wand2, Sparkles, Type, Image as LucideImage, UploadCloud, X, Lock, Mic, Music, Upload, Settings, Activity, ShieldCheck, ShieldAlert, Terminal, Download, BrainCircuit, Link as LinkIcon, Library, Search, Save, Trash2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import LoginPage from './src/components/LoginPage';


// --- FIREBASE CONFIGURATION ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'algorizz-app';


const defaultApiKey = import.meta.env.VITE_GOOGLE_API_KEY || "";
const algorizzAccentColor = "#FF1493"; // Hot pink from logo
const algorizzSecondaryColor = "#00E5FF"; // Cyan from logo
const algorizzYellowColor = "#FFFF00"; // Yellow accent from logo
const algorizzLogoPath = "/logo.png";
const corsProxy = "https://api.allorigins.win/raw?url="; // CORS proxy


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


// Helper: Resize Image for API
const resizeImage = (file) => {
 return new Promise((resolve, reject) => {
   const reader = new FileReader();
   reader.onload = (e) => {
     const img = new Image();
     img.onload = () => {
       const canvas = document.createElement('canvas');
       const MAX_WIDTH = 800;
       const scaleSize = MAX_WIDTH / img.width;
       canvas.width = MAX_WIDTH;
       canvas.height = img.height * scaleSize;
       const ctx = canvas.getContext('2d');
       ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
       const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
       resolve(dataUrl);
     };
     img.onerror = reject;
     img.src = e.target.result;
   };
   reader.onerror = reject;
   reader.readAsDataURL(file);
 });
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
 // Auth & Login State
 const [isAuthenticated, setIsAuthenticated] = useState(false);
 const [isCheckingAuth, setIsCheckingAuth] = useState(true);
 const [user, setUser] = useState(null);
 const [isAuthReady, setIsAuthReady] = useState(false);
 const [view, setView] = useState('editor'); // 'editor' | 'library'
  // API Configuration
 const [customApiKey, setCustomApiKey] = useState('');
 const [showSettings, setShowSettings] = useState(false);
 const [keyStatus, setKeyStatus] = useState('checking');
 const [debugLog, setDebugLog] = useState([]);
 const [showSidebar, setShowSidebar] = useState(false);
 const [customLogo, setCustomLogo] = useState(localStorage.getItem('algorizz_customLogo') || '');
 const [appBackgroundColor, setAppBackgroundColor] = useState('#1a0b2e');


 // Content State
 const [inputText, setInputText] = useState('');
 const [targetKeyword, setTargetKeyword] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [isGeneratingKeyword, setIsGeneratingKeyword] = useState(false);
 const [isGeneratingImage, setIsGeneratingImage] = useState(false);
 const [isTranscribing, setIsTranscribing] = useState(false);
 const [isScraping, setIsScraping] = useState(false);
 const [transcriptionStatus, setTranscriptionStatus] = useState(''); // New detailed status
 const [optimizedContent, setOptimizedContent] = useState(null);
 const [error, setError] = useState(null);
 const [activeTab, setActiveTab] = useState('preview');
 const [inputMode, setInputMode] = useState('text');
 const [blogUrl, setBlogUrl] = useState('');
 const [copied, setCopied] = useState(false);
 const [timeLeft, setTimeLeft] = useState(0);
 const [totalEstTime, setTotalEstTime] = useState(0);


 // Library State
 const [savedPosts, setSavedPosts] = useState([]);
 const [isSaving, setIsSaving] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');


 // Brand State
 const [websiteUrl, setWebsiteUrl] = useState('');
 const [isAnalyzingBrand, setIsAnalyzingBrand] = useState(false);
 const [analysisStep, setAnalysisStep] = useState('');
 const [brandColor, setBrandColor] = useState(localStorage.getItem('algorizz_brandColor') || '#FF1493');
 const [colorPalette, setColorPalette] = useState(JSON.parse(localStorage.getItem('algorizz_colorPalette') || '["#FF1493", "#00E5FF", "#FFFF00", "#FF10F0"]'));
 const [brandFont, setBrandFont] = useState(localStorage.getItem('algorizz_brandFont') || 'Helvetica Neue');
 const [logoUrl, setLogoUrl] = useState(''); // Defaulted to empty string for generated content
 const [brandTone, setBrandTone] = useState(localStorage.getItem('algorizz_brandTone') || 'Professional and Direct');
 const [savedBrandVoice, setSavedBrandVoice] = useState(localStorage.getItem('algorizz_brandVoice') || '');
 const [websiteStyleGuide, setWebsiteStyleGuide] = useState('');
 const [websiteCssStyles, setWebsiteCssStyles] = useState('');
 const [isScanningStyle, setIsScanningStyle] = useState(false);
 const [headerImage, setHeaderImage] = useState(null);
 const [showExtras, setShowExtras] = useState(false);
 const fileInputRef = useRef(null);
 const logoUploadRef = useRef(null);
 const contentEditableRef = useRef(null);


 // Publish Integration State
 const [showPublishModal, setShowPublishModal] = useState(false);
 const [cmsType, setCmsType] = useState('hubspot');
 const [hubspotApiKey, setHubspotApiKey] = useState('');
 const [hubspotPortalId, setHubspotPortalId] = useState('');
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
   addDebug("Checking API Key Health...");
   try {
     const response = await fetch(
       `https://generativelanguage.googleapis.com/v1beta/models?key=${getEffectiveKey()}`
     );
     if (response.ok) {
       setKeyStatus('valid');
       addDebug("API Key Validated");
     } else {
       setKeyStatus('invalid');
       const err = await response.json();
       addDebug(`API Key Error: ${response.status} - ${JSON.stringify(err)}`, 'error');
       if (response.status === 401) {
          setError("System API Key is being rejected (401). Please check settings.");
       }
     }
   } catch (e) {
     setKeyStatus('invalid');
     addDebug(`Health Check Failed: ${e.message}`, 'error');
   }
 };


 // --- CHECK AUTH STATUS ON MOUNT ---
 useEffect(() => {
   const authStatus = localStorage.getItem('algorizz_authenticated');
   const userEmail = localStorage.getItem('algorizz_user');
   if (authStatus === 'true' && userEmail) {
     setIsAuthenticated(true);
   }
   setIsCheckingAuth(false);
 }, []);

 // --- FIREBASE AUTH & DATA ---
 useEffect(() => {
   if (!auth) {
       addDebug("Firebase Auth not initialized (Config Missing). Library disabled.", 'error');
       setIsAuthReady(true);
       return;
   }


   const initAuth = async () => {
     if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        // Custom token sign-in logic (omitted for brevity)
     } else {
       await signInAnonymously(auth).catch(e => {
           console.error("Anon sign-in failed:", e);
           addDebug(`Anon sign-in failed: ${e.message}`, 'error');
       });
     }
   };
   initAuth();


   const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
     setUser(currentUser);
     setIsAuthReady(true);
   });
  
   return () => unsubscribe();
 }, []);


 useEffect(() => {
   if (!db || !user || !isAuthReady) {
       if (!db) addDebug("Firebase DB not initialized. Cannot load Library.", 'error');
       return;
   }
  
   const q = query(
       collection(db, 'artifacts', appId, 'users', user.uid, 'algorizz_posts'),
       orderBy('createdAt', 'desc')
   );
  
   const unsubscribe = onSnapshot(q, (snapshot) => {
     const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
     setSavedPosts(posts);
   }, (err) => {
       console.error("Firestore Error:", err);
       addDebug(`Firestore Sync Error: ${err.message}`, 'error');
   });


   return () => unsubscribe();
 }, [user, isAuthReady]);




 // --- SAVE TO LIBRARY LOGIC ---
 const handleSaveToLibrary = async () => {
   if (!optimizedContent || !user || !db) {
       setError("Cannot save: Content is empty or database is inaccessible.");
       return;
   }
   setIsSaving(true);
   setError(null);
   addDebug("Saving to Library...");


   try {
       // 1. Generate Metadata using AI
       const metaPrompt = `
           Analyse this HTML blog post content using British English spelling.
           Return a valid JSON object with:
           1. "title": A catchy title for the post (based on H1).
           2. "category": A single word category (e.g. Strategy, Technical, News, Opinion).
           3. "tags": An array of 3-4 short, British-spelled tags.
           4. "summary": A 1-sentence summary of the content.


           Content:
           ${optimizedContent.substring(0, 3000)}
       `;


       const response = await fetchWithRetry(
           `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${getEffectiveKey()}`,
           {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                   contents: [{ parts: [{ text: metaPrompt }] }],
               }),
           }
       );
      
       if (!response.ok) throw new Error(`Metadata API Error ${response.status}`);


       const data = await response.json();
       const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
       const metadata = safeJsonParse(text);


       // 2. Save to Firestore
       await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'algorizz_posts'), {
           content: optimizedContent,
           rawInput: inputText,
           targetKeyword,
           brandColor,
           brandFont,
           logoUrl,
           headerImage,
           title: metadata.title || targetKeyword,
           category: metadata.category || 'General',
           tags: metadata.tags || [],
           summary: metadata.summary || 'Awaiting AI summary.',
           createdAt: serverTimestamp()
       });
      
       addDebug("Saved successfully!");
       setView('library');


   } catch (err) {
       addDebug(`Save Failed: ${err.message}`, 'error');
       setError("Failed to save to library. Check debug log.");
   } finally {
       setIsSaving(false);
   }
 };


 const handleDeletePost = async (postId, e) => {
     e.stopPropagation();
     if (!db || !user) return;
    
     // Using a custom confirmation instead of browser alert/confirm
     const confirmed = window.confirm("Are you sure you want to delete this post? This cannot be undone.");


     if (confirmed) {
       try {
           await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'algorizz_posts', postId));
       } catch (err) {
           console.error("Delete Error:", err);
           addDebug(`Delete Failed: ${err.message}`, 'error');
       }
     }
 };


 const handleLoadPost = (post) => {
     // Load post data
     setTargetKeyword(post.targetKeyword);
     setOptimizedContent(post.content);
     setBrandColor(post.brandColor);
     setBrandFont(post.brandFont);
     setLogoUrl(post.logoUrl);
     setHeaderImage(post.headerImage);


     // Set the input text state
     setInputText(post.rawInput);
     setView('editor');
 };


 // FIX: Separate useEffect to handle updating the contentEditable div after state update
 useEffect(() => {
   if (view === 'editor' && inputText && contentEditableRef.current) {
       // Only update innerHTML if it doesn't match current state to avoid cursor jump
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
   checkKeyHealth();
 }, [customApiKey]);

 // Persist brand settings to localStorage
 useEffect(() => {
   localStorage.setItem('algorizz_brandColor', brandColor);
   localStorage.setItem('algorizz_colorPalette', JSON.stringify(colorPalette));
   localStorage.setItem('algorizz_brandFont', brandFont);
   localStorage.setItem('algorizz_brandTone', brandTone);
   if (savedBrandVoice) localStorage.setItem('algorizz_brandVoice', savedBrandVoice);
 }, [brandColor, colorPalette, brandFont, brandTone, savedBrandVoice]);


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
   .aeo-preview-container {
     font-family: '${brandFont.replace(/['"]/g, '')}', sans-serif;
     line-height: 1.75;
     color: #33475b;
   }
   .aeo-preview-container p {
     margin-bottom: 1.5rem;
     font-size: 1.05rem;
   }
   .aeo-header-logo {
     max-width: 200px;
     height: auto;
     margin-bottom: 25px;
     display: block;
   }
   .aeo-featured-image {
     width: 100%;
     height: auto;
     border-radius: 8px;
     margin-bottom: 30px;
     box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
   }
   .aeo-meta {
     display: flex;
     align-items: center;
     gap: 20px;
     margin-bottom: 30px;
     font-size: 0.85rem;
     color: #666;
     border-bottom: 1px solid #eee;
     padding-bottom: 20px;
     text-transform: uppercase;
     letter-spacing: 0.5px;
   }
   .aeo-meta strong {
     color: ${readableHeaderColor};
     font-weight: 700;
   }
   .aeo-preview-container h1 {
     font-size: 2.5rem;
     color: #2d3e50;
     margin-bottom: 0.75rem;
     font-weight: 800;
     line-height: 1.2;
     font-family: '${brandFont.replace(/['"]/g, '')}', sans-serif;
   }
   .aeo-preview-container h2 {
     font-size: 1.75rem;
     margin-top: 2.5rem;
     margin-bottom: 1.25rem;
     color: ${readableHeaderColor};
     border-bottom: 3px solid ${brandColor};
     display: inline-block;
     padding-bottom: 5px;
     font-weight: 700;
     font-family: '${brandFont.replace(/['"]/g, '')}', sans-serif;
   }
   .aeo-preview-container h3 {
     font-size: 1.25rem;
     margin-top: 1.5rem;
     margin-bottom: 1rem;
     color: ${readableHeaderColor};
     font-weight: 600;
   }
  
   /* AEO BOX STYLES */
   .aeo-answer-box {
     background-color: ${bgTint};
     border-left: 5px solid ${brandColor};
     padding: 1.75rem;
     margin-bottom: 2rem;
     border-radius: 0 8px 8px 0;
   }
   .aeo-label {
     display: block;
     margin-bottom: 0.75rem;
     text-transform: uppercase;
     font-size: 0.75rem;
     color: ${readableHeaderColor};
     letter-spacing: 1px;
     font-weight: 800;
   }
   .aeo-answer-box p {
     margin: 0;
     font-weight: 500;
     font-size: 1.1rem;
     line-height: 1.6;
     color: #2d3e50;
   }
   .aeo-answer-box strong {
     color: ${readableHeaderColor};
     font-weight: 700;
   }


   .aeo-preview-container ul, .aeo-preview-container ol {
     padding-left: 1.5rem;
     margin-bottom: 1.5rem;
   }
   .aeo-preview-container li {
     margin-bottom: 0.75rem;
   }
   .aeo-preview-container li::marker {
     color: ${brandColor};
     font-weight: bold;
   }
   .aeo-preview-container table {
     width: 100%;
     border-collapse: collapse;
     margin-bottom: 1.5rem;
     font-size: 0.95rem;
   }
   .aeo-preview-container th, .aeo-preview-container td {
     border: 1px solid #cbd6e2;
     padding: 12px 15px;
     text-align: left;
   }
   .aeo-preview-container th {
     background-color: ${bgTint};
     border-bottom: 2px solid ${brandColor};
     font-weight: 600;
     color: ${readableHeaderColor};
   }
   /* Link Styles for AEO */
   .aeo-preview-container a {
     color: ${brandColor};
     text-decoration: underline;
     text-decoration-thickness: 2px;
     text-underline-offset: 2px;
     font-weight: 600;
     transition: opacity 0.2s;
   }
   .aeo-preview-container a:hover {
     opacity: 0.8;
   }
   .schema-tag {
     background: #1e293b;
     color: #a6e22e;
     padding: 1rem;
     border-radius: 0.5rem;
     font-family: monospace;
     font-size: 0.8rem;
     overflow-x: auto;
     margin-top: 3rem;
     border: 1px solid #334155;
   }
 `;


 // Scan Website for Style Matching
 const handleScanWebsiteStyle = async () => {
   if (!websiteUrl) return;
   setIsScanningStyle(true);
   setError(null);
   addDebug(`Scanning website structure & styles: ${websiteUrl}`);

   try {
     // Use CORS proxy to bypass restrictions
     const targetUrl = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
     const proxiedUrl = corsProxy + encodeURIComponent(targetUrl);
     const response = await fetchWithRetry(proxiedUrl, { method: 'GET' });
     if (!response.ok) throw new Error(`Failed to fetch URL (${response.status})`);

     const html = await response.text();
     const parser = new DOMParser();
     const doc = parser.parseFromString(html, 'text/html');

     // Extract CSS styles from the page
     const styleElements = doc.querySelectorAll('style');
     let extractedCss = '';
     styleElements.forEach(style => {
       extractedCss += style.textContent + '\n';
     });

     // Extract inline styles and class names from article/blog content
     const articleElements = doc.querySelectorAll('article, .post, .blog-post, [class*="content"], main');
     const htmlStructure = [];
     const contentSamples = [];
     
     articleElements.forEach((el, idx) => {
       if (idx < 3 && el.textContent.length > 200) {
         contentSamples.push(el.textContent.substring(0, 500));
         // Capture HTML structure (headings, paragraphs, lists)
         const structure = {
           headings: Array.from(el.querySelectorAll('h1, h2, h3, h4')).map(h => h.tagName.toLowerCase()),
           paragraphCount: el.querySelectorAll('p').length,
           hasLists: el.querySelectorAll('ul, ol').length > 0,
           classes: el.className
         };
         htmlStructure.push(structure);
       }
     });

     // Store the extracted CSS
     setWebsiteCssStyles(extractedCss);
     addDebug(`Extracted ${extractedCss.length} characters of CSS`);

     const sampleText = contentSamples.join('\n\n');

     // Analyze writing style and structure with AI
     const stylePrompt = `
       Analyze the writing style and HTML structure of this website content.
       Return valid JSON with:
       {
         "tone": "describe the tone (e.g., conversational, formal, technical)",
         "sentenceStructure": "describe sentence length and complexity",
         "vocabulary": "describe vocabulary level and technical terms usage",
         "formatting": "describe paragraph structure, use of headings, lists",
         "voicePattern": "describe narrative voice (first person, third person, etc.)",
         "htmlStructure": "describe HTML patterns: heading hierarchy, paragraph length, use of lists, etc."
       }

       HTML Structure Detected: ${JSON.stringify(htmlStructure)}
       
       Content samples:
       ${sampleText}
     `;

     const aiResponse = await fetchWithRetry(
       `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${getEffectiveKey()}`,
       {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           contents: [{ parts: [{ text: stylePrompt }] }],
         }),
       }
     );

     if (!aiResponse.ok) throw new Error(`Style Analysis Error ${aiResponse.status}`);

     const data = await aiResponse.json();
     const styleData = safeJsonParse(data.candidates?.[0]?.content?.parts?.[0]?.text);
     
     const styleGuide = `Tone: ${styleData.tone}. Sentence Structure: ${styleData.sentenceStructure}. Vocabulary: ${styleData.vocabulary}. Formatting: ${styleData.formatting}. Voice: ${styleData.voicePattern}. HTML Structure: ${styleData.htmlStructure || 'Standard blog format'}.`;
     setWebsiteStyleGuide(styleGuide);
     addDebug(`Website style & CSS captured (${extractedCss.length} chars)`);

   } catch (err) {
     addDebug(`Style Scan Failed: ${err.message}`, 'error');
     setError(`Could not scan website style: ${err.message}`);
   } finally {
     setIsScanningStyle(false);
   }
 };

 // Handle Custom Logo Upload
 const handleLogoUpload = (e) => {
   const file = e.target.files[0];
   if (!file) return;
   const reader = new FileReader();
   reader.onload = (event) => {
     const logoDataUrl = event.target.result;
     setCustomLogo(logoDataUrl);
     localStorage.setItem('algorizz_customLogo', logoDataUrl);
     
     // Extract dominant colors from logo
     const img = new Image();
     img.onload = () => {
       const canvas = document.createElement('canvas');
       const maxSize = 150; // Resize for faster processing
       const scale = Math.min(maxSize / img.width, maxSize / img.height);
       canvas.width = img.width * scale;
       canvas.height = img.height * scale;
       const ctx = canvas.getContext('2d');
       ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
       
       const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
       const pixels = imageData.data;
       const colorMap = {};
       
       // Count color frequency (skip near-white and transparent pixels)
       for (let i = 0; i < pixels.length; i += 4) {
         const r = pixels[i];
         const g = pixels[i + 1];
         const b = pixels[i + 2];
         const a = pixels[i + 3];
         
         // Skip transparent and very light colors (likely background)
         if (a < 50 || (r > 240 && g > 240 && b > 240)) continue;
         
         // Round colors to reduce similar shades
         const rr = Math.round(r / 10) * 10;
         const gg = Math.round(g / 10) * 10;
         const bb = Math.round(b / 10) * 10;
         const key = `${rr},${gg},${bb}`;
         
         colorMap[key] = (colorMap[key] || 0) + 1;
       }
       
       // Find top colors
       const sortedColors = Object.entries(colorMap)
         .sort((a, b) => b[1] - a[1])
         .slice(0, 4)
         .map(([color]) => {
           const [r, g, b] = color.split(',').map(Number);
           return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
         });
       
       if (sortedColors.length > 0) {
         setColorPalette(sortedColors);
         setBrandColor(sortedColors[0]);
         addDebug(`Logo colors extracted: ${sortedColors.join(', ')}`);
       }
       
       // Detect background from edges (for app background)
       const edgePixels = [];
       for (let x = 0; x < canvas.width; x++) {
         edgePixels.push(ctx.getImageData(x, 0, 1, 1).data); // Top edge
         edgePixels.push(ctx.getImageData(x, canvas.height - 1, 1, 1).data); // Bottom edge
       }
       for (let y = 0; y < canvas.height; y++) {
         edgePixels.push(ctx.getImageData(0, y, 1, 1).data); // Left edge
         edgePixels.push(ctx.getImageData(canvas.width - 1, y, 1, 1).data); // Right edge
       }
       
       // Average edge colors
       const avgR = Math.round(edgePixels.reduce((sum, c) => sum + c[0], 0) / edgePixels.length);
       const avgG = Math.round(edgePixels.reduce((sum, c) => sum + c[1], 0) / edgePixels.length);
       const avgB = Math.round(edgePixels.reduce((sum, c) => sum + c[2], 0) / edgePixels.length);
       
       const detectedBg = `rgb(${avgR}, ${avgG}, ${avgB})`;
       setAppBackgroundColor(detectedBg);
       addDebug(`Logo background detected: ${detectedBg}`);
     };
     img.src = logoDataUrl;
   };
   reader.readAsDataURL(file);
 };

 // 1. Analyze Brand URL
 const handleAnalyzeBrandUrl = async () => {
   if (!websiteUrl) return;
   setIsAnalyzingBrand(true);
   setError(null);
   setAnalysisStep('Fetching brand logo...');
   addDebug(`Analysing URL: ${websiteUrl}`);
  
   try {
     const domain = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`).hostname;
     const cleanDomain = domain.replace('www.', '');
     setLogoUrl(`https://logo.clearbit.com/${cleanDomain}`);


     setAnalysisStep('Extracting brand colours...');
     const prompt = `
       Analyse brand identity for: ${websiteUrl}.
       Return valid JSON with:
       {
         "palette": ["#hex", "#hex", "#hex", "#hex"],
         "fontFamily": "Font Name",
         "tone": "Brand Tone Description"
       }
     `;


     const response = await fetchWithRetry(
       `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${getEffectiveKey()}`,
       {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           contents: [{ parts: [{ text: prompt }] }],
         }),
       }
     );
    
     if (!response.ok) {
       const errData = await response.json().catch(() => ({}));
       throw new Error(errData.error?.message || `API Error ${response.status}`);
     }


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
     
     setAnalysisStep('Scanning website style...');
     // Auto-scan writing style
     await handleScanWebsiteStyle();


   } catch (e) {
     addDebug(`URL Analysis Failed: ${e.message}`, 'error');
     setError(`Brand Analysis Failed: ${e.message}`);
   } finally {
     setIsAnalyzingBrand(false);
     setAnalysisStep('');
   }
 };


 // 2. Analyze Uploaded Image
 const handleBrandImageUpload = async (e) => {
   const file = e.target.files[0];
   if (!file) return;


   setIsAnalyzingBrand(true);
   setError(null);
   setAnalysisStep('Processing image...');
   // Image upload is fast due to resize, set strict 12s estimate
   setTimeLeft(12);
   setTotalEstTime(12);
   addDebug(`Analysing Image: ${file.name} (${(file.size/1024).toFixed(1)}KB)`);
  
   try {
     addDebug("Resizing image...");
     const resizedDataUrl = await resizeImage(file);
     setLogoUrl(resizedDataUrl);
     const base64Data = resizedDataUrl.split(',')[1];


     setAnalysisStep('Extracting brand colours...');
     const prompt = `
       Analyse this brand image. Return valid JSON:
       {
         "palette": ["#dominant", "#secondary", "#accent"],
         "tone": "Visual Tone",
         "fontFamily": "Estimated Font"
       }
     `;


     addDebug("Sending to Gemini...");
     const response = await fetchWithRetry(
       `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${getEffectiveKey()}`,
       {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           contents: [{
             role: "user",
             parts: [
               { text: prompt },
               { inlineData: { mimeType: "image/jpeg", data: base64Data } }
             ]
           }],
         }),
       }
     );
    
     if (!response.ok) throw new Error(`API Error ${response.status}`);


     const data = await response.json();
     const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
     addDebug("Parsing response...");
     const brandData = safeJsonParse(text);


     if (brandData.palette && Array.isArray(brandData.palette)) {
        setColorPalette(brandData.palette);
        setBrandColor(brandData.palette[0]);
     }
     if (brandData.fontFamily) setBrandFont(brandData.fontFamily);
     if (brandData.tone) setBrandTone(brandData.tone);
     addDebug("Image Analysis Success");


   } catch (err) {
     addDebug(`Image Analysis Failed: ${err.message}`, 'error');
     setError(`Image Analysis Failed: ${err.message}`);
   } finally {
     setIsAnalyzingBrand(false);
     setAnalysisStep('');
     if (fileInputRef.current) fileInputRef.current.value = '';
   }
 };


 // 3. Common Transcription Logic
 const transcribeAudioData = async (base64Audio, mimeType, durationEstimate) => {
     setIsTranscribing(true);
     setError(null);
     setTimeLeft(durationEstimate);
     setTotalEstTime(durationEstimate);
     setTranscriptionStatus('Sending audio to AI...');


     const prompt = "Transcribe this audio file accurately using British English spelling. Return only the transcript text.";


     try {
       const response = await fetchWithRetry(
         `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${getEffectiveKey()}`,
         {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             contents: [{
               role: "user",
               parts: [
                 { text: prompt },
                 { inlineData: { mimeType: mimeType, data: base64Audio } }
               ]
             }]
           }),
         }
       );


       if (!response.ok) throw new Error(`API Error ${response.status}`);


       const data = await response.json();
       const transcript = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
       if (transcript) {
         setInputText(transcript);
         setInputMode('text');
         if(contentEditableRef.current) {
           contentEditableRef.current.innerHTML = transcript;
         }
         addDebug("Transcription Success");
       } else {
         throw new Error("No transcript generated.");
       }


     } catch (err) {
       addDebug(`Transcription Failed: ${err.message}`, 'error');
       setError(`Transcription failed: ${err.message}`);
     } finally {
       setIsTranscribing(false);
       setTranscriptionStatus('');
     }
 };


 // 3. Handle Blog URL Scraping
 const handleScrapeBlogUrl = async () => {
   if (!blogUrl) return;
   setIsScraping(true);
   setError(null);
   addDebug(`Scraping blog post from: ${blogUrl}`);

   try {
     // Use CORS proxy to bypass restrictions
     const proxiedUrl = corsProxy + encodeURIComponent(blogUrl);
     const response = await fetchWithRetry(proxiedUrl, { method: 'GET' });
     if (!response.ok) throw new Error(`Failed to fetch URL (${response.status})`);

     const html = await response.text();

     // Extract main content - try multiple strategies
     const parser = new DOMParser();
     const doc = parser.parseFromString(html, 'text/html');

     // Remove all scripts, styles, and non-content elements first
     doc.querySelectorAll('script, style, noscript, iframe, nav, header, footer, aside, .ad, .advertisement, .sidebar').forEach(el => el.remove());

     // Try finding content with multiple strategies
     let contentElement = null;
     
     // Strategy 1: Look for common content containers
     const selectors = [
       'article',
       '[role="main"]',
       'main',
       '.post-content',
       '.entry-content',
       '.article-content',
       '.article-body',
       '.post-body',
       '.content-body',
       '.blog-content',
       '[class*="content"]',
       '[class*="article"]',
       '[class*="post"]'
     ];

     for (const selector of selectors) {
       const el = doc.querySelector(selector);
       if (el && el.textContent.trim().length > 200) {
         contentElement = el;
         break;
       }
     }

     // Strategy 2: If no content found, find the element with most text
     if (!contentElement) {
       const allElements = doc.querySelectorAll('div, section, article');
       let maxLength = 0;
       for (const el of allElements) {
         const textLength = el.textContent.trim().length;
         if (textLength > maxLength && textLength > 200) {
           maxLength = textLength;
           contentElement = el;
         }
       }
     }

     // Strategy 3: Fall back to body if nothing else works
     if (!contentElement) {
       contentElement = doc.body;
     }

     if (!contentElement || contentElement.textContent.trim().length < 100) {
       throw new Error('Could not extract content. Try copying and pasting manually.');
     }

     // Get cleaned HTML
     let content = contentElement.innerHTML;

     // Additional cleanup
     content = content.replace(/<!--[\s\S]*?-->/g, '');
     content = content.trim();

     if (content.length < 100) {
       throw new Error('Extracted content too short. The page might be behind a paywall or login.');
     }

     setInputText(content);
     if (contentEditableRef.current) {
       contentEditableRef.current.innerHTML = content;
     }
     setInputMode('text');
     addDebug(`Successfully scraped ${content.length} characters`);

   } catch (err) {
     if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
       setError('CORS Error: Cannot access this URL directly. Try copying the content manually.');
     } else {
       setError(`Scraping failed: ${err.message}`);
     }
     addDebug(`Scraping Failed: ${err.message}`, 'error');
   } finally {
     setIsScraping(false);
   }
 };

 // 3a. Handle File Upload
 const handleAudioUpload = async (e) => {
   const file = e.target.files[0];
   if (!file) return;


   if (file.size > 50 * 1024 * 1024) {
     setError("File too large. Please upload audio clips under 50MB.");
     return;
   }


   const fileSizeMB = file.size / (1024 * 1024);
   const estSeconds = Math.ceil(fileSizeMB * 3) + 5;
  
   addDebug(`Transcribing Audio: ${file.name} (${fileSizeMB.toFixed(2)}MB) - Est: ${estSeconds}s`);


   const reader = new FileReader();
   reader.readAsDataURL(file);
   reader.onloadend = () => {
     const base64Audio = reader.result.split(',')[1];
     const mimeType = file.type;
     transcribeAudioData(base64Audio, mimeType, estSeconds);
   };
 };


 // 4. Keyword Gen
 const handleSuggestKeyword = async () => {
   if (!inputText) return;
   setIsGeneratingKeyword(true);
   setError(null);
  
   const prompt = `Analyse text, find best SEO keyword. Use British English spelling if applicable. Return ONLY keyword. Text: ${inputText.substring(0, 5000)}`;


   try {
     const response = await fetchWithRetry(
       `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${getEffectiveKey()}`,
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


 // 5. Image Gen
 const handleGenerateImage = async () => {
   if (!targetKeyword) {
     setError("Please generate or enter a Target Keyword first.");
     return;
   }
   setIsGeneratingImage(true);
   setError(null);
   addDebug("Generating Header Image with AI...");

   const imagePrompt = `Create a professional blog header image about: "${targetKeyword}". Style: modern, clean, ${brandTone}. Use color scheme based on ${brandColor}. High quality, web-optimized.`;

   try {
     // Use Gemini to generate via text-to-image description
     const response = await fetchWithRetry(
       `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${getEffectiveKey()}`,
       {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           contents: [{
             parts: [{
               text: `Generate a placeholder/mock header image URL or provide a detailed image description for: "${targetKeyword}". Respond with a valid Unsplash URL using this format: https://source.unsplash.com/1600x900/?${encodeURIComponent(targetKeyword)},blog,professional`
             }]
           }]
         }),
       }
     );

     if (!response.ok) {
       if(response.status === 401 || response.status === 403) throw new Error("API Key issue. Falling back to Unsplash.");
       const errData = await response.json().catch(() => ({}));
       throw new Error(errData.error?.message || `API Error ${response.status}`);
     }

     // Fallback: Use Unsplash for images (no API key needed)
     const unsplashUrl = `https://source.unsplash.com/1600x900/?${encodeURIComponent(targetKeyword)},blog,professional,${Date.now()}`;
     setHeaderImage(unsplashUrl);
     addDebug("Image loaded from Unsplash");
     
   } catch (err) {
     addDebug(`Using Unsplash fallback: ${err.message}`, 'info');
     // Always fallback to Unsplash
     const unsplashUrl = `https://source.unsplash.com/1600x900/?${encodeURIComponent(targetKeyword)},blog,professional,${Date.now()}`;
     setHeaderImage(unsplashUrl);
   } finally {
     setIsGeneratingImage(false);
   }
 };


 // 6. Main Optimize (DEEP AEO ALGORITHM + LINK PRESERVATION)
 const handleOptimize = async () => {
   if (!inputText) return;
   setIsLoading(true);
   setError(null);
   setOptimizedContent(null);
   addDebug("Starting Deep AEO Optimisation...");


   const systemPrompt = `
     You are an advanced AEO (Answer Engine Optimisation) specialist. Your goal is to rewrite the user's content so it ranks #1 in AI Overviews (like Google SGE, ChatGPT, Perplexity).


     ### CRITICAL INSTRUCTION: LINK PRESERVATION
     The input text may contain HTML <a href="..."> links.
     **You MUST preserve these links in the output.**
     If you rewrite a sentence that contained a link, attach the <a href> tag to the relevant keywords in the new sentence.
     Do not strip links. Do not break links.


     ### LANGUAGE REQUIREMENT:
     **You must strictly use British English spelling (e.g. colour, optimise, centre, programme, analyse) throughout the entire output.**


     ### AEO FRAMEWORK TO FOLLOW:
     1. **The Inverted Pyramid:** Start with the absolute answer immediately. No fluff.
     2. **Entity Density:** Bold key terms and entities related to the topic. Use HTML <strong> tags for bolding.
     3. **Structure & Readability:** AI models and humans hate walls of text. Break content down into short paragraphs (max 3 sentences) and use bullet points extensively for features, steps, or benefits.
    
     ### MANDATORY HTML FORMATTING RULES:
     1. **H1 Title:** Must be the core question the user is asking.
     2. **Meta-Data Block:** Immediately after H1, insert: <div class="aeo-meta"><span>By <strong>[Author Name/Brand]</strong></span> <span>|</span> <span>Updated <strong>${new Date().toLocaleDateString('en-GB')}</strong></span></div>.
     3. **Brand Image Placeholder:** If a brand image/logo is provided, insert this EXACT string: {{BRAND_IMAGE_PLACEHOLDER}} immediately after the metadata.
     4. **The Key Takeaway Box:** Immediately after the image (or meta), create a <div class="aeo-answer-box">. Inside it, use <span class="aeo-label">Key Takeaway</span> followed by a <p>40-60 word definitive summary of the topic</p>.
     5. **Content Body:** Break the rest of the text into H2 questions (e.g., "Why is X important?", "How to do Y?").
     6. **Visuals (MANDATORY):** Use bullet points (<ul>) or numbered lists (<ol>) for any steps, lists, features, or benefits. Avoid long paragraphs at all costs.
     7. **Comparison Table:** If the content compares two things, MUST include a semantic HTML <table>.
     8. **Schema:** At the very bottom, generate a valid JSON-LD 'FAQPage' script wrapped in a <div class="schema-tag">.
     9. **Clean Code:** Return ONLY the inner HTML. Do NOT include <html>, <head>, or <body> tags.
     10. **No Markdown:** Do strictly NOT use markdown characters like ** or ##. Use standard HTML tags (<strong>, <h2>) only.


     Use the Brand Tone: ${brandTone}.
     ${savedBrandVoice ? `Brand Voice Guidelines: ${savedBrandVoice}` : ''}
     ${websiteStyleGuide ? `\n### CRITICAL: MATCH WEBSITE STYLE EXACTLY\nYou MUST match this website's style down to every detail:\n${websiteStyleGuide}\n\nMirror their HTML structure, heading patterns, paragraph lengths, list usage, and formatting precisely. The output should look like it was written by the same person who wrote their existing content.` : ''}
   `;


   const userPrompt = `Target Keyword: ${targetKeyword}\n\nOriginal Content (With Links):\n${inputText}`;


   try {
     const response = await fetchWithRetry(
       `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${getEffectiveKey()}`,
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
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API Error ${response.status}`);
     }


     const data = await response.json();
    
     if (!data.candidates?.[0]?.content) {
        throw new Error("AI returned no content.");
     }


     let resultText = data.candidates[0].content.parts?.[0]?.text;
    
     // Remove markdown bolding artifacts if AI slips up
     resultText = resultText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
     // Placeholder Swap Logic
     if (logoUrl) {
       const imgTag = `<img src="${logoUrl}" class="aeo-header-logo" alt="Brand Asset" />`;
       if (resultText.includes('{{BRAND_IMAGE_PLACEHOLDER}}')) {
         resultText = resultText.replace('{{BRAND_IMAGE_PLACEHOLDER}}', imgTag);
       } else {
         // Fallback if AI forgot the tag
         resultText = imgTag + "\n" + resultText;
       }
     } else {
       // Remove tag if no image exists
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
<style>
 body { font-family: ${brandFont}, sans-serif; color: #33475b; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
 ${aeoStyles}
</style>
</head>
<body>
${headerImage ? `<img src="${headerImage}" class="aeo-featured-image" alt="Header">` : ''}
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
   setPublishSuccess(true);
   setTimeout(() => setPublishSuccess(false), 3000);
 };


 const handlePublishToHubSpot = async () => {
   if (!hubspotApiKey || !hubspotPortalId) {
     setError('Please enter HubSpot API Key and Portal ID');
     return;
   }

   setIsPublishing(true);
   setError(null);
   addDebug(`Publishing to HubSpot (Portal: ${hubspotPortalId})...`);

   try {
     // Merge website CSS with AEO styles for seamless integration
     const combinedStyles = websiteCssStyles ? `${websiteCssStyles}\n\n/* AEO Enhancements */\n${aeoStyles}` : aeoStyles;
     const htmlContent = `<style>${combinedStyles}</style>${headerImage ? `<img src="${headerImage}" class="aeo-featured-image" alt="Header" />` : ''}${optimizedContent}`;

     const blogPostPayload = {
       name: targetKeyword || 'Optimised AEO Post',
       post_body: htmlContent,
       post_summary: 'Optimised with AlgoRizz AEO',
       publish_date: new Date().getTime(),
       created: new Date().getTime(),
       updated: new Date().getTime(),
       state: 'DRAFT',
       author: 'AlgoRizz Tool',
       meta_description: targetKeyword || 'AEO Optimised Content'
     };

     const response = await fetchWithRetry(
       `https://api.hubapi.com/content/api/v2/blog-posts?portalId=${hubspotPortalId}`,
       {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${hubspotApiKey}`
         },
         body: JSON.stringify(blogPostPayload)
       }
     );

     if (!response.ok) {
       const errData = await response.json().catch(() => ({}));
       if (response.status === 401) {
         throw new Error('Invalid HubSpot API Key');
       } else if (response.status === 404) {
         throw new Error('Portal ID not found. Check your HubSpot Portal ID.');
       }
       throw new Error(errData.message || `HubSpot API Error ${response.status}`);
     }

     const data = await response.json();
     addDebug(`Published to HubSpot! Blog ID: ${data.contentId || data.id}`);
     setPublishSuccess(true);
     setTimeout(() => setPublishSuccess(false), 3000);
     setShowPublishModal(false);

   } catch (err) {
     addDebug(`HubSpot Publish Failed: ${err.message}`, 'error');
     setError(`HubSpot Publish Failed: ${err.message}`);
   } finally {
     setIsPublishing(false);
   }
 };

 const handlePublish = async () => {
   if (cmsType === 'hubspot') {
     await handlePublishToHubSpot();
   } else {
     setIsPublishing(true);
     addDebug(`Publishing to ${cmsType}...`);
     setTimeout(() => {
       setIsPublishing(false);
       setPublishSuccess(true);
       setTimeout(() => setPublishSuccess(false), 3000);
       setShowPublishModal(false);
       addDebug(`Published to ${cmsType}`);
     }, 1500);
   }
 };


 const copyToClipboard = () => {
   if (!optimizedContent) return;
   const fullCode = `<style>${aeoStyles}</style>\n${optimizedContent}`;
   navigator.clipboard.writeText(fullCode.trim());
   setCopied(true);
   setTimeout(() => setCopied(false), 2000);
 };


 // Show loading state while checking auth
 if (isCheckingAuth) {
   return (
     <div className="min-h-screen bg-gradient-to-br from-[#0d0520] via-[#1a0b2e] to-[#0d0520] flex items-center justify-center">
       <div className="text-center">
         <div className="w-16 h-16 border-4 border-[#FF1493] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
         <p className="text-[#00E5FF] text-xl" style={{ fontFamily: "'VT323', monospace" }}>
           Initializing AlgoRizz...
         </p>
       </div>
     </div>
   );
 }

 // Show login page if not authenticated
 if (!isAuthenticated) {
   return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
 }

 return (
   <div className="min-h-screen text-white font-sans bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
     {/* SIDEBAR MENU */}
     {showSidebar && (
       <div className="fixed inset-0 z-50 flex">
         {/* Overlay */}
         <div className="absolute inset-0 bg-black/30" onClick={() => setShowSidebar(false)}></div>
         
         {/* Sidebar */}
         <div className="relative w-80 flex flex-col bg-gradient-to-br from-slate-800 via-purple-900 to-slate-800 backdrop-blur-xl" style={{ boxShadow: `0 0 30px rgba(255, 20, 147, 0.3), 0 0 60px rgba(0, 229, 255, 0.2)` }}>
           <div className="p-6 bg-gradient-to-br from-purple-800/50 to-slate-800/50 backdrop-blur-sm" style={{ borderBottom: `2px solid rgba(255, 20, 147, 0.3)` }}>
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                 {customLogo ? (
                   <img src={customLogo} alt="Logo" className="h-10 w-auto" />
                 ) : (
                   <div className="flex items-center gap-2">
                     <img src={algorizzLogoPath} alt="AlgoRizz" className="h-12 w-12" style={{ filter: 'drop-shadow(0 0 10px rgba(255, 20, 147, 0.5))' }} />
                     <div className="flex flex-col">
                       <h1 className="text-base font-bold" style={{ fontFamily: "'Press Start 2P', monospace", color: '#ffffff', textShadow: `0 0 10px rgba(255, 20, 147, 0.8)`, lineHeight: '1.1' }}>AlgoRizz</h1>
                       <p className="text-xs" style={{ fontFamily: "'VT323', monospace", color: algorizzSecondaryColor, textShadow: `0 0 5px rgba(0, 229, 255, 0.5)`, letterSpacing: '0.03em', marginTop: '-2px' }}>SEDUCE THE ALGORITHM.</p>
                     </div>
                   </div>
                 )}
               </div>
               <button onClick={() => setShowSidebar(false)} className="p-2 rounded-lg transition-all" style={{ backgroundColor: 'rgba(255, 20, 147, 0.1)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 20, 147, 0.2)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 20, 147, 0.1)'}>
                 <X className="h-5 w-5" style={{ color: algorizzAccentColor }} />
               </button>
             </div>
             <p className="text-xs font-bold mb-4 leading-relaxed" style={{ color: algorizzSecondaryColor, textShadow: '0 0 10px rgba(0, 229, 255, 0.5)' }}>Transform content into AI-ready answers that rank on ChatGPT, Perplexity & Google</p>
             {keyStatus === 'valid' && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> API Active</span>}
             {keyStatus === 'invalid' && <span className="text-xs font-bold text-red-600 flex items-center gap-1 animate-pulse"><ShieldAlert className="h-4 w-4" /> API Error</span>}
           </div>
           
           <nav className="flex-grow p-4 space-y-2">
             <button
               onClick={() => { setView('editor'); setShowSidebar(false); }}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all`}
               style={view === 'editor' ? { backgroundColor: 'rgba(255, 20, 147, 0.2)', color: algorizzAccentColor, boxShadow: `0 0 15px rgba(255, 20, 147, 0.3)` } : { color: '#a0aec0' }}
               onMouseEnter={(e) => { if (view !== 'editor') e.currentTarget.style.backgroundColor = 'rgba(255, 20, 147, 0.05)'; }}
               onMouseLeave={(e) => { if (view !== 'editor') e.currentTarget.style.backgroundColor = 'transparent'; }}
             >
               <Wand2 className="h-5 w-5" />
               <span>Editor</span>
             </button>
             <button
               onClick={() => { setView('library'); setShowSidebar(false); }}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all`}
               style={view === 'library' ? { backgroundColor: 'rgba(0, 229, 255, 0.2)', color: algorizzSecondaryColor, boxShadow: `0 0 15px rgba(0, 229, 255, 0.3)` } : { color: '#a0aec0' }}
               onMouseEnter={(e) => { if (view !== 'library') e.currentTarget.style.backgroundColor = 'rgba(0, 229, 255, 0.05)'; }}
               onMouseLeave={(e) => { if (view !== 'library') e.currentTarget.style.backgroundColor = 'transparent'; }}
             >
               <Library className="h-5 w-5" />
               <span>Library</span>
             </button>
             <button
               onClick={() => { setShowSettings(true); setShowSidebar(false); }}
               className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm transition-all"
               style={{ color: '#a0aec0' }}
               onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 0, 0.05)'}
               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
             >
               <Settings className="h-5 w-5" />
               <span>Settings</span>
             </button>
           </nav>
           
           <div className="mt-auto p-4 border-t" style={{ borderColor: 'rgba(255, 20, 147, 0.3)' }}>
             <button
               onClick={() => {
                 localStorage.removeItem('algorizz_authenticated');
                 localStorage.removeItem('algorizz_user');
                 setIsAuthenticated(false);
                 setShowSidebar(false);
               }}
               className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium"
               style={{ 
                 backgroundColor: 'rgba(255, 20, 147, 0.1)',
                 color: '#FF1493',
                 fontFamily: "'Press Start 2P', monospace",
                 fontSize: '0.7rem'
               }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.backgroundColor = 'rgba(255, 20, 147, 0.2)';
                 e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 20, 147, 0.4)';
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.backgroundColor = 'rgba(255, 20, 147, 0.1)';
                 e.currentTarget.style.boxShadow = 'none';
               }}
             >
               <Lock className="h-5 w-5" />
               <span>LOGOUT</span>
             </button>
             <p className="text-xs text-center mt-3" style={{ color: '#a0aec0', fontFamily: "'VT323', monospace" }}>
               Configure brand assets in Settings
             </p>
           </div>
         </div>
       </div>
     )}

     {/* TOP BAR - Minimal */}
     <div className="sticky top-0 z-40 shadow-sm" style={{ background: 'linear-gradient(135deg, #2d1b4e 0%, #1a0b2e 100%)', borderBottom: '2px solid rgba(255, 20, 147, 0.3)', boxShadow: '0 4px 20px rgba(255, 20, 147, 0.2)' }}>
       <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
         <button onClick={() => setShowSidebar(true)} className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all" style={{ backgroundColor: 'rgba(255, 20, 147, 0.1)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 20, 147, 0.2)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 20, 147, 0.1)'}>
           <div className="flex flex-col gap-1">
             <div className="w-5 h-0.5 rounded" style={{ backgroundColor: algorizzAccentColor, boxShadow: `0 0 5px ${algorizzAccentColor}` }}></div>
             <div className="w-5 h-0.5 rounded" style={{ backgroundColor: algorizzSecondaryColor, boxShadow: `0 0 5px ${algorizzSecondaryColor}` }}></div>
             <div className="w-5 h-0.5 rounded" style={{ backgroundColor: algorizzYellowColor, boxShadow: `0 0 5px ${algorizzYellowColor}` }}></div>
           </div>
           {customLogo ? (
             <img src={customLogo} alt="Logo" className="h-8 w-auto" />
           ) : (
             <div className="flex items-center gap-2">
               <img src={algorizzLogoPath} alt="AlgoRizz" className="h-10 w-10" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 20, 147, 0.5))' }} />
               <div className="flex flex-col">
                 <h1 className="text-sm font-bold" style={{ fontFamily: "'Press Start 2P', monospace", color: '#ffffff', textShadow: `0 0 10px rgba(255, 20, 147, 0.8)`, lineHeight: '1.1', letterSpacing: '0.02em' }}>AlgoRizz</h1>
                 <p className="text-xs" style={{ fontFamily: "'VT323', monospace", color: algorizzSecondaryColor, textShadow: `0 0 5px rgba(0, 229, 255, 0.5)`, letterSpacing: '0.05em', marginTop: '-2px' }}>SEDUCE THE ALGORITHM.</p>
               </div>
             </div>
           )}
         </button>
         
         <div className="flex items-center gap-2">
           {keyStatus === 'valid' && <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><ShieldCheck className="h-4 w-4" /></span>}
           {keyStatus === 'invalid' && <span className="text-xs font-bold text-red-600 flex items-center gap-1 animate-pulse"><ShieldAlert className="h-4 w-4" /></span>}
         </div>
       </div>
     </div>

     <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">


       {/* VIEW: LIBRARY */}
       {view === 'library' && (
          <div className="min-h-[600px]">
             <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                 <div>
                   <h2 className="text-3xl font-bold mb-1" style={{ color: algorizzAccentColor, textShadow: `0 0 10px ${algorizzAccentColor}` }}>
                     <Library className="h-6 w-6 inline mr-3" style={{ color: algorizzSecondaryColor }} />
                     Saved Posts
                   </h2>
                   <p style={{ color: algorizzSecondaryColor }}>{savedPosts.length} articles ready to deploy</p>
                 </div>
                 <div className="relative w-full md:w-96">
                     <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                     <input
                         type="text"
                         placeholder="Search posts..."
                         className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 transition-all"
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                     />
                 </div>
             </div>

             {isAuthReady && savedPosts.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {savedPosts.filter(p =>
                         p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
                     ).map((post) => (
                         <div key={post.id} onClick={() => handleLoadPost(post)} className="group bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer">
                             <div className="flex justify-between items-start mb-3">
                                 <span className="px-3 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: algorizzAccentColor + '15', color: algorizzAccentColor }}>
                                     {post.category || 'General'}
                                 </span>
                                 <button
                                   onClick={(e) => handleDeletePost(post.id, e)}
                                   className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                 >
                                     <Trash2 className="h-4 w-4" />
                                 </button>
                             </div>
                             <h3 className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-slate-700">
                                 {post.title}
                             </h3>
                             <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                                 {post.summary}
                             </p>
                             <div className="flex flex-wrap gap-2">
                                 {post.tags?.slice(0, 3).map(tag => (
                                     <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">#{tag}</span>
                                 ))}
                             </div>
                         </div>
                     ))}
                 </div>
             ) : isAuthReady ? (
                 <div className="flex flex-col items-center justify-center h-96">
                     <Library className="h-16 w-16 text-slate-300 mb-4" />
                     <p className="text-slate-600 font-medium">No saved posts yet</p>
                     <p className="text-sm text-slate-500">Create your first optimised post in the Editor</p>
                 </div>
             ) : (
                 <div className="flex flex-col items-center justify-center h-96">
                     <RefreshCw className="h-12 w-12 animate-spin text-slate-400 mb-4" />
                     <p className="text-slate-600">Connecting to library...</p>
                 </div>
             )}
          </div>
       )}


       {/* VIEW: EDITOR */}
       {view === 'editor' && (
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           {/* LEFT COLUMN: Controls */}
         <div className="lg:col-span-4 flex flex-col gap-6">
           {/* Brand Settings */}
           <div className="neon-card p-6 rounded-xl">
             <h3 className="font-bold mb-6 text-lg neon-label">
               <Globe className="h-5 w-5 inline mr-2" style={{ color: algorizzSecondaryColor, filter: `drop-shadow(0 0 5px ${algorizzSecondaryColor})` }} />
               Brand Identity
             </h3>
             <div className="space-y-4">
               {/* URL Input */}
               <div className="flex gap-2">
                 <div className="flex-grow">
                   <label className="text-sm font-semibold block mb-2" style={{ color: algorizzSecondaryColor }}>Website URL</label>
                   <input type="text" placeholder="mysite.com" className="neon-input w-full px-4 py-2 rounded-lg" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}/>
                 </div>
                 <button onClick={handleAnalyzeBrandUrl} disabled={!websiteUrl || isAnalyzingBrand} className="mt-8 px-4 rounded-lg transition-all flex items-center gap-2 font-semibold disabled:opacity-50" style={{ backgroundColor: 'rgba(0, 229, 255, 0.2)', color: algorizzSecondaryColor, border: `2px solid ${algorizzSecondaryColor}`, boxShadow: `0 0 15px rgba(0, 229, 255, 0.3)` }} title="Auto-detect from URL">
                   {isAnalyzingBrand ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Wand2 className="h-4 w-4"/>}
                 </button>
                 <button onClick={() => {
                   if (websiteUrl) {
                     const url = websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`;
                     window.location.href = url;
                   }
                 }} disabled={!websiteUrl} className="neon-button mt-8 px-4 text-white rounded-lg transition-all flex items-center gap-2 font-semibold disabled:opacity-50" title="Visit your website">
                   <Globe className="h-4 w-4"/>
                 </button>
               </div>
               {/* Analysis Status */}
               {isAnalyzingBrand && analysisStep && (
                 <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                   <RefreshCw className="h-4 w-4 animate-spin" style={{ color: algorizzAccentColor }} />
                   <span>{analysisStep}</span>
                 </div>
               )}
               {/* Website Style Captured Indicator */}
               {websiteCssStyles && (
                 <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
                   <Check className="h-4 w-4" />
                   <span className="font-semibold">Website styling captured ({(websiteCssStyles.length / 1024).toFixed(1)}KB CSS)</span>
                 </div>
               )}
               {/* IMAGE UPLOAD */}
               <div>
                  <label className={`flex items-center justify-center gap-3 w-full p-4 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-600 cursor-pointer hover:bg-slate-50 transition-all ${isAnalyzingBrand ? 'opacity-50 pointer-events-none' : ''}`}>
                     {isAnalyzingBrand ? <RefreshCw className="h-5 w-5 animate-spin text-slate-400" /> : <Upload className="h-5 w-5 text-slate-400" />}
                     <span className="font-medium">{isAnalyzingBrand ? (analysisStep || 'Analysing...') : "Upload image"}</span>
                     <input type="file" accept="image/*" ref={fileInputRef} onChange={handleBrandImageUpload} className="hidden" />
                  </label>
               </div>
               {/* Logo Preview */}
               {logoUrl && (
                 <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-center relative group">
                     <img src={logoUrl} alt="Brand Asset" className="h-16 mx-auto object-contain" />
                     <button onClick={() => setLogoUrl('')} className="absolute top-2 right-2 p-1 bg-white rounded border border-slate-200 hover:bg-red-50 hover:border-red-300 text-slate-400 hover:text-red-600" title="Remove Image"><X className="h-3 w-3" /></button>
                 </div>
               )}
               {/* PALETTE & COLOR */}
               <div className="space-y-3 pt-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Palette className="h-4 w-4" style={{ color: algorizzAccentColor }}/> Brand Colour</label>
                  <div className="flex gap-2 mb-3 flex-wrap">
                     {colorPalette.map((col, idx) => (
                       <button key={idx} onClick={() => setBrandColor(col)} className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 focus:outline-none ${brandColor === col ? 'border-slate-900 ring-2 ring-offset-2 ring-slate-300' : 'border-slate-300'}`} style={{ backgroundColor: col }} title={`Use this colour: ${col}`}/>
                     ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                     <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-10 w-10 rounded border border-slate-200 cursor-pointer"/>
                     <input type="text" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="text-xs text-slate-700 font-mono bg-white border border-slate-200 rounded-lg p-2 w-28 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none"/>
                  </div>
               </div>
               {/* Font & Tone */}
               <div className="grid grid-cols-1 gap-3 pt-2">
                 <div>
                   <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2"><Type className="h-4 w-4" style={{ color: algorizzAccentColor }}/> Font Family</label>
                   <input type="text" value={brandFont} onChange={(e) => setBrandFont(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none"/>
                 </div>
                 <div>
                  <label className="text-sm font-semibold text-slate-700 block mb-2">Brand Tone</label>
                  <input type="text" value={brandTone} onChange={(e) => setBrandTone(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none"/>
                 </div>
               </div>
             </div>
           </div>
           {/* Content Input */}
           <div className="neon-card p-6 rounded-xl flex-grow flex flex-col">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-4">
                <button onClick={() => setInputMode('text')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${inputMode === 'text' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}><FileText className="h-4 w-4 inline mr-1" /> Text</button>
                <button onClick={() => setInputMode('url')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${inputMode === 'url' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}><LinkIcon className="h-4 w-4 inline mr-1" /> URL</button>
                <button onClick={() => setInputMode('audio')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${inputMode === 'audio' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}><Mic className="h-4 w-4 inline mr-1" /> Audio</button>
              </div>
             <div className="mb-4">
               <label className="text-sm font-semibold text-slate-700 block mb-2">Target Keyword</label>
               <div className="flex gap-2">
                 <input type="text" placeholder="e.g. AEO Strategy" className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none" value={targetKeyword} onChange={(e) => setTargetKeyword(e.target.value)}/>
                  <button onClick={handleSuggestKeyword} disabled={!inputText || isGeneratingKeyword} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all flex items-center gap-2 font-semibold disabled:opacity-50" title="Auto-generate keyword">
                   {isGeneratingKeyword ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}
                 </button>
               </div>
             </div>
              <div className="mb-4">
                <button onClick={handleGenerateImage} disabled={!targetKeyword || isGeneratingImage} className="w-full px-4 py-3 text-white rounded-lg border-0 transition-all flex items-center justify-center gap-2 text-sm font-semibold hover:shadow-md disabled:opacity-50" style={{ backgroundColor: algorizzAccentColor }}>
                   {isGeneratingImage ? <RefreshCw className="h-4 w-4 animate-spin"/> : <LucideImage className="h-4 w-4"/>}
                   {isGeneratingImage ? "Designing..." : "Generate Header Image"}
                 </button>
                 {headerImage && <div className="mt-2 text-xs text-emerald-600 flex items-center justify-center gap-1 font-semibold"><Check className="h-3 w-3" /> Ready</div>}
              </div>
             <div className="flex-grow mb-4">
               {inputMode === 'text' && (
                 <>
                   <label className="text-sm font-semibold text-slate-700 block mb-2">Blog Post Content</label>
                   <div className="relative h-56">
                     <div ref={contentEditableRef} contentEditable className="w-full h-full p-3 bg-white border border-slate-200 rounded-lg focus:border-slate-300 focus:ring-1 focus:ring-slate-200 overflow-y-auto text-sm text-slate-900 outline-none" onInput={(e) => setInputText(e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: inputText || '' }}/>
                     {!inputText && <div className="absolute top-3 left-3 text-slate-400 text-sm pointer-events-none">Paste your article here...</div>}
                   </div>
                 </>
               )}
               {inputMode === 'url' && (
                 <>
                   <label className="text-sm font-semibold text-slate-700 block mb-2">Blog Post URL</label>
                   <div className="space-y-3">
                     <div className="flex gap-2">
                       <input type="url" placeholder="https://example.com/blog/my-article" className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none" value={blogUrl} onChange={(e) => setBlogUrl(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleScrapeBlogUrl()}/>
                       <button onClick={handleScrapeBlogUrl} disabled={!blogUrl || isScraping} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all flex items-center gap-2 font-semibold disabled:opacity-50" title="Fetch and extract content">
                         {isScraping ? <RefreshCw className="h-4 w-4 animate-spin"/> : <LinkIcon className="h-4 w-4"/>}
                       </button>
                     </div>
                     {isScraping && <div className="p-2 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200 flex items-center gap-2 font-semibold"><RefreshCw className="h-3 w-3 animate-spin" /> Scraping content...</div>}
                     {inputText && !isScraping && <div className="p-2 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 flex items-center gap-2 font-semibold"><Check className="h-3 w-3" /> Content extracted!</div>}
                     <p className="text-xs text-slate-500">Tip: Works best with blog posts, articles, and news pages.</p>
                   </div>
                 </>
               )}
               {inputMode === 'audio' && (
                 <>
                   <label className="text-sm font-semibold text-slate-700 block mb-2">Upload Audio</label>
                   <div className={`border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center transition-all ${isTranscribing ? 'bg-slate-50 cursor-wait' : 'hover:bg-slate-50 hover:border-slate-400 cursor-pointer'}`}>
                       {isTranscribing ? (
                         <div className="flex flex-col items-center">
                            <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mb-3" />
                            <p className="text-sm font-semibold text-slate-900">{transcriptionStatus || 'Processing...'}</p>
                            <p className="text-xs text-slate-500 mt-1">Est: {timeLeft}s</p>
                         </div>
                       ) : (
                         <label className="cursor-pointer flex flex-col items-center w-full">
                           <Music className="h-8 w-8 text-slate-400 mb-2" />
                           <span className="font-semibold text-slate-700">Upload Podcast</span>
                           <span className="text-xs text-slate-500">Max 50MB</span>
                           <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                         </label>
                       )}
                   </div>
                   {inputText && !isTranscribing && <div className="mt-3 p-2 bg-emerald-50 text-emerald-700 text-xs rounded border border-emerald-200 flex items-center gap-2 font-semibold"><Check className="h-3 w-3" /> Transcribed!</div>}
                 </>
               )}
             </div>
             
             {/* EXTRAS SECTION */}
             {inputText && (
               <div className="mb-4 border-t border-slate-200 pt-4">
                 <button onClick={() => setShowExtras(!showExtras)} className="w-full flex items-center justify-between text-left px-3 py-2 hover:bg-slate-50 rounded-lg transition-all">
                   <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                     <Sparkles className="h-4 w-4" style={{ color: algorizzAccentColor }} />
                     Extras & Enhancements
                   </span>
                   <span className="text-xs text-slate-500">{showExtras ? '▼' : '▶'}</span>
                 </button>
                 
                 {showExtras && (
                   <div className="mt-3 space-y-3 px-3">
                     <div className="grid grid-cols-2 gap-2">
                       <button onClick={handleGenerateImage} disabled={!targetKeyword || isGeneratingImage} className="px-3 py-2 text-xs bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all flex items-center justify-center gap-2 font-semibold disabled:opacity-50">
                         {isGeneratingImage ? <RefreshCw className="h-3 w-3 animate-spin"/> : <LucideImage className="h-3 w-3"/>}
                         {isGeneratingImage ? 'Generating...' : 'Header Image'}
                       </button>
                       <button disabled className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 text-slate-400 rounded-lg flex items-center justify-center gap-2 font-semibold cursor-not-allowed">
                         <Type className="h-3 w-3"/>
                         Add CTA
                       </button>
                     </div>
                     {headerImage && <div className="text-xs text-emerald-600 flex items-center gap-1 font-semibold"><Check className="h-3 w-3" /> Header image ready</div>}
                     <p className="text-xs text-slate-500">Generate enhancements before optimizing</p>
                   </div>
                 )}
               </div>
             )}
             
             <button onClick={handleOptimize} disabled={isLoading || !inputText} style={{ backgroundColor: isLoading ? '#e2e8f0' : algorizzAccentColor }} className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg text-white font-bold transition-all ${isLoading ? 'cursor-wait' : 'hover:shadow-md'}`}>
               {isLoading ? <><RefreshCw className="animate-spin h-5 w-5" /> <span>Optimising...</span></> : <>Optimise Content <ArrowRight className="h-5 w-5" /></>}
             </button>
             {error && <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200 text-red-700 text-xs"><AlertCircle className="h-3 w-3 inline mr-1" /> {error}</div>}
           </div>
         </div>


           {/* RIGHT COLUMN: Output */}
           <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[800px]">
               {/* Toolbar */}
               <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                   <div className="flex gap-2">
                       <button onClick={() => setActiveTab('preview')} className={`px-3 py-2 rounded-lg text-sm font-semibold ${activeTab === 'preview' ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600 hover:bg-white'}`}><Globe className="h-4 w-4" /></button>
                       <button onClick={() => setActiveTab('code')} className={`px-3 py-2 rounded-lg text-sm font-semibold ${activeTab === 'code' ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600 hover:bg-white'}`}><Code className="h-4 w-4" /></button>
                   </div>
                   <div className="flex items-center gap-2">
                        {optimizedContent && (
                          <button
                           onClick={handleSaveToLibrary}
                           disabled={isSaving}
                           className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white hover:shadow-md disabled:opacity-50 transition-all"
                           style={{ backgroundColor: algorizzAccentColor }}
                          >
                           {isSaving ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                          </button>
                        )}
                       {optimizedContent && (
                         <>
                           <button onClick={handleDownload} className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-all"><Download className="h-4 w-4" /></button>
                           <button onClick={() => setShowPublishModal(true)} className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-all"><UploadCloud className="h-4 w-4" /></button>
                         </>
                       )}
                       {optimizedContent && <button onClick={copyToClipboard} className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-all">{copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}</button>}
                   </div>
               </div>
               {/* Canvas */}
               <div className="flex-grow overflow-y-auto p-6 bg-white">
                   <style>{aeoStyles}</style>
                   {error && <div className="flex flex-col items-center justify-center h-full p-8 text-center"><AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" /><h3 className="text-lg font-bold text-red-700 mb-2">Optimisation Failed</h3><p className="text-red-600 mb-6 text-sm">{error}</p></div>}
                   {!optimizedContent && !isLoading && !headerImage && !error && <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center"><BrainCircuit className="h-12 w-12 mb-4 opacity-30" /><p>Preview will appear here</p></div>}
                   {isLoading && <div className="flex flex-col items-center justify-center h-full"><div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-300 border-t-slate-900 mb-3"></div><p className="text-slate-600 text-sm">Optimising...</p></div>}
                   {activeTab === 'preview' && optimizedContent && (
                       <div className="aeo-preview-container max-w-2xl">
                           {headerImage && <img src={headerImage} alt="Header" className="aeo-featured-image" />}
                           {optimizedContent && <div dangerouslySetInnerHTML={{ __html: optimizedContent }} />}
                       </div>
                   )}
                   {activeTab === 'code' && optimizedContent && (
                       <pre className="text-xs bg-slate-50 text-slate-900 p-3 rounded-lg overflow-x-auto font-mono border border-slate-200">{optimizedContent.substring(0, 500)}...</pre>
                   )}
               </div>
           </div>
         </div>
       )}


       {/* SETTINGS MODAL */}
       {showSettings && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
           <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden border border-slate-200">
             <div className="p-6 border-b border-slate-200 flex justify-between items-center">
               <h3 className="font-bold text-slate-900 flex items-center gap-3 text-lg">
                 <Settings className="h-5 w-5" style={{ color: algorizzAccentColor }} />
                 Settings
               </h3>
               <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                 <X className="h-6 w-6" />
               </button>
             </div>
             <div className="p-6 space-y-6">
               <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Google Gemini API Key</label>
                  <p className="text-xs text-slate-600 mb-3">System Key: {defaultApiKey ? "✓ Loaded" : "✗ Missing"}</p>
                  <input type="password" placeholder="Override with AIzaSy..." value={customApiKey} onChange={(e) => setCustomApiKey(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 transition-all"/>
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Brand Voice (Optional)</label>
                  <p className="text-xs text-slate-600 mb-3">Describe your brand's writing style, tone, and personality</p>
                  <textarea placeholder="e.g., We write in a conversational yet authoritative tone, using British English spelling. We avoid jargon and prefer short sentences..." value={savedBrandVoice} onChange={(e) => setSavedBrandVoice(e.target.value)} rows={4} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 transition-all resize-none"/>
                  <p className="text-xs text-slate-500 mt-1">This will be applied to all content optimizations</p>
               </div>
               <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-3">Brand Kit</label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2">Company Logo</label>
                      <label className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer transition-all">
                        <Upload className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-medium text-slate-700">{customLogo ? 'Change Logo' : 'Upload Logo'}</span>
                        <input ref={logoUploadRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                      </label>
                      {customLogo && (
                        <div className="mt-2 flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                          <img src={customLogo} alt="Logo Preview" className="h-8 w-auto" />
                          <button onClick={() => { setCustomLogo(''); localStorage.removeItem('algorizz_customLogo'); if(logoUploadRef.current) logoUploadRef.current.value = ''; }} className="text-xs text-red-600 hover:text-red-700 font-medium">Remove</button>
                        </div>
                      )}
                    </div>
                    {websiteStyleGuide && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-xs font-semibold text-emerald-700 mb-1">Website Style Captured</p>
                        <p className="text-xs text-emerald-600">{websiteStyleGuide.substring(0, 150)}...</p>
                      </div>
                    )}
                  </div>
               </div>
               <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 h-40 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-700 pb-2 border-b border-slate-200">
                    <Terminal className="h-4 w-4"/> Debug Console
                  </div>
                  <div className="space-y-1">
                    {debugLog.slice(0, 15).map((log, i) => (<div key={i} className={`text-[11px] font-mono ${log.includes('[ERROR]') ? 'text-red-600' : 'text-slate-600'}`}>{log}</div>))}
                  </div>
               </div>
               <button onClick={() => setShowSettings(false)} className="w-full py-3 text-white rounded-lg font-semibold hover:shadow-md transition-all" style={{ backgroundColor: algorizzAccentColor }}>Save & Close</button>
             </div>
           </div>
         </div>
       )}


       {/* PUBLISH MODAL */}
       {showPublishModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
           <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden border border-slate-200">
             <div className="p-6 border-b border-slate-200 flex justify-between items-center">
               <h3 className="font-bold text-slate-900 flex items-center gap-3 text-lg"><UploadCloud className="h-5 w-5" style={{ color: algorizzAccentColor }} /> Publish Content</h3>
               <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-6 w-6" /></button>
             </div>
             <div className="p-6 space-y-5">
               <div>
                 <label className="block text-sm font-semibold text-slate-900 mb-3">Select Platform</label>
                 <select value={cmsType} onChange={(e) => { setCmsType(e.target.value); setError(null); }} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 transition-all">
                   <option value="hubspot" className="bg-white">HubSpot</option>
                   <option value="wordpress" className="bg-white">WordPress</option>
                   <option value="webflow" className="bg-white">Webflow</option>
                 </select>
               </div>
               {cmsType === 'hubspot' && (
                 <>
                   <div>
                     <label className="block text-sm font-semibold text-slate-900 mb-2">HubSpot API Key</label>
                     <input type="password" placeholder="hc_xxxxxxxxxxxxxxxx" value={hubspotApiKey} onChange={(e) => setHubspotApiKey(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none" />
                     <p className="text-xs text-slate-500 mt-1">Get from: HubSpot Settings → Integrations → Private Apps</p>
                   </div>
                   <div>
                     <label className="block text-sm font-semibold text-slate-900 mb-2">Portal ID</label>
                     <input type="text" placeholder="123456789" value={hubspotPortalId} onChange={(e) => setHubspotPortalId(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none" />
                     <p className="text-xs text-slate-500 mt-1">Found in HubSpot Account Settings</p>
                   </div>
                 </>
               )}
               {/* Website Style Integration Notice */}
               {websiteCssStyles && (
                 <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-blue-700 text-xs flex items-start gap-2">
                   <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                   <div>
                     <p className="font-semibold">Website styling will be applied</p>
                     <p className="text-blue-600 mt-0.5">Your content will match your website's exact CSS styles ({(websiteCssStyles.length / 1024).toFixed(1)}KB)</p>
                   </div>
                 </div>
               )}
               {error && <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-red-700 text-xs"><AlertCircle className="h-3 w-3 inline mr-1" /> {error}</div>}
               <button onClick={handlePublish} disabled={isPublishing || (cmsType === 'hubspot' && (!hubspotApiKey || !hubspotPortalId))} className="w-full py-3 text-white rounded-lg font-semibold transition-all flex justify-center items-center gap-2 hover:shadow-md disabled:opacity-50" style={{ backgroundColor: algorizzAccentColor }}>
                 {isPublishing ? <RefreshCw className="h-4 w-4 animate-spin"/> : null}
                 {isPublishing ? 'Publishing...' : 'Publish Now'}
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   </div>
 );
}


