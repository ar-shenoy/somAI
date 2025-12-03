import { GoogleGenAI, Type } from "@google/genai";
import { PatientProfile, ClinicalVitals, AppMode, RiskAnalysisResult, ChatMessage, ExtractionResult, HealthInsights } from "../types";

// --- API KEY & CONFIG ---
const getApiKey = () => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
  } catch (e) {}
  
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

// --- BACKEND CONFIGURATION ---
// Primary Backend (Text Logic - Phi-3)
const PRIMARY_API_BASE = 'https://arshenoy-somai-backend.hf.space';

// Secondary Backend (Media - Moondream/Whisper)
// If you create a new space, put its URL here (e.g. via VITE_MEDIA_API_URL env var), 
// otherwise it defaults to the primary one.
const getMediaApiBase = () => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MEDIA_API_URL) {
      // @ts-ignore
      return import.meta.env.VITE_MEDIA_API_URL;
    }
  } catch (e) {}
  return PRIMARY_API_BASE;
};

const MEDIA_API_BASE = getMediaApiBase();

const API_KEY = getApiKey();
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- TIERED MODEL STRATEGY ---
const MODEL_TIER_1 = 'gemini-2.5-flash-lite'; 
const MODEL_TIER_2 = 'gemini-2.5-flash'; 
const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

const cleanText = (text: string) => {
  if (!text) return "";
  return text.replace(/\*\*/g, '').replace(/###/g, '').replace(/\*/g, '-').trim();
};

const compressImage = async (base64Str: string, maxWidth = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7)); 
    };
    img.onerror = () => resolve(base64Str); 
  });
};

export const wakeUpBackend = async () => {
  try {
    // Ping both potential backends
    fetch(`${PRIMARY_API_BASE}/`, { method: 'GET', mode: 'cors' }).catch(()=>{});
    if (PRIMARY_API_BASE !== MEDIA_API_BASE) {
      fetch(`${MEDIA_API_BASE}/`, { method: 'GET', mode: 'cors' }).catch(()=>{});
    }
  } catch (e) {}
};

// Generic Fallback Caller
const callBackend = async (baseUrl: string, endpoint: string, payload: any, onStatus?: (msg: string) => void): Promise<string> => {
  const url = `${baseUrl}${endpoint}`;
  console.info(`[SomAI] Calling Backend: ${url}`);
  if (onStatus) onStatus("🐢 Switching to local backup...");
  
  const makeRequest = async (retries = 2) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout for CPU
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors', 
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok && (response.status === 503 || response.status === 504) && retries > 0) {
        if (onStatus) onStatus(`💤 Backend waking up... (${retries} retries left)`);
        await new Promise(r => setTimeout(r, 5000));
        return makeRequest(retries - 1);
      }

      if (!response.ok) {
         const err = await response.text().catch(() => "Unknown");
         throw new Error(`API Error ${response.status}: ${err.substring(0, 50)}`);
      }

      const data = await response.json();
      
      if (typeof data === 'string') return data;
      if (data.text) return data.text;
      if (data.response) return data.response;
      if (data.generated_text) return data.generated_text;
      
      return JSON.stringify(data);

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (retries > 0 && (error.name === 'AbortError' || error.message.includes('Failed'))) {
         if (onStatus) onStatus("📡 Connection unstable, retrying...");
         await new Promise(r => setTimeout(r, 5000));
         return makeRequest(retries - 1);
      }
      throw error;
    }
  };
  
  try { return await makeRequest(); } catch (error) { throw error; }
};

const parseRiskResponse = (text: string, calculatedScore: number): RiskAnalysisResult => {
  try {
    let jsonStr = text;
    const codeBlockMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1];
    else {
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) jsonStr = braceMatch[0];
    }
    const data = JSON.parse(jsonStr);
    const pipeline = [
      { code: data.primaryConditionCode?.code || "N/A", description: data.primaryConditionCode?.description || "Unknown", type: 'Primary' },
      ...(data.historyCodes || []).map((h: any) => ({ code: h.code, description: h.description, type: 'History' }))
    ];
    return {
      numericScore: calculatedScore,
      summary: cleanText(data.summary || "Analysis completed."),
      actionItems: (data.actionItems || []).map(cleanText),
      icd10Codes: [], 
      codingPipeline: pipeline as any,
      insuranceNote: cleanText(data.insuranceNote || "Review required."),
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    return {
        numericScore: calculatedScore,
        summary: cleanText(text).substring(0, 500) || "Analysis currently unavailable.",
        actionItems: ["Review inputs", "Consult provider"],
        icd10Codes: [],
        codingPipeline: [],
        insuranceNote: "Automated analysis fallback.",
        timestamp: new Date().toISOString()
    }
  }
};

