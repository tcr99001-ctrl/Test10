'use client';

import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, onSnapshot, updateDoc, getDoc 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Crosshair, Wind, Flame, Trophy, AlertCircle
} from 'lucide-react';

// ==================================================================
// [필수] Firebase 설정 (본인의 설정값으로 유지)
// ==================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBPd5xk9UseJf79GTZogckQmKKwwogneco",
  authDomain: "test-4305d.firebaseapp.com",
  projectId: "test-4305d",
  storageBucket: "test-4305d.firebasestorage.app",
  messagingSenderId: "402376205992",
  appId: "1:402376205992:web:be662592fa4d5f0efb849d"
};

// --- Firebase Init ---
let firebaseApp, db, auth;
try {
  if (!getApps().length) firebaseApp = initializeApp(firebaseConfig);
  else firebaseApp = getApps()[0];
  db = getFirestore(firebaseApp);
  auth = getAuth(firebaseApp);
} catch (e) {
  console.error("Firebase Init Error:", e);
}

// --- Game Constants ---
const GRAVITY = 0.4;
const MAP_WIDTH = 800;
const MAP_HEIGHT = 500;
const TANK_SIZE = 40;
const MAX_HP = 100;

export default function FortressGame() {
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState({}); 
  const [myState, setMyState] = useState({ angle: 45, power: 50 });
  const [isFiring, setIsFiring] = useState(false);
  const [copyStatus, setCopyStatus] = useState(null);
  const [initError, setInitError] = useState(null);
  
  const canvasRef = useRef(null);
  const requestRef = useRef();
  
  // 애니메이션 상태 관리 (React 렌더링과 분리)
  const bulletRef = useRef({ active: false, x: 0, y: 0, vx: 0, vy: 0 });
  const explosionRef = useRef({ active: false, x: 0, y: 0, radius: 0 });

  const isHost = roomData?.hostId && user?.uid && roomData.hostId === user.uid;
  const isJoined = user && players && players[user.uid];
  const isMyTurn = roomData?.currentTurnId === user?.uid;

  // --- 1. Auth & Init ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const code = p.get('room');
      if (code) setRoomCode(code.toUpperCase());
    }
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, u => {
      if(u) setUser(u);
      else signInAnonymously(auth).catch(e => setInitError(e.message));
    });
    return () => unsub();
  }, []);

  // --- 2. Data Sync ---
  useEffect(() => {
    if(!user || !roomCode || roomCode.length !== 4 || !db) return;
    
    // 방 정보 구독
    const unsubRoom = onSnapshot(doc(db,'rooms',roomCode), s => {
      if(s.exists()) {
        const data = s.data();
        // 적이 발사했을 때 감지 (타임스탬프 비교)
        if (roomData && data.lastShot?.timestamp !== roomData.lastShot?.timestamp) {
           triggerEnemyShot(data.lastShot);
        }
        setRoomData(data);
      } else {
        setRoomData(null);
      }
    }, (err) => console.error("Room Sync Error:", err));

    // 플레이어 목록 구독
    const unsubPlayers = onSnapshot(doc(db,'rooms',roomCode,'players','all'), s => {
      // 데이터가 없으면 빈 객체로 초기화하여 에러 방지
      if(s.exists()) setPlayers(s.data() || {});
      else setPlayers({});
    }, (err) => console.error("Player Sync Error:", err));

    return () => { unsubRoom(); unsubPlayers(); };
  }, [user, roomCode, roomData]); // roomData 의존성 유지 (shot detection)

  // --- 3. Canvas Rendering Loop ---
  const renderGame = () => {
    const canvas = canvasRef.current;
    // 캔버스나 데이터가 없으면 그리지 않음 (에러 방지 핵심)
    if (!canvas || !roomData) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // A. Clear & Background
    ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    const gradient = ctx.createLinearGradient(0, 0, 0, MAP_HEIGHT);
    gradient.addColorStop(0, "#87CEEB"); 
    gradient.addColorStop(1, "#E0F7FA");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Ground
    ctx.fillStyle = "#5D4037"; 
    ctx.fillRect(0, MAP_HEIGHT - 60, MAP_WIDTH, 60);
    ctx.fillStyle = "#388E3C"; 
    ctx.fillRect(0, MAP_HEIGHT - 60, MAP_WIDTH, 10);

    // B. Draw Players (안전장치 추가)
    if (players) {
      Object.values(players).forEach(p => {
        if (!p || p.hp <= 0) return; // 데이터 없거나 사망 시 패스

        const x = p.x;
        const y = MAP_HEIGHT - 60 - TANK_SIZE;
        // user가 로딩 전일 수 있으므로 user?.uid 사용
        const isMe = user && p.id === user.uid;
        
        // Body
        ctx.fillStyle = isMe ? "#2563EB" : "#DC2626"; 
        ctx.fillRect(x, y, TANK_SIZE, TANK_SIZE);
        
        // HP Bar
        ctx.fillStyle = "#000";
        ctx.fillRect(x - 5, y - 15, TANK_SIZE + 10, 6);
        ctx.fillStyle = p.hp > 30 ? "#22c55e" : "#ef4444";
        ctx.fillRect(x - 4, y - 14, (TANK_SIZE + 8) * (p.hp / MAX_HP), 4);

        // Barrel (포신)
        ctx.save();
        ctx.translate(x + TANK_SIZE/2, y + TANK_SIZE/2);
        const angle = isMe ? myState.angle : (p.angle || 45);
        const rad = (angle * Math.PI) / 180;
        const dir = x < MAP_WIDTH/2 ? 1 : -1; 
        ctx.rotate(dir === 1 ? -rad : rad);
        ctx.fillStyle = "#333";
        ctx.fillRect(0, -4, 30, 8); 
        ctx.restore();

        // Name
        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.name, x + TANK_SIZE/2, y + 20 + TANK_SIZE);
      });
    }

    // C. Draw Bullet
    if (bulletRef.current.active) {
      const b = bulletRef.current;
      b.x += b.vx;
      b.y += b.vy;
      b.vy += GRAVITY;
      b.vx += (roomData.wind || 0) * 0.005; 

      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#000";
      ctx.fill();

      // 땅 충돌
      if (b.y >= MAP_HEIGHT - 60) handleExplosion(b.x, b.y);
      // 화면 밖 나감
      if (b.x < -100 || b.x > MAP_WIDTH + 100) handleExplosion(b.x, b.y, false); 
    }

    // D. Draw Explosion
    if (explosionRef.current.active) {
      const e = explosionRef.current;
      e.radius += 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 69, 0, ${1 - e.radius / 40})`; 
      ctx.fill();

      if (e.radius > 40) {
        explosionRef.current.active = false;
        // 내 턴이고 내가 쏘고 있었으면 턴 종료
        if (isFiring && isMyTurn) finishMyTurn();
      }
    }

    requestRef.current = requestAnimationFrame(renderGame);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(renderGame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [roomData, players, myState, isFiring, user]); // 의존성 추가

  // --- Logic Functions ---

  const handleCreate = async () => {
    if(!playerName) return alert("이름을 입력하세요");
    if(!user) return alert("로그인 대기중...");
    
    const code = Math.random().toString(36).substring(2,6).toUpperCase();
    
    const initialPlayers = {
      [user.uid]: {
        id: user.uid, name: playerName, hp: MAX_HP, 
        x: 100, angle: 45 
      }
    };

    try {
      await setDoc(doc(db,'rooms',code), {
        hostId: user.uid, status: 'lobby', wind: 0,
        currentTurnId: null, lastShot: null
      });
      await setDoc(doc(db,'rooms',code,'players','all'), initialPlayers);
      setRoomCode(code);
    } catch(e) {
      console.error(e);
      alert("방 생성 실패 (권한 문제일 수 있음)");
    }
  };

  const handleJoin = async () => {
    if(!playerName) return alert("이름 입력");
    if(!user) return alert("로그인 대기중...");

    const roomRef = doc(db,'rooms',roomCode);
    const snap = await getDoc(roomRef);
    if(!snap.exists()) return alert("방 없음");

    const pRef = doc(db,'rooms',roomCode,'players','all');
    const pSnap = await getDoc(pRef);
    const currentPlayers = pSnap.data() || {};
    
    // 오른쪽 팀으로 참가
    const newPlayers = {
      ...currentPlayers,
      [user.uid]: {
        id: user.uid, name: playerName, hp: MAX_HP,
        x: MAP_WIDTH - 140, angle: 45 
      }
    };
    await setDoc(pRef, newPlayers);
  };

  const startGame = async () => {
    if (!isHost) return;
    const pIds = Object.keys(players);
    if (pIds.length < 2) return alert("2명이 필요합니다.");

    await updateDoc(doc(db, 'rooms', roomCode), {
      status: 'playing',
      currentTurnId: pIds[0], 
      wind: Math.floor(Math.random() * 10) - 5 
    });
  };

  const fireBullet = async () => {
    if (!isMyTurn || isFiring || !user || !players[user.uid]) return;
    setIsFiring(true);

    const isLeft = players[user.uid].x < MAP_WIDTH / 2;
    const rad = (myState.angle * Math.PI) / 180;
    const speed = myState.power * 0.4;
    
    const vx = isLeft ? Math.cos(rad) * speed : -Math.cos(rad) * speed;
    const vy = -Math.sin(rad) * speed;

    bulletRef.current = { 
      active: true, 
      x: players[user.uid].x + TANK_SIZE/2, 
      y: MAP_HEIGHT - 60 - TANK_SIZE, 
      vx, vy 
    };

    await updateDoc(doc(db, 'rooms', roomCode), {
      lastShot: {
        shooterId: user.uid,
        startX: bulletRef.current.x,
        startY: bulletRef.current.y,
        vx, vy,
        timestamp: Date.now()
      }
    });
  };

  const triggerEnemyShot = (shotData) => {
    if (!user || shotData.shooterId === user.uid) return; 
    
    bulletRef.current = {
      active: true,
      x: shotData.startX,
      y: shotData.startY,
      vx: shotData.vx,
      vy: shotData.vy
    };
  };

  const handleExplosion = async (ex, ey, checkHit = true) => {
    bulletRef.current.active = false;
    explosionRef.current = { active: true, x: ex, y: ey, radius: 0 };
    
    // 내가 쏜 경우에만 데미지 판정 (권한/중복 방지)
    if (isMyTurn && isFiring && checkHit && user) {
      let hitDetected = false;
      const newPlayers = { ...players };

      Object.keys(newPlayers).forEach(pid => {
        if (pid === user.uid) return; // 자폭 제외
        
        const p = newPlayers[pid];
        const tankCenter = p.x + TANK_SIZE/2;
        const dist = Math.abs(ex - tankCenter);
        
        if (dist < 40) { 
          hitDetected = true;
          const damage = Math.floor(40 - dist); 
          // 객체 불변성 유지하며 업데이트
          newPlayers[pid] = { ...p, hp: Math.max(0, p.hp - damage) };
        }
      });

      if (hitDetected) {
        await setDoc(doc(db,'rooms',roomCode,'players','all'), newPlayers);
      }
    }
  };

  const finishMyTurn = async () => {
    setIsFiring(false);
    const pIds = Object.keys(players);
    const currIdx = pIds.indexOf(user.uid);
    const nextIdx = (currIdx + 1) % pIds.length;
    
    await updateDoc(doc(db, 'rooms', roomCode), {
      currentTurnId: pIds[nextIdx],
      wind: Math.floor(Math.random() * 11) - 5 
    });
  };

  // --- UI Renders ---
  
  // 로딩 화면 (Auth 초기화 전)
  if (!user && !initError) {
     return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-bold animate-pulse">Connecting...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden flex flex-col">
      
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center h-[60px]">
        <div className="flex items-center gap-2 text-yellow-400 font-black text-xl">
          <Crosshair /> <span>FORTRESS WEB</span>
        </div>
        {isJoined && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-700 px-3 py-1 rounded-full">
               <Wind size={16} className={roomData?.wind > 0 ? "text-blue-400" : "text-red-400"} />
               <span className="font-mono font-bold">WIND: {roomData?.wind > 0 ? `>>> ${roomData.wind}` : `<<< ${Math.abs(roomData?.wind||0)}`}</span>
            </div>
            <button onClick={() => {navigator.clipboard.writeText(roomCode); setCopyStatus(true); setTimeout(()=>setCopyStatus(false),2000)}} className="bg-slate-700 px-3 py-1 rounded text-xs font-bold font-mono">
              ROOM: {roomCode} {copyStatus ? "✓" : ""}
            </button>
          </div>
        )}
      </header>
      
      {/* Init Error Alert */}
      {initError && (
        <div className="bg-red-500 text-white p-2 text-center text-sm font-bold">
           <AlertCircle className="inline w-4 h-4 mb-1 mr-1"/> {initError}
        </div>
      )}

      {/* Main Game Area */}
      <main className="flex-1 relative flex justify-center items-center bg-black">
        {!isJoined ? (
          // Lobby Form
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full space-y-4">
             <h2 className="text-2xl font-black text-white text-center mb-4">입장 준비</h2>
             <input value={playerName} onChange={e=>setPlayerName(e.target.value)} placeholder="닉네임" className="w-full bg-slate-900 border border-slate-600 p-4 rounded-xl font-bold text-white text-lg outline-none focus:border-yellow-400"/>
             {!roomCode && <button onClick={handleCreate} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black py-4 rounded-xl text-lg transition-all">방 만들기</button>}
             <div className="flex gap-2">
               <input value={roomCode} onChange={e=>setRoomCode(e.target.value.toUpperCase())} placeholder="CODE" maxLength={4} className="flex-1 bg-slate-900 text-center font-mono font-bold text-xl rounded-xl border border-slate-600"/>
               <button onClick={handleJoin} className="flex-1 bg-blue-600 hover:bg-blue-500 font-bold rounded-xl">참가</button>
             </div>
          </div>
        ) : (
          roomData?.status === 'lobby' ? (
            // Lobby Waiting
            <div className="text-center space-y-6">
               <div className="text-6xl animate-bounce">🚀</div>
               <h2 className="text-3xl font-black">대기실</h2>
               <div className="flex justify-center gap-4 flex-wrap">
                 {players && Object.values(players).map(p => (
                   <div key={p.id} className="bg-slate-800 p-4 rounded-xl border border-slate-600 min-w-[120px]">
                     <div className={`w-3 h-3 rounded-full mb-2 mx-auto ${p.id===roomData.hostId?'bg-yellow-400':'bg-slate-500'}`}></div>
                     {p.name}
                   </div>
                 ))}
               </div>
               {isHost && <button onClick={startGame} className="bg-green-600 hover:bg-green-500 px-8 py-3 rounded-xl font-black text-xl shadow-lg shadow-green-900/50">START GAME</button>}
            </div>
          ) : (
            // Canvas Game Board
            <div className="relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <canvas 
                ref={canvasRef} 
                width={MAP_WIDTH} 
                height={MAP_HEIGHT} 
                className="bg-sky-200 rounded-xl cursor-crosshair touch-none max-w-full h-auto"
              />
              
              {/* Game Over Screen */}
              {players && Object.values(players).some(p => p.hp <= 0) && (
                 <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-20">
                    <Trophy size={60} className="text-yellow-400 mb-4" />
                    <h2 className="text-4xl font-black text-white mb-2">GAME OVER</h2>
                    <p className="text-xl text-slate-300 font-bold mb-8">
                      {Object.values(players).find(p=>p.hp > 0)?.name} 승리!
                    </p>
                    {isHost && <button onClick={startGame} className="bg-white text-black px-6 py-3 rounded-full font-black hover:scale-105 transition-transform">다시 하기</button>}
                 </div>
              )}

              {/* Turn Indicator Overlay */}
              {!isFiring && (
                <div className="absolute top-10 w-full text-center pointer-events-none">
                  <span className={`inline-block px-6 py-2 rounded-full text-lg font-black shadow-xl border-2 ${isMyTurn ? 'bg-yellow-500 border-yellow-300 text-black scale-110' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                    {isMyTurn ? "YOUR TURN!" : `${players?.[roomData.currentTurnId]?.name || 'Enemy'}'s Turn`}
                  </span>
                </div>
              )}
            </div>
          )
        )}
      </main>

      {/* Controller (Bottom) */}
      {roomData?.status === 'playing' && (
        <div className="bg-slate-800 p-4 border-t border-slate-700 h-[140px] flex items-center justify-center gap-8">
          
          <div className={`flex items-center gap-8 transition-opacity ${isMyTurn && !isFiring ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            
            {/* Angle Control */}
            <div className="flex flex-col items-center gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Angle</label>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl w-12 text-right">{myState.angle}°</span>
                <input 
                  type="range" min="0" max="90" step="1"
                  value={myState.angle}
                  onChange={e => setMyState(p => ({...p, angle: Number(e.target.value)}))}
                  className="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                />
              </div>
            </div>

            {/* Power Control */}
            <div className="flex flex-col items-center gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Power</label>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl w-12 text-right text-red-400">{myState.power}</span>
                <input 
                  type="range" min="10" max="100" step="1"
                  value={myState.power}
                  onChange={e => setMyState(p => ({...p, power: Number(e.target.value)}))}
                  className="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
              </div>
            </div>

            {/* Fire Button */}
            <button 
              onClick={fireBullet}
              className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-500 border-4 border-red-800 shadow-[0_4px_0_rgb(153,27,27)] active:translate-y-1 active:shadow-none flex flex-col items-center justify-center gap-1 transition-all"
            >
              <Flame fill="white" size={24} className="text-white"/>
              <span className="text-[10px] font-black text-white">FIRE</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
