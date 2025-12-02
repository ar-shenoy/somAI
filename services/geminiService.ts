
import { GoogleGenAI, Type } from "@google/genai";
import { PatientProfile, ClinicalVitals, AppMode, RiskAnalysisResult, ChatMessage } from "../types";

// --- API KEY & CLIENT INITIALIZATION ---
const getApiKey = () => {
  // 1. Try Vite Environment (Client-side) - This is key for HF Docker + Vite
  try {
    // @ts-ignore
    if (import.meta.env && import.meta.env.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }
  } catch (e) {
    // Ignore error if import.meta is not available
  }
  
  // 2. Try Node Environment (Server-side fallback)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }

  return '';
};

const API_KEY = getApiKey();
const ai = new GoogleGenAI({ apiKey: API_KEY });

const MODEL_FAST = 'gemini-2.5-flash';
const FALLBACK_API_BASE = 'https://arshenoy-somai-backend.hf.space';

// --- HELPER TO CLEAN MARKDOWN ---
const cleanText = (text: string) => {
  if (!text) return "";
  // Removes **, ###, and converts * bullets to -
  return text.replace(/\*\*/g, '').replace(/###/g, '').replace(/\*/g, '-').trim();
};

// --- FALLBACK HANDLER ---
const callFallbackAPI = async (endpoint: string, payload: any): Promise<string> => {
  console.warn(`[System] Switching to Fallback API: ${FALLBACK_API_BASE}${endpoint}`);

  // Helper to make the fetch request with timeout and proper CORS settings
  // Increased retries to 2 to handle stubborn cold starts
  const makeRequest = async (retries = 2) => {
    const controller = new AbortController();
    // INCREASED TIMEOUT: 60 seconds to accommodate Hugging Face Space cold starts
    const timeoutId = setTimeout(() => controller.abort(), 60000); 

    try {
      const response = await fetch(`${FALLBACK_API_BASE}${endpoint}`, {
        method: 'POST',
        mode: 'cors', 
        credentials: 'omit', // CRITICAL: Fixes CORS on HF Spaces
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      // Handle Cold Starts (503 Service Unavailable or 504 Gateway Timeout)
      if (!response.ok && (response.status === 503 || response.status === 504) && retries > 0) {
        console.warn(`Backend waking up (${response.status}). Retrying in 5s...`);
        await new Promise(r => setTimeout(r, 5000)); // Increased wait time between retries
        return makeRequest(retries - 1);
      }

      if (!response.ok) {
        const errText = await response.text();
        // Check for HTML response (common when HF space is building/error page)
        if (errText.trim().startsWith('<')) {
           throw new Error(`Backend unavailable (Status ${response.status}). Space might be building/sleeping.`);
        }
        throw new Error(`API Error ${response.status}: ${errText.substring(0, 100)}`);
      }

      const data = await response.json();
      return data.text || data.response || data.generated_text || JSON.stringify(data);
    } catch (error: any) {
      clearTimeout(timeoutId);
      // Retry on network/timeout errors if we have retries left
      if (retries > 0 && (error.name === 'AbortError' || error.message.includes('Failed to fetch'))) {
         console.warn(`Network/Timeout error. Retrying in 5s...`);
         await new Promise(r => setTimeout(r, 5000));
         return makeRequest(retries - 1);
      }
      throw error;
    }
  };

  try {
    return await makeRequest();
  } catch (error) {
    console.error("Fallback API Connection Failed:", error);
    throw error;
  }
};

// --- HELPER TO MAP RESPONSE TO RESULT ---
const parseRiskResponse = (text: string, calculatedScore: number): RiskAnalysisResult => {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    const data = JSON.parse(jsonStr);

    const pipeline = [
      { code: data.primaryConditionCode?.code || "N/A", description: data.primaryConditionCode?.description || "Unknown", type: 'Primary' },
      ...(data.historyCodes || []).map((h: any) => ({ code: h.code, description: h.description, type: 'History' }))
    ];

    const legacyCodes = [data.primaryConditionCode?.code, ...(data.historyCodes || []).map((h: any) => h.code)].filter(Boolean);

    return {
      numericScore: calculatedScore,
      summary: cleanText(data.summary || "Analysis completed."),
      actionItems: (data.actionItems || []).map(cleanText),
      icd10Codes: legacyCodes,
      codingPipeline: pipeline as any,
      insuranceNote: cleanText(data.insuranceNote || "Review required."),
      timestamp: new Date().toISOString()
    };
  } catch (e) {
    throw new Error("Failed to parse analysis data");
  }
};

export const analyzeRisk = async (
  profile: PatientProfile, 
  vitals: ClinicalVitals, 
  calculatedScore: number
): Promise<RiskAnalysisResult> => {
  const prompt = `
    Act as a Senior Clinical Risk Assessor and Certified Medical Coder.
    Analyze the following patient data to generate a clinical report and an ICD-10 coding pipeline.
    Patient Profile:
    - Age: ${profile.age}
    - Primary Condition: ${profile.condition}
    - Patient History Text: "${profile.history}"
    - Allergies: ${profile.allergies}
    
    Current Vitals (Today):
    - Systolic BP: ${vitals.systolicBp} mmHg
    - Glucose: ${vitals.glucose} mg/dL
    - Sleep Quality: ${vitals.sleepQuality}/10
    - Adherence: ${vitals.missedDoses} missed doses in 7 days.
    
    Algo-Calculated Risk Score: ${calculatedScore}/100.
    Task:
    1. Clinical Summary: 1-2 sentences explaining the risk level based on vitals.
    2. Action Items: 3 specific lifestyle changes.
    3. Coding Pipeline:
       - Extract the ICD-10-CM code for the Primary Condition.
       - Analyze the "Patient History Text" and extract ICD-10-CM codes for any mention of past diseases (e.g., "history of heart attack" -> Z86.74 or I25.2). If history is empty/none, ignore.
    4. Insurance Justification: A professional one-sentence note justifying medical necessity for monitoring.
    
    Return strict JSON.
  `;

  // Default Error Object for complete failure
  const returnError = () => ({
    numericScore: calculatedScore,
    summary: "Clinical analysis currently unavailable.",
    actionItems: ["Monitor daily vitals", "Consult healthcare provider"],
    icd10Codes: ["R69"],
    codingPipeline: [{ code: "R69", description: "Unspecified illness", type: "Primary" } as any],
    insuranceNote: "Automated risk assessment pending professional review.",
    timestamp: new Date().toISOString()
  });

  try {
    if (!API_KEY) throw new Error("API Key missing");

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            actionItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            primaryConditionCode: {
              type: Type.OBJECT,
              properties: { code: {type: Type.STRING}, description: {type: Type.STRING} }
            },
            historyCodes: {
              type: Type.ARRAY,
              items: { 
                type: Type.OBJECT,
                properties: { code: {type: Type.STRING}, description: {type: Type.STRING} }
              }
            },
            insuranceNote: { type: Type.STRING }
          },
          required: ["summary", "actionItems", "primaryConditionCode", "historyCodes", "insuranceNote"]
        }
      }
    });

    if (!response.text) throw new Error("No response from AI");
    return parseRiskResponse(response.text, calculatedScore);

  } catch (primaryError: any) {
    const errorStr = primaryError.toString();
    // Check if it's a Quota Limit (429) or other API error
    if (errorStr.includes('429') || errorStr.includes('Quota')) {
        console.warn("⚠️ GEMINI QUOTA EXCEEDED. Switching to Phi-3 Backend.");
    } else {
        console.warn("Gemini API Error. Switching to Backend.", primaryError);
    }
    
    try {
      const fallbackText = await callFallbackAPI('/analyze', { prompt });
      return parseRiskResponse(fallbackText, calculatedScore);
    } catch (fallbackError) {
      console.error("All APIs failed for analyzeRisk", fallbackError);
      return returnError();
    }
  }
};

