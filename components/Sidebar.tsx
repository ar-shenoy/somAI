
import React from 'react';
import { Activity, MessageSquare, User, Pill } from 'lucide-react';

interface SidebarProps {
  activeTab: 'dashboard' | 'chat' | 'profile' | 'medication';
  setActiveTab: (tab: 'dashboard' | 'chat' | 'profile' | 'medication') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'chat', label: 'AI Companion', icon: MessageSquare },
    { id: 'medication', label: 'Meds & Rewards', icon: Pill },
    { id: 'profile', label: 'Patient Profile', icon: User },
  ] as const;

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed glass-panel border-r border-neon-border z-20 top-0 left-0">
      <div className="p-8">
        <h1 className="text-2xl font-mono font-bold text-white tracking-tighter flex items-center gap-3">
          <div className="p-2 bg-neon-green/10 rounded-lg">
            <Activity className="text-neon-green" size={24} /> 
          </div>
          SomAI
        </h1>
        <p className="text-xs text-gray-400 mt-3 font-medium tracking-wide">CLINICAL COMPANION v1.0</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
              activeTab === item.id 
                ? 'bg-white/10 text-white border border-white/10 shadow-lg shadow-black/20' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon 
              size={20} 
              className={`transition-colors ${activeTab === item.id ? 'text-neon-green' : 'text-gray-500 group-hover:text-gray-300'}`} 
            /> 
            <span className="font-medium text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5">
        <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse-slow"></div>
          SYSTEM ONLINE
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
