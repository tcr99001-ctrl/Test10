'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, RotateCcw, Sparkles, User, TrendingUp, Heart, 
  Zap, DollarSign, Users, Timer, ArrowRight, AlertCircle, 
  Save, Video, BookOpen, Coffee, Mic, Camera, 
  Shield, Trophy
} from 'lucide-react';

// ==================== 게임 데이터 (상수) ====================
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
  { id: 'upload_video', name: '영상 업로드', icon: '🎬', description: '새로운 영상을 촬영하고 업로드합니다', 
    cost: { stamina: 15, stress: 10 }, effects: { subscribers: [50, 500], money: [100, 1000], totalVideos: 1 }, requirements: { stamina: 20 } },
  { id: 'study_content', name: '콘텐츠 공부', icon: '📚', description: '트렌드를 분석하고 기획력을 키웁니다',
    cost: { stamina: 10, stress: 5, money: 50 }, effects: { content: [2, 5] }, requirements: { money: 50 } },
  { id: 'study_editing', name: '편집 공부', icon: '🎥', description: '영상 편집 스킬을 향상시킵니다',
    cost: { stamina: 10, stress: 5, money: 50 }, effects: { editing: [2, 5] }, requirements: { money: 50 } },
  { id: 'study_talk', name: '토크 연습', icon: '🎤', description: '말하기와 진행 능력을 연마합니다',
    cost: { stamina: 10, stress: 5, money: 50 }, effects: { talk: [2, 5] }, requirements: { money: 50 } },
  { id: 'rest', name: '휴식', icon: '☕', description: '푹 쉬면서 재충전합니다',
    cost: {}, effects: { stamina: [30, 50], stress: [-30, -20] }, requirements: {} },
  { id: 'collab', name: '콜라보', icon: '👥', description: '다른 유튜버와 협업합니다',
    cost: { stamina: 20, stress: 15 }, effects: { subscribers: [200, 1000], collaborations: 1 }, requirements: { subscribers: 1000, talk: 30 } },
  { id: 'invest_equipment', name: '장비 투자', icon: '📹', description: '촬영/편집 장비를 업그레이드합니다',
    cost: { money: 1000 }, effects: { editing: [5, 10], content: [3, 7] }, requirements: { money: 1000 } },
];

const RANDOM_EVENTS = [
  { id: 'algorithm_boost', name: '알고리즘 폭발! 🚀', description: '영상이 알고리즘을 타고 급상승했습니다!', weight: 15,
    requirements: { totalVideos: 5 }, effects: { subscribers: [1000, 10000], money: [500, 5000] }, choices: null },
  { id: 'hate_comments', name: '악플 테러 💢', description: '악성 댓글이 폭주하고 있습니다.', weight: 20,
    requirements: { subscribers: 1000 }, 
    choices: [
      { text: '무시하고 넘어간다', effects: { stress: [10, 20] } },
      { text: '정면 대응한다', effects: { stress: [-10, 0], subscribers: [-500, 500], controversies: 1 } }
    ] }
];

const ENDINGS = [
  { id: 'gold_button', name: '골드버튼 수상 🏆', priority: 100, requirements: { subscribers: 1000000 }, description: '100만 구독자 달성!', image: '🏆' },
  { id: 'silver_button', name: '실버버튼 수상 🥈', priority: 80, requirements: { subscribers: 100000 }, description: '10만 구독자 달성!', image: '🥈' },
  { id: 'normal_retire', name: '평범한 은퇴 👋', priority: 10, requirements: { week: 104 }, description: '활동을 마무리합니다.', image: '👋' },
];

const SEASONS = {
  spring: { name: '봄', emoji: '🌸', stressModifier: -5 },
  summer: { name: '여름', emoji: '☀️', staminaModifier: -5 },
  fall: { name: '가을', emoji: '🍂', stressModifier: 0 },
  winter: { name: '겨울', emoji: '❄️', staminaModifier: -5 },
};

