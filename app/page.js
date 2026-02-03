'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Timer, Zap, Shield, Crosshair, Hexagon } from 'lucide-react';

const MAP_SIZE = 40;
const GAME_DURATION = 120; // LoL처럼 빌드업 위해 120초
const PAINTABLE_TILES = 1435; // 벽 제외
const RESPAWN_TIME = 3;
const SUPER_CHARGE_KILLS = 3;

const CHAMPIONS = [
  { id: 0, name: 'BULL', role: 'TANK', icon: Shield, baseHp: 200, baseSpeed: 10, baseDamage: 15, color: '#f43f5e', weapon: { cooldown: 0.6, count: 5, spread: 0.4, speed: 15, range: 0.4 } },
  { id: 1, name: 'COLT', role: 'RAPID', icon: Zap, baseHp: 100, baseSpeed: 14, baseDamage: 10, color: '#3b82f6', weapon: { cooldown: 0.15, count: 1, spread: 0.05, speed: 25, range: 0.7 } },
  { id: 2, name: 'PIPER', role: 'SNIPER', icon: Crosshair, baseHp: 80, baseSpeed: 11, baseDamage: 65, color: '#8b5cf6', weapon: { cooldown: 1.5, count: 1, spread: 0.0, speed: 40, range: 1.3 } },
  { id: 3, name: 'DYNAMO', role: 'BLASTER', icon: Hexagon, baseHp: 120, baseSpeed: 9, baseDamage: 45, color: '#f59e0b', weapon: { cooldown: 1.0, count: 1, spread: 0.1, speed: 18, range: 0.8, explode: true } }
];

