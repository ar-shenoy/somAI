
import React, { useState, useCallback } from 'react';
import { Plus, Trash2, CheckCircle, Trophy, AlertTriangle, Quote, Calendar, Edit2, X, Save } from 'lucide-react';
import { Medication, PatientProfile } from '../types';

interface MedicationTrackerProps {
  medications: Medication[];
  setMedications: React.Dispatch<React.SetStateAction<Medication[]>>;
  profile: PatientProfile;
  setProfile: React.Dispatch<React.SetStateAction<PatientProfile>>;
}

const MOTIVATIONAL_QUOTES = [
  "Success is stumbling from failure to failure with no loss of enthusiasm. – Winston Churchill",
  "Fall seven times, stand up eight. – Japanese Proverb",
  "The only real mistake is the one from which we learn nothing. – Henry Ford",
  "It does not matter how slowly you go as long as you do not stop. – Confucius"
];

// Memoized item to prevent lag when typing in form
const MedicationItem = React.memo(({ med, editingId, onToggle, onEdit, onDelete }: { 
  med: Medication; 
  editingId: string | null; 
  onToggle: (id: string) => void;
  onEdit: (med: Medication) => void;
  onDelete: (id: string) => void;
}) => (
  <div className={`glass-card p-4 rounded-xl flex justify-between items-center group transition-all relative ${editingId === med.id ? 'border-neon-yellow/50 bg-neon-yellow/5' : (med.taken ? 'border-green-500/30 bg-green-500/5' : 'border-white/5')}`}>
    <div className="flex items-center gap-4">
        <button 
          onClick={() => onToggle(med.id)}
          className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
            med.taken 
            ? 'bg-green-500 border-green-500 text-black' 
            : 'border-gray-500 text-transparent hover:border-green-400'
          }`}
        >
          <CheckCircle size={16} />
        </button>
        <div>
          <p className={`font-bold ${med.taken ? 'text-green-400 line-through' : 'text-white'}`}>{med.name}</p>
          <div className="flex flex-col gap-0.5 mt-1">
            <span className="text-xs text-gray-400">{med.dosage} • {med.time}</span>
            {(med.startDate || med.endDate) && (
              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Calendar size={10} /> {med.startDate || 'Now'} → {med.endDate || 'Ongoing'}
              </span>
            )}
          </div>
        </div>
    </div>
    
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={() => onEdit(med)}
          className="p-2 rounded-lg text-gray-400 hover:text-neon-yellow hover:bg-neon-yellow/10 transition-colors"
          title="Edit"
        >
            <Edit2 size={16} />
        </button>
        <button 
          onClick={() => onDelete(med.id)} 
          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Delete"
        >
            <Trash2 size={16} />
        </button>
    </div>
  </div>
));

const MedicationTracker: React.FC<MedicationTrackerProps> = ({ 
  medications, 
  setMedications, 
  profile, 
  setProfile 
}) => {
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedTime, setNewMedTime] = useState('09:00');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Edit Mode State
  const [editingId, setEditingId] = useState<string | null>(null);

  const resetForm = () => {
    setNewMedName('');
    setNewMedDosage('');
    setNewMedTime('09:00');
    setStartDate('');
    setEndDate('');
    setEditingId(null);
  };

  const handleEdit = useCallback((med: Medication) => {
    setNewMedName(med.name);
    setNewMedDosage(med.dosage);
    setNewMedTime(med.time);
    setStartDate(med.startDate || '');
    setEndDate(med.endDate || '');
    setEditingId(med.id);
  }, []);

  const handleUpdate = () => {
    if (!editingId || !newMedName || !newMedDosage) return;
    
    setMedications(prev => prev.map(med => {
      if (med.id === editingId) {
        return {
          ...med,
          name: newMedName,
          dosage: newMedDosage,
          time: newMedTime,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        };
      }
      return med;
    }));
    resetForm();
  };

  const addMedication = () => {
    if (!newMedName || !newMedDosage) return;
    const newMed: Medication = {
      id: Date.now().toString(),
      name: newMedName,
      dosage: newMedDosage,
      time: newMedTime,
      taken: false,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    };
    setMedications(prev => [...prev, newMed]);
    resetForm();
  };

  const removeMedication = useCallback((id: string) => {
    setMedications(prev => prev.filter(m => m.id !== id));
    if (editingId === id) resetForm();
  }, [editingId, setMedications]);

  const toggleTaken = useCallback((id: string) => {
    // 1. Calculate new state immediately
    const updatedMeds = medications.map(m => {
      if (m.id === id) {
        return { ...m, taken: !m.taken };
      }
      return m;
    });

    // 2. Determine Streak Changes
    const allTakenNow = updatedMeds.length > 0 && updatedMeds.every(m => m.taken);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString();
    
    const lastUpdate = new Date(profile.lastStreakUpdate);
    lastUpdate.setHours(0,0,0,0);
    const lastUpdateStr = lastUpdate.toISOString();

    const isToday = today.getTime() === lastUpdate.getTime();

    let newStreak = profile.streak;
    let newLastUpdate = profile.lastStreakUpdate;

    if (allTakenNow) {
      if (!isToday) {
        // First time finishing today -> Increment
        newStreak += 1;
        newLastUpdate = new Date().toISOString(); // store full timestamp for exactness
      }
    } else {
      // Not all taken
      if (isToday) {
        // If we previously marked today as done, we need to revert it.
        // Decrement streak (min 0)
        newStreak = Math.max(0, newStreak - 1);
        // Set update date to yesterday so if they re-complete it, it counts as "new" for today
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        newLastUpdate = yesterday.toISOString();
      }
    }

    // 3. Batch Updates
    setMedications(updatedMeds);
    if (newStreak !== profile.streak || newLastUpdate !== profile.lastStreakUpdate) {
      setProfile(prev => ({ 
        ...prev, 
        streak: newStreak,
        lastStreakUpdate: newLastUpdate
      }));
    }
  }, [medications, profile.streak, profile.lastStreakUpdate, setMedications, setProfile]);

  const pendingMeds = medications.filter(m => !m.taken).length;
  const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="space-y-6">
        <div className={`glass-panel p-6 rounded-2xl border-t ${editingId ? 'border-neon-yellow' : 'border-neon-blue'} transition-colors`}>
          <div className="flex justify-between items-center mb-4">
             <h2 className={`text-xl font-bold transition-colors flex items-center gap-2 ${editingId ? 'text-neon-yellow' : 'text-white'}`}>
               {editingId ? <Edit2 size={20} /> : <Plus className="text-neon-blue" size={20} />}
               {editingId ? 'Edit Medication' : 'Add Medication'}
             </h2>
             {editingId && (
               <button onClick={resetForm} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                 <X size={14} /> Cancel
               </button>
             )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
             <input 
               value={newMedName} onChange={e => setNewMedName(e.target.value)}
               placeholder="Medication Name"
               className="bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-neon-blue outline-none col-span-2"
             />
             <input 
               value={newMedDosage} onChange={e => setNewMedDosage(e.target.value)}
               placeholder="Dosage (e.g. 10mg)"
               className="bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-neon-blue outline-none"
             />
             <input 
               type="time"
               value={newMedTime} onChange={e => setNewMedTime(e.target.value)}
               className="bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-neon-blue outline-none"
             />
             
             <div className="col-span-2 grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Start Date</label>
                  <input 
                    type="date"
                    value={startDate} onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-neon-blue outline-none"
                  />
               </div>
               <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Finish Date (Opt)</label>
                  <input 
                    type="date"
                    value={endDate} onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-neon-blue outline-none"
                  />
               </div>
             </div>

             {editingId ? (
                <button 
                  onClick={handleUpdate}
                  disabled={!newMedName}
                  className="bg-neon-yellow text-black font-bold rounded-lg py-3 hover:bg-neon-yellow/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 col-span-2 mt-2 shadow-[0_0_15px_rgba(255,195,0,0.2)]"
                >
                  <Save size={18} /> Update Medication
                </button>
             ) : (
                <button 
                  onClick={addMedication}
                  disabled={!newMedName}
                  className="bg-neon-blue text-black font-bold rounded-lg py-3 hover:bg-neon-blue/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 col-span-2 mt-2 shadow-[0_0_15px_rgba(0,204,255,0.2)]"
                >
                  <Plus size={18} /> Add to Schedule
                </button>
             )}
          </div>
        </div>

        <div className="space-y-3">
          {medications.map(med => (
             <MedicationItem 
               key={med.id} 
               med={med} 
               editingId={editingId} 
               onToggle={toggleTaken} 
               onEdit={handleEdit} 
               onDelete={removeMedication} 
             />
          ))}
          {medications.length === 0 && (
             <p className="text-center text-gray-500 text-sm py-4 italic">No medications tracked.</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
         <div className="glass-panel p-8 rounded-2xl text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[300px]">
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${profile.streak > 0 ? 'via-yellow-500' : 'via-gray-500'} to-transparent`}></div>
            
            <Trophy size={64} className={`${profile.streak > 0 ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'text-gray-700'} mb-4 transition-colors duration-500`} />

            <h3 className={`text-4xl font-mono font-bold ${profile.streak > 0 ? 'text-white' : 'text-gray-500'} mb-2`}>{profile.streak} Days</h3>
            <p className="text-gray-400/80 font-bold uppercase tracking-widest text-xs">Current Streak</p>
            
            {profile.streak === 0 && (
                <div className="mt-8 bg-white/5 p-4 rounded-xl border border-white/5">
                    <Quote size={16} className="text-gray-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-300 italic">"{randomQuote}"</p>
                </div>
            )}

            {profile.streak > 0 && (
                <p className="mt-6 text-gray-400 text-sm max-w-xs">
                Keep going! You are building a healthier future.
                </p>
            )}
         </div>

         {pendingMeds > 0 && (
           <div className="glass-card p-4 rounded-xl border-l-4 border-l-neon-red flex items-start gap-4">
              <div className="p-2 bg-neon-red/10 rounded-lg text-neon-red">
                 <AlertTriangle size={24} />
              </div>
              <div>
                 <h4 className="font-bold text-white">Missed Doses Pending</h4>
                 <p className="text-sm text-gray-400 mt-1">You have <span className="text-neon-red font-bold">{pendingMeds}</span> medication(s) pending for today.</p>
              </div>
           </div>
         )}
      </div>

    </div>
  );
};

export default MedicationTracker;
