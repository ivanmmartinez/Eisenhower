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
  signOut,
  GoogleAuthProvider,
  linkWithPopup,
  signInWithPopup
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
  AlertCircle,
  GripVertical,
  Compass,
  Calendar,
  Link2,
  ExternalLink
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

const appId = typeof __app_id !== 'undefined' ? __app_id : 'grove-v2-final';

const QUADRANTS = [
  { id: 'do', name: 'Do First', desc: 'Urgent & Important', color: 'text-rose-600', border: 'border-rose-100', bg: 'bg-rose-50', icon: <Zap size={16} />, stages: 2 },
  { id: 'schedule', name: 'Schedule', desc: 'Important, Not Urgent', color: 'text-emerald-600', border: 'border-emerald-100', bg: 'bg-emerald-50', icon: <Clock size={16} />, stages: 4 },
  { id: 'delegate', name: 'Delegate', desc: 'Urgent, Not Important', color: 'text-blue-600', border: 'border-blue-100', bg: 'bg-blue-50', icon: <Users size={16} />, stages: 2 },
  { id: 'eliminate', name: 'Eliminate', desc: 'Distractions', color: 'text-slate-500', border: 'border-slate-200', bg: 'bg-slate-50', icon: <Bug size={16} />, stages: 1 },
];

const PlantGraphic = ({ type, watered, completed }) => {
  const quad = QUADRANTS.find(q => q.id === type) || QUADRANTS[0];
  const progress = watered / (quad.stages || 1);
  
  if (type === 'eliminate') {
    return <Bug className={`w-8 h-8 md:w-10 md:h-10 transition-all ${completed ? 'scale-0 opacity-0' : 'text-zinc-400 animate-pulse'}`} />;
  }

  return (
    <div className="relative w-10 h-10 md:w-12 md:h-12 flex items-end justify-center">
      <div className="absolute bottom-0 w-8 h-1 bg-black/10 rounded-full blur-sm" />
      <div className="transition-all duration-700 ease-out flex flex-col items-center"
           style={{ transform: `scale(${0.7 + (progress * 0.3)})` }}>
        {watered === 0 && !completed ? (
          <div className="w-3.5 h-3.5 bg-[#3a2a1d] rounded-full border-2 border-white/10 shadow-sm animate-bounce" />
        ) : (
          <div className="relative flex flex-col items-center">
            {type === 'schedule' ? (
              <Trees className={`w-8 h-8 md:w-10 md:h-10 ${completed ? 'text-emerald-300' : 'text-emerald-500'}`} />
            ) : (
              <Flower2 className={`w-8 h-8 md:w-9 md:h-9 ${completed ? 'text-emerald-600' : quad.id === 'do' ? 'text-rose-400' : 'text-blue-400'}`} />
            )}
            <div className="w-0.5 h-3 bg-emerald-900/20 rounded-full -mt-0.5" />
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

  // Google Calendar States
  const [googleToken, setGoogleToken] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleError, setGoogleError] = useState(null);

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

  const connectGoogle = async () => {
    setGoogleError(null);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    try {
      let result;
      // If user is already logged in with email, we link. Otherwise we sign in.
      if (auth.currentUser) {
        result = await linkWithPopup(auth.currentUser, provider);
      } else {
        result = await signInWithPopup(auth, provider);
      }
      const credential = GoogleAuthProvider.credentialFromResult(result);
      setGoogleToken(credential.accessToken);
    } catch (error) {
      console.error("Google Auth Error:", error);
      setGoogleError(error.message);
    }
  };

  const scheduleInGoogleCalendar = async (task) => {
    if (!googleToken) {
      await connectGoogle();
      return;
    }
    setIsSyncing(true);
    const start = new Date();
    const end = new Date(start.getTime() + 30 * 60000);
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${googleToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `[Grove] ${task.text}`,
          description: 'Scheduled via Priority Grove Hub',
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() }
        })
      });
      if (response.ok) await toggleComplete(task);
      else {
        const errData = await response.json();
        if (errData.error?.status === "UNAUTHENTICATED") {
          setGoogleToken(null);
          await connectGoogle();
        } else {
          setGoogleError(`Calendar API Error: ${errData.error?.message || 'Unknown'}`);
        }
      }
    } catch (error) { 
      setGoogleError("Failed to reach Google servers.");
    } finally { setIsSyncing(false); }
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

  const setDueDate = async (taskId, date) => {
    if (!db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), { dueDate: date });
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

  const archiveTask = async (taskId) => {
    if (!db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), { archived: true });
  };

  const archiveAllCompleted = async () => {
    if (!db) return;
    const batch = tasks.filter(t => t.completed && !t.archived);
    for (const task of batch) {
      await archiveTask(task.id);
    }
  };
  
  const deleteTask = async (id) => {
    if (!db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', id));
  };

  // --- SMART SORTING & GROUPING ---
  const activeTasks = useMemo(() => tasks.filter(t => !t.archived), [tasks]);
  
  const grouped = useMemo(() => {
    const b = { inbox: [], do: [], schedule: [], delegate: [], eliminate: [] };
    activeTasks.forEach(t => { if (b[t.quadrant]) b[t.quadrant].push(t); });
    
    // Within each group: Completed tasks at the bottom, otherwise sort by newest
    Object.keys(b).forEach(key => {
      b[key].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return b.createdAt - a.createdAt;
      });
    });
    return b;
  }, [activeTasks]);
  
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
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-8 shadow-sm text-center">
        <div className="w-14 h-14 bg-emerald-700 rounded-2xl flex items-center justify-center text-white mx-auto mb-6">
          <Sprout size={28} />
        </div>
        <h1 className="text-xl font-bold text-stone-800">Priority Grove</h1>
        <p className="text-stone-400 text-[10px] font-black uppercase tracking-widest mb-8 italic">Cultivate your focus</p>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setAuthError('');
          try {
            if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
            else await createUserWithEmailAndPassword(auth, email, password);
          } catch (err) { setAuthError(err.message); }
        }} className="space-y-3">
          <input type="email" required placeholder="Email" className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-emerald-600 outline-none text-sm transition-all" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" required placeholder="Password" className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-emerald-600 outline-none text-sm transition-all" value={password} onChange={e => setPassword(e.target.value)} />
          {authError && <p className="text-rose-600 text-[10px] font-bold uppercase">{authError}</p>}
          <button type="submit" className="w-full bg-emerald-800 text-white py-3 rounded-xl font-bold hover:bg-emerald-900 transition-all shadow-md text-sm uppercase tracking-widest">
            {authMode === 'login' ? 'Enter Grove' : 'Plant Roots'}
          </button>
        </form>
        <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-6 text-stone-400 text-[10px] uppercase font-black tracking-[0.2em] hover:text-emerald-700 transition-colors">
          {authMode === 'login' ? "Seed an account" : "Back to login"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8faf8] text-stone-800 font-sans pb-24 md:pb-12 overflow-x-hidden selection:bg-emerald-500/10">
      
      {/* NURTURE TIMER OVERLAY */}
      {focusTask && (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="flex gap-2 mb-8 bg-stone-100 p-1 rounded-full">
            {[15, 25, 45, 60].map(m => (
              <button key={m} onClick={() => changeDuration(m)} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${sessionMins === m ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
                {m}m
              </button>
            ))}
          </div>
          <div className="text-center mb-10 px-6">
            <h2 className="text-xl md:text-3xl font-black text-stone-800 mb-1 leading-tight uppercase tracking-tighter italic">Nurturing Growth</h2>
            <p className="text-stone-400 text-sm italic truncate max-w-[280px] md:max-w-md mx-auto">"{focusTask.text}"</p>
          </div>
          <div className="relative w-56 h-56 md:w-72 md:h-72 mb-12 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#f1f5f1" strokeWidth="6" />
              <circle cx="50%" cy="50%" r="45%" fill="none" stroke="#059669" strokeWidth="6" strokeLinecap="round" strokeDasharray="283%" strokeDashoffset={283 - (283 * (timeLeft / (sessionMins * 60)))} className="transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(5,150,105,0.2)]" />
            </svg>
            <span className="text-5xl md:text-7xl font-light tabular-nums text-stone-700">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="w-16 h-16 bg-emerald-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all">
              {isTimerRunning ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
            <button onClick={() => { setFocusTask(null); setIsTimerRunning(false); }} className="w-16 h-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center active:scale-95 transition-all">
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {/* PLANTING SHEET */}
      {showPlantMenu && (
        <div className="fixed inset-0 z-[110] bg-stone-900/20 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <div className="max-w-md md:max-w-xl w-full bg-white rounded-[2rem] p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom md:zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg md:text-xl font-bold text-stone-800 uppercase tracking-tight italic">Assign Strategy</h3>
              <button onClick={() => setShowPlantMenu(false)} className="p-2 text-stone-300 hover:text-stone-600 transition-colors"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <button onClick={() => setQuadrant('inbox')} className="md:col-span-2 flex items-center gap-4 p-3 rounded-xl border border-stone-100 hover:border-emerald-600 hover:bg-stone-50 transition-all text-left">
                <div className={`p-2 rounded-lg bg-stone-100 text-stone-500`}><Inbox size={16} /></div>
                <div className="font-bold text-stone-800 text-sm">Return to Tray</div>
              </button>
              {QUADRANTS.map(q => (
                <button key={q.id} onClick={() => setQuadrant(q.id)} className="flex items-center gap-4 p-3 rounded-xl border border-stone-100 hover:border-emerald-600 hover:bg-stone-50 transition-all text-left">
                  <div className={`p-2 rounded-lg ${q.bg} ${q.color}`}>{q.icon}</div>
                  <div>
                    <div className="font-bold text-stone-800 text-sm leading-tight">{q.name}</div>
                    <div className="text-[9px] text-stone-400 font-medium uppercase tracking-wider mt-0.5">{q.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-700 p-1.5 rounded-lg text-white shadow-sm"><Sprout size={18} /></div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-stone-800 uppercase tracking-tighter">Priority Grove</h1>
              <div className="flex items-center gap-2">
                <div className="w-12 md:w-20 h-1 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-600 transition-all duration-1000" style={{ width: `${stats.health}%` }} />
                </div>
                <span className="text-[8px] font-bold text-stone-400 uppercase tracking-wider">{stats.health}% Vitality</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {googleToken && <div className="hidden md:flex items-center gap-1.5 text-[8px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100"><Link2 size={10} /> Calendar Linked</div>}
            <button onClick={() => signOut(auth)} className="p-2 text-stone-300 hover:text-stone-600 transition-colors"><LogOut size={16} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-12 space-y-8">
        
        {/* NAV TABS */}
        <div className="flex justify-center gap-2 mb-6">
          <TabButton active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} label="Tray" />
          <TabButton active={activeTab === 'garden'} onClick={() => setActiveTab('garden')} label="Garden" />
          <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Legacy" />
        </div>

        {activeTab === 'inbox' && (
          <div 
            className="max-w-2xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 'inbox')}
          >
            <form onSubmit={addTask} className="relative group">
              <input autoFocus type="text" placeholder="Capture a seed..." className="w-full px-5 py-3 md:py-4 bg-white border border-stone-200 rounded-xl text-sm md:text-base font-medium text-stone-700 outline-none focus:border-emerald-600 transition-all shadow-sm" value={newTaskText} onChange={e => setNewTaskText(e.target.value)} />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-700 p-1.5 md:p-2 rounded-lg text-white shadow-md hover:bg-emerald-800 transition-all"><Plus size={18} /></button>
            </form>
            <div className="grid grid-cols-1 gap-2">
              {grouped.inbox.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onAction={() => { setSelectedTask(task); setShowPlantMenu(true); }} 
                  onDelete={() => deleteTask(task.id)} 
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  isInbox 
                  onNurture={() => startNurture(task)}
                  onComplete={() => toggleComplete(task)}
                />
              ))}
              {grouped.inbox.length === 0 && (
                <div className="py-12 text-center text-stone-200 flex flex-col items-center border-2 border-dashed border-stone-100 rounded-3xl">
                  <Inbox className="mb-2 opacity-10" size={40} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Earth Awaiting Seeds</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'garden' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-8 animate-in fade-in duration-500">
            {QUADRANTS.map(q => (
              <div 
                key={q.id} 
                className={`space-y-3 p-4 md:p-6 rounded-2xl border-2 border-dashed ${q.border} bg-white/40 transition-colors min-h-[160px] shadow-sm`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, q.id)}
              >
                <div className="flex items-center justify-between px-1 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`${q.color} ${q.bg} p-1.5 rounded-lg shadow-sm border border-stone-100/50`}>{q.icon}</div>
                    <div>
                      <h2 className="text-[11px] md:text-sm font-bold text-stone-800 uppercase tracking-tighter leading-none">{q.name}</h2>
                      <p className="text-[8px] md:text-[9px] font-bold text-stone-400 uppercase tracking-widest">{q.desc}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-stone-300 uppercase">{grouped[q.id].length} roots</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {grouped[q.id].map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onNurture={() => startNurture(task)} 
                      onComplete={() => toggleComplete(task)} 
                      onAction={() => { setSelectedTask(task); setShowPlantMenu(true); }}
                      onDelete={() => deleteTask(task.id)} 
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onCalendar={() => scheduleInGoogleCalendar(task)}
                      isSyncing={isSyncing}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in duration-300">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Harvested" val={stats.done} icon={<Flower2 size={20} className="text-emerald-600" />} />
              <StatCard label="Growing" val={stats.total - stats.done} icon={<Sprout size={20} className="text-emerald-700" />} />
              <StatCard label="Mins" val={tasks.reduce((acc, t) => acc + (t.watered || 0), 0) * sessionMins} icon={<Droplets size={20} className="text-blue-500" />} />
              <StatCard label="Vitality" val={stats.health + "%"} icon={<Trophy size={20} className="text-amber-500" />} />
            </div>
            
            <div className="bg-white border border-stone-200 rounded-3xl p-8 text-center max-w-md mx-auto shadow-sm">
               <h3 className="text-sm font-bold text-stone-800 mb-6 uppercase tracking-widest">External Connectivity</h3>
               <button 
                  onClick={connectGoogle}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${googleToken ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-stone-900 text-white hover:bg-black shadow-lg shadow-stone-200'}`}
               >
                 {isSyncing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Calendar size={18} />}
                 {googleToken ? 'Connected' : 'Connect Calendar'}
               </button>
               {googleError && <p className="mt-4 text-[10px] text-rose-500 font-bold uppercase tracking-tight p-3 bg-rose-50 rounded-lg">{googleError}</p>}
               {!googleToken && !googleError && <p className="mt-4 text-[10px] text-stone-400 px-4 leading-relaxed uppercase font-medium tracking-wider">Note: Link via your Vercel URL to avoid browser restrictions.</p>}
               {googleToken && <button onClick={() => setGoogleToken(null)} className="mt-4 text-[9px] text-stone-300 uppercase font-black tracking-widest hover:text-rose-500 transition-colors">Disconnect</button>}
            </div>
          </div>
        )}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-4 left-0 right-0 px-4 z-40 md:hidden pointer-events-none">
        <div className="max-w-xs mx-auto bg-white/90 backdrop-blur-md border border-stone-200 rounded-2xl p-1 flex justify-between shadow-xl pointer-events-auto">
          <NavIcon active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} icon={<Inbox size={20} />} />
          <NavIcon active={activeTab === 'garden'} onClick={() => setActiveTab('garden')} icon={<LayoutGrid size={20} />} />
          <NavIcon active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<Trophy size={20} />} />
        </div>
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return (
    <button onClick={onClick} className={`px-5 py-1.5 md:px-8 md:py-2.5 rounded-full text-[10px] md:text-sm font-bold transition-all ${active ? 'bg-emerald-800 text-white shadow-sm' : 'bg-white text-stone-400 border border-stone-200 hover:border-stone-300'}`}>
      {label}
    </button>
  );
}

function NavIcon({ active, onClick, icon }) {
  return (
    <button onClick={onClick} className={`p-3 flex-1 flex justify-center rounded-xl transition-all ${active ? 'bg-emerald-50 text-emerald-800' : 'text-stone-300 hover:text-stone-500'}`}>
      {icon}
    </button>
  );
}

function TaskItem({ task, onNurture, onComplete, onAction, onDelete, onDragStart, onCalendar, isInbox = false, isSyncing = false }) {
  const quad = QUADRANTS.find(q => q.id === task.quadrant);
  const isBloom = task.completed || (quad && task.watered >= quad.stages);
  
  return (
    <div 
      draggable
      onDragStart={onDragStart}
      className={`bg-white border border-stone-100 rounded-xl p-2.5 md:p-3 flex flex-col gap-2.5 md:gap-3 transition-all hover:border-emerald-300 hover:shadow-sm cursor-grab active:cursor-grabbing ${task.completed ? 'opacity-40 grayscale bg-stone-50' : 'shadow-sm'}`}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg bg-stone-50 text-emerald-700 shadow-inner">
          <div className="relative">
            {isBloom ? <Flower2 size={18} className="animate-in zoom-in" /> : (task.watered || 0) > 0 ? <Sprout size={16} /> : <GripVertical size={12} className="text-stone-200" />}
          </div>
        </div>
        <div className="grow overflow-hidden">
          <h3 className="text-xs md:text-sm font-bold text-stone-800 truncate leading-none">{task.text}</h3>
          {!isInbox && quad?.id !== 'eliminate' && !task.completed && (
            <div className="flex gap-1 mt-1">
              {[...Array(quad?.stages || 1)].map((_, i) => (
                <div key={i} className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${i < (task.watered || 0) ? 'bg-emerald-600' : 'bg-stone-100'}`} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex gap-1.5 items-center">
        {isInbox ? (
          <button onClick={onAction} className="flex-1 bg-emerald-700 text-white py-1 md:py-1.5 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-emerald-800 transition-colors">Plant</button>
        ) : !task.completed && quad?.id !== 'eliminate' ? (
          <button onClick={onNurture} className="flex-1 bg-emerald-700 text-white py-1 md:py-1.5 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-emerald-800 transition-colors">Nurture</button>
        ) : (
          <div className="flex-1" />
        )}
        
        {quad?.id === 'schedule' && !task.completed && (
           <button 
             onClick={onCalendar}
             disabled={isSyncing}
             className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
             title="Schedule"
           >
             <Calendar size={14} className={isSyncing ? 'animate-pulse' : ''} />
           </button>
        )}

        {!isInbox && (
          <button onClick={onAction} className="p-1 md:p-1.5 bg-stone-50 text-stone-400 rounded-lg hover:bg-stone-100" title="Move">
            <Settings size={14} />
          </button>
        )}

        <button onClick={onComplete} className={`p-1 md:p-1.5 rounded-lg border transition-all ${task.completed ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-stone-200 border-stone-100 hover:text-emerald-700'}`}><CheckCircle2 size={16} /></button>
        <button onClick={() => { if(confirm('Uproot?')) onDelete() }} className="p-1 md:p-1.5 bg-stone-50 text-stone-200 rounded-lg hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
      </div>
    </div>
  );
}

function StatCard({ label, val, icon }) {
  return (
    <div className="bg-white border border-stone-200 p-4 md:p-6 rounded-2xl md:rounded-[2rem] text-center shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-center mb-1 md:mb-2 opacity-50">{icon}</div>
      <div className="text-lg md:text-3xl font-black text-stone-800 mb-0.5">{val}</div>
      <div className="text-[8px] md:text-[9px] font-black text-stone-400 uppercase tracking-widest">{label}</div>
    </div>
  );
}

function Loader() {
  return (
    <div className="h-screen bg-[#f8faf8] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function SetupUI() {
  return (
    <div className="min-h-screen bg-[#f8faf8] flex items-center justify-center p-8 text-center">
      <div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-10 shadow-sm">
        <AlertCircle size={40} className="text-rose-500 mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-3 text-stone-800">Setup Required</h2>
        <p className="text-stone-500 text-xs mb-6 leading-relaxed text-center">Firebase keys missing in App.jsx.</p>
      </div>
    </div>
  );
}
