'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, ChevronRight, Save, RotateCcw, AlertTriangle, Search, Gavel, Sparkles } from 'lucide-react';
// ==================== [1. 통합 캐릭터 및 증거 설정] ====================
const CHARACTERS = {
  judge: { name: "재판장", image: "👨‍⚖️" },
  prosecutor: { name: "나검사", image: "🤵‍♂️", desc: "패배를 모르는 냉혈한" },
  player: { name: "김변호", image: "👉", desc: "역전의 발상" },
  witness: { name: "최태오", images: { normal: "😎", sweat: "😎💦", angry: "🤬", shock: "🤯", breakdown: "🧟‍♂️" }, desc: "미술부 부장. 거만함." },
  jimin: { name: "이지민", image: "🥺", desc: "피고인. 소심한 미술부원." },
  narrator: { name: "나레이션", image: "" }
};
const EVIDENCE = [
  { id: 'knife', name: '미술용 나이프', icon: '🔪', desc: '지민의 지문이 묻어있지만, 누구나 만질 수 있는 공용 도구다.' },
  { id: 'picture', name: '훼손된 그림', icon: '🎨', desc: '붉은 물감통이 터져서 그림 전체가 피처럼 붉게 물들었다.' },
  { id: 'cctv', name: '복도 CCTV', icon: '📹', desc: '사건 시각(16:00) 전후로 미술실 앞 복도를 지나간 사람은 없었다.' },
  { id: 'floor_map', name: '미술실 도면', icon: '🗺️', desc: '미술실에는 앞문과 뒷문이 있다. 뒷문은 창고로 연결된다.' },
  { id: 'glove', name: '작업용 장갑', icon: '🧤', desc: '지민이가 평소 사용하는 장갑. 깨끗하다.' },
  { id: 'storage_photo', name: '창고 사진', icon: '🪟', desc: '창고의 유일한 창문. 쇠창살로 단단히 막혀있다.' },
  { id: 'police_report', name: '수색 보고서', icon: '👮', desc: '사건 직후 창고를 수색했으나, 안에는 아무도 없었다.' },
  { id: 'apron', name: '지민의 앞치마', icon: '🎽', desc: '물감 한 방울 묻지 않은 깨끗한 앞치마.' },
  { id: 'floor_photo', name: '바닥 현장 사진', icon: '📸', desc: '그림 주변 반경 2m까지 붉은 물감이 튀어 난장판이다.' },
  { id: 'stained_glove', name: '피묻은(?) 장갑', icon: '🥊', desc: '★결정적 증거★ 쓰레기통 깊숙한 곳에서 발견된 붉은 물감 범벅의 장갑. [태오]라는 이름이 쓰여있다.' }
];
// ==================== [2. 통합 시나리오 데이터] ====================
const SCRIPT_PART_1 = [
  // --- 인트로 ---
  { type: 'scene', bg: 'bg-slate-900' },
  { type: 'talk', char: 'judge', text: "지금부터 '미술실 그림 훼손 사건'의 재판을 시작합니다." },
  { type: 'talk', char: 'prosecutor', text: "이번 사건은 너무나 명백합니다. 목격자, 흉기, 지문. 모든 게 피고인을 가리키죠.", face: 'normal' },
  { type: 'talk', char: 'player', text: "(지민이는 절대 그럴 아이가 아니야. 분명 함정이 있어!)", face: 'normal' },
  { type: 'talk', char: 'judge', text: "검찰 측, 입증을 시작하십시오." },
 
  // --- 검사의 논리 ---
  { type: 'talk', char: 'prosecutor', text: "사건은 어제 오후 4시. 미술실에서 발생했습니다." },
  { type: 'talk', char: 'prosecutor', text: "피고인은 피해자의 그림을 [미술용 나이프]로 찢었습니다.", face: 'normal' },
  { type: 'talk', char: 'player', text: "잠깐! 지문이 나왔다고 해서 범인이라 단정할 순 없습니다!", size: 'text-3xl' },
  { type: 'talk', char: 'prosecutor', text: "훗. 그럴 줄 알고 '결정적인 목격자'를 준비했지. 들어오게.", face: 'normal' },
  // --- 증인 등장 ---
  { type: 'anim', name: 'witness_enter' },
  { type: 'talk', char: 'witness', text: "여~ 안녕? 내가 미술부 부장, 최태오다.", face: 'normal' },
  { type: 'talk', char: 'player', text: "(저 거만한 태도... 마음에 안 드는데.)" },
  { type: 'talk', char: 'judge', text: "증인, 그날 본 것을 정확히 증언하세요." },
  // ================= [논리 싸움 1: 헛점 찌르기] =================
  { type: 'anim', name: 'cross_exam_start' },
  {
    id: 'ce_1',
    type: 'cross_exam',
    statements: [
      {
        text: "1. 그날 저는 4시에 미술실 뒷정리를 하러 갔습니다.",
        weakness: false
      },
      {
        text: "2. 문을 열자마자 지민이가 그림을 찢고 있는 걸 봤죠!",
        weakness: false,
        press: "어느 문으로 들어갔습니까? 앞문? 뒷문?"
      },
      {
        text: "3. 너무 놀라서 소리를 질렀고, 지민이는 저를 보고 도망쳤습니다.",
        weakness: false
      },
      {
        text: "4. 복도로 뛰어가는 뒷모습을 제 두 눈으로 똑똑히 봤다니까요!",
        weakness: true, // 약점: 복도 CCTV와 모순
        contradiction: 'cctv',
        failMsg: "복도로 도망쳤다면... 그 증거와는 관련이 없어 보이는데?"
      }
    ]
  }
];
const PART_1_SUCCESS = [
  { type: 'anim', name: 'objection' },
  { type: 'talk', char: 'player', text: "이의 있소! 증인은 방금 '복도'로 도망치는 걸 봤다고 했죠?", size: 'text-3xl', color: 'text-blue-400' },
  { type: 'talk', char: 'witness', text: "그, 그래! 내 시력이 2.0이야! 틀림없어!", face: 'sweat' },
  { type: 'evidence_flash', id: 'cctv' },
  { type: 'talk', char: 'player', text: "하지만 이 [복도 CCTV] 기록을 보십시오!", size: 'text-3xl' },
  { type: 'talk', char: 'player', text: "사건 발생 시각인 4시 전후로, 복도를 지나간 사람은 '아무도' 없었습니다!", color: 'text-blue-400' },
  { type: 'talk', char: 'judge', text: "흐음... 정말이군요. 개미 한 마리 안 찍혀 있습니다.", face: 'normal' },
  { type: 'talk', char: 'witness', text: "크윽... 그, 그건...!", face: 'shock' },
  { type: 'talk', char: 'prosecutor', text: "이의 있음! 변호인은 성급하군.", face: 'normal' },
  { type: 'talk', char: 'player', text: "(...나검사! 무슨 꿍꿍이지?)", face: 'normal' }
];
const SCRIPT_PART_2 = [
  // --- 지난 이야기 & 검사의 반격 ---
  { type: 'scene', bg: 'bg-slate-900' },
  { type: 'talk', char: 'prosecutor', text: "훌륭하군, 김변호. 확실히 피고인은 복도로 나가지 않았어.", face: 'normal' },
  { type: 'talk', char: 'player', text: "그렇다면 지민이는 범인이 아닙니다! 밀실에서 증발할 순 없으니까요." },
  { type: 'talk', char: 'prosecutor', text: "증발? 훗... '다른 출구'가 있다면 얘기가 다르지.", face: 'normal' },
  { type: 'evidence_flash', id: 'floor_map' },
  { type: 'talk', char: 'prosecutor', text: "미술실에는 [뒷문]이 있다. 그곳은 비품 창고와 연결되지.", face: 'normal' },
  { type: 'talk', char: 'witness', text: "마, 맞아! 사실 지민이는 뒷문으로 도망쳤어! 내가 착각했네!", face: 'sweat' },
  { type: 'talk', char: 'judge', text: "흐음... 증언을 번복하는군요. 다시 증언하세요." },
  // ================= [논리 싸움 2: 밀실 트릭 파해] =================
  { type: 'anim', name: 'cross_exam_start' },
  {
    id: 'ce_2',
    type: 'cross_exam',
    statements: [
      {
        text: "1. 그래, 기억났어. 지민이는 분명 뒷문을 열고 창고로 들어갔어.",
        weakness: false
      },
      {
        text: "2. 저는 무서워서 따라가진 못하고, 바로 선생님을 부르러 갔죠.",
        weakness: false,
        press: "창고 문은 잠겨있지 않았습니까?"
      },
      {
        text: "3. 선생님이 오셔서 창고를 열어봤지만, 안은 텅 비어있었지.",
        weakness: false
      },
      {
        text: "4. 창고에는 창문이 있어! 분명 그 창문을 통해 밖으로 뛰어내린 거야!",
        weakness: true, // 약점: 창문은 쇠창살로 막혀있음 (storage_photo)
        contradiction: 'storage_photo',
        failMsg: "창고 안이 비어있었다면... 창문으로 도망친 게 맞지 않을까?"
      }
    ]
  }
];
const PART_2_SUCCESS = [
  { type: 'anim', name: 'objection' },
  { type: 'talk', char: 'player', text: "이의 있소! 증인은 창문으로 도망쳤다고 했습니까?", size: 'text-3xl', color: 'text-blue-400' },
  { type: 'talk', char: 'witness', text: "그, 그래! 그거 말고는 설명이 안 되잖아!", face: 'angry' },
  { type: 'evidence_flash', id: 'storage_photo' },
  { type: 'talk', char: 'player', text: "이 사진을 보십시오! 창고의 창문은 '쇠창살'로 막혀있습니다!", size: 'text-3xl' },
  { type: 'talk', char: 'player', text: "사람은커녕 고양이도 빠져나갈 수 없는 구조입니다!", color: 'text-blue-400' },
  { type: 'talk', char: 'judge', text: "그렇군요. 물리적으로 탈출이 불가능합니다.", face: 'normal' },
  { type: 'talk', char: 'prosecutor', text: "으윽... 설마 쇠창살이 있을 줄이야...", face: 'normal' },
  { type: 'talk', char: 'player', text: "자, 정리해봅시다.", face: 'normal' },
  { type: 'talk', char: 'player', text: "1. 복도로 나가지 않았다. (CCTV 증명)\n2. 창고로 도망칠 수도 없다. (쇠창살 증명)", color: 'text-green-400' },
  { type: 'talk', char: 'player', text: "그렇다면 결론은 하나뿐입니다!", size: 'text-3xl' },
  { type: 'talk', char: 'judge', text: "호오... 그게 뭡니까?", face: 'normal' },
  { type: 'talk', char: 'player', text: "범인은... 미술실 밖으로 나간 적이 없습니다! 아직 안에 숨어있었던 겁니다!", size: 'text-3xl' },
  { type: 'talk', char: 'witness', text: "히익?! 마, 말도 안 돼!!", face: 'shock' }
];
const SCRIPT_PART_3 = [
  // --- 지난 이야기 & 검사의 반격 ---
  { type: 'scene', bg: 'bg-slate-900' },
  { type: 'talk', char: 'prosecutor', text: "김변호, 재미있는 추리로군. 범인이 미술실 안에 숨어있었다고?", face: 'normal' },
  { type: 'talk', char: 'prosecutor', text: "하지만 경찰이 도착했을 때 미술실엔 '지민'이와 '목격자' 둘뿐이었네.", face: 'normal' },
  { type: 'talk', char: 'player', text: "(큭... 투명인간일 리는 없고. 그렇다면 목격자의 증언 자체가 거짓말이다!)" },
  { type: 'talk', char: 'judge', text: "증인, 범행 당시의 상황을 좀 더 구체적으로 묘사해보세요." },
  // ================= [논리 싸움 3: 결정적 모순] =================
  { type: 'anim', name: 'cross_exam_start' },
  {
    id: 'ce_3',
    type: 'cross_exam',
    statements: [
      {
        text: "1. 제가 들어갔을 때, 지민이는 커터 칼로 붉은 물감통을 찌르고 있었어요!",
        weakness: false
      },
      {
        text: "2. '펑!' 하는 소리와 함께 물감이 폭탄처럼 터져 나왔죠.",
        weakness: false
      },
      {
        text: "3. 그림은 물론이고, 사방팔방으로 붉은 물감이 튀었습니다.",
        weakness: false,
        press: "사방팔방? 그게 어느 정도였습니까?"
      },
      {
        text: "4. 지민이는 바로 그 앞에서, 온몸으로 물감을 뒤집어쓰며 웃고 있었어요!",
        weakness: true, // 약점: 지민의 앞치마는 깨끗함 (apron)
        contradiction: 'apron',
        failMsg: "물감을 뒤집어썼다면... 현장 사진과는 모순이 없는데?"
      }
    ]
  }
];
const PART_3_SUCCESS = [
  { type: 'anim', name: 'objection' },
  { type: 'talk', char: 'player', text: "이의 있소! 온몸으로 물감을 뒤집어썼다고요?", size: 'text-3xl', color: 'text-blue-400' },
  { type: 'talk', char: 'witness', text: "그, 그래! 마치 피의 축제 같았지! 끔찍했어!", face: 'angry' },
  { type: 'evidence_flash', id: 'apron' },
  { type: 'talk', char: 'player', text: "그렇다면 설명해 보십시오! 이건 사건 직후 경찰이 압수한 [지민의 앞치마]입니다!", size: 'text-3xl' },
  { type: 'talk', char: 'player', text: "보시다시피, 물감 자국은커녕 먼지 하나 없이 '깨끗'합니다!", color: 'text-green-400' },
  { type: 'evidence_flash', id: 'floor_photo' },
  { type: 'talk', char: 'player', text: "현장 사진을 보면 반경 2m가 물감 범벅입니다. 그 중심에 있던 사람이 깨끗하다뇨?", size: 'text-3xl' },
  { type: 'talk', char: 'prosecutor', text: "이럴 수가... 물리적으로 불가능해!", face: 'shock' },
  { type: 'talk', char: 'judge', text: "증인... 당신은 정말로 그 장면을 본 겁니까?", face: 'normal' },
  { type: 'talk', char: 'witness', text: "아... 아아...", face: 'sweat' },
  { type: 'talk', char: 'player', text: "당신은 보지 못한 겁니다! 왜냐하면...", face: 'normal' },
  { type: 'talk', char: 'player', text: "당신이 들어왔을 때, 이미 범행은 끝나 있었으니까요!", size: 'text-3xl' }
];
const SCRIPT_PART_4 = [
  // --- 클라이막스 도입 ---
  { type: 'scene', bg: 'bg-slate-900' },
  { type: 'talk', char: 'judge', text: "정리해봅시다. 피고인은 복도로 도망치지도 않았고(CCTV), 물감을 뒤집어쓰지도 않았습니다(앞치마)." },
  { type: 'talk', char: 'prosecutor', text: "그렇다면... 물감 폭탄이 터질 때, 그 자리에는 '범인' 혼자 있었다는 뜻이군.", face: 'normal' },
  { type: 'talk', char: 'player', text: "맞습니다. 그리고 그 범인은, 지민이에게 죄를 뒤집어씌우기 위해 거짓말을 하고 있죠!", size: 'text-3xl' },
  { type: 'talk', char: 'witness', text: "이... 이봐! 내가 범인이라는 증거라도 있어?! 난 물감 근처에도 안 갔어!", face: 'angry' },
  { type: 'talk', char: 'judge', text: "마지막 기회입니다. 증인은 정말 물감에 손끝 하나 대지 않았습니까?" },
  // ================= [최후의 논리 싸움] =================
  { type: 'anim', name: 'cross_exam_start' },
  {
    id: 'ce_4',
    type: 'cross_exam',
    statements: [
      {
        text: "1. 그래, 인정하지. 지민이가 범행하는 건 못 봤어. 내가 들어갔을 땐 이미 난장판이었으니까.",
        weakness: false
      },
      {
        text: "2. 난 너무 놀라서 뒷걸음질 쳤고, 바로 선생님을 부르러 갔어.",
        weakness: false
      },
      {
        text: "3. 맹세코 난 그 더러운 붉은 물감 통엔 손가락 하나 댄 적 없다고!",
        weakness: true, // 약점: 물감을 만진 흔적 (장갑)
        contradiction: 'stained_glove',
        failMsg: "물감을 만지지 않았다는 주장을 반박해야 해!"
      },
      {
        text: "4. 범인은 도망쳤겠지! 창문이든 어디든! 난 억울해!",
        weakness: false,
        press: "아직도 창문 타령입니까? 거긴 막혀있다니까요."
      }
    ]
  }
];
const FINALE_SUCCESS = [
  { type: 'anim', name: 'objection' },
  { type: 'talk', char: 'player', text: "손가락 하나 댄 적 없다고요? 정말 뻔뻔하군요!", size: 'text-4xl font-black text-red-500' },
  { type: 'evidence_flash', id: 'stained_glove' },
  { type: 'talk', char: 'player', text: "재판장님! 미술실 쓰레기통 깊숙한 곳에서 발견된 이 [장갑]을 보십시오!", size: 'text-3xl' },
  { type: 'talk', char: 'judge', text: "저런... 붉은 물감이 아주 흥건하게 묻어있군요.", face: 'normal' },
  { type: 'talk', char: 'player', text: "그리고 손목 부분엔 선명하게 [태오]라고 이름이 적혀있습니다!", color: 'text-blue-400' },
  { type: 'talk', char: 'witness', text: "큭... 으윽... 아, 아니야! 그건 내가 버린 게 아니...", face: 'shock' },
  { type: 'talk', char: 'prosecutor', text: "그만하게. 자네 장갑이 저 꼴이 되려면, 물감통을 직접 쥐고 뿌리는 방법밖엔 없어.", face: 'normal' },
  { type: 'talk', char: 'witness', text: "으아아아아악!!!!", face: 'breakdown' }, // 멘탈 붕괴
 
  // --- 사건의 전말 ---
  { type: 'anim', name: 'confetti' },
  { type: 'scene', bg: 'bg-indigo-900' },
  { type: 'talk', char: 'narrator', text: "[사건의 전말]" },
  { type: 'talk', char: 'player', text: "최태오는 자신의 그림 실력이 지민이에게 밀리자, 질투심에 범행을 계획했습니다." },
  { type: 'talk', char: 'player', text: "미리 물감을 뿌려 그림을 망친 뒤, 지민이가 들어오자마자 죄를 뒤집어씌운 거죠." },
  { type: 'talk', char: 'player', text: "하지만 자신의 [장갑]에 묻은 물감 자국까지는 숨기지 못했습니다." },
  { type: 'scene', bg: 'bg-slate-900' },
  { type: 'talk', char: 'judge', text: "피고인 이지민에게 [무죄]를 선고합니다. 폐정!", size: 'text-3xl' },
  { type: 'talk', char: 'narrator', text: "김변호의 화려한 역전승이었다.", color: 'text-yellow-400' },
  { type: 'end', text: "THE END - 플레이해주셔서 감사합니다!" }
];
const FULL_SCRIPT = [
  ...SCRIPT_PART_1.slice(0, -2), // PART1 인트로 ~ cross_exam_start + ce_1 (guide & jump 제거)
  ...PART_1_SUCCESS,
  ...SCRIPT_PART_2.slice(0, -2), // PART2 ~ ce_2 (guide & jump 제거)
  ...PART_2_SUCCESS,
  ...SCRIPT_PART_3.slice(0, -2), // PART3 ~ ce_3 (guide & jump 제거)
  ...PART_3_SUCCESS,
  ...SCRIPT_PART_4.slice(0, -2), // PART4 ~ ce_4 (guide & jump 제거)
  ...FINALE_SUCCESS
];
// ==================== [3. 엔진 컴포넌트] ====================
export default function AceAttorneyGame() {
  const [script] = useState(FULL_SCRIPT);
  const [index, setIndex] = useState(0);
  const [evidenceMode, setEvidenceMode] = useState(false);
  const [hp, setHp] = useState(5);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [effectText, setEffectText] = useState(null);
  const [ceIndex, setCeIndex] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [currentBg, setCurrentBg] = useState('bg-slate-800');
  const currentLine = script[index];
  const handleNext = () => {
    if (evidenceMode || isEnding) return;
    if (currentLine?.type === 'cross_exam') {
      const nextIdx = ceIndex + 1;
      setCeIndex(nextIdx >= currentLine.statements.length ? 0 : nextIdx);
      return;
    }
    if (currentLine?.type === 'jump') {
      setIndex(script.findIndex(l => l.id === currentLine.to));
    } else if (currentLine?.type === 'end') {
      setIsEnding(true);
    } else {
      setIndex(prev => prev + 1);
    }
  };
  const presentEvidence = (id) => {
    if (currentLine?.type !== 'cross_exam') return;
    const stmt = currentLine.statements[ceIndex];
   
    if (stmt.weakness && stmt.contradiction === id) {
      setEffectText("이의 있소!");
      setShake(true);
      setTimeout(() => {
        setEffectText(null);
        setShake(false);
        setIndex(index + 1);
        setEvidenceMode(false);
        setCeIndex(0);
      }, 1500);
    } else {
      setHp(h => Math.max(0, h-1));
      setShake(true);
      setTimeout(() => setShake(false), 500);
      alert(stmt.failMsg || "그 증거는 모순이 아닙니다! (패널티)");
      if(hp <= 1) window.location.reload();
    }
  };
  useEffect(() => {
    if (!currentLine) return;
    switch (currentLine.type) {
      case 'anim':
        if (currentLine.name === 'objection') {
          setEffectText("이의 있소!"); setShake(true);
          setTimeout(() => { setEffectText(null); setShake(false); handleNext(); }, 1500);
        } else if (currentLine.name === 'witness_enter' || currentLine.name === 'cross_exam_start') {
          setFlash(true); setTimeout(() => { setFlash(false); handleNext(); }, 500);
        } else if (currentLine.name === 'confetti') {
          setEffectText("승 소");
          setTimeout(() => { setEffectText(null); handleNext(); }, 2000);
        } else {
          handleNext();
        }
        break;
      case 'scene':
        setCurrentBg(currentLine.bg);
        handleNext();
        break;
      case 'evidence_flash':
        setFlash(true);
        setTimeout(() => { setFlash(false); handleNext(); }, 500);
        break;
      default:
        break;
    }
  }, [index, script]);
  const isCE = currentLine?.type === 'cross_exam';
  const txt = isCE ? currentLine.statements[ceIndex].text : currentLine?.text;
  const char = isCE ? CHARACTERS.witness : (currentLine?.char ? CHARACTERS[currentLine.char] : null);
  const isFinal = isCE && currentLine.id === 'ce_4';
  // 엔딩 화면
  if (isEnding) {
    return (
      <div className="h-screen w-full bg-black text-white flex flex-col items-center justify-center p-8 animate-in fade-in duration-1000">
        <Sparkles size={64} className="text-yellow-400 mb-6 animate-spin-slow"/>
        <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-400">
          역전의 미술실
        </h1>
        <h2 className="text-3xl font-bold mb-8 text-white">- 완 결 -</h2>
        <p className="text-gray-400 mb-12 text-center max-w-md leading-relaxed">
          지호의 누명은 벗겨졌고,<br/>진범 최태오는 징계를 받았습니다.<br/>
          김변호의 명성은 더욱 높아졌습니다.
        </p>
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">
          처음부터 다시하기
        </button>
      </div>
    );
  }
  return (
    <div className={`h-screen w-full relative overflow-hidden select-none font-sans text-white ${currentBg} ${shake ? 'animate-shake' : ''}`}>
      <style jsx global>{`
        @keyframes shake { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(-5px, 5px); } 75% { transform: translate(5px, -5px); } }
        .animate-shake { animation: shake 0.2s infinite; }
        .animate-pop { animation: pop 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28); }
        @keyframes pop { 0% { transform: scale(0); } 100% { transform: scale(1); } }
        @keyframes spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
      `}</style>
      {/* 배경 */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2000')] bg-cover opacity-30"></div>
      {/* HP */}
      <div className="absolute top-4 left-4 flex gap-1 bg-black/40 p-2 rounded-full z-50">
        {[...Array(5)].map((_,i) => <div key={i} className={`w-6 h-6 rounded-full ${i<hp?'bg-green-500':'bg-red-900'}`}>{i<hp?'⚖️':''}</div>)}
      </div>
      {/* 컷신 */}
      {effectText && (
        <div className="absolute inset-0 z-[100] bg-white flex items-center justify-center">
          <div className="relative">
             <div className="absolute inset-0 bg-blue-600 animate-ping opacity-50 rounded-full"></div>
             <h1 className="text-9xl font-black text-blue-600 tracking-tighter animate-pop drop-shadow-2xl italic border-4 border-black p-4 bg-white transform -rotate-6">{effectText}</h1>
          </div>
        </div>
      )}
      {/* 캐릭터 */}
      <div className="absolute bottom-40 w-full flex justify-center pointer-events-none transition-all duration-300 z-10">
        {char && char.image && <div className="text-[250px] filter drop-shadow-2xl">{char.image || char.images[currentLine.face||'normal']}</div>}
      </div>
      {/* 심문 표시 */}
      {isCE && (
        <div className="absolute top-20 w-full text-center z-20">
          <div className={`inline-block ${isFinal ? 'bg-red-700/90 text-white font-bold text-2xl px-12 py-2 border-y-4 border-red-500' : 'bg-green-700/90 text-green-100 font-bold text-2xl px-12 py-2 border-y-4 border-green-500'} shadow-lg animate-pulse`}>
            ~ {isFinal ? '최후의 증언' : '심 문'} ~ {ceIndex+1}/{currentLine.statements.length}
          </div>
        </div>
      )}
      {/* 대화창 */}
      <div onClick={handleNext} className={`absolute bottom-0 w-full p-4 md:p-8 z-30 transition-all ${evidenceMode ? 'translate-y-full opacity-0' : 'translate-y-0'}`}>
        <div className={`max-w-4xl mx-auto backdrop-blur-md border-4 rounded-xl p-6 min-h-[180px] shadow-2xl relative hover:bg-black/80 cursor-pointer ${isCE ? (isFinal ? 'bg-red-900/80 border-red-400' : 'bg-green-900/80 border-green-400') : 'bg-black/80 border-white/20'}`}>
          {char && <div className="absolute -top-5 left-6 bg-blue-600 text-white font-bold px-6 py-1 rounded-t-lg border-2 border-white/20">{char.name}</div>}
          <p className={`text-xl md:text-2xl font-medium leading-relaxed ${currentLine.color || (isCE ? (isFinal ? 'text-red-100' : 'text-green-200') : 'text-white')} ${currentLine.size || ''}`}>{txt}</p>
          {isCE && (
            <div className="absolute -top-16 right-0">
              <button onClick={(e) => { e.stopPropagation(); setEvidenceMode(true); }} className="bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl px-8 py-3 rounded-full shadow-lg flex items-center gap-2 transform hover:scale-105 transition-all">
                <Briefcase/> 증거 제시!
              </button>
            </div>
          )}
          <ChevronRight className="absolute bottom-4 right-4 animate-bounce text-slate-400" size={32}/>
        </div>
      </div>
      {/* 증거창 */}
      {evidenceMode && (
        <div className="absolute inset-0 bg-black/95 z-40 p-8 flex flex-col items-center animate-in slide-in-from-bottom-20">
          <div className="w-full max-w-4xl">
            <div className="flex justify-between items-center mb-8 border-b border-gray-600 pb-4">
              <h2 className="text-3xl font-black text-white flex items-center gap-2"><Briefcase/> 법정 기록</h2>
              <button onClick={() => setEvidenceMode(false)} className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded-lg font-bold">닫기</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EVIDENCE.map(item => (
                <button key={item.id} onClick={() => presentEvidence(item.id)} className="bg-slate-800 p-4 rounded-xl border-2 border-slate-600 flex items-center gap-4 hover:border-yellow-400 hover:bg-slate-700 group text-left transition-all">
                  <div className="text-5xl bg-black/30 p-2 rounded-lg">{item.icon}</div>
                  <div>
                    <div className="text-xl font-bold text-yellow-400 group-hover:text-yellow-300">{item.name}</div>
                    <div className="text-sm text-gray-400">{item.desc}</div>
                    <div className="text-xs text-red-400 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">👉 제시하기 (CLICK)</div>
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
