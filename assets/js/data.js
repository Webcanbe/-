/* WDMA 대한민국 조정본부 — 자료 계층.
 *
 * 인터페이스 개발용 모의 자료입니다. 고정 시드로 생성되며, 실재하는 보고체계·
 * 사건·능력을 반영하지 않습니다.
 */
(function (global) {
  'use strict';

  var REF = Date.UTC(2026, 7, 6, 10, 0, 0);

  function pad2(n) { return String(n).padStart(2, '0'); }

  /* 일시부호 DDHHMMZ */
  function dtg(hoursAgo) {
    var d = new Date(REF - hoursAgo * 3600000);
    return pad2(d.getUTCDate()) + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + 'Z';
  }

  /* --------------------------------------------------------------------------
   * 협력 국가 및 기관
   *
   * state 는 해당 기관이 소재한 회원국 부호입니다. 회원국 목록에 없는 소재지의
   * 기관은 null 로 두고, 특정 국가에 귀속시키지 않은 채 전지구 지표로 다룹니다.
   * ----------------------------------------------------------------------- */

  var PARTNER_GROUPS = [
    {
      id: 'def', code: 'DEF', short: '국방', title: '국방·군',
      role: '공수 · 공병 · 신속대응', marking: '1급기밀',
      members: [
        { name: '미국 국방부', tag: '미국', state: 'USA' },
        { name: '중국 인민해방군', tag: '중국', state: 'CHN' },
        { name: '러시아 연방군', tag: '러시아', state: 'RUS' },
        { name: '인도군', tag: '인도', state: 'IND' },
        { name: '영국군', tag: '영국', state: 'GBR' },
        { name: '프랑스군', tag: '프랑스', state: 'FRA' },
        { name: '일본 자위대', tag: '일본', state: 'JPN' },
        { name: '대한민국 국군', tag: '대한민국', state: 'KOR' },
        { name: '튀르키예군', tag: '튀르키예', state: 'TUR' },
        { name: '이스라엘군', tag: '이스라엘', state: 'ISR' }
      ]
    },
    {
      id: 'fin', code: 'FIN', short: '금융', title: '금융·통화',
      role: '구호 재원 · 유동성 · 복구 자본', marking: '2급기밀',
      members: [
        { name: '연방준비제도', tag: '미국', state: 'USA' },
        { name: '유럽중앙은행', tag: '유로존', state: null },
        { name: '중국인민은행', tag: '중국', state: 'CHN' },
        { name: '국제통화기금', tag: '다자', state: null },
        { name: '국제결제은행', tag: '다자', state: null },
        { name: '세계은행그룹', tag: '다자', state: null },
        { name: '블랙록', tag: '자산운용', state: 'USA' },
        { name: '뱅가드그룹', tag: '자산운용', state: 'USA' },
        { name: 'JP모건체이스', tag: '은행', state: 'USA' },
        { name: '중국공상은행', tag: '은행', state: 'CHN' }
      ]
    },
    {
      id: 'med', code: 'MED', short: '보건', title: '보건·의료',
      role: '감시 · 야전병원 · 임상 확장', marking: '2급기밀',
      members: [
        { name: '세계보건기구', tag: '다자', state: null },
        { name: '미국 국립보건원', tag: '미국', state: 'USA' },
        { name: '유럽의약품청', tag: '유럽연합', state: null },
        { name: '미국 질병통제예방센터', tag: '미국', state: 'USA' },
        { name: '매사추세츠 종합병원', tag: '미국', state: 'USA' },
        { name: '메이요 클리닉', tag: '미국', state: 'USA' },
        { name: 'UT 사우스웨스턴 메디컬센터', tag: '미국', state: 'USA' },
        { name: '브리검 여성병원', tag: '미국', state: 'USA' },
        { name: '화시병원', tag: '중국', state: 'CHN' },
        { name: '마운트시나이 의료원', tag: '미국', state: 'USA' }
      ]
    },
    {
      id: 'ind', code: 'IND', short: '산업', title: '산업·소재',
      role: '핵심 공급망 · 부품 · 원자재', marking: '3급기밀',
      members: [
        { name: 'TSMC', tag: '반도체', state: null },
        { name: 'ASML', tag: '노광장비', state: null },
        { name: '삼성전자', tag: '대한민국', state: 'KOR' },
        { name: 'SK하이닉스', tag: '대한민국', state: 'KOR' },
        { name: '어플라이드 머티어리얼즈', tag: '미국', state: 'USA' },
        { name: '도쿄일렉트론', tag: '일본', state: 'JPN' },
        { name: '신에쓰화학', tag: '일본', state: 'JPN' },
        { name: 'CATL', tag: '중국', state: 'CHN' },
        { name: 'BASF', tag: '독일', state: 'DEU' },
        { name: '리오틴토', tag: '호주', state: 'AUS' }
      ]
    }
  ];

  PARTNER_GROUPS.forEach(function (g) {
    g.members.forEach(function (m, i) { m.node = g.code + '-' + pad2(i + 1); });
  });

  /* 좌표는 레이더 화면에서 서울 기준 방위·거리를 계산하는 데 씁니다. */
  var MEMBER_STATES = [
    { name: '미국', code: 'USA', lat: 39.8, lon: -98.6 },
    { name: '중국', code: 'CHN', lat: 35.9, lon: 104.2 },
    { name: '러시아', code: 'RUS', lat: 61.5, lon: 105.3 },
    { name: '인도', code: 'IND', lat: 20.6, lon: 79.0 },
    { name: '영국', code: 'GBR', lat: 54.0, lon: -2.0 },
    { name: '프랑스', code: 'FRA', lat: 46.6, lon: 2.2 },
    { name: '독일', code: 'DEU', lat: 51.2, lon: 10.5 },
    { name: '일본', code: 'JPN', lat: 36.2, lon: 138.3 },
    { name: '대한민국', code: 'KOR', lat: 36.5, lon: 127.9 },
    { name: '이탈리아', code: 'ITA', lat: 41.9, lon: 12.6 },
    { name: '튀르키예', code: 'TUR', lat: 39.0, lon: 35.2 },
    { name: '캐나다', code: 'CAN', lat: 56.1, lon: -106.3 },
    { name: '브라질', code: 'BRA', lat: -14.2, lon: -51.9 },
    { name: '사우디아라비아', code: 'SAU', lat: 23.9, lon: 45.1 },
    { name: '이스라엘', code: 'ISR', lat: 31.0, lon: 34.9 },
    { name: '호주', code: 'AUS', lat: -25.3, lon: 133.8 },
    { name: '인도네시아', code: 'IDN', lat: -0.8, lon: 113.9 },
    { name: '이란', code: 'IRN', lat: 32.4, lon: 53.7 },
    { name: '스페인', code: 'ESP', lat: 40.5, lon: -3.7 },
    { name: '파키스탄', code: 'PAK', lat: 30.4, lon: 69.3 }
  ];

  MEMBER_STATES.forEach(function (m, i) { m.node = 'MS-' + pad2(i + 1); });

  /* --------------------------------------------------------------------------
   * 구분
   * ----------------------------------------------------------------------- */

  var REGIONS = [
    '아시아·태평양', '아프리카', '남아시아', '중남미·카리브',
    '유럽', '중동·북아프리카', '북미'
  ];

  var AO_CODE = {
    '아시아·태평양': 'AO-PAC',
    '아프리카': 'AO-AFR',
    '남아시아': 'AO-SAS',
    '중남미·카리브': 'AO-LAC',
    '유럽': 'AO-EUR',
    '중동·북아프리카': 'AO-MNA',
    '북미': 'AO-NAM'
  };

  /* 범주형 1~3번 슬롯 */
  var HAZARDS = [
    { key: 'hydro', label: '수문기상', short: '수문기상', slot: 1 },
    { key: 'geo', label: '지구물리', short: '지구물리', slot: 2 },
    { key: 'bio', label: '생물·보건', short: '생물보건', slot: 3 }
  ];

  /* 전문 우선순위는 상태값이므로 예약된 상태 팔레트를 쓰고, 색만으로 읽히지
     않도록 기호와 낱말을 항상 함께 답니다. */
  var SEVERITIES = [
    { key: 'critical', tier: 'P1', label: '최긴급', token: 'critical', glyph: '▲' },
    { key: 'serious', tier: 'P2', label: '긴급', token: 'serious', glyph: '◆' },
    { key: 'elevated', tier: 'P3', label: '우선', token: 'warning', glyph: '●' },
    { key: 'monitoring', tier: 'P4', label: '통상', token: 'good', glyph: '■' }
  ];

  var MONTHS = [
    '2025.09', '2025.10', '2025.11', '2025.12', '2026.01', '2026.02',
    '2026.03', '2026.04', '2026.05', '2026.06', '2026.07', '2026.08'
  ];

  /* --------------------------------------------------------------------------
   * 결정론적 생성기 — 새로고침해도 수치가 흔들리지 않도록
   * ----------------------------------------------------------------------- */

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var rand = mulberry32(20260806);

  function pick(list) { return list[Math.floor(rand() * list.length)]; }

  /* 월별 보고 건수: monthly[권역][재해구분] = 12개월 */

  var REGION_WEIGHT = [26, 21, 17, 14, 11, 10, 7];
  var HAZARD_WEIGHT = { hydro: 1.0, geo: 0.58, bio: 0.34 };

  var monthly = {};
  REGIONS.forEach(function (region, ri) {
    monthly[region] = {};
    HAZARDS.forEach(function (hazard, hi) {
      var base = REGION_WEIGHT[ri] * HAZARD_WEIGHT[hazard.key];
      monthly[region][hazard.key] = MONTHS.map(function (_, mi) {
        var season = 1 + 0.34 * Math.sin((mi / 12) * Math.PI * 2 + hi * 1.9 + ri * 0.55);
        var drift = 1 + mi * 0.014;
        return Math.max(1, Math.round(base * season * drift * (0.88 + rand() * 0.26)));
      });
    });
  });

  /* 임무 기록 */

  var EVENT_NAMES = {
    hydro: ['태풍', '하천 범람', '돌발 홍수', '폭풍 해일', '가뭄 비상',
      '대형 산불', '극심 폭염', '토석류'],
    geo: ['지진', '화산 분화', '지진해일 경보', '여진 발생', '지반 침하', '사면 붕괴'],
    bio: ['호흡기 집단감염', '콜레라 집단발생', '매개체 감염 급증',
      '식중독 집단발생', '인수공통 전파']
  };

  var PLACES = {
    '아시아·태평양': ['루손 분지', '규슈 연안', '자바 내륙', '메콩 삼각주',
      '술라웨시 해협', '퀸즐랜드 북부', '홋카이도 연안', '보하이 연안'],
    '아프리카': ['사헬 회랑', '아프리카의 뿔', '차드호 유역', '잠베지 계곡',
      '리프트 고원', '니제르 삼각주', '칼라하리 외곽'],
    '남아시아': ['인더스 평원', '갠지스 삼각주', '힌두쿠시', '데칸 고원',
      '브라마푸트라 유역', '신드 저지'],
    '중남미·카리브': ['안데스 산맥', '아마존 유역', '리워드 제도',
      '유카탄 대륙붕', '라플라타 강', '태평양 지협'],
    '유럽': ['포 계곡', '라인 회랑', '에게해 호상', '이베리아 고원',
      '카르파티아 산맥', '북해 연안'],
    '중동·북아프리카': ['아나톨리아 단층', '레반트 회랑', '걸프 연안',
      '나일 삼각주', '마그레브 연안', '자그로스 산맥'],
    '북미': ['캐스캐디아 연변', '멕시코만 연안', '대평원', '시에라 전면',
      '세인트로렌스 유역', '소노란 회랑']
  };

  var CALL_A = ['강철', '창백', '침묵', '파쇄', '북방', '진홍', '화강', '공허',
    '백야', '호박', '흑담', '신속', '고독', '심연', '한랭', '황금',
    '정적', '원거리', '개방', '고공'];
  var CALL_B = ['자오선', '지평', '등불', '모루', '파수', '항구', '폭포', '벡터',
    '보루', '발톱', '나침반', '성벽', '잔불', '문턱', '항해자', '방책',
    '종석', '수호자', '폭풍', '성채'];

  var LEAD_PARTNERS = [
    { name: '미국 국방부', node: 'DEF-01' },
    { name: '중국 인민해방군', node: 'DEF-02' },
    { name: '러시아 연방군', node: 'DEF-03' },
    { name: '인도군', node: 'DEF-04' },
    { name: '영국군', node: 'DEF-05' },
    { name: '프랑스군', node: 'DEF-06' },
    { name: '일본 자위대', node: 'DEF-07' },
    { name: '대한민국 국군', node: 'DEF-08' },
    { name: '튀르키예군', node: 'DEF-09' },
    { name: '이스라엘군', node: 'DEF-10' },
    { name: '세계은행그룹', node: 'FIN-06' },
    { name: '국제통화기금', node: 'FIN-04' },
    { name: '세계보건기구', node: 'MED-01' },
    { name: '미국 질병통제예방센터', node: 'MED-04' }
  ];

  var PHASES = ['시행', '전개', '평가', '유지', '복구'];

  var SEVERITY_MIX = ['critical', 'serious', 'serious', 'elevated', 'elevated',
    'elevated', 'monitoring', 'monitoring', 'monitoring', 'monitoring'];

  var GRID_BAND = 'CDEFGHJKLMNPQRSTUVWX';
  var GRID_SQ = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

  function gridRef() {
    return Math.floor(1 + rand() * 60) +
      GRID_BAND.charAt(Math.floor(rand() * GRID_BAND.length)) +
      GRID_SQ.charAt(Math.floor(rand() * GRID_SQ.length)) +
      GRID_SQ.charAt(Math.floor(rand() * GRID_SQ.length)) + ' ' +
      String(Math.floor(rand() * 10000)).padStart(4, '0') + ' ' +
      String(Math.floor(rand() * 10000)).padStart(4, '0');
  }

  /* 임무를 30일 구간에 완만한 감소 곡선으로 배분해, 구간 대비 증감이 표본
     잡음이 아니라 처리량으로 읽히게 합니다. */
  var TASK_COUNT = 320;
  var AGE_BUCKETS = (function () {
    var periods = 11, weights = [], total = 0, out = [], b, k;
    for (b = 0; b < periods; b += 1) { weights.push(Math.pow(0.93, b)); total += weights[b]; }
    for (b = 0; b < periods; b += 1) {
      var n = Math.round((TASK_COUNT * weights[b]) / total);
      for (k = 0; k < n; k += 1) out.push(b);
    }
    while (out.length < TASK_COUNT) out.push(0);
    out.length = TASK_COUNT;
    return out;
  })();

  var incidents = [];
  for (var i = 0; i < TASK_COUNT; i += 1) {
    var region = REGIONS[Math.floor(Math.pow(rand(), 1.35) * REGIONS.length)];
    var hazard = HAZARDS[Math.floor(Math.pow(rand(), 1.25) * HAZARDS.length)];
    var severity = SEVERITY_MIX[Math.floor(rand() * SEVERITY_MIX.length)];
    var ageDays = AGE_BUCKETS[i] * 30 + Math.floor(rand() * 30);
    var scale = severity === 'critical' ? 9.2 : severity === 'serious' ? 4.1
      : severity === 'elevated' ? 1.7 : 0.6;
    var affected = Math.round((0.35 + rand() * 1.9) * scale * 100000);
    var actBand = severity === 'critical' ? [1, 6] : severity === 'serious' ? [3, 13]
      : severity === 'elevated' ? [6, 30] : [14, 76];
    var updatedHours = Math.max(1, Math.floor(rand() * 40));
    var lead = pick(LEAD_PARTNERS);

    incidents.push({
      id: 'WDMA-26-' + String(1000 + i * 7 + Math.floor(rand() * 6)),
      callsign: pick(CALL_A) + ' ' + pick(CALL_B),
      event: pick(EVENT_NAMES[hazard.key]) + ' — ' + pick(PLACES[region]),
      hazard: hazard.key,
      region: region,
      ao: AO_CODE[region],
      grid: gridRef(),
      severity: severity,
      affected: affected,
      assets: Math.max(1, Math.round(scale * (1.4 + rand() * 2.6))),
      fundingM: Math.round((affected / 1e6) * (55 + rand() * 90) * 10) / 10,
      activationH: Math.round((actBand[0] + rand() * (actBand[1] - actBand[0])) * 10) / 10,
      lead: lead.name,
      leadNode: lead.node,
      phase: severity === 'monitoring' ? pick(['평가', '복구', '유지']) : pick(PHASES),
      ageDays: ageDays,
      updatedHours: updatedHours,
      lastRpt: dtg(updatedHours)
    });
  }

  incidents.sort(function (a, b) {
    var order = { critical: 0, serious: 1, elevated: 2, monitoring: 3 };
    if (order[a.severity] !== order[b.severity]) {
      return order[a.severity] - order[b.severity];
    }
    return b.affected - a.affected;
  });

  /* 전력 대비태세 */

  var CAPACITY = [
    { code: 'USAR', label: '도시탐색구조대', committed: 412, total: 560, unit: '개 팀' },
    { code: 'MEDF', label: '야전병원·확장병상', committed: 268, total: 430, unit: '개소' },
    { code: 'ALFT', label: '전략공수', committed: 1180, total: 1340, unit: '소티/주' },
    { code: 'STOK', label: '비상비축 소진율', committed: 46, total: 100, unit: '% 예비' },
    { code: 'COMM', label: '위성·통신중계', committed: 74, total: 128, unit: '개 중계' }
  ];

  var POSTURE = [
    { code: 'LNO', label: '연락반 배치', value: '40 / 40' },
    { code: 'RPT', label: '회원국 보고', value: '20 / 20' },
    { code: 'ALA', label: '상시 공수협정', value: '14' },
    { code: 'PPS', label: '사전배치 비축기지', value: '62' },
    { code: 'CFF', label: '우발재원 창구', value: '9' },
    { code: 'EXR', label: '분기 합동훈련', value: '7' }
  ];

  /* 회선 상태 기준값 (왕복지연은 화면에서 미세 변동) */

  var LINK = {
    channel: 'SATCOM-3 / TACSAT-KU',
    cipher: 'AES-256-GCM',
    kex: 'X25519MLKEM768',
    mac: 'SHA-384',
    fingerprint: '8F:2C:A1:6D:04:B7:E9:53',
    rttBase: 42,
    rekeySeconds: 8 * 60 + 41,
    tempest: '1등급 구역',
    terminal: 'KOR-S04',
    operator: 'WDMA-KOR/J3-당직-04'
  };

  global.WDMA_DATA = {
    partnerGroups: PARTNER_GROUPS,
    memberStates: MEMBER_STATES,
    regions: REGIONS,
    aoCode: AO_CODE,
    hazards: HAZARDS,
    severities: SEVERITIES,
    months: MONTHS,
    monthly: monthly,
    incidents: incidents,
    capacity: CAPACITY,
    posture: POSTURE,
    link: LINK
  };
})(window);
