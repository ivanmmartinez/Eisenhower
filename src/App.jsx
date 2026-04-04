import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  deleteDoc, 
  updateDoc, 
  addDoc 
} from 'firebase/firestore';
import { 
  getAuth, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Zap, 
  Clock, 
  Users, 
  Inbox, 
  Sparkles, 
  LogOut, 
  Lock, 
  Mail, 
  UserPlus, 
  LogIn, 
  AlertCircle, 
  ChevronRight, 
  Droplets, 
  Sprout, 
  Flower2, 
  Trees, 
  Leaf, 
  Trophy, 
  Play, 
  Pause, 
  RotateCcw, 
  Timer, 
  X, 
  Bug, 
  Compass,
  LayoutGrid,
  Settings
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = (typeof __firebase_config !== 'undefined' && __firebase_config)
  ? (typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config)
  : {
      apiKey: "AIzaSyAKxMTyAC6Scy2tgUgHX7KEH9Yz0MqiA6Q",
      authDomain: "eisenhower-d9e5f.firebaseapp.com",
      projectId: "eisenhower-d9e5f",
      storageBucket: "eisenhower-d9e5f.firebasestorage.app",
      messagingSenderId: "324572083965",
      appId: "1:324572083965:web:6c8bccb006292333c87094",
      measurementId: "G-EEJX95SNYP"
    };

const isConfigValid = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY");

let app, auth, db;
if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.error("Firebase init failed:", e);
  }
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'eisenhower-v1';

const QUADRANTS = [
  { 
    id: 'do', 
    name: 'Wildflower', 
    matrix: 'Urgent & Important', 
    action: 'DO NOW',
    bg: 'bg-orange-600', 
    icon: <Zap className="w-5 h-5" />,
    stages: 2,
    color: '#F97316'
  },
  { 
    id: 'schedule', 
    name: 'Great Oak', 
    matrix: 'Important, Not Urgent', 
    action: 'PLAN IT',
    bg: 'bg-emerald-700', 
    icon: <Clock className="w-5 h-5" />,
    stages: 5,
    color: '#047857'
  },
  { 
    id: 'delegate', 
    name: 'Morning Glory', 
    matrix: 'Urgent, Not Important', 
    action: 'DELEGATE',
    bg: 'bg-blue-600', 
    icon: <Users className="w-5 h-5" />,
    stages: 3,
    color: '#2563EB'
  },
  { 
    id: 'eliminate', 
    name: 'Thorny Weed', 
    matrix: 'Neither', 
    action: 'ELIMINATE',
    bg: 'bg-zinc-600', 
    icon: <Bug className="w-5 h-5" />,
    stages: 1,
    color: '#52525B'
  },
];

