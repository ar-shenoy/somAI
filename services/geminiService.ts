import { GoogleGenAI, Type } from "@google/genai";
import { PatientProfile, ClinicalVitals, AppMode, RiskAnalysisResult, ChatMessage, ExtractionResult, HealthInsights } from "../types";

// --- API KEY & CLIENT INITIALIZATION ---
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

const API_KEY = getApiKey();
const ai = new GoogleGenAI({ apiKey: API_KEY });

const MODEL_FAST = 'gemini-2.5-flash';
const FALLBACK_API_BASE = 'https://arshenoy-somai-backend.hf.space';

// Cleaning for final blocks
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
    await fetch(`${FALLBACK_API_BASE}/`, { method: 'GET', mode: 'cors' });
  } catch (e) {}
};

const callFallbackAPI = async (endpoint: string, payload: any): Promise<string> => {
  console.info(`[SomAI System] Switching to Fallback API: ${FALLBACK_API_BASE}${endpoint}`);
  
  const makeRequest = async (retries = 2) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); 
    
    try {
      const response = await fetch(`${FALLBACK_API_BASE}${endpoint}`, {
        method: 'POST',
        mode: 'cors', 
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok && (response.status === 503 || response.status === 504) && retries > 0) {
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

export const extractClinicalData = async (imageBase64: string): Promise<ExtractionResult> => {
  const base64Data = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
  const prompt = `Analyze medical image. Extract JSON: { name, age, condition, history, allergies, systolicBp, glucose, heartRate, weight, temperature, spo2, clinicalNote }. Return JSON only.`;
  
  try {
    if (!API_KEY) throw new Error("API Key missing");
    
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
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

  } catch (e: any) { 
    try {
        const compressedBase64 = await compressImage(imageBase64);
        const cleanBase64 = compressedBase64.includes('base64,') ? compressedBase64.split('base64,')[1] : compressedBase64;
        const resText = await callFallbackAPI('/vision', { image: cleanBase64, prompt: "Describe this medical document in detail, listing any numbers or patient names found." });
        
        return {
            profile: {}, 
            vitals: { clinicalNote: `[Auto-Scanned by SomAI Vision]: ${resText}` },
            confidence: 0.6
        }
    } catch (fallbackError) {
        throw new Error("Scan failed. Please type details manually."); 
    }
  }
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            try {
                const text = await callFallbackAPI('/transcribe', { audio: base64 });
                resolve(text);
            } catch (e) { reject("Voice transcription failed."); }
        };
        reader.readAsDataURL(audioBlob);
    });
};

export const analyzeRisk = async (profile: PatientProfile, vitals: ClinicalVitals, calculatedScore: number): Promise<RiskAnalysisResult> => {
  const prompt = `
    Act as a Senior Clinical Risk Assessor.
    Patient: ${profile.name} (${profile.age}, ${profile.gender}). Condition: ${profile.condition}.
    History: ${profile.history}. Surgeries: ${profile.surgeries}. Family History: ${profile.familyHistory}.
    Lifestyle: Diet-${profile.diet}, Exercise-${profile.exerciseFrequency}, Smoke-${profile.smokingStatus}, Alcohol-${profile.alcoholConsumption}.
    Vitals: BP Morning ${vitals.systolicBpMorning} / Evening ${vitals.systolicBpEvening}. Glucose ${vitals.glucose}. HR ${vitals.heartRate}. SpO2 ${vitals.spo2}%. Temp ${vitals.temperature}F. Weight ${vitals.weight}kg.
    Note: ${vitals.clinicalNote}.
    Task: 1. Summary (Risk level). 2. 3 Action Items. 3. ICD-10 Pipeline (Condition, History, Symptoms). 4. Insurance Note.
    Return JSON.
  `;

  try {
    if (!API_KEY) throw new Error("API Key missing");
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
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
    return { 
      ...parseRiskResponse(response.text || "{}", calculatedScore),
      source: 'Gemini 2.5 Flash' 
    };
  } catch (err: any) {
    try {
      const payload = { ...profile, ...vitals, riskScore: calculatedScore, prompt };
      const fallback = await callFallbackAPI('/analyze', payload);
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
  const prompt = `Based on Patient: ${profile.name}, ${profile.age}y, ${profile.condition}. Vitals: BP ${vitals.systolicBp}, SpO2 ${vitals.spo2}%. Generate JSON: { weeklySummary, progress, tips: [] }.`;
  try {
    if (!API_KEY) throw new Error("No Key");
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: { responseMimeType: "application/json", maxOutputTokens: 2000 }
    });
    return JSON.parse(response.text || "{}");
  } catch {
    return { weeklySummary: "Keep tracking your vitals.", progress: "Data accumulated.", tips: ["Maintain a balanced diet.", "Stay hydrated."] };
  }
};

