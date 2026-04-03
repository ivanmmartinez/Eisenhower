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
  Circle, 
  Zap, 
  Clock, 
  Users, 
  Coffee, 
  Inbox,
  LayoutGrid,
  Sparkles,
  GripVertical,
  Tag as TagIcon,
  Filter,
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
  Wind,
  Sun,
  Trees,
  Leaf,
  Bug
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

const appId = typeof __app_id !== 'undefined' ? __app_id : 'eisenhower-garden-v2';

const GARDEN_PLOTS = [
  { 
    id: 'do', 
    title: 'Wildflower Meadow', 
    subtitle: 'Do First (Urgent/Annuals)', 
    color: 'from-amber-600 to-orange-700', 
    plantColor: 'text-orange-400',
    icon: <Sun className="w-5 h-5" />,
    reqWater: 2,
    mechanic: 'Fast growth, fast bloom.'
  },
  { 
    id: 'schedule', 
    title: 'Ancient Orchard', 
    subtitle: 'Schedule (Strategy/Oaks)', 
    color: 'from-indigo-800 to-blue-900', 
    plantColor: 'text-blue-400',
    icon: <Trees className="w-5 h-5" />,
    reqWater: 5,
    mechanic: 'Slow growth, strong roots.'
  },
  { 
    id: 'delegate', 
    title: 'Ivy Trellis', 
    subtitle: 'Delegate (Assistant/Vines)', 
    color: 'from-teal-800 to-cyan-900', 
    plantColor: 'text-teal-400',
    icon: <Users className="w-5 h-5" />,
    reqWater: 3,
    mechanic: 'Needs regular pruning.'
  },
  { 
    id: 'eliminate', 
    title: 'The Weeds', 
    subtitle: 'Eliminate (Distraction/Thorns)', 
    color: 'from-slate-800 to-black', 
    plantColor: 'text-slate-500',
    icon: <Bug className="w-5 h-5" />,
    reqWater: 0,
    mechanic: 'Pull them to restore energy.'
  },
];

