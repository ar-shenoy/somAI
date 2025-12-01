
export interface PatientProfile {
  name: string;
  age: number;
  condition: string;
  history: string;
  allergies: string;
  streak: number; // For medication rewards
  lastStreakUpdate: string; // ISO Date string
  badges: string[]; // Gamification badges
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string; // e.g., "08:00"
  taken: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ClinicalVitals {
  systolicBp: number;
  glucose: number;
  sleepQuality: number; // 0-10
  missedDoses: number; // last 7 days
}

export interface ICDCode {
  code: string;
  description: string;
  type: 'Primary' | 'History' | 'Symptom';
}

export interface RiskAnalysisResult {
  numericScore: number;
  summary: string;
  actionItems: string[];
  icd10Codes: string[]; // Legacy array for simple tags
  codingPipeline: ICDCode[]; // New structured pipeline
  insuranceNote: string; // Justification for coverage
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  image?: string;
}

export enum AppMode {
  GENERAL = 'GENERAL',
  THERAPY = 'THERAPY'
}

export const INITIAL_PROFILE: PatientProfile = {
  name: 'Patient X',
  age: 45,
  condition: 'Hypertension',
  history: 'None',
  allergies: 'None',
  streak: 0,
  lastStreakUpdate: new Date().toISOString(),
  badges: []
};

export const INITIAL_VITALS: ClinicalVitals = {
  systolicBp: 120,
  glucose: 100,
  sleepQuality: 7,
  missedDoses: 0
};
