/* World Disaster Management Authority — Global Operations Command
 * UI layer. Charts are hand-built SVG so the page stays dependency-free and
 * opens straight from disk.
 *
 * Colours are written as CSS custom properties in inline styles rather than
 * resolved hex, so a theme switch repaints the marks without a re-render.
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
    hiddenSeries: {}
  };

  /* ------------------------------------------------------------ helpers -- */

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

  function compact(n) {
    if (n >= 1e9) return trimZero((n / 1e9).toFixed(1)) + 'B';
    if (n >= 1e6) return trimZero((n / 1e6).toFixed(1)) + 'M';
    if (n >= 1e4) return trimZero((n / 1e3).toFixed(1)) + 'K';
    return num(Math.round(n));
  }

  function trimZero(str) { return str.replace(/\.0$/, ''); }

  function plural(n, one, many) { return num(n) + ' ' + (n === 1 ? one : many); }

  function hours(v) {
    var whole = Math.floor(v);
    var mins = Math.round((v - whole) * 60);
    return whole + 'h ' + String(mins).padStart(2, '0') + 'm';
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

  function hazardLabel(key) {
    var found = hazardMeta(key);
    return found ? found.label : key;
  }

  function severityMeta(key) {
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

  /* ---------------------------------------------------- partner section -- */

  function renderPartners() {
    var grid = document.getElementById('partner-grid');
    clear(grid);

    D.partnerGroups.forEach(function (group) {
      var list = h('ol', { class: 'partner-list' }, group.members.map(function (m, i) {
        return h('li', null, [
          h('span', { class: 'partner-list__idx', text: String(i + 1).padStart(2, '0') }),
          h('span', { class: 'partner-list__name', text: m.name }),
          h('span', { class: 'partner-list__tag', text: m.tag })
        ]);
      }));

      grid.appendChild(h('section', { class: 'card partner-card' }, [
        h('div', { class: 'partner-card__head' }, [
          h('h3', { class: 'partner-card__title', text: group.title }),
          h('span', {
            class: 'partner-card__count',
            text: group.members.length + ' organizations'
          })
        ]),
        h('p', { class: 'partner-card__caption', text: group.caption }),
        list
      ]));
    });

    var states = document.getElementById('state-grid');
    clear(states);
    D.memberStates.forEach(function (st, i) {
      states.appendChild(h('div', { class: 'state-chip' }, [
        h('span', { class: 'state-chip__idx', text: String(i + 1).padStart(2, '0') }),
        h('span', { class: 'state-chip__code', text: st.code }),
        h('span', { class: 'state-chip__name', text: st.name, title: st.name })
      ]));
    });

    document.getElementById('state-count').textContent =
      D.memberStates.length + ' member states';

    var orgTotal = D.partnerGroups.reduce(function (acc, g) { return acc + g.members.length; }, 0);
    document.getElementById('partner-note').textContent =
      orgTotal + ' partner organizations across ' + D.partnerGroups.length +
      ' sectors · ' + D.memberStates.length + ' member states';
  }

  /* --------------------------------------------------------- filtering -- */

  function buildFilters() {
    fillSelect('f-region', [{ v: 'all', t: 'All regions' }].concat(
      D.regions.map(function (r) { return { v: r, t: r }; })));

    fillSelect('f-hazard', [{ v: 'all', t: 'All hazard classes' }].concat(
      D.hazards.map(function (x) { return { v: x.key, t: x.label }; })));

    fillSelect('f-severity', [{ v: 'all', t: 'All severity tiers' }].concat(
      D.severities.map(function (x) {
        return { v: x.key, t: x.tier + ' · ' + x.label };
      })));

    fillSelect('f-window', [
      { v: '90', t: 'Last 90 days' },
      { v: '180', t: 'Last 180 days' },
      { v: '365', t: 'Last 12 months' }
    ]);
    document.getElementById('f-window').value = String(state.windowDays);

    ['f-region', 'f-hazard', 'f-severity', 'f-window'].forEach(function (id) {
      document.getElementById(id).addEventListener('change', function (e) {
        var key = { 'f-region': 'region', 'f-hazard': 'hazard', 'f-severity': 'severity' }[id];
        if (key) state[key] = e.target.value;
        else state.windowDays = Number(e.target.value);
        renderOperations();
      });
    });

    document.getElementById('f-reset').addEventListener('click', function () {
      state.region = 'all';
      state.hazard = 'all';
      state.severity = 'all';
      state.windowDays = 365;
      document.getElementById('f-region').value = 'all';
      document.getElementById('f-hazard').value = 'all';
      document.getElementById('f-severity').value = 'all';
      document.getElementById('f-window').value = '365';
      renderOperations();
    });
  }

  function fillSelect(id, options) {
    var sel = document.getElementById(id);
    clear(sel);
    options.forEach(function (o) {
      sel.appendChild(h('option', { value: o.v, text: o.t }));
    });
  }

  function filteredIncidents() {
    return D.incidents.filter(function (inc) {
      if (state.region !== 'all' && inc.region !== state.region) return false;
      if (state.hazard !== 'all' && inc.hazard !== state.hazard) return false;
      if (state.severity !== 'all' && inc.severity !== state.severity) return false;
      return inc.ageDays <= state.windowDays;
    });
  }

  /* Bucket incidents into 30-day periods, oldest first. */
  function periodSeries(rows, periods) {
    var buckets = new Array(periods).fill(0);
    rows.forEach(function (inc) {
      var idx = Math.min(periods - 1, Math.floor(inc.ageDays / 30));
      buckets[periods - 1 - idx] += 1;
    });
    return buckets;
  }

  /* ------------------------------------------------------ hero & tiles -- */

  function renderHero(rows) {
    var affected = rows.reduce(function (a, r) { return a + r.affected; }, 0);
    var critical = rows.filter(function (r) { return r.severity === 'critical'; }).length;
    var regions = {};
    rows.forEach(function (r) { regions[r.region] = true; });

    document.getElementById('hero-figure').textContent = compact(affected);
    document.getElementById('hero-sub').textContent =
      'People inside an active advisory perimeter across ' +
      plural(Object.keys(regions).length, 'region', 'regions');
    document.getElementById('hero-critical').textContent = num(critical);
    document.getElementById('hero-ops').textContent = num(rows.length);
    document.getElementById('hero-window').textContent = 'Last ' + state.windowDays + ' days';
  }

  function renderTiles(rows) {
    var periods = Math.max(3, Math.round(state.windowDays / 30));
    var counts = periodSeries(rows, periods);

    var current = rows.filter(function (r) { return r.ageDays < 30; });
    var prior = rows.filter(function (r) { return r.ageDays >= 30 && r.ageDays < 60; });

    var tiles = [
      {
        label: 'Active operations',
        value: num(rows.length),
        spark: counts,
        delta: deltaOf(current.length, prior.length, 'up-is-bad'),
        note: 'opened in the last 30 days vs the 30 before'
      },
      {
        label: 'Partner assets committed',
        value: num(rows.reduce(function (a, r) { return a + r.assets; }, 0)),
        spark: bucketSum(rows, periods, 'assets'),
        delta: deltaOf(sumOf(current, 'assets'), sumOf(prior, 'assets'), 'up-is-good'),
        note: 'teams, airframes and field units under tasking'
      },
      {
        label: 'Relief funding allocated',
        value: '$' + trimZero((rows.reduce(function (a, r) {
          return a + r.fundingM;
        }, 0) / 1000).toFixed(1)) + 'B',
        spark: bucketSum(rows, periods, 'fundingM'),
        delta: deltaOf(sumOf(current, 'fundingM'), sumOf(prior, 'fundingM'), 'up-is-good'),
        note: 'committed by finance partners against active operations'
      },
      {
        label: 'Median activation time',
        value: hours(median(rows.map(function (r) { return r.activationH; }))),
        spark: bucketMedian(rows, periods, 'activationH'),
        delta: deltaOf(
          median(current.map(function (r) { return r.activationH; })),
          median(prior.map(function (r) { return r.activationH; })),
          'down-is-good'
        ),
        note: 'alert raised to first partner asset on scene'
      }
    ];

    var host = document.getElementById('tile-grid');
    clear(host);

    tiles.forEach(function (t) {
      var deltaEl = t.delta
        ? h('p', { class: 'tile__delta ' + t.delta.cls, title: t.note }, [
            h('b', { text: t.delta.text }),
            ' vs prior 30 days'
          ])
        : h('p', { class: 'tile__delta', text: 'No prior-period comparison' });

      host.appendChild(h('article', { class: 'card tile' }, [
        h('p', { class: 'tile__label', text: t.label }),
        h('p', { class: 'tile__value', text: t.value }),
        deltaEl,
        h('div', { class: 'tile__spark' }, [sparkline(t.spark)])
      ]));
    });
  }

  function sumOf(rows, field) {
    return rows.reduce(function (a, r) { return a + r[field]; }, 0);
  }

  function bucketSum(rows, periods, field) {
    var buckets = new Array(periods).fill(0);
    rows.forEach(function (r) {
      var idx = Math.min(periods - 1, Math.floor(r.ageDays / 30));
      buckets[periods - 1 - idx] += r[field];
    });
    return buckets;
  }

  function bucketMedian(rows, periods, field) {
    var groups = [];
    for (var i = 0; i < periods; i += 1) groups.push([]);
    rows.forEach(function (r) {
      var idx = Math.min(periods - 1, Math.floor(r.ageDays / 30));
      groups[periods - 1 - idx].push(r[field]);
    });
    return groups.map(function (g) { return median(g); });
  }

  function deltaOf(now, before, direction) {
    if (!before) return null;
    var diff = now - before;
    var pct = Math.round((diff / before) * 100);
    if (!pct) return { text: 'No change', cls: '' };
    var better = direction === 'down-is-good' ? diff < 0
      : direction === 'up-is-bad' ? diff < 0 : diff > 0;
    return {
      text: (diff > 0 ? '+' : '−') + Math.abs(pct) + '%',
      cls: better ? 'is-good' : 'is-bad'
    };
  }

  /* 12-point sparkline: de-emphasised track, current period in the accent. */
  function sparkline(values) {
    var W = 160, H = 32, pad = 3;
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

    var d = values.map(function (v, i) {
      return (i ? 'L' : 'M') + x(i).toFixed(2) + ' ' + y(v).toFixed(2);
    }).join(' ');

    svg.appendChild(s('path', {
      d: d,
      fill: 'none',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      style: 'stroke: var(--text-muted); opacity: 0.55'
    }));

    var lastIdx = values.length - 1;
    svg.appendChild(s('path', {
      d: 'M' + x(lastIdx - 1).toFixed(2) + ' ' + y(values[lastIdx - 1]).toFixed(2) +
         ' L' + x(lastIdx).toFixed(2) + ' ' + y(values[lastIdx]).toFixed(2),
      fill: 'none',
      'stroke-width': 2,
      'stroke-linecap': 'round',
      style: 'stroke: var(--series-1)'
    }));

    svg.appendChild(s('circle', {
      cx: x(lastIdx).toFixed(2),
      cy: y(values[lastIdx]).toFixed(2),
      r: 2.5,
      style: 'fill: var(--series-1)'
    }));

    return svg;
  }

  /* ------------------------------------------------------- line chart --- */

  function renderVolumeChart() {
    var fig = document.getElementById('fig-volume');
    var plot = fig.querySelector('[data-plot]');
    var legendHost = fig.querySelector('[data-legend]');
    var tableHost = fig.querySelector('[data-table]');

    var monthCount = Math.min(D.months.length, Math.round(state.windowDays / 30));
    if (monthCount < 3) monthCount = 3;
    var months = D.months.slice(D.months.length - monthCount);

    var regions = state.region === 'all' ? D.regions : [state.region];
    var hazards = state.hazard === 'all' ? D.hazards
      : D.hazards.filter(function (x) { return x.key === state.hazard; });

    var series = hazards.map(function (hz) {
      var values = months.map(function (_, i) {
        var offset = D.months.length - monthCount + i;
        return regions.reduce(function (acc, r) {
          return acc + D.monthly[r][hz.key][offset];
        }, 0);
      });
      return { key: hz.key, label: hz.label, color: SERIES_VAR[hz.key], values: values };
    });

    var visible = series.filter(function (sr) { return !state.hiddenSeries[sr.key]; });

    clear(plot);
    plot.appendChild(lineChartSvg(months, visible.length ? visible : series, plot));

    clear(legendHost);
    series.forEach(function (sr) {
      var on = !state.hiddenSeries[sr.key];
      var btn = h('button', {
        class: 'legend-item',
        type: 'button',
        'aria-pressed': String(on),
        title: on ? 'Hide ' + sr.label : 'Show ' + sr.label
      }, [
        h('span', { class: 'legend-key', style: 'background: ' + sr.color }),
        h('span', { text: sr.label }),
        h('span', {
          class: 'legend-item__v',
          text: num(sr.values[sr.values.length - 1])
        })
      ]);
      btn.addEventListener('click', function () {
        var others = series.filter(function (o) { return o.key !== sr.key; });
        var anyOther = others.some(function (o) { return !state.hiddenSeries[o.key]; });
        if (on && !anyOther) return;
        state.hiddenSeries[sr.key] = on;
        renderVolumeChart();
      });
      legendHost.appendChild(btn);
    });

    clear(tableHost);
    tableHost.appendChild(seriesTable(months, series));
  }

  function lineChartSvg(months, series, plotHost) {
    var W = 780, H = 300;
    var padL = 46, padR = 74, padT = 14, padB = 32;
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
      'aria-label': 'Reported events per month by hazard class. ' +
        'Use the table view for exact values.'
    });

    scale.ticks.forEach(function (t) {
      svg.appendChild(s('line', {
        class: 'ax-grid', x1: padL, x2: padL + innerW, y1: y(t), y2: y(t)
      }));
      svg.appendChild(s('text', {
        class: 'ax-text ax-text--end', x: padL - 10, y: y(t) + 4, text: num(t)
      }));
    });

    svg.appendChild(s('line', {
      class: 'ax-line', x1: padL, x2: padL + innerW, y1: y(0), y2: y(0)
    }));

    var tickEvery = months.length > 8 ? 1 : 1;
    months.forEach(function (m, i) {
      if (i % tickEvery) return;
      svg.appendChild(s('text', {
        class: 'ax-text ax-text--mid',
        x: x(i),
        y: H - padB + 20,
        text: months.length > 9 ? m.slice(0, 3) : m
      }));
    });

    var crosshair = s('line', {
      class: 'crosshair', y1: padT, y2: padT + innerH, x1: 0, x2: 0, opacity: 0
    });
    svg.appendChild(crosshair);

    series.forEach(function (sr) {
      var d = sr.values.map(function (v, i) {
        return (i ? 'L' : 'M') + x(i).toFixed(2) + ' ' + y(v).toFixed(2);
      }).join(' ');
      svg.appendChild(s('path', { class: 'mark-line', d: d, style: 'stroke: ' + sr.color }));
    });

    /* End markers, then endpoint labels — placed only where they don't collide. */
    var last = months.length - 1;
    var ends = series.map(function (sr) {
      return { sr: sr, y: y(sr.values[last]), v: sr.values[last] };
    }).sort(function (a, b) { return a.y - b.y; });

    var placed = [];
    ends.forEach(function (e) {
      svg.appendChild(s('circle', {
        class: 'mark-dot', cx: x(last), cy: e.y, r: 4.5, style: 'fill: ' + e.sr.color
      }));
      var clash = placed.some(function (p) { return Math.abs(p - e.y) < 15; });
      if (!clash) {
        placed.push(e.y);
        svg.appendChild(s('text', {
          class: 'mark-label', x: x(last) + 12, y: e.y + 4, text: num(e.v)
        }));
      }
    });

    var focusDots = series.map(function (sr) {
      var dot = s('circle', {
        class: 'mark-dot', cx: 0, cy: 0, r: 4.5, opacity: 0, style: 'fill: ' + sr.color
      });
      svg.appendChild(dot);
      return dot;
    });

    var tip = h('div', { class: 'tip' });
    plotHost.appendChild(tip);

    var hit = s('rect', {
      class: 'hit', x: padL - innerW / (months.length * 2 || 2),
      y: padT, width: innerW + innerW / (months.length || 1), height: innerH
    });
    svg.appendChild(hit);

    function show(index) {
      var i = Math.max(0, Math.min(months.length - 1, index));
      crosshair.setAttribute('x1', x(i));
      crosshair.setAttribute('x2', x(i));
      crosshair.setAttribute('opacity', 1);

      focusDots.forEach(function (dot, k) {
        dot.setAttribute('cx', x(i));
        dot.setAttribute('cy', y(series[k].values[i]));
        dot.setAttribute('opacity', 1);
      });

      clear(tip);
      tip.appendChild(h('p', { class: 'tip__t', text: months[i] }));
      series.forEach(function (sr) {
        tip.appendChild(h('div', { class: 'tip__r' }, [
          h('span', { class: 'tip__k', style: 'background: ' + sr.color }),
          h('span', { text: sr.label }),
          h('span', { class: 'tip__v', text: num(sr.values[i]) })
        ]));
      });

      var rect = svg.getBoundingClientRect();
      var ratio = rect.width / W;
      tip.style.left = (x(i) * ratio) + 'px';
      tip.style.top = (padT * ratio - 10) + 'px';
      tip.classList.add('is-on');
    }

    function hide() {
      crosshair.setAttribute('opacity', 0);
      focusDots.forEach(function (dot) { dot.setAttribute('opacity', 0); });
      tip.classList.remove('is-on');
    }

    var cursor = 0;
    svg.addEventListener('mousemove', function (ev) {
      var rect = svg.getBoundingClientRect();
      var px = ((ev.clientX - rect.left) / rect.width) * W;
      if (px < padL - 20 || px > padL + innerW + 20) { hide(); return; }
      var step = months.length > 1 ? innerW / (months.length - 1) : innerW;
      cursor = Math.round((px - padL) / step);
      show(cursor);
    });
    svg.addEventListener('mouseleave', hide);
    svg.addEventListener('focus', function () { show(cursor); });
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight') { cursor += 1; show(cursor); ev.preventDefault(); }
      if (ev.key === 'ArrowLeft') { cursor -= 1; show(cursor); ev.preventDefault(); }
      if (ev.key === 'Escape') hide();
      cursor = Math.max(0, Math.min(months.length - 1, cursor));
    });

    return svg;
  }

  function seriesTable(months, series) {
    var head = h('tr', null, [h('th', { scope: 'col', text: 'Month' })].concat(
      series.map(function (sr) {
        return h('th', { scope: 'col', class: 'num', text: sr.label });
      })));

    var body = months.map(function (m, i) {
      return h('tr', null, [h('th', { scope: 'row', text: m })].concat(
        series.map(function (sr) {
          return h('td', { class: 'num', text: num(sr.values[i]) });
        })));
    });

    return h('table', { class: 'data' }, [
      h('caption', { text: 'Reported events per month by hazard class' }),
      h('thead', null, [head]),
      h('tbody', null, body)
    ]);
  }

  /* -------------------------------------------------------- bar chart --- */

  function renderRegionChart(rows) {
    var fig = document.getElementById('fig-region');
    var plot = fig.querySelector('[data-plot]');
    var tableHost = fig.querySelector('[data-table]');

    var counts = D.regions.map(function (r) {
      return {
        label: r,
        value: rows.filter(function (inc) { return inc.region === r; }).length
      };
    }).sort(function (a, b) { return b.value - a.value; });

    /* Draw at the container's real pixel width so the axis labels render at
       their true size instead of being scaled down with the viewBox. */
    var width = Math.round(Math.max(320, Math.min(560, plot.clientWidth || 470)));
    clear(plot);
    plot.appendChild(barChartSvg(counts, plot, width));

    clear(tableHost);
    tableHost.appendChild(h('table', { class: 'data' }, [
      h('caption', { text: 'Active operations by region' }),
      h('thead', null, [h('tr', null, [
        h('th', { scope: 'col', text: 'Region' }),
        h('th', { scope: 'col', class: 'num', text: 'Operations' })
      ])]),
      h('tbody', null, counts.map(function (c) {
        return h('tr', null, [
          h('th', { scope: 'row', text: c.label }),
          h('td', { class: 'num', text: num(c.value) })
        ]);
      }))
    ]));
  }

  /* Abbreviated only where the full name would run into the plot; the tooltip
     and the table view always carry the full region name. */
  var REGION_SHORT = {
    'Latin America & Caribbean': 'Latin America & Carib.',
    'Middle East & North Africa': 'Middle East & N. Africa'
  };

  function barChartSvg(rowsData, plotHost, width) {
    var W = width || 470;
    var band = 34;
    var barH = 18;
    var padR = 46, padT = 6;
    var padL = Math.round(Math.min(184, Math.max(132, W * 0.44)));
    var H = padT + rowsData.length * band + 26;
    var innerW = W - padL - padR;

    var maxVal = Math.max.apply(null, rowsData.map(function (r) { return r.value; }));
    var scale = niceScale(maxVal, 4);

    var svg = s('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': 'Active operations by region, ranked.'
    });

    var plotBottom = padT + rowsData.length * band;

    scale.ticks.forEach(function (t) {
      var gx = padL + (t / scale.max) * innerW;
      svg.appendChild(s('line', {
        class: 'ax-grid', x1: gx, x2: gx, y1: padT, y2: plotBottom
      }));
      svg.appendChild(s('text', {
        class: 'ax-text ax-text--mid', x: gx, y: plotBottom + 18, text: num(t)
      }));
    });

    svg.appendChild(s('line', {
      class: 'ax-line', x1: padL, x2: padL, y1: padT, y2: plotBottom
    }));

    var tip = h('div', { class: 'tip' });
    plotHost.appendChild(tip);

    rowsData.forEach(function (row, i) {
      var yTop = padT + i * band + (band - barH) / 2;
      var w = scale.max ? (row.value / scale.max) * innerW : 0;

      svg.appendChild(s('text', {
        class: 'ax-text ax-text--end',
        x: padL - 12,
        y: yTop + barH / 2 + 4,
        text: REGION_SHORT[row.label] || row.label,
        style: 'fill: var(--text-secondary)'
      }, [s('title', { text: row.label })]));

      svg.appendChild(s('path', {
        d: roundedBar(padL, yTop, w, barH, 4),
        style: 'fill: var(--series-1)'
      }));

      svg.appendChild(s('text', {
        class: 'mark-label', x: padL + w + 10, y: yTop + barH / 2 + 4, text: num(row.value)
      }));

      /* Hit target spans the full band so it clears the 24px minimum. */
      var hit = s('rect', {
        class: 'hit', x: padL, y: padT + i * band, width: innerW + padR, height: band
      });
      hit.addEventListener('mouseenter', function () {
        clear(tip);
        tip.appendChild(h('p', { class: 'tip__t', text: row.label }));
        tip.appendChild(h('div', { class: 'tip__r' }, [
          h('span', { class: 'tip__k', style: 'background: var(--series-1)' }),
          h('span', { text: 'Active operations' }),
          h('span', { class: 'tip__v', text: num(row.value) })
        ]));
        var rect = svg.getBoundingClientRect();
        var ratio = rect.width / W;
        tip.style.left = Math.min(rect.width - 20, (padL + w) * ratio) + 'px';
        tip.style.top = ((yTop - 6) * ratio) + 'px';
        tip.classList.add('is-on');
      });
      hit.addEventListener('mouseleave', function () { tip.classList.remove('is-on'); });
      svg.appendChild(hit);
    });

    return svg;
  }

  /* Square at the baseline, 4px rounded at the data end. */
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

  /* --------------------------------------------------- severity stack --- */

  function renderSeverity(rows) {
    var fig = document.getElementById('fig-severity');
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
      plot.appendChild(h('p', { class: 'empty', text: 'No operations match the current filters.' }));
    } else {
      var stack = h('div', {
        class: 'stack',
        role: 'img',
        'aria-label': 'Share of active operations by severity tier'
      });
      parts.forEach(function (p) {
        if (!p.n) return;
        stack.appendChild(h('div', {
          class: 'stack__seg',
          style: 'flex: ' + p.n + ' 1 0%; background: ' + STATUS_VAR[p.meta.token],
          title: p.meta.tier + ' ' + p.meta.label + ' — ' + num(p.n) +
            ' operations (' + p.pct.toFixed(1) + '%)'
        }));
      });
      plot.appendChild(stack);
    }

    clear(legendHost);
    legendHost.className = 'sev-legend';
    parts.forEach(function (p) {
      legendHost.appendChild(h('div', { class: 'sev-row' }, [
        h('span', {
          class: 'sev-row__glyph',
          style: 'color: ' + STATUS_VAR[p.meta.token],
          text: p.meta.glyph,
          'aria-hidden': 'true'
        }),
        h('span', { class: 'sev-row__tier', text: p.meta.tier }),
        h('span', { text: p.meta.label }),
        h('span', { class: 'sev-row__n', text: num(p.n) }),
        h('span', { class: 'sev-row__pct', text: p.pct.toFixed(1) + '%' })
      ]));
    });

    renderWatchlist(rows);

    clear(tableHost);
    tableHost.appendChild(h('table', { class: 'data' }, [
      h('caption', { text: 'Active operations by severity tier' }),
      h('thead', null, [h('tr', null, [
        h('th', { scope: 'col', text: 'Tier' }),
        h('th', { scope: 'col', text: 'Severity' }),
        h('th', { scope: 'col', class: 'num', text: 'Operations' }),
        h('th', { scope: 'col', class: 'num', text: 'Share' })
      ])]),
      h('tbody', null, parts.map(function (p) {
        return h('tr', null, [
          h('th', { scope: 'row', text: p.meta.tier }),
          h('td', { text: p.meta.label }),
          h('td', { class: 'num', text: num(p.n) }),
          h('td', { class: 'num', text: p.pct.toFixed(1) + '%' })
        ]);
      }))
    ]));
  }

  /* The duty-officer shortlist: the largest Tier 1 and Tier 2 operations. */
  function renderWatchlist(rows) {
    var host = document.getElementById('watchlist');
    clear(host);

    var top = rows.filter(function (r) {
      return r.severity === 'critical' || r.severity === 'serious';
    }).slice(0, 6);

    if (!top.length) {
      host.appendChild(h('p', {
        class: 'empty',
        text: 'No Tier 1 or Tier 2 operations in scope.'
      }));
      return;
    }

    top.forEach(function (inc) {
      var sv = severityMeta(inc.severity);
      host.appendChild(h('div', { class: 'watchlist__row', title: inc.event }, [
        h('span', {
          class: 'watchlist__glyph',
          style: 'color: ' + STATUS_VAR[sv.token],
          text: sv.glyph,
          'aria-hidden': 'true'
        }),
        h('span', { class: 'sev-row__tier', text: sv.tier }),
        h('span', { class: 'watchlist__event', text: inc.event }),
        h('span', { class: 'watchlist__n', text: compact(inc.affected) + ' affected' })
      ]));
    });
  }

  /* ---------------------------------------------------- incident table -- */

  function renderIncidentTable(rows) {
    var host = document.getElementById('incident-table');
    clear(host);

    document.getElementById('incident-count').textContent =
      num(rows.length) + ' of ' + num(D.incidents.length) + ' operations';

    if (!rows.length) {
      host.appendChild(h('p', {
        class: 'empty',
        text: 'No operations match the current filters. Reset the filters to see the full log.'
      }));
      return;
    }

    var head = h('tr', null, [
      h('th', { scope: 'col', text: 'Operation' }),
      h('th', { scope: 'col', text: 'Event' }),
      h('th', { scope: 'col', text: 'Region' }),
      h('th', { scope: 'col', text: 'Hazard class' }),
      h('th', { scope: 'col', text: 'Severity' }),
      h('th', { scope: 'col', class: 'num', text: 'Affected' }),
      h('th', { scope: 'col', text: 'Lead partner' }),
      h('th', { scope: 'col', class: 'num', text: 'Updated' })
    ]);

    var body = rows.slice(0, 30).map(function (inc) {
      var sv = severityMeta(inc.severity);
      var hz = hazardMeta(inc.hazard);
      return h('tr', null, [
        h('td', { class: 'id', text: inc.id }),
        h('td', { class: 'wrap', text: inc.event }),
        h('td', { text: inc.region }),
        h('td', { text: hz.short, title: hz.label }),
        h('td', null, [
          h('span', { class: 'chip chip--' + sv.token }, [
            h('span', { class: 'chip__glyph', text: sv.glyph, 'aria-hidden': 'true' }),
            h('span', { text: sv.tier + ' ' + sv.label })
          ])
        ]),
        h('td', { class: 'num', text: compact(inc.affected) }),
        h('td', { class: 'clip', text: inc.lead, title: inc.lead }),
        h('td', { class: 'num', text: inc.updatedHours + 'h ago' })
      ]);
    });

    host.appendChild(h('table', { class: 'data' }, [
      h('caption', {
        text: 'Highest severity first · showing ' + Math.min(30, rows.length) +
          ' of ' + plural(rows.length, 'matching operation', 'matching operations')
      }),
      h('thead', null, [head]),
      h('tbody', null, body)
    ]));
  }

  /* --------------------------------------------------------- capacity --- */

  function renderCapacity() {
    var host = document.getElementById('capacity-meters');
    clear(host);

    D.capacity.forEach(function (c) {
      var pct = Math.round((c.committed / c.total) * 100);
      var strained = pct >= 85;

      host.appendChild(h('div', { class: 'meter' }, [
        h('div', { class: 'meter__head' }, [
          h('span', { class: 'meter__label', text: c.label }),
          strained ? h('span', { class: 'chip chip--warning' }, [
            h('span', { class: 'chip__glyph', text: '●', 'aria-hidden': 'true' }),
            h('span', { text: 'Strained' })
          ]) : null,
          h('span', { class: 'meter__value', text: pct + '%' })
        ]),
        h('div', {
          class: 'meter__track',
          role: 'meter',
          'aria-valuenow': String(pct),
          'aria-valuemin': '0',
          'aria-valuemax': '100',
          'aria-label': c.label + ' committed'
        }, [
          h('div', { class: 'meter__fill', style: 'width: ' + pct + '%' })
        ]),
        h('p', {
          class: 'meter__sub',
          text: num(c.committed) + ' of ' + num(c.total) + ' ' + c.unit + ' committed'
        })
      ]));
    });
  }

  /* ----------------------------------------------------------- chrome --- */

  function wireTableToggles() {
    Array.prototype.forEach.call(
      document.querySelectorAll('[data-table-toggle]'),
      function (btn) {
        btn.addEventListener('click', function () {
          var fig = document.getElementById(btn.getAttribute('data-table-toggle'));
          var on = btn.getAttribute('aria-pressed') === 'true';
          btn.setAttribute('aria-pressed', String(!on));
          btn.textContent = on ? 'Table' : 'Chart';
          fig.querySelector('[data-plot]').hidden = !on;
          ['[data-legend]', '[data-aux]'].forEach(function (sel) {
            var node = fig.querySelector(sel);
            if (node) node.hidden = !on;
          });
          fig.querySelector('[data-table]').hidden = on;
        });
      }
    );
  }

  function wireTheme() {
    var btn = document.getElementById('theme-toggle');
    var stored = null;
    try { stored = global.localStorage.getItem('wdma-theme'); } catch (e) { /* private mode */ }
    if (stored) document.documentElement.setAttribute('data-theme', stored);
    paint();

    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      if (!current) {
        current = global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { global.localStorage.setItem('wdma-theme', next); } catch (e) { /* ignore */ }
      paint();
    });

    function paint() {
      var current = document.documentElement.getAttribute('data-theme');
      if (!current) {
        current = global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      btn.textContent = current === 'dark' ? 'Light mode' : 'Dark mode';
    }
  }

  function startClock() {
    var el = document.getElementById('clock');
    function tick() {
      var now = new Date();
      el.textContent = now.toISOString().slice(0, 19).replace('T', ' ') + ' UTC';
    }
    tick();
    global.setInterval(tick, 1000);
  }

  /* ------------------------------------------------------------- boot --- */

  function renderOperations() {
    var rows = filteredIncidents();
    renderHero(rows);
    renderTiles(rows);
    renderVolumeChart();
    renderRegionChart(rows);
    renderSeverity(rows);
    renderIncidentTable(rows);
    renderFilterSummary(rows);
  }

  function renderFilterSummary(rows) {
    var bits = [];
    bits.push(state.region === 'all' ? 'All regions' : state.region);
    bits.push(state.hazard === 'all' ? 'all hazard classes' : hazardLabel(state.hazard));
    if (state.severity !== 'all') bits.push(severityMeta(state.severity).label + ' only');
    bits.push('last ' + state.windowDays + ' days');
    document.getElementById('filter-summary').textContent =
      bits.join(' · ') + ' — ' + plural(rows.length, 'operation', 'operations') + ' in scope';
  }

  function init() {
    renderPartners();
    buildFilters();
    wireTableToggles();
    wireTheme();
    startClock();
    renderCapacity();
    renderOperations();

    var resizeTimer = null;
    global.addEventListener('resize', function () {
      global.clearTimeout(resizeTimer);
      resizeTimer = global.setTimeout(function () {
        renderVolumeChart();
        renderRegionChart(filteredIncidents());
      }, 160);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
