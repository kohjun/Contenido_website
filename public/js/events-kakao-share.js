// public/js/events-kakao-share.js
// /events.html 의 카카오톡 리스트 공유 기능 (선택식)

(function () {
  let kakaoReady = false;
  let cachedEvents = [];

  function notify(msg, type) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, { type: type || 'info' });
    } else {
      alert(msg);
    }
  }

  async function initializeKakao() {
    if (typeof Kakao === 'undefined') {
      console.error('Kakao SDK가 로드되지 않았습니다.');
      return false;
    }
    if (Kakao.isInitialized()) {
      kakaoReady = true;
      return true;
    }
    try {
      const response = await fetch('/events/kakao-key');
      const data = await response.json();
      if (!data || !data.kakaoKey) {
        console.error('카카오 JS 키가 설정되지 않았습니다.');
        return false;
      }
      Kakao.init(data.kakaoKey);
      kakaoReady = true;
      return true;
    } catch (error) {
      console.error('카카오 초기화 실패:', error);
      return false;
    }
  }

  function isCurrentMonthEvent(event, now) {
    if (!event || !event.date) return false;

    const eventDate = new Date(event.date);
    if (Number.isNaN(eventDate.getTime())) return false;

    return eventDate.getFullYear() === now.getFullYear()
      && eventDate.getMonth() === now.getMonth();
  }

  function buildImageUrl(event, origin) {
    if (event.images && event.images.length > 0) {
      const p = event.images[0];
      if (/^https?:\/\//.test(p)) return p;
      return origin + (p.startsWith('/') ? p : '/' + p);
    }
    return origin + '/images/Basic_Event_Image.png';
  }

  // 모달 열기 및 이벤트를 바인딩
  async function shareEventsListToKakao() {
    const ok = await initializeKakao();
    if (!ok) {
      notify('카카오톡 공유 기능을 사용할 수 없습니다.', 'danger');
      return;
    }

    try {
      const response = await fetch('/events');
      let events = await response.json();
      if (!Array.isArray(events)) events = [];

      // 이번 달 진행 중인 이벤트만 필터링 후 날짜순 정렬
      cachedEvents = events
        .filter((e) => !e.isEnded)
        .filter((e) => isCurrentMonthEvent(e, new Date()))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (cachedEvents.length === 0) {
        notify('공유할 진행중인 이벤트가 없습니다.', 'warning');
        return;
      }

      // 모달 엘리먼트 렌더링
      const listContainer = document.getElementById('kakao-share-events-list');
      if (!listContainer) return;

      listContainer.innerHTML = '';
      cachedEvents.forEach((event) => {
        const ed = new Date(event.date);
        const m = ed.getMonth() + 1;
        const day = ed.getDate();
        const days = '일월화수목금토';
        const dateStr = `${m}/${day}(${days[ed.getDay()]})`;

        const item = document.createElement('div');
        item.className = 'kakao-share-item';
        item.dataset.id = event._id;

        item.innerHTML = `
          <input type="checkbox" value="${event._id}">
          <div class="kakao-share-item-info">
            <div class="kakao-share-item-title">${escapeHtml(event.title)}</div>
            <div class="kakao-share-item-date">📅 ${dateStr} | 📍 ${escapeHtml(event.place || '장소 미정')}</div>
          </div>
        `;

        // 클릭 이벤트 등록
        item.addEventListener('click', (e) => {
          const checkbox = item.querySelector('input[type="checkbox"]');
          if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
          }
          handleCheckboxChange(item, checkbox);
        });

        const checkbox = item.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
          handleCheckboxChange(item, checkbox);
        });

        listContainer.appendChild(item);
      });

      // 모달 띄우기
      const modal = document.getElementById('kakao-share-modal');
      if (modal) modal.style.display = 'flex';
      updateConfirmButtonState();
    } catch (error) {
      console.error('이벤트 목록 로딩 실패:', error);
      notify('이벤트 목록을 가져오는 데 실패했습니다.', 'danger');
    }
  }

  function handleCheckboxChange(item, checkbox) {
    const listContainer = document.getElementById('kakao-share-events-list');
    const checkedBoxes = listContainer.querySelectorAll('input[type="checkbox"]:checked');

    if (checkedBoxes.length > 3) {
      checkbox.checked = false;
      notify('카카오톡 리스트형 공유는 최대 3개까지만 선택할 수 있습니다.', 'warning');
      return;
    }

    if (checkbox.checked) {
      item.classList.add('is-selected');
    } else {
      item.classList.remove('is-selected');
    }
    updateConfirmButtonState();
  }

  function updateConfirmButtonState() {
    const listContainer = document.getElementById('kakao-share-events-list');
    const checkedCount = listContainer ? listContainer.querySelectorAll('input[type="checkbox"]:checked').length : 0;
    const confirmBtn = document.getElementById('confirm-kakao-share-btn');
    if (confirmBtn) {
      confirmBtn.disabled = checkedCount < 1 || checkedCount > 3;
    }
  }

  function closeKakaoShareModal() {
    const modal = document.getElementById('kakao-share-modal');
    if (modal) modal.style.display = 'none';
  }

  function confirmKakaoShare() {
    const listContainer = document.getElementById('kakao-share-events-list');
    if (!listContainer) return;

    const checkedBoxes = Array.from(listContainer.querySelectorAll('input[type="checkbox"]:checked'));
    if (checkedBoxes.length < 1 || checkedBoxes.length > 3) {
      notify('공유할 이벤트를 1개에서 최대 3개까지 선택해 주세요.', 'warning');
      return;
    }

    const selectedIds = checkedBoxes.map(cb => cb.value);
    const selectedEvents = cachedEvents.filter(e => selectedIds.includes(e._id));

    const origin = window.location.origin;
    const eventsLink = `${origin}/events.html`;
    const now = new Date();
    const monthNum = now.getMonth() + 1;

    // 카카오 공유 전송
    if (selectedEvents.length === 1) {
      // 1개인 경우는 피드형(Feed)으로 전송 (리스트형은 최소 2개 요건 만족 필요)
      const event = selectedEvents[0];
      const ed = new Date(event.date);
      const m = ed.getMonth() + 1;
      const day = ed.getDate();
      const days = '일월화수목금토';
      const dateStr = `${m}/${day}(${days[ed.getDay()]})`;

      const detailLink = `${origin}/additional-info.html?id=${event._id}`;

      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: event.title,
          description: `진행일: ${dateStr}\n장소: ${event.place || '장소 미정'}`,
          imageUrl: buildImageUrl(event, origin),
          link: {
            mobileWebUrl: detailLink,
            webUrl: detailLink,
          },
        },
        buttons: [
          {
            title: '이벤트 신청하러 가기',
            link: {
              mobileWebUrl: detailLink,
              webUrl: detailLink,
            },
          },
        ],
      });
    } else {
      // 2~3개인 경우는 리스트형(List)으로 전송
      const contents = selectedEvents.map(event => {
        const ed = new Date(event.date);
        const m = ed.getMonth() + 1;
        const day = ed.getDate();
        const days = '일월화수목금토';
        const dateStr = `${m}/${day}(${days[ed.getDay()]})`;

        const detailLink = `${origin}/additional-info.html?id=${event._id}`;

        return {
          title: event.title,
          description: `진행일: ${dateStr}`,
          imageUrl: buildImageUrl(event, origin),
          link: {
            mobileWebUrl: detailLink,
            webUrl: detailLink,
          }
        };
      });

      Kakao.Share.sendDefault({
        objectType: 'list',
        headerTitle: `콘테니도 ${now.getFullYear()}년 ${monthNum}월 이벤트 목록 🚀`,
        headerLink: {
          mobileWebUrl: eventsLink,
          webUrl: eventsLink,
        },
        contents: contents,
        buttons: [
          {
            title: '이벤트 신청 및 더 보기',
            link: {
              mobileWebUrl: eventsLink,
              webUrl: eventsLink,
            },
          },
        ],
      });
    }

    closeKakaoShareModal();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.shareEventsListToKakao = shareEventsListToKakao;
  window.closeKakaoShareModal = closeKakaoShareModal;
  window.confirmKakaoShare = confirmKakaoShare;
})();
