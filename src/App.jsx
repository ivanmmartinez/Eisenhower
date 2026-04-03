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
  Settings
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

const appId = typeof __app_id !== 'undefined' ? __app_id : 'eisenhower-hub-v2';

const QUADRANTS = [
  { id: 'do', title: 'Do First', subtitle: 'Urgent/Important', color: 'bg-rose-500', icon: <Zap className="w-4 h-4" /> },
  { id: 'schedule', title: 'Schedule', subtitle: 'Strategy', color: 'bg-blue-500', icon: <Clock className="w-4 h-4" /> },
  { id: 'delegate', title: 'Delegate', subtitle: 'Assistant', color: 'bg-amber-500', icon: <Users className="w-4 h-4" /> },
  { id: 'eliminate', title: 'Eliminate', subtitle: 'Distraction', color: 'bg-slate-500', icon: <Coffee className="w-4 h-4" /> },
];

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
  const [activeTab, setActiveTab] = useState('inbox'); // 'inbox', 'matrix', 'profile'
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

  if (!isConfigValid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-rose-100">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black mb-2">Configuration Required</h2>
          <p className="text-slate-500 text-sm">Please add your Firebase keys to <code>App.jsx</code>.</p>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8 md:p-12 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Lock className="w-32 h-32 text-indigo-600" />
        </div>
        
        <div className="relative">
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mb-8 mx-auto">
            <LayoutGrid className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-center text-slate-800 mb-2">FocusEngine</h2>
          <p className="text-center text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-8">Secure Personal Hub</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="email" required placeholder="Email"
              className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <input 
              type="password" required placeholder="Password"
              className="w-full px-6 py-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            {authError && <p className="text-rose-500 text-xs font-bold text-center">{authError}</p>}
            <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">
              {authMode === 'login' ? 'Sign In' : 'Join Now'}
            </button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="w-full mt-6 text-slate-400 text-xs font-bold">
            {authMode === 'login' ? "New here? Create account" : "Have an account? Log in"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-4 md:py-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg">
              <LayoutGrid className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black tracking-tight">FocusEngine</h1>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab === 'inbox' ? 'Capture' : activeTab === 'matrix' ? 'Prioritize' : 'Settings'}</p>
            </div>
          </div>
          
          {allTags.length > 0 && activeTab !== 'profile' && (
            <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[40%] md:max-w-none">
               {activeTag && (
                  <button onClick={() => setActiveTag(null)} className="bg-slate-100 p-2 rounded-lg text-slate-500">
                    <Filter className="w-4 h-4" />
                  </button>
               )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 pb-20">
        {/* TAB 1: INBOX */}
        {activeTab === 'inbox' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h2 className="font-black text-slate-700 flex items-center gap-3">
                  <Inbox className="w-6 h-6 text-indigo-500" />
                  Quick Capture
                </h2>
                <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                  {groupedTasks.inbox.length} Items
                </span>
              </div>
              
              <div className="p-4 space-y-3">
                <form onSubmit={addTask} className="relative mb-6">
                  <input 
                    type="text"
                    placeholder="Got an idea? #tag it..."
                    className="w-full px-6 py-5 rounded-2xl border-2 border-indigo-50 focus:border-indigo-500 outline-none transition-all text-base shadow-inner bg-slate-50/50 pr-16"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                  />
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg active:scale-95 transition-all">
                    <Plus className="w-6 h-6" />
                  </button>
                </form>

                <div className="space-y-2">
                  {groupedTasks.inbox.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onToggle={() => toggleTask(task)} 
                      onDelete={() => deleteTask(task.id)}
                      onMove={(q) => moveTask(task.id, q)}
                      isInbox
                    />
                  ))}
                  {groupedTasks.inbox.length === 0 && (
                    <div className="py-12 text-center opacity-40">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 text-indigo-200" />
                      <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Everything Sorted</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: MATRIX */}
        {activeTab === 'matrix' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Desktop View: 2x2 Grid */}
            <div className="hidden md:grid grid-cols-2 gap-8">
              {QUADRANTS.map(q => (
                <div 
                  key={q.id} 
                  onDragOver={(e) => { e.preventDefault(); setDragOverQuadrant(q.id); }}
                  onDrop={(e) => handleDrop(e, q.id)}
                  className={`bg-white rounded-[2rem] border-2 flex flex-col min-h-[400px] overflow-hidden transition-all ${dragOverQuadrant === q.id ? 'border-indigo-500 ring-8 ring-indigo-50' : 'border-slate-100 shadow-sm'}`}
                >
                  <QuadrantHeader q={q} count={groupedTasks[q.id].length} />
                  <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-[500px]">
                    {groupedTasks[q.id].map(task => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        onToggle={() => toggleTask(task)} 
                        onDelete={() => deleteTask(task.id)}
                        onMove={(target) => moveTask(task.id, target)}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile View: Quadrant Selector */}
            <div className="md:hidden space-y-4">
              <div className="grid grid-cols-4 gap-2">
                {QUADRANTS.map(q => (
                  <button 
                    key={q.id}
                    onClick={() => setActiveMatrixView(q.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all border-2 ${activeMatrixView === q.id ? `${q.color} border-transparent text-white shadow-lg` : 'bg-white border-slate-100 text-slate-400'}`}
                  >
                    {q.icon}
                    <span className="text-[8px] font-black uppercase tracking-tighter">{q.id}</span>
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm min-h-[400px] flex flex-col overflow-hidden">
                {QUADRANTS.filter(q => q.id === activeMatrixView).map(q => (
                  <React.Fragment key={q.id}>
                    <QuadrantHeader q={q} count={groupedTasks[q.id].length} />
                    <div className="flex-1 p-4 space-y-3">
                      {groupedTasks[q.id].map(task => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          onToggle={() => toggleTask(task)} 
                          onDelete={() => deleteTask(task.id)}
                          onMove={(target) => moveTask(task.id, target)}
                        />
                      ))}
                      {groupedTasks[q.id].length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300">
                          <p className="text-[10px] font-black uppercase tracking-widest">Focus Zone Clear</p>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: SETTINGS/PROFILE */}
        {activeTab === 'profile' && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 shadow-sm text-center">
              <div className="bg-slate-100 w-24 h-24 rounded-3xl flex items-center justify-center text-slate-400 mx-auto mb-6">
                <Settings className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-black text-slate-800">{user.email?.split('@')[0]}</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">{user.email}</p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 p-4 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Tasks</p>
                   <p className="text-xl font-black text-indigo-600">{tasks.length}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Efficiency</p>
                   <p className="text-xl font-black text-green-600">{tasks.length ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0}%</p>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-rose-100 transition-all"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </section>
        )}
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 px-6 py-3 pb-8 flex justify-around items-center z-50">
        <NavButton 
          active={activeTab === 'inbox'} 
          onClick={() => setActiveTab('inbox')} 
          icon={<Inbox className="w-6 h-6" />} 
          label="Inbox" 
        />
        <NavButton 
          active={activeTab === 'matrix'} 
          onClick={() => setActiveTab('matrix')} 
          icon={<LayoutGrid className="w-6 h-6" />} 
          label="Matrix" 
        />
        <NavButton 
          active={activeTab === 'profile'} 
          onClick={() => setActiveTab('profile')} 
          icon={<Settings className="w-6 h-6" />} 
          label="User" 
        />
      </nav>
    </div>
  );
}

function QuadrantHeader({ q, count }) {
  return (
    <div className={`p-6 ${q.color} text-white`}>
      <div className="flex justify-between items-start mb-1">
        <div className="bg-white/20 p-2 rounded-xl">{q.icon}</div>
        <span className="text-[10px] font-black bg-black/10 px-2 py-1 rounded-lg uppercase tracking-tighter">
          {count}
        </span>
      </div>
      <h3 className="text-lg font-black tracking-tight leading-none">{q.title}</h3>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1">{q.subtitle}</p>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}
    >
      {icon}
      <span className="text-[9px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function TaskItem({ task, onToggle, onDelete, onDragStart, onMove, isInbox = false }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  return (
    <div 
      draggable
      onDragStart={onDragStart}
      className={`group bg-white border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 transition-all hover:border-indigo-200 hover:shadow-md ${task.completed ? 'opacity-50 grayscale-[0.5]' : ''}`}
    >
      <div className="flex items-center gap-4">
        <button onClick={onToggle} className="shrink-0 p-1">
          {task.completed ? <CheckCircle2 className="w-6 h-6 text-indigo-500" /> : <Circle className="w-6 h-6 text-slate-200" />}
        </button>
        <div className="flex flex-col grow overflow-hidden">
          <span className={`text-sm font-bold tracking-tight ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
            {task.text.replace(/#\w+/g, '').trim()}
          </span>
          {task.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {task.tags.map(tag => (
                <span key={tag} className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-1.5 py-0.5 rounded">#{tag}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowMoveMenu(!showMoveMenu)}
            className="p-2 text-slate-300 hover:text-indigo-500 bg-slate-50 rounded-lg md:hidden"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${showMoveMenu ? 'rotate-90' : ''}`} />
          </button>
          <button onClick={onDelete} className="p-2 text-slate-200 hover:text-rose-500 hidden md:block">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Sorting Controls */}
      {(showMoveMenu || isInbox) && (
        <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200">
          <button 
            onClick={() => onMove('inbox')}
            className={`p-2 rounded-lg flex items-center justify-center border ${task.quadrant === 'inbox' ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-white border-slate-100 text-slate-300'}`}
          >
            <Inbox className="w-4 h-4" />
          </button>
          {QUADRANTS.map(q => (
            <button 
              key={q.id}
              onClick={() => { onMove(q.id); setShowMoveMenu(false); }}
              className={`p-2 rounded-lg flex items-center justify-center border transition-all ${task.quadrant === q.id ? `${q.color} border-transparent text-white` : 'bg-white border-slate-100 text-slate-300'}`}
            >
              {q.icon}
            </button>
          ))}
          <button onClick={onDelete} className="p-2 bg-rose-50 text-rose-500 rounded-lg flex items-center justify-center md:hidden">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
