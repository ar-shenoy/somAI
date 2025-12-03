export interface PatientProfile {
  // Basics
  name: string;
  age: number;
  gender: string; 
  bloodGroup: string; 
  
  // Contacts
  contactNumber: string; 
  emergencyContactName: string; 
  emergencyContactRelation: string; 
  emergencyContactPhone: string; 

  // Medical History
  condition: string;
  history: string; 
  surgeries: string; 
  familyHistory: string; 
  allergies: string;
  medicationsHistory: string; 

  // Lifestyle
  diet: 'Omnivore' | 'Vegetarian' | 'Vegan' | 'Keto' | 'Other'; 
  exerciseFrequency: 'Sedentary' | 'Light' | 'Moderate' | 'Active'; 
  smokingStatus: 'Never' | 'Former' | 'Current'; 
  alcoholConsumption: 'None' | 'Occasional' | 'Regular'; 

  // Gamification
  streak: number;
  lastStreakUpdate: string;
  lastCheckup: string; 
  badges: string[];
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ClinicalVitals {
  systolicBpMorning: number; 
  systolicBpEvening: number; 
  systolicBp: number; 
  glucose: number;
  heartRate: number;
  weight: number;
  temperature: number;
  spo2: number;
  sleepQuality: number;
  missedDoses: number;
  clinicalNote: string;
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
  icd10Codes: string[]; 
  codingPipeline: ICDCode[];
  insuranceNote: string;
  timestamp: string;
  source?: string; 
}

export interface HealthInsights {
  weeklySummary: string;
  progress: string;
  tips: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  image?: string;
  modelUsed?: string; 
}

export interface ChatSession {
  id: string;
  name: string;
  messages: ChatMessage[];
  createdAt: number;
  lastModified: number;
}

export interface ExtractionResult {
  profile?: Partial<PatientProfile>;
  vitals?: Partial<ClinicalVitals>;
  confidence: number;
}

export enum AppMode {
  GENERAL = 'GENERAL',
  THERAPY = 'THERAPY'
}

export const INITIAL_PROFILE: PatientProfile = {
  name: 'Guest Patient',
  age: 35,
  gender: 'Prefer not to say',
  bloodGroup: 'O+',
  contactNumber: '',
  emergencyContactName: '',
  emergencyContactRelation: '',
  emergencyContactPhone: '',
  condition: 'Hypertension',
  history: 'None',
  surgeries: 'None',
  familyHistory: 'None',
  allergies: 'None',
  medicationsHistory: 'None',
  diet: 'Omnivore',
  exerciseFrequency: 'Sedentary',
  smokingStatus: 'Never',
  alcoholConsumption: 'None',
  streak: 0,
  lastStreakUpdate: new Date().toISOString(),
  lastCheckup: new Date().toISOString(),
  badges: []
};

export const INITIAL_VITALS: ClinicalVitals = {
  systolicBpMorning: 120,
  systolicBpEvening: 122,
  systolicBp: 121,
  glucose: 100,
  heartRate: 72,
  weight: 70,
  temperature: 98.6,
  spo2: 98,
  sleepQuality: 7,
  missedDoses: 0,
  clinicalNote: ''
};