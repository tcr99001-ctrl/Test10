'use client';
import React, { useState, useEffect } from 'react';
import { Briefcase, ChevronRight, AlertTriangle, MessageSquare, MapPin, Eye, Save, Book } from 'lucide-react';

// ==================== [캐릭터 설정] ====================
const CHARACTERS = {
  judge: { name: "재판장", image: "👨‍⚖️" },
  prosecutor: { name: "나검사", image: "🤵‍♂️", desc: "패배를 모르는 냉혈한" },
  player: { name: "김변호", image: "👉", desc: "역전의 발상" },
  witness: { 
    name: "최태오", 
    images: { 
      normal: "😎", 
      sweat: "😰", 
      angry: "😡", 
      shock: "😱", 
      breakdown: "🤯" 
    }, 
    desc: "미술부 부장. 거만함." 
  },
  jimin: { name: "이지민", image: "🥺", desc: "피고인. 소심한 미술부원." },
  narrator: { name: "나레이션", image: "" },
  teacher: { name: "미술 선생님", image: "👩‍🏫", desc: "미술부 지도교사." },
  club_member: { name: "미술부원 A", image: "🧑‍🎨", desc: "평범한 부원." },
  janitor: { name: "관리인", image: "🧹", desc: "학교 관리인" }
};

// ==================== [증거 설정] ====================
const ALL_EVIDENCE = [
  { id: 'knife', name: '미술용 나이프', icon: '🔪', desc: '지문이 묻은 공용 도구. 누구나 만질 수 있다.' },
  { id: 'picture', name: '훼손된 그림', icon: '🖼️', desc: '붉은 물감으로 뒤덮인 태오의 자랑스러운 작품.' },
  { id: 'cctv', name: '복도 CCTV', icon: '📹', desc: '16:00 전후 미술실 앞 복도엔 아무도 없었다.' },
  { id: 'floor_map', name: '미술실 도면', icon: '🗺️', desc: '앞문과 뒷문(창고 연결) 2개의 출구가 있다.' },
  { id: 'glove', name: '지민 작업용 장갑', icon: '🧤', desc: '지민이 평소 쓰는 깨끗한 장갑.' },
  { id: 'storage_photo', name: '창고 창문 사진', icon: '🪟', desc: '쇠창살로 완전히 막혀 탈출 불가능.' },
  { id: 'police_report', name: '경찰 수색 보고서', icon: '👮', desc: '사건 직후 창고 내부엔 아무도 없었음.' },
  { id: 'apron', name: '지민의 앞치마', icon: '🎽', desc: '사건 당시 착용. 물감 한 방울 없이 깨끗함.' },
  { id: 'floor_photo', name: '현장 바닥 사진', icon: '📸', desc: '그림 중심 반경 2m가 물감 범벅.' },
  { id: 'stained_glove', name: '태오의 장갑', icon: '🥊', desc: '★결정적★ 쓰레기통 속 붉은 물감 범벅 장갑. [태오] 이름 표시.' },
  { id: 'witness_statement', name: '태오 최초 진술서', icon: '📋', desc: '경찰 조사 시 "복도로 도망"이라 진술.' },
  { id: 'time_table', name: '미술부 일정표', icon: '📅', desc: '당일 16:00 이후 미술실 사용 예약 없음.' },
  { id: 'paint_can', name: '터진 물감통', icon: '🎨', desc: '내부에서 터진 흔적. 외부 충격 아님.' }
];

