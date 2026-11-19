// public/js/utils/promotion-modal.js
(async function () {
  try {
    const response = await fetch('/promotions/active');
    if (!response.ok) return;

    const promos = await response.json();
    if (!promos || promos.length === 0) return;

    const dismissKey = 'dismiss_promotion_all';
    const dismissVal = localStorage.getItem(dismissKey);
    if (dismissVal) {
      const dismissTime = parseInt(dismissVal, 10);
      const latestPromoTime = Math.max(...promos.map((p) => new Date(p.updatedAt || p.createdAt || 0).getTime()));

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

    injectStyles();
    createPromoModal(promos, dismissKey);
  } catch (error) {
    console.error('[PromotionModal] Failed to load active promotions:', error);
  }

  function injectStyles() {
    if (document.getElementById('promo-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'promo-modal-styles';
    style.textContent = `
      .promo-entry-overlay, .promo-entry-overlay * {
        box-sizing: border-box;
        font-family: var(--ff-base, 'GmarketSansMedium', system-ui, sans-serif);
      }

      .promo-entry-overlay {
        position: fixed;
        inset: 0;
        background: rgba(8, 28, 59, 0.56);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100000;
        padding: 16px;
        opacity: 0;
        overscroll-behavior: contain;
        transition: opacity 240ms var(--ease, ease);
      }

      .promo-entry-overlay.show {
        opacity: 1;
      }

      .promo-entry-card {
        background: var(--c-surface, #FFFFFF);
        border-radius: 24px;
        width: 100%;
        max-width: 372px;
        box-shadow: var(--sh-lg, 0 24px 52px rgba(8, 28, 59, 0.28));
        overflow: hidden;
        display: flex;
        flex-direction: column;
        translate: 0 18px;
        scale: 0.96;
        transition: translate 300ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
                    scale 300ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
        border: 1px solid var(--c-border, #DCE7F5);
        position: relative;
        margin: auto;
      }

      .promo-entry-overlay.show .promo-entry-card {
        translate: 0 0;
        scale: 1;
      }

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

      .promo-slide {
        flex: 0 0 100%;
        width: 100%;
        scroll-snap-align: start;
        display: flex;
        flex-direction: column;
      }

      .promo-entry-header {
        padding: 15px 48px 15px 20px;
        display: flex;
        align-items: center;
        border-bottom: 1px solid var(--c-border-subtle, #EAF1FA);
        background: linear-gradient(180deg, var(--brand-50, #F0F7FF) 0%, #FFFFFF 100%);
        position: relative;
        width: 100%;
      }

      .promo-entry-header h3 {
        margin: 0;
        padding: 0;
        font-size: 0.98rem;
        font-weight: 700;
        color: var(--c-text, #0C1E38);
        line-height: 1.35;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
      }

      .promo-entry-close-btn {
        position: absolute;
        top: 50%;
        right: 12px;
        translate: 0 -50%;
        background: var(--brand-50, #F0F7FF);
        border: 1px solid var(--brand-100, #DEEEFF);
        border-radius: 10px;
        cursor: pointer;
        color: var(--c-brand, #0A84FE);
        width: 30px;
        height: 30px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        z-index: 10;
        transition: background-color 160ms ease, color 160ms ease;
      }

      .promo-entry-close-btn:hover {
        background: var(--c-brand, #0A84FE);
        color: #FFFFFF;
      }

      .promo-entry-body {
        cursor: pointer;
        width: 100%;
        aspect-ratio: 1 / 1;
        overflow: hidden;
        background-color: var(--c-surface-2, #F2F6FC);
        position: relative;
      }

      .promo-entry-body img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        transition: scale 420ms var(--ease, cubic-bezier(0.16, 1, 0.3, 1));
      }

      .promo-entry-body:hover img {
        scale: 1.03;
      }

      .promo-entry-footer {
        padding: 14px 18px;
        display: flex;
        justify-content: center;
        background: var(--c-surface, #FFFFFF);
        border-top: 1px solid var(--c-border-subtle, #EAF1FA);
      }

      .btn-promo-action {
        width: 100%;
        padding: 13px 16px;
        border-radius: var(--r-md, 14px);
        border: none;
        font-size: 0.9rem;
        font-weight: 700;
        cursor: pointer;
        text-align: center;
        transition: background-color 160ms ease, translate 160ms ease, box-shadow 160ms ease;
      }

      .btn-promo-action.benefit {
        background: linear-gradient(135deg, var(--brand-500, #0A84FE) 0%, var(--brand-600, #056DE0) 100%);
        color: #FFFFFF;
        box-shadow: var(--sh-brand, 0 8px 20px rgba(10, 132, 254, 0.3));
      }

      .btn-promo-action.benefit:hover {
        translate: 0 -1px;
        box-shadow: 0 10px 24px rgba(10, 132, 254, 0.4);
      }

      .promo-nav-btn {
        position: absolute;
        top: calc(50% + 4px);
        translate: 0 -50%;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.92);
        backdrop-filter: blur(8px);
        border: 1px solid var(--c-border, #DCE7F5);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        color: var(--c-brand-deep, #0755B3);
        box-shadow: var(--sh-sm, 0 4px 12px rgba(12, 30, 56, 0.1));
        transition: background-color 160ms ease, color 160ms ease, scale 160ms ease;
      }

      .promo-nav-btn:hover {
        background: var(--c-brand, #0A84FE);
        color: #FFFFFF;
        border-color: var(--c-brand, #0A84FE);
      }

      .promo-nav-btn.prev { left: 10px; }
      .promo-nav-btn.next { right: 10px; }

      .promo-indicators {
        display: flex;
        justify-content: center;
        gap: 6px;
        padding: 10px 0 4px;
        background: var(--c-surface, #FFFFFF);
      }

      .promo-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background-color: var(--brand-200, #BBDDFD);
        cursor: pointer;
        transition: width 200ms var(--ease, ease), background-color 200ms ease;
      }

      .promo-dot.active {
        background-color: var(--c-brand, #0A84FE);
        width: 20px;
      }

      .promo-entry-bottom-bar {
        padding: 12px 18px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.82rem;
        color: var(--c-text-muted, #5A708D);
        background: var(--c-surface-2, #F2F6FC);
        border-top: 1px solid var(--c-border-subtle, #EAF1FA);
        width: 100%;
        gap: 12px;
      }

      .dismiss-today-label {
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        user-select: none;
        font-weight: 500;
        white-space: nowrap;
        font-size: 0.82rem;
        line-height: 1;
      }

      .dismiss-today-label input {
        cursor: pointer;
        margin: 0;
        width: 16px;
        height: 16px;
        accent-color: var(--c-brand, #0A84FE);
      }

      .btn-close-text {
        background: none;
        border: none;
        color: var(--c-text-soft, #304765);
        cursor: pointer;
        font-weight: 700;
        padding: 6px 10px;
        border-radius: 8px;
        white-space: nowrap;
        font-size: 0.82rem;
        line-height: 1;
        transition: background-color 150ms ease, color 150ms ease;
      }

      .btn-close-text:hover {
        background-color: var(--brand-100, #DEEEFF);
        color: var(--c-brand-deep, #0755B3);
      }

      @media (max-width: 600px) {
        .promo-entry-card { max-width: 344px; border-radius: 20px; }
        .promo-entry-header { padding: 13px 44px 13px 16px; }
        .promo-entry-header h3 { font-size: 0.92rem; }
        .promo-entry-footer { padding: 12px 14px; }
        .promo-entry-bottom-bar { padding: 11px 14px; font-size: 0.78rem; }
      }
    `;
    document.head.appendChild(style);
  }

  function createPromoModal(promos, dismissKey) {
    const overlay = document.createElement('div');
    overlay.className = 'promo-entry-overlay';
    overlay.id = 'promo-entry-modal';

    const card = document.createElement('div');
    card.className = 'promo-entry-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');

    const container = document.createElement('div');
    container.className = 'promo-carousel-container';

    const wrapper = document.createElement('div');
    wrapper.className = 'promo-carousel-wrapper';

    const closeSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    const prevSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
    const nextSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

    promos.forEach((promo) => {
      const slide = document.createElement('div');
      slide.className = 'promo-slide';
      slide.innerHTML = `
        <div class="promo-entry-header">
          <h3>${escapeHtml(promo.title)}</h3>
          <button type="button" class="promo-entry-close-btn" data-close="true" aria-label="닫기">${closeSvg}</button>
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

    if (promos.length > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.type = 'button';
      prevBtn.className = 'promo-nav-btn prev';
      prevBtn.setAttribute('aria-label', '이전');
      prevBtn.innerHTML = prevSvg;

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'promo-nav-btn next';
      nextBtn.setAttribute('aria-label', '다음');
      nextBtn.innerHTML = nextSvg;

      container.appendChild(prevBtn);
      container.appendChild(nextBtn);

      const indicators = document.createElement('div');
      indicators.className = 'promo-indicators';
      promos.forEach((_, idx) => {
        const dot = document.createElement('span');
        dot.className = `promo-dot ${idx === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => {
          wrapper.scrollTo({ left: wrapper.clientWidth * idx, behavior: 'smooth' });
        });
        indicators.appendChild(dot);
      });
      container.appendChild(indicators);

      prevBtn.addEventListener('click', () => {
        const newIndex = Math.max(0, Math.round(wrapper.scrollLeft / wrapper.clientWidth) - 1);
        wrapper.scrollTo({ left: wrapper.clientWidth * newIndex, behavior: 'smooth' });
      });

      nextBtn.addEventListener('click', () => {
        const newIndex = Math.min(promos.length - 1, Math.round(wrapper.scrollLeft / wrapper.clientWidth) + 1);
        wrapper.scrollTo({ left: wrapper.clientWidth * newIndex, behavior: 'smooth' });
      });

      wrapper.addEventListener('scroll', () => {
        const index = Math.round(wrapper.scrollLeft / wrapper.clientWidth);
        indicators.querySelectorAll('.promo-dot').forEach((dot, dIdx) => {
          dot.classList.toggle('active', dIdx === index);
        });
      });
    }

    card.appendChild(container);

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

    requestAnimationFrame(() => overlay.classList.add('show'));

    const onEsc = (e) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', onEsc);

    const closeModal = () => {
      document.removeEventListener('keydown', onEsc);
      const dismissChk = document.getElementById('promo-dismiss-today');
      if (dismissChk && dismissChk.checked) {
        localStorage.setItem(dismissKey, Date.now().toString());
      }
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 260);
    };

    document.getElementById('promo-close-btn').addEventListener('click', closeModal);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.closest('[data-close="true"]')) {
        closeModal();
        return;
      }
      const benefitBtn = e.target.closest('[data-action="benefit"]');
      if (benefitBtn) {
        const id = benefitBtn.getAttribute('data-id');
        closeModal();
        window.location.href = `/benefit-detail.html?id=${id}`;
        return;
      }
      const eventBtn = e.target.closest('[data-action="event"]');
      if (eventBtn) {
        const url = eventBtn.getAttribute('data-url');
        closeModal();
        window.location.href = url;
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
