'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, Mic, Camera, Zap, Heart, DollarSign, Users, 
  Shield, ShoppingBag, Trophy, Video, Sparkles, 
  Gift, Crown, ArrowUpCircle, X 
} from 'lucide-react';

// ==================== [게임 데이터] ====================

// 등급별 장비 성능 (C ~ SSR)
const TIERS = {
  C: { name: '구형', color: 'text-gray-400', mult: 1.0, chance: 50 },
  B: { name: '보급형', color: 'text-green-400', mult: 1.5, chance: 30 },
  A: { name: '전문가용', color: 'text-blue-400', mult: 3.0, chance: 15 },
  S: { name: '방송천재', color: 'text-purple-400', mult: 8.0, chance: 4 },
  SSR: { name: '전설의', color: 'text-yellow-400', mult: 20.0, chance: 1 },
};

// 가이드 퀘스트 목록
const QUESTS = [
  { id: 1, text: "방송 1회 하기", target: (p) => p.stats.totalBroadcasts >= 1, reward: { money: 2000, gems: 10 } },
  { id: 2, text: "구독자 100명 달성", target: (p) => p.subs >= 100, reward: { money: 5000, gems: 20 } },
  { id: 3, text: "장비 뽑기 1회 도전", target: (p) => p.stats.totalDraws >= 1, reward: { money: 10000, gems: 30 } },
  { id: 4, text: "구독자 1,000명 달성", target: (p) => p.subs >= 1000, reward: { money: 30000, gems: 50 } },
  { id: 5, text: "B등급 이상 장비 획득", target: (p) => Object.values(p.equip).some(e => ['B','A','S','SSR'].includes(e.tier)), reward: { money: 50000, gems: 100 } },
  { id: 6, text: "구독자 10만명 달성", target: (p) => p.subs >= 100000, reward: { money: 500000, gems: 300 } },
];

const CHAT_MESSAGES = {
  normal: ["안녕하세요!", "ㅎㅇㅎㅇ", "오늘 뭐함?", "밥 먹었나요?", "ㅋㅋㅋ", "오...", "방송 켰다!"],
  good: ["와 대박ㅋㅋㅋ", "미쳤다 ㄷㄷ", "오늘 텐션 무엇?", "구독 박고 갑니다", "사랑해요!!", "형님 충성충성", "❤️❤️❤️"],
  bad: ["노잼;;", "언제 끝남?", "퇴물인가", "이거 왜 봄?", "나가라 그냥", "👎👎👎", "zzz"],
  donation: ["만원 후원 감사합니다!", "치킨값 쏘고 갑니다~", "형 사랑해!!", "오늘도 화이팅!"]
};

// ==================== [메인 컴포넌트] ====================

