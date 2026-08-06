/* WDMA GLOBAL OPERATIONS COMMAND — console UI.
 *
 * Charts are hand-built SVG so the console stays dependency-free and runs from
 * disk. Mark colours are written as CSS custom properties in inline styles, so a
 * theme change repaints them without a re-render.
 */
(function (global) {
  'use strict';

  var D = global.WDMA_DATA;
  var SVG_NS = 'http://www.w3.org/2000/svg';

  var SERIES_VAR = { hydro: 'var(--series-1)', geo: 'var(--series-2)', bio: 'var(--series-3)' };
  var STATUS_VAR = {
    critical: 'var(--status-critical)',
    serious: 'var(--status-serious)',
    warning: 'var(--status-warning)',
    good: 'var(--status-good)'
  };

  var state = {
    region: 'all',
    hazard: 'all',
    severity: 'all',
    windowDays: 365,
    hidden: {}
  };

  /* -------------------------------------------------------------- helpers -- */

  function h(tag, props, kids) {
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

  function s(tag, attrs, kids) {
    var node = document.createElementNS(SVG_NS, tag);
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

  function num(n) { return Number(n).toLocaleString('en-US'); }

  function trimZero(str) { return str.replace(/\.0$/, ''); }

  function compact(n) {
    if (n >= 1e9) return trimZero((n / 1e9).toFixed(1)) + 'B';
    if (n >= 1e6) return trimZero((n / 1e6).toFixed(1)) + 'M';
    if (n >= 1e4) return trimZero((n / 1e3).toFixed(1)) + 'K';
    return num(Math.round(n));
  }

  function plural(n, one, many) { return num(n) + ' ' + (n === 1 ? one : many); }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function hoursMins(v) {
    return Math.floor(v) + 'H' + pad2(Math.round((v - Math.floor(v)) * 60)) + 'M';
  }

  function median(list) {
    if (!list.length) return 0;
    var sorted = list.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function hazardMeta(key) {
    return D.hazards.filter(function (x) { return x.key === key; })[0];
  }

  function sevMeta(key) {
    return D.severities.filter(function (x) { return x.key === key; })[0];
  }

  function niceScale(maxVal, count) {
    if (!maxVal || maxVal <= 0) return { max: 1, ticks: [0, 1] };
    var raw = maxVal / count;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var norm = raw / mag;
    var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
    var max = Math.ceil(maxVal / step) * step;
    var ticks = [];
    for (var v = 0; v <= max + step / 1000; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return { max: max, ticks: ticks };
  }

  /* ------------------------------------------------------------- partners -- */

  function renderPartners() {
    var grid = document.getElementById('pgrid');
    clear(grid);

    D.partnerGroups.forEach(function (g) {
      var body = h('tbody', null, g.members.map(function (m) {
        return h('tr', null, [
          h('td', { class: 'proster__node', text: m.node }),
          h('td', { class: 'proster__name', text: m.name }),
          h('td', { class: 'proster__tag', text: m.tag })
        ]);
      }));

      grid.appendChild(h('section', { class: 'panel' }, [
        h('div', { class: 'panel__head' }, [
          h('h3', { class: 'panel__title', text: g.title }),
          h('span', { class: 'panel__mark', text: g.marking })
        ]),
        h('p', { class: 'panel__sub', text: g.role }),
        h('div', { class: 'panel__body panel__body--flush' }, [
          h('table', { class: 'proster' }, [
            h('caption', { class: 'vh', text: g.title + ' partner roster' }),
            body
          ])
        ])
      ]));
    });

    var states = document.getElementById('states');
    clear(states);
    D.memberStates.forEach(function (st) {
      states.appendChild(h('div', { class: 'state' }, [
        h('span', { class: 'state__node', text: st.node }),
        h('span', { class: 'state__code', text: st.code }),
        h('span', { class: 'state__name', text: st.name, title: st.name })
      ]));
    });

    var orgs = D.partnerGroups.reduce(function (a, g) { return a + g.members.length; }, 0);
    document.getElementById('partner-note').textContent =
      orgs + ' ORGANIZATIONS · ' + D.partnerGroups.length + ' SECTORS · ' +
      D.memberStates.length + ' MEMBER STATES';
  }

  /* -------------------------------------------------------------- filters -- */

  function fillSelect(id, options) {
    var sel = document.getElementById(id);
    clear(sel);
    options.forEach(function (o) { sel.appendChild(h('option', { value: o.v, text: o.t })); });
  }

  function buildFilters() {
    fillSelect('f-region', [{ v: 'all', t: 'ALL AO' }].concat(
      D.regions.map(function (r) { return { v: r, t: D.aoCode[r] + ' · ' + r }; })));

    fillSelect('f-hazard', [{ v: 'all', t: 'ALL CLASSES' }].concat(
      D.hazards.map(function (x) { return { v: x.key, t: x.short + ' · ' + x.label }; })));

    fillSelect('f-severity', [{ v: 'all', t: 'ALL PRECEDENCE' }].concat(
      D.severities.map(function (x) { return { v: x.key, t: x.tier + ' · ' + x.label }; })));

    fillSelect('f-window', [
      { v: '90', t: 'LAST 90 DAYS' },
      { v: '180', t: 'LAST 180 DAYS' },
      { v: '365', t: 'LAST 12 MONTHS' }
    ]);
    document.getElementById('f-window').value = String(state.windowDays);

    var map = { 'f-region': 'region', 'f-hazard': 'hazard', 'f-severity': 'severity' };
    Object.keys(map).concat(['f-window']).forEach(function (id) {
      document.getElementById(id).addEventListener('change', function (e) {
        if (map[id]) state[map[id]] = e.target.value;
        else state.windowDays = Number(e.target.value);
        renderOps();
      });
    });

    document.getElementById('f-reset').addEventListener('click', function () {
      state.region = 'all';
      state.hazard = 'all';
      state.severity = 'all';
      state.windowDays = 365;
      ['f-region', 'f-hazard', 'f-severity'].forEach(function (id) {
        document.getElementById(id).value = 'all';
      });
      document.getElementById('f-window').value = '365';
      renderOps();
    });
  }

  function filtered() {
    return D.incidents.filter(function (inc) {
      if (state.region !== 'all' && inc.region !== state.region) return false;
      if (state.hazard !== 'all' && inc.hazard !== state.hazard) return false;
      if (state.severity !== 'all' && inc.severity !== state.severity) return false;
      return inc.ageDays <= state.windowDays;
    });
  }

  /* Bucket rows into 30-day periods, oldest first. */
  function bucket(rows, periods, field) {
    var out = [];
    for (var i = 0; i < periods; i += 1) out.push(field === 'median' ? [] : 0);
    rows.forEach(function (r) {
      var idx = periods - 1 - Math.min(periods - 1, Math.floor(r.ageDays / 30));
      if (field === 'median') out[idx].push(r.activationH);
      else if (field) out[idx] += r[field];
      else out[idx] += 1;
    });
    return field === 'median' ? out.map(median) : out;
  }

  /* ------------------------------------------------------------- readouts -- */

  function renderReadouts(rows) {
    var host = document.getElementById('readouts');
    clear(host);

    var periods = Math.max(3, Math.round(state.windowDays / 30));
    var now = rows.filter(function (r) { return r.ageDays < 30; });
    var prior = rows.filter(function (r) { return r.ageDays >= 30 && r.ageDays < 60; });
    var sum = function (list, f) {
      return list.reduce(function (a, r) { return a + r[f]; }, 0);
    };

    var aos = {};
    rows.forEach(function (r) { aos[r.ao] = true; });
    var flash = rows.filter(function (r) { return r.severity === 'critical'; }).length;

    host.appendChild(h('article', { class: 'panel ro ro--hero' }, [
      h('p', { class: 'ro__k', text: 'POPULATION UNDER ACTIVE ADVISORY' }),
      h('p', { class: 'ro__v', text: compact(sum(rows, 'affected')) }),
      h('p', { class: 'ro__d', text: 'INSIDE AN ACTIVE ADVISORY PERIMETER' }),
      h('div', { class: 'ro__foot' }, [
        kv('P1 FLASH', num(flash)),
        kv('TASKINGS', num(rows.length)),
        kv('AO ACTIVE', num(Object.keys(aos).length)),
        kv('WINDOW', state.windowDays + 'D')
      ])
    ]));

    [
      {
        k: 'ACTIVE TASKINGS',
        v: num(rows.length),
        spark: bucket(rows, periods),
        d: delta(now.length, prior.length, 'up-is-bad')
      },
      {
        k: 'PARTNER ASSETS COMMITTED',
        v: num(sum(rows, 'assets')),
        spark: bucket(rows, periods, 'assets'),
        d: delta(sum(now, 'assets'), sum(prior, 'assets'), 'up-is-good')
      },
      {
        k: 'RELIEF FUNDING ALLOCATED',
        v: '$' + trimZero((sum(rows, 'fundingM') / 1000).toFixed(1)) + 'B',
        spark: bucket(rows, periods, 'fundingM'),
        d: delta(sum(now, 'fundingM'), sum(prior, 'fundingM'), 'up-is-good')
      },
      {
        k: 'MEDIAN ACTIVATION',
        v: hoursMins(median(rows.map(function (r) { return r.activationH; }))),
        spark: bucket(rows, periods, 'median'),
        d: delta(
          median(now.map(function (r) { return r.activationH; })),
          median(prior.map(function (r) { return r.activationH; })),
          'down-is-good'
        )
      }
    ].forEach(function (t) {
      host.appendChild(h('article', { class: 'panel ro' }, [
        h('p', { class: 'ro__k', text: t.k }),
        h('p', { class: 'ro__v', text: t.v }),
        t.d
          ? h('p', { class: 'ro__d ' + t.d.cls }, [h('b', { text: t.d.text }), ' VS PRIOR 30D'])
          : h('p', { class: 'ro__d', text: 'NO PRIOR PERIOD' }),
        h('div', { class: 'ro__spark' }, [spark(t.spark)])
      ]));
    });
  }

  function kv(k, v) {
    return h('span', { class: 'kv' }, [
      h('span', { class: 'kv__k', text: k }),
      h('span', { class: 'kv__v', text: v })
    ]);
  }

  function delta(now, before, direction) {
    if (!before) return null;
    var diff = now - before;
    var pct = Math.round((diff / before) * 100);
    if (!pct) return { text: 'NO CHANGE', cls: '' };
    var better = direction === 'down-is-good' ? diff < 0
      : direction === 'up-is-bad' ? diff < 0 : diff > 0;
    return {
      text: (diff > 0 ? '+' : '−') + Math.abs(pct) + '%',
      cls: better ? 'is-good' : 'is-bad'
    };
  }

  /* De-emphasised track with the current period in the accent. */
  function spark(values) {
    var W = 160, H = 26, pad = 3;
    var svg = s('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      preserveAspectRatio: 'none',
      'aria-hidden': 'true',
      focusable: 'false'
    });
    if (values.length < 2) return svg;

    var max = Math.max.apply(null, values);
    var min = Math.min.apply(null, values);
    var span = max - min || 1;
    var x = function (i) { return pad + (i / (values.length - 1)) * (W - pad * 2); };
    var y = function (v) { return H - pad - ((v - min) / span) * (H - pad * 2); };

    svg.appendChild(s('path', {
      d: values.map(function (v, i) {
        return (i ? 'L' : 'M') + x(i).toFixed(2) + ' ' + y(v).toFixed(2);
      }).join(' '),
      fill: 'none',
      'stroke-width': 1.5,
      'stroke-linejoin': 'round',
      style: 'stroke: var(--text-muted)'
    }));

    var last = values.length - 1;
    svg.appendChild(s('path', {
      d: 'M' + x(last - 1).toFixed(2) + ' ' + y(values[last - 1]).toFixed(2) +
         ' L' + x(last).toFixed(2) + ' ' + y(values[last]).toFixed(2),
      fill: 'none',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      style: 'stroke: var(--series-1)'
    }));
    svg.appendChild(s('circle', {
      cx: x(last).toFixed(2), cy: y(values[last]).toFixed(2), r: 2.2,
      style: 'fill: var(--series-1)'
    }));

    return svg;
  }

  /* ----------------------------------------------------------- line chart -- */

  function renderVolume() {
    var fig = document.getElementById('fig-volume');
    var plot = fig.querySelector('[data-plot]');
    var legendHost = fig.querySelector('[data-legend]');
    var tableHost = fig.querySelector('[data-table]');

    var count = Math.max(3, Math.min(D.months.length, Math.round(state.windowDays / 30)));
    var months = D.months.slice(D.months.length - count);
    var regions = state.region === 'all' ? D.regions : [state.region];
    var hazards = state.hazard === 'all' ? D.hazards
      : D.hazards.filter(function (x) { return x.key === state.hazard; });

    var series = hazards.map(function (hz) {
      return {
        key: hz.key,
        label: hz.short,
        full: hz.label,
        color: SERIES_VAR[hz.key],
        values: months.map(function (_, i) {
          var off = D.months.length - count + i;
          return regions.reduce(function (a, r) { return a + D.monthly[r][hz.key][off]; }, 0);
        })
      };
    });

    var shown = series.filter(function (sr) { return !state.hidden[sr.key]; });

    clear(plot);
    plot.appendChild(lineSvg(months, shown.length ? shown : series, plot));

    clear(legendHost);
    series.forEach(function (sr) {
      var on = !state.hidden[sr.key];
      var btn = h('button', {
        class: 'legend-item', type: 'button', 'aria-pressed': String(on),
        title: (on ? 'Hide ' : 'Show ') + sr.full
      }, [
        h('span', { class: 'legend-key', style: 'background: ' + sr.color }),
        h('span', { text: sr.label }),
        h('span', { class: 'legend-item__v', text: num(sr.values[sr.values.length - 1]) })
      ]);
      btn.addEventListener('click', function () {
        var anyOther = series.some(function (o) {
          return o.key !== sr.key && !state.hidden[o.key];
        });
        if (on && !anyOther) return;
        state.hidden[sr.key] = on;
        renderVolume();
      });
      legendHost.appendChild(btn);
    });

    clear(tableHost);
    tableHost.appendChild(h('table', { class: 'data' }, [
      h('caption', { text: 'REPORTED EVENTS PER MONTH BY HAZARD CLASS' }),
      h('thead', null, [h('tr', null, [h('th', { scope: 'col', text: 'MONTH' })].concat(
        series.map(function (sr) {
          return h('th', { scope: 'col', class: 'num', text: sr.label });
        })))]),
      h('tbody', null, months.map(function (m, i) {
        return h('tr', null, [h('th', { scope: 'row', text: m })].concat(
          series.map(function (sr) {
            return h('td', { class: 'num', text: num(sr.values[i]) });
          })));
      }))
    ]));
  }

  function lineSvg(months, series, plotHost) {
    var W = 780, H = 286;
    var padL = 44, padR = 66, padT = 12, padB = 28;
    var innerW = W - padL - padR;
    var innerH = H - padT - padB;

    var maxVal = 0;
    series.forEach(function (sr) {
      sr.values.forEach(function (v) { if (v > maxVal) maxVal = v; });
    });
    var scale = niceScale(maxVal, 4);

    var x = function (i) {
      return months.length === 1 ? padL + innerW / 2
        : padL + (i / (months.length - 1)) * innerW;
    };
    var y = function (v) { return padT + innerH - (v / scale.max) * innerH; };

    var svg = s('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      tabindex: '0',
      'aria-label': 'Reported events per month by hazard class. Use the table view for exact values.'
    });

    scale.ticks.forEach(function (t) {
      svg.appendChild(s('line', { class: 'ax-grid', x1: padL, x2: padL + innerW, y1: y(t), y2: y(t) }));
      svg.appendChild(s('text', { class: 'ax-text ax-text--end', x: padL - 9, y: y(t) + 3.5, text: num(t) }));
    });
    svg.appendChild(s('line', { class: 'ax-line', x1: padL, x2: padL + innerW, y1: y(0), y2: y(0) }));

    months.forEach(function (m, i) {
      svg.appendChild(s('text', {
        class: 'ax-text ax-text--mid', x: x(i), y: H - padB + 17,
        text: (months.length > 9 ? m.slice(0, 3) : m).toUpperCase()
      }));
    });

    var crosshair = s('line', { class: 'crosshair', y1: padT, y2: padT + innerH, x1: 0, x2: 0, opacity: 0 });
    svg.appendChild(crosshair);

    series.forEach(function (sr) {
      svg.appendChild(s('path', {
        class: 'mark-line',
        d: sr.values.map(function (v, i) {
          return (i ? 'L' : 'M') + x(i).toFixed(2) + ' ' + y(v).toFixed(2);
        }).join(' '),
        style: 'stroke: ' + sr.color
      }));
    });

    /* End markers, then endpoint labels only where they don't collide. */
    var last = months.length - 1;
    var placed = [];
    series.map(function (sr) {
      return { sr: sr, y: y(sr.values[last]), v: sr.values[last] };
    }).sort(function (a, b) { return a.y - b.y; }).forEach(function (e) {
      svg.appendChild(s('circle', {
        class: 'mark-dot', cx: x(last), cy: e.y, r: 4, style: 'fill: ' + e.sr.color
      }));
      if (!placed.some(function (p) { return Math.abs(p - e.y) < 14; })) {
        placed.push(e.y);
        svg.appendChild(s('text', {
          class: 'mark-label', x: x(last) + 11, y: e.y + 3.5, text: num(e.v)
        }));
      }
    });

    var dots = series.map(function (sr) {
      var dot = s('circle', { class: 'mark-dot', cx: 0, cy: 0, r: 4, opacity: 0, style: 'fill: ' + sr.color });
      svg.appendChild(dot);
      return dot;
    });

    var tip = h('div', { class: 'tip' });
    plotHost.appendChild(tip);
    svg.appendChild(s('rect', { class: 'hit', x: padL - 14, y: padT, width: innerW + 28, height: innerH }));

    var cursor = 0;

    function show(index) {
      var i = Math.max(0, Math.min(months.length - 1, index));
      cursor = i;
      crosshair.setAttribute('x1', x(i));
      crosshair.setAttribute('x2', x(i));
      crosshair.setAttribute('opacity', 1);
      dots.forEach(function (dot, k) {
        dot.setAttribute('cx', x(i));
        dot.setAttribute('cy', y(series[k].values[i]));
        dot.setAttribute('opacity', 1);
      });

      clear(tip);
      tip.appendChild(h('p', { class: 'tip__t', text: months[i].toUpperCase() }));
      series.forEach(function (sr) {
        tip.appendChild(h('div', { class: 'tip__r' }, [
          h('span', { class: 'tip__k', style: 'background: ' + sr.color }),
          h('span', { text: sr.label }),
          h('span', { class: 'tip__v', text: num(sr.values[i]) })
        ]));
      });

      var ratio = svg.getBoundingClientRect().width / W;
      tip.style.left = (x(i) * ratio) + 'px';
      tip.style.top = (padT * ratio - 8) + 'px';
      tip.classList.add('is-on');
    }

    function hide() {
      crosshair.setAttribute('opacity', 0);
      dots.forEach(function (dot) { dot.setAttribute('opacity', 0); });
      tip.classList.remove('is-on');
    }

    svg.addEventListener('mousemove', function (ev) {
      var rect = svg.getBoundingClientRect();
      var px = ((ev.clientX - rect.left) / rect.width) * W;
      if (px < padL - 20 || px > padL + innerW + 20) { hide(); return; }
      var step = months.length > 1 ? innerW / (months.length - 1) : innerW;
      show(Math.round((px - padL) / step));
    });
    svg.addEventListener('mouseleave', hide);
    svg.addEventListener('focus', function () { show(cursor); });
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight') { show(cursor + 1); ev.preventDefault(); }
      else if (ev.key === 'ArrowLeft') { show(cursor - 1); ev.preventDefault(); }
      else if (ev.key === 'Escape') hide();
    });

    return svg;
  }

  /* ------------------------------------------------------------ bar chart -- */

  var AO_LABEL = {};

  function renderAO(rows) {
    var fig = document.getElementById('fig-region');
    var plot = fig.querySelector('[data-plot]');
    var tableHost = fig.querySelector('[data-table]');

    var counts = D.regions.map(function (r) {
      return {
        code: D.aoCode[r],
        label: r,
        value: rows.filter(function (inc) { return inc.region === r; }).length
      };
    }).sort(function (a, b) { return b.value - a.value; });

    /* Draw at the container's real pixel width so labels render at true size
       instead of being scaled down with the viewBox. */
    var width = Math.round(Math.max(300, Math.min(560, plot.clientWidth || 420)));
    clear(plot);
    plot.appendChild(barSvg(counts, plot, width));

    clear(tableHost);
    tableHost.appendChild(h('table', { class: 'data' }, [
      h('caption', { text: 'ACTIVE TASKINGS BY AREA OF OPERATIONS' }),
      h('thead', null, [h('tr', null, [
        h('th', { scope: 'col', text: 'AO' }),
        h('th', { scope: 'col', text: 'REGION' }),
        h('th', { scope: 'col', class: 'num', text: 'TASKINGS' })
      ])]),
      h('tbody', null, counts.map(function (c) {
        return h('tr', null, [
          h('th', { scope: 'row', class: 'key', text: c.code }),
          h('td', { text: c.label }),
          h('td', { class: 'num', text: num(c.value) })
        ]);
      }))
    ]));
  }

  function barSvg(rowsData, plotHost, W) {
    var band = 30, barH = 15;
    var padL = 62, padR = 40, padT = 4;
    var innerW = W - padL - padR;
    var bottom = padT + rowsData.length * band;
    var H = bottom + 22;

    var maxVal = Math.max.apply(null, rowsData.map(function (r) { return r.value; }));
    var scale = niceScale(maxVal, 3);

    var svg = s('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Active taskings by area of operations, ranked.'
    });

    scale.ticks.forEach(function (t) {
      var gx = padL + (t / scale.max) * innerW;
      svg.appendChild(s('line', { class: 'ax-grid', x1: gx, x2: gx, y1: padT, y2: bottom }));
      svg.appendChild(s('text', { class: 'ax-text ax-text--mid', x: gx, y: bottom + 15, text: num(t) }));
    });
    svg.appendChild(s('line', { class: 'ax-line', x1: padL, x2: padL, y1: padT, y2: bottom }));

    var tip = h('div', { class: 'tip' });
    plotHost.appendChild(tip);

    rowsData.forEach(function (row, i) {
      var yTop = padT + i * band + (band - barH) / 2;
      var w = scale.max ? (row.value / scale.max) * innerW : 0;

      svg.appendChild(s('text', {
        class: 'ax-text ax-text--end', x: padL - 10, y: yTop + barH / 2 + 3.5,
        text: row.code, style: 'fill: var(--series-1)'
      }, [s('title', { text: row.label })]));

      svg.appendChild(s('path', { d: roundedBar(padL, yTop, w, barH, 3), style: 'fill: var(--series-1)' }));
      svg.appendChild(s('text', {
        class: 'mark-label', x: padL + w + 8, y: yTop + barH / 2 + 3.5, text: num(row.value)
      }));

      /* Hit target spans the full band so it clears the minimum touch size. */
      var hit = s('rect', { class: 'hit', x: padL, y: padT + i * band, width: innerW + padR, height: band });
      hit.addEventListener('mouseenter', function () {
        clear(tip);
        tip.appendChild(h('p', { class: 'tip__t', text: row.code + ' · ' + row.label }));
        tip.appendChild(h('div', { class: 'tip__r' }, [
          h('span', { class: 'tip__k', style: 'background: var(--series-1)' }),
          h('span', { text: 'TASKINGS' }),
          h('span', { class: 'tip__v', text: num(row.value) })
        ]));
        var rect = svg.getBoundingClientRect();
        var ratio = rect.width / W;
        tip.style.left = Math.min(rect.width - 16, (padL + w) * ratio) + 'px';
        tip.style.top = ((yTop - 4) * ratio) + 'px';
        tip.classList.add('is-on');
      });
      hit.addEventListener('mouseleave', function () { tip.classList.remove('is-on'); });
      svg.appendChild(hit);
    });

    return svg;
  }

  /* Square at the baseline, rounded at the data end. */
  function roundedBar(x, y, w, hgt, r) {
    if (w <= 0.5) return 'M' + x + ' ' + y + ' L' + x + ' ' + (y + hgt);
    var rad = Math.min(r, w);
    return 'M' + x + ' ' + y +
      ' H' + (x + w - rad) +
      ' A' + rad + ' ' + rad + ' 0 0 1 ' + (x + w) + ' ' + (y + rad) +
      ' V' + (y + hgt - rad) +
      ' A' + rad + ' ' + rad + ' 0 0 1 ' + (x + w - rad) + ' ' + (y + hgt) +
      ' H' + x + ' Z';
  }

  /* ------------------------------------------------------- precedence mix -- */

  function renderPrecedence(rows) {
    var fig = document.getElementById('fig-prec');
    var plot = fig.querySelector('[data-plot]');
    var legendHost = fig.querySelector('[data-legend]');
    var tableHost = fig.querySelector('[data-table]');

    var total = rows.length;
    var parts = D.severities.map(function (sv) {
      var n = rows.filter(function (r) { return r.severity === sv.key; }).length;
      return { meta: sv, n: n, pct: total ? (n / total) * 100 : 0 };
    });

    clear(plot);
    if (!total) {
      plot.appendChild(h('p', { class: 'empty', text: 'NO TASKINGS IN SCOPE' }));
    } else {
      var stack = h('div', {
        class: 'stack', role: 'img',
        'aria-label': 'Share of active taskings by message precedence'
      });
      parts.forEach(function (p) {
        if (!p.n) return;
        stack.appendChild(h('div', {
          class: 'stack__seg',
          style: 'flex: ' + p.n + ' 1 0%; background: ' + STATUS_VAR[p.meta.token],
          title: p.meta.tier + ' ' + p.meta.label + ' — ' + num(p.n) +
            ' taskings (' + p.pct.toFixed(1) + '%)'
        }));
      });
      plot.appendChild(stack);
    }

    clear(legendHost);
    parts.forEach(function (p) {
      legendHost.appendChild(h('div', { class: 'row' }, [
        h('span', {
          class: 'row__glyph', style: 'color: ' + STATUS_VAR[p.meta.token],
          text: p.meta.glyph, 'aria-hidden': 'true'
        }),
        h('span', { class: 'row__code', text: p.meta.tier }),
        h('span', { class: 'row__label', text: p.meta.label }),
        h('span', { class: 'row__n', text: num(p.n) }),
        h('span', { class: 'row__pct', text: p.pct.toFixed(1) + '%' })
      ]));
    });

    var phases = {};
    rows.forEach(function (r) { phases[r.phase] = (phases[r.phase] || 0) + 1; });
    var phaseHost = document.getElementById('phase-rows');
    clear(phaseHost);
    ['EXECUTE', 'DEPLOY', 'ASSESS', 'SUSTAIN', 'RECOVER'].forEach(function (p) {
      phaseHost.appendChild(h('div', { class: 'row' }, [
        h('span', { class: 'row__label', text: p }),
        h('span', { class: 'row__n', text: num(phases[p] || 0) })
      ]));
    });

    clear(tableHost);
    tableHost.appendChild(h('table', { class: 'data' }, [
      h('caption', { text: 'ACTIVE TASKINGS BY MESSAGE PRECEDENCE' }),
      h('thead', null, [h('tr', null, [
        h('th', { scope: 'col', text: 'CODE' }),
        h('th', { scope: 'col', text: 'PRECEDENCE' }),
        h('th', { scope: 'col', class: 'num', text: 'TASKINGS' }),
        h('th', { scope: 'col', class: 'num', text: 'SHARE' })
      ])]),
      h('tbody', null, parts.map(function (p) {
        return h('tr', null, [
          h('th', { scope: 'row', class: 'key', text: p.meta.tier }),
          h('td', { text: p.meta.label }),
          h('td', { class: 'num', text: num(p.n) }),
          h('td', { class: 'num', text: p.pct.toFixed(1) + '%' })
        ]);
      }))
    ]));
  }

  /* ------------------------------------------------------------- tasking --- */

  function renderTasking(rows) {
    var host = document.getElementById('tasking');
    clear(host);

    document.getElementById('tasking-count').textContent =
      num(rows.length) + ' / ' + num(D.incidents.length) + ' IN SCOPE';

    if (!rows.length) {
      host.appendChild(h('p', {
        class: 'empty', text: 'NO TASKINGS MATCH CURRENT SCOPE — RESET FILTERS'
      }));
      return;
    }

    var cols = ['TASK ID', 'CALLSIGN', 'PREC', 'EVENT', 'AO', 'GRID REF',
      'CLASS', 'AFFECTED', 'ASSETS', 'LEAD ELEMENT', 'PHASE', 'LAST RPT'];
    var nums = { AFFECTED: 1, ASSETS: 1, 'LAST RPT': 1 };

    var head = h('tr', null, cols.map(function (c) {
      return h('th', { scope: 'col', class: nums[c] ? 'num' : '', text: c });
    }));

    var body = rows.slice(0, 40).map(function (inc) {
      var sv = sevMeta(inc.severity);
      var hz = hazardMeta(inc.hazard);
      return h('tr', null, [
        h('td', { class: 'key', text: inc.id }),
        h('td', { text: inc.callsign }),
        h('td', null, [
          h('span', { class: 'chip chip--' + sv.token }, [
            h('span', { class: 'chip__g', text: sv.glyph, 'aria-hidden': 'true' }),
            h('span', { text: sv.tier + ' ' + sv.label })
          ])
        ]),
        h('td', { class: 'ev clip', text: inc.event, title: inc.event }),
        h('td', { text: inc.ao, title: inc.region }),
        h('td', { text: inc.grid }),
        h('td', { text: hz.short, title: hz.label }),
        h('td', { class: 'num', text: compact(inc.affected) }),
        h('td', { class: 'num', text: num(inc.assets) }),
        h('td', { class: 'clip', text: inc.leadNode + ' ' + inc.lead, title: inc.lead }),
        h('td', { text: inc.phase }),
        h('td', { class: 'num', text: inc.lastRpt })
      ]);
    });

    host.appendChild(h('table', { class: 'data' }, [
      h('caption', {
        text: 'PRECEDENCE ORDER · SHOWING ' + Math.min(40, rows.length) + ' OF ' +
          plural(rows.length, 'TASKING', 'TASKINGS')
      }),
      h('thead', null, [head]),
      h('tbody', null, body)
    ]));
  }

  /* ----------------------------------------------------------- readiness --- */

  function renderReadiness() {
    var host = document.getElementById('meters');
    clear(host);

    D.capacity.forEach(function (c) {
      var pct = Math.round((c.committed / c.total) * 100);
      host.appendChild(h('div', { class: 'meter' }, [
        h('div', { class: 'meter__head' }, [
          h('span', { class: 'meter__code', text: c.code }),
          h('span', { class: 'meter__label', text: c.label }),
          pct >= 85 ? h('span', { class: 'chip chip--warning' }, [
            h('span', { class: 'chip__g', text: '●', 'aria-hidden': 'true' }),
            h('span', { text: 'STRAINED' })
          ]) : null,
          h('span', { class: 'meter__v', text: pct + '%' })
        ]),
        h('div', {
          class: 'meter__track', role: 'meter', 'aria-valuenow': String(pct),
          'aria-valuemin': '0', 'aria-valuemax': '100',
          'aria-label': c.label + ' committed'
        }, [h('div', { class: 'meter__fill', style: 'width: ' + pct + '%' })]),
        h('p', {
          class: 'meter__sub',
          text: num(c.committed) + ' / ' + num(c.total) + ' ' + c.unit + ' COMMITTED'
        })
      ]));
    });

    var posture = document.getElementById('posture');
    clear(posture);
    D.posture.forEach(function (p) {
      posture.appendChild(h('div', { class: 'row' }, [
        h('span', { class: 'row__code', text: p.code }),
        h('span', { class: 'row__label', text: p.label }),
        h('span', { class: 'row__n', text: p.value })
      ]));
    });
  }

  /* -------------------------------------------------------------- chrome --- */

  function wireToggles() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-toggle]'), function (btn) {
      btn.addEventListener('click', function () {
        var fig = document.getElementById(btn.getAttribute('data-toggle'));
        var on = btn.getAttribute('aria-pressed') === 'true';
        btn.setAttribute('aria-pressed', String(!on));
        btn.textContent = on ? 'TBL' : 'PLOT';
        fig.querySelector('[data-plot]').closest('.panel__body').hidden = !on;
        fig.querySelector('[data-table]').hidden = on;
      });
    });
  }

  function wireTheme() {
    var btn = document.getElementById('theme-toggle');
    var stored = null;
    try { stored = global.localStorage.getItem('wdma-theme'); } catch (e) { /* blocked */ }
    if (stored) document.documentElement.setAttribute('data-theme', stored);
    paint();

    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { global.localStorage.setItem('wdma-theme', next); } catch (e) { /* blocked */ }
      paint();
    });

    function current() {
      var set = document.documentElement.getAttribute('data-theme');
      if (set) return set;
      return global.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    function paint() { btn.textContent = current() === 'dark' ? 'LIGHT' : 'DARK'; }
  }

  /* Live link telemetry — the console reads as a session, not a static page. */
  function startTelemetry() {
    var L = D.link;
    var MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
      'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    document.getElementById('opr').textContent = L.operator;
    document.getElementById('term').textContent = L.terminal;
    document.getElementById('link-channel').textContent = L.channel;
    document.getElementById('link-cipher').textContent = L.cipher + ' / ' + L.kex;
    document.getElementById('link-fp').textContent = L.fingerprint + ' (' + L.mac + ')';
    document.getElementById('link-tempest').textContent = L.tempest;
    document.getElementById('link-err').textContent = '0.00 %';

    var dtgEl = document.getElementById('dtg');
    var sessionEl = document.getElementById('link-session');
    var keymatEl = document.getElementById('link-keymat');
    var rttEl = document.getElementById('link-rtt');

    var session = 0;
    var rekey = L.rekeySeconds;

    function hms(total) {
      return pad2(Math.floor(total / 3600)) + ':' +
        pad2(Math.floor((total % 3600) / 60)) + ':' + pad2(total % 60);
    }

    function tick() {
      var d = new Date();
      dtgEl.textContent = pad2(d.getUTCDate()) + pad2(d.getUTCHours()) +
        pad2(d.getUTCMinutes()) + 'Z ' + MON[d.getUTCMonth()] + ' ' +
        String(d.getUTCFullYear()).slice(2);

      session += 1;
      sessionEl.textContent = hms(session);

      rekey -= 1;
      if (rekey <= 0) rekey = 15 * 60;
      keymatEl.textContent = 'VALID · REKEY T-' +
        pad2(Math.floor(rekey / 60)) + ':' + pad2(rekey % 60);

      if (session % 3 === 1) {
        rttEl.textContent = (L.rttBase + Math.round((Math.random() - 0.5) * 8)) + ' ms';
      }
    }

    tick();
    global.setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------------- boot --- */

  function renderOps() {
    var rows = filtered();
    renderReadouts(rows);
    renderVolume();
    renderAO(rows);
    renderPrecedence(rows);
    renderTasking(rows);

    var bits = [state.region === 'all' ? 'ALL AO' : D.aoCode[state.region]];
    bits.push(state.hazard === 'all' ? 'ALL CLASSES' : hazardMeta(state.hazard).short);
    if (state.severity !== 'all') bits.push(sevMeta(state.severity).label);
    bits.push(state.windowDays + 'D');
    document.getElementById('filter-summary').textContent =
      bits.join(' · ') + ' — ' + plural(rows.length, 'TASKING', 'TASKINGS');
  }

  function init() {
    renderPartners();
    buildFilters();
    wireToggles();
    wireTheme();
    startTelemetry();
    renderReadiness();
    renderOps();

    var timer = null;
    global.addEventListener('resize', function () {
      global.clearTimeout(timer);
      timer = global.setTimeout(function () {
        renderVolume();
        renderAO(filtered());
      }, 160);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