const PlantGraphic = ({ type, watered, completed }) => {
  const quad = QUADRANTS.find(q => q.id === type) || QUADRANTS[0];
  const progress = watered / quad.stages;
  
  if (type === 'eliminate') {
    return <Bug className={`w-12 h-12 transition-all ${completed ? 'scale-0 opacity-0' : 'text-zinc-600 animate-pulse'}`} />;
  }

  return (
    <div className="relative w-16 h-16 flex items-end justify-center">
      <div className="absolute bottom-0 w-10 h-1.5 bg-black/40 rounded-full blur-md" />
      <div className="transition-all duration-700 ease-out flex flex-col items-center"
           style={{ transform: `scale(${0.5 + (progress * 0.5)})` }}>
        {watered === 0 && !completed ? (
          <div className="w-5 h-5 bg-[#3a2a1d] rounded-full border-2 border-white/5 shadow-xl animate-bounce" />
        ) : (
          <div className="relative flex flex-col items-center">
            {type === 'schedule' ? (
              <Trees className={`w-14 h-14 ${completed ? 'text-emerald-200' : 'text-emerald-500'}`} />
            ) : (
              <Flower2 className={`w-12 h-12 ${completed ? 'text-white' : quad.color === '#F97316' ? 'text-orange-400' : 'text-blue-400'}`} />
            )}
            <div className="w-1 h-6 bg-emerald-900/40 rounded-full -mt-1" />
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [activeTab, setActiveTab] = useState('garden');
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [showPlantingMenu, setShowPlantingMenu] = useState(false);
  const [focusTask, setFocusTask] = useState(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); 
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!isConfigValid || !auth) { setLoading(false); return; }
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'));
    return onSnapshot(q, (s) => setTasks(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      completeFocusSession();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const completeFocusSession = async () => {
    setIsTimerRunning(false);
    if (focusTask) {
      const quad = QUADRANTS.find(q => q.id === focusTask.quadrant);
      const newWatered = (focusTask.watered || 0) + 1;
      const updates = { watered: newWatered };
      if (quad && newWatered >= quad.stages) updates.completed = true;
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', focusTask.id), updates);
      setFocusTask(null);
      setTimeLeft(25 * 60);
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim() || !user || !db) return;
    const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), {
      text: newTaskText,
      quadrant: 'inbox',
      completed: false,
      watered: 0,
      createdAt: Date.now()
    });
    const task = { id: docRef.id, text: newTaskText, quadrant: 'inbox' };
    setSelectedTask(task);
    setShowPlantingMenu(true);
    setNewTaskText('');
  };

  const setTaskQuadrant = async (type) => {
    if (!selectedTask || !user || !db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', selectedTask.id), { quadrant: type });
    setShowPlantingMenu(false);
    setSelectedTask(null);
    setActiveTab('garden');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!auth) return;
    setAuthError('');
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { setAuthError(err.message); }
  };

  const toggleTask = async (task) => {
    if (!db || !user) return;
    const quad = QUADRANTS.find(q => q.id === task.quadrant);
    const isFinishing = !task.completed;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), { 
      completed: isFinishing,
      watered: isFinishing && quad ? quad.stages : task.watered 
    });
  };

  const deleteTask = async (taskId) => {
    if (!db || !user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId));
  };

  const groveVitality = useMemo(() => {
    if (tasks.length === 0) return 100;
    const completed = tasks.filter(t => t.completed).length;
    const weeds = tasks.filter(t => t.quadrant === 'eliminate' && !t.completed).length;
    return Math.max(0, Math.min(100, Math.round((completed / tasks.length) * 100) - (weeds * 15)));
  }, [tasks]);

  const grouped = useMemo(() => {
    const b = { inbox: [], do: [], schedule: [], delegate: [], eliminate: [] };
    tasks.forEach(t => { if (b[t.quadrant]) b[t.quadrant].push(t); });
    return b;
  }, [tasks]);

  if (!isConfigValid) return <SetupUI />;
  if (loading) return <LoadingUI />;

  if (!user) return (
    <div className="min-h-screen bg-[#060806] text-white flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-950/20 to-black pointer-events-none" />
      <div className="max-w-md w-full bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-10 md:p-14 shadow-2xl z-10">
        <div className="bg-emerald-600 w-20 h-20 rounded-[2.2rem] flex items-center justify-center shadow-2xl mx-auto mb-10 rotate-3">
          <Compass className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-4xl font-black text-center tracking-tighter italic mb-2 uppercase">Priority<span className="text-emerald-500">Grove</span></h2>
        <p className="text-center text-emerald-500/40 text-[10px] font-black uppercase tracking-[0.4em] mb-12">Eisenhower Strategic Garden</p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" required placeholder="Gardener Email" className="w-full px-8 py-5 bg-black/40 rounded-3xl border border-white/5 text-white outline-none focus:border-emerald-500 transition-all" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" required placeholder="Security Key" className="w-full px-8 py-5 bg-black/40 rounded-3xl border border-white/5 text-white outline-none focus:border-emerald-500 transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
          {authError && <p className="text-rose-500 text-[10px] font-black text-center uppercase">{authError}</p>}
          <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black shadow-2xl hover:bg-emerald-500 transition-all uppercase tracking-widest text-xs">
            {authMode === 'login' ? 'Open Gates' : 'Plant Roots'}
          </button>
        </form>
        <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full mt-10 text-white/20 text-[10px] font-black uppercase tracking-widest hover:text-emerald-500 transition-colors">
          {authMode === 'login' ? "New Architect? Register" : "Returning? Access"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020402] text-white font-sans pb-40 selection:bg-emerald-500/30 overflow-x-hidden">
      
      {/* IMMERSIVE TIMER */}
      {focusTask && (
        <div className="fixed inset-0 z-[100] bg-[#020402]/98 backdrop-blur-3xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
           <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em] mb-6">Nurturing Focus</div>
           <h2 className="text-3xl font-black text-center mb-16 italic tracking-tight leading-tight max-w-sm">"{focusTask.text}"</h2>
           
           <div className="relative w-80 h-80 mb-20">
              <svg className="absolute inset-0 w-80 h-80 -rotate-90">
                <circle cx="160" cy="160" r="145" fill="none" stroke="#0a0f0a" strokeWidth="12" />
                <circle cx="160" cy="160" r="145" fill="none" stroke="#10b981" strokeWidth="12" strokeLinecap="round" strokeDasharray="911" strokeDashoffset={911 - (911 * (timeLeft / (25 * 60)))} className="transition-all duration-1000 ease-linear" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl font-mono font-black text-white">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
              </div>
           </div>

           <div className="flex gap-10">
              <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="w-24 h-24 bg-emerald-600 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all">
                {isTimerRunning ? <Pause size={40} /> : <Play size={40} className="ml-2" />}
              </button>
              <button onClick={() => { setFocusTask(null); setIsTimerRunning(false); setTimeLeft(25 * 60); }} className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center active:scale-90 transition-all">
                <X size={40} className="text-rose-500" />
              </button>
           </div>
        </div>
      )}

      {/* QUADRANT SELECTION (SOWER) */}
      {showPlantingMenu && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-end justify-center p-4">
          <div className="max-w-xl w-full bg-[#0d120d] border border-white/5 rounded-[3.5rem] p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom duration-500">
            <div className="flex justify-between items-center mb-10">
               <div>
                 <h3 className="text-3xl font-black italic tracking-tighter">Strategic Planting</h3>
                 <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">"{selectedTask?.text}"</p>
               </div>
               <button onClick={() => setShowPlantingMenu(false)} className="p-4 bg-white/5 rounded-full text-white/30"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-1 gap-4 mb-4">
               {QUADRANTS.map(q => (
                 <button key={q.id} onClick={() => setTaskQuadrant(q.id)} className={`group flex items-center gap-6 p-6 rounded-3xl border transition-all ${q.bg} border-white/10 hover:scale-[1.02] active:scale-95`}>
                    <div className="bg-white/20 p-4 rounded-2xl text-white">{q.icon}</div>
                    <div className="text-left flex-1">
                       <div className="text-xl font-black text-white leading-none mb-1">{q.name}</div>
                       <div className="text-[10px] font-black uppercase text-white/60 tracking-widest">{q.matrix} • {q.action}</div>
                    </div>
                 </button>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* HUD HEADER */}
      <header className="sticky top-0 z-40 bg-[#020402]/80 backdrop-blur-2xl border-b border-white/5 px-6 py-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="bg-emerald-600 p-3 rounded-[1.2rem] text-white shadow-xl rotate-3">
              <Compass size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter italic uppercase">Priority<span className="text-emerald-500">Grove</span></h1>
              <div className="flex items-center gap-3">
                <div className="w-28 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: `${groveVitality}%` }} />
                </div>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{groveVitality}% VITALITY</span>
              </div>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-white/20 hover:text-rose-400 transition-all"><LogOut size={20} /></button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-10">
        <div className="flex bg-white/5 p-1.5 rounded-[2.5rem] mb-12 border border-white/5 max-w-sm mx-auto shadow-2xl relative">
          <TabBtn active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} icon={<Inbox size={20} />} label="Tray" />
          <TabBtn active={activeTab === 'garden'} onClick={() => setActiveTab('garden')} icon={<Trees size={20} />} label="Grove" />
          <TabBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<Trophy size={20} />} label="Legacy" />
          <div className="absolute bottom-1.5 h-1 bg-emerald-500 rounded-full transition-all duration-500" style={{ width: 'calc(33.33% - 10px)', left: activeTab === 'inbox' ? '5px' : activeTab === 'garden' ? 'calc(33.33% + 5px)' : 'calc(66.66% + 5px)' }} />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-10 duration-700">
          {activeTab === 'inbox' && (
            <div className="max-w-2xl mx-auto space-y-10">
              <form onSubmit={addTask} className="relative group">
                <input autoFocus type="text" placeholder="Drop a thought... #priority" className="w-full px-10 py-10 bg-white/5 border border-white/10 rounded-[3.5rem] text-2xl font-black italic text-white placeholder:text-white/5 outline-none focus:border-emerald-500 focus:bg-white/10 transition-all shadow-2xl" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} />
                <button type="submit" className="absolute right-6 top-1/2 -translate-y-1/2 bg-emerald-600 p-5 rounded-[2.2rem] text-white shadow-2xl active:scale-90 transition-all"><Plus size={32} /></button>
              </form>
              <div className="grid grid-cols-1 gap-6">
                {grouped.inbox.map(task => (
                  <StrategicCard key={task.id} task={task} onAction={() => { setSelectedTask(task); setShowPlantingMenu(true); }} onDelete={() => deleteTask(task.id)} isInbox />
                ))}
                {grouped.inbox.length === 0 && (
                  <div className="py-40 text-center opacity-10 flex flex-col items-center">
                    <Sparkles className="w-24 h-24 mb-6" />
                    <p className="text-xl font-black italic tracking-[0.5em] uppercase">Tray is Clear</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'garden' && (
            <div className="space-y-24">
              {QUADRANTS.map(q => (
                <div key={q.id} className="space-y-10 animate-in fade-in duration-1000">
                  <div className="flex items-center gap-6 px-4">
                    <div className={`p-3 rounded-2xl ${q.bg} text-white shadow-xl`}>{q.icon}</div>
                    <div>
                      <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">{q.name} PLOT</h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mt-1">{q.matrix}</p>
                    </div>
                    <div className="h-[1px] flex-1 bg-white/5" />
                    <span className="text-[10px] font-black text-emerald-500 uppercase">{grouped[q.id].length} Rooted</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {grouped[q.id].map(task => (
                      <StrategicCard key={task.id} task={task} onFocus={() => { setFocusTask(task); setTimeLeft(25 * 60); setIsTimerRunning(true); }} onComplete={() => toggleTask(task)} onAction={() => { setSelectedTask(task); setShowPlantingMenu(true); }} onDelete={() => deleteTask(task.id)} />
                    ))}
                    {grouped[q.id].length === 0 && (
                      <div className="col-span-full h-40 border-2 border-dashed border-white/5 rounded-[3.5rem] flex items-center justify-center text-white/10 uppercase font-black text-[10px] tracking-widest">Earth Awaiting {q.name}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'profile' && (
             <div className="max-w-2xl mx-auto bg-white/5 rounded-[4rem] p-16 border border-white/5 text-center shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-emerald-500 to-blue-500" />
               <div className="w-32 h-32 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 border border-white/10 shadow-inner">
                 <Trophy size={48} className="text-amber-500" />
               </div>
               <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-1">{user.email?.split('@')[0]}</h2>
               <p className="text-emerald-500/40 text-[10px] font-black uppercase tracking-[0.5em] mb-16 underline underline-offset-8">Grove Records</p>
               <div className="grid grid-cols-2 gap-8 text-left">
                  <StatItem label="Grown" val={tasks.filter(t => t.completed).length} color="text-emerald-400" />
                  <StatItem label="Nurturing" val={tasks.filter(t => !t.completed).length} color="text-amber-400" />
                  <StatItem label="Focus Acts" val={tasks.reduce((a, t) => a + (t.watered || 0), 0)} color="text-blue-400" />
                  <StatItem label="Vitality" val={groveVitality + "%"} color="text-orange-400" />
               </div>
            </div>
          )}
        </div>
      </main>

      {/* MOBILE NAV BAR */}
      <div className="fixed bottom-0 left-0 right-0 p-8 z-40 pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="bg-[#0a120a]/90 backdrop-blur-3xl border border-white/10 rounded-[3.5rem] p-4 flex justify-between items-center shadow-2xl">
             <button onClick={() => setActiveTab('inbox')} className={`p-5 rounded-full transition-all ${activeTab === 'inbox' ? 'bg-emerald-600 text-white' : 'text-white/20'}`}><Inbox size={24} /></button>
             <button onClick={() => setActiveTab('garden')} className={`p-5 rounded-full transition-all ${activeTab === 'garden' ? 'bg-emerald-600 text-white' : 'text-white/20'}`}><LayoutGrid size={24} /></button>
             <button onClick={() => setActiveTab('profile')} className={`p-5 rounded-full transition-all ${activeTab === 'profile' ? 'bg-emerald-600 text-white' : 'text-white/20'}`}><Settings size={24} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center gap-1.5 py-6 rounded-[2.2rem] transition-all relative z-10 ${active ? 'text-white' : 'text-white/20 hover:text-white/40'}`}>
      {icon}
      <span className={`text-[10px] font-black uppercase tracking-widest transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
    </button>
  );
}

function StatItem({ label, val, color }) {
  return (
    <div className="bg-black/30 p-8 rounded-[3rem] border border-white/5">
      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-4xl font-black italic tracking-tighter ${color}`}>{val}</p>
    </div>
  );
}

function StrategicCard({ task, onFocus, onComplete, onAction, onDelete, isInbox = false }) {
  const quad = QUADRANTS.find(q => q.id === task.quadrant) || { name: 'Seed', stages: 1, matrix: 'Unplanted' };
  
  return (
    <div className={`group bg-[#0d120d] border border-white/5 rounded-[4rem] p-10 flex flex-col gap-10 transition-all hover:bg-[#121812] hover:border-white/10 ${task.completed ? 'opacity-20 grayscale pointer-events-none' : 'shadow-2xl shadow-black/40'}`}>
      <div className="flex items-center gap-10">
        <div className="shrink-0">
          <PlantGraphic type={task.quadrant} watered={task.watered || 0} completed={task.completed} />
        </div>
        <div className="grow overflow-hidden">
          <span className="text-3xl font-black italic tracking-tight text-white leading-tight block mb-4 truncate">{task.text}</span>
          <div className="flex items-center gap-4">
             <div className="px-5 py-2 bg-black/40 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-emerald-500">
               {isInbox ? 'Unplanted Seed' : quad.name} • {quad.matrix}
             </div>
             {!task.completed && task.quadrant !== 'eliminate' && task.quadrant !== 'inbox' && (
                <div className="flex gap-2.5 ml-auto">
                   {[...Array(quad.stages || 1)].map((_, i) => (
                      <div key={i} className={`w-3 h-3 rounded-full ${i < (task.watered || 0) ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]' : 'bg-white/5 border border-white/10'}`} />
                   ))}
                </div>
             )}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {task.quadrant !== 'inbox' && !task.completed && task.quadrant !== 'eliminate' && (
          <button onClick={onFocus} className="flex-1 bg-emerald-600 text-white py-7 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"><Timer size={24} /> Focus Nurture</button>
        )}
        {task.quadrant === 'inbox' && (
          <button onClick={onAction} className="flex-1 bg-orange-600 text-white py-7 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"><Sprout size={24} /> Plant Seed</button>
        )}
        <button onClick={onAction} className="p-7 bg-white/5 rounded-3xl text-white/40 hover:text-white transition-all"><Settings size={24} /></button>
        <button onClick={onComplete} className="p-7 bg-white/5 rounded-3xl text-white/40 hover:text-emerald-500 transition-all"><CheckCircle2 size={24} /></button>
        <button onClick={onDelete} className="p-7 bg-rose-500/10 text-rose-500 rounded-3xl border border-rose-500/10 active:scale-90 transition-all"><Trash2 size={24} /></button>
      </div>
    </div>
  );
}

function LoadingUI() {
  return (
    <div className="h-screen bg-[#020402] flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin shadow-[0_0_60px_rgba(16,185,129,0.2)]" />
    </div>
  );
}

function SetupUI() {
  return (
    <div className="min-h-screen bg-[#020402] flex items-center justify-center p-10">
      <div className="max-w-md w-full bg-white/5 border border-rose-900/30 rounded-[4rem] p-16 text-center">
        <AlertCircle size={64} className="text-rose-500 mx-auto mb-10" />
        <h2 className="text-3xl font-black italic text-white mb-6 uppercase">Vault Locked</h2>
        <p className="text-white/30 text-xs uppercase tracking-widest leading-relaxed">System Architecture requires Firebase Keys in App.jsx.</p>
      </div>
    </div>
  );
}
