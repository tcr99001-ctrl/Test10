'use client';

import React, { useState, useEffect, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, onSnapshot, updateDoc, collection, query, orderBy, getDoc 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Crosshair, Wind, Flame, Trophy, AlertCircle, Users, Zap, Link as LinkIcon, CheckCircle2
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
  
  const [roomData, setRoomData] = useState(null);
  const [players, setPlayers] = useState([]); 
  
  const [myState, setMyState] = useState({ angle: 45, power: 50 });
  const [isFiring, setIsFiring] = useState(false);
  
  const [copyStatus, setCopyStatus] = useState(null);
  const [initError, setInitError] = useState(null);
  
  // URL로 바로 들어왔는지 체크
  const [isInviteMode, setIsInviteMode] = useState(false);

  const canvasRef = useRef(null);
  const requestRef = useRef();
  
  const bulletRef = useRef({ active: false, x: 0, y: 0, vx: 0, vy: 0 });
  const explosionRef = useRef({ active: false, x: 0, y: 0, radius: 0 });

  const isJoined = user && players.some(p => p.id === user.uid);
  const isHost = roomData?.hostId === user?.uid;
  const isMyTurn = roomData?.currentTurnId === user?.uid;

  // --- 1. Auth & URL Check ---
  useEffect(() => {
    // 1. URL 파라미터 확인 (?room=CODE)
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const code = p.get('room');
      if (code) {
        setRoomCode(code.toUpperCase());
        setIsInviteMode(true); // 초대 모드 활성화
      }
    }

    // 2. 익명 로그인
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
        if (roomData && data.lastShot?.timestamp !== roomData.lastShot?.timestamp) {
           triggerEnemyShot(data.lastShot);
        }
        setRoomData(data);
      } else {
        setRoomData(null);
      }
    });

    // 플레이어 목록 구독
    const q = query(collection(db, 'rooms', roomCode, 'players'), orderBy('joinedAt'));
    const unsubPlayers = onSnapshot(q, snapshot => {
      const list = [];
      snapshot.forEach(doc => list.push(doc.data()));
      setPlayers(list);
    });

    return () => { unsubRoom(); unsubPlayers(); };
  }, [user, roomCode, roomData]);

  // --- 3. Canvas Logic (동일) ---
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas || !roomData) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    
    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, MAP_HEIGHT);
    gradient.addColorStop(0, "#87CEEB"); gradient.addColorStop(1, "#E0F7FA");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Ground
    ctx.fillStyle = "#5D4037"; ctx.fillRect(0, MAP_HEIGHT - 60, MAP_WIDTH, 60);
    ctx.fillStyle = "#388E3C"; ctx.fillRect(0, MAP_HEIGHT - 60, MAP_WIDTH, 10);

    // Players
    players.forEach(p => {
      if (p.hp <= 0) return;
      const x = p.x;
      const y = MAP_HEIGHT - 60 - TANK_SIZE;
      const isMe = user && p.id === user.uid;
      
      ctx.fillStyle = isMe ? "#2563EB" : "#DC2626"; 
      ctx.fillRect(x, y, TANK_SIZE, TANK_SIZE);
      
      ctx.fillStyle = "#000"; ctx.fillRect(x - 5, y - 15, TANK_SIZE + 10, 6);
      ctx.fillStyle = p.hp > 30 ? "#22c55e" : "#ef4444";
      ctx.fillRect(x - 4, y - 14, (TANK_SIZE + 8) * (p.hp / MAX_HP), 4);

      ctx.save();
      ctx.translate(x + TANK_SIZE/2, y + TANK_SIZE/2);
      const angle = isMe ? myState.angle : (p.angle || 45);
      const rad = (angle * Math.PI) / 180;
      const dir = x < MAP_WIDTH/2 ? 1 : -1; 
      ctx.rotate(dir === 1 ? -rad : rad);
      ctx.fillStyle = "#333"; ctx.fillRect(0, -4, 30, 8); 
      ctx.restore();

      ctx.fillStyle = "#1e293b"; ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center"; ctx.fillText(p.name, x + TANK_SIZE/2, y + 20 + TANK_SIZE);
    });

    // Bullet
    if (bulletRef.current.active) {
      const b = bulletRef.current;
      b.x += b.vx; b.y += b.vy; b.vy += GRAVITY; b.vx += (roomData.wind || 0) * 0.005; 
      ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#000"; ctx.fill();
      if (b.y >= MAP_HEIGHT - 60) handleExplosion(b.x, b.y);
      if (b.x < -100 || b.x > MAP_WIDTH + 100) handleExplosion(b.x, b.y, false); 
    }

    // Explosion
    if (explosionRef.current.active) {
      const e = explosionRef.current; e.radius += 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 69, 0, ${1 - e.radius / 40})`; ctx.fill();
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

  const copyInviteLink = () => {
    if (typeof window === 'undefined') return;
    // 현재 URL이 ?room=... 이면 그대로 복사, 아니면 만들어서 복사
    const baseUrl = window.location.origin + window.location.pathname;
    const inviteUrl = `${baseUrl}?room=${roomCode}`;
    
    navigator.clipboard.writeText(inviteUrl);
    setCopyStatus(true);
    setTimeout(()=>setCopyStatus(false), 2000);
  };

  const handleCreate = async () => {
    if(!playerName) return alert("닉네임을 입력하세요");
    if(!user) return alert("서버 연결 중...");
    
    const code = Math.random().toString(36).substring(2,6).toUpperCase();
    try {
      await setDoc(doc(db,'rooms',code), {
        hostId: user.uid, status: 'lobby', wind: 0,
        currentTurnId: null, lastShot: null
      });
      await setDoc(doc(db,'rooms',code,'players',user.uid), {
        id: user.uid, name: playerName, hp: MAX_HP, 
        x: 100, angle: 45, joinedAt: Date.now()
      });
      setRoomCode(code);
    } catch(e) {
      alert("방 생성 실패. (Firestore 규칙을 확인하세요)");
    }
  };

  const handleJoin = async () => {
    if(!playerName) return alert("닉네임을 입력하세요");
    if(!user) return alert("서버 연결 중...");

    // 방 존재 여부 확인
    const roomRef = doc(db,'rooms',roomCode);
    const snap = await getDoc(roomRef);
    if(!snap.exists()) return alert("존재하지 않는 방입니다 코드를 확인하세요.");

    // 이미 참가자인지 확인 (중복 입장 방지)
    const playerRef = doc(db, 'rooms', roomCode, 'players', user.uid);
    const pSnap = await getDoc(playerRef);
    
    if (pSnap.exists()) {
       // 이미 있으면 그냥 통과 (재접속)
    } else {
       // 없으면 새로 생성 (오른쪽 위치)
       const randomX = 600 + Math.floor(Math.random() * 100);
       await setDoc(playerRef, {
        id: user.uid, name: playerName, hp: MAX_HP,
        x: randomX, angle: 45, joinedAt: Date.now()
      });
    }
  };

  const startGame = async () => {
    if (!isHost) return;
    if (players.length < 2) return alert("최소 2명이 필요합니다.");
    await updateDoc(doc(db, 'rooms', roomCode), {
      status: 'playing', currentTurnId: players[0].id, wind: Math.floor(Math.random() * 10) - 5 
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

    bulletRef.current = { active: true, x: myPlayer.x + TANK_SIZE/2, y: MAP_HEIGHT - 60 - TANK_SIZE, vx, vy };

    await updateDoc(doc(db, 'rooms', roomCode), {
      lastShot: { shooterId: user.uid, startX: bulletRef.current.x, startY: bulletRef.current.y, vx, vy, timestamp: Date.now() }
    });
  };

  const triggerEnemyShot = (shotData) => {
    if (!user || shotData.shooterId === user.uid) return; 
    bulletRef.current = { active: true, x: shotData.startX, y: shotData.startY, vx: shotData.vx, vy: shotData.vy };
  };

  const handleExplosion = async (ex, ey, checkHit = true) => {
    bulletRef.current.active = false;
    explosionRef.current = { active: true, x: ex, y: ey, radius: 0 };
    if (isMyTurn && isFiring && checkHit && user) {
      players.forEach(async (p) => {
        if (p.id === user.uid) return; 
        const dist = Math.abs(ex - (p.x + TANK_SIZE/2));
        if (dist < 40) { 
          const dmg = Math.floor(40 - dist);
          await updateDoc(doc(db, 'rooms', roomCode, 'players', p.id), { hp: Math.max(0, p.hp - dmg) });
        }
      });
    }
  };

  const finishMyTurn = async () => {
    setIsFiring(false);
    const currIdx = players.findIndex(p => p.id === user.uid);
    const nextIdx = (currIdx + 1) % players.length;
    await updateDoc(doc(db, 'rooms', roomCode), {
      currentTurnId: players[nextIdx].id, wind: Math.floor(Math.random() * 11) - 5 
    });
  };

  // --- UI Renders ---
  
  if (!user && !initError) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-bold animate-pulse">Connecting...</div>;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden flex flex-col">
      
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 flex justify-between items-center h-[60px]">
        <div className="flex items-center gap-2 text-yellow-400 font-black text-xl">
          <Crosshair /> <span>FORTRESS</span>
        </div>
        {isJoined && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-700 px-3 py-1 rounded-full text-xs font-mono font-bold">
               <Wind size={14} className={roomData?.wind > 0 ? "text-blue-400" : "text-red-400"} />
               {roomData?.wind}
            </div>
            <button onClick={copyInviteLink} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all">
              {copyStatus ? <CheckCircle2 size={14}/> : <LinkIcon size={14}/>}
              {copyStatus ? "복사됨!" : "초대 링크 복사"}
            </button>
          </div>
        )}
      </header>
      
      {initError && <div className="bg-red-500 text-white p-2 text-center text-sm font-bold"><AlertCircle className="inline w-4 h-4 mr-1"/> {initError}</div>}

      <main className="flex-1 relative flex justify-center items-center bg-black">
        {!isJoined ? (
          // === 입장 화면 (Lobby Form) ===
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full space-y-4 animate-in zoom-in-95">
             <h2 className="text-2xl font-black text-white text-center mb-6">
               {isInviteMode ? "초대를 받으셨군요!" : "포트리스 게임 입장"}
             </h2>
             
             <input value={playerName} onChange={e=>setPlayerName(e.target.value)} placeholder="닉네임 입력" className="w-full bg-slate-900 border border-slate-600 p-4 rounded-xl font-bold text-white text-lg outline-none focus:border-yellow-400"/>
             
             {isInviteMode ? (
               // 링크로 들어온 경우: 입장 버튼만 표시
               <button onClick={handleJoin} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl text-lg shadow-lg transition-all flex items-center justify-center gap-2">
                 🚀 바로 입장하기
               </button>
             ) : (
               // 일반 접속인 경우: 방 만들기 / 코드 입력 표시
               <>
                 <button onClick={handleCreate} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-black py-4 rounded-xl text-lg transition-all">방 만들기</button>
                 <div className="flex gap-2 pt-2 border-t border-slate-700">
                   <input value={roomCode} onChange={e=>setRoomCode(e.target.value.toUpperCase())} placeholder="참가 코드" maxLength={4} className="flex-1 bg-slate-900 text-center font-mono font-bold text-xl rounded-xl border border-slate-600 outline-none focus:border-blue-500"/>
                   <button onClick={handleJoin} className="flex-1 bg-slate-700 hover:bg-slate-600 font-bold rounded-xl text-white">코드 입장</button>
                 </div>
               </>
             )}
          </div>
        ) : (
          roomData?.status === 'lobby' ? (
            // === 대기실 (Waiting Room) ===
            <div className="text-center space-y-6 w-full max-w-4xl p-4">
               <div className="text-6xl animate-bounce">🛡️</div>
               <h2 className="text-3xl font-black text-white">대기실 <span className="text-slate-500 text-lg">({players.length}명 접속 중)</span></h2>
               
               <div className="flex justify-center gap-4 flex-wrap min-h-[120px]">
                 {players.map(p => (
                   <div key={p.id} className="bg-slate-800 p-4 rounded-xl border border-slate-600 min-w-[120px] animate-in slide-in-from-bottom-2">
                     <div className={`w-3 h-3 rounded-full mb-2 mx-auto ${p.id===roomData.hostId?'bg-yellow-400 shadow-[0_0_10px_yellow]':'bg-slate-500'}`}></div>
                     <div className="flex flex-col items-center">
                        <Users size={24} className="text-slate-400 mb-2"/>
                        <span className="font-bold text-white">{p.name}</span>
                        {p.id === user.uid && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full mt-1">ME</span>}
                     </div>
                   </div>
                 ))}
               </div>
               
               {isHost ? (
                  <button onClick={startGame} className="bg-green-600 hover:bg-green-500 px-10 py-4 rounded-2xl font-black text-xl shadow-xl shadow-green-900/40 flex items-center gap-2 mx-auto transition-transform hover:scale-105 active:scale-95">
                    <Zap size={24} fill="currentColor"/> 게임 시작
                  </button>
               ) : (
                  <div className="text-slate-500 font-bold animate-pulse bg-slate-800/50 py-3 rounded-xl max-w-sm mx-auto">방장이 곧 게임을 시작합니다...</div>
               )}
            </div>
          ) : (
            // === 게임 화면 (Game Canvas) ===
            <div className="relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <canvas ref={canvasRef} width={MAP_WIDTH} height={MAP_HEIGHT} className="bg-sky-200 rounded-xl cursor-crosshair touch-none max-w-full h-auto"/>
              
              {players.some(p => p.hp <= 0) && (
                 <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl z-20 animate-in fade-in">
                    <Trophy size={60} className="text-yellow-400 mb-4 animate-bounce" />
                    <h2 className="text-4xl font-black text-white mb-2">GAME OVER</h2>
                    <p className="text-2xl text-green-400 font-black mb-8">{players.find(p=>p.hp > 0)?.name} 승리!</p>
                    {isHost && <button onClick={startGame} className="bg-white text-black px-8 py-3 rounded-full font-black hover:scale-105 transition-transform">다시 하기</button>}
                 </div>
              )}

              {!isFiring && (
                <div className="absolute top-8 w-full text-center pointer-events-none">
                  <span className={`inline-block px-8 py-3 rounded-full text-xl font-black shadow-2xl border-4 ${isMyTurn ? 'bg-yellow-500 border-yellow-300 text-black scale-110 animate-pulse' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                    {isMyTurn ? "🎯 당신 차례입니다!" : `${players.find(p=>p.id===roomData?.currentTurnId)?.name || '상대방'}의 차례`}
                  </span>
                </div>
              )}
            </div>
          )
        )}
      </main>

      {/* Controller */}
      {roomData?.status === 'playing' && (
        <div className="bg-slate-800 p-4 border-t border-slate-700 h-[140px] flex items-center justify-center gap-8">
          <div className={`flex items-center gap-8 transition-all duration-300 ${isMyTurn && !isFiring ? 'opacity-100 scale-100' : 'opacity-40 scale-95 pointer-events-none grayscale'}`}>
            <div className="flex flex-col items-center gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Angle</label>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl w-12 text-right text-yellow-400">{myState.angle}°</span>
                <input type="range" min="0" max="90" step="1" value={myState.angle} onChange={e => setMyState(p => ({...p, angle: Number(e.target.value)}))} className="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"/>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Power</label>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl w-12 text-right text-red-400">{myState.power}</span>
                <input type="range" min="10" max="100" step="1" value={myState.power} onChange={e => setMyState(p => ({...p, power: Number(e.target.value)}))} className="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-red-500"/>
              </div>
            </div>
            <button onClick={fireBullet} className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 border-4 border-red-900 shadow-[0_4px_0_rgb(69,10,10)] active:translate-y-1 active:shadow-none flex flex-col items-center justify-center gap-1 transition-all">
              <Flame fill="white" size={28} className="text-white"/>
              <span className="text-[10px] font-black text-white">FIRE</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
