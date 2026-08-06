/* WDMA GLOBAL OPERATIONS COMMAND — exercise scenario content.
 *
 * EXERCISE ONLY. This drives a fictional biological-outbreak drill built for
 * interface work. Nothing here describes a real pathogen, event, capability or
 * organization, and every string is scenario prop text.
 */
(function (global) {
  'use strict';

  /* Travel/adjacency graph across the member states. The contagion walks these
     edges, so spread reads as geography rather than a random sprinkle. */
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

  /* Containment ladder. Every state pairs a glyph and a word with its colour. */
  var LEVELS = [
    { at: 0, key: 'secure', label: 'SECURE', token: 'good', glyph: '■' },
    { at: 8, key: 'elevated', label: 'ELEVATED', token: 'warning', glyph: '●' },
    { at: 28, key: 'contested', label: 'CONTESTED', token: 'serious', glyph: '◆' },
    { at: 55, key: 'overrun', label: 'OVERRUN', token: 'critical', glyph: '▲' },
    { at: 88, key: 'dark', label: 'DARK', token: 'dark', glyph: '×' }
  ];

  /* Traffic templates, keyed by the reporting nation's containment level. */
  var SIGNALS = {
    secure: [
      'BORDER CONTROL RAISED TO LEVEL 3 — ALL PORTS OF ENTRY',
      'RESERVE FORMATIONS MOBILIZING — NO CONTACT REPORTED',
      'NATIONAL STOCKPILE RELEASED TO CIVIL AUTHORITY',
      'SCREENING PROTOCOL ACTIVE — ZERO POSITIVE RETURNS',
      'REQUESTING WDMA LIAISON OFFICER — PREPARATORY ONLY'
    ],
    elevated: [
      'FIRST CONFIRMED CASES — QUARANTINE CORDON ESTABLISHED',
      'CIVIL AVIATION SUSPENDED — DOMESTIC AND INTERNATIONAL',
      'HOSPITAL SYSTEM AT 80% CAPACITY — SURGE PLAN ACTIVE',
      'ARMED FORCES ASSUMING INTERNAL SECURITY TASKS',
      'REQUESTING IMMEDIATE MEDICAL AIRLIFT — PRIORITY ONE'
    ],
    contested: [
      'CORDON BREACHED IN THREE SECTORS — FALLING BACK',
      'CIVIL AUTHORITY REQUESTING EMERGENCY EVACUATION SUPPORT',
      'HOSPITAL SYSTEM OVERWHELMED — TRIAGE PROTOCOL DELTA',
      'POWER GRID UNSTABLE — ROLLING BLACKOUTS NATIONWIDE',
      'NATIONAL COMMAND RELOCATING TO ALTERNATE SITE'
    ],
    overrun: [
      'GARRISON OVERRUN — SURVIVORS WITHDRAWING TO HARDENED SITE',
      'CAPITAL LOST — GOVERNMENT CONTINUITY SITE ACTIVATED',
      'COMMAND NET DEGRADED — INTERMITTENT TRANSMISSION ONLY',
      'LAST AIRFIELD CLOSED — NO FURTHER EVACUATION POSSIBLE',
      'REQUESTING ANY ASSISTANCE — ANY NATION — ANY PRECEDENCE'
    ],
    dark: [
      'NO FURTHER TRANSMISSION',
      'STATION SILENT — CARRIER LOST',
      'AUTOMATED BEACON ONLY — NO OPERATOR RESPONSE',
      'LAST TRANSMISSION ENDS MID-SENTENCE',
      'CHANNEL DEAD'
    ]
  };

  /* Scripted takeovers, fired as the global picture crosses each threshold. */
  var BULLETINS = [
    {
      at: 0,
      kind: 'critical',
      tag: 'FLASH — CRITIC',
      title: 'BIOLOGICAL EVENT CONFIRMED',
      lines: [
        'UNCLASSIFIED PATHOGEN — CONUS — MULTIPLE CASUALTY REPORTS',
        'REANIMATION OBSERVED IN DECEASED SUBJECTS',
        'ALL PARTNER NODES ASSUME WARTIME REPORTING POSTURE'
      ]
    },
    {
      at: 8,
      kind: 'critical',
      tag: 'FLASH',
      title: 'CIVILIAN COMMUNICATIONS NETWORK — DOWN',
      lines: [
        'PUBLIC TELEPHONY AND CELLULAR — TOTAL LOSS ACROSS 6 REGIONS',
        'WDMA MILITARY CIRCUITS REMAIN NOMINAL'
      ]
    },
    {
      at: 18,
      kind: 'critical',
      tag: 'FLASH',
      title: 'GLOBAL DATA BACKBONE — DEGRADED',
      lines: [
        'TRANS-OCEANIC CARRIERS REPORTING 62% PACKET LOSS',
        'FALLING BACK TO SATCOM-3 NARROWBAND'
      ]
    },
    {
      at: 30,
      kind: 'critical',
      tag: 'FLASH',
      title: 'REPUBLIC OF KOREA ARMED FORCES — COMMAND NET DOWN',
      lines: [
        'NODE DEF-08 — NO SIGNAL FOR 11 MINUTES',
        'LAST REPORT: PERIMETER CONTACT AT ALL FORWARD POSITIONS'
      ]
    },
    {
      at: 42,
      kind: 'critical',
      tag: 'FLASH',
      title: 'NORTH ATLANTIC SATCOM CONSTELLATION — OFFLINE',
      lines: [
        'FOUR OF SIX BIRDS UNRESPONSIVE — GROUND SEGMENT LOST',
        'EUROPEAN PARTNER NODES ROUTING VIA TACSAT ONLY'
      ]
    },
    {
      at: 54,
      kind: 'critical',
      tag: 'FLASH',
      title: 'PARTNER NODE DEF-01 — NO SIGNAL',
      lines: [
        'UNITED STATES DEPARTMENT OF DEFENSE — CIRCUIT DEAD',
        'CONTINUITY OF COMMAND PASSES TO WDMA GLOBAL OPERATIONS COMMAND'
      ]
    },
    {
      at: 66,
      kind: 'critical',
      tag: 'FLASH',
      title: 'FINANCIAL SETTLEMENT SYSTEMS — HALTED',
      lines: [
        'ALL FIN NODES SUSPENDED — NO CLEARING CAPACITY REMAINS',
        'RELIEF FUNDING NOW DIRECTED FROM STANDING RESERVE ONLY'
      ]
    },
    {
      at: 78,
      kind: 'critical',
      tag: 'FLASH — CRITIC',
      title: 'CONTINENTAL COMMAND STRUCTURE — COLLAPSING',
      lines: [
        'FEWER THAN SIX NATIONAL COMMANDS STILL RESPONDING',
        'THIS TERMINAL IS NOW A PRIMARY COORDINATION NODE'
      ]
    }
  ];

  /* Operator actions. Each is a real trade — capacity is the limiting factor. */
  var ACTIONS = [
    {
      id: 'cordon',
      key: 'Q',
      name: 'ENFORCE CORDON',
      cost: 22,
      cooldown: 6,
      brief: 'Halve contagion transfer along travel routes for 18 s'
    },
    {
      id: 'airlift',
      key: 'W',
      name: 'MEDICAL AIRLIFT',
      cost: 18,
      cooldown: 5,
      brief: 'Push USAR and field hospitals into the three worst nations'
    },
    {
      id: 'isolate',
      key: 'E',
      name: 'ISOLATE NETWORKS',
      cost: 14,
      cooldown: 5,
      brief: 'Re-route comms and data through hardened military circuits'
    },
    {
      id: 'vaccine',
      key: 'R',
      name: 'VACCINE PROGRAM',
      cost: 30,
      cooldown: 7,
      brief: 'Advance the counter-agent — the only route to containment'
    },
    {
      id: 'martial',
      key: 'T',
      name: 'MARTIAL LAW',
      cost: 26,
      cooldown: 9,
      brief: 'Heavy global suppression at a lasting cost to civil integrity'
    }
  ];

  var DEFEAT = [
    { t: 0, text: 'GLOBAL CONTAINMENT LOST', sub: 'NO NATIONAL COMMAND STRUCTURE REMAINS' },
    { t: 2600, text: 'CONTACT — 1,000 METRES FROM THIS TERMINAL', sub: 'PERIMETER SENSORS — MASS RETURN' },
    { t: 5000, text: 'OUTER PERIMETER DOORS — BREACHED', sub: 'RANGE 1,000 M · SECTOR 4 · SECTOR 7' },
    { t: 7200, text: 'BLAST DOOR 03 — BREACHED', sub: 'RANGE 420 M' },
    { t: 9200, text: 'BLAST DOOR 02 — BREACHED', sub: 'RANGE 180 M' },
    { t: 11200, text: 'BLAST DOOR 01 — BREACHED', sub: 'RANGE 40 M · TERMINAL LEVEL' },
    { t: 13400, text: 'ENTERING FINAL DATA PRESERVATION STAGE', sub: 'WRITING ARCHIVE TO HARDENED STORE', archive: true },
    { t: 22000, text: 'ARCHIVE SEALED — WDMA-COSMIC', sub: 'NO FURTHER OPERATOR INPUT ACCEPTED' },
    { t: 25000, text: 'TERMINAL LOCKOUT', sub: 'GLOBAL OPERATIONS COMMAND — OFF THE AIR', final: true }
  ];

  var VICTORY = [
    { t: 0, text: 'PATHOGEN SUPPRESSED', sub: 'TRANSMISSION RATE BELOW 1.0 IN ALL REPORTING NATIONS' },
    { t: 2800, text: 'CIVILIAN COMMUNICATIONS — RESTORED', sub: 'PUBLIC TELEPHONY AND CELLULAR BACK ON LINE' },
    { t: 5400, text: 'GLOBAL DATA BACKBONE — RESTORED', sub: 'TRANS-OCEANIC CARRIERS NOMINAL · PACKET LOSS 0.4%' },
    { t: 8000, text: 'REPUBLIC OF KOREA ARMED FORCES — LINK RESTORED', sub: 'NODE DEF-08 RESPONDING · PERIMETER HELD' },
    { t: 10600, text: 'SATCOM CONSTELLATION — NOMINAL', sub: 'SIX OF SIX BIRDS RESPONDING' },
    { t: 13200, text: 'PARTNER NODES — 40 / 40 RESPONDING', sub: 'FULL COALITION REPORTING RESUMED' },
    { t: 16000, text: 'GLOBAL OPERATIONS COMMAND — RESTORED', sub: 'RETURNING TERMINAL TO NORMAL WATCH', final: true }
  ];

  global.WDMA_SCENARIO = {
    links: LINKS,
    levels: LEVELS,
    signals: SIGNALS,
    bulletins: BULLETINS,
    actions: ACTIONS,
    defeat: DEFEAT,
    victory: VICTORY
  };
})(window);
