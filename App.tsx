import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, Trash2, MessageSquare, FileText, Download } from 'lucide-react';
import { 
  PatientProfile, 
  ClinicalVitals, 
  INITIAL_PROFILE, 
  INITIAL_VITALS, 
  AppMode, 
  RiskAnalysisResult,
  ChatMessage,
  Medication,
  HealthInsights,
  ChatSession
} from './types';
import { analyzeRisk, generateChatResponse, summarizeConversation, generateHealthInsights, wakeUpBackend, generateSessionName } from './services/geminiService';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Chat from './components/Chat';
import PrintReport from './components/PrintReport';
import MedicationTracker from './components/MedicationTracker';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'medication'>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  
  // --- STATE ---
  const [profile, setProfile] = useState<PatientProfile>(() => {
    try { return JSON.parse(localStorage.getItem('somai_profile') || '') || INITIAL_PROFILE; } catch { return INITIAL_PROFILE; }
  });

  const [medications, setMedications] = useState<Medication[]>(() => {
    try { return JSON.parse(localStorage.getItem('somai_medications') || '') || []; } catch { return []; }
  });

  // Chat Sessions State
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try { 
      const stored = localStorage.getItem('somai_chat_sessions');
      if (stored) return JSON.parse(stored);
      
      const legacyHistory = localStorage.getItem('somai_chat_history');
      if (legacyHistory) {
        const history = JSON.parse(legacyHistory);
        if (history.length > 0) {
          return [{
            id: Date.now().toString(),
            name: 'Previous Session',
            messages: history,
            createdAt: Date.now(),
            lastModified: Date.now()
          }];
        }
      }
      return [];
    } catch { return []; }
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  const [vitals, setVitals] = useState<ClinicalVitals>(INITIAL_VITALS);
  const [riskResult, setRiskResult] = useState<RiskAnalysisResult | null>(null);
  const [insights, setInsights] = useState<HealthInsights | null>(null);
  const [chatSummary, setChatSummary] = useState('');
  const [mode, setMode] = useState<AppMode>(AppMode.GENERAL);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // --- GLOBAL STATUS MESSAGE (For Transparency) ---
  const [statusMessage, setStatusMessage] = useState('');

  // --- EFFECTS ---
  useEffect(() => { wakeUpBackend(); }, []);

  // Ensure there's always at least one session
  useEffect(() => {
    if (sessions.length === 0) {
      const newId = Date.now().toString();
      const newSession: ChatSession = { id: newId, name: 'New Consultation', messages: [], createdAt: Date.now(), lastModified: Date.now() };
      setSessions([newSession]);
      setCurrentSessionId(newId);
    } else if (!currentSessionId || !sessions.find(s => s.id === currentSessionId)) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [sessions, currentSessionId]);

  useEffect(() => {
    const checkStreak = () => {
      const last = new Date(profile.lastStreakUpdate);
      const today = new Date();
      last.setHours(0,0,0,0); today.setHours(0,0,0,0);
      const diff = Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      if (diff > 1 && profile.streak > 0) setProfile(p => ({ ...p, streak: 0 }));
    };
    checkStreak();
  }, []);

  useEffect(() => localStorage.setItem('somai_profile', JSON.stringify(profile)), [profile]);
  useEffect(() => localStorage.setItem('somai_medications', JSON.stringify(medications)), [medications]);
  useEffect(() => localStorage.setItem('somai_chat_sessions', JSON.stringify(sessions)), [sessions]);

  // Derived BP Sync
  useEffect(() => {
    const m = Number(vitals.systolicBpMorning) || 0;
    const e = Number(vitals.systolicBpEvening) || 0;
    const avg = (m > 0 && e > 0) ? Math.round((m + e) / 2) : Math.max(m, e);
    
    if (avg !== vitals.systolicBp) {
        setVitals(v => ({ ...v, systolicBp: avg }));
    }
  }, [vitals.systolicBpMorning, vitals.systolicBpEvening]);

  // --- LOGIC ---
  const activeSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const chatHistory = activeSession?.messages || [];

  const createNewSession = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      name: `Consultation ${new Date().toLocaleDateString()}`,
      messages: [],
      createdAt: Date.now(),
      lastModified: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
  };

  const deleteSession = (id: string) => {
    if (sessions.length <= 1) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, messages: [], name: 'New Consultation' } : s));
      return;
    }
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) {
      setCurrentSessionId(newSessions[0].id);
    }
  };

  const renameSession = (id: string, newName: string) => {
    setSessions(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  const calculateRiskScore = (): number => {
    let score = 10;
    const bpM = Number(vitals.systolicBpMorning) || 0;
    const bpE = Number(vitals.systolicBpEvening) || 0;
    const maxBp = Math.max(bpM, bpE);
    
    const gluc = Number(vitals.glucose) || 0;
    const spo2 = Number(vitals.spo2) || 98;
    const hr = Number(vitals.heartRate) || 72;
    const temp = Number(vitals.temperature) || 98.6;

    if (maxBp >= 180) score += 50; else if (maxBp >= 140) score += 25; else if (maxBp >= 130) score += 10;
    if (gluc >= 250) score += 40; else if (gluc >= 180) score += 20; 
    
    if (spo2 < 90) score += 30; else if (spo2 < 95) score += 15;

    if (hr > 100 || hr < 50) score += 15;
    if (temp > 99.5) score += 20;
    if (vitals.missedDoses > 0) score += (vitals.missedDoses * 5); 

    if (profile.smokingStatus === 'Current') score += 15;
    if (profile.exerciseFrequency === 'Sedentary') score += 10;

    return Math.min(Math.max(Math.round(score), 1), 100);
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setStatusMessage("Analyzing Vitals...");
    try {
      const score = calculateRiskScore();
      const [rResult, iResult] = await Promise.all([
        analyzeRisk(profile, vitals, score, setStatusMessage),
        generateHealthInsights(profile, vitals)
      ]);
      setRiskResult(rResult);
      setInsights(iResult);
      setProfile(p => ({ ...p, lastCheckup: new Date().toISOString() }));
    } catch (e) {
      alert("Analysis failed. Please check connection.");
    } finally {
      setIsAnalyzing(false);
      setStatusMessage('');
    }
  };

  const handleSendMessage = async (input: string, image?: string) => {
    if (!input.trim() && !image) return;
    
    const newUserMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now(), image };
    const updatedMessages = [...chatHistory, newUserMsg];
    
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId 
      ? { ...s, messages: updatedMessages, lastModified: Date.now() } 
      : s
    ));

    setIsProcessing(true);
    setStatusMessage("Thinking...");

    try {
      let activeSource = '';
      
      const responseText = await generateChatResponse(
        updatedMessages, 
        input, 
        image, 
        profile, 
        mode,
        (source) => { activeSource = source; },
        setStatusMessage
      );

      const aiMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: responseText, 
        timestamp: Date.now(),
        modelUsed: activeSource
      };

      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
        ? { ...s, messages: [...updatedMessages, aiMsg], lastModified: Date.now() } 
        : s
      ));

      if (updatedMessages.length === 1) {
         generateSessionName(input, responseText).then(newName => {
            setSessions(prev => prev.map(s => 
               s.id === currentSessionId ? { ...s, name: newName } : s
            ));
         });
      }

    } catch (e) { 
      console.error(e); 
    } finally { 
      setIsProcessing(false); 
      setStatusMessage('');
    }
  };

  const handleSummarizeChat = async () => {
    if (chatHistory.length === 0) return;
    setIsSummarizing(true);
    try { setChatSummary(await summarizeConversation(chatHistory)); } catch (e) { console.error(e); } finally { setIsSummarizing(false); }
  };

  const handlePrintReport = () => window.print();
  const handleResetData = () => { if(confirm('Reset all data?')) { localStorage.clear(); window.location.reload(); } };

  const handleExportData = () => {
     const data = { profile, medications, sessions, vitals, riskResult };
     const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `somai_backup_${new Date().toISOString().split('T')[0]}.json`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
  };

  const printableRoot = document.getElementById('printable-root');

  return (
    <div className="min-h-screen bg-black text-white selection:bg-neon-green selection:text-black font-sans overflow-x-hidden flex flex-col md:block">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div className="md:hidden p-4 border-b border-white/10 flex justify-between items-center bg-black/80 backdrop-blur-md sticky top-0 z-50">
         <span className="font-mono font-bold text-white tracking-wider">SomAI</span>
         <button onClick={() => setShowSettings(true)}><Settings size={20} className="text-gray-400" /></button>
      </div>

      <button onClick={() => setShowSettings(true)} className="hidden md:block fixed top-6 right-6 z-30 p-2 text-gray-500 hover:text-white transition-colors bg-black/20 rounded-full hover:bg-white/10">
        <Settings size={20} />
      </button>

      <main className="flex-1 md:ml-64 p-3 md:p-8 pt-4 md:pt-6 max-w-7xl mx-auto w-full md:min-h-screen flex flex-col">
        <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide shrink-0">
          {[{ id: 'dashboard', label: 'Dashboard' }, { id: 'chat', label: 'Chat' }, { id: 'medication', label: 'Meds' }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-neon-green text-black' : 'bg-gray-900 text-gray-400'}`}>{t.label}</button>
          ))}
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          {activeTab === 'dashboard' && (
            <Dashboard 
              vitals={vitals} 
              setVitals={setVitals} 
              riskResult={riskResult} 
              chatSummary={chatSummary} 
              handleRunAnalysis={handleRunAnalysis} 
              isAnalyzing={isAnalyzing} 
              onPrint={handlePrintReport} 
              profile={profile} 
              setProfile={setProfile} 
              medications={medications} 
              chatHistory={chatHistory} 
              insights={insights}
              statusMessage={statusMessage}      
              setStatusMessage={setStatusMessage} 
            />
          )}
          {activeTab === 'chat' && (
            <Chat 
              sessions={sessions}
              currentSessionId={currentSessionId}
              onSwitchSession={setCurrentSessionId}
              onCreateSession={createNewSession}
              onRenameSession={renameSession}
              onDeleteSession={deleteSession}
              onSendMessage={handleSendMessage} 
              isProcessing={isProcessing} 
              statusMessage={statusMessage}      
              mode={mode} 
              setMode={setMode} 
              onSummarize={handleSummarizeChat} 
              isSummarizing={isSummarizing} 
              chatSummary={chatSummary} 
            />
          )}
          {activeTab === 'medication' && (
            <MedicationTracker medications={medications} setMedications={setMedications} profile={profile} setProfile={setProfile} />
          )}
        </div>
      </main>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-white/10 relative animate-in zoom-in-95">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Settings className="text-neon-green" size={20} /> Settings</h2>
            <div className="space-y-4">
               <button onClick={handleExportData} className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center gap-3 text-left transition-all"><div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Download size={18} /></div><div><h3 className="font-bold text-sm text-gray-200">Backup Data</h3><p className="text-xs text-gray-500">Export profile to JSON</p></div></button>
               <button onClick={handlePrintReport} className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center gap-3 text-left transition-all"><div className="p-2 bg-green-500/10 rounded-lg text-green-400"><FileText size={18} /></div><div><h3 className="font-bold text-sm text-gray-200">Download PDF Report</h3><p className="text-xs text-gray-500">Save full analysis & chat history</p></div></button>
               <button onClick={handleResetData} className="w-full p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 flex items-center gap-3 text-left transition-all"><div className="p-2 bg-red-500/10 rounded-lg text-red-400"><Trash2 size={18} /></div><div><h3 className="font-bold text-sm text-red-200">Reset Application</h3><p className="text-xs text-red-400/60">Delete all local data & profile</p></div></button>
            </div>
          </div>
        </div>
      )}
      {printableRoot && createPortal(<PrintReport profile={profile} vitals={vitals} riskResult={riskResult} chatHistory={chatHistory} chatSummary={chatSummary} medications={medications} />, printableRoot)}
    </div>
  );
};
export default App;