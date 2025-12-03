import React from 'react';
import { PatientProfile, ClinicalVitals, RiskAnalysisResult, ChatMessage, Medication } from '../types';
import { Activity, Pill, CheckCircle, ShieldCheck, Clipboard } from 'lucide-react';

interface PrintReportProps {
  profile: PatientProfile;
  vitals: ClinicalVitals;
  riskResult: RiskAnalysisResult | null;
  chatSummary: string;
  medications?: Medication[];
  chatHistory?: ChatMessage[];
}

const PrintReport: React.FC<PrintReportProps> = ({
  profile,
  vitals,
  riskResult,
  chatSummary,
  medications = [],
  chatHistory = []
}) => {
  return (
    <div className="w-full max-w-[210mm] mx-auto bg-white text-black font-sans leading-normal print:p-0">
      
      {/* HEADER */}
      <header className="flex justify-between items-start mb-8 border-b-4 border-black pb-6 pt-10 px-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
             <Activity className="text-black" size={32} strokeWidth={2.5} />
             SomAI <span className="text-gray-400 font-light">Report</span>
          </h1>
          <p className="text-gray-500 text-xs mt-1 font-bold tracking-[0.2em] uppercase">Patient Education & Clinical Risk Assessment</p>
        </div>
        <div className="text-right">
          <div className="inline-block bg-black text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest mb-2">Confidential</div>
          <p className="text-gray-900 font-mono text-sm font-bold">{new Date().toLocaleDateString()}</p>
          <p className="text-gray-400 text-xs font-mono">{new Date().toLocaleTimeString()}</p>
        </div>
      </header>

      <div className="px-10 pb-10 space-y-8">
          
          {/* SECTION 1: DEMOGRAPHICS & VITALS GRID */}
          <div className="grid grid-cols-12 gap-8 break-inside-avoid">
             {/* LEFT COL: DEMOGRAPHICS */}
             <div className="col-span-5">
                <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black border-b border-gray-200 pb-2 mb-4">
                    <span className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[8px]">1</span> 
                    Patient Demographics
                </h2>
                
                <div className="bg-gray-50 p-5 rounded-sm border border-gray-100 space-y-4">
                    <div>
                        <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider block mb-1">Name</span>
                        <span className="text-gray-900 font-bold text-lg leading-tight block">{profile.name}</span>
                    </div>
                    <div>
                        <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider block mb-1">Age</span>
                        <span className="text-gray-900 font-bold text-lg block">{profile.age} years</span>
                    </div>
                    <div>
                        <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider block mb-1">Condition</span>
                        <span className="text-gray-900 font-bold leading-tight block">{profile.condition}</span>
                    </div>
                </div>
             </div>

             {/* RIGHT COL: VITALS */}
             <div className="col-span-7">
                <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black border-b border-gray-200 pb-2 mb-4">
                    <span className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[8px]">2</span> 
                    Clinical Vitals
                </h2>
                
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center p-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Systolic BP</span>
                        <span className={`text-3xl font-black ${vitals.systolicBp > 140 ? 'text-red-600' : 'text-gray-900'}`}>{vitals.systolicBp}</span>
                        <span className="text-[10px] text-gray-400">mmHg</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center p-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Glucose</span>
                        <span className={`text-3xl font-black ${vitals.glucose > 180 ? 'text-red-600' : 'text-gray-900'}`}>{vitals.glucose}</span>
                        <span className="text-[10px] text-gray-400">mg/dL</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center p-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">SpO2</span>
                        <span className={`text-3xl font-black ${vitals.spo2 < 95 ? 'text-red-600' : 'text-green-600'}`}>{vitals.spo2}%</span>
                        <span className="text-[10px] text-gray-400">Saturation</span>
                    </div>
                    <div className="bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center text-center p-3">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Risk Score</span>
                        <span className={`text-3xl font-black ${riskResult && riskResult.numericScore > 60 ? 'text-red-600' : 'text-green-600'}`}>
                            {riskResult ? riskResult.numericScore : '--'}
                        </span>
                        <span className="text-[10px] text-gray-400">/100</span>
                    </div>
                </div>
             </div>
          </div>

          {/* SECTION 2: DETAILED HISTORY (Independent & Efficient) */}
          <div className="break-inside-avoid">
             <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black border-b border-gray-200 pb-2 mb-4">
                 <span className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[8px]">3</span> 
                 Detailed Patient History
             </h2>
             <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
                 <p className="text-sm text-gray-800 leading-relaxed text-justify">
                    {profile.history || "No detailed history recorded."}
                 </p>
             </div>
          </div>

          {/* SECTION 3: CLINICAL ANALYSIS */}
          <div className="break-inside-avoid">
             <header className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
                 <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black">
                    <span className="w-4 h-4 bg-black text-white flex items-center justify-center text-[8px]">4</span>
                    AI Clinical Analysis
                 </h2>
                 {riskResult?.source && (
                     <span className="text-[10px] font-mono uppercase bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-bold border border-gray-200">
                        {riskResult.source.toUpperCase()}
                     </span>
                 )}
             </header>

             {riskResult ? (
                 <div className="space-y-6">
                     {/* Summary */}
                     <div className="break-inside-avoid">
                        <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">Clinical Summary</h3>
                        <p className="text-sm text-gray-800 leading-relaxed font-medium bg-blue-50/50 p-4 rounded-lg border border-blue-100 text-justify">
                            {riskResult.summary}
                        </p>
                     </div>

                     {/* Action Items */}
                     <div className="break-inside-avoid">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Action Items</h3>
                        <div className="space-y-2">
                            {riskResult.actionItems.map((item, i) => (
                                <div key={i} className="flex gap-3 items-start p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                                    <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-gray-800 font-medium">{item}</p>
                                </div>
                            ))}
                        </div>
                     </div>

                     {/* Coding Pipeline */}
                     <div className="break-inside-avoid">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2"><ShieldCheck size={14}/> Coding Pipeline</h3>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-xs text-left">
                                 <thead className="bg-gray-50 text-gray-400 font-medium">
                                     <tr>
                                         <th className="px-3 py-2 w-20">Type</th>
                                         <th className="px-3 py-2 w-20">Code</th>
                                         <th className="px-3 py-2">Desc</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100">
                                     {riskResult.codingPipeline?.map((code, i) => (
                                         <tr key={i}>
                                             <td className="px-3 py-2 text-gray-500">{code.type}</td>
                                             <td className="px-3 py-2 font-bold font-mono text-blue-600">{code.code}</td>
                                             <td className="px-3 py-2 text-gray-800">{code.description}</td>
                                         </tr>
                                     ))}
                                 </tbody>
                            </table>
                        </div>
                     </div>

                     {/* Insurance Note */}
                     {riskResult.insuranceNote && (
                         <div className="mt-4 break-inside-avoid">
                            <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Insurance Note</span>
                            <p className="text-xs text-gray-500 italic border-l-2 border-gray-300 pl-3 py-1">
                                "{riskResult.insuranceNote}"
                            </p>
                         </div>
                     )}
                 </div>
             ) : (
                 <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-xl">
                     <p className="text-gray-400 italic text-sm">Analysis data not available.</p>
                 </div>
             )}
          </div>

          {/* SECTION 4: MEDICATIONS */}
          <div className="break-inside-avoid">
             <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black border-b border-gray-200 pb-2 mb-4">
                <span className="w-4 h-4 bg-black text-white flex items-center justify-center text-[8px]">5</span>
                Medication Schedule
             </h2>
             <div className="border border-gray-200 rounded-lg overflow-hidden">
                 <table className="w-full text-xs text-left">
                     <thead className="bg-gray-50 text-gray-400 font-bold uppercase tracking-wider">
                         <tr>
                             <th className="px-3 py-3">Medication</th>
                             <th className="px-3 py-3">Dosage</th>
                             <th className="px-3 py-3">Time</th>
                             <th className="px-3 py-3">Duration</th>
                             <th className="px-3 py-3 text-right">Status</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                         {medications.length > 0 ? medications.map((med) => (
                             <tr key={med.id}>
                                 <td className="px-3 py-3 font-bold text-gray-900">{med.name}</td>
                                 <td className="px-3 py-3 text-gray-600">{med.dosage}</td>
                                 <td className="px-3 py-3 font-mono text-gray-600">{med.time}</td>
                                 <td className="px-3 py-3 text-gray-500">{med.startDate ? `${med.startDate} → ${med.endDate || 'Ongoing'}` : 'Ongoing'}</td>
                                 <td className="px-3 py-3 text-right">
                                     <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${med.taken ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                         {med.taken ? <CheckCircle size={10}/> : null} {med.taken ? 'Taken' : 'Pending'}
                                     </span>
                                 </td>
                             </tr>
                         )) : (
                             <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400 italic">No medications recorded.</td></tr>
                         )}
                     </tbody>
                 </table>
             </div>
          </div>

          {/* SECTION 5: CONSULTATION BRIEF */}
          <div className="break-inside-avoid">
             <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-black border-b border-gray-200 pb-2 mb-4">
                <span className="w-4 h-4 bg-black text-white flex items-center justify-center text-[8px]">6</span>
                Consultation Brief
             </h2>

             {chatSummary ? (
                 <div className="bg-yellow-50/30 p-6 rounded-xl border border-yellow-100">
                     <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap font-medium text-sm">
                         {chatSummary}
                     </div>
                 </div>
             ) : (
                 <div className="flex items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-xl">
                     <p className="text-gray-400 italic text-sm">Consultation brief not generated.</p>
                 </div>
             )}
          </div>

          {/* FOOTER */}
          <div className="pt-8 border-t-2 border-black break-inside-avoid">
             <div className="flex justify-between items-end">
                 <div className="max-w-[70%]">
                     <p className="font-black text-gray-900 text-[10px] uppercase tracking-widest mb-1">Disclaimer</p>
                     <p className="text-[10px] text-gray-500 leading-tight text-justify">
                         This report is generated by an AI assistant for educational purposes only. It is not a medical device. 
                         Always consult a qualified healthcare provider for diagnosis and treatment. The information provided 
                         is based on the inputs provided during the session.
                     </p>
                 </div>
                 <div className="text-right">
                     <p className="font-black text-gray-900 text-sm">SomAI</p>
                     <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Powered by Gemini</p>
                 </div>
             </div>
          </div>
      </div>
    </div>
  );
};

export default PrintReport;