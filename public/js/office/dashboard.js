/* =====================================================================
   dashboard.js — 운영팀 대시보드 로직
   ---------------------------------------------------------------------
   IIFE 패턴 — office.html 사이드바에서 동적 주입되어도 안전하게 동작.
   ===================================================================== */
(function () {
  'use strict';
  console.log('[dashboard.js] loaded — v20260540');

  // Chart.js 인스턴스 보관 — 재실행 시 dispose
  const chartRegistry = {};

  /* ───────── Chart.js 로딩 ───────── */
  async function loadChartJS() {
    if (window.Chart) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /* ───────── 데이터 가져오기 ───────── */
  async function fetchOverview() {
    const res = await fetch('/office/analytics/operation-overview', { credentials: 'include' });
    if (!res.ok) throw new Error(`operation-overview HTTP ${res.status}`);
    return res.json();
  }

  /* ───────── 통계 상단 카드 ───────── */
  function renderStats(data) {
    const { members, avgParticipation } = data;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('totalMembers', members.total);
    set('activeMembers', members.active);
    set('inactiveMembers', members.inactive);
    set('avgParticipation', avgParticipation.toFixed(1));

    const ratio = members.total ? Math.round(members.active / members.total * 100) : 0;
    set('totalSub', '명');
    set('activeSub', `${ratio}%`);
    set('inactiveSub', `${100 - ratio}%`);

    set('averageAge', data.avgAge ? data.avgAge.toFixed(1) : '-');
  }

  /* ───────── 월별 가입 추이 (Chart.js) ───────── */
  function renderGrowthChart(signupTrend) {
    const canvas = document.getElementById('growthChart');
    if (!canvas) return;
    if (chartRegistry.growth) { chartRegistry.growth.destroy(); }
    if (!signupTrend || !signupTrend.length) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '14px GmarketSansMedium, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'center';
      ctx.fillText('데이터 없음', canvas.width / 2, canvas.height / 2);
      return;
    }
    chartRegistry.growth = new Chart(canvas, {
      type: 'line',
      data: {
        labels: signupTrend.map(d => d.label),
        datasets: [
          {
            label: '신규 가입자',
            data: signupTrend.map(d => d.new),
            borderColor: '#0A84FE',
            backgroundColor: 'rgba(10,132,254,0.12)',
            tension: 0.3,
            fill: true,
            yAxisID: 'y'
          },
          {
            label: '누적 회원수',
            data: signupTrend.map(d => d.cumulative),
            borderColor: '#10B981',
            backgroundColor: 'rgba(16,185,129,0.08)',
            tension: 0.3,
            fill: false,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'GmarketSansMedium' } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}명`
            }
          }
        },
        scales: {
          x: { ticks: { font: { family: 'GmarketSansMedium' }, maxTicksLimit: 12 } },
          y: {
            beginAtZero: true,
            position: 'left',
            title: { display: true, text: '신규 가입(명)', font: { family: 'GmarketSansMedium' } }
          },
          y1: {
            beginAtZero: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            title: { display: true, text: '누적(명)', font: { family: 'GmarketSansMedium' } }
          }
        }
      }
    });
  }

  /* ───────── 역할/성별 pie ───────── */
  function renderPie(canvasId, regKey, labels, values, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (chartRegistry[regKey]) { chartRegistry[regKey].destroy(); }
    chartRegistry[regKey] = new Chart(canvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'GmarketSansMedium', size: 11 },
              generateLabels: (chart) => {
                const data = chart.data;
                const total = data.datasets[0].data.reduce((s, v) => s + v, 0) || 1;
                return data.labels.map((label, i) => ({
                  text: `${label} (${data.datasets[0].data[i]}명, ${Math.round(data.datasets[0].data[i] / total * 100)}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  index: i
                }));
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((s, v) => s + v, 0) || 1;
                return `${ctx.label}: ${ctx.parsed}명 (${Math.round(ctx.parsed / total * 100)}%)`;
              }
            }
          }
        }
      }
    });
  }

  function renderRoleChart(byRole) {
    renderPie(
      'roleChart', 'role',
      ['관리자', '운영진', '참가자', '스타터', '게스트'],
      [
        byRole.admin || 0,
        byRole.officer || 0,
        byRole.participant || 0,
        byRole.starter || 0,
        byRole.guest || 0
      ],
      ['#1F2937', '#0A84FE', '#10B981', '#F59E0B', '#9CA3AF']
    );
  }

  function renderGenderChart(byGender) {
    renderPie(
      'genderChart', 'gender',
      ['남성', '여성', '기타'],
      [byGender.male || 0, byGender.female || 0, (byGender.other || 0) + (byGender['-'] || 0)],
      ['#3B82F6', '#EC4899', '#94A3B8']
    );
  }

  /* ───────── CSS bar 분포 ───────── */
  function renderDistList(containerId, items, colorClass) {
    const wrap = document.getElementById(containerId);
    if (!wrap) return;
    if (!items.length) {
      wrap.innerHTML = '<div style="color:#94A3B8; text-align:center; padding:20px; font-size:0.85rem;">데이터 없음</div>';
      return;
    }
    const max = Math.max(...items.map(i => i.count), 1);
    wrap.innerHTML = items.map(it => {
      const pct = Math.max(2, Math.round(it.count / max * 100));
      return `
        <div class="dist-row">
          <span class="dist-label">${escapeHTML(it.label)}</span>
          <div class="dist-bar-wrap">
            <div class="dist-bar-fill ${colorClass || ''}" style="width: ${pct}%;">
              ${it.count > 0 ? it.count : ''}
            </div>
          </div>
          <span class="dist-count">${it.count}명</span>
        </div>`;
    }).join('');
  }

  function renderActivityHistogram(items) {
    renderDistList('activityHistogram', items.map(i => ({ label: i.bucket, count: i.count })), 'info');
  }

  function renderAgeBuckets(buckets) {
    const items = Object.entries(buckets).map(([label, count]) => ({ label, count }));
    renderDistList('ageDistribution', items, 'warn');
  }

  function renderTopRegions(regions) {
    renderDistList('topRegions', regions.map(r => ({ label: r.region, count: r.count })), 'success');
  }

  /* ───────── 부팅 ───────── */
  async function bootDashboard() {
    const dashboardEl = document.querySelector('.dashboard');
    if (!dashboardEl) {
      console.log('[dashboard.js] .dashboard DOM not found — skipping');
      return;
    }
    try {
      await loadChartJS();
      const data = await fetchOverview();
      renderStats(data);
      renderGrowthChart(data.signupTrend);
      renderRoleChart(data.members.byRole || {});
      renderGenderChart(data.members.byGender || {});
      renderActivityHistogram(data.activityHistogram || []);
      renderAgeBuckets(data.members.ageBuckets || {});
      renderTopRegions(data.topRegions || []);
    } catch (e) {
      console.error('[dashboard.js] init error:', e);
      const err = document.createElement('div');
      err.className = 'dashboard-error';
      err.textContent = `대시보드를 불러오지 못했습니다 — ${e.message}`;
      dashboardEl.insertBefore(err, dashboardEl.firstChild);
    }
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
    document.addEventListener('DOMContentLoaded', bootDashboard);
  } else {
    bootDashboard();
  }

  // 옛 코드 호환 (sidebar.js의 typeof Dashboard 체크)
  window.Dashboard = { initialize: bootDashboard };
  window.bootDashboard = bootDashboard;
})();
