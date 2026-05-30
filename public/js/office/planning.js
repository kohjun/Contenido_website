/* =====================================================================
   planning.js — 기획팀 분석 대시보드 로직
   IIFE — office.html 사이드바에서 동적 주입돼도 안전, 재실행 시 충돌 없음.
   ===================================================================== */
(function () {
  'use strict';
  console.log('[planning.js] loaded — v20260540');

  const state = {
    currentTeam: 'compare',   // 'compare' | 'A' | 'B' | 'C' | 'D'
    range: 'all',             // 'all' | '3m' | '6m' | 'year'
  };
  const chartRegistry = {};
  const TEAM_COLORS = {
    A: '#EF4444', B: '#3B82F6', C: '#F59E0B', D: '#10B981'
  };
  const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

  /* ───────── 부팅 ───────── */
  async function bootPlanning() {
    const container = document.querySelector('.pl-container');
    if (!container) {
      console.log('[planning.js] .pl-container DOM not found — skipping');
      return;
    }
    bindTabs();
    bindRange();
    await loadPanel();
  }

  /* ───────── 탭 / range 이벤트 바인딩 ───────── */
  function bindTabs() {
    const bar = document.getElementById('pl-tab-bar');
    if (!bar) return;
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.pl-tab');
      if (!btn) return;
      bar.querySelectorAll('.pl-tab').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.currentTeam = btn.dataset.team;
      loadPanel();
    });
  }

  function bindRange() {
    const bar = document.getElementById('pl-range');
    if (!bar) return;
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.pl-chip');
      if (!btn) return;
      bar.querySelectorAll('.pl-chip').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.range = btn.dataset.range;
      loadPanel();
    });
  }

  /* ───────── 패널 로딩 ───────── */
  async function loadPanel() {
    const panel = document.getElementById('pl-panel');
    if (!panel) return;
    panel.innerHTML = `<div class="pl-loading"><div class="spinner"></div>불러오는 중…</div>`;

    // 기존 차트 dispose
    Object.values(chartRegistry).forEach(c => { try { c.destroy(); } catch (e) {} });
    Object.keys(chartRegistry).forEach(k => delete chartRegistry[k]);

    try {
      if (state.currentTeam === 'compare') {
        const data = await fetchJSON(`/office/analytics/team-comparison?range=${state.range}`);
        panel.innerHTML = renderComparePanel(data);
        renderCompareCharts(data);
      } else {
        const data = await fetchJSON(`/office/analytics/planning-detail?team=${state.currentTeam}&range=${state.range}`);
        panel.innerHTML = renderTeamPanel(state.currentTeam, data);
        renderTeamCharts(state.currentTeam, data);
      }
    } catch (e) {
      console.error('[planning.js] load error:', e);
      panel.innerHTML = `<div class="pl-error">데이터를 불러오지 못했습니다 — ${escapeHTML(e.message)}</div>`;
    }
  }

  async function fetchJSON(url) {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  /* ───────── 패널 HTML — 단일 팀 ───────── */
  function renderTeamPanel(team, data) {
    const s = data.summary;
    if (!s || s.totalEvents === 0) {
      return `<div class="pl-empty">이 기간에 ${team}팀의 종료된 이벤트가 없습니다.</div>`;
    }
    return `
      <section class="pl-summary">
        <div class="pl-summary-card">
          <div class="pl-summary-label">총 이벤트</div>
          <div class="pl-summary-value">${s.totalEvents}<span class="pl-summary-unit">개</span></div>
        </div>
        <div class="pl-summary-card">
          <div class="pl-summary-label">평균 평점</div>
          <div class="pl-summary-value">${s.avgRating || '-'}<span class="pl-summary-unit">/5</span></div>
        </div>
        <div class="pl-summary-card">
          <div class="pl-summary-label">평균 참가비</div>
          <div class="pl-summary-value">${s.avgFee.toLocaleString()}<span class="pl-summary-unit">원</span></div>
        </div>
        <div class="pl-summary-card">
          <div class="pl-summary-label">평균 참가율</div>
          <div class="pl-summary-value">${s.avgParticipationRate}<span class="pl-summary-unit">%</span></div>
        </div>
        <div class="pl-summary-card">
          <div class="pl-summary-label">평균 진행시간</div>
          <div class="pl-summary-value">${s.avgDuration}<span class="pl-summary-unit">분</span></div>
        </div>
        <div class="pl-summary-card">
          <div class="pl-summary-label">No-show율</div>
          <div class="pl-summary-value">${s.noShowRate}<span class="pl-summary-unit">%</span></div>
        </div>
      </section>

      <section class="pl-cards-grid">
        <div class="pl-chart-card span-8">
          <h3 class="pl-chart-card-title">📈 월별 트렌드 (이벤트 수 + 평균 평점)</h3>
          <div class="pl-chart-body tall"><canvas id="pl-monthlyTrend"></canvas></div>
        </div>
        <div class="pl-chart-card span-4">
          <h3 class="pl-chart-card-title">🏷️ 인기 태그 TOP 8</h3>
          ${data.topTags.length
            ? `<div class="tag-list">${data.topTags.map(t => `<span class="tag-pill">${escapeHTML(t.tag)}<span class="count">${t.count}</span></span>`).join('')}</div>`
            : `<div class="pl-empty" style="padding:20px;">태그 데이터 없음</div>`}
        </div>

        <div class="pl-chart-card span-6">
          <h3 class="pl-chart-card-title">📅 요일별 분포</h3>
          <div class="pl-chart-body"><canvas id="pl-dayDist"></canvas></div>
        </div>
        <div class="pl-chart-card span-6">
          <h3 class="pl-chart-card-title">🕐 시간대별 분포</h3>
          <div class="pl-chart-body"><canvas id="pl-hourDist"></canvas></div>
        </div>

        <div class="pl-chart-card span-6">
          <h3 class="pl-chart-card-title">💰 참가비 분포</h3>
          <div class="dist-list" id="pl-feeDist"></div>
        </div>
        <div class="pl-chart-card span-6">
          <h3 class="pl-chart-card-title">📝 최근 이벤트</h3>
          <div class="event-list" id="pl-recentEvents"></div>
        </div>
      </section>
    `;
  }

  /* ───────── 패널 HTML — 전체 비교 ───────── */
  function renderComparePanel(data) {
    const teams = ['A', 'B', 'C', 'D'];
    const hasData = teams.some(t => data[t] && data[t].totalEvents > 0);
    if (!hasData) {
      return `<div class="pl-empty">이 기간에 종료된 이벤트가 없습니다.</div>`;
    }
    return `
      <section class="pl-cards-grid">
        <div class="pl-chart-card span-12">
          <h3 class="pl-chart-card-title">📊 4팀 종합 비교</h3>
          <div class="pl-chart-body tall"><canvas id="pl-cmpAll"></canvas></div>
        </div>

        <div class="pl-chart-card span-6">
          <h3 class="pl-chart-card-title">⭐ 평균 평점</h3>
          <div class="pl-chart-body"><canvas id="pl-cmpRating"></canvas></div>
        </div>
        <div class="pl-chart-card span-6">
          <h3 class="pl-chart-card-title">✅ 참가율</h3>
          <div class="pl-chart-body"><canvas id="pl-cmpRate"></canvas></div>
        </div>

        <div class="pl-chart-card span-6">
          <h3 class="pl-chart-card-title">💸 평균 참가비</h3>
          <div class="pl-chart-body"><canvas id="pl-cmpFee"></canvas></div>
        </div>
        <div class="pl-chart-card span-6">
          <h3 class="pl-chart-card-title">⚠️ No-show율</h3>
          <div class="pl-chart-body"><canvas id="pl-cmpNoShow"></canvas></div>
        </div>
      </section>
    `;
  }

  /* ───────── 차트 — 단일 팀 ───────── */
  function renderTeamCharts(team, data) {
    const color = TEAM_COLORS[team];

    // 월별 트렌드 (combo: bar + line)
    const monthlyCanvas = document.getElementById('pl-monthlyTrend');
    if (monthlyCanvas && data.monthlyTrend.length) {
      chartRegistry.monthly = new Chart(monthlyCanvas, {
        type: 'bar',
        data: {
          labels: data.monthlyTrend.map(d => d.label),
          datasets: [
            {
              type: 'bar',
              label: '이벤트 수',
              data: data.monthlyTrend.map(d => d.eventCount),
              backgroundColor: color + '99',
              yAxisID: 'y'
            },
            {
              type: 'line',
              label: '평균 평점',
              data: data.monthlyTrend.map(d => d.avgRating || null),
              borderColor: '#F59E0B',
              backgroundColor: 'rgba(245,158,11,0.15)',
              tension: 0.3,
              yAxisID: 'y1',
              spanGaps: true
            }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { font: { family: 'GmarketSansMedium' } } } },
          scales: {
            x: { ticks: { font: { family: 'GmarketSansMedium' }, maxTicksLimit: 12 } },
            y: { beginAtZero: true, position: 'left', title: { display: true, text: '이벤트 수', font: { family: 'GmarketSansMedium' } } },
            y1: { beginAtZero: true, max: 5, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: '평점', font: { family: 'GmarketSansMedium' } } }
          }
        }
      });
    }

    // 요일별 분포
    const dayCanvas = document.getElementById('pl-dayDist');
    if (dayCanvas) {
      chartRegistry.day = new Chart(dayCanvas, {
        type: 'bar',
        data: {
          labels: DAYS,
          datasets: [{ label: '이벤트 수', data: data.dayDist, backgroundColor: color + 'CC' }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }

    // 시간대별 분포
    const hourCanvas = document.getElementById('pl-hourDist');
    if (hourCanvas) {
      chartRegistry.hour = new Chart(hourCanvas, {
        type: 'line',
        data: {
          labels: Array.from({ length: 24 }, (_, i) => `${i}시`),
          datasets: [{
            label: '이벤트 수',
            data: data.hourDist,
            borderColor: color,
            backgroundColor: color + '22',
            tension: 0.3, fill: true
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
      });
    }

    // 참가비 분포 (CSS bar)
    const feeWrap = document.getElementById('pl-feeDist');
    if (feeWrap) {
      const items = data.feeDistribution.map(d => ({ label: d.bucket, count: d.count }));
      feeWrap.innerHTML = renderDistRows(items, 'warn');
    }

    // 최근 이벤트
    const evWrap = document.getElementById('pl-recentEvents');
    if (evWrap) {
      if (!data.recentEvents.length) {
        evWrap.innerHTML = `<div class="pl-empty" style="padding:20px;">최근 이벤트 없음</div>`;
      } else {
        evWrap.innerHTML = data.recentEvents.slice(0, 5).map(ev => `
          <div class="event-row" style="border-left-color: ${color};">
            <div class="event-title">${escapeHTML(ev.title || '-')}</div>
            <div class="event-meta">
              ${ev.rating != null ? `<span class="event-rating">⭐ ${ev.rating}</span>` : ''}
              ${ev.participationRate != null ? `<span class="event-rate">참가 ${ev.participationRate}%</span>` : ''}
            </div>
          </div>
        `).join('');
      }
    }
  }

  /* ───────── 차트 — 전체 비교 ───────── */
  function renderCompareCharts(data) {
    const teams = ['A', 'B', 'C', 'D'];
    const colors = teams.map(t => TEAM_COLORS[t]);

    function makeBarChart(canvasId, label, valueFn, unit) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const values = teams.map(t => valueFn(data[t]));
      chartRegistry[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: teams.map(t => t + '팀'),
          datasets: [{
            label, data: values,
            backgroundColor: colors.map(c => c + 'CC'),
            borderRadius: 8
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y}${unit}` } }
          },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // 종합 비교 (radar)
    const allCanvas = document.getElementById('pl-cmpAll');
    if (allCanvas) {
      chartRegistry.cmpAll = new Chart(allCanvas, {
        type: 'radar',
        data: {
          labels: ['이벤트 수', '평균 평점(x20)', '참가율', '진행시간(분/10)', 'No-show 안정성'],
          datasets: teams.map(t => ({
            label: t + '팀',
            data: [
              data[t].totalEvents,
              (data[t].avgRating || 0) * 20,
              data[t].avgParticipationRate,
              (data[t].avgDuration || 0) / 10,
              Math.max(0, 100 - data[t].noShowRate)
            ],
            borderColor: TEAM_COLORS[t],
            backgroundColor: TEAM_COLORS[t] + '33',
            pointBackgroundColor: TEAM_COLORS[t]
          }))
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { font: { family: 'GmarketSansMedium' } } } },
          scales: { r: { beginAtZero: true, ticks: { font: { family: 'GmarketSansMedium' } } } }
        }
      });
    }

    makeBarChart('pl-cmpRating', '평균 평점', t => t.avgRating || 0, '점');
    makeBarChart('pl-cmpRate',   '참가율',   t => t.avgParticipationRate, '%');
    makeBarChart('pl-cmpFee',    '참가비',   t => t.avgFee, '원');
    makeBarChart('pl-cmpNoShow', 'No-show', t => t.noShowRate, '%');
  }

  /* ───────── CSS bar 렌더 ───────── */
  function renderDistRows(items, colorClass) {
    if (!items.length) return `<div class="pl-empty" style="padding:20px;">데이터 없음</div>`;
    const max = Math.max(...items.map(i => i.count), 1);
    return items.map(it => {
      const pct = Math.max(2, Math.round(it.count / max * 100));
      return `
        <div class="dist-row">
          <span class="dist-label">${escapeHTML(it.label)}</span>
          <div class="dist-bar-wrap">
            <div class="dist-bar-fill ${colorClass || ''}" style="width: ${pct}%;">
              ${it.count > 0 ? it.count : ''}
            </div>
          </div>
          <span class="dist-count">${it.count}개</span>
        </div>`;
    }).join('');
  }

  /* ───────── 유틸 ───────── */
  function escapeHTML(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  }

  /* ───────── 자동 부팅 + window 노출 ───────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootPlanning);
  } else {
    bootPlanning();
  }
  window.bootPlanning = bootPlanning;
})();