export const generateSessionName = async (userText: string, aiText: string): Promise<string> => {
  const prompt = `Generate a very short, specific title (max 4 words) for a medical chat session based on this context. 
  User: ${userText}
  AI: ${aiText}
  Title:`;
  
  try {
    if (!API_KEY) return "New Consultation";
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: { maxOutputTokens: 20 }
    });
    return cleanText(response.text || "New Consultation").replace(/^["']|["']$/g, '');
  } catch (e) {
    try {
        const fallbackRes = await callFallbackAPI('/generate', { prompt: prompt });
        return cleanText(fallbackRes).replace(/^["']|["']$/g, '');
    } catch {
        return "New Consultation";
    }
  }
};

export const generateChatResponse = async (
  history: ChatMessage[], 
  currentMessage: string, 
  image: string | undefined, 
  profile: PatientProfile, 
  mode: AppMode,
  onSource: (source: string) => void
): Promise<string> => {
  const context = `
    Patient: ${profile.name} (${profile.age}y).
    Condition: ${profile.condition}. History: ${profile.history}.
    Surgeries: ${profile.surgeries}. Family Hx: ${profile.familyHistory}.
    Lifestyle: ${profile.diet}, ${profile.exerciseFrequency}, Smoke: ${profile.smokingStatus}.
    Emergency Contact: ${profile.emergencyContactName} (${profile.emergencyContactPhone}).
    Tone: ${mode === AppMode.THERAPY ? 'Empathetic, calm, therapeutic (CBT).' : 'Professional, educational, clear.'}
    Format: Plain text. No markdown.
  `;
  
  const contents = history.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }, ...(msg.image ? [{ inlineData: { mimeType: 'image/jpeg', data: msg.image.split('base64,')[1] } }] : [])] }));
  contents.push({ role: 'user', parts: [{ text: context + "\nUser: " + currentMessage }, ...(image ? [{ inlineData: { mimeType: 'image/jpeg', data: image.split('base64,')[1] } }] : [])] });

  try {
    if (!API_KEY) throw new Error("No Key");
    
    // 1. Try Gemini
    onSource('Gemini 2.5 Flash'); 
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: contents,
      config: {
        maxOutputTokens: 4000,
        temperature: 0.7
      }
    });

    return cleanText(response.text || "I didn't catch that.");

  } catch (e) {
    try {
      // 2. Fallback
      onSource('Phi-3 Mini (Fallback)'); 
      const fallbackPrompt = `${context}\n\nChat History:\n${history.slice(-3).map(m => m.text).join('\n')}\nUser: ${currentMessage}`;
      const responseText = await callFallbackAPI('/generate', { prompt: fallbackPrompt });
      return cleanText(responseText);

    } catch { 
        return "I'm having trouble connecting. Please check your internet.";
    }
  }
};

// --- UPDATED: CONTEXT-AWARE QUICK REPLIES ---
export const generateQuickReplies = async (history: ChatMessage[]) => {
  if (!API_KEY || history.length === 0) return [];
  
  // Use last 3 messages for context
  const recentContext = history.slice(-3).map(m => `${m.role}: ${m.text}`).join('\n');
  const prompt = `Based on this conversation:\n${recentContext}\n\nSuggest 3 short, relevant follow-up questions the USER might want to ask next. Return ONLY a JSON array of strings.`;
  
  try {
    const res = await ai.models.generateContent({ 
      model: MODEL_FAST, 
      contents: prompt, 
      config: { responseMimeType: "application/json" } 
    });
    return JSON.parse(res.text || "[]");
  } catch { return []; }
};

export const summarizeConversation = async (history: ChatMessage[]) => {
  if (!API_KEY) return "Summary unavailable.";
  try {
    const res = await ai.models.generateContent({ model: MODEL_FAST, contents: `Summarize clinical conversation:\n${history.map(m=>m.text).join('\n')}` });
    return cleanText(res.text || "");
  } catch { return "Could not summarize."; }
};