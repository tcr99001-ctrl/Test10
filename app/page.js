'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trophy, RefreshCw, Timer, Zap, Shield, Bomb } from 'lucide-react';

// ==================================================================
// 게임 설정
// ==================================================================
const MAP_SIZE = 40;
const GAME_DURATION = 90; // 시간 늘림
const WALL = 99; // 벽 코드

// ✨ 네온 컬러 팔레트
const COLORS = [
  { id: 0, hex: '#00ffaa', glow: '#ccffee', name: 'YOU (Shooter)' }, 
  { id: 1, hex: '#ff00aa', glow: '#ffccdd', name: 'BOT (Shotgun)' },
  { id: 2, hex: '#00aaff', glow: '#cceeff', name: 'BOT (Sniper)' },
  { id: 3, hex: '#ffaa00', glow: '#ffeecc', name: 'BOT (Shotgun)' }
];

// 🔫 무기 타입 정의
const WEAPONS = {
  SHOOTER: { cooldown: 0.12, speed: 18, life: 0.7, count: 1, spread: 0.1, damage: 15 },
  SHOTGUN: { cooldown: 0.8, speed: 14, life: 0.4, count: 5, spread: 0.5, damage: 10 },
  SNIPER:  { cooldown: 1.2, speed: 35, life: 1.0, count: 1, spread: 0.01, damage: 40 }
};

