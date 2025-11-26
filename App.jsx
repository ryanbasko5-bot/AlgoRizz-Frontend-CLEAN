import React, { useState, useEffect, useRef } from 'react';
import { Copy, RefreshCw, ArrowRight, Code, FileText, Check, AlertCircle, Palette, Globe, ImageIcon, Wand2, Sparkles, Type, Image as LucideImage, UploadCloud, X, Lock, Mic, Music, Upload, Settings, Activity, ShieldCheck, ShieldAlert, Terminal, Download, BrainCircuit, Link as LinkIcon, Library, Search, Save, Trash2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';


// --- FIREBASE CONFIGURATION ---
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'algorizz-app';


const defaultApiKey = import.meta.env.VITE_GOOGLE_API_KEY || "";
const algorizzAccentColor = "#ff7a59"; // Used for UI buttons, loading states, etc.
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
 // Auth & User State
 const [user, setUser] = useState(null);
 const [isAuthReady, setIsAuthReady] = useState(false);
 const [view, setView] = useState('editor'); // 'editor' | 'library'
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
 const [transcriptionStatus, setTranscriptionStatus] = useState(''); // New detailed status
 const [optimizedContent, setOptimizedContent] = useState(null);
 const [error, setError] = useState(null);
 const [activeTab, setActiveTab] = useState('preview');
 const [inputMode, setInputMode] = useState('text');
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
 const [brandColor, setBrandColor] = useState('#33475b');
 const [colorPalette, setColorPalette] = useState(['#33475b', '#ff7a59', '#ffffff']);
 const [brandFont, setBrandFont] = useState('Helvetica Neue');
 const [logoUrl, setLogoUrl] = useState(''); // Defaulted to empty string for generated content
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
           `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${getEffectiveKey()}`,
           {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                   contents: [{ parts: [{ text: metaPrompt }] }],
                   generationConfig: { responseMimeType: "application/json" }
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


 // 1. Analyze Brand URL
 const handleAnalyzeBrandUrl = async () => {
   if (!websiteUrl) return;
   setIsAnalyzingBrand(true);
   setError(null);
   addDebug(`Analysing URL: ${websiteUrl}`);
  
   try {
     const domain = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`).hostname;
     const cleanDomain = domain.replace('www.', '');
     setLogoUrl(`https://logo.clearbit.com/${cleanDomain}`);


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


 // 2. Analyze Uploaded Image
 const handleBrandImageUpload = async (e) => {
   const file = e.target.files[0];
   if (!file) return;


   setIsAnalyzingBrand(true);
   setError(null);
   // Image upload is fast due to resize, set strict 12s estimate
   setTimeLeft(12);
   setTotalEstTime(12);
   addDebug(`Analysing Image: ${file.name} (${(file.size/1024).toFixed(1)}KB)`);
  
   try {
     addDebug("Resizing image...");
     const resizedDataUrl = await resizeImage(file);
     setLogoUrl(resizedDataUrl);
     const base64Data = resizedDataUrl.split(',')[1];


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
       `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${getEffectiveKey()}`,
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
           generationConfig: { responseMimeType: "application/json" }
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
         `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${getEffectiveKey()}`,
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


 // 5. Image Gen
 const handleGenerateImage = async () => {
   if (!targetKeyword) {
     setError("Please generate or enter a Target Keyword first.");
     return;
   }
   setIsGeneratingImage(true);
   setError(null);
   addDebug("Generating Header Image...");


   const imagePrompt = `
     Create a high-quality blog header image for: "${targetKeyword}".
     Style: Primary Colour ${brandColor}, Mood ${brandTone}. Professional web design. British style.
   `;


   try {
     const response = await fetchWithRetry(
       `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${getEffectiveKey()}`,
       {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           instances: [{ prompt: imagePrompt }], // Corrected: Array of objects
           parameters: { sampleCount: 1 },
         }),
       }
     );


     if (!response.ok) {
       if(response.status === 401) throw new Error("API Key Rejected (401). Check Settings.");
       const errData = await response.json().catch(() => ({}));
       throw new Error(errData.error?.message || `Image API Error ${response.status}`);
     }


     const data = await response.json();
     if (data.predictions?.[0]?.bytesBase64Encoded) {
       setHeaderImage(`data:image/png;base64,${data.predictions[0].bytesBase64Encoded}`);
       addDebug("Image Gen Success");
     } else {
       throw new Error('No image data received');
     }
   } catch (err) {
     addDebug(`Image Gen Failed: ${err.message}`, 'error');
     setError(`Image gen failed: ${err.message}`);
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
   `;


   const userPrompt = `Target Keyword: ${targetKeyword}\n\nOriginal Content (With Links):\n${inputText}`;


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


 const handlePublish = async () => {
   setIsPublishing(true);
   const payload = {
     cms: cmsType,
     url: cmsUrl,
     token: '***HIDDEN***',
     data: {
       title: targetKeyword || "Optimised AEO Post",
       content: `<style>${aeoStyles}</style>${headerImage ? `<img src="${headerImage}" />` : ''}${optimizedContent}`,
       status: 'draft',
       author: 'AlgoRizz Tool'
     }
   };
   console.log("PUBLISH PAYLOAD:", payload);
   setTimeout(() => {
     setIsPublishing(false);
     setPublishSuccess(true);
     setTimeout(() => setPublishSuccess(false), 3000);
     setShowPublishModal(false);
   }, 1500);
 };


 const copyToClipboard = () => {
   if (!optimizedContent) return;
   const fullCode = `<style>${aeoStyles}</style>\n${optimizedContent}`;
   navigator.clipboard.writeText(fullCode.trim());
   setCopied(true);
   setTimeout(() => setCopied(false), 2000);
 };


 return (
   <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white font-sans relative overflow-hidden">
     {/* Animated Background */}
     <div className="absolute inset-0 overflow-hidden pointer-events-none">
       <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: algorizzAccentColor }}></div>
       <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full opacity-10 blur-3xl bg-blue-500"></div>
     </div>

     {/* TOP NAVIGATION - Floating */}
     <div className="absolute top-6 right-6 z-20 flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-full px-2 py-2 border border-white/20">
        <button
           onClick={() => setView('editor')}
           className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${view === 'editor' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
        >
           <Wand2 className="h-4 w-4" /> Editor
        </button>
        <button
           onClick={() => setView('library')}
           className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${view === 'library' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
        >
           <Library className="h-4 w-4" /> Library
        </button>

       <div className="h-6 w-px bg-white/20 mx-1"></div>

       {keyStatus === 'valid' && <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 px-3"><ShieldCheck className="h-4 w-4" /> Active</span>}
       {keyStatus === 'invalid' && <span className="text-xs font-bold text-red-400 flex items-center gap-1.5 px-3 animate-pulse"><ShieldAlert className="h-4 w-4" /> Error</span>}
      
       <button
         onClick={() => setShowSettings(true)}
         className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all hover:scale-110 border border-white/20"
         title="Settings / API Key"
       >
         <Settings className="h-5 w-5" />
       </button>
     </div>

     <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 relative z-10">
      
       {/* Header - Modern Hero */}
       <div className="mb-12 text-center md:text-left">
         <div className="flex items-center gap-3 mb-4">
           <img src={algorizzLogoPath} alt="AlgoRizz Logo" className="h-12 md:h-14 drop-shadow-lg" />
           <div>
             <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
               AlgoRizz
             </h1>
             <p className="text-sm text-slate-400">AI-Powered Content Excellence</p>
           </div>
         </div>
         <p className="text-slate-300 max-w-2xl text-lg md:text-base">
           {view === 'editor' ? "Transform your content with AI-powered AEO optimization." : "Your collection of optimised, high-performing content."}
         </p>
       </div>


       {/* VIEW: LIBRARY */}
       {view === 'library' && (
          <div className="min-h-[600px]">
             <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                 <div>
                   <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-1">
                       <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
                         <Library className="h-6 w-6 text-white" />
                       </div>
                       Saved Posts
                   </h2>
                   <p className="text-slate-400">{savedPosts.length} articles ready to deploy</p>
                 </div>
                 <div className="relative w-full md:w-96">
                     <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
                     <input
                         type="text"
                         placeholder="Search posts..."
                         className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-slate-400 focus:bg-white/20 focus:border-white/40 focus:ring-0 transition-all"
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
                         <div key={post.id} onClick={() => handleLoadPost(post)} className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:from-white/20 hover:to-white/10 hover:border-white/40 transition-all cursor-pointer relative overflow-hidden">
                             <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `linear-gradient(135deg, ${algorizzAccentColor}20 0%, transparent 100%)` }}></div>
                             <div className="relative z-10">
                               <div className="flex justify-between items-start mb-4">
                                   <span className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full">
                                       {post.category || 'General'}
                                   </span>
                                   <button
                                     onClick={(e) => handleDeletePost(post.id, e)}
                                     className="p-2 text-slate-300 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all"
                                   >
                                       <Trash2 className="h-4 w-4" />
                                   </button>
                               </div>
                               <h3 className="font-bold text-white mb-2 line-clamp-2 group-hover:text-orange-300 transition-colors text-lg">
                                   {post.title}
                               </h3>
                               <p className="text-sm text-slate-300 mb-4 line-clamp-2">
                                   {post.summary}
                               </p>
                               <div className="flex flex-wrap gap-2 mt-auto">
                                   {post.tags?.slice(0, 3).map(tag => (
                                       <span key={tag} className="text-xs text-orange-300 bg-orange-500/20 px-2.5 py-1 rounded-lg">#{tag}</span>
                                   ))}
                               </div>
                             </div>
                             <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <ArrowRight className="h-5 w-5 text-orange-400" />
                             </div>
                         </div>
                     ))}
                 </div>
             ) : isAuthReady ? (
                 <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                     <div className="p-6 bg-white/10 rounded-3xl mb-4 backdrop-blur-md border border-white/20">
                       <Library className="h-16 w-16 opacity-30" />
                     </div>
                     <p className="text-lg">No saved posts yet</p>
                     <p className="text-sm text-slate-500">Create your first optimised content in the Editor</p>
                 </div>
             ) : (
                 <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                     <RefreshCw className="h-12 w-12 mb-4 animate-spin text-orange-400" />
                     <p>Connecting to Library...</p>
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
           <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/20">
             <h3 className="font-bold text-white mb-6 flex items-center gap-3 text-lg">
               <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                 <Globe className="h-5 w-5 text-white" />
               </div>
               Brand Identity
             </h3>
             <div className="space-y-4">
               {/* URL Input */}
               <div className="flex gap-2">
                 <div className="flex-grow">
                   <label className="text-xs font-semibold text-slate-300 uppercase block mb-2">Website URL</label>
                   <input type="text" placeholder="mysite.com" className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:bg-white/20 focus:border-white/40 focus:ring-0 transition-all" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}/>
                 </div>
                 <button onClick={handleAnalyzeBrandUrl} disabled={!websiteUrl || isAnalyzingBrand} className="mt-8 px-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-slate-500 disabled:to-slate-600 text-white rounded-lg transition-all flex items-center gap-2 font-semibold" title="Auto-detect from URL">
                   {isAnalyzingBrand ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Wand2 className="h-4 w-4"/>}
                 </button>
               </div>
               {/* IMAGE UPLOAD */}
               <div className="relative flex py-3 items-center"><div className="flex-grow border-t border-white/20"></div><span className="flex-shrink-0 mx-2 text-slate-400 text-xs font-semibold">OR UPLOAD IMAGE</span><div className="flex-grow border-t border-white/20"></div></div>
               <div>
                  <label className={`flex items-center justify-center gap-3 w-full p-4 border-2 border-dashed border-white/30 rounded-xl text-sm text-slate-300 cursor-pointer hover:bg-white/10 transition-all ${isAnalyzingBrand ? 'opacity-50 pointer-events-none' : ''}`}>
                     {isAnalyzingBrand ? <RefreshCw className="h-5 w-5 animate-spin text-orange-400" /> : <Upload className="h-5 w-5 text-orange-400" />}
                     <span className="font-medium">{isAnalyzingBrand ? `Analysing...` : "Upload Brand Asset"}</span>
                     <input type="file" accept="image/*" ref={fileInputRef} onChange={handleBrandImageUpload} className="hidden" />
                  </label>
               </div>
               {/* Logo Preview */}
               {logoUrl && (
                 <div className="mt-3 p-3 bg-white/10 border border-white/20 rounded-xl text-center relative group">
                     <img src={logoUrl} alt="Brand Asset" className="h-20 mx-auto object-contain" />
                     <button onClick={() => setLogoUrl('')} className="absolute top-2 right-2 p-1.5 bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-red-600" title="Remove Image"><X className="h-3 w-3" /></button>
                 </div>
               )}
               {/* PALETTE & COLOR */}
               <div className="space-y-3 pt-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase flex items-center gap-2"><Palette className="h-4 w-4 text-orange-400"/> Brand Colour</label>
                  <div className="flex gap-2 mb-3 flex-wrap">
                     {colorPalette.map((col, idx) => (
                       <button key={idx} onClick={() => setBrandColor(col)} className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 focus:outline-none ${brandColor === col ? 'border-white ring-2 ring-offset-2 ring-offset-slate-900 ring-orange-400' : 'border-white/30'}`} style={{ backgroundColor: col }} title={`Use this colour: ${col}`}/>
                     ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                     <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-10 w-10 rounded-lg cursor-pointer border-0 p-1"/>
                     <input type="text" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="text-xs text-slate-200 font-mono bg-white/10 border border-white/20 rounded-lg p-2 w-28 focus:bg-white/20 focus:border-white/40 focus:ring-0 transition-all"/>
                  </div>
               </div>
               {/* Font & Tone */}
               <div className="grid grid-cols-1 gap-3 pt-2">
                 <div>
                   <label className="text-xs font-semibold text-slate-300 uppercase flex items-center gap-2 mb-2"><Type className="h-4 w-4 text-orange-400"/> Font Family</label>
                   <input type="text" value={brandFont} onChange={(e) => setBrandFont(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:bg-white/20 focus:border-white/40 focus:ring-0 transition-all"/>
                 </div>
                 <div>
                  <label className="text-xs font-semibold text-slate-300 uppercase block mb-2">Brand Tone</label>
                  <input type="text" value={brandTone} onChange={(e) => setBrandTone(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:bg-white/20 focus:border-white/40 focus:ring-0 transition-all"/>
                 </div>
               </div>
             </div>
           </div>
           {/* Content Input */}
           <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/20 flex-grow flex flex-col">
              <div className="flex items-center gap-3 mb-5 border-b border-white/20 pb-4">
                <button onClick={() => setInputMode('text')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${inputMode === 'text' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'text-slate-400 hover:text-white bg-white/10'}`}><FileText className="h-4 w-4" /> Text</button>
                <button onClick={() => setInputMode('audio')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${inputMode === 'audio' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'text-slate-400 hover:text-white bg-white/10'}`}><Mic className="h-4 w-4" /> Audio</button>
              </div>
             <div className="mb-5">
               <label className="text-xs font-semibold text-slate-300 uppercase block mb-2">Target Keyword</label>
               <div className="flex gap-2">
                 <input type="text" placeholder="e.g. AEO Strategy" className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:bg-white/20 focus:border-white/40 focus:ring-0 transition-all" value={targetKeyword} onChange={(e) => setTargetKeyword(e.target.value)}/>
                  <button onClick={handleSuggestKeyword} disabled={!inputText || isGeneratingKeyword} className="px-4 py-3 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-lg border border-white/20 transition-all flex items-center gap-2 font-semibold disabled:opacity-50" title="Auto-generate best fit keyword">
                   {isGeneratingKeyword ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}
                 </button>
               </div>
             </div>
              <div className="mb-5">
                <button onClick={handleGenerateImage} disabled={!targetKeyword || isGeneratingImage} className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-500 disabled:to-slate-600 text-white rounded-xl border-0 transition-all flex items-center justify-center gap-3 text-sm font-semibold">
                   {isGeneratingImage ? <RefreshCw className="h-4 w-4 animate-spin"/> : <LucideImage className="h-4 w-4"/>}
                   {isGeneratingImage ? "Designing..." : "Generate Header Image"}
                 </button>
                 {headerImage && <div className="mt-3 text-xs text-emerald-400 flex items-center justify-center gap-2 font-semibold"><Check className="h-3 w-3" /> Image Ready</div>}
              </div>
             <div className="flex-grow mb-5">
               {inputMode === 'text' && (
                 <>
                   <label className="text-xs font-semibold text-slate-300 uppercase flex justify-between mb-2"><span>Blog Post Content</span>{inputText && <span className="text-orange-400 flex items-center gap-1 font-semibold"><LinkIcon className="h-3 w-3"/> Links Preserved</span>}</label>
                   <div className="relative h-64">
                     <div ref={contentEditableRef} contentEditable className="w-full h-full p-4 bg-white/10 border border-white/20 rounded-lg focus:bg-white/20 focus:border-white/40 focus:ring-0 overflow-y-auto text-sm text-white placeholder-slate-500" style={{ outlineColor: 'transparent' }} onInput={(e) => setInputText(e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: inputText || '' }} data-placeholder="Paste your article here..."/>
                     {!inputText && <div className="absolute top-4 left-4 text-slate-500 text-sm pointer-events-none">Paste your article here (links preserved)...</div>}
                   </div>
                 </>
               )}
               {inputMode === 'audio' && (
                 <>
                   <label className="text-xs font-semibold text-slate-300 uppercase mb-3 block">Upload Audio</label>
                   <div className={`border-2 border-dashed border-white/30 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${isTranscribing ? 'bg-white/5 cursor-wait' : 'hover:bg-white/10 hover:border-white/50 cursor-pointer'}`}>
                       {isTranscribing ? (
                         <div className="flex flex-col items-center">
                            <RefreshCw className="h-10 w-10 text-orange-400 animate-spin mb-3" />
                            <p className="text-sm font-semibold text-white">{transcriptionStatus || 'Processing...'}</p>
                            <p className="text-xs text-slate-400 mt-2">Estimated: {timeLeft}s</p>
                            {totalEstTime > 0 && <div className="w-full max-w-xs bg-white/20 rounded-full h-1.5 mt-3 overflow-hidden"><div className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, ((totalEstTime - timeLeft) / totalEstTime) * 100)}%` }}></div></div>}
                         </div>
                       ) : (
                         <label className="cursor-pointer flex flex-col items-center w-full">
                           <div className="h-12 w-12 bg-orange-500/20 rounded-2xl flex items-center justify-center mb-3"><Music className="h-6 w-6 text-orange-400" /></div>
                           <span className="text-sm font-semibold text-white">Upload Podcast Clip</span>
                           <span className="text-xs text-slate-400 mt-2">Max 50MB (mp3, wav, m4a)</span>
                           <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                         </label>
                       )}
                   </div>
                   {inputText && !isTranscribing && <div className="mt-4 p-3 bg-emerald-500/20 text-emerald-300 text-xs rounded-lg border border-emerald-500/30 flex items-center gap-2 font-semibold"><Check className="h-3 w-3" /> Successfully transcribed!</div>}
                 </>
               )}
             </div>
             <button onClick={handleOptimize} disabled={isLoading || !inputText} style={{ background: isLoading ? 'linear-gradient(135deg, rgba(100,100,100,0.5) 0%, rgba(80,80,80,0.5) 100%)' : `linear-gradient(135deg, ${algorizzAccentColor} 0%, #ff6b3d 100%)` }} className={`flex items-center justify-center gap-3 w-full py-4 rounded-xl text-white font-bold transition-all shadow-lg hover:shadow-xl hover:shadow-orange-500/20 transform active:scale-95`}>
               {isLoading ? <><RefreshCw className="animate-spin h-5 w-5" /> <span>Optimising...</span></> : <>Optimise Content <ArrowRight className="h-5 w-5" /></>}
             </button>
             {error && <div className="mt-4 p-4 bg-red-500/20 rounded-xl border border-red-500/30 text-red-300 text-xs flex flex-col gap-2 font-medium"><div className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Error:</div><div className="ml-6 font-mono whitespace-pre-wrap break-all">{error}</div></div>}
           </div>
         </div>


           {/* RIGHT COLUMN: Output */}
           <div className="lg:col-span-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden flex flex-col h-[800px]">
               {/* Toolbar */}
               <div className="flex items-center justify-between p-5 border-b border-white/20 bg-white/5">
                   <div className="flex gap-2 bg-white/10 p-1.5 rounded-xl border border-white/20">
                       <button onClick={() => setActiveTab('preview')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'preview' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-slate-300 hover:text-white'}`}><Globe className="h-4 w-4 inline mr-2" /> Preview</button>
                       <button onClick={() => setActiveTab('code')} className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'code' ? 'bg-white/20 text-white border border-white/30 shadow-lg' : 'text-slate-300 hover:text-white'}`}><Code className="h-4 w-4 inline mr-2" /> HTML Code</button>
                   </div>
                   <div className="flex items-center gap-2">
                        {optimizedContent && (
                          <button
                           onClick={handleSaveToLibrary}
                           disabled={isSaving}
                           className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-500 disabled:to-slate-600 transition-all shadow-lg"
                          >
                           {isSaving ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                           Save
                          </button>
                        )}
                       {optimizedContent && (
                         <>
                           <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all"><Download className="h-4 w-4" /> Download</button>
                           <button onClick={() => setShowPublishModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all"><UploadCloud className="h-4 w-4" /> Publish</button>
                         </>
                       )}
                       {optimizedContent && <button onClick={copyToClipboard} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-all px-3 py-2">{copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}</button>}
                   </div>
               </div>
               {/* Canvas */}
               <div className="flex-grow overflow-y-auto p-8 bg-white/5 relative">
                   <style>{aeoStyles}</style>
                   {error && <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/40 backdrop-blur-sm z-20"><div className="bg-red-500/20 border border-red-500/50 p-8 rounded-2xl max-w-md"><AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" /><h3 className="text-lg font-bold text-red-300 mb-2">Optimisation Failed</h3><p className="text-red-300/80 mb-6 text-sm">{error}</p><button onClick={() => setError(null)} className="px-6 py-2 bg-white/20 border border-white/30 text-white rounded-lg font-medium hover:bg-white/30 transition-all">Dismiss</button></div></div>}
                   {!optimizedContent && !isLoading && !headerImage && !error && <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8 text-center"><div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-6 border border-white/20"><BrainCircuit className="h-10 w-10 text-slate-500" /></div><p className="text-lg font-semibold">Ready to optimize</p><p className="text-sm text-slate-500 mt-1">Paste content to get started</p></div>}
                   {isLoading && <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm z-10"><div className="animate-spin rounded-full h-14 w-14 border-4 border-white/20 border-t-orange-500 mb-6"></div><p className="text-white font-semibold text-lg">Optimising your content...</p><p className="text-slate-300 text-sm mt-2">This may take a moment</p></div>}
                   {activeTab === 'preview' && (optimizedContent || headerImage) && (
                       <div className="aeo-preview-container animate-in fade-in duration-500 max-w-3xl mx-auto">
                           {headerImage && <img src={headerImage} alt="AI Header" className="aeo-featured-image" />}
                           {optimizedContent && <div dangerouslySetInnerHTML={{ __html: optimizedContent }} />}
                       </div>
                   )}
                   {optimizedContent && activeTab === 'code' && (
                       <div className="animate-in fade-in duration-500">
                           <pre className="text-xs bg-slate-950 text-slate-50 p-4 rounded-xl overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap border border-white/10">{`<style>\n/* BRAND STYLES */\nbody { font-family: '${brandFont}', sans-serif; color: #33475b; }\n</style>\n\n${headerImage ? `<img src="[INSERT_IMAGE_URL]" class="aeo-featured-image">` : ''}\n\n${optimizedContent}`}</pre>
                       </div>
                   )}
               </div>
           </div>
         </div>
       )}


       {/* SETTINGS MODAL */}
       {showSettings && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
           <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
             <div className="p-6 border-b border-white/20 flex justify-between items-center bg-black/30">
               <h3 className="font-bold text-white flex items-center gap-3 text-lg">
                 <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg">
                   <Settings className="h-5 w-5 text-white" />
                 </div>
                 Settings
               </h3>
               <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white transition-colors">
                 <X className="h-6 w-6" />
               </button>
             </div>
             <div className="p-6 space-y-6">
               <div>
                  <label className="block text-sm font-semibold text-white mb-2">Google Gemini API Key</label>
                  <p className="text-xs text-slate-400 mb-3">System Key: {defaultApiKey ? "✓ Loaded" : "✗ Missing"}</p>
                  <input type="password" placeholder="Override with AIzaSy..." value={customApiKey} onChange={(e) => setCustomApiKey(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:bg-white/20 focus:border-white/40 focus:ring-0 transition-all"/>
               </div>
               <div className="p-4 bg-slate-900/50 rounded-lg border border-white/10 h-40 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-orange-400 pb-2 border-b border-white/10">
                    <Terminal className="h-4 w-4"/> Debug Console
                  </div>
                  <div className="space-y-1">
                    {debugLog.slice(0, 15).map((log, i) => (<div key={i} className={`text-[11px] font-mono ${log.includes('[ERROR]') ? 'text-red-400' : 'text-slate-300'}`}>{log}</div>))}
                  </div>
               </div>
               <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all">Save & Close</button>
             </div>
           </div>
         </div>
       )}


       {/* PUBLISH MODAL */}
       {showPublishModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
           <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
             <div className="p-6 border-b border-white/20 flex justify-between items-center bg-black/30">
               <h3 className="font-bold text-white flex items-center gap-3 text-lg"><div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg"><UploadCloud className="h-5 w-5 text-white" /></div> Publish Content</h3>
               <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-white transition-colors"><X className="h-6 w-6" /></button>
             </div>
             <div className="p-6 space-y-5">
               <div>
                 <label className="block text-sm font-semibold text-white mb-3">Select Platform</label>
                 <select value={cmsType} onChange={(e) => setCmsType(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:bg-white/20 focus:border-white/40 focus:ring-0 transition-all">
                   <option value="wordpress" className="bg-slate-800">WordPress</option>
                   <option value="hubspot" className="bg-slate-800">HubSpot</option>
                   <option value="webflow" className="bg-slate-800">Webflow</option>
                 </select>
               </div>
               <button onClick={handlePublish} disabled={isPublishing} className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-500 disabled:to-slate-600 text-white rounded-lg font-semibold transition-all flex justify-center items-center gap-2">
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


