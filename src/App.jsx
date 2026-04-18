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
  signOut,
  GoogleAuthProvider,
  linkWithPopup,
  signInWithPopup
} from 'firebase/auth';
import { 
  Plus, Trash2, CheckCircle2, Zap, Clock, Users, Inbox, LogOut, Sprout, Flower2, Trees, Trophy, Play, Pause, X, Bug, LayoutGrid, Settings, AlertCircle, GripVertical, Calendar, Link2, Archive, BarChart3, Flame, ChevronLeft, ChevronRight, Shield, RotateCcw
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
  } catch (e) { console.error("Firebase init failed:", e); }
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'grove-v2-final';

const QUADRANTS = [
  { id: 'do', name: 'Do First', desc: 'Urgent & Important', color: 'text-rose-600', border: 'border-rose-100', bg: 'bg-rose-50', icon: <Zap size={14} />, stages: 2 },
  { id: 'schedule', name: 'Schedule', desc: 'Important, Not Urgent', color: 'text-emerald-600', border: 'border-emerald-100', bg: 'bg-emerald-50', icon: <Clock size={14} />, stages: 4 },
  { id: 'delegate', name: 'Delegate', desc: 'Urgent, Not Important', color: 'text-blue-600', border: 'border-blue-100', bg: 'bg-blue-50', icon: <Users size={14} />, stages: 2 },
  { id: 'eliminate', name: 'Eliminate', desc: 'Distractions', color: 'text-slate-500', border: 'border-slate-200', bg: 'bg-slate-50', icon: <Bug size={14} />, stages: 1 },
];

// --- PLANT LIBRARY ---
const PLANTS = [
  { id: 'lotus', name: 'Lotus', desc: 'Unfurling from water', emoji: '🪷' },
  { id: 'rose', name: 'Rose', desc: 'Petal by petal', emoji: '🌹' },
  { id: 'sunflower', name: 'Sunflower', desc: 'Tracking light', emoji: '🌻' },
  { id: 'cherry', name: 'Cherry Blossom', desc: 'Spring branch', emoji: '🌸' },
  { id: 'bonsai', name: 'Bonsai', desc: 'Growing rings', emoji: '🌳' },
  { id: 'monstera', name: 'Monstera', desc: 'Unfurling leaves', emoji: '🌿' },
  { id: 'cactus', name: 'Cactus', desc: 'Night bloom', emoji: '🌵' },
  { id: 'moonflower', name: 'Moonflower', desc: 'Opens at dusk', emoji: '🌙' },
  { id: 'bamboo', name: 'Bamboo', desc: 'Shooting up', emoji: '🎋' },
  { id: 'fern', name: 'Fern', desc: 'Fiddleheads unfurling', emoji: '🌿' },
  { id: 'wisteria', name: 'Wisteria', desc: 'Cascading blooms', emoji: '💐' },
  { id: 'bioluminescent', name: 'Bioluminescent', desc: 'Glowing bloom', emoji: '✨' },
];

// --- BLOOM VISUALIZATIONS ---
// Each takes { progress: 0-1 } and renders a full-screen SVG
function BloomVisualization({ plantId, progress }) {
  const p = Math.max(0, Math.min(1, progress));
  const components = {
    lotus: <LotusBloom p={p} />,
    rose: <RoseBloom p={p} />,
    sunflower: <SunflowerBloom p={p} />,
    cherry: <CherryBloom p={p} />,
    bonsai: <BonsaiBloom p={p} />,
    monstera: <MonsteraBloom p={p} />,
    cactus: <CactusBloom p={p} />,
    moonflower: <MoonflowerBloom p={p} />,
    bamboo: <BambooBloom p={p} />,
    fern: <FernBloom p={p} />,
    wisteria: <WisteriaBloom p={p} />,
    bioluminescent: <BioluminescentBloom p={p} />,
  };
  return components[plantId] || <LotusBloom p={p} />;
}

function LotusBloom({ p }) {
  const petals = 8;
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <defs>
        <radialGradient id="water" cx="50%" cy="70%"><stop offset="0%" stopColor="#bfdbfe" /><stop offset="100%" stopColor="#60a5fa" /></radialGradient>
        <radialGradient id="petal-l"><stop offset="0%" stopColor="#fff" /><stop offset="60%" stopColor="#fbcfe8" /><stop offset="100%" stopColor="#f472b6" /></radialGradient>
      </defs>
      <ellipse cx="200" cy="310" rx={140 + p*20} ry={20 + p*8} fill="url(#water)" opacity="0.4" />
      <ellipse cx="200" cy="310" rx={110} ry={16} fill="#3b82f6" opacity="0.2" />
      {[...Array(3)].map((_, r) => [...Array(petals)].map((_, i) => {
        const angle = (i / petals) * 360 + r * 22;
        const scale = p * (1 - r * 0.2);
        const len = 70 + r * 10;
        return (
          <g key={`${r}-${i}`} transform={`translate(200 300) rotate(${angle}) scale(${scale})`} style={{ transition: 'transform 1s ease-out' }}>
            <path d={`M 0 0 Q -20 -${len/2} 0 -${len} Q 20 -${len/2} 0 0`} fill="url(#petal-l)" opacity={0.8 - r*0.15} />
          </g>
        );
      }))}
      <circle cx="200" cy="300" r={8 + p*4} fill="#fbbf24" opacity={p} />
      <circle cx="200" cy="300" r={15 + p*6} fill="#fde68a" opacity={p * 0.4} />
    </svg>
  );
}

function RoseBloom({ p }) {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <defs>
        <radialGradient id="rose-g"><stop offset="0%" stopColor="#fecaca" /><stop offset="50%" stopColor="#f87171" /><stop offset="100%" stopColor="#b91c1c" /></radialGradient>
      </defs>
      <path d={`M 200 ${380 - p*80} Q 190 ${340 - p*60} 200 ${300 - p*40}`} stroke="#15803d" strokeWidth="4" fill="none" />
      <path d={`M 190 ${330 - p*50} Q 160 ${320 - p*50} 150 ${310 - p*60}`} stroke="#15803d" strokeWidth="3" fill="none" opacity={p} />
      <ellipse cx={150} cy={308 - p*60} rx={15*p} ry={8*p} fill="#22c55e" transform={`rotate(-30 150 ${308 - p*60})`} />
      {[0,1,2,3,4].map(ring => {
        const scale = Math.max(0, p * 2 - ring * 0.3);
        if (scale <= 0) return null;
        return (
          <g key={ring} transform={`translate(200 ${200 - p*20})`} style={{ transition: 'all 1.2s ease-out' }}>
            {[...Array(5 + ring)].map((_, i) => {
              const angle = (i / (5 + ring)) * 360 + ring * 15;
              const r = 10 + ring * 10;
              return (
                <ellipse key={i} cx="0" cy={-r*scale} rx={12*scale} ry={18*scale} fill="url(#rose-g)" opacity={0.9 - ring*0.1} transform={`rotate(${angle})`} />
              );
            })}
          </g>
        );
      })}
      <circle cx="200" cy={200 - p*20} r={6*p} fill="#7f1d1d" />
    </svg>
  );
}

