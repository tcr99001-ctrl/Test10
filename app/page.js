'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trophy, RefreshCw, Timer } from 'lucide-react';

// ==================================================================
// 게임 설정 상수
// ==================================================================
const MAP_SIZE = 40; // 타일 개수 (40x40)
const TILE_SIZE = 20; // 화면 렌더링 시 스케일 조정용
const GAME_DURATION = 60; // 60초
const FPS = 60;

// 색상 팔레트 (P1: Neon Green, P2: Pink, P3: Cyan, P4: Orange)
const COLORS = [
  { id: 0, hex: '#39ff14', name: 'Green (YOU)' }, 
  { id: 1, hex: '#ff00ff', name: 'Pink (AI)' },
  { id: 2, hex: '#00ffff', name: 'Cyan (AI)' },
  { id: 3, hex: '#ff9900', name: 'Orange (AI)' }
];

export default function Splatoon2D() {
  const canvasRef = useRef(null);
  const requestRef = useRef();
  
  // 게임 상태
  const [gameState, setGameState] = useState('lobby'); // lobby, playing, result
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [winner, setWinner] = useState(null);

  // 엔진 상태 (Ref로 관리하여 렌더링 최적화)
  const engine = useRef({
    grid: [], // 맵 데이터 (누가 칠했는지)
    players: [],
    bullets: [],
    particles: [],
    lastTime: 0,
    joystick: { active: false, x: 0, y: 0, originX: 0, originY: 0 }, // 이동 조이스틱
    shootBtn: { active: false } // 발사 버튼
  });

  // --- 초기화 ---
  const initGame = () => {
    // 1. 맵 초기화 (0: 빈땅, 1~4: 플레이어 색)
    const grid = [];
    for(let y=0; y<MAP_SIZE; y++) {
      const row = [];
      for(let x=0; x<MAP_SIZE; x++) row.push(-1); // -1: unpainted
      grid.push(row);
    }

    // 2. 플레이어 초기화
    const players = [
      { id: 0, x: 5, y: 5, vx: 0, vy: 0, hp: 100, angle: 0, cooldown: 0, isAi: false },
      { id: 1, x: 35, y: 35, vx: 0, vy: 0, hp: 100, angle: Math.PI, cooldown: 0, isAi: true, moveTimer: 0 },
      { id: 2, x: 35, y: 5, vx: 0, vy: 0, hp: 100, angle: Math.PI/2, cooldown: 0, isAi: true, moveTimer: 0 },
      { id: 3, x: 5, y: 35, vx: 0, vy: 0, hp: 100, angle: -Math.PI/2, cooldown: 0, isAi: true, moveTimer: 0 },
    ];

    engine.current = {
      ...engine.current,
      grid, players, bullets: [], particles: [],
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

    const { players, bullets, grid, particles, joystick, shootBtn } = engine.current;

    // 1. 플레이어 로직
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

      // 지형 속도 보정 (내 땅: 빠름, 적 땅: 느림)
      const tileX = Math.floor(p.x);
      const tileY = Math.floor(p.y);
      let speedMod = 1.0;
      
      if (tileX >= 0 && tileX < MAP_SIZE && tileY >= 0 && tileY < MAP_SIZE) {
        const tileOwner = grid[tileY][tileX];
        if (tileOwner === p.id) speedMod = 1.3; // 내 땅 버프
        else if (tileOwner !== -1) speedMod = 0.6; // 적 땅 디버프
      }

      const speed = 10 * speedMod * dt;

      // 이동 로직
      if (!p.isAi) {
        // [플레이어] 조이스틱 입력
        if (joystick.active) {
          p.x += joystick.x * speed;
          p.y += joystick.y * speed;
          p.angle = Math.atan2(joystick.y, joystick.x);
        }
        // 발사
        if (shootBtn.active && p.cooldown <= 0) {
          fireBullet(p);
          p.cooldown = 0.15; // 연사 속도
        }
      } else {
        // [AI] 간단한 봇 로직
        p.moveTimer -= dt;
        if (p.moveTimer <= 0) {
          p.targetAngle = Math.random() * Math.PI * 2;
          p.moveTimer = 1 + Math.random();
        }
        // 벽 피하기 간단 처리
        if (p.x < 2 || p.x > MAP_SIZE-2 || p.y < 2 || p.y > MAP_SIZE-2) {
           p.targetAngle += Math.PI; 
        }
        
        p.angle = p.angle + (p.targetAngle - p.angle) * 0.1;
        p.x += Math.cos(p.angle) * speed;
        p.y += Math.sin(p.angle) * speed;

        // AI 자동 발사
        if (p.cooldown <= 0) {
          fireBullet(p);
          p.cooldown = 0.2 + Math.random() * 0.3;
        }
      }
      p.cooldown -= dt;

      // 맵 밖으로 못 나가게
      p.x = Math.max(0, Math.min(MAP_SIZE, p.x));
      p.y = Math.max(0, Math.min(MAP_SIZE, p.y));
    });

    // 2. 총알 로직
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      b.life -= dt;

      // 바닥 칠하기 (총알 지나가는 자리)
      paintGround(grid, b.x, b.y, b.ownerId, 1);

      // 충돌 체크 (총알 vs 플레이어)
      let hit = false;
      players.forEach(p => {
        if (p.id !== b.ownerId && p.respawnTime <= 0) {
          const dx = p.x - b.x;
          const dy = p.y - b.y;
          if (dx*dx + dy*dy < 1) { // Hit
            p.hp -= 20;
            hit = true;
            createParticles(p.x, p.y, COLORS[p.id].hex); // 피격 효과
            if (p.hp <= 0) {
              p.respawnTime = 3; // 3초 뒤 부활
              createParticles(p.x, p.y, COLORS[p.id].hex, 20); // 사망 효과
            }
          }
        }
      });

      if (hit || b.life <= 0 || b.x < 0 || b.x > MAP_SIZE || b.y < 0 || b.y > MAP_SIZE) {
        paintGround(grid, b.x, b.y, b.ownerId, 2); // 터질 때 더 크게 칠함
        bullets.splice(i, 1);
      }
    }

    // 3. 점수 계산 (매 프레임은 무거우니 0.5초마다 하거나 그냥 프레임마다 대략 계산)
    // 여기서는 최적화를 위해 생략하고 렌더링 때 계산된 값을 사용하거나 state로 가끔 올림

    requestRef.current = requestAnimationFrame(render);
  };

  const fireBullet = (p) => {
    // 약간의 탄퍼짐
    const spread = (Math.random() - 0.5) * 0.2;
    engine.current.bullets.push({
      x: p.x, y: p.y,
      angle: p.angle + spread,
      speed: 15,
      life: 0.8, // 사거리
      ownerId: p.id
    });
  };

  const paintGround = (grid, cx, cy, colorId, radius) => {
    const startX = Math.floor(cx - radius);
    const endX = Math.floor(cx + radius);
    const startY = Math.floor(cy - radius);
    const endY = Math.floor(cy + radius);

    for(let y=startY; y<=endY; y++) {
      for(let x=startX; x<=endX; x++) {
        if (x>=0 && x<MAP_SIZE && y>=0 && y<MAP_SIZE) {
           grid[y][x] = colorId;
        }
      }
    }
  };

  const createParticles = (x, y, color, count=5) => {
    // 파티클 구현은 코드 길이상 시각적 효과만 간단히 (렌더링에서 처리)
  };

  // --- 렌더링 ---
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Canvas Size Sync
    const screenW = canvas.clientWidth;
    const screenH = canvas.clientHeight;
    if (canvas.width !== screenW || canvas.height !== screenH) {
      canvas.width = screenW;
      canvas.height = screenH;
    }

    const { grid, players, bullets } = engine.current;
    
    // 카메라/스케일 계산 (맵을 화면 중앙에 맞춤)
    const scale = Math.min(screenW / MAP_SIZE, screenH / MAP_SIZE) * 0.9;
    const offsetX = (screenW - MAP_SIZE * scale) / 2;
    const offsetY = (screenH - MAP_SIZE * scale) / 2;

    ctx.clearRect(0, 0, screenW, screenH);

    // 1. 땅 그리기
    const currentScores = [0,0,0,0];
    ctx.fillStyle = '#222';
    ctx.fillRect(offsetX, offsetY, MAP_SIZE*scale, MAP_SIZE*scale);

    for(let y=0; y<MAP_SIZE; y++) {
      for(let x=0; x<MAP_SIZE; x++) {
        const owner = grid[y][x];
        if (owner !== -1) {
          ctx.fillStyle = COLORS[owner].hex;
          // 픽셀 아트 느낌으로 그리기
          ctx.fillRect(offsetX + x*scale, offsetY + y*scale, scale+0.5, scale+0.5);
          currentScores[owner]++;
        }
      }
    }
    // 점수 업데이트 (비동기적으로 UI 반영)
    if (Math.random() < 0.05) setScores(currentScores);

    // 2. 플레이어 그리기
    players.forEach(p => {
      if (p.respawnTime > 0) return; // 죽은 상태

      const px = offsetX + p.x * scale;
      const py = offsetY + p.y * scale;
      const radius = 0.8 * scale;

      // 몸체
      ctx.beginPath();
      ctx.arc(px, py, radius/2, 0, Math.PI*2);
      ctx.fillStyle = COLORS[p.id].hex;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 방향 표시 (눈)
      const eyeX = px + Math.cos(p.angle) * (radius/2);
      const eyeY = py + Math.sin(p.angle) * (radius/2);
      ctx.beginPath();
      ctx.arc(eyeX, eyeY, radius/5, 0, Math.PI*2);
      ctx.fillStyle = 'white';
      ctx.fill();

      // HP Bar
      ctx.fillStyle = 'red';
      ctx.fillRect(px - radius, py - radius - 5, radius*2, 4);
      ctx.fillStyle = '#0f0';
      ctx.fillRect(px - radius, py - radius - 5, radius*2 * (p.hp/100), 4);
    });

    // 3. 총알 그리기
    bullets.forEach(b => {
      const bx = offsetX + b.x * scale;
      const by = offsetY + b.y * scale;
      ctx.beginPath();
      ctx.arc(bx, by, scale/3, 0, Math.PI*2);
      ctx.fillStyle = COLORS[b.ownerId].hex;
      ctx.fill();
    });

    update();
  };

  // --- 타이머 ---
  useEffect(() => {
    if (gameState === 'playing') {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('result');
            // 승자 결정
            const maxScore = Math.max(...scores);
            const winnerIdx = scores.indexOf(maxScore);
            setWinner(winnerIdx);
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


  // --- 터치 컨트롤러 로직 ---
  const handleTouchStart = (e, type) => {
    e.preventDefault(); // 스크롤 방지
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
      
      // 정규화 (길이 1로 제한)
      const dist = Math.sqrt(dx*dx + dy*dy);
      const maxDist = 50; // 조이스틱 반경
      
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

  // --- UI Renders ---
  return (
    <div className="w-full h-screen bg-black overflow-hidden relative select-none touch-none">
      
      {/* 게임 화면 (Canvas) */}
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />

      {/* UI 오버레이 */}
      <div className="absolute top-0 left-0 w-full p-4 pointer-events-none">
        {/* 점수판 */}
        <div className="flex justify-between items-center mb-2">
           <div className="flex gap-2 w-full h-6 rounded-full overflow-hidden bg-gray-800 border-2 border-gray-700">
             {scores.map((score, i) => (
               <div key={i} style={{
                 flex: score === 0 ? 0.01 : score, 
                 background: COLORS[i].hex,
                 transition: 'flex 0.5s'
               }} />
             ))}
           </div>
        </div>
        <div className="flex justify-center">
          <div className="bg-black/50 text-white px-4 py-1 rounded-full font-mono font-bold text-xl flex items-center gap-2">
             <Timer size={20} className={timeLeft < 10 ? "text-red-500 animate-pulse" : "text-white"}/> {timeLeft}s
          </div>
        </div>
      </div>

      {/* 모바일 컨트롤러 (게임 중일 때만) */}
      {gameState === 'playing' && (
        <>
          {/* 왼쪽 이동 조이스틱 영역 */}
          <div 
            className="absolute bottom-10 left-10 w-40 h-40 bg-white/10 rounded-full border-2 border-white/30 backdrop-blur-sm flex items-center justify-center"
            onTouchStart={e => handleTouchStart(e, 'move')}
            onTouchMove={e => handleTouchMove(e, 'move')}
            onTouchEnd={e => handleTouchEnd(e, 'move')}
          >
            <div className="w-16 h-16 bg-white/50 rounded-full pointer-events-none" 
                 style={{ 
                   transform: `translate(${engine.current.joystick.x * 50}px, ${engine.current.joystick.y * 50}px)` 
                 }} 
            />
          </div>

          {/* 오른쪽 발사 버튼 */}
          <div 
            className="absolute bottom-10 right-10 w-28 h-28 bg-red-500/50 rounded-full border-4 border-red-400 active:bg-red-500 active:scale-95 transition-transform flex items-center justify-center"
            onTouchStart={e => handleTouchStart(e, 'shoot')}
            onTouchEnd={e => handleTouchEnd(e, 'shoot')}
          >
            <span className="text-white font-black text-lg pointer-events-none">SHOOT</span>
          </div>
        </>
      )}

      {/* 로비 화면 */}
      {gameState === 'lobby' && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 z-10">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-2 italic">INK WARS</h1>
          <p className="text-gray-400 mb-8">땅따먹기 슈팅 게임</p>
          <div className="space-y-4 w-full max-w-sm">
             <div className="bg-gray-800 p-4 rounded-xl text-white text-sm">
               <p>🎮 <b>조작법:</b></p>
               <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-300">
                 <li>왼쪽 패드: 이동</li>
                 <li>오른쪽 버튼: 발사 (보는 방향)</li>
                 <li>내 색깔 위에서는 빨라지고, 적 색깔에서는 느려집니다!</li>
               </ul>
             </div>
             <button onClick={initGame} className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-xl text-xl shadow-[0_4px_0_#14532d] active:translate-y-1 active:shadow-none transition-all">
               게임 시작
             </button>
          </div>
        </div>
      )}

      {/* 결과 화면 */}
      {gameState === 'result' && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 z-20 animate-in fade-in">
          <Trophy size={64} className="text-yellow-400 mb-4 animate-bounce" />
          <h2 className="text-4xl font-black text-white mb-6">TIME OVER!</h2>
          
          <div className="w-full max-w-md bg-gray-800 rounded-2xl p-6 mb-8 border border-gray-700">
            {scores.map((score, i) => {
              const total = scores.reduce((a,b)=>a+b, 0);
              const percent = total > 0 ? Math.round((score/total)*100) : 0;
              return (
                <div key={i} className={`flex items-center justify-between py-3 border-b border-gray-700 last:border-0 ${winner===i ? 'bg-white/10 -mx-6 px-6':''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{background: COLORS[i].hex}}></div>
                    <span className={`font-bold ${i===0?'text-white':'text-gray-400'}`}>{COLORS[i].name}</span>
                    {winner===i && <span className="text-yellow-400 text-xs font-black px-2 py-0.5 border border-yellow-400 rounded-full">WINNER</span>}
                  </div>
                  <span className="font-mono font-bold text-white text-xl">{percent}%</span>
                </div>
              )
            })}
          </div>

          <button onClick={initGame} className="bg-white text-black px-8 py-3 rounded-full font-black text-lg flex items-center gap-2 hover:scale-105 transition-transform">
            <RefreshCw size={20}/> 다시 하기
          </button>
        </div>
      )}
    </div>
  );
}
