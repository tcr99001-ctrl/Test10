'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Save, RotateCcw, Menu, X, ChevronRight, 
  History, Settings, SkipForward, Volume2 
} from 'lucide-react';

// ==================== [1. 게임 리소스 설정] ====================

// 🎨 캐릭터 데이터 (이모지로 대체했지만, 실제 이미지 URL로 교체 가능)
const CHARACTERS = {
  narrator: { name: "", color: "text-gray-300", image: null },
  jiho: { 
    name: "한지호", 
    color: "text-blue-400", 
    images: {
      normal: "👦", 
      smile: "👦✨", 
      shock: "👦💦", 
      angry: "👦💢"
    }
  },
  yuna: { 
    name: "김유나", 
    color: "text-pink-400", 
    images: {
      normal: "👩", 
      smile: "👩💖", 
      shy: "👩///", 
      angry: "👩🔥"
    }
  },
  detective: {
    name: "강형사",
    color: "text-yellow-500",
    images: {
      normal: "🕵️‍♂️",
      serious: "🕵️‍♂️⚖️"
    }
  }
};

// 🖼️ 배경 이미지 (CSS 그라데이션 or URL)
const BACKGROUNDS = {
  classroom: "bg-slate-800", // 교실
  corridor: "bg-slate-900",  // 복도
  rooftop: "bg-indigo-900",  // 옥상
  black: "bg-black"          // 암전
};

// 📜 시나리오 스크립트 (핵심 데이터)
// type: 'talk' (대화), 'choice' (선택지), 'scene' (배경변경), 'end' (엔딩)
const SCRIPT = {
  // === 프롤로그 ===
  start: [
    { type: 'scene', bg: 'classroom' },
    { type: 'talk', char: 'narrator', text: "평범한 오후 4시. 방과 후 교실." },
    { type: 'talk', char: 'jiho', text: "야, 그거 들었어? 우리 학교 옥상에 귀신 나온다는 소문.", face: 'normal' },
    { type: 'talk', char: 'narrator', text: "지호가 내 책상에 걸터앉으며 물었다." },
    { type: 'choice', choices: [
        { text: "귀신이 어딨어, 바보냐?", next: 'route_skeptic' },
        { text: "진짜? 어떤 귀신인데?", next: 'route_curious' }
      ] 
    }
  ],

  // === 루트 A: 회의적인 반응 ===
  route_skeptic: [
    { type: 'talk', char: 'jiho', text: "아 재미없는 녀석. 진짜라니까?", face: 'angry' },
    { type: 'talk', char: 'yuna', text: "너희들 아직도 안 갔어?", face: 'normal' },
    { type: 'talk', char: 'narrator', text: "그때, 반장인 유나가 뒷문을 열고 들어왔다." },
    { type: 'talk', char: 'jiho', text: "엇, 유나야! 마침 잘 왔다. 너도 옥상 귀신 얘기 알지?", face: 'smile' },
    { type: 'talk', char: 'yuna', text: "...", face: 'shy' },
    { type: 'talk', char: 'yuna', text: "그거... 내가 퍼뜨린 소문이야.", face: 'normal' },
    { type: 'talk', char: 'jiho', text: "뭐?! 네가 왜?", face: 'shock' },
    { type: 'choice', choices: [
        { text: "유나를 추궁한다", next: 'route_investigate' },
        { text: "유나를 감싸준다", next: 'route_romance' }
      ]
    }
  ],

  // === 루트 B: 호기심 ===
  route_curious: [
    { type: 'talk', char: 'jiho', text: "밤마다 옥상에서 쿵쿵 소리가 난대.", face: 'shock' },
    { type: 'talk', char: 'detective', text: "잠깐, 거기 학생들.", face: 'serious' },
    { type: 'talk', char: 'narrator', text: "갑자기 낯선 아저씨가 교실로 들어왔다." },
    { type: 'talk', char: 'detective', text: "혹시 이 학교 옥상 열쇠, 누가 가지고 있는지 아나?", face: 'normal' },
    { type: 'end', ending: "미스터리 루트 진입 (데모 종료)" }
  ],

  // === 루트 C: 추궁 (역전재판 스타일) ===
  route_investigate: [
    { type: 'scene', bg: 'black' },
    { type: 'effect', name: 'shake' }, // 화면 흔들림 효과
    { type: 'talk', char: 'narrator', text: "이의 있소!!", size: 'text-6xl', color: 'text-red-500' },
    { type: 'scene', bg: 'classroom' },
    { type: 'talk', char: 'detective', text: "학생, 그 추리... 제법이군.", face: 'smile' },
    { type: 'end', ending: "탐정 엔딩: 진실을 쫓는 자" }
  ],

  // === 루트 D: 로맨스 (프린세스 메이커 스타일) ===
  route_romance: [
    { type: 'talk', char: 'yuna', text: "고마워... 사실 옥상에서 몰래 고양이를 키우고 있었거든.", face: 'smile' },
    { type: 'talk', char: 'narrator', text: "유나의 얼굴이 붉어졌다. 호감도가 상승했다.", color: 'text-pink-300' },
    { type: 'effect', name: 'heart' },
    { type: 'end', ending: "로맨스 엔딩: 둘만의 비밀" }
  ]
};