// Custom Animated Plant Visuals
const PlantLife = ({ type, watered, completed }) => {
  const plot = GARDEN_PLOTS.find(p => p.id === type) || GARDEN_PLOTS[0];
  const progress = watered / (plot.reqWater || 1);
  
  if (type === 'eliminate') {
    return (
      <div className={`relative transition-all duration-500 ${completed ? 'scale-0 opacity-0' : 'scale-100'}`}>
        <Wind className="w-10 h-10 text-slate-600 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <div className={`absolute bottom-0 w-1 h-8 bg-stone-800/20 rounded-full`} />
      {watered === 0 && !completed && <div className="w-3 h-3 bg-stone-700 rounded-full animate-bounce shadow-lg border border-stone-500" />}
      {watered > 0 && watered < plot.reqWater && !completed && (
        <Sprout 
          className="w-8 h-8 text-emerald-400 animate-in zoom-in" 
          style={{ transform: `scale(${0.8 + progress * 0.4})` }} 
        />
      )}
      {(watered >= plot.reqWater || completed) && (
        <Flower2 
          className={`w-10 h-10 transition-all duration-1000 ${completed ? 'animate-bounce text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : plot.plantColor}`} 
        />
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

  const handleLogout = () => auth && signOut(auth);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim() || !user || !db) return;
    const tags = newTaskText.match(/#\w+/g) || [];
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), {
      text: newTaskText,
      quadrant: 'inbox',
      completed: false,
      watered: 0,
      tags: tags.map(t => t.replace('#', '')),
      createdAt: Date.now()
    });
    setNewTaskText('');
    setActiveTab('inbox');
  };

  const moveTask = async (taskId, newQuadrant) => {
    if (!user || !db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), { quadrant: newQuadrant });
  };

  const waterTask = async (task) => {
    if (!user || !db || task.completed) return;
    const plot = GARDEN_PLOTS.find(p => p.id === task.quadrant);
    const newWatered = (task.watered || 0) + 1;
    
    const updates = { watered: newWatered };
    // Auto-complete if watered enough
    if (plot && newWatered >= plot.reqWater) {
      updates.completed = true;
    }
    
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), updates);
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

  const gardenEnergy = useMemo(() => {
    if (tasks.length === 0) return 100;
    const completed = tasks.filter(t => t.completed).length;
    const weeds = tasks.filter(t => t.quadrant === 'eliminate' && !t.completed).length;
    return Math.max(0, Math.round((completed / tasks.length) * 100) - (weeds * 10));
  }, [tasks]);

  if (!isConfigValid) return <SetupRequired />;
  if (loading) return <LoadingScreen />;

  if (!user) return (
    <div className="min-h-screen bg-[#0a0f0a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#141d14] rounded-[3rem] shadow-2xl border border-emerald-900/30 p-8 md:p-12 overflow-hidden relative">
        <div className="absolute -top-20 -right-20 opacity-5 rotate-12">
           <Trees className="w-64 h-64 text-emerald-500" />
        </div>
        
        <div className="relative">
          <div className="bg-emerald-600/20 w-20 h-20 rounded-3xl flex items-center justify-center text-emerald-400 shadow-xl mb-8 mx-auto border border-emerald-500/30">
            <Leaf className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-center text-emerald-50 mb-2 tracking-tight">Garden Vault</h2>
          <p className="text-center text-emerald-500 font-bold uppercase tracking-[0.3em] text-[10px] mb-10">Secured Personal Ecosystem</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-emerald-600/50 uppercase ml-4">Identifier</label>
              <input 
                type="email" required placeholder="Gardener Email"
                className="w-full px-6 py-5 bg-[#0a0f0a] rounded-2xl border border-emerald-900/50 text-emerald-50 focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-900"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-emerald-600/50 uppercase ml-4">Secret Code</label>
              <input 
                type="password" required placeholder="••••••••"
                className="w-full px-6 py-5 bg-[#0a0f0a] rounded-2xl border border-emerald-900/50 text-emerald-50 focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-900"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {authError && <p className="text-rose-500 text-xs font-bold text-center px-4">{authError}</p>}
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black shadow-xl shadow-emerald-900/20 hover:bg-emerald-500 transition-all active:scale-[0.98]">
              {authMode === 'login' ? 'Open Gates' : 'Join the Grove'}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full mt-8 text-emerald-700 text-xs font-bold hover:text-emerald-400 transition-colors">
            {authMode === 'login' ? "New to the garden? Register here" : "Already a gardener? Return"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080b08] text-emerald-50 font-sans pb-32">
      {/* Global Status Bar */}
      <header className="sticky top-0 z-50 bg-[#080b08]/80 backdrop-blur-xl border-b border-emerald-950 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-900/20">
              <Sprout className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-emerald-50">GardenHub</h1>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 bg-emerald-950 rounded-full overflow-hidden border border-emerald-900/20">
                  <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${gardenEnergy}%` }} />
                </div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{gardenEnergy} Energy</span>
              </div>
            </div>
          </div>
          
          <button onClick={handleLogout} className="p-3 bg-emerald-950/50 rounded-2xl text-emerald-500 hover:text-rose-400 transition-colors border border-emerald-900/20">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {/* TAB NAVIGATION */}
        <div className="flex bg-emerald-950/30 p-1 rounded-[2.5rem] mb-8 border border-emerald-900/20 max-w-md mx-auto">
          <TabBtn active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} label="Seeds" icon={<Inbox className="w-4 h-4" />} />
          <TabBtn active={activeTab === 'garden'} onClick={() => setActiveTab('garden')} label="Plot" icon={<Flower2 className="w-4 h-4" />} />
          <TabBtn active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Log" icon={<Settings className="w-4 h-4" />} />
        </div>

        {/* CONTENT */}
        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
          {activeTab === 'inbox' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <form onSubmit={addTask} className="relative group">
                <input 
                  autoFocus
                  type="text"
                  placeholder="What seed will you plant? #work #life"
                  className="w-full px-8 py-7 bg-emerald-950/20 border border-emerald-900/50 rounded-[2.5rem] text-xl text-emerald-50 placeholder:text-emerald-900 outline-none focus:border-emerald-500 transition-all shadow-2xl"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                />
                <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-600 p-4 rounded-[1.5rem] text-white shadow-xl hover:bg-emerald-500 active:scale-90 transition-all">
                  <Plus className="w-7 h-7" />
                </button>
              </form>

              <div className="grid grid-cols-1 gap-4">
                {groupedTasks.inbox.map(task => (
                  <GardenCard 
                    key={task.id} 
                    task={task} 
                    onWater={() => waterTask(task)} 
                    onMove={(q) => moveTask(task.id, q)} 
                    onDelete={() => deleteTask(task.id)}
                    showSorting
                  />
                ))}
                {groupedTasks.inbox.length === 0 && (
                  <div className="py-24 text-center opacity-20 flex flex-col items-center">
                    <Sparkles className="w-16 h-16 mb-4 text-emerald-400" />
                    <p className="text-sm font-black uppercase tracking-[0.4em] text-emerald-600">No Seeds Pending</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'garden' && (
            <div className="space-y-8">
              {/* Plot Selector (Mobile/Desktop Sync) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {GARDEN_PLOTS.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => setActivePlot(p.id)}
                    className={`relative p-5 rounded-[2rem] border transition-all text-left group overflow-hidden ${activePlot === p.id ? 'bg-emerald-900/20 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-emerald-950/10 border-emerald-900/30 text-emerald-700 hover:border-emerald-700'}`}
                  >
                    <div className={`p-3 rounded-2xl w-fit mb-3 transition-colors ${activePlot === p.id ? 'bg-emerald-500 text-white' : 'bg-emerald-950 text-emerald-800'}`}>
                      {p.icon}
                    </div>
                    <p className="text-xs font-black uppercase tracking-wider">{p.title}</p>
                    <p className="text-[9px] font-bold opacity-60 uppercase">{groupedTasks[p.id].length} Growth</p>
                  </button>
                ))}
              </div>

              {/* The Active Plot View */}
              <div className={`bg-gradient-to-br ${GARDEN_PLOTS.find(p => p.id === activePlot).color} rounded-[3rem] p-8 md:p-12 shadow-2xl min-h-[500px] border border-white/10`}>
                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">{GARDEN_PLOTS.find(p => p.id === activePlot).title}</h2>
                    <p className="text-xs font-bold text-white/60 uppercase tracking-widest mt-1">{GARDEN_PLOTS.find(p => p.id === activePlot).subtitle}</p>
                  </div>
                  <div className="bg-black/20 backdrop-blur-xl px-5 py-3 rounded-2xl border border-white/5 flex items-center gap-3">
                    <Droplets className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-black text-white">{groupedTasks[activePlot].length} Active</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {groupedTasks[activePlot].map(task => (
                    <GardenCard 
                      key={task.id} 
                      task={task} 
                      onWater={() => waterTask(task)} 
                      onMove={(q) => moveTask(task.id, q)} 
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                  {groupedTasks[activePlot].length === 0 && (
                    <div className="col-span-full h-64 flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/10 rounded-[2.5rem]">
                      <Sun className="w-12 h-12 mb-4 animate-pulse" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">Plot Awaiting Seeds</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-xl mx-auto bg-emerald-950/20 border border-emerald-900/30 rounded-[3rem] p-10 text-center">
              <div className="w-32 h-32 bg-emerald-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner border border-emerald-500/10">
                <Leaf className="w-14 h-14 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black mb-2">{user.email?.split('@')[0]}</h2>
              <p className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.3em] mb-12">Garden Records Since {new Date(user.metadata.creationTime).toLocaleDateString()}</p>
              
              <div className="grid grid-cols-2 gap-6 text-left">
                <StatCard label="Total Harvest" val={tasks.filter(t => t.completed).length} color="text-emerald-400" />
                <StatCard label="Garden Area" val={tasks.length} color="text-blue-400" />
                <StatCard label="Water Used" val={tasks.reduce((acc, t) => acc + (t.watered || 0), 0)} color="text-cyan-400" />
                <StatCard label="Weeds Pulled" val={tasks.filter(t => t.quadrant === 'eliminate' && t.completed).length} color="text-slate-400" />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// UI HELPERS
function TabBtn({ active, onClick, label, icon }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[2rem] transition-all ${active ? 'bg-emerald-600 text-white shadow-xl' : 'text-emerald-800 hover:text-emerald-500'}`}
    >
      {icon}
      <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function StatCard({ label, val, color }) {
  return (
    <div className="bg-black/20 p-6 rounded-[2rem] border border-white/5">
      <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{val}</p>
    </div>
  );
}

