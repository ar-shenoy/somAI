
import React from 'react';
import { PatientProfile, ClinicalVitals, RiskAnalysisResult, ChatMessage, Medication } from '../types';
import { FileText, User, Activity, Pill, MessageSquare, ShieldCheck } from 'lucide-react';

interface ReportViewProps {
  profile: PatientProfile;
  vitals: ClinicalVitals;
  riskResult: RiskAnalysisResult | null;
  chatHistory: ChatMessage[];
  chatSummary: string;
  medications: Medication[];
}

const ReportView: React.FC<ReportViewProps> = ({
  profile,
  vitals,
  riskResult,
  chatHistory,
  chatSummary,
  medications
}) => {
  return (
    <div className="space-y-6 mt-12 pt-8 border-t border-white/10">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="text-neon-green" /> Full Clinical Report
        </h2>

        <div className="glass-panel p-6 rounded-2xl space-y-8">
            {/* Demographics */}
            <section>
                <h3 className="text-sm font-mono font-bold text-gray-400 uppercase mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
                    <User size={16} /> Patient Demographics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-gray-500 block text-xs uppercase tracking-wide">Name</span><span className="text-white">{profile.name}</span></div>
                    <div><span className="text-gray-500 block text-xs uppercase tracking-wide">Age</span><span className="text-white">{profile.age}</span></div>
                    <div className="col-span-2"><span className="text-gray-500 block text-xs uppercase tracking-wide">Condition</span><span className="text-white">{profile.condition}</span></div>
                    <div className="col-span-4"><span className="text-gray-500 block text-xs uppercase tracking-wide">Medical History</span><span className="text-white">{profile.history || 'N/A'}</span></div>
                </div>
            </section>

            {/* Vitals & Risk */}
            <section>
                <h3 className="text-sm font-mono font-bold text-gray-400 uppercase mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
                    <Activity size={16} /> Clinical Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                     <div className="bg-white/5 p-3 rounded-lg text-center border border-white/5">
                        <span className="text-gray-500 text-xs block">Systolic BP</span>
                        <span className="font-mono font-bold text-neon-green text-lg">{vitals.systolicBp}</span>
                     </div>
                     <div className="bg-white/5 p-3 rounded-lg text-center border border-white/5">
                        <span className="text-gray-500 text-xs block">Glucose</span>
                        <span className="font-mono font-bold text-neon-yellow text-lg">{vitals.glucose}</span>
                     </div>
                     <div className="bg-white/5 p-3 rounded-lg text-center border border-white/5">
                        <span className="text-gray-500 text-xs block">Risk Score</span>
                        <span className="font-mono font-bold text-neon-red text-lg">{riskResult?.numericScore ?? 'N/A'}</span>
                     </div>
                </div>
                {riskResult ? (
                    <div className="space-y-4">
                        <div className="text-sm text-gray-300 bg-black/20 p-4 rounded-lg border border-white/5">
                            <p><strong className="text-neon-blue font-mono text-xs uppercase block mb-1">Summary</strong> {riskResult.summary}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              <div>
                                  <strong className="text-neon-green font-mono text-xs uppercase block mb-1">Recommended Actions</strong>
                                  <ul className="list-disc list-inside text-gray-400">
                                    {riskResult.actionItems.map((item, idx) => <li key={idx}>{item}</li>)}
                                  </ul>
                              </div>
                            </div>
                        </div>

                        {/* Medical Coding Pipeline Table */}
                        <div className="bg-black/20 rounded-lg border border-white/5 overflow-hidden">
                           <div className="px-4 py-2 bg-purple-500/10 border-b border-white/5 flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wide">
                              <ShieldCheck size={14} /> Insurance & Coding Pipeline
                           </div>
                           <table className="w-full text-xs text-left">
                              <thead className="text-gray-500 border-b border-white/5">
                                 <tr>
                                    <th className="px-4 py-2">Diagnosis Type</th>
                                    <th className="px-4 py-2">ICD-10 Code</th>
                                    <th className="px-4 py-2">Description</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5 text-gray-300">
                                 {riskResult.codingPipeline?.map((code, idx) => (
                                    <tr key={idx} className="hover:bg-white/5">
                                       <td className="px-4 py-2 text-gray-400">{code.type}</td>
                                       <td className="px-4 py-2 font-mono text-purple-400 font-bold">{code.code}</td>
                                       <td className="px-4 py-2">{code.description}</td>
                                    </tr>
                                 ))}
                                 {(!riskResult.codingPipeline || riskResult.codingPipeline.length === 0) && (
                                     <tr>
                                        <td colSpan={3} className="px-4 py-2 italic text-gray-500">Pipeline empty. Run analysis to generate.</td>
                                     </tr>
                                 )}
                              </tbody>
                           </table>
                           {riskResult.insuranceNote && (
                              <div className="px-4 py-2 border-t border-white/5 bg-white/5">
                                 <p className="text-[10px] text-gray-500 uppercase font-bold">Medical Necessity Note</p>
                                 <p className="text-xs text-gray-300 italic">{riskResult.insuranceNote}</p>
                              </div>
                           )}
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm italic">Analysis not yet performed.</p>
                )}
            </section>

             {/* Meds */}
            <section>
                <h3 className="text-sm font-mono font-bold text-gray-400 uppercase mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
                    <Pill size={16} /> Medication Schedule
                </h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {medications.length > 0 ? medications.map(med => (
                        <li key={med.id} className="flex justify-between items-center text-sm bg-white/5 p-3 rounded-lg border border-white/5">
                            <div>
                               <span className="font-bold text-white block">{med.name}</span>
                               <span className="text-xs text-gray-500">{med.dosage} • {med.time}</span>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${med.taken ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                               {med.taken ? 'Taken' : 'Pending'}
                            </span>
                        </li>
                    )) : <li className="text-gray-500 text-sm italic">No medications recorded.</li>}
                </ul>
            </section>

            {/* Chat Summary */}
            <section>
                <h3 className="text-sm font-mono font-bold text-gray-400 uppercase mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
                    <MessageSquare size={16} /> Consultation Brief
                </h3>
                {chatSummary ? (
                   <div className="bg-black/20 p-4 rounded-lg border border-white/5">
                      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {chatSummary}
                      </p>
                   </div>
                ) : (
                   <p className="text-gray-500 text-sm italic">No consultation summary available.</p>
                )}
            </section>
        </div>
    </div>
  );
};

export default ReportView;
