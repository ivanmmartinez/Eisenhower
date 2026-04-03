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
  signInAnonymously, 
  onAuthStateChanged 
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
  Key
} from 'lucide-react';

/**
 * SELF-HOSTING INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a project and add a "Web App".
 * 3. Replace the 'firebaseConfig' object below with your actual keys.
 * 4. Enable "Anonymous Auth" and "Firestore" in the Firebase console.
 */
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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-eisenhower-app';

const QUADRANTS = [
  { id: 'do', title: 'Do First', subtitle: 'Urgent & Important', color: 'bg-rose-500', icon: <Zap className="w-4 h-4" /> },
  { id: 'schedule', title: 'Schedule', subtitle: 'Important, Not Urgent', color: 'bg-blue-500', icon: <Clock className="w-4 h-4" /> },
  { id: 'delegate', title: 'Delegate', subtitle: 'Urgent, Not Important', color: 'bg-amber-500', icon: <Users className="w-4 h-4" /> },
  { id: 'eliminate', title: 'Eliminate', subtitle: 'Distractions', color: 'bg-slate-500', icon: <Coffee className="w-4 h-4" /> },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [dragOverQuadrant, setDragOverQuadrant] = useState(null);

  // Auth Initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        signInAnonymously(auth);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time Data Sync
  useEffect(() => {
    if (!user) return;
    const tasksRef = collection(db, 'artifacts', appId, 'users', user.uid, 'tasks');
    const q = query(tasksRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Sync Error:", err));
    return () => unsubscribe();
  }, [user]);

  // Actions
  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim() || !user) return;
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
    if (!user) return;
    const taskRef = doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId);
    await updateDoc(taskRef, { quadrant: newQuadrant });
  };

  const toggleTask = async (task) => {
    const taskRef = doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id);
    await updateDoc(taskRef, { completed: !task.completed });
  };

  const deleteTask = async (taskId) => {
    const taskRef = doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId);
    await deleteDoc(taskRef);
  };

  // Drag Handlers
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

  // Logic
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

  if (!user) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="font-bold uppercase tracking-widest text-[10px]">Establishing Secure Link...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-100">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">FocusEngine <span className="text-indigo-600">v2</span></h1>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Cloud Synced
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 group">
               <div className="hidden sm:block text-right mr-2">
                 <p className="text-[10px] font-black text-slate-300 uppercase">Your Session Key</p>
                 <p className="text-xs font-mono text-slate-500">{user.uid.slice(0, 8)}</p>
               </div>
               <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                 <Key className="w-5 h-5" />
               </div>
            </div>
          </div>

          {/* Grouping Filters */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <Filter className="w-4 h-4 text-slate-300 shrink-0" />
              <button 
                onClick={() => setActiveTag(null)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${!activeTag ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}
              >
                All Focus Areas
              </button>
              {allTags.map(tag => (
                <button 
                  key={tag}
                  onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${activeTag === tag ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500'}`}
                >
                  <TagIcon className="w-3 h-3" />
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-8">
        {/* Inbox / Capture Area */}
        <section 
          onDragOver={(e) => { e.preventDefault(); setDragOverQuadrant('inbox'); }}
          onDragLeave={() => setDragOverQuadrant(null)}
          onDrop={(e) => handleDrop(e, 'inbox')}
          className={`bg-white rounded-3xl border-2 transition-all duration-300 ${dragOverQuadrant === 'inbox' ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' : 'border-slate-100 shadow-sm'}`}
        >
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h2 className="font-black text-slate-700 flex items-center gap-3">
              <Inbox className="w-6 h-6 text-indigo-500" />
              Brain Dump
              <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black">
                {groupedTasks.inbox.length} PENDING
              </span>
            </h2>
            {!isAdding && (
              <button 
                onClick={() => setIsAdding(true)}
                className="bg-indigo-600 text-white p-2 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-100"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="p-6">
            {isAdding && (
              <form onSubmit={addTask} className="mb-6 animate-in slide-in-from-top duration-300">
                <input 
                  autoFocus
                  type="text"
                  placeholder="Just get it out of your head... (use #tags to group)"
                  className="w-full px-6 py-5 rounded-2xl border-2 border-indigo-100 focus:border-indigo-500 outline-none transition-all text-lg shadow-inner bg-slate-50"
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                />
              </form>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedTasks.inbox.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onToggle={() => toggleTask(task)} 
                  onDelete={() => deleteTask(task.id)}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                />
              ))}
              {groupedTasks.inbox.length === 0 && !isAdding && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl opacity-40">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 text-indigo-300" />
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Mind is Clear</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* The Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {QUADRANTS.map(q => (
            <div 
              key={q.id} 
              onDragOver={(e) => { e.preventDefault(); setDragOverQuadrant(q.id); }}
              onDragLeave={() => setDragOverQuadrant(null)}
              onDrop={(e) => handleDrop(e, q.id)}
              className={`bg-white rounded-[2rem] border-2 transition-all flex flex-col min-h-[420px] overflow-hidden ${dragOverQuadrant === q.id ? 'border-indigo-500 ring-8 ring-indigo-50' : 'border-slate-100 shadow-sm'}`}
            >
              <div className={`p-6 ${q.color} text-white`}>
                <div className="flex justify-between items-start mb-1">
                  <div className="bg-white/20 p-2 rounded-xl">{q.icon}</div>
                  <span className="text-[10px] font-black bg-black/10 px-2 py-1 rounded-lg uppercase tracking-tighter">
                    {groupedTasks[q.id].length} Items
                  </span>
                </div>
                <h3 className="text-lg font-black tracking-tight leading-none">{q.title}</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1">{q.subtitle}</p>
              </div>

              <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[500px] scrollbar-thin">
                {groupedTasks[q.id].map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={() => toggleTask(task)} 
                    onDelete={() => deleteTask(task.id)}
                    onDragStart={(e) => handleDragStart(e, task.id)}
                  />
                ))}
                {groupedTasks[q.id].length === 0 && (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-50 rounded-2xl py-16">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Drop Here</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Persistence Note */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur shadow-2xl border border-slate-100 px-6 py-3 rounded-full flex items-center gap-4 z-50 transition-all hover:scale-105">
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-black">PC</div>
          <div className="w-8 h-8 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-black">PH</div>
        </div>
        <div className="h-4 w-[1px] bg-slate-200" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cross-Platform Active</p>
      </div>
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete, onDragStart }) {
  return (
    <div 
      draggable
      onDragStart={onDragStart}
      className={`group bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 transition-all cursor-grab active:cursor-grabbing hover:border-indigo-200 hover:shadow-md ${task.completed ? 'opacity-50 grayscale-[0.5]' : ''}`}
    >
      <GripVertical className="w-4 h-4 text-slate-200 shrink-0 group-hover:text-indigo-300 transition-colors" />
      <button onClick={onToggle} className="shrink-0">
        {task.completed ? <CheckCircle2 className="w-6 h-6 text-indigo-500" /> : <Circle className="w-6 h-6 text-slate-200 group-hover:text-indigo-400" />}
      </button>
      <div className="flex flex-col grow overflow-hidden">
        <span className={`text-sm font-bold tracking-tight ${task.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
          {task.text.replace(/#\w+/g, '').trim()}
        </span>
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {task.tags.map(tag => (
              <span key={tag} className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-1.5 py-0.5 rounded">#{tag}</span>
            ))}
          </div>
        )}
      </div>
      <button onClick={onDelete} className="p-2 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
