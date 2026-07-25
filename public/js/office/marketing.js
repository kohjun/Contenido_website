// public/js/office/marketing.js
(function () {
  const MODAL_ID = 'promo-form-modal';
  const FORM_ID = 'promo-form';

  let allPromotions = [];
  let eventsList = [];

  let allMembers = [];
  let selectedSupporterIds = new Set();

  // 1) 초기화
  async function initialize() {
    console.log('[Marketing] Dashboard initializing...');
    await loadEventsDropdown();
    await loadPromotions();
    await loadSupporters();
  }

  // 10) 서포터즈 명단 불러오기
  async function loadSupporters() {
    const listEl = document.getElementById('supporter-member-list');
    if (!listEl) return;

    const year = document.getElementById('supporter-year')?.value || 2026;
    const month = document.getElementById('supporter-month')?.value || 8;

    try {
      if (allMembers.length === 0) {
        let memRes = await fetch('/user/participants/users', { credentials: 'include' });
        if (!memRes.ok) {
          memRes = await fetch('/user/participants/hr-members', { credentials: 'include' });
        }

        if (memRes.ok) {
          allMembers = await memRes.json();
        } else {
          console.warn('[Marketing] Error fetching members:', memRes.status);
          listEl.innerHTML = `<div style="color: #ef4444; padding: 12px; text-align: center; grid-column: 1/-1;">회원 목록 조회 권한이 없거나 오류가 발생했습니다. (HTTP ${memRes.status})</div>`;
          return;
        }
      }

      const response = await fetch(`/promotions/supporters?year=${year}&month=${month}`, { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        selectedSupporterIds = new Set((data.memberIds || []).map(id => id.toString()));
      } else {
        selectedSupporterIds = new Set();
      }

      renderSupporterMembers();
    } catch (error) {
      console.error('[Marketing] Error loading supporters:', error);
      listEl.innerHTML = '<div style="color: #ef4444; padding: 12px; text-align: center; grid-column: 1/-1;">서포터즈 명단을 불러오는 중 오류가 발생했습니다.</div>';
    }
  }

  // 11) 회원 목록 렌더링
  function renderSupporterMembers() {
    const listEl = document.getElementById('supporter-member-list');
    const countEl = document.getElementById('supporter-selected-count');
    if (!listEl) return;

    const searchKeyword = (document.getElementById('supporter-search')?.value || '').trim().toLowerCase();

    const filtered = allMembers.filter(m => {
      if (!searchKeyword) return true;
      const name = (m.name || m.displayName || '').toLowerCase();
      const phone = String(m.phonenumber || '').slice(-4);
      return name.includes(searchKeyword) || phone.includes(searchKeyword);
    });

    if (filtered.length === 0) {
      listEl.innerHTML = '<div style="color: #94a3b8; padding: 10px; text-align: center; grid-column: 1/-1;">검색 조건에 일치하는 회원이 없습니다.</div>';
    } else {
      listEl.innerHTML = filtered.map(m => {
        const mId = (m._id || m.id).toString();
        const isChecked = selectedSupporterIds.has(mId);
        const name = escapeHtml(m.name || m.displayName || '이름없음');
        const team = m.team ? `<span style="font-size: 0.76rem; color: #be185d; background: #fce7f3; padding: 2px 6px; border-radius: 4px; margin-left: 4px;">${escapeHtml(m.team)}</span>` : '';
        const phoneTail = m.phonenumber ? String(m.phonenumber).slice(-4) : '';

        return `
          <label style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: ${isChecked ? '#fdf2f8' : '#f8fafc'}; border: 1px solid ${isChecked ? '#f472b6' : '#e2e8f0'}; border-radius: 10px; cursor: pointer; transition: all 0.15s ease;">
            <input type="checkbox" value="${mId}" ${isChecked ? 'checked' : ''} onchange="window.MarketingDashboard.toggleSupporterMember('${mId}', this.checked)" style="accent-color: #ec4899; width: 16px; height: 16px; cursor: pointer;">
            <span style="font-size: 0.9rem; font-weight: 600; color: #1e293b;">${name}</span>
            ${phoneTail ? `<span style="font-size: 0.8rem; color: #94a3b8;">(${phoneTail})</span>` : ''}
            ${team}
          </label>
        `;
      }).join('');
    }

    if (countEl) {
      countEl.textContent = selectedSupporterIds.size;
    }
  }

  function filterSupporterMembers() {
    renderSupporterMembers();
  }

  function toggleSupporterMember(id, checked) {
    if (checked) {
      selectedSupporterIds.add(id);
    } else {
      selectedSupporterIds.delete(id);
    }
    const countEl = document.getElementById('supporter-selected-count');
    if (countEl) {
      countEl.textContent = selectedSupporterIds.size;
    }
    renderSupporterMembers();
  }

  // 12) 서포터즈 명단 저장
  async function saveSupporters() {
    const year = document.getElementById('supporter-year')?.value || 2026;
    const month = document.getElementById('supporter-month')?.value || 8;

    try {
      const response = await fetch('/promotions/supporters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          year: parseInt(year),
          month: parseInt(month),
          memberIds: Array.from(selectedSupporterIds)
        })
      });

      const result = await response.json();
      if (response.ok) {
        alert(result.message || '서포터즈 명단이 저장되었습니다.');
      } else {
        alert(result.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('[Marketing] Error saving supporters:', error);
      alert('서포터즈 명단 저장 중 오류가 발생했습니다.');
    }
  }

  // 9) HTML 이스케이프 헬퍼
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 글로벌 인터페이스 바인딩
  window.MarketingDashboard = {
    initialize,
    openCreateModal,
    openEditModal,
    closeFormModal,
    handlePhotoChange,
    handleSubmit,
    handleDelete,
    loadSupporters,
    filterSupporterMembers,
    toggleSupporterMember,
    saveSupporters
  };

  // HTML SPA 렌더링 후 자동 이니셜라이징 지원
  setTimeout(() => {
    initialize();
  }, 100);
})();

  // 2) 연동할 이벤트 목록 불러와 드롭다운 생성
  async function loadEventsDropdown() {
    try {
      const response = await fetch('/events');
      if (response.ok) {
        eventsList = await response.json();
        const select = document.getElementById('promo-event-id');
        if (select) {
          // 기존 선택 항목 초기화
          select.innerHTML = '<option value="null">선택하지 않음 (이벤트와 무관한 단순 홍보)</option>';
          // 진행 중이거나 예정된 이벤트를 정렬하여 드롭다운에 삽입
          const sorted = eventsList.sort((a, b) => new Date(b.date) - new Date(a.date));
          sorted.forEach(ev => {
            const dateStr = new Date(ev.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
            const opt = document.createElement('option');
            opt.value = ev._id || ev.id;
            opt.textContent = `[${dateStr}] ${ev.title}`;
            select.appendChild(opt);
          });
        }
      }
    } catch (error) {
      console.error('[Marketing] Error loading events list:', error);
    }
  }

  // 3) 모든 홍보 목록 조회 및 렌더링
  async function loadPromotions() {
    const listEl = document.getElementById('promotion-list');
    if (!listEl) return;

    listEl.innerHTML = '<div class="loading-placeholder">홍보 목록을 불러오는 중...</div>';

    try {
      const response = await fetch('/promotions', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('홍보 목록을 불러오지 못했습니다.');
      }
      
      allPromotions = await response.json();
      renderPromotions(allPromotions);
    } catch (error) {
      listEl.innerHTML = `<div class="empty-placeholder" style="color: #ef4444;">오류: ${error.message}</div>`;
    }
  }

  // 4) 홍보 목록 렌더링
  function renderPromotions(list) {
    const listEl = document.getElementById('promotion-list');
    if (!listEl) return;

    if (!list || list.length === 0) {
      listEl.innerHTML = '<div class="empty-placeholder">등록된 홍보 및 혜택 이벤트가 없습니다.</div>';
      return;
    }

    listEl.innerHTML = '';
    const now = new Date();

    list.forEach(promo => {
      const start = new Date(promo.startDate);
      const end = new Date(promo.endDate);
      
      // 상태 판정
      let statusClass = 'active';
      let statusLabel = '진행 중';
      if (!promo.isActive) {
        statusClass = 'inactive';
        statusLabel = '비활성화';
      } else if (now < start) {
        statusClass = 'scheduled';
        statusLabel = '진행 예정';
      } else if (now > end) {
        statusClass = 'expired';
        statusLabel = '기간 만료';
      }

      const dateRangeText = `${start.toLocaleDateString()} ~ ${end.toLocaleDateString()}`;
      const eventText = promo.targetEventId ? `🔗 ${promo.targetEventId.title}` : '단독 홍보 (연동 없음)';

      const card = document.createElement('div');
      card.className = 'promo-card';
      card.innerHTML = `
        <div class="promo-card-image">
          <img src="${promo.imageUrl}" alt="${escapeHtml(promo.title)}" onerror="this.src='/images/Basic_Event_Image.png'">
          <span class="promo-status-badge ${statusClass}">${statusLabel}</span>
        </div>
        <div class="promo-card-body">
          <h3>${escapeHtml(promo.title)}</h3>
          <div class="promo-meta">📅 <strong>노출 기간:</strong> ${dateRangeText}</div>
          <div class="promo-meta">🎯 <strong>연동 이벤트:</strong> ${escapeHtml(eventText)}</div>
          <div class="promo-card-footer">
            <button type="button" class="btn-card edit" onclick="window.MarketingDashboard.openEditModal('${promo._id}')">수정</button>
            <button type="button" class="btn-card delete" onclick="window.MarketingDashboard.handleDelete('${promo._id}')">삭제</button>
          </div>
        </div>
      `;
      listEl.appendChild(card);
    });
  }

  // 5) 모달 관련 조작
  function openCreateModal() {
    const modal = document.getElementById(MODAL_ID);
    const form = document.getElementById(FORM_ID);
    if (!modal || !form) return;

    form.reset();
    document.getElementById('promo-id').value = '';
    document.getElementById('promo-modal-title').textContent = '신규 홍보 등록';
    document.getElementById('photo-required').style.display = 'inline'; // 새등록 시 필수 표시

    // 미리보기 이미지 초기화
    const previewImg = document.getElementById('photo-preview');
    const previewPlaceholder = document.querySelector('#photo-preview-container .preview-placeholder');
    if (previewImg) previewImg.style.display = 'none';
    if (previewPlaceholder) previewPlaceholder.style.display = 'inline';

    modal.style.display = 'flex';
  }

  function openEditModal(id) {
    const modal = document.getElementById(MODAL_ID);
    const form = document.getElementById(FORM_ID);
    if (!modal || !form) return;

    const promo = allPromotions.find(p => p._id === id);
    if (!promo) return;

    form.reset();
    document.getElementById('promo-id').value = promo._id;
    document.getElementById('promo-modal-title').textContent = '홍보 정보 수정';
    document.getElementById('photo-required').style.display = 'none'; // 수정 시에는 이미지 선택이 필수가 아님

    // 바인딩
    document.getElementById('promo-title').value = promo.title;
    document.getElementById('promo-start-date').value = new Date(promo.startDate).toISOString().split('T')[0];
    document.getElementById('promo-end-date').value = new Date(promo.endDate).toISOString().split('T')[0];
    document.getElementById('promo-event-id').value = promo.targetEventId ? (promo.targetEventId._id || promo.targetEventId.id || promo.targetEventId) : 'null';
    document.getElementById('promo-is-active').checked = !!promo.isActive;
    document.getElementById('promo-benefit-detail').value = promo.benefitDetail;

    // 이미지 미리보기 바인딩
    const previewImg = document.getElementById('photo-preview');
    const previewPlaceholder = document.querySelector('#photo-preview-container .preview-placeholder');
    if (previewImg && promo.imageUrl) {
      previewImg.src = promo.imageUrl;
      previewImg.style.display = 'block';
      if (previewPlaceholder) previewPlaceholder.style.display = 'none';
    }

    modal.style.display = 'flex';
  }

  function closeFormModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.style.display = 'none';
  }

  // 6) 이미지 선택 미리보기 핸들러
  function handlePhotoChange(e) {
    const file = e.target.files[0];
    const previewImg = document.getElementById('photo-preview');
    const previewPlaceholder = document.querySelector('#photo-preview-container .preview-placeholder');

    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        if (previewImg) {
          previewImg.src = event.target.result;
          previewImg.style.display = 'block';
        }
        if (previewPlaceholder) previewPlaceholder.style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  }

  // 7) 등록 및 수정 저장 전송
  async function handleSubmit(e) {
    e.preventDefault();
    const form = document.getElementById(FORM_ID);
    const promoId = document.getElementById('promo-id').value;
    const submitBtn = document.getElementById('btn-submit-promo');

    const formData = new FormData(form);
    
    // Checkbox mapping
    const isActiveVal = document.getElementById('promo-is-active').checked;
    formData.set('isActive', isActiveVal ? 'true' : 'false');

    submitBtn.disabled = true;
    submitBtn.textContent = '저장 중...';

    const url = promoId ? `/promotions/${promoId}` : '/promotions';
    const method = promoId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        body: formData
      });

      const result = await response.json();
      if (response.ok) {
        alert(result.message || '홍보 정보가 정상 저장되었습니다.');
        closeFormModal();
        await loadPromotions();
      } else {
        alert(`저장 실패: ${result.message}`);
      }
    } catch (err) {
      console.error('[Marketing] Save error:', err);
      alert('통신 중 오류가 발생했습니다.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '저장하기';
    }
  }

  // 8) 홍보물 삭제
  async function handleDelete(id) {
    if (!confirm('정말로 이 홍보 혜택 이벤트를 삭제하시겠습니까?\n삭제된 정보는 복구할 수 없습니다.')) return;

    try {
      const response = await fetch(`/promotions/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (response.ok) {
        alert(result.message || '삭제되었습니다.');
        await loadPromotions();
      } else {
        alert(`삭제 실패: ${result.message}`);
      }
    } catch (err) {
      console.error('[Marketing] Delete error:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  }

  // 9) HTML 이스케이프 헬퍼
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 글로벌 인터페이스 바인딩
  window.MarketingDashboard = {
    initialize,
    openCreateModal,
    openEditModal,
    closeFormModal,
    handlePhotoChange,
    handleSubmit,
    handleDelete,
    loadSupporters,
    filterSupporterMembers,
    toggleSupporterMember,
    saveSupporters
  };

  // HTML SPA 렌더링 후 자동 이니셜라이징 지원
  setTimeout(() => {
    initialize();
  }, 100);
})();
