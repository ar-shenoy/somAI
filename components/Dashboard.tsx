import React, { useState, useRef } from 'react';
import { Activity, HeartPulse, FileText, ShieldCheck, User, X, Check, Clipboard, ScanLine, Loader2, Trash2, Calendar, TrendingUp, AlertTriangle, Phone, Stethoscope, Utensils, Cigarette, Info, Zap, Server, AlertCircle } from 'lucide-react';
import { ClinicalVitals, RiskAnalysisResult, PatientProfile, Medication, ChatMessage, HealthInsights } from '../types';
import GaugeChart from './GaugeChart';
import ReportView from './ReportView';
import { extractClinicalData } from '../services/geminiService';

interface DashboardProps {
  vitals: ClinicalVitals;
  setVitals: React.Dispatch<React.SetStateAction<ClinicalVitals>>;
  riskResult: RiskAnalysisResult | null;
  chatSummary: string;
  handleRunAnalysis: () => void;
  isAnalyzing: boolean;
  onPrint: () => void;
  profile: PatientProfile;
  setProfile: (p: PatientProfile | ((prev: PatientProfile) => PatientProfile)) => void;
  medications: Medication[];
  chatHistory: ChatMessage[];
  insights: HealthInsights | null;
  statusMessage?: string; // New
  setStatusMessage: (msg: string) => void; // New
}

// --- ANOMALY DETECTION LOGIC ---
const getVitalStatus = (type: string, value: number) => {
  if (!value) return 'normal';
  switch (type) {
    case 'systolicBp':
      if (value > 180 || value < 90) return 'critical';
      if (value > 140 || value < 100) return 'warning';
      return 'normal';
    case 'glucose':
      if (value > 250 || value < 50) return 'critical';
      if (value > 140 || value < 70) return 'warning';
      return 'normal';
    case 'heartRate':
      if (value > 120 || value < 40) return 'critical';
      if (value > 100 || value < 50) return 'warning';
      return 'normal';
    case 'spo2':
      if (value < 90) return 'critical';
      if (value < 95) return 'warning';
      return 'normal';
    case 'temperature':
      if (value > 103 || value < 95) return 'critical';
      if (value > 99.5) return 'warning';
      return 'normal';
    default:
      return 'normal';
  }
};

