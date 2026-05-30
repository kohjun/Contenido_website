// public/js/utils/ui.js
// modern.css 컴포넌트와 짝을 이루는 가벼운 UI 헬퍼.
// 토스트 / 모달 / 컨펌을 alert·confirm 대신 사용.

(function () {
  function ensureToastContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function showToast(message, opts) {
    opts = opts || {};
    const type = opts.type || 'info';
    const duration = opts.duration == null ? 3000 : opts.duration;
    const c = ensureToastContainer();
    const t = document.createElement('div');
    t.className = 'toast is-' + type;
    t.textContent = message;
    c.appendChild(t);
    if (duration > 0) {
      setTimeout(function () {
        t.classList.add('is-leaving');
        setTimeout(function () { t.remove(); }, 280);
      }, duration);
    }
    return t;
  }

  function openConfirm(opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop-v2';

      const dialog = document.createElement('div');
      dialog.className = 'modal-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const title = opts.title || '확인';
      const message = opts.message || '';
      const okText = opts.okText || '확인';
      const cancelText = opts.cancelText || '취소';
      const danger = !!opts.danger;

      dialog.innerHTML =
        '<div class="modal-header">' +
          '<h3 class="modal-title">' + escapeHtml(title) + '</h3>' +
          '<button type="button" class="modal-close" aria-label="닫기">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="modal-body">' + escapeHtml(message).replace(/\n/g, '<br>') + '</div>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn btn-ghost" data-action="cancel">' + escapeHtml(cancelText) + '</button>' +
          '<button type="button" class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-action="ok">' + escapeHtml(okText) + '</button>' +
        '</div>';

      document.body.appendChild(backdrop);
      document.body.appendChild(dialog);

      requestAnimationFrame(function () {
        backdrop.classList.add('is-open');
        dialog.classList.add('is-open');
      });

      function close(result) {
        backdrop.classList.remove('is-open');
        dialog.classList.remove('is-open');
        setTimeout(function () {
          backdrop.remove();
          dialog.remove();
        }, 200);
        document.removeEventListener('keydown', onKey);
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') close(false);
        if (e.key === 'Enter')  close(true);
      }

      backdrop.addEventListener('click', function () { close(false); });
      dialog.querySelector('.modal-close').addEventListener('click', function () { close(false); });
      dialog.querySelector('[data-action="cancel"]').addEventListener('click', function () { close(false); });
      dialog.querySelector('[data-action="ok"]').addEventListener('click', function () { close(true); });
      document.addEventListener('keydown', onKey);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.showToast = showToast;
  window.openConfirm = openConfirm;
  window.escapeHtml = escapeHtml;
  window.escapeAttr = escapeHtml;
})();
