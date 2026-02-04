'use client';
import React, { useState, useEffect } from 'react';
import { Briefcase, ChevronRight, MessageSquare, Eye, Lock, AlertTriangle, CheckCircle } from 'lucide-react';

// ==================== [캐릭터 설정] ====================
const CHARACTERS = {
  judge: { name: "재판장", image: "👨‍⚖️" },
  prosecutor: { name: "나검사", image: "🤵‍♂️" },
  player: { name: "김변호", image: "👉" },
  witness: { 
    name: "최태오", 
    images: { normal: "😎", sweat: "😰", angry: "😡", shock: "😱", breakdown: "🤯" }
  },
  jimin: { name: "이지민", image: "🥺" },
  narrator: { name: "", image: "" },
  teacher: { name: "미술 선생님", image: "👩‍🏫" },
  member: { name: "미술부원 A", image: "🧑‍🎨" },
  police: { name: "경찰", image: "👮" },
  janitor: { name: "청소부", image: "🧹" }
};

// ==================== [증거 설정] ====================
const ALL_EVIDENCE = [
  { id: 'knife', name: '미술용 나이프', icon: '🔪', desc: '지문이 묻은 공용 도구.' },
  { id: 'picture', name: '훼손된 그림', icon: '🖼️', desc: '붉은 물감으로 뒤덮인 태오의 작품.' },
  { id: 'cctv', name: '복도 CCTV', icon: '📹', desc: '15:58~16:02 복도에 아무도 없었다.' },
  { id: 'floor_map', name: '미술실 도면', icon: '🗺️', desc: '앞문과 뒷문 2개 출구.' },
  { id: 'storage_photo', name: '창고 창문 사진', icon: '🪟', desc: '쇠창살로 완전히 막혀있음.' },
  { id: 'police_report', name: '수색 보고서', icon: '👮', desc: '창고 안 아무도 없었음.' },
  { id: 'apron', name: '지민의 앞치마', icon: '🎽', desc: '물감 한 방울 없이 깨끗.' },
  { id: 'floor_photo', name: '현장 바닥 사진', icon: '📸', desc: '반경 2m 물감 범벅.' },
  { id: 'stained_glove', name: '태오의 장갑', icon: '🥊', desc: '★결정적★ 붉은 물감 범벅. [태오] 이름.' },
  { id: 'witness_statement', name: '태오 최초 진술서', icon: '📋', desc: '"복도로 도망"이라 진술.' }
];

