'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trophy, RefreshCw, Timer, Zap, Shield, Crosshair, Hexagon } from 'lucide-react';

// ==================================================================
// 🛠️ 게임 설정 & 챔피언 데이터
// ==================================================================
const MAP_SIZE = 40;
const TILE_SIZE = 40; // 렌더링 기준 크기
const GAME_DURATION = 90;

// 2.5D 깊이 설정
const WALL_HEIGHT = 25; 
const CHAR_HEIGHT = 10;

// 🎨 슈퍼셀 스타일 컬러 팔레트
const COLORS = {
  GROUND: '#1e293b', // slate-800
  GRID: '#334155',
  WALL_TOP: '#475569', // slate-600
  WALL_SIDE: '#0f172a', // slate-900 (그림자)
  SHADOW: 'rgba(0,0,0,0.4)'
};

// 🏆 챔피언 정의 (브롤스타즈 느낌)
const CHAMPIONS = [
  {
    id: 0, name: 'BULL (Tank)', role: 'SHOTGUN', icon: Shield,
    hp: 180, speed: 8, color: '#f43f5e', // Red/Pink
    weapon: { cooldown: 0.8, count: 5, spread: 0.4, speed: 14, range: 0.35, damage: 12 }
  },
  {
    id: 1, name: 'COLT (Ranger)', role: 'RAPID', icon: Zap,
    hp: 100, speed: 11, color: '#3b82f6', // Blue
    weapon: { cooldown: 0.15, count: 1, spread: 0.05, speed: 22, range: 0.6, damage: 10 }
  },
  {
    id: 2, name: 'PIPER (Sniper)', role: 'SNIPER', icon: Crosshair,
    hp: 80, speed: 9, color: '#8b5cf6', // Purple
    weapon: { cooldown: 1.4, count: 1, spread: 0.0, speed: 35, range: 1.0, damage: 60 }
  },
  {
    id: 3, name: 'DYNAMIKE (Area)', role: 'BLASTER', icon: Hexagon,
    hp: 120, speed: 7, color: '#f59e0b', // Orange
    weapon: { cooldown: 1.0, count: 1, spread: 0.1, speed: 16, range: 0.7, damage: 35, explode: true }
  }
];

