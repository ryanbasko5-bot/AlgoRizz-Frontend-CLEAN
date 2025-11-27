import React, { useState, useEffect, useRef } from 'react';
import { Copy, RefreshCw, ArrowRight, Code, FileText, Check, AlertCircle, Palette, Globe, ImageIcon, Wand2, Sparkles, Type, Image as LucideImage, UploadCloud, X, Lock, Mic, Music, Upload, Settings, Activity, ShieldCheck, ShieldAlert, Terminal, Download, BrainCircuit, Link as LinkIcon, Library, Search, Save, Trash2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';

// --- FIREBASE CONFIGURATION ---
// These globals are expected to be injected by the hosting environment
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'algorizz-app';

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

  // ... (rest of original content omitted for brevity in the temp file)
}