// --- VISION EXTRACTION ---
export const extractClinicalData = async (imageBase64: string, onStatus?: (msg: string) => void): Promise<ExtractionResult> => {
  const base64Data = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
  const prompt = `Analyze this medical document. CRITICAL: Look for Patient Name. Extract JSON: { name, age, condition, history, allergies, systolicBp, glucose, heartRate, weight, temperature, spo2, clinicalNote }. Return JSON only.`;
  
  const callGeminiVision = async (modelName: string) => {
    if (onStatus) onStatus(`⚡ Scanning with ${modelName}...`);
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64Data } }] }],
      config: { responseMimeType: "application/json", maxOutputTokens: 2000 }
    });
    const text = response.text || "{}";
    const data = JSON.parse(text);
    return {
      profile: { name: data.name, age: data.age, condition: data.condition, history: data.history, allergies: data.allergies },
      vitals: { systolicBp: data.systolicBp, glucose: data.glucose, heartRate: data.heartRate, weight: data.weight, temperature: data.temperature, spo2: data.spo2, clinicalNote: data.clinicalNote },
      confidence: 0.9
    };
  };

  try {
    if (!API_KEY) throw new Error("API Key missing");
    return await callGeminiVision(MODEL_TIER_1);
  } catch (e: any) { 
    if (e.toString().includes('429') || e.toString().includes('Quota')) {
        try {
            return await callGeminiVision(MODEL_TIER_2);
        } catch (e2) {}
    }

    // Fallback: Moondream on Media Backend
    try {
        if (onStatus) onStatus("🐢 Compressing for Moondream...");
        const compressedBase64 = await compressImage(imageBase64);
        const cleanBase64 = compressedBase64.includes('base64,') ? compressedBase64.split('base64,')[1] : compressedBase64;
        
        if (onStatus) onStatus("🐢 Using Local Vision Node...");
        const resText = await callBackend(MEDIA_API_BASE, '/vision', { image: cleanBase64, prompt: "Extract patient name and vitals from this document." }, onStatus);
        
        return {
            profile: {}, 
            vitals: { clinicalNote: `[Auto-Scanned]: ${resText}` },
            confidence: 0.6
        }
    } catch (fallbackError) {
        throw new Error("Scan failed. Please type details manually."); 
    }
  }
};

export const generateSpeech = async (text: string): Promise<string | null> => {
  if (!API_KEY) return null;
  try {
    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (e) {
    return null;
  }
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            try {
                // Whisper calls go to Media Backend
                const text = await callBackend(MEDIA_API_BASE, '/transcribe', { audio: base64 });
                resolve(text);
            } catch (e) { reject("Voice transcription failed."); }
        };
        reader.readAsDataURL(audioBlob);
    });
};

// --- RISK ANALYSIS ---
export const analyzeRisk = async (
  profile: PatientProfile, 
  vitals: ClinicalVitals, 
  calculatedScore: number,
  onStatus?: (msg: string) => void
): Promise<RiskAnalysisResult> => {
  const prompt = `
    Act as a Senior Clinical Risk Assessor.
    Patient: ${profile.name} (${profile.age}, ${profile.gender}). Condition: ${profile.condition}.
    History: ${profile.history}. 
    Vitals: BP ${vitals.systolicBp}, Glucose ${vitals.glucose}, SpO2 ${vitals.spo2}%.
    Note: ${vitals.clinicalNote}.
    Task: 1. Summary. 2. 3 Action Items. 3. ICD-10 Pipeline (Condition, History). 4. Insurance Note.
    Return JSON.
  `;

  const callGeminiRisk = async (modelName: string) => {
    if (onStatus) onStatus(`⚡ Analyzing with ${modelName}...`);
    const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            maxOutputTokens: 4000,
            responseSchema: {
            type: Type.OBJECT,
            properties: {
                summary: { type: Type.STRING },
                actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                primaryConditionCode: { type: Type.OBJECT, properties: { code: {type: Type.STRING}, description: {type: Type.STRING} } },
                historyCodes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { code: {type: Type.STRING}, description: {type: Type.STRING} } } },
                insuranceNote: { type: Type.STRING }
            },
            required: ["summary", "actionItems", "primaryConditionCode", "historyCodes", "insuranceNote"]
            }
        }
    });
    return { ...parseRiskResponse(response.text || "{}", calculatedScore), source: modelName === MODEL_TIER_1 ? 'Gemini 2.5 Flash-Lite' : 'Gemini 2.5 Flash' };
  };

  try {
    if (!API_KEY) throw new Error("API Key missing");
    return await callGeminiRisk(MODEL_TIER_1);
  } catch (err: any) {
    if (err.toString().includes('429') || err.toString().includes('Quota')) {
        try { return await callGeminiRisk(MODEL_TIER_2); } catch (e2) {}
    }

    try {
      const payload = { ...profile, ...vitals, riskScore: calculatedScore, prompt };
      // Fallback goes to Primary Backend (Text Node)
      const fallback = await callBackend(PRIMARY_API_BASE, '/analyze', payload, onStatus);
      return { 
        ...parseRiskResponse(fallback, calculatedScore),
        source: 'Phi-3 Mini (Fallback)' 
      };
    } catch {
      throw new Error("Analysis failed");
    }
  }
};

