
import React from 'react';
import { PatientProfile, ClinicalVitals, RiskAnalysisResult, ChatMessage, Medication } from '../types';
import { Activity, Pill, AlertTriangle, CheckCircle, MessageSquare, ClipboardList, User, ShieldCheck } from 'lucide-react';

interface PrintReportProps {
  profile: PatientProfile;
  vitals: ClinicalVitals;
  riskResult: RiskAnalysisResult | null;
  chatHistory: ChatMessage[];
  chatSummary: string;
  medications?: Medication[];
}

const PrintReport: React.FC<PrintReportProps> = ({
  profile,
  vitals,
  riskResult,
  chatHistory,
  chatSummary,
  medications = []
}) => {
  return (
    <div className="p-8 max-w-[210mm] mx-auto bg-white text-black font-sans leading-normal">
      {/* Header */}
      <header className="flex justify-between items-start border-b-4 border-black pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-black text-black tracking-tight flex items-center gap-3">
             <Activity className="text-black" size={32} />
             SomAI <span className="text-gray-400 font-light">Report</span>
          </h1>
          <p className="text-gray-600 text-sm mt-1 font-medium tracking-wide uppercase">Patient Education & Clinical Risk Assessment</p>
        </div>
        <div className="text-right">
          <div className="inline-block bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-wider mb-2">Confidential</div>
          <p className="text-gray-900 font-mono text-sm">{new Date().toLocaleDateString()}</p>
          <p className="text-gray-500 text-xs">{new Date().toLocaleTimeString()}</p>
        </div>
      </header>

      {/* Patient Profile & Vitals Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Patient Info */}
        <section className="break-inside-avoid">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black border-b border-gray-200 pb-2 mb-4">
            <User size={16} /> Patient Demographics
          </h2>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
            <div className="grid grid-cols-3 text-sm">
              <span className="text-gray-500 font-medium">Name</span>
              <span className="col-span-2 font-bold text-gray-900">{profile.name}</span>
            </div>
            <div className="grid grid-cols-3 text-sm">
              <span className="text-gray-500 font-medium">Age</span>
              <span className="col-span-2 font-bold text-gray-900">{profile.age} years</span>
            </div>
            <div className="grid grid-cols-3 text-sm">
              <span className="text-gray-500 font-medium">Condition</span>
              <span className="col-span-2 font-bold text-gray-900">{profile.condition}</span>
            </div>
            <div className="grid grid-cols-3 text-sm">
              <span className="text-gray-500 font-medium">Allergies</span>
              <span className="col-span-2 font-bold text-red-600">{profile.allergies}</span>
            </div>
            <div className="pt-2 border-t border-gray-200 mt-2">
              <span className="block text-xs font-bold text-gray-400 uppercase mb-1">History</span>
              <p className="text-sm text-gray-700 leading-snug">{profile.history}</p>
            </div>
          </div>
        </section>

        {/* Clinical Snapshot */}
        <section className="break-inside-avoid">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black border-b border-gray-200 pb-2 mb-4">
            <Activity size={16} /> Clinical Vitals
          </h2>
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col items-center justify-center text-center">
               <span className="text-[10px] font-bold text-gray-400 uppercase">Systolic BP</span>
               <span className={`text-2xl font-black ${vitals.systolicBp > 140 ? 'text-red-600' : 'text-gray-900'}`}>{vitals.systolicBp}</span>
               <span className="text-[10px] text-gray-500">mmHg</span>
             </div>
             <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col items-center justify-center text-center">
               <span className="text-[10px] font-bold text-gray-400 uppercase">Glucose</span>
               <span className={`text-2xl font-black ${vitals.glucose > 180 ? 'text-red-600' : 'text-gray-900'}`}>{vitals.glucose}</span>
               <span className="text-[10px] text-gray-500">mg/dL</span>
             </div>
             <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col items-center justify-center text-center">
               <span className="text-[10px] font-bold text-gray-400 uppercase">Sleep Quality</span>
               <span className="text-2xl font-black text-gray-900">{vitals.sleepQuality}<span className="text-sm text-gray-400">/10</span></span>
             </div>
             <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col items-center justify-center text-center">
               <span className="text-[10px] font-bold text-gray-400 uppercase">Risk Score</span>
               <span className={`text-2xl font-black ${riskResult && riskResult.numericScore > 60 ? 'text-red-600' : 'text-green-600'}`}>
                 {riskResult ? riskResult.numericScore : '--'}
               </span>
               <span className="text-[10px] text-gray-500">/100</span>
             </div>
          </div>
        </section>
      </div>

      {/* AI Analysis */}
      <section className="mb-8 break-inside-avoid">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black border-b border-gray-200 pb-2 mb-4">
          <AlertTriangle size={16} /> AI Clinical Analysis
        </h2>
        {riskResult ? (
          <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-6">
             <div className="mb-6">
                <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2">Clinical Summary</h3>
                <p className="text-sm text-blue-950 leading-relaxed font-medium">{riskResult.summary}</p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Action Items</h3>
                   <ul className="space-y-2">
                      {riskResult.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                           <CheckCircle size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                           {item}
                        </li>
                      ))}
                   </ul>
                </div>
                {/* Medical Coding Table */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                   <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                      <ShieldCheck size={14} /> Coding Pipeline
                   </div>
                   <table className="w-full text-xs text-left">
                     <thead>
                       <tr className="bg-gray-50 text-gray-400">
                         <th className="px-3 py-1 font-medium">Type</th>
                         <th className="px-3 py-1 font-medium">Code</th>
                         <th className="px-3 py-1 font-medium">Desc</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {riskResult.codingPipeline?.map((code, i) => (
                         <tr key={i}>
                           <td className="px-3 py-1.5 text-gray-500">{code.type}</td>
                           <td className="px-3 py-1.5 font-bold font-mono text-blue-600">{code.code}</td>
                           <td className="px-3 py-1.5 text-gray-800">{code.description}</td>
                         </tr>
                       ))}
                       {(!riskResult.codingPipeline || riskResult.codingPipeline.length === 0) && (
                         <tr><td colSpan={3} className="px-3 py-2 text-gray-400 italic">No codes generated.</td></tr>
                       )}
                     </tbody>
                   </table>
                   {riskResult.insuranceNote && (
                     <div className="p-3 bg-gray-50 border-t border-gray-200">
                       <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Insurance Note</p>
                       <p className="text-xs text-gray-600 italic">"{riskResult.insuranceNote}"</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        ) : (
          <div className="bg-gray-100 p-6 rounded-lg border-2 border-dashed border-gray-300 text-center">
             <p className="text-gray-600 font-bold text-sm">Analysis Not Run</p>
             <p className="text-gray-500 text-xs">Run analysis in dashboard before printing.</p>
          </div>
        )}
      </section>

      {/* Medication Adherence */}
      <section className="mb-8 break-inside-avoid">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black border-b border-gray-200 pb-2 mb-4">
          <Pill size={16} /> Medication Schedule
        </h2>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Medication</th>
                <th className="px-4 py-3">Dosage</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
               {medications.length > 0 ? medications.map(med => (
                 <tr key={med.id}>
                   <td className="px-4 py-3 font-bold text-gray-900">{med.name}</td>
                   <td className="px-4 py-3 text-gray-600">{med.dosage}</td>
                   <td className="px-4 py-3 font-mono text-gray-600">{med.time}</td>
                   <td className="px-4 py-3 text-gray-500 text-xs">
                     {med.startDate ? `${med.startDate} → ${med.endDate || 'Ongoing'}` : 'Continuous'}
                   </td>
                   <td className="px-4 py-3 text-right">
                     {med.taken ? (
                       <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">
                         <CheckCircle size={10} /> Taken
                       </span>
                     ) : (
                       <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                         Pending
                       </span>
                     )}
                   </td>
                 </tr>
               )) : (
                 <tr>
                   <td colSpan={5} className="px-4 py-6 text-center text-gray-500 italic">No medications recorded.</td>
                 </tr>
               )}
            </tbody>
          </table>
          {medications.length > 0 && (
             <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase">Current Streak</span>
                <span className="text-lg font-black text-gray-900">{profile.streak} Days</span>
             </div>
          )}
        </div>
      </section>

      {/* Chat Summary */}
      <section className="mb-8 break-inside-avoid">
         <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black border-b border-gray-200 pb-2 mb-4">
           <ClipboardList size={16} /> Consultation Brief
         </h2>
         <div className="bg-yellow-50/50 p-6 rounded-xl border border-yellow-100">
           {chatSummary ? (
             <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-medium">{chatSummary}</p>
           ) : (
             <p className="text-gray-500 italic text-sm">No session summary available.</p>
           )}
         </div>
      </section>

      {/* Full Transcript */}
      <section>
         <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-black border-b border-gray-200 pb-2 mb-4">
           <MessageSquare size={16} /> Conversation Transcript
         </h2>
         <div className="space-y-1">
            {chatHistory.map((m) => (
               <div key={m.id} className="grid grid-cols-12 gap-4 py-2 border-b border-gray-100 break-inside-avoid text-xs">
                  <div className="col-span-2 font-bold text-gray-500 uppercase tracking-wider pt-1">
                    {m.role === 'user' ? 'Patient' : 'SomAI'}
                  </div>
                  <div className="col-span-10 text-gray-800 leading-relaxed">
                    {m.image && <div className="text-[10px] text-blue-600 mb-1 font-bold">[Image Attachment]</div>}
                    {m.text}
                  </div>
               </div>
            ))}
            {chatHistory.length === 0 && <p className="text-gray-400 italic text-xs">No messages logged.</p>}
         </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t-2 border-gray-900 flex justify-between items-center text-[10px] text-gray-500 break-inside-avoid">
        <div className="max-w-[60%]">
          <p className="font-bold text-gray-900 mb-1 uppercase tracking-wider">Disclaimer</p>
          <p>This report is generated by an AI assistant for educational purposes only. It is not a medical device. Always consult a qualified healthcare provider for diagnosis and treatment.</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900">SomAI</p>
          <p>Powered by Google Gemini</p>
        </div>
      </footer>
    </div>
  );
};

export default PrintReport;
