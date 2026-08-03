/* =====================================================================
   invitation-modal.js — 이벤트 지인 초대장 생성 & 공유 모달 (고급 시그니처 디자인)
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
        background: rgba(11, 19, 43, 0.78);
        display: flex; align-items: center; justify-content: center;
        z-index: 100000;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        opacity: 0; pointer-events: none;
        transition: opacity 250ms ease;
        padding: 20px;
        font-family: 'GmarketSansMedium', 'Pretendard', system-ui, sans-serif;
      }
      .inv-overlay.is-open { opacity: 1; pointer-events: auto; }

      .inv-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 24px;
        width: 100%;
        max-width: 440px;
        box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.25);
        overflow: hidden;
        display: flex; flex-direction: column;
        transform: translateY(16px) scale(0.98);
        transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        color: #0f172a;
      }
      .inv-overlay.is-open .inv-card { transform: translateY(0) scale(1); }

      .inv-header {
        background: linear-gradient(135deg, #0A84FE 0%, #0056B3 100%);
        color: #ffffff;
        padding: 24px 24px 20px;
        text-align: center;
        position: relative;
        box-shadow: 0 4px 20px rgba(10, 132, 254, 0.25);
      }
      .inv-header .inv-badge {
        display: inline-block;
        background: rgba(255, 255, 255, 0.18);
        border: 1px solid rgba(255, 255, 255, 0.25);
        padding: 3px 12px;
        border-radius: 20px;
        font-size: 0.72rem;
        letter-spacing: 1.5px;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 8px;
        color: #ffffff;
      }
      .inv-header h3 {
        margin: 0;
        font-size: 1.3rem;
        font-weight: 800;
        line-height: 1.35;
        letter-spacing: -0.3px;
        color: #ffffff;
      }

      .inv-close-btn {
        position: absolute;
        top: 16px; right: 18px;
        background: rgba(255, 255, 255, 0.15);
        border: none;
        width: 32px; height: 32px;
        border-radius: 50%;
        color: #ffffff; font-size: 1.2rem;
        cursor: pointer; opacity: 0.85;
        display: flex; align-items: center; justify-content: center;
        transition: all 150ms ease;
      }
      .inv-close-btn:hover { opacity: 1; background: rgba(255, 255, 255, 0.28); transform: rotate(90deg); }

      .inv-body {
        padding: 24px;
        color: #0f172a;
      }

      .inv-inviter-tag {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 14px;
        padding: 12px 16px;
        text-align: center;
        font-size: 0.88rem;
        color: #1d4ed8;
        font-weight: 600;
        margin-bottom: 20px;
      }
      .inv-inviter-tag strong {
        color: #0056b3;
        font-weight: 800;
      }

      .inv-info-box {
        background: #f8fafc;
        border-radius: 18px;
        padding: 18px;
        border: 1px solid #e2e8f0;
        margin-bottom: 20px;
      }
      .inv-info-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
        font-size: 0.88rem;
      }
      .inv-info-row:last-child { margin-bottom: 0; }
      .inv-info-label {
        color: #64748b;
        font-weight: 600;
        width: 55px;
        flex-shrink: 0;
        font-size: 0.82rem;
      }
      .inv-info-val {
        color: #0f172a;
        font-weight: 700;
        flex: 1;
        word-break: break-all;
        line-height: 1.4;
      }

      .inv-link-input-group {
        display: flex; gap: 8px; margin-bottom: 16px;
      }
      .inv-link-input {
        flex: 1;
        padding: 12px 14px;
        border-radius: 12px;
        border: 1px solid #cbd5e1;
        font-size: 0.82rem;
        background: #f8fafc;
        color: #334155;
        outline: none;
        transition: border-color 150ms ease;
      }
      .inv-link-input:focus {
        border-color: #0A84FE;
      }

      .inv-actions {
        display: flex; gap: 10px; flex-wrap: wrap;
      }
      .inv-btn {
        flex: 1; min-width: 130px;
        padding: 13px 16px;
        border: none; border-radius: 14px;
        font-size: 0.92rem; font-weight: 700;
        cursor: pointer;
        transition: all 180ms ease;
        text-align: center;
        display: flex; align-items: center; justify-content: center; gap: 6px;
        letter-spacing: -0.2px;
      }
      .inv-btn-copy {
        background: linear-gradient(135deg, #0A84FE 0%, #0056B3 100%);
        color: #ffffff;
        box-shadow: 0 4px 16px rgba(10, 132, 254, 0.35);
      }
      .inv-btn-copy:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(10, 132, 254, 0.45);
      }
      .inv-btn-share {
        background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
        color: #ffffff;
        box-shadow: 0 4px 16px rgba(245, 158, 11, 0.35);
      }
      .inv-btn-share:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(245, 158, 11, 0.45);
      }
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

    const inviteUrl = `${window.location.origin}/invite.html?id=${eventData._id}&invite=${inviteToken}`;

    overlay.innerHTML = `
      <div class="inv-card" role="dialog" aria-modal="true">
        <div class="inv-header">
          <span class="inv-badge">CONTENIDO INVITATION</span>
          <h3>${escapeHtml(title)}</h3>
          <button type="button" class="inv-close-btn" id="inv-close" aria-label="닫기">&times;</button>
        </div>
        <div class="inv-body">
          <div class="inv-inviter-tag">
            초대 부원 : <strong>${escapeHtml(inviterLabel)}</strong>
          </div>
          <div class="inv-info-box">
            <div class="inv-info-row">
              <span class="inv-info-label">일시</span>
              <span class="inv-info-val">${escapeHtml(dateStr)} (${escapeHtml(timeStr)})</span>
            </div>
            <div class="inv-info-row">
              <span class="inv-info-label">장소</span>
              <span class="inv-info-val">${escapeHtml(placeStr)}</span>
            </div>
            <div class="inv-info-row">
              <span class="inv-info-label">참가비</span>
              <span class="inv-info-val">${escapeHtml(feeStr)}</span>
            </div>
          </div>
          <div class="inv-link-input-group">
            <input type="text" class="inv-link-input" id="inv-link-text" value="${escapeHtml(inviteUrl)}" readonly>
          </div>
          <div class="inv-actions">
            <button type="button" class="inv-btn inv-btn-copy" id="inv-btn-copy">초대장 링크 복사</button>
            <button type="button" class="inv-btn inv-btn-share" id="inv-btn-share">초대장 공유하기</button>
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
      const coverImageUrl = 'https://contenido.kr/images/invitation_cover.png';
      if (window.Kakao && typeof Kakao.isInitialized === 'function' && Kakao.isInitialized()) {
        try {
          Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
              title: `[콘테니도 초대장] ${title}`,
              description: `${inviterLabel}님이 [${title}] 이벤트에 초대를 보냈습니다. 링크를 눌러 참가 신청을 완료해 주세요!`,
              imageUrl: coverImageUrl,
              imageWidth: 1200,
              imageHeight: 630,
              link: {
                mobileWebUrl: inviteUrl,
                webUrl: inviteUrl
              }
            },
            buttons: [
              {
                title: '초대장 확인 & 신청하기',
                link: {
                  mobileWebUrl: inviteUrl,
                  webUrl: inviteUrl
                }
              }
            ]
          });
          return;
        } catch (e) {
          console.error('Kakao share error:', e);
        }
      }

      if (navigator.share) {
        navigator.share({
          title: `[콘테니도 초대장] ${title}`,
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
