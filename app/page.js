'use client';

import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, onSnapshot, updateDoc, collection, query, orderBy 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Crosshair, Wind, Flame, Trophy, AlertCircle, Users, Zap
} from 'lucide-react';

// ==================================================================
// [필수] Firebase 설정
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
  
  // 게임 상태
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]); // 배열로 변경 (안정성 확보)
  
  // 내 탱크 상태
  const [myState, setMyState] = useState({ angle: 45, power: 50 });
  const [isFiring, setIsFiring] = useState(false);
  
  // UI 상태
  const [copyStatus, setCopyStatus] = useState(null);
  const [initError, setInitError] = useState(null);
  
  const canvasRef = useRef(null);
  const requestRef = useRef();
  
  // 애니메이션 (Ref로 관리하여 리렌더링 방지)
  const bulletRef = useRef({ active: false, x: 0, y: 0, vx: 0, vy: 0 });
  const explosionRef = useRef({ active: false, x: 0, y: 0, radius: 0 });

  // Helper Flags
  const isJoined = user && players.some(p => p.id === user.uid);
  const isHost = roomData?.hostId === user?.uid;
  const isMyTurn = roomData?.currentTurnId === user?.uid;

  // --- 1. Auth ---
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

  // --- 2. Data Sync (핵심 수정됨) ---
  useEffect(() => {
    if(!user || !roomCode || roomCode.length !== 4 || !db) return;
    
    // A. 방 정보 구독
    const unsubRoom = onSnapshot(doc(db,'rooms',roomCode), s => {
      if(s.exists()) {
        const data = s.data();
        // 적 발사 감지
        if (roomData && data.lastShot?.timestamp !== roomData.lastShot?.timestamp) {
           triggerEnemyShot(data.lastShot);
        }
        setRoomData(data);
      } else {
        setRoomData(null);
      }
    });

    // B. 플레이어 목록 구독 (Collection 방식)
    // 기존의 단일 문서 방식에서 -> 컬렉션 내의 모든 문서(플레이어)를 가져오는 방식으로 변경
    // 이렇게 하면 각자가 자기 문서를 쓰기 때문에 충돌이 안 남.
    const q = query(collection(db, 'rooms', roomCode, 'players'), orderBy('joinedAt'));
    const unsubPlayers = onSnapshot(q, snapshot => {
      const list = [];
      snapshot.forEach(doc => {
        list.push(doc.data());
      });
      setPlayers(list);
    });

    return () => { unsubRoom(); unsubPlayers(); };
  }, [user, roomCode, roomData]); // roomData dependency for shot detection

  // --- 3. Canvas Rendering Loop ---
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas || !roomData) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    
    // Sky & Ground
    const gradient = ctx.createLinearGradient(0, 0, 0, MAP_HEIGHT);
    gradient.addColorStop(0, "#87CEEB"); 
    gradient.addColorStop(1, "#E0F7FA");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    ctx.fillStyle = "#5D4037"; 
    ctx.fillRect(0, MAP_HEIGHT - 60, MAP_WIDTH, 60);
    ctx.fillStyle = "#388E3C"; 
    ctx.fillRect(0, MAP_HEIGHT - 60, MAP_WIDTH, 10);

    // Draw Players
    players.forEach(p => {
      if (p.hp <= 0) return; // 사망

      const x = p.x;
      const y = MAP_HEIGHT - 60 - TANK_SIZE;
      const isMe = user && p.id === user.uid;
      
      // Tank Body
      ctx.fillStyle = isMe ? "#2563EB" : "#DC2626"; // Blue(Me) vs Red(Enemy)
      ctx.fillRect(x, y, TANK_SIZE, TANK_SIZE);
      
      // HP Bar
      ctx.fillStyle = "#000";
      ctx.fillRect(x - 5, y - 15, TANK_SIZE + 10, 6);
      ctx.fillStyle = p.hp > 30 ? "#22c55e" : "#ef4444";
      ctx.fillRect(x - 4, y - 14, (TANK_SIZE + 8) * (p.hp / MAX_HP), 4);

      // Barrel
      ctx.save();
      ctx.translate(x + TANK_SIZE/2, y + TANK_SIZE/2);
      
      // 내 각도는 state에서, 남의 각도는 DB에서(없으면 기본값)
      const angle = isMe ? myState.angle : (p.angle || 45);
      const rad = (angle * Math.PI) / 180;
      
      // 탱크 위치에 따라 포신 방향 결정 (왼쪽팀은 오른쪽 봄, 오른쪽팀은 왼쪽 봄)
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

    // Draw Bullet
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

      // Ground Collision
      if (b.y >= MAP_HEIGHT - 60) handleExplosion(b.x, b.y);
      // Out of bounds
      if (b.x < -100 || b.x > MAP_WIDTH + 100) handleExplosion(b.x, b.y, false); 
    }

    // Draw Explosion
    if (explosionRef.current.active) {
      const e = explosionRef.current;
      e.radius += 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 69, 0, ${1 - e.radius / 40})`; 
      ctx.fill();

      if (e.radius > 40) {
        explosionRef.current.active = false;
        if (isFiring && isMyTurn) finishMyTurn();
      }
    }

    requestRef.current = requestAnimationFrame(renderGame);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(renderGame);
    return () => cancelAnimationFrame(requestRef.current);
  }, [roomData, players, myState, isFiring, user]);

  // --- Logic Functions ---

  const handleCreate = async () => {
    if(!playerName) return alert("이름을 입력하세요");
    if(!user) return alert("로그인 중입니다...");
    
    const code = Math.random().toString(36).substring(2,6).toUpperCase();
    
    try {
      // 1. 방 생성
      await setDoc(doc(db,'rooms',code), {
        hostId: user.uid, status: 'lobby', wind: 0,
        currentTurnId: null, lastShot: null
      });

      // 2. 플레이어 추가 (개별 문서 생성)
      await setDoc(doc(db,'rooms',code,'players',user.uid), {
        id: user.uid, name: playerName, hp: MAX_HP, 
        x: 100, angle: 45, joinedAt: Date.now()
      });
      
      setRoomCode(code);
    } catch(e) {
      console.error(e);
      alert("방 생성 실패: 권한 설정을 확인하세요.");
    }
  };

  const handleJoin = async () => {
    if(!playerName) return alert("이름 입력");
    if(!user) return alert("로그인 중입니다...");

    const roomRef = doc(db,'rooms',roomCode);
    const snap = await getDoc(roomRef);
    if(!snap.exists()) return alert("방이 없습니다.");
    
    // 게스트는 오른쪽 위치 (700)
    // 랜덤 요소 약간 추가하여 겹침 방지
    const randomX = 600 + Math.floor(Math.random() * 100);

    // 플레이어 문서 추가
    await setDoc(doc(db,'rooms',roomCode,'players',user.uid), {
      id: user.uid, name: playerName, hp: MAX_HP,
      x: randomX, angle: 45, joinedAt: Date.now()
    });
  };

  const startGame = async () => {
    if (!isHost) return;
    if (players.length < 2) return alert("최소 2명이 필요합니다.");

    // 첫 번째 플레이어부터 시작
    await updateDoc(doc(db, 'rooms', roomCode), {
      status: 'playing',
      currentTurnId: players[0].id, 
      wind: Math.floor(Math.random() * 10) - 5 
    });
  };

  const fireBullet = async () => {
    if (!isMyTurn || isFiring || !user) return;
    
    const myPlayer = players.find(p => p.id === user.uid);
    if (!myPlayer) return;

    setIsFiring(true);

    const isLeft = myPlayer.x < MAP_WIDTH / 2;
    const rad = (myState.angle * Math.PI) / 180;
    const speed = myState.power * 0.4;
    
    const vx = isLeft ? Math.cos(rad) * speed : -Math.cos(rad) * speed;
    const vy = -Math.sin(rad) * speed;

    bulletRef.current = { 
      active: true, 
      x: myPlayer.x + TANK_SIZE/2, 
      y: MAP_HEIGHT - 60 - TANK_SIZE, 
      vx, vy 
    };

    // 발사 정보 공유
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
    
    // 히트 판정은 '쏘는 사람'이 계산해서 DB 업데이트
    if (isMyTurn && isFiring && checkHit && user) {
      players.forEach(async (p) => {
        if (p.id === user.uid) return; // 자폭 제외
        
        const tankCenter = p.x + TANK_SIZE/2;
        const dist = Math.abs(ex - tankCenter);
        
        if (dist < 40) { 
          const damage = Math.floor(40 - dist);
          const newHp = Math.max(0, p.hp - damage);
          
          // 해당 플레이어 문서만 업데이트
          await updateDoc(doc(db, 'rooms', roomCode, 'players', p.id), { hp: newHp });
        }
      });
    }
  };

  const finishMyTurn = async () => {
    setIsFiring(false);
    
    // 다음 턴 찾기
    const currIdx = players.findIndex(p => p.id === user.uid);
    const nextIdx = (currIdx + 1) % players.length;
    const nextPlayer = players[nextIdx];

    await updateDoc(doc(db, 'rooms', roomCode), {
      currentTurnId: nextPlayer.id,
      wind: Math.floor(Math.random() * 11) - 5 
    });
  };

  // --- UI Renders ---
  
  if (!user && !initError) {
     return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-bold animate-pulse">Connecting to Game Server...</div>;
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
               
               {/* Player List */}
               <div className="flex justify-center gap-4 flex-wrap">
                 {players.length === 0 && <span className="text-slate-500">플레이어 로딩 중...</span>}
                 {players.map(p => (
                   <div key={p.id} className="bg-slate-800 p-4 rounded-xl border border-slate-600 min-w-[120px] animate-in zoom-in">
                     <div className={`w-3 h-3 rounded-full mb-2 mx-auto ${p.id===roomData.hostId?'bg-yellow-400':'bg-slate-500'}`}></div>
                     <div className="flex flex-col items-center">
                        <Users size={24} className="text-slate-400 mb-2"/>
                        <span className="font-bold">{p.name}</span>
                        {p.id === user.uid && <span className="text-[10px] text-green-400">ME</span>}
                     </div>
                   </div>
                 ))}
               </div>
               
               {isHost ? (
                  <button onClick={startGame} className="bg-green-600 hover:bg-green-500 px-8 py-3 rounded-xl font-black text-xl shadow-lg shadow-green-900/50 flex items-center gap-2 mx-auto">
                    <Zap size={24} fill="currentColor"/> START GAME
                  </button>
               ) : (
                  <div className="text-slate-500 font-bold animate-pulse">방장의 시작을 기다리는 중...</div>
               )}
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
              {players.some(p => p.hp <= 0) && (
                 <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-20">
                    <Trophy size={60} className="text-yellow-400 mb-4" />
                    <h2 className="text-4xl font-black text-white mb-2">GAME OVER</h2>
                    <p className="text-xl text-slate-300 font-bold mb-8">
                      {players.find(p=>p.hp > 0)?.name} 승리!
                    </p>
                    {isHost && <button onClick={startGame} className="bg-white text-black px-6 py-3 rounded-full font-black hover:scale-105 transition-transform">다시 하기</button>}
                 </div>
              )}

              {/* Turn Indicator Overlay */}
              {!isFiring && (
                <div className="absolute top-10 w-full text-center pointer-events-none">
                  <span className={`inline-block px-6 py-2 rounded-full text-lg font-black shadow-xl border-2 ${isMyTurn ? 'bg-yellow-500 border-yellow-300 text-black scale-110' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                    {isMyTurn ? "YOUR TURN!" : `${players.find(p=>p.id===roomData?.currentTurnId)?.name || 'Enemy'}'s Turn`}
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
