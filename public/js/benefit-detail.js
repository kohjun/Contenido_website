// public/js/benefit-detail.js
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const promoId = params.get('id');

  if (!promoId) {
    showError('올바르지 않은 접근입니다. 홍보 ID가 지정되지 않았습니다.');
    return;
  }

  try {
    const response = await fetch(`/promotions/detail/${promoId}`);
    if (!response.ok) {
      if (response.status === 404) {
        showError('존재하지 않거나 만료된 혜택 이벤트입니다.');
      } else {
        showError('혜택 정보를 불러오는 중 오류가 발생했습니다.');
      }
      return;
    }

    const promo = await response.json();
    renderBenefitDetail(promo);
  } catch (error) {
    console.error('Error fetching promotion detail:', error);
    showError('서버와의 통신에 실패했습니다.');
  }
});

function renderBenefitDetail(promo) {
  // Title
  document.getElementById('benefit-title').textContent = promo.title;

  // Period
  const start = new Date(promo.startDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  const end = new Date(promo.endDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('benefit-period').textContent = `혜택 기간: ${start} ~ ${end}`;

  // Image
  const imgEl = document.getElementById('benefit-image');
  if (promo.imageUrl) {
    imgEl.src = promo.imageUrl;
    imgEl.alt = promo.title;
  } else {
    imgEl.src = '/images/Basic_Event_Image.png';
  }

  // Content body
  const contentEl = document.getElementById('benefit-content-body');
  contentEl.innerHTML = promo.benefitDetail;

  // CTA Section
  const ctaSection = document.getElementById('benefit-cta-section');
  const ctaLinkBtn = document.getElementById('btn-cta-link');
  const ctaDesc = document.getElementById('cta-event-desc');

  if (promo.targetEventId) {
    const event = promo.targetEventId;
    ctaDesc.innerHTML = `이 혜택은 <strong>[${escapeHtml(event.title)}]</strong> 이벤트 참가자와 연계되어 있습니다.<br>지금 바로 이벤트를 신청하고 특별한 혜택을 획득해 보세요!`;
    ctaLinkBtn.onclick = () => {
      window.location.href = `/additional-info.html?id=${event._id || event.id}`;
    };
    ctaSection.style.display = 'block';
  } else {
    // 단독 홍보일 경우에는 기본적으로 전체 이벤트 목록으로 이동하도록 처리
    ctaDesc.innerHTML = `Contenido의 다양하고 재미있는 연합 동아리 이벤트들을 지금 바로 신청해보세요!`;
    ctaLinkBtn.onclick = () => {
      window.location.href = `/events.html`;
    };
    ctaSection.style.display = 'block';
  }
}

function showError(msg) {
  const mainEl = document.querySelector('.benefit-main');
  if (mainEl) {
    mainEl.innerHTML = `
      <div class="placeholder-text" style="color: #ef4444; padding: 60px 0; font-size: 1.1rem;">
        ⚠️ ${escapeHtml(msg)}
      </div>
    `;
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
