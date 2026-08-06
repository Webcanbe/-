/* WDMA 전지구 작전 지휘부 — 상황 전개 자료.
 *
 * 가상 시나리오 자료입니다. 실재하는 병원체·사건·조직·능력을 기술하지 않으며,
 * 모든 문자열은 인터페이스 개발용 연출 텍스트입니다.
 */
(function (global) {
  'use strict';

  /* 이동 경로 그래프. 전파는 이 간선을 따라 걷기 때문에 확산이 무작위가 아니라
     지리적으로 읽힙니다. */
  var LINKS = {
    USA: ['CAN', 'GBR', 'JPN', 'KOR', 'BRA', 'DEU'],
    CAN: ['USA', 'GBR'],
    GBR: ['USA', 'CAN', 'FRA', 'DEU', 'ESP'],
    FRA: ['GBR', 'DEU', 'ESP', 'ITA', 'TUR'],
    DEU: ['FRA', 'GBR', 'ITA', 'RUS', 'ESP'],
    ESP: ['FRA', 'GBR', 'ITA', 'BRA'],
    ITA: ['FRA', 'DEU', 'ESP', 'TUR'],
    RUS: ['DEU', 'CHN', 'TUR', 'IRN'],
    TUR: ['ITA', 'FRA', 'RUS', 'IRN', 'SAU'],
    SAU: ['TUR', 'IRN', 'IND', 'ISR'],
    ISR: ['SAU', 'TUR', 'IND'],
    IRN: ['TUR', 'RUS', 'PAK', 'SAU'],
    PAK: ['IRN', 'IND', 'CHN'],
    IND: ['PAK', 'CHN', 'SAU', 'IDN'],
    CHN: ['RUS', 'IND', 'KOR', 'JPN', 'PAK'],
    KOR: ['CHN', 'JPN', 'USA'],
    JPN: ['KOR', 'CHN', 'USA', 'AUS'],
    IDN: ['IND', 'AUS', 'CHN'],
    AUS: ['IDN', 'JPN', 'USA'],
    BRA: ['USA', 'ESP']
  };

  /* 점령 단계. 모든 단계는 색 외에 기호와 낱말을 함께 답니다. */
  var LEVELS = [
    { at: 0, key: 'secure', label: '통제', token: 'good', glyph: '■' },
    { at: 8, key: 'elevated', label: '주의', token: 'warning', glyph: '●' },
    { at: 28, key: 'contested', label: '교전', token: 'serious', glyph: '◆' },
    { at: 55, key: 'overrun', label: '붕괴', token: 'critical', glyph: '▲' },
    { at: 88, key: 'dark', label: '두절', token: 'dark', glyph: '×' }
  ];

  /* 수신 전문. 보고국의 점령 단계별로 구분합니다. */
  var SIGNALS = {
    secure: [
      '전 입국장 검역 3단계 격상',
      '예비 병력 동원령 발령 — 접촉 보고 없음',
      '국가 비축물자 민간 당국 이관 개시',
      '선별 검사 가동 — 양성 0건',
      '연락장교 파견 요청 — 예방적 조치',
      '국경 통제선 설정 완료',
      '민방위 경보체계 시험 가동',
      '주요 기반시설 경비 병력 증강',
      '항공 입국자 전수 추적 개시',
      '지휘소 24시간 비상근무 전환',
      '해안 감시 레이더 가동률 100%',
      '의료진 비상소집 대기 발령'
    ],
    elevated: [
      '최초 확진 — 격리 저지선 설치',
      '민간 항공 운항 전면 중단',
      '병원 수용률 80% — 확장 계획 발동',
      '군 병력 국내 치안 임무 투입',
      '긴급 의료 공수 요청 — 최우선',
      '주요 도시 통행금지 발령',
      '예비 병상 전량 개방',
      '국가 재난 사태 선포',
      '접촉자 추적 체계 과부하',
      '지방 행정망 부분 마비',
      '항만 하역 작업 전면 중단',
      '국가 비축 의약품 절반 소진'
    ],
    contested: [
      '저지선 3개 구역 돌파 — 후퇴 중',
      '민간 당국 긴급 소개 지원 요청',
      '병원 기능 마비 — 델타 분류 적용',
      '전력망 불안정 — 순환 정전 확대',
      '국가 지휘소 대체 시설로 이전',
      '주요 항만 통제 상실',
      '군 통신 중계소 다수 침묵',
      '식수 공급망 손상 보고',
      '도심 구역 방어선 재편',
      '민간인 대피 행렬 통제 불가',
      '연료 저장시설 방어 병력 부족',
      '내륙 철도망 운행 전면 중지'
    ],
    overrun: [
      '주둔지 돌파 — 생존 병력 경계호로 철수',
      '수도 상실 — 정부 연속성 시설 가동',
      '지휘망 손상 — 간헐 송신만 가능',
      '최종 비행장 폐쇄 — 추가 소개 불가',
      '어느 국가든 지원 요망 — 우선순위 무관',
      '잔여 병력 탄약 고갈',
      '지하 시설 봉쇄 진행',
      '국가 지휘권 승계 불명',
      '최후 방어선 붕괴 임박',
      '송신 장비 자력 발전으로 전환',
      '생존자 집결지 좌표 송신 중',
      '외곽 감시선 전 구역 접촉'
    ],
    dark: [
      '이후 송신 없음',
      '국 침묵 — 반송파 소실',
      '자동 비컨만 수신 — 운용자 응답 없음',
      '최종 송신이 문장 중간에 끊김',
      '회선 사멸',
      '무응답 — 12시간 경과',
      '좌표만 반복 송신',
      '수신 불가'
    ]
  };


  /* 협력기관 수신 전문. 소재국 상황에 따라 평시/악화 문안이 갈립니다. */
  var ORG_SIGNALS = {
    def: {
      ok: [
        '신속대응단 출항 준비 완료 — 명령 대기',
        '공수 항공기 정비 완료 — 12대 즉응 대기',
        '공병 자재 적재 개시 — 차단선 구축분',
        '예비 병력 소집률 92% — 편성 완료',
        '화생방 제독 장비 전방 전개 완료',
        '수송 선단 항로 확보 — 호송 편성',
        '야전 지휘소 이중화 완료',
        '연합 지휘 절차 숙달 훈련 종료'
      ],
      bad: [
        '전방 초소 접촉 — 교전 중',
        '지휘소 이전 진행 — 통신 간헐',
        '병참선 차단 — 공중보급 요청',
        '잔여 탄약 30% 미만 — 재보급 시급',
        '병력 손실 누적 — 편제 재조정',
        '비행장 활주로 손상 — 이착륙 제한'
      ]
    },
    fin: {
      ok: [
        '긴급 구호 재원 승인 — 즉시 집행',
        '유동성 공급 창구 개설 — 무제한 한도',
        '결제망 이중화 완료 — 예비 회선 대기',
        '재보험 한도 상향 조정',
        '구호 채권 발행 완료 — 전액 소화',
        '회원국 통화 스와프 확대'
      ],
      bad: [
        '청산 지연 발생 — 수동 처리 전환',
        '시장 서킷브레이커 발동',
        '결제 잔고 확인 불가 — 대사 중단',
        '외환 거래 창구 폐쇄',
        '지급 준비 자산 이전 불가'
      ]
    },
    med: {
      ok: [
        '유전체 분석 결과 공유 — 계통 미상',
        '항체 후보 3종 선별 — 교차시험 착수',
        '임상 검체 수송 요청 — 냉장 유지',
        '야전병원 4개소 전개 완료',
        '대응제 후보 동물시험 착수',
        '감시망 표본 채취 확대 — 일 12만건',
        '중환자 병상 확장 완료'
      ],
      bad: [
        '임상 자료 수신 불가 — 회선 사멸',
        '검체 냉장망 붕괴 — 표본 손실',
        '의료진 감염률 급증 — 교대 불가',
        '병원 전력 상실 — 비상 발전 한계',
        '분석 장비 가동 중단'
      ]
    },
    ind: {
      ok: [
        '공정 라인 비상 전환 완료',
        '원자재 재고 8주분 확보',
        '대체 물류 경로 확보 — 항공 우선',
        '생산 우선순위 의료장비로 조정',
        '예비 부품 공동 비축 개시',
        '공급망 이중화 점검 완료'
      ],
      bad: [
        '공장 가동 중단 — 인력 이탈',
        '원자재 수송 경로 차단',
        '장비 보충 불가 판정',
        '전력 공급 중단 — 라인 정지',
        '재고 소진 — 대체재 없음'
      ]
    }
  };


  /* 대국민 재난문자 등급. 실제 운영 체계의 3단계 구분을 따릅니다. */
  var ALERT_CLASSES = [
    {
      id: 'critical', label: '위급재난문자', en: 'Emergency Alert',
      token: 'critical', rank: 3, reach: '수신 거부 불가 · 최대 경보음',
      krTail: '즉시 대피하고 당국 지시에 따르십시오.',
      enTail: 'Take shelter immediately and follow official instructions.'
    },
    {
      id: 'urgent', label: '긴급재난문자', en: 'Urgent Alert',
      token: 'serious', rank: 2, reach: '수신 거부 가능 · 경보음',
      krTail: '외출을 자제하고 안전에 유의하십시오.',
      enTail: 'Avoid travel and stay alert for further updates.'
    },
    {
      id: 'advisory', label: '안전안내문자', en: 'Safety Advisory',
      token: 'warning', rank: 1, reach: '수신 거부 가능 · 알림음',
      krTail: '관련 정보를 확인하시기 바랍니다.',
      enTail: 'Please review the official guidance.'
    }
  ];

  var ALERT_LANGS = [
    { id: 'kr', label: '한국어', short: 'KR' },
    { id: 'en', label: 'English', short: 'EN' },
    { id: 'both', label: '한국어 + English', short: 'KR+EN' }
  ];

  var ALERT_SENDER = { kr: '중앙재난안전대책본부', en: 'NEDCH KOREA' };

  /* 전면 경고. 전지구 감염률이 각 문턱을 넘을 때 순서대로 발령됩니다. */
  var BULLETINS = [
    {
      at: 0, tag: '긴급',
      title: '생물학적 사건 발생', en: 'An unidentified biological event has been confirmed in North America.',
      lines: [
        '미확인 병원체 — 북미 — 다수 사상자 보고',
        '사망자 재활성 현상 확인',
        '전 파트너 노드 전시 보고태세로 전환'
      ]
    },
    { at: 4, tag: '긴급', title: '병원체 분류 불가', en: 'The pathogen does not match any known family.', lines: ['기존 어떤 계통과도 일치하지 않음', '표준 격리 절차 무효'] },
    { at: 8, tag: '긴급', title: '민간 통신망 전면 두절', en: 'Civilian telephone and mobile networks are down.', lines: ['유선·이동통신 6개 권역 완전 상실', '군 전용 회선은 정상 유지'] },
    { at: 12, tag: '긴급', title: '북미 항공 운항 전면 중단', en: 'All air traffic over North America has been suspended.', lines: ['전 공항 폐쇄 — 잔류 항공기 지상 대기', '대륙 간 소개 경로 소실'] },
    { at: 16, tag: '긴급', title: '국제 데이터 백본 손실', en: 'The global data backbone is degraded; traffic is on satellite fallback.', lines: ['대양 횡단 회선 패킷 손실 62%', '위성 협대역으로 강제 우회'] },
    { at: 20, tag: '긴급', title: '유럽 6개국 국경 폐쇄', en: 'Six European states have closed their borders.', lines: ['육상 통행 전면 차단', '역내 조정 체계 기능 저하'] },
    { at: 24, tag: '긴급', title: '광역 정전 발생', en: 'A wide-area power outage is affecting three continents.', lines: ['3개 대륙 주요 전력망 동시 정지', '병원·정수장 비상 발전 전환'] },
    { at: 28, tag: '긴급', title: '대한민국 국군 지휘망 두절', en: 'The Republic of Korea Armed Forces command network is down.', lines: ['노드 DEF-08 — 11분간 무응답', '최종 보고: 전 전방 초소 접촉'] },
    { at: 32, tag: '긴급', title: '위성 통신 성좌 기능 정지', en: 'The satellite communications constellation has failed.', lines: ['6기 중 4기 무응답 — 지상국 상실', '유럽 노드는 전술위성만 사용'] },
    { at: 36, tag: '긴급', title: '중국 인민해방군 — 응답 없음', en: 'The People\u2019s Liberation Army node is not responding.', lines: ['노드 DEF-02 회선 사멸', '동아시아 조정 경로 단절'] },
    { at: 40, tag: '긴급', title: '금융 결제 시스템 정지', en: 'Financial settlement systems have halted.', lines: ['전 금융 노드 중단 — 청산 능력 소멸', '구호 재원은 상비 예비분으로만 집행'] },
    { at: 44, tag: '긴급', title: '미국 국방부 노드 — 회선 사멸', en: 'The United States Department of Defense circuit is dead.', lines: ['노드 DEF-01 무응답', '지휘 연속성이 본 지휘부로 이관'] },
    { at: 48, tag: '긴급', title: '러시아 연방군 지휘소 이전 실패', en: 'Russian Armed Forces failed to relocate their command post.', lines: ['대체 시설 도달 전 접촉', '북방 축선 통제 상실'] },
    { at: 52, tag: '긴급', title: '인도 아대륙 광역 통제 상실', en: 'Wide-area control has been lost across the Indian subcontinent.', lines: ['3개국 동시 저지선 붕괴', '10억 인구 권역 보고 중단'] },
    { at: 56, tag: '긴급', title: '의료 파트너 전 노드 응답 중단', en: 'All medical partner nodes have stopped responding.', lines: ['MED 계열 10개 기관 회선 사멸', '임상 자료 수신 불가'] },
    { at: 60, tag: '긴급', title: '해저 케이블 다중 절단', en: 'Multiple submarine cables have been severed.', lines: ['대양 횡단 회선 11개 동시 상실', '잔여 대역폭 3% 미만'] },
    { at: 64, tag: '긴급', title: '반도체 공급망 붕괴', en: 'The semiconductor supply chain has collapsed.', lines: ['IND 계열 전 노드 가동 중단', '장비 보충 불가 판정'] },
    { at: 68, tag: '긴급', title: '국제 조정 기구 소집 불가', en: 'International coordinating bodies can no longer convene.', lines: ['정족수 미달 — 의결 불능', '각국 지휘권 개별 행사로 전환'] },
    { at: 72, tag: '긴급', title: '대륙 지휘체계 붕괴 진행', en: 'Continental command structures are collapsing.', en: 'People\u2019s Liberation Army node is not responding.', lines: ['보고 중인 국가 지휘소 급감', '광역 조정 사실상 중단'] },
    { at: 76, tag: '긴급', title: '생존 지휘소 6개소 미만', en: 'Fewer than six national command posts remain.', lines: ['잔존 국가 통제 구역 산발적', '상호 연락 두절 상태'] },
    { at: 80, tag: '긴급', title: '본 단말이 최종 조정 노드로 지정됨', en: 'This terminal has been designated the final coordination node.', lines: ['상급 지휘 계통 존재하지 않음', '이후 모든 판단은 본 단말에서 수행'] },
    { at: 84, tag: '긴급', title: '외곽 감시선 접촉 증가', en: 'Contact reports around the outer perimeter are increasing.', lines: ['본 시설 주변 대량 반응 탐지', '경계 병력 최종 배치 완료'] },
    { at: 2, tag: '긴급', title: '초기 보고 급증 — 접수 폭주', en: 'Emergency reporting has surged far beyond system capacity.', lines: ['북미 3개 주에서 동시 다발 신고', '응급 회선 통화량 평시 대비 47배', '현장 구급대 12개 팀 연락 두절'] },
    { at: 6, tag: '긴급', title: '감염 경로 특정 실패', en: 'The transmission route could not be identified.', lines: ['접촉자 추적 표본 4,200건 분석 완료', '단일 발원 지점 확인 불가', '공기 전파 가능성 배제 못함'] },
    { at: 10, tag: '긴급', title: '북미 응급의료 체계 포화', en: 'Emergency medical capacity is exceeded across North America.', lines: ['권역 외상센터 전량 수용 한계 초과', '구급 이송 평균 대기 6시간 40분', '민간 이송 자원 전면 징발'] },
    { at: 14, tag: '긴급', title: '대양 횡단 여객 운송 중단', en: 'Transoceanic passenger transport has been halted.', lines: ['태평양·대서양 노선 전편 취소', '해상 여객 항로 동반 중단', '귀국 미이행 국민 약 84만명'] },
    { at: 18, tag: '긴급', title: '유럽 역내 지휘 조정 지연', en: 'Regional command coordination in Europe is being delayed.', lines: ['다국적 조정 회의 3회 연속 정족수 미달', '역내 공수 자산 배분 합의 실패', '개별 국가 판단으로 전환'] },
    { at: 22, tag: '긴급', title: '식량 공급망 경보', en: 'A food supply chain warning has been issued for major export ports.', lines: ['주요 곡물 수출항 4개소 폐쇄', '내륙 수송 차량 기사 이탈률 38%', '비축 식량 배급제 검토 착수'] },
    { at: 26, tag: '긴급', title: '남아시아 대규모 인구 이동', en: 'Large-scale population movement is under way in South Asia.', lines: ['국경 지대 집결 인원 추정 210만명', '검역 통제 사실상 불가', '수인성 질환 동시 발생 우려'] },
    { at: 30, tag: '긴급', title: '동아시아 항만 기능 정지', en: 'East Asian port operations have stopped.', lines: ['컨테이너 처리량 평시 대비 6%', '의료 물자 하역 우선권 발동', '선박 대기 열 138척'] },
    { at: 34, tag: '긴급', title: '중동 정유·수송 중단', en: 'Refining and fuel transport in the Middle East have been suspended.', lines: ['주요 정유시설 3개소 가동 중지', '항공유 재고 11일분', '공수 작전 지속 시간 제한'] },
    { at: 38, tag: '긴급', title: '남미 통신 중계 상실', en: 'Communication relays across South America have been lost.', lines: ['대륙 횡단 중계소 9개소 무응답', '위성 협대역만 잔존', '보고 주기 6시간으로 연장'] },
    { at: 42, tag: '긴급', title: '아프리카 보건 감시망 붕괴', en: 'The health surveillance network across Africa has collapsed.', lines: ['표본 감시 지점 62개소 중 11개소만 응답', '실제 발생 규모 추정 불가', '최악 가정으로 계획 수립'] },
    { at: 46, tag: '긴급', title: '오세아니아 검역선 돌파', en: 'The maritime quarantine line in Oceania has been breached.', lines: ['해상 검역 저지선 2개 구역 통과', '도서 지역 순차 감염 확인', '고립 대피 계획 발동'] },
    { at: 50, tag: '긴급', title: '국제 구호 재원 고갈 임박', en: 'International relief funding is close to exhaustion.', lines: ['우발재원 9개 창구 중 6개 소진', '추가 출연 합의 불발', '상비 예비분으로만 집행 전환'] },
    { at: 54, tag: '긴급', title: '핵심 인력 손실 누적', en: 'Losses among critical personnel are accumulating.', lines: ['연합 의료진 사상 누계 보고 지연', '연구 인력 교대 불가 — 24시간 연속 근무', '지휘 요원 예비 계통 가동'] },
    { at: 58, tag: '긴급', title: '전력 공급 광역 붕괴', en: 'Wide-area power grid collapse has been confirmed.', lines: ['3개 대륙 기간 계통 분리', '비상 발전 연료 잔량 평균 9일', '데이터센터 순차 정지'] },
    { at: 62, tag: '긴급', title: '군수 보급선 절단', en: 'Military supply lines have been cut.', lines: ['주요 보급 항로 5개 중 4개 차단', '공중보급으로만 유지', '전개 부대 지속 능력 급감'] },
    { at: 66, tag: '긴급', title: '민간 항공 자산 전량 상실', en: 'Civil aviation assets have been almost entirely lost.', lines: ['가용 대형 수송기 18대 → 4대', '대륙 간 인력 전개 사실상 불가', '해상 수단으로 전환'] },
    { at: 70, tag: '긴급', title: '국가 지휘권 승계 불명 다수', en: 'Chain of command is unresolved in several states.', lines: ['4개국 지휘 계통 확인 불가', '연합 명령 수령 주체 부재', '개별 잔존 부대와 직접 교신 시도'] },
    { at: 74, tag: '긴급', title: '연합 조정 회선 이중화 실패', en: 'Coalition coordination circuits failed to fail over.', lines: ['예비 회선 3개 중 3개 사멸', '단일 위성 링크로만 유지', '지연 시간 4분 초과'] },
    { at: 78, tag: '긴급', title: '잔존 통제 구역 산발화', en: 'Remaining controlled zones are no longer contiguous.', lines: ['연속된 통제 구역 존재하지 않음', '고립 거점 단위 방어로 전환', '상호 지원 불가'] },
    { at: 82, tag: '긴급', title: '본 시설 외곽 감시 자산 손실', en: 'Perimeter surveillance assets around this facility have been lost.', lines: ['외곽 감시 초소 7개소 중 5개소 무응답', '접근 탐지 범위 1,000미터로 축소', '경계 병력 최종선 배치'] },
    { at: 86, tag: '긴급', title: '최종 경계선 접촉 개시', en: 'Contact has begun at the final perimeter line.', lines: ['본 시설 반경 내 다중 접촉 확인', '외곽 차단문 폐쇄 완료', '기록 보존 절차 준비'] },
    { at: 90, tag: '긴급', title: '지휘 기능 유지 한계', en: 'Command capability has reached its operating limit.', lines: ['잔여 통신 자산 단일 회선', '전력 예비 4시간 미만', '보존 절차 즉시 개시 판단'] }
  ];

  /* 발령 순서가 문턱 순서와 같도록 정렬합니다. */
  BULLETINS.sort(function (a, b) { return a.at - b.at; });

  /* 파견 명령. 지휘부가 상황에 따라 자동으로 발령합니다. */
  var ORDERS = [
    { id: 'vaccine', name: '연구단 증원', cost: 26, cooldown: 6, brief: '대응제 개발 자원 집중' },
    { id: 'airlift', name: '신속대응단 파견', cost: 16, cooldown: 4, brief: '최우선 권역 의료·구조 전개' },
    { id: 'cordon', name: '봉쇄선 설정', cost: 18, cooldown: 6, brief: '국제 이동 통제선 구축' },
    { id: 'isolate', name: '통신중계 복구', cost: 12, cooldown: 5, brief: '군 전용 회선 우회 개통' },
    { id: 'martial', name: '광역 통제 발령', cost: 22, cooldown: 8, brief: '전 지역 강제 통제' }
  ];

  /* 파견 부대. 명령 종류별로 편성이 다릅니다. */
  var UNITS = {
    airlift: [
      { name: '제7 신속대응단', size: '병력 2,400명 · 수송기 12대' },
      { name: '제11 공정여단', size: '병력 3,100명 · 회전익 24대' },
      { name: '제3 의무지원단', size: '야전병원 4개소 · 의료진 860명' },
      { name: '제4 방역지원단', size: '제독차 60대 · 인원 1,200명' },
      { name: '제9 수송비행단', size: '대형수송기 18대' }
    ],
    cordon: [
      { name: '제5 공병단', size: '차단선 장비 · 인원 1,700명' },
      { name: '제2 화생방대대', size: '제독소 8개소 · 인원 640명' },
      { name: '해상차단 전대', size: '함정 9척' }
    ],
    isolate: [
      { name: '제1 통신지원단', size: '이동중계소 22기' },
      { name: '위성지상국 파견대', size: '이동 지상국 6기' }
    ],
    vaccine: [
      { name: '통합연구단', size: '연구인력 940명 · 생산라인 5개' },
      { name: '검체수송 편대', size: '수송기 6대' }
    ],
    martial: [
      { name: '수도방위 통합기동대', size: '병력 5,200명' },
      { name: '광역 치안기동단', size: '병력 4,400명' }
    ]
  };

  var DEPLOY_STATES = ['전개중', '임무중', '복귀'];

  var DEFEAT = [
    { t: 0, text: '전지구 봉쇄 실패', sub: '잔존 국가 지휘체계 없음' },
    { t: 2600, text: '접촉 — 본 단말 반경 1,000미터', sub: '외곽 감지선 대량 반응' },
    { t: 5000, text: '외곽 출입문 돌파', sub: '반경 1,000미터 · 4구역 · 7구역' },
    { t: 7200, text: '방폭문 03 돌파', sub: '반경 420미터' },
    { t: 9200, text: '방폭문 02 돌파', sub: '반경 180미터' },
    { t: 11200, text: '방폭문 01 돌파', sub: '반경 40미터 · 단말층' },
    { t: 13400, text: '최종 데이터 보존 단계 진입', sub: '강화 저장소로 기록 중', archive: true },
    { t: 22000, text: '기록 봉인 완료', sub: '이후 조작 입력을 받지 않음' },
    { t: 25000, text: '단말 폐쇄', sub: '대한민국 조정본부 — 송신 종료', final: true }
  ];

  /* 복구 절차 50단계. 배너와 진행 화면을 차례로 지나갑니다. */
  var RECOVERY = [
    { t: '병원체 억제 확인', d: '전 보고국 전파율 1.0 미만 · 72시간 연속' },
    { t: '대응제 생산라인 전환', d: '5개 라인 최대 가동 · 일 240만 도즈' },
    { t: '대응제 1차 배포', d: '최우선 12개국 · 항공 수송 개시' },
    { t: '대응제 2차 배포', d: '전 회원국 20개국 배분 완료' },
    { t: '신규 발생 정지 확인', d: '72시간 신규 보고 0건' },
    { t: '군 통신망 자가진단', d: '전 회선 무결성 검사 통과' },
    { t: '군 통신망 복구', d: '전 지휘소 응답 · 지연 42ms' },
    { t: '위성 지상국 재기동', d: '4개소 전원 투입 · 추적 정렬' },
    { t: '위성 성좌 궤도 재정렬', d: '6기 전량 응답 · 링크 확립' },
    { t: '해저 케이블 우회 개통', d: '대양 횡단 7개 회선 임시 절체' },
    { t: '해저 케이블 본선 복구', d: '11개 회선 전량 · 수리선 철수' },
    { t: '국제 데이터 백본 복구', d: '패킷 손실 0.4% · 대역폭 정상' },
    { t: '민간 유선망 재기동', d: '교환국 순차 투입 · 1,240국' },
    { t: '민간 이동통신 복구', d: '기지국 12,480국 재개통' },
    { t: '공공 경보체계 복구', d: '전국 송출 시험 정상' },
    { t: '전력망 주파수 동기화', d: '3개 대륙 계통 재병입' },
    { t: '광역 정전 해소', d: '순환 정전 종료 · 수요 정상' },
    { t: '상수도 정상화', d: '정수장 가동률 100% · 수질 적합' },
    { t: '의료 체계 정상화', d: '병원 수용률 평시 수준 회복' },
    { t: '야전병원 철수', d: '4개소 임무 종료 · 장비 회수' },
    { t: '국내 방역선 해제', d: '통제선 순차 해제 · 검문 종료' },
    { t: '국제 항공 화물 재개', d: '의료 물자 우선 배정' },
    { t: '국제 항공 여객 재개', d: '주요 노선 단계적 운항' },
    { t: '항만 하역 재개', d: '주요 항만 12개소 정상화' },
    { t: '내륙 철도 운행 재개', d: '전 노선 · 여객 화물 동시' },
    { t: '국경 통제 완화', d: '육상 통행 재개 · 검역 2단계' },
    { t: '계엄 해제 절차 개시', d: '민정 이양 준비 · 권한 인수인계' },
    { t: '민정 이양 완료', d: '치안 민간 이관 · 병력 복귀' },
    { t: '금융 결제망 재기동', d: '청산 능력 복원 · 대사 완료' },
    { t: '국제 송금 재개', d: 'FIN 계열 노드 순차 복구' },
    { t: '시장 거래 재개', d: '단계적 개장 · 변동 제한 유지' },
    { t: '공급망 재가동', d: 'IND 계열 노드 순차 복구' },
    { t: '반도체 생산 재개', d: '주요 3개사 라인 정상 가동' },
    { t: '원자재 수송 재개', d: '광물 항로 정상 · 재고 보충' },
    { t: '노드 DEF 계열 복구', d: '국방·군 10 / 10 응답' },
    { t: '노드 FIN 계열 복구', d: '금융·통화 10 / 10 응답' },
    { t: '노드 MED 계열 복구', d: '보건·의료 10 / 10 응답' },
    { t: '노드 IND 계열 복구', d: '산업·소재 10 / 10 응답' },
    { t: '회원국 보고 재개', d: '20 / 20 정시 보고 확인' },
    { t: '연락반 재배치', d: '40개소 전량 배치 완료' },
    { t: '파견 부대 복귀', d: '전 부대 원대복귀 · 제독 완료' },
    { t: '사상자 집계 확정', d: '최종 보고서 작성 · 유가족 통보' },
    { t: '비축물자 재보충', d: '국가 비축 90% 회복' },
    { t: '상시 공수협정 갱신', d: '14개 협정 재확인' },
    { t: '사전배치 비축기지 점검', d: '62개소 전수 점검 완료' },
    { t: '우발재원 정산', d: '9개 창구 잔액 확정' },
    { t: '작전 기록 보존', d: '기록 봉인 · 취급구분 유지' },
    { t: '지휘 계통 정상화', d: '상급 계통 복귀 · 권한 반납' },
    { t: '작전태세 하향', d: '최고단계 → 2단계' },
    { t: '대한민국 조정본부 — 통상 근무 복귀', d: '전 화면 복원 · 상황 종료' }
  ];

  var VICTORY = [
    { t: 0, text: '병원체 억제', sub: '전 보고국 전파율 1.0 미만' },
    { t: 2800, text: '민간 통신망 복구', sub: '유선·이동통신 재개' },
    { t: 5400, text: '국제 데이터 백본 복구', sub: '대양 횡단 회선 정상 · 손실률 0.4%' },
    { t: 8000, text: '대한민국 국군 지휘망 복구', sub: '노드 DEF-08 응답 · 방어선 유지' },
    { t: 10600, text: '위성 통신 성좌 정상', sub: '6기 전량 응답' },
    { t: 13200, text: '연합 노드 40 / 40 응답', sub: '전 협력기관 보고 재개' },
    { t: 16000, text: '대한민국 조정본부 복구', sub: '통상 근무로 복귀', final: true }
  ];

  global.WDMA_SCENARIO = {
    links: LINKS,
    levels: LEVELS,
    signals: SIGNALS,
    orgSignals: ORG_SIGNALS,
    alertClasses: ALERT_CLASSES,
    alertLangs: ALERT_LANGS,
    alertSender: ALERT_SENDER,
    bulletins: BULLETINS,
    orders: ORDERS,
    units: UNITS,
    deployStates: DEPLOY_STATES,
    defeat: DEFEAT,
    recovery: RECOVERY,
    victory: VICTORY
  };
})(window);
