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
  Sun
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

const appId = typeof __app_id !== 'undefined' ? __app_id : 'eisenhower-garden-v1';

const QUADRANTS = [
  { 
    id: 'do', 
    title: 'Sunflowers', 
    subtitle: 'Urgent & Important (Annuals)', 
    color: 'bg-amber-500', 
    icon: <Sun className="w-4 h-4" />,
    plantName: 'Sunflower',
    description: 'Grows fast, needs sun now.'
  },
  { 
    id: 'schedule', 
    title: 'Lavender', 
    subtitle: 'Important, Not Urgent (Perennials)', 
    color: 'bg-purple-500', 
    icon: <Clock className="w-4 h-4" />,
    plantName: 'Lavender',
    description: 'Foundation of the garden.'
  },
  { 
    id: 'delegate', 
    title: 'Ivy Trellis', 
    subtitle: 'Urgent, Not Important (Vines)', 
    color: 'bg-emerald-500', 
    icon: <Users className="w-4 h-4" />,
    plantName: 'Ivy',
    description: 'Needs support to thrive.'
  },
  { 
    id: 'eliminate', 
    title: 'Thistle Patch', 
    subtitle: 'Neither (Weeds)', 
    color: 'bg-slate-600', 
    icon: <Wind className="w-4 h-4" />,
    plantName: 'Thistle',
    description: 'Pull them to save space.'
  },
];

