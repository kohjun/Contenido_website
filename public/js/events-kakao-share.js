// public/js/events-kakao-share.js
// /events.html 의 카카오톡 리스트 공유 기능

(function () {
  let kakaoReady = false;

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

  function buildImageUrl(event, origin) {
    if (event.images && event.images.length > 0) {
      const p = event.images[0];
      if (/^https?:\/\//.test(p)) return p;
      return origin + (p.startsWith('/') ? p : '/' + p);
    }
    return origin + '/images/Basic_Event_Image.png';
  }

  function isCurrentMonthEvent(event, now) {
    if (!event || !event.date) return false;

    const eventDate = new Date(event.date);
    if (Number.isNaN(eventDate.getTime())) return false;

    return eventDate.getFullYear() === now.getFullYear()
      && eventDate.getMonth() === now.getMonth();
  }

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

      events = events
        .filter((e) => !e.isEnded)
        .filter((e) => isCurrentMonthEvent(e, new Date()))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (events.length === 0) {
        notify('공유할 진행중인 이벤트가 없습니다.', 'warning');
        return;
      }

      const origin = window.location.origin;
      const eventsLink = `${origin}/events.html`;
      const now = new Date();
      const headerTitle = `콘테니도 ${now.getFullYear()}년 ${now.getMonth() + 1}월 이벤트 🚀`;

      // 텍스트 형태의 이벤트 리스트 빌드 (최대 10개까지 설명란에 노출)
      const listLimit = 10;
      const displayedEvents = events.slice(0, listLimit);
      const eventListText = displayedEvents.map((event, idx) => {
        const d = new Date(event.date);
        const m = d.getMonth() + 1;
        const day = d.getDate();
        return `${idx + 1}. ${event.title} (${m}/${day})`;
      }).join('\n');

      const extraText = events.length > listLimit ? `\n...외 ${events.length - listLimit}개의 이벤트가 더 있습니다.` : '';
      const description = `이번 달에 진행되는 이벤트 목록입니다.\n지금 바로 신청하세요!\n\n${eventListText}${extraText}`;

      // 첫 번째 이벤트 이미지를 대표 이미지로 사용
      const imageUrl = buildImageUrl(events[0], origin);

      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: headerTitle,
          description: description,
          imageUrl: imageUrl,
          link: {
            mobileWebUrl: eventsLink,
            webUrl: eventsLink,
          },
        },
        buttons: [
          {
            title: '이벤트 신청하기',
            link: {
              mobileWebUrl: eventsLink,
              webUrl: eventsLink,
            },
          },
        ],
      });
    } catch (error) {
      console.error('카카오 공유 실패:', error);
      notify('카카오톡 공유 중 오류가 발생했습니다.', 'danger');
    }
  }

  window.shareEventsListToKakao = shareEventsListToKakao;
})();
