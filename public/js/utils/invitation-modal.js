/* =====================================================================
   invitation-modal.js — 이벤트 지인 초대장 생성 & 공유 모달 (Tone-on-Tone Azure)
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
        position: fixed;
        inset: 0;
        background: rgba(8, 28, 59, 0.58);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100000;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        opacity: 0;
        pointer-events: none;
        overscroll-behavior: contain;
        transition: opacity 220ms var(--ease, ease);
        padding: 18px;
        font-family: var(--ff-base, 'GmarketSansMedium', system-ui, sans-serif);
      }
      .inv-overlay.is-open { opacity: 1; pointer-events: auto; }

      .inv-card {
        background: var(--c-surface, #FFFFFF);
        border: 1px solid var(--c-border, #DCE7F5);
        border-radius: 24px;
        width: 100%;
        max-width: 440px;
        box-shadow: var(--sh-lg, 0 25px 50px -12px rgba(8, 28, 59, 0.28));
        overflow: hidden;
        display: flex;
        flex-direction: column;
        translate: 0 16px;
        scale: 0.97;
        transition: translate 260ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
                    scale 260ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
        position: relative;
        color: var(--c-text, #0C1E38);
      }
      .inv-overlay.is-open .inv-card { translate: 0 0; scale: 1; }

      .inv-header {
        background: linear-gradient(135deg, var(--brand-500, #0A84FE) 0%, var(--brand-700, #0755B3) 100%);
        color: #FFFFFF;
        padding: 24px 48px 20px;
        text-align: center;
        position: relative;
      }
      .inv-header .inv-badge {
        display: inline-block;
        background: rgba(255, 255, 255, 0.16);
        border: 1px solid rgba(255, 255, 255, 0.26);
        padding: 4px 12px;
        border-radius: 999px;
        font-size: 0.7rem;
        letter-spacing: 0.12em;
        font-weight: 700;
        text-transform: uppercase;
        margin-bottom: 10px;
        color: #FFFFFF;
      }
      .inv-header h3 {
        margin: 0;
        font-size: 1.24rem;
        font-weight: 700;
        line-height: 1.35;
        letter-spacing: -0.02em;
        color: #FFFFFF;
      }

      .inv-close-btn {
        position: absolute;
        top: 14px;
        right: 14px;
        background: rgba(255, 255, 255, 0.16);
        border: 1px solid rgba(255, 255, 255, 0.22);
        width: 32px;
        height: 32px;
        border-radius: 10px;
        color: #FFFFFF;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: background-color 150ms ease, scale 150ms ease;
      }
      .inv-close-btn:hover { background: rgba(255, 255, 255, 0.28); scale: 1.05; }

      .inv-body {
        padding: 22px 24px 24px;
        color: var(--c-text, #0C1E38);
      }

      .inv-inviter-tag {
        background: var(--brand-50, #F0F7FF);
        border: 1px solid var(--brand-200, #BBDDFD);
        border-radius: 14px;
        padding: 12px 16px;
        text-align: center;
        font-size: 0.88rem;
        color: var(--brand-700, #0755B3);
        font-weight: 600;
        margin-bottom: 16px;
      }
      .inv-inviter-tag strong {
        color: var(--brand-900, #0D2D5E);
        font-weight: 700;
      }

      .inv-info-box {
        background: var(--c-surface-2, #F2F6FC);
        border-radius: 16px;
        padding: 16px 18px;
        border: 1px solid var(--c-border, #DCE7F5);
        margin-bottom: 16px;
      }
      .inv-info-row {
        display: flex;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 10px;
        font-size: 0.86rem;
      }
      .inv-info-row:last-child { margin-bottom: 0; }
      .inv-info-label {
        color: var(--c-text-muted, #5A708D);
        font-weight: 600;
        width: 52px;
        flex-shrink: 0;
        font-size: 0.8rem;
      }
      .inv-info-val {
        color: var(--c-text, #0C1E38);
        font-weight: 700;
        flex: 1;
        word-break: break-word;
        line-height: 1.45;
      }

      .inv-link-input-group {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }
      .inv-link-input {
        flex: 1;
        padding: 11px 13px;
        border-radius: 12px;
        border: 1px solid var(--c-border-strong, #C0D4EE);
        font-size: 0.8rem;
        background: var(--c-surface-2, #F2F6FC);
        color: var(--c-text-soft, #304765);
        outline: none;
        transition: border-color 150ms ease, box-shadow 150ms ease;
      }
      .inv-link-input:focus {
        border-color: var(--c-brand, #0A84FE);
        box-shadow: 0 0 0 3px var(--c-focus-ring, rgba(10, 132, 254, 0.2));
      }

      .inv-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .inv-btn {
        padding: 13px 14px;
        border: 1px solid transparent;
        border-radius: 14px;
        font-size: 0.88rem;
        font-weight: 700;
        cursor: pointer;
        transition: background-color 160ms ease, border-color 160ms ease, translate 160ms ease, box-shadow 160ms ease;
        text-align: center;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
      }
      .inv-btn-copy {
        background: var(--brand-50, #F0F7FF);
        color: var(--brand-700, #0755B3);
        border-color: var(--brand-200, #BBDDFD);
      }
      .inv-btn-copy:hover {
        background: var(--brand-100, #DEEEFF);
        translate: 0 -1px;
      }
      .inv-btn-share {
        background: linear-gradient(135deg, var(--brand-500, #0A84FE) 0%, var(--brand-600, #056DE0) 100%);
        color: #FFFFFF;
        box-shadow: var(--sh-brand, 0 6px 16px rgba(10, 132, 254, 0.32));
      }
      .inv-btn-share:hover {
        translate: 0 -1px;
        box-shadow: 0 8px 22px rgba(10, 132, 254, 0.42);
      }

      @media (max-width: 420px) {
        .inv-actions { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  let activeCleanup = null;

  function showInvitationModal(eventData, inviterUser, inviteToken) {
    injectStyleOnce();
    if (activeCleanup) {
      activeCleanup();
      activeCleanup = null;
    }

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

    const closeSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    const copySvg = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    const shareSvg = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';

    overlay.innerHTML = `
      <div class="inv-card" role="dialog" aria-modal="true">
        <div class="inv-header">
          <span class="inv-badge">CONTENIDO INVITATION</span>
          <h3>${escapeHtml(title)}</h3>
          <button type="button" class="inv-close-btn" id="inv-close" aria-label="닫기">${closeSvg}</button>
        </div>
        <div class="inv-body">
          <div class="inv-inviter-tag">
            초대 부원 · <strong>${escapeHtml(inviterLabel)}</strong>
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
            <input type="text" class="inv-link-input" id="inv-link-text" value="${escapeHtml(inviteUrl)}" readonly aria-label="초대장 링크">
          </div>
          <div class="inv-actions">
            <button type="button" class="inv-btn inv-btn-copy" id="inv-btn-copy">${copySvg}<span>링크 복사</span></button>
            <button type="button" class="inv-btn inv-btn-share" id="inv-btn-share">${shareSvg}<span>초대장 공유</span></button>
          </div>
        </div>
      </div>
    `;

    overlay.classList.add('is-open');

    const closeBtn = document.getElementById('inv-close');
    const copyBtn = document.getElementById('inv-btn-copy');
    const shareBtn = document.getElementById('inv-btn-share');
    const linkInput = document.getElementById('inv-link-text');

    const close = () => {
      overlay.classList.remove('is-open');
      if (activeCleanup) {
        activeCleanup();
        activeCleanup = null;
      }
    };

    const onOverlayClick = (e) => { if (e.target === overlay) close(); };
    const onKeyDown = (e) => { if (e.key === 'Escape') close(); };

    activeCleanup = () => {
      overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKeyDown);
    };

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKeyDown);

    copyBtn.addEventListener('click', () => {
      if (linkInput) {
        linkInput.select();
        navigator.clipboard.writeText(inviteUrl).then(() => {
          if (window.showToast) window.showToast('초대장 링크가 클립보드에 복사되었습니다!', { type: 'success' });
          else alert('초대장 링크가 클립보드에 복사되었습니다!\n원하는 지인에게 공유해 주세요.');
        }).catch(() => {
          document.execCommand('copy');
          if (window.showToast) window.showToast('초대장 링크가 복사되었습니다!', { type: 'success' });
          else alert('초대장 링크가 복사되었습니다!');
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
              link: { mobileWebUrl: inviteUrl, webUrl: inviteUrl }
            },
            buttons: [
              {
                title: '초대장 확인 & 신청하기',
                link: { mobileWebUrl: inviteUrl, webUrl: inviteUrl }
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