export const generateChatResponse = async (
  history: ChatMessage[],
  currentMessage: string,
  currentImage: string | undefined,
  profile: PatientProfile,
  mode: AppMode
): Promise<string> => {
  const baseContext = `
    Context:
    Patient: ${profile.name} (${profile.age}y)
    Condition: ${profile.condition}
    History: ${profile.history}
    
    Formatting: Plain text only. No markdown.
  `;

  const systemInstruction = mode === AppMode.THERAPY
    ? `You are SomAI, a CBT Companion. ${baseContext} Use CBT techniques. Be empathetic.`
    : `You are SomAI, a Medical Education Assistant. ${baseContext} Explain concepts clearly. If image provided, analyze it.`;

  try {
    if (!API_KEY) throw new Error("API Key missing");

    const contents: any[] = history.map(msg => {
       const parts: any[] = [{ text: msg.text }];
       if (msg.image) {
         const base64 = msg.image.includes('base64,') ? msg.image.split('base64,')[1] : msg.image;
         parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } });
       }
       return { role: msg.role === 'user' ? 'user' : 'model', parts };
    });

    const currentParts: any[] = [{ text: currentMessage }];
    if (currentImage) {
        const base64 = currentImage.includes('base64,') ? currentImage.split('base64,')[1] : currentImage;
        currentParts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } });
    }
    contents.push({ role: 'user', parts: currentParts });

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.5,
        maxOutputTokens: 500,
      }
    });

    return cleanText(response.text || "I'm having trouble retrieving that information.");

  } catch (primaryError: any) {
    const errorStr = primaryError.toString();
    if (errorStr.includes('429') || errorStr.includes('Quota')) {
        console.warn("⚠️ GEMINI QUOTA EXCEEDED. Switching to Phi-3 Backend.");
    } else {
        console.warn("Gemini API Error. Switching to Backend.", primaryError);
    }

    try {
      // --- FALLBACK LOGIC ---
      // Truncate history to prevent 400/500 errors from backend context limits
      const recentHistory = history.slice(-6); 
      const historyText = recentHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`).join('\n');
      
      const fullPrompt = `${systemInstruction}\n\n[Recent Chat History]:\n${historyText}\nUser: ${currentMessage}\n${currentImage ? '[Image Context Provided]' : ''}\nAssistant:`;
      
      const fallbackResponse = await callFallbackAPI('/generate', { prompt: fullPrompt });
      return cleanText(fallbackResponse);

    } catch (fallbackError) {
      console.error("All APIs failed for chat", fallbackError);
      return "I apologize, but I am unable to connect at the moment. Please check your internet connection or try again later.";
    }
  }
};

export const generateQuickReplies = async (
  lastAiMessage: string
): Promise<string[]> => {
  if (!API_KEY) return [];
  const prompt = `Based on this AI response: "${lastAiMessage}", generate 3 short, relevant quick reply options. Return JSON array of strings.`;
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || "[]").slice(0, 3);
  } catch {
    return [];
  }
};

export const summarizeConversation = async (
  history: ChatMessage[]
): Promise<string> => {
  if (history.length === 0) return "No conversation to summarize.";

  const historyText = history.map(msg => 
    `${msg.role === 'user' ? 'Patient' : 'AI'}: ${msg.text}`
  ).join('\n');

  const prompt = `Create a professional clinical note summarizing this conversation. Include: Chief Complaint, Topics Discussed, and Patient Sentiment. Format as a single paragraph plain text. No markdown.\n\n${historyText}`;

  try {
    if (!API_KEY) throw new Error("API Key missing");

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
    });
    return cleanText(response.text || "Summary not available.");
  } catch (error) {
    try {
        const shortHistoryText = history.slice(-10).map(msg => 
            `${msg.role === 'user' ? 'Patient' : 'AI'}: ${msg.text}`
        ).join('\n');
        const shortPrompt = `Summarize conversation:\n${shortHistoryText}`;
        
        const fallbackResponse = await callFallbackAPI('/generate', { prompt: shortPrompt });
        return cleanText(fallbackResponse);
    } catch (fallbackError) {
        console.error("Summarization Error", fallbackError);
        return "Could not generate summary.";
    }
  }
};
