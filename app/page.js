'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Monitor, Mic, Camera, Zap, Heart, DollarSign, Users, 
  ArrowUp, MessageCircle, X, Shield, ShoppingBag, 
  Trophy, Home, Play, Pause, AlertTriangle, Sparkles, Video 
} from 'lucide-react'; 
// ▲ [수정됨] Video 아이콘이 추가되었습니다.

// ==================== [게임 데이터] ====================

const SHOP_ITEMS = [
  { id: 'cam_1', name: 'HD 웹캠', type: 'camera', price: 1000, effect: { subsBonus: 1.2 }, desc: "화질이 좋아져서 유입이 늘어납니다." },
  { id: 'mic_1', name: '콘덴서 마이크', type: 'mic', price: 2000, effect: { tensionBonus: 1.2 }, desc: "목소리가 선명해집니다." },
  { id: 'light_1', name: '링 라이트', type: 'light', price: 3000, effect: { appeal: 10 }, desc: "얼굴이 화사해집니다." },
  { id: 'pc_1', name: '게이밍 PC', type: 'pc', price: 5000, effect: { stressReduc: 0.8 }, desc: "방송 렉이 줄어듭니다." },
  { id: 'deco_1', name: '네온 사인', type: 'deco', price: 8000, effect: { donation: 1.5 }, desc: "방 분위기가 힙해집니다." },
  { id: 'studio_1', name: '스튜디오 이사', type: 'bg', price: 50000, effect: { all: 2.0 }, desc: "전문 스튜디오로 이사합니다!" },
];

const CHAT_MESSAGES = {
  normal: ["안녕하세요!", "ㅎㅇㅎㅇ", "오늘 뭐함?", "밥 먹었나요?", "ㅋㅋㅋ", "오...", "방송 켰다!"],
  good: ["와 대박ㅋㅋㅋ", "미쳤다 ㄷㄷ", "오늘 텐션 무엇?", "구독 박고 갑니다", "사랑해요!!", "형님 충성충성", "❤️❤️❤️"],
  bad: ["노잼;;", "언제 끝남?", "퇴물인가", "이거 왜 봄?", "나가라 그냥", "👎👎👎", "zzz"],
  donation: ["만원 후원 감사합니다!", "치킨값 쏘고 갑니다~", "형 사랑해!!", "오늘도 화이팅!"]
};

// ==================== [메인 컴포넌트] ====================

export default function StreamerTycoonPro() {
  const [gameState, setGameState] = useState('title'); // title, lobby, streaming
  const [player, setPlayer] = useState({
    name: '뉴비',
    money: 1000,
    subs: 0,
    stress: 0,
    items: [], 
    stats: { charm: 10, talk: 10, game: 10 }
  });
  
  const [streamData, setStreamData] = useState({
    timeLeft: 0, chats: [], hype: 0, earned: 0, isActive: false
  });
  const chatInterval = useRef(null);

  // [수정됨] 저장 데이터 불러오기 (클라이언트 사이드에서만 실행)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('streamer-pro-save');
      if (saved) {
        try {
          setPlayer(JSON.parse(saved));
          setGameState('lobby');
        } catch (e) { console.error("Save load failed", e); }
      }
    }
  }, []);

  // [수정됨] 게임 저장 함수
  const saveGame = (newPlayerState) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('streamer-pro-save', JSON.stringify(newPlayerState));
    }
  };

  const startGame = (name) => {
    const newPlayer = { ...player, name };
    setPlayer(newPlayer);
    saveGame(newPlayer);
    setGameState('lobby');
  };

  const buyItem = (item) => {
    if (player.money >= item.price && !player.items.includes(item.id)) {
      const newPlayer = {
        ...player,
        money: player.money - item.price,
        items: [...player.items, item.id]
      };
      setPlayer(newPlayer);
      saveGame(newPlayer); // 구매 시 자동 저장
      return true;
    }
    return false;
  };

  const startStream = () => {
    if (player.stress >= 100) return alert("스트레스가 심해 방송 불가! 휴식하세요.");
    setGameState('streaming');
    setStreamData({ timeLeft: 15, chats: [], hype: 50, earned: 0, isActive: true });
    chatInterval.current = setInterval(addRandomChat, 800);
  };

  const addRandomChat = () => {
    const rand = Math.random();
    let type = 'normal', text = '', money = 0;

    if (rand < 0.1) { 
      type = 'donation'; money = Math.floor(Math.random() * 100) * 100 + 1000;
      text = CHAT_MESSAGES.donation[Math.floor(Math.random() * CHAT_MESSAGES.donation.length)];
    } else if (rand < 0.3) {
      type = 'bad'; text = CHAT_MESSAGES.bad[Math.floor(Math.random() * CHAT_MESSAGES.bad.length)];
    } else if (rand < 0.6) {
      type = 'good'; text = CHAT_MESSAGES.good[Math.floor(Math.random() * CHAT_MESSAGES.good.length)];
    } else {
      text = CHAT_MESSAGES.normal[Math.floor(Math.random() * CHAT_MESSAGES.normal.length)];
    }

    setStreamData(prev => {
      const newChats = [...prev.chats, { id: Date.now() + Math.random(), type, text, money }]; // Key 충돌 방지
      if (newChats.length > 6) newChats.shift();
      return { ...prev, chats: newChats, hype: Math.max(0, prev.hype - 2), earned: prev.earned + money };
    });
  };

  const handleInteraction = (type) => {
    if (!streamData.isActive) return;
    if (type === 'reaction') {
      setStreamData(prev => ({ ...prev, hype: Math.min(100, prev.hype + 10) }));
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
    let moneyMult = player.items.includes('deco_1') ? 1.5 : 1;
    const finalMoney = Math.floor((finalData.earned + (finalData.hype * 50)) * moneyMult);
    const newSubs = Math.floor(finalData.hype * 0.5) + Math.floor(Math.random() * 10);
    
    setTimeout(() => {
      alert(`🎥 방송 종료!\n💰 수익: ${finalMoney.toLocaleString()}원\n👥 신규 구독자: ${newSubs}명`);
      const newPlayer = {
        ...player,
        money: player.money + finalMoney,
        subs: player.subs + newSubs,
        stress: player.stress + 10
      };
      setPlayer(newPlayer);
      saveGame(newPlayer); // 방송 종료 시 자동 저장
      setGameState('lobby');
    }, 500);
  };

  const rest = () => {
    const newPlayer = { ...player, stress: Math.max(0, player.stress - 30) };
    setPlayer(newPlayer);
    saveGame(newPlayer);
    alert("푹 쉬었습니다. 스트레스가 해소되었습니다! 💤");
  };

  const renderStudio = () => {
    const hasItem = (id) => player.items.includes(id);
    const bgClass = hasItem('studio_1') ? "bg-indigo-900" : (hasItem('deco_1') ? "bg-purple-900" : "bg-slate-800");

    return (
      <div className={`relative w-full aspect-video ${bgClass} rounded-3xl border-4 border-slate-700 overflow-hidden shadow-2xl transition-all duration-500`}>
        {hasItem('deco_1') && <div className="absolute top-4 right-4 animate-pulse text-pink-400 font-black text-2xl border-4 border-pink-500 rounded-lg px-2 rotate-12">ON AIR</div>}
        {hasItem('light_1') && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-white opacity-20 blur-3xl rounded-full pointer-events-none"></div>}

        <div className="absolute bottom-0 w-full h-1/3 bg-slate-900 flex justify-center items-end pb-4 gap-8">
           {hasItem('pc_1') && <Monitor size={64} className="text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
           {hasItem('mic_1') && <Mic size={40} className="text-gray-300" />}
           {hasItem('cam_1') && <Camera size={32} className="text-white absolute top-[-20px]" />}
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="text-8xl filter drop-shadow-xl animate-bounce-slow">
             {player.stress > 80 ? "🤯" : (streamData.isActive && streamData.hype > 80 ? "🤩" : "😎")}
          </div>
        </div>

        {gameState === 'streaming' && (
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <div className="bg-red-600 text-white px-3 py-1 rounded animate-pulse font-bold flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full"></div> LIVE
            </div>
            <div className="bg-black/50 text-white px-3 py-1 rounded font-mono">
              👥 {player.subs + Math.floor(streamData.hype * 2)}명 시청 중
            </div>
          </div>
        )}
      </div>
    );
  };

  if (gameState === 'title') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4 overflow-hidden relative">
        {/* 배경 이미지 URL에서 특수문자 제거 후 안전한 스타일 적용 */}
        <div className="absolute inset-0 bg-slate-900 bg-cover opacity-50" style={{backgroundImage: 'url(https://images.unsplash.com/photo-1511512578047-dfb367046420)'}}></div>
        <div className="z-10 text-center space-y-6">
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 italic tracking-tighter">
            STREAMER<br/>TYCOON<br/><span className="text-yellow-400 text-4xl not-italic">PRO EDITION</span>
          </h1>
          <p className="text-gray-400 text-lg">방송하고, 돈 벌고, 스튜디오를 키우세요!</p>
          <button 
            onClick={() => startGame("스트리머")}
            className="px-10 py-4 bg-white text-black font-black text-xl rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.5)]"
          >
            방송 시작하기
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'lobby') {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8 font-sans">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800 p-6 rounded-3xl shadow-lg">
              <h2 className="text-2xl font-black mb-1">{player.name}</h2>
              <div className="text-slate-400 text-sm mb-4">구독자 {player.subs.toLocaleString()}명</div>
              <div className="space-y-4">
                <StatBar label="스트레스" value={player.stress} max={100} color="bg-red-500" icon={<AlertTriangle size={14}/>} />
                <StatBar label="보유 자금" value={player.money} max={100000} color="bg-green-500" isMoney={true} icon={<DollarSign size={14}/>} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={startStream} className="p-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl font-black text-lg shadow-lg hover:brightness-110 active:scale-95 transition-all flex flex-col items-center gap-2">
                <Video size={28} /> 방송하기
              </button>
              <button onClick={rest} className="p-4 bg-slate-700 rounded-2xl font-bold text-lg hover:bg-slate-600 active:scale-95 transition-all flex flex-col items-center gap-2">
                <Heart size={28} className="text-pink-400" /> 휴식하기
              </button>
            </div>
            <div className="bg-slate-800 p-6 rounded-3xl shadow-lg">
              <h3 className="font-bold flex items-center gap-2 mb-4"><ShoppingBag size={18}/> 장비 업그레이드</h3>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {SHOP_ITEMS.map(item => {
                  const isBought = player.items.includes(item.id);
                  return (
                    <button 
                      key={item.id} onClick={() => buyItem(item)} disabled={isBought || player.money < item.price}
                      className={`w-full p-3 rounded-xl flex justify-between items-center text-left transition-all ${isBought ? 'bg-green-900/30 border border-green-500/30' : 'bg-slate-700 hover:bg-slate-600'}`}
                    >
                      <div>
                        <div className={`font-bold text-sm ${isBought ? 'text-green-400' : 'text-white'}`}>{item.name} {isBought && "✓"}</div>
                        <div className="text-xs text-slate-400">{item.desc}</div>
                      </div>
                      <div className="text-xs font-mono font-bold">{isBought ? "보유중" : `${item.price.toLocaleString()}원`}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            {renderStudio()}
            <div className="mt-6 bg-slate-800 p-6 rounded-3xl shadow-lg">
              <h3 className="font-bold text-slate-400 mb-4 flex items-center gap-2"><Trophy size={16}/> 업적 현황</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AchievementBox label="실버 버튼" achieved={player.subs >= 100000} />
                <AchievementBox label="골드 버튼" achieved={player.subs >= 1000000} />
                <AchievementBox label="부자" achieved={player.money >= 1000000} />
                <AchievementBox label="슈퍼스타" achieved={player.items.length >= 5} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'streaming') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            {renderStudio()}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <button onClick={() => handleInteraction('reaction')} className="py-6 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-2xl rounded-2xl shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none flex flex-col items-center gap-1">
                <Sparkles size={32}/> 리액션!
              </button>
              <button onClick={() => handleInteraction('ban')} className="py-6 bg-red-600 hover:bg-red-500 text-white font-black text-2xl rounded-2xl shadow-[0_4px_0_#7f1d1d] active:translate-y-1 active:shadow-none flex flex-col items-center gap-1">
                <Shield size={32}/> 강퇴(BAN)
              </button>
            </div>
            <div className="mt-4 bg-slate-800 p-4 rounded-xl flex justify-between items-center">
              <div className="text-slate-400 font-bold">남은 시간</div>
              <div className="text-3xl font-mono font-black text-white">{streamData.timeLeft}초</div>
            </div>
          </div>
          <div className="md:col-span-1 bg-black/80 rounded-3xl border border-slate-700 flex flex-col overflow-hidden h-[500px]">
             <div className="p-4 border-b border-slate-700 bg-slate-900 font-bold flex justify-between items-center">
               <span>실시간 채팅</span>
               <span className="text-xs text-red-400 animate-pulse">● LIVE</span>
             </div>
             <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col-reverse">
               {[...streamData.chats].reverse().map(chat => (
                 <div key={chat.id} className={`text-sm animate-in slide-in-from-right-4 fade-in duration-300 ${chat.type === 'donation' ? 'bg-yellow-900/50 p-2 rounded border border-yellow-500/50' : ''}`}>
                   {chat.type === 'donation' && <div className="text-yellow-400 font-bold mb-1">₩ {chat.money.toLocaleString()}</div>}
                   <span className={`font-bold mr-2 ${chat.type === 'good' ? 'text-green-400' : (chat.type === 'bad' ? 'text-red-400' : 'text-slate-400')}`}>
                     {chat.type === 'bad' ? '👿 악플러' : (chat.type === 'donation' ? '👑 회장님' : '👤 시청자')}
                   </span>
                   <span className="text-white">{chat.text}</span>
                 </div>
               ))}
             </div>
             <div className="p-4 bg-slate-900 border-t border-slate-700 space-y-3">
               <div>
                 <div className="flex justify-between text-xs font-bold mb-1">
                   <span className="text-yellow-400">🔥 호응도(HYPE)</span>
                   <span>{streamData.hype}%</span>
                 </div>
                 <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                   <div className="h-full bg-yellow-500 transition-all duration-300" style={{width: `${streamData.hype}%`}}></div>
                 </div>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-xs text-slate-400">현재 수익</span>
                 <span className="font-mono font-bold text-green-400 text-lg">₩ {streamData.earned.toLocaleString()}</span>
               </div>
             </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function StatBar({ label, value, max, color, icon, isMoney }) {
  const percent = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
        <span className="flex items-center gap-1">{icon} {label}</span>
        <span className="text-white">{isMoney ? `${value.toLocaleString()}원` : `${value}/${max}`}</span>
      </div>
      <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-700">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}

function AchievementBox({ label, achieved }) {
  return (
    <div className={`p-3 rounded-xl border-2 text-center transition-all ${achieved ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-slate-900 border-slate-700 text-slate-600 grayscale'}`}>
      <div className="text-2xl mb-1">{achieved ? "🏆" : "🔒"}</div>
      <div className="text-xs font-bold">{label}</div>
    </div>
  );
}
