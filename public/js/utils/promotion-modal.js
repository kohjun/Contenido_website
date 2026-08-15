// public/js/utils/promotion-modal.js
(async function() {
  try {
    // 1) 활성화된 홍보 데이터 조회
    const response = await fetch('/promotions/active');
    if (!response.ok) return;

    const promos = await response.json();
    if (!promos || promos.length === 0) return; // 활성화된 홍보 없음

    // 2) 오늘 하루 보지 않기 설정 체크 (새로 추가/수정된 홍보가 있으면 팝업 노출)
    const dismissKey = `dismiss_promotion_all`;
    const dismissVal = localStorage.getItem(dismissKey);
    if (dismissVal) {
      const dismissTime = parseInt(dismissVal, 10);
      const latestPromoTime = Math.max(...promos.map(p => new Date(p.updatedAt || p.createdAt || 0).getTime()));

      // 새로 등록/수정된 홍보가 없는 경우에만 '오늘 하루 보지 않기' 적용
      if (!isNaN(dismissTime) && dismissTime >= latestPromoTime) {
        const dismissDate = new Date(dismissTime);
        const now = new Date();
        if (dismissDate.toDateString() === now.toDateString()) {
          return;
        } else {
          localStorage.removeItem(dismissKey);
        }
      }
    }

    // 3) 스타일 동적 주입
    injectStyles();

    // 4) 모달 DOM 생성
    createPromoModal(promos, dismissKey);
  } catch (error) {
    console.error('[PromotionModal] Failed to load active promotions:', error);
  }

  function injectStyles() {
    if (document.getElementById('promo-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'promo-modal-styles';
    style.innerHTML = `
      @font-face {
        font-family: 'GmarketSansMedium';
        src: url('https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff') format('woff');
        font-weight: normal;
        font-style: normal;
      }

      .promo-entry-overlay, .promo-entry-overlay * {
        box-sizing: border-box !important;
        font-family: 'GmarketSansMedium', system-ui, -apple-system, sans-serif !important;
      }

      .promo-entry-overlay {
        position: fixed !important;
        inset: 0 !important;
        background: rgba(15, 23, 42, 0.55) !important;
        backdrop-filter: blur(4px) !important;
        -webkit-backdrop-filter: blur(4px) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 100000 !important;
        padding: 16px !important;
        opacity: 0;
        transition: opacity 0.3s ease !important;
      }

      .promo-entry-overlay.show {
        opacity: 1 !important;
      }

      .promo-entry-card {
        background: #ffffff !important;
        border-radius: 24px !important;
        width: 100% !important;
        max-width: 360px !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.3) !important;
        overflow: hidden !important;
        display: flex !important;
        flex-direction: column !important;
        transform: translateY(20px);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        border: 1px solid rgba(255, 255, 255, 0.8) !important;
        position: relative !important;
        margin: auto !important;
      }

      .promo-entry-overlay.show .promo-entry-card {
        transform: translateY(0) !important;
      }

      .promo-carousel-container {
        position: relative !important;
        width: 100% !important;
        overflow: hidden !important;
      }

      .promo-carousel-wrapper {
        display: flex !important;
        overflow-x: auto !important;
        scroll-snap-type: x mandatory !important;
        scroll-behavior: smooth !important;
        scrollbar-width: none !important;
        -webkit-overflow-scrolling: touch !important;
      }

      .promo-carousel-wrapper::-webkit-scrollbar {
        display: none !important;
      }

      .promo-slide {
        flex: 0 0 100% !important;
        width: 100% !important;
        scroll-snap-align: start !important;
        display: flex !important;
        flex-direction: column !important;
        box-sizing: border-box !important;
      }

      .promo-entry-header {
        padding: 14px 44px 14px 20px !important;
        display: flex !important;
        justify-content: flex-start !important;
        align-items: center !important;
        border-bottom: 1px solid #f1f5f9 !important;
        background: #ffffff !important;
        margin: 0 !important;
        position: relative !important;
        width: 100% !important;
      }

      .promo-entry-header h3 {
        margin: 0 !important;
        padding: 0 !important;
        font-size: 1rem !important;
        font-weight: bold !important;
        color: #1e1b4b !important;
        line-height: 1.3 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      .promo-entry-close-btn {
        position: absolute !important;
        top: 10px !important;
        right: 14px !important;
        background: none !important;
        border: none !important;
        font-size: 1.5rem !important;
        cursor: pointer !important;
        color: #94a3b8 !important;
        line-height: 1 !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 28px !important;
        height: 28px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 10 !important;
      }

      .promo-entry-close-btn:hover {
        color: #475569 !important;
      }

      .promo-entry-body {
        cursor: pointer !important;
        width: 100% !important;
        aspect-ratio: 1 / 1 !important;
        overflow: hidden !important;
        background-color: #f8fafc !important;
        position: relative !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .promo-entry-body img {
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        object-fit: contain !important;
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1) !important;
      }

      .promo-entry-body:hover img {
        transform: scale(1.04) !important;
      }

      .promo-entry-footer {
        padding: 14px 18px !important;
        display: flex !important;
        justify-content: center !important;
        background: #ffffff !important;
        border-bottom: 1px solid #f1f5f9 !important;
        margin: 0 !important;
      }

      .btn-promo-action {
        padding: 12px !important;
        border-radius: 12px !important;
        border: none !important;
        font-size: 0.88rem !important;
        font-weight: bold !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        text-align: center !important;
        margin: 0 !important;
      }

      .btn-promo-action.benefit {
        background-color: #0A84FE !important;
        color: #ffffff !important;
        box-shadow: 0 4px 10px rgba(10, 132, 254, 0.25) !important;
        width: 100% !important;
      }

      .btn-promo-action.benefit:hover {
        background-color: #0975e2 !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 14px rgba(10, 132, 254, 0.4) !important;
      }

      .promo-nav-btn {
        position: absolute !important;
        top: calc(50% + 5px) !important;
        transform: translateY(-50%) !important;
        width: 34px !important;
        height: 34px !important;
        border-radius: 50% !important;
        background: rgba(255, 255, 255, 0.9) !important;
        border: 1px solid #e2e8f0 !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 1.1rem !important;
        z-index: 10 !important;
        color: #475569 !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
        transition: all 0.2s ease !important;
      }

      .promo-nav-btn.prev { left: 10px !important; }
      .promo-nav-btn.next { right: 10px !important; }

      .promo-indicators {
        display: flex !important;
        justify-content: center !important;
        gap: 6px !important;
        margin-top: 8px !important;
      }

      .promo-dot {
        width: 8px !important;
        height: 8px !important;
        border-radius: 50% !important;
        background-color: #cbd5e1 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
      }

      .promo-dot.active {
        background-color: #0A84FE !important;
        width: 16px !important;
        border-radius: 4px !important;
      }

      .promo-entry-bottom-bar {
        padding: 12px 20px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        font-size: 0.82rem !important;
        color: #64748b !important;
        background: #ffffff !important;
        border-top: 1px solid #f1f5f9 !important;
        margin: 0 !important;
        width: 100% !important;
        white-space: nowrap !important;
        gap: 12px !important;
      }

      .dismiss-today-label {
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        user-select: none !important;
        font-weight: 500 !important;
        margin: 0 !important;
        white-space: nowrap !important;
        font-size: 0.82rem !important;
        flex-shrink: 0 !important;
        line-height: 1 !important;
      }

      .dismiss-today-label input {
        cursor: pointer !important;
        margin: 0 !important;
        width: 16px !important;
        height: 16px !important;
        flex-shrink: 0 !important;
        vertical-align: middle !important;
      }

      .btn-close-text {
        background: none !important;
        border: none !important;
        color: #64748b !important;
        cursor: pointer !important;
        font-weight: bold !important;
        padding: 4px 8px !important;
        border-radius: 4px !important;
        margin: 0 !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        font-size: 0.82rem !important;
        line-height: 1 !important;
      }

      .btn-close-text:hover {
        background-color: #f1f5f9 !important;
        color: #1f2937 !important;
      }

      @media (max-width: 600px) {
        .promo-entry-overlay {
          padding: 12px !important;
        }

        .promo-entry-card {
          width: 96% !important;
          max-width: 340px !important;
          border-radius: 20px !important;
        }

        .promo-entry-header {
          padding: 12px 38px 12px 16px !important;
        }

        .promo-entry-header h3 {
          font-size: 0.92rem !important;
        }

        .promo-entry-close-btn {
          top: 8px !important;
          right: 10px !important;
          width: 28px !important;
          height: 28px !important;
          font-size: 1.35rem !important;
        }

        .promo-entry-footer {
          padding: 12px 14px !important;
        }

        .btn-promo-action {
          padding: 11px 14px !important;
          font-size: 0.84rem !important;
          border-radius: 10px !important;
        }

        .promo-entry-bottom-bar {
          padding: 10px 14px !important;
          font-size: 0.76rem !important;
          gap: 8px !important;
        }

        .dismiss-today-label {
          font-size: 0.76rem !important;
          gap: 4px !important;
        }

        .dismiss-today-label input {
          width: 14px !important;
          height: 14px !important;
        }

        .btn-close-text {
          font-size: 0.76rem !important;
          padding: 3px 6px !important;
        }

        .promo-nav-btn {
          width: 30px !important;
          height: 30px !important;
          font-size: 0.9rem !important;
        }

        .promo-nav-btn.prev { left: 6px !important; }
        .promo-nav-btn.next { right: 6px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function createPromoModal(promos, dismissKey) {
    const overlay = document.createElement('div');
    overlay.className = 'promo-entry-overlay';
    overlay.id = 'promo-entry-modal';

    // 카드 구조 생성
    const card = document.createElement('div');
    card.className = 'promo-entry-card';

    // 캐러셀 컨테이너 생성
    const container = document.createElement('div');
    container.className = 'promo-carousel-container';

    // 캐러셀 래퍼 생성
    const wrapper = document.createElement('div');
    wrapper.className = 'promo-carousel-wrapper';

    promos.forEach((promo, idx) => {
      const slide = document.createElement('div');
      slide.className = 'promo-slide';
      slide.innerHTML = `
        <div class="promo-entry-header">
          <h3>${escapeHtml(promo.title)}</h3>
          <button type="button" class="promo-entry-close-btn" data-close="true">×</button>
        </div>
        <div class="promo-entry-body" data-action="benefit" data-id="${promo._id}">
          <img src="${promo.imageUrl}" alt="${escapeHtml(promo.title)}" onerror="this.src='/images/Basic_Event_Image.png'">
        </div>
        <div class="promo-entry-footer">
          <button type="button" class="btn-promo-action benefit" data-action="benefit" data-id="${promo._id}">혜택 확인하기</button>
        </div>
      `;
      wrapper.appendChild(slide);
    });

    container.appendChild(wrapper);

    // 슬라이드가 여러 개인 경우 화살표 및 점 인디케이터 추가
    if (promos.length > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'promo-nav-btn prev';
      prevBtn.innerHTML = '❬';
      
      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'promo-nav-btn next';
      nextBtn.innerHTML = '❭';

      container.appendChild(prevBtn);
      container.appendChild(nextBtn);

      const indicators = document.createElement('div');
      indicators.className = 'promo-indicators';
      promos.forEach((_, idx) => {
        const dot = document.createElement('span');
        dot.className = `promo-dot ${idx === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => {
          wrapper.scrollTo({
            left: wrapper.clientWidth * idx,
            behavior: 'smooth'
          });
        });
        indicators.appendChild(dot);
      });
      
      container.appendChild(indicators);

      // 화살표 이벤트 리스너
      prevBtn.addEventListener('click', () => {
        const newIndex = Math.max(0, Math.round(wrapper.scrollLeft / wrapper.clientWidth) - 1);
        wrapper.scrollTo({
          left: wrapper.clientWidth * newIndex,
          behavior: 'smooth'
        });
      });

      nextBtn.addEventListener('click', () => {
        const newIndex = Math.min(promos.length - 1, Math.round(wrapper.scrollLeft / wrapper.clientWidth) + 1);
        wrapper.scrollTo({
          left: wrapper.clientWidth * newIndex,
          behavior: 'smooth'
        });
      });

      // 스크롤 이벤트 감지하여 인디케이터 업데이트
      wrapper.addEventListener('scroll', () => {
        const index = Math.round(wrapper.scrollLeft / wrapper.clientWidth);
        const dots = indicators.querySelectorAll('.promo-dot');
        dots.forEach((dot, dIdx) => {
          if (dIdx === index) {
            dot.classList.add('active');
          } else {
            dot.classList.remove('active');
          }
        });
      });
    }

    card.appendChild(container);

    // 공통 하단 바 추가 (오늘 하루 보지 않기)
    const bottomBar = document.createElement('div');
    bottomBar.className = 'promo-entry-bottom-bar';
    bottomBar.innerHTML = `
      <label class="dismiss-today-label">
        <input type="checkbox" id="promo-dismiss-today"> 오늘 하루 보지 않기
      </label>
      <button type="button" class="btn-close-text" id="promo-close-btn">닫기</button>
    `;
    card.appendChild(bottomBar);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // 서서히 보이기 애니메이션 트리거
    setTimeout(() => {
      overlay.classList.add('show');
    }, 100);

    // 이벤트 바인딩 (이벤트 위임 활용)
    const closeModal = () => {
      const dismissChk = document.getElementById('promo-dismiss-today');
      if (dismissChk && dismissChk.checked) {
        localStorage.setItem(dismissKey, Date.now().toString());
      }
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.remove();
      }, 300);
    };

    // 닫기 및 네비게이션 버튼 리스너 바인딩
    document.getElementById('promo-close-btn').addEventListener('click', closeModal);
    
    // 위임 이벤트 리스너
    overlay.addEventListener('click', (e) => {
      // 닫기 X 버튼 클릭
      if (e.target.closest('[data-close="true"]')) {
        closeModal();
        return;
      }
      
      // 혜택 보기 액션
      const benefitBtn = e.target.closest('[data-action="benefit"]');
      if (benefitBtn) {
        const id = benefitBtn.getAttribute('data-id');
        closeModal();
        window.location.href = `/benefit-detail.html?id=${id}`;
        return;
      }

      // 이벤트 바로가기 액션
      const eventBtn = e.target.closest('[data-action="event"]');
      if (eventBtn) {
        const url = eventBtn.getAttribute('data-url');
        closeModal();
        window.location.href = url;
        return;
      }
    });
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
})();