// ==================== 유틸리티 함수 ====================
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function YoutuberMaker() {
  const [screen, setScreen] = useState('title'); 
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [gender, setGender] = useState(null);
  const [personality, setPersonality] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [selectedSchedules, setSelectedSchedules] = useState([]);
  const [phase, setPhase] = useState('select');
  const [currentEvent, setCurrentEvent] = useState(null);
  const [weekResults, setWeekResults] = useState(null);
  const [hasSave, setHasSave] = useState(false);
  const [message, setMessage] = useState('');
  const [endingData, setEndingData] = useState(null);
  const [showStats, setShowStats] = useState(false);

  // 1. 빌드 에러 해결: 브라우저 환경에서만 localStorage 체크
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('youtuber-maker-save');
      if (saved) {
        setHasSave(true);
        try {
          const state = JSON.parse(saved);
          setGameState(state);
        } catch (e) {
          console.error("데이터 복구 실패");
        }
      }
    }
  }, []);

  const saveGame = (state) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('youtuber-maker-save', JSON.stringify(state));
      setHasSave(true);
    }
  };

  // 게임 로직 함수들
  const handleScheduleSelect = (id) => {
    if (selectedSchedules.includes(id)) {
      setSelectedSchedules(selectedSchedules.filter(s => s !== id));
    } else if (selectedSchedules.length < 3) {
      setSelectedSchedules([...selectedSchedules, id]);
    }
  };

  const handleConfirm = () => {
    if (selectedSchedules.length !== 3) return;

    let newState = JSON.parse(JSON.stringify(gameState));
    const results = { subscribers: 0, money: 0, stamina: 0, stress: 0 };
    
    // 스케줄 효과 적용 (단순화된 예시)
    selectedSchedules.forEach(id => {
      const s = SCHEDULES.find(item => item.id === id);
      if (s.cost.stamina) newState.player.stats.stamina -= s.cost.stamina;
      if (s.effects.subscribers) {
        const gain = Math.floor(Math.random() * (s.effects.subscribers[1] - s.effects.subscribers[0])) + s.effects.subscribers[0];
        newState.player.stats.subscribers += gain;
      }
    });

    // 주차 업데이트
    newState.week += 1;
    newState.player.stats.stamina = clamp(newState.player.stats.stamina + 10, 0, 100);
    
    setGameState(newState);
    saveGame(newState);
    setPhase('result');
    setWeekResults({ subscribers: newState.player.stats.subscribers - gameState.player.stats.subscribers });
  };

  const startNewWeek = () => {
    // 엔딩 체크
    const ending = ENDINGS.find(e => gameState.player.stats.subscribers >= e.requirements.subscribers);
    if (ending && gameState.player.stats.subscribers >= 100000) {
      setEndingData({ ending, gameState });
      setScreen('ending');
      setTimeout(() => setShowStats(true), 1000);
      return;
    }

    setSelectedSchedules([]);
    setPhase('select');
  };

  // --- 타이틀 화면 ---
  if (screen === 'title') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 mb-8">유튜버 키우기</h1>
          <div className="space-y-4">
            <button onClick={() => setScreen('create')} className="w-full py-4 bg-pink-500 text-white rounded-2xl font-bold text-lg shadow-lg">새로 시작하기</button>
            {hasSave && (
              <button onClick={() => setScreen('game')} className="w-full py-4 bg-purple-500 text-white rounded-2xl font-bold text-lg shadow-lg text-white">이어하기</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- 생성 화면 ---
  if (screen === 'create') {
    return (
      <div className="min-h-screen bg-pink-500 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-center">캐릭터 생성</h2>
            <input 
              type="text" value={name} onChange={(e) => setName(e.target.value)} 
              placeholder="닉네임 입력" className="w-full p-4 border-2 border-gray-200 rounded-xl mb-4"
            />
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button onClick={() => setGender('male')} className={`p-4 rounded-xl border-2 ${gender === 'male' ? 'border-blue-500 bg-blue-50' : ''}`}>👨 남성</button>
              <button onClick={() => setGender('female')} className={`p-4 rounded-xl border-2 ${gender === 'female' ? 'border-pink-500 bg-pink-50' : ''}`}>👩 여성</button>
            </div>
            <button 
              disabled={!name || !gender}
              onClick={() => {
                const initial = {
                  player: { name, gender, stats: { stamina: 100, stress: 0, money: 1000, subscribers: 0, content: 10, editing: 10, talk: 10, appearance: 10 } },
                  week: 1, year: 1, season: 'spring'
                };
                setGameState(initial);
                saveGame(initial);
                setScreen('game');
              }}
              className="w-full py-4 bg-gray-800 text-white rounded-xl font-bold disabled:opacity-30"
            >활동 시작!</button>
        </div>
      </div>
    );
  }

  // --- 게임 화면 ---
  if (screen === 'game' && gameState) {
    const { player, week } = gameState;

    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          {/* 상단 바 */}
          <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 flex justify-between items-center">
            <div>
              <span className="font-black text-xl">{player.name}</span>
              <span className="ml-2 text-gray-500">{week}주차</span>
            </div>
            <div className="flex gap-4 font-bold">
              <span className="text-red-500">❤️ {player.stats.stamina}</span>
              <span className="text-blue-500">👥 {player.stats.subscribers.toLocaleString()}</span>
            </div>
          </div>

          {phase === 'select' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SCHEDULES.map(s => (
                  <button 
                    key={s.id} onClick={() => handleScheduleSelect(s.id)}
                    className={`p-4 bg-white rounded-2xl text-left border-4 transition-all ${selectedSchedules.includes(s.id) ? 'border-pink-500 bg-pink-50' : 'border-transparent'}`}
                  >
                    <span className="text-2xl mr-2">{s.icon}</span>
                    <span className="font-bold">{s.name}</span>
                    <p className="text-xs text-gray-400 mt-1">{s.description}</p>
                  </button>
                ))}
              </div>
              <button 
                onClick={handleConfirm} disabled={selectedSchedules.length !== 3}
                className="w-full py-5 bg-pink-500 text-white rounded-2xl font-black text-xl shadow-lg disabled:opacity-30"
              >스케줄 실행!</button>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl shadow-xl text-center animate-in zoom-in">
              <h3 className="text-2xl font-black mb-6">주간 리포트</h3>
              <div className="text-4xl font-bold text-blue-600 mb-8">
                구독자 +{weekResults.subscribers.toLocaleString()}명!
              </div>
              <button onClick={startNewWeek} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-bold">다음 주로</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- 엔딩 화면 ---
  if (screen === 'ending' && endingData) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
        <div className="text-8xl mb-6">{endingData.ending.image}</div>
        <h1 className="text-5xl font-black mb-4">{endingData.ending.name}</h1>
        <p className="text-xl text-gray-400 mb-12">{endingData.ending.description}</p>
        <button 
          onClick={() => {
            if (typeof window !== 'undefined') localStorage.removeItem('youtuber-maker-save');
            window.location.reload();
          }}
          className="px-10 py-4 bg-white text-black rounded-full font-bold"
        >처음으로 돌아가기</button>
      </div>
    );
  }

  return null;
}
