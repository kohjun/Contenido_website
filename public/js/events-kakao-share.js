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
      const monthNum = now.getMonth() + 1;

      // 신청 기간 로드
      let startDay = 1;
      let endDay = 5;
      try {
        const res = await fetch('/user/monthly-application-period');
        if (res.ok) {
          const period = await res.json();
          startDay = period.startDay || 1;
          endDay = period.endDay || 5;
        }
      } catch (err) {
        console.error('Error fetching period in kakao share:', err);
      }

      // 한 줄에 한 이벤트씩 텍스트 리스트 구성
      const headerTitle = `📅 콘테니도 ${now.getFullYear()}년 ${monthNum}월 이벤트 목록\n`;
      const periodText = `신청기간: ${monthNum}월 ${startDay}일 ~ ${endDay}일\n\n`;

      const eventLines = events.map((event) => {
        const ed = new Date(event.date);
        const m = ed.getMonth() + 1;
        const day = ed.getDate();
        const days = '일월화수목금토';
        const dateStr = `${m}/${day}(${days[ed.getDay()]})`;
        return `• ${dateStr} : ${event.title}`;
      }).join('\n');

      const textContent = `${headerTitle}${periodText}${eventLines}\n\n지금 바로 신청해보세요!`;

      Kakao.Share.sendDefault({
        objectType: 'text',
        text: textContent,
        link: {
          mobileWebUrl: eventsLink,
          webUrl: eventsLink,
        },
        buttons: [
          {
            title: '이벤트 신청하러 가기',
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
