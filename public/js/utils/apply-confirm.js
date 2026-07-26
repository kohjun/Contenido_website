/* =====================================================================
   apply-confirm.js — 이벤트 신청 약관 동의 모달
   ---------------------------------------------------------------------
   사용법:
     const ok = await window.confirmEventApplication();
     if (!ok) return;
     // ... 신청 fetch
   ===================================================================== */
(function () {
  if (window.confirmEventApplication) return;  // 중복 로드 방지

  const STYLE_ID = 'apply-confirm-style';
  const MODAL_ID = 'apply-confirm-modal';

  function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .ac-overlay {
        position: fixed; inset: 0;
        background: rgba(15, 23, 42, 0.55);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
        opacity: 0; pointer-events: none;
        transition: opacity 180ms ease;
        padding: 20px;
        font-family: 'GmarketSansMedium', system-ui, sans-serif;
      }
      .ac-overlay.is-open { opacity: 1; pointer-events: auto; }
      .ac-modal {
        background: #E8F7FF;
        border-radius: 22px;
        width: 100%;
        max-width: 460px;
        max-height: 90vh;
        overflow: hidden;
        display: flex; flex-direction: column;
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
        transform: translateY(10px);
        transition: transform 200ms ease;
      }
      .ac-overlay.is-open .ac-modal { transform: translateY(0); }

      .ac-head {
        padding: 22px 24px 14px;
        border-bottom: 1px solid #EEF2F7;
      }
      .ac-head h3 {
        margin: 0 0 4px;
        font-size: 1.1rem;
        color: #000;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .ac-head p {
        margin: 0;
        font-size: 0.82rem;
        color: #000;
      }

      .ac-body {
        padding: 16px 24px;
        overflow-y: auto;
        flex: 1;
        color: #000;
      }
      .ac-terms {
        background: #D6F1FF;
        border-left: 4px solid #0A84FE;
        border-radius: 12px;
        padding: 14px 16px;
        margin-bottom: 16px;
      }
      .ac-terms h4 {
        margin: 0 0 8px;
        font-size: 0.92rem;
        color: #000;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .ac-terms ul {
        margin: 0; padding-left: 20px;
        font-size: 0.86rem;
        color: #000;
        line-height: 1.6;
      }
      .ac-terms ul li { margin-bottom: 4px; }
      .ac-terms ul li:last-child { margin-bottom: 0; }
      .ac-terms ul li strong {
        color: #000;
        font-weight: 700;
      }
      .ac-terms a {
        color: #0A84FE;
        text-decoration: underline;
      }

      .ac-agree {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px 14px;
        border: 1.5px solid #E2E8F0;
        border-radius: 12px;
        cursor: pointer;
        transition: all 150ms ease;
        background: #FFF;
      }
      .ac-agree:hover {
        border-color: #0A84FE;
        background: #F2F8FF;
      }
      .ac-agree.is-checked {
        border-color: #0A84FE;
        background: #E8F2FF;
      }
      .ac-agree input[type="checkbox"] {
        width: 20px; height: 20px;
        margin-top: 1px;
        accent-color: #0A84FE;
        cursor: pointer;
        flex-shrink: 0;
      }
      .ac-agree label {
        flex: 1;
        font-size: 0.88rem;
        color: #000;
        cursor: pointer;
        line-height: 1.5;
        font-weight: 600;
      }

      .ac-foot {
        display: flex;
        gap: 8px;
        padding: 14px 24px 20px;
        border-top: 1px solid #EEF2F7;
      }
      .ac-btn {
        flex: 1;
        padding: 13px;
        border: none;
        border-radius: 12px;
        font-size: 0.95rem;
        font-weight: 700;
        font-family: inherit;
        cursor: pointer;
        transition: all 150ms ease;
      }
      .ac-btn.cancel {
        background: #F5F8FC;
        color: #5A6B7C;
      }
      .ac-btn.cancel:hover {
        background: #E2E8F0;
        color: #1F2937;
      }
      .ac-btn.confirm {
        background: #0A84FE;
        color: #fff;
        box-shadow: 0 4px 12px rgba(10, 132, 254, 0.3);
      }
      .ac-btn.confirm:hover:not(:disabled) {
        background: #0875E0;
        transform: translateY(-1px);
      }
      .ac-btn.confirm:disabled {
        background: #CBD5E1;
        color: #94A3B8;
        cursor: not-allowed;
        box-shadow: none;
      }

      @media (max-width: 480px) {
        .ac-modal { border-radius: 20px; max-width: calc(100vw - 32px); }
        .ac-head, .ac-body { padding-left: 18px; padding-right: 18px; }
        .ac-foot { padding: 12px 18px 18px; }
        .ac-head h3 { font-size: 1rem; }
        .ac-terms { padding: 12px 14px; }
        .ac-terms ul { font-size: 0.82rem; }
      }
    `;
    document.head.appendChild(style);
  }

  function injectMarkupOnce() {
    if (document.getElementById(MODAL_ID)) return;
    const div = document.createElement('div');
    div.id = MODAL_ID;
    div.className = 'ac-overlay';
    div.innerHTML = `
      <div class="ac-modal" role="dialog" aria-modal="true" aria-labelledby="ac-title">
        <div class="ac-head">
          <h3 id="ac-title">이벤트 신청 약관 동의</h3>
          <p>신청 전 아래 내용을 꼭 확인해주세요</p>
        </div>
        <div class="ac-body">
          <div class="ac-terms">
            <h4>꼭 확인하세요</h4>
            <ul>
              <li><strong>참가가 확정된 이후</strong>에는 참가비 환불이 <strong>불가능</strong>합니다.</li>
              <li><strong>참가 확정 후 취소</strong>할 경우 운영규정에 따라 <strong>경고가 부여</strong>될 수 있습니다.</li>
              <li>대타 섭외 또는 인사팀 승인이 있는 경우 경고가 면제될 수 있습니다.</li>
              <li>자세한 내용은 <a href="rules.html" target="_blank" style="color:#0A84FE; text-decoration:underline;">동아리 규칙</a>을 참고해주세요.</li>
            </ul>
          </div>
          <div class="ac-agree" id="ac-agree-wrap">
            <input type="checkbox" id="ac-agree-cb">
            <label for="ac-agree-cb">위 내용을 모두 확인하였으며 동의합니다.</label>
          </div>
        </div>
        <div class="ac-foot">
          <button type="button" class="ac-btn cancel" id="ac-cancel">취소</button>
          <button type="button" class="ac-btn confirm" id="ac-confirm" disabled>신청하기</button>
        </div>
      </div>
    `;
    document.body.appendChild(div);
  }

  function init() {
    injectStyleOnce();
    injectMarkupOnce();
  }

  /**
   * 약관 동의 모달을 띄우고 사용자의 응답을 Promise로 반환.
   * @returns {Promise<boolean>} true = 동의 후 신청, false = 취소
   */
  window.confirmEventApplication = function (options = {}) {
    init();

    return new Promise((resolve) => {
      const overlay = document.getElementById(MODAL_ID);
      const cb = document.getElementById('ac-agree-cb');
      const wrap = document.getElementById('ac-agree-wrap');
      const confirmBtn = document.getElementById('ac-confirm');
      const cancelBtn = document.getElementById('ac-cancel');

      // 초기화
      cb.checked = false;
      wrap.classList.remove('is-checked');
      confirmBtn.disabled = true;

      const onChange = () => {
        wrap.classList.toggle('is-checked', cb.checked);
        confirmBtn.disabled = !cb.checked;
      };

      const onConfirm = () => {
        cleanup();
        resolve(true);
      };
      const onCancel = () => { cleanup(); resolve(false); };
      const onOverlayClick = (e) => { if (e.target === overlay) onCancel(); };
      const onKey = (e) => { if (e.key === 'Escape') onCancel(); };

      function cleanup() {
        overlay.classList.remove('is-open');
        cb.removeEventListener('change', onChange);
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlayClick);
        document.removeEventListener('keydown', onKey);
      }

      cb.addEventListener('change', onChange);
      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
      overlay.addEventListener('click', onOverlayClick);
      document.addEventListener('keydown', onKey);

      // 열기
      overlay.classList.add('is-open');
      // 첫 진입 시 체크박스 포커스
      setTimeout(() => cb.focus(), 200);
    });
  };
})();
