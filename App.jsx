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


const defaultApiKey = "AIzaSyCOIRET7L3XeLbq4HWlEYgR358riSMuybo";
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
   <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 relative">
    
     {/* TOP NAVIGATION */}
     <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
           onClick={() => setView('editor')}
           className={`px-3 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${view === 'editor' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
           <Wand2 className="h-4 w-4" /> Editor
        </button>
        <button
           onClick={() => setView('library')}
           className={`px-3 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${view === 'library' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
           <Library className="h-4 w-4" /> Library
        </button>


       <div className="h-6 w-px bg-slate-300 mx-2"></div>


       {keyStatus === 'valid' && <span className="text-xs font-bold text-green-600 flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Active</span>}
       {keyStatus === 'invalid' && <span className="text-xs font-bold text-red-600 flex items-center gap-1 animate-pulse"><ShieldAlert className="h-4 w-4" /> Key Error</span>}
      
       <button
         onClick={() => setShowSettings(true)}
         className="p-2 bg-white rounded-full shadow-md hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors"
         title="Settings / API Key"
       >
         <Settings className="h-5 w-5" />
       </button>
     </div>


     <div className="max-w-7xl mx-auto">
      
       {/* Header */}
       <div className="mb-8 text-center md:text-left">
         <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2" style={{ color: algorizzAccentColor }}>
           <img src={algorizzLogoPath} alt="AlgoRizz Logo" className="h-10 inline-block mr-2" />
           AlgoRizz <span className="text-slate-600 font-light">Optimiser</span>
         </h1>
         <p className="text-slate-600 max-w-2xl">
           {view === 'editor' ? "AI-Powered Content Transformation Engine." : "Your AI-Organised Content Library."}
         </p>
       </div>


       {/* VIEW: LIBRARY */}
       {view === 'library' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] p-6">
             <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                 <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                     <Library className="h-5 w-5 text-indigo-600"/> Saved Posts
                 </h2>
                 <div className="relative w-full md:w-96">
                     <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                     <input
                         type="text"
                         placeholder="Search by title, tag, or AI category..."
                         className="w-full pl-10 p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                         <div key={post.id} onClick={() => handleLoadPost(post)} className="group bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer relative">
                             <div className="flex justify-between items-start mb-3">
                                 <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded uppercase tracking-wide">
                                     {post.category || 'Uncategorised'}
                                 </span>
                                 <button
                                   onClick={(e) => handleDeletePost(post.id, e)}
                                   className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                 >
                                     <Trash2 className="h-4 w-4" />
                                 </button>
                             </div>
                             <h3 className="font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                 {post.title}
                             </h3>
                             <p className="text-sm text-slate-500 mb-4 line-clamp-3">
                                 {post.summary}
                             </p>
                             <div className="flex flex-wrap gap-2 mt-auto">
                                 {post.tags?.map(tag => (
                                     <span key={tag} className="text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded-full">#{tag}</span>
                                 ))}
                             </div>
                             <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <ArrowRight className="h-5 w-5 text-indigo-500" />
                             </div>
                         </div>
                     ))}
                 </div>
             ) : isAuthReady ? (
                 <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                     <Library className="h-12 w-12 mb-4 opacity-20" />
                     <p>No saved posts yet. Go to the Editor to create one!</p>
                 </div>
             ) : (
                 <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                     <RefreshCw className="h-12 w-12 mb-4 animate-spin text-indigo-500" />
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
           <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
               <Globe className="h-4 w-4 text-slate-500" /> Brand Identity
             </h3>
             <div className="space-y-4">
               {/* URL Input */}
               <div className="flex gap-2">
                 <div className="flex-grow">
                   <label className="text-xs font-semibold text-slate-500 uppercase">Website URL</label>
                   <input type="text" placeholder="mysite.com" className="w-full p-2 text-sm border border-slate-300 rounded-md" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)}/>
                 </div>
                 <button onClick={handleAnalyzeBrandUrl} disabled={!websiteUrl || isAnalyzingBrand} className="mt-5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 transition-colors flex items-center gap-2" title="Auto-detect from URL">
                   {isAnalyzingBrand ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Wand2 className="h-4 w-4"/>}
                 </button>
               </div>
               {/* IMAGE UPLOAD */}
               <div className="relative flex py-1 items-center"><div className="flex-grow border-t border-slate-200"></div><span className="flex-shrink-0 mx-2 text-slate-400 text-xs">OR UPLOAD IMAGE</span><div className="flex-grow border-t border-slate-200"></div></div>
               <div>
                  <label className={`flex items-center justify-center gap-2 w-full p-2 border border-dashed border-slate-300 rounded-md text-sm text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors ${isAnalyzingBrand ? 'opacity-50 pointer-events-none' : ''}`}>
                     {isAnalyzingBrand ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                     <span>{isAnalyzingBrand ? `Analysing...` : "Upload Brand Asset / Screenshot"}</span>
                     <input type="file" accept="image/*" ref={fileInputRef} onChange={handleBrandImageUpload} className="hidden" />
                  </label>
               </div>
               {/* Logo Preview */}
               {logoUrl && (
                 <div className="mt-2 p-2 bg-slate-50 border border-slate-100 rounded text-center relative group">
                     <img src={logoUrl} alt="Brand Asset" className="h-20 mx-auto object-contain" />
                     <button onClick={() => setLogoUrl('')} className="absolute top-1 right-1 p-1 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-50" title="Remove Image"><X className="h-3 w-3" /></button>
                 </div>
               )}
               {/* PALETTE & COLOR */}
               <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><Palette className="h-3 w-3"/> Brand Palette</label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                     {colorPalette.map((col, idx) => (
                       <button key={idx} onClick={() => setBrandColor(col)} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none ${brandColor === col ? 'border-slate-800 ring-1 ring-offset-1 ring-slate-400' : 'border-slate-200'}`} style={{ backgroundColor: col }} title={`Use this colour: ${col}`}/>
                     ))}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                     <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-8 w-8 rounded cursor-pointer border-0 p-0"/>
                     <input type="text" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="text-xs text-slate-600 font-mono border border-slate-300 rounded p-1 w-24"/>
                  </div>
               </div>
               {/* Font & Tone */}
               <div className="grid grid-cols-1 gap-3">
                 <div>
                   <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><Type className="h-3 w-3"/> Font</label>
                   <input type="text" value={brandFont} onChange={(e) => setBrandFont(e.target.value)} className="w-full p-2 mt-1 text-sm border border-slate-300 rounded-md bg-white"/>
                 </div>
                 <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase">Brand Tone</label>
                  <input type="text" value={brandTone} onChange={(e) => setBrandTone(e.target.value)} className="w-full p-2 mt-1 text-sm border border-slate-300 rounded-md bg-white"/>
                 </div>
               </div>
             </div>
           </div>
           {/* Content Input */}
           <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex-grow flex flex-col">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                <button onClick={() => setInputMode('text')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${inputMode === 'text' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}><FileText className="h-4 w-4" /> Text</button>
                <button onClick={() => setInputMode('audio')} className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${inputMode === 'audio' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}><Mic className="h-4 w-4" /> Podcast / Audio</button>
              </div>
             <div className="mb-4">
               <label className="text-xs font-semibold text-slate-500 uppercase">Target Keyword</label>
               <div className="flex gap-2 mt-1">
                 <input type="text" placeholder="e.g. AEO Strategy" className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:outline-none" style={{ '--tw-ring-color': algorizzAccentColor }} value={targetKeyword} onChange={(e) => setTargetKeyword(e.target.value)}/>
                  <button onClick={handleSuggestKeyword} disabled={!inputText || isGeneratingKeyword} className="px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md border border-indigo-200 transition-colors flex items-center gap-2" title="Auto-generate best fit keyword from text">
                   {isGeneratingKeyword ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Sparkles className="h-4 w-4"/>}
                 </button>
               </div>
             </div>
              <div className="mb-4">
                <button onClick={handleGenerateImage} disabled={!targetKeyword || isGeneratingImage} className="w-full p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-300 transition-all flex items-center justify-center gap-2 text-sm font-medium">
                   {isGeneratingImage ? <RefreshCw className="h-4 w-4 animate-spin"/> : <LucideImage className="h-4 w-4"/>}
                   {isGeneratingImage ? "Designing Image..." : "Generate Matching Header Image"}
                 </button>
                 {headerImage && <div className="mt-2 text-xs text-green-600 flex items-center justify-center gap-1"><Check className="h-3 w-3" /> Image Ready</div>}
              </div>
             <div className="flex-grow mb-4">
               {inputMode === 'text' && (
                 <>
                   <label className="text-xs font-semibold text-slate-500 uppercase flex justify-between"><span>Blog Post Content</span>{inputText && <span className="text-green-600 flex items-center gap-1"><LinkIcon className="h-3 w-3"/> Links Preserved</span>}</label>
                   <div className="relative h-64 mt-1">
                     <div ref={contentEditableRef} contentEditable className="w-full h-full p-3 border border-slate-300 rounded-md focus:ring-2 focus:outline-none overflow-y-auto text-sm font-mono bg-white" style={{ '--tw-ring-color': algorizzAccentColor, outlineColor: 'transparent' }} onInput={(e) => setInputText(e.currentTarget.innerHTML)} dangerouslySetInnerHTML={{ __html: inputText || '' }} data-placeholder="Paste your article here (links will be preserved)..."/>
                     {!inputText && <div className="absolute top-3 left-3 text-slate-400 text-sm pointer-events-none">Paste your article here (links will be preserved)...</div>}
                   </div>
                 </>
               )}
               {inputMode === 'audio' && (
                 <>
                   <label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">Upload Audio (MP3/WAV)</label>
                   <div className={`border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${isTranscribing ? 'bg-slate-50 cursor-wait' : 'hover:bg-slate-50 cursor-pointer'}`}>
                       {isTranscribing ? (
                         <div className="flex flex-col items-center">
                            <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mb-3" />
                            <p className="text-sm font-medium text-slate-700">{transcriptionStatus || 'Processing...'}</p>
                            <p className="text-xs text-slate-500 mt-1">Estimated time: {timeLeft}s</p>
                            {totalEstTime > 0 && <div className="w-full max-w-xs bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden"><div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, ((totalEstTime - timeLeft) / totalEstTime) * 100)}%` }}></div></div>}
                         </div>
                       ) : (
                         <label className="cursor-pointer flex flex-col items-center w-full">
                           <div className="h-12 w-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3"><Music className="h-6 w-6 text-indigo-500" /></div>
                           <span className="text-sm font-medium text-slate-700">Click to Upload Podcast Clip</span>
                           <span className="text-xs text-slate-400 mt-1">Max 50MB (mp3, wav, m4a)</span>
                           <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
                         </label>
                       )}
                   </div>
                   {inputText && !isTranscribing && <div className="mt-4 p-3 bg-green-50 text-green-700 text-xs rounded border border-green-200 flex items-center gap-2"><Check className="h-3 w-3" /> Audio successfully transcribed!</div>}
                 </>
               )}
             </div>
             <button onClick={handleOptimize} disabled={isLoading || !inputText} style={{ backgroundColor: isLoading ? '#cbd6e2' : algorizzAccentColor }} className={`flex items-center justify-center gap-2 w-full py-3 rounded-lg text-white font-semibold transition-all shadow-md hover:shadow-lg transform active:scale-95`}>
               {isLoading ? <><RefreshCw className="animate-spin h-5 w-5" /> <span className="animate-pulse">Injecting AEO Algorithm...</span></> : <>Optimise Content <ArrowRight className="h-5 w-5" /></>}
             </button>
             {error && <div className="mt-2 p-3 bg-red-50 rounded-md border border-red-200 text-red-600 text-xs flex flex-col gap-2"><div className="flex items-center gap-1 font-bold"><AlertCircle className="h-3 w-3" /> Error:</div><div className="ml-4 font-mono whitespace-pre-wrap break-all">{error}</div></div>}
           </div>
         </div>


           {/* RIGHT COLUMN: Output */}
           <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[800px]">
               {/* Toolbar */}
               <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                   <div className="flex gap-2 bg-slate-200 p-1 rounded-lg">
                       <button onClick={() => setActiveTab('preview')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'preview' ? 'bg-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`} style={activeTab === 'preview' ? { color: algorizzAccentColor } : {}}><Globe className="h-4 w-4" /> Preview</button>
                       <button onClick={() => setActiveTab('code')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'code' ? 'bg-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`} style={activeTab === 'code' ? { color: algorizzAccentColor } : {}}><Code className="h-4 w-4" /> HTML Code</button>
                   </div>
                   <div className="flex items-center gap-2">
                        {optimizedContent && (
                          <button
                           onClick={handleSaveToLibrary}
                           disabled={isSaving}
                           className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                          >
                           {isSaving ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                           Save to Library
                          </button>
                        )}
                       {optimizedContent && (
                         <>
                           <button onClick={handleDownload} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"><Download className="h-4 w-4" /> Download</button>
                           <button onClick={() => setShowPublishModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"><UploadCloud className="h-4 w-4" /> Connect</button>
                         </>
                       )}
                       {optimizedContent && <button onClick={copyToClipboard} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors ml-2">{copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}{copied ? 'Copy' : 'Copy'}</button>}
                   </div>
               </div>
               {/* Canvas */}
               <div className="flex-grow overflow-y-auto p-8 bg-white relative">
                   <style>{aeoStyles}</style>
                   {error && <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-white/90 z-20"><div className="bg-red-50 border border-red-100 p-6 rounded-xl max-w-md"><AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" /><h3 className="text-lg font-bold text-red-800 mb-2">Optimisation Failed</h3><p className="text-red-600 mb-4 text-sm">{error}</p><button onClick={() => setError(null)} className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded shadow-sm hover:bg-red-50">Dismiss & Try Again</button></div></div>}
                   {!optimizedContent && !isLoading && !headerImage && !error && <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-8 text-center"><div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><BrainCircuit className="h-8 w-8 text-slate-300" /></div><p>Paste content on the left to start AEO optimisation.</p></div>}
                   {isLoading && <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 backdrop-blur-sm"><div className="animate-spin rounded-full h-12 w-12 border-b-2 mb-4" style={{ borderColor: algorizzAccentColor }}></div><p className="text-slate-600 font-medium animate-pulse">Injecting AI Algorithms & Structuring...</p></div>}
                   {activeTab === 'preview' && (optimizedContent || headerImage) && (
                       <div className="aeo-preview-container animate-in fade-in duration-500 max-w-3xl mx-auto">
                           {headerImage && <img src={headerImage} alt="AI Header" className="aeo-featured-image" />}
                           {optimizedContent && <div dangerouslySetInnerHTML={{ __html: optimizedContent }} />}
                       </div>
                   )}
                   {optimizedContent && activeTab === 'code' && (
                       <div className="animate-in fade-in duration-500">
                           <pre className="text-xs bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">{`<style>\n/* BRAND STYLES (${websiteUrl || 'Custom'}) */\n:root {\n  --brand-color: ${brandColor};\n  --brand-font: '${brandFont.replace(/['"]/g, '')}', sans-serif;\n}\n/* ... css truncated ... */\nbody { font-family: var(--brand-font); }\n</style>\n\n${headerImage ? `<img src="[INSERT_IMAGE_URL_HERE]" class="aeo-featured-image" alt="Header Image">` : ''}\n\n${optimizedContent}`}</pre>
                       </div>
                   )}
               </div>
           </div>
         </div>
       )}


       {/* SETTINGS MODAL */}
       {showSettings && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                 <Settings className="h-5 w-5 text-slate-600" /> App Settings & Debug
               </h3>
               <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                 <X className="h-5 w-5" />
               </button>
             </div>
             <div className="p-6 space-y-6">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Google Gemini API Key</label>
                  <p className="text-xs text-slate-500 mb-2">System Key: {defaultApiKey ? "Loaded" : "Missing"}</p>
                  <input type="password" placeholder="Override with AIzaSy..." value={customApiKey} onChange={(e) => setCustomApiKey(e.target.value)} className="w-full pl-9 p-2 border border-slate-300 rounded-md"/>
               </div>
               <div className="p-4 bg-slate-900 text-slate-50 font-mono text-[10px] rounded-lg h-32 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-2 border-b border-slate-700 pb-1">
                    <Terminal className="h-3 w-3"/> Debug Console
                  </div>
                  {debugLog.map((log, i) => (<div key={i} className={`mb-1 ${log.includes('[ERROR]') ? 'text-red-400' : 'text-slate-300'}`}>{log}</div>))}
               </div>
               <button onClick={() => setShowSettings(false)} className="w-full py-2 bg-slate-800 text-white rounded-md font-medium hover:bg-slate-700">Save & Close</button>
             </div>
           </div>
         </div>
       )}


       {/* PUBLISH MODAL */}
       {showPublishModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-slate-800 flex items-center gap-2"><UploadCloud className="h-5 w-5 text-indigo-600" /> Publish to CMS</h3>
               <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
             </div>
             <div className="p-6 space-y-4">
               <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Select CMS</label>
                 <select value={cmsType} onChange={(e) => setCmsType(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md bg-white">
                   <option value="wordpress">WordPress</option>
                   <option value="hubspot">HubSpot</option>
                   <option value="webflow">Webflow</option>
                 </select>
               </div>
               <button onClick={handlePublish} disabled={isPublishing} className="w-full py-2 bg-slate-800 text-white rounded-md font-medium hover:bg-slate-700 flex justify-center items-center gap-2">
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
