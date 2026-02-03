'use client';

import React, { useState, useEffect } from 'react';
import { 
  Lock, Skull, Fingerprint, Search, AlertTriangle, WifiOff, Gavel, UserX, RefreshCw, FileText,
  Shield, Zap, Droplet, Play
} from 'lucide-react';

// ===================== 상수 & 데이터 =====================
const GAME_DURATION = 600; // 10분 (초)
const WEAPON_DB = {
  Physical: [
    { id: 'w_knife', name: 'Ceramic Blade', desc: '금속 탐지기 회피 가능', hint: 'Clean Cut', type: 'Physical' },
    { id: 'w_glass', name: 'Broken Shard', desc: '주변에서 흔히 볼 수 있음', hint: 'Jagged Wound', type: 'Physical' },
    { id: 'w_scalpel', name: 'Surgical Scalpel', desc: '매우 예리함', hint: 'Precision Cut', type: 'Physical' },
    { id: 'w_scissor', name: 'Rusted Scissors', desc: '오래된 가정용 도구', hint: 'Rough Puncture', type: 'Physical' },
  ],
  Chemical: [
    { id: 'w_neuro', name: 'Neurotoxin', desc: '신경 마비 유발', hint: 'No External Marks', type: 'Chemical' },
    { id: 'w_pills', name: 'Sleeping Pills', desc: '다량 복용 흔적', hint: 'Foaming Mouth', type: 'Chemical' },
  ],
  Digital: [
    { id: 'w_hack', name: 'Pacemaker Hack', desc: '심장 박동기 조작', hint: 'Cardiac Arrest', type: 'Digital' },
  ]
};

const TOOLS = [
  { id: 'luminol', name: 'Luminol', icon: Droplet, cost: 50, detect: 'Chemical' },
  { id: 'metal', name: 'Metal Detector', icon: Search, cost: 40, detect: 'Physical' },
  { id: 'hack', name: 'Signal Trace', icon: Zap, cost: 60, detect: 'Digital' },
];

const CLUES = [
  { id: 'c1', type: 'Location', text: 'Living Room', blur: true },
  { id: 'c2', type: 'Cause', text: 'Loss of Blood', blur: true },
  { id: 'c3', type: 'Weapon', text: '???', blur: true },
];

