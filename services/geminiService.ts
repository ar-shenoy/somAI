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
// Primary Backend (Text Logic - Phi-3 Mini)
const TEXT_BACKEND_BASE: string = 'https://arshenoy-somai-backend.hf.space';

// Secondary Backend (Media - Moondream/Whisper)
const MEDIA_BACKEND_BASE: string = 'https://arshenoy-somai-media.hf.space';

const API_KEY = getApiKey();
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- TIERED MODEL STRATEGY ---
// 1. Primary: Gemini 2.5 Flash (Highest Quality/Speed Balance)
// 2. Secondary: Gemini 2.5 Flash Lite (Quota Rescue / Higher Throughput)
// 3. Tertiary: Local/HuggingFace Backends (Privacy/Offline/No-Quota Fallback)
const MODEL_PRIMARY = 'gemini-2.5-flash'; 
const MODEL_SECONDARY = 'gemini-2.5-flash-lite'; 
const MODEL_TTS = 'gemini-2.5-flash-tts';

// --- UTILITIES ---
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
    // Ping both backends to cold-start them
    fetch(`${TEXT_BACKEND_BASE}/`, { method: 'GET', mode: 'cors' }).catch(()=>{});
    if (TEXT_BACKEND_BASE !== MEDIA_BACKEND_BASE) {
      fetch(`${MEDIA_BACKEND_BASE}/`, { method: 'GET', mode: 'cors' }).catch(()=>{});
    }
  } catch (e) {}
};

// Generic Fallback Caller
const callBackend = async (baseUrl: string, endpoint: string, payload: any, onStatus?: (msg: string) => void): Promise<string> => {
  const url = `${baseUrl}${endpoint}`;
  console.info(`[SomAI] Calling Backend: ${url}`);
  if (onStatus) onStatus("🐢 Switching to custom cloud node...");
  
  const makeRequest = async (retries = 1) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
    
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

      if (!response.ok) {
         if ((response.status === 503 || response.status === 504) && retries > 0) {
            if (onStatus) onStatus(`💤 Waking up node... (${retries})`);
            await new Promise(r => setTimeout(r, 5000));
            return makeRequest(retries - 1);
         }
         throw new Error(`Backend Error ${response.status}`);
      }

      const data = await response.json();
      
      if (typeof data === 'string') return data;
      if (data.text) return data.text;
      if (data.response) return data.response;
      // Note: Backend does not support TTS, so we don't check for audio here.
      
      return JSON.stringify(data);

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (retries > 0) {
         await new Promise(r => setTimeout(r, 3000));
         return makeRequest(retries - 1);
      }
      throw error;
    }
  };
  
  try { return await makeRequest(); } catch (error) { throw error; }
};

// --- PIPELINE MANAGER ---
// Execute: Primary -> Secondary -> Specific Backend
async function executePipeline<T>(
    geminiTask: (model: string) => Promise<T>,
    fallbackTask: () => Promise<T>,
    onStatus?: (msg: string) => void
): Promise<T> {
    
    if (!API_KEY) {
        return await fallbackTask();
    }

    try {
        // 1. Primary Model
        if (onStatus) onStatus("⚡ Using Gemini 2.5 Flash...");
        return await geminiTask(MODEL_PRIMARY);
    } catch (error: any) {
        // Check for Quota/Rate Limits or Model Overload
        if (error.toString().includes('429') || error.toString().includes('Quota') || error.toString().includes('503')) {
            try {
                // 2. Secondary Model
                if (onStatus) onStatus("⚠️ Quota limit. Switching to 2.5 Flash Lite...");
                return await geminiTask(MODEL_SECONDARY);
            } catch (secondaryError) {
                console.warn("Secondary model failed:", secondaryError);
            }
        }
        
        // 3. Backend Fallback
        if (onStatus) onStatus("🐢 Fallback to Custom Backend...");
        return await fallbackTask();
    }
}

