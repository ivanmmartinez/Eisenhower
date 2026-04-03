import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Circle, 
  Zap, 
  Clock, 
  Users, 
  Coffee, 
  Inbox,
  LayoutGrid,
  Sparkles,
  LogOut,
  Lock,
  Mail,
  UserPlus,
  LogIn,
  AlertCircle,
  ChevronRight,
  Settings,
  Droplets,
  Sprout,
  Flower2,
  Trees,
  Leaf,
  Bug,
  Trophy,
  Play,
  Pause,
  RotateCcw,
  Timer as TimerIcon,
  X
} from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = (typeof __firebase_config !== 'undefined' && __firebase_config)
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyAKxMTyAC6Scy2tgUgHX7KEH9Yz0MqiA6Q",
      authDomain: "eisenhower-d9e5f.firebaseapp.com",
      projectId: "eisenhower-d9e5f",
      storageBucket: "eisenhower-d9e5f.firebasestorage.app",
      messagingSenderId: "324572083965",
      appId: "1:324572083965:web:6c8bccb006292333c87094",
      measurementId: "G-EEJX95SNYP"
    };

const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY");

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

const appId = typeof __app_id !== 'undefined' ? __app_id : 'eisenhower';

const GARDEN_PLOTS = [
  { 
    id: 'do', 
    title: 'Sunflower', 
    desc: 'Urgent & Important', 
    color: 'from-amber-700 to-orange-900', 
    plantColor: 'text-amber-400',
    icon: <Zap className="w-5 h-5" />,
    reqWater: 1, // One session to bloom
  },
  { 
    id: 'schedule', 
    title: 'Ancient Oak', 
    desc: 'Deep Work / Strategic', 
    color: 'from-emerald-900 to-green-950', 
    plantColor: 'text-emerald-500',
    icon: <Clock className="w-5 h-5" />,
    reqWater: 4, // Four sessions to mature
  },
  { 
    id: 'delegate', 
    title: 'Climbing Ivy', 
    desc: 'Delegate / Follow-up', 
    color: 'from-teal-900 to-slate-900', 
    plantColor: 'text-teal-400',
    icon: <Users className="w-5 h-5" />,
    reqWater: 2,
  },
  { 
    id: 'eliminate', 
    title: 'Withered Thorn', 
    desc: 'Eliminate / Distraction', 
    color: 'from-zinc-800 to-black', 
    plantColor: 'text-zinc-600',
    icon: <Bug className="w-5 h-5" />,
    reqWater: 0,
  },
];

