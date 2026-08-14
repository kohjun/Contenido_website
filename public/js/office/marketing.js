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

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const yearSelect = document.getElementById('supporter-year');
    const monthSelect = document.getElementById('supporter-month');

    // 현재 연도 및 월 기본 설정 (최초 1회 설정)
    if (yearSelect && (!yearSelect.dataset.initialized)) {
      yearSelect.value = String(currentYear);
      yearSelect.dataset.initialized = 'true';
    }
    if (monthSelect && (!monthSelect.dataset.initialized)) {
      monthSelect.value = String(currentMonth);
      monthSelect.dataset.initialized = 'true';
    }

    const year = yearSelect?.value || currentYear;
    const month = monthSelect?.value || currentMonth;

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

      renderConfirmedSupporters(month);
      renderSupporterMembers();
      renderUnivSection();
    } catch (error) {
      console.error('[Marketing] Error loading supporters:', error);
      listEl.innerHTML = '<div style="color: #ef4444; padding: 12px; text-align: center; grid-column: 1/-1;">서포터즈 명단을 불러오는 중 오류가 발생했습니다.</div>';
    }
  }

  // 11) 확정된 서포터즈 명단 상단 박스 렌더링
  function renderConfirmedSupporters(month) {
    const monthLabel = document.getElementById('confirmed-month-label');
    const titleMonth = document.getElementById('supporter-title-month');
    const listEl = document.getElementById('confirmed-supporters-list');
    const countEl = document.getElementById('confirmed-supporters-count');
    const noteEl = document.getElementById('supporter-next-month-note');

    const mNum = parseInt(month);
    const nextMonth = mNum === 12 ? 1 : mNum + 1;

    if (monthLabel) monthLabel.textContent = `${month}월`;
    if (titleMonth) titleMonth.textContent = `${month}월`;
    if (noteEl && !isNaN(mNum)) {
      noteEl.textContent = `${mNum}월 서포터즈 인원을 선택하고 저장하면 다음 달인 ${nextMonth}월 인사팀 페이지에서 '서포터즈' 표시 및 의무 신청 경고가 자동으로 면제됩니다.`;
    }

    if (!listEl) return;

    const confirmedMembers = allMembers.filter(m => {
      const mId = (m._id || m.id).toString();
      return selectedSupporterIds.has(mId);
    });

    if (countEl) countEl.textContent = confirmedMembers.length;

    if (confirmedMembers.length === 0) {
      listEl.innerHTML = `<span style="font-size: 0.88rem; color: #94a3b8;">${month}월에 확정된 서포터즈가 없습니다.</span>`;
    } else {
      listEl.innerHTML = confirmedMembers.map(m => {
        const name = escapeHtml(m.name || m.displayName || '이름없음');
        const phoneTail = m.phonenumber ? String(m.phonenumber).slice(-4) : '';
        return `
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #ffffff; color: #be185d; border: 1px solid #f472b6; border-radius: 20px; font-size: 0.85rem; font-weight: 600; box-shadow: 0 2px 6px rgba(236,72,153,0.12);">
            🌟 ${name} ${phoneTail ? `<small style="color:#ec4899; font-weight:normal;">(${phoneTail})</small>` : ''}
          </span>
        `;
      }).join('');
    }
  }

  // 12) 회원 목록 렌더링
  function renderSupporterMembers() {
    const listEl = document.getElementById('supporter-member-list');
    const countEl = document.getElementById('supporter-selected-count');
    if (!listEl) return;

    const searchKeyword = (document.getElementById('supporter-search')?.value || '').trim().toLowerCase();

    const filtered = allMembers.filter(m => {
      // 참가자('participant') 및 운영진('officer')만 포함
      if (m.role !== 'participant' && m.role !== 'officer') return false;

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

  // 13) 서포터즈 명단 저장
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
        renderConfirmedSupporters(month);
        renderSupporterMembers();
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

  // 클라이언트 단 고화질 이미지 압축 유틸리티 (413 Payload Too Large 방지)
  function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) {
        return resolve(file);
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) return resolve(file);
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  }

  // 7) 등록 및 수정 저장 전송
  async function handleSubmit(e) {
    e.preventDefault();
    const form = document.getElementById(FORM_ID);
    const promoId = document.getElementById('promo-id').value;
    const submitBtn = document.getElementById('btn-submit-promo');
    const photoInput = document.getElementById('promo-photo');

    submitBtn.disabled = true;
    submitBtn.textContent = '이미지 처리 및 저장 중...';

    try {
      const formData = new FormData(form);

      // 모바일/고화질 이미지 클라이언트 단 경량화 압축
      if (photoInput && photoInput.files && photoInput.files[0]) {
        const originalFile = photoInput.files[0];
        if (originalFile.size > 200 * 1024) { // 200KB 초과 시 압축
          const compressed = await compressImage(originalFile);
          formData.set('photo', compressed, compressed.name);
        }
      }

      // Checkbox mapping
      const isActiveVal = document.getElementById('promo-is-active').checked;
      formData.set('isActive', isActiveVal ? 'true' : 'false');

      const url = promoId ? `/promotions/${promoId}` : '/promotions';
      const method = promoId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        body: formData
      });

      let result;
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch (parseErr) {
        if (response.status === 413) {
          throw new Error('업로드한 이미지 파일 용량이 너무 큽니다. 더 작은 이미지를 선택해 주세요.');
        }
        throw new Error(`서버 응답 오류 (HTTP ${response.status})`);
      }

      if (response.ok) {
        alert(result.message || '홍보 정보가 정상 저장되었습니다.');
        closeFormModal();
        await loadPromotions();
      } else {
        alert(`저장 실패: ${result.message || '오류가 발생했습니다.'}`);
      }
    } catch (err) {
      console.error('[Marketing] Save error:', err);
      alert(err.message || '통신 중 오류가 발생했습니다.');
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

  // 13) 활성 부원 출신 대학 현황 렌더링
  function renderUnivSection() {
    const gridEl = document.getElementById('univ-member-grid');
    const summaryEl = document.getElementById('univ-summary-pills');
    const filterSelect = document.getElementById('univ-filter-select');
    const activeTotalEl = document.getElementById('univ-active-total-count');
    const univTotalEl = document.getElementById('univ-total-count');

    if (!gridEl) return;

    // 1. 활성 유저만 필터링 (active === true)
    const activeMembers = allMembers.filter(m => m.active === true);

    if (activeTotalEl) activeTotalEl.textContent = activeMembers.length;

    // 2. 대학별 집계 계산
    const univCounts = {};
    activeMembers.forEach(m => {
      const uName = (m.university && m.university.trim()) ? m.university.trim() : '미입력';
      univCounts[uName] = (univCounts[uName] || 0) + 1;
    });

    const sortedUnivs = Object.keys(univCounts).sort((a, b) => {
      if (a === '미입력') return 1;
      if (b === '미입력') return -1;
      return univCounts[b] - univCounts[a];
    });

    if (univTotalEl) univTotalEl.textContent = sortedUnivs.filter(u => u !== '미입력').length;

    // 3. 대학별 현황 요약 태그(Pills) 렌더링 & 드롭다운 셀렉트 갱신
    if (summaryEl) {
      if (activeMembers.length === 0) {
        summaryEl.innerHTML = '<span style="font-size: 0.88rem; color: #94a3b8;">등록된 활성 부원이 없습니다.</span>';
      } else {
        let pillsHtml = `
          <button type="button" onclick="window.MarketingDashboard.selectUnivFilter('all')" class="univ-pill-btn active" data-univ="all" style="padding: 4px 12px; border-radius: 20px; border: 1px solid #0284c7; background: #0284c7; color: #fff; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
            전체 (${activeMembers.length}명)
          </button>
        `;
        sortedUnivs.forEach(u => {
          const count = univCounts[u];
          pillsHtml += `
            <button type="button" onclick="window.MarketingDashboard.selectUnivFilter('${escapeHtml(u)}')" class="univ-pill-btn" data-univ="${escapeHtml(u)}" style="padding: 4px 12px; border-radius: 20px; border: 1px solid #bae6fd; background: #ffffff; color: #0369a1; font-size: 0.82rem; font-weight: 600; cursor: pointer;">
              ${escapeHtml(u)} (${count}명)
            </button>
          `;
        });
        summaryEl.innerHTML = pillsHtml;
      }
    }

    if (filterSelect) {
      let optionsHtml = '<option value="all">전체 대학 보기</option>';
      sortedUnivs.forEach(u => {
        optionsHtml += `<option value="${escapeHtml(u)}">${escapeHtml(u)} (${univCounts[u]}명)</option>`;
      });
      filterSelect.innerHTML = optionsHtml;
    }

    filterUnivMembers();
  }

  // 동명이인 감지 맵 생성 (이름별 인원수)
  function getDuplicateNameSet(members) {
    const nameCounts = {};
    members.forEach(m => {
      const n = (m.name || m.displayName || '').trim();
      if (n) nameCounts[n] = (nameCounts[n] || 0) + 1;
    });
    return nameCounts;
  }

  // 나이 계산 함수
  function calcAgeStr(birthDateStr) {
    if (!birthDateStr) return '-';
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return '-';
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? `${age}세` : '-';
  }

  // 14) 활성 부원 대학 검색 & 필터링 렌더링
  function filterUnivMembers() {
    const gridEl = document.getElementById('univ-member-grid');
    const searchInput = document.getElementById('univ-search-input');
    const filterSelect = document.getElementById('univ-filter-select');

    if (!gridEl) return;

    const searchTerm = (searchInput?.value || '').trim().toLowerCase();
    const selectedUniv = filterSelect?.value || 'all';

    const activeMembers = allMembers.filter(m => m.active === true);
    const nameCounts = getDuplicateNameSet(activeMembers);

    const filtered = activeMembers.filter(m => {
      const name = (m.name || '').toLowerCase();
      const displayName = (m.displayName || '').toLowerCase();
      const phone = (m.phonenumber || '').toLowerCase();
      const phoneTail = phone.length >= 4 ? phone.slice(-4) : phone;
      const univ = (m.university || '미입력').toLowerCase();

      // 대학 필터
      if (selectedUniv !== 'all') {
        const targetUniv = (m.university && m.university.trim()) ? m.university.trim() : '미입력';
        if (targetUniv !== selectedUniv) return false;
      }

      // 검색어 필터
      if (searchTerm) {
        const matchesName = name.includes(searchTerm);
        const matchesDisplay = displayName.includes(searchTerm);
        const matchesPhone = phone.includes(searchTerm) || phoneTail.includes(searchTerm);
        const matchesUniv = univ.includes(searchTerm);
        return matchesName || matchesDisplay || matchesPhone || matchesUniv;
      }

      return true;
    });

    if (filtered.length === 0) {
      gridEl.innerHTML = '<div style="color: #64748b; padding: 24px; text-align: center; grid-column: 1/-1;">조건에 부합하는 활성 부원이 없습니다.</div>';
      return;
    }

    gridEl.innerHTML = filtered.map(m => {
      const realName = escapeHtml(m.name || m.displayName || '이름없음');
      const profileName = escapeHtml(m.displayName || m.name || '-');
      const phoneTail = m.phonenumber ? String(m.phonenumber).replace(/[^0-9]/g, '').slice(-4) : '****';
      const ageStr = calcAgeStr(m.birthDate);
      const univStr = (m.university && m.university.trim()) ? escapeHtml(m.university.trim()) : '미입력';
      const isNoUniv = !m.university || !m.university.trim();
      const avatarSrc = escapeHtml(m.profileImage || '/images/basic_Image.png');

      // 동명이인 여부 확인
      const rawName = (m.name || m.displayName || '').trim();
      const isDuplicate = (nameCounts[rawName] || 0) > 1;

      return `
        <div class="univ-member-card">
          <img src="${avatarSrc}" alt="${realName}" onerror="this.src='/images/basic_Image.png'" class="univ-avatar">
          <div class="univ-info-block">
            <div class="univ-name-row">
              <span class="univ-user-name">${realName}</span>
              ${isDuplicate ? `<span class="univ-dup-badge" title="동명이인 구분을 위해 프로필명/연락처 확인">동명이인</span>` : ''}
              <span class="univ-user-age">${ageStr}</span>
            </div>
            <div class="univ-profile-row">
              <span class="univ-profile-name">@${profileName}</span>
              <span class="univ-phone-tail">(${phoneTail})</span>
            </div>
            <div>
              <span class="univ-badge-tag ${isNoUniv ? 'no-univ' : ''}">
                🎓 ${univStr}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 요약 버튼(Pill) 클릭 시 필터 적용
  function selectUnivFilter(univName) {
    const filterSelect = document.getElementById('univ-filter-select');
    if (filterSelect) {
      filterSelect.value = univName;
    }

    // pill 버튼 active 처리
    document.querySelectorAll('.univ-pill-btn').forEach(btn => {
      const u = btn.dataset.univ;
      if (u === univName) {
        btn.style.background = '#0284c7';
        btn.style.color = '#ffffff';
        btn.style.borderColor = '#0284c7';
      } else {
        btn.style.background = '#ffffff';
        btn.style.color = '#0369a1';
        btn.style.borderColor = '#bae6fd';
      }
    });

    filterUnivMembers();
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
    saveSupporters,
    renderUnivSection,
    filterUnivMembers,
    selectUnivFilter
  };

  // HTML SPA 렌더링 후 자동 이니셜라이징 지원
  setTimeout(() => {
    initialize();
  }, 100);
})();
