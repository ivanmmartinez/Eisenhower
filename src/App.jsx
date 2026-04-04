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
  AlertCircle
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
  { id: 'do', name: 'Do First', desc: 'Urgent & Important', color: 'text-rose-600', bg: 'bg-rose-50', icon: <Zap size={18} />, stages: 2 },
  { id: 'schedule', name: 'Schedule', desc: 'Important, Not Urgent', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <Clock size={18} />, stages: 4 },
  { id: 'delegate', name: 'Delegate', desc: 'Urgent, Not Important', color: 'text-blue-600', bg: 'bg-blue-50', icon: <Users size={18} />, stages: 2 },
  { id: 'eliminate', name: 'Eliminate', desc: 'Distraction / Neither', color: 'text-slate-500', bg: 'bg-slate-100', icon: <Bug size={18} />, stages: 1 },
];

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
    if (!isTimerRunning) {
      setTimeLeft(mins * 60);
    }
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
    // Removed automatic menu popup to allow "keep adding" workflow
  };

  const setQuadrant = async (qid) => {
    if (!selectedTask || !db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', selectedTask.id), { quadrant: qid });
    setShowPlantMenu(false);
    setSelectedTask(null);
    // Stay on current tab instead of jumping to garden
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

  if (!isConfigValid) return <SetupUI />;
  if (loading) return <Loader />;

  if (!user) return (
    <div className="min-h-screen bg-[#f8faf8] flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-10 shadow-sm text-center">
        <div className="w-16 h-16 bg-emerald-700 rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
          <Sprout size={32} />
        </div>
        <h1 className="text-2xl font-bold text-stone-800 mb-1">Priority Grove</h1>
        <p className="text-stone-400 text-xs uppercase tracking-widest mb-8">Nurture Your Intentions</p>
        
        <form onSubmit={async (e) => {
          e.preventDefault();
          setAuthError('');
          try {
            if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
            else await createUserWithEmailAndPassword(auth, email, password);
          } catch (err) { setAuthError(err.message); }
        }} className="space-y-4">
          <input type="email" required placeholder="Email" className="w-full px-5 py-3 rounded-xl border border-stone-200 focus:border-emerald-600 outline-none transition-all" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" required placeholder="Password" className="w-full px-5 py-3 rounded-xl border border-stone-200 focus:border-emerald-600 outline-none transition-all" value={password} onChange={e => setPassword(e.target.value)} />
          {authError && <p className="text-rose-600 text-xs font-medium">{authError}</p>}
          <button type="submit" className="w-full bg-emerald-800 text-white py-3 rounded-xl font-bold hover:bg-emerald-900 transition-all shadow-sm">
            {authMode === 'login' ? 'Enter Grove' : 'Create Grove'}
          </button>
        </form>
        <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-6 text-stone-400 text-xs hover:text-emerald-700 transition-colors">
          {authMode === 'login' ? "Need an account? Sign up" : "Have an account? Login"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8faf8] text-stone-800 font-sans pb-32">
      
      {/* NURTURE TIMER OVERLAY */}
      {focusTask && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="flex gap-2 mb-12 bg-stone-100 p-1 rounded-full">
            {[15, 25, 45, 60].map(m => (
              <button key={m} onClick={() => changeDuration(m)} className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${sessionMins === m ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
                {m}m
              </button>
            ))}
          </div>
          
          <div className="text-center mb-16 px-6">
            <h2 className="text-3xl font-bold text-stone-800 mb-2">Nurturing Growth</h2>
            <p className="text-stone-400 text-sm max-w-xs mx-auto">"{focusTask.text}"</p>
          </div>

          <div className="relative w-64 h-64 mb-16 flex items-center justify-center">
            <svg className="absolute inset-0 w-64 h-64 -rotate-90">
              <circle cx="128" cy="128" r="120" fill="none" stroke="#f1f5f1" strokeWidth="6" />
              <circle cx="128" cy="128" r="120" fill="none" stroke="#059669" strokeWidth="6" strokeLinecap="round" strokeDasharray="754" strokeDashoffset={754 - (754 * (timeLeft / (sessionMins * 60)))} className="transition-all duration-1000 ease-linear" />
            </svg>
            <span className="text-6xl font-light tabular-nums text-stone-700">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>

          <div className="flex gap-6">
            <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="w-20 h-20 bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all">
              {isTimerRunning ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
            </button>
            <button onClick={() => { setFocusTask(null); setIsTimerRunning(false); }} className="w-20 h-20 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center active:scale-95 transition-all">
              <X size={32} />
            </button>
          </div>
        </div>
      )}

      {/* PLANTING SHEET */}
      {showPlantMenu && (
        <div className="fixed inset-0 z-[110] bg-stone-900/20 backdrop-blur-sm flex items-end justify-center animate-in fade-in">
          <div className="max-w-md w-full bg-white rounded-t-[2.5rem] p-8 pb-12 shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-stone-800">Plant this task</h3>
              <button onClick={() => setShowPlantMenu(false)} className="p-2 text-stone-300 hover:text-stone-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              {QUADRANTS.map(q => (
                <button key={q.id} onClick={() => setQuadrant(q.id)} className="w-full flex items-center gap-4 p-5 rounded-2xl border border-stone-100 hover:border-emerald-600 hover:bg-stone-50 transition-all text-left">
                  <div className={`p-3 rounded-xl ${q.bg} ${q.color}`}>{q.icon}</div>
                  <div>
                    <div className="font-bold text-stone-800">{q.name}</div>
                    <div className="text-xs text-stone-400 font-medium">{q.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-6 text-[10px] text-center text-stone-300 italic uppercase tracking-widest">"{selectedTask?.text}"</p>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b border-stone-200 px-6 py-5 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-700 p-2 rounded-xl text-white shadow-sm"><Sprout size={20} /></div>
            <div>
              <h1 className="text-lg font-bold text-stone-800">Grove</h1>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 transition-all duration-1000" style={{ width: `${stats.health}%` }} />
                </div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{stats.health}% Vitality</span>
              </div>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 text-stone-300 hover:text-stone-600 transition-colors"><LogOut size={20} /></button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-10 space-y-12">
        
        {/* NAV TABS */}
        <div className="flex justify-center gap-3 mb-8">
          <TabButton active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} label="Tray" />
          <TabButton active={activeTab === 'garden'} onClick={() => setActiveTab('garden')} label="Garden" />
          <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Legacy" />
        </div>

        {activeTab === 'inbox' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5">
            <form onSubmit={addTask} className="relative group">
              <input autoFocus type="text" placeholder="Dump a thought..." className="w-full px-8 py-5 bg-white border border-stone-200 rounded-2xl text-lg font-medium text-stone-700 outline-none focus:border-emerald-600 transition-all shadow-sm" value={newTaskText} onChange={e => setNewTaskText(e.target.value)} />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-700 p-3 rounded-xl text-white shadow-md hover:bg-emerald-800 transition-all"><Plus size={24} /></button>
            </form>
            <div className="space-y-3">
              {grouped.inbox.map(task => (
                <TaskItem key={task.id} task={task} onAction={() => { setSelectedTask(task); setShowPlantMenu(true); }} onDelete={() => deleteTask(task.id)} isInbox />
              ))}
              {grouped.inbox.length === 0 && (
                <div className="py-20 text-center text-stone-200 flex flex-col items-center">
                  <Inbox className="mb-4 opacity-10" size={64} />
                  <p className="text-sm font-bold uppercase tracking-widest">Seed tray is clear</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'garden' && (
          <div className="space-y-16 animate-in fade-in duration-500">
            {QUADRANTS.map(q => (
              <div key={q.id} className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <div className={`${q.color} ${q.bg} p-2.5 rounded-xl shadow-sm`}>{q.icon}</div>
                  <div>
                    <h2 className="text-lg font-bold text-stone-800 leading-none">{q.name}</h2>
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">{q.desc}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {grouped[q.id].map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onNurture={() => startNurture(task)} 
                      onComplete={() => toggleComplete(task)} 
                      onAction={() => { setSelectedTask(task); setShowPlantMenu(true); }}
                      onDelete={() => deleteTask(task.id)} 
                    />
                  ))}
                  {grouped[q.id].length === 0 && (
                    <div className="col-span-full h-24 border-2 border-dashed border-stone-100 rounded-3xl flex items-center justify-center text-stone-200 text-xs font-bold uppercase tracking-widest">Plot awaiting seeds</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-md mx-auto grid grid-cols-2 gap-4 animate-in zoom-in duration-300">
            <StatCard label="Harvested" val={stats.done} icon={<Flower2 size={24} className="text-rose-500" />} />
            <StatCard label="Growing" val={stats.total - stats.done} icon={<Sprout size={24} className="text-emerald-700" />} />
            <StatCard label="Focus Acts" val={tasks.reduce((acc, t) => acc + (t.watered || 0), 0)} icon={<Droplets size={24} className="text-blue-500" />} />
            <StatCard label="Vitality" val={stats.health + "%"} icon={<Trophy size={24} className="text-amber-500" />} />
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-6 left-0 right-0 px-6 z-40 md:hidden pointer-events-none">
        <div className="max-w-sm mx-auto bg-white border border-stone-200 rounded-3xl p-2 flex justify-between shadow-xl pointer-events-auto">
          <NavIcon active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} icon={<Inbox size={22} />} />
          <NavIcon active={activeTab === 'garden'} onClick={() => setActiveTab('garden')} icon={<LayoutGrid size={22} />} />
          <NavIcon active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<Trophy size={22} />} />
        </div>
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button onClick={onClick} className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all ${active ? 'bg-emerald-800 text-white shadow-md' : 'bg-white text-stone-400 border border-stone-200 hover:border-stone-300'}`}>
      {label}
    </button>
  );
}

function NavIcon({ active, onClick, icon }) {
  return (
    <button onClick={onClick} className={`p-4 flex-1 flex justify-center rounded-2xl transition-all ${active ? 'bg-emerald-50 text-emerald-800' : 'text-stone-300 hover:text-stone-500'}`}>
      {icon}
    </button>
  );
}

function TaskItem({ task, onNurture, onComplete, onAction, onDelete, isInbox = false }) {
  const quad = QUADRANTS.find(q => q.id === task.quadrant);
  const isBloom = task.completed || (quad && task.watered >= quad.stages);
  
  return (
    <div className={`bg-white border border-stone-200 rounded-3xl p-6 flex flex-col gap-6 transition-all hover:border-emerald-600 hover:shadow-sm ${task.completed ? 'opacity-40 grayscale' : ''}`}>
      <div className="flex items-center gap-5">
        <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-stone-50 text-emerald-700">
          {isBloom ? <Flower2 size={28} className="animate-in zoom-in" /> : (task.watered || 0) > 0 ? <Sprout size={24} /> : <div className="w-3 h-3 bg-stone-200 rounded-full" />}
        </div>
        <div className="grow overflow-hidden">
          <h3 className="text-lg font-bold text-stone-800 truncate leading-tight">{task.text}</h3>
          {!isInbox && quad?.id !== 'eliminate' && (
            <div className="flex gap-1.5 mt-2">
              {[...Array(quad?.stages || 1)].map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i < (task.watered || 0) ? 'bg-emerald-600' : 'bg-stone-100'}`} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        {isInbox ? (
          <button onClick={onAction} className="flex-1 bg-emerald-700 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-800 transition-colors shadow-sm"><Sprout size={16} /> Plant</button>
        ) : !task.completed && quad?.id !== 'eliminate' ? (
          <button onClick={onNurture} className="flex-1 bg-emerald-700 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-emerald-800 transition-colors shadow-sm"><Droplets size={16} /> Nurture</button>
        ) : !isInbox ? (
          <button onClick={onAction} className="flex-1 bg-stone-50 text-stone-400 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-stone-100 transition-colors">Re-sort</button>
        ) : null}
        <button onClick={onComplete} className={`p-3 rounded-xl border transition-all ${task.completed ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-stone-300 border-stone-200 hover:text-emerald-700'}`}><CheckCircle2 size={20} /></button>
        <button onClick={onDelete} className="p-3 bg-stone-50 text-stone-300 rounded-xl hover:text-rose-600 transition-all"><Trash2 size={20} /></button>
      </div>
    </div>
  );
}

function StatCard({ label, val, icon }) {
  return (
    <div className="bg-white border border-stone-200 p-8 rounded-[2rem] text-center shadow-sm">
      <div className="flex justify-center mb-3 opacity-60">{icon}</div>
      <div className="text-4xl font-black text-stone-800 mb-1">{val}</div>
      <div className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">{label}</div>
    </div>
  );
}

function Loader() {
  return (
    <div className="h-screen bg-[#f8faf8] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function SetupUI() {
  return (
    <div className="min-h-screen bg-[#f8faf8] flex items-center justify-center p-8 text-center">
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-10 shadow-sm">
        <AlertCircle size={48} className="text-rose-500 mx-auto mb-6" />
        <h2 className="text-xl font-bold mb-4 text-stone-800">Configuration Required</h2>
        <p className="text-stone-500 text-sm mb-6">System needs Firebase API keys in <code>priority-grove-app.jsx</code>.</p>
        <div className="text-[10px] font-mono text-stone-300 bg-stone-50 p-4 rounded-xl">Lines 34-45</div>
      </div>
    </div>
  );
}
