// public/js/office/staff.js
(function () {
  let allMembers = [];
  let selectedStarterStaffIds = new Set();
  let saveDebounceTimer = null;

  const STAGE_CONFIGS = {
    'stage-1': ['stage1_mtg_1', 'stage1_mtg_2', 'stage1_mtg_3', 'stage1_mtg_4', 'stage1_dec_1', 'stage1_dec_2', 'stage1_dec_3'],
    'stage-2': ['stage2_goal_1', 'stage2_goal_2', 'stage2_goal_3', 'stage2_goal_4', 'stage2_idea_1', 'stage2_idea_2', 'stage2_idea_3'],
    'stage-3': ['stage3_loc_1', 'stage3_loc_2', 'stage3_loc_3', 'stage3_loc_4', 'stage3_bud_1', 'stage3_bud_2', 'stage3_bud_3', 'stage3_fea_1', 'stage3_fea_2', 'stage3_fea_3', 'stage3_fea_4'],
    'stage-4': ['stage4_final_1', 'stage4_final_2', 'stage4_final_3', 'stage4_role_1', 'stage4_role_2', 'stage4_role_3', 'stage4_role_4', 'stage4_role_5', 'stage4_role_6', 'stage4_role_7', 'stage4_role_8'],
    'stage-5': ['stage5_des_1', 'stage5_des_2', 'stage5_des_3', 'stage5_des_4', 'stage5_des_5', 'stage5_saf_1', 'stage5_saf_2', 'stage5_saf_3', 'stage5_saf_4', 'stage5_reh_1', 'stage5_reh_2', 'stage5_reh_3', 'stage5_reh_4'],
    'stage-retro': ['retro_chk_1', 'retro_chk_2', 'retro_chk_3', 'retro_chk_4', 'retro_chk_5']
  };

  // 1) 초기화
  async function initialize() {
    console.log('[StaffDashboard] Initializing...');
    await loadChecklist();
    await loadStarterStaff();
  }

  // 2) 체크리스트 로드 및 렌더링
  async function loadChecklist() {
    try {
      const res = await fetch('/staff/checklist', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const checkedSet = new Set(data.checkedItems || []);

        document.querySelectorAll('.staff-chk').forEach(chk => {
          const id = chk.dataset.id;
          chk.checked = checkedSet.has(id);
        });
      }
      updateProgress();
    } catch (err) {
      console.error('[StaffDashboard] Error loading checklist:', err);
    }
  }

  // 3) 체크 변경 처리 & 진행률 계산
  function handleCheckChange() {
    updateProgress();

    // Debounce save to server
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(() => {
      saveChecklist();
    }, 500);
  }

  function updateProgress() {
    const allChks = Array.from(document.querySelectorAll('.staff-chk'));
    const total = allChks.length || 52;
    const checkedCount = allChks.filter(c => c.checked).length;
    const percent = Math.round((checkedCount / total) * 100);

    const progressBar = document.getElementById('overall-progress-bar');
    const progressText = document.getElementById('overall-progress-text');
    const completedCountEl = document.getElementById('completed-count');
    const totalCountEl = document.getElementById('total-count');

    if (progressBar) progressBar.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `${percent}%`;
    if (completedCountEl) completedCountEl.textContent = checkedCount;
    if (totalCountEl) totalCountEl.textContent = total;

    // 단계별 뱃지 카운트 업데이트
    const stagePillMap = {
      'stage-1': 'pill-stage-1',
      'stage-2': 'pill-stage-2',
      'stage-3': 'pill-stage-3',
      'stage-4': 'pill-stage-4',
      'stage-5': 'pill-stage-5',
      'stage-retro': 'pill-stage-retro'
    };

    Object.keys(STAGE_CONFIGS).forEach(stageKey => {
      const keys = STAGE_CONFIGS[stageKey];
      const stageTotal = keys.length;
      let stageDone = 0;
      keys.forEach(k => {
        const el = document.querySelector(`.staff-chk[data-id="${k}"]`);
        if (el && el.checked) stageDone++;
      });

      const pillEl = document.getElementById(stagePillMap[stageKey]);
      if (pillEl) {
        pillEl.textContent = `${stageDone}/${stageTotal}`;
      }
    });
  }

  // 4) 체크리스트 저장
  async function saveChecklist() {
    const checkedItems = Array.from(document.querySelectorAll('.staff-chk'))
      .filter(c => c.checked)
      .map(c => c.dataset.id);

    try {
      await fetch('/staff/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ checkedItems })
      });
    } catch (err) {
      console.error('[StaffDashboard] Error saving checklist:', err);
    }
  }

  // 5) 스타터-스태프 명단 로드
  async function loadStarterStaff() {
    const listEl = document.getElementById('starter-staff-member-list');
    if (!listEl) return;

    try {
      if (allMembers.length === 0) {
        let memRes = await fetch('/user/participants/users', { credentials: 'include' });
        if (!memRes.ok) {
          memRes = await fetch('/user/participants/hr-members', { credentials: 'include' });
        }

        if (memRes.ok) {
          allMembers = await memRes.json();
        } else {
          console.warn('[StaffDashboard] Error fetching members:', memRes.status);
          listEl.innerHTML = `<div style="color: #ef4444; padding: 12px; text-align: center; grid-column: 1/-1;">회원 목록 조회 권한이 없거나 오류가 발생했습니다. (HTTP ${memRes.status})</div>`;
          return;
        }
      }

      const res = await fetch('/staff/starter-staff', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        selectedStarterStaffIds = new Set((data.memberIds || []).map(id => id.toString()));
      }

      renderConfirmedStarterStaff();
      renderMembers();
    } catch (err) {
      console.error('[StaffDashboard] Error loading starter staff:', err);
      listEl.innerHTML = '<div style="color:#ef4444;padding:12px;text-align:center;grid-column:1/-1;">스타터-스태프 명단을 불러오는 중 오류가 발생했습니다.</div>';
    }
  }

  // 6) 확정된 스타터-스태프 명단 상단 박스 렌더링
  function renderConfirmedStarterStaff() {
    const listEl = document.getElementById('confirmed-starter-staff-list');
    const countEl = document.getElementById('confirmed-starter-staff-count');
    if (!listEl) return;

    const confirmedMembers = allMembers.filter(m => {
      const mId = (m._id || m.id).toString();
      return selectedStarterStaffIds.has(mId);
    });

    if (countEl) countEl.textContent = confirmedMembers.length;

    if (confirmedMembers.length === 0) {
      listEl.innerHTML = '<span style="font-size: 0.88rem; color: #94a3b8;">확정된 스타터-스태프가 없습니다.</span>';
    } else {
      listEl.innerHTML = confirmedMembers.map(m => {
        const name = escapeHtml(m.name || m.displayName || '이름없음');
        const phoneTail = m.phonenumber ? String(m.phonenumber).slice(-4) : '';
        return `
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #ffffff; color: #b45309; border: 1px solid #f59e0b; border-radius: 20px; font-size: 0.85rem; font-weight: 600; box-shadow: 0 2px 6px rgba(245,158,11,0.12);">
            ⭐ ${name} ${phoneTail ? `<small style="color:#d97706; font-weight:normal;">(${phoneTail})</small>` : ''}
          </span>
        `;
      }).join('');
    }
  }

  // 7) 회원 목록 렌더링
  function renderMembers() {
    const listEl = document.getElementById('starter-staff-member-list');
    const countEl = document.getElementById('starter-staff-selected-count');
    if (!listEl) return;

    const keyword = (document.getElementById('starter-staff-search')?.value || '').trim().toLowerCase();

    const filtered = allMembers.filter(m => {
      // 참가자('participant') 및 운영진('officer')만 포함
      if (m.role !== 'participant' && m.role !== 'officer') return false;

      if (!keyword) return true;
      const name = (m.name || m.displayName || '').toLowerCase();
      const phone = String(m.phonenumber || '').slice(-4);
      return name.includes(keyword) || phone.includes(keyword);
    });

    if (filtered.length === 0) {
      listEl.innerHTML = '<div style="color: #94a3b8; padding: 10px; text-align: center; grid-column: 1/-1;">검색 조건에 일치하는 회원이 없습니다.</div>';
    } else {
      listEl.innerHTML = filtered.map(m => {
        const mId = (m._id || m.id).toString();
        const isChecked = selectedStarterStaffIds.has(mId);
        const name = escapeHtml(m.name || m.displayName || '이름없음');
        const team = m.team ? `<span style="font-size: 0.76rem; color: #b45309; background: #fef3c7; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">${escapeHtml(m.team)}</span>` : '';
        const phoneTail = m.phonenumber ? String(m.phonenumber).slice(-4) : '';

        return `
          <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: ${isChecked ? '#fffbeb' : '#f8fafc'}; border: 1px solid ${isChecked ? '#f59e0b' : '#e2e8f0'}; border-radius: 10px; cursor: pointer; transition: all 0.15s ease;">
            <input type="checkbox" value="${mId}" ${isChecked ? 'checked' : ''} onchange="window.StaffDashboard.toggleStarterMember('${mId}', this.checked)" style="accent-color: #f59e0b; width: 16px; height: 16px; cursor: pointer;">
            <span style="font-size: 0.9rem; font-weight: 600; color: #1e293b;">${name}</span>
            ${phoneTail ? `<span style="font-size: 0.8rem; color: #94a3b8;">(${phoneTail})</span>` : ''}
            ${team}
          </label>
        `;
      }).join('');
    }

    if (countEl) countEl.textContent = selectedStarterStaffIds.size;
  }

  function filterMembers() {
    renderMembers();
  }

  function toggleStarterMember(id, checked) {
    if (checked) {
      selectedStarterStaffIds.add(id);
    } else {
      selectedStarterStaffIds.delete(id);
    }
    const countEl = document.getElementById('starter-staff-selected-count');
    if (countEl) countEl.textContent = selectedStarterStaffIds.size;
    renderMembers();
  }

  // 8) 스타터-스태프 저장
  async function saveStarterStaff() {
    try {
      const res = await fetch('/staff/starter-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          memberIds: Array.from(selectedStarterStaffIds)
        })
      });

      const result = await res.json();
      if (res.ok) {
        alert(result.message || '스타터-스태프 명단이 확정되었습니다.');
        renderConfirmedStarterStaff();
        renderMembers();
      } else {
        alert(result.message || '저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('[StaffDashboard] Error saving starter staff:', err);
      alert('스타터-스태프 저장 중 오류가 발생했습니다.');
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toggleStarterStaffTab() {
    const panel = document.getElementById('starter-staff-panel');
    const btn = document.querySelector('.starter-staff-toggle-btn');
    if (!panel) return;

    const isHidden = panel.style.display === 'none' || panel.hasAttribute('hidden');
    if (isHidden) {
      panel.removeAttribute('hidden');
      panel.style.display = 'block';
      if (btn) btn.classList.add('is-open');
    } else {
      panel.setAttribute('hidden', '');
      panel.style.display = 'none';
      if (btn) btn.classList.remove('is-open');
    }
  }

  // Global interface
  window.StaffDashboard = {
    initialize,
    handleCheckChange,
    filterMembers,
    toggleStarterMember,
    saveStarterStaff,
    toggleStarterStaffTab
  };

  setTimeout(() => {
    initialize();
  }, 100);
})();