export const generateHealthInsights = async (profile: PatientProfile, vitals: ClinicalVitals): Promise<HealthInsights> => {
  const prompt = `Based on Patient: ${profile.name}, ${profile.age}y, ${profile.condition}. Vitals: BP ${vitals.systolicBp}. Generate JSON: { weeklySummary, progress, tips: [] }.`;
  
  const callGeminiInsights = async (model: string) => {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { responseMimeType: "application/json", maxOutputTokens: 2000 }
    });
    return JSON.parse(response.text || "{}");
  }

  try {
    if (!API_KEY) throw new Error("No Key");
    return await callGeminiInsights(MODEL_TIER_1);
  } catch (err: any) {
    if (err.toString().includes('429')) {
        try { return await callGeminiInsights(MODEL_TIER_2); } catch (e) {}
    }
    return { weeklySummary: "Keep tracking your vitals.", progress: "Data accumulated.", tips: ["Maintain a balanced diet.", "Stay hydrated."] };
  }
};

export const generateSessionName = async (userText: string, aiText: string): Promise<string> => {
  const prompt = `Generate a very short, specific title (max 4 words) for a medical chat session based on this context. User: ${userText}. AI: ${aiText}. Title:`;
  try {
    if (!API_KEY) return "New Consultation";
    const response = await ai.models.generateContent({ model: MODEL_TIER_1, contents: prompt, config: { maxOutputTokens: 20 } });
    return cleanText(response.text || "New Consultation").replace(/^["']|["']$/g, '');
  } catch (e) {
    return "New Consultation";
  }
};

// --- CHAT ---
export const generateChatResponse = async (
  history: ChatMessage[], 
  currentMessage: string, 
  image: string | undefined, 
  profile: PatientProfile, 
  mode: AppMode,
  onSource: (source: string) => void,
  onStatus?: (msg: string) => void
): Promise<string> => {
  const context = `
    Patient: ${profile.name} (${profile.age}y).
    Condition: ${profile.condition}. History: ${profile.history}.
    Tone: ${mode === AppMode.THERAPY ? 'Empathetic CBT' : 'Medical Guide'}.
    Format: Plain text. No markdown.
  `;
  
  const contents = history.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }, ...(msg.image ? [{ inlineData: { mimeType: 'image/jpeg', data: msg.image.split('base64,')[1] } }] : [])] }));
  contents.push({ role: 'user', parts: [{ text: context + "\nUser: " + currentMessage }, ...(image ? [{ inlineData: { mimeType: 'image/jpeg', data: image.split('base64,')[1] } }] : [])] });

  const callGeminiChat = async (modelName: string) => {
    if (onStatus) onStatus(`Generating with ${modelName}...`);
    onSource(modelName === MODEL_TIER_1 ? 'Gemini 2.5 Flash-Lite' : 'Gemini 2.5 Flash'); 
    const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: { maxOutputTokens: 4000, temperature: 0.7 }
    });
    return cleanText(response.text || "I didn't catch that.");
  };

  try {
    if (!API_KEY) throw new Error("No Key");
    return await callGeminiChat(MODEL_TIER_1);
  } catch (e: any) {
    if (e.toString().includes('429') || e.toString().includes('Quota')) {
        try {
            return await callGeminiChat(MODEL_TIER_2);
        } catch (e2) {}
    }

    try {
      if (onStatus) onStatus("Falling back to Local Phi-3...");
      onSource('Phi-3 Mini (Fallback)'); 
      const fallbackPrompt = `${context}\n\nChat History:\n${history.slice(-3).map(m => m.text).join('\n')}\nUser: ${currentMessage}`;
      // Fallback goes to Primary Backend (Text Node)
      const responseText = await callBackend(PRIMARY_API_BASE, '/generate', { prompt: fallbackPrompt }, onStatus);
      return cleanText(responseText);
    } catch { 
        return "I'm having trouble connecting. Please check your internet.";
    }
  }
};

export const generateQuickReplies = async (history: ChatMessage[]) => {
  if (!API_KEY || history.length === 0) return [];
  const recentContext = history.slice(-3).map(m => `${m.role}: ${m.text}`).join('\n');
  const prompt = `Based on: ${recentContext}. Suggest 3 short follow-up questions. JSON array.`;
  try {
    const res = await ai.models.generateContent({ model: MODEL_TIER_1, contents: prompt, config: { responseMimeType: "application/json" } });
    return JSON.parse(res.text || "[]");
  } catch { return []; }
};

export const summarizeConversation = async (history: ChatMessage[]) => {
  if (!API_KEY) return "Summary unavailable.";
  try {
    const res = await ai.models.generateContent({ model: MODEL_TIER_1, contents: `Summarize:\n${history.map(m=>m.text).join('\n')}` });
    return cleanText(res.text || "");
  } catch { return "Could not summarize."; }
};