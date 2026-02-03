'use client';

import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Trophy, RefreshCw, Timer, Zap, Shield, Crosshair, Hexagon, AlertCircle } from 'lucide-react';

// ==================================================================
// 🛠️ Firebase & Game Config
// ==================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBPd5xk9UseJf79GTZogckQmKKwwogneco",
  authDomain: "test-4305d.firebaseapp.com",
  projectId: "test-4305d",
  storageBucket: "test-4305d.firebasestorage.app",
  messagingSenderId: "402376205992",
  appId: "1:402376205992:web:be662592fa4d5f0efb849d"
};

let firebaseApp, db, auth;
if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
  db = getFirestore(firebaseApp);
  auth = getAuth(firebaseApp);
}

const MAP_SIZE = 40;
const GAME_DURATION = 90;

const CHAMPIONS = [
  { id: 0, name: 'BULL', role: 'TANK', icon: Shield, hp: 200, speed: 8, color: '#f43f5e', weapon: { cooldown: 0.8, count: 5, spread: 0.4, speed: 14, range: 0.35, damage: 15 } },
  { id: 1, name: 'COLT', role: 'RAPID', icon: Zap, hp: 100, speed: 12, color: '#3b82f6', weapon: { cooldown: 0.15, count: 1, spread: 0.05, speed: 22, range: 0.6, damage: 10 } },
  { id: 2, name: 'PIPER', role: 'SNIPER', icon: Crosshair, hp: 80, speed: 9, color: '#8b5cf6', weapon: { cooldown: 1.5, count: 1, spread: 0.0, speed: 35, range: 1.2, damage: 60 } },
  { id: 3, name: 'DYNAMO', role: 'BLASTER', icon: Hexagon, hp: 120, speed: 7, color: '#f59e0b', weapon: { cooldown: 1.0, count: 1, spread: 0.1, speed: 16, range: 0.7, damage: 40, explode: true } }
];

