
import React from 'react';
import { Activity, HeartPulse, FileText, ShieldCheck } from 'lucide-react';
import { ClinicalVitals, RiskAnalysisResult, PatientProfile, Medication, ChatMessage } from '../types';
import GaugeChart from './GaugeChart';
import ReportView from './ReportView';

interface DashboardProps {
  vitals: ClinicalVitals;
  setVitals: React.Dispatch<React.SetStateAction<ClinicalVitals>>;
  riskResult: RiskAnalysisResult | null;
  chatSummary: string;
  handleRunAnalysis: () => void;
  isAnalyzing: boolean;
  onPrint: () => void;
  // New props for full report
  profile: PatientProfile;
  medications: Medication[];
  chatHistory: ChatMessage[];
}

const Dashboard: React.FC<DashboardProps> = ({ 
  vitals, 
  setVitals, 
  riskResult,
  chatSummary,
  handleRunAnalysis, 
  isAnalyzing,
  onPrint,
  profile,
  medications,
  chatHistory
}) => {
  const handleVitalChange = (key: keyof ClinicalVitals, val: number) => {
    setVitals(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* LEFT COLUMN: CONTROLS */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border-t border-neon-green">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-white">
              <Activity className="text-neon-green" size={20} /> Clinical Vitals Input
            </h2>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400 font-medium">Systolic BP</span>
                  <span className="font-mono text-neon-green font-bold">{vitals.systolicBp} mmHg</span>
                </div>
                <input 
                  type="range" min="90" max="200" 
                  value={vitals.systolicBp}
                  onChange={e => handleVitalChange('systolicBp', parseInt(e.target.value))}
                  className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-neon-green"
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400 font-medium">Glucose</span>
                  <span className="font-mono text-neon-yellow font-bold">{vitals.glucose} mg/dL</span>
                </div>
                <input 
                  type="range" min="70" max="300" 
                  value={vitals.glucose}
                  onChange={e => handleVitalChange('glucose', parseInt(e.target.value))}
                  className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-neon-yellow"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400 font-medium">Sleep Quality</span>
                  <span className="font-mono text-neon-blue font-bold">{vitals.sleepQuality}/10</span>
                </div>
                <input 
                  type="range" min="0" max="10" 
                  value={vitals.sleepQuality}
                  onChange={e => handleVitalChange('sleepQuality', parseInt(e.target.value))}
                  className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-neon-blue"
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400 font-medium">Missed Doses (7d)</span>
                  <span className="font-mono text-neon-red font-bold">{vitals.missedDoses}</span>
                </div>
                <input 
                  type="range" min="0" max="14" 
                  value={vitals.missedDoses}
                  onChange={e => handleVitalChange('missedDoses', parseInt(e.target.value))}
                  className="w-full h-2 bg-black rounded-lg appearance-none cursor-pointer accent-neon-red"
                />
              </div>

              <button 
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="w-full mt-4 bg-neon-green hover:bg-neon-green/90 text-black py-4 rounded-xl font-mono font-bold transition-all flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(0,255,128,0.2)] disabled:opacity-50"
              >
                {isAnalyzing ? <span className="animate-spin">⏳</span> : <HeartPulse size={20} />}
                {isAnalyzing ? 'PROCESSING...' : 'RUN ANALYSIS'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ANALYSIS */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl min-h-[500px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">SomAI Analysis</h3>
              <button 
                onClick={onPrint}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all border border-white/10 text-gray-300 hover:text-white hover:border-white/30 bg-white/5"
              >
                <FileText size={14} />
                EXPORT PDF
              </button>
            </div>
            
            {riskResult ? (
              <div className="flex flex-col gap-6 animate-in fade-in">
                <div className="flex flex-col md:flex-row items-center gap-6">
                   <div className="w-full md:w-56">
                      <GaugeChart value={riskResult.numericScore} />
                   </div>
                   <div className="flex-1">
                      <h4 className="text-xs text-neon-blue font-bold uppercase mb-2">Clinical Summary</h4>
                      <p className="text-base text-gray-200 leading-relaxed">{riskResult.summary}</p>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="glass-card p-4 rounded-xl">
                      <h4 className="text-xs font-mono text-gray-500 uppercase mb-3 font-bold">Recommended Actions</h4>
                      <ul className="space-y-2">
                        {riskResult.actionItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                            <span className="text-neon-green mt-1">✓</span> {item}
                          </li>
                        ))}
                      </ul>
                   </div>
                   <div className="glass-card p-4 rounded-xl">
                      <h4 className="text-xs font-mono text-gray-500 uppercase mb-3 font-bold flex items-center gap-2">
                         <ShieldCheck size={14} className="text-purple-400"/> Medical Coding Pipeline
                      </h4>
                      <div className="space-y-2">
                        {riskResult.codingPipeline?.map((code, i) => (
                           <div key={i} className="flex justify-between items-center text-xs border-b border-white/5 pb-1 last:border-0">
                              <span className="text-gray-400">{code.description}</span>
                              <span className="font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded">{code.code}</span>
                           </div>
                        ))}
                        {(!riskResult.codingPipeline || riskResult.codingPipeline.length === 0) && (
                           <div className="flex flex-wrap gap-2">
                             {riskResult.icd10Codes.map((code, i) => (
                               <span key={i} className="px-2 py-1 bg-white/5 rounded text-xs text-purple-300 font-mono">
                                 {code}
                               </span>
                             ))}
                           </div>
                        )}
                      </div>
                      {riskResult.insuranceNote && (
                         <div className="mt-3 pt-3 border-t border-white/5">
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Insurance Justification</p>
                            <p className="text-xs text-gray-300 italic">"{riskResult.insuranceNote}"</p>
                         </div>
                      )}
                   </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-white/10 rounded-xl">
                <Activity size={48} className="mb-4 opacity-30" />
                <p className="font-medium text-lg text-gray-500">Awaiting Clinical Data</p>
                <p className="text-sm mt-2 opacity-50">Input vitals on the left to generate analysis</p>
              </div>
            )}
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

export default Dashboard;
