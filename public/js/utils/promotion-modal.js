// public/js/utils/promotion-modal.js
(async function() {
  try {
    // 1) 활성화된 홍보 데이터 조회
    const response = await fetch('/promotions/active');
    if (!response.ok) return;

    const promo = await response.json();
    if (!promo) return; // 활성화된 홍보 없음

    // 2) 오늘 하루 보지 않기 설정 체크
    const dismissKey = `dismiss_promotion_${promo._id}`;
    const dismissVal = localStorage.getItem(dismissKey);
    if (dismissVal) {
      const dismissDate = new Date(parseInt(dismissVal, 10));
      const now = new Date();
      // 날짜가 같으면 노출하지 않음
      if (dismissDate.toDateString() === now.toDateString()) {
        return;
      } else {
        localStorage.removeItem(dismissKey); // 만료된 설정 삭제
      }
    }

    // 3) 스타일 동적 주입
    injectStyles();

    // 4) 모달 DOM 생성
    createPromoModal(promo, dismissKey);
  } catch (error) {
    console.error('[PromotionModal] Failed to load active promotion:', error);
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
      }
      .promo-entry-overlay.show .promo-entry-card {
        transform: translateY(0);
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
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
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
        background-color: #f1f5f9;
        color: #334155;
        border: 1px solid #e2e8f0;
      }
      .btn-promo-action.benefit:hover {
        background-color: #e2e8f0;
      }
      .btn-promo-action.event {
        background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
        color: white;
        box-shadow: 0 4px 10px rgba(168, 85, 247, 0.2);
      }
      .btn-promo-action.event:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 14px rgba(168, 85, 247, 0.3);
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
      }
    `;
    document.head.appendChild(style);
  }

  function createPromoModal(promo, dismissKey) {
    const overlay = document.createElement('div');
    overlay.className = 'promo-entry-overlay';
    overlay.id = 'promo-entry-modal';

    const targetEventUrl = promo.targetEventId 
      ? `/additional-info.html?id=${promo.targetEventId._id || promo.targetEventId.id}`
      : '/events.html';

    overlay.innerHTML = `
      <div class="promo-entry-card">
        <div class="promo-entry-header">
          <h3>${escapeHtml(promo.title)}</h3>
          <button type="button" class="promo-entry-close-btn" id="promo-close-x">×</button>
        </div>
        <div class="promo-entry-body" id="promo-body-img">
          <img src="${promo.imageUrl}" alt="${escapeHtml(promo.title)}" onerror="this.src='/images/Basic_Event_Image.png'">
        </div>
        <div class="promo-entry-footer">
          <button type="button" class="btn-promo-action benefit" id="promo-go-benefit">혜택 확인하기</button>
          <button type="button" class="btn-promo-action event" id="promo-go-event">이벤트 신청하기</button>
        </div>
        <div class="promo-entry-bottom-bar">
          <label class="dismiss-today-label">
            <input type="checkbox" id="promo-dismiss-today"> 오늘 하루 보지 않기
          </label>
          <button type="button" class="btn-close-text" id="promo-close-btn">닫기</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Fade-in animation trigger
    setTimeout(() => {
      overlay.classList.add('show');
    }, 100);

    // Event listeners
    const closeX = document.getElementById('promo-close-x');
    const closeBtn = document.getElementById('promo-close-btn');
    const bodyImg = document.getElementById('promo-body-img');
    const goBenefit = document.getElementById('promo-go-benefit');
    const goEvent = document.getElementById('promo-go-event');
    const dismissChk = document.getElementById('promo-dismiss-today');

    const closeModal = () => {
      if (dismissChk && dismissChk.checked) {
        localStorage.setItem(dismissKey, Date.now().toString());
      }
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.remove();
      }, 300);
    };

    closeX.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    
    // 혜택 상세 보기로 이동
    const navigateToBenefit = () => {
      closeModal();
      window.location.href = `/benefit-detail.html?id=${promo._id}`;
    };
    bodyImg.addEventListener('click', navigateToBenefit);
    goBenefit.addEventListener('click', navigateToBenefit);

    // 연동 이벤트 신청으로 이동
    goEvent.addEventListener('click', () => {
      closeModal();
      window.location.href = targetEventUrl;
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
