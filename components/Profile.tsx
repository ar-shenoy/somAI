import React, { useState } from 'react';
import { Save, Check, FileText } from 'lucide-react';
import { PatientProfile, RiskAnalysisResult, ClinicalVitals, ChatMessage, Medication } from '../types';
import ReportView from './ReportView';

interface ProfileProps {
  profile: PatientProfile;
  setProfile: React.Dispatch<React.SetStateAction<PatientProfile>>;
  onProfileUpdate?: () => void;
  riskResult: RiskAnalysisResult | null;
  chatSummary: string;
  onPrint: () => void;
  // New props for full report
  vitals: ClinicalVitals;
  medications: Medication[];
  chatHistory: ChatMessage[];
}

const Profile: React.FC<ProfileProps> = ({ 
  profile, 
  setProfile, 
  onProfileUpdate,
  riskResult,
  chatSummary,
  onPrint,
  vitals,
  medications,
  chatHistory
}) => {
  const [isSaved, setIsSaved] = useState(false);

  const handleChange = (field: keyof PatientProfile, value: string | number) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setIsSaved(false); 
  };

  const handleManualSave = () => {
    try {
      localStorage.setItem('somai_profile', JSON.stringify(profile));
    } catch(e) {
      console.error("Failed to save profile:", e)
    }
    
    if (onProfileUpdate) {
      onProfileUpdate();
    }

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <div className="flex justify-between items-center mb-2">
          <div>
             <h2 className="text-2xl font-bold text-white mb-1">Patient Identity</h2>
             <p className="text-gray-400 text-sm">Manage core patient demographics and history.</p>
          </div>
          <button 
              onClick={onPrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all border border-white/10 text-gray-300 hover:text-white hover:border-white/30 bg-white/5"
            >
              <FileText size={14} />
              EXPORT PDF
            </button>
        </div>

        <div className="glass-panel p-8 rounded-2xl border-t border-neon-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-gray-500 mb-2 uppercase tracking-wider">Full Name</label>
                <input 
                  value={profile.name}
                  onChange={e => handleChange('name', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-white placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all"
                  placeholder="Enter patient name"
                />
              </div>
              
              <div>
                <label className="block text-xs font-mono font-bold text-gray-500 mb-2 uppercase tracking-wider">Age</label>
                <input 
                  type="number"
                  value={profile.age}
                  onChange={e => handleChange('age', parseInt(e.target.value) || 0)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-white placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-gray-500 mb-2 uppercase tracking-wider">Primary Condition</label>
                <input 
                  value={profile.condition}
                  onChange={e => handleChange('condition', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-white placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all"
                  placeholder="e.g. Type 2 Diabetes"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-gray-500 mb-2 uppercase tracking-wider">Medical History</label>
                <textarea 
                  value={profile.history}
                  onChange={e => handleChange('history', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-white placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all h-32 resize-none"
                  placeholder="Brief medical history..."
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold text-gray-500 mb-2 uppercase tracking-wider">Allergies & Sensitivities</label>
                <textarea 
                  value={profile.allergies}
                  onChange={e => handleChange('allergies', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-white placeholder-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all h-32 resize-none"
                  placeholder="e.g. Penicillin, Peanuts, Latex"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end pt-6 border-t border-white/5">
            <button 
              type="button"
              onClick={handleManualSave}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-mono font-bold transition-all ${
                isSaved 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                  : 'bg-neon-green text-black hover:bg-neon-green/90 shadow-[0_0_15px_rgba(0,255,128,0.3)]'
              }`}
            >
              {isSaved ? <Check size={18} /> : <Save size={18} />}
              {isSaved ? 'PROFILE SAVED' : 'SAVE CHANGES'}
            </button>
          </div>
        </div>
      </div>

       {/* FULL REPORT PREVIEW SECTION */}
       <ReportView 
        profile={profile}
        vitals={vitals}
        riskResult={riskResult}
        chatHistory={chatHistory}
        chatSummary={chatSummary}
        medications={medications}
      />
    </div>
  );
};

export default Profile;