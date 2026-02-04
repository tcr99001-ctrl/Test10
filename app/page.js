'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, RotateCcw, Menu, ChevronRight, 
  Briefcase, Search, AlertTriangle, Gavel, Hand
} from 'lucide-react';

// ==================== [1. 게임 리소스] ====================

const CHARACTERS = {
  narrator: { name: "", image: null },
  judge: { 
    name: "재판장", 
    color: "text-yellow-600",
    image: "👨‍⚖️",
    desc: "엄격하지만 푸딩을 좋아함"
  },
  prosecutor: { 
    name: "나검사", 
    color: "text-red-500",
    image: "🤵‍♂️",
    desc: "냉철한 엘리트 검사"
  },
  player: { 
    name: "김변호", 
    color: "text-blue-500",
    image: "👉", // 이의있소 포즈
    desc: "역전의 발상천재"
  },
  witness: { 
    name: "박민수", 
    color: "text-green-600",
    images: {
      normal: "🙎‍♂️",
      sweat: "🙎‍♂️💦",
      shock: "🙎‍♂️⚡",
      breakdown: "😱"
    }
  }
};

const EVIDENCE = [
  { id: 'pudding_cup', name: '빈 푸딩 컵', icon: '🗑️', desc: '교장실 쓰레기통에서 발견됨. 뚜껑이 열려있다.' },
  { id: 'spoon', name: '더러운 숟가락', icon: '🥄', desc: '용의자(지호)의 주머니에 있던 숟가락. 초코가 묻어있다.' },
  { id: 'receipt', name: '편의점 영수증', icon: '🧾', desc: '사건 발생 시간(12:30)에 지호가 매점에 있었다는 증거.' },
  { id: 'photo', name: '현장 사진', icon: '📸', desc: '냉장고 문이 열려있는 사진. 젓가락이 떨어져 있다.' }
];

// ==================== [2. 시나리오 데이터] ====================

const SCRIPT = [
  // --- 인트로 ---
  { type: 'scene', bg: 'court' },
  { type: 'talk', char: 'judge', text: "지금부터 '교장 선생님 푸딩 도난 사건'의 재판을 개정합니다." },
  { type: 'talk', char: 'prosecutor', text: "피고인(지호)은 점심시간에 교장실에 몰래 들어가 푸딩을 훔쳐 먹었습니다.", face: 'normal' },
  { type: 'talk', char: 'player', text: "(지호가 그럴 리 없어. 내가 무죄를 밝혀내겠어!)", face: 'normal' },
  { type: 'talk', char: 'judge', text: "그럼, 목격자인 박민수 학생. 증언해주세요." },
  
  // --- 심문 파트 시작 ---
  { type: 'anim', name: 'witness_start' }, // 증언 개시 효과
  { type: 'talk', char: 'witness', text: "아, 네.. 저는 그때 똑똑히 봤습니다.", face: 'normal' },
  
  // [증언 루프 구간] - 여기서 유저가 추궁/제시를 해야 함
  { 
    id: 'testimony_1',
    type: 'cross_exam', 
    statements: [
      { 
        text: "1. 저는 12시 30분에 교장실 앞을 지나가고 있었어요.", 
        weakness: false 
      },
      { 
        text: "2. 그때 지호가 교장실에서 허겁지겁 나오는 걸 봤죠.", 
        weakness: false 
      },
      { 
        text: "3. 손에는 숟가락을 들고 입가엔 푸딩을 묻히고 있었어요!", 
        weakness: false,
        press: "잠깐! 확실히 '숟가락'이었나요? 잘못 본 거 아닙니까?" // 추궁 시 대사
      },
      { 
        text: "4. 분명 훔쳐 먹은 게 틀림없습니다! 아주 맛있게 먹더군요.", 
        weakness: true, // 여기가 약점 (영수증과 모순)
        contradiction: 'receipt', // 영수증을 제시하면 성공
        successNext: 'success_route',
        failMsg: "그 증거는 이 발언과 모순되지 않아..."
      }
    ]
  },
  { type: 'talk', char: 'player', text: "(이 증언... 어딘가 이상해. 증거품과 비교해보자.)", guide: true },
  { type: 'jump', to: 'testimony_1' } // 못 찾으면 무한 루프
];