// SVG Plant Components
const PlantVisual = ({ type, stage, completed }) => {
  const colorMap = {
    do: '#f59e0b',
    schedule: '#a855f7',
    delegate: '#10b981',
    eliminate: '#64748b'
  };

  const color = completed ? colorMap[type] : '#94a3b8';

  if (type === 'eliminate') {
    return (
      <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-current" style={{ color: completed ? '#cbd5e1' : '#475569' }}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-10 h-10">
      {stage === 'seed' && <div className="w-2 h-2 bg-amber-900 rounded-full animate-bounce" />}
      {stage === 'sprout' && <Sprout className="w-6 h-6 text-green-500" />}
      {stage === 'bloom' && <Flower2 className={`w-8 h-8 transition-all duration-700 ${completed ? 'scale-110' : 'scale-90 opacity-60'}`} style={{ color }} />}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState(null);
  
  // Mobile UI States
  const [activeTab, setActiveTab] = useState('inbox');
  const [activeMatrixView, setActiveMatrixView] = useState('do');

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
      let message = err.message;
      if (err.code === 'auth/invalid-credential') message = "Incorrect email or password.";
      if (err.code === 'auth/email-already-in-use') message = "This email is already registered.";
      if (err.code === 'auth/weak-password') message = "Password should be at least 6 characters.";
      setAuthError(message);
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
    setIsAdding(false);
  };

  const moveTask = async (taskId, newQuadrant) => {
    if (!user || !db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), { quadrant: newQuadrant });
  };

  const toggleTask = async (task) => {
    if (!user || !db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), { completed: !task.completed });
  };

  const waterTask = async (task) => {
    if (!user || !db || task.completed) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), { 
      watered: (task.watered || 0) + 1 
    });
  };

  const deleteTask = async (taskId) => {
    if (!user || !db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId));
  };

  const handleDragStart = (e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e, targetQuadrant) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId') || draggedTaskId;
    if (taskId) moveTask(taskId, targetQuadrant);
    setDragOverQuadrant(null);
  };

  const allTags = useMemo(() => {
    const tags = new Set();
    tasks.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags);
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (activeTag) result = result.filter(t => t.tags?.includes(activeTag));
    return result;
  }, [tasks, activeTag]);

  const groupedTasks = useMemo(() => {
    const base = { inbox: [], do: [], schedule: [], delegate: [], eliminate: [] };
    filteredTasks.forEach(t => { if (base[t.quadrant]) base[t.quadrant].push(t); });
    return base;
  }, [filteredTasks]);

  const gardenHealth = useMemo(() => {
    if (tasks.length === 0) return 100;
    const completed = tasks.filter(t => t.completed).length;
    const weeds = tasks.filter(t => t.quadrant === 'eliminate' && !t.completed).length;
    return Math.max(0, Math.round((completed / tasks.length) * 100) - (weeds * 5));
  }, [tasks]);

  if (!isConfigValid) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-emerald-100">
          <AlertCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-black mb-2 text-emerald-900">Garden Gates Locked</h2>
          <p className="text-emerald-700/60 text-sm">Please add your Firebase keys to <code>App.jsx</code> to start your garden.</p>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-emerald-50">
      <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-[#f1f5f1] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl shadow-emerald-900/10 border border-emerald-100 p-8 md:p-12 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
           <Sprout className="w-32 h-32 text-emerald-600" />
        </div>
        
        <div className="relative">
          <div className="bg-emerald-600 w-16 h-16 rounded-3xl flex items-center justify-center text-white shadow-xl mb-8 mx-auto">
            <Flower2 className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-center text-emerald-900 mb-2">ZenGarden</h2>
          <p className="text-center text-emerald-700 font-bold uppercase tracking-widest text-[10px] mb-8">Nurture Your Focus</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="email" required placeholder="Gardener Email"
              className="w-full px-6 py-4 bg-emerald-50/50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-300"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <input 
              type="password" required placeholder="Secret Key"
              className="w-full px-6 py-4 bg-emerald-50/50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none transition-all placeholder:text-emerald-300"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            {authError && <p className="text-rose-500 text-xs font-bold text-center">{authError}</p>}
            <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all transform active:scale-95">
              {authMode === 'login' ? 'Enter Garden' : 'Plant Your Roots'}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full mt-6 text-emerald-600 text-xs font-bold hover:underline">
            {authMode === 'login' ? "New gardener? Start here" : "Return to your garden"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9fbf9] text-slate-900 font-sans pb-24">
      {/* Garden Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-emerald-100 px-4 py-4 md:py-6 shadow-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-md">
              <Flower2 className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-tight text-emerald-900">ZenGarden</h1>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${gardenHealth}%` }} />
                </div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{gardenHealth}% Health</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            {allTags.map(tag => (
              <button 
                key={tag}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTag === tag ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}
              >
                <TagIcon className="w-3 h-3" />
                {tag}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 pb-20">
        {/* TAB 1: INBOX (The Seed Tray) */}
        {activeTab === 'inbox' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            <div className="bg-white rounded-[2.5rem] border-2 border-emerald-50 shadow-xl shadow-emerald-900/5 overflow-hidden">
              <div className="p-8 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/20">
                <div>
                  <h2 className="font-black text-emerald-900 flex items-center gap-3 text-xl">
                    <Sprout className="w-6 h-6 text-emerald-500" />
                    Seed Tray
                  </h2>
                  <p className="text-[10px] text-emerald-600/60 font-bold uppercase tracking-widest mt-1">Unsorted Seeds: {groupedTasks.inbox.length}</p>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <form onSubmit={addTask} className="relative">
                  <input 
                    type="text"
                    placeholder="What would you like to plant? #home #work"
                    className="w-full px-8 py-6 rounded-3xl border-2 border-emerald-50 focus:border-emerald-500 outline-none transition-all text-lg shadow-inner bg-emerald-50/30 pr-20 placeholder:text-emerald-300"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                  />
                  <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg hover:bg-emerald-700 active:scale-95 transition-all">
                    <Plus className="w-6 h-6" />
                  </button>
                </form>

                <div className="space-y-3">
                  {groupedTasks.inbox.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onToggle={() => toggleTask(task)} 
                      onDelete={() => deleteTask(task.id)}
                      onMove={(q) => moveTask(task.id, q)}
                      onWater={() => waterTask(task)}
                      isInbox
                    />
                  ))}
                  {groupedTasks.inbox.length === 0 && (
                    <div className="py-20 text-center">
                      <Sparkles className="w-16 h-16 mx-auto mb-4 text-emerald-100 animate-pulse" />
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">The seed tray is empty</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: MATRIX (The Garden Beds) */}
        {activeTab === 'matrix' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Desktop View: Garden Plots */}
            <div className="hidden md:grid grid-cols-2 gap-8">
              {QUADRANTS.map(q => (
                <div 
                  key={q.id} 
                  onDragOver={(e) => { e.preventDefault(); setDragOverQuadrant(q.id); }}
                  onDrop={(e) => handleDrop(e, q.id)}
                  className={`bg-white rounded-[3rem] border-2 flex flex-col min-h-[450px] overflow-hidden transition-all duration-500 ${dragOverQuadrant === q.id ? 'border-emerald-500 ring-8 ring-emerald-50 scale-[1.02]' : 'border-emerald-50 shadow-lg shadow-emerald-900/5'}`}
                >
                  <QuadrantHeader q={q} count={groupedTasks[q.id].length} />
                  <div className="flex-1 p-6 space-y-3 overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-emerald-100">
                    {groupedTasks[q.id].map(task => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        onToggle={() => toggleTask(task)} 
                        onDelete={() => deleteTask(task.id)}
                        onMove={(target) => moveTask(task.id, target)}
                        onWater={() => waterTask(task)}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                      />
                    ))}
                    {groupedTasks[q.id].length === 0 && (
                      <div className="h-full flex items-center justify-center py-20 text-emerald-100">
                        <p className="text-[10px] font-black uppercase tracking-widest italic">Plot awaiting seeds</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile View: Plot Switcher */}
            <div className="md:hidden space-y-6">
              <div className="flex justify-between p-1 bg-emerald-50 rounded-[2rem]">
                {QUADRANTS.map(q => (
                  <button 
                    key={q.id}
                    onClick={() => setActiveMatrixView(q.id)}
                    className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-[1.5rem] transition-all ${activeMatrixView === q.id ? `${q.color} text-white shadow-lg` : 'text-emerald-300'}`}
                  >
                    {q.icon}
                    <span className="text-[7px] font-black uppercase tracking-tighter">{q.title.split(' ')[0]}</span>
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-[2.5rem] border-2 border-emerald-50 shadow-xl shadow-emerald-900/5 min-h-[450px] flex flex-col overflow-hidden">
                {QUADRANTS.filter(q => q.id === activeMatrixView).map(q => (
                  <React.Fragment key={q.id}>
                    <QuadrantHeader q={q} count={groupedTasks[q.id].length} />
                    <div className="flex-1 p-5 space-y-3">
                      {groupedTasks[q.id].map(task => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          onToggle={() => toggleTask(task)} 
                          onDelete={() => deleteTask(task.id)}
                          onMove={(target) => moveTask(task.id, target)}
                          onWater={() => waterTask(task)}
                        />
                      ))}
                      {groupedTasks[q.id].length === 0 && (
                        <div className="py-20 text-center opacity-20">
                          <Sprout className="w-16 h-16 mx-auto mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Ready for planting</p>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: GARDENER (Profile) */}
        {activeTab === 'profile' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto">
            <div className="bg-white rounded-[3rem] p-10 border-2 border-emerald-50 shadow-xl shadow-emerald-900/5 text-center">
              <div className="bg-emerald-50 w-28 h-28 rounded-[2.5rem] flex items-center justify-center text-emerald-500 mx-auto mb-8 shadow-inner">
                <Users className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black text-emerald-900">{user.email?.split('@')[0]}</h2>
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] mb-10">Master Gardener</p>
              
              <div className="grid grid-cols-2 gap-6 mb-10">
                <StatCard label="Plants Grown" value={tasks.filter(t => t.completed).length} color="text-emerald-600" />
                <StatCard label="Active Plot" value={tasks.filter(t => !t.completed).length} color="text-amber-600" />
              </div>

              <button 
                onClick={handleLogout}
                className="w-full py-5 bg-rose-50 text-rose-600 rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-rose-100 transition-all transform active:scale-95"
              >
                <LogOut className="w-5 h-5" />
                Leave Garden
              </button>
            </div>
          </section>
        )}
      </main>

      {/* ZEN NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-emerald-50 px-8 py-4 pb-10 flex justify-around items-center z-50 shadow-[0_-10px_40px_rgba(6,78,59,0.05)]">
        <NavButton 
          active={activeTab === 'inbox'} 
          onClick={() => setActiveTab('inbox')} 
          icon={<Droplets className="w-7 h-7" />} 
          label="Watering" 
        />
        <NavButton 
          active={activeTab === 'matrix'} 
          onClick={() => setActiveTab('matrix')} 
          icon={<Flower2 className="w-7 h-7" />} 
          label="Garden" 
        />
        <NavButton 
          active={activeTab === 'profile'} 
          onClick={() => setActiveTab('profile')} 
          icon={<Settings className="w-7 h-7" />} 
          label="Tools" 
        />
      </nav>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100">
      <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function QuadrantHeader({ q, count }) {
  return (
    <div className={`p-8 ${q.color} text-white relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-8 opacity-20">
         {React.cloneElement(q.icon, { className: 'w-24 h-24' })}
      </div>
      <div className="relative z-10 flex justify-between items-start mb-2">
        <div className="bg-white/20 p-3 rounded-[1rem] backdrop-blur-md">
          {q.icon}
        </div>
        <span className="text-[10px] font-black bg-black/10 px-3 py-1.5 rounded-full uppercase tracking-widest backdrop-blur-md">
          {count} Growth
        </span>
      </div>
      <h3 className="text-xl font-black tracking-tight leading-none relative z-10">{q.title}</h3>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-2 relative z-10">{q.subtitle}</p>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-emerald-600 -translate-y-1' : 'text-emerald-200'}`}
    >
      <div className={`p-2 rounded-2xl transition-all ${active ? 'bg-emerald-50' : 'bg-transparent'}`}>
        {icon}
      </div>
      <span className={`text-[8px] font-black uppercase tracking-[0.2em] transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
    </button>
  );
}

function TaskItem({ task, onToggle, onDelete, onDragStart, onMove, onWater, isInbox = false }) {
  const [showTools, setShowTools] = useState(false);
  
  const stage = useMemo(() => {
    if (task.completed) return 'bloom';
    if ((task.watered || 0) >= 3) return 'bloom';
    if ((task.watered || 0) >= 1) return 'sprout';
    return 'seed';
  }, [task.watered, task.completed]);

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      className={`group bg-white border border-emerald-50 rounded-3xl p-5 flex flex-col gap-4 transition-all hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5 ${task.completed ? 'bg-emerald-50/20' : ''}`}
    >
      <div className="flex items-center gap-5">
        <div className="shrink-0">
          <PlantVisual type={task.quadrant} stage={stage} completed={task.completed} />
        </div>
        
        <div className="flex flex-col grow overflow-hidden">
          <span className={`text-base font-bold tracking-tight text-emerald-900 leading-tight ${task.completed ? 'line-through opacity-30' : ''}`}>
            {task.text.replace(/#\w+/g, '').trim()}
          </span>
          <div className="flex items-center gap-3 mt-1.5">
             {task.tags?.map(tag => (
                <span key={tag} className="text-[8px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">#{tag}</span>
             ))}
             {!task.completed && (
               <div className="flex gap-1 ml-auto">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`w-1 h-1 rounded-full ${i < (task.watered || 0) ? 'bg-blue-400' : 'bg-slate-100'}`} />
                  ))}
               </div>
             )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!task.completed && (
            <button 
              onClick={onWater}
              disabled={stage === 'bloom'}
              className={`p-3 rounded-2xl transition-all ${stage === 'bloom' ? 'bg-slate-50 text-slate-200' : 'bg-blue-50 text-blue-500 hover:bg-blue-100 active:scale-90'}`}
            >
              <Droplets className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => setShowTools(!showTools)}
            className="p-3 text-emerald-200 hover:text-emerald-500 bg-emerald-50 rounded-2xl transition-all"
          >
            <ChevronRight className={`w-5 h-5 transition-transform ${showTools ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Garden Tools (Sorting & Deleting) */}
      {showTools && (
        <div className="grid grid-cols-6 gap-2 pt-3 border-t border-emerald-50 animate-in fade-in slide-in-from-top-2">
          <button 
            onClick={() => { onToggle(); setShowTools(false); }}
            className={`p-3 rounded-xl flex items-center justify-center border transition-all ${task.completed ? 'bg-emerald-600 text-white' : 'bg-white border-emerald-100 text-emerald-400'}`}
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => onMove('inbox')}
            className={`p-3 rounded-xl flex items-center justify-center border ${task.quadrant === 'inbox' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-white border-emerald-100 text-emerald-200'}`}
          >
            <Inbox className="w-5 h-5" />
          </button>
          {QUADRANTS.map(q => (
            <button 
              key={q.id}
              onClick={() => { onMove(q.id); setShowTools(false); }}
              className={`p-3 rounded-xl flex items-center justify-center border transition-all ${task.quadrant === q.id ? `${q.color} border-transparent text-white` : 'bg-white border-emerald-100 text-emerald-200'}`}
            >
              {q.icon}
            </button>
          ))}
          <button onClick={onDelete} className="p-3 bg-rose-50 text-rose-400 rounded-xl flex items-center justify-center hover:bg-rose-100 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