export default function SplatoonStrategy() {
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
    items: [], // 아이템 상자
    lastTime: 0,
    itemTimer: 0,
    joystick: { active: false, x: 0, y: 0, originX: 0, originY: 0 },
    shootBtn: { active: false }
  });

  // --- 맵 생성 (대칭형 아레나) ---
  const createMap = () => {
    const grid = [];
    for(let y=0; y<MAP_SIZE; y++) {
      const row = [];
      for(let x=0; x<MAP_SIZE; x++) {
        // 가장자리 벽
        if (x===0 || x===MAP_SIZE-1 || y===0 || y===MAP_SIZE-1) {
          row.push(WALL);
          continue;
        }
        
        // 중앙 십자 벽 (전략적 엄폐물)
        const cx = MAP_SIZE/2, cy = MAP_SIZE/2;
        const dist = Math.sqrt((x-cx)**2 + (y-cy)**2);
        
        // 중앙 기둥 4개
        if ((Math.abs(x-10)<2 && Math.abs(y-10)<2) || 
            (Math.abs(x-30)<2 && Math.abs(y-10)<2) ||
            (Math.abs(x-10)<2 && Math.abs(y-30)<2) ||
            (Math.abs(x-30)<2 && Math.abs(y-30)<2)) {
          row.push(WALL);
          continue;
        }

        // 중앙부 방어벽
        if (dist > 5 && dist < 6) {
           // 중앙으로 들어가는 입구 4개 뚫기
           if (Math.abs(x-cx) > 2 && Math.abs(y-cy) > 2) {
             row.push(WALL);
             continue;
           }
        }

        row.push(-1); // 빈 땅
      }
      grid.push(row);
    }
    return grid;
  };

  const initGame = () => {
    const grid = createMap();

    // 클래스 부여
    const players = [
      { id: 0, x: 5, y: 5, hp: 100, angle: Math.PI/4, type: 'SHOOTER', cooldown: 0, buff: null, isAi: false },
      { id: 1, x: 35, y: 35, hp: 100, angle: -3*Math.PI/4, type: 'SHOTGUN', cooldown: 0, buff: null, isAi: true, moveTimer: 0 },
      { id: 2, x: 35, y: 5, hp: 100, angle: 3*Math.PI/4, type: 'SNIPER', cooldown: 0, buff: null, isAi: true, moveTimer: 0 },
      { id: 3, x: 5, y: 35, hp: 100, angle: -Math.PI/4, type: 'SHOTGUN', cooldown: 0, buff: null, isAi: true, moveTimer: 0 },
    ];

    engine.current = {
      ...engine.current,
      grid, players, bullets: [], items: [],
      lastTime: Date.now(),
      itemTimer: 5 // 5초 뒤 첫 아이템
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

    const { players, bullets, grid, items, joystick, shootBtn } = engine.current;

    // --- 아이템 스폰 로직 ---
    engine.current.itemTimer -= dt;
    if (engine.current.itemTimer <= 0) {
      // 맵 중앙 근처 랜덤 위치
      const ix = 15 + Math.random() * 10;
      const iy = 15 + Math.random() * 10;
      if (grid[Math.floor(iy)][Math.floor(ix)] !== WALL) {
        items.push({ 
          x: ix, y: iy, 
          type: Math.random() > 0.5 ? 'SPEED' : 'BOMB',
          angle: 0 
        });
        engine.current.itemTimer = 10; // 10초마다 생성
      }
    }

    // --- 플레이어 로직 ---
    players.forEach(p => {
      if (p.respawnTime > 0) {
        p.respawnTime -= dt;
        if (p.respawnTime <= 0) {
           // 부활 (원래 위치)
           p.x = p.id === 0 ? 5 : (p.id===1?35:(p.id===2?35:5));
           p.y = p.id === 0 ? 5 : (p.id===1?35:(p.id===2?5:35));
           p.hp = 100;
           p.buff = null;
        }
        return;
      }

      // 버프 시간 감소
      if (p.buffTime > 0) {
        p.buffTime -= dt;
        if (p.buffTime <= 0) p.buff = null;
      }

      // 1. 속도 계산
      const tileX = Math.floor(p.x);
      const tileY = Math.floor(p.y);
      let speedMod = 1.0;
      
      if (tileX >= 0 && tileX < MAP_SIZE && tileY >= 0 && tileY < MAP_SIZE) {
        const tileOwner = grid[tileY][tileX];
        if (tileOwner === p.id) speedMod = 1.3;
        else if (tileOwner !== -1 && tileOwner !== WALL) speedMod = 0.6;
      }
      
      if (p.buff === 'SPEED') speedMod *= 1.8; // 스피드 버프

      const speed = 10 * speedMod * dt;
      let dx = 0, dy = 0;

      // 2. 입력 처리
      if (!p.isAi) {
        if (joystick.active) {
          dx = joystick.x * speed;
          dy = joystick.y * speed;
          p.angle = Math.atan2(joystick.y, joystick.x);
        }
        if (shootBtn.active) fireWeapon(p);
      } else {
        // AI Logic
        p.moveTimer -= dt;
        if (p.moveTimer <= 0) {
          p.targetAngle = Math.random() * Math.PI * 2;
          p.moveTimer = 0.5 + Math.random();
          // 중앙으로 가려는 경향 추가 (아이템 싸움)
          if (Math.random() < 0.3) {
             p.targetAngle = Math.atan2(20 - p.y, 20 - p.x);
          }
        }
        
        // 벽 감지 시 회전
        const frontX = Math.floor(p.x + Math.cos(p.angle)*2);
        const frontY = Math.floor(p.y + Math.sin(p.angle)*2);
        if (grid[frontY]?.[frontX] === WALL) p.targetAngle += Math.PI;

        p.angle += (p.targetAngle - p.angle) * 0.1;
        dx = Math.cos(p.angle) * speed;
        dy = Math.sin(p.angle) * speed;

        // 적이 보이면 발사 (간단 구현)
        fireWeapon(p);
      }
      p.cooldown -= dt;

      // 3. 이동 및 벽 충돌 처리 (중요)
      const nextX = p.x + dx;
      const nextY = p.y + dy;
      
      if (grid[Math.floor(p.y)][Math.floor(nextX)] !== WALL) p.x = nextX;
      if (grid[Math.floor(nextY)][Math.floor(p.x)] !== WALL) p.y = nextY;

      // 4. 아이템 획득 처리
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        const dist = (p.x - item.x)**2 + (p.y - item.y)**2;
        if (dist < 1.5) {
          // 획득 효과
          if (item.type === 'SPEED') {
            p.buff = 'SPEED';
            p.buffTime = 8;
          } else if (item.type === 'BOMB') {
            paintGround(grid, p.x, p.y, p.id, 6); // 대폭발
          }
          items.splice(i, 1);
        }
      }
    });

    // --- 총알 로직 ---
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      b.life -= dt;

      // 벽 충돌 (총알 삭제)
      if (grid[Math.floor(b.y)]?.[Math.floor(b.x)] === WALL) {
        b.life = 0;
        // 벽에도 약간 잉크 묻음 (시각적)
        paintGround(grid, b.x, b.y, b.ownerId, 0.5);
        continue;
      }

      // 땅 칠하기
      paintGround(grid, b.x, b.y, b.ownerId, 1.2);

      // 플레이어 피격
      let hit = false;
      players.forEach(p => {
        if (p.id !== b.ownerId && p.respawnTime <= 0) {
          const dx = p.x - b.x;
          const dy = p.y - b.y;
          if (dx*dx + dy*dy < 1.2) { 
            p.hp -= b.damage;
            hit = true;
            if (p.hp <= 0) p.respawnTime = 4;
          }
        }
      });

      if (hit || b.life <= 0) {
        paintGround(grid, b.x, b.y, b.ownerId, 2.0);
        bullets.splice(i, 1);
      }
    }
    requestRef.current = requestAnimationFrame(render);
  };

  const fireWeapon = (p) => {
    if (p.cooldown > 0) return;

    const stat = WEAPONS[p.type];
    
    // 발사 (산탄도는 Shotgun일때 큼)
    for(let i=0; i<stat.count; i++) {
       const angleOffset = (Math.random() - 0.5) * stat.spread;
       // 샷건은 부채꼴로 일정하게
       const finalAngle = stat.count > 1 
          ? p.angle + (i - Math.floor(stat.count/2)) * 0.2 
          : p.angle + angleOffset;

       engine.current.bullets.push({
         x: p.x, y: p.y,
         angle: finalAngle,
         speed: stat.speed,
         life: stat.life,
         damage: stat.damage,
         ownerId: p.id
       });
    }
    p.cooldown = stat.cooldown;
  };

  const paintGround = (grid, cx, cy, colorId, radius) => {
    const startX = Math.floor(cx - radius);
    const endX = Math.ceil(cx + radius);
    const startY = Math.floor(cy - radius);
    const endY = Math.ceil(cy + radius);

    for(let y=startY; y<=endY; y++) {
      for(let x=startX; x<=endX; x++) {
        if (x>=0 && x<MAP_SIZE && y>=0 && y<MAP_SIZE) {
           if (grid[y][x] === WALL) continue; // 벽은 칠하지 않음
           const dist = (x-cx)**2 + (y-cy)**2;
           if (dist < radius*radius) grid[y][x] = colorId;
        }
      }
    }
  };

  const drawSquid = (ctx, x, y, radius, angle, color) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI/2);
    ctx.shadowColor = color.hex;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color.hex;
    
    // 오징어 몸체
    ctx.beginPath();
    ctx.moveTo(0, -radius * 1.5);
    ctx.bezierCurveTo(radius, -radius, radius, radius/2, radius*0.8, radius);
    ctx.lineTo(0, radius*0.5); // 다리 사이
    ctx.lineTo(-radius*0.8, radius);
    ctx.bezierCurveTo(-radius, radius/2, -radius, -radius, 0, -radius*1.5);
    ctx.fill();

    // 눈
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(0, -radius*0.3, radius*0.3, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(0, -radius*0.3, radius*0.12, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const screenW = canvas.clientWidth;
    const screenH = canvas.clientHeight;
    if (canvas.width !== screenW) { canvas.width = screenW; canvas.height = screenH; }

    const { grid, players, bullets, items } = engine.current;
    
    // Zoom
    const scale = Math.min(screenW / MAP_SIZE, screenH / MAP_SIZE) * 0.95;
    const offsetX = (screenW - MAP_SIZE * scale) / 2;
    const offsetY = (screenH - MAP_SIZE * scale) / 2;

    // 1. 배경
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, screenW, screenH);
    ctx.fillStyle = '#1f2937'; // 바닥
    ctx.fillRect(offsetX, offsetY, MAP_SIZE*scale, MAP_SIZE*scale);

    // 2. 맵 그리기 (잉크 & 벽)
    const currentScores = [0,0,0,0];
    
    for(let y=0; y<MAP_SIZE; y++) {
      for(let x=0; x<MAP_SIZE; x++) {
        const cell = grid[y][x];
        const px = offsetX + x*scale;
        const py = offsetY + y*scale;

        if (cell === WALL) {
          // 벽 (입체감 있는 네온 큐브)
          ctx.fillStyle = '#374151';
          ctx.fillRect(px, py, scale+1, scale+1);
          // 벽 Top Highlight
          ctx.fillStyle = '#4b5563';
          ctx.fillRect(px, py, scale, scale*0.8);
          // 벽 네온 테두리
          ctx.shadowColor = '#000';
          ctx.shadowBlur = 5;
        } else if (cell !== -1) {
          // 잉크
          ctx.fillStyle = COLORS[cell].hex;
          ctx.fillRect(px-0.5, py-0.5, scale+1, scale+1);
          currentScores[cell]++;
        }
        ctx.shadowBlur = 0;
      }
    }
    if (Math.random() < 0.1) setScores(currentScores);

    // 3. 아이템 상자
    items.forEach(item => {
      const ix = offsetX + item.x * scale;
      const iy = offsetY + item.y * scale;
      const pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
      
      ctx.save();
      ctx.translate(ix, iy);
      ctx.scale(pulse, pulse);
      
      ctx.shadowColor = item.type==='SPEED' ? '#fbbf24' : '#ef4444';
      ctx.shadowBlur = 20;
      ctx.fillStyle = item.type==='SPEED' ? '#fbbf24' : '#ef4444'; // Gold or Red
      
      // 상자 모양
      ctx.beginPath();
      ctx.rect(-scale/2, -scale/2, scale, scale);
      ctx.fill();
      
      // 아이콘 텍스트 대신 심볼 (성능상 간단히)
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.fillText(item.type==='SPEED'?'⚡':'💣', 0, 0);
      
      ctx.restore();
    });

    // 4. 총알
    bullets.forEach(b => {
      const bx = offsetX + b.x * scale;
      const by = offsetY + b.y * scale;
      ctx.shadowColor = COLORS[b.ownerId].hex;
      ctx.shadowBlur = 10;
      ctx.fillStyle = COLORS[b.ownerId].glow;
      ctx.beginPath();
      ctx.arc(bx, by, scale/3, 0, Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 5. 플레이어
    players.forEach(p => {
      if (p.respawnTime > 0) return;
      const px = offsetX + p.x * scale;
      const py = offsetY + p.y * scale;
      
      // 버프 효과 (오라)
      if (p.buff) {
        ctx.beginPath();
        ctx.arc(px, py, scale*2, 0, Math.PI*2);
        ctx.strokeStyle = p.buff==='SPEED' ? '#fbbf24' : '#fff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      drawSquid(ctx, px, py, scale*1.2, p.angle, COLORS[p.id]);

      // 무기 표시 (간단히)
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(p.angle);
      ctx.fillStyle = '#fff';
      if (p.type === 'SHOTGUN') ctx.fillRect(0, -2, scale*1.5, 4); // 굵고 짧음
      else if (p.type === 'SNIPER') ctx.fillRect(0, -1, scale*2.2, 2); // 얇고 김
      ctx.restore();

      // HP Bar
      const hpW = scale * 3;
      ctx.fillStyle = '#00000080';
      ctx.fillRect(px - hpW/2, py - scale * 2, hpW, 4);
      ctx.fillStyle = p.id === 0 ? '#10b981' : '#f43f5e';
      ctx.fillRect(px - hpW/2, py - scale * 2, hpW * (p.hp/100), 4);
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
    if (gameState === 'playing') requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameState]);


  // Touch Handling (유지)
  const handleTouchStart = (e, type) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (type === 'move') {
      engine.current.joystick.active = true;
      engine.current.joystick.originX = touch.clientX;
      engine.current.joystick.originY = touch.clientY;
      engine.current.joystick.x = 0; engine.current.joystick.y = 0;
    } else if (type === 'shoot') engine.current.shootBtn.active = true;
  };
  const handleTouchMove = (e, type) => {
    e.preventDefault();
    if (type === 'move' && engine.current.joystick.active) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - engine.current.joystick.originX;
      const dy = touch.clientY - engine.current.joystick.originY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const maxDist = 50;
      if (dist > maxDist) { engine.current.joystick.x = dx/dist; engine.current.joystick.y = dy/dist; }
      else { engine.current.joystick.x = dx/maxDist; engine.current.joystick.y = dy/maxDist; }
    }
  };
  const handleTouchEnd = (e, type) => {
    e.preventDefault();
    if (type === 'move') { engine.current.joystick.active = false; engine.current.joystick.x = 0; engine.current.joystick.y = 0; }
    else if (type === 'shoot') engine.current.shootBtn.active = false;
  };

  return (
    <div className="w-full h-screen bg-[#111827] overflow-hidden relative select-none touch-none text-white font-sans">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-4 pointer-events-none z-10">
        <div className="flex justify-between items-center mb-4 max-w-2xl mx-auto">
           <div className="flex gap-1 w-full h-8 rounded-full overflow-hidden bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
             {scores.map((score, i) => (
               <div key={i} style={{ flex: score === 0 ? 0.01 : score, background: COLORS[i].hex, transition: 'flex 0.5s' }} />
             ))}
           </div>
        </div>
        <div className="flex justify-center">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full font-black text-2xl flex items-center gap-2 shadow-2xl">
             <Timer size={24} className="text-emerald-400"/> {timeLeft}
          </div>
        </div>
      </div>

      {gameState === 'playing' && (
        <>
          <div className="absolute top-20 left-4 bg-black/50 p-3 rounded-lg backdrop-blur-sm pointer-events-none">
             <h3 className="text-xs text-gray-400 font-bold mb-1">YOUR CLASS</h3>
             <div className="flex items-center gap-2 text-emerald-400 font-black">
               <Zap size={16}/> SHOOTER
             </div>
          </div>

          <div 
            className="absolute bottom-12 left-12 w-48 h-48 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
            onTouchStart={e => handleTouchStart(e, 'move')} onTouchMove={e => handleTouchMove(e, 'move')} onTouchEnd={e => handleTouchEnd(e, 'move')}
          >
            <div className="w-20 h-20 bg-emerald-400/80 rounded-full shadow-[0_0_20px_#34d399]" style={{ transform: `translate(${engine.current.joystick.x * 60}px, ${engine.current.joystick.y * 60}px)` }} />
          </div>

          <div 
            className="absolute bottom-12 right-12 w-32 h-32 rounded-full bg-rose-500 shadow-[0_0_30px_#f43f5e] active:scale-95 transition-all flex items-center justify-center"
            onTouchStart={e => handleTouchStart(e, 'shoot')} onTouchEnd={e => handleTouchEnd(e, 'shoot')}
          >
            <Zap size={40} className="text-white"/>
          </div>
        </>
      )}

      {/* Lobby */}
      {gameState === 'lobby' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 z-50 backdrop-blur-sm">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-cyan-500 mb-2 italic">NEON ARENA</h1>
          <p className="text-gray-400 mb-8 text-lg">전략적인 전투와 아이템 싸움!</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8 w-full max-w-sm">
             <div className="bg-gray-800 p-3 rounded-xl border border-gray-700">
               <Shield size={20} className="text-emerald-400 mb-1"/>
               <div className="font-bold text-sm">벽을 이용하세요</div>
               <div className="text-xs text-gray-500">엄폐물 뒤에 숨어 기습</div>
             </div>
             <div className="bg-gray-800 p-3 rounded-xl border border-gray-700">
               <Bomb size={20} className="text-rose-400 mb-1"/>
               <div className="font-bold text-sm">중앙 아이템</div>
               <div className="text-xs text-gray-500">스피드업 & 폭탄 획득</div>
             </div>
          </div>

          <button onClick={initGame} className="w-full max-w-sm bg-white text-black font-black py-5 rounded-2xl text-xl hover:scale-105 active:scale-95 transition-all">
            BATTLE START
          </button>
        </div>
      )}

      {/* Result */}
      {gameState === 'result' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 z-50">
          <Trophy size={80} className="text-yellow-400 mb-6 animate-bounce" />
          <h2 className="text-5xl font-black text-white mb-2">GAME OVER</h2>
          <p className="text-gray-400 mb-8 font-bold">Winner is {COLORS[winner].name}!</p>
          
          <div className="w-full max-w-md space-y-3 mb-10">
            {scores.map((score, i) => {
              const total = scores.reduce((a,b)=>a+b, 0);
              const percent = total > 0 ? Math.round((score/total)*100) : 0;
              return (
                <div key={i} className={`flex items-center justify-between p-4 rounded-xl border border-white/5 ${winner===i ? 'bg-white/10 border-white/20':''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5 rounded-full" style={{background: COLORS[i].hex}}></div>
                    <span className="font-bold text-lg">{COLORS[i].name}</span>
                  </div>
                  <span className="font-mono font-bold text-2xl">{percent}%</span>
                </div>
              )
            })}
          </div>

          <button onClick={initGame} className="bg-white/10 border border-white/20 hover:bg-white/20 text-white px-10 py-4 rounded-full font-black text-lg flex items-center gap-3 transition-all">
            <RefreshCw size={24}/> RESTART
          </button>
        </div>
      )}
    </div>
  );
}