// ==================== [게임 스크립트] ====================
const FULL_SCRIPT = [
  // ========================================
  // [도입] 프롤로그 - 사건 발생
  // ========================================
  { type: 'scene', bg: 'bg-black', music: 'intro' },
  { type: 'talk', char: 'narrator', text: "어느 날 오후, 명문 세화고등학교 미술실에서 충격적인 사건이 발생했다." },
  { type: 'scene', bg: 'bg-indigo-900' },
  { type: 'talk', char: 'narrator', text: "미술부 부장 최태오의 수상작이 무참히 훼손당한 것." },
  { type: 'talk', char: 'witness', text: "내 그림이... 내 그림이!!!!", face: 'angry' },
  { type: 'talk', char: 'narrator', text: "현장에서 붙잡힌 용의자는 미술부의 소심한 신입, 이지민이었다." },
  { type: 'talk', char: 'jimin', text: "저... 저는... 정말 안 했어요...", face: 'normal' },
  { type: 'talk', char: 'narrator', text: "하지만 모든 증거는 그녀를 가리키고 있었다." },
  { type: 'scene', bg: 'bg-slate-900' },
  { type: 'talk', char: 'narrator', text: "재판 3일 전, 지민의 어머니가 김변호 법률사무소를 찾아왔다." },
  { type: 'talk', char: 'player', text: "걱정 마십시오. 제가 반드시 지민 양의 결백을 증명하겠습니다!" },
  { type: 'talk', char: 'narrator', text: "그렇게 김변호의 새로운 사건이 시작되었다..." },
  
  // ========================================
  // [발단] 1차 탐정 파트 - 기본 증거 수집
  // ========================================
  { type: 'scene', bg: 'bg-gray-800', location: 'hallway' },
  { type: 'talk', char: 'narrator', text: "[탐정 파트 1 - 기초 조사]" },
  { type: 'talk', char: 'player', text: "(학교에 왔다. 현장을 직접 확인해야겠어.)" },
  
  { id: 'investigation_hub_1', type: 'talk', char: 'player', text: "(어디를 조사할까?)" },
  { type: 'investigation_menu', locations: ['art_room_1', 'hallway_1', 'storage_1', 'office_1'] },
  
  // 미술실 조사 1
  { id: 'art_room_1', type: 'scene', bg: 'bg-indigo-900' },
  { type: 'talk', char: 'player', text: "(미술실... 아직 현장이 보존되어 있군.)" },
  { type: 'investigate', items: [
    { name: '훼손된 그림', desc: '완전히 망가졌다. 붉은 물감 투성이...', evidence: 'picture' },
    { name: '미술용 나이프', desc: '바닥에 떨어져 있다. 지문 감식 필요.', evidence: 'knife' },
    { name: '바닥', desc: '사진을 찍어두자. 증거가 될 수 있어.', evidence: 'floor_photo' }
  ]},
  { type: 'talk', char: 'player', text: "(물감이 엄청나게 튄 흔적... 폭발한 것 같아.)" },
  { type: 'jump', to: 'investigation_hub_1' },
  
  // 복도 조사 1
  { id: 'hallway_1', type: 'scene', bg: 'bg-gray-700' },
  { type: 'talk', char: 'player', text: "(복도에 CCTV가 있네.)" },
  { type: 'talk', char: 'teacher', text: "변호사님? CCTV 확인하시려구요?" },
  { type: 'talk', char: 'player', text: "네, 사건 당일 영상 좀 볼 수 있을까요?" },
  { type: 'talk', char: 'teacher', text: "여기 있습니다. 근데 이상한 게... 4시 전후론 아무도 안 지나갔더라구요." },
  { type: 'evidence_add', id: 'cctv' },
  { type: 'talk', char: 'player', text: "(복도로 나간 사람이 없다...? 흥미롭군.)" },
  { type: 'jump', to: 'investigation_hub_1' },
  
  // 창고 조사 1
  { id: 'storage_1', type: 'scene', bg: 'bg-amber-800' },
  { type: 'talk', char: 'player', text: "(창고... 미술실 뒷문과 연결되어 있어.)" },
  { type: 'investigate', items: [
    { name: '창문', desc: '쇠창살이 단단히... 사진 찍자.', evidence: 'storage_photo' },
    { name: '선반', desc: '미술 재료들이 정리되어 있다.' }
  ]},
  { type: 'talk', char: 'janitor', text: "사건 당일 여길 확인했는데, 아무도 없었어요." },
  { type: 'evidence_add', id: 'police_report' },
  { type: 'jump', to: 'investigation_hub_1' },
  
  // 교무실 조사 1
  { id: 'office_1', type: 'scene', bg: 'bg-green-900' },
  { type: 'talk', char: 'teacher', text: "지민이는 정말 착한 아이예요. 절대 그럴 애가 아닌데..." },
  { type: 'talk', char: 'player', text: "혹시 미술실 도면 같은 거 있나요?" },
  { type: 'talk', char: 'teacher', text: "아, 네. 여기 있습니다." },
  { type: 'evidence_add', id: 'floor_map' },
  { type: 'talk', char: 'player', text: "(앞문과 뒷문... 2개의 출구가 있군.)" },
  { type: 'jump', to: 'investigation_hub_1' },
  
  // 조사 완료 후
  { type: 'check_evidence', required: ['cctv', 'floor_map', 'picture', 'floor_photo'], next: 'investigation_1_end' },
  
  { id: 'investigation_1_end', type: 'scene', bg: 'bg-slate-800' },
  { type: 'talk', char: 'player', text: "(기본적인 증거는 모았어. 이제 지민이를 만나봐야겠다.)" },
  { type: 'scene', bg: 'bg-blue-900' },
  { type: 'talk', char: 'jimin', text: "변호사님... 정말 저 믿어주시는 거죠?" },
  { type: 'talk', char: 'player', text: "당연하죠. 당신 앞치마 좀 볼 수 있을까요?" },
  { type: 'talk', char: 'jimin', text: "네... 사건 때 입었던 건데, 깨끗하죠?" },
  { type: 'evidence_add', id: 'apron' },
  { type: 'talk', char: 'player', text: "(물감 한 방울도 안 묻었어... 이건 중요한 증거야!)" },
  { type: 'talk', char: 'jimin', text: "제 장갑도요... 깨끗해요. 전 정말 안 했어요!" },
  { type: 'evidence_add', id: 'glove' },
  
  // ========================================
  // [전개] 1차 재판 - 기본 모순 발견
  // ========================================
  { type: 'scene', bg: 'bg-slate-900' },
  { type: 'talk', char: 'narrator', text: "[제1회 공판]" },
  { type: 'talk', char: 'judge', text: "이제 '미술실 그림 훼손 사건' 재판을 시작하겠습니다." },
  { type: 'talk', char: 'prosecutor', text: "검찰은 피고인 이지민이 질투심으로 범행을 저질렀다고 주장합니다.", face: 'normal' },
  { type: 'talk', char: 'player', text: "(지민이는 절대 그럴 아이가 아니야...!)" },
  { type: 'talk', char: 'judge', text: "검찰 측, 증거를 제시하시오." },
  { type: 'talk', char: 'prosecutor', text: "첫째, 범행 도구인 나이프에서 피고인의 지문이 나왔습니다.", face: 'normal' },
  { type: 'talk', char: 'prosecutor', text: "둘째, 목격자가 있습니다. 증인을 부르겠습니다!", face: 'normal' },
  
  { type: 'anim', name: 'witness_enter' },
  { type: 'talk', char: 'witness', text: "안녕하세요~ 미술부 부장 최태오입니다.", face: 'normal' },
  { type: 'talk', char: 'player', text: "(저 여유로운 태도... 뭔가 수상한데.)" },
  { type: 'talk', char: 'judge', text: "증인은 그날 본 것을 정확히 증언하세요." },
  
  // 1차 심문
  { type: 'anim', name: 'cross_exam_start' },
  {
    id: 'ce_1',
    type: 'cross_exam',
    title: '목격 증언',
    statements: [
      {
        text: "1. 그날 오후 4시, 저는 미술실로 뒷정리를 하러 갔습니다.",
        weakness: false,
        press: "왜 혼자 뒷정리를 했나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "부장이니까요. 책임감 있게 행동했죠.", face: 'normal' },
          { type: 'talk', char: 'player', text: "(별 문제없는 답변이네...)" }
        ]
      },
      {
        text: "2. 문을 열자마자 지민이가 나이프를 들고 있는 걸 봤습니다.",
        weakness: false,
        press: "어느 문으로 들어갔죠?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "당연히 앞문이죠. 항상 앞문으로 다닙니다.", face: 'normal' },
          { type: 'talk', char: 'player', text: "(앞문... 기억해두자.)" }
        ]
      },
      {
        text: "3. 제 그림은 이미 망가져 있었고, 물감이 사방에 튀어있었어요.",
        weakness: false,
        press: "그때 지민이는 뭐라고 했나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "아무 말도 안 했어요. 그냥 놀란 표정이었죠.", face: 'sweat' },
          { type: 'talk', char: 'player', text: "(놀란 표정...?)" }
        ]
      },
      {
        text: "4. 저는 소리를 질렀고, 지민이는 복도로 뛰어 도망갔습니다!",
        weakness: true,
        contradiction: 'cctv',
        failMsg: "복도 CCTV와 관련이 있을 것 같은데...",
        press: "복도로 도망갔다는 확신이 있나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "당연하죠! 제 눈으로 똑똑히 봤습니다!", face: 'angry' },
          { type: 'talk', char: 'player', text: "(여기다! 증거 제시!)" }
        ]
      }
    ]
  },
  
  // 1차 이의제기 성공
  { type: 'anim', name: 'objection' },
  { type: 'talk', char: 'player', text: "이의 있습니다!", size: 'text-3xl', color: 'text-blue-400' },
  { type: 'talk', char: 'witness', text: "뭐, 뭐가 문제죠?!", face: 'sweat' },
  { type: 'evidence_flash', id: 'cctv' },
  { type: 'talk', char: 'player', text: "이 [복도 CCTV] 기록을 보십시오!", size: 'text-2xl' },
  { type: 'talk', char: 'player', text: "사건 시각인 4시 전후로 복도를 지나간 사람은 '단 한 명도' 없었습니다!", color: 'text-blue-400' },
  { type: 'talk', char: 'judge', text: "오오... 정말 아무도 없군요." },
  { type: 'talk', char: 'witness', text: "그, 그건...", face: 'shock' },
  { type: 'talk', char: 'prosecutor', text: "잠깐! 변호인, 성급하군요.", face: 'normal' },
  
  // ========================================
  // [위기] 검사의 반격 & 2차 탐정
  // ========================================
  { type: 'talk', char: 'prosecutor', text: "증인, 혹시 기억을 잘못한 것 아닙니까?", face: 'normal' },
  { type: 'talk', char: 'witness', text: "아! 맞다, 이제 생각났어요!", face: 'normal' },
  { type: 'talk', char: 'witness', text: "복도가 아니라... 뒷문으로 창고 쪽으로 도망갔어요!", face: 'normal' },
  { type: 'talk', char: 'player', text: "뭐?! 증언을 번복한다고?!" },
  { type: 'talk', char: 'judge', text: "흠... 증인의 기억이 애매하군요." },
  { type: 'talk', char: 'prosecutor', text: "재판장님, 증거 수집을 위한 휴정을 요청합니다.", face: 'normal' },
  { type: 'talk', char: 'judge', text: "허가합니다. 양측은 추가 조사를 실시하시오." },
  
  // 2차 탐정 파트
  { type: 'scene', bg: 'bg-gray-800' },
  { type: 'talk', char: 'narrator', text: "[탐정 파트 2 - 심층 조사]" },
  { type: 'talk', char: 'player', text: "(증언이 바뀌었어... 뭔가 숨기는 게 있다!)" },
  
  { id: 'investigation_hub_2', type: 'talk', char: 'player', text: "(더 깊이 파헤쳐야 해.)" },
  { type: 'investigation_menu', locations: ['art_room_2', 'storage_2', 'club_room_2', 'witness_room_2'] },
  
  // 미술실 재조사
  { id: 'art_room_2', type: 'scene', bg: 'bg-indigo-900' },
  { type: 'talk', char: 'player', text: "(다시 꼼꼼히 살펴보자...)" },
  { type: 'investigate', items: [
    { name: '쓰레기통', desc: '깊숙이 뭔가 있다...!', evidence: 'stained_glove' },
    { name: '물감통', desc: '내부에서 터진 흔적이...', evidence: 'paint_can' }
  ]},
  { type: 'talk', char: 'player', text: "(이건... 태오 이름이 적힌 장갑! 물감 범벅이잖아!)" },
  { type: 'jump', to: 'investigation_hub_2' },
  
  // 창고 재조사
  { id: 'storage_2', type: 'scene', bg: 'bg-amber-800' },
  { type: 'talk', char: 'player', text: "(창고를 다시 보자...)" },
  { type: 'talk', char: 'janitor', text: "아, 변호사님. 그날 선생님이랑 확인했을 땐 정말 아무도 없었어요." },
  { type: 'talk', char: 'player', text: "확인하기까지 시간이 얼마나 걸렸죠?" },
  { type: 'talk', char: 'janitor', text: "글쎄요... 5분? 태오 군이 부르러 왔으니..." },
  { type: 'talk', char: 'player', text: "(5분... 도망갈 시간은 충분하지만, 창문은 막혀있어.)" },
  { type: 'jump', to: 'investigation_hub_2' },
  
  // 부실 조사
  { id: 'club_room_2', type: 'scene', bg: 'bg-green-900' },
  { type: 'talk', char: 'club_member', text: "태오 부장은... 요즘 지민이한테 질투가 심했어요." },
  { type: 'talk', char: 'player', text: "질투요?" },
  { type: 'talk', char: 'club_member', text: "지민이 그림이 대회에서 상 받았거든요. 태오 부장 작품은 떨어지고..." },
  { type: 'talk', char: 'player', text: "(동기... 충분하군.)" },
  { type: 'jump', to: 'investigation_hub_2' },
  
  // 태오 추가 조사
  { id: 'witness_room_2', type: 'scene', bg: 'bg-purple-900' },
  { type: 'talk', char: 'player', text: "(태오의 최초 진술서를 확인하자...)" },
  { type: 'talk', char: 'teacher', text: "경찰 조사 때 진술서요? 여기 있습니다." },
  { type: 'evidence_add', id: 'witness_statement' },
  { type: 'talk', char: 'player', text: "(여기 분명 '복도로 도망'이라고... 증언이 다르잖아!)" },
  { type: 'jump', to: 'investigation_hub_2' },
  
  { type: 'check_evidence', required: ['stained_glove', 'witness_statement', 'paint_can'], next: 'investigation_2_end' },
  
  { id: 'investigation_2_end', type: 'scene', bg: 'bg-slate-800' },
  { type: 'talk', char: 'player', text: "(좋아... 결정적 증거를 찾았어!)" },
  
  // ========================================
  // [절정] 2차 재판 - 진실 폭로
  // ========================================
  { type: 'scene', bg: 'bg-slate-900' },
  { type: 'talk', char: 'narrator', text: "[제2회 공판]" },
  { type: 'talk', char: 'judge', text: "휴정이 끝났습니다. 심리를 계속하겠습니다." },
  { type: 'talk', char: 'prosecutor', text: "증인, 수정된 증언을 해주십시오.", face: 'normal' },
  
  // 2차 심문
  { type: 'anim', name: 'cross_exam_start' },
  {
    id: 'ce_2',
    type: 'cross_exam',
    title: '수정된 증언',
    statements: [
      {
        text: "1. 죄송합니다. 충격으로 기억이 혼란스러웠던 것 같습니다.",
        weakness: false,
        press: "그렇게 큰 충격이었나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "제 작품이 망가진 걸 보니... 머리가 하얘졌죠.", face: 'sweat' },
          { type: 'talk', char: 'player', text: "(과연 그럴까...?)" }
        ]
      },
      {
        text: "2. 지민이는 복도가 아니라 뒷문으로 창고 쪽으로 도망갔습니다.",
        weakness: true,
        contradiction: 'witness_statement',
        failMsg: "증언 번복과 관련된 증거가...",
        press: "처음엔 분명 복도라고 했는데요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "착각이었다니까요! 이제 정확히 기억났어요!", face: 'angry' },
          { type: 'talk', char: 'player', text: "(여기서 진술서를 제시!)" }
        ]
      },
      {
        text: "3. 창고엔 창문이 있으니, 그리로 빠져나갔을 겁니다.",
        weakness: false,
        press: "창고 창문을 직접 확인했나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "뭐... 당연히 있죠.", face: 'normal' },
          { type: 'talk', char: 'player', text: "(나중에 창문 사진으로 반박하자.)" }
        ]
      },
      {
        text: "4. 저는 너무 놀라서 바로 선생님을 부르러 갔습니다.",
        weakness: false,
        press: "왜 직접 쫓아가지 않았죠?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "무서웠으니까요! 혼자 대응할 수 없었죠.", face: 'sweat' },
          { type: 'talk', char: 'judge', text: "그럴 수 있겠군요." }
        ]
      }
    ]
  },
  
  // 진술서 제시
  { type: 'anim', name: 'objection' },
  { type: 'talk', char: 'player', text: "잠깐만요! 증언이 바뀐 것에 대해 설명이 필요합니다!", size: 'text-3xl', color: 'text-blue-400' },
  { type: 'evidence_flash', id: 'witness_statement' },
  { type: 'talk', char: 'player', text: "이것은 사건 당일 경찰 조사 때의 [최초 진술서]입니다!", size: 'text-2xl' },
  { type: 'talk', char: 'player', text: "여기엔 분명 '복도로 도망갔다'고 적혀있습니다!", color: 'text-blue-400' },
  { type: 'talk', char: 'witness', text: "그, 그건... 착각이었다니까요!", face: 'sweat' },
  { type: 'talk', char: 'player', text: "사건 직후의 생생한 기억이 착각이고, 며칠 지난 지금이 정확하다고요?" },
  { type: 'talk', char: 'prosecutor', text: "으음... 확실히 의심스럽군.", face: 'normal' },
  { type: 'talk', char: 'judge', text: "증인, 정확히 뭘 봤는지 다시 증언하시오." },
  
  // 3차 심문 - 핵심 돌파
  { type: 'anim', name: 'cross_exam_start' },
  {
    id: 'ce_3',
    type: 'cross_exam',
    title: '재차 증언',
    statements: [
      {
        text: "1. 좋아요, 솔직히 말하겠습니다. 저는... 범행 현장을 직접 보지 못했어요.",
        weakness: false,
        press: "보지 못했다니?!",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "들어갔을 땐 이미 끝나 있었어요!", face: 'sweat' },
          { type: 'talk', char: 'player', text: "(드디어 진실이 나오는군...)" }
        ]
      },
      {
        text: "2. 하지만 그림이 망가져있고, 지민이가 나이프를 쥐고 있었던 건 사실입니다!",
        weakness: false,
        press: "나이프를 '쥐고' 있었나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "아... 아니, 옆에 떨어져 있었어요.", face: 'sweat' },
          { type: 'talk', char: 'player', text: "(증언이 계속 바뀌네...)" }
        ]
      },
      {
        text: "3. 그리고 지민이는 분명 물감을 온몸에 뒤집어쓴 상태였어요!",
        weakness: true,
        contradiction: 'apron',
        failMsg: "지민의 옷에 관한 증거가...",
        press: "물감을 뒤집어썼다고요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "네! 완전 범벅이었다니까요!", face: 'angry' },
          { type: 'talk', char: 'player', text: "(앞치마 증거 제시!)" }
        ]
      },
      {
        text: "4. 누가 봐도 범인은 지민이 밖에 없어요!",
        weakness: false,
        press: "정말 그렇게 확신하나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "당연하죠! 다른 사람은 없었으니까!", face: 'normal' },
          { type: 'talk', char: 'player', text: "(과연...?)" }
        ]
      }
    ]
  },
  
  // 앞치마 증거 제시
  { type: 'anim', name: 'objection' },
  { type: 'talk', char: 'player', text: "그럴 리가 없습니다!", size: 'text-3xl', color: 'text-red-500' },
  { type: 'evidence_flash', id: 'apron' },
  { type: 'talk', char: 'player', text: "[지민의 앞치마]를 보십시오!", size: 'text-2xl' },
  { type: 'talk', char: 'player', text: "사건 당시 입고 있던 이 앞치마엔 물감 한 방울 묻어있지 않습니다!", color: 'text-blue-400' },
  { type: 'evidence_flash', id: 'floor_photo' },
  { type: 'talk', char: 'player', text: "현장 사진을 보면 반경 2m가 물감 바다입니다!" },
  { type: 'talk', char: 'player', text: "그 한가운데 있던 사람이 깨끗하다는 건 물리적으로 불가능합니다!", size: 'text-2xl' },
  { type: 'talk', char: 'prosecutor', text: "...맞는 말이군.", face: 'shock' },
  { type: 'talk', char: 'witness', text: "그, 그럼... 장갑을 껴서...", face: 'shock' },
  { type: 'talk', char: 'player', text: "장갑으로 옷까지 보호할 순 없죠!" },
  { type: 'talk', char: 'witness', text: "크윽...!", face: 'shock' },
  
  // ========================================
  // [절정] 최후의 공방
  // ========================================
  { type: 'talk', char: 'judge', text: "증인의 증언에 모순이 너무 많습니다." },
  { type: 'talk', char: 'player', text: "재판장님, 제게 마지막 추궁 기회를 주십시오!" },
  { type: 'talk', char: 'judge', text: "허가합니다." },
  { type: 'talk', char: 'prosecutor', text: "증인... 솔직히 말하는 게 좋을 겁니다.", face: 'normal' },
  
  // 최종 심문
  { type: 'anim', name: 'cross_exam_start' },
  {
    id: 'ce_4',
    type: 'cross_exam',
    title: '최후의 증언',
    isFinal: true,
    statements: [
      {
        text: "1. ...좋아요. 인정하죠. 범행 장면은 못 봤어요.",
        weakness: false,
        press: "그럼 왜 거짓말을 했죠?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "그냥... 지민이가 범인 같았으니까요!", face: 'sweat' },
          { type: 'talk', char: 'player', text: "(같다고 거짓 증언을...?)" }
        ]
      },
      {
        text: "2. 하지만 전 그 더러운 물감은 손도 안 댔어요!",
        weakness: true,
        contradiction: 'stained_glove',
        failMsg: "물감과 관련된 결정적 증거가...",
        press: "정말 손도 안 댔다고요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "맹세코! 전 깨끗했다니까요!", face: 'angry' },
          { type: 'talk', char: 'player', text: "(이제다!)" }
        ]
      },
      {
        text: "3. 범인은 창고로 도망갔을 거예요. 다른 설명이 없잖아요!",
        weakness: false,
        press: "창고 창문은 확인했나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "...아니요. 근데 당연히 열려있겠죠?", face: 'normal' },
          { type: 'evidence_flash', id: 'storage_photo' },
          { type: 'talk', char: 'player', text: "(창문은 쇠창살로 막혀있어. 나중에 제시하자.)" }
        ]
      },
      {
        text: "4. 전 피해자일 뿐이에요! 왜 저를 의심하는 거죠?!",
        weakness: false,
        press: "피해자라면 왜 증언을 계속 바꾸나요?",
        pressResponse: [
          { type: 'talk', char: 'witness', text: "그건... 그건...", face: 'sweat' },
          { type: 'talk', char: 'player', text: "(몰아붙이자!)" }
        ]
      }
    ]
  },
  
  // 결정타
  { type: 'anim', name: 'objection' },
  { type: 'talk', char: 'player', text: "손도 안 댔다고요?!", size: 'text-4xl font-black text-red-500' },
  { type: 'talk', char: 'player', text: "그렇다면 이건 뭐죠?!", size: 'text-3xl' },
  { type: 'evidence_flash', id: 'stained_glove' },
  { type: 'talk', char: 'player', text: "미술실 쓰레기통 깊숙한 곳에서 발견된 [붉은 물감 범벅 장갑]!", size: 'text-2xl' },
  { type: 'talk', char: 'player', text: "그리고 손목 부분엔... [태오]라고 선명히 적혀있습니다!", color: 'text-yellow-400' },
  { type: 'talk', char: 'judge', text: "뭐라?!" },
  { type: 'talk', char: 'witness', text: "그, 그건... 예전에 쓰던 거...", face: 'shock' },
  { type: 'evidence_flash', id: 'paint_can' },
  { type: 'talk', char: 'player', text: "게다가 [터진 물감통]을 감식한 결과!" },
  { type: 'talk', char: 'player', text: "외부 충격이 아니라 내부에서 압력을 가해 터뜨린 흔적입니다!", size: 'text-2xl' },
  { type: 'talk', char: 'prosecutor', text: "그렇다면... 누군가 일부러 터뜨렸다는...", face: 'shock' },
  { type: 'talk', char: 'player', text: "그렇습니다! 진범은... 바로 당신, 최태오!", size: 'text-3xl', color: 'text-red-500' },
  { type: 'talk', char: 'witness', text: "으아아아악!", face: 'breakdown' },
  
  // ========================================
  // [결말] 진실 & 엔딩
  // ========================================
  { type: 'anim', name: 'confetti' },
  { type: 'scene', bg: 'bg-indigo-900' },
  { type: 'talk', char: 'narrator', text: "[사건의 진상]" },
  { type: 'talk', char: 'player', text: "최태오, 당신은 지민이에 대한 질투심으로 이 모든 걸 계획했죠." },
  { type: 'talk', char: 'player', text: "먼저 자신의 그림에 물감통을 터뜨려 훼손한 뒤..." },
  { type: 'talk', char: 'player', text: "지민이가 들어오길 기다렸다가 범인으로 몰았습니다!" },
  { type: 'talk', char: 'witness', text: "...맞아요. 다 제가 했어요.", face: 'breakdown' },
  { type: 'talk', char: 'witness', text: "지민이가 대회에서 상 받는 걸 보니... 너무 화가 나서...", face: 'sweat' },
  { type: 'talk', char: 'witness', text: "제 그림을 망치고 지민이한테 누명을 씌우면... 복수가 될 거라고 생각했어요.", face: 'sweat' },
  { type: 'talk', char: 'judge', text: "...어이없는 동기군요." },
  
  { type: 'scene', bg: 'bg-slate-900' },
  { type: 'talk', char: 'judge', text: "피고인 이지민에게 무죄를 선고합니다!", size: 'text-3xl' },
  { type: 'talk', char: 'judge', text: "최태오는 무고죄 및 기물파손죄로 입건될 것입니다." },
  { type: 'talk', char: 'jimin', text: "변호사님... 감사합니다...!", face: 'normal' },
  { type: 'talk', char: 'player', text: "당연한 일을 했을 뿐입니다. 진실은 언제나 밝혀지니까요!" },
  
  { type: 'scene', bg: 'bg-black' },
  { type: 'talk', char: 'narrator', text: "김변호는 또 한 번 역전승을 거두었다.", color: 'text-yellow-400' },
  { type: 'talk', char: 'narrator', text: "그의 명성은 더욱 높아졌고,", color: 'text-yellow-400' },
  { type: 'talk', char: 'narrator', text: "오늘도 어딘가에서 억울한 의뢰인이 그를 찾고 있을 것이다...", color: 'text-yellow-400' },
  
  { type: 'end', text: "THE END" }
];

