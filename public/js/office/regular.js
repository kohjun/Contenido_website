// public/js/office/regular.js
(function () {
  'use strict';
  console.log('[regular.js] loaded — v20260601');

  // 1) 체크리스트 로드
  async function loadChecklist() {
    try {
      const res = await fetch('/regular/checklist', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const checkedSet = new Set(data.checkedItems || []);

      document.querySelectorAll('.reg-chk').forEach(chk => {
        const id = chk.dataset.id;
        chk.checked = checkedSet.has(id);
      });

      updateProgressPills();
    } catch (err) {
      console.error('[RegularDashboard] Error loading checklist:', err);
    }
  }

  // 2) 진행도 뱃지 업데이트
  function updateProgressPills() {
    const stageMap = {
      'reg-stage-1': ['reg_s1_chk_1', 'reg_s1_chk_2', 'reg_s1_chk_3', 'reg_s1_chk_4', 'reg_s1_chk_5', 'reg_s1_chk_6', 'reg_s1_chk_7'],
      'reg-stage-2': ['reg_s2_chk_1', 'reg_s2_chk_2', 'reg_s2_chk_3', 'reg_s2_chk_4', 'reg_s2_chk_5', 'reg_s2_chk_6', 'reg_s2_chk_7', 'reg_s2_chk_8'],
      'reg-stage-3': ['reg_s3_chk_1', 'reg_s3_chk_2', 'reg_s3_chk_3', 'reg_s3_chk_4', 'reg_s3_chk_5', 'reg_s3_chk_6', 'reg_s3_chk_7', 'reg_s3_chk_8'],
      'reg-stage-4': ['reg_s4_chk_1', 'reg_s4_chk_2', 'reg_s4_chk_3', 'reg_s4_chk_4', 'reg_s4_chk_5', 'reg_s4_chk_6', 'reg_s4_chk_7', 'reg_s4_chk_8'],
      'reg-stage-5': ['reg_s5_chk_1', 'reg_s5_chk_2', 'reg_s5_chk_3', 'reg_s5_chk_4', 'reg_s5_chk_5', 'reg_s5_chk_6', 'reg_s5_chk_7', 'reg_s5_chk_8'],
      'reg-stage-retro': ['reg_sretro_chk_1', 'reg_sretro_chk_2', 'reg_sretro_chk_3', 'reg_sretro_chk_4', 'reg_sretro_chk_5']
    };

    Object.entries(stageMap).forEach(([pillId, ids]) => {
      const pillEl = document.getElementById(`pill-${pillId}`);
      if (!pillEl) return;
      let checkedCount = 0;
      ids.forEach(id => {
        const el = document.querySelector(`.reg-chk[data-id="${id}"]`);
        if (el && el.checked) checkedCount++;
      });
      pillEl.textContent = `${checkedCount}/${ids.length}`;
    });
  }

  // 3) 체크 변경 이벤트
  function handleCheckChange() {
    updateProgressPills();
    saveChecklist();
  }

  // 4) 체크리스트 저장 (디바운싱 적용)
  let saveTimer = null;
  function saveChecklist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const checkedItems = [];
      document.querySelectorAll('.reg-chk:checked').forEach(chk => {
        if (chk.dataset.id) checkedItems.push(chk.dataset.id);
      });

      try {
        await fetch('/regular/checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ checkedItems })
        });
      } catch (err) {
        console.error('[RegularDashboard] Error saving checklist:', err);
      }
    }, 400);
  }

  async function init() {
    await loadChecklist();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.RegularDashboard = {
    handleCheckChange,
    loadChecklist,
    saveChecklist
  };
})();
