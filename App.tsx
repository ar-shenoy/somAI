
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, Trash2, MessageSquare, FileText } from 'lucide-react';
import { 
  PatientProfile, 
  ClinicalVitals, 
  INITIAL_PROFILE, 
  INITIAL_VITALS, 
  AppMode, 
  RiskAnalysisResult,
  ChatMessage,
  Medication
} from './types';
import { analyzeRisk, generateChatResponse, summarizeConversation } from './services/geminiService';

// Extracted Components
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Chat from './components/Chat';
import Profile from './components/Profile';
import PrintReport from './components/PrintReport';
import MedicationTracker from './components/MedicationTracker';

const App: React.FC = () => {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'profile' | 'medication'>('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  
  const [profile, setProfile] = useState<PatientProfile>(() => {
    try {
      const saved = localStorage.getItem('somai_profile');
      return saved ? JSON.parse(saved) : INITIAL_PROFILE;
    } catch {
      return INITIAL_PROFILE;
    }
  });

  const [medications, setMedications] = useState<Medication[]>(() => {
    try {
      const saved = localStorage.getItem('somai_medications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [vitals, setVitals] = useState<ClinicalVitals>(INITIAL_VITALS);
  const [riskResult, setRiskResult] = useState<RiskAnalysisResult | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [chatSummary, setChatSummary] = useState('');
  const [mode, setMode] = useState<AppMode>(AppMode.GENERAL);
  
  // Loading States
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // --- STREAK LOGIC ON LOAD ---
  useEffect(() => {
    const checkStreak = () => {
      const lastUpdateDate = new Date(profile.lastStreakUpdate);
      const todayDate = new Date();
      
      // Reset time portion to compare dates accurately
      lastUpdateDate.setHours(0,0,0,0);
      todayDate.setHours(0,0,0,0);

      const diffTime = todayDate.getTime() - lastUpdateDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // If more than 1 day passed (skipped yesterday), reset streak
      // diffDays = 0 (Today), diffDays = 1 (Yesterday - ok), diffDays > 1 (Broken)
      if (diffDays > 1 && profile.streak > 0) {
        setProfile(prev => ({ ...prev, streak: 0 }));
      }
    };
    checkStreak();
  }, []);

  // --- STORAGE EFFECTS ---
  useEffect(() => {
    try {
      localStorage.setItem('somai_profile', JSON.stringify(profile));
    } catch (e) {
      console.error("Storage failed", e);
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem('somai_medications', JSON.stringify(medications));
    } catch (e) {
      console.error("Storage failed", e);
    }
  }, [medications]);

  const handleProfileUpdate = () => {
    setRiskResult(null);
  };

  // --- ADVANCED RISK ENGINE ---
  const calculateRiskScore = (): number => {
    let score = 10; // Base risk

    // 1. Blood Pressure Risk (Non-linear)
    if (vitals.systolicBp >= 180) {
      score += 60; // Hypertensive Crisis - Critical
    } else if (vitals.systolicBp >= 140) {
      score += 30; // Stage 2 Hypertension
    } else if (vitals.systolicBp >= 130) {
      score += 15; // Stage 1
    }

    // 2. Glucose Risk (Non-linear)
    if (vitals.glucose >= 250) {
      score += 50; // Critical Hyperglycemia
    } else if (vitals.glucose >= 180) {
      score += 25; // Elevated
    } else if (vitals.glucose < 70) {
      score += 40; // Hypoglycemia Risk
    }

    // 3. Comorbidity Multiplier (BP + Glucose)
    if (vitals.systolicBp > 140 && vitals.glucose > 180) {
      score = score * 1.2; // 20% penalty for combined issues
    }

    // 4. Lifestyle Factors
    if (vitals.sleepQuality < 4) score += 15;
    if (vitals.sleepQuality > 8) score -= 5; // Good sleep bonus

    // 5. Adherence Penalty (Critical)
    if (vitals.missedDoses > 0) {
      score += (vitals.missedDoses * 5); // 5 points per missed dose
    }

    // Cap at 100, Min at 1
    return Math.min(Math.max(Math.round(score), 1), 100);
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const score = calculateRiskScore();
      const result = await analyzeRisk(profile, vitals, score);
      setRiskResult(result);
    } catch (e) {
      console.error(e);
      alert("Failed to analyze. Please check connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (image?: string) => {
    if (!currentInput.trim() && !image) return;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: currentInput,
      timestamp: Date.now(),
      image: image
    };

    setChatHistory(prev => [...prev, newUserMsg]);
    setCurrentInput('');
    setIsProcessing(true);

    try {
      const aiResponseText = await generateChatResponse(
        chatHistory, 
        newUserMsg.text, 
        image, 
        profile, 
        mode
      );

      const newAiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: aiResponseText,
        timestamp: Date.now()
      };

      setChatHistory(prev => [...prev, newAiMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSummarizeChat = async () => {
    if (chatHistory.length === 0) return;
    setIsSummarizing(true);
    try {
      const summary = await summarizeConversation(chatHistory);
      setChatSummary(summary);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleResetData = () => {
    if(confirm('Are you sure you want to reset all application data?')) {
       try {
         localStorage.clear();
         window.location.reload();
       } catch (e) {
         console.error("Clear failed", e);
       }
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
    setChatSummary('');
    setShowSettings(false);
  };

  // --- RENDER HELPERS ---
  const printableRoot = document.getElementById('printable-root');

  return (
    <div className="min-h-screen bg-black text-white selection:bg-neon-green selection:text-black font-sans overflow-x-hidden">
      
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="md:hidden p-4 border-b border-white/10 flex justify-between items-center bg-black/80 backdrop-blur-md sticky top-0 z-50">
         <span className="font-mono font-bold text-white tracking-wider">SomAI</span>
         <button onClick={() => setShowSettings(true)}><Settings size={20} className="text-gray-400" /></button>
      </div>

      <button 
        onClick={() => setShowSettings(true)}
        className="hidden md:block fixed top-6 right-6 z-30 p-2 text-gray-500 hover:text-white transition-colors bg-black/20 rounded-full hover:bg-white/10"
      >
        <Settings size={20} />
      </button>

      <main className="md:ml-64 p-4 md:p-8 pt-6 pb-24 max-w-7xl mx-auto min-h-screen">
        
        <div className="md:hidden flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'chat', label: 'Chat' },
            { id: 'medication', label: 'Meds' },
            { id: 'profile', label: 'Profile' }
          ].map(t => (
            <button
               key={t.id}
               onClick={() => setActiveTab(t.id as 'dashboard' | 'chat' | 'profile' | 'medication')}
               className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-neon-green text-black' : 'bg-gray-900 text-gray-400'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

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
            medications={medications}
            chatHistory={chatHistory}
          />
        )}

        {activeTab === 'chat' && (
          <Chat 
            chatHistory={chatHistory}
            currentInput={currentInput}
            setCurrentInput={setCurrentInput}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
            mode={mode}
            setMode={setMode}
            onSummarize={handleSummarizeChat}
            isSummarizing={isSummarizing}
            chatSummary={chatSummary}
          />
        )}

        {activeTab === 'medication' && (
          <MedicationTracker 
            medications={medications}
            setMedications={setMedications}
            profile={profile}
            setProfile={setProfile}
          />
        )}

        {activeTab === 'profile' && (
          <Profile 
            profile={profile}
            setProfile={setProfile}
            onProfileUpdate={handleProfileUpdate}
            riskResult={riskResult}
            chatSummary={chatSummary}
            onPrint={handlePrintReport}
            vitals={vitals}
            medications={medications}
            chatHistory={chatHistory}
          />
        )}

      </main>

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-white/10 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Settings className="text-neon-green" size={20} /> Settings
            </h2>
            
            <div className="space-y-4">
               <button 
                 type="button"
                 onClick={handlePrintReport}
                 className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center gap-3 text-left transition-all group"
               >
                 <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><FileText size={18} /></div>
                 <div>
                    <h3 className="font-bold text-sm text-gray-200">Download PDF Report</h3>
                    <p className="text-xs text-gray-500">Save full analysis & chat history</p>
                 </div>
               </button>
               <button 
                 type="button"
                 onClick={handleClearChat}
                 className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center gap-3 text-left transition-all group"
               >
                 <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><MessageSquare size={18} /></div>
                 <div>
                    <h3 className="font-bold text-sm text-gray-200">Clear Conversation</h3>
                    <p className="text-xs text-gray-500">Remove current chat history</p>
                 </div>
               </button>

               <button 
                 type="button"
                 onClick={handleResetData}
                 className="w-full p-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/10 flex items-center gap-3 text-left transition-all group"
               >
                 <div className="p-2 bg-red-500/10 rounded-lg text-red-400"><Trash2 size={18} /></div>
                 <div>
                    <h3 className="font-bold text-sm text-red-200">Reset Application</h3>
                    <p className="text-xs text-red-400/60">Delete all local data & profile</p>
                 </div>
               </button>
            </div>
          </div>
        </div>
      )}

      {printableRoot && createPortal(
        <PrintReport 
          profile={profile}
          vitals={vitals}
          riskResult={riskResult}
          chatHistory={chatHistory}
          chatSummary={chatSummary}
          medications={medications}
        />,
        printableRoot
      )}
    </div>
  );
};

export default App;