// ==================== [게임 엔진] ====================
function AceAttorneyGame() {
  const [script] = useState(FULL_SCRIPT);
  const [index, setIndex] = useState(0);
  const [evidenceMode, setEvidenceMode] = useState(false);
  const [pressMode, setPressMode] = useState(false);
  const [pressIndex, setPressIndex] = useState(0);
  const [investigateMode, setInvestigateMode] = useState(false);
  const [locationMenuMode, setLocationMenuMode] = useState(false);
  const [collectedEvidence, setCollectedEvidence] = useState([]);
  const [currentBg, setCurrentBg] = useState('bg-black');
  const [hp, setHp] = useState(5);
  const [shake, setShake] = useState(false);
  const [flash, setFlash] = useState(false);
  const [effectText, setEffectText] = useState(null);
  const [ceIndex, setCeIndex] = useState(0);
  const [isEnding, setIsEnding] = useState(false);
  const [currentLocations, setCurrentLocations] = useState([]);

  const currentLine = script[index] || {};
  const isCE = currentLine.type === 'cross_exam';
  const stmt = isCE ? currentLine.statements?.[ceIndex] : null;
  const txt = isCE ? stmt?.text : currentLine.text;
  const char = isCE ? CHARACTERS.witness : (currentLine.char ? CHARACTERS[currentLine.char] : null);
  
  const pressTxt = pressMode && stmt?.pressResponse?.[pressIndex]?.text;
  const pressChar = pressMode && stmt?.pressResponse?.[pressIndex]?.char ? CHARACTERS[stmt.pressResponse[pressIndex].char] : null;
  const pressFace = pressMode && stmt?.pressResponse?.[pressIndex]?.face;

  const handleNext = () => {
    if (evidenceMode || pressMode || investigateMode || locationMenuMode || isEnding) return;
    
    if (currentLine.type === 'cross_exam') {
      const nextIdx = ceIndex + 1;
      if (nextIdx >= currentLine.statements.length) {
        setCeIndex(0);
      } else {
        setCeIndex(nextIdx);
      }
      return;
    }

    if (currentLine.type === 'jump') {
      const targetIndex = script.findIndex(l => l.id === currentLine.to);
      if (targetIndex !== -1) {
        setIndex(targetIndex);
      } else {
        setIndex(index + 1);
      }
      return;
    }

    if (currentLine.type === 'investigation_menu') {
      setCurrentLocations(currentLine.locations || []);
      setLocationMenuMode(true);
      return;
    }

    setIndex(prev => Math.min(prev + 1, script.length - 1));
  };

  const addEvidence = (id) => {
    const ev = ALL_EVIDENCE.find(e => e.id === id);
    if (ev && !collectedEvidence.some(e => e.id === id)) {
      setCollectedEvidence([...collectedEvidence, ev]);
      setFlash(true);
      setTimeout(() => setFlash(false), 300);
    }
  };

  const handleLocationSelect = (locationId) => {
    const target = script.findIndex(l => l.id === locationId);
    if (target !== -1) {
      setIndex(target);
      setLocationMenuMode(false);
    }
  };

  const handleInvestigate = (item) => {
    if (item.evidence) {
      addEvidence(item.evidence);
    }
  };

  const handlePress = () => {
    if (!isCE || !stmt?.pressResponse) {
      alert("이 증언은 추궁할 수 없습니다.");
      return;
    }
    setPressMode(true);
    setPressIndex(0);
  };

  const handlePressNext = () => {
    if (!stmt?.pressResponse) return;
    const resp = stmt.pressResponse;
    if (pressIndex < resp.length - 1) {
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
      alert(stmt.failMsg || "그 증거는 모순이 아닙니다! (패널티 -1HP)");
      if (newHp <= 0) {
        alert("HP가 0이 되었습니다. 게임 오버!");
        window.location.reload();
      }
    }
  };

  useEffect(() => {
    if (!currentLine || !currentLine.type) return;
    
    const type = currentLine.type;
    
    if (type === 'scene') {
      if (currentLine.bg) setCurrentBg(currentLine.bg);
      setIndex(index + 1);
    }
    else if (type === 'evidence_add') {
      addEvidence(currentLine.id);
      setIndex(index + 1);
    }
    else if (type === 'check_evidence') {
      const hasAll = currentLine.required?.every(id => 
        collectedEvidence.some(e => e.id === id)
      );
      if (hasAll && currentLine.next) {
        const target = script.findIndex(l => l.id === currentLine.next);
        if (target !== -1) setIndex(target);
        else setIndex(index + 1);
      } else if (!hasAll) {
        alert("아직 필요한 증거를 모두 모으지 못했습니다!");
      } else {
        setIndex(index + 1);
      }
    }
    else if (type === 'investigate') {
      setInvestigateMode(true);
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
      } else if (name === 'witness_enter' || name === 'cross_exam_start') {
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
          진범 최태오는 정당한 처벌을 받았습니다.<br/>
          김변호 변호사의 명성은 더욱 높아졌습니다.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-12 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-black text-xl rounded-full hover:scale-110 hover:shadow-2xl transition-all duration-300"
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
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-10px, 5px); }
          50% { transform: translate(10px, -5px); }
          75% { transform: translate(-5px, -10px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out 2; }
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-pulse-scale { animation: pulse-scale 2s ease-in-out infinite; }
      `}</style>

      {/* 배경 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50 pointer-events-none"></div>

      {/* HP 표시 (재판 중) */}
      {!locationMenuMode && !investigateMode && (
        <div className="absolute top-4 left-4 flex gap-2 bg-black/60 backdrop-blur-sm p-3 rounded-2xl z-50 border-2 border-white/20">
          <div className="text-sm font-bold mr-2 flex items-center">HP:</div>
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all ${i < hp ? 'bg-green-500 scale-100' : 'bg-gray-800 scale-75'}`}
            >
              {i < hp ? '⚖️' : ''}
            </div>
          ))}
        </div>
      )}

      {/* 증거 개수 표시 */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-2xl z-50 border-2 border-yellow-400/50 flex items-center gap-2">
        <Briefcase className="text-yellow-400" size={20} />
        <span className="font-bold text-yellow-400">{collectedEvidence.length} / {ALL_EVIDENCE.length}</span>
      </div>

      {/* 특수 효과 */}
      {effectText && (
        <div className="absolute inset-0 z-[100] bg-white flex items-center justify-center">
          <div className="relative animate-pulse-scale">
            <h1 className="text-9xl font-black text-blue-600 drop-shadow-2xl italic border-8 border-black p-8 bg-white transform -rotate-3">
              {effectText}
            </h1>
          </div>
        </div>
      )}

      {flash && (
        <div className="absolute inset-0 z-[90] bg-white animate-ping opacity-50 pointer-events-none"></div>
      )}

      {/* 캐릭터 표시 */}
      <div className="absolute bottom-48 w-full flex justify-center pointer-events-none z-10">
        {(pressMode ? pressChar : char) && (
          <div className="text-[280px] filter drop-shadow-2xl transition-all duration-300">
            {(() => {
              const character = pressMode ? pressChar : char;
              const face = pressMode ? pressFace : currentLine.face;
              if (character.images) {
                return character.images[face] || character.images.normal;
              }
              return character.image;
            })()}
          </div>
        )}
      </div>

      {/* 심문 상태 표시 */}
      {isCE && (
        <div className="absolute top-24 w-full text-center z-20">
          <div className={`inline-block px-12 py-3 border-y-4 shadow-2xl font-black text-3xl ${
            currentLine.isFinal 
              ? 'bg-red-700/95 text-white border-red-400 animate-pulse' 
              : 'bg-blue-700/95 text-blue-100 border-blue-400'
          }`}>
            {currentLine.isFinal ? '⚠️ 최후의 증언 ⚠️' : `📋 ${currentLine.title || '심문'}`} ({ceIndex + 1}/{currentLine.statements?.length || 0})
          </div>
        </div>
      )}

      {/* 대화창 */}
      <div 
        onClick={pressMode ? handlePressNext : handleNext}
        className={`absolute bottom-0 w-full p-6 z-30 transition-all duration-300 ${
          evidenceMode || investigateMode || locationMenuMode ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className={`max-w-5xl mx-auto backdrop-blur-xl border-4 rounded-2xl p-8 min-h-[200px] shadow-2xl relative cursor-pointer hover:border-white/40 transition-all ${
          isCE 
            ? (currentLine.isFinal ? 'bg-red-900/90 border-red-400' : 'bg-blue-900/90 border-blue-400')
            : 'bg-black/85 border-white/30'
        }`}>
          {(pressMode ? pressChar : char) && (
            <div className="absolute -top-6 left-8 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black px-8 py-2 rounded-t-xl border-2 border-white/30 shadow-lg text-lg">
              {(pressMode ? pressChar : char).name}
            </div>
          )}
          
          <p className={`text-2xl font-medium leading-relaxed ${
            currentLine.color || (isCE ? (currentLine.isFinal ? 'text-red-100' : 'text-blue-100') : 'text-white')
          } ${currentLine.size || ''}`}>
            {pressMode ? pressTxt : txt}
          </p>

          {/* 심문 버튼 */}
          {isCE && !pressMode && (
            <div className="absolute -top-20 right-0 flex gap-4">
              <button 
                onClick={(e) => { e.stopPropagation(); handlePress(); }}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-black text-xl px-10 py-4 rounded-full shadow-lg flex items-center gap-3 transform hover:scale-110 transition-all"
              >
                <MessageSquare size={24}/> 추궁!
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setEvidenceMode(true); }}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-black text-xl px-10 py-4 rounded-full shadow-lg flex items-center gap-3 transform hover:scale-110 transition-all"
              >
                <Briefcase size={24}/> 증거!
              </button>
            </div>
          )}

          <ChevronRight className="absolute bottom-6 right-6 animate-bounce text-white/60" size={36}/>
        </div>
      </div>

      {/* 장소 선택 메뉴 */}
      {locationMenuMode && (
        <div className="absolute inset-0 bg-black/95 z-40 p-8 flex flex-col items-center justify-center">
          <h2 className="text-4xl font-black mb-12 text-white flex items-center gap-3">
            <MapPin size={40} className="text-blue-400"/> 조사할 장소를 선택하세요
          </h2>
          <div className="grid grid-cols-2 gap-6 max-w-4xl w-full">
            {currentLocations.map(locId => {
              const locData = {
                art_room_1: { name: '🎨 미술실', desc: '사건 현장', color: 'from-indigo-600 to-purple-600' },
                art_room_2: { name: '🎨 미술실 재조사', desc: '더 자세히...', color: 'from-indigo-600 to-purple-600' },
                hallway_1: { name: '🚶 복도', desc: 'CCTV 확인', color: 'from-gray-600 to-gray-700' },
                storage_1: { name: '📦 창고', desc: '뒷문 연결', color: 'from-amber-700 to-amber-800' },
                storage_2: { name: '📦 창고 재조사', desc: '흔적 찾기', color: 'from-amber-700 to-amber-800' },
                office_1: { name: '🏫 교무실', desc: '자료 수집', color: 'from-green-700 to-green-800' },
                club_room_2: { name: '👥 부실', desc: '부원 대화', color: 'from-teal-700 to-teal-800' },
                witness_room_2: { name: '📋 진술 확인', desc: '태오 조사', color: 'from-purple-700 to-purple-800' }
              }[locId] || { name: locId, desc: '', color: 'from-gray-600 to-gray-700' };

              return (
                <button
                  key={locId}
                  onClick={() => handleLocationSelect(locId)}
                  className={`bg-gradient-to-br ${locData.color} p-6 rounded-2xl border-4 border-white/20 hover:border-white hover:scale-105 transition-all shadow-xl`}
                >
                  <div className="text-3xl font-black mb-2">{locData.name}</div>
                  <div className="text-sm text-white/80">{locData.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 조사 모드 */}
      {investigateMode && (
        <div className="absolute inset-0 bg-black/95 z-40 p-8 flex flex-col items-center justify-center">
          <h2 className="text-4xl font-black mb-12 flex items-center gap-3 text-white">
            <Eye size={40} className="text-green-400"/> 조사할 항목을 선택하세요
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full mb-8">
            {currentLine.items?.map((item, i) => (
              <button
                key={i}
                onClick={() => handleInvestigate(item)}
                className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border-4 border-slate-600 hover:border-green-400 hover:scale-105 transition-all shadow-xl text-left"
              >
                <div className="text-2xl font-black text-green-400 mb-2">{item.name}</div>
                <div className="text-base text-gray-300">{item.desc}</div>
                {item.evidence && (
                  <div className="mt-3 text-xs text-yellow-400 font-bold">
                    💡 증거를 획득할 수 있습니다
                  </div>
                )}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setInvestigateMode(false)}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 px-8 py-3 rounded-xl font-black text-xl shadow-lg"
          >
            조사 마치기
          </button>
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
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 px-8 py-3 rounded-xl font-black text-xl"
              >
                닫기
              </button>
            </div>
            
            {collectedEvidence.length === 0 ? (
              <div className="text-center text-gray-400 text-2xl py-20">
                아직 수집한 증거가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {collectedEvidence.map(item => (
                  <button
                    key={item.id}
                    onClick={() => presentEvidence(item.id)}
                    className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border-4 border-slate-600 flex items-start gap-6 hover:border-yellow-400 hover:scale-105 group text-left transition-all shadow-xl"
                  >
                    <div className="text-6xl bg-black/40 p-4 rounded-xl">{item.icon}</div>
                    <div className="flex-1">
                      <div className="text-2xl font-black text-yellow-400 group-hover:text-yellow-300 mb-2">
                        {item.name}
                      </div>
                      <div className="text-base text-gray-300 leading-relaxed">{item.desc}</div>
                      <div className="text-sm text-red-400 font-bold mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        👉 클릭하여 제시하기
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
