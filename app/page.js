'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../utils/firebase'; // 실제 프로젝트에 맞게 조정 (또는 주석 처리)
import { doc, onSnapshot, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { 
  Lock, Skull, Fingerprint, Search, AlertTriangle, WifiOff, Gavel, UserX, RefreshCw, FileText,
  Shield, Zap, Droplet, Crosshair, Hexagon, Siren, Play
} from 'lucide-react';

// ===================== 상수 & 데이터 =====================
const ROOM_ID = 'room_test'; // 테스트용 고정
const GAME_DURATION = 600; // 10분
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
  { id: 'metal', name: 'Metal Detector', icon: Scan, cost: 40, detect: 'Physical' },
  { id: 'hack', name: 'Signal Trace', icon: Zap, cost: 60, detect: 'Digital' },
];

const CLUES = [
  { id: 'c1', type: 'Location', text: 'Living Room', blur: true },
  { id: 'c2', type: 'Cause', text: 'Loss of Blood', blur: true },
  { id: 'c3', type: 'Weapon', text: '???', blur: true },
];

// ===================== 메인 컴포넌트 =====================
export default function MysteryMurder() {
  const [user, setUser] = useState({ uid: 'test_user', displayName: 'You' }); // 테스트용
  const [gameData, setGameData] = useState({
    gamePhase: 'LOBBY',
    roles: {},
    players: {
      test_user: { displayName: 'You', role: null },
      ai1: { displayName: 'Alex', role: null },
      ai2: { displayName: 'Jordan', role: null },
      ai3: { displayName: 'Taylor', role: null },
    },
    crimeData: { weapon: null },
    logs: [],
    traceRate: 0,
    evidenceList: [],
    truthLogs: [],
    winner: null,
  });

  const [hasSeenRole, setHasSeenRole] = useState(false);
  const [selectedWeapon, setSelectedWeapon] = useState(null);
  const [battery, setBattery] = useState(100);
  const [scanResult, setScanResult] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [decryptedCards, setDecryptedCards] = useState({});
  const [voteTimeLeft, setVoteTimeLeft] = useState(15);
  const [selectedSuspect, setSelectedSuspect] = useState(null);
  const [endStep, setEndStep] = useState(0);
  const [showFinalMessage, setShowFinalMessage] = useState(false);

  // ===================== Firebase 모킹 (실제 배포 시 활성화) =====================
  // useEffect(() => {
  //   const roomRef = doc(db, 'rooms', ROOM_ID);
  //   const unsub = onSnapshot(roomRef, snap => {
  //     if (snap.exists()) setGameData(snap.data());
  //   });
  //   return unsub;
  // }, []);

  // ===================== 역할 배정 (게임 시작 시) =====================
  const startGame = () => {
    const playerIds = Object.keys(gameData.players);
    const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
    const killerId = shuffled[0];

    const newRoles = {};
    playerIds.forEach(id => {
      newRoles[id] = {
        role: id === killerId ? 'Killer' : 'Detective',
        isAlive: true,
        suspicion: 0,
      };
    });

    const evidence = generateCrimeScene(WEAPON_DB.Physical[0]); // 테스트 무기

    setGameData(prev => ({
      ...prev,
      gamePhase: 'ROLE_REVEAL',
      roles: newRoles,
      evidenceList: evidence,
      logs: [{ text: ">>> CASE OPENED", type: 'system' }],
    }));
  };

  // ===================== 증거 섞기 로직 =====================
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

  // ===================== Role Reveal 핸들러 =====================
  const handleRoleConfirmed = () => setHasSeenRole(true);

  // ===================== 무기 선택 핸들러 =====================
  const handleWeaponCommit = (weapon) => {
    setSelectedWeapon(weapon);
    setGameData(prev => ({
      ...prev,
      gamePhase: 'INVESTIGATION',
      crimeData: { weapon },
      logs: [...prev.logs, { text: ">>> INVESTIGATION START", type: 'system_alert' }],
    }));
  };

  // ===================== 스캔 핸들러 =====================
  const handleScan = (cardId) => {
    const card = gameData.evidenceList.find(c => c.id === cardId);
    if (!card || !selectedTool || battery < selectedTool.cost) return;

    setBattery(b => b - selectedTool.cost);
    if (navigator.vibrate) navigator.vibrate(50);

    let msg = "";
    let positive = false;

    if (currentPlayer.role === 'Killer') {
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

    // 공용 로그
    setGameData(prev => ({
      ...prev,
      logs: [...prev.logs, {
        text: `\( {user.displayName} scanned [ \){card.name}] with [${selectedTool.name}]`,
        type: 'scan_action'
      }]
    }));

    setSelectedTool(null);
  };

  // ===================== 투표 타이머 =====================
  useEffect(() => {
    if (gameData.gamePhase === 'VOTING') {
      const timer = setInterval(() => {
        setVoteTimeLeft(t => t > 0 ? t - 1 : 0);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameData.gamePhase]);

  // ===================== 엔딩 로그 재생 =====================
  useEffect(() => {
    if (gameData.gamePhase === 'ENDED' && endStep < gameData.truthLogs.length) {
      const t = setTimeout(() => setEndStep(s => s + 1), 2000);
      return () => clearTimeout(t);
    } else if (endStep >= gameData.truthLogs.length) {
      setTimeout(() => setShowFinalMessage(true), 2500);
    }
  }, [gameData.gamePhase, endStep]);

  const currentPlayer = { role: 'Detective' }; // 테스트용

  // ===================== 렌더링 =====================
  if (gameData.gamePhase === 'LOBBY') {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <h1 className="text-6xl font-black text-red-600 mb-12">MURDER TOOL</h1>
        <button onClick={startGame} className="px-12 py-6 bg-red-700 rounded-xl text-3xl font-bold hover:bg-red-600">
          START GAME
        </button>
      </div>
    );
  }

  if (gameData.gamePhase === 'ROLE_REVEAL' && !hasSeenRole) {
    const isKiller = currentPlayer.role === 'Killer';
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

  if (gameData.gamePhase === 'INVESTIGATION') {
    return (
      <div className="h-screen bg-slate-900 text-white">
        <GameBoard gameData={gameData} currentPlayer={currentPlayer} />
      </div>
    );
  }

  // ... (VotingOverlay와 EndGameScreen도 비슷하게 내부에 포함 가능하나 길이 제한으로 생략)

  return <div>Game Phase: {gameData.gamePhase}</div>;
}