export default function StreamerTycoonUltimate() {
  const [gameState, setGameState] = useState('title'); 
  const [player, setPlayer] = useState({
    name: '뉴비',
    money: 1000,
    gems: 0, // 유료 재화 (퀘스트 보상)
    subs: 0,
    stress: 0,
    // 장비 슬롯 (현재 등급)
    equip: { cam: { tier: 'C', level: 1 }, mic: { tier: 'C', level: 1 }, pc: { tier: 'C', level: 1 } },
    // 통계 (퀘스트용)
    stats: { totalBroadcasts: 0, totalDraws: 0 }
  });
  
  // 퀘스트 상태
  const [currentQuestIdx, setCurrentQuestIdx] = useState(0);
  const [showQuestComplete, setShowQuestComplete] = useState(false);

  // 방송 상태
  const [streamData, setStreamData] = useState({ timeLeft: 0, chats: [], hype: 0, earned: 0, isActive: false });
  const chatInterval = useRef(null);

  // 시각적 효과 (Floating Text)
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [shake, setShake] = useState(false);

  // 뽑기 연출 상태
  const [drawResult, setDrawResult] = useState(null); // { type: 'mic', tier: 'S' }

  // --- 저장/로딩 ---
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('streamer-ultimate-save');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPlayer(parsed.player);
          setCurrentQuestIdx(parsed.questIdx || 0);
          setGameState('lobby');
        } catch (e) { console.error(e); }
      }
    }
  }, []);

  const saveGame = (newPlayer, questIdx) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('streamer-ultimate-save', JSON.stringify({
        player: newPlayer,
        questIdx: questIdx !== undefined ? questIdx : currentQuestIdx
      }));
    }
  };

  // --- 퀘스트 시스템 ---
  useEffect(() => {
    if (gameState === 'lobby' && QUESTS[currentQuestIdx]) {
      if (QUESTS[currentQuestIdx].target(player)) {
        setShowQuestComplete(true);
      }
    }
  }, [player, gameState, currentQuestIdx]);

  const claimQuest = () => {
    const reward = QUESTS[currentQuestIdx].reward;
    const newPlayer = {
      ...player,
      money: player.money + reward.money,
      gems: player.gems + reward.gems
    };
    setPlayer(newPlayer);
    setCurrentQuestIdx(prev => prev + 1);
    setShowQuestComplete(false);
    saveGame(newPlayer, currentQuestIdx + 1);
    
    // 연출
    addFloatingText(window.innerWidth/2, window.innerHeight/2, `💎 +${reward.gems}`, 'text-blue-400 text-4xl');
    triggerShake();
    alert(`🎉 퀘스트 완료!\n💰 ${reward.money.toLocaleString()}원\n💎 보석 ${reward.gems}개 획득!`);
  };

  // --- 뽑기 시스템 (Gacha) ---
  const drawEquipment = (type) => { // type: 'cam' | 'mic' | 'pc'
    const cost = 3000;
    if (player.money < cost) return alert("돈이 부족합니다! (3,000원 필요)");

    // 확률 계산
    const rand = Math.random() * 100;
    let tier = 'C';
    let cumulative = 0;
    
    for (const [t, data] of Object.entries(TIERS)) {
      cumulative += data.chance;
      if (rand <= cumulative) {
        tier = t;
        break;
      }
    }

    // 결과 적용
    const newPlayer = {
      ...player,
      money: player.money - cost,
      stats: { ...player.stats, totalDraws: player.stats.totalDraws + 1 }
    };

    // 기존보다 등급이 높으면 교체
    const currentTier = player.equip[type].tier;
    const tierValue = { C:1, B:2, A:3, S:4, SSR:5 };
    
    let isUpgrade = false;
    if (tierValue[tier] > tierValue[currentTier]) {
      newPlayer.equip[type] = { tier, level: 1 };
      isUpgrade = true;
    } else if (tierValue[tier] === tierValue[currentTier]) {
      // 같은 등급이면 레벨업 (최대 5강)
      if (newPlayer.equip[type].level < 5) {
        newPlayer.equip[type].level += 1;
        isUpgrade = true; // 강화도 업그레이드로 취급
      }
    }

    setPlayer(newPlayer);
    saveGame(newPlayer);
    setDrawResult({ type, tier, isUpgrade });
    
    if (tier === 'S' || tier === 'SSR') triggerShake();
  };

  // --- 방송 로직 ---
  const startStream = () => {
    if (player.stress >= 100) return alert("스트레스가 심합니다! 휴식하세요.");
    setGameState('streaming');
    
    // 장비 보너스 계산
    const camMult = TIERS[player.equip.cam.tier].mult * (1 + player.equip.cam.level * 0.1);
    const micMult = TIERS[player.equip.mic.tier].mult * (1 + player.equip.mic.level * 0.1);
    
    setStreamData({ timeLeft: 15, chats: [], hype: 50, earned: 0, isActive: true, camMult, micMult });
    chatInterval.current = setInterval(addRandomChat, 800 - (player.equip.pc.tier === 'SSR' ? 400 : 0));
  };

  const addRandomChat = () => {
    const rand = Math.random();
    let type = 'normal', text = '', money = 0;

    if (rand < 0.15) { 
      type = 'donation'; money = Math.floor(Math.random() * 50) * 100 + 1000;
      text = CHAT_MESSAGES.donation[Math.floor(Math.random() * CHAT_MESSAGES.donation.length)];
    } else if (rand < 0.3) {
      type = 'bad'; text = CHAT_MESSAGES.bad[Math.floor(Math.random() * CHAT_MESSAGES.bad.length)];
    } else if (rand < 0.6) {
      type = 'good'; text = CHAT_MESSAGES.good[Math.floor(Math.random() * CHAT_MESSAGES.good.length)];
    } else {
      text = CHAT_MESSAGES.normal[Math.floor(Math.random() * CHAT_MESSAGES.normal.length)];
    }

    setStreamData(prev => {
      const newChats = [...prev.chats, { id: Date.now() + Math.random(), type, text, money }];
      if (newChats.length > 5) newChats.shift();
      return { ...prev, chats: newChats, hype: Math.max(0, prev.hype - 1), earned: prev.earned + money };
    });
  };

  const handleInteraction = (type, e) => {
    if (!streamData.isActive) return;
    
    // 클릭 이펙트
    addFloatingText(e.clientX, e.clientY, type === 'reaction' ? "❤️ HYPE!" : "🛡️ BAN!", type==='reaction'?'text-pink-500':'text-red-500');

    if (type === 'reaction') {
      // 마이크 성능에 따라 호응도 증가량 다름
      const bonus = 5 * streamData.micMult;
      setStreamData(prev => ({ ...prev, hype: Math.min(100, prev.hype + bonus) }));
      setPlayer(prev => ({ ...prev, stress: prev.stress + 2 }));
    } else if (type === 'ban') {
      setStreamData(prev => ({ ...prev, hype: Math.min(100, prev.hype + 5) }));
      setPlayer(prev => ({ ...prev, stress: Math.max(0, prev.stress - 5) }));
    }
  };

  useEffect(() => {
    if (gameState === 'streaming' && streamData.isActive) {
      const timer = setInterval(() => {
        setStreamData(prev => {
          if (prev.timeLeft <= 1) {
            finishStream(prev);
            return { ...prev, timeLeft: 0, isActive: false };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
      return () => { clearInterval(timer); clearInterval(chatInterval.current); };
    }
  }, [gameState, streamData.isActive]);

  const finishStream = (finalData) => {
    clearInterval(chatInterval.current);
    
    // 캠 성능에 따라 구독자 증가량 다름
    const newSubs = Math.floor((finalData.hype * 0.5 * finalData.camMult) + Math.floor(Math.random() * 10));
    // 최종 수익 계산
    const finalMoney = Math.floor(finalData.earned + (finalData.hype * 100 * finalData.micMult));

    setTimeout(() => {
      alert(`🎥 방송 종료!\n💰 수익: ${finalMoney.toLocaleString()}원\n👥 신규 구독자: ${newSubs.toLocaleString()}명`);
      const newPlayer = {
        ...player,
        money: player.money + finalMoney,
        subs: player.subs + newSubs,
        stress: player.stress + 10,
        stats: { ...player.stats, totalBroadcasts: player.stats.totalBroadcasts + 1 }
      };
      setPlayer(newPlayer);
      saveGame(newPlayer);
      setGameState('lobby');
    }, 500);
  };

  // --- 유틸리티 ---
  const addFloatingText = (x, y, text, colorClass) => {
    const id = Date.now();
    setFloatingTexts(prev => [...prev, { id, x, y, text, colorClass }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 1000);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // 렌더링 시작
  return (
    <div className={`min-h-screen bg-slate-900 text-white font-sans select-none overflow-hidden ${shake ? 'animate-shake' : ''}`}>
      <style jsx global>{`
        @keyframes floatUp { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-50px); opacity: 0; } }
        @keyframes shake { 0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 70% { transform: translate(3px, 1px) rotate(-1deg); } 80% { transform: translate(-1px, -1px) rotate(1deg); } 90% { transform: translate(1px, 2px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); } }
        .animate-float { animation: floatUp 1s ease-out forwards; }
        .animate-shake { animation: shake 0.5s; }
      `}</style>

      {/* Floating Texts */}
      {floatingTexts.map(ft => (
        <div key={ft.id} className={`fixed pointer-events-none font-black text-2xl animate-float ${ft.colorClass}`} style={{ left: ft.x, top: ft.y, zIndex: 9999 }}>
          {ft.text}
        </div>
      ))}

      {/* Title Screen */}
      {gameState === 'title' && (
        <div className="h-screen flex flex-col items-center justify-center relative">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-black opacity-80"></div>
          <div className="z-10 text-center">
            <h1 className="text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500 mb-4 drop-shadow-lg">
              STREAMER<br/>ULTIMATE
            </h1>
            <p className="text-xl text-gray-300 mb-8 animate-pulse">터치하여 시작하세요</p>
            <button onClick={() => { setPlayer({...player, name:'스트리머'}); setGameState('lobby'); }} className="px-12 py-5 bg-white text-black font-black rounded-full text-2xl hover:scale-105 transition-transform">
              START
            </button>
          </div>
        </div>
      )}

      {/* Lobby Screen */}
      {gameState === 'lobby' && (
        <div className="max-w-4xl mx-auto p-4 h-screen flex flex-col">
          {/* Top Bar: Resources */}
          <div className="flex justify-between items-center bg-slate-800 p-3 rounded-2xl mb-4 shadow-lg border border-slate-700">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1 bg-black/30 px-3 py-1 rounded-lg">
                 <DollarSign className="text-green-400" size={16}/> <span className="font-mono font-bold text-lg">{player.money.toLocaleString()}</span>
               </div>
               <div className="flex items-center gap-1 bg-black/30 px-3 py-1 rounded-lg">
                 <Gift className="text-blue-400" size={16}/> <span className="font-mono font-bold text-lg">{player.gems.toLocaleString()}</span>
               </div>
            </div>
            <div className="flex items-center gap-1">
               <Users size={16} className="text-pink-400"/> <span className="font-bold">{player.subs.toLocaleString()}</span>
            </div>
          </div>

          {/* Guide Quest Bar */}
          <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-4 rounded-2xl mb-4 shadow-lg flex justify-between items-center border border-white/10 relative overflow-hidden">
            {showQuestComplete && <div className="absolute inset-0 bg-yellow-500/20 animate-pulse"></div>}
            <div>
              <div className="text-xs text-indigo-300 font-bold mb-1">GUIDE QUEST {currentQuestIdx + 1}</div>
              <div className="font-bold text-lg">{QUESTS[currentQuestIdx]?.text || "모든 퀘스트 완료!"}</div>
            </div>
            {showQuestComplete ? (
              <button onClick={claimQuest} className="bg-yellow-400 text-black font-black px-6 py-2 rounded-full animate-bounce shadow-lg">
                보상 받기!
              </button>
            ) : (
              <div className="text-xs text-slate-400 px-4 py-2 bg-black/20 rounded-lg">진행중...</div>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
            {/* Equipment Slots */}
            <div className="bg-slate-800 rounded-3xl p-6 shadow-lg">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2 text-slate-300"><Sparkles size={20}/> 장비 관리</h2>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(player.equip).map(([key, item]) => (
                  <div key={key} className="bg-slate-700 p-3 rounded-xl flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl font-black ${key==='cam'?'bg-blue-500':(key==='mic'?'bg-red-500':'bg-purple-500')}`}>
                        {key==='cam'?<Camera size={20}/>:(key==='mic'?<Mic size={20}/>:<Monitor size={20}/>)}
                      </div>
                      <div>
                        <div className={`font-bold ${TIERS[item.tier].color}`}>
                          [{item.tier}급] {TIERS[item.tier].name} {key.toUpperCase()} (+{item.level})
                        </div>
                        <div className="text-xs text-slate-400">성능 배율: x{(TIERS[item.tier].mult * (1 + item.level*0.1)).toFixed(1)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Gacha Buttons */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {['cam', 'mic', 'pc'].map(type => (
                  <button key={type} onClick={() => drawEquipment(type)} className="bg-slate-900 border border-slate-600 p-2 rounded-xl hover:bg-slate-800 active:scale-95 transition-all">
                    <div className="text-xs text-slate-400 mb-1">{type.toUpperCase()} 뽑기</div>
                    <div className="text-green-400 font-bold text-sm">3,000원</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
               <button onClick={startStream} className="w-full h-32 bg-gradient-to-r from-red-600 to-pink-600 rounded-3xl shadow-lg flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all relative overflow-hidden group">
                 <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <Video size={40} className="text-white drop-shadow-md"/>
                 <span className="text-2xl font-black text-white drop-shadow-md">방송 시작하기</span>
               </button>
               
               <button onClick={() => { setPlayer(p => ({...p, stress: Math.max(0, p.stress-30)})); alert('힐링 완료!'); }} className="w-full h-20 bg-slate-700 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-slate-600">
                 <Heart className="text-pink-400"/> 휴식 (스트레스 -30)
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Gacha Result Modal */}
      {drawResult && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-800 p-8 rounded-3xl text-center max-w-sm w-full border-4 border-slate-600 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            <div className={`text-6xl font-black mb-4 animate-bounce ${TIERS[drawResult.tier].color}`}>
              {drawResult.tier}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{TIERS[drawResult.tier].name} 장비!</h2>
            <p className="text-gray-400 mb-6">{drawResult.isUpgrade ? "🎉 스펙 업그레이드 성공!" : "🔧 강화 재료로 사용됨"}</p>
            <button onClick={() => setDrawResult(null)} className="w-full py-3 bg-white text-black font-black rounded-xl">
              확인
            </button>
          </div>
        </div>
      )}

      {/* Streaming Screen */}
      {gameState === 'streaming' && (
        <div className="h-screen flex flex-col bg-black">
          {/* Main View */}
          <div className="flex-1 relative bg-slate-800 flex items-center justify-center overflow-hidden">
             {/* Dynamic Background based on PC Tier */}
             <div className={`absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070')] bg-cover ${player.equip.pc.tier === 'SSR' ? 'filter hue-rotate-90' : ''}`}></div>
             
             <div className="z-10 text-center">
               <div className="text-9xl animate-pulse drop-shadow-2xl">
                 {streamData.hype > 80 ? "🤩" : (player.stress > 80 ? "🤯" : "😎")}
               </div>
               <div className="mt-4 bg-black/50 px-6 py-2 rounded-full text-white font-mono text-2xl">
                 HYPE: <span className="text-yellow-400 font-black">{streamData.hype}%</span>
               </div>
             </div>

             {/* Floating Controls */}
             <div className="absolute bottom-10 w-full px-8 flex justify-between gap-4">
               <button onClick={(e) => handleInteraction('reaction', e)} className="flex-1 h-24 bg-yellow-500 rounded-3xl font-black text-2xl shadow-[0_6px_0_#b45309] active:translate-y-2 active:shadow-none transition-all flex flex-col items-center justify-center gap-1">
                 <Sparkles size={24}/> 리액션
               </button>
               <button onClick={(e) => handleInteraction('ban', e)} className="flex-1 h-24 bg-red-600 text-white rounded-3xl font-black text-2xl shadow-[0_6px_0_#7f1d1d] active:translate-y-2 active:shadow-none transition-all flex flex-col items-center justify-center gap-1">
                 <Shield size={24}/> 밴 (BAN)
               </button>
             </div>

             {/* Timer */}
             <div className="absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full font-bold animate-pulse flex items-center gap-2">
               <div className="w-2 h-2 bg-white rounded-full"></div> LIVE {streamData.timeLeft}s
             </div>
          </div>

          {/* Chat Box */}
          <div className="h-1/3 bg-black/90 border-t-2 border-slate-700 flex flex-col p-4">
             <div className="flex-1 overflow-y-hidden relative">
                <div className="absolute bottom-0 w-full flex flex-col-reverse gap-2">
                   {streamData.chats.slice(-4).reverse().map(chat => (
                     <div key={chat.id} className={`text-sm p-2 rounded animate-in slide-in-from-left-4 fade-in ${chat.type==='donation' ? 'bg-yellow-900/40 border border-yellow-500/50' : ''}`}>
                       {chat.type === 'donation' && <span className="text-yellow-400 font-bold block">₩ {chat.money.toLocaleString()}</span>}
                       <span className={`font-bold mr-2 ${chat.type==='bad'?'text-red-500':(chat.type==='good'?'text-green-500':'text-slate-400')}`}>
                         {chat.type==='donation'?'👑':(chat.type==='bad'?'👿':'👤')}
                       </span>
                       <span className="text-white">{chat.text}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