const SUCCESS_SCRIPT = [
  { type: 'anim', name: 'objection' }, // 이의 있소!!
  { type: 'talk', char: 'player', text: "잠깐! 그 증언은 명백히 모순되어 있습니다!", size: 'big' },
  { type: 'talk', char: 'witness', text: "네? 뭐, 뭐가요?", face: 'sweat' },
  { type: 'talk', char: 'player', text: "당신은 12시 30분에 범행을 목격했다고 했지만...", face: 'normal' },
  { type: 'evidence_flash', id: 'receipt' }, // 증거 번쩍
  { type: 'talk', char: 'player', text: "이 영수증을 보십시오! 12시 30분에 지호는 매점에서 빵을 사고 있었습니다!", color: 'text-blue-400' },
  { type: 'talk', char: 'prosecutor', text: "뭣이?! 알리바이가 성립한다는 건가!", face: 'shock' },
  { type: 'talk', char: 'witness', text: "으으윽... 그, 그건...", face: 'shock' },
  { type: 'talk', char: 'judge', text: "증인! 거짓말을 한 겁니까?", face: 'normal' },
  { type: 'talk', char: 'witness', text: "사실... 제가 먹었습니다!!! 죄송합니다!!!", face: 'breakdown' },
  { type: 'anim', name: 'confetti' },
  { type: 'end', text: "승소 - 완벽한 역전" }
];

// ==================== [3. 엔진 컴포넌트] ====================

