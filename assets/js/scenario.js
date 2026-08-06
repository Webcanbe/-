/* WDMA GLOBAL OPERATIONS COMMAND — access gate and exercise scenario engine.
 *
 * Access gate, timed escalation, a contagion model over the member states,
 * full-screen bulletins in Korean, and both ending sequences. Fictional
 * scenario — no real system, pathogen or event.
 */
(function (global) {
  'use strict';

  var D = global.WDMA_DATA;
  var S = global.WDMA_SCENARIO;

  /* Escalation timing, in ms from the moment the operator is admitted. */
  var FIRST_BULLETIN_AT = 20000;
  var OUTBREAK_AT = 30000;

  /* 지휘가 자동으로 돌아가므로, 반드시 이기되 사태가 눈에 보이도록 맞춥니다 —
     전파가 퍼지고 경고가 터지고 노드가 무너진 뒤에 판이 뒤집히는 곡선입니다. */
  var TICK_MS = 1000;
  var GROWTH = 0.026;          // 국가 내 로지스틱 증가율(초당)
  var TRANSFER = 0.0050;       // 이동 간선당 전파 비율(초당)
  var CAPACITY_REGEN = 3.0;    // 지휘 역량 회복(초당)
  var VACCINE_BITE = 0.030;    // 대응제 1점당 억제력(초당)
  var VACCINE_STEP = 6;        // 연구단 1회 파견당 대응제 진척
  var SEED = 'USA';

  var LOSS_AT = 92;            // mean infection that ends the run
  var WIN_INFECTION = 50;      // mean infection allowed alongside a full program
  var DISPATCH_EVERY = 2;      // 자동 파견 검토 주기(초)
  var MOBILISE_AT = 12;         // 최초 파견까지의 동원 소요(초)

  /* ----------------------------------------------------------- dom helper -- */

  function el(tag, props, kids) {
    var node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        if (k === 'class') node.className = props[k];
        else if (k === 'text') node.textContent = props[k];
        else if (k === 'style') node.setAttribute('style', props[k]);
        else if (k in node && k !== 'list') node[k] = props[k];
        else node.setAttribute(k, props[k]);
      });
    }
    (kids || []).forEach(function (kid) {
      if (kid) node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
    });
    return node;
  }

  /* SVG 요소 생성기. 시나리오 자료가 S 이므로 이름을 s2 로 둡니다. */
  function s2(tag, attrs, kids) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (kids || []).forEach(function (kid) { if (kid) node.appendChild(kid); });
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function setText(selector, text) {
    var node = document.querySelector(selector);
    if (node) node.textContent = text;
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function nowDtg() {
    var d = new Date();
    return pad2(d.getUTCDate()) + pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) +
      pad2(d.getUTCSeconds()) + 'Z';
  }

  function levelOf(inf) {
    var found = S.levels[0];
    S.levels.forEach(function (l) { if (inf >= l.at) found = l; });
    return found;
  }

  /* -------------------------------------------------------------- bulletin -- */

  var bulletinBox = null;
  var bulletinQueue = [];
  var bulletinActive = false;

  function showBulletin(opts) {
    bulletinQueue.push(opts);
    if (!bulletinActive) nextBulletin();
  }

  function nextBulletin() {
    var opts = bulletinQueue.shift();
    if (!opts) {
      bulletinActive = false;
      bulletinBox.hidden = true;
      clear(bulletinBox);   /* 숨은 화면의 단추가 다시 잡히지 않도록 */
      global.WDMA_FROZEN = false;
      setActionsEnabled(true);
      if (engine.running) resumeTick();
      return;
    }

    bulletinActive = true;
    pauseTick();
    global.WDMA_FROZEN = true;   /* app.js halts its clocks on this flag */
    setActionsEnabled(false);

    var kind = opts.kind || 'critical';
    bulletinBox.className = 'bulletin bulletin--' + kind;
    bulletinBox.hidden = false;
    clear(bulletinBox);

    var inner = el('div', { class: 'bulletin__inner' }, [
      el('span', { class: 'bulletin__tag', text: opts.tag || '긴급' }),
      el('h2', { class: 'bulletin__title', text: opts.title }),
      el('div', { class: 'bulletin__lines' }, (opts.lines || []).map(function (l) {
        return el('div', { text: l });
      }))
    ]);

    var fill = null;
    var pct = null;
    if (opts.archive) {
      fill = el('div', { class: 'bulletin__fill' });
      pct = el('p', { class: 'bulletin__pct', text: '기록 저장 00%' });
      inner.appendChild(el('div', { class: 'bulletin__archive' }, [
        el('div', { class: 'bulletin__track' }, [fill]), pct
      ]));
    }

    inner.appendChild(el('p', {
      class: 'bulletin__meta',
      text: 'WDMA 대한민국 조정본부 · ' + nowDtg()
    }));

    /* 경고는 스스로 사라지지 않습니다. 상황 경고에는 대국민 재난문자 발송이
       붙어, 운용자가 등급과 언어를 골라 내보내야 넘어갑니다. */
    var dismissable = !opts.final;
    var btn = null;

    if (opts.alert) {
      inner.appendChild(buildAlertConsole(opts, function () { close(); }));
    } else if (dismissable) {
      btn = el('button', {
        class: 'bulletin__dismiss', type: 'button',
        text: opts.archive ? '기록 저장 중' : '확인  [ENTER]'
      });
      if (opts.archive) btn.disabled = true;
      btn.addEventListener('click', function () { if (!btn.disabled) close(); });
      inner.appendChild(btn);
    }

    bulletinBox.appendChild(el('div', { class: 'bulletin__bar' }));
    bulletinBox.appendChild(el('div', { class: 'bulletin__mid' }, [inner]));
    bulletinBox.appendChild(el('div', { class: 'bulletin__bar' }));

    if (fill) {
      var p = 0;
      var iv = global.setInterval(function () {
        p = Math.min(100, p + 3);
        fill.style.width = p + '%';
        pct.textContent = '기록 저장 ' + pad2(p) + '%';
        if (p >= 100) {
          global.clearInterval(iv);
          if (btn) { btn.disabled = false; btn.textContent = '확인  [ENTER]'; }
        }
      }, 220);
    }

    function close() {
      document.removeEventListener('keydown', onKey);
      nextBulletin();
    }

    function onKey(ev) {
      if (opts.alert) return;   /* 재난문자를 보내야 넘어갑니다 */
      if (!dismissable || (btn && btn.disabled)) return;
      if (ev.key === 'Enter' || ev.key === 'Escape' || ev.key === ' ') {
        ev.preventDefault();
        close();
      }
    }

    document.addEventListener('keydown', onKey);
    bulletinBox.focus();
  }

  /* ------------------------------------------------------------- 재난문자 -- */

  var alertLang = 'kr';

  function alertBody(bulletin, cls, lang) {
    if (lang === 'en') {
      return S.alertSender.en + ' ' + (bulletin.en || bulletin.title) + ' ' + cls.enTail;
    }
    return S.alertSender.kr + ' ' + bulletin.title + '. ' + cls.krTail;
  }

  function buildAlertConsole(opts, done) {
    var wrap = el('div', { class: 'alertbox' });

    wrap.appendChild(el('p', { class: 'alertbox__k', text: '대국민 재난문자 발송' }));
    wrap.appendChild(el('p', {
      class: 'alertbox__reach',
      text: '수신 대상 · 국내 5,180만 · 해외 체류 84만 · 주한 외국인 226만'
    }));

    var langRow = el('div', { class: 'alertbox__langs' });
    S.alertLangs.forEach(function (l) {
      var b = el('button', {
        class: 'langbtn', type: 'button',
        'aria-pressed': String(alertLang === l.id), text: l.label
      });
      b.addEventListener('click', function () {
        alertLang = l.id;
        Array.prototype.forEach.call(langRow.children, function (c) {
          c.setAttribute('aria-pressed', String(c === b));
        });
        paintPreview();
      });
      langRow.appendChild(b);
    });
    wrap.appendChild(langRow);

    var preview = el('div', { class: 'alertbox__preview' });
    wrap.appendChild(preview);

    var classRow = el('div', { class: 'alertbox__classes' });
    S.alertClasses.forEach(function (cls) {
      var b = el('button', { class: 'classbtn classbtn--' + cls.token, type: 'button' }, [
        el('span', { class: 'classbtn__t', text: cls.label }),
        el('span', { class: 'classbtn__e', text: cls.en }),
        el('span', { class: 'classbtn__r', text: cls.reach })
      ]);
      b.addEventListener('mouseenter', function () { paintPreview(cls); });
      b.addEventListener('focus', function () { paintPreview(cls); });
      b.addEventListener('click', function () { sendAlert(opts, cls); done(); });
      classRow.appendChild(b);
    });
    wrap.appendChild(classRow);

    function paintPreview(cls) {
      var use = cls || S.alertClasses[recommendedIndex(opts)];
      clear(preview);
      if (alertLang === 'kr' || alertLang === 'both') {
        preview.appendChild(el('p', { class: 'alertbox__msg', text: alertBody(opts, use, 'kr') }));
      }
      if (alertLang === 'en' || alertLang === 'both') {
        preview.appendChild(el('p', { class: 'alertbox__msg', text: alertBody(opts, use, 'en') }));
      }
    }

    paintPreview();
    return wrap;
  }

  /* 상황 위중도에 맞는 등급. 이보다 낮게 보내면 시민 대응도가 덜 오르고,
     지나치게 높게만 보내면 경보 피로가 쌓입니다. */
  function recommendedIndex(opts) {
    var at = opts.at || 0;
    if (at >= 40) return 0;
    if (at >= 14) return 1;
    return 2;
  }

  function sendAlert(opts, cls) {
    var want = S.alertClasses[recommendedIndex(opts)];
    var gap = cls.rank - want.rank;
    var delta = gap === 0 ? 9 : gap > 0 ? (gap > 1 ? -4 : 4) : -6;
    engine.compliance = Math.max(0, Math.min(100, engine.compliance + delta));

    engine.alertCounts[cls.id] = (engine.alertCounts[cls.id] || 0) + 1;
    engine.alerts.unshift({
      cls: cls, lang: alertLang, title: opts.title, dtg: nowDtg()
    });
    if (engine.alerts.length > 8) engine.alerts.length = 8;

    var langLabel = S.alertLangs.filter(function (l) { return l.id === alertLang; })[0].short;
    pushSignal({
      prec: '발송', tone: cls.token, from: 'WDMA 대한민국 조정본부 · 재난문자',
      body: cls.label + ' 발송 (' + langLabel + ') — ' + opts.title
    });
    renderOutbreak();
  }

  /* ---------------------------------------------------------------- engine -- */

  var engine = {
    running: false,
    timer: null,
    t: 0,
    nations: [],
    byCode: {},
    capacity: 100,
    vaccine: 0,
    comms: 100,
    data: 100,
    mil: 100,
    civil: 100,
    cordonFor: 0,
    lastCluster: -99,
    nodes: [],
    deployments: [],
    dispatchSeq: 0,
    alerts: [],
    alertCounts: {},
    compliance: 62,
    lostCount: 0,
    lostMilestone: 0,
    cooldown: {},
    fired: {},
    ended: null
  };

  var ui = {};

  function pauseTick() {
    if (engine.timer) { global.clearInterval(engine.timer); engine.timer = null; }
  }

  function resumeTick() {
    if (!engine.timer && engine.running && !engine.ended) {
      engine.timer = global.setInterval(step, TICK_MS);
    }
  }

  function meanInfection() {
    var total = engine.nations.reduce(function (a, n) { return a + n.inf; }, 0);
    return total / engine.nations.length;
  }

  function startOutbreak() {
    document.body.classList.add('is-outbreak');

    /* From here the terminal is black and stays black: the stored theme is
       dropped and the theme control removed, so there is nothing to switch. */
    document.documentElement.removeAttribute('data-theme');
    try { global.localStorage.removeItem('wdma-theme'); } catch (e) { /* blocked */ }
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.remove();

    Array.prototype.forEach.call(document.querySelectorAll('.classbar'), function (bar) {
      clear(bar);
      bar.appendChild(el('span', { text: '1급기밀//WDMA-COSMIC//대외비' }));
      bar.appendChild(el('span', { class: 'classbar__x', text: '전지구 비상 — 최긴급 전문 수신 중' }));
    });

    /* The chrome that survives the takeover changes over too, so nothing on
       screen is left in English once the outbreak is running. */
    setText('.cmdbar__title', 'WDMA 대한민국 조정본부');
    setText('.cmdbar__sub', '국가재난지휘본부 · 서울 상황실');
        var opcon = document.getElementById('opcon');
    if (opcon) opcon.textContent = '최고단계';

    var foot = document.querySelector('.foot');
    if (foot) {
      clear(foot);
      foot.appendChild(el('span', { text: 'WDMA · 대한민국 조정본부' }));
      foot.appendChild(el('span', { class: 'foot__spacer' }));
      foot.appendChild(el('span', { text: '최긴급 전문 회선 개방' }));
    }

    engine.nations = D.memberStates.map(function (m) {
      return { code: m.code, name: m.name, node: m.node, lat: m.lat, lon: m.lon, inf: 0 };
    });
    engine.byCode = {};
    engine.nations.forEach(function (n) { engine.byCode[n.code] = n; });
    if (engine.byCode[SEED]) engine.byCode[SEED].inf = 7;

    /* Flatten the coalition roster so each organization can fall on its own
       threshold. Jitter is derived from the index, not random, so a given node
       always goes at the same point. */
    engine.nodes = [];
    D.partnerGroups.forEach(function (g) {
      g.members.forEach(function (m, i) {
        engine.nodes.push({
          node: m.node, name: m.name, sector: g.code, sectorName: g.short,
          state: m.state,
          fallAt: (m.state ? 58 : 52) + (((i * 7) % 13) - 6),
          lost: false, relay: null
        });
      });
    });
    engine.lostCount = 0;
    engine.lostMilestone = 0;

    buildOutbreakUi();
    engine.running = true;
    engine.t = 0;
    renderOutbreak();
    resumeTick();
  }

  function step() {
    engine.t += 1;

    var cordon = engine.cordonFor > 0 ? 0.45 : 1;
    if (engine.cordonFor > 0) engine.cordonFor -= 1;

    /* Travel transfer along the link graph, computed from a snapshot so the
       order of iteration can't advantage one nation over another. */
    var before = {};
    engine.nations.forEach(function (n) { before[n.code] = n.inf; });

    engine.nations.forEach(function (n) {
      var src = before[n.code];
      if (src < 2) return;
      (S.links[n.code] || []).forEach(function (code) {
        var target = engine.byCode[code];
        if (!target) return;
        target.inf += src * TRANSFER * cordon * (0.6 + Math.random() * 0.8);
      });
    });

    /* 시민 대응도가 확산 속도를 좌우합니다 — 상황에 맞는 등급으로 재난문자를
       보내면 오르고, 과소·과대 발령이 이어지면 떨어집니다. */
    var civicFactor = 1.25 - engine.compliance / 200;

    engine.nations.forEach(function (n) {
      n.inf += n.inf * GROWTH * civicFactor * (1 - n.inf / 100);   // 로지스틱 증가
      n.inf -= (engine.vaccine / 100) * VACCINE_BITE * 100 * 0.1;  // counter-agent
      n.inf = Math.max(0, Math.min(100, n.inf));
      if (n.inf > 1) n.everInfected = true;
    });

    var mean = meanInfection();

    /* Suppression alone never finishes it — while the counter-agent is
       incomplete, an uneliminated reservoir seeds a fresh cluster. Without
       this the operator can crush the contagion and then sit in a stalemate
       that neither side can end. */
    /* Held off for the opening minute so the contagion visibly walks out of
       the seed nation before the anti-stall reservoir starts biting. */
    if (engine.t > 25 && mean < 2 && engine.vaccine < 100) {
      var seed = reseedTarget();
      /* Pressure grows with elapsed time, so stalling on the counter-agent
         loses eventually instead of grinding on forever. */
      seed.inf = Math.max(seed.inf, Math.min(46, 4 + engine.t * 0.06 + Math.random() * 3));
      if (engine.t - engine.lastCluster >= 6) {
        engine.lastCluster = engine.t;
        pushSignal({
          prec: '최긴급', tone: 'critical', from: 'WDMA 감시본부',
          body: '신규 집단발생 — ' + seed.name + ' — 병원소 미제거, 대응제 미완성'
        });
      }
      mean = meanInfection();
    }

    /* Infrastructure tracks the global picture, with civil integrity carrying
       whatever the operator spent on suppression. */
    engine.comms = approach(engine.comms, Math.max(0, 100 - mean * 1.15), 6);
    engine.data = approach(engine.data, Math.max(0, 100 - mean * 1.05), 5);
    engine.mil = approach(engine.mil, Math.max(0, 100 - mean * 0.85), 4);
    engine.civil = Math.max(0, Math.min(100, engine.civil + 0.4));

    engine.capacity = Math.min(100, engine.capacity + CAPACITY_REGEN);
    Object.keys(engine.cooldown).forEach(function (k) {
      if (engine.cooldown[k] > 0) engine.cooldown[k] -= 1;
    });

    autoDispatch(mean);
    ageDeployments();
    checkNodes(mean);
    fireBulletins(crisisIndex(mean));
    emitSignals(mean);
    renderOutbreak();

    if (mean >= LOSS_AT) { finish(false); return; }
    if (engine.vaccine >= 100 && mean < WIN_INFECTION) { finish(true); }
  }

  /* A coalition node falls when its home nation passes its threshold; nodes
     with no member-state home follow the global picture. Every loss is reported
     with the station that relayed it, since the node itself is already off. */
  function checkNodes(mean) {
    engine.nodes.forEach(function (nd) {
      if (nd.lost) return;
      var level = nd.state && engine.byCode[nd.state]
        ? engine.byCode[nd.state].inf : mean;
      if (level < nd.fallAt) return;

      nd.lost = true;
      nd.relay = relayFor(nd);
      engine.lostCount += 1;

      var origin = nd.state && engine.byCode[nd.state]
        ? engine.byCode[nd.state].name : '다자 기구';
      pushSignal({
        prec: '최긴급', tone: 'critical', from: 'WDMA 감시본부',
        body: '노드 ' + nd.node + ' 상실 — ' + nd.name +
              ' · 최종 신호 ' + origin + ' · 중계 ' + nd.relay
      });
    });

    /* Announce every tenth loss so the scale of the collapse is unmissable. */
    var milestone = Math.floor(engine.lostCount / 10);
    if (milestone > engine.lostMilestone) {
      engine.lostMilestone = milestone;
      var total = engine.nodes.length;
      showBulletin({
        tag: '긴급',
        title: '연합 노드 ' + engine.lostCount + '개소 상실',
        lines: [
          '잔여 응답 노드 ' + (total - engine.lostCount) + ' / ' + total,
          sectorSummary()
        ]
      });
    }
  }

  /* The relaying station: a still-reporting neighbour of the node's home
     nation, falling back to any nation still on the air. */
  /* 잔존 병원소는 이미 발생했던 국가와 연결된 곳에서 다시 터집니다. 무작위로
     고르면 미국에서 시작해 번져나간 흐름이 깨집니다. */
  function reseedTarget() {
    var touched = engine.nations.filter(function (n) { return n.everInfected; });
    var pool = [];
    touched.forEach(function (n) {
      (S.links[n.code] || []).concat([n.code]).forEach(function (code) {
        var t = engine.byCode[code];
        if (t && t.inf < 88 && pool.indexOf(t) === -1) pool.push(t);
      });
    });
    if (!pool.length) pool = engine.nations.filter(function (n) { return n.inf < 88; });
    if (!pool.length) pool = engine.nations;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function relayFor(nd) {
    var alive = function (code) {
      var n = engine.byCode[code];
      return n && n.inf < 88 ? n : null;
    };
    var candidates = [];
    if (nd.state) {
      (S.links[nd.state] || []).forEach(function (code) {
        var n = alive(code);
        if (n) candidates.push(n);
      });
    }
    if (!candidates.length) {
      candidates = engine.nations.filter(function (n) { return n.inf < 88; });
    }
    if (!candidates.length) return '없음';
    /* Prefer the least-affected stations, but pick among the best few so the
       relay column doesn't name the same country over and over. */
    candidates.sort(function (a, b) { return a.inf - b.inf; });
    var pool = candidates.slice(0, Math.min(3, candidates.length));
    return pool[Math.floor(Math.random() * pool.length)].name;
  }

  function sectorSummary() {
    return D.partnerGroups.map(function (g) {
      var lost = engine.nodes.filter(function (nd) {
        return nd.sector === g.code && nd.lost;
      }).length;
      return g.short + ' ' + lost + '/' + g.members.length;
    }).join(' · ');
  }

  function approach(value, target, rate) {
    if (value > target) return Math.max(target, value - rate);
    return Math.min(target, value + rate * 0.5);
  }

  /* 경고는 평균 감염률만으로는 잘 안 터집니다 — 지휘가 자동으로 억제하므로
     평균이 낮게 유지되기 때문입니다. 최악 피해국과 상실 노드 수까지 함께 본
     위기 지수로 발령합니다. */
  function crisisIndex(mean) {
    var worst = engine.nations.reduce(function (a, n) {
      return Math.max(a, n.inf);
    }, 0);
    return Math.max(mean, worst * 0.55, engine.lostCount * 1.6);
  }

  function fireBulletins(mean) {
    for (var i = 1; i < S.bulletins.length; i += 1) {
      var b = S.bulletins[i];
      if (!engine.fired[i] && mean >= b.at) {
        engine.fired[i] = true;
        showBulletin({ tag: b.tag, title: b.title, lines: b.lines, en: b.en, at: b.at, alert: true });
        return;
      }
    }
  }

  var PREC_BY_LEVEL = {
    secure: '통상', elevated: '우선', contested: '긴급',
    overrun: '최긴급', dark: '최긴급'
  };

  function emitSignals(mean) {
    var count = 2 + Math.floor(Math.random() * 3);
    for (var i = 0; i < count; i += 1) {
      if (Math.random() < 0.42) emitOrgSignal(mean);
      else emitNationSignal();
    }
  }

  function emitNationSignal() {
    var pool = engine.nations.filter(function (n) { return n.inf > 0.5; });
    if (!pool.length) pool = engine.nations.slice(0, 4);
    var n = pool[Math.floor(Math.random() * pool.length)];
    var lv = levelOf(n.inf);
    var lines = S.signals[lv.key];
    pushSignal({
      prec: PREC_BY_LEVEL[lv.key],
      tone: lv.token,
      from: n.node + ' · ' + n.name,
      body: lines[Math.floor(Math.random() * lines.length)]
    });
  }

  /* 협력기관도 보고합니다. 소재국이 나빠질수록 악화 문안으로 넘어가고,
     이미 상실된 노드는 아무것도 보내지 않습니다. */
  function emitOrgSignal(mean) {
    var live = engine.nodes.filter(function (nd) { return !nd.lost; });
    if (!live.length) { emitNationSignal(); return; }
    var nd = live[Math.floor(Math.random() * live.length)];
    var level = nd.state && engine.byCode[nd.state] ? engine.byCode[nd.state].inf : mean;
    var pack = S.orgSignals[nd.sector.toLowerCase()];
    if (!pack) { emitNationSignal(); return; }
    var bad = level >= 30;
    var lines = bad ? pack.bad : pack.ok;
    pushSignal({
      prec: bad ? '긴급' : '통상',
      tone: bad ? 'serious' : 'good',
      from: nd.node + ' · ' + nd.name,
      body: lines[Math.floor(Math.random() * lines.length)]
    });
  }

  function pushSignal(sig) {
    var row = el('article', { class: 'sig sig--new' }, [
      el('div', { class: 'sig__hd' }, [
        el('span', { class: 'sig__prec tone-' + sig.tone, text: sig.prec }),
        el('span', { class: 'sig__fm', text: '발신 ' + sig.from }),
        el('span', { class: 'sig__dtg', text: nowDtg() })
      ]),
      el('p', { class: 'sig__body', text: sig.body })
    ]);
    ui.feed.appendChild(row);
    while (ui.feed.childElementCount > 70) ui.feed.removeChild(ui.feed.firstChild);
    global.setTimeout(function () { row.classList.remove('sig--new'); }, 400);
  }

  /* --------------------------------------------------------------- actions -- */

  /* The command dispatches on its own — the operator watches. Priorities run
     top down: finish the counter-agent, relieve the worst nation, hold the
     travel routes, then repair the links. */
  function autoDispatch(mean) {
    if (engine.ended || !engine.running) return;
    /* 동원에 걸리는 시간. 첫 몇 초는 사태가 자라는 것을 그대로 보여 줍니다. */
    if (engine.t < MOBILISE_AT) return;
    if (engine.t % DISPATCH_EVERY) return;

    var worstInf = engine.nations.reduce(function (a, n) {
      return Math.max(a, n.inf);
    }, 0);

    var wanted = [];
    if (engine.vaccine < 100) wanted.push('vaccine');
    if (worstInf > 25) wanted.push('airlift');
    if (mean > 14) wanted.push('cordon');
    if (engine.comms < 70 || engine.data < 70) wanted.push('isolate');
    if (mean > 40) wanted.push('martial');

    /* 대응제가 미완성인 동안에는 연구단 몫을 남겨 둡니다. 그러지 않으면 다른
       파견이 역량을 다 써서 대응제가 영원히 끝나지 않습니다. */
    var research = orderById('vaccine');
    var reserve = engine.vaccine < 100 ? research.cost : 0;

    for (var i = 0; i < wanted.length; i += 1) {
      var order = orderById(wanted[i]);
      if (!order) continue;
      if (engine.cooldown[order.id] > 0) continue;
      var floor = order.id === 'vaccine' ? 0 : reserve;
      if (engine.capacity - order.cost < floor) continue;
      runOrder(order);
      return;
    }
  }

  function orderById(id) {
    return S.orders.filter(function (o) { return o.id === id; })[0];
  }

  function runOrder(action) {
    engine.capacity -= action.cost;
    engine.cooldown[action.id] = action.cooldown;

    var worst = engine.nations.slice().sort(function (a, b) { return b.inf - a.inf; });
    dispatchUnit(action, worst[0]);

    if (action.id === 'cordon') {
      engine.cordonFor = 18;
      note('광역 봉쇄 발령 — 국제 이동 통제선 설정 완료');
    } else if (action.id === 'airlift') {
      worst.slice(0, 3).forEach(function (n) { n.inf = Math.max(0, n.inf - 13); });
      note('의료지원단 전개 — ' + worst.slice(0, 3).map(function (n) {
        return n.code;
      }).join(' / '));
    } else if (action.id === 'isolate') {
      engine.comms = Math.min(100, engine.comms + 28);
      engine.data = Math.min(100, engine.data + 24);
      note('통신망 군 전용 회선으로 우회 완료');
    } else if (action.id === 'vaccine') {
      engine.vaccine = Math.min(100, engine.vaccine + VACCINE_STEP);
      note('대응제 개발 진척 ' + Math.round(engine.vaccine) + '%');
    } else if (action.id === 'martial') {
      engine.nations.forEach(function (n) { n.inf = Math.max(0, n.inf - 9); });
      engine.civil = Math.max(0, engine.civil - 16);
      note('계엄 선포 — 민간 기능 저하');
    }

  }

  /* A dispatch is a unit going somewhere, and it stays on the board until it
     rotates home, so the panel reads as a deployment list rather than a log. */
  function dispatchUnit(action, target) {
    var pool = S.units[action.id] || S.units.airlift;
    var unit = pool[engine.dispatchSeq % pool.length];
    engine.dispatchSeq += 1;

    var dest = target && target.inf > 0 ? target.name : '전 권역';
    engine.deployments.unshift({
      seq: engine.dispatchSeq,
      order: action.name,
      unit: unit.name,
      size: unit.size,
      dest: dest,
      state: 0,
      since: engine.t
    });
    if (engine.deployments.length > 8) engine.deployments.length = 8;

    pushSignal({
      prec: '명령', tone: 'good', from: 'WDMA 대한민국 조정본부',
      body: action.name + ' — ' + unit.name + ' ' + dest + ' 전개 · ' + unit.size
    });
  }

  /* 전개중 → 임무중 → 복귀, then off the board. */
  function ageDeployments() {
    engine.deployments.forEach(function (d) {
      var age = engine.t - d.since;
      d.state = age < 3 ? 0 : age < 12 ? 1 : 2;
    });
    engine.deployments = engine.deployments.filter(function (d) {
      return engine.t - d.since < 16;
    });
  }

  function note(text) {
    pushSignal({ prec: '명령', tone: 'good', from: 'WDMA 전지구 작전 지휘부', body: text });
  }

  /* ------------------------------------------------------------ outbreak ui -- */

  function buildOutbreakUi() {
    var host = document.getElementById('outbreak');
    clear(host);

    ui.mean = el('span', { class: 'kv__v', text: '0%' });
    ui.clock = el('span', { class: 'kv__v', text: 'T+00:00' });
    ui.nodesLost = el('span', { class: 'kv__v', text: '0 / ' + engine.nodes.length });

    host.appendChild(el('div', { class: 'ob-head' }, [
      el('span', { class: 'ob-head__title', text: '작전 — 생물학적 봉쇄' }),
      el('div', { class: 'ob-head__meta' }, [
        kvNode('경과', ui.clock),
        kvNode('전지구 감염률', ui.mean),
        kvNode('연합 노드 상실', ui.nodesLost)
      ])
    ]));

    ui.nations = el('div', { class: 'nations' });
    ui.feed = el('div', { class: 'feed' });
    ui.gauges = el('div');
    ui.deploys = el('div', { class: 'deploys' });
    ui.alertCounts = el('div', { class: 'rows' });
    ui.alertLog = el('div', { class: 'rows' });
    ui.radar = buildRadar();
    ui.sectors = el('div', { class: 'rows' });
    ui.recent = el('div', { class: 'rows' });

    host.appendChild(el('div', { class: 'ob-grid' }, [
      el('div', { class: 'ob-col' }, [
        panel('전지구 감시 레이더', '1급기밀', ui.radar),
        panel('지휘 계기', '1급기밀', ui.gauges)
      ]),
      panel('전지구 점령 상황판', '1급기밀', ui.nations),
      panel('수신 전문', '1급기밀', ui.feed),
      el('div', { class: 'ob-col' }, [
        panel('재난문자 발송', '2급기밀', el('div', null, [
          ui.alertCounts,
          el('p', { class: 'subhead', text: '최근 발송' }),
          ui.alertLog
        ])),
        panel('파견 현황', '1급기밀', ui.deploys),
        panel('연합 노드 현황', '1급기밀', el('div', null, [
          ui.sectors,
          el('p', { class: 'subhead', text: '최근 상실 · 전달 경로' }),
          ui.recent
        ]))
      ])
    ]));

  }

  function setActionsEnabled() { /* 파견은 자동이므로 잠글 조작이 없습니다 */ }

  function kvNode(k, valueNode) {
    return el('span', { class: 'kv' }, [el('span', { class: 'kv__k', text: k }), valueNode]);
  }

  function panel(title, mark, body) {
    return el('section', { class: 'panel' }, [
      el('div', { class: 'panel__head' }, [
        el('h3', { class: 'panel__title', text: title }),
        el('span', { class: 'panel__mark', text: mark })
      ]),
      el('div', { class: 'panel__body' }, [body])
    ]);
  }

  function renderOutbreak() {
    var mean = meanInfection();
    ui.mean.textContent = mean.toFixed(1) + '%';
    ui.clock.textContent = 'T+' + pad2(Math.floor(engine.t / 60)) + ':' + pad2(engine.t % 60);

    clear(ui.nations);
    engine.nations.slice().sort(function (a, b) { return b.inf - a.inf; })
      .forEach(function (n) {
        var lv = levelOf(n.inf);
        ui.nations.appendChild(el('div', { class: 'nation' }, [
          el('span', { class: 'nation__code', text: n.code }),
          el('span', { class: 'nation__name', text: n.name }),
          el('span', { class: 'nation__state tone-' + lv.token }, [
            el('span', { class: 'nation__glyph', text: lv.glyph, 'aria-hidden': 'true' }),
            el('span', { text: lv.label }),
            el('span', { text: ' ' + Math.round(n.inf) + '%' })
          ]),
          el('div', { class: 'nation__bar' }, [
            el('div', {
              class: 'nation__fill fill-' + lv.token,
              style: 'width: ' + Math.min(100, n.inf) + '%'
            })
          ])
        ]));
      });

    clear(ui.gauges);
    [
      { k: '지휘 역량', v: engine.capacity, tone: engine.capacity < 25 ? 'critical' : 'good' },
      { k: '대응제 개발', v: engine.vaccine, tone: 'good' },
      { k: '통신 무결성', v: engine.comms, tone: gaugeTone(engine.comms) },
      { k: '데이터망', v: engine.data, tone: gaugeTone(engine.data) },
      { k: '군 통신망', v: engine.mil, tone: gaugeTone(engine.mil) },
      { k: '민간 기능', v: engine.civil, tone: gaugeTone(engine.civil) },
      { k: '시민 대응도', v: engine.compliance, tone: gaugeTone(engine.compliance) }
    ].forEach(function (g) {
      ui.gauges.appendChild(el('div', { class: 'gauge' }, [
        el('div', { class: 'gauge__hd' }, [
          el('span', { text: g.k }),
          el('span', { class: 'gauge__v', text: Math.round(g.v) + '%' })
        ]),
        el('div', { class: 'gauge__track' }, [
          el('div', { class: 'gauge__fill fill-' + g.tone, style: 'width: ' + Math.round(g.v) + '%' })
        ])
      ]));
    });

    renderRadar();
    renderAlerts();
    renderDeployments();
    renderNodes();

  }

  /* ------------------------------------------------------------- 레이더 --- */

  var RADAR = { size: 320, cx: 160, cy: 160, r: 140, maxKm: 20015 };
  var SEOUL = { lat: 37.5665, lon: 126.978 };
  var SWEEP_SECONDS = 4;

  function toRad(d) { return (d * Math.PI) / 180; }

  /* 서울 기준 대권 방위·거리 */
  function bearingRange(lat, lon) {
    var la1 = toRad(SEOUL.lat), la2 = toRad(lat), dLon = toRad(lon - SEOUL.lon);
    var y = Math.sin(dLon) * Math.cos(la2);
    var x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
    var brg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
    var cosd = Math.sin(la1) * Math.sin(la2) +
      Math.cos(la1) * Math.cos(la2) * Math.cos(dLon);
    return { brg: brg, km: 6371 * Math.acos(Math.max(-1, Math.min(1, cosd))) };
  }

  function buildRadar() {
    var wrap = el('div', { class: 'radar' });
    wrap.appendChild(el('div', { class: 'radar__sweep' }));

    var R = RADAR;
    var svg = s2('svg', {
      class: 'radar__scope', viewBox: '0 0 ' + R.size + ' ' + R.size,
      role: 'img', 'aria-label': '서울 기준 전지구 감시 레이더. 정확한 수치는 점령 상황판 참조.'
    });

    [0.25, 0.5, 0.75, 1].forEach(function (f, i) {
      svg.appendChild(s2('circle', {
        class: 'radar__ring', cx: R.cx, cy: R.cy, r: R.r * f
      }));
      /* 거리는 제곱근 축척입니다. 서울 반경 1만km 안에 대부분이 몰려 있어
         선형으로 그리면 안쪽에 뭉쳐 읽을 수 없습니다. */
      svg.appendChild(s2('text', {
        class: 'radar__scale', x: R.cx + 3, y: R.cy - R.r * f + 10,
        text: Math.round((R.maxKm * f * f) / 1000) + 'k'
      }));
    });

    for (var a = 0; a < 360; a += 30) {
      var rad = toRad(a);
      svg.appendChild(s2('line', {
        class: 'radar__tick',
        x1: R.cx + Math.sin(rad) * (R.r - 8), y1: R.cy - Math.cos(rad) * (R.r - 8),
        x2: R.cx + Math.sin(rad) * R.r, y2: R.cy - Math.cos(rad) * R.r
      }));
    }

    [['북', 0], ['동', 90], ['남', 180], ['서', 270]].forEach(function (m) {
      var rad = toRad(m[1]);
      svg.appendChild(s2('text', {
        class: 'radar__card',
        x: R.cx + Math.sin(rad) * (R.r - 20),
        y: R.cy - Math.cos(rad) * (R.r - 20) + 4,
        text: m[0]
      }));
    });

    svg.appendChild(s2('circle', { class: 'radar__home', cx: R.cx, cy: R.cy, r: 3 }));
    ui.blips = s2('g');
    svg.appendChild(ui.blips);
    wrap.appendChild(svg);
    return wrap;
  }

  function renderRadar() {
    if (!ui.blips) return;
    clear(ui.blips);
    var R = RADAR;

    engine.nations.forEach(function (n) {
      var geo = n.geo || (n.geo = bearingRange(n.lat, n.lon));
      var rad = toRad(geo.brg);
      var dist = Math.sqrt(Math.min(1, geo.km / R.maxKm)) * R.r;
      var x = R.cx + Math.sin(rad) * dist;
      var y = R.cy - Math.cos(rad) * dist;
      var lv = levelOf(n.inf);

      /* 소인은 방위에 맞춰 밝아집니다 — 주사선이 지날 때 칠해지는 것처럼. */
      var delay = -(geo.brg / 360) * SWEEP_SECONDS;
      var g = s2('g', {
        class: 'blip',
        style: 'animation-delay: ' + delay.toFixed(2) + 's'
      });
      g.appendChild(s2('circle', {
        class: 'blip__dot fill-' + lv.token, cx: x, cy: y,
        r: 3 + Math.min(4, n.inf / 22)
      }));
      /* 라벨은 화면 바깥쪽으로 붙입니다 — 서울 근처 국가들이 가운데에서
         서로 겹치는 것을 줄입니다. */
      if (n.inf >= 8) {
        var right = x >= R.cx;
        g.appendChild(s2('text', {
          class: 'blip__label', x: x + (right ? 8 : -8), y: y + 3,
          'text-anchor': right ? 'start' : 'end', text: n.code
        }));
      }
      g.appendChild(s2('title', {
        text: n.name + ' · ' + lv.label + ' ' + Math.round(n.inf) + '% · 방위 ' +
              Math.round(geo.brg) + '° · ' + Math.round(geo.km).toLocaleString('en-US') + 'km'
      }));
      ui.blips.appendChild(g);
    });
  }

  /* ---------------------------------------------------------- 재난문자 현황 -- */

  function renderAlerts() {
    clear(ui.alertCounts);
    var total = 0;
    S.alertClasses.forEach(function (c) { total += engine.alertCounts[c.id] || 0; });

    S.alertClasses.forEach(function (c) {
      var n = engine.alertCounts[c.id] || 0;
      ui.alertCounts.appendChild(el('div', { class: 'row' }, [
        el('span', { class: 'row__glyph tone-' + c.token, text: '■', 'aria-hidden': 'true' }),
        el('span', { class: 'row__label', text: c.label }),
        el('span', { class: 'row__n', text: num(n) })
      ]));
    });
    ui.alertCounts.appendChild(el('div', { class: 'row' }, [
      el('span', { class: 'row__label', text: '누적 발송' }),
      el('span', { class: 'row__n', text: num(total) + '건' })
    ]));

    clear(ui.alertLog);
    if (!engine.alerts.length) {
      ui.alertLog.appendChild(el('p', { class: 'empty', text: '발송 이력 없음' }));
      return;
    }
    engine.alerts.forEach(function (a) {
      var lang = S.alertLangs.filter(function (l) { return l.id === a.lang; })[0];
      ui.alertLog.appendChild(el('div', { class: 'sent' }, [
        el('div', { class: 'sent__hd' }, [
          el('span', { class: 'sent__cls tone-' + a.cls.token, text: a.cls.label }),
          el('span', { class: 'sent__lang', text: lang.short })
        ]),
        el('p', { class: 'sent__t', text: a.title })
      ]));
    });
  }

  function num(n) { return Number(n).toLocaleString('en-US'); }

  /* ------------------------------------------------------------- 파견 현황 -- */

  function renderDeployments() {
    clear(ui.deploys);
    if (!engine.deployments.length) {
      ui.deploys.appendChild(el('p', { class: 'empty', text: '전개 중인 부대 없음' }));
      return;
    }
    engine.deployments.forEach(function (d) {
      var label = S.deployStates[d.state];
      var tone = d.state === 0 ? 'warning' : d.state === 1 ? 'good' : 'dark';
      ui.deploys.appendChild(el('div', { class: 'deploy' }, [
        el('div', { class: 'deploy__hd' }, [
          el('span', { class: 'deploy__unit', text: d.unit }),
          el('span', { class: 'deploy__state tone-' + tone, text: label })
        ]),
        el('p', { class: 'deploy__dest', text: d.order + ' · ' + d.dest }),
        el('p', { class: 'deploy__size', text: d.size })
      ]));
    });
  }

  function renderNodes() {
    var total = engine.nodes.length;
    ui.nodesLost.textContent = engine.lostCount + ' / ' + total;

    clear(ui.sectors);
    D.partnerGroups.forEach(function (g) {
      var mine = engine.nodes.filter(function (nd) { return nd.sector === g.code; });
      var lost = mine.filter(function (nd) { return nd.lost; }).length;
      var pct = mine.length ? (lost / mine.length) * 100 : 0;
      var tone = pct >= 80 ? 'critical' : pct >= 50 ? 'serious'
        : pct > 0 ? 'warning' : 'good';
      ui.sectors.appendChild(el('div', { class: 'nodegroup' }, [
        el('div', { class: 'nodegroup__hd' }, [
          el('span', { class: 'nodegroup__code', text: g.code }),
          el('span', { text: g.short }),
          el('span', { class: 'nodegroup__n tone-' + tone, text: lost + ' / ' + mine.length })
        ]),
        el('div', { class: 'nodegroup__track' }, [
          el('div', { class: 'nodegroup__fill fill-' + tone, style: 'width: ' + pct + '%' })
        ])
      ]));
    });

    clear(ui.recent);
    var recent = engine.nodes.filter(function (nd) { return nd.lost; }).slice(-6).reverse();
    if (!recent.length) {
      ui.recent.appendChild(el('p', { class: 'empty', text: '전 노드 응답 중' }));
      return;
    }
    recent.forEach(function (nd) {
      ui.recent.appendChild(el('div', { class: 'lost' }, [
        el('div', { class: 'lost__hd' }, [
          el('span', { class: 'lost__node', text: nd.node }),
          el('span', { class: 'lost__name', text: nd.name, title: nd.name })
        ]),
        el('p', { class: 'lost__relay', text: '중계 ' + nd.relay })
      ]));
    });
  }

  function gaugeTone(v) {
    if (v >= 70) return 'good';
    if (v >= 45) return 'warning';
    if (v >= 20) return 'serious';
    return 'critical';
  }

  /* --------------------------------------------------------------- endings -- */

  function finish(won) {
    if (engine.ended) return;
    engine.ended = won ? 'win' : 'loss';
    engine.running = false;
    pauseTick();
    renderOutbreak();

    if (won) { runRecovery(); return; }

    var script = S.defeat;
    script.forEach(function (line) {
      global.setTimeout(function () {
        showBulletin({
          kind: won ? 'good' : 'critical',
          tag: won ? '복구' : '긴급',
          title: line.text,
          lines: [line.sub],
          archive: !!line.archive,
          final: !!line.final
        });
        if (line.final && won) global.setTimeout(restoreConsole, 2600);
      }, line.t);
    });
  }

  /* 복구는 50단계를 천천히 지나갑니다. 각 단계는 자체 진행 막대를 채우고
     스스로 다음으로 넘어갑니다 — 눌러야 넘어가는 경고와 다릅니다. */
  function runRecovery() {
    var stages = S.recovery;
    var i = 0;

    bulletinActive = true;
    pauseTick();
    global.WDMA_FROZEN = true;

    function paint() {
      var stage = stages[i];
      bulletinBox.className = 'bulletin bulletin--recovery';
      bulletinBox.hidden = false;
      clear(bulletinBox);

      var stageFill = el('div', { class: 'rec__fill' });
      var overallFill = el('div', {
        class: 'rec__fill rec__fill--all',
        style: 'width: ' + ((i / stages.length) * 100).toFixed(1) + '%'
      });

      bulletinBox.appendChild(el('div', { class: 'bulletin__bar' }));
      bulletinBox.appendChild(el('div', { class: 'bulletin__mid' }, [
        el('div', { class: 'bulletin__inner rec' }, [
          el('span', { class: 'bulletin__tag', text: '복구 절차' }),
          el('p', { class: 'rec__step', text: '단계 ' + pad2(i + 1) + ' / ' + stages.length }),
          el('h2', { class: 'bulletin__title', text: stage.t }),
          el('p', { class: 'rec__detail', text: stage.d }),
          el('div', { class: 'rec__track' }, [stageFill]),
          el('p', { class: 'rec__all-k', text: '전체 복구 진행' }),
          el('div', { class: 'rec__track rec__track--all' }, [overallFill]),
          el('p', {
            class: 'bulletin__meta',
            text: 'WDMA 대한민국 조정본부 · ' + nowDtg()
          })
        ])
      ]));
      bulletinBox.appendChild(el('div', { class: 'bulletin__bar' }));

      var p = 0;
      var hold = 1400 + Math.round(Math.random() * 900);
      var tickMs = 60;
      var iv = global.setInterval(function () {
        p = Math.min(100, p + (100 / (hold / tickMs)));
        stageFill.style.width = p.toFixed(1) + '%';
        overallFill.style.width = (((i + p / 100) / stages.length) * 100).toFixed(1) + '%';
        if (p >= 100) {
          global.clearInterval(iv);
          i += 1;
          if (i < stages.length) paint();
          else finishRecovery();
        }
      }, tickMs);
    }

    function finishRecovery() {
      bulletinBox.hidden = true;
      bulletinActive = false;
      global.WDMA_FROZEN = false;
      restoreConsole();
    }

    paint();
  }

  function restoreConsole() {
    document.body.classList.remove('is-outbreak');
    document.getElementById('outbreak').hidden = true;
    var banner = document.getElementById('restored');
    if (banner) banner.hidden = false;
  }

  /* ------------------------------------------------------------------ gate -- */

  var AUTH_STEPS = [
    '보안 회선 설정 ................ <b>완료</b>',
    '단말 무결성 KOR-S04 ........... <b>완료</b>',
    '인증서 연쇄 검증 .............. <b>유효</b>',
    '자격증명 대조 ................. <b>일치</b>',
    '취급구분 WDMA-COSMIC .......... <b>허가</b>'
  ];

  function bootGate() {
    var gate = document.getElementById('gate');
    var form = document.getElementById('gate-form');
    var log = document.getElementById('gate-log');
    var submit = document.getElementById('gate-submit');
    var idField = document.getElementById('gate-id');

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (submit.disabled) return;
      submit.disabled = true;
      submit.textContent = '인증 중';
      clear(log);

      var operator = (idField.value || 'OPERATOR').trim().toUpperCase().slice(0, 24);
      var i = 0;

      (function next() {
        if (i < AUTH_STEPS.length) {
          var line = document.createElement('div');
          line.innerHTML = '&gt; ' + AUTH_STEPS[i];
          log.appendChild(line);
          i += 1;
          global.setTimeout(next, 260 + Math.random() * 200);
          return;
        }
        var done = document.createElement('div');
        done.innerHTML = '&gt; <b>접속 허가</b> — ' + escapeHtml(operator) + ' 운용자';
        log.appendChild(done);
        global.setTimeout(function () { admit(operator, gate); }, 700);
      })();
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function admit(operator, gate) {
    gate.hidden = true;
    document.body.classList.remove('is-locked');

    var oprEl = document.getElementById('opr');
    if (oprEl) oprEl.textContent = 'WDMA-KOR/' + operator;

    global.setTimeout(function () {
      var b = S.bulletins[0];
      engine.fired[0] = true;
      showBulletin({ tag: b.tag, title: b.title, lines: b.lines, en: b.en, at: b.at, alert: true });
    }, FIRST_BULLETIN_AT);

    global.setTimeout(startOutbreak, OUTBREAK_AT);
  }

  /* ------------------------------------------------------------------ boot -- */

  function init() {
    bulletinBox = document.getElementById('bulletin');
    bootGate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Exposed so the scenario can be exercised headlessly during development. */
  global.WDMA_SIM = {
    engine: engine,
    actions: S.actions,
    run: runOrder,
    step: step,
    mean: meanInfection,
    start: startOutbreak
  };
})(window);