export default function BrawlInk() {
  const [gameState, setGameState] = useState('lobby');
  const [selectedChamp, setSelectedChamp] = useState(0);
  const [scores, setScores] = useState([0, 0, 0, 0]); // 영역 %
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [winner, setWinner] = useState(null);
  const [killFeed, setKillFeed] = useState([]);

  const canvasRef = useRef(null);
  const requestRef = useRef();
  const engine = useRef({
    grid: [], walls: [], players: [], bullets: [], powerBalls: [], powerUps: [], lastTime: 0,
    joystick: { active: false, x: 0, y: 0, ox: 0, oy: 0 },
    shootBtn: { active: false },
    keys: {}
  });

  useEffect(() => {
    const handleKD = (e) => { engine.current.keys[e.code] = true; };
    const handleKU = (e) => { engine.current.keys[e.code] = false; };
    window.addEventListener('keydown', handleKD);
    window.addEventListener('keyup', handleKU);
    return () => {
      window.removeEventListener('keydown', handleKD);
      window.removeEventListener('keyup', handleKU);
    };
  }, []);

  const calculateAreas = () => {
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    engine.current.grid.forEach(row => row.forEach(cell => { if (cell >= 0 && cell <= 3) counts[cell]++; }));
    const percentages = [0,1,2,3].map(id => Math.round((counts[id] / PAINTABLE_TILES) * 100));
    setScores(percentages);
  };

  const addKillFeed = (killerId, victimId) => {
    const killerName = CHAMPIONS[engine.current.players[killerId].champId].name;
    const victimName = CHAMPIONS[engine.current.players[victimId].champId].name;
    setKillFeed(prev => [{ text: `${killerName} killed ${victimName}!`, color: CHAMPIONS[engine.current.players[killerId].champId].color }, ...prev.slice(0, 4)]);
  };

  const init = () => {
    const grid = Array.from({length: MAP_SIZE}, (_, y) => 
      Array.from({length: MAP_SIZE}, (_, x) => 
        (x===0 || x===39 || y===0 || y===39 || (x%12===0 && y%12===0)) ? 99 : -1
      )
    );
    const walls = [];
    grid.forEach((row, y) => row.forEach((v, x) => { if (v === 99) walls.push({x, y}); }));

    const players = [
      { id: 0, x: 5, y: 5, champId: selectedChamp, hp: CHAMPIONS[selectedChamp].baseHp, maxHp: CHAMPIONS[selectedChamp].baseHp, 
        speed: CHAMPIONS[selectedChamp].baseSpeed, damage: CHAMPIONS[selectedChamp].baseDamage, angle: 0, cooldown: 0, 
        isAi: false, respawnTime: 0, streak: 0, level: 1, superReady: false, hasBall: false, paintCount: 0 },
      { id: 1, x: 34, y: 34, champId: 1, hp: 100, maxHp: 100, speed: 14, damage: 10, angle: 0, cooldown: 0, 
        isAi: true, respawnTime: 0, streak: 0, level: 1, superReady: false, hasBall: false, paintCount: 0, moveTimer: 0 },
      { id: 2, x: 34, y: 5, champId: 2, hp: 80, maxHp: 80, speed: 11, damage: 65, angle: 0, cooldown: 0, 
        isAi: true, respawnTime: 0, streak: 0, level: 1, superReady: false, hasBall: false, paintCount: 0, moveTimer: 0 },
      { id: 3, x: 5, y: 34, champId: 3, hp: 120, maxHp: 120, speed: 9, damage: 45, angle: 0, cooldown: 0, 
        isAi: true, respawnTime: 0, streak: 0, level: 1, superReady: false, hasBall: false, paintCount: 0, moveTimer: 0 }
    ];

    engine.current = {
      grid, walls, bullets: [], powerBalls: [{x: 20, y: 20, active: true}], powerUps: [], lastTime: performance.now(),
      players, joystick: { active: false, x: 0, y: 0, ox: 0, oy: 0 }, shootBtn: { active: false }, keys: {}
    };
    setGameState('playing');
    setTimeLeft(GAME_DURATION);
    setScores([0,0,0,0]);
    setKillFeed([]);
    setWinner(null);
  };

  const spawnPowerUp = () => {
    const types = ['speed', 'damage', 'shield'];
    const type = types[Math.floor(Math.random()*types.length)];
    const x = Math.floor(Math.random() * (MAP_SIZE-2)) + 1;
    const y = Math.floor(Math.random() * (MAP_SIZE-2)) + 1;
    if (engine.current.grid[y][x] !== 99) {
      engine.current.powerUps.push({x, y, type, time: 10});
    }
  };

  const updateLogic = (dt) => {
    const { players, bullets, grid, powerBalls, powerUps } = engine.current;
    if (!players[0]) return;

    // Power-up 스폰 (20초마다)
    if (Math.random() < dt / 20) spawnPowerUp();

    players.forEach(p => {
      if (p.respawnTime > 0) { p.respawnTime -= dt; if (p.respawnTime <= 0) { p.hp = p.maxHp; p.x = Math.random()*MAP_SIZE; p.y = Math.random()*MAP_SIZE; p.hasBall = false; } return; }

      // Level up 체크
      if (p.paintCount / PAINTABLE_TILES > 0.2 * p.level && p.level < 3) {
        p.level++;
        p.damage *= 1.2;
        p.speed *= 1.15;
        p.maxHp *= 1.1;
        p.hp = p.maxHp;
      }

      // Sudden Death (마지막 10초)
      const isFrenzy = timeLeft <= 10;
      const currentSpeed = p.speed * (isFrenzy ? 2 : 1) * (p.powerUps?.speed || 1);
      const speedDt = currentSpeed * dt;

      // 이동
      let mx = 0, my = 0;
      if (!p.isAi) {
        if (engine.current.joystick.active) { mx = engine.current.joystick.x; my = engine.current.joystick.y; }
        else {
          if (engine.current.keys['ArrowLeft'] || engine.current.keys['KeyA']) mx -= 1;
          if (engine.current.keys['ArrowRight'] || engine.current.keys['KeyD']) mx += 1;
          if (engine.current.keys['ArrowUp'] || engine.current.keys['KeyW']) my -= 1;
          if (engine.current.keys['ArrowDown'] || engine.current.keys['KeyS']) my += 1;
        }
        if (mx || my) {
          const mag = Math.hypot(mx, my) || 1;
          const moveX = (mx/mag) * speedDt, moveY = (my/mag) * speedDt;
          if (grid[Math.floor(p.y)][Math.floor(p.x + moveX)] !== 99) p.x += moveX;
          if (grid[Math.floor(p.y + moveY)][Math.floor(p.x)] !== 99) p.y += moveY;
          p.angle = Math.atan2(my, mx);
        }
        if (engine.current.shootBtn.active || engine.current.keys['Space']) fire(p);
      } else {
        // AI 개선: 가까운 적 추적 or paint
        p.moveTimer = (p.moveTimer || 0) - dt;
        if (p.moveTimer <= 0) {
          const target = players.filter(t => t.id !== p.id && t.respawnTime <= 0).sort((a,b) => Math.hypot(a.x-p.x, a.y-p.y) - Math.hypot(b.x-p.x, b.y-p.y))[0];
          if (target) {
            p.targetA = Math.atan2(target.y - p.y, target.x - p.x);
          } else {
            p.targetA = Math.random() * Math.PI * 2;
          }
          p.moveTimer = 1 + Math.random();
        }
        p.angle += (p.targetA - p.angle) * 0.1;
        const nx = p.x + Math.cos(p.angle) * speedDt;
        const ny = p.y + Math.sin(p.angle) * speedDt;
        if (grid[Math.floor(ny)]?.[Math.floor(nx)] !== 99) { p.x = nx; p.y = ny; } else { p.targetA += Math.PI; }
        fire(p);
      }

      // Paint Ball 픽업 & trail
      powerBalls.forEach((ball, i) => {
        if (ball.active && Math.hypot(p.x - ball.x, p.y - ball.y) < 0.6) {
          p.hasBall = true;
          ball.active = false;
          setTimeout(() => { ball.active = true; ball.x = 20; ball.y = 20; }, 15000);
        }
      });
      if (p.hasBall) {
        // trail paint (간단히 현재 위치 paint)
        const tx = Math.floor(p.x), ty = Math.floor(p.y);
        if (grid[ty]?.[tx] !== 99) grid[ty][tx] = p.id;
        p.paintCount++;
      }

      p.cooldown -= dt;
    });

    // Bullet 업데이트
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      b.life -= dt;
      const tx = Math.floor(b.x), ty = Math.floor(b.y);
      if (grid[ty]?.[tx] === 99 || b.life <= 0) { bullets.splice(i, 1); continue; }

      // 플레이어 히트
      players.forEach(p => {
        if (p.id !== b.ownerId && p.respawnTime <= 0 && Math.hypot(b.x - p.x, b.y - p.y) < 0.5) {
          p.hp -= players[b.ownerId].damage;
          if (p.hp <= 0) {
            players[b.ownerId].streak++;
            players[b.ownerId].paintCount += 10 + players[b.ownerId].streak * 5;
            if (players[b.ownerId].streak >= SUPER_CHARGE_KILLS) players[b.ownerId].superReady = true;
            addKillFeed(b.ownerId, p.id);
            p.streak = 0;
            p.respawnTime = RESPAWN_TIME;
            p.hasBall = false;
          }
          bullets.splice(i, 1);
        }
      });

      // 영역 paint
      if (grid[ty]?.[tx] !== undefined && grid[ty][tx] !== 99) {
        grid[ty][tx] = b.ownerId;
        players[b.ownerId].paintCount++;
      }
    }

    // Power-up 픽업
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const pu = powerUps[i];
      pu.time -= dt;
      if (pu.time <= 0) { powerUps.splice(i, 1); continue; }
      players.forEach(p => {
        if (Math.hypot(p.x - pu.x, p.y - pu.y) < 0.6) {
          if (pu.type === 'speed') p.powerUps = { ...p.powerUps, speed: 1.5 }; setTimeout(() => delete p.powerUps.speed, 8000);
          if (pu.type === 'damage') p.powerUps = { ...p.powerUps, damage: 1.5 }; setTimeout(() => delete p.powerUps.damage, 8000);
          if (pu.type === 'shield') p.hp = Math.min(p.maxHp, p.hp + 50);
          powerUps.splice(i, 1);
        }
      });
    }

    if (Math.random() < 0.02) calculateAreas();

    // 승리 체크
    if (scores.some(s => s >= 70) || timeLeft <= 0) {
      const maxScore = Math.max(...scores);
      const winId = scores.indexOf(maxScore);
      setWinner(winId);
      setGameState('result');
    }
  };

  const fire = (p) => {
    if (p.cooldown > 0) return;
    const s = CHAMPIONS[p.champId].weapon;
    for (let i = 0; i < s.count; i++) {
      engine.current.bullets.push({
        x: p.x, y: p.y, angle: p.angle + (i - s.count/2 + 0.5) * s.spread,
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
    const { grid, players, bullets, powerBalls, powerUps } = engine.current;
    const myPlayer = players[0];
    if (!myPlayer) return;

    const scale = Math.min(sw, sh) / 12;
    const camX = sw/2 - myPlayer.x * scale;
    const camY = sh/2 - myPlayer.y * scale;

    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, sw, sh);
    ctx.save(); ctx.translate(camX, camY);

    // Grid
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const id = grid[y][x];
        if (id === 99) continue;
        ctx.fillStyle = id === -1 ? '#1e293b' : CHAMPIONS[players[id]?.champId]?.color || '#4b5563';
        ctx.fillRect(x * scale, y * scale, scale + 1, scale + 1);
      }
    }

    // Power-ups & Ball
    powerBalls.forEach(ball => {
      if (ball.active) {
        ctx.fillStyle = 'yellow'; ctx.beginPath(); ctx.arc(ball.x * scale, ball.y * scale, scale * 0.5, 0, Math.PI * 2); ctx.fill();
      }
    });
    powerUps.forEach(pu => {
      ctx.fillStyle = pu.type === 'speed' ? 'lime' : pu.type === 'damage' ? 'red' : 'cyan';
      ctx.beginPath(); ctx.arc(pu.x * scale, pu.y * scale, scale * 0.3, 0, Math.PI * 2); ctx.fill();
    });

    // Y-Sort 렌더링
    [...engine.current.walls.map(w=>({type:'W',x:w.x,y:w.y})), ...players.filter(p=>p.respawnTime<=0).map(p=>({type:'P',x:p.x,y:p.y,data:p}))]
      .sort((a,b)=>a.y-b.y).forEach(e => {
        const px = e.x * scale, py = e.y * scale;
        if (e.type === 'W') {
          const h = scale * 0.7;
          ctx.fillStyle = '#020617'; ctx.fillRect(px, py + scale - h, scale, h);
          ctx.fillStyle = '#475569'; ctx.fillRect(px, py - h, scale, scale);
        } else {
          const p = e.data; const c = CHAMPIONS[p.champId];
          const fy = py + scale/2 - Math.abs(Math.sin(time/200)*5);
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(px+scale/2, py+scale/2, scale*0.4, scale*0.2, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = c.color; ctx.beginPath(); ctx.arc(px+scale/2, fy, scale*0.4, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px+scale/2, fy);
          ctx.lineTo(px+scale/2 + Math.cos(p.angle)*scale*0.4, fy+Math.sin(p.angle)*scale*0.4); ctx.stroke();

          // HP 바
          ctx.fillStyle = 'red'; ctx.fillRect(px, py - scale*0.3, scale, scale*0.1);
          ctx.fillStyle = 'lime'; ctx.fillRect(px, py - scale*0.3, scale * (p.hp / p.maxHp), scale*0.1);

          // Level & Streak
          ctx.fillStyle = 'white'; ctx.font = `\( {scale*0.5}px Arial`; ctx.fillText(`Lv \){p.level}`, px, py - scale*0.4);
          if (p.streak > 1) ctx.fillText(`${p.streak} streak!`, px + scale*0.5, py);
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
      const timer = setInterval(() => {
        setTimeLeft(v => {
          if (v <= 1) {
            setGameState('result');
            return 0;
          }
          return v - 1;
        });
      }, 1000);
      return () => { cancelAnimationFrame(requestRef.current); clearInterval(timer); };
    }
  }, [gameState]);

  return (
    <div className="fixed inset-0 bg-slate-950 text-white overflow-hidden touch-none select-none">
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* 상단 영역 그래프 */}
      {gameState === 'playing' && (
        <div className="absolute top-0 left-0 right-0 h-16 bg-black/70 backdrop-blur flex items-center justify-around px-4 z-40">
          {CHAMPIONS.map((c, i) => (
            <div key={i} className="flex items-center gap-2 flex-1 max-w-[22%]">
              <div className="w-8 h-8 rounded-full" style={{background: c.color}} />
              <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden relative">
                <div style={{width: `${scores[i]}%`, background: c.color, height: '100%', transition: 'width 0.3s'}} />
                <div className="absolute inset-0 flex items-center justify-center text-sm font-black">{scores[i]}%</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 타이머 & Kill Feed */}
      {gameState === 'playing' && (
        <>
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/60 px-6 py-2 rounded-full text-3xl font-black text-yellow-300 border border-yellow-500/30">
            {timeLeft}s
          </div>
          <div className="absolute top-32 left-1/2 -translate-x-1/2 flex flex-col gap-1 items-center">
            {killFeed.map((kf, idx) => (
              <div key={idx} className="bg-black/80 px-4 py-1 rounded text-lg font-bold" style={{color: kf.color}}>
                {kf.text}
              </div>
            ))}
          </div>

          {/* 컨트롤러 */}
          <div className="absolute bottom-20 left-8 w-48 h-48 bg-white/10 rounded-full border border-white/20" 
            onTouchStart={e => { e.preventDefault(); const t = e.touches[0]; engine.current.joystick = {active:true, ox:t.clientX, oy:t.clientY, x:0, y:0}; }}
            onTouchMove={e => { e.preventDefault(); if(!engine.current.joystick.active) return; const t = e.touches[0]; const dx = t.clientX - engine.current.joystick.ox, dy = t.clientY - engine.current.joystick.oy; const d = Math.hypot(dx,dy)||1; engine.current.joystick.x = dx/d; engine.current.joystick.y = dy/d; }}
            onTouchEnd={() => { engine.current.joystick.active = false; engine.current.joystick.x = 0; engine.current.joystick.y = 0; }}
          >
            <div className="absolute inset-0 m-auto w-20 h-20 bg-white/30 rounded-full transition-transform" style={{transform: `translate(${engine.current.joystick.x*60}px, ${engine.current.joystick.y*60}px)`}} />
          </div>
          <div className="absolute bottom-20 right-8 w-32 h-32 bg-gradient-to-br from-rose-500 to-pink-600 rounded-full flex items-center justify-center shadow-xl active:scale-90 border-4 border-rose-300/40"
            onTouchStart={() => engine.current.shootBtn.active = true}
            onTouchEnd={() => engine.current.shootBtn.active = false}
          >
            <Zap fill="white" size={48} />
          </div>
        </>
      )}

      {/* 로비 */}
      {gameState === 'lobby' && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-black flex flex-col items-center justify-center p-6 z-50">
          <h1 className="text-7xl font-black italic mb-12 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-pink-500 animate-pulse">BRAWL INK</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {CHAMPIONS.map(c => (
              <div key={c.id} onClick={() => setSelectedChamp(c.id)} className={`p-6 rounded-3xl border-4 transition-all ${selectedChamp === c.id ? 'border-yellow-400 scale-105 shadow-2xl shadow-yellow-500/50 bg-slate-800' : 'border-slate-700 bg-slate-900/60 hover:scale-105'}`}>
                <c.icon className="w-16 h-16 mx-auto mb-4" style={{color: c.color}} />
                <div className="text-2xl font-black text-center">{c.name}</div>
                <div className="text-sm opacity-70 text-center">{c.role}</div>
              </div>
            ))}
          </div>
          <button onClick={init} className="px-16 py-6 bg-gradient-to-r from-yellow-400 to-orange-600 text-black font-black text-3xl rounded-3xl shadow-2xl active:scale-95 transition-all">START BRAWL</button>
        </div>
      )}

      {/* 결과 */}
      {gameState === 'result' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
          <Trophy size={140} className="text-yellow-400 mb-8 animate-bounce" />
          <h2 className="text-7xl font-black mb-8 bg-gradient-to-r from-yellow-300 to-pink-500 bg-clip-text text-transparent">VICTORY!</h2>
          {winner !== null && (
            <div className="text-5xl mb-12" style={{color: CHAMPIONS[winner].color}}>
              {CHAMPIONS[winner].name} WINS!
            </div>
          )}
          <div className="grid grid-cols-4 gap-8 mb-12">
            {scores.map((perc, i) => (
              <div key={i} className="text-center">
                <div className="text-6xl font-black" style={{color: CHAMPIONS[i].color}}>{perc}%</div>
                <div className="text-2xl">{CHAMPIONS[i].name}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setGameState('lobby')} className="px-20 py-8 bg-gradient-to-r from-yellow-400 to-orange-600 text-black font-black text-4xl rounded-3xl shadow-2xl active:scale-95">PLAY AGAIN</button>
        </div>
      )}
    </div>
  );
            }