export default function Supercell25D() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState('lobby'); 
  const [selectedChamp, setSelectedChamp] = useState(0);
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [winner, setWinner] = useState(null);

  const canvasRef = useRef(null);
  const requestRef = useRef();
  const engine = useRef({
    grid: [], walls: [], players: [], bullets: [], lastTime: 0,
    joystick: { active: false, x: 0, y: 0, ox: 0, oy: 0 },
    shootBtn: { active: false }
  });

  // --- Auth ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      if(u) setUser(u);
      else signInAnonymously(auth).catch(console.error);
    });
    return () => unsub();
  }, []);

  // --- 2.5D View Logic ---
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;
    const ctx = canvas.getContext('2d');
    const sw = canvas.width = canvas.clientWidth;
    const sh = canvas.height = canvas.clientHeight;

    const { grid, players, bullets, walls } = engine.current;
    const myPlayer = players[0];
    if (!myPlayer) return;

    // 카메라 (내 캐릭터 중심)
    const scale = Math.min(sw, sh) / 15;
    const camX = sw/2 - myPlayer.x * scale;
    const camY = sh/2 - myPlayer.y * scale;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, sw, sh);

    ctx.save();
    ctx.translate(camX, camY);

    // 1. 바닥 렌더링
    const currentScores = [0,0,0,0];
    for(let y=0; y<MAP_SIZE; y++) {
      for(let x=0; x<MAP_SIZE; x++) {
        const id = grid[y][x];
        if (id === 99) continue;
        ctx.fillStyle = id === -1 ? '#1e293b' : CHAMPIONS[players[id]?.champId]?.color || '#fff';
        ctx.fillRect(x*scale, y*scale, scale+1, scale+1);
        if (id !== -1 && id !== 99) currentScores[id]++;
      }
    }
    if (Math.random() < 0.05) setScores(currentScores);

    // 2. Y-Sorting 정렬 (2.5D 핵심)
    const entities = [
      ...walls.map(w => ({ type: 'W', x: w.x, y: w.y })),
      ...players.filter(p => p.respawnTime <= 0).map(p => ({ type: 'P', x: p.x, y: p.y, data: p }))
    ].sort((a,b) => a.y - b.y);

    entities.forEach(e => {
      const px = e.x * scale, py = e.y * scale;
      if (e.type === 'W') {
        const h = scale * 0.7;
        ctx.fillStyle = '#020617'; ctx.fillRect(px, py + scale - h, scale, h); // Side
        ctx.fillStyle = '#475569'; ctx.fillRect(px, py - h, scale, scale); // Top
      } else {
        const p = e.data;
        const c = CHAMPIONS[p.champId];
        // 그림자
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(px + scale/2, py + scale/2, scale*0.4, scale*0.2, 0, 0, Math.PI*2); ctx.fill();
        // 몸체
        const fy = py + scale/2 - (Math.abs(Math.sin(Date.now()/200)*5));
        ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(px + scale/2, fy, scale*0.4, 0, Math.PI*2); ctx.fill();
        // 방향 지시선
        ctx.strokeStyle = 'white'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(px + scale/2, fy);
        ctx.lineTo(px + scale/2 + Math.cos(p.angle)*scale*0.5, fy + Math.sin(p.angle)*scale*0.5); ctx.stroke();
      }
    });

    // 3. 투사체
    bullets.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x * scale, b.y * scale, scale*0.2, 0, Math.PI*2); ctx.fill();
    });

    ctx.restore();
    updateLogic();
    requestRef.current = requestAnimationFrame(render);
  };

  const updateLogic = () => {
    const now = Date.now();
    const dt = (now - engine.current.lastTime) / 1000;
    engine.current.lastTime = now;
    if (dt > 0.1) return;

    const { players, bullets, grid, joystick, shootBtn } = engine.current;

    players.forEach(p => {
      if (p.respawnTime > 0) {
        p.respawnTime -= dt;
        return;
      }
      const stats = CHAMPIONS[p.champId];
      const speed = stats.speed * dt * (grid[Math.floor(p.y)][Math.floor(p.x)] === p.id ? 1.3 : 0.8);

      if (!p.isAi) {
        if (joystick.active) {
          const nx = p.x + joystick.x * speed, ny = p.y + joystick.y * speed;
          if (grid[Math.floor(p.y)][Math.floor(nx)] !== 99) p.x = nx;
          if (grid[Math.floor(ny)][Math.floor(p.x)] !== 99) p.y = ny;
          p.angle = Math.atan2(joystick.y, joystick.x);
        }
        if (shootBtn.active) fire(p);
      } else {
        // AI: 간단 무빙 & 발사
        p.moveTimer -= dt;
        if (p.moveTimer <= 0) { p.targetA = Math.random()*Math.PI*2; p.moveTimer = 1; }
        p.angle += (p.targetA - p.angle) * 0.1;
        const nx = p.x + Math.cos(p.angle)*speed, ny = p.y + Math.sin(p.angle)*speed;
        if (grid[Math.floor(ny)]?.[Math.floor(nx)] !== 99) { p.x = nx; p.y = ny; } else { p.targetA += Math.PI; }
        fire(p);
      }
      p.cooldown -= dt;
    });

    for (let i = bullets.length-1; i>=0; i--) {
      const b = bullets[i];
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      b.life -= dt;
      
      const tx = Math.floor(b.x), ty = Math.floor(b.y);
      if (grid[ty]?.[tx] === 99 || b.life <= 0) { bullets.splice(i, 1); continue; }
      
      // 색칠
      const rad = b.explode ? 3 : 1.5;
      for(let y=-2; y<=2; y++) for(let x=-2; x<=2; x++) {
        if (x*x+y*y < rad) {
          const gx = tx+x, gy = ty+y;
          if (grid[gy]?.[gx] !== undefined && grid[gy][gx] !== 99) grid[gy][gx] = b.ownerId;
        }
      }
    }
  };

  const fire = (p) => {
    if (p.cooldown > 0) return;
    const s = CHAMPIONS[p.champId].weapon;
    for(let i=0; i<s.count; i++) {
      engine.current.bullets.push({
        x: p.x, y: p.y, angle: p.angle + (i - s.count/2)*0.2,
        speed: s.speed, life: s.range, ownerId: p.id, color: CHAMPIONS[p.champId].color, explode: s.explode
      });
    }
    p.cooldown = s.cooldown;
  };

  const init = () => {
    const grid = Array.from({length: MAP_SIZE}, (_, y) => 
      Array.from({length: MAP_SIZE}, (_, x) => 
        (x===0 || x===39 || y===0 || y===39 || (x%10===0 && y%10===0)) ? 99 : -1
      )
    );
    const walls = [];
    grid.forEach((row, y) => row.forEach((v, x) => v === 99 && walls.push({x, y})));

    engine.current = {
      ...engine.current, grid, walls, bullets: [], lastTime: Date.now(),
      players: [
        { id: 0, x: 5, y: 5, champId: selectedChamp, hp: 100, angle: 0, cooldown: 0, isAi: false, respawnTime: 0 },
        { id: 1, x: 34, y: 34, champId: 1, hp: 100, angle: 0, cooldown: 0, isAi: true, respawnTime: 0 },
        { id: 2, x: 34, y: 5, champId: 2, hp: 100, angle: 0, cooldown: 0, isAi: true, respawnTime: 0 },
        { id: 3, x: 5, y: 34, champId: 3, hp: 100, angle: 0, cooldown: 0, isAi: true, respawnTime: 0 }
      ]
    };
    setGameState('playing');
    setTimeLeft(GAME_DURATION);
  };

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(render);
      const t = setInterval(() => setTimeLeft(v => {
        if (v <= 1) { setGameState('result'); return 0; }
        return v - 1;
      }), 1000);
      return () => { cancelAnimationFrame(requestRef.current); clearInterval(t); };
    }
  }, [gameState]);

  // --- Mobile Controls ---
  const handleTouch = (e, type, active) => {
    e.preventDefault();
    if (type === 'shoot') engine.current.shootBtn.active = active;
    if (type === 'move') {
      if (!active) { engine.current.joystick.active = false; return; }
      const t = e.touches[0];
      engine.current.joystick = { active: true, ox: t.clientX, oy: t.clientY, x: 0, y: 0 };
    }
  };

  const handleMove = (e) => {
    if (!engine.current.joystick.active) return;
    const t = e.touches[0];
    const dx = t.clientX - engine.current.joystick.ox, dy = t.clientY - engine.current.joystick.oy;
    const d = Math.sqrt(dx*dx+dy*dy) || 1;
    engine.current.joystick.x = dx/d; engine.current.joystick.y = dy/d;
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-white font-sans overflow-hidden touch-none select-none">
      <canvas ref={canvasRef} className="w-full h-full" />

      {gameState === 'lobby' && (
        <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 backdrop-blur-md">
          <h1 className="text-5xl font-black italic mb-8 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600">BRAWL INK</h1>
          <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
            {CHAMPIONS.map(c => (
              <div key={c.id} onClick={() => setSelectedChamp(c.id)} className={`p-4 rounded-2xl border-4 transition-all ${selectedChamp === c.id ? 'border-yellow-400 bg-slate-800 scale-105' : 'border-slate-700 bg-slate-800/40 opacity-60'}`}>
                <c.icon className="mb-2" style={{color: c.color}} />
                <div className="font-black text-sm">{c.name}</div>
                <div className="text-[10px] text-slate-400">{c.role}</div>
              </div>
            ))}
          </div>
          <button onClick={init} className="w-full max-w-xs bg-yellow-400 text-black font-black py-4 rounded-2xl text-xl shadow-[0_5px_0_#b45309] active:translate-y-1 active:shadow-none">START BATTLE</button>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-lg px-6 py-2 rounded-full border border-white/20 flex gap-4 items-center">
            <Timer className="text-yellow-400" size={20}/> <span className="font-black text-2xl font-mono">{timeLeft}</span>
          </div>
          <div className="absolute bottom-12 left-12 w-40 h-40 bg-white/5 rounded-full border border-white/10" onTouchStart={e => handleTouch(e, 'move', true)} onTouchMove={handleMove} onTouchEnd={e => handleTouch(e, 'move', false)}>
            <div className="absolute inset-0 m-auto w-16 h-16 bg-white/20 rounded-full" style={{transform: `translate(${engine.current.joystick.x*40}px, ${engine.current.joystick.y*40}px)`}} />
          </div>
          <div className="absolute bottom-12 right-12 w-28 h-28 bg-rose-600 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform" onTouchStart={e => handleTouch(e, 'shoot', true)} onTouchEnd={e => handleTouch(e, 'shoot', false)}>
            <Zap fill="white" size={40}/>
          </div>
        </>
      )}

      {gameState === 'result' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center animate-in fade-in">
          <Trophy size={80} className="text-yellow-400 mb-4 animate-bounce"/>
          <h2 className="text-4xl font-black mb-8 text-white">BATTLE FINISHED</h2>
          <button onClick={() => setGameState('lobby')} className="bg-white text-black px-10 py-4 rounded-full font-black">BACK TO MENU</button>
        </div>
      )}
    </div>
  );
}