// --- VISION EXTRACTION ---
export const extractClinicalData = async (imageBase64: string, onStatus?: (msg: string) => void): Promise<ExtractionResult> => {
  const base64Data = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
  const prompt = `Analyze this medical document. CRITICAL: Look for Patient Name. Extract JSON: { name, age, condition, history, allergies, systolicBp, glucose, heartRate, weight, temperature, spo2, clinicalNote }. Return JSON only.`;
  
  // Gemini Task
  const geminiTask = async (model: string): Promise<ExtractionResult> => {
    const response = await ai.models.generateContent({
      model: model,
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

  // Fallback Task (somAI-media / Moondream)
  const fallbackTask = async (): Promise<ExtractionResult> => {
    const compressedBase64 = await compressImage(imageBase64);
    const cleanBase64 = compressedBase64.includes('base64,') ? compressedBase64.split('base64,')[1] : compressedBase64;
    const resText = await callBackend(MEDIA_BACKEND_BASE, '/vision', { image: cleanBase64, prompt: "Extract patient name and numeric vitals from this image." }, onStatus);
    return {
        profile: {}, 
        vitals: { clinicalNote: `[Auto-Scanned by Moondream]: ${resText}` },
        confidence: 0.6
    };
  };

  return executePipeline<ExtractionResult>(geminiTask, fallbackTask, onStatus);
};

// --- TTS (Voice) ---
export const generateSpeech = async (text: string): Promise<string | null> => {
  const geminiTask = async () => {
    const response = await ai.models.generateContent({
      model: MODEL_TTS,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  };

  // Fallback: Return NULL. 
  // The Frontend (Chat.tsx) will detect NULL and use `window.speechSynthesis` (Browser Native TTS).
  // The backend does not have a /tts endpoint.
  const fallbackTask = async () => {
    return null; 
  };

  // We manually handle pipeline here to ensure fallback returns null instead of throwing
  if (API_KEY) {
      try {
          return await geminiTask();
      } catch (e) {
          // Fallthrough
      }
  }
  return await fallbackTask();
};

// --- STT (Transcription) ---
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const reader = new FileReader();
    
    // Convert Blob to Base64 for processing
    const getBase64 = (): Promise<string> => new Promise((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(audioBlob);
    });
    const base64Audio = await getBase64();

    const geminiTask = async (model: string) => {
        const response = await ai.models.generateContent({
            model: model,
            contents: [{ 
                role: 'user', 
                parts: [{ text: "Transcribe this audio exactly." }, { inlineData: { mimeType: 'audio/wav', data: base64Audio } }] 
            }],
        });
        return response.text || "";
    };

    const fallbackTask = async () => {
        return await callBackend(MEDIA_BACKEND_BASE, '/transcribe', { audio: base64Audio });
    };

    return executePipeline(geminiTask, fallbackTask);
};

// --- RISK ANALYSIS (Text) ---
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

  const geminiTask = async (model: string) => {
    const response = await ai.models.generateContent({
        model: model,
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
    
    const parsed = parseRiskResponse(response.text || "{}", calculatedScore);
    return { ...parsed, source: model === MODEL_PRIMARY ? 'Gemini 2.5 Flash' : 'Gemini 2.5 Flash Lite' };
  };

  const fallbackTask = async () => {
    const payload = { ...profile, ...vitals, riskScore: calculatedScore, prompt };
    const text = await callBackend(TEXT_BACKEND_BASE, '/analyze', payload, onStatus);
    const parsed = parseRiskResponse(text, calculatedScore);
    return { ...parsed, source: 'Phi-3 Mini (SomAI Text Node)' };
  };

  return executePipeline(geminiTask, fallbackTask, onStatus);
};

// --- CHAT (Text) ---
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

  const geminiTask = async (model: string) => {
    onSource(model === MODEL_PRIMARY ? 'Gemini 2.5 Flash' : 'Gemini 2.5 Flash Lite'); 
    const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        config: { maxOutputTokens: 4000, temperature: 0.7 }
    });
    return cleanText(response.text || "I didn't catch that.");
  };

  const fallbackTask = async () => {
    onSource('Phi-3 Mini (SomAI Text Node)'); 
    const fallbackPrompt = `${context}\n\nChat History:\n${history.slice(-3).map(m => m.text).join('\n')}\nUser: ${currentMessage}`;
    return await callBackend(TEXT_BACKEND_BASE, '/generate', { prompt: fallbackPrompt }, onStatus);
  };

  return executePipeline(geminiTask, fallbackTask, onStatus);
};

// --- HELPERS ---

const parseRiskResponse = (text: string, calculatedScore: number): RiskAnalysisResult => {
    try {
      let jsonStr = text;
      // Clean markdown code blocks if any
      jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '');
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

export const generateHealthInsights = async (profile: PatientProfile, vitals: ClinicalVitals): Promise<HealthInsights> => {
  const prompt = `Based on Patient: ${profile.name}, ${profile.age}y, ${profile.condition}. Vitals: BP ${vitals.systolicBp}. Generate JSON: { weeklySummary, progress, tips: [] }.`;
  
  const geminiTask = async (model: string) => {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { responseMimeType: "application/json", maxOutputTokens: 2000 }
    });
    return JSON.parse(response.text || "{}");
  }
  
  const fallbackTask = async () => {
      return { weeklySummary: "Keep tracking your vitals regularly.", progress: "Data accumulated.", tips: ["Maintain a balanced diet.", "Stay hydrated."] };
  }

  return executePipeline(geminiTask, fallbackTask);
};

export const generateSessionName = async (userText: string, aiText: string): Promise<string> => {
  const prompt = `Generate a very short, specific title (max 4 words) for a medical chat session based on this context. User: ${userText}. AI: ${aiText}. Title:`;
  const geminiTask = async (model: string) => {
      const response = await ai.models.generateContent({ model: model, contents: prompt, config: { maxOutputTokens: 20 } });
      return cleanText(response.text || "New Consultation").replace(/^["']|["']$/g, '');
  };
  const fallbackTask = async () => "New Consultation";
  return executePipeline(geminiTask, fallbackTask);
};

export const generateQuickReplies = async (history: ChatMessage[]) => {
  if (!API_KEY || history.length === 0) return [];
  const recentContext = history.slice(-3).map(m => `${m.role}: ${m.text}`).join('\n');
  const prompt = `Based on: ${recentContext}. Suggest 3 short follow-up questions. JSON array.`;
  const geminiTask = async (model: string) => {
      const res = await ai.models.generateContent({ model: model, contents: prompt, config: { responseMimeType: "application/json" } });
      return JSON.parse(res.text || "[]");
  };
  const fallbackTask = async () => [];
  return executePipeline(geminiTask, fallbackTask);
};

export const summarizeConversation = async (history: ChatMessage[]) => {
  const textContent = history.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
  
  // DIRECT PROMPT for speed and structure
  const prompt = `
    Summarize this medical consultation into a structured "Consultation Brief".
    Key Sections: 
    - Topic
    - Key Symptoms/Definitions
    - Action Plan / Treatment
    - Urgency
    Keep it professional, clear, and educational. Format as plain text with bullet points.
    
    TRANSCRIPT:
    ${textContent.substring(0, 15000)}
  `;

  const geminiTask = async (model: string) => {
      const res = await ai.models.generateContent({ model: model, contents: prompt, config: { maxOutputTokens: 2000 } });
      return cleanText(res.text || "");
  };

  const fallbackTask = async () => {
      // Very basic fallback
      return "Consultation completed. Please review chat history for details.";
  };

  return executePipeline(geminiTask, fallbackTask);
};