// ===================== 메인 컴포넌트 =====================
export default function MysteryMurder() {
  const [phase, setPhase] = useState('LOBBY'); // LOBBY, ROLE_REVEAL, SETUP, INVESTIGATION, VOTING, ENDED
  const [players, setPlayers] = useState([
    { id: 'p1', name: 'You', role: null, isKiller: false },
    { id: 'p2', name: 'Alex', role: null, isKiller: false },
    { id: 'p3', name: 'Jordan', role: null, isKiller: false },
    { id: 'p4', name: 'Taylor', role: null, isKiller: false },
  ]);
  const [myId, setMyId] = useState('p1'); // 나 자신
  const [hasSeenRole, setHasSeenRole] = useState(false);
  const [selectedWeapon, setSelectedWeapon] = useState(null);
  const [traceRate, setTraceRate] = useState(0);
  const [evidenceList, setEvidenceList] = useState([]);
  const [battery, setBattery] = useState(100);
  const [scanResult, setScanResult] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [decryptedCards, setDecryptedCards] = useState({});
  const [voteTimeLeft, setVoteTimeLeft] = useState(15);
  const [selectedSuspect, setSelectedSuspect] = useState(null);
  const [endStep, setEndStep] = useState(0);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [truthLogs, setTruthLogs] = useState([]);
  const [winner, setWinner] = useState(null);

  // 역할 배정
  const startGame = () => {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const killer = shuffled[0];
    const newPlayers = players.map(p => ({
      ...p,
      role: p.id === killer.id ? 'Killer' : 'Detective',
      isKiller: p.id === killer.id,
    }));

    const realWeapon = WEAPON_DB.Physical[0]; // 테스트용
    const evidence = generateCrimeScene(realWeapon);

    setPlayers(newPlayers);
    setEvidenceList(evidence);
    setPhase('ROLE_REVEAL');
    setTruthLogs([{ time: new Date().toLocaleTimeString(), text: 'Case Opened', type: 'system' }]);
  };

  // 증거 섞기
  const generateCrimeScene = (realWeapon) => {
    const category = realWeapon.type || 'Physical';
    const categoryItems = WEAPON_DB[category] || [];
    const dummies = categoryItems
      .filter(item => item.id !== realWeapon.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const list = [realWeapon, ...dummies];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    return list.map(item => ({
      ...item,
      isReal: item.id === realWeapon.id,
      isDecrypted: false,
    }));
  };

  // Trace Rate 증가 (살인자 화면용)
  useEffect(() => {
    if (phase === 'SETUP' && players.find(p => p.id === myId)?.isKiller) {
      const interval = setInterval(() => {
        setTraceRate(prev => Math.min(99.99, prev + Math.random() * 0.05));
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase]);

  // 투표 타이머
  useEffect(() => {
    if (phase === 'VOTING') {
      const timer = setInterval(() => {
        setVoteTimeLeft(t => t > 0 ? t - 1 : 0);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase]);

  // 엔딩 로그 재생
  useEffect(() => {
    if (phase === 'ENDED' && endStep < truthLogs.length) {
      const t = setTimeout(() => setEndStep(s => s + 1), 2000);
      return () => clearTimeout(t);
    } else if (endStep >= truthLogs.length) {
      setTimeout(() => setShowFinalMessage(true), 2500);
    }
  }, [phase, endStep, truthLogs]);

  const myRole = players.find(p => p.id === myId)?.role || 'Detective';

  // ===================== 핸들러 =====================
  const handleRoleConfirmed = () => setHasSeenRole(true);

  const handleWeaponCommit = (weapon) => {
    setSelectedWeapon(weapon);
    setPhase('INVESTIGATION');
    setTruthLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), text: 'Investigation Started', type: 'system' }]);
  };

  const handleScan = (cardId) => {
    const card = evidenceList.find(c => c.id === cardId);
    if (!card || !selectedTool || battery < selectedTool.cost) return;

    setBattery(b => Math.max(0, b - selectedTool.cost));
    if (navigator.vibrate) navigator.vibrate(50);

    let msg = "";
    let positive = false;

    if (myRole === 'Killer') {
      msg = "SCAN COMPLETE. RESULT: [ENCRYPTED]";
      positive = Math.random() > 0.5;
    } else {
      positive = card.type === selectedTool.detect;
      msg = positive 
        ? `[POSITIVE] ${selectedTool.name} Reaction Detected!`
        : `[NEGATIVE] No reaction from ${selectedTool.name}.`;
    }

    setScanResult({ msg, positive });
    setTimeout(() => setScanResult(null), 4000);

    setSelectedTool(null);
  };

  const handleVote = (targetId) => {
    setSelectedSuspect(targetId);
    // 여기서 실제 투표 로직 (모킹)
    setTimeout(() => {
      setPhase('ENDED');
      setWinner('Killer'); // 테스트용
      setTruthLogs([
        { time: '00:01', text: '탐정 A가 세라믹 칼을 스캔 → POSITIVE', type: 'truth' },
        { time: '00:05', text: '살인자가 "반응 없음"이라고 채팅', type: 'lie' },
        { time: '00:10', text: '투표 결과: 무고한 시민 처형', type: 'verdict' },
      ]);
    }, 1000);
  };

  // ===================== 렌더링 =====================
  if (phase === 'LOBBY') {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <h1 className="text-6xl font-black text-red-600 mb-12">MURDER TOOL</h1>
        <button onClick={startGame} className="px-12 py-6 bg-red-700 rounded-xl text-3xl font-bold hover:bg-red-600">
          START GAME
        </button>
      </div>
    );
  }

  if (phase === 'ROLE_REVEAL' && !hasSeenRole) {
    const isKiller = myRole === 'Killer';
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h2 className={`text-6xl font-black ${isKiller ? 'text-red-600 animate-pulse' : 'text-blue-400'}`}>
            {isKiller ? 'KILLER' : 'DETECTIVE'}
          </h2>
          <p className="mt-8 text-xl">{isKiller ? '살의가 감지되었습니다.' : '용의자가 숨어있습니다.'}</p>
          <button onClick={handleRoleConfirmed} className="mt-12 px-8 py-4 bg-gray-800 rounded-xl text-2xl">
            CONTINUE
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'INVESTIGATION') {
    return (
      <div className="h-screen bg-slate-900 text-white p-4">
        <h1 className="text-3xl font-black text-center mb-4">Crime Scene</h1>
        {/* 실루엣 오프닝 생략, 바로 증거 */}
        <div className="grid grid-cols-2 gap-4">
          {evidenceList.map(card => (
            <div key={card.id} onClick={() => handleScan(card.id)} className={`p-4 rounded border ${decryptedCards[card.id] ? 'bg-slate-700' : 'bg-black blur-sm'}`}>
              {card.name}
            </div>
          ))}
        </div>
        {/* 도구 툴바 */}
        <div className="fixed bottom-0 left-0 right-0 bg-black p-4 flex gap-2">
          {TOOLS.map(tool => (
            <button key={tool.id} onClick={() => setSelectedTool(tool)} className="bg-gray-800 p-2 rounded">
              <tool.icon />
            </button>
          ))}
        </div>
        {scanResult && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-gray-900 p-4 rounded">{scanResult.msg}</div>}
      </div>
    );
  }

  if (phase === 'VOTING') {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
        <h2 className="text-4xl font-black mb-8">JUDGMENT</h2>
        <p className="text-xl mb-4">Time Left: {voteTimeLeft}s</p>
        <div className="grid grid-cols-2 gap-4">
          {players.map(p => (
            <button key={p.id} onClick={() => handleVote(p.id)} className="bg-gray-800 p-6 rounded-xl text-2xl">
              {p.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (phase === 'ENDED') {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-5xl font-black mb-8">{winner === 'Killer' ? 'KILLER ESCAPED' : 'CASE CLOSED'}</h1>
        <div className="space-y-4">
          {truthLogs.slice(0, endStep).map((log, i) => (
            <div key={i} className="text-lg">{log.text}</div>
          ))}
        </div>
        {showFinalMessage && (
          <p className="text-3xl font-black text-red-600 mt-12">
            "YOUR DOUBT WAS THEIR SHARPEST WEAPON."
          </p>
        )}
        <button onClick={() => setPhase('LOBBY')} className="mt-12 px-8 py-4 bg-gray-800 rounded-xl text-2xl">
          PLAY AGAIN
        </button>
      </div>
    );
  }

  return <div className="h-screen bg-black text-white flex items-center justify-center">Loading...</div>;
          }