function SunflowerBloom({ p }) {
  const angle = p * 40 - 20;
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <defs>
        <radialGradient id="sun"><stop offset="0%" stopColor="#fef3c7" /><stop offset="100%" stopColor="#f59e0b" /></radialGradient>
      </defs>
      <circle cx="340" cy="60" r={30 + p*10} fill="#fef3c7" opacity={p*0.6} />
      <circle cx="340" cy="60" r={20} fill="#fbbf24" opacity={p} />
      <path d={`M 200 390 L 200 ${200 - p*20}`} stroke="#15803d" strokeWidth="6" />
      <ellipse cx="170" cy="300" rx={25*p} ry={12*p} fill="#22c55e" transform="rotate(-40 170 300)" />
      <ellipse cx="230" cy="260" rx={28*p} ry={14*p} fill="#22c55e" transform="rotate(35 230 260)" />
      <g transform={`translate(200 ${180 - p*20}) rotate(${angle})`} style={{ transition: 'transform 1s ease-out' }}>
        {[...Array(16)].map((_, i) => {
          const a = (i / 16) * 360;
          const scale = p;
          return (
            <ellipse key={i} cx="0" cy={-50*scale} rx={10*scale} ry={30*scale} fill="#fbbf24" transform={`rotate(${a})`} />
          );
        })}
        <circle r={30*p} fill="#78350f" />
        <circle r={30*p} fill="url(#sun)" opacity="0.3" />
      </g>
    </svg>
  );
}

function CherryBloom({ p }) {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <path d={`M 50 380 Q 150 ${300 - p*40} 350 ${120 - p*40}`} stroke="#78350f" strokeWidth={8 - p*2} fill="none" />
      <path d={`M 150 320 Q 200 280 280 240`} stroke="#78350f" strokeWidth="4" fill="none" opacity={p} />
      <path d={`M 220 280 Q 260 220 320 180`} stroke="#78350f" strokeWidth="3" fill="none" opacity={p} />
      {[
        [180,310],[220,280],[260,250],[300,220],[330,190],
        [200,290],[240,260],[280,230],[310,200],
        [170,330],[210,300],[250,270],[290,240],[320,210],
      ].map(([x,y], i) => {
        const scale = Math.max(0, p * 1.5 - (i % 5) * 0.1);
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            {[0,72,144,216,288].map(a => (
              <circle key={a} cx={Math.cos(a*Math.PI/180)*6*scale} cy={Math.sin(a*Math.PI/180)*6*scale} r={5*scale} fill="#fce7f3" />
            ))}
            <circle r={3*scale} fill="#fbbf24" />
          </g>
        );
      })}
      {[...Array(Math.floor(p*20))].map((_, i) => (
        <circle key={i} cx={50 + i*20} cy={200 + Math.sin(i)*100 + p*50} r="3" fill="#fce7f3" opacity={0.6} />
      ))}
    </svg>
  );
}

function BonsaiBloom({ p }) {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <ellipse cx="200" cy="360" rx="100" ry="15" fill="#78350f" />
      <rect x="110" y="340" width="180" height="25" fill="#92400e" rx="4" />
      <path d={`M 200 340 Q 180 300 170 ${260 - p*10} Q 160 220 200 ${180 - p*20}`} stroke="#451a03" strokeWidth={12 - p*2} fill="none" strokeLinecap="round" />
      <path d={`M 195 260 Q 220 250 250 ${230 - p*10}`} stroke="#451a03" strokeWidth="6" fill="none" opacity={p} />
      <path d={`M 190 220 Q 160 210 140 ${190 - p*10}`} stroke="#451a03" strokeWidth="5" fill="none" opacity={p} />
      {[[250,220,1],[140,180,0.9],[200,160,1.1],[175,190,0.8],[225,180,0.9]].map(([x,y,s], i) => {
        const scale = Math.max(0, p * s);
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${scale})`} style={{ transition: 'transform 1.2s ease-out' }}>
            <circle cx="0" cy="0" r="28" fill="#15803d" />
            <circle cx="-12" cy="-8" r="18" fill="#16a34a" />
            <circle cx="12" cy="5" r="20" fill="#22c55e" />
            <circle cx="5" cy="-12" r="14" fill="#4ade80" />
          </g>
        );
      })}
      {[...Array(3)].map((_, r) => (
        <ellipse key={r} cx="200" cy="353" rx={90 - r*25} ry={5 - r} fill="none" stroke="#78350f" strokeWidth="1" opacity={0.3 + p*0.2} />
      ))}
    </svg>
  );
}

function MonsteraBloom({ p }) {
  const leaves = [
    { x: 200, y: 300, rot: -20, scale: 1.2, delay: 0 },
    { x: 160, y: 240, rot: -50, scale: 1.0, delay: 0.2 },
    { x: 250, y: 230, rot: 30, scale: 1.1, delay: 0.35 },
    { x: 180, y: 170, rot: -10, scale: 0.9, delay: 0.5 },
    { x: 240, y: 140, rot: 45, scale: 0.85, delay: 0.7 },
  ];
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <rect x="170" y="340" width="60" height="40" fill="#92400e" rx="4" />
      <path d="M 200 340 L 200 300 L 200 240 L 200 180 L 200 140" stroke="#15803d" strokeWidth="4" fill="none" />
      {leaves.map((l, i) => {
        const prog = Math.max(0, Math.min(1, (p - l.delay) / 0.3));
        const s = l.scale * prog;
        if (s <= 0) return null;
        return (
          <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.rot}) scale(${s})`} style={{ transition: 'transform 1s ease-out' }}>
            <path d="M 0 0 Q -40 -30 -50 -70 Q -40 -90 0 -100 Q 40 -90 50 -70 Q 40 -30 0 0 Z" fill="#15803d" />
            <path d="M -30 -40 L -15 -50" stroke="#052e16" strokeWidth="2" fill="none" />
            <path d="M -20 -60 L -5 -65" stroke="#052e16" strokeWidth="2" fill="none" />
            <path d="M -10 -80 L 5 -80" stroke="#052e16" strokeWidth="2" fill="none" />
            <path d="M 30 -40 L 15 -50" stroke="#052e16" strokeWidth="2" fill="none" />
            <path d="M 20 -60 L 5 -65" stroke="#052e16" strokeWidth="2" fill="none" />
            <circle cx="-25" cy="-35" r="4" fill="#052e16" />
            <circle cx="25" cy="-35" r="4" fill="#052e16" />
            <circle cx="-15" cy="-75" r="3" fill="#052e16" />
            <circle cx="15" cy="-75" r="3" fill="#052e16" />
          </g>
        );
      })}
    </svg>
  );
}

function CactusBloom({ p }) {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <defs>
        <radialGradient id="nightsky" cx="50%" cy="0%"><stop offset="0%" stopColor="#1e3a8a" /><stop offset="100%" stopColor="#0c0a2e" /></radialGradient>
      </defs>
      <rect width="400" height="400" fill="url(#nightsky)" opacity={p*0.3} />
      {[...Array(20)].map((_, i) => (
        <circle key={i} cx={(i*37)%400} cy={(i*23)%200} r="1" fill="#fff" opacity={p * Math.random()} />
      ))}
      <ellipse cx="200" cy="380" rx="80" ry="8" fill="#78350f" />
      <path d="M 180 380 L 180 220 Q 180 200 200 200 Q 220 200 220 220 L 220 380" fill="#16a34a" />
      <path d="M 180 280 Q 150 280 150 250 L 150 230 Q 150 220 160 220 L 180 220" fill="#16a34a" opacity={p > 0.3 ? 1 : 0} />
      <path d="M 220 260 Q 250 260 250 230 L 250 210 Q 250 200 240 200 L 220 200" fill="#16a34a" opacity={p > 0.5 ? 1 : 0} />
      {[190, 200, 210].map(x => [240, 280, 320, 360].map(y => (
        <line key={`${x}-${y}`} x1={x} y1={y-2} x2={x} y2={y+2} stroke="#052e16" strokeWidth="1" />
      )))}
      {p > 0.6 && (
        <g transform={`translate(200 200) scale(${(p-0.6)*2.5})`} style={{ transition: 'transform 1s ease-out' }}>
          {[0,60,120,180,240,300].map(a => (
            <ellipse key={a} cx="0" cy="-20" rx="10" ry="25" fill="#fff" opacity="0.95" transform={`rotate(${a})`} />
          ))}
          <circle r="8" fill="#fbbf24" />
          <circle r="15" fill="#fde68a" opacity="0.5" />
        </g>
      )}
    </svg>
  );
}

