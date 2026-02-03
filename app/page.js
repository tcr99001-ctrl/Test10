'use client';

import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { Trophy, Timer, Zap, Shield, Crosshair, Hexagon } from 'lucide-react';

// Firebase 설정 (기존 유지)
const firebaseConfig = {
  apiKey: "AIzaSyBPd5xk9UseJf79GTZogckQmKKwwogneco",
  authDomain: "test-4305d.firebaseapp.com",
  projectId: "test-4305d",
  storageBucket: "test-4305d.firebasestorage.app",
  messagingSenderId: "402376205992",
  appId: "1:402376205992:web:be662592fa4d5f0efb849d"
};

let db, auth;
if (!getApps().length) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

const MAP_SIZE = 40;
const GAME_DURATION = 90;
const PAINTABLE_TILES = 1435; // 미리 계산된 페인트 가능한 타일 수 (벽 제외)

const CHAMPIONS = [
  { id: 0, name: 'BULL', role: 'TANK', icon: Shield, hp: 200, speed: 10, color: '#f43f5e', weapon: { cooldown: 0.6, count: 5, spread: 0.4, speed: 15, range: 0.4, damage: 15 } },
  { id: 1, name: 'COLT', role: 'RAPID', icon: Zap, hp: 100, speed: 14, color: '#3b82f6', weapon: { cooldown: 0.15, count: 1, spread: 0.05, speed: 25, range: 0.7, damage: 10 } },
  { id: 2, name: 'PIPER', role: 'SNIPER', icon: Crosshair, hp: 80, speed: 11, color: '#8b5cf6', weapon: { cooldown: 1.5, count: 1, spread: 0.0, speed: 40, range: 1.3, damage: 65 } },
  { id: 3, name: 'DYNAMO', role: 'BLASTER', icon: Hexagon, hp: 120, speed: 9, color: '#f59e0b', weapon: { cooldown: 1.0, count: 1, spread: 0.1, speed: 18, range: 0.8, damage: 45, explode: true } }
];