export default function AceAttorneyGame() {
  const [index, setIndex] = useState(0);
  const [script, setScript] = useState(SCRIPT);
  const [bg, setBg] = useState("bg-slate-900");
  const [evidenceMode, setEvidenceMode] = useState(false); // 증거 제시 모드
  const [hp, setHp] = useState(5); // 하트 5개 (실수하면 깎임)
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false); // 이의있소 컷신용
  const [objectionType, setObjectionType] = useState(null); // 'objection', 'holdit'

  // 심문(Cross Exam) 상태
  const [ceIndex, setCeIndex] = useState(0); // 현재 심문 중인 문장 인덱스
  
  const currentLine = script[index];

  // --- 진행 로직 ---
  const handleNext = () => {
    if (evidenceMode) return; // 증거 창 열려있으면 클릭 방지

    // 심문 모드일 때
    if (currentLine.type === 'cross_exam') {
      const nextStmtIdx = ceIndex + 1;
      if (nextStmtIdx >= currentLine.statements.length) {
        // 심문 한 바퀴 돌았음 -> 다음 스크립트로 이동 (보통 루프됨)
        setIndex(prev => prev + 1);
        setCeIndex(0);
      } else {
        setCeIndex(nextStmtIdx);
      }
      return;
    }

    // 일반 대화 모드
    if (currentLine.type === 'jump') {
      const targetIdx = script.findIndex(l => l.id === currentLine.to);
      setIndex(targetIdx);
    } else if (currentLine.type === 'end') {
      alert("게임 클리어! " + currentLine.text);
      window.location.reload();
    } else {
      setIndex(prev => prev + 1);
    }
  };

  // --- 효과 처리 ---
  useEffect(() => {
    if (!currentLine) return;

    if (currentLine.type === 'anim') {
      if (currentLine.name === 'objection') {
        setObjectionType('objection');
        setTimeout(() => { setObjectionType(null); handleNext(); }, 1500);
      } else if (currentLine.name === 'witness_start') {
        setFlash(true);
        setTimeout(() => { setFlash(false); handleNext(); }, 500);
      } else {
        handleNext();
      }
    }
  }, [index, script]);

  // --- 증거 제시 로직 (핵심) ---
  const presentEvidence = (evidenceId) => {
    if (currentLine.type !== 'cross_exam') return;

    const statement = currentLine.statements[ceIndex];
    
    if (statement.weakness && statement.contradiction === evidenceId) {
      // 정답!
      setObjectionType('objection');
      setTimeout(() => {
        setObjectionType(null);
        setScript(SUCCESS_SCRIPT); // 성공 루트로 스크립트 교체
        setIndex(0);
        setEvidenceMode(false);
      }, 1500);
    } else {
      // 오답!
      setHp(prev => Math.max(0, prev - 1));
      triggerShake();
      alert("재판장: 그 증거는 지금 발언과 관련이 없습니다! (패널티 -1)");
      if (hp <= 1) {
        alert("패소... 유죄 판결이 내려졌습니다.");
        window.location.reload();
      }
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // --- 렌더링 헬퍼 ---
  const isCrossExam = currentLine?.type === 'cross_exam';
  const currentStatement = isCrossExam ? currentLine.statements[ceIndex] : null;
  const displayText = isCrossExam ? currentStatement.text : currentLine?.text;
  const displayChar = isCrossExam ? CHARACTERS.witness : (currentLine?.char ? CHARACTERS[currentLine.char] : null);

  return (
    <div className={`h-screen w-full bg-slate-900 overflow-hidden relative select-none font-sans ${shake ? 'animate-shake' : ''}`}>
      <style jsx global>{`
        @keyframes shake { 0%, 100% { transform: translate(0, 0); } 10%, 30%, 50%, 70%, 90% { transform: translate(-5px, 0); } 20%, 40%, 60%, 80% { transform: translate(5px, 0); } }
        .animate-shake { animation: shake 0.4s; }
        @keyframes pop-in { 0% { transform: scale(0); opacity: 0; } 80% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>

      {/* 배경 (법정) */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2000')] bg-cover opacity-30"></div>

      {/* === HP 바 (재판관 신뢰도) === */}
      <div className="absolute top-4 left-4 z-50 flex gap-1 bg-black/50 p-2 rounded-full border border-white/20">
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`w-6 h-6 rounded-full transition-all ${i < hp ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-gray-800'}`}>
            {i < hp && "⚖️"}
          </div>
        ))}
      </div>

      {/* === 이의있소! 오버레이 === */}
      {objectionType && (
        <div className="absolute inset-0 z-[100] bg-white flex items-center justify-center animate-in fade-out duration-1000 fill-mode-forwards">
          <div className="relative">
            <div className="absolute inset-0 bg-red-600 animate-ping opacity-50 rounded-full"></div>
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Objection.svg/1200px-Objection.svg.png" 
                 alt="Objection" className="w-[500px] animate-[pop-in_0.3s_ease-out]" />
          </div>
        </div>
      )}

      {/* === 캐릭터 스탠딩 === */}
      <div className="absolute bottom-40 w-full flex justify-center z-10 pointer-events-none">
        {displayChar && (
          <div className={`text-[200px] md:text-[300px] filter drop-shadow-2xl transition-transform duration-300 ${isCrossExam ? 'animate-bounce-slow' : ''}`}>
            {displayChar.image || (currentLine.face ? displayChar.images[currentLine.face] : displayChar.images?.normal)}
          </div>
        )}
      </div>

      {/* === 심문 중 표시 === */}
      {isCrossExam && (
        <div className="absolute top-20 w-full text-center z-20">
          <div className="inline-block bg-green-700 text-white font-black text-2xl px-12 py-2 rounded-sm border-y-4 border-green-500 shadow-lg animate-pulse">
            ~ 증언 시작 ~
          </div>
        </div>
      )}

      {/* === 대화창 (하단) === */}
      <div 
        onClick={handleNext}
        className={`absolute bottom-0 w-full p-4 md:p-8 z-30 transition-all ${evidenceMode ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}
      >
        <div className="max-w-4xl mx-auto bg-black/80 backdrop-blur-md border-4 border-white/20 rounded-xl p-6 min-h-[180px] relative shadow-2xl hover:bg-black/90 cursor-pointer">
          {/* 이름표 */}
          {displayChar && (
            <div className="absolute -top-5 left-6 bg-blue-600 text-white font-bold px-6 py-1 rounded-t-lg border-t-2 border-x-2 border-white/20 text-lg">
              {displayChar.name}
            </div>
          )}
          
          {/* 텍스트 */}
          <p className={`text-xl md:text-2xl font-medium leading-relaxed ${isCrossExam ? 'text-green-300' : 'text-white'}`}>
            {displayText}
          </p>

          {/* 심문 컨트롤러 */}
          {isCrossExam && (
            <div className="absolute -top-16 right-0 flex gap-4">
              <button 
                onClick={(e) => { e.stopPropagation(); setEvidenceMode(true); }}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl px-6 py-3 rounded-full shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none flex items-center gap-2"
              >
                <Briefcase/> 증거 제시
              </button>
            </div>
          )}

          {/* 다음 화살표 */}
          <div className="absolute bottom-4 right-4 animate-bounce text-slate-400">
            <ChevronRight size={32} />
          </div>
        </div>
      </div>

      {/* === 증거 법정기록 (Inventory) === */}
      {evidenceMode && (
        <div className="absolute inset-0 bg-black/90 z-40 p-8 flex flex-col items-center animate-in slide-in-from-bottom-10">
          <div className="w-full max-w-4xl">
            <div className="flex justify-between items-center mb-8 border-b-2 border-gray-700 pb-4">
              <h2 className="text-3xl font-black text-white flex items-center gap-2"><Briefcase/> 법정 기록</h2>
              <button onClick={() => setEvidenceMode(false)} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-full font-bold">닫기</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EVIDENCE.map(item => (
                <button 
                  key={item.id}
                  onClick={() => presentEvidence(item.id)}
                  className="bg-slate-800 p-4 rounded-xl border-2 border-slate-600 flex items-center gap-4 hover:bg-slate-700 hover:border-yellow-500 transition-all group text-left"
                >
                  <div className="text-4xl bg-black/50 p-3 rounded-lg group-hover:scale-110 transition-transform">{item.icon}</div>
                  <div>
                    <div className="text-xl font-bold text-yellow-400 mb-1">{item.name}</div>
                    <div className="text-sm text-gray-400">{item.desc}</div>
                    <div className="mt-2 text-xs text-red-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      이 증거를 제시한다! (CLICK)
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
