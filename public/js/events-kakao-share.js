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

  function buildContents(events, origin) {
    return events.map((event) => {
      const dateStr = new Date(event.date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      const description = `${dateStr}  ${event.startTime} ~ ${event.endTime}  | ${event.team}`;
      const detailLink = `${origin}/additional-info.html?id=${event._id}`;

      return {
        title: event.title,
        description,
        imageUrl: buildImageUrl(event, origin),
        link: {
          mobileWebUrl: detailLink,
          webUrl: detailLink,
        },
      };
    });
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
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      if (events.length === 0) {
        notify('공유할 진행중인 이벤트가 없습니다.', 'warning');
        return;
      }
      if (events.length < 2) {
        notify('카카오 리스트 공유는 이벤트가 2개 이상일 때만 가능합니다.', 'warning');
        return;
      }

      const items = events.slice(0, 3);
      const origin = window.location.origin;
      const eventsLink = `${origin}/events.html`;

      const now = new Date();
      const headerTitle = `콘테니도 ${now.getFullYear()}년 ${now.getMonth() + 1}월 이벤트`;

      Kakao.Share.sendDefault({
        objectType: 'list',
        headerTitle,
        headerLink: {
          mobileWebUrl: eventsLink,
          webUrl: eventsLink,
        },
        contents: buildContents(items, origin),
        buttons: [
          {
            title: '신청하기',
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