const PlantVisual = ({ type, watered, completed }) => {
  const plot = GARDEN_PLOTS.find(p => p.id === type) || GARDEN_PLOTS[0];
  const isBloom = completed || (plot.reqWater > 0 && watered >= plot.reqWater);
  const isSprout = !isBloom && watered > 0;

  if (type === 'eliminate') {
    return <Bug className={`w-12 h-12 transition-all duration-700 ${completed ? 'scale-0 opacity-0' : 'text-zinc-700 animate-pulse'}`} />;
  }

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <div className="absolute bottom-1 w-10 h-1.5 bg-black/40 rounded-full blur-md" />
      {!isBloom && !isSprout && <div className="w-4 h-4 bg-[#4a3728] rounded-full border border-white/5 animate-pulse" />}
      {isSprout && <Sprout className="w-10 h-10 text-emerald-400 animate-bounce" />}
      {isBloom && (
        <div className="animate-in zoom-in duration-500">
          {type === 'schedule' ? (
            <Trees className={`w-14 h-14 ${completed ? 'text-emerald-200 drop-shadow-[0_0_15px_rgba(167,243,208,0.5)]' : 'text-emerald-600'}`} />
          ) : (
            <Flower2 className={`w-12 h-12 ${completed ? 'text-amber-200 drop-shadow-[0_0_15px_rgba(253,230,138,0.5)]' : plot.plantColor}`} />
          )}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [activeTab, setActiveTab] = useState('garden'); 
  const [activePlot, setActivePlot] = useState('do');
  
  // Timer State
  const [focusTask, setFocusTask] = useState(null);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); 
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!isConfigValid || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const tasksRef = collection(db, 'artifacts', appId, 'users', user.uid, 'tasks');
    const q = query(tasksRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Sync Error:", err));
    return () => unsubscribe();
  }, [user]);

  // Timer Logic
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      handleFocusComplete();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const handleFocusComplete = async () => {
    setIsTimerRunning(false);
    if (focusTask) {
      await waterTask(focusTask);
      setFocusTask(null);
      setTimeLeft(25 * 60);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!isConfigValid || !auth) return;
    setAuthError('');
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim() || !user || !db) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), {
      text: newTaskText,
      quadrant: 'inbox',
      completed: false,
      watered: 0,
      createdAt: Date.now()
    });
    setNewTaskText('');
    setActiveTab('inbox');
  };

  const waterTask = async (task) => {
    if (!user || !db || task.completed) return;
    const plot = GARDEN_PLOTS.find(p => p.id === task.quadrant);
    const newWatered = (task.watered || 0) + 1;
    const updates = { watered: newWatered };
    if (plot && newWatered >= plot.reqWater) updates.completed = true;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), updates);
  };

  const toggleTask = async (task) => {
    if (!user || !db) return;
    const plot = GARDEN_PLOTS.find(p => p.id === task.quadrant);
    const isCompleting = !task.completed;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), { 
      completed: isCompleting,
      watered: isCompleting && plot ? plot.reqWater : task.watered 
    });
  };

  const moveTask = async (taskId, newQuadrant) => {
    if (!user || !db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), { quadrant: newQuadrant });
  };

  const deleteTask = async (taskId) => {
    if (!user || !db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId));
  };

  const groupedTasks = useMemo(() => {
    const base = { inbox: [], do: [], schedule: [], delegate: [], eliminate: [] };
    tasks.forEach(t => { if (base[t.quadrant]) base[t.quadrant].push(t); });
    return base;
  }, [tasks]);

  const gardenVitality = useMemo(() => {
    if (tasks.length === 0) return 100;
    const completed = tasks.filter(t => t.completed).length;
    const weeds = tasks.filter(t => t.quadrant === 'eliminate' && !t.completed).length;
    return Math.max(0, Math.round((completed / tasks.length) * 100) - (weeds * 10));
  }, [tasks]);

  if (!isConfigValid) return <SetupRequired />;
  if (loading) return <LoadingScreen />;

  if (!user) return (
    <div className="min-h-screen bg-[#080b08] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#121812] rounded-[3rem] border border-white/5 p-10 md:p-14 shadow-2xl">
        <div className="bg-emerald-600 w-20 h-20 rounded-[2rem] flex items-center justify-center text-white mb-8 mx-auto shadow-xl transform rotate-3">
          <Leaf className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black text-center text-white mb-2 tracking-tighter">Garden</h2>
        <p className="text-center text-emerald-500/50 font-bold uppercase tracking-[0.3em] text-[9px] mb-10">Sync Your Focus Across Devices</p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <input 
            type="email" required placeholder="Gardener Email"
            className="w-full px-6 py-5 bg-black/40 rounded-2xl border border-white/5 text-white outline-none focus:border-emerald-500 transition-all"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" required placeholder="Security Key"
            className="w-full px-6 py-5 bg-black/40 rounded-2xl border border-white/5 text-white outline-none focus:border-emerald-500 transition-all"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          {authError && <p className="text-rose-500 text-[10px] font-bold text-center uppercase tracking-widest">{authError}</p>}
          <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black shadow-xl hover:bg-emerald-500 transition-all active:scale-95 uppercase tracking-widest text-sm">
            {authMode === 'login' ? 'Open Garden' : 'Seed a Grove'}
          </button>
        </form>
        <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full mt-8 text-emerald-800 text-[10px] font-black uppercase tracking-widest hover:text-emerald-500 transition-colors">
          {authMode === 'login' ? "New Grower? Register" : "Returning? Sign In"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050705] text-white font-sans pb-32 select-none overflow-x-hidden">
      
      {/* Timer Overlay */}
      {focusTask && (
        <div className="fixed inset-0 z-[100] bg-[#050705]/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
           <div className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em] mb-4">Nurturing Growth</div>
           <h2 className="text-2xl font-black text-center mb-12 italic truncate max-w-sm">"{focusTask.text}"</h2>
           
           <div className="relative w-64 h-64 mb-16 flex items-center justify-center">
              <svg className="absolute inset-0 w-64 h-64 -rotate-90">
                <circle cx="128" cy="128" r="120" fill="none" stroke="#101810" strokeWidth="8" />
                <circle cx="128" cy="128" r="120" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray="754" strokeDashoffset={754 - (754 * (timeLeft / (25 * 60)))} className="transition-all duration-1000 ease-linear" />
              </svg>
              <div className="text-6xl font-mono font-black text-emerald-400">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
           </div>

           <div className="flex gap-8">
              <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all">
                {isTimerRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </button>
              <button onClick={() => { setFocusTask(null); setIsTimerRunning(false); setTimeLeft(25 * 60); }} className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center active:scale-90 transition-all">
                <X className="w-8 h-8 text-rose-500" />
              </button>
           </div>
           <p className="mt-12 text-[10px] font-bold text-white/20 uppercase tracking-widest text-center">Your plant is thriving while you focus.</p>
        </div>
      )}

      {/* Global Header */}
      <header className="sticky top-0 z-50 bg-[#050705]/80 backdrop-blur-xl border-b border-white/5 px-6 py-5">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600/20 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/20">
              <TimerIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black italic tracking-tighter">FOREST<span className="text-emerald-500">HUB</span></h1>
              <div className="flex items-center gap-3">
                <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${gardenVitality}%` }} />
                </div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{gardenVitality}% VITALITY</span>
              </div>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="p-3 bg-white/5 rounded-2xl text-white/30 hover:text-rose-400 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-10">
        
        {/* Tab Selection */}
        <div className="flex bg-white/5 p-1.5 rounded-[2.5rem] mb-10 border border-white/5">
          <NavTab active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} icon={<Inbox className="w-5 h-5" />} label="Seeds" />
          <NavTab active={activeTab === 'garden'} onClick={() => setActiveTab('garden')} icon={<Trees className="w-5 h-5" />} label="Forest" />
          <NavTab active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<Trophy className="w-5 h-5" />} label="Legacy" />
        </div>

        {activeTab === 'inbox' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 space-y-8">
            <form onSubmit={addTask} className="relative group">
              <input 
                autoFocus
                type="text"
                placeholder="What's the next seed? #urgent #work"
                className="w-full px-8 py-7 bg-white/5 border border-white/10 rounded-[2.5rem] text-xl text-white placeholder:text-white/10 outline-none focus:border-emerald-500 focus:bg-white/10 transition-all shadow-2xl"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
              />
              <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-600 p-4 rounded-3xl text-white shadow-xl active:scale-90 transition-all">
                <Plus className="w-8 h-8" />
              </button>
            </form>

            <div className="grid grid-cols-1 gap-4">
              {groupedTasks.inbox.map(task => (
                <ForestCard 
                  key={task.id} 
                  task={task} 
                  onFocus={() => { setFocusTask(task); setTimeLeft(25 * 60); setIsTimerRunning(true); }}
                  onToggle={() => toggleTask(task)}
                  onMove={(q) => moveTask(task.id, q)}
                  onDelete={() => deleteTask(task.id)}
                  isInbox
                />
              ))}
              {groupedTasks.inbox.length === 0 && (
                <div className="py-32 text-center opacity-10 flex flex-col items-center">
                  <Sparkles className="w-16 h-16 mb-4" />
                  <p className="text-sm font-black uppercase tracking-[0.5em]">Empty Glade</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'garden' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            {/* Plot Selectors - Clear Labels */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {GARDEN_PLOTS.map(p => (
                <button 
                  key={p.id}
                  onClick={() => setActivePlot(p.id)}
                  className={`p-5 rounded-[2rem] border text-left transition-all relative overflow-hidden group ${activePlot === p.id ? 'bg-white/10 border-emerald-500 shadow-2xl' : 'bg-white/5 border-white/5 text-white/30'}`}
                >
                  <div className={`p-2 rounded-xl w-fit mb-3 ${activePlot === p.id ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/10'}`}>{p.icon}</div>
                  <div className="text-[11px] font-black uppercase tracking-tight leading-tight">{p.title}</div>
                  <div className="text-[8px] font-bold opacity-40 uppercase mt-1">{groupedTasks[p.id].length} Roots</div>
                </button>
              ))}
            </div>

            {/* Matrix View */}
            <div className={`bg-gradient-to-br ${GARDEN_PLOTS.find(p => p.id === activePlot).color} rounded-[3.5rem] p-8 md:p-14 shadow-2xl border border-white/5 relative min-h-[500px]`}>
               <div className="relative z-10 flex justify-between items-center mb-12">
                  <div>
                    <h2 className="text-3xl font-black italic tracking-tighter text-white">{GARDEN_PLOTS.find(p => p.id === activePlot).title}s</h2>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest mt-2">{GARDEN_PLOTS.find(p => p.id === activePlot).desc}</p>
                  </div>
                  <div className="bg-black/40 px-5 py-3 rounded-2xl border border-white/5 flex items-center gap-3">
                     <Sprout className="w-4 h-4 text-emerald-400" />
                     <span className="text-xs font-black">{groupedTasks[activePlot].length} Active</span>
                  </div>
               </div>

               <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
                 {groupedTasks[activePlot].map(task => (
                    <ForestCard 
                      key={task.id} 
                      task={task} 
                      onFocus={() => { setFocusTask(task); setTimeLeft(25 * 60); setIsTimerRunning(true); }}
                      onToggle={() => toggleTask(task)}
                      onMove={(q) => moveTask(task.id, q)}
                      onDelete={() => deleteTask(task.id)}
                    />
                 ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="animate-in zoom-in duration-500 max-w-xl mx-auto bg-white/5 rounded-[3rem] p-12 border border-white/5 text-center shadow-2xl">
            <div className="w-28 h-28 bg-emerald-600/10 rounded-[2rem] flex items-center justify-center mx-auto mb-10 border border-emerald-500/20">
              <Trophy className="w-14 h-14 text-amber-500" />
            </div>
            <h2 className="text-2xl font-black italic mb-2 uppercase tracking-tighter">{user.email?.split('@')[0]}'S LEGACY</h2>
            <p className="text-emerald-700 text-[10px] font-black uppercase tracking-[0.4em] mb-12">Records of Nurtured Focus</p>
            
            <div className="grid grid-cols-2 gap-6 text-left">
              <StatBlock label="Harvested" val={tasks.filter(t => t.completed).length} color="text-emerald-400" />
              <StatBlock label="Active" val={tasks.filter(t => !t.completed).length} color="text-blue-400" />
              <StatBlock label="Focus Time" val={tasks.reduce((acc, t) => acc + (t.watered || 0), 0) * 25 + "m"} color="text-amber-400" />
              <StatBlock label="Vitality" val={gardenVitality + "%"} color="text-emerald-500" />
            </div>
          </div>
        )}
      </main>

      {/* Global Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#050705]/90 backdrop-blur-2xl border-t border-white/5 px-8 py-5 pb-10 flex justify-around items-center z-40">
        <NavIcon active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} icon={<Droplets className="w-6 h-6" />} label="Water" />
        <NavIcon active={activeTab === 'garden'} onClick={() => setActiveTab('garden')} icon={<Flower2 className="w-6 h-6" />} label="Grove" />
        <NavIcon active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<Settings className="w-6 h-6" />} label="Toolbox" />
      </nav>
    </div>
  );
}

function ForestCard({ task, onFocus, onToggle, onMove, onDelete, isInbox }) {
  const [showPicker, setShowPicker] = useState(false);
  const plot = GARDEN_PLOTS.find(p => p.id === task.quadrant) || { title: 'Unseeded', reqWater: 1 };
  
  return (
    <div className={`group relative bg-[#0d120d] border border-white/5 rounded-[2.5rem] p-6 flex flex-col gap-5 transition-all hover:bg-[#121812] ${task.completed ? 'opacity-40 grayscale pointer-events-none' : 'shadow-xl'}`}>
      <div className="flex items-center gap-6">
        <div className="shrink-0 scale-110">
          <PlantVisual type={task.quadrant} watered={task.watered || 0} completed={task.completed} />
        </div>
        
        <div className="grow overflow-hidden">
          <span className="text-xl font-bold tracking-tight text-white leading-tight block truncate md:whitespace-normal">
            {task.text}
          </span>
          <div className="flex items-center gap-3 mt-3">
             <span className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
               {plot.title}
             </span>
             {!task.completed && task.quadrant !== 'eliminate' && (
                <div className="flex gap-1.5 ml-auto">
                   {[...Array(plot.reqWater || 1)].map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < (task.watered || 0) ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-white/5'}`} />
                   ))}
                </div>
             )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {!task.completed && task.quadrant !== 'eliminate' && (
             <button onClick={onFocus} className="p-4 bg-emerald-600/10 text-emerald-400 rounded-3xl border border-emerald-500/10 active:scale-90 transition-all">
                <TimerIcon className="w-6 h-6" />
             </button>
          )}
          <button onClick={() => setShowPicker(!showPicker)} className="p-4 bg-white/5 rounded-3xl text-white/20 hover:text-emerald-500 transition-colors">
            <ChevronRight className={`w-6 h-6 transition-transform ${showPicker ? 'rotate-90 text-emerald-500' : ''}`} />
          </button>
        </div>
      </div>

      {showPicker && (
        <div className="grid grid-cols-1 gap-2 pt-5 border-t border-white/5 animate-in slide-in-from-top-4">
           <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-2 px-2 text-center">Planting Options</p>
           <div className="grid grid-cols-2 gap-2">
             {GARDEN_PLOTS.map(q => (
               <button 
                 key={q.id}
                 onClick={() => { onMove(q.id); setShowPicker(false); }}
                 className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${task.quadrant === q.id ? 'bg-emerald-600 border-transparent text-white shadow-lg' : 'bg-black/40 border-white/5 text-white/40'}`}
               >
                 <div className="p-2 bg-black/20 rounded-lg">{q.icon}</div>
                 <div className="text-left">
                   <div className="text-[10px] font-black uppercase tracking-tight">{q.title}</div>
                   <div className="text-[8px] opacity-50 font-bold uppercase">{q.desc.split(' ')[0]}</div>
                 </div>
               </button>
             ))}
           </div>
           <div className="flex gap-2 mt-2">
             <button onClick={onToggle} className="flex-1 py-4 bg-emerald-500/10 text-emerald-500 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-emerald-500/10">Harvest Now</button>
             <button onClick={onDelete} className="p-4 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/10"><Trash2 className="w-5 h-5" /></button>
           </div>
        </div>
      )}
    </div>
  );
}

function NavTab({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-[2rem] transition-all duration-500 ${active ? 'bg-emerald-600 text-white shadow-2xl scale-105' : 'text-white/20 hover:text-white/40'}`}>
      {icon}
      <span className={`text-[9px] font-black uppercase tracking-widest transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
    </button>
  );
}

function NavIcon({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-2 transition-all ${active ? 'text-emerald-500 scale-110' : 'text-white/20'}`}>
      <div className={`p-3 rounded-2xl transition-all ${active ? 'bg-emerald-500/10' : ''}`}>{icon}</div>
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function StatBlock({ label, val, color }) {
  return (
    <div className="bg-black/40 p-6 rounded-[2.5rem] border border-white/5">
      <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-black italic tracking-tighter ${color}`}>{val}</p>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="h-screen bg-[#050705] flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin shadow-[0_0_50px_rgba(16,185,129,0.3)]" />
    </div>
  );
}

function SetupRequired() {
  return (
    <div className="min-h-screen bg-[#080b08] flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-[#121812] rounded-[3.5rem] p-12 border border-rose-950/30 text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
        <h2 className="text-2xl font-black italic text-white mb-4">CONFIG ERROR</h2>
        <p className="text-white/30 text-xs leading-relaxed uppercase tracking-widest">Architect: Please verify your Firebase Credentials in App.jsx (Line 40-50).</p>
      </div>
    </div>
  );
}
