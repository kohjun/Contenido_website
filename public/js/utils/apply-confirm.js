/* =====================================================================
   apply-confirm.js — 이벤트 신청 약관 동의 모달 (Tone-on-Tone Azure)
   ===================================================================== */
(function () {
  if (window.confirmEventApplication) return;

  const STYLE_ID = 'apply-confirm-style';
  const MODAL_ID = 'apply-confirm-modal';

  function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .ac-overlay {
        position: fixed;
        inset: 0;
        background: rgba(8, 28, 59, 0.54);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        opacity: 0;
        pointer-events: none;
        transition: opacity 200ms var(--ease, ease);
        padding: 18px;
        overscroll-behavior: contain;
        font-family: var(--ff-base, 'GmarketSansMedium', system-ui, sans-serif);
      }
      .ac-overlay.is-open { opacity: 1; pointer-events: auto; }

      .ac-modal {
        background: var(--c-surface, #FFFFFF);
        border: 1px solid var(--c-border, #DCE7F5);
        border-radius: 24px;
        width: 100%;
        max-width: 452px;
        max-height: 90dvh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: var(--sh-lg, 0 24px 52px rgba(8, 28, 59, 0.24));
        translate: 0 14px;
        scale: 0.97;
        transition: translate 240ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
                    scale 240ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
      }
      .ac-overlay.is-open .ac-modal { translate: 0 0; scale: 1; }

      .ac-head {
        padding: 22px 24px 16px;
        border-bottom: 1px solid var(--c-border-subtle, #EAF1FA);
        background: linear-gradient(180deg, var(--brand-50, #F0F7FF) 0%, #FFFFFF 100%);
      }
      .ac-head h3 {
        margin: 0 0 5px;
        font-size: 1.08rem;
        color: var(--c-text, #0C1E38);
        display: flex;
        align-items: center;
        gap: 9px;
      }
      .ac-head-ico {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: 10px;
        background: var(--brand-100, #DEEEFF);
        color: var(--c-brand, #0A84FE);
        flex-shrink: 0;
      }
      .ac-head p {
        margin: 0;
        font-size: 0.82rem;
        color: var(--c-text-muted, #5A708D);
      }

      .ac-body {
        padding: 18px 24px;
        overflow-y: auto;
        overscroll-behavior: contain;
        flex: 1;
        color: var(--c-text-soft, #304765);
      }
      .ac-terms {
        background: var(--brand-50, #F0F7FF);
        border: 1px solid var(--brand-200, #BBDDFD);
        border-left: 4px solid var(--c-brand, #0A84FE);
        border-radius: 14px;
        padding: 15px 16px;
        margin-bottom: 16px;
      }
      .ac-terms h4 {
        margin: 0 0 9px;
        font-size: 0.9rem;
        color: var(--brand-700, #0755B3);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .ac-terms ul {
        margin: 0;
        padding-left: 18px;
        font-size: 0.85rem;
        color: var(--c-text-soft, #304765);
        line-height: 1.65;
      }
      .ac-terms ul li { margin-bottom: 5px; }
      .ac-terms ul li:last-child { margin-bottom: 0; }
      .ac-terms ul li strong {
        color: var(--c-text, #0C1E38);
        font-weight: 700;
      }
      .ac-terms a {
        color: var(--c-brand, #0A84FE);
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .ac-agree {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 13px 15px;
        border: 1.5px solid var(--c-border, #DCE7F5);
        border-radius: 14px;
        cursor: pointer;
        transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
        background: var(--c-surface, #FFFFFF);
      }
      .ac-agree:hover {
        border-color: var(--brand-300, #87C3FC);
        background: var(--brand-50, #F0F7FF);
      }
      .ac-agree.is-checked {
        border-color: var(--c-brand, #0A84FE);
        background: var(--brand-50, #F0F7FF);
        box-shadow: 0 0 0 3px rgba(10, 132, 254, 0.12);
      }
      .ac-agree input[type="checkbox"] {
        width: 19px;
        height: 19px;
        margin: 0;
        accent-color: var(--c-brand, #0A84FE);
        cursor: pointer;
        flex-shrink: 0;
      }
      .ac-agree label {
        flex: 1;
        font-size: 0.87rem;
        color: var(--c-text, #0C1E38);
        cursor: pointer;
        line-height: 1.45;
        font-weight: 600;
      }

      .ac-foot {
        display: flex;
        gap: 10px;
        padding: 14px 24px 20px;
        border-top: 1px solid var(--c-border-subtle, #EAF1FA);
        background: var(--c-surface-2, #F2F6FC);
      }
      .ac-btn {
        flex: 1;
        padding: 13px 14px;
        border: 1px solid transparent;
        border-radius: 14px;
        font-size: 0.92rem;
        font-weight: 700;
        font-family: inherit;
        cursor: pointer;
        transition: background-color 160ms ease, border-color 160ms ease, translate 160ms ease, box-shadow 160ms ease;
      }
      .ac-btn.cancel {
        background: var(--c-surface, #FFFFFF);
        color: var(--c-text-soft, #304765);
        border-color: var(--c-border, #DCE7F5);
      }
      .ac-btn.cancel:hover {
        background: var(--brand-50, #F0F7FF);
        border-color: var(--brand-200, #BBDDFD);
        color: var(--c-brand-deep, #0755B3);
      }
      .ac-btn.confirm {
        background: linear-gradient(135deg, var(--brand-500, #0A84FE) 0%, var(--brand-600, #056DE0) 100%);
        color: #FFFFFF;
        box-shadow: var(--sh-brand, 0 6px 16px rgba(10, 132, 254, 0.3));
      }
      .ac-btn.confirm:hover:not(:disabled) {
        translate: 0 -1px;
        box-shadow: 0 8px 20px rgba(10, 132, 254, 0.38);
      }
      .ac-btn.confirm:disabled {
        background: var(--c-surface-3, #E5EFFB);
        color: var(--c-text-faint, #8CA1BC);
        cursor: not-allowed;
        box-shadow: none;
      }

      @media (max-width: 480px) {
        .ac-modal { border-radius: 20px; max-width: calc(100vw - 28px); }
        .ac-head, .ac-body { padding-left: 18px; padding-right: 18px; }
        .ac-foot { padding: 12px 18px 18px; }
        .ac-head h3 { font-size: 1rem; }
        .ac-terms { padding: 13px 14px; }
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
          <h3 id="ac-title">
            <span class="ac-head-ico" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </span>
            <span>이벤트 신청 약관 동의</span>
          </h3>
          <p>신청 전 아래 내용을 꼭 확인해주세요</p>
        </div>
        <div class="ac-body">
          <div class="ac-terms">
            <h4>꼭 확인하세요</h4>
            <ul>
              <li><strong>참가가 확정된 이후</strong>에는 참가비 환불이 <strong>불가능</strong>합니다.</li>
              <li><strong>참가 확정 후 취소</strong>할 경우 운영규정에 따라 <strong>경고가 부여</strong>될 수 있습니다.</li>
              <li>대타 섭외 또는 인사팀 승인이 있는 경우 경고가 면제될 수 있습니다.</li>
              <li>자세한 내용은 <a href="/rules.html" target="_blank" rel="noopener">동아리 규칙</a>을 참고해주세요.</li>
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

  window.confirmEventApplication = function () {
    init();

    return new Promise((resolve) => {
      const overlay = document.getElementById(MODAL_ID);
      const cb = document.getElementById('ac-agree-cb');
      const wrap = document.getElementById('ac-agree-wrap');
      const confirmBtn = document.getElementById('ac-confirm');
      const cancelBtn = document.getElementById('ac-cancel');

      cb.checked = false;
      wrap.classList.remove('is-checked');
      confirmBtn.disabled = true;

      const onChange = () => {
        wrap.classList.toggle('is-checked', cb.checked);
        confirmBtn.disabled = !cb.checked;
      };
      const onWrapClick = (e) => {
        if (e.target !== cb && e.target.tagName !== 'LABEL') {
          cb.checked = !cb.checked;
          onChange();
        }
      };
      const onConfirm = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      const onOverlayClick = (e) => { if (e.target === overlay) onCancel(); };
      const onKey = (e) => { if (e.key === 'Escape') onCancel(); };

      function cleanup() {
        overlay.classList.remove('is-open');
        cb.removeEventListener('change', onChange);
        wrap.removeEventListener('click', onWrapClick);
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlayClick);
        document.removeEventListener('keydown', onKey);
      }

      cb.addEventListener('change', onChange);
      wrap.addEventListener('click', onWrapClick);
      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
      overlay.addEventListener('click', onOverlayClick);
      document.addEventListener('keydown', onKey);

      overlay.classList.add('is-open');
      setTimeout(() => cb.focus(), 200);
    });
  };
})();