// ==================== [메인 엔진 컴포넌트] ====================

export default function VisualNovelEngine() {
  // --- State ---
  const [screen, setScreen] = useState('title'); // title, game, ending
  const [currentScript, setCurrentScript] = useState('start'); // 현재 시나리오 ID
  const [currentIndex, setCurrentIndex] = useState(0); // 현재 대사 인덱스
  const [displayedText, setDisplayedText] = useState(""); // 타이핑 효과용 텍스트
  const [isTyping, setIsTyping] = useState(false);
  const [log, setLog] = useState([]); // 대화 로그
  const [showLog, setShowLog] = useState(false);
  const [endingName, setEndingName] = useState("");
  const [bg, setBg] = useState("classroom");
  const [shake, setShake] = useState(false); // 화면 흔들림

  // --- Refs ---
  const typeInterval = useRef(null);
  const scrollRef = useRef(null);

  // --- 초기화 ---
  useEffect(() => {
    // 로컬 스토리지 체크 (Vercel 에러 방지)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vn-save');
      // 필요하면 여기서 로드 버튼 활성화 로직 추가
    }
  }, []);

  // --- 엔진 로직: 대사 진행 ---
  const processLine = useCallback(() => {
    const lines = SCRIPT[currentScript];
    if (!lines || currentIndex >= lines.length) return;

    const line = lines[currentIndex];

    // 1. 장면(배경) 변경
    if (line.type === 'scene') {
      setBg(line.bg);
      setCurrentIndex(prev => prev + 1);
      return;
    }

    // 2. 특수 효과
    if (line.type === 'effect') {
      if (line.name === 'shake') {
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
      setCurrentIndex(prev => prev + 1);
      return;
    }

    // 3. 엔딩 처리
    if (line.type === 'end') {
      setEndingName(line.ending);
      setScreen('ending');
      return;
    }

    // 4. 대화 출력 (타이핑 효과)
    if (line.type === 'talk') {
      setIsTyping(true);
      setDisplayedText("");
      let charIdx = 0;
      
      clearInterval(typeInterval.current);
      typeInterval.current = setInterval(() => {
        if (charIdx < line.text.length) {
          setDisplayedText(line.text.substring(0, charIdx + 1));
          charIdx++;
        } else {
          setIsTyping(false);
          clearInterval(typeInterval.current);
        }
      }, 30); // 타이핑 속도 (ms)
    }

  }, [currentScript, currentIndex]);

  // currentIndex 변경 시 실행
  useEffect(() => {
    if (screen === 'game') {
      processLine();
    }
  }, [screen, currentScript, currentIndex, processLine]);

  // --- 유저 입력 처리 ---
  const handleNext = () => {
    const lines = SCRIPT[currentScript];
    const line = lines[currentIndex];

    // 선택지에서는 클릭으로 넘어가지 않음
    if (line.type === 'choice') return;

    // 타이핑 중이면 즉시 완성
    if (isTyping) {
      clearInterval(typeInterval.current);
      setDisplayedText(line.text);
      setIsTyping(false);
      return;
    }

    // 로그 저장
    setLog(prev => [...prev, { char: CHARACTERS[line.char]?.name || "System", text: line.text }]);

    // 다음 대사로
    setCurrentIndex(prev => prev + 1);
  };

  const handleChoice = (nextId) => {
    setCurrentScript(nextId);
    setCurrentIndex(0);
  };

  // 저장 기능
  const saveGame = () => {
    if (typeof window !== 'undefined') {
      const data = { currentScript, currentIndex, bg, log };
      localStorage.setItem('vn-save', JSON.stringify(data));
      alert("진행 상황이 저장되었습니다.");
    }
  };

  // 불러오기 기능
  const loadGame = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vn-save');
      if (saved) {
        const data = JSON.parse(saved);
        setCurrentScript(data.currentScript);
        setCurrentIndex(data.currentIndex);
        setBg(data.bg);
        setLog(data.log);
        setScreen('game');
      } else {
        alert("저장된 데이터가 없습니다.");
      }
    }
  };

  // --- 렌더링 ---

  // 현재 라인 데이터 가져오기
  const currentLine = SCRIPT[currentScript]?.[currentIndex];
  const currentChar = currentLine?.char ? CHARACTERS[currentLine.char] : null;

  // 타이틀 화면
  if (screen === 'title') {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center text-white relative overflow-hidden">
        {/* 배경 애니메이션 */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1593022568600-b6b91ae4608b?q=80&w=2070')] bg-cover opacity-30 animate-pulse-slow"></div>
        
        <div className="z-10 text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <h1 className="text-6xl font-black tracking-tighter drop-shadow-2xl">
            <span className="text-red-500">방과 후</span> 미스터리
          </h1>
          <p className="text-xl text-gray-300">선택에 따라 운명이 바뀌는 비주얼 노벨</p>
          
          <div className="flex flex-col gap-4 w-64 mx-auto">
            <button onClick={() => { setScreen('game'); setCurrentScript('start'); setCurrentIndex(0); setLog([]); }} className="flex items-center justify-center gap-2 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-all shadow-xl">
              <Play size={20}/> 게임 시작
            </button>
            <button onClick={loadGame} className="flex items-center justify-center gap-2 py-4 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-all shadow-xl border border-slate-600">
              <RotateCcw size={20}/> 이어하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 엔딩 화면
  if (screen === 'ending') {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-8 animate-in fade-in duration-1000">
        <h2 className="text-4xl font-bold mb-4 text-yellow-400">THE END</h2>
        <div className="text-2xl mb-12 border-b-2 border-white pb-2">{endingName}</div>
        <button onClick={() => setScreen('title')} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200">
          타이틀로 돌아가기
        </button>
      </div>
    );
  }

  // 게임 화면
  return (
    <div className={`h-screen w-full relative overflow-hidden select-none font-sans ${BACKGROUNDS[bg] || 'bg-slate-900'} transition-colors duration-1000`}>
      <style jsx global>{`
        .animate-pulse-slow { animation: pulse 10s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        .shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
      `}</style>

      <div className={`absolute inset-0 ${shake ? 'shake' : ''}`}>
        
        {/* === 1. 상단 메뉴 === */}
        <div className="absolute top-0 right-0 p-4 z-50 flex gap-2">
          <button onClick={() => setShowLog(true)} className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70"><History size={20}/></button>
          <button onClick={saveGame} className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70"><Save size={20}/></button>
          <button onClick={() => setScreen('title')} className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70"><Menu size={20}/></button>
        </div>

        {/* === 2. 캐릭터 스탠딩 (화면 중앙) === */}
        <div className="absolute bottom-40 w-full flex justify-center items-end pointer-events-none z-10">
          {currentChar && currentChar.images && (
            <div className="text-[150px] md:text-[250px] filter drop-shadow-2xl animate-in slide-in-from-bottom-10 duration-500 transform transition-transform">
              {currentChar.images[currentLine.face] || currentChar.images.normal}
            </div>
          )}
        </div>

        {/* === 3. 대화창 (하단) === */}
        <div className="absolute bottom-0 w-full p-4 md:p-8 z-20">
          {/* 선택지 모드 */}
          {currentLine?.type === 'choice' ? (
            <div className="flex flex-col gap-3 max-w-2xl mx-auto mb-20 animate-in zoom-in duration-300">
              {currentLine.choices.map((choice, i) => (
                <button 
                  key={i} 
                  onClick={() => handleChoice(choice.next)}
                  className="w-full py-5 bg-white/90 backdrop-blur-md text-slate-900 font-bold text-xl rounded-2xl shadow-xl hover:bg-white hover:scale-105 transition-all border-l-8 border-indigo-500"
                >
                  {choice.text}
                </button>
              ))}
            </div>
          ) : (
            // 일반 대화 모드
            <div 
              onClick={handleNext}
              className="relative bg-black/80 backdrop-blur-md border-2 border-white/20 rounded-3xl p-6 md:p-8 min-h-[180px] shadow-2xl cursor-pointer hover:bg-black/85 transition-colors group"
            >
              {/* 이름표 */}
              {currentChar && (
                <div className="absolute -top-6 left-8 bg-indigo-600 text-white px-6 py-2 rounded-xl font-black text-lg shadow-lg border border-white/20">
                  {currentChar.name}
                </div>
              )}
              
              {/* 대사 텍스트 */}
              <p className={`text-xl md:text-2xl text-white leading-relaxed font-medium ${currentLine?.size || ''} ${currentLine?.color || ''}`}>
                {displayedText}
                {isTyping && <span className="animate-pulse">|</span>}
              </p>

              {/* 다음 아이콘 */}
              {!isTyping && (
                <div className="absolute bottom-6 right-6 animate-bounce text-indigo-400">
                  <ChevronRight size={32} strokeWidth={3} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* === 4. 로그 오버레이 === */}
        {showLog && (
          <div className="absolute inset-0 bg-black/90 z-50 p-8 flex flex-col animate-in fade-in">
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
              <h2 className="text-3xl font-bold text-white">지난 대화</h2>
              <button onClick={() => setShowLog(false)} className="p-2 bg-white text-black rounded-full"><X/></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {log.map((l, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <span className="text-indigo-400 font-bold text-sm">{l.char}</span>
                  <span className="text-gray-300 text-lg">{l.text}</span>
                </div>
              ))}
              {log.length === 0 && <div className="text-gray-500 text-center mt-20">기록된 대화가 없습니다.</div>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
