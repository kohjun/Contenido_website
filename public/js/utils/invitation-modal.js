/* =====================================================================
   invitation-modal.js — 이벤트 지인 초대장 생성 & 공유 모달
   ===================================================================== */
(function () {
  if (window.showInvitationModal) return;

  const STYLE_ID = 'invitation-modal-style';
  const MODAL_ID = 'invitation-modal-overlay';

  function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .inv-overlay {
        position: fixed; inset: 0;
        background: rgba(15, 23, 42, 0.65);
        display: flex; align-items: center; justify-content: center;
        z-index: 100000;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        opacity: 0; pointer-events: none;
        transition: opacity 200ms ease;
        padding: 16px;
        font-family: 'GmarketSansMedium', system-ui, sans-serif;
      }
      .inv-overlay.is-open { opacity: 1; pointer-events: auto; }

      .inv-card {
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 2px solid #38bdf8;
        border-radius: 24px;
        width: 100%;
        max-width: 420px;
        box-shadow: 0 25px 50px -12px rgba(14, 165, 233, 0.35);
        overflow: hidden;
        display: flex; flex-direction: column;
        transform: translateY(12px);
        transition: transform 200ms ease;
        position: relative;
      }
      .inv-overlay.is-open .inv-card { transform: translateY(0); }

      .inv-header {
        background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
        color: #ffffff;
        padding: 20px 24px 16px;
        text-align: center;
        position: relative;
      }
      .inv-header .inv-badge {
        display: inline-block;
        background: rgba(255, 255, 255, 0.25);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.78rem;
        letter-spacing: 1px;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .inv-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 800;
        line-height: 1.3;
      }

      .inv-close-btn {
        position: absolute;
        top: 14px; right: 16px;
        background: none; border: none;
        color: #ffffff; font-size: 1.4rem;
        cursor: pointer; opacity: 0.8;
      }
      .inv-close-btn:hover { opacity: 1; }

      .inv-body {
        padding: 20px 24px;
        color: #0f172a;
      }

      .inv-info-box {
        background: #ffffff;
        border-radius: 16px;
        padding: 16px;
        border: 1px solid #bae6fd;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
        margin-bottom: 16px;
      }
      .inv-info-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: 10px;
        font-size: 0.88rem;
      }
      .inv-info-row:last-child { margin-bottom: 0; }
      .inv-info-label {
        color: #0284c7;
        font-weight: 700;
        width: 65px;
        flex-shrink: 0;
      }
      .inv-info-val {
        color: #1e293b;
        font-weight: 600;
        flex: 1;
        word-break: break-all;
      }

      .inv-inviter-tag {
        background: #e0f2fe;
        border: 1px dashed #0284c7;
        border-radius: 12px;
        padding: 10px 14px;
        text-align: center;
        font-size: 0.86rem;
        color: #0369a1;
        font-weight: 700;
        margin-bottom: 16px;
      }

      .inv-link-input-group {
        display: flex; gap: 8px; margin-bottom: 12px;
      }
      .inv-link-input {
        flex: 1;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid #cbd5e1;
        font-size: 0.8rem;
        background: #ffffff;
        color: #475569;
      }

      .inv-actions {
        display: flex; gap: 8px; flex-wrap: wrap;
      }
      .inv-btn {
        flex: 1; min-width: 120px;
        padding: 12px;
        border: none; border-radius: 12px;
        font-size: 0.9rem; font-weight: 700;
        cursor: pointer;
        transition: all 150ms ease;
        text-align: center;
        display: flex; align-items: center; justify-content: center; gap: 6px;
      }
      .inv-btn-copy {
        background: #0284c7; color: #ffffff;
        box-shadow: 0 4px 10px rgba(2, 132, 199, 0.3);
      }
      .inv-btn-copy:hover { background: #0369a1; }
      .inv-btn-share {
        background: #f59e0b; color: #ffffff;
        box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);
      }
      .inv-btn-share:hover { background: #d97706; }
    `;
    document.head.appendChild(style);
  }

  function showInvitationModal(eventData, inviterUser, inviteToken) {
    injectStyleOnce();

    let overlay = document.getElementById(MODAL_ID);
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = MODAL_ID;
      overlay.className = 'inv-overlay';
      document.body.appendChild(overlay);
    }

    const title = eventData.title || '이벤트';
    const dateStr = eventData.date
      ? new Date(eventData.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
      : '-';
    const timeStr = `${eventData.startTime || ''} ~ ${eventData.endTime || ''}`;
    const placeStr = eventData.place || '상세 장소 추후 공지';
    const feeStr = eventData.participation_fee ? `${eventData.participation_fee.toLocaleString()}원` : '무료';

    const inviterName = inviterUser.name || inviterUser.displayName || '부원';
    const digits = String(inviterUser.phonenumber || '').replace(/[^0-9]/g, '');
    const phoneTail = digits.length >= 4 ? digits.slice(-4) : digits;
    const inviterLabel = `${inviterName} (${phoneTail})`;

    const inviteUrl = `${window.location.origin}/additional-info.html?id=${eventData._id}&invite=${inviteToken}`;

    overlay.innerHTML = `
      <div class="inv-card" role="dialog" aria-modal="true">
        <div class="inv-header">
          <span class="inv-badge">💌 CONTENIDO INVITATION</span>
          <h3>${escapeHtml(title)}</h3>
          <button type="button" class="inv-close-btn" id="inv-close">&times;</button>
        </div>
        <div class="inv-body">
          <div class="inv-inviter-tag">
            👑 <strong>${escapeHtml(inviterLabel)}</strong> 님이 귀하를 초대합니다!
          </div>
          <div class="inv-info-box">
            <div class="inv-info-row">
              <span class="inv-info-label">📅 일시</span>
              <span class="inv-info-val">${escapeHtml(dateStr)} (${escapeHtml(timeStr)})</span>
            </div>
            <div class="inv-info-row">
              <span class="inv-info-label">📍 장소</span>
              <span class="inv-info-val">${escapeHtml(placeStr)}</span>
            </div>
            <div class="inv-info-row">
              <span class="inv-info-label">💵 참가비</span>
              <span class="inv-info-val">${escapeHtml(feeStr)}</span>
            </div>
          </div>
          <div class="inv-link-input-group">
            <input type="text" class="inv-link-input" id="inv-link-text" value="${escapeHtml(inviteUrl)}" readonly>
          </div>
          <div class="inv-actions">
            <button type="button" class="inv-btn inv-btn-copy" id="inv-btn-copy">🔗 초대장 링크 복사</button>
            <button type="button" class="inv-btn inv-btn-share" id="inv-btn-share">💬 공유하기</button>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add('is-open');

    const closeBtn = document.getElementById('inv-close');
    const copyBtn = document.getElementById('inv-btn-copy');
    const shareBtn = document.getElementById('inv-btn-share');
    const linkInput = document.getElementById('inv-link-text');

    const close = () => overlay.classList.remove('is-open');

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    copyBtn.addEventListener('click', () => {
      if (linkInput) {
        linkInput.select();
        navigator.clipboard.writeText(inviteUrl).then(() => {
          alert('초대장 링크가 클립보드에 복사되었습니다!\n원하는 지인에게 공유해 주세요.');
        }).catch(() => {
          document.execCommand('copy');
          alert('초대장 링크가 복사되었습니다!');
        });
      }
    });

    shareBtn.addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({
          title: `[초대장] ${title}`,
          text: `${inviterLabel}님이 [${title}] 이벤트에 당신을 초대했습니다! 아래 링크에서 지인 참가 신청을 완료해 주세요.`,
          url: inviteUrl
        }).catch(() => {});
      } else {
        copyBtn.click();
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

  window.showInvitationModal = showInvitationModal;
})();