export default function SupercellStyleGame() {
  const canvasRef = useRef(null);
  const requestRef = useRef();
  
  const [gameState, setGameState] = useState('lobby'); // lobby, playing, result
  const [selectedChamp, setSelectedChamp] = useState(0); // 선택한 챔피언 ID
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [winner, setWinner] = useState(null);

  // 엔진 상태
  const engine = useRef({
    grid: [], 
    walls: [], // 렌더링 정렬용 벽 데이터
    players: [],
    bullets: [],
    particles: [],
    lastTime: 0,
    joystick: { active: false, x: 0, y: 0, ox: 0, oy: 0 },
    shootBtn: { active: false }
  });

  // --- 맵 생성 (2.5D 장애물 배치) ---
  const createMap = () => {
    const grid = [];
    const walls = [];
    for(let y=0; y<MAP_SIZE; y++) {
      const row = [];
      for(let x=0; x<MAP_SIZE; x++) {
        // 외벽
        let isWall = (x===0 || x===MAP_SIZE-1 || y===0 || y===MAP_SIZE-1);
        
        // 장애물 패턴 (대칭형)
        const cx = MAP_SIZE/2, cy = MAP_SIZE/2;
        const dist = Math.sqrt((x-cx)**2 + (y-cy)**2);
        
        // 중앙 십자 기둥
        if ((Math.abs(x-10)<2 && Math.abs(y-10)<2) || 
            (Math.abs(x-30)<2 && Math.abs(y-10)<2) ||
            (Math.abs(x-10)<2 && Math.abs(y-30)<2) ||
            (Math.abs(x-30)<2 && Math.abs(y-30)<2)) {
          isWall = true;
        }
        // 중앙부 벽
        if (Math.abs(x-cx)<6 && Math.abs(y-cy)<6 && dist > 4) {
             if (Math.abs(x-cx)>1 && Math.abs(y-cy)>1) isWall = true;
        }

        row.push(isWall ? 99 : -1);
        if (isWall) walls.push({ x, y });
      }
      grid.push(row);
    }
    return { grid, walls };
  };

  const initGame = () => {
    const { grid, walls } = createMap();

    // 봇 챔피언 랜덤 배정
    const getBotChamp = () => Math.floor(Math.random() * 4);

    const players = [
      { id: 0, x: 5, y: 5, angle: Math.PI/4, champId: selectedChamp, hp: CHAMPIONS[selectedChamp].hp, maxHp: CHAMPIONS[selectedChamp].hp, cooldown: 0, isAi: false },
      { id: 1, x: 35, y: 35, angle: -3*Math.PI/4, champId: getBotChamp(), hp: 100, maxHp: 100, cooldown: 0, isAi: true, moveTimer: 0 },
      { id: 2, x: 35, y: 5, angle: 3*Math.PI/4, champId: getBotChamp(), hp: 100, maxHp: 100, cooldown: 0, isAi: true, moveTimer: 0 },
      { id: 3, x: 5, y: 35, angle: -Math.PI/4, champId: getBotChamp(), hp: 100, maxHp: 100, cooldown: 0, isAi: true, moveTimer: 0 },
    ];

    // 봇 초기화 (HP 설정)
    players.forEach(p => {
      if(p.id !== 0) {
        p.hp = CHAMPIONS[p.champId].hp;
        p.maxHp = CHAMPIONS[p.champId].hp;
      }
    });

    engine.current = {
      ...engine.current,
      grid, walls, players, bullets: [], particles: [],
      lastTime: Date.now()
    };

    setScores([0,0,0,0]);
    setTimeLeft(GAME_DURATION);
    setGameState('playing');
  };

  // --- 게임 루프 ---
  const update = () => {
    if (gameState !== 'playing') return;
    const now = Date.now();
    const dt = (now - engine.current.lastTime) / 1000;
    engine.current.lastTime = now;

    const { players, bullets, grid, joystick, shootBtn, particles } = engine.current;

    // 1. 플레이어 로직
    players.forEach(p => {
      const stats = CHAMPIONS[p.champId];

      if (p.respawnTime > 0) {
        p.respawnTime -= dt;
        if (p.respawnTime <= 0) {
           p.x = p.id === 0 ? 5 : (p.id===1?35:(p.id===2?35:5));
           p.y = p.id === 0 ? 5 : (p.id===1?35:(p.id===2?5:35));
           p.hp = stats.hp;
        }
        return;
      }

      // 속도 (내 땅 버프/디버프)
      const tileX = Math.floor(p.x), tileY = Math.floor(p.y);
      let speedMod = 1.0;
      if (tileX >= 0 && tileX < MAP_SIZE && tileY >= 0 && tileY < MAP_SIZE) {
        const owner = grid[tileY][tileX];
        if (owner === p.id) speedMod = 1.2;
        else if (owner !== -1 && owner !== 99) speedMod = 0.8;
      }
      
      const speed = stats.speed * speedMod * dt;
      let dx = 0, dy = 0;

      // 조작
      if (!p.isAi) {
        if (joystick.active) {
          dx = joystick.x * speed;
          dy = joystick.y * speed;
          p.angle = Math.atan2(joystick.y, joystick.x);
        }
        if (shootBtn.active) fireWeapon(p);
      } else {
        // AI
        p.moveTimer -= dt;
        if (p.moveTimer <= 0) {
          p.targetAngle = Math.random() * Math.PI * 2;
          p.moveTimer = 0.5 + Math.random();
          // 중앙 지향
          if (Math.random() < 0.4) p.targetAngle = Math.atan2(20-p.y, 20-p.x);
        }
        
        // 벽 회피
        const fx = Math.floor(p.x + Math.cos(p.angle)*1.5);
        const fy = Math.floor(p.y + Math.sin(p.angle)*1.5);
        if (grid[fy]?.[fx] === 99) p.targetAngle += Math.PI;

        p.angle += (p.targetAngle - p.angle) * 0.1;
        dx = Math.cos(p.angle) * speed;
        dy = Math.sin(p.angle) * speed;
        fireWeapon(p);
      }
      p.cooldown -= dt;

      // 충돌 & 이동
      if (grid[Math.floor(p.y)][Math.floor(p.x + dx)] !== 99) p.x += dx;
      if (grid[Math.floor(p.y + dy)][Math.floor(p.x)] !== 99) p.y += dy;
    });

    // 2. 총알 로직
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      b.life -= dt;

      // 벽 충돌
      if (grid[Math.floor(b.y)]?.[Math.floor(b.x)] === 99) {
        b.life = 0;
        createParticles(b.x, b.y, '#aaa', 3);
        continue;
      }

      // 땅 칠하기
      paintGround(grid, b.x, b.y, b.ownerId, b.explode ? 2.5 : 1.2);

      // 피격
      let hit = false;
      players.forEach(p => {
        if (p.id !== b.ownerId && p.respawnTime <= 0) {
          const dist = (p.x - b.x)**2 + (p.y - b.y)**2;
          if (dist < (b.explode ? 4 : 1.5)) { 
            p.hp -= b.damage;
            hit = true;
            createParticles(p.x, p.y, CHAMPIONS[p.champId].color, 5);
            if (p.hp <= 0) {
              p.respawnTime = 4;
              createParticles(p.x, p.y, CHAMPIONS[p.champId].color, 15);
            }
          }
        }
      });

      if (hit || b.life <= 0) {
        if (b.explode) {
          paintGround(grid, b.x, b.y, b.ownerId, 3.5);
          createParticles(b.x, b.y, '#fbbf24', 10);
        }
        bullets.splice(i, 1);
      }
    }

    // 3. 파티클 로직
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) particles.splice(i, 1);
    }

    requestRef.current = requestAnimationFrame(render);
  };

  const fireWeapon = (p) => {
    if (p.cooldown > 0) return;
    const stats = CHAMPIONS[p.champId].weapon;
    
    for(let i=0; i<stats.count; i++) {
       const spread = (Math.random() - 0.5) * stats.spread;
       const angle = stats.count > 1 
         ? p.angle + (i - stats.count/2)*0.2 
         : p.angle + spread;

       engine.current.bullets.push({
         x: p.x, y: p.y,
         angle: angle,
         speed: stats.speed,
         life: stats.range, // life가 곧 사거리
         damage: stats.damage,
         explode: stats.explode || false,
         ownerId: p.id,
         color: CHAMPIONS[p.champId].color
       });
    }
    p.cooldown = stats.cooldown;
  };

  const paintGround = (grid, cx, cy, id, rad) => {
    const minX = Math.floor(cx-rad), maxX = Math.ceil(cx+rad);
    const minY = Math.floor(cy-rad), maxY = Math.ceil(cy+rad);
    for(let y=minY; y<=maxY; y++) {
      for(let x=minX; x<=maxX; x++) {
        if(x>=0 && x<MAP_SIZE && y>=0 && y<MAP_SIZE && grid[y][x] !== 99) {
          if((x-cx)**2 + (y-cy)**2 < rad*rad) grid[y][x] = id;
        }
      }
    }
  };

  const createParticles = (x, y, color, count) => {
    for(let i=0; i<count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 10;
      engine.current.particles.push({
        x, y, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
        life: 0.3 + Math.random()*0.3, color
      });
    }
  };

  // --- 🎨 2.5D 렌더링 (핵심) ---
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const sw = canvas.clientWidth;
    const sh = canvas.clientHeight;
    if (canvas.width !== sw) { canvas.width = sw; canvas.height = sh; }

    const { grid, walls, players, bullets, particles } = engine.current;
    const myPlayer = players[0];

    // 1. 카메라 계산 (Smooth Follow)
    const scale = Math.min(sw, sh) / 18; // 줌 레벨
    const camX = sw/2 - myPlayer.x * scale;
    const camY = sh/2 - myPlayer.y * scale;

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, sw, sh);

    ctx.save();
    ctx.translate(camX, camY);

    // 2. 바닥(Floor) 그리기
    const currentScores = [0,0,0,0];
    for(let y=0; y<MAP_SIZE; y++) {
      for(let x=0; x<MAP_SIZE; x++) {
        const id = grid[y][x];
        const px = x * scale;
        const py = y * scale;
        
        if (id === 99) {
          // 벽은 나중에 그림 (Y-Sort를 위해)
        } else {
          ctx.fillStyle = id === -1 ? COLORS.GROUND : CHAMPIONS[players[id].champId].color;
          ctx.fillRect(px, py, scale+1, scale+1); // +1 to fix gaps
          // 잉크 광택
          if (id !== -1) {
             ctx.fillStyle = 'rgba(255,255,255,0.1)';
             ctx.fillRect(px, py, scale, scale/2);
             currentScores[id]++;
          }
        }
      }
    }
    if(Math.random()<0.05) setScores(currentScores);

    // 3. 그리드 라인
    ctx.strokeStyle = COLORS.GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<=MAP_SIZE; i++) {
        ctx.moveTo(i*scale, 0); ctx.lineTo(i*scale, MAP_SIZE*scale);
        ctx.moveTo(0, i*scale); ctx.lineTo(MAP_SIZE*scale, i*scale);
    }
    ctx.stroke();

    // 4. 엔티티 정렬 및 렌더링 (Y-Sorting: 2.5D의 핵심)
    // 벽, 플레이어, 총알 등을 Y좌표 기준으로 정렬해서 그림
    const entities = [
      ...walls.map(w => ({ type: 'WALL', y: w.y, x: w.x })),
      ...players.map(p => ({ type: 'PLAYER', y: p.y, x: p.x, data: p })),
    ];

    entities.sort((a, b) => a.y - b.y);

    entities.forEach(e => {
      const px = e.x * scale;
      const py = e.y * scale;

      if (e.type === 'WALL') {
        // 2.5D 벽 (옆면 + 윗면)
        const h = scale * 0.8; // 벽 높이
        // 그림자
        ctx.fillStyle = COLORS.SHADOW;
        ctx.fillRect(px + scale*0.2, py + scale*0.2, scale, scale);
        // 옆면 (어두운 색)
        ctx.fillStyle = COLORS.WALL_SIDE;
        ctx.fillRect(px, py + scale - h, scale, h); 
        // 윗면 (밝은 색) - 위치를 위로 올림
        ctx.fillStyle = COLORS.WALL_TOP;
        ctx.fillRect(px, py - h, scale, scale);
        // 윗면 하이라이트
        ctx.fillStyle = '#64748b';
        ctx.fillRect(px, py - h, scale, scale*0.1);

      } else if (e.type === 'PLAYER') {
        const p = e.data;
        if (p.respawnTime > 0) return;
        
        const champ = CHAMPIONS[p.champId];
        const h = scale * 0.6; // 캐릭터 높이(점프 느낌)
        const size = scale * 0.7; // 캐릭터 지름

        // 그림자 (바닥에 붙음)
        ctx.fillStyle = COLORS.SHADOW;
        ctx.beginPath();
        ctx.ellipse(px, py, size/1.5, size/2.5, 0, 0, Math.PI*2);
        ctx.fill();

        // 몸체 (공중에 뜸)
        const floatY = py - h - Math.abs(Math.sin(Date.now()/150)*5); // 숨쉬기 애니메이션
        
        // 챔피언 본체
        ctx.fillStyle = champ.color;
        ctx.beginPath();
        ctx.arc(px, floatY, size/2, 0, Math.PI*2);
        ctx.fill();

        // 3D 입체감 (옆면/아랫면)
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(px, floatY, size/2, 0, Math.PI, false);
        ctx.fill();

        // 눈 (방향)
        const eyeX = px + Math.cos(p.angle) * (size/4);
        const eyeY = floatY + Math.sin(p.angle) * (size/4);
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, size/5, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, size/10, 0, Math.PI*2);
        ctx.fill();

        // HP Bar (머리 위)
        const hpW = scale * 1.2;
        const hpH = 5;
        ctx.fillStyle = '#000';
        ctx.fillRect(px - hpW/2, floatY - size, hpW, hpH);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(px - hpW/2, floatY - size, hpW * (p.hp/p.maxHp), hpH);
        
        // 이름표
        if(p.id===0) {
           ctx.fillStyle = 'white';
           ctx.font = 'bold 10px sans-serif';
           ctx.textAlign = 'center';
           ctx.fillText("YOU", px, floatY - size - 5);
        }
      }
    });

    // 5. 총알 (가장 위에 그림)
    bullets.forEach(b => {
      const bx = b.x * scale;
      const by = b.y * scale - scale*0.5; // 공중에 뜸
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(bx, by, scale/5, 0, Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 6. 파티클
    particles.forEach(pt => {
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = pt.life;
      ctx.fillRect(pt.x * scale, pt.y * scale - scale*0.5, 4, 4);
      ctx.globalAlpha = 1.0;
    });

    ctx.restore();
    update();
  };

  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('result');
            setWinner(scores.indexOf(Math.max(...scores)));
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

  // Touch Controls
  const handleTouchStart = (e, type) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (type === 'move') {
      engine.current.joystick.active = true;
      engine.current.joystick.ox = touch.clientX; engine.current.joystick.oy = touch.clientY;
      engine.current.joystick.x = 0; engine.current.joystick.y = 0;
    } else engine.current.shootBtn.active = true;
  };
  const handleTouchMove = (e, type) => {
    e.preventDefault();
    if (type === 'move' && engine.current.joystick.active) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - engine.current.joystick.ox;
      const dy = touch.clientY - engine.current.joystick.oy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const maxDist = 50;
      if (dist > maxDist) { engine.current.joystick.x = dx/dist; engine.current.joystick.y = dy/dist; }
      else { engine.current.joystick.x = dx/maxDist; engine.current.joystick.y = dy/maxDist; }
    }
  };
  const handleTouchEnd = (e, type) => {
    e.preventDefault();
    if (type === 'move') { engine.current.joystick.active = false; engine.current.joystick.x=0; engine.current.joystick.y=0; }
    else engine.current.shootBtn.active = false;
  };

  return (
    <div className="w-full h-screen bg-[#1e293b] overflow-hidden relative select-none touch-none text-white font-sans">
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Game UI */}
      {gameState === 'playing' && (
        <>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-xl">
             <div className="flex gap-1 w-32 h-4 rounded-full overflow-hidden bg-white/10">
               {scores.map((s,i) => <div key={i} style={{flex:s||0.01, background:CHAMPIONS[players[i]?.champId]?.color||'#fff'}}/>)}
             </div>
             <div className="text-2xl font-black text-white w-12 text-center">{timeLeft}</div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-10 left-10 w-48 h-48 flex items-center justify-center bg-white/5 rounded-full border border-white/10 backdrop-blur-sm"
               onTouchStart={e=>handleTouchStart(e,'move')} onTouchMove={e=>handleTouchMove(e,'move')} onTouchEnd={e=>handleTouchEnd(e,'move')}>
             <div className="w-20 h-20 bg-white/20 rounded-full shadow-inner" 
                  style={{transform:`translate(${engine.current.joystick.x*60}px,${engine.current.joystick.y*60}px)`}}/>
          </div>
          <div className="absolute bottom-10 right-10 w-32 h-32 flex items-center justify-center bg-red-500 rounded-full border-b-8 border-red-700 active:border-b-0 active:translate-y-2 transition-all shadow-xl"
               onTouchStart={e=>handleTouchStart(e,'shoot')} onTouchEnd={e=>handleTouchEnd(e,'shoot')}>
             <Crosshair size={40} className="text-white"/>
          </div>
        </>
      )}

      {/* Lobby: Champion Select */}
      {gameState === 'lobby' && (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center p-6 z-50">
          <h1 className="text-4xl font-black text-white mb-6 tracking-tighter italic">BRAWL ARENA</h1>
          
          <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
            {CHAMPIONS.map((c, i) => (
              <button key={i} onClick={() => setSelectedChamp(i)}
                className={`p-4 rounded-2xl border-4 transition-all relative overflow-hidden flex flex-col items-center gap-2
                  ${selectedChamp === i ? 'border-yellow-400 bg-slate-800 scale-105 shadow-[0_0_20px_rgba(250,204,21,0.4)]' : 'border-slate-700 bg-slate-800/50 grayscale hover:grayscale-0'}`}
              >
                <c.icon size={32} style={{color: c.color}} />
                <div className="text-center">
                  <div className="font-black text-sm uppercase text-white">{c.name}</div>
                  <div className="text-[10px] text-gray-400 font-bold">{c.role}</div>
                </div>
                {selectedChamp === i && <div className="absolute top-2 right-2 text-yellow-400"><Trophy size={16} fill="currentColor"/></div>}
              </button>
            ))}
          </div>

          <button onClick={initGame} className="w-full max-w-xs bg-yellow-400 hover:bg-yellow-300 text-black font-black py-4 rounded-xl text-xl shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none">
            READY!
          </button>
        </div>
      )}

      {/* Result Screen */}
      {gameState === 'result' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 z-50">
          <Trophy size={80} className="text-yellow-400 mb-6 animate-bounce" />
          <h2 className="text-4xl font-black text-white mb-8">VICTORY!</h2>
          <button onClick={() => setGameState('lobby')} className="bg-white text-black px-10 py-4 rounded-full font-black text-lg">
            BACK TO LOBBY
          </button>
        </div>
      )}
    </div>
  );
}
