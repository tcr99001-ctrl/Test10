'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trophy, RefreshCw, Timer, Zap } from 'lucide-react';

// ==================================================================
// 현대적 게임 설정 (Modern Config)
// ==================================================================
const MAP_SIZE = 40;
const GAME_DURATION = 60;

// ✨ 네온 컬러 팔레트 (Glow 효과용)
const COLORS = [
  { id: 0, hex: '#00ffaa', glow: '#ccffee', name: 'NEON MINT (YOU)' }, 
  { id: 1, hex: '#ff00aa', glow: '#ffccdd', name: 'HOT PINK' },
  { id: 2, hex: '#00aaff', glow: '#cceeff', name: 'CYAN BLUE' },
  { id: 3, hex: '#ffaa00', glow: '#ffeecc', name: 'VIVID ORANGE' }
];

export default function SplatoonModern() {
  const canvasRef = useRef(null);
  const requestRef = useRef();
  
  const [gameState, setGameState] = useState('lobby');
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [winner, setWinner] = useState(null);

  const engine = useRef({
    grid: [], 
    players: [],
    bullets: [],
    lastTime: 0,
    joystick: { active: false, x: 0, y: 0, originX: 0, originY: 0 },
    shootBtn: { active: false }
  });

  const initGame = () => {
    const grid = [];
    for(let y=0; y<MAP_SIZE; y++) {
      const row = [];
      for(let x=0; x<MAP_SIZE; x++) row.push(-1);
      grid.push(row);
    }

    const players = [
      { id: 0, x: 5, y: 5, hp: 100, angle: 0, cooldown: 0, isAi: false },
      { id: 1, x: 35, y: 35, hp: 100, angle: Math.PI, cooldown: 0, isAi: true, moveTimer: 0 },
      { id: 2, x: 35, y: 5, hp: 100, angle: Math.PI/2, cooldown: 0, isAi: true, moveTimer: 0 },
      { id: 3, x: 5, y: 35, hp: 100, angle: -Math.PI/2, cooldown: 0, isAi: true, moveTimer: 0 },
    ];

    engine.current = {
      ...engine.current,
      grid, players, bullets: [],
      lastTime: Date.now()
    };

    setScores([0,0,0,0]);
    setTimeLeft(GAME_DURATION);
    setGameState('playing');
  };

  const update = () => {
    if (gameState !== 'playing') return;

    const now = Date.now();
    const dt = (now - engine.current.lastTime) / 1000;
    engine.current.lastTime = now;

    const { players, bullets, grid, joystick, shootBtn } = engine.current;

    // 플레이어 로직
    players.forEach(p => {
      if (p.respawnTime > 0) {
        p.respawnTime -= dt;
        if (p.respawnTime <= 0) {
           p.x = p.id === 0 ? 5 : (p.id===1?35:(p.id===2?35:5));
           p.y = p.id === 0 ? 5 : (p.id===1?35:(p.id===2?5:35));
           p.hp = 100;
        }
        return;
      }

      // 속도 계산 (내 땅 버프)
      const tileX = Math.floor(p.x);
      const tileY = Math.floor(p.y);
      let speedMod = 1.0;
      if (tileX >= 0 && tileX < MAP_SIZE && tileY >= 0 && tileY < MAP_SIZE) {
        const tileOwner = grid[tileY][tileX];
        if (tileOwner === p.id) speedMod = 1.5; // 더 빠르게
        else if (tileOwner !== -1) speedMod = 0.5; // 더 느리게
      }
      const speed = 12 * speedMod * dt;

      if (!p.isAi) {
        if (joystick.active) {
          p.x += joystick.x * speed;
          p.y += joystick.y * speed;
          p.angle = Math.atan2(joystick.y, joystick.x);
        }
        if (shootBtn.active && p.cooldown <= 0) {
          fireBullet(p);
          p.cooldown = 0.12; 
        }
      } else {
        // AI Logic
        p.moveTimer -= dt;
        if (p.moveTimer <= 0) {
          p.targetAngle = Math.random() * Math.PI * 2;
          p.moveTimer = 0.5 + Math.random();
        }
        if (p.x < 2 || p.x > MAP_SIZE-2 || p.y < 2 || p.y > MAP_SIZE-2) p.targetAngle += Math.PI;
        
        p.angle = p.angle + (p.targetAngle - p.angle) * 0.1;
        p.x += Math.cos(p.angle) * speed;
        p.y += Math.sin(p.angle) * speed;

        if (p.cooldown <= 0) {
          fireBullet(p);
          p.cooldown = 0.2 + Math.random() * 0.3;
        }
      }
      p.cooldown -= dt;
      p.x = Math.max(0, Math.min(MAP_SIZE, p.x));
      p.y = Math.max(0, Math.min(MAP_SIZE, p.y));
    });

    // 총알 로직
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      b.life -= dt;

      // 잉크 칠하기 (원형으로 부드럽게)
      paintGround(grid, b.x, b.y, b.ownerId, 1.5);

      let hit = false;
      players.forEach(p => {
        if (p.id !== b.ownerId && p.respawnTime <= 0) {
          const dx = p.x - b.x;
          const dy = p.y - b.y;
          if (dx*dx + dy*dy < 1.5) { 
            p.hp -= 15;
            hit = true;
            if (p.hp <= 0) p.respawnTime = 3;
          }
        }
      });

      if (hit || b.life <= 0 || b.x < 0 || b.x > MAP_SIZE || b.y < 0 || b.y > MAP_SIZE) {
        paintGround(grid, b.x, b.y, b.ownerId, 2.5); // 폭발 잉크
        bullets.splice(i, 1);
      }
    }
    requestRef.current = requestAnimationFrame(render);
  };

  const fireBullet = (p) => {
    engine.current.bullets.push({
      x: p.x, y: p.y,
      angle: p.angle + (Math.random() - 0.5) * 0.2,
      speed: 18,
      life: 0.7,
      ownerId: p.id
    });
  };

  const paintGround = (grid, cx, cy, colorId, radius) => {
    const startX = Math.floor(cx - radius);
    const endX = Math.ceil(cx + radius);
    const startY = Math.floor(cy - radius);
    const endY = Math.ceil(cy + radius);

    for(let y=startY; y<=endY; y++) {
      for(let x=startX; x<=endX; x++) {
        if (x>=0 && x<MAP_SIZE && y>=0 && y<MAP_SIZE) {
           // 원형 판정
           const dx = x - cx;
           const dy = y - cy;
           if (dx*dx + dy*dy < radius*radius) {
              grid[y][x] = colorId;
           }
        }
      }
    }
  };

  // --- 🖌️ 현대적 렌더링 (핵심) ---
  const drawSquid = (ctx, x, y, radius, angle, color) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI/2); // 캔버스 기준 보정
    
    // 그림자 (Glow)
    ctx.shadowColor = color.hex;
    ctx.shadowBlur = 15;

    // 몸통 (오징어 모양)
    ctx.fillStyle = color.hex;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 1.5); // 머리 끝
    ctx.bezierCurveTo(radius, -radius, radius, radius/2, radius*0.8, radius); // 우측 곡선
    // 다리 (Tentacles)
    ctx.lineTo(radius*0.5, radius*1.5);
    ctx.lineTo(0, radius*0.8);
    ctx.lineTo(-radius*0.5, radius*1.5);
    ctx.lineTo(-radius*0.8, radius);
    ctx.bezierCurveTo(-radius, radius/2, -radius, -radius, 0, -radius*1.5); // 좌측 곡선
    ctx.fill();

    // 눈 (흰자)
    ctx.shadowBlur = 0; // 눈에는 광채 제거
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(-radius*0.3, -radius*0.2, radius*0.25, radius*0.35, 0, 0, Math.PI*2);
    ctx.ellipse(radius*0.3, -radius*0.2, radius*0.25, radius*0.35, 0, 0, Math.PI*2);
    ctx.fill();

    // 눈동자 (검은자)
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(-radius*0.3, -radius*0.2, radius*0.1, 0, Math.PI*2);
    ctx.arc(radius*0.3, -radius*0.2, radius*0.1, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const screenW = canvas.clientWidth;
    const screenH = canvas.clientHeight;
    if (canvas.width !== screenW || canvas.height !== screenH) {
      canvas.width = screenW;
      canvas.height = screenH;
    }

    const { grid, players, bullets } = engine.current;
    
    // Zoom & Pan
    const scale = Math.min(screenW / MAP_SIZE, screenH / MAP_SIZE) * 0.95;
    const offsetX = (screenW - MAP_SIZE * scale) / 2;
    const offsetY = (screenH - MAP_SIZE * scale) / 2;

    // 1. 배경 (Dark Modern)
    ctx.fillStyle = '#111827'; // Dark Slate
    ctx.fillRect(0, 0, screenW, screenH);
    
    // 맵 바닥
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(offsetX, offsetY, MAP_SIZE*scale, MAP_SIZE*scale);
    
    // 그리드 라인 (은은하게)
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<=MAP_SIZE; i++) {
        ctx.moveTo(offsetX + i*scale, offsetY);
        ctx.lineTo(offsetX + i*scale, offsetY + MAP_SIZE*scale);
        ctx.moveTo(offsetX, offsetY + i*scale);
        ctx.lineTo(offsetX + MAP_SIZE*scale, offsetY + i*scale);
    }
    ctx.stroke();

    // 2. 잉크 (Liquid Splat Effect)
    // 픽셀 하나하나 그리는 대신, 잉크 덩어리처럼 보이게 그림
    // (성능을 위해 픽셀 렌더링 유지하되, 약간 겹치게 그려서 부드럽게 처리)
    const currentScores = [0,0,0,0];
    
    for(let y=0; y<MAP_SIZE; y++) {
      for(let x=0; x<MAP_SIZE; x++) {
        const owner = grid[y][x];
        if (owner !== -1) {
          ctx.fillStyle = COLORS[owner].hex;
          // 약간 겹치게 그려서 부드러운 잉크 느낌 (scale + 1)
          ctx.fillRect(offsetX + x*scale - 0.5, offsetY + y*scale - 0.5, scale + 1, scale + 1);
          currentScores[owner]++;
        }
      }
    }
    if (Math.random() < 0.05) setScores(currentScores);

    // 3. 총알 (Glowing Projectiles)
    bullets.forEach(b => {
      const bx = offsetX + b.x * scale;
      const by = offsetY + b.y * scale;
      
      ctx.shadowColor = COLORS[b.ownerId].hex;
      ctx.shadowBlur = 10;
      ctx.fillStyle = COLORS[b.ownerId].glow;
      
      ctx.beginPath();
      ctx.arc(bx, by, scale/2.5, 0, Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0; // Reset
    });

    // 4. 캐릭터 (Vector Squid)
    players.forEach(p => {
      if (p.respawnTime > 0) return;
      const px = offsetX + p.x * scale;
      const py = offsetY + p.y * scale;
      const radius = scale * 1.2; // 캐릭터 크기 키움

      drawSquid(ctx, px, py, radius, p.angle, COLORS[p.id]);

      // HP Bar (Modern)
      const hpW = radius * 2.5;
      const hpH = 6;
      ctx.fillStyle = '#00000080';
      ctx.fillRect(px - hpW/2, py - radius * 1.8, hpW, hpH);
      ctx.fillStyle = p.id === 0 ? '#10b981' : '#f43f5e';
      ctx.fillRect(px - hpW/2 + 1, py - radius * 1.8 + 1, (hpW-2) * (p.hp/100), hpH-2);
    });

    update();
  };

  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('result');
            const maxScore = Math.max(...scores);
            setWinner(scores.indexOf(maxScore));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameState, scores]);

  useEffect(() => {
    if (gameState === 'playing') {
       requestRef.current = requestAnimationFrame(render);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState]);


  // Touch Handling (동일)
  const handleTouchStart = (e, type) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (type === 'move') {
      engine.current.joystick.active = true;
      engine.current.joystick.originX = touch.clientX;
      engine.current.joystick.originY = touch.clientY;
      engine.current.joystick.x = 0;
      engine.current.joystick.y = 0;
    } else if (type === 'shoot') {
      engine.current.shootBtn.active = true;
    }
  };

  const handleTouchMove = (e, type) => {
    e.preventDefault();
    if (type === 'move' && engine.current.joystick.active) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - engine.current.joystick.originX;
      const dy = touch.clientY - engine.current.joystick.originY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const maxDist = 50;
      if (dist > maxDist) {
        engine.current.joystick.x = (dx / dist);
        engine.current.joystick.y = (dy / dist);
      } else {
        engine.current.joystick.x = dx / maxDist;
        engine.current.joystick.y = dy / maxDist;
      }
    }
  };

  const handleTouchEnd = (e, type) => {
    e.preventDefault();
    if (type === 'move') {
      engine.current.joystick.active = false;
      engine.current.joystick.x = 0;
      engine.current.joystick.y = 0;
    } else if (type === 'shoot') {
      engine.current.shootBtn.active = false;
    }
  };

  return (
    <div className="w-full h-screen bg-[#111827] overflow-hidden relative select-none touch-none text-white font-sans">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* UI Overlay (Glassmorphism) */}
      <div className="absolute top-0 left-0 w-full p-4 pointer-events-none z-10">
        <div className="flex justify-between items-center mb-4 max-w-2xl mx-auto">
           <div className="flex gap-1 w-full h-8 rounded-full overflow-hidden bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
             {scores.map((score, i) => (
               <div key={i} style={{
                 flex: score === 0 ? 0.01 : score, 
                 background: COLORS[i].hex,
                 boxShadow: `0 0 15px ${COLORS[i].hex}`,
                 transition: 'flex 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
               }} />
             ))}
           </div>
        </div>
        <div className="flex justify-center">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full font-black text-2xl flex items-center gap-2 shadow-2xl">
             <Timer size={24} className={timeLeft < 10 ? "text-rose-500 animate-bounce" : "text-emerald-400"}/> 
             <span className="tracking-widest">{timeLeft}</span>
          </div>
        </div>
      </div>

      {gameState === 'playing' && (
        <>
          {/* Virtual Joystick (Modern) */}
          <div 
            className="absolute bottom-12 left-12 w-48 h-48 rounded-full flex items-center justify-center border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm shadow-2xl"
            onTouchStart={e => handleTouchStart(e, 'move')}
            onTouchMove={e => handleTouchMove(e, 'move')}
            onTouchEnd={e => handleTouchEnd(e, 'move')}
          >
            <div className="w-20 h-20 bg-emerald-400/80 rounded-full shadow-[0_0_20px_#34d399] transition-transform duration-75"
                 style={{ 
                   transform: `translate(${engine.current.joystick.x * 60}px, ${engine.current.joystick.y * 60}px)` 
                 }} 
            />
          </div>

          {/* Fire Button (Modern) */}
          <div 
            className="absolute bottom-12 right-12 w-32 h-32 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 shadow-[0_0_30px_#f43f5e] border-4 border-white/20 active:scale-95 transition-all flex items-center justify-center"
            onTouchStart={e => handleTouchStart(e, 'shoot')}
            onTouchEnd={e => handleTouchEnd(e, 'shoot')}
          >
            <Zap size={40} className="text-white drop-shadow-md" fill="white"/>
          </div>
        </>
      )}

      {/* Lobby */}
      {gameState === 'lobby' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 z-50 backdrop-blur-sm">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-cyan-500 mb-4 tracking-tight drop-shadow-2xl italic">
            NEON SPLAT
          </h1>
          <p className="text-gray-400 mb-10 text-lg font-medium">Capture the turf with neon ink!</p>
          <button onClick={initGame} className="w-full max-w-sm bg-white text-black font-black py-5 rounded-2xl text-xl shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all">
            START BATTLE
          </button>
        </div>
      )}

      {/* Result */}
      {gameState === 'result' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 z-50 animate-in fade-in zoom-in-95 backdrop-blur-md">
          <Trophy size={80} className="text-yellow-400 mb-6 drop-shadow-[0_0_30px_#fbbf24] animate-bounce" />
          <h2 className="text-5xl font-black text-white mb-8">FINISH!</h2>
          
          <div className="w-full max-w-md space-y-3 mb-10">
            {scores.map((score, i) => {
              const total = scores.reduce((a,b)=>a+b, 0);
              const percent = total > 0 ? Math.round((score/total)*100) : 0;
              return (
                <div key={i} className={`flex items-center justify-between p-4 rounded-xl border border-white/5 ${winner===i ? 'bg-white/10 shadow-lg scale-105 border-white/20':''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full shadow-lg" style={{background: COLORS[i].hex, boxShadow: `0 0 10px ${COLORS[i].hex}`}}></div>
                    <span className={`font-bold text-lg ${i===0?'text-white':'text-gray-400'}`}>{COLORS[i].name}</span>
                  </div>
                  <span className="font-mono font-bold text-2xl">{percent}%</span>
                </div>
              )
            })}
          </div>

          <button onClick={initGame} className="bg-white/10 border border-white/20 hover:bg-white/20 text-white px-10 py-4 rounded-full font-black text-lg flex items-center gap-3 transition-all">
            <RefreshCw size={24}/> PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}