function MoonflowerBloom({ p }) {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <defs>
        <radialGradient id="moon"><stop offset="0%" stopColor="#e0e7ff" /><stop offset="100%" stopColor="#6366f1" /></radialGradient>
        <radialGradient id="moonsky" cx="50%" cy="0%"><stop offset="0%" stopColor="#312e81" /><stop offset="100%" stopColor="#020617" /></radialGradient>
      </defs>
      <rect width="400" height="400" fill="url(#moonsky)" opacity={p*0.5} />
      <circle cx="320" cy="80" r={30 + p*10} fill="#fef3c7" opacity={p*0.8} />
      <circle cx="320" cy="80" r={40 + p*20} fill="#fef3c7" opacity={p*0.2} />
      {[...Array(30)].map((_, i) => (
        <circle key={i} cx={(i*47)%400} cy={(i*31)%250} r={Math.random()*1.5} fill="#fff" opacity={p*0.8} />
      ))}
      <path d={`M 200 390 Q 190 ${330} 210 ${260} Q 195 ${200} 200 ${170 - p*10}`} stroke="#064e3b" strokeWidth="3" fill="none" />
      <ellipse cx="185" cy="280" rx={18*p} ry={10*p} fill="#064e3b" transform="rotate(-30 185 280)" />
      <ellipse cx="215" cy="230" rx={20*p} ry={11*p} fill="#064e3b" transform="rotate(40 215 230)" />
      <g transform={`translate(200 170)`}>
        {[0,45,90,135,180,225,270,315].map(a => {
          const scale = p * 1.8;
          return (
            <ellipse key={a} cx="0" cy={-30*scale} rx={15*scale} ry={35*scale} fill="#f5f3ff" opacity="0.95" transform={`rotate(${a})`} />
          );
        })}
        <circle r={10*p} fill="#fef3c7" />
        <circle r={20*p} fill="#fef3c7" opacity="0.4" />
      </g>
    </svg>
  );
}

function BambooBloom({ p }) {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      {[140, 200, 260].map((x, i) => {
        const height = 350 * p * (1 - i*0.1);
        const segments = Math.floor(height / 50);
        return (
          <g key={x}>
            <rect x={x-8} y={380-height} width="16" height={height} fill="#22c55e" />
            <rect x={x-8} y={380-height} width="16" height={height} fill="url(#bambooshine)" opacity="0.3" />
            {[...Array(segments)].map((_, s) => (
              <g key={s}>
                <rect x={x-10} y={380 - (s+1)*50} width="20" height="4" fill="#15803d" />
                <line x1={x-8} y1={380 - (s+1)*50 + 2} x2={x+8} y2={380 - (s+1)*50 + 2} stroke="#052e16" strokeWidth="1" />
              </g>
            ))}
            {p > 0.5 && [...Array(4)].map((_, l) => (
              <g key={l} transform={`translate(${x} ${380 - height + l*40 + 20})`}>
                <path d={`M 0 0 Q ${15 + l*5} -10 ${30 + l*8} -5`} stroke="#16a34a" strokeWidth="2" fill="#22c55e" opacity={p} />
                <path d={`M 0 0 Q ${-15 - l*5} -10 ${-30 - l*8} -5`} stroke="#16a34a" strokeWidth="2" fill="#22c55e" opacity={p} />
              </g>
            ))}
          </g>
        );
      })}
      <defs>
        <linearGradient id="bambooshine"><stop offset="0%" stopColor="#fff" /><stop offset="50%" stopColor="transparent" /><stop offset="100%" stopColor="#052e16" /></linearGradient>
      </defs>
    </svg>
  );
}

