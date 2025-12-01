
import { GoogleGenAI, Type } from "@google/genai";
import { PatientProfile, ClinicalVitals, AppMode, RiskAnalysisResult, ChatMessage } from "../types";

const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

const MODEL_FAST = 'gemini-2.5-flash';

// --- HELPER TO CLEAN MARKDOWN ---
const cleanText = (text: string) => {
  return text.replace(/\*\*/g, '').replace(/###/g, '').replace(/\*/g, '-').trim();
};

export const analyzeRisk = async (
  profile: PatientProfile, 
  vitals: ClinicalVitals, 
  calculatedScore: number
): Promise<RiskAnalysisResult> => {
  if (!API_KEY) throw new Error("API Key missing");

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
    4. Insurance Justification: A professional one-sentence note justifying medical necessity for monitoring (e.g., "Patient requires monitoring due to uncontrolled hypertension and high risk of cardiovascular event.").
    
    Return strict JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            actionItems: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
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

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    const data = JSON.parse(text);

    // Map to new pipeline structure
    const pipeline = [
      { code: data.primaryConditionCode.code, description: data.primaryConditionCode.description, type: 'Primary' },
      ...(data.historyCodes || []).map((h: any) => ({ code: h.code, description: h.description, type: 'History' }))
    ];

    // Legacy support for tags
    const legacyCodes = [data.primaryConditionCode.code, ...(data.historyCodes || []).map((h: any) => h.code)];

    return {
      numericScore: calculatedScore,
      summary: cleanText(data.summary),
      actionItems: data.actionItems.map(cleanText),
      icd10Codes: legacyCodes,
      codingPipeline: pipeline as any,
      insuranceNote: cleanText(data.insuranceNote),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("Analysis Failed", error);
    return {
      numericScore: calculatedScore,
      summary: "Clinical analysis currently unavailable.",
      actionItems: ["Monitor daily vitals", "Consult healthcare provider"],
      icd10Codes: ["R69"],
      codingPipeline: [{ code: "R69", description: "Unspecified illness", type: "Primary" }],
      insuranceNote: "Automated risk assessment pending professional review.",
      timestamp: new Date().toISOString()
    };
  }
};

export const generateChatResponse = async (
  history: ChatMessage[],
  currentMessage: string,
  currentImage: string | undefined,
  profile: PatientProfile,
  mode: AppMode
): Promise<string> => {
  if (!API_KEY) return "System Error: API Key is missing.";

  const baseContext = `
    Context:
    Patient: ${profile.name} (${profile.age}y)
    Condition: ${profile.condition}
    History: ${profile.history}
    
    IMPORTANT FORMATTING RULE: Return ONLY plain text. Do NOT use Markdown, bolding (**), italics, headers (###), or bullet points (*). Use simple dashes (-) for lists if needed.
  `;

  const systemInstruction = mode === AppMode.THERAPY
    ? `You are SomAI, a Cognitive Behavioral Therapy (CBT) Companion.
       ${baseContext}
       Use CBT techniques. Be empathetic. Ask open-ended questions. DO NOT give medical advice.`
    : `You are SomAI, an Advanced Medical Education Assistant.
       ${baseContext}
       Explain medical concepts in plain English. Use analogies. Focus on the "Why" and "How".
       
       VISION CAPABILITIES:
       If the user provides an image, analyze it.
       - If it's a nutrition label: Analyze sugar/sodium for the patient's condition.
       - If it's a skin issue/symptom: Describe it and suggest standard care (disclaimer: not a diagnosis).
       - If it's a lab report: Explain the numbers in plain English.`;

  try {
    // Convert history to Gemini format
    const chatContents = history.map(msg => {
      const parts: any[] = [{ text: msg.text }];
      if (msg.image) {
        // Strip header if present
        const base64 = msg.image.includes('base64,') ? msg.image.split('base64,')[1] : msg.image;
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } });
      }
      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts: parts
      };
    });

    const chat = ai.chats.create({
      model: MODEL_FAST,
      history: chatContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.5,
        maxOutputTokens: 500,
      }
    });

    // Prepare current message parts
    const messageParts: any[] = [{ text: currentMessage }];
    if (currentImage) {
       const base64 = currentImage.includes('base64,') ? currentImage.split('base64,')[1] : currentImage;
       messageParts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } });
    }

    const result = await chat.sendMessage({ message: messageParts });
    return cleanText(result.text || "I'm having trouble retrieving that information.");
  } catch (error) {
    console.error("Chat Error", error);
    return "I apologize, but I am unable to connect at the moment. Please try again.";
  }
};

export const generateQuickReplies = async (
  lastAiMessage: string
): Promise<string[]> => {
  if (!API_KEY) return [];
  const prompt = `Based on this AI response: "${lastAiMessage}", generate 3 short, relevant quick reply options for the user to continue the conversation. Return ONLY a JSON array of strings. Example: ["Tell me more", "What should I avoid?", "Thanks"]`;
  
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
  if (!API_KEY) return "System Error: API Key is missing.";
  if (history.length === 0) return "No conversation to summarize.";

  const historyText = history.map(msg => 
    `${msg.role === 'user' ? 'Patient' : 'AI'}: ${msg.text}`
  ).join('\n');

  const prompt = `Create a professional clinical note summarizing this conversation. Include: Chief Complaint, Topics Discussed, and Patient Sentiment. Format as a single paragraph plain text. No markdown.\n\n${historyText}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
    });
    return cleanText(response.text || "Summary not available.");
  } catch (error) {
    console.error("Summarization Error", error);
    return "Could not generate summary.";
  }
};