export default function SupercellFinal() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState('lobby'); 
  const [selectedChamp, setSelectedChamp] = useState(0);
  const [scores, setScores] = useState([0, 0, 0, 0]); // 각 플레이어의 영역 %
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [winner, setWinner] = useState(null);

  const canvasRef = useRef(null);
  const requestRef = useRef();
  const engine = useRef({
    grid: [], walls: [], players: [], bullets: [], lastTime: 0,
    joystick: { active: false, x: 0, y: 0, ox: 0, oy: 0 },
    shootBtn: { active: false },
    keys: {}
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => { if(u) setUser(u); else signInAnonymously(auth); });
    const handleKD = (e) => { engine.current.keys[e.code] = true; };
    const handleKU = (e) => { engine.current.keys[e.code] = false; };
    window.addEventListener('keydown', handleKD);
    window.addEventListener('keyup', handleKU);
    return () => { unsub(); window.removeEventListener('keydown', handleKD); window.removeEventListener('keyup', handleKU); };
  }, []);

  const calculateAreas = () => {
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    engine.current.grid.forEach(row => {
      row.forEach(cell => {
        if (cell >= 0 && cell <= 3) counts[cell]++;
      });
    });
    const totalPainted = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const percentages = [0,1,2,3].map(id => Math.round((counts[id] / PAINTABLE_TILES) * 100));
    setScores(percentages);
  };

  const init = () => {
    const grid = Array.from({length: MAP_SIZE}, (_, y) => 
      Array.from({length: MAP_SIZE}, (_, x) => 
        (x===0 || x===39 || y===0 || y===39 || (x%12===0 && y%12===0)) ? 99 : -1
      )
    );
    const walls = [];
    grid.forEach((row, y) => row.forEach((v, x) => v === 99 && walls.push({x, y})));

    engine.current = {
      ...engine.current, grid, walls, bullets: [], lastTime: performance.now(),
      players: [
        { id: 0, x: 5, y: 5, champId: selectedChamp, hp: CHAMPIONS[selectedChamp].hp, angle: 0, cooldown: 0, isAi: false, respawnTime: 0 },
        { id: 1, x: 34, y: 34, champId: 1, hp: 100, angle: 0, cooldown: 0, isAi: true, respawnTime: 0, moveTimer: 0 },
        { id: 2, x: 34, y: 5, champId: 2, hp: 100, angle: 0, cooldown: 0, isAi: true, respawnTime: 0, moveTimer: 0 },
        { id: 3, x: 5, y: 34, champId: 3, hp: 120, angle: 0, cooldown: 0, isAi: true, respawnTime: 0, moveTimer: 0 }
      ]
    };
    setGameState('playing');
    setTimeLeft(GAME_DURATION);
    setScores([0,0,0,0]);
  };

  const updateLogic = (dt) => {
    const { players, bullets, grid, joystick, keys, shootBtn } = engine.current;
    if (!players[0]) return;

    players.forEach(p => {
      if (p.respawnTime > 0) { p.respawnTime -= dt; return; }
      const stats = CHAMPIONS[p.champId];
      const speed = stats.speed * dt;

      if (!p.isAi) {
        let mx = 0, my = 0;
        if (joystick.active) { mx = joystick.x; my = joystick.y; }
        else {
          if (keys['ArrowLeft'] || keys['KeyA']) mx = -1;
          if (keys['ArrowRight'] || keys['KeyD']) mx = 1;
          if (keys['ArrowUp'] || keys['KeyW']) my = -1;
          if (keys['ArrowDown'] || keys['KeyS']) my = 1;
        }

        if (mx !== 0 || my !== 0) {
          const mag = Math.sqrt(mx*mx + my*my) || 1;
          const moveX = (mx/mag) * speed, moveY = (my/mag) * speed;
          if (grid[Math.floor(p.y)]?.[Math.floor(p.x + moveX)] !== 99) p.x += moveX;
          if (grid[Math.floor(p.y + moveY)]?.[Math.floor(p.x)] !== 99) p.y += moveY;
          p.angle = Math.atan2(my, mx);
        }
        if (shootBtn.active || keys['Space']) fire(p);
      } else {
        p.moveTimer = (p.moveTimer || 0) - dt;
        if (p.moveTimer <= 0) { p.targetA = Math.random()*Math.PI*2; p.moveTimer = 1 + Math.random()*2; }
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
      if (grid[ty]?.[tx] !== undefined && grid[ty][tx] !== 99) grid[ty][tx] = b.ownerId;
    }

    // 영역 퍼센트 업데이트 (매 프레임마다 하긴 부하 but 간단히 0.2초마다)
    if (Math.random() < 0.01) calculateAreas(); // 최적화
  };

  const fire = (p) => {
    if (p.cooldown > 0) return;
    const s = CHAMPIONS[p.champId].weapon;
    for(let i=0; i<s.count; i++) {
      engine.current.bullets.push({
        x: p.x, y: p.y, angle: p.angle + (i - s.count/2 + 0.5)*s.spread,
        speed: s.speed, life: s.range, ownerId: p.id, color: CHAMPIONS[p.champId].color
      });
    }
    p.cooldown = s.cooldown;
  };

  const render = (time) => {
    const canvas = canvasRef.current;
    if (!canvas || gameState !== 'playing') return;
    const ctx = canvas.getContext('2d');
    
    const dt = (time - engine.current.lastTime) / 1000;
    engine.current.lastTime = time;
    if (dt < 0.2) updateLogic(dt);

    const sw = canvas.width = canvas.clientWidth;
    const sh = canvas.height = canvas.clientHeight;
    const { grid, players, bullets, walls } = engine.current;
    const myPlayer = players[0];
    if (!myPlayer) return;

    const scale = Math.min(sw, sh) / 12;
    const camX = sw/2 - myPlayer.x * scale;
    const camY = sh/2 - myPlayer.y * scale;

    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, sw, sh);
    ctx.save(); ctx.translate(camX, camY);

    // 바닥 그리기
    for(let y=0; y<MAP_SIZE; y++) {
      for(let x=0; x<MAP_SIZE; x++) {
        const id = grid[y][x];
        if (id === 99) continue;
        ctx.fillStyle = id === -1 ? '#1e293b' : CHAMPIONS[players[id]?.champId]?.color || '#4b5563';
        ctx.fillRect(x*scale, y*scale, scale+1, scale+1);
      }
    }

    // Y-Sorting 렌더링 (플레이어, 벽 등)
    [...walls.map(w=>({type:'W',x:w.x,y:w.y})), ...players.filter(p=>p.respawnTime<=0).map(p=>({type:'P',x:p.x,y:p.y,data:p}))]
    .sort((a,b)=>a.y-b.y).forEach(e => {
      const px = e.x * scale, py = e.y * scale;
      if (e.type === 'W') {
        const h = scale * 0.7;
        ctx.fillStyle = '#020617'; ctx.fillRect(px, py + scale - h, scale, h);
        ctx.fillStyle = '#475569'; ctx.fillRect(px, py - h, scale, scale);
      } else {
        const p = e.data; const c = CHAMPIONS[p.champId];
        const fy = py + scale/2 - (Math.abs(Math.sin(time/200)*5));
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(px+scale/2, py+scale/2, scale*0.4, scale*0.2, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(px+scale/2, fy, scale*0.4, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px+scale/2, fy);
        ctx.lineTo(px+scale/2 + Math.cos(p.angle)*scale*0.4, fy+Math.sin(p.angle)*scale*0.4); ctx.stroke();
      }
    });

    bullets.forEach(b => {
      ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x*scale, b.y*scale, scale*0.15, 0, Math.PI*2); ctx.fill();
    });

    ctx.restore();

    requestRef.current = requestAnimationFrame(render);
  };

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(render);
      const t = setInterval(() => {
        setTimeLeft(v => {
          if (v <= 1) {
            setGameState('result');
            return 0;
          }
          return v - 1;
        });
      }, 1000);
      return () => { cancelAnimationFrame(requestRef.current); clearInterval(t); };
    }
  }, [gameState]);

  return (
    <div className="fixed inset-0 bg-slate-950 text-white font-sans overflow-hidden touch-none select-none">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Brawl Stars 스타일 상단 영역 그래프 바 */}
      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 right-0 h-14 bg-black/60 backdrop-blur-sm border-b border-white/10 flex items-center justify-center gap-3 px-4 z-40">
          {CHAMPIONS.map((champ, i) => {
            const perc = scores[i];
            return (
              <div key={i} className="flex-1 max-w-[22%] flex items-center gap-2">
                <div className="w-6 h-6 rounded-full" style={{backgroundColor: champ.color}} />
                <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden relative">
                  <div 
                    className="h-full transition-all duration-300"
                    style={{ 
                      width: `${perc}%`, 
                      backgroundColor: champ.color,
                      boxShadow: `0 0 8px ${champ.color}`
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white drop-shadow-md">
                    {perc}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {gameState === 'lobby' && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 z-50">
          <h1 className="text-6xl font-black italic mb-10 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 animate-pulse">BRAWL INK</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-2xl mb-10">
            {CHAMPIONS.map(c => (
              <div 
                key={c.id} 
                onClick={() => setSelectedChamp(c.id)} 
                className={`p-6 rounded-3xl border-4 transition-all cursor-pointer hover:scale-105 ${selectedChamp === c.id ? 'border-yellow-400 bg-gradient-to-b from-slate-800 to-slate-900 shadow-xl shadow-yellow-500/30' : 'border-slate-700 bg-slate-900/50 opacity-70 hover:opacity-90'}`}
              >
                <c.icon className="w-12 h-12 mb-3 mx-auto" style={{color: c.color}} />
                <div className="font-black text-lg text-center">{c.name}</div>
                <div className="text-xs text-center opacity-70 mt-1">{c.role}</div>
              </div>
            ))}
          </div>
          <button onClick={init} className="w-full max-w-sm bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black py-5 rounded-3xl text-2xl shadow-[0_8px_0_#b45309] active:translate-y-1 active:shadow-none transition-all">BATTLE START!</button>
        </div>
      )}

      {gameState === 'playing' && (
        <>
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/60 px-8 py-3 rounded-full font-mono font-black text-3xl border border-white/20 text-yellow-300 shadow-lg">{timeLeft}s</div>
          {/* 모바일 조이스틱 */}
          <div className="absolute bottom-20 left-8 w-44 h-44 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm" 
            onTouchStart={e => {
              e.preventDefault();
              const t = e.touches[0]; 
              engine.current.joystick = {active:true, ox:t.clientX, oy:t.clientY, x:0, y:0};
            }} 
            onTouchMove={e => {
              e.preventDefault();
              if(!engine.current.joystick.active) return;
              const t = e.touches[0]; 
              const dx = t.clientX - engine.current.joystick.ox, dy = t.clientY - engine.current.joystick.oy;
              const d = Math.sqrt(dx*dx + dy*dy) || 1; 
              engine.current.joystick.x = dx/d; 
              engine.current.joystick.y = dy/d;
            }} 
            onTouchEnd={() => { engine.current.joystick.active = false; engine.current.joystick.x = 0; engine.current.joystick.y = 0; }}
          >
            <div className="absolute inset-0 m-auto w-16 h-16 bg-white/20 rounded-full transition-transform duration-75" 
              style={{transform:`translate(${engine.current.joystick.x*50}px, ${engine.current.joystick.y*50}px)`}} 
            />
          </div>
          {/* 슛 버튼 */}
          <div className="absolute bottom-20 right-8 w-28 h-28 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-all border-4 border-rose-300/30" 
            onTouchStart={() => engine.current.shootBtn.active = true} 
            onTouchEnd={() => engine.current.shootBtn.active = false}
          >
            <Zap fill="white" size={44} className="drop-shadow-lg" />
          </div>
        </>
      )}

      {gameState === 'result' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          <Trophy size={120} className="text-yellow-400 mb-6 animate-bounce" />
          <h2 className="text-6xl font-black mb-12 bg-gradient-to-r from-yellow-300 to-orange-500 bg-clip-text text-transparent">FINISH!</h2>
          <div className="text-3xl mb-8">영역 점령률</div>
          <div className="grid grid-cols-4 gap-6 mb-12">
            {scores.map((perc, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-black" style={{color: CHAMPIONS[i].color}}>{perc}%</div>
                <div className="text-xl">{CHAMPIONS[i].name}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setGameState('lobby')} className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-16 py-6 rounded-3xl font-black text-3xl shadow-2xl active:scale-95 transition-all">PLAY AGAIN</button>
        </div>
      )}
    </div>
  );
}
