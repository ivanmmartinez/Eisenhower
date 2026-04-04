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
  Droplets, 
  Sprout, 
  Flower2, 
  Trees, 
  Trophy, 
  Play, 
  Pause, 
  Timer, 
  X, 
  Bug, 
  LayoutGrid,
  Settings,
  Circle,
  AlertCircle,
  GripVertical,
  Compass
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

const appId = typeof __app_id !== 'undefined' ? __app_id : 'grove-v2-simple';

const QUADRANTS = [
  { id: 'do', name: 'Do First', desc: 'Urgent & Important', color: 'text-rose-600', border: 'border-rose-100', bg: 'bg-rose-50', icon: <Zap size={16} />, stages: 2 },
  { id: 'schedule', name: 'Schedule', desc: 'Important, Not Urgent', color: 'text-emerald-600', border: 'border-emerald-100', bg: 'bg-emerald-50', icon: <Clock size={16} />, stages: 4 },
  { id: 'delegate', name: 'Delegate', desc: 'Urgent, Not Important', color: 'text-blue-600', border: 'border-blue-100', bg: 'bg-blue-50', icon: <Users size={16} />, stages: 2 },
  { id: 'eliminate', name: 'Eliminate', desc: 'Distraction / Neither', color: 'text-slate-500', border: 'border-slate-200', bg: 'bg-slate-50', icon: <Bug size={16} />, stages: 1 },
];

