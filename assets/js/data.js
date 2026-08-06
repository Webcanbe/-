/* World Disaster Management Authority — Global Operations Command
 * Data layer for the dashboard UI.
 *
 * NOTE: every figure in this file is simulated placeholder data generated for
 * interface development. Nothing here is sourced from a real reporting system.
 */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------------
   * Partner countries & institutions
   * ------------------------------------------------------------------ */

  var PARTNER_GROUPS = [
    {
      id: 'defense',
      title: 'Defense & Armed Forces',
      caption: 'Airlift, engineering corps and rapid deployment',
      members: [
        { name: 'United States Department of Defense', tag: 'United States' },
        { name: 'People’s Liberation Army', tag: 'China' },
        { name: 'Russian Armed Forces', tag: 'Russia' },
        { name: 'Indian Armed Forces', tag: 'India' },
        { name: 'British Armed Forces', tag: 'United Kingdom' },
        { name: 'French Armed Forces', tag: 'France' },
        { name: 'Japan Self-Defense Forces', tag: 'Japan' },
        { name: 'Republic of Korea Armed Forces', tag: 'South Korea' },
        { name: 'Turkish Armed Forces', tag: 'Türkiye' },
        { name: 'Israel Defense Forces', tag: 'Israel' }
      ]
    },
    {
      id: 'finance',
      title: 'Finance & Monetary Institutions',
      caption: 'Relief funding, liquidity lines and reconstruction capital',
      members: [
        { name: 'Federal Reserve System', tag: 'United States' },
        { name: 'European Central Bank', tag: 'Euro Area' },
        { name: 'People’s Bank of China', tag: 'China' },
        { name: 'International Monetary Fund', tag: 'Multilateral' },
        { name: 'Bank for International Settlements', tag: 'Multilateral' },
        { name: 'World Bank Group', tag: 'Multilateral' },
        { name: 'BlackRock', tag: 'Asset Management' },
        { name: 'Vanguard Group', tag: 'Asset Management' },
        { name: 'JPMorgan Chase', tag: 'Banking' },
        { name: 'Industrial and Commercial Bank of China', tag: 'Banking' }
      ]
    },
    {
      id: 'health',
      title: 'Health & Medical Institutions',
      caption: 'Surveillance, field hospitals and clinical surge capacity',
      members: [
        { name: 'World Health Organization', tag: 'Multilateral' },
        { name: 'National Institutes of Health', tag: 'United States' },
        { name: 'European Medicines Agency', tag: 'European Union' },
        { name: 'Centers for Disease Control and Prevention', tag: 'United States' },
        { name: 'Massachusetts General Hospital', tag: 'United States' },
        { name: 'Mayo Clinic', tag: 'United States' },
        { name: 'UT Southwestern Medical Center', tag: 'United States' },
        { name: 'Brigham and Women’s Hospital', tag: 'United States' },
        { name: 'West China Hospital', tag: 'China' },
        { name: 'Mount Sinai Health System', tag: 'United States' }
      ]
    },
    {
      id: 'industry',
      title: 'Industry, Semiconductors & Materials',
      caption: 'Critical supply chains, components and raw materials',
      members: [
        { name: 'Taiwan Semiconductor Manufacturing Company', tag: 'Taiwan' },
        { name: 'ASML Holding', tag: 'Netherlands' },
        { name: 'Samsung Electronics', tag: 'South Korea' },
        { name: 'SK hynix', tag: 'South Korea' },
        { name: 'Applied Materials', tag: 'United States' },
        { name: 'Tokyo Electron', tag: 'Japan' },
        { name: 'Shin-Etsu Chemical', tag: 'Japan' },
        { name: 'Contemporary Amperex Technology', tag: 'China' },
        { name: 'BASF', tag: 'Germany' },
        { name: 'Rio Tinto', tag: 'Australia / UK' }
      ]
    }
  ];

  var MEMBER_STATES = [
    { name: 'United States', code: 'US' },
    { name: 'China', code: 'CN' },
    { name: 'Russia', code: 'RU' },
    { name: 'India', code: 'IN' },
    { name: 'United Kingdom', code: 'GB' },
    { name: 'France', code: 'FR' },
    { name: 'Germany', code: 'DE' },
    { name: 'Japan', code: 'JP' },
    { name: 'South Korea', code: 'KR' },
    { name: 'Italy', code: 'IT' },
    { name: 'Türkiye', code: 'TR' },
    { name: 'Canada', code: 'CA' },
    { name: 'Brazil', code: 'BR' },
    { name: 'Saudi Arabia', code: 'SA' },
    { name: 'Israel', code: 'IL' },
    { name: 'Australia', code: 'AU' },
    { name: 'Indonesia', code: 'ID' },
    { name: 'Iran', code: 'IR' },
    { name: 'Spain', code: 'ES' },
    { name: 'Pakistan', code: 'PK' }
  ];

  /* ---------------------------------------------------------------------
   * Dimensions
   * ------------------------------------------------------------------ */

  var REGIONS = [
    'Asia & Pacific',
    'Africa',
    'Southern Asia',
    'Latin America & Caribbean',
    'Europe',
    'Middle East & North Africa',
    'North America'
  ];

  // Series slots 1-3 of the categorical theme, in fixed order.
  var HAZARDS = [
    { key: 'hydro', label: 'Hydrometeorological', short: 'Hydro-met.', slot: 1 },
    { key: 'geo', label: 'Geophysical', short: 'Geophysical', slot: 2 },
    { key: 'bio', label: 'Biological & Health', short: 'Biological', slot: 3 }
  ];

  // Severity is a state, so it wears the reserved status palette and always
  // ships with a glyph + label so it never reads by color alone.
  var SEVERITIES = [
    { key: 'critical', tier: 'L1', label: 'Critical', token: 'critical', glyph: '▲' },
    { key: 'serious', tier: 'L2', label: 'Serious', token: 'serious', glyph: '◆' },
    { key: 'elevated', tier: 'L3', label: 'Elevated', token: 'warning', glyph: '●' },
    { key: 'monitoring', tier: 'L4', label: 'Monitoring', token: 'good', glyph: '■' }
  ];

  var MONTHS = [
    'Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026',
    'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026'
  ];

  /* ---------------------------------------------------------------------
   * Deterministic generator — the mock numbers must be stable across reloads
   * ------------------------------------------------------------------ */

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

  function pick(list) {
    return list[Math.floor(rand() * list.length)];
  }

  /* Monthly volume matrix: monthly[region][hazardKey] = 12 values ---------- */

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

  /* Incident log ---------------------------------------------------------- */

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

  var LEAD_PARTNERS = [
    'World Health Organization', 'World Bank Group', 'United States Department of Defense',
    'Japan Self-Defense Forces', 'French Armed Forces', 'Indian Armed Forces',
    'Republic of Korea Armed Forces', 'British Armed Forces', 'Turkish Armed Forces',
    'Centers for Disease Control and Prevention', 'International Monetary Fund',
    'People’s Liberation Army', 'Russian Armed Forces', 'Israel Defense Forces'
  ];

  var PHASES = ['Response', 'Mobilizing', 'Assessment', 'Stabilizing', 'Stand-down'];

  var SEVERITY_MIX = ['critical', 'serious', 'serious', 'elevated', 'elevated',
    'elevated', 'monitoring', 'monitoring', 'monitoring', 'monitoring'];

  var incidents = [];
  for (var i = 0; i < 320; i += 1) {
    var region = REGIONS[Math.floor(Math.pow(rand(), 1.35) * REGIONS.length)];
    var hazard = HAZARDS[Math.floor(Math.pow(rand(), 1.25) * HAZARDS.length)];
    var severity = SEVERITY_MIX[Math.floor(rand() * SEVERITY_MIX.length)];
    var ageDays = Math.floor(Math.pow(rand(), 1.15) * 330);
    var scale = severity === 'critical' ? 9.2 : severity === 'serious' ? 4.1
      : severity === 'elevated' ? 1.7 : 0.6;
    var affected = Math.round((0.35 + rand() * 1.9) * scale * 100000);
    var activationBand = severity === 'critical' ? [1, 6] : severity === 'serious' ? [3, 13]
      : severity === 'elevated' ? [6, 30] : [14, 76];

    incidents.push({
      id: 'WDMA-26-' + String(1000 + i * 7 + Math.floor(rand() * 6)),
      event: pick(EVENT_NAMES[hazard.key]) + ' — ' + pick(PLACES[region]),
      hazard: hazard.key,
      region: region,
      severity: severity,
      affected: affected,
      assets: Math.max(1, Math.round(scale * (1.4 + rand() * 2.6))),
      fundingM: Math.round((affected / 1e6) * (55 + rand() * 90) * 10) / 10,
      activationH: Math.round((activationBand[0] +
        rand() * (activationBand[1] - activationBand[0])) * 10) / 10,
      lead: pick(LEAD_PARTNERS),
      phase: severity === 'monitoring' ? pick(['Assessment', 'Stand-down', 'Stabilizing'])
        : pick(PHASES),
      ageDays: ageDays,
      updatedHours: Math.max(1, Math.floor(rand() * 40))
    });
  }

  incidents.sort(function (a, b) {
    var order = { critical: 0, serious: 1, elevated: 2, monitoring: 3 };
    if (order[a.severity] !== order[b.severity]) {
      return order[a.severity] - order[b.severity];
    }
    return b.affected - a.affected;
  });

  /* Deployable capacity meters ------------------------------------------- */

  var CAPACITY = [
    { label: 'Urban search & rescue teams', committed: 412, total: 560, unit: 'teams' },
    { label: 'Field hospitals & surge beds', committed: 268, total: 430, unit: 'units' },
    { label: 'Strategic airlift sorties', committed: 1180, total: 1340, unit: 'sorties/wk' },
    { label: 'Emergency stockpile drawdown', committed: 46, total: 100, unit: '% of reserve' },
    { label: 'Satellite & comms relays', committed: 74, total: 128, unit: 'relays' }
  ];

  /* Headline figures ------------------------------------------------------ */

  var SPARKS = {
    operations: [612, 638, 601, 655, 690, 712, 704, 748, 771, 802, 844, 893],
    partners: [1052, 1064, 1079, 1088, 1103, 1131, 1150, 1168, 1186, 1204, 1229, 1247],
    funding: [11.2, 11.9, 12.4, 13.1, 13.6, 14.2, 15.0, 15.6, 16.3, 17.1, 17.8, 18.4],
    activation: [7.4, 7.1, 6.8, 6.6, 6.2, 5.9, 5.7, 5.4, 5.1, 4.8, 4.5, 4.2]
  };

  global.WDMA_DATA = {
    partnerGroups: PARTNER_GROUPS,
    memberStates: MEMBER_STATES,
    regions: REGIONS,
    hazards: HAZARDS,
    severities: SEVERITIES,
    months: MONTHS,
    monthly: monthly,
    incidents: incidents,
    capacity: CAPACITY,
    sparks: SPARKS
  };
})(window);