// ==================== [스크립트] ====================
const FULL_SCRIPT = [
  // ========================================
  // 프롤로그
  // ========================================
  { type: 'scene', bg: 'bg-black' },
  { type: 'talk', char: 'narrator', text: "어느 날 오후, 세화고 미술실에서 충격적인 사건이 발생했다." },
  { type: 'scene', bg: 'bg-red-900' },
  { type: 'talk', char: 'narrator', text: "미술부 부장 최태오의 수상작이 무참히 훼손당했다." },
  { type: 'talk', char: 'witness', text: "내 그림이... 내 그림이!!!!", face: 'angry' },
  { type: 'talk', char: 'narrator', text: "현장에 있던 유일한 사람, 이지민." },
  { type: 'talk', char: 'jimin', text: "저... 정말 아니에요...", face: 'normal' },
  { type: 'scene', bg: 'bg-slate-900' },
  { type: 'talk', char: 'narrator', text: "3일 후, 김변호는 지민의 변호를 맡기로 했다." },
  { type: 'talk', char: 'player', text: "걱정 마세요. 반드시 진실을 밝혀내겠습니다!" },
  
  // ========================================
  // [탐정 파트 1] 충격의 현장
  // ========================================
  { type: 'scene', bg: 'bg-indigo-900' },
  { type: 'talk', char: 'narrator', text: "=== 탐정 파트 1: 충격의 현장 ===" },
  { type: 'talk', char: 'player', text: "(미술실... 여기서 모든 일이 벌어졌어.)" },
  { type: 'talk', char: 'police', text: "변호사님, 아직 수사 중입니다. 증거는 나중에 법정에서 보세요." },
  
  { 
    type: 'choice',
    question: "경찰이 출입을 막고 있다. 어떻게 할까?",
    options: [
      { text: "정중히 부탁한다", next: 'polite_ask', success: true },
      { text: "강제로 밀고 들어간다", next: 'force_enter', success: false },
      { text: "나중에 다시 온다", next: 'come_later', success: false }
    ]
  },
  
  { id: 'polite_ask', type: 'talk', char: 'player', text: "저는 피고인 변호사입니다. 변호 준비를 위해 현장 확인이 필요합니다." },
  { type: 'talk', char: 'police', text: "...알겠습니다. 단, 만지지는 마세요." },
  { type: 'talk', char: 'player', text: "(좋아, 들어갈 수 있게 됐어!)" },
  { type: 'jump', to: 'scene1_investigate' },
  
  { id: 'force_enter', type: 'talk', char: 'police', text: "뭐 하시는 겁니까?! 이건 증거 인멸 방해입니다!" },
  { type: 'talk', char: 'player', text: "(젠장... 실패했어. 다시 시도해야겠다.)" },
  { type: 'jump', to: 'investigation_1_start' },
  
  { id: 'come_later', type: 'talk', char: 'player', text: "(너무 소극적이었나... 다시 시도하자.)" },
  { type: 'jump', to: 'investigation_1_start' },
  
  { id: 'scene1_investigate', type: 'scene', bg: 'bg-indigo-900' },
  { type: 'talk', char: 'player', text: "(멀리서라도 관찰해보자... 뭔가 단서가 있을 거야.)" },
  
  {
    type: 'mini_game',
    game_type: 'observation',
    instruction: "현장을 관찰하세요. 중요한 것을 찾아 클릭하세요!",
    items: [
      { id: 'mess', name: '바닥 물감', result: 'floor_photo', correct: true },
      { id: 'chair', name: '의자', result: null, correct: false },
      { id: 'painting', name: '그림', result: 'picture', correct: true }
    ]
  },
  
  { type: 'talk', char: 'player', text: "(현장 사진을 찍었다. 반경 2m가 난장판이야...)" },
  { type: 'scene', bg: 'bg-gray-800' },
  { type: 'talk', char: 'jimin', text: "변호사님... 저... 정말...", face: 'normal' },
  { type: 'talk', char: 'player', text: "(지민이가 너무 겁먹었어... 지금은 말을 못 하겠군.)" },
  { type: 'talk', char: 'player', text: "(일단 다른 곳을 조사하자.)" },
  
  // ========================================
  // [탐정 파트 2] 최초의 의심
  // ========================================
  { type: 'scene', bg: 'bg-gray-700' },
  { type: 'talk', char: 'narrator', text: "=== 탐정 파트 2: 최초의 의심 ===" },
  { type: 'talk', char: 'member', text: "(...저기요, 변호사님...)" },
  { type: 'talk', char: 'member', text: "태오 부장... 요즘 지민이만 보면 얼굴이 굳었어요." },
  { type: 'talk', char: 'member', text: "대회 상금 때문에 질투가 심했거든요..." },
  { type: 'talk', char: 'player', text: "!!! (이건 중요한 정보야!)" },
  { type: 'talk', char: 'witness', text: "(...뭔가 수군대네?)", face: 'normal' },
  { type: 'talk', char: 'member', text: "앗! 태오 부장! 전... 전...!" },
  { type: 'anim', name: 'run_away' },
  { type: 'talk', char: 'player', text: "(도망갔어... 더 물어볼 수 없게 됐군.)" },
  
  { type: 'talk', char: 'player', text: "(CCTV를 확인해야 해. 복도 쪽으로 가자.)" },
  { type: 'scene', bg: 'bg-slate-800' },
  { type: 'talk', char: 'player', text: "(CCTV실 문이... 잠겨있다!)" },
  
  {
    type: 'choice',
    question: "CCTV실 문이 잠겨있다. 어떻게 할까?",
    options: [
      { text: "선생님을 찾아 부탁한다", next: 'ask_teacher', success: true },
      { text: "문을 억지로 연다", next: 'break_door', success: false },
      { text: "포기하고 돌아간다", next: 'give_up_cctv', success: false }
    ]
  },
  
  { id: 'ask_teacher', type: 'scene', bg: 'bg-green-900' },
  { type: 'talk', char: 'teacher', text: "아, CCTV요? 잠시만요..." },
  { type: 'talk', char: 'teacher', text: "여기 있습니다. 16시 전후 영상이네요." },
  { type: 'evidence_add', id: 'cctv' },
  { type: 'talk', char: 'player', text: "(좋아! CCTV 획득!)" },
  { type: 'jump', to: 'investigation_2_end' },
  
  { id: 'break_door', type: 'talk', char: 'player', text: "(너무 위험해... 다른 방법을 찾자.)" },
  { type: 'jump', to: 'investigation_2_start' },
  
  { id: 'give_up_cctv', type: 'talk', char: 'player', text: "(포기할 순 없어. 다시!)" },
  { type: 'jump', to: 'investigation_2_start' },
  
  { id: 'investigation_2_end', type: 'talk', char: 'player', text: "(복도 CCTV... 15:58~16:02 사이 아무도 없어!)" },
  { type: 'talk', char: 'player', text: "(이건 결정적 증거야!)" },
  
  // ========================================
  // [탐정 파트 3] 창고의 비밀
  // ========================================
  { type: 'scene', bg: 'bg-amber-800' },
  { type: 'talk', char: 'narrator', text: "=== 탐정 파트 3: 창고의 비밀 ===" },
  { type: 'talk', char: 'player', text: "(뒷문으로 연결된 창고... 여기가 탈출 경로일까?)" },
  { type: 'talk', char: 'player', text: "(어두워... 먼지도 많고...)" },
  
  {
    type: 'mini_game',
    game_type: 'search',
    instruction: "창고를 수색하세요! (먼지가 많아 3번 시도 필요)",
    attempts: 3,
    items: [
      { id: 'window', name: '창문', result: 'storage_photo' },
      { id: 'report', name: '수색 보고서', result: 'police_report' }
    ]
  },
  
  { type: 'talk', char: 'player', text: "(창문엔 쇠창살이... 사람이 빠져나갈 수 없어!)" },
  { type: 'talk', char: 'player', text: "(경찰 보고서도 발견했다. 창고 안은 비어있었다고...)" },
  { type: 'evidence_add', id: 'storage_photo' },
  { type: 'evidence_add', id: 'police_report' },
  { type: 'talk', char: 'player', text: "(도면도 필요해. 교무실로 가자.)" },
  { type: 'scene', bg: 'bg-green-900' },
  { type: 'talk', char: 'teacher', text: "미술실 도면이요? 여기 있습니다." },
  { type: 'evidence_add', id: 'floor_map' },
  
  // ========================================
  // [탐정 파트 4] 쓰레기통 속 진실
  // ========================================
  { type: 'scene', bg: 'bg-indigo-900' },
  { type: 'talk', char: 'narrator', text: "=== 탐정 파트 4: 쓰레기통 속 진실 ===" },
  { type: 'talk', char: 'player', text: "(미술실을 다시 조사해야 해... 뭔가 놓친 게 있을 거야.)" },
  { type: 'talk', char: 'player', text: "(쓰레기통... 안을 뒤져볼까?)" },
  
  {
    type: 'mini_game',
    game_type: 'timing',
    instruction: "쓰레기통을 뒤지세요! (청소부가 오기 전에 빨리!)",
    time_limit: 5,
    result: 'stained_glove'
  },
  
  { type: 'talk', char: 'player', text: "(이건... 장갑?! 물감이 범벅이야!)" },
  { type: 'talk', char: 'player', text: "(손목에... [태오]라는 이름이!)" },
  { type: 'talk', char: 'janitor', text: "여기서 뭐하는 거야?!" },
  
  {
    type: 'choice',
    question: "청소부가 다가온다! 어떻게 할까?",
    options: [
      { text: "장갑을 재빨리 숨긴다", next: 'hide_glove', success: true },
      { text: "정직하게 말한다", next: 'tell_truth', success: false }
    ]
  },
  
  { id: 'hide_glove', type: 'talk', char: 'player', text: "아, 죄송합니다. 볼펜을 떨어뜨려서요..." },
  { type: 'talk', char: 'janitor', text: "그래? 조심해!" },
  { type: 'evidence_add', id: 'stained_glove' },
  { type: 'talk', char: 'player', text: "(휴... 증거 확보 성공!)" },
  { type: 'jump', to: 'investigation_4_end' },
  
  { id: 'tell_truth', type: 'talk', char: 'janitor', text: "증거 수집?! 경찰에 신고하겠어!" },
  { type: 'talk', char: 'player', text: "(실패했어... 다시 시도하자.)" },
  { type: 'jump', to: 'investigation_4_start' },
  
  { id: 'investigation_4_end', type: 'talk', char: 'player', text: "(결정적 증거를 손에 넣었어!)" },
  { type: 'talk', char: 'witness', text: "뭘 찾으시는 거죠, 변호사님?", face: 'normal' },
  { type: 'talk', char: 'player', text: "아... 아무것도 아닙니다." },
  { type: 'talk', char: 'player', text: "(태오가 의심하고 있어... 조심해야겠다.)" },
  
  // ========================================
  // [탐정 파트 5] 마지막 퍼즐
  // ========================================
  { type: 'scene', bg: 'bg-blue-900' },
  { type: 'talk', char: 'narrator', text: "=== 탐정 파트 5: 마지막 퍼즐 ===" },
  { type: 'talk', char: 'player', text: "지민 양, 당신 앞치마를 볼 수 있을까요?" },
  { type: 'talk', char: 'jimin', text: "저... 태오 부장이... 또 혼낼까 봐...", face: 'normal' },
  
  {
    type: 'choice',
    question: "지민이가 두려워하고 있다. 어떻게 설득할까?",
    options: [
      { text: "따뜻하게 격려한다", next: 'encourage', success: true },
      { text: "강압적으로 요구한다", next: 'force_apron', success: false },
      { text: "포기한다", next: 'give_up_apron', success: false }
    ]
  },
  
  { id: 'encourage', type: 'talk', char: 'player', text: "지민 양, 제가 당신을 지킬게요. 용기를 내세요." },
  { type: 'talk', char: 'jimin', text: "...알겠어요. 여기... 앞치마예요.", face: 'normal' },
  { type: 'evidence_add', id: 'apron' },
  { type: 'talk', char: 'player', text: "(물감이 한 방울도 안 묻었어!)" },
  { type: 'jump', to: 'investigation_complete' },
  
  { id: 'force_apron', type: 'talk', char: 'jimin', text: "으... 으윽...", face: 'normal' },
  { type: 'talk', char: 'player', text: "(너무 했군... 다시 접근하자.)" },
  { type: 'jump', to: 'investigation_5_start' },
  
  { id: 'give_up_apron', type: 'talk', char: 'player', text: "(포기할 순 없어!)" },
  { type: 'jump', to: 'investigation_5_start' },
  
  { id: 'investigation_complete', type: 'scene', bg: 'bg-slate-900' },
  { type: 'talk', char: 'narrator', text: "탐정 파트 완료! 모든 증거를 모았습니다." },
  { type: 'talk', char: 'player', text: "(좋아... 이제 재판에서 진실을 밝힐 시간이야!)" },
  
  // ========================================
  // [재판 1] 복도 루트 붕괴
  // ========================================
  { type: 'scene', bg: 'bg-slate-900' },
  { type: 'talk', char: 'narrator', text: "=== 제1회 공판 ===" },
  { type: 'talk', char: 'judge', text: "'미술실 그림 훼손 사건' 재판을 시작합니다." },
  { type: 'talk', char: 'prosecutor', text: "증거는 세 가지입니다.", face: 'normal' },
  { type: 'talk', char: 'prosecutor', text: "① 나이프의 지문, ② 현장 목격자, ③ 복도에서 발견된 스케치북!", face: 'normal' },
  { type: 'talk', char: 'player', text: "!!! (스케치북?!)" },
  { type: 'talk', char: 'prosecutor', text: "증인을 부르겠습니다!", face: 'normal' },
  
  { type: 'anim', name: 'witness_enter' },
  { type: 'talk', char: 'witness', text: "미술부 부장 최태오입니다.", face: 'normal' },
  { type: 'talk', char: 'judge', text: "증인, 그날 본 것을 증언하시오." },
  
  {
    type: 'cross_exam',
    title: '목격 증언',
    statements: [
      {
        text: "1. 저는 4시에 앞문으로 미술실에 들어갔습니다.",
        weakness: false,
        press: "4시 정확히 들어갔나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "네, 시계를 봤습니다. 정확히 4시였어요.", face: 'normal' }
        ]
      },
      {
        text: "2. 그림이 이미 망가져 있었고, 지민이가 나이프를 들고 있었습니다.",
        weakness: false,
        press: "정확히 '들고' 있었나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "아... 옆에 떨어져 있었던 것 같네요.", face: 'sweat' }
        ]
      },
      {
        text: "3. 저는 깜짝 놀라 소리를 질렀고, 지민이는 복도로 뛰어갔습니다!",
        weakness: true,
        contradiction: 'cctv',
        failMsg: "복도 CCTV와 관련이 있을 것 같은데..."
      }
    ]
  },
  
  { type: 'anim', name: 'objection' },
  { type: 'talk', char: 'player', text: "이의 있습니다!", size: 'text-3xl', color: 'text-blue-400' },
  { type: 'evidence_flash', id: 'cctv' },
  { type: 'talk', char: 'player', text: "[복도 CCTV]를 보십시오!", size: 'text-2xl' },
  { type: 'talk', char: 'player', text: "15:58~16:02 사이, 복도엔 아무도 없었습니다!", color: 'text-blue-400' },
  { type: 'talk', char: 'prosecutor', text: "잠깐! 스케치북은 16:05에 발견됐습니다!", face: 'normal' },
  { type: 'talk', char: 'prosecutor', text: "CCTV가 끊긴 후입니다!", face: 'normal' },
  { type: 'talk', char: 'player', text: "크윽...! (반격당했어!)" },
  { type: 'talk', char: 'judge', text: "음... 확실히 시간 차이가 있군요." },
  { type: 'talk', char: 'witness', text: "맞아요! 그 시간에 도망갔어요!", face: 'normal' },
  { type: 'talk', char: 'player', text: "(젠장... 하지만 아직 끝나지 않았어!)" },
  { type: 'talk', char: 'player', text: "하지만 전체 CCTV를 보면, 15:58~16:02는 완전히 비어있습니다!" },
  { type: 'talk', char: 'player', text: "그 4분 사이에 도망쳤다면 반드시 찍혔어야 합니다!" },
  { type: 'talk', char: 'witness', text: "그, 그건...", face: 'sweat' },
  { type: 'talk', char: 'judge', text: "증인, 증언을 수정하시겠습니까?" },
  
  // ========================================
  // [재판 2] 밀실 탈출 불가능
  // ========================================
  { type: 'talk', char: 'witness', text: "...아! 생각났어요! 복도가 아니라 뒷문으로 창고에 갔어요!", face: 'normal' },
  { type: 'talk', char: 'prosecutor', text: "창고에는 창문이 있습니다. 거기로 탈출했겠죠.", face: 'normal' },
  { type: 'talk', char: 'judge', text: "증인, 다시 증언하시오." },
  
  {
    type: 'cross_exam',
    title: '수정된 증언',
    statements: [
      {
        text: "1. 지민이는 뒷문으로 창고에 들어갔습니다.",
        weakness: false,
        press: "직접 봤나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "네! 뒷문이 열리는 걸 봤어요!", face: 'normal' }
        ]
      },
      {
        text: "2. 저는 무서워서 선생님을 부르러 갔죠.",
        weakness: false,
        press: "왜 직접 쫓아가지 않았죠?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "무서웠으니까요!", face: 'sweat' }
        ]
      },
      {
        text: "3. 창고를 열었을 땐 비어있었어요. 창문으로 탈출했을 겁니다!",
        weakness: true,
        contradiction: 'storage_photo',
        failMsg: "창고 창문에 대한 증거가..."
      }
    ]
  },
  
  { type: 'anim', name: 'objection' },
  { type: 'talk', char: 'player', text: "창문으로 탈출?! 불가능합니다!", size: 'text-3xl', color: 'text-red-500' },
  { type: 'evidence_flash', id: 'storage_photo' },
  { type: 'talk', char: 'player', text: "[창고 창문 사진]을 보십시오!", size: 'text-2xl' },
  { type: 'talk', char: 'player', text: "쇠창살로 완전히 막혀있습니다! 탈출 불가능!", color: 'text-blue-400' },
  { type: 'talk', char: 'prosecutor', text: "그럼... 어떻게...?", face: 'shock' },
  { type: 'talk', char: 'player', text: "범인은 미술실 밖으로 나가지 않았습니다!" },
  { type: 'talk', char: 'witness', text: "말도 안 돼!", face: 'shock' },
  
  // ========================================
  // [재판 3] 물감 폭발의 불가능
  // ========================================
  { type: 'talk', char: 'judge', text: "그렇다면... 범인은 누구란 말입니까?" },
  { type: 'talk', char: 'prosecutor', text: "증인! 현장에서 본 걸 정확히 증언하시오!", face: 'normal' },
  
  {
    type: 'cross_exam',
    title: '현장 목격 증언',
    isFinal: true,
    statements: [
      {
        text: "1. 지민이가 나이프로 물감통을 찔렀습니다!",
        weakness: false,
        press: "직접 봤나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "네! 펑 하고 터지는 걸 봤어요!", face: 'angry' }
        ]
      },
      {
        text: "2. 물감이 온 사방으로 튀어 방이 엉망이 됐죠!",
        weakness: false,
        press: "얼마나 튀었나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "반경 2m는 됐어요!", face: 'normal' },
          { type: 'evidence_flash', id: 'floor_photo' },
          { type: 'talk', char: 'prosecutor', text: "현장 사진과 일치합니다!", face: 'normal' }
        ]
      },
      {
        text: "3. 지민이는 온몸에 물감을 뒤집어쓰고... 웃고 있었어요!",
        weakness: true,
        contradiction: 'apron',
        failMsg: "지민의 옷에 관한 증거가..."
      }
    ]
  },
  
  { type: 'anim', name: 'objection' },
  { type: 'talk', char: 'player', text: "온몸에 물감을 뒤집어썼다고요?!", size: 'text-4xl text-red-500' },
  { type: 'evidence_flash', id: 'apron' },
  { type: 'talk', char: 'player', text: "[지민의 앞치마]를 보십시오!", size: 'text-2xl' },
  { type: 'talk', char: 'player', text: "물감 한 방울도 없습니다! 어떻게 설명하시겠습니까?!", color: 'text-blue-400' },
  { type: 'talk', char: 'prosecutor', text: "...이건...", face: 'shock' },
  { type: 'talk', char: 'witness', text: "그, 그건...", face: 'shock' },
  { type: 'talk', char: 'player', text: "물리적으로 불가능합니다!" },
  
  // ========================================
  // [재판 4] 최후의 장갑
  // ========================================
  { type: 'talk', char: 'judge', text: "증인... 당신은 정말 그 장면을 봤습니까?" },
  { type: 'talk', char: 'witness', text: "저... 저는 물감에 손도 안 댔어요!", face: 'sweat' },
  { type: 'talk', char: 'player', text: "정말입니까? 그럼 이건 뭐죠?" },
  { type: 'evidence_flash', id: 'stained_glove' },
  { type: 'talk', char: 'player', text: "쓰레기통에서 발견된 [물감 범벅 장갑]!", size: 'text-3xl' },
  { type: 'talk', char: 'player', text: "손목에 [태오]라고 선명히 적혀있습니다!", color: 'text-yellow-400' },
  { type: 'talk', char: 'witness', text: "그, 그건... 누가 장난으로...", face: 'shock' },
  { type: 'talk', char: 'prosecutor', text: "DNA 검사가 아직...", face: 'sweat' },
  { type: 'talk', char: 'player', text: "당신 이름이 적힌 장갑입니다! 설명해보세요!", size: 'text-3xl' },
  { type: 'talk', char: 'witness', text: "으... 으아아아악!", face: 'breakdown' },
  
  // ========================================
  // [결말]
  // ========================================
  { type: 'anim', name: 'confetti' },
  { type: 'talk', char: 'witness', text: "...다 제가 했어요.", face: 'breakdown' },
  { type: 'talk', char: 'witness', text: "지민이가 대회에서 상 받는 걸 보니... 너무 화가 나서...", face: 'sweat' },
  { type: 'talk', char: 'witness', text: "제 그림을 망치고 지민이한테 누명을 씌웠어요...", face: 'sweat' },
  { type: 'talk', char: 'judge', text: "피고인 이지민에게 무죄를 선고합니다!", size: 'text-3xl' },
  { type: 'talk', char: 'jimin', text: "변호사님... 감사합니다!", face: 'normal' },
  { type: 'talk', char: 'narrator', text: "김변호는 또 한 번 역전승을 거두었다.", color: 'text-yellow-400' },
  
  { type: 'end', text: "THE END" }
];