function FernBloom({ p }) {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <rect x="170" y="360" width="60" height="30" fill="#78350f" rx="4" />
      {[-60, -30, 0, 30, 60].map((angle, i) => {
        const delay = i * 0.15;
        const prog = Math.max(0, Math.min(1, (p - delay) / 0.3));
        const len = 150 * prog;
        const curl = 1 - prog;
        return (
          <g key={i} transform={`translate(200 360) rotate(${angle})`}>
            <path d={`M 0 0 Q ${curl*20} ${-len*0.5} ${curl*30} ${-len}`} stroke="#15803d" strokeWidth="3" fill="none" />
            {[...Array(Math.floor(prog * 10))].map((_, f) => {
              const fy = -len * (f / 10);
              const fLen = 20 + f * 2;
              return (
                <g key={f}>
                  <path d={`M ${curl*30*(f/10)} ${fy} Q ${curl*30*(f/10) + fLen*0.5} ${fy - 5} ${curl*30*(f/10) + fLen} ${fy - 10}`} stroke="#16a34a" strokeWidth="2" fill="#22c55e" opacity={prog} />
                  <path d={`M ${curl*30*(f/10)} ${fy} Q ${curl*30*(f/10) - fLen*0.5} ${fy - 5} ${curl*30*(f/10) - fLen} ${fy - 10}`} stroke="#16a34a" strokeWidth="2" fill="#22c55e" opacity={prog} />
                </g>
              );
            })}
            {/* Fiddlehead curl at tip when young */}
            {curl > 0.2 && (
              <circle cx={curl*30} cy={-len} r={5 + curl*10} fill="none" stroke="#15803d" strokeWidth="3" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function WisteriaBloom({ p }) {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <path d="M 0 60 Q 200 40 400 60" stroke="#78350f" strokeWidth="8" fill="none" />
      <path d="M 50 60 Q 80 80 60 120" stroke="#78350f" strokeWidth="4" fill="none" />
      <path d="M 350 60 Q 320 80 340 120" stroke="#78350f" strokeWidth="4" fill="none" />
      {[60, 120, 180, 240, 300, 340].map((x, i) => {
        const delay = i * 0.1;
        const prog = Math.max(0, Math.min(1, (p - delay) / 0.4));
        const length = 200 * prog;
        return (
          <g key={x} transform={`translate(${x} 60)`}>
            <line x1="0" y1="0" x2="0" y2={length} stroke="#78350f" strokeWidth="1" opacity="0.4" />
            {[...Array(Math.floor(prog * 12))].map((_, b) => {
              const y = (b + 1) * (length / 14);
              const size = 6 + (b < 3 ? b*2 : 6);
              return (
                <g key={b}>
                  <ellipse cx="-4" cy={y} rx={size} ry={size*0.7} fill="#a78bfa" opacity={0.9} />
                  <ellipse cx="4" cy={y + 3} rx={size} ry={size*0.7} fill="#c4b5fd" opacity={0.85} />
                  <ellipse cx="0" cy={y + 5} rx={size*0.8} ry={size*0.5} fill="#8b5cf6" opacity={0.7} />
                </g>
              );
            })}
            {prog > 0.9 && [...Array(3)].map((_, pt) => (
              <circle key={pt} cx={Math.random()*20-10} cy={length + pt*8 + 10} r="3" fill="#c4b5fd" opacity={0.6} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function BioluminescentBloom({ p }) {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <defs>
        <radialGradient id="biosky"><stop offset="0%" stopColor="#0f172a" /><stop offset="100%" stopColor="#020617" /></radialGradient>
        <radialGradient id="bioglow"><stop offset="0%" stopColor="#67e8f9" /><stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" /><stop offset="100%" stopColor="#0e7490" stopOpacity="0" /></radialGradient>
        <radialGradient id="biopetal"><stop offset="0%" stopColor="#ecfeff" /><stop offset="60%" stopColor="#67e8f9" /><stop offset="100%" stopColor="#0891b2" /></radialGradient>
      </defs>
      <rect width="400" height="400" fill="url(#biosky)" />
      {[...Array(Math.floor(p*15))].map((_, i) => (
        <circle key={i} cx={(i*53)%400} cy={(i*91)%400} r={2 + Math.random()*3} fill="#67e8f9" opacity={Math.random() * p}>
          <animate attributeName="opacity" values={`${0.2*p};${p};${0.2*p}`} dur={`${2 + i%3}s`} repeatCount="indefinite" />
        </circle>
      ))}
      <circle cx="200" cy="220" r={80 + p*40} fill="url(#bioglow)" opacity={p*0.6}>
        <animate attributeName="opacity" values={`${0.3*p};${p*0.7};${0.3*p}`} dur="3s" repeatCount="indefinite" />
      </circle>
      <path d={`M 200 390 Q 190 330 205 ${260 - p*10} Q 195 210 200 ${180}`} stroke="#0891b2" strokeWidth="3" fill="none" opacity={0.8} />
      <g transform="translate(200 180)">
        {[0,45,90,135,180,225,270,315].map((a, i) => {
          const scale = p * 1.5;
          return (
            <g key={a} transform={`rotate(${a})`}>
              <ellipse cx="0" cy={-35*scale} rx={12*scale} ry={30*scale} fill="url(#biopetal)" opacity="0.9">
                <animate attributeName="opacity" values="0.6;1;0.6" dur={`${2 + i*0.3}s`} repeatCount="indefinite" />
              </ellipse>
            </g>
          );
        })}
        <circle r={12*p} fill="#ecfeff">
          <animate attributeName="r" values={`${10*p};${14*p};${10*p}`} dur="2s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [activeTab, setActiveTab] = useState('inbox');
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [showPlantMenu, setShowPlantMenu] = useState(false);
  const [plantPickerTask, setPlantPickerTask] = useState(null);
  const [focusTask, setFocusTask] = useState(null);
  const [sessionMins, setSessionMins] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const [eliminateMode, setEliminateMode] = useState(null);
  const [tabBlurred, setTabBlurred] = useState(false);
  const [datePickerTask, setDatePickerTask] = useState(null);

  const [googleToken, setGoogleToken] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleError, setGoogleError] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login');

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

  // Page Visibility API for Eliminate mode
  useEffect(() => {
    if (!eliminateMode) return;
    const onVisChange = () => {
      if (document.hidden) {
        setTabBlurred(true);
        setIsTimerRunning(false);
      } else {
        setTabBlurred(false);
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, [eliminateMode]);

  const startNurture = (task) => {
    setFocusTask(task);
    setTimeLeft(sessionMins * 60);
    setIsTimerRunning(true);
  };

  const startEliminate = (task) => {
    setEliminateMode(task);
    setTimeLeft(sessionMins * 60);
    setIsTimerRunning(true);
    setTabBlurred(false);
  };

  const changeDuration = (mins) => {
    setSessionMins(mins);
    setTimeLeft(mins * 60);
    setIsTimerRunning(false); 
  };

  const completeSession = async () => {
    setIsTimerRunning(false);
    const task = focusTask || eliminateMode;
    if (task && db) {
      const quad = QUADRANTS.find(q => q.id === task.quadrant);
      const newWatered = (task.watered || 0) + 1;
      const updates = { watered: newWatered };
      if (quad && newWatered >= quad.stages) {
        updates.completed = true;
        updates.completedAt = Date.now();
      }
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), updates);
      
      // Log nurture session for insights
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'sessions'), {
        taskId: task.id,
        taskText: task.text,
        quadrant: task.quadrant,
        plantId: task.plantId || 'lotus',
        duration: sessionMins,
        completedAt: Date.now(),
        hour: new Date().getHours(),
      });
      
      setFocusTask(null);
      setEliminateMode(null);
    }
  };

  const connectGoogle = async () => {
    setGoogleError(null);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    try {
      let result;
      if (auth.currentUser) result = await linkWithPopup(auth.currentUser, provider);
      else result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;
      setGoogleToken(token);
      return token;
    } catch (error) {
      console.error("Google Auth Error:", error);
      setGoogleError(error.message);
      return null;
    }
  };

  const scheduleInGoogleCalendar = async (task) => {
    let currentToken = googleToken;
    if (!currentToken) currentToken = await connectGoogle();
    if (!currentToken) return;
    
    setIsSyncing(true);
    const start = task.dueDate ? new Date(task.dueDate) : new Date();
    const end = new Date(start.getTime() + 30 * 60000);
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
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
          const newToken = await connectGoogle();
          if (newToken) scheduleInGoogleCalendar(task);
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
      archived: false,
      plantId: null,
      createdAt: Date.now(),
      completedAt: null,
      dueDate: null
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

  const setPlant = async (taskId, plantId) => {
    if (!db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), { plantId });
    setPlantPickerTask(null);
  };

  const setDueDate = async (taskId, date) => {
    if (!db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), { dueDate: date });
    setDatePickerTask(null);
  };

  const toggleComplete = async (task) => {
    if (!db) return;
    const quad = QUADRANTS.find(q => q.id === task.quadrant);
    const isDone = !task.completed;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', task.id), {
      completed: isDone,
      completedAt: isDone ? Date.now() : null,
      watered: isDone && quad ? quad.stages : task.watered
    });
  };

  const archiveTask = async (taskId) => {
    if (!db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), { archived: true });
  };

  const unarchiveTask = async (taskId) => {
    if (!db) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', taskId), { archived: false });
  };

  const archiveAllCompleted = async () => {
    if (!db) return;
    const batch = tasks.filter(t => t.completed && !t.archived);
    for (const task of batch) await archiveTask(task.id);
  };

  const deleteTask = async (id) => {
    if (!db) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', id));
  };

  const activeTasks = useMemo(() => tasks.filter(t => !t.archived), [tasks]);
  const archivedTasks = useMemo(() => tasks.filter(t => t.archived).sort((a,b) => (b.completedAt || 0) - (a.completedAt || 0)), [tasks]);
  
  const grouped = useMemo(() => {
    const b = { inbox: [], do: [], schedule: [], delegate: [], eliminate: [] };
    activeTasks.forEach(t => { if (b[t.quadrant]) b[t.quadrant].push(t); });
    Object.keys(b).forEach(key => {
      b[key].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return b.createdAt - a.createdAt;
      });
    });
    return b;
  }, [activeTasks]);

  const stats = useMemo(() => {
    const total = activeTasks.length;
    const done = activeTasks.filter(t => t.completed).length;
    const health = total === 0 ? 100 : Math.round((done / total) * 100);
    return { total, done, health };
  }, [activeTasks]);

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
          try {
            if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
            else await createUserWithEmailAndPassword(auth, email, password);
          } catch (err) { console.error(err); }
        }} className="space-y-3">
          <input type="email" required placeholder="Email" className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none text-sm" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" required placeholder="Password" className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl outline-none text-sm" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="w-full bg-emerald-800 text-white py-3 rounded-xl font-bold hover:bg-emerald-900 transition-all text-sm uppercase tracking-widest">
            {authMode === 'login' ? 'Enter Grove' : 'Plant Roots'}
          </button>
        </form>
        <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="mt-6 text-stone-400 text-[10px] uppercase font-black tracking-[0.2em] hover:text-emerald-700 transition-colors">
          {authMode === 'login' ? "Seed an account" : "Back to login"}
        </button>
      </div>
    </div>
  );

  const currentBloomTask = focusTask || eliminateMode;
  const bloomProgress = currentBloomTask ? 1 - (timeLeft / (sessionMins * 60)) : 0;

  return (
    <div className="min-h-screen bg-[#f8faf8] text-stone-800 font-sans pb-24 md:pb-12 overflow-x-hidden selection:bg-emerald-500/10">
      
      {/* NURTURE / ELIMINATE TIMER - BLOOM VIEW */}
      {currentBloomTask && (
        <div className={`fixed inset-0 z-[100] backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-300 ${eliminateMode ? 'bg-slate-900/95' : 'bg-white/95'}`}>
          
          {/* Tab-switch warning for Eliminate mode */}
          {eliminateMode && tabBlurred && (
            <div className="absolute inset-0 bg-rose-900/90 flex flex-col items-center justify-center z-10 p-6 text-center">
              <Shield size={64} className="text-rose-200 mb-4" />
              <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Bloom Paused</h3>
              <p className="text-rose-200 text-sm mb-6 max-w-xs">You left the grove. Return to continue your focus.</p>
              <button onClick={() => { setTabBlurred(false); setIsTimerRunning(true); }} className="bg-white text-rose-900 px-6 py-3 rounded-full font-bold uppercase text-xs tracking-widest">Resume</button>
            </div>
          )}
          
          <div className="flex gap-2 mb-4 bg-stone-100 p-1 rounded-full">
            {[15, 25, 45, 60].map(m => (
              <button key={m} onClick={() => changeDuration(m)} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${sessionMins === m ? 'bg-white text-emerald-800 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>
                {m}m
              </button>
            ))}
          </div>
          
          <div className="text-center mb-4 px-6">
            <h2 className={`text-xl md:text-3xl font-black mb-1 leading-tight uppercase tracking-tighter italic ${eliminateMode ? 'text-white' : 'text-stone-800'}`}>
              {eliminateMode ? 'Resist Distraction' : 'Nurturing Growth'}
            </h2>
            <p className={`text-sm italic truncate max-w-[280px] md:max-w-md mx-auto ${eliminateMode ? 'text-slate-300' : 'text-stone-400'}`}>"{currentBloomTask.text}"</p>
          </div>

          {/* Full-screen bloom */}
          <div className="relative w-72 h-72 md:w-96 md:h-96 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center">
              <BloomVisualization plantId={currentBloomTask.plantId || 'lotus'} progress={bloomProgress} />
            </div>
          </div>

          {/* Timer */}
          <div className={`text-4xl md:text-5xl font-light tabular-nums mb-6 ${eliminateMode ? 'text-white' : 'text-stone-700'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>

          {/* Progress bar */}
          <div className={`w-64 h-1 rounded-full mb-6 overflow-hidden ${eliminateMode ? 'bg-slate-700' : 'bg-stone-100'}`}>
            <div className="h-full bg-emerald-600 transition-all duration-1000" style={{ width: `${bloomProgress * 100}%` }} />
          </div>

          <div className="flex gap-4">
            <button onClick={() => setIsTimerRunning(!isTimerRunning)} className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all ${eliminateMode ? 'bg-white text-slate-900' : 'bg-emerald-700 text-white'}`}>
              {isTimerRunning ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
            </button>
            <button onClick={() => { setFocusTask(null); setEliminateMode(null); setIsTimerRunning(false); }} className={`w-16 h-16 rounded-full flex items-center justify-center active:scale-95 transition-all ${eliminateMode ? 'bg-slate-700 text-slate-300' : 'bg-stone-100 text-stone-400'}`}>
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {/* PLANTING SHEET (quadrant picker) */}
      {showPlantMenu && (
        <div className="fixed inset-0 z-[110] bg-stone-900/20 backdrop-blur-sm flex items-end md:items-center justify-center p-4" onClick={() => setShowPlantMenu(false)}>
          <div className="max-w-md md:max-w-xl w-full bg-white rounded-[2rem] p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom md:zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg md:text-xl font-bold text-stone-800 uppercase tracking-tight italic">Assign Strategy</h3>
              <button onClick={() => setShowPlantMenu(false)} className="p-2 text-stone-300 hover:text-stone-600"><X size={18} /></button>
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

      {/* PLANT PICKER */}
      {plantPickerTask && (
        <div className="fixed inset-0 z-[110] bg-stone-900/20 backdrop-blur-sm flex items-end md:items-center justify-center p-4" onClick={() => setPlantPickerTask(null)}>
          <div className="max-w-md md:max-w-2xl w-full bg-white rounded-[2rem] p-6 pb-10 shadow-2xl animate-in slide-in-from-bottom md:zoom-in duration-300 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg md:text-xl font-bold text-stone-800 uppercase tracking-tight italic">Choose Bloom</h3>
              <button onClick={() => setPlantPickerTask(null)} className="p-2 text-stone-300 hover:text-stone-600"><X size={18} /></button>
            </div>
            <p className="text-xs text-stone-400 mb-6 italic">"{plantPickerTask.text}"</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PLANTS.map(plant => (
                <button key={plant.id} onClick={() => setPlant(plantPickerTask.id, plant.id)} className={`p-3 rounded-xl border-2 hover:border-emerald-600 hover:bg-emerald-50 transition-all text-left ${plantPickerTask.plantId === plant.id ? 'border-emerald-600 bg-emerald-50' : 'border-stone-100'}`}>
                  <div className="aspect-square bg-stone-50 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full"><BloomVisualization plantId={plant.id} progress={1} /></div>
                  </div>
                  <div className="font-bold text-stone-800 text-xs leading-tight">{plant.name}</div>
                  <div className="text-[9px] text-stone-400 font-medium mt-0.5">{plant.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DATE PICKER */}
      {datePickerTask && (
        <MiniCalendar task={datePickerTask} onSelect={(d) => setDueDate(datePickerTask.id, d)} onClose={() => setDatePickerTask(null)} />
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
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          <TabButton active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} label="Tray" />
          <TabButton active={activeTab === 'garden'} onClick={() => setActiveTab('garden')} label="Garden" />
          <TabButton active={activeTab === 'scene'} onClick={() => setActiveTab('scene')} label="Scene" />
          <TabButton active={activeTab === 'almanac'} onClick={() => setActiveTab('almanac')} label="Almanac" />
          <TabButton active={activeTab === 'shed'} onClick={() => setActiveTab('shed')} label="Shed" />
          <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Legacy" />
        </div>

        {activeTab === 'inbox' && (
          <div 
            className="max-w-3xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, 'inbox')}
          >
            <form onSubmit={addTask} className="relative group">
              <input autoFocus type="text" placeholder="Plant a seed" className="w-full px-5 py-3 md:py-4 bg-white border border-stone-200 rounded-xl text-sm md:text-base font-medium text-stone-700 outline-none focus:border-emerald-600 transition-all shadow-sm" value={newTaskText} onChange={e => setNewTaskText(e.target.value)} />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-700 p-1.5 md:p-2 rounded-lg text-white shadow-md hover:bg-emerald-800 transition-all"><Plus size={18} /></button>
            </form>
            <div className="grid grid-cols-1 gap-2">
              {grouped.inbox.map(task => (
                <TaskItem key={task.id} task={task} onAction={() => { setSelectedTask(task); setShowPlantMenu(true); }} onDelete={() => deleteTask(task.id)} onDragStart={(e) => handleDragStart(e, task.id)} onComplete={() => toggleComplete(task)} onPickPlant={() => setPlantPickerTask(task)} isInbox />
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
              <div key={q.id} className={`space-y-3 p-4 md:p-6 rounded-2xl border-2 border-dashed ${q.border} bg-white/40 transition-colors min-h-[160px] shadow-sm`} onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, q.id)}>
                <div className="flex items-center justify-between px-1 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`${q.color} ${q.bg} p-1.5 rounded-lg shadow-sm border border-stone-100/50`}>{q.icon}</div>
                    <div className="leading-none">
                      <h2 className="text-[11px] md:text-sm font-bold text-stone-800 uppercase tracking-tighter">{q.name}</h2>
                      <p className="text-[8px] md:text-[9px] font-bold text-stone-400 uppercase tracking-widest">{q.desc}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-stone-300 uppercase">{grouped[q.id].length} roots</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {grouped[q.id].map(task => (
                    <TaskItem key={task.id} task={task} 
                      onNurture={() => q.id === 'eliminate' ? startEliminate(task) : startNurture(task)} 
                      onComplete={() => toggleComplete(task)} 
                      onAction={() => { setSelectedTask(task); setShowPlantMenu(true); }} 
                      onDelete={() => deleteTask(task.id)} 
                      onDragStart={(e) => handleDragStart(e, task.id)} 
                      onCalendar={() => scheduleInGoogleCalendar(task)} 
                      onDatePicker={() => setDatePickerTask(task)}
                      onArchive={() => archiveTask(task.id)}
                      onPickPlant={() => setPlantPickerTask(task)}
                      isSyncing={isSyncing} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'scene' && <GardenScene tasks={activeTasks} />}
        {activeTab === 'almanac' && <Almanac user={user} tasks={tasks} />}
        
        {activeTab === 'shed' && (
          <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <Archive size={32} className="text-stone-400 mx-auto mb-2" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-stone-600">The Shed</h2>
              <p className="text-[10px] text-stone-400 italic mt-1">{archivedTasks.length} preserved memories</p>
            </div>
            <div className="space-y-2">
              {archivedTasks.length === 0 ? (
                <div className="py-12 text-center text-stone-200 flex flex-col items-center border-2 border-dashed border-stone-100 rounded-3xl">
                  <Archive className="mb-2 opacity-10" size={40} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Shed Is Empty</p>
                </div>
              ) : archivedTasks.map(task => (
                <div key={task.id} className="bg-white border border-stone-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                  <div className="w-10 h-10 bg-stone-50 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                    <BloomVisualization plantId={task.plantId || 'lotus'} progress={1} />
                  </div>
                  <div className="grow">
                    <h3 className="text-sm font-semibold text-stone-700 leading-tight">{task.text}</h3>
                    <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">
                      {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'archived'} · {PLANTS.find(p => p.id === task.plantId)?.name || 'Lotus'}
                    </p>
                  </div>
                  <button onClick={() => unarchiveTask(task.id)} title="Restore" className="p-2 bg-stone-50 text-stone-400 rounded-lg hover:text-emerald-600 transition-colors"><RotateCcw size={14} /></button>
                  <button onClick={() => { if(confirm('Permanently delete?')) deleteTask(task.id) }} className="p-2 bg-stone-50 text-stone-300 rounded-lg hover:text-rose-500 transition-all"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in duration-300">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard label="Harvested" val={stats.done} icon={<Flower2 size={20} className="text-emerald-600" />} />
              <StatCard label="Growing" val={stats.total - stats.done} icon={<Sprout size={20} className="text-emerald-700" />} />
              <StatCard label="Vitality" val={stats.health + "%"} icon={<Trophy size={20} className="text-amber-500" />} />
            </div>
            <div className="bg-white border border-stone-200 rounded-3xl p-8 text-center max-w-md mx-auto shadow-sm">
               <h3 className="text-sm font-bold text-stone-800 mb-6 uppercase tracking-widest">Ecosystem Tools</h3>
               <div className="flex flex-col gap-3">
                 <button onClick={archiveAllCompleted} className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100"><Archive size={18} /> Archive All Completed</button>
                 <button onClick={connectGoogle} className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${googleToken ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-stone-900 text-white hover:bg-black shadow-lg shadow-stone-200'}`}><Calendar size={18} /> {googleToken ? 'Connected' : 'Connect Calendar'}</button>
               </div>
               {googleError && <p className="mt-4 text-[10px] text-rose-500 font-bold uppercase tracking-tight p-3 bg-rose-50 rounded-lg">{googleError}</p>}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-4 left-0 right-0 px-4 z-40 md:hidden pointer-events-none">
        <div className="max-w-sm mx-auto bg-white/90 backdrop-blur-md border border-stone-200 rounded-2xl p-1 flex justify-between shadow-xl pointer-events-auto">
          <NavIcon active={activeTab === 'inbox'} onClick={() => setActiveTab('inbox')} icon={<Inbox size={18} />} />
          <NavIcon active={activeTab === 'garden'} onClick={() => setActiveTab('garden')} icon={<LayoutGrid size={18} />} />
          <NavIcon active={activeTab === 'scene'} onClick={() => setActiveTab('scene')} icon={<Flower2 size={18} />} />
          <NavIcon active={activeTab === 'almanac'} onClick={() => setActiveTab('almanac')} icon={<BarChart3 size={18} />} />
          <NavIcon active={activeTab === 'shed'} onClick={() => setActiveTab('shed')} icon={<Archive size={18} />} />
          <NavIcon active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<Trophy size={18} />} />
        </div>
      </nav>
    </div>
  );
}

// --- GARDEN SCENE VIEW ---
function GardenScene({ tasks }) {
  const active = tasks.filter(t => !t.archived && t.quadrant !== 'inbox');
  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="bg-gradient-to-b from-sky-50 via-emerald-50 to-amber-50 rounded-3xl p-6 md:p-10 min-h-[500px] relative overflow-hidden shadow-inner border border-stone-200">
        {/* Sun */}
        <div className="absolute top-6 right-8 w-16 h-16 bg-amber-200 rounded-full blur-xl opacity-60" />
        <div className="absolute top-8 right-10 w-12 h-12 bg-amber-300 rounded-full opacity-80" />
        
        <h2 className="text-sm font-black uppercase tracking-widest text-stone-600 mb-6 relative z-10">Your Grove</h2>
        
        {active.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <Sprout size={48} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs font-bold uppercase tracking-widest">Plant a task to see your grove grow</p>
          </div>
        ) : (
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            {active.map(task => {
              const quad = QUADRANTS.find(q => q.id === task.quadrant);
              const progress = task.completed ? 1 : Math.min(1, (task.watered || 0) / (quad?.stages || 1));
              return (
                <div key={task.id} className="bg-white/60 backdrop-blur-sm rounded-2xl p-3 border border-white shadow-sm hover:shadow-md transition-all">
                  <div className="aspect-square bg-gradient-to-b from-sky-100 to-emerald-100 rounded-xl mb-2 overflow-hidden relative">
                    <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-amber-200 to-transparent" />
                    <div className="absolute inset-0">
                      <BloomVisualization plantId={task.plantId || 'lotus'} progress={progress} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-stone-700 truncate">{task.text}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${quad?.color.replace('text-', 'bg-') || 'bg-stone-400'}`} />
                    <p className="text-[9px] text-stone-400 uppercase tracking-wider font-medium">{quad?.name || 'Seed'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-amber-900/20 to-transparent" />
      </div>
    </div>
  );
}

// --- ALMANAC (insights) ---
function Almanac({ user, tasks }) {
  const [sessions, setSessions] = useState([]);
  
  useEffect(() => {
    if (!user || !db) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'sessions'));
    return onSnapshot(q, (s) => setSessions(s.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [user]);

  // Completion streak calculation
  const streaks = useMemo(() => {
    const completed = tasks.filter(t => t.completedAt).map(t => new Date(t.completedAt).toDateString());
    const uniqueDays = [...new Set(completed)].sort((a,b) => new Date(b) - new Date(a));
    
    let current = 0;
    let longest = 0;
    let running = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    // current streak
    if (uniqueDays.includes(today) || uniqueDays.includes(yesterday)) {
      let checkDate = uniqueDays.includes(today) ? today : yesterday;
      for (const day of uniqueDays) {
        if (day === checkDate) {
          current++;
          checkDate = new Date(new Date(checkDate).getTime() - 86400000).toDateString();
        } else break;
      }
    }
    
    // longest streak
    for (let i = 0; i < uniqueDays.length; i++) {
      if (i === 0) { running = 1; continue; }
      const diff = (new Date(uniqueDays[i-1]) - new Date(uniqueDays[i])) / 86400000;
      if (diff === 1) running++;
      else { longest = Math.max(longest, running); running = 1; }
    }
    longest = Math.max(longest, running);
    
    return { current, longest, totalDays: uniqueDays.length };
  }, [tasks]);

  // Time-of-day heatmap
  const hourData = useMemo(() => {
    const hours = Array(24).fill(0);
    sessions.forEach(s => { if (typeof s.hour === 'number') hours[s.hour]++; });
    tasks.filter(t => t.completedAt).forEach(t => {
      const h = new Date(t.completedAt).getHours();
      hours[h]++;
    });
    return hours;
  }, [sessions, tasks]);

  // Growth timeline (blooms per week, last 12 weeks)
  const timeline = useMemo(() => {
    const weeks = Array(12).fill(0).map((_, i) => {
      const end = Date.now() - i * 7 * 86400000;
      const start = end - 7 * 86400000;
      return { label: `W-${11-i}`, start, end, count: 0 };
    }).reverse();
    
    tasks.filter(t => t.completedAt).forEach(t => {
      const week = weeks.find(w => t.completedAt >= w.start && t.completedAt < w.end);
      if (week) week.count++;
    });
    return weeks;
  }, [tasks]);

  const maxWeek = Math.max(1, ...timeline.map(w => w.count));
  const maxHour = Math.max(1, ...hourData);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="text-center mb-6">
        <BarChart3 size={32} className="text-emerald-600 mx-auto mb-2" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-600">Almanac</h2>
        <p className="text-[10px] text-stone-400 italic mt-1">Patterns in your grove</p>
      </div>

      {/* Streak cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-sm">
          <Flame size={20} className="text-amber-500 mx-auto mb-1" />
          <div className="text-2xl md:text-3xl font-black text-stone-800">{streaks.current}</div>
          <div className="text-[8px] md:text-[9px] font-bold text-stone-400 uppercase tracking-widest">Current Streak</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-sm">
          <Trophy size={20} className="text-emerald-600 mx-auto mb-1" />
          <div className="text-2xl md:text-3xl font-black text-stone-800">{streaks.longest}</div>
          <div className="text-[8px] md:text-[9px] font-bold text-stone-400 uppercase tracking-widest">Longest Streak</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 text-center shadow-sm">
          <Calendar size={20} className="text-blue-500 mx-auto mb-1" />
          <div className="text-2xl md:text-3xl font-black text-stone-800">{streaks.totalDays}</div>
          <div className="text-[8px] md:text-[9px] font-bold text-stone-400 uppercase tracking-widest">Active Days</div>
        </div>
      </div>

      {/* Growth timeline */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-4">Garden Growth · Last 12 Weeks</h3>
        <div className="flex items-end gap-1 md:gap-2 h-32">
          {timeline.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t transition-all hover:from-emerald-700" style={{ height: `${(w.count / maxWeek) * 100}%`, minHeight: w.count > 0 ? '4px' : '0' }} title={`${w.count} blooms`} />
              <div className="text-[8px] text-stone-400 font-bold">{w.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hour heatmap */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-600 mb-4">Your Rhythm · When You Bloom</h3>
        <div className="grid grid-cols-12 md:grid-cols-24 gap-1">
          {hourData.map((count, hour) => {
            const intensity = count / maxHour;
            return (
              <div key={hour} className="flex flex-col items-center gap-1" title={`${hour}:00 · ${count} actions`}>
                <div className="w-full aspect-square rounded" style={{ backgroundColor: count === 0 ? '#f5f5f4' : `rgba(5, 150, 105, ${0.2 + intensity * 0.8})` }} />
                <div className="text-[7px] text-stone-400 font-bold">{hour % 3 === 0 ? hour : ''}</div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[8px] text-stone-400 uppercase mt-2 font-bold">
          <span>Midnight</span><span>Noon</span><span>11 PM</span>
        </div>
      </div>

      {sessions.length === 0 && tasks.filter(t => t.completedAt).length === 0 && (
        <p className="text-center text-[10px] text-stone-400 italic">Complete tasks and nurture sessions to fill your almanac</p>
      )}
    </div>
  );
}

// --- MINI CALENDAR (inline date picker) ---
function MiniCalendar({ task, onSelect, onClose }) {
  const [month, setMonth] = useState(() => task.dueDate ? new Date(task.dueDate) : new Date());
  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const today = new Date();
  const selected = task.dueDate ? new Date(task.dueDate) : null;
  const monthName = month.toLocaleString('default', { month: 'long' });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const pickDate = (d) => {
    const pickedDate = new Date(year, monthIdx, d);
    const iso = pickedDate.toISOString().split('T')[0];
    onSelect(iso);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-stone-900/20 backdrop-blur-sm flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="max-w-sm w-full bg-white rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom md:zoom-in duration-300" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-stone-600">Schedule</h3>
          <button onClick={onClose} className="p-1 text-stone-300 hover:text-stone-600"><X size={16} /></button>
        </div>
        <p className="text-xs text-stone-500 italic mb-4 truncate">"{task.text}"</p>
        
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setMonth(new Date(year, monthIdx - 1))} className="p-2 hover:bg-stone-50 rounded-lg text-stone-500"><ChevronLeft size={16} /></button>
          <div className="text-sm font-bold text-stone-800">{monthName} {year}</div>
          <button onClick={() => setMonth(new Date(year, monthIdx + 1))} className="p-2 hover:bg-stone-50 rounded-lg text-stone-500"><ChevronRight size={16} /></button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="text-[9px] font-black text-stone-400 text-center uppercase tracking-widest py-1">{d}</div>)}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const isToday = d === today.getDate() && monthIdx === today.getMonth() && year === today.getFullYear();
            const isSelected = selected && d === selected.getDate() && monthIdx === selected.getMonth() && year === selected.getFullYear();
            const isPast = new Date(year, monthIdx, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            return (
              <button key={i} onClick={() => pickDate(d)} className={`aspect-square rounded-lg text-xs font-semibold transition-all ${isSelected ? 'bg-emerald-700 text-white shadow-md' : isToday ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : isPast ? 'text-stone-300 hover:bg-stone-50' : 'text-stone-700 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                {d}
              </button>
            );
          })}
        </div>
        
        <div className="flex gap-2 mt-4">
          <button onClick={() => { const d = new Date(); onSelect(d.toISOString().split('T')[0]); }} className="flex-1 py-2 bg-stone-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:bg-stone-100">Today</button>
          <button onClick={() => { const d = new Date(Date.now() + 86400000); onSelect(d.toISOString().split('T')[0]); }} className="flex-1 py-2 bg-stone-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:bg-stone-100">Tomorrow</button>
          <button onClick={() => { const d = new Date(Date.now() + 7 * 86400000); onSelect(d.toISOString().split('T')[0]); }} className="flex-1 py-2 bg-stone-50 rounded-lg text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:bg-stone-100">+1 Week</button>
        </div>
        {task.dueDate && (
          <button onClick={() => onSelect(null)} className="w-full mt-2 py-2 text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-lg">Clear Date</button>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label }) {
  return <button onClick={onClick} className={`px-4 py-1.5 md:px-6 md:py-2 rounded-full text-[10px] md:text-xs font-bold transition-all ${active ? 'bg-emerald-800 text-white shadow-sm' : 'bg-white text-stone-400 border border-stone-200 hover:border-stone-300'}`}>{label}</button>;
}

function NavIcon({ active, onClick, icon }) {
  return <button onClick={onClick} className={`p-2.5 flex-1 flex justify-center rounded-xl transition-all ${active ? 'bg-emerald-50 text-emerald-800' : 'text-stone-300 hover:text-stone-500'}`}>{icon}</button>;
}

function TaskItem({ task, onNurture, onComplete, onAction, onDelete, onDragStart, onCalendar, onDatePicker, onArchive, onPickPlant, isInbox = false, isSyncing = false }) {
  const quad = QUADRANTS.find(q => q.id === task.quadrant);
  const isBloom = task.completed || (quad && task.watered >= quad.stages);
  const isSchedule = quad?.id === 'schedule';
  const plant = PLANTS.find(p => p.id === task.plantId);
  
  return (
    <div draggable onDragStart={onDragStart} className={`bg-white border border-stone-100 rounded-xl p-2 md:p-2.5 flex flex-col gap-1.5 md:gap-2 transition-all hover:border-emerald-300 hover:shadow-sm cursor-grab active:cursor-grabbing ${task.completed ? 'opacity-40 grayscale bg-stone-50' : 'shadow-sm'}`}>
      <div className="flex items-center gap-2.5">
        <button onClick={onPickPlant} title="Choose bloom" className="shrink-0 flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg bg-stone-50 hover:bg-emerald-50 transition-all overflow-hidden">
          {task.plantId ? (
            <div className="w-full h-full"><BloomVisualization plantId={task.plantId} progress={isBloom ? 1 : Math.max(0.4, (task.watered || 0) / (quad?.stages || 1))} /></div>
          ) : isBloom ? <Flower2 size={16} className="text-emerald-600" /> : (task.watered || 0) > 0 ? <Sprout size={14} className="text-emerald-700" /> : <GripVertical size={12} className="text-stone-200" />}
        </button>
        <div className="grow overflow-hidden">
          <h3 className="text-xs md:text-sm font-semibold text-stone-800 truncate leading-tight">{task.text}</h3>
          
          <div className="flex items-center gap-2 flex-wrap">
            {!isInbox && quad?.id !== 'eliminate' && !task.completed && (
              <div className="flex gap-0.5">
                {[...Array(quad?.stages || 1)].map((_, i) => (
                  <div key={i} className={`w-1 h-1 rounded-full ${i < (task.watered || 0) ? 'bg-emerald-600' : 'bg-stone-100'}`} />
                ))}
              </div>
            )}
            {isSchedule && !task.completed && (
              <button onClick={onDatePicker} className="text-[9px] md:text-[10px] text-stone-500 font-bold uppercase tracking-wider hover:text-emerald-600 flex items-center gap-1 bg-stone-50 hover:bg-emerald-50 px-1.5 py-0.5 rounded transition-colors">
                <Calendar size={10} />
                {task.dueDate ? new Date(task.dueDate + 'T00:00').toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'Set Date'}
              </button>
            )}
            {plant && !isInbox && <span className="text-[9px] text-stone-400 font-medium">{plant.name}</span>}
          </div>
        </div>
      </div>
      
      <div className="flex gap-1 items-center">
        {isInbox ? (
          <button onClick={onAction} className="flex-1 bg-emerald-700 text-white py-1 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-emerald-800 transition-colors">Plant</button>
        ) : !task.completed ? (
          <button onClick={onNurture} className={`flex-1 text-white py-1 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${quad?.id === 'eliminate' ? 'bg-slate-700 hover:bg-slate-800' : 'bg-emerald-700 hover:bg-emerald-800'}`}>
            {quad?.id === 'eliminate' ? 'Resist' : 'Nurture'}
          </button>
        ) : <div className="flex-1" />}
        {isSchedule && !task.completed && (<button onClick={onCalendar} disabled={isSyncing} className="p-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Send to Google Calendar"><Calendar size={12} className={isSyncing ? 'animate-pulse' : ''} /></button>)}
        {!isInbox && !task.completed && (<button onClick={onAction} className="p-1 bg-stone-50 text-stone-400 rounded-lg hover:bg-stone-100" title="Move"><Settings size={12} /></button>)}
        {task.completed && (<button onClick={onArchive} className="p-1 bg-stone-50 text-stone-400 rounded-lg hover:text-emerald-600" title="Archive to Shed"><Archive size={12} /></button>)}
        <button onClick={onComplete} className={`p-1 rounded-lg border transition-all ${task.completed ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-white text-stone-200 border-stone-100 hover:text-emerald-700'}`}><CheckCircle2 size={14} /></button>
        <button onClick={() => { if(confirm('Uproot?')) onDelete() }} className="p-1 bg-stone-50 text-stone-200 rounded-lg hover:text-rose-500 transition-all"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function StatCard({ label, val, icon }) {
  return <div className="bg-white border border-stone-200 p-4 md:p-6 rounded-2xl md:rounded-[2rem] text-center shadow-sm hover:shadow-md transition-all"><div className="flex justify-center mb-1 md:mb-2 opacity-50">{icon}</div><div className="text-lg md:text-3xl font-black text-stone-800 mb-0.5">{val}</div><div className="text-[8px] md:text-[9px] font-black text-stone-400 uppercase tracking-widest">{label}</div></div>;
}

function Loader() { return <div className="h-screen bg-[#f8faf8] flex items-center justify-center"><div className="w-10 h-10 border-4 border-emerald-700 border-t-transparent rounded-full animate-spin" /></div>; }

function SetupUI() { return <div className="min-h-screen bg-[#f8faf8] flex items-center justify-center p-8 text-center"><div className="max-w-md w-full bg-white border border-stone-200 rounded-3xl p-10 shadow-sm"><AlertCircle size={40} className="text-rose-500 mx-auto mb-4" /><h2 className="text-lg font-bold mb-3 text-stone-800 uppercase tracking-tighter">Vault Locked</h2><p className="text-stone-500 text-xs mb-6 leading-relaxed text-center">System requires Firebase API keys in App.jsx (Lines 34-45).</p></div></div>; }
