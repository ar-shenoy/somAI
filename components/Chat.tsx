
import React, { useRef, useEffect, useState } from 'react';
import { MessageSquare, Send, ClipboardList, Activity, Mic, Volume2, Camera, X, ArrowLeft, Sparkles, ScanEye, Info } from 'lucide-react';
import { ChatMessage, AppMode } from '../types';
import { generateQuickReplies } from '../services/geminiService';

interface ChatProps {
  chatHistory: ChatMessage[];
  currentInput: string;
  setCurrentInput: (val: string) => void;
  onSendMessage: (image?: string) => void;
  isProcessing: boolean;
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  onSummarize: () => void;
  isSummarizing: boolean;
  chatSummary?: string;
}

const Chat: React.FC<ChatProps> = ({
  chatHistory,
  currentInput,
  setCurrentInput,
  onSendMessage,
  isProcessing,
  mode,
  setMode,
  onSummarize,
  isSummarizing,
  chatSummary
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'chat' | 'summary'>('chat');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [showVisionTip, setShowVisionTip] = useState(true);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isProcessing, quickReplies]);

  // Generate quick replies when AI responds
  useEffect(() => {
    const lastMsg = chatHistory[chatHistory.length - 1];
    if (lastMsg && lastMsg.role === 'model') {
      generateQuickReplies(lastMsg.text).then(setQuickReplies);
    } else {
      setQuickReplies([]);
    }
  }, [chatHistory]);

  const handleSummarizeClick = async () => {
    await onSummarize();
    setViewMode('summary');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Automatically hide tip if user uses feature
      setShowVisionTip(false);
    }
  };

  const handleSend = () => {
    if (!currentInput.trim() && !selectedImage) return;
    onSendMessage(selectedImage || undefined);
    setSelectedImage(null);
    setQuickReplies([]);
  };

  const speakText = (text: string, id: string) => {
    if ('speechSynthesis' in window) {
       if (speakingId === id) {
         window.speechSynthesis.cancel();
         setSpeakingId(null);
         return;
       }
       window.speechSynthesis.cancel();
       const utterance = new SpeechSynthesisUtterance(text);
       utterance.onend = () => setSpeakingId(null);
       setSpeakingId(id);
       window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setCurrentInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  if (viewMode === 'summary') {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
         <div className="glass-panel rounded-2xl h-[calc(100vh-150px)] p-8 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-neon-green/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <button 
                onClick={() => setViewMode('chat')}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-mono font-bold uppercase"
              >
                <ArrowLeft size={16} /> Back to Chat
              </button>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ClipboardList className="text-neon-yellow" /> Session Brief
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto">
               {isSummarizing ? (
                 <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-4">
                    <Activity className="animate-spin text-neon-green" size={32} />
                    <p className="font-mono text-xs animate-pulse">ANALYZING CONVERSATION...</p>
                 </div>
               ) : (
                 <div className="bg-white/5 p-6 rounded-xl border border-white/10 leading-relaxed text-gray-200 text-base whitespace-pre-wrap">
                    {chatSummary || "No summary available."}
                 </div>
               )}
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel rounded-2xl flex flex-col h-[calc(100vh-150px)] relative overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-white/5 border-b border-white/5 flex justify-between items-center z-10">
          <div className="flex gap-2">
            <button 
              onClick={() => setMode(AppMode.GENERAL)}
              className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-mono font-bold uppercase tracking-wider transition-all ${mode === AppMode.GENERAL ? 'bg-neon-blue text-black' : 'text-gray-400 hover:text-white'}`}
            >
              Medical Guide
            </button>
            <button 
              onClick={() => setMode(AppMode.THERAPY)}
              className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-mono font-bold uppercase tracking-wider transition-all ${mode === AppMode.THERAPY ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              Therapist (CBT)
            </button>
          </div>
          <button 
            onClick={handleSummarizeClick}
            disabled={chatHistory.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all border border-white/10 text-gray-300 hover:text-white hover:border-white/30 bg-white/5 disabled:opacity-50"
          >
            <ClipboardList size={16} /> <span className="hidden md:inline">BRIEF</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 relative">
          {chatHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-600">
               <div className="p-4 rounded-full bg-white/5 mb-4 relative">
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-neon-green rounded-full animate-pulse"></div>
                  <MessageSquare size={32} className="opacity-50" />
               </div>
               <p className="font-medium text-lg">Start a session with SomAI.</p>
               <p className="text-xs mt-2 opacity-50 flex items-center gap-2">
                 <span className="flex items-center gap-1"><ScanEye size={12}/> Vision Enabled</span> • 
                 <span>Secure</span> • 
                 <span>Private</span>
               </p>
            </div>
          )}
          
          {chatHistory.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3 shadow-lg relative group ${
                msg.role === 'user' 
                  ? 'bg-neon-green/10 text-white border border-neon-green/20 rounded-tr-none' 
                  : 'bg-black/40 text-gray-200 border border-white/10 rounded-tl-none'
              }`}>
                {msg.image && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-white/10">
                    <img src={msg.image} alt="Upload" className="max-w-full h-auto max-h-64 object-cover" />
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                
                {msg.role === 'model' && (
                  <button 
                    onClick={() => speakText(msg.text, msg.id)}
                    className={`absolute -right-10 top-2 p-2 rounded-full hover:bg-white/10 transition-all ${speakingId === msg.id ? 'text-neon-blue opacity-100' : 'text-gray-500 opacity-0 group-hover:opacity-100'}`}
                  >
                     <Volume2 size={16} className={speakingId === msg.id ? "animate-pulse" : ""} />
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-black/20 px-4 py-3 rounded-2xl rounded-tl-none border border-white/5 flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 bg-neon-green rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-neon-green rounded-full animate-bounce delay-100"></span>
                <span className="w-1.5 h-1.5 bg-neon-green rounded-full animate-bounce delay-200"></span>
              </div>
            </div>
          )}
          <div ref={scrollRef}></div>
        </div>

        {/* Quick Replies */}
        {!isProcessing && quickReplies.length > 0 && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
            {quickReplies.map((reply, i) => (
              <button
                key={i}
                onClick={() => { setCurrentInput(reply); handleSend(); }}
                className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 hover:bg-neon-blue/20 hover:text-neon-blue hover:border-neon-blue/30 transition-all flex items-center gap-1"
              >
                <Sparkles size={10} /> {reply}
              </button>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-black/50 border-t border-white/5 z-20 relative">
          
          {/* SomAI Vision Tip */}
          {showVisionTip && !selectedImage && (
             <div className="absolute -top-12 left-4 z-30 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-neon-blue/10 backdrop-blur-md border border-neon-blue/30 text-neon-blue text-[10px] md:text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
                   <ScanEye size={14} />
                   <span><span className="font-bold">SomAI Vision:</span> Upload nutrition labels, skin symptoms, or reports for analysis.</span>
                   <button onClick={() => setShowVisionTip(false)} className="hover:text-white ml-2"><X size={12}/></button>
                </div>
                {/* Arrow */}
                <div className="absolute -bottom-1 left-4 w-2 h-2 bg-neon-blue/10 border-b border-r border-neon-blue/30 transform rotate-45"></div>
             </div>
          )}

          {selectedImage && (
            <div className="flex items-center gap-2 mb-3 bg-white/5 p-2 rounded-lg w-fit border border-white/10">
               <div className="w-8 h-8 rounded bg-gray-800 overflow-hidden">
                 <img src={selectedImage} alt="Selected" className="w-full h-full object-cover" />
               </div>
               <span className="text-xs text-gray-400">Image attached</span>
               <button onClick={() => setSelectedImage(null)} className="p-1 hover:bg-white/10 rounded-full text-gray-500 hover:text-white ml-2">
                 <X size={14} />
               </button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageSelect}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`p-3 rounded-xl transition-all relative ${selectedImage ? 'bg-neon-blue/20 text-neon-blue' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
              title="SomAI Vision"
            >
              <Camera size={20} />
            </button>
            
            <div className="flex-1 relative">
               <input 
                 value={currentInput}
                 onChange={(e) => setCurrentInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                 placeholder={isListening ? "Listening..." : "Message SomAI..."}
                 className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-white placeholder-gray-600 focus:border-neon-blue outline-none transition-all"
               />
               <button 
                 onClick={toggleListening}
                 className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-500 hover:text-white'}`}
               >
                 <Mic size={18} />
               </button>
            </div>

            <button 
              onClick={handleSend}
              disabled={(!currentInput.trim() && !selectedImage) || isProcessing}
              className="p-3 rounded-xl bg-neon-blue text-black font-bold hover:bg-neon-blue/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,204,255,0.3)]"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
