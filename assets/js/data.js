/* WDMA GLOBAL OPERATIONS COMMAND — data layer.
 *
 * EXERCISE. Every record, figure and status indicator below is generated from a
 * fixed seed for interface work. No live feed, telemetry or partner system is
 * connected, and nothing here reflects any real organization or event.
 */
(function (global) {
  'use strict';

  /* Fixed reference instant so date-time groups stay stable across reloads. */
  var REF = Date.UTC(2026, 7, 6, 10, 0, 0);

  function pad2(n) { return String(n).padStart(2, '0'); }

  /* Military date-time group: DDHHMMZ */
  function dtg(hoursAgo) {
    var d = new Date(REF - hoursAgo * 3600000);
    return pad2(d.getUTCDate()) + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + 'Z';
  }

  /* --------------------------------------------------------------------------
   * Coalition partners
   * ----------------------------------------------------------------------- */

  var PARTNER_GROUPS = [
    {
      id: 'def',
      code: 'DEF',
      title: 'Defense & Armed Forces',
      role: 'Airlift · engineering · rapid deployment',
      access: 'TS//SCI',
      marking: 'TS//SCI',
      members: [
        { name: 'United States Department of Defense', tag: 'USA' },
        { name: 'People’s Liberation Army', tag: 'CHN' },
        { name: 'Russian Armed Forces', tag: 'RUS' },
        { name: 'Indian Armed Forces', tag: 'IND' },
        { name: 'British Armed Forces', tag: 'GBR' },
        { name: 'French Armed Forces', tag: 'FRA' },
        { name: 'Japan Self-Defense Forces', tag: 'JPN' },
        { name: 'Republic of Korea Armed Forces', tag: 'KOR' },
        { name: 'Turkish Armed Forces', tag: 'TUR' },
        { name: 'Israel Defense Forces', tag: 'ISR' }
      ]
    },
    {
      id: 'fin',
      code: 'FIN',
      title: 'Finance & Monetary',
      role: 'Relief funding · liquidity · reconstruction capital',
      access: 'S//REL',
      marking: 'S//REL',
      members: [
        { name: 'Federal Reserve System', tag: 'USA' },
        { name: 'European Central Bank', tag: 'EUR' },
        { name: 'People’s Bank of China', tag: 'CHN' },
        { name: 'International Monetary Fund', tag: 'MULTI' },
        { name: 'Bank for International Settlements', tag: 'MULTI' },
        { name: 'World Bank Group', tag: 'MULTI' },
        { name: 'BlackRock', tag: 'ASSET' },
        { name: 'Vanguard Group', tag: 'ASSET' },
        { name: 'JPMorgan Chase', tag: 'BANK' },
        { name: 'Industrial and Commercial Bank of China', tag: 'BANK' }
      ]
    },
    {
      id: 'med',
      code: 'MED',
      title: 'Health & Medical',
      role: 'Surveillance · field hospitals · clinical surge',
      access: 'S//REL',
      marking: 'S//REL',
      members: [
        { name: 'World Health Organization', tag: 'MULTI' },
        { name: 'National Institutes of Health', tag: 'USA' },
        { name: 'European Medicines Agency', tag: 'EUR' },
        { name: 'Centers for Disease Control and Prevention', tag: 'USA' },
        { name: 'Massachusetts General Hospital', tag: 'USA' },
        { name: 'Mayo Clinic', tag: 'USA' },
        { name: 'UT Southwestern Medical Center', tag: 'USA' },
        { name: 'Brigham and Women’s Hospital', tag: 'USA' },
        { name: 'West China Hospital', tag: 'CHN' },
        { name: 'Mount Sinai Health System', tag: 'USA' }
      ]
    },
    {
      id: 'ind',
      code: 'IND',
      title: 'Industry & Materials',
      role: 'Critical supply chain · components · raw materials',
      access: 'C//REL',
      marking: 'C//REL',
      members: [
        { name: 'Taiwan Semiconductor Manufacturing Company', tag: 'TWN' },
        { name: 'ASML Holding', tag: 'NLD' },
        { name: 'Samsung Electronics', tag: 'KOR' },
        { name: 'SK hynix', tag: 'KOR' },
        { name: 'Applied Materials', tag: 'USA' },
        { name: 'Tokyo Electron', tag: 'JPN' },
        { name: 'Shin-Etsu Chemical', tag: 'JPN' },
        { name: 'Contemporary Amperex Technology', tag: 'CHN' },
        { name: 'BASF', tag: 'DEU' },
        { name: 'Rio Tinto', tag: 'AUS' }
      ]
    }
  ];

  PARTNER_GROUPS.forEach(function (g) {
    g.members.forEach(function (m, i) {
      m.node = g.code + '-' + pad2(i + 1);
    });
  });

  var MEMBER_STATES = [
    { name: 'United States', code: 'USA' },
    { name: 'China', code: 'CHN' },
    { name: 'Russia', code: 'RUS' },
    { name: 'India', code: 'IND' },
    { name: 'United Kingdom', code: 'GBR' },
    { name: 'France', code: 'FRA' },
    { name: 'Germany', code: 'DEU' },
    { name: 'Japan', code: 'JPN' },
    { name: 'South Korea', code: 'KOR' },
    { name: 'Italy', code: 'ITA' },
    { name: 'Türkiye', code: 'TUR' },
    { name: 'Canada', code: 'CAN' },
    { name: 'Brazil', code: 'BRA' },
    { name: 'Saudi Arabia', code: 'SAU' },
    { name: 'Israel', code: 'ISR' },
    { name: 'Australia', code: 'AUS' },
    { name: 'Indonesia', code: 'IDN' },
    { name: 'Iran', code: 'IRN' },
    { name: 'Spain', code: 'ESP' },
    { name: 'Pakistan', code: 'PAK' }
  ];

  MEMBER_STATES.forEach(function (m, i) { m.node = 'MS-' + pad2(i + 1); });

  /* --------------------------------------------------------------------------
   * Dimensions
   * ----------------------------------------------------------------------- */

  var REGIONS = [
    'Asia & Pacific',
    'Africa',
    'Southern Asia',
    'Latin America & Caribbean',
    'Europe',
    'Middle East & North Africa',
    'North America'
  ];

  var AO_CODE = {
    'Asia & Pacific': 'AO-PAC',
    'Africa': 'AO-AFR',
    'Southern Asia': 'AO-SAS',
    'Latin America & Caribbean': 'AO-LAC',
    'Europe': 'AO-EUR',
    'Middle East & North Africa': 'AO-MNA',
    'North America': 'AO-NAM'
  };

  /* Categorical slots 1-3, in fixed order. */
  var HAZARDS = [
    { key: 'hydro', label: 'Hydrometeorological', short: 'HYDMET', slot: 1 },
    { key: 'geo', label: 'Geophysical', short: 'GEOPHY', slot: 2 },
    { key: 'bio', label: 'Biological & Health', short: 'BIOMED', slot: 3 }
  ];

  /* Precedence is a state, so it wears the reserved status palette and always
     ships with a glyph and a label so it never reads by colour alone. */
  var SEVERITIES = [
    { key: 'critical', tier: 'P1', label: 'FLASH', token: 'critical', glyph: '▲' },
    { key: 'serious', tier: 'P2', label: 'IMMEDIATE', token: 'serious', glyph: '◆' },
    { key: 'elevated', tier: 'P3', label: 'PRIORITY', token: 'warning', glyph: '●' },
    { key: 'monitoring', tier: 'P4', label: 'ROUTINE', token: 'good', glyph: '■' }
  ];

  var MONTHS = [
    'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026',
    'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026'
  ];

  /* --------------------------------------------------------------------------
   * Deterministic generator
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

  /* Monthly reporting volume: monthly[region][hazardKey] = 12 values ---------- */

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

  /* Tasking log --------------------------------------------------------------- */

  var EVENT_NAMES = {
    hydro: ['Tropical Cyclone', 'Riverine Flood', 'Flash Flood', 'Storm Surge',
      'Drought Emergency', 'Wildfire Complex', 'Extreme Heat Event', 'Debris Flow'],
    geo: ['Earthquake', 'Volcanic Eruption', 'Tsunami Advisory', 'Aftershock Sequence',
      'Ground Subsidence', 'Slope Failure'],
    bio: ['Respiratory Cluster', 'Cholera Cluster', 'Vector-Borne Surge',
      'Food-Borne Outbreak', 'Zoonotic Spillover']
  };

  var PLACES = {
    'Asia & Pacific': ['Luzon Basin', 'Kyushu Coast', 'Java Interior', 'Mekong Delta',
      'Sulawesi Strait', 'Queensland North', 'Hokkaido Rim', 'Bohai Rim'],
    'Africa': ['Sahel Corridor', 'Horn of Africa', 'Lake Chad Basin', 'Zambezi Valley',
      'Rift Highlands', 'Niger Delta', 'Kalahari Fringe'],
    'Southern Asia': ['Indus Plain', 'Ganges Delta', 'Hindu Kush', 'Deccan Plateau',
      'Brahmaputra Basin', 'Sindh Lowlands'],
    'Latin America & Caribbean': ['Andean Cordillera', 'Amazon Basin', 'Leeward Islands',
      'Yucatán Shelf', 'Río de la Plata', 'Pacific Isthmus'],
    'Europe': ['Po Valley', 'Rhine Corridor', 'Aegean Arc', 'Iberian Meseta',
      'Carpathian Belt', 'North Sea Coast'],
    'Middle East & North Africa': ['Anatolian Fault', 'Levant Corridor', 'Gulf Littoral',
      'Nile Delta', 'Maghreb Coast', 'Zagros Belt'],
    'North America': ['Cascadia Margin', 'Gulf Coast', 'Great Plains', 'Sierra Front',
      'St. Lawrence Basin', 'Sonoran Corridor']
  };

  var CALL_A = ['IRON', 'PALE', 'SILENT', 'BROKEN', 'NORTHERN', 'CRIMSON', 'GRANITE',
    'HOLLOW', 'STEEL', 'AMBER', 'SABLE', 'RAPID', 'LONE', 'DEEP', 'COLD', 'GOLDEN',
    'QUIET', 'DISTANT', 'OPEN', 'HIGH'];
  var CALL_B = ['MERIDIAN', 'HORIZON', 'LANTERN', 'ANVIL', 'SENTINEL', 'HARBOR',
    'CASCADE', 'VECTOR', 'BASTION', 'TALON', 'COMPASS', 'RAMPART', 'EMBER',
    'THRESHOLD', 'MARINER', 'PALISADE', 'KEYSTONE', 'WARDEN', 'TEMPEST', 'CITADEL'];

  var LEAD_PARTNERS = [
    { name: 'United States Department of Defense', node: 'DEF-01' },
    { name: 'People’s Liberation Army', node: 'DEF-02' },
    { name: 'Russian Armed Forces', node: 'DEF-03' },
    { name: 'Indian Armed Forces', node: 'DEF-04' },
    { name: 'British Armed Forces', node: 'DEF-05' },
    { name: 'French Armed Forces', node: 'DEF-06' },
    { name: 'Japan Self-Defense Forces', node: 'DEF-07' },
    { name: 'Republic of Korea Armed Forces', node: 'DEF-08' },
    { name: 'Turkish Armed Forces', node: 'DEF-09' },
    { name: 'Israel Defense Forces', node: 'DEF-10' },
    { name: 'World Bank Group', node: 'FIN-06' },
    { name: 'International Monetary Fund', node: 'FIN-04' },
    { name: 'World Health Organization', node: 'MED-01' },
    { name: 'Centers for Disease Control and Prevention', node: 'MED-04' }
  ];

  var PHASES = ['EXECUTE', 'DEPLOY', 'ASSESS', 'SUSTAIN', 'RECOVER'];

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

  /* Spread taskings across 30-day periods on a gently declining curve — older
     operations close out — so period-over-period movement reads as caseload
     rather than sampling noise. */
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
      phase: severity === 'monitoring' ? pick(['ASSESS', 'RECOVER', 'SUSTAIN'])
        : pick(PHASES),
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

  /* Force readiness ----------------------------------------------------------- */

  var CAPACITY = [
    { code: 'USAR', label: 'Urban search & rescue', committed: 412, total: 560, unit: 'TM' },
    { code: 'MEDF', label: 'Field hospital / surge beds', committed: 268, total: 430, unit: 'UNT' },
    { code: 'ALFT', label: 'Strategic airlift', committed: 1180, total: 1340, unit: 'SOR/WK' },
    { code: 'STOK', label: 'Emergency stockpile', committed: 46, total: 100, unit: '% RSV' },
    { code: 'COMM', label: 'Satellite & comms relay', committed: 74, total: 128, unit: 'RLY' }
  ];

  var POSTURE = [
    { code: 'LNO', label: 'Liaison cells staffed', value: '40 / 40' },
    { code: 'RPT', label: 'Member states reporting', value: '20 / 20' },
    { code: 'ALA', label: 'Standing airlift agreements', value: '14' },
    { code: 'PPS', label: 'Pre-positioned stockpile sites', value: '62' },
    { code: 'CFF', label: 'Contingency funding facilities', value: '9' },
    { code: 'EXR', label: 'Joint exercises this quarter', value: '7' }
  ];

  /* Link telemetry (static baseline; the UI jitters RTT for the live read) ----- */

  var LINK = {
    channel: 'SATCOM-3 / TACSAT-KU',
    cipher: 'AES-256-GCM',
    kex: 'X25519MLKEM768',
    mac: 'SHA-384',
    fingerprint: '8F:2C:A1:6D:04:B7:E9:53',
    rttBase: 42,
    rekeySeconds: 8 * 60 + 41,
    tempest: 'ZONE 1',
    terminal: 'GOC-T04',
    operator: 'WDMA/J3-WATCH-04'
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