function GardenCard({ task, onWater, onMove, onDelete, showSorting = false }) {
  const [open, setOpen] = useState(false);
  const plot = GARDEN_PLOTS.find(p => p.id === task.quadrant) || { plantName: 'Seed', reqWater: 1 };
  
  return (
    <div className={`group bg-[#1a251a] border border-emerald-900/30 rounded-[2.5rem] p-6 flex flex-col gap-4 transition-all hover:scale-[1.02] hover:bg-[#202e20] hover:border-emerald-500/30 ${task.completed ? 'opacity-60 bg-[#0d140d]' : ''}`}>
      <div className="flex items-center gap-6">
        <div className="shrink-0 scale-125">
          <PlantLife type={task.quadrant} watered={task.watered || 0} completed={task.completed} />
        </div>
        
        <div className="grow overflow-hidden">
          <span className={`text-lg font-bold tracking-tight text-emerald-50 leading-tight block truncate ${task.completed ? 'line-through text-emerald-900' : ''}`}>
            {task.text.replace(/#\w+/g, '').trim()}
          </span>
          <div className="flex items-center gap-3 mt-2">
            {task.tags?.map(t => (
              <span key={t} className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-900/30">#{t}</span>
            ))}
            {!task.completed && task.quadrant !== 'eliminate' && (
               <div className="flex gap-1 ml-auto">
                 {[...Array(plot.reqWater || 1)].map((_, i) => (
                   <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < (task.watered || 0) ? 'bg-blue-400' : 'bg-emerald-950 shadow-inner'}`} />
                 ))}
               </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
           {!task.completed && (
             <button 
                onClick={onWater}
                className="p-4 bg-blue-600/10 text-blue-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all active:scale-90 border border-blue-900/20"
             >
                <Droplets className="w-5 h-5" />
             </button>
           )}
           <button 
              onClick={() => setOpen(!open)}
              className="p-4 bg-emerald-950/50 rounded-2xl text-emerald-800 hover:text-emerald-400 transition-colors"
           >
              <ChevronRight className={`w-5 h-5 transition-transform ${open ? 'rotate-90 text-emerald-400' : ''}`} />
           </button>
        </div>
      </div>

      {open && (
        <div className="grid grid-cols-6 gap-2 pt-4 border-t border-emerald-900/20 animate-in fade-in slide-in-from-top-2">
          {GARDEN_PLOTS.map(q => (
             <button 
                key={q.id}
                onClick={() => { onMove(q.id); setOpen(false); }}
                className={`p-3 rounded-xl flex items-center justify-center border transition-all ${task.quadrant === q.id ? 'bg-emerald-600 border-transparent text-white' : 'bg-black/20 border-white/5 text-emerald-900 hover:text-emerald-500'}`}
             >
                {q.icon}
             </button>
          ))}
          <button 
             onClick={() => { onMove('inbox'); setOpen(false); }}
             className={`p-3 rounded-xl flex items-center justify-center border transition-all ${task.quadrant === 'inbox' ? 'bg-emerald-600 text-white' : 'bg-black/20 border-white/5 text-emerald-900'}`}
          >
             <Inbox className="w-5 h-5" />
          </button>
          <button onClick={onDelete} className="p-3 bg-rose-900/20 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all">
             <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

// BOILERPLATE COMPONENTS
function LoadingScreen() {
  return (
    <div className="h-screen bg-[#080b08] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function SetupRequired() {
  return (
    <div className="min-h-screen bg-[#080b08] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-[#141d14] rounded-[3rem] shadow-2xl p-10 border border-rose-900/30">
        <AlertCircle className="w-14 h-14 text-rose-500 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-white mb-2">Garden Not Ready</h2>
        <p className="text-slate-500 text-sm mb-6">Your personal Firebase API Keys are missing from <code>App.jsx</code>.</p>
        <div className="text-[10px] bg-black/40 p-4 rounded-xl font-mono text-slate-500 text-left">
          Check lines 43-52 in src/App.jsx
        </div>
      </div>
    </div>
  );
}