const VitalInput = ({ label, value, onChange, type, unit }: { label: string, value: number, onChange: (v: number) => void, type: string, unit: string }) => {
  const status = getVitalStatus(type, value);
  const borderColor = status === 'critical' ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : status === 'warning' ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'border-white/10';
  const textColor = status === 'critical' ? 'text-red-500' : status === 'warning' ? 'text-yellow-500' : 'text-white';

  return (
    <div>
      <label className="text-[10px] text-gray-500 uppercase font-bold flex justify-between">
        {label}
        {status !== 'normal' && <AlertCircle size={12} className={textColor} />}
      </label>
      <div className="flex items-end gap-1">
        <input 
          type="number" 
          value={value || ''} 
          onChange={e => onChange(parseFloat(e.target.value))} 
          className={`w-full bg-black/40 rounded p-2 text-sm font-mono outline-none transition-all border ${borderColor} ${textColor}`}
        />
        <span className="text-[10px] text-gray-600 mb-1">{unit}</span>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ 
  vitals, setVitals, riskResult, chatSummary, handleRunAnalysis, isAnalyzing, onPrint, profile, setProfile, medications, chatHistory, insights, statusMessage, setStatusMessage
}) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [localProfile, setLocalProfile] = useState(profile);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVitalChange = (key: keyof ClinicalVitals, val: number | string) => {
    setVitals(prev => ({ ...prev, [key]: val }));
  };

  const saveProfile = () => { setProfile(localProfile); setShowProfileModal(false); };
  const handleClearNote = () => setVitals(prev => ({ ...prev, clinicalNote: '' }));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExtracting(true);
    setStatusMessage('Reading document...');
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const extracted = await extractClinicalData(reader.result as string, setStatusMessage);
        if (extracted.vitals) {
           setVitals(prev => {
             const newVitals = { ...prev };
             if (extracted.vitals?.systolicBp) {
                 const bp = Number(extracted.vitals.systolicBp);
                 newVitals.systolicBpMorning = bp; 
                 newVitals.systolicBpEvening = bp;
             }
             if (extracted.vitals?.glucose) newVitals.glucose = Number(extracted.vitals.glucose);
             if (extracted.vitals?.heartRate) newVitals.heartRate = Number(extracted.vitals.heartRate);
             if (extracted.vitals?.weight) newVitals.weight = Number(extracted.vitals.weight);
             if (extracted.vitals?.temperature) newVitals.temperature = Number(extracted.vitals.temperature);
             if (extracted.vitals?.spo2) newVitals.spo2 = Number(extracted.vitals.spo2);
             
             const newNote = extracted.vitals?.clinicalNote || "";
             if (newNote) newVitals.clinicalNote = prev.clinicalNote ? prev.clinicalNote + "\n\n[Extracted]: " + newNote : "[Extracted]: " + newNote;
             return newVitals;
           });
        }
        if (extracted.profile) {
           setProfile(prev => ({ ...prev, ...extracted.profile }));
           setLocalProfile(prev => ({ ...prev, ...extracted.profile }));
        }
        alert("✨ Magic Upload Complete!");
      } catch (error) { alert("Could not extract data."); } 
      finally { 
        setIsExtracting(false); 
        setStatusMessage('');
        if (fileInputRef.current) fileInputRef.current.value = ''; 
      }
    };
    reader.readAsDataURL(file);
  };

  const adherence = medications.length > 0 
    ? Math.round((medications.filter(m => m.taken).length / medications.length) * 100) 
    : 0;

  const daysSinceCheckup = Math.floor((new Date().getTime() - new Date(profile.lastCheckup).getTime()) / (1000 * 3600 * 24));

  const anomalyCount = [
    getVitalStatus('systolicBp', vitals.systolicBpMorning),
    getVitalStatus('systolicBp', vitals.systolicBpEvening),
    getVitalStatus('glucose', vitals.glucose),
    getVitalStatus('spo2', vitals.spo2),
    getVitalStatus('heartRate', vitals.heartRate),
    getVitalStatus('temperature', vitals.temperature),
  ].filter(s => s === 'critical').length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER & QUICK STATS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
         <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="text-neon-green" /> Dashboard
         </h2>
         <div className="flex gap-2">
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-white/10 text-gray-300 hover:text-white bg-white/5"><User size={14} className="text-neon-blue"/> PROFILE</button>
            <button onClick={onPrint} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-white/10 text-gray-300 hover:text-white bg-white/5"><FileText size={14} /> REPORT</button>
         </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
         <div className="glass-card p-4 rounded-xl border-l-4 border-l-neon-green">
            <p className="text-[10px] uppercase font-bold text-gray-500">Risk Level</p>
            <p className="text-xl font-bold text-white mt-1">{riskResult ? `${riskResult.numericScore}/100` : 'Pending'}</p>
         </div>
         <div className="glass-card p-4 rounded-xl border-l-4 border-l-neon-yellow">
            <p className="text-[10px] uppercase font-bold text-gray-500">Adherence</p>
            <p className="text-xl font-bold text-white mt-1">{adherence}%</p>
         </div>
         <div className="glass-card p-4 rounded-xl border-l-4 border-l-neon-blue">
            <p className="text-[10px] uppercase font-bold text-gray-500">Active Streak</p>
            <p className="text-xl font-bold text-white mt-1">{profile.streak} Days</p>
         </div>
         <div className="glass-card p-4 rounded-xl border-l-4 border-l-purple-500">
            <p className="text-[10px] uppercase font-bold text-gray-500">Last Checkup</p>
            <p className="text-xl font-bold text-white mt-1">{daysSinceCheckup} days ago</p>
         </div>
      </div>

      {/* ANOMALY ALERT BANNER */}
      {anomalyCount > 0 && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 animate-pulse">
           <AlertTriangle className="text-red-500" />
           <div>
              <h4 className="font-bold text-red-400 text-sm">Critical Anomalies Detected</h4>
              <p className="text-xs text-red-300/80">Some vital signs are outside normal ranges. Please review and consult a professional.</p>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        
        {/* LEFT COLUMN: VITALS INPUT */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border-t border-neon-green">
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Vital Signs</h3>
               <div className="relative">
                  <input type="file" accept="image/*,.pdf" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={isExtracting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-green/10 text-neon-green text-[10px] font-bold border border-neon-green/20 hover:bg-neon-green/20 transition-all disabled:opacity-50">
                    {isExtracting ? <Loader2 size={12} className="animate-spin" /> : <ScanLine size={12} />} {isExtracting ? 'SCANNING...' : 'SCAN REPORT'}
                  </button>
               </div>
            </div>
            {statusMessage && isExtracting && <div className="text-xs text-neon-green mb-2 animate-pulse font-mono">{statusMessage}</div>}
            
            <div className="space-y-4">
              {/* BP TREND: Morning vs Evening */}
              <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                 <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 flex items-center gap-1"><TrendingUp size={12} /> Blood Pressure (Sys)</label>
                 <div className="grid grid-cols-2 gap-3">
                    <VitalInput label="Morning" value={vitals.systolicBpMorning} onChange={v => handleVitalChange('systolicBpMorning', v)} type="systolicBp" unit="mmHg" />
                    <VitalInput label="Evening" value={vitals.systolicBpEvening} onChange={v => handleVitalChange('systolicBpEvening', v)} type="systolicBp" unit="mmHg" />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <VitalInput label="Glucose" value={vitals.glucose} onChange={v => handleVitalChange('glucose', v)} type="glucose" unit="mg/dL" />
                 <VitalInput label="Heart Rate" value={vitals.heartRate} onChange={v => handleVitalChange('heartRate', v)} type="heartRate" unit="bpm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <VitalInput label="SpO2" value={vitals.spo2} onChange={v => handleVitalChange('spo2', v)} type="spo2" unit="%" />
                 <VitalInput label="Weight" value={vitals.weight} onChange={v => handleVitalChange('weight', v)} type="weight" unit="kg" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <VitalInput label="Temperature" value={vitals.temperature} onChange={v => handleVitalChange('temperature', v)} type="temperature" unit="°F" />
                 <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold">Missed Meds</label>
                    <input type="number" value={vitals.missedDoses} onChange={e => handleVitalChange('missedDoses', parseInt(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm font-mono mt-auto" />
                 </div>
              </div>

              <div>
                 <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1">
                    <span>Sleep Quality</span>
                    <span className="text-neon-blue">{vitals.sleepQuality}/10</span>
                 </div>
                 <input type="range" min="0" max="10" value={vitals.sleepQuality} onChange={e => handleVitalChange('sleepQuality', parseInt(e.target.value))} className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-blue" />
              </div>

              <div className="pt-2 border-t border-white/5 relative">
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-2"><Clipboard size={12} /> Clinical Note</label>
                    {vitals.clinicalNote && <button onClick={handleClearNote} className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-1"><Trash2 size={10} /> Clear</button>}
                 </div>
                 <textarea value={vitals.clinicalNote} onChange={e => handleVitalChange('clinicalNote', e.target.value)} placeholder="Paste reports or symptoms..." className="w-full h-20 bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-gray-300 focus:border-neon-green outline-none resize-none" />
              </div>

              <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="w-full bg-neon-green hover:bg-neon-green/90 text-black py-3 rounded-xl font-mono font-bold transition-all flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(0,255,128,0.2)] disabled:opacity-50 text-sm">
                {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <HeartPulse size={18} />} {isAnalyzing ? 'ANALYZING...' : 'RUN ASSESSMENT'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RESULTS & INSIGHTS */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel p-6 rounded-2xl min-h-[600px] flex flex-col">
            <h3 className="text-xl font-bold text-white mb-6 flex justify-between items-center">
                <span>SomAI Clinical Analysis</span>
                {riskResult?.source && (
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-1 rounded bg-white/5 border border-white/10 text-gray-400 flex items-center gap-1">
                        {riskResult.source.includes('Gemini') ? <Zap size={10} className="text-neon-yellow"/> : <Server size={10} className="text-neon-red"/>}
                        {riskResult.source}
                    </span>
                )}
            </h3>
            
            {riskResult ? (
              <div className="flex flex-col gap-6 animate-in fade-in">
                {/* HEALTH INSIGHTS PANEL (NEW) */}
                {insights && (
                   <div className="bg-gradient-to-r from-neon-blue/10 to-purple-500/10 p-5 rounded-xl border border-white/10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-20"><ScanLine size={48} /></div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3"><Activity size={16} className="text-neon-blue"/> Your Health This Week</h4>
                      <p className="text-sm text-gray-200 mb-2">{insights.weeklySummary}</p>
                      <p className="text-xs text-gray-400 italic mb-4">Progress: {insights.progress}</p>
                      <div className="flex flex-wrap gap-2">
                         {insights.tips.map((tip, i) => (
                            <span key={i} className="text-xs px-3 py-1 bg-white/5 rounded-full border border-white/5 text-gray-300 flex items-center gap-1">
                               <Info size={10} className="text-neon-yellow"/> {tip}
                            </span>
                         ))}
                      </div>
                   </div>
                )}

                <div className="flex flex-col md:flex-row items-center gap-8">
                   <div className="w-full md:w-48 h-48 flex-shrink-0"><GaugeChart value={riskResult.numericScore} /></div>
                   <div className="flex-1 bg-white/5 p-5 rounded-xl border border-white/5">
                      <h4 className="text-xs text-neon-blue font-bold uppercase mb-2">Assessment</h4>
                      <p className="text-sm text-gray-200 leading-relaxed">{riskResult.summary}</p>
                      {statusMessage && isAnalyzing && <p className="text-xs text-neon-green mt-2 animate-pulse">{statusMessage}</p>}
                   </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="glass-card p-4 rounded-xl">
                      <h4 className="text-xs font-mono text-gray-500 uppercase mb-3 font-bold">Action Plan</h4>
                      <ul className="space-y-2">
                        {riskResult.actionItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-300"><span className="text-neon-green mt-1">✓</span> {item}</li>
                        ))}
                      </ul>
                   </div>
                   <div className="glass-card p-4 rounded-xl">
                      <h4 className="text-xs font-mono text-gray-500 uppercase mb-3 font-bold flex items-center gap-2"><ShieldCheck size={14} className="text-purple-400"/> Coding Pipeline</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-hide">
                        {riskResult.codingPipeline?.map((code, i) => (
                           <div key={i} className="flex justify-between items-center text-xs border-b border-white/5 pb-1 last:border-0">
                              <span className="text-gray-400 truncate max-w-[150px]" title={code.description}>{code.description}</span>
                              <span className="font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded">{code.code}</span>
                           </div>
                        ))}
                      </div>
                   </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-white/10 rounded-xl bg-black/20">
                <Activity size={48} className="mb-4 opacity-30" />
                <p className="font-medium text-lg text-gray-500">Awaiting Clinical Data</p>
                {statusMessage && isAnalyzing && <p className="text-xs text-neon-green mt-2 animate-pulse">{statusMessage}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EXTENDED PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
           <div className="glass-panel w-full max-w-4xl p-6 rounded-2xl border border-neon-blue/30 relative animate-in zoom-in-95 my-auto">
              <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><User className="text-neon-blue" size={20} /> Comprehensive Patient Profile</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                 {/* BASIC */}
                 <section className="space-y-4">
                    <h3 className="text-xs font-bold text-neon-green uppercase border-b border-white/10 pb-1">Basic Info</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="text-[10px] uppercase text-gray-500 font-bold">Name</label><input value={localProfile.name} onChange={e => setLocalProfile({...localProfile, name: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm" /></div>
                       <div><label className="text-[10px] uppercase text-gray-500 font-bold">Age</label><input type="number" value={localProfile.age} onChange={e => setLocalProfile({...localProfile, age: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm" /></div>
                       <div><label className="text-[10px] uppercase text-gray-500 font-bold">Gender</label><select value={localProfile.gender} onChange={e => setLocalProfile({...localProfile, gender: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm"><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select></div>
                       <div><label className="text-[10px] uppercase text-gray-500 font-bold">Blood Group</label><input value={localProfile.bloodGroup} onChange={e => setLocalProfile({...localProfile, bloodGroup: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm" /></div>
                    </div>
                 </section>

                 {/* EMERGENCY */}
                 <section className="space-y-4">
                    <h3 className="text-xs font-bold text-neon-red uppercase border-b border-white/10 pb-1 flex items-center gap-2"><Phone size={12}/> Emergency Contact</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="text-[10px] uppercase text-gray-500 font-bold">Contact Name</label><input value={localProfile.emergencyContactName} onChange={e => setLocalProfile({...localProfile, emergencyContactName: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm" /></div>
                       <div><label className="text-[10px] uppercase text-gray-500 font-bold">Relation</label><input value={localProfile.emergencyContactRelation} onChange={e => setLocalProfile({...localProfile, emergencyContactRelation: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm" /></div>
                       <div className="col-span-2"><label className="text-[10px] uppercase text-gray-500 font-bold">Phone Number</label><input value={localProfile.emergencyContactPhone} onChange={e => setLocalProfile({...localProfile, emergencyContactPhone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm" /></div>
                    </div>
                 </section>

                 {/* MEDICAL */}
                 <section className="space-y-4">
                    <h3 className="text-xs font-bold text-neon-blue uppercase border-b border-white/10 pb-1 flex items-center gap-2"><Stethoscope size={12}/> Medical History</h3>
                    <div><label className="text-[10px] uppercase text-gray-500 font-bold">Primary Condition</label><input value={localProfile.condition} onChange={e => setLocalProfile({...localProfile, condition: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm" /></div>
                    <div><label className="text-[10px] uppercase text-gray-500 font-bold">Past Conditions</label><textarea value={localProfile.history} onChange={e => setLocalProfile({...localProfile, history: e.target.value})} className="w-full h-16 bg-black/40 border border-white/10 rounded p-2 text-white text-sm resize-none" /></div>
                    <div><label className="text-[10px] uppercase text-gray-500 font-bold">Surgeries/Procedures</label><textarea value={localProfile.surgeries} onChange={e => setLocalProfile({...localProfile, surgeries: e.target.value})} className="w-full h-16 bg-black/40 border border-white/10 rounded p-2 text-white text-sm resize-none" /></div>
                    <div><label className="text-[10px] uppercase text-gray-500 font-bold">Allergies</label><textarea value={localProfile.allergies} onChange={e => setLocalProfile({...localProfile, allergies: e.target.value})} className="w-full h-16 bg-black/40 border border-white/10 rounded p-2 text-white text-sm resize-none" /></div>
                 </section>

                 {/* LIFESTYLE */}
                 <section className="space-y-4">
                    <h3 className="text-xs font-bold text-neon-yellow uppercase border-b border-white/10 pb-1 flex items-center gap-2"><Utensils size={12}/> Lifestyle</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="text-[10px] uppercase text-gray-500 font-bold">Diet</label><select value={localProfile.diet} onChange={e => setLocalProfile({...localProfile, diet: e.target.value as any})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm"><option>Omnivore</option><option>Vegetarian</option><option>Vegan</option><option>Keto</option><option>Other</option></select></div>
                       <div><label className="text-[10px] uppercase text-gray-500 font-bold">Exercise</label><select value={localProfile.exerciseFrequency} onChange={e => setLocalProfile({...localProfile, exerciseFrequency: e.target.value as any})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm"><option>Sedentary</option><option>Light</option><option>Moderate</option><option>Active</option></select></div>
                       <div><label className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1"><Cigarette size={10}/> Smoking</label><select value={localProfile.smokingStatus} onChange={e => setLocalProfile({...localProfile, smokingStatus: e.target.value as any})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm"><option>Never</option><option>Former</option><option>Current</option></select></div>
                       <div><label className="text-[10px] uppercase text-gray-500 font-bold">Alcohol</label><select value={localProfile.alcoholConsumption} onChange={e => setLocalProfile({...localProfile, alcoholConsumption: e.target.value as any})} className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm"><option>None</option><option>Occasional</option><option>Regular</option></select></div>
                    </div>
                    <div><label className="text-[10px] uppercase text-gray-500 font-bold">Family History</label><textarea value={localProfile.familyHistory} onChange={e => setLocalProfile({...localProfile, familyHistory: e.target.value})} className="w-full h-16 bg-black/40 border border-white/10 rounded p-2 text-white text-sm resize-none" /></div>
                 </section>
              </div>
              <div className="mt-6 flex justify-end">
                 <button onClick={saveProfile} className="bg-neon-blue text-black font-bold px-6 py-2 rounded-lg hover:bg-neon-blue/80 flex items-center gap-2"><Check size={16} /> Save Profile</button>
              </div>
           </div>
        </div>
      )}

      <ReportView profile={profile} vitals={vitals} riskResult={riskResult} chatHistory={chatHistory} chatSummary={chatSummary} medications={medications} />
    </div>
  );
};

export default Dashboard;