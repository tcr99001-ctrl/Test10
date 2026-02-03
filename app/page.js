'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, RotateCcw, Settings, Sparkles, User, TrendingUp, Heart, 
  Zap, DollarSign, Users, Calendar, ArrowRight, AlertCircle, 
  Menu, Home, Save, Video, BookOpen, Coffee, Mic, Camera, 
  Shield, Trophy
} from 'lucide-react';

// ==================== 게임 데이터 ====================
const PERSONALITIES = [
  {
    id: 'creative',
    name: '크리에이티브형',
    description: '기발한 아이디어가 샘솟는 타입',
    bonuses: { content: 15, editing: 10, talk: 5, appearance: 5, stamina: 50, stress: 30, money: 500, subscribers: 10 }
  },
  {
    id: 'energetic',
    name: '에너제틱형',
    description: '넘치는 에너지로 시청자를 사로잡는 타입',
    bonuses: { content: 10, editing: 5, talk: 15, appearance: 10, stamina: 70, stress: 20, money: 300, subscribers: 20 }
  },
  {
    id: 'analytical',
    name: '분석형',
    description: '철저한 분석과 전략으로 승부하는 타입',
    bonuses: { content: 10, editing: 15, talk: 5, appearance: 5, stamina: 60, stress: 40, money: 800, subscribers: 5 }
  }
];

const SCHEDULES = [
  { id: 'upload_video', name: '영상 업로드', icon: '🎬', color: 'red', description: '새로운 영상을 촬영하고 업로드합니다', 
    cost: { stamina: 15, stress: 10 }, effects: { subscribers: [50, 500], money: [100, 1000], totalVideos: 1 }, requirements: { stamina: 20 } },
  { id: 'study_content', name: '콘텐츠 공부', icon: '📚', color: 'blue', description: '트렌드를 분석하고 기획력을 키웁니다',
    cost: { stamina: 10, stress: 5, money: 50 }, effects: { content: [2, 5] }, requirements: { money: 50 } },
  { id: 'study_editing', name: '편집 공부', icon: '🎥', color: 'purple', description: '영상 편집 스킬을 향상시킵니다',
    cost: { stamina: 10, stress: 5, money: 50 }, effects: { editing: [2, 5] }, requirements: { money: 50 } },
  { id: 'study_talk', name: '토크 연습', icon: '🎤', color: 'pink', description: '말하기와 진행 능력을 연마합니다',
    cost: { stamina: 10, stress: 5, money: 50 }, effects: { talk: [2, 5] }, requirements: { money: 50 } },
  { id: 'rest', name: '휴식', icon: '☕', color: 'green', description: '푹 쉬면서 재충전합니다',
    cost: {}, effects: { stamina: [30, 50], stress: [-30, -20] }, requirements: {} },
  { id: 'collab', name: '콜라보', icon: '👥', color: 'yellow', description: '다른 유튜버와 협업합니다',
    cost: { stamina: 20, stress: 15 }, effects: { subscribers: [200, 1000], collaborations: 1 }, requirements: { subscribers: 1000, talk: 30 } },
  { id: 'sponsorship', name: '스폰서 미팅', icon: '💰', color: 'emerald', description: '광고주와 협찬 미팅을 합니다',
    cost: { stamina: 15, stress: 10 }, effects: { money: [500, 5000] }, requirements: { subscribers: 10000 } },
  { id: 'manage_comments', name: '악플 관리', icon: '🛡️', color: 'gray', description: '악성 댓글에 대응합니다',
    cost: { stamina: 10, stress: 20 }, effects: { stress: [-10, 0] }, requirements: {} },
  { id: 'invest_equipment', name: '장비 투자', icon: '📹', color: 'indigo', description: '촬영/편집 장비를 업그레이드합니다',
    cost: { money: 1000 }, effects: { editing: [5, 10], content: [3, 7] }, requirements: { money: 1000 } },
  { id: 'beauty_care', name: '외모 관리', icon: '✨', color: 'rose', description: '피부 관리와 스타일링을 합니다',
    cost: { stamina: 5, money: 200 }, effects: { appearance: [2, 5] }, requirements: { money: 200 } },
];

const RANDOM_EVENTS = [
  { id: 'algorithm_boost', name: '알고리즘 폭발! 🚀', description: '영상이 알고리즘을 타고 급상승했습니다!', weight: 15,
    requirements: { totalVideos: 5 }, effects: { subscribers: [1000, 10000], money: [500, 5000] }, choices: null },
  { id: 'hate_comments', name: '악플 테러 💢', description: '악성 댓글이 폭주하고 있습니다. 어떻게 대응하시겠습니까?', weight: 20,
    requirements: { subscribers: 1000 }, 
    choices: [
      { text: '무시하고 넘어간다', effects: { stress: [10, 20] } },
      { text: '정면 대응한다', effects: { stress: [-10, 0], subscribers: [-500, 500], controversies: 1 } },
      { text: '법적 대응을 준비한다', effects: { money: [-1000, -500], stress: [-20, -10] } }
    ] },
  { id: 'burnout', name: '번아웃 위기 😰', description: '과로로 인해 심신이 지쳐갑니다...', weight: 25,
    requirements: { stress: 70 },
    choices: [
      { text: '1주일 휴식', effects: { stamina: [40, 50], stress: [-40, -30] } },
      { text: '버틴다', effects: { stress: [20, 30] } }
    ] },
  { id: 'sponsor_offer', name: '협찬 제안 💰', description: '기업에서 협찬 제안이 들어왔습니다!', weight: 10,
    requirements: { subscribers: 50000 },
    choices: [
      { text: '수락 (큰 수익)', effects: { money: [5000, 20000], stress: [10, 15] } },
      { text: '거절 (신뢰 유지)', effects: { subscribers: [100, 500] } }
    ] },
  { id: 'viral_meme', name: '밈 등극! 😂', description: '당신의 영상이 밈이 되어 화제입니다!', weight: 10,
    requirements: { talk: 40 }, effects: { subscribers: [5000, 50000], money: [1000, 10000] }, choices: null },
];

const ENDINGS = [
  { id: 'gold_button', name: '골드버튼 수상 🏆', priority: 100,
    requirements: { subscribers: 1000000, controversies_max: 2 },
    description: '축하합니다! 구독자 100만 명을 달성하고 골드버튼을 받았습니다!',
    message: '"당신의 콘텐츠가 세상을 밝혔습니다."', image: '🏆' },
  { id: 'silver_button', name: '실버버튼 수상 🥈', priority: 80,
    requirements: { subscribers: 100000, controversies_max: 3 },
    description: '10만 구독자를 달성하고 실버버튼을 받았습니다!',
    message: '"작지만 빛나는 성공입니다."', image: '🥈' },
  { id: 'burnout_retire', name: '번아웃 은퇴 😞', priority: 90,
    requirements: { stress: 90 },
    description: '과로로 인해 유튜브 활동을 중단했습니다...',
    message: '"휴식도 용기입니다."', image: '😞' },
  { id: 'controversy_retire', name: '논란 은퇴 💔', priority: 85,
    requirements: { controversies_min: 5 },
    description: '잦은 논란으로 인해 활동을 중단했습니다...',
    message: '"모든 선택에는 책임이 따릅니다."', image: '💔' },
  { id: 'mega_star', name: '메가 인플루언서 ⭐', priority: 95,
    requirements: { subscribers: 5000000, money: 100000000 },
    description: '500만 구독자 초대형 인플루언서가 되었습니다!',
    message: '"당신은 이 시대의 아이콘입니다."', image: '⭐' },
  { id: 'normal_retire', name: '평범한 은퇴 👋', priority: 10,
    requirements: { week: 260 },
    description: '5년간의 유튜브 활동을 마쳤습니다.',
    message: '"새로운 시작을 응원합니다."', image: '👋' },
];

const SEASONS = {
  spring: { name: '봄', emoji: '🌸', stressModifier: -5 },
  summer: { name: '여름', emoji: '☀️', staminaModifier: -5 },
  fall: { name: '가을', emoji: '🍂', stressModifier: 0 },
  winter: { name: '겨울', emoji: '❄️', staminaModifier: -5 },
};

// ==================== 게임 로직 ====================
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function applyScheduleEffects(gameState, scheduleId) {
  const schedule = SCHEDULES.find(s => s.id === scheduleId);
  if (!schedule) return gameState;

  let newState = JSON.parse(JSON.stringify(gameState));
  const { player } = newState;

  // 비용 차감
  if (schedule.cost.stamina) player.stats.stamina -= schedule.cost.stamina;
  if (schedule.cost.stress) player.stats.stress += schedule.cost.stress;
  if (schedule.cost.money) player.stats.money -= schedule.cost.money;

  // 효과 적용
  Object.entries(schedule.effects).forEach(([key, value]) => {
    if (typeof value === 'number') {
      if (key === 'totalVideos' || key === 'collaborations') {
        player.history[key] = (player.history[key] || 0) + value;
      }
    } else if (Array.isArray(value)) {
      const change = Math.floor(Math.random() * (value[1] - value[0] + 1)) + value[0];
      
      if (player.stats[key] !== undefined) {
        player.stats[key] = clamp(player.stats[key] + change, 0, key === 'money' ? Infinity : 100);
      } else if (player.history[key] !== undefined) {
        player.history[key] += change;
      }
    }
  });

  // 영상 업로드 시 조회수 기록
  if (scheduleId === 'upload_video') {
    const views = Math.floor(Math.random() * 10000) + player.stats.subscribers * 0.1;
    player.history.totalViews += views;
    
    if (views > player.history.bestVideo.views) {
      const titles = ['이건 진짜 대박이에요!', '충격! 이거 실화입니까?', '드디어 성공했습니다...', '여러분께 고백할게 있어요'];
      player.history.bestVideo = { title: titles[Math.floor(Math.random() * titles.length)], views: Math.floor(views) };
    }
  }

  return newState;
}

function checkRandomEvent(gameState) {
  const availableEvents = RANDOM_EVENTS.filter(event => {
    if (!event.requirements) return true;
    return Object.entries(event.requirements).every(([key, value]) => {
      if (key === 'totalVideos' || key === 'collaborations') return gameState.player.history[key] >= value;
      return gameState.player.stats[key] >= value;
    });
  });

  if (availableEvents.length === 0) return null;

  const totalWeight = availableEvents.reduce((sum, e) => sum + e.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const event of availableEvents) {
    random -= event.weight;
    if (random <= 0) return Math.random() < 0.3 ? event : null;
  }
  return null;
}

function applyEventEffects(gameState, event, choiceIndex = 0) {
  let newState = JSON.parse(JSON.stringify(gameState));
  const { player } = newState;

  const effects = event.choices ? event.choices[choiceIndex].effects : event.effects;

  if (effects) {
    Object.entries(effects).forEach(([key, value]) => {
      if (typeof value === 'number') {
        if (key === 'controversies') player.history.controversies = (player.history.controversies || 0) + value;
      } else if (Array.isArray(value)) {
        const change = Math.floor(Math.random() * (value[1] - value[0] + 1)) + value[0];
        if (player.stats[key] !== undefined) {
          player.stats[key] = clamp(player.stats[key] + change, 0, key === 'money' ? Infinity : 100);
        }
      }
    });
  }

  return newState;
}

function updateWeek(gameState) {
  let newState = JSON.parse(JSON.stringify(gameState));
  
  newState.week += 1;
  const seasonIndex = Math.floor(newState.week / 13) % 4;
  const seasonKeys = ['spring', 'summer', 'fall', 'winter'];
  newState.season = seasonKeys[seasonIndex];
  newState.year = Math.floor(newState.week / 52) + 1;
  
  newState.player.stats.stamina = clamp(newState.player.stats.stamina + 5, 0, 100);
  newState.player.stats.stress = clamp(newState.player.stats.stress - 3, 0, 100);
  
  const seasonEffect = SEASONS[newState.season];
  if (seasonEffect.stressModifier) {
    newState.player.stats.stress = clamp(newState.player.stats.stress + seasonEffect.stressModifier, 0, 100);
  }
  if (seasonEffect.staminaModifier) {
    newState.player.stats.stamina = clamp(newState.player.stats.stamina + seasonEffect.staminaModifier, 0, 100);
  }

  return newState;
}

function checkEnding(gameState) {
  const { player, week } = gameState;
  const sortedEndings = [...ENDINGS].sort((a, b) => b.priority - a.priority);
  
  for (const ending of sortedEndings) {
    let meetsRequirements = true;
    
    Object.entries(ending.requirements).forEach(([key, value]) => {
      if (key === 'week') meetsRequirements = meetsRequirements && week >= value;
      else if (key === 'subscribers' || key === 'money') meetsRequirements = meetsRequirements && player.stats[key] >= value;
      else if (key === 'stress') meetsRequirements = meetsRequirements && player.stats[key] >= value;
      else if (key === 'controversies_min') meetsRequirements = meetsRequirements && (player.history.controversies || 0) >= value;
      else if (key === 'controversies_max') meetsRequirements = meetsRequirements && (player.history.controversies || 0) <= value;
    });
    
    if (meetsRequirements) return ending;
  }
  return null;
}

// ==================== 메인 컴포넌트 ====================
export default function YoutuberMaker() {
  const [screen, setScreen] = useState('title'); // title, create, game, ending
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [gender, setGender] = useState(null);
  const [personality, setPersonality] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  const [phase, setPhase] = useState('select');
  const [currentEvent, setCurrentEvent] = useState(null);
  const [weekResults, setWeekResults] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [message, setMessage] = useState('');
  const [endingData, setEndingData] = useState(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('youtuber-maker-save');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setGameState(state);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (screen === 'game' && gameState) {
      const messages = [
        `${gameState.player.name}님, 이번 주는 어떻게 보내실 건가요? 💫`,
        `${gameState.week}주차! 오늘도 화이팅이에요! 🌟`,
        `새로운 한 주가 시작됐어요! 뭘 해볼까요? ✨`,
      ];
      setMessage(messages[Math.floor(Math.random() * messages.length)]);
    }
  }, [screen, gameState?.week]);

  // 타이틀 화면
  if (screen === 'title') {
    const hasSave = localStorage.getItem('youtuber-maker-save');
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
              유튜버 키우기
            </h1>
            <p className="text-gray-600 text-sm font-medium">Princess Maker × YouTube</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => { setScreen('create'); setStep(1); }}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
            >
              새로운 유튜버 키우기
            </button>

            {hasSave && (
              <button
                onClick={() => setScreen('game')}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
              >
                이어하기
              </button>
            )}

            {hasSave && (
              <button
                onClick={() => {
                  if (confirm('저장 데이터를 삭제하시겠습니까?')) {
                    localStorage.removeItem('youtuber-maker-save');
                    alert('삭제되었습니다!');
                    window.location.reload();
                  }
                }}
                className="w-full py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                저장 데이터 삭제
              </button>
            )}
          </div>

          <div className="mt-8 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl text-sm text-gray-700">
            <p><span className="font-bold text-pink-600">✨ 목표:</span> 구독자 100만 명 달성!</p>
            <p className="mt-1"><span className="font-bold text-purple-600">🎬 방법:</span> 매주 스케줄 선택 & 스탯 관리!</p>
          </div>
        </div>
      </div>
    );
  }

  // 캐릭터 생성 화면
  if (screen === 'create') {
    const handleStart = () => {
      if (!name || !gender || !personality) {
        alert('모든 항목을 선택해주세요!');
        return;
      }

      const selectedPersonality = PERSONALITIES.find(p => p.id === personality);
      const initialState = {
        player: {
          name, gender, personality,
          stats: { ...selectedPersonality.bonuses },
          history: { totalViews: 0, totalVideos: 0, bestVideo: { title: '첫 영상', views: 0 }, controversies: 0, collaborations: 0 }
        },
        week: 1, year: 1, season: 'spring',
        flags: { hasGoldButton: false, hasSilverButton: false, isBanned: false, hasSponsorship: false }
      };

      localStorage.setItem('youtuber-maker-save', JSON.stringify(initialState));
      setGameState(initialState);
      setScreen('game');
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-400 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-3 h-3 rounded-full transition-all ${s <= step ? 'bg-pink-500 scale-125' : 'bg-gray-300'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-black text-gray-800 mb-2">어떤 이름으로 활동할까요?</h2>
                <p className="text-gray-600">유튜브 채널명이 될 거예요!</p>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 20))}
                placeholder="예: 햄찌TV"
                className="w-full px-6 py-4 text-2xl text-center border-4 border-pink-300 rounded-2xl focus:outline-none focus:border-pink-500"
                maxLength={20}
              />
              <button
                onClick={() => name.trim() && setStep(2)}
                disabled={!name.trim()}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-2xl font-bold text-lg shadow-lg disabled:opacity-50"
              >
                다음 단계로
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-black text-gray-800 mb-2">{name}님의 성별은?</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setGender('male')}
                  className={`p-8 rounded-2xl border-4 transition-all ${gender === 'male' ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-300'}`}
                >
                  <div className="text-6xl mb-2">👨</div>
                  <p className="font-bold text-xl">남성</p>
                </button>
                <button
                  onClick={() => setGender('female')}
                  className={`p-8 rounded-2xl border-4 transition-all ${gender === 'female' ? 'border-pink-500 bg-pink-50 scale-105' : 'border-gray-300'}`}
                >
                  <div className="text-6xl mb-2">👩</div>
                  <p className="font-bold text-xl">여성</p>
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium">이전</button>
                <button onClick={() => gender && setStep(3)} disabled={!gender} className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold disabled:opacity-50">
                  다음 단계로
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-3xl font-black text-gray-800 mb-2">어떤 스타일로 시작할까요?</h2>
              </div>
              <div className="space-y-4">
                {PERSONALITIES.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPersonality(p.id)}
                    className={`w-full p-6 rounded-2xl border-4 transition-all text-left ${personality === p.id ? 'border-pink-500 bg-pink-50 scale-105' : 'border-gray-300'}`}
                  >
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{p.name}</h3>
                    <p className="text-sm text-gray-600">{p.description}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-xl font-medium">이전</button>
                <button onClick={handleStart} disabled={!personality} className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg disabled:opacity-50">
                  유튜버 활동 시작!
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 게임 화면
  if (screen === 'game' && gameState) {
    const { player, week, year, season } = gameState;
    const seasonData = SEASONS[season];

    const handleScheduleSelect = (scheduleId) => {
      if (selectedSchedules.includes(scheduleId)) {
        setSelectedSchedules(selectedSchedules.filter(id => id !== scheduleId));
      } else if (selectedSchedules.length < 3) {
        setSelectedSchedules([...selectedSchedules, scheduleId]);
      }
    };

    const handleConfirm = () => {
      if (selectedSchedules.length !== 3) {
        alert('3가지 활동을 선택해주세요!');
        return;
      }

      let newState = gameState;
      selectedSchedules.forEach(scheduleId => {
        newState = applyScheduleEffects(newState, scheduleId);
      });
      newState = updateWeek(newState);

      const results = {};
      Object.keys(player.stats).forEach(key => {
        results[key] = newState.player.stats[key] - player.stats[key];
      });

      setWeekResults(results);
      setGameState(newState);
      setPhase('result');
    };

    const handleNextWeek = () => {
      const ending = checkEnding(gameState);
      if (ending) {
        setEndingData({ ending, gameState });
        setScreen('ending');
        setTimeout(() => setShowStats(true), 2000);
        return;
      }

      const event = checkRandomEvent(gameState);
      if (event) {
        setCurrentEvent(event);
        setPhase('event');
      } else {
        startNewWeek();
      }
    };

    const handleEventChoice = (choiceIndex) => {
      let newState = applyEventEffects(gameState, currentEvent, choiceIndex);
      setGameState(newState);
      localStorage.setItem('youtuber-maker-save', JSON.stringify(newState));
      setCurrentEvent(null);
      startNewWeek();
    };

    const startNewWeek = () => {
      setSelectedSchedules([]);
      setWeekResults(null);
      setPhase('select');
      localStorage.setItem('youtuber-maker-save', JSON.stringify(gameState));
    };

    const checkRequirements = (schedule) => {
      if (!schedule.requirements) return true;
      return Object.entries(schedule.requirements).every(([key, value]) => {
        return player.stats[key] >= value;
      });
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-400 p-4">
        <div className="max-w-6xl mx-auto">
          {/* 헤더 */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center text-2xl">
                  {player.gender === 'male' ? '👨' : '👩'}
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-800">{player.name}</h2>
                  <div className="text-sm text-gray-600">{year}년차 {week}주 {seasonData.emoji}</div>
                </div>
              </div>
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 rounded-lg">
                ☰
              </button>
            </div>
            {showMenu && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
                <button
                  onClick={() => {
                    localStorage.setItem('youtuber-maker-save', JSON.stringify(gameState));
                    alert('저장되었습니다!');
                  }}
                  className="flex-1 py-2 bg-blue-500 text-white rounded-lg font-medium"
                >
                  💾 저장
                </button>
                <button
                  onClick={() => {
                    if (confirm('타이틀로 돌아가시겠습니까?')) {
                      localStorage.setItem('youtuber-maker-save', JSON.stringify(gameState));
                      setScreen('title');
                    }
                  }}
                  className="flex-1 py-2 bg-gray-500 text-white rounded-lg font-medium"
                >
                  🏠 타이틀
                </button>
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* 스탯 패널 */}
            <div className="md:col-span-1 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-6 space-y-4">
              <h3 className="text-xl font-black text-gray-800 mb-4">스탯</h3>
              {[
                { key: 'content', name: '콘텐츠력', color: 'pink' },
                { key: 'editing', name: '편집력', color: 'purple' },
                { key: 'talk', name: '토크력', color: 'blue' },
                { key: 'appearance', name: '외모', color: 'rose' },
                { key: 'stamina', name: '체력', color: 'green' },
                { key: 'stress', name: '스트레스', color: 'red' },
              ].map(stat => (
                <div key={stat.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{stat.name}</span>
                    <span className="text-sm font-bold text-gray-800">{player.stats[stat.key]}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`h-full bg-${stat.color}-500 rounded-full transition-all`} style={{ width: `${player.stats[stat.key]}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">💰 돈</span>
                  <span className="text-sm font-bold">{player.stats.money.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">👥 구독자</span>
                  <span className="text-sm font-bold">{player.stats.subscribers.toLocaleString()}명</span>
                </div>
              </div>
            </div>

            {/* 메인 컨텐츠 */}
            <div className="md:col-span-2 space-y-4">
              {phase === 'select' && (
                <>
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-6">
                    <p className="text-lg font-medium text-gray-800 mb-2">{message}</p>
                    <p className="text-sm text-gray-600">이번 주 할 일 3가지를 선택해주세요! ({selectedSchedules.length}/3)</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3">
                    {SCHEDULES.map(schedule => {
                      const isSelected = selectedSchedules.includes(schedule.id);
                      const meetsRequirements = checkRequirements(schedule);
                      
                      return (
                        <button
                          key={schedule.id}
                          onClick={() => meetsRequirements && handleScheduleSelect(schedule.id)}
                          disabled={!meetsRequirements}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            isSelected ? 'border-pink-500 bg-pink-50 scale-105' : meetsRequirements ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100 opacity-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-3xl">{schedule.icon}</div>
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-800">{schedule.name}</h4>
                              <p className="text-xs text-gray-600 mt-1">{schedule.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleConfirm}
                    disabled={selectedSchedules.length !== 3}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-lg shadow-lg disabled:opacity-50"
                  >
                    이번 주 확정! ✨
                  </button>
                </>
              )}

              {phase === 'result' && weekResults && (
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-6">
                  <h3 className="text-2xl font-black text-gray-800 mb-6 text-center">이번 주 결과 ✨</h3>
                  <div className="space-y-3 mb-6">
                    {Object.entries(weekResults).map(([key, value]) => {
                      if (value === 0) return null;
                      const names = { content: '콘텐츠력', editing: '편집력', talk: '토크력', appearance: '외모', stamina: '체력', stress: '스트레스', money: '돈', subscribers: '구독자' };
                      return (
                        <div key={key} className="flex justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-700">{names[key]}</span>
                          <span className={`font-bold ${value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {value > 0 ? '+' : ''}{key === 'money' || key === 'subscribers' ? value.toLocaleString() : value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={handleNextWeek} className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-bold text-lg shadow-lg">
                    다음 주로 ➡️
                  </button>
                </div>
              )}

              {phase === 'event' && currentEvent && (
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-6">
                  <div className="text-center mb-6">
                    <h3 className="text-3xl font-black text-gray-800 mb-2">{currentEvent.name}</h3>
                    <p className="text-gray-600">{currentEvent.description}</p>
                  </div>
                  <div className="space-y-3">
                    {currentEvent.choices ? currentEvent.choices.map((choice, index) => (
                      <button
                        key={index}
                        onClick={() => handleEventChoice(index)}
                        className="w-full p-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                      >
                        {choice.text}
                      </button>
                    )) : (
                      <button onClick={() => handleEventChoice(0)} className="w-full p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold">
                        확인
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 엔딩 화면
  if (screen === 'ending' && endingData) {
    const { ending, gameState } = endingData;
    const { player, week, year } = gameState;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-black text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="text-8xl mb-4">{ending.image}</div>
            <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              {ending.name}
            </h1>
            <p className="text-xl text-gray-300 mb-2">{ending.description}</p>
            <p className="text-2xl font-bold text-pink-400 italic">{ending.message}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center text-4xl">
                {player.gender === 'male' ? '👨' : '👩'}
              </div>
              <div>
                <h2 className="text-3xl font-black">{player.name}</h2>
                <p className="text-gray-300">{year}년 {week}주 활동</p>
              </div>
            </div>
          </div>

          {showStats && (
            <>
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 mb-6">
                <h3 className="text-2xl font-black mb-4">✨ 최종 스탯</h3>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {[
                    { label: '콘텐츠력', value: player.stats.content },
                    { label: '편집력', value: player.stats.editing },
                    { label: '토크력', value: player.stats.talk },
                    { label: '외모', value: player.stats.appearance },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white/5 rounded-xl p-4">
                      <p className="text-sm text-gray-400 mb-1">{stat.label}</p>
                      <p className="text-3xl font-black">{stat.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-sm text-gray-400 mb-1">최종 구독자</p>
                    <p className="text-3xl font-black text-red-400">{player.stats.subscribers.toLocaleString()}명</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-sm text-gray-400 mb-1">최종 자산</p>
                    <p className="text-3xl font-black text-green-400">{player.stats.money.toLocaleString()}원</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 mb-6">
                <h3 className="text-2xl font-black mb-4">📊 활동 기록</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span className="text-gray-300">총 영상 수</span>
                    <span className="font-bold">{player.history.totalVideos}개</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span className="text-gray-300">총 조회수</span>
                    <span className="font-bold">{player.history.totalViews.toLocaleString()}회</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span className="text-gray-300">최다 조회 영상</span>
                    <span className="font-bold">{player.history.bestVideo.title}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    localStorage.removeItem('youtuber-maker-save');
                    setScreen('create');
                    setStep(1);
                    setShowStats(false);
                  }}
                  className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl font-bold text-lg shadow-lg"
                >
                  🔄 다시 시작
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('youtuber-maker-save');
                    setScreen('title');
                    setShowStats(false);
                  }}
                  className="flex-1 py-4 bg-white/20 backdrop-blur-sm rounded-2xl font-bold text-lg shadow-lg"
                >
                  🏠 타이틀로
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return <div className="min-h-screen bg-black text-white flex items-center justify-center">로딩중...</div>;
}