const PlantGraphic = ({ type, watered, completed }) => {
  const quad = QUADRANTS.find(q => q.id === type) || QUADRANTS[0];
  const progress = watered / (quad.stages || 1);
  
  if (type === 'eliminate') {
    return <Bug className={`w-8 h-8 md:w-10 md:h-10 transition-all ${completed ? 'scale-0 opacity-0' : 'text-zinc-400 animate-pulse'}`} />;
  }

  return (
    <div className="relative w-12 h-12 md:w-16 md:h-16 flex items-end justify-center">
      <div className="absolute bottom-0 w-8 h-1 md:w-12 bg-black/20 rounded-full blur-sm" />
      <div className="transition-all duration-700 ease-out flex flex-col items-center"
           style={{ transform: `scale(${0.7 + (progress * 0.3)})` }}>
        {watered === 0 && !completed ? (
          <div className="w-4 h-4 md:w-5 md:h-5 bg-[#3a2a1d] rounded-full border-2 border-white/10 shadow-lg animate-bounce" />
        ) : (
          <div className="relative flex flex-col items-center">
            {type === 'schedule' ? (
              <Trees className={`w-10 h-10 md:w-14 md:h-14 ${completed ? 'text-emerald-300' : 'text-emerald-500'}`} />
            ) : (
              <Flower2 className={`w-9 h-9 md:w-12 md:h-12 ${completed ? 'text-emerald-600' : quad.id === 'do' ? 'text-rose-400' : 'text-blue-400'}`} />
            )}
            <div className="w-0.5 h-4 md:h-6 bg-emerald-900/30 rounded-full -mt-1" />
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
  const [activeTab, setActiveTab] = useState('inbox');
  
  // UI States
  const [selectedTask, setSelectedTask] = useState(null);
  const [showPlantMenu, setShowPlantMenu] = useState(false);
  const [focusTask, setFocusTask] = useState(null);
  const [sessionMins, setSessionMins] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [draggedId, setDraggedId] = useState(null);

  // Auth States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!isConfigValid || !auth) { setLoading(false); return; }
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
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
      completeSession();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const startNurture = (task) => {
    setFocusTask(task);
    setTimeLeft(sessionMins * 60);
    setIsTimerRunning(true);
  };

  const changeDuration = (mins) => {
    setSessionMins(mins);
    setTimeLeft(mins * 60);
    setIsTimerRunning(false); 
  };

  const completeSession = async () => {
    setIsTimerRunning(false);
    if (focusTask && db) {
      const quad = QUADRANTS.find(q => q.id === focusTask.quadrant);
      const newWatered = (focusTask.watered || 0) + 1;
      const updates = { watered: newWatered };
      if (quad && newWatered >= quad.stages) updates.completed = true;
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', focusTask.id), updates);
      setFocusTask(null);
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
  };

  const setQuadrant = async (qid) => {
    const taskId = selectedTask?.id || draggedId;
    if (!taskId || !db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), { quadrant: qid });
    setShowPlantMenu(false);
    setSelectedTask(null);
    setDraggedId(null);
  };

  const toggleComplete = async (task) => {
    if (!db) return;
    const quad = QUADRANTS.find(q => q.id === task.quadrant);
    const isDone = !task.completed;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), {
      completed: isDone,
      watered: isDone && quad ? quad.stages : task.watered
    });
  };

  const deleteTask = async (id) => {
    if (!db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', id));
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.completed).length;
    const health = total === 0 ? 100 : Math.round((done / total) * 100);
    return { total, done, health };
  }, [tasks]);

  const grouped = useMemo(() => {
    const b = { inbox: [], do: [], schedule: [], delegate: [], eliminate: [] };
    tasks.forEach(t => { if (b[t.quadrant]) b[t.quadrant].push(t); });
    return b;
  }, [tasks]);

  const handleDragStart = (e, taskId) => {
    setDraggedId(taskId);
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = async (e, targetQuadrant) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId') || draggedId;
    if (!taskId || !db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), { quadrant: targetQuadrant });
    setDraggedId(null);
  };

  if (!isConfigValid) return <SetupUI />;
  if (loading) return <Loader />;

  if (!user) return (
    <div className="min-h-screen bg-[#f8faf8] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-12 shadow-sm text-center">
        <div className="w-16 h-16 bg-emerald-700 rounded-2xl flex items-center justify-center text-white mx-auto mb-8 shadow-md">
          <Sprout size={32} />
        </div>
        <h1 className="text-2xl font-bold text-stone-800 mb-2">Priority Grove</h1>
        <p className="text-stone-400 text-sm uppercase tracking-widest mb-10">Strategic Mindsets</p>
        
        <form onSubmit={async (e) => {
          e.preventDefault();
          setAuthError('');
          try {
            if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
            else await createUserWithEmailAndPassword(auth, email, password);
          } catch (err) { setAuthError(err.message); }
        }} className="space-y-4">
          <input type="email" required placeholder="Email" className="w-full px-5 py-3 rounded-xl border border-stone-200 focus:border-emerald-600 outline-none transition-all text-base" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" required placeholder="Password" className="w-full px-5 py-3 rounded-xl border border-stone-200 focus:border-emerald-600 outline-none transition-all text-base" value={password} onChange={e => setPassword(e.target.value)} />
          {authError && <p className="text-rose-600 text-xs font-medium">{authError}</p>}
          <button type="submit" className="w-full bg-emerald-800 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-900 transition-all shadow-sm text-base">
            {authMode === 'login' ? 'Enter Grove' : 'Plant Roots'}
          </button>
        </form>
        <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-8 text-stone-400 text-sm hover:text-emerald-700 transition-colors">
          {authMode === 'login' ? "Need an account? Sign up" : "Back to login"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8faf8] text-stone-800 font-sans pb-32 overflow-x-hidden">
      
      {/* NURTURE TIMER OVERLAY */}
      {focusTask && (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="flex gap-4 mb-10 bg-stone-100 p-1.5 rounded-full">
            {[15, 25, 45, 60].map(m => (
              <button key={m} onClick={() => changeDuration(m)} className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${sessionMins === m ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
                {m}m
              </button>
            ))}
          </div>
          
          <div className="text-center mb-12 px-6">
            <h2 className="text-3xl md:text-4xl font-bold text-stone-800 mb-2">Nurturing Growth</h2>
            <p className="text-stone-400 text-lg italic truncate max-w-lg mx-auto">"{focusTask.text}"</p>
          </div>

          <div className="relative w-64 h-64 md:w-80 md:h-80 mb-16 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#f1f5f1" strokeWidth="8" />
              <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#059669" strokeWidth="8" strokeLinecap="round" strokeDasharray="283%" strokeDashoffset={283 - (283 * (timeLeft / (sessionMins * 60)))} className="transition-all duration-1000 ease-linear" />
            </svg>
            <span className="text-7xl md:text-8xl font-light tabular-nums text-stone-700">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>

          <div className="flex gap-6">
            <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="w-20 h-20 bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all">
              {isTimerRunning ? <Pause size={36} /> : <Play size={36} className="ml-1" />}
            </button>
            <button onClick={() => { setFocusTask(null); setIsTimerRunning(false); }} className="w-20 h-20 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center active:scale-95 transition-all">
              <X size={36} />
            </button>
          </div>
        </div>
      )}

      {/* PLANTING SHEET */}
      {showPlantMenu && (
        <div className="fixed inset-0 z-[110] bg-stone-900/20 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <div className="max-w-xl w-full bg-white rounded-[2rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom md:zoom-in duration-300">
            <div className="flex justify-between items-center mb-8 px-2">
              <h3 className="text-2xl font-bold text-stone-800">Assign Strategy</h3>
              <button onClick={() => setShowPlantMenu(false)} className="p-2 text-stone-300 hover:text-stone-600"><X size={24} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button onClick={() => setQuadrant('inbox')} className="md:col-span-2 flex items-center gap-4 p-4 rounded-2xl border border-stone-100 hover:border-emerald-600 hover:bg-stone-50 transition-all text-left">
                <div className={`p-2.5 rounded-xl bg-stone-100 text-stone-500`}><Inbox size={20} /></div>
                <div>
                  <div className="font-bold text-stone-800 text-base">Return to Tray</div>
                  <div className="text-xs text-stone-400 font-medium uppercase tracking-wider">Unsorted thoughts</div>
                </div>
              </button>
              {QUADRANTS.map(q => (
                <button key={q.id} onClick={() => setQuadrant(q.id)} className="flex items-center gap-4 p-4 rounded-2xl border border-stone-100 hover:border-emerald-600 hover:bg-stone-50 transition-all text-left">
                  <div className={`p-2.5 rounded-xl ${q.bg} ${q.color}`}>{q.icon}</div>
                  <div>
                    <div className="font-bold text-stone-800 text-base">{q.name}</div>
                    <div className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">{q.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-8 text-xs text-center text-stone-300 italic uppercase tracking-[0.2em] truncate px-4">"{selectedTask?.text}"</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-700 p-2 rounded-xl text-white shadow-sm"><Sprout size={24} /></div>
            <div>
              <h1 className="text-xl font-black text-stone-800 tracking-tight">Priority Grove</h1>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-stone-100 rounded-full overflow-hidden border border-stone-200/50">
                  <div className="h-full bg-emerald-600 transition-all duration-1000 shadow-sm" style={{ width: `${stats.health}%` }} />
                </div>
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">{stats.health}% Vitality</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="hidden md:flex items-center gap-2 text-stone-300 text-[10px] font-bold uppercase tracking-widest">
               <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
               Cloud Synced
             </div>
             <button onClick={() => signOut(auth)} className="p-2.5 text-stone-300 hover:text-rose-500 transition-colors hover:bg-rose-50 rounded-xl"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-12 space-y-12">
        
        {/* NAV TABS */}
        <div className="flex justify-center gap-4 mb-12">
          <TabButton active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} label="Mind Tray" />
          <TabButton active={activeTab === 'garden'} onClick={() => setActiveTab('garden')} label="Strategy Garden" />
          <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Nurture Log" />
        </div>

        {activeTab === 'inbox' && (
          <div 
            className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-5"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 'inbox')}
          >
            <form onSubmit={addTask} className="relative group">
              <input autoFocus type="text" placeholder="Drop a thought or task..." className="w-full px-10 py-6 bg-white border-2 border-stone-100 rounded-3xl text-xl font-medium text-stone-700 outline-none focus:border-emerald-600 transition-all shadow-md placeholder:text-stone-300" value={newTaskText} onChange={e => setNewTaskText(e.target.value)} />
              <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-700 p-4 rounded-2xl text-white shadow-xl hover:bg-emerald-800 active:scale-90 transition-all"><Plus size={28} /></button>
            </form>
            <div className="space-y-4">
              {grouped.inbox.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onAction={() => { setSelectedTask(task); setShowPlantMenu(true); }} 
                  onDelete={() => deleteTask(task.id)} 
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  isInbox 
                />
              ))}
              {grouped.inbox.length === 0 && (
                <div className="py-32 text-center text-stone-200 flex flex-col items-center border-2 border-dashed border-stone-100 rounded-[3rem]">
                  <Inbox className="mb-4 opacity-5" size={80} />
                  <p className="text-xs font-black uppercase tracking-[0.4em]">Tray is Unburdened</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'garden' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 animate-in fade-in duration-500">
            {QUADRANTS.map(q => (
              <div 
                key={q.id} 
                className={`space-y-6 p-8 rounded-[2.5rem] border-2 border-dashed ${q.border} bg-white/30 backdrop-blur-sm transition-all min-h-[300px] shadow-sm`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, q.id)}
              >
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-4">
                    <div className={`${q.color} ${q.bg} p-3 rounded-2xl shadow-sm border border-stone-100`}>{q.icon}</div>
                    <div>
                      <h2 className="text-xl font-black text-stone-800 leading-none uppercase tracking-tighter">{q.name}</h2>
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-1.5">{q.desc}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em] bg-stone-100 px-3 py-1.5 rounded-full">{grouped[q.id].length} Roots</span>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {grouped[q.id].map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onNurture={() => startNurture(task)} 
                      onComplete={() => toggleComplete(task)} 
                      onAction={() => { setSelectedTask(task); setShowPlantMenu(true); }}
                      onDelete={() => deleteTask(task.id)} 
                      onDragStart={(e) => handleDragStart(e, task.id)}
                    />
                  ))}
                  {grouped[q.id].length === 0 && (
                    <div className="h-24 flex items-center justify-center text-stone-200 text-[10px] font-black uppercase tracking-[0.3em]">Earth awaiting {q.name}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in zoom-in duration-300">
            <StatCard label="Harvested" val={stats.done} icon={<Flower2 size={24} className="text-emerald-600" />} />
            <StatCard label="In Soil" val={stats.total - stats.done} icon={<Sprout size={24} className="text-emerald-700" />} />
            <StatCard label="Focus Acts" val={tasks.reduce((acc, t) => acc + (t.watered || 0), 0)} icon={<Droplets size={24} className="text-blue-500" />} />
            <StatCard label="Grove Health" val={stats.health + "%"} icon={<Trophy size={24} className="text-amber-500" />} />
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-6 left-0 right-0 px-6 z-40 md:hidden pointer-events-none">
        <div className="max-w-sm mx-auto bg-white/95 backdrop-blur-xl border border-stone-200 rounded-[2.5rem] p-2 flex justify-between shadow-2xl pointer-events-auto">
          <NavIcon active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} icon={<Inbox size={24} />} />
          <NavIcon active={activeTab === 'garden'} onClick={() => setActiveTab('garden')} icon={<LayoutGrid size={24} />} />
          <NavIcon active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<Trophy size={24} />} />
        </div>
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button onClick={onClick} className={`px-10 py-3 rounded-full text-sm font-black uppercase tracking-widest transition-all ${active ? 'bg-emerald-800 text-white shadow-xl scale-105' : 'bg-white text-stone-400 border border-stone-200 hover:border-stone-400'}`}>
      {label}
    </button>
  );
}

function NavIcon({ active, onClick, icon }) {
  return (
    <button onClick={onClick} className={`p-4 flex-1 flex justify-center rounded-[1.8rem] transition-all ${active ? 'bg-emerald-700 text-white shadow-lg' : 'text-stone-300 hover:text-stone-500'}`}>
      {icon}
    </button>
  );
}

function TaskItem({ task, onNurture, onComplete, onAction, onDelete, onDragStart, isInbox = false }) {
  const quad = QUADRANTS.find(q => q.id === task.quadrant);
  const isBloom = task.completed || (quad && task.watered >= quad.stages);
  
  return (
    <div 
      draggable
      onDragStart={onDragStart}
      className={`bg-white border border-stone-200 rounded-3xl p-5 md:p-7 flex flex-col gap-6 transition-all hover:border-emerald-400 hover:shadow-lg cursor-grab active:cursor-grabbing ${task.completed ? 'opacity-40 grayscale bg-stone-50' : 'shadow-sm'}`}
    >
      <div className="flex items-center gap-6">
        <div className="shrink-0 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-stone-50 text-emerald-700 shadow-inner">
          <div className="relative">
            {isBloom ? <Flower2 size={28} className="animate-in zoom-in" /> : (task.watered || 0) > 0 ? <Sprout size={24} /> : <GripVertical size={20} className="text-stone-300" />}
          </div>
        </div>
        <div className="grow overflow-hidden">
          <h3 className="text-lg md:text-xl font-bold text-stone-800 truncate leading-tight">{task.text}</h3>
          {!isInbox && quad?.id !== 'eliminate' && !task.completed && (
            <div className="flex gap-2 mt-2.5">
              {[...Array(quad?.stages || 1)].map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full shadow-sm ${i < (task.watered || 0) ? 'bg-emerald-600' : 'bg-stone-100'}`} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-3 items-center">
        {isInbox ? (
          <button onClick={onAction} className="flex-1 bg-emerald-700 text-white py-3 md:py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-emerald-800 transition-all shadow-md active:scale-95">Plant Seed</button>
        ) : !task.completed && quad?.id !== 'eliminate' ? (
          <button onClick={onNurture} className="flex-1 bg-emerald-700 text-white py-3 md:py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-emerald-800 transition-all shadow-md active:scale-95">Nurture</button>
        ) : (
          <div className="flex-1" />
        )}
        
        {!isInbox && (
          <button onClick={onAction} className="p-3 md:p-4 bg-stone-50 text-stone-400 rounded-2xl hover:bg-stone-100 hover:text-stone-600 transition-all" title="Re-plan Strategy">
            <Settings size={20} />
          </button>
        )}

        <button onClick={onComplete} className={`p-3 md:p-4 rounded-2xl border-2 transition-all ${task.completed ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-stone-200 border-stone-100 hover:text-emerald-700 hover:border-emerald-200'}`}><CheckCircle2 size={24} /></button>
        <button onClick={() => { if(confirm('Uproot this seed permanently?')) deleteTask(task.id) }} className="p-3 md:p-4 bg-stone-50 text-stone-200 rounded-2xl hover:text-rose-600 transition-all hover:bg-rose-50"><Trash2 size={24} /></button>
      </div>
    </div>
  );
}

function StatCard({ label, val, icon }) {
  return (
    <div className="bg-white border border-stone-200 p-10 rounded-[2.5rem] text-center shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-center mb-4 opacity-40 group-hover:opacity-100 transition-opacity">{icon}</div>
      <div className="text-5xl font-black text-stone-800 mb-2 tracking-tighter italic">{val}</div>
      <div className="text-[11px] font-black text-stone-400 uppercase tracking-[0.3em]">{label}</div>
    </div>
  );
}

function Loader() {
  return (
    <div className="h-screen bg-[#f8faf8] flex items-center justify-center">
      <div className="w-14 h-14 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function SetupUI() {
  return (
    <div className="min-h-screen bg-[#f8faf8] flex items-center justify-center p-8 text-center">
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-[3rem] p-12 shadow-2xl">
        <AlertCircle size={64} className="text-rose-500 mx-auto mb-8 animate-pulse" />
        <h2 className="text-2xl font-black mb-4 text-stone-800 tracking-tight italic uppercase">Vault Locked</h2>
        <p className="text-stone-500 text-sm mb-8 leading-relaxed uppercase tracking-widest font-bold">Priority Grove System requires Firebase credentials in App.jsx (Lines 34-45).</p>
      </div>
    </div>
  );
}
