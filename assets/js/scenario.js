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

  /* Model constants — tuned so an idle terminal is lost in roughly a hundred
     seconds, and an attentive one can just about hold the line. */
  var TICK_MS = 1000;
  var GROWTH = 0.052;          // logistic growth per second inside a nation
  var TRANSFER = 0.011;        // share pushed down each travel edge per second
  var CAPACITY_REGEN = 3.6;    // command capacity per second
  var VACCINE_BITE = 0.055;    // suppression per vaccine point per second
  var SEED = 'USA';

  var LOSS_AT = 88;            // mean infection that ends the exercise
  var WIN_INFECTION = 35;      // mean infection needed alongside a full program

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

    /* Warnings never clear themselves — the operator dismisses every one. The
       archive stage additionally holds its button until the write finishes. */
    var dismissable = !opts.final;
    var btn = null;
    if (dismissable) {
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
      if (!dismissable || (btn && btn.disabled)) return;
      if (ev.key === 'Enter' || ev.key === 'Escape' || ev.key === ' ') {
        ev.preventDefault();
        close();
      }
    }

    document.addEventListener('keydown', onKey);
    bulletinBox.focus();
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
      return { code: m.code, name: m.name, node: m.node, inf: 0 };
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

    engine.nations.forEach(function (n) {
      n.inf += n.inf * GROWTH * (1 - n.inf / 100);            // logistic growth
      n.inf -= (engine.vaccine / 100) * VACCINE_BITE * 100 * 0.1;  // counter-agent
      n.inf = Math.max(0, Math.min(100, n.inf));
    });

    var mean = meanInfection();

    /* Suppression alone never finishes it — while the counter-agent is
       incomplete, an uneliminated reservoir seeds a fresh cluster. Without
       this the operator can crush the contagion and then sit in a stalemate
       that neither side can end. */
    /* Held off for the opening minute so the contagion visibly walks out of
       the seed nation before the anti-stall reservoir starts biting. */
    if (engine.t > 25 && mean < 3 && engine.vaccine < 100) {
      var seed = engine.nations[Math.floor(Math.random() * engine.nations.length)];
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

    checkNodes(mean);
    fireBulletins(mean);
    emitSignals();
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

  function fireBulletins(mean) {
    for (var i = 1; i < S.bulletins.length; i += 1) {
      var b = S.bulletins[i];
      if (!engine.fired[i] && mean >= b.at) {
        engine.fired[i] = true;
        showBulletin({ tag: b.tag, title: b.title, lines: b.lines });
        return;
      }
    }
  }

  var PREC_BY_LEVEL = {
    secure: '통상', elevated: '우선', contested: '긴급',
    overrun: '최긴급', dark: '최긴급'
  };

  function emitSignals() {
    var pool = engine.nations.filter(function (n) { return n.inf > 0.5; });
    if (!pool.length) pool = engine.nations.slice(0, 4);

    var count = 2 + Math.floor(Math.random() * 3);
    for (var i = 0; i < count; i += 1) {
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

  function runAction(action) {
    if (bulletinActive || engine.ended || !engine.running) return;
    if (engine.capacity < action.cost) return;
    if (engine.cooldown[action.id] > 0) return;

    engine.capacity -= action.cost;
    engine.cooldown[action.id] = action.cooldown;

    var worst = engine.nations.slice().sort(function (a, b) { return b.inf - a.inf; });

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
      engine.vaccine = Math.min(100, engine.vaccine + 13);
      note('대응제 개발 진척 ' + Math.round(engine.vaccine) + '%');
    } else if (action.id === 'martial') {
      engine.nations.forEach(function (n) { n.inf = Math.max(0, n.inf - 9); });
      engine.civil = Math.max(0, engine.civil - 16);
      note('계엄 선포 — 민간 기능 저하');
    }

    renderOutbreak();
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
    ui.acts = el('div', { class: 'acts' });
    ui.sectors = el('div', { class: 'rows' });
    ui.recent = el('div', { class: 'rows' });

    var actions = S.actions.map(function (a) {
      var btn = el('button', { class: 'act', type: 'button' }, [
        el('span', { class: 'act__key', text: a.key }),
        el('span', { text: a.name }),
        el('span', { class: 'act__cost', text: a.cost }),
        el('span', { class: 'act__brief', text: a.brief })
      ]);
      btn.addEventListener('click', function () { runAction(a); });
      a._btn = btn;
      return btn;
    });
    actions.forEach(function (b) { ui.acts.appendChild(b); });

    host.appendChild(el('div', { class: 'ob-grid' }, [
      panel('전지구 점령 상황판', '1급기밀', ui.nations),
      panel('수신 전문', '1급기밀', ui.feed),
      el('div', { class: 'ob-col' }, [
        panel('지휘 조치', '1급기밀', el('div', null, [
          ui.gauges,
          el('p', { class: 'subhead', text: '조치 명령' }),
          ui.acts
        ])),
        panel('연합 노드 현황', '1급기밀', el('div', null, [
          ui.sectors,
          el('p', { class: 'subhead', text: '최근 상실 · 전달 경로' }),
          ui.recent
        ]))
      ])
    ]));

    document.addEventListener('keydown', onActionKey);
  }

  function setActionsEnabled(on) {
    S.actions.forEach(function (a) {
      if (!a._btn) return;
      if (!on) a._btn.disabled = true;
      else a._btn.disabled = engine.capacity < a.cost ||
        engine.cooldown[a.id] > 0 || !!engine.ended;
    });
  }

  function onActionKey(ev) {
    if (bulletinActive || engine.ended || !engine.running) return;
    if (ev.target && /^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName)) return;
    var key = ev.key.toUpperCase();
    S.actions.forEach(function (a) {
      if (a.key === key) { ev.preventDefault(); runAction(a); }
    });
  }

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
      { k: '민간 기능', v: engine.civil, tone: gaugeTone(engine.civil) }
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

    renderNodes();

    S.actions.forEach(function (a) {
      if (!a._btn) return;
      var blocked = bulletinActive || engine.capacity < a.cost ||
        engine.cooldown[a.id] > 0 || !!engine.ended;
      a._btn.disabled = blocked;
      a._btn.querySelector('.act__cost').textContent =
        engine.cooldown[a.id] > 0 ? 'T-' + engine.cooldown[a.id] : a.cost;
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

    var script = won ? S.victory : S.defeat;
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
      showBulletin({ tag: b.tag, title: b.title, lines: b.lines });
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
    run: runAction,
    step: step,
    mean: meanInfection,
    start: startOutbreak
  };
})(window);
