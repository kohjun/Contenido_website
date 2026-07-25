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
      .promo-entry-overlay {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.5);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100000;
        padding: 20px;
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .promo-entry-overlay.show {
        opacity: 1;
      }
      .promo-entry-card {
        background: white;
        border-radius: 28px;
        width: 100%;
        max-width: 400px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transform: translateY(20px);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: 1px solid rgba(255, 255, 255, 0.8);
        position: relative;
      }
      .promo-entry-overlay.show .promo-entry-card {
        transform: translateY(0);
      }
      
      /* 캐러셀 영역 */
      .promo-carousel-container {
        position: relative;
        width: 100%;
        overflow: hidden;
      }
      .promo-carousel-wrapper {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scroll-behavior: smooth;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }
      .promo-carousel-wrapper::-webkit-scrollbar {
        display: none;
      }
      
      /* 개별 슬라이드 */
      .promo-slide {
        flex: 0 0 100%;
        width: 100%;
        scroll-snap-align: start;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
      }

      .promo-entry-header {
        padding: 18px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #f1f5f9;
      }
      .promo-entry-header h3 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: bold;
        color: #1e1b4b;
        font-family: inherit;
        line-height: 1.4;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 85%;
      }
      .promo-entry-close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #94a3b8;
        line-height: 1;
        padding: 0;
        margin-left: 10px;
      }
      .promo-entry-close-btn:hover {
        color: #475569;
      }
      .promo-entry-body {
        cursor: pointer;
        width: 100%;
        aspect-ratio: 1 / 1;
        overflow: hidden;
        background-color: #f8fafc;
        position: relative;
      }
      .promo-entry-body img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .promo-entry-body:hover img {
        transform: scale(1.04);
      }
      .promo-entry-footer {
        padding: 16px 20px;
        display: flex;
        justify-content: center;
        background: #f8fafc;
        border-bottom: 1px solid #f1f5f9;
      }
      .btn-promo-action {
        padding: 12px;
        border-radius: 12px;
        border: none;
        font-size: 0.88rem;
        font-weight: bold;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.2s ease;
        text-align: center;
      }
      .btn-promo-action.benefit {
        background-color: #0A84FE;
        color: white;
        box-shadow: 0 4px 10px rgba(10, 132, 254, 0.25);
        width: 100%;
      }
      .btn-promo-action.benefit:hover {
        background-color: #0975e2;
        transform: translateY(-1px);
        box-shadow: 0 6px 14px rgba(10, 132, 254, 0.4);
      }

      /* 캐러셀 내비게이션 화살표 */
      .promo-nav-btn {
        position: absolute;
        top: calc(50% + 5px); /* 헤더 크기를 고려한 세로 중앙 정렬 보정 */
        transform: translateY(-50%);
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid #e2e8f0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        z-index: 10;
        color: #475569;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        transition: all 0.2s ease;
      }
      .promo-nav-btn:hover {
        background: white;
        color: #0f172a;
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
      }
      .promo-nav-btn.prev { left: 12px; }
      .promo-nav-btn.next { right: 12px; }

      /* 인디케이터 점 */
      .promo-indicators {
        display: flex;
        justify-content: center;
        gap: 6px;
        margin-top: 10px;
      }
      .promo-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #cbd5e1;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .promo-dot.active {
        background-color: #0A84FE;
        width: 16px;
        border-radius: 4px;
      }

      .promo-entry-bottom-bar {
        padding: 12px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.8rem;
        color: #64748b;
      }
      .dismiss-today-label {
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        user-select: none;
        font-weight: 500;
      }
      .dismiss-today-label input {
        cursor: pointer;
      }
      .btn-close-text {
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        font-weight: bold;
        font-family: inherit;
        padding: 4px 8px;
        border-radius: 4px;
      }
      .btn-close-text:hover {
        background-color: #f1f5f9;
        color: #1f2937;
      }

      @media (max-width: 480px) {
        .promo-entry-card {
          max-width: 320px;
          border-radius: 20px;
        }
        .promo-entry-header {
          padding: 12px 18px;
        }
        .promo-entry-header h3 {
          font-size: 0.95rem;
        }
        .promo-entry-footer {
          padding: 12px 16px;
          gap: 8px;
        }
        .btn-promo-action {
          padding: 10px;
          font-size: 0.82rem;
        }
        .promo-entry-bottom-bar {
          padding: 10px 18px;
          font-size: 0.75rem;
        }
        .promo-nav-btn {
          width: 30px;
          height: 30px;
          font-size: 0.95rem;
        }
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