// ==================== [게임 엔진] ====================
function AceAttorneyGame() {
  const [index, setIndex] = useState(0);
  const [collectedEvidence, setCollectedEvidence] = useState([]);
  const [currentBg, setCurrentBg] = useState('bg-black');
  const [hp, setHp] = useState(5);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [effectText, setEffectText] = useState(null);
  const [isEnding, setIsEnding] = useState(false);
  
  // 모드
  const [evidenceMode, setEvidenceMode] = useState(false);
  const [pressMode, setPressMode] = useState(false);
  const [pressIndex, setPressIndex] = useState(0);
  const [choiceMode, setChoiceMode] = useState(false);
  const [miniGameMode, setMiniGameMode] = useState(false);
  const [miniGameData, setMiniGameData] = useState(null);
  
  // 심문
  const [ceIndex, setCeIndex] = useState(0);
  
  const currentLine = FULL_SCRIPT[index] || {};
  const isCE = currentLine.type === 'cross_exam';
  const stmt = isCE ? currentLine.statements?.[ceIndex] : null;
  const txt = pressMode && stmt?.pressResponse?.[pressIndex]?.text 
    ? stmt.pressResponse[pressIndex].text 
    : isCE ? stmt?.text : currentLine.text;
  const char = (() => {
    if (pressMode && stmt?.pressResponse?.[pressIndex]?.char) {
      return CHARACTERS[stmt.pressResponse[pressIndex].char];
    }
    if (isCE) return CHARACTERS.witness;
    return currentLine.char ? CHARACTERS[currentLine.char] : null;
  })();
  const charFace = (() => {
    if (pressMode && stmt?.pressResponse?.[pressIndex]?.face) {
      return stmt.pressResponse[pressIndex].face;
    }
    return currentLine.face || 'normal';
  })();

  const handleNext = () => {
    if (evidenceMode || pressMode || choiceMode || miniGameMode || isEnding) return;
    
    if (isCE) {
      setCeIndex(prev => (prev + 1) % currentLine.statements.length);
      return;
    }

    if (currentLine.type === 'jump') {
      const target = FULL_SCRIPT.findIndex(l => l.id === currentLine.to);
      setIndex(target !== -1 ? target : index + 1);
      return;
    }

    setIndex(prev => Math.min(prev + 1, FULL_SCRIPT.length - 1));
  };

  const handleChoice = (option) => {
    if (option.success) {
      const target = FULL_SCRIPT.findIndex(l => l.id === option.next);
      setIndex(target !== -1 ? target : index + 1);
    } else {
      const target = FULL_SCRIPT.findIndex(l => l.id === option.next);
      setIndex(target !== -1 ? target : index + 1);
    }
    setChoiceMode(false);
  };

  const handleMiniGameComplete = (success, evidenceId) => {
    if (success && evidenceId) {
      const ev = ALL_EVIDENCE.find(e => e.id === evidenceId);
      if (ev && !collectedEvidence.some(e => e.id === evidenceId)) {
        setCollectedEvidence([...collectedEvidence, ev]);
      }
    }
    setMiniGameMode(false);
    setMiniGameData(null);
    setIndex(index + 1);
  };

  const addEvidence = (id) => {
    const ev = ALL_EVIDENCE.find(e => e.id === id);
    if (ev && !collectedEvidence.some(e => e.id === id)) {
      setCollectedEvidence([...collectedEvidence, ev]);
      setFlash(true);
      setTimeout(() => setFlash(false), 300);
    }
  };

  const handlePress = () => {
    if (!isCE || !stmt?.pressResponse) {
      alert("추궁할 수 없습니다.");
      return;
    }
    setPressMode(true);
    setPressIndex(0);
  };

  const handlePressNext = () => {
    if (!stmt?.pressResponse) return;
    if (pressIndex < stmt.pressResponse.length - 1) {
      setPressIndex(pressIndex + 1);
    } else {
      setPressMode(false);
      setPressIndex(0);
    }
  };

  const presentEvidence = (id) => {
    if (!isCE || !stmt) return;
    
    if (stmt.weakness && stmt.contradiction === id) {
      setEffectText("이의 있소!");
      setShake(true);
      setTimeout(() => {
        setEffectText(null);
        setShake(false);
        setEvidenceMode(false);
        setCeIndex(0);
        setIndex(index + 1);
      }, 1500);
    } else {
      const newHp = Math.max(0, hp - 1);
      setHp(newHp);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      alert(stmt.failMsg || "그 증거는 모순이 아닙니다! (-1 HP)");
      if (newHp <= 0) {
        alert("HP 0. 게임 오버!");
        window.location.reload();
      }
    }
  };

  useEffect(() => {
    if (!currentLine?.type) return;
    
    const type = currentLine.type;
    
    if (type === 'scene') {
      if (currentLine.bg) setCurrentBg(currentLine.bg);
      setIndex(index + 1);
    }
    else if (type === 'evidence_add') {
      addEvidence(currentLine.id);
      setIndex(index + 1);
    }
    else if (type === 'choice') {
      setChoiceMode(true);
    }
    else if (type === 'mini_game') {
      setMiniGameMode(true);
      setMiniGameData(currentLine);
    }
    else if (type === 'anim') {
      const name = currentLine.name;
      if (name === 'objection') {
        setEffectText("이의 있소!");
        setShake(true);
        setTimeout(() => {
          setEffectText(null);
          setShake(false);
          setIndex(index + 1);
        }, 1500);
      } else if (name === 'witness_enter' || name === 'run_away') {
        setFlash(true);
        setTimeout(() => {
          setFlash(false);
          setIndex(index + 1);
        }, 500);
      } else if (name === 'confetti') {
        setEffectText("✨ 승소 ✨");
        setTimeout(() => {
          setEffectText(null);
          setIndex(index + 1);
        }, 2000);
      } else {
        setIndex(index + 1);
      }
    }
    else if (type === 'evidence_flash') {
      setFlash(true);
      setTimeout(() => {
        setFlash(false);
        setIndex(index + 1);
      }, 500);
    }
    else if (type === 'end') {
      setIsEnding(true);
    }
  }, [index, currentLine?.type]);

  // 엔딩 화면
  if (isEnding) {
    return (
      <div className="h-screen w-full bg-gradient-to-b from-slate-900 to-black text-white flex flex-col items-center justify-center p-8">
        <div className="text-8xl mb-8 animate-bounce">⚖️</div>
        <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-pulse">
          역전의 미술실
        </h1>
        <h2 className="text-4xl font-bold mb-8 text-yellow-400">- 완 결 -</h2>
        <p className="text-gray-300 mb-12 text-center max-w-2xl text-xl leading-relaxed">
          지민이의 누명은 벗겨졌고,<br/>
          진범 최태오는 처벌을 받았습니다.<br/>
          김변호의 명성은 더욱 높아졌습니다.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-12 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black text-xl rounded-full hover:scale-110 transition-all"
        >
          처음부터 다시하기
        </button>
      </div>
    );
  }

  return (
    <div className={`h-screen w-full relative overflow-hidden select-none font-sans text-white transition-colors duration-500 ${currentBg} ${shake ? 'animate-shake' : ''}`}>
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translate(0); }
          25% { transform: translate(-10px, 5px); }
          75% { transform: translate(10px, -5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out 2; }
      `}</style>

      {/* 배경 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50"></div>

      {/* HP */}
      <div className="absolute top-4 left-4 flex gap-2 bg-black/60 backdrop-blur-sm p-3 rounded-2xl z-50 border-2 border-white/20">
        <div className="text-sm font-bold mr-2">HP:</div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center ${i < hp ? 'bg-green-500' : 'bg-gray-800'}`}>
            {i < hp ? '⚖️' : ''}
          </div>
        ))}
      </div>

      {/* 증거 개수 */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-2xl z-50 border-2 border-yellow-400/50 flex items-center gap-2">
        <Briefcase className="text-yellow-400" size={20} />
        <span className="font-bold text-yellow-400">{collectedEvidence.length} / 10</span>
      </div>

      {/* 효과 */}
      {effectText && (
        <div className="absolute inset-0 z-[100] bg-white flex items-center justify-center">
          <h1 className="text-9xl font-black text-blue-600 drop-shadow-2xl italic border-8 border-black p-8 bg-white transform -rotate-3">
            {effectText}
          </h1>
        </div>
      )}

      {flash && <div className="absolute inset-0 z-[90] bg-white animate-ping opacity-50"></div>}

      {/* 캐릭터 */}
      <div className="absolute bottom-48 w-full flex justify-center pointer-events-none z-10">
        {char && (
          <div className="text-[280px] filter drop-shadow-2xl">
            {char.images?.[charFace] || char.image}
          </div>
        )}
      </div>

      {/* 심문 표시 */}
      {isCE && (
        <div className="absolute top-24 w-full text-center z-20">
          <div className={`inline-block px-12 py-3 border-y-4 font-black text-3xl ${
            currentLine.isFinal ? 'bg-red-700/95 text-white border-red-400 animate-pulse' : 'bg-blue-700/95 text-blue-100 border-blue-400'
          }`}>
            {currentLine.isFinal ? '⚠️ 최후의 증언 ⚠️' : `📋 ${currentLine.title}`} ({ceIndex + 1}/{currentLine.statements.length})
          </div>
        </div>
      )}

      {/* 대화창 */}
      <div 
        onClick={pressMode ? handlePressNext : handleNext}
        className={`absolute bottom-0 w-full p-6 z-30 transition-all ${
          evidenceMode || choiceMode || miniGameMode ? 'translate-y-full opacity-0' : 'translate-y-0'
        }`}
      >
        <div className={`max-w-5xl mx-auto backdrop-blur-xl border-4 rounded-2xl p-8 min-h-[200px] shadow-2xl relative cursor-pointer hover:border-white/40 transition-all ${
          isCE ? (currentLine.isFinal ? 'bg-red-900/90 border-red-400' : 'bg-blue-900/90 border-blue-400') : 'bg-black/85 border-white/30'
        }`}>
          {char && (
            <div className="absolute -top-6 left-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black px-8 py-2 rounded-t-xl border-2 border-white/30 text-lg">
              {char.name}
            </div>
          )}
          
          <p className={`text-2xl font-medium leading-relaxed ${currentLine.color || 'text-white'} ${currentLine.size || ''}`}>
            {txt}
          </p>

          {isCE && !pressMode && (
            <div className="absolute -top-20 right-0 flex gap-4">
              <button 
                onClick={(e) => { e.stopPropagation(); handlePress(); }}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-black text-xl px-10 py-4 rounded-full shadow-lg flex items-center gap-3 hover:scale-110 transition-all"
              >
                <MessageSquare size={24}/> 추궁!
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setEvidenceMode(true); }}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-black text-xl px-10 py-4 rounded-full shadow-lg flex items-center gap-3 hover:scale-110 transition-all"
              >
                <Briefcase size={24}/> 증거!
              </button>
            </div>
          )}

          <ChevronRight className="absolute bottom-6 right-6 animate-bounce text-white/60" size={36}/>
        </div>
      </div>

      {/* 선택지 */}
      {choiceMode && currentLine.options && (
        <div className="absolute inset-0 bg-black/95 z-40 p-8 flex flex-col items-center justify-center">
          <h2 className="text-3xl font-bold mb-8 text-center max-w-2xl">{currentLine.question}</h2>
          <div className="grid grid-cols-1 gap-4 max-w-md w-full">
            {currentLine.options.map((opt, i) => (
              <button 
                key={i}
                onClick={() => handleChoice(opt)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 p-6 rounded-xl text-xl font-bold hover:scale-105 transition-all"
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 미니게임 */}
      {miniGameMode && miniGameData && (
        <div className="absolute inset-0 bg-black/95 z-40 p-8 flex flex-col items-center justify-center">
          <h2 className="text-3xl font-bold mb-8">{miniGameData.instruction}</h2>
          
          {miniGameData.game_type === 'observation' && (
            <div className="grid grid-cols-2 gap-6">
              {miniGameData.items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleMiniGameComplete(item.correct, item.result)}
                  className="bg-slate-800 p-8 rounded-xl border-4 border-slate-600 hover:border-green-400 text-2xl font-bold hover:scale-105 transition-all"
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
          
          {miniGameData.game_type === 'search' && (
            <div className="grid grid-cols-2 gap-6">
              {miniGameData.items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleMiniGameComplete(true, item.result)}
                  className="bg-amber-900 p-8 rounded-xl border-4 border-amber-600 hover:border-yellow-400 text-2xl font-bold hover:scale-105 transition-all"
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}
          
          {miniGameData.game_type === 'timing' && (
            <button
              onClick={() => handleMiniGameComplete(true, miniGameData.result)}
              className="bg-red-800 p-12 rounded-xl border-4 border-red-500 hover:border-yellow-400 text-3xl font-black hover:scale-110 transition-all animate-pulse"
            >
              빨리 클릭! ⏱️
            </button>
          )}
        </div>
      )}

      {/* 증거창 */}
      {evidenceMode && (
        <div className="absolute inset-0 bg-black/95 z-40 p-8 flex flex-col items-center overflow-y-auto">
          <div className="w-full max-w-6xl">
            <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-yellow-400/50">
              <h2 className="text-4xl font-black text-yellow-400 flex items-center gap-3">
                <Briefcase size={40}/> 법정 기록
              </h2>
              <button 
                onClick={() => setEvidenceMode(false)}
                className="bg-red-600 hover:bg-red-500 px-8 py-3 rounded-xl font-black text-xl"
              >
                닫기
              </button>
            </div>
            
            {collectedEvidence.length === 0 ? (
              <div className="text-center text-gray-400 text-2xl py-20">수집한 증거가 없습니다.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {collectedEvidence.map(item => (
                  <button
                    key={item.id}
                    onClick={() => presentEvidence(item.id)}
                    className="bg-slate-800 p-6 rounded-2xl border-4 border-slate-600 flex items-start gap-6 hover:border-yellow-400 hover:scale-105 group text-left transition-all"
                  >
                    <div className="text-6xl bg-black/40 p-4 rounded-xl">{item.icon}</div>
                    <div className="flex-1">
                      <div className="text-2xl font-black text-yellow-400 mb-2">{item.name}</div>
                      <div className="text-base text-gray-300">{item.desc}</div>
                      <div className="text-sm text-red-400 font-bold mt-3 opacity-0 group-hover:opacity-100">
                        👉 클릭하여 제시
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AceAttorneyGame;
