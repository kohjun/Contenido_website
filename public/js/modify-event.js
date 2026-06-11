let originalData = {};
let deletedImages = new Set();
let currentEvent = null; // 전역 변수로 현재 이벤트 데이터 저장
let currentUser = null; // 현재 사용자 정보 저장

// HTTP 응답을 JSON 혹은 에러 텍스트로 처리하는 헬퍼 함수
async function parseResponse(response) {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  const text = await response.text();
  if (response.status === 413) {
    throw new Error('업로드한 이미지 용량이 너무 큽니다. 이미지 용량을 줄여서 다시 시도해주세요. (최대 10MB)');
  }
  throw new Error(`서버에서 오류가 발생했습니다. (상태 코드: ${response.status})`);
}

async function loadEventContent(eventId) {
  try {
    // 인증 상태 확인 (이제 nav-injector에 포함된 AuthModule 사용)
    const isAuthenticated = await AuthModule.checkAuthentication();
    if (!isAuthenticated) return;
    
    // 사용자 정보 로드
    const user = await AuthModule.loadUserInfo();
    if (!user) {
      alert('사용자 정보를 불러오는데 실패했습니다.');
      return;
    }

    
    console.log(`이벤트 ID ${eventId} 정보 로드 시도`);
    const response = await fetch(`/events/${eventId}`);
    if (!response.ok) {
      throw new Error(`이벤트 정보를 가져오는데 실패했습니다. 상태: ${response.status}`);
    }
    
    const event = await response.json();
    currentEvent = event;  // 전역 변수에 저장
    originalData = { ...event };
    console.log(`이벤트 정보 로드 성공: ${event.title}`);

    


    // 기본 정보 표시
    const titleElem = document.getElementById('event-title');
    const placeElem = document.getElementById('event-place');
    const dateElem = document.getElementById('event-date');
    const participantsElem = document.getElementById('event-participants');
    const startTimeElem = document.getElementById('event-start-time');
    const endTimeElem = document.getElementById('event-end-time');
    const feeElem = document.getElementById('event-fee');
    const contentsElem = document.getElementById('event-contents');
    const detailsElem = document.getElementById('event-details');
    const mainEventImage = document.getElementById('main-event-image');
    const modifyButton = document.getElementById('modify-button');
    const applicationSection = document.getElementById('application-section');
    const kakaoShareButton = document.getElementById('kakao-share-button');
    const refundPolicyDisplay = document.getElementById('refund-policy-display');
    if (refundPolicyDisplay) {
      let refundPolicyHTML = '';
      
      switch(currentEvent.refundPolicy) {
        case 'standard':
          refundPolicyHTML = '<span class="refund-standard"> 참가자가 확정된 이후에는 환불이 불가능합니다</span>';
          break;
        case 'custom':
          refundPolicyHTML = `<span class="refund-custom"> ${currentEvent.refundCustomDescription}</span>`;
          break;
        case 'none':
          refundPolicyHTML = '<span class="refund-none"> 별도의 환불 규정이 없습니다</span>';
          break;
        default:
          refundPolicyHTML = '<span class="refund-standard"> 참가자가 확정된 이후에는 환불이 불가능합니다</span>';
      }
      
      refundPolicyDisplay.innerHTML = refundPolicyHTML;
    }



    if (titleElem) titleElem.textContent = currentEvent.title;
    if (placeElem) {
      placeElem.textContent = currentEvent.place;
      // 장소 옆 복사 / 네이버지도 버튼 (중복 주입 방지)
      if (currentEvent.place && placeElem.parentElement && !placeElem.parentElement.querySelector('.place-action')) {
        placeElem.insertAdjacentHTML('afterend', placeActions(currentEvent.place));
      }
    }
    if (dateElem) dateElem.textContent = new Date(currentEvent.date)
      .toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    if (participantsElem) participantsElem.textContent = currentEvent.participants + '명';
    if (startTimeElem) startTimeElem.textContent = currentEvent.startTime;
    if (endTimeElem) endTimeElem.textContent = currentEvent.endTime;
    if (feeElem) {
      // 참가비: feeType이 range면 '최소 ~ 최대' 형식
      const minStr = (currentEvent.participation_fee || 0).toLocaleString();
      if (currentEvent.feeType === 'range' && currentEvent.participation_fee_max) {
        feeElem.textContent = `${minStr} ~ ${currentEvent.participation_fee_max.toLocaleString()}원`;
      } else {
        feeElem.textContent = minStr + '원';
      }
    }
    if (contentsElem) contentsElem.innerHTML = currentEvent.contents.replace(/\n/g, "<br>");

    // ===== 새 필드 표시 =====
    // 신청 기간
    const appPeriodRow = document.getElementById('event-application-period-row');
    const appPeriodElem = document.getElementById('event-application-period');
    if (appPeriodRow && appPeriodElem) {
      if (currentEvent.applicationStartAt || currentEvent.applicationDeadlineAt) {
        const fmt = (d) => d ? new Date(d).toLocaleString('ko-KR', {
          month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : '미정';
        appPeriodElem.textContent = `${fmt(currentEvent.applicationStartAt)} ~ ${fmt(currentEvent.applicationDeadlineAt)}`;
        appPeriodRow.style.display = '';
      }
    }
    // 참가자 확정 마감
    const conRow = document.getElementById('event-confirmation-deadline-row');
    const conElem = document.getElementById('event-confirmation-deadline');
    if (conRow && conElem && currentEvent.confirmationDeadlineAt) {
      conElem.textContent = new Date(currentEvent.confirmationDeadlineAt).toLocaleString('ko-KR', {
        month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      conRow.style.display = '';
    }
    // 태그 (#형식)
    const tagsRow = document.getElementById('event-tags-row');
    const tagsElem = document.getElementById('event-tags');
    if (tagsRow && tagsElem && Array.isArray(currentEvent.tags) && currentEvent.tags.length > 0) {
      tagsElem.innerHTML = currentEvent.tags.map(t => {
        const safe = String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<span style="display:inline-block;padding:2px 8px;margin-right:4px;background:#f1f5f9;border-radius:999px;font-size:0.85em;color:#475569;">#${safe}</span>`;
      }).join(' ');
      tagsRow.style.display = '';
    }
    // 참가 인원 표시: maxApplicants가 다르면 '최대 N명 신청' 부기
    if (participantsElem && currentEvent.maxApplicants && currentEvent.maxApplicants !== currentEvent.participants) {
      participantsElem.textContent = `${currentEvent.participants}명 (최대 ${currentEvent.maxApplicants}명 신청)`;
    }

    // 참가자 규칙 상태 표시
    if (detailsElem && kakaoShareButton) {
      const rulesStatus = document.createElement('p');
      rulesStatus.className = 'rules-status';
      rulesStatus.innerHTML = currentEvent.hasParticipantRules ?
        ' <strong>참가자 규칙 적용</strong> 활동부원은 참가가 확정된 이후에 취소 시 경고 1회가 부과됩니다.' :
        '참가자 규칙이 적용되지 않는 일반 이벤트입니다.';
      // kakaoShareButton이 detailsElem의 자식인지 확인
      if (kakaoShareButton.parentNode === detailsElem) {
        detailsElem.insertBefore(rulesStatus, kakaoShareButton);
      } else {
        detailsElem.appendChild(rulesStatus);
      }
    }
    
    
    // 이미지 표시 (메인 이미지만)
    if (mainEventImage) {
      let mainImageUrl = '/images/Basic_Event_Image.png';
      if (currentEvent.images && currentEvent.images.length > 0) {
        // 절대경로/상대경로 모두 지원, 항상 window.location.origin 붙이기
        if (/^https?:\/\//.test(currentEvent.images[0])) {
          mainImageUrl = currentEvent.images[0];
        } else {
          mainImageUrl = window.location.origin + (currentEvent.images[0].startsWith('/') ? currentEvent.images[0] : '/' + currentEvent.images[0]);
        }
      } else {
        mainImageUrl = window.location.origin + '/images/Basic_Event_Image.png';
      }
      mainEventImage.onerror = function() {
        mainEventImage.src = window.location.origin + '/images/Basic_Event_Image.png';
      };
      mainEventImage.src = mainImageUrl;
    }

    // 생성자인 경우 수정 버튼 표시
    if (modifyButton) {
      if (currentEvent.creator === user.id && (user.role === 'officer' || user.role === 'admin')) {
        modifyButton.style.display = 'block';
      } else {
        modifyButton.style.display = 'none';
      }
    }

    // 신청 상태 확인 및 버튼 업데이트
    const hasApplied = currentEvent.appliedParticipants.some(p => p.userId === user.id);
    const isActive = user.active;
    const approvedCount = currentEvent.appliedParticipants.filter(p => p.status === 'approved').length;
    const isFull = approvedCount >= currentEvent.participants;
    const myEntry = currentEvent.appliedParticipants.find(p => p.userId === user.id);
    const myStatus = myEntry ? myEntry.status : null;
    // 활성 신청 = 승인대기/참가확정 (취소·거절은 비활성 → 취소 시 다시 신청 가능)
    const isActiveApplication = myStatus === 'pending' || myStatus === 'approved';

    console.log(`신청 상태: status=${myStatus}, 활성신청=${isActiveApplication}, 활성회원=${isActive}, 승인인원=${approvedCount}/${currentEvent.participants}, 마감여부=${isFull}`);

    if (applicationSection) {
      if (currentEvent.isSelective) {
        // 선별적 이벤트
        if (isActiveApplication) {
          const headLine = myStatus === 'approved' ? '참가가 확정되었습니다' : '지원이 완료되었습니다 (승인 대기중)';
          applicationSection.innerHTML = `
            <p class="status-text">${headLine}</p>
            <div class="application-form" style="pointer-events: none; opacity: 0.7;">
              <h3>지원서 양식</h3>
              <form id="application-form">
                ${currentEvent.additionalQuestions.map((question, index) => `
                  <div class="question-section">
                    <p class="question-text">Q${index + 1}. ${question.questionText}</p>
                    <textarea class="answer-textarea" disabled></textarea>
                  </div>
                `).join('')}
              </form>
            </div>
            <button type="button" class="submit-button" disabled>${myStatus === 'approved' ? '참가확정' : '지원완료'}</button>
          `;
        } else if (myStatus === 'rejected') {
          applicationSection.innerHTML = `
            <p class="status-text">아쉽지만 이번 지원은 받아들여지지 않았습니다.</p>
            <button class="submit-button" disabled>지원 마감</button>
          `;
        } else if (!isActive) {
          applicationSection.innerHTML = `
            <p class="status-text">로그인 후 다시 시도해주세요. 활동부원이 아니므로 지원이 불가능합니다</p>
            <button class="submit-button" disabled>지원불가</button>
          `;
        } else {
          // 마감 여부와 관계없이 대기자 지원하기 버튼 노출
          const applyBtnText = isFull ? '대기자 지원하기' : '지원하기';
          applicationSection.innerHTML = `
            <div class="application-form">
              <h3>지원서 작성</h3>
              <form id="application-form" onsubmit="submitApplication(event)">
                ${currentEvent.additionalQuestions.map((question, index) => `
                  <div class="question-section">
                    <p class="question-text">Q${index + 1}. ${question.questionText}</p>
                    <textarea class="answer-textarea" name="answer_${index}" required></textarea>
                  </div>
                `).join('')}
              </form>
            </div>
            <button type="submit" form="application-form" class="submit-button">${applyBtnText}</button>
          `;
        }
      } else {
        // 일반 이벤트
        if (isActiveApplication) {
          const headLine = myStatus === 'approved' ? '참가가 확정되었습니다' : '신청이 완료되었습니다 (승인 대기중)';
          applicationSection.innerHTML = `
            <p class="status-text">${headLine}</p>
            <button class="submit-button" disabled>${myStatus === 'approved' ? '참가확정' : '신청완료'}</button>
          `;
        } else if (myStatus === 'rejected') {
          applicationSection.innerHTML = `
            <p class="status-text">아쉽지만 신청이 거절되었습니다.</p>
            <button class="submit-button" disabled>신청 거절됨</button>
          `;
        } else if (!isActive) {
          applicationSection.innerHTML = `
            <p class="status-text">로그인 후 다시 시도해주세요. 활동부원이 아니므로 지원이 불가능합니다</p>
            <button class="submit-button" disabled>신청불가</button>
          `;
        } else if (isFull) {
          applicationSection.innerHTML = `
            <p class="status-text">모집이 마감되었습니다</p>
            <button class="submit-button" disabled>마감</button>
          `;
        } else {
          applicationSection.innerHTML = `
            <button onclick="applyForEvent('${currentEvent._id}')" class="submit-button">신청하기</button>
          `;
        }
      }
    }

    // 카카오 공유 버튼 초기화
    await initializeKakaoShare();

  } catch (error) {
    console.error('이벤트 정보 로드 중 에러:', error);
    alert('이벤트 정보를 불러오는데 실패했습니다.');
  }
}

// 카카오 초기화 함수
async function initializeKakao() {
  try {
    console.log('카카오 API 키 요청');
    const response = await fetch('/events/kakao-key');
    const data = await response.json();
    console.log('카카오 API 초기화 시작');
    Kakao.init(data.kakaoKey);
    console.log('카카오 API 초기화 완료');
  } catch (error) {
    console.error('카카오 키 초기화 실패:', error);
  }
}

// 카카오톡 공유 함수
async function initializeKakaoShare() {
  if (!currentEvent) {
    console.error('이벤트 데이터가 없습니다.');
    return;
  }

  await initializeKakao();

  const kakaoButton = document.getElementById('kakao-share-button');
  if (!kakaoButton) {
    console.log('카카오 공유 버튼을 찾을 수 없음');
    return;
  }

  // 이벤트 이미지 URL 설정 (항상 절대 경로)
  const eventImageUrl = currentEvent.images && currentEvent.images.length > 0
    ? window.location.origin + (currentEvent.images[0].startsWith('/') ? currentEvent.images[0] : '/' + currentEvent.images[0])
    : window.location.origin + '/images/Basic_Event_Image.png';

  // D-Day 계산 추가
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const eventDate = new Date(currentEvent.date);
  eventDate.setHours(0, 0, 0, 0);
  
  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let dDayText;
  if (diffDays > 0) {
    dDayText = `D-${diffDays}`;
  } else if (diffDays === 0) {
    dDayText = 'D-Day';
  } else {
    dDayText = '종료';
  }


  console.log('카카오 공유 버튼 설정');
  Kakao.Share.createDefaultButton({
    container: '#kakao-share-button',
    objectType: 'feed',
    content: {
      title: `[${currentEvent.team}] ${currentEvent.title}`,
      description: currentEvent.contents,
      imageUrl: eventImageUrl,
      link: {
        mobileWebUrl: window.location.href,
        webUrl: window.location.href,
      },
    },
    itemContent: {
      profileImageUrl: eventImageUrl,
      titleImageText: currentEvent.title,
      titleImageCategory: currentEvent.team,
      items: [
        {
          item: '일시',
          itemOp: `${new Date(currentEvent.date).toLocaleDateString()}`,
        },
        {
          item: '시간',
          itemOp: `${currentEvent.startTime}~${currentEvent.endTime}`,
        },
        {
          item: '장소',
          itemOp: currentEvent.place,
        },
        {
          item: '인원',
          itemOp: `${currentEvent.participants}명`,
        },
        {
          item: '참가비',
          itemOp: `${currentEvent.participation_fee.toLocaleString()}원`,
        },
      ],
      sum: '행사일',
      sumOp: dDayText, // 계산된 D-Day 텍스트 적용
    },
    buttons: [
      {
        title: '이벤트 신청하기',
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href,
        },
      }
    ],
  });
  console.log('카카오 공유 버튼 설정 완료');
}

// 지원서 제출 함수
async function submitApplication(e) {
  e.preventDefault();
  const eventId = new URLSearchParams(window.location.search).get('id');
  
  // 인증 상태 확인
  const isAuthenticated = await AuthModule.checkAuthentication();
  if (!isAuthenticated) return;
  
  console.log(`이벤트 ${eventId} 지원서 제출 시도`);
  const answers = Array.from(document.querySelectorAll('.answer-textarea')).map(textarea => ({
    answerText: textarea.value
  }));

  try {
    const response = await fetch(`/events/${eventId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ answers })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '신청 실패');
    }

    console.log('지원서 제출 성공');
    alert('지원서가 성공적으로 제출되었습니다.');
    updateApplicationStatus();
  } catch (error) {
    console.error('지원서 제출 에러:', error);
    alert(error.message);
  }
}

// 일반 이벤트 신청 함수
async function applyForEvent(eventId) {
  // 인증 상태 확인
  const isAuthenticated = await AuthModule.checkAuthentication();
  if (!isAuthenticated) return;

  // 약관 동의 모달
  const agreed = typeof window.confirmEventApplication === 'function'
    ? await window.confirmEventApplication()
    : confirm('참가 확정 후에는 참가비 환불이 불가능하며, 취소 시 경고가 부여될 수 있습니다. 동의하시겠습니까?');
  if (!agreed) return;

  console.log(`이벤트 ${eventId} 신청 시도`);
  try {
    const response = await fetch(`/events/${eventId}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '신청 실패');
    }

    console.log('이벤트 신청 성공');
    alert('이벤트 신청이 성공적으로 완료되었습니다.');
    updateApplicationStatus();
  } catch (error) {
    console.error('이벤트 신청 에러:', error);
    alert(error.message);
  }
}

// 신청 상태 업데이트 함수
function updateApplicationStatus() {
  const applicationSection = document.getElementById('application-section');
  if (applicationSection) {
    applicationSection.innerHTML = `
      <p>신청이 완료되었습니다.</p>
      <button class="submit-button" disabled>신청완료</button>
    `;
  }
}

// ===== 수정 모드 (리디자인) =====

const EDIT_TAG_CATEGORIES = {
  '분위기': ['신입추천', '매니아추천', '부담없음', '룰복잡'],
  '장르':   ['여행', '연애', '레이스', '심리추리', '서바이벌', '음악', '스포츠', '요리', '파티'],
  '방식':   ['팀전', '개인전', '랜덤팀'],
  '장소':   ['실내', '야외']
};

// ISO → datetime-local 입력값 (YYYY-MM-DDTHH:MM)
function toDatetimeLocal(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

function _escA(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function _escT(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 장소 복사 / 네이버지도 검색 버튼 (웹·모바일 겸용 칩)
function ensurePlaceActionStyles() {
  if (document.getElementById('place-action-styles')) return;
  const style = document.createElement('style');
  style.id = 'place-action-styles';
  style.textContent =
    '.place-actions{display:inline-flex;align-items:center;gap:4px;margin-left:6px;vertical-align:middle;}' +
    '.place-action{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;height:22px;padding:0 7px;margin:0;border-radius:6px;font-size:.66rem;font-weight:700;line-height:1;cursor:pointer;text-decoration:none;border:1px solid transparent;white-space:nowrap;font-family:inherit;vertical-align:middle;-webkit-tap-highlight-color:transparent;transition:transform .1s ease,background .12s ease;}' +
    '.place-action:active{transform:scale(.92);}' +
    '.place-copy{background:#E8F2FF;color:#0A84FE;border-color:#CFE3FF;}' +
    '.place-copy:hover{background:#D8EAFF;}' +
    '.place-map{background:#E7F8EE;color:#06A34A;border-color:#BBEBCF;}' +
    '.place-map:hover{background:#D6F2E2;}' +
    '.place-action.copied{background:#0A84FE;color:#fff;border-color:transparent;}' +
    '@media (max-width:480px){.place-action{height:24px;padding:0 8px;font-size:.68rem;}}';
  document.head.appendChild(style);
}

function placeActions(place) {
  if (!place) return '';
  ensurePlaceActionStyles();
  const esc = _escA(place);
  const q = encodeURIComponent(place);
  return `<span class="place-actions">` +
    `<button type="button" class="place-action place-copy" data-place="${esc}" onclick="copyPlace(event, this)" title="장소 복사" aria-label="장소 복사">복사</button>` +
    `<a class="place-action place-map" href="https://map.naver.com/p/search/${q}" target="_blank" rel="noopener" title="네이버지도에서 검색" aria-label="네이버지도에서 검색" onclick="event.stopPropagation()">지도</a>` +
    `</span>`;
}

function copyPlace(ev, btn) {
  if (ev) { ev.stopPropagation(); ev.preventDefault(); }
  const text = btn && btn.getAttribute('data-place');
  if (!text) return;
  const flash = () => {
    btn.textContent = '복사됨';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '복사'; btn.classList.remove('copied'); }, 1200);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(flash).catch(() => legacyCopyText(text, flash));
  } else {
    legacyCopyText(text, flash);
  }
}

function legacyCopyText(text, cb) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    cb && cb();
  } catch (e) { console.warn('장소 복사 실패', e); }
}

// (스타일은 /css/additional-info.css 로 분리됨)

// 새 카드형 edit 폼 빌더
function buildEditForm() {
  const eventDetails = document.getElementById('event-details');
  if (!eventDetails) return;
  document.getElementById('edit-form-section')?.remove(); // 재진입 방지

  const e = currentEvent;
  const tags = Array.isArray(e.tags) ? e.tags : [];
  const refund = e.refundPolicy || 'standard';

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  };

  const tagPickerHtml = Object.entries(EDIT_TAG_CATEGORIES).map(([cat, list]) => `
    <div class="edit-tag-group" data-cat="${cat}">
      <span class="edit-tag-cat">${cat}</span>
      <div class="edit-tag-chips">
        ${list.map(t => `<button type="button" class="edit-tag-chip${tags.includes(t) ? ' is-active' : ''}" data-tag="${t}">${t}</button>`).join('')}
      </div>
    </div>
  `).join('');

  const section = document.createElement('div');
  section.id = 'edit-form-section';
  section.className = 'edit-form-section';
  section.innerHTML = `
    <div class="edit-form-header">
      <h2>이벤트 수정</h2>
      <p>변경할 내용을 수정한 뒤 저장을 눌러주세요</p>
    </div>

    <!-- 1. 기본 정보 -->
    <div class="edit-card">
      <h3 class="edit-section-title">📋 기본 정보</h3>
      <div class="field">
        <label class="field-label" for="edit-event-title">이벤트 제목</label>
        <input type="text" id="edit-event-title" class="input" value="${_escA(e.title)}">
      </div>
      <div class="field">
        <label class="field-label" for="edit-event-place">장소</label>
        <input type="text" id="edit-event-place" class="input" value="${_escA(e.place)}">
      </div>
      <div class="edit-row">
        <div class="field">
          <label class="field-label" for="edit-event-participants">정원</label>
          <input type="number" id="edit-event-participants" class="input" min="1" value="${e.participants || ''}">
        </div>
        <div class="field">
          <label class="field-label" for="edit-max-applicants">최대 신청자수 <span class="opt">(선택)</span></label>
          <input type="number" id="edit-max-applicants" class="input" min="1" value="${e.maxApplicants ?? ''}" placeholder="비워두면 무제한">
        </div>
      </div>
      <div class="field">
        <label class="field-label">담당 팀</label>
        <div class="edit-team-display">현재 팀: <strong>${_escT(e.team || '-')}</strong> (변경 불가)</div>
      </div>
    </div>

    <!-- 2. 일정 -->
    <div class="edit-card">
      <h3 class="edit-section-title">📅 일정</h3>
      <div class="edit-row">
        <div class="field">
          <label class="field-label" for="edit-event-date">행사 날짜</label>
          <input type="date" id="edit-event-date" class="input" value="${fmtDate(e.date)}">
        </div>
        <div class="field">
          <label class="field-label" for="edit-event-start-time">시작</label>
          <input type="time" id="edit-event-start-time" class="input" value="${_escA(e.startTime || '')}">
        </div>
        <div class="field">
          <label class="field-label" for="edit-event-end-time">종료</label>
          <input type="time" id="edit-event-end-time" class="input" value="${_escA(e.endTime || '')}">
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="edit-application-start">신청 시작 <span class="opt">(선택)</span></label>
        <input type="datetime-local" id="edit-application-start" class="input" value="${toDatetimeLocal(e.applicationStartAt)}">
      </div>
      <div class="field">
        <label class="field-label" for="edit-application-deadline">신청 마감 <span class="opt">(선택)</span></label>
        <input type="datetime-local" id="edit-application-deadline" class="input" value="${toDatetimeLocal(e.applicationDeadlineAt)}">
      </div>
      <div class="field">
        <label class="field-label" for="edit-confirmation-deadline">참가자 확정 마감 (필수)</label>
        <input type="datetime-local" id="edit-confirmation-deadline" class="input" value="${toDatetimeLocal(e.confirmationDeadlineAt)}">
        <span class="field-hint">시간 도래 시 시스템이 자동 확정 (성비 1:1, 어린 사람 우선)</span>
      </div>
    </div>

    <!-- 3. 참가비 -->
    <div class="edit-card">
      <h3 class="edit-section-title">💰 참가비</h3>
      <div class="edit-fee-toggle">
        <label class="${e.feeType !== 'range' ? 'is-active' : ''}" data-mode="fixed">
          <input type="radio" name="edit-fee-type" value="fixed" ${e.feeType !== 'range' ? 'checked' : ''}> 정액
        </label>
        <label class="${e.feeType === 'range' ? 'is-active' : ''}" data-mode="range">
          <input type="radio" name="edit-fee-type" value="range" ${e.feeType === 'range' ? 'checked' : ''}> 범위
        </label>
      </div>
      <div class="edit-row">
        <div class="field">
          <label class="field-label" for="edit-event-fee"><span id="edit-fee-label">${e.feeType === 'range' ? '최소' : '금액'}</span></label>
          <div class="input-with-icon">
            <input type="number" id="edit-event-fee" class="input" min="0" value="${e.participation_fee || 0}">
            <span class="input-suffix">원</span>
          </div>
        </div>
        <div class="field" id="edit-fee-max-field" style="display:${e.feeType === 'range' ? '' : 'none'};">
          <label class="field-label" for="edit-participation-fee-max">최대</label>
          <div class="input-with-icon">
            <input type="number" id="edit-participation-fee-max" class="input" min="0" value="${e.participation_fee_max ?? ''}">
            <span class="input-suffix">원</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. 내용 -->
    <div class="edit-card">
      <h3 class="edit-section-title">📝 이벤트 내용</h3>
      <textarea id="edit-event-contents" class="textarea" rows="6">${_escT(e.contents)}</textarea>
    </div>

    <!-- 5. 태그 -->
    <div class="edit-card">
      <h3 class="edit-section-title">🏷️ 태그 <small>카테고리별 하나씩 (다시 클릭하면 해제)</small></h3>
      <div class="edit-tag-picker">
        ${tagPickerHtml}
      </div>
    </div>

    <!-- 6. 환불 정책 -->
    <div class="edit-card">
      <h3 class="edit-section-title"> 환불 정책</h3>
      <div class="edit-radio-card">
        <label class="edit-radio">
          <input type="radio" name="edit-refund-policy" value="standard" ${refund === 'standard' ? 'checked' : ''}>
          <div>
            <strong>일반적인 환불 규정</strong>
            <small>참가자가 확정된 이후에는 환불이 불가능합니다</small>
          </div>
        </label>
        <label class="edit-radio">
          <input type="radio" name="edit-refund-policy" value="custom" ${refund === 'custom' ? 'checked' : ''}>
          <div>
            <strong>특수한 상황 직접 설명</strong>
            <small>특별한 환불 조건이 있는 경우</small>
          </div>
        </label>
        <label class="edit-radio">
          <input type="radio" name="edit-refund-policy" value="none" ${refund === 'none' ? 'checked' : ''}>
          <div>
            <strong>환불 규정 없음</strong>
            <small>환불 정책을 별도로 명시하지 않음</small>
          </div>
        </label>
      </div>
      <div id="edit-custom-refund-section" class="field" style="margin-top:12px;display:${refund === 'custom' ? 'block' : 'none'};">
        <label class="field-label" for="edit-custom-refund-description">환불 정책 상세 설명</label>
        <textarea id="edit-custom-refund-description" class="textarea" rows="3" placeholder="특수한 환불 정책에 대해 상세히 설명해주세요...">${_escT(e.refundCustomDescription || '')}</textarea>
      </div>
    </div>

    <!-- 7. 옵션 -->
    <div class="edit-card">
      <h3 class="edit-section-title">⚙️ 옵션</h3>
      <label class="edit-check">
        <input type="checkbox" id="edit-hasParticipantRules" ${e.hasParticipantRules ? 'checked' : ''}>
        <div>
          <strong>참가자 규칙 적용</strong>
          <small>활동부원은 참가가 확정된 이후에 취소 시 경고 1회</small>
        </div>
      </label>
    </div>
  `;

  eventDetails.appendChild(section);

  // ===== 인터랙션 바인딩 =====

  // 환불 정책 라디오 → custom 섹션 토글
  document.querySelectorAll('input[name="edit-refund-policy"]').forEach(r => {
    r.addEventListener('change', () => {
      const sec = document.getElementById('edit-custom-refund-section');
      if (sec) sec.style.display = (r.checked && r.value === 'custom') ? 'block' : 'none';
    });
  });

  // Fee 모드 토글
  document.querySelectorAll('.edit-fee-toggle label').forEach(lbl => {
    lbl.addEventListener('click', () => {
      const mode = lbl.dataset.mode;
      document.querySelectorAll('.edit-fee-toggle label').forEach(l => l.classList.remove('is-active'));
      lbl.classList.add('is-active');
      const radio = lbl.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
      const feeMaxField = document.getElementById('edit-fee-max-field');
      const feeLabel = document.getElementById('edit-fee-label');
      if (feeMaxField) feeMaxField.style.display = mode === 'range' ? '' : 'none';
      if (feeLabel) feeLabel.textContent = mode === 'range' ? '최소' : '금액';
    });
  });

  // 태그 칩 토글 (카테고리 내 단일 선택, 재클릭으로 해제)
  document.querySelectorAll('#edit-form-section .edit-tag-group').forEach(group => {
    const chips = group.querySelectorAll('.edit-tag-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const wasActive = chip.classList.contains('is-active');
        chips.forEach(c => c.classList.remove('is-active'));
        if (!wasActive) chip.classList.add('is-active');
      });
    });
  });
}

// 이미지 wrapper 채우기 (기존 이미지)
function populateImageWrappersInEdit() {
  const imageSection = document.querySelector('.image-section .image-container');
  if (!imageSection || !currentEvent || !currentEvent.images || currentEvent.images.length === 0) return;

  const existingUploadLabel = document.getElementById('image-upload-label');

  currentEvent.images.forEach((imagePath, index) => {
    const dup = Array.from(imageSection.querySelectorAll('.image-wrapper'))
      .find(w => w.dataset.imagePath === imagePath);
    if (dup) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'image-wrapper';
    wrapper.dataset.imagePath = imagePath;

    const img = document.createElement('img');
    if (/^https?:\/\//.test(imagePath)) {
      img.src = imagePath;
    } else {
      img.src = window.location.origin + (imagePath.startsWith('/') ? imagePath : '/' + imagePath);
    }
    img.alt = `이벤트 이미지 ${index + 1}`;
    img.className = 'event-image-preview';
    img.onerror = function () {
      this.src = window.location.origin + '/images/Basic_Event_Image.png';
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'image-delete-btn';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = function () { handleImageDelete(this); };
    deleteBtn.style.display = 'block';

    wrapper.appendChild(img);
    wrapper.appendChild(deleteBtn);

    if (existingUploadLabel) {
      imageSection.insertBefore(wrapper, existingUploadLabel);
    } else {
      imageSection.appendChild(wrapper);
    }
  });
}

function enableEdit() {
  console.log('이벤트 수정 모드 활성화 (리디자인)');

  // body에 edit-mode 클래스 추가 → legacy display 숨김 (additional-info.css가 처리)
  document.body.classList.add('edit-mode-active');

  // 모던 카드형 edit 폼 빌드
  buildEditForm();

  // 이미지 wrapper 채우기 + edit-controls 표시
  populateImageWrappersInEdit();
  document.getElementById('modify-button').style.display = 'none';
  document.getElementById('edit-controls').style.display = 'block';
  updateImageUploadStatus();

  // edit form section 안쪽 위치로 edit-controls 옮기기 (이미지 + 저장/취소 버튼)
  const editForm = document.getElementById('edit-form-section');
  const editControls = document.getElementById('edit-controls');
  if (editForm && editControls && editControls.parentElement !== editForm) {
    editForm.appendChild(editControls);
  }

  console.log('이벤트 수정 모드 활성화 완료');
}

// 이미지 업로드 상태 업데이트 함수
function updateImageUploadStatus() {
  const currentImagesCount = document.querySelectorAll('.image-wrapper').length;
  const uploadButton = document.getElementById('image-upload-label');
  const imageInput = document.getElementById('edit-image');

  console.log(`현재 이미지 ${currentImagesCount}개`);
  if (currentImagesCount >= 3) {
    uploadButton.classList.add('disabled');
    imageInput.disabled = true;
    uploadButton.style.display = 'none';  // 3개 이상이면 + 버튼 숨김
    console.log('이미지 최대 개수(3개) 도달, 업로드 버튼 비활성화');
  } else {
    uploadButton.classList.remove('disabled');
    imageInput.disabled = false;
    uploadButton.style.display = 'flex';  // 3개 미만이면 + 버튼 표시
    console.log(`이미지 추가 가능 (${currentImagesCount}/3)`);
  }
}

// 이미지 삭제 처리
function handleImageDelete(button) {
  const wrapper = button.closest('.image-wrapper');
  const imagePath = wrapper.dataset.imagePath;
  
  if (imagePath) {
    console.log(`이미지 삭제: ${imagePath}`);
    deletedImages.add(imagePath);
  }
  wrapper.remove();
  updateImageUploadStatus();
}

// 이미지 미리보기 처리 (메인 이미지만)
async function handleImagePreview(e) {
  const files = e.target.files;
  const mainEventImage = document.getElementById('main-event-image');
  if (mainEventImage && files.length > 0) {
    const reader = new FileReader();
    reader.onload = function(e) {
      mainEventImage.src = e.target.result;
    };
    reader.readAsDataURL(files[0]);
  }
}

async function submitEdit() {
  const isAuthenticated = await AuthModule.checkAuthentication();
  if (!isAuthenticated) return;

  const eventId = new URLSearchParams(window.location.search).get('id');
  console.log(`이벤트 ${eventId} 수정 제출`);

  try {
    let newImageUrls = [];
    const imageInput = document.getElementById('edit-image');

    // 새 이미지 업로드 처리
    if (imageInput && imageInput.files.length > 0) {
      console.log(`새 이미지 ${imageInput.files.length}개 업로드 시도`);
      const formData = new FormData();
      formData.append('eventId', eventId);
      Array.from(imageInput.files).forEach(file => {
        formData.append('images', file);
      });

      const imageResponse = await fetch('/events/upload-images', {
        method: 'POST',
        body: formData
      });

      let imageResult;
      try {
        imageResult = await parseResponse(imageResponse);
      } catch (parseError) {
        throw parseError;
      }

      if (!imageResponse.ok) {
        throw new Error(imageResult.message || '이미지 업로드 중 오류가 발생했습니다.');
      }

      newImageUrls = imageResult.images;
      console.log(`새 이미지 업로드 성공: ${newImageUrls.length}개`);
    }

    // 현재 표시된 이미지들 수집 (삭제되지 않은 기존 이미지들)
    let currentImages = Array.from(document.querySelectorAll('.image-wrapper'))
      .filter(wrapper => !deletedImages.has(wrapper.dataset.imagePath))
      .map(wrapper => wrapper.dataset.imagePath)
      .filter(path => path);

    if (!Array.isArray(currentImages)) currentImages = [];
    if (!Array.isArray(newImageUrls)) newImageUrls = [];
    const deletedImagesArr = Array.from(deletedImages || []);

    // 숫자 필드 파싱
    const participantsValue = parseInt(document.getElementById('edit-event-participants').value, 10);
    const participationFeeValue = parseInt(document.getElementById('edit-event-fee').value, 10);

    // 필수값 체크
    const editTitle = document.getElementById('edit-event-title')?.value;
    const editPlace = document.getElementById('edit-event-place')?.value;
    const editDate = document.getElementById('edit-event-date')?.value;
    const editStartTime = document.getElementById('edit-event-start-time')?.value;
    const editEndTime = document.getElementById('edit-event-end-time')?.value;
    const editContents = document.getElementById('edit-event-contents')?.value;
    const editConDeadline = document.getElementById('edit-confirmation-deadline')?.value;

    if (!editTitle || !editTitle.trim()) {
      alert('이벤트 제목을 입력해주세요.');
      document.getElementById('edit-event-title')?.focus();
      return;
    }
    if (!editPlace || !editPlace.trim()) {
      alert('장소를 입력해주세요.');
      document.getElementById('edit-event-place')?.focus();
      return;
    }
    if (isNaN(participantsValue)) {
      alert('정원을 입력해주세요.');
      document.getElementById('edit-event-participants')?.focus();
      return;
    }
    if (!editDate) {
      alert('행사 날짜를 입력해주세요.');
      document.getElementById('edit-event-date')?.focus();
      return;
    }
    if (!editStartTime) {
      alert('시작 시간을 입력해주세요.');
      document.getElementById('edit-event-start-time')?.focus();
      return;
    }
    if (!editEndTime) {
      alert('종료 시간을 입력해주세요.');
      document.getElementById('edit-event-end-time')?.focus();
      return;
    }
    if (!editConDeadline) {
      alert('참가자 확정 마감 시간을 입력해주세요.');
      document.getElementById('edit-confirmation-deadline')?.focus();
      return;
    }
    if (isNaN(participationFeeValue)) {
      alert('참가비를 입력해주세요.');
      document.getElementById('edit-event-fee')?.focus();
      return;
    }
    if (!editContents || !editContents.trim()) {
      alert('이벤트 내용을 입력해주세요.');
      document.getElementById('edit-event-contents')?.focus();
      return;
    }
    
    const selectedRefundPolicy = document.querySelector('input[name="edit-refund-policy"]:checked')?.value || 'standard';
    const customRefundDescription = document.getElementById('edit-custom-refund-description')?.value || '';

    if (selectedRefundPolicy === 'custom' && !customRefundDescription.trim()) {
      alert('특수한 상황에 대한 환불 정책 설명을 입력해주세요.');
      return;
    }

    // ===== 새 필드 수집 =====
    const editMaxApplicants = document.getElementById('edit-max-applicants')?.value;
    const editFeeType       = document.querySelector('input[name="edit-fee-type"]:checked')?.value || 'fixed';
    const editFeeMax        = document.getElementById('edit-participation-fee-max')?.value;
    const editAppStart      = document.getElementById('edit-application-start')?.value;
    const editAppDeadline   = document.getElementById('edit-application-deadline')?.value;
    const editTags = Array.from(
      document.querySelectorAll('#edit-form-section .edit-tag-chip.is-active')
    ).map(el => el.dataset.tag);

    // 새 필드 클라이언트 검증
    if (editMaxApplicants && parseInt(editMaxApplicants) < participantsValue) {
      alert('최대 신청자수는 정원보다 작을 수 없습니다.');
      return;
    }
    if (editFeeType === 'range') {
      if (!editFeeMax || parseInt(editFeeMax) <= participationFeeValue) {
        alert('참가비 범위는 최대값이 최소값보다 커야 합니다.');
        return;
      }
    }

    // ============ 서버 PUT /update-content 페이로드 ============
    const requestData = {
      eventId,
      // 이미지 관련
      currentImages,
      newImages: newImageUrls,
      deletedImages: deletedImagesArr,
      // 참가자 규칙 / 환불 정책
      hasParticipantRules: document.getElementById('edit-hasParticipantRules')?.checked || false,
      refundPolicy: selectedRefundPolicy,
      refundCustomDescription: selectedRefundPolicy === 'custom' ? customRefundDescription : undefined,
      // 이벤트 기본 정보
      title: document.getElementById('edit-event-title').value,
      place: document.getElementById('edit-event-place').value,
      date: document.getElementById('edit-event-date').value,
      participants: participantsValue,
      startTime: document.getElementById('edit-event-start-time').value,
      endTime: document.getElementById('edit-event-end-time').value,
      participation_fee: participationFeeValue,
      contents: document.getElementById('edit-event-contents').value,
      // 새 필드
      tags: editTags,
      maxApplicants:          editMaxApplicants ? parseInt(editMaxApplicants) : null,
      feeType:                editFeeType,
      participation_fee_max:  editFeeType === 'range' ? parseInt(editFeeMax) : null,
      applicationStartAt:     editAppStart     || null,
      applicationDeadlineAt:  editAppDeadline  || null,
      confirmationDeadlineAt: editConDeadline  || null,
    };

    console.log('이벤트 업데이트 요청', requestData);
    
    const response = await fetch(`/events/update-content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    let result;
    try {
      result = await parseResponse(response);
    } catch (parseError) {
      throw parseError;
    }

    if (!response.ok) {
      console.error('서버 에러 응답:', result);
      throw new Error(result.message || '수정 중 오류가 발생했습니다.');
    }

    console.log('이벤트 수정 성공:', result);
    alert('이벤트가 성공적으로 수정되었습니다.');
    location.reload();
  } catch (error) {
    console.error('이벤트 수정 에러:', error);
    alert(error.message || '수정 중 오류가 발생했습니다.');
  }
}

function cancelEdit() {
  console.log('이벤트 수정 취소');
  isImageDeleted = false;
  location.reload();
}

// 공유 모달 제어 함수
function openShareModal() {
  document.getElementById('shareModal').style.display = 'block';
  document.getElementById('modalBackdrop').style.display = 'block';
}

function closeShareModal() {
  document.getElementById('shareModal').style.display = 'none';
  document.getElementById('modalBackdrop').style.display = 'none';
}

// 링크 복사 함수
function copyLink() {
  const currentUrl = window.location.href;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(currentUrl)
      .then(() => {
        alert('링크가 클립보드에 복사되었습니다.');
        closeShareModal();
      })
      .catch(err => {
        console.error('링크 복사 실패:', err);
        fallbackCopyLink(currentUrl);
      });
  } else {
    fallbackCopyLink(currentUrl);
  }
}



document.addEventListener('DOMContentLoaded', () => {
  console.log('이벤트 상세 페이지 로드');
  const eventId = new URLSearchParams(window.location.search).get('id');
  if (eventId) {
    console.log(`이벤트 ID: ${eventId}`);
    loadEventContent(eventId);
  } else {
    console.error('이벤트 ID가 없음');
    alert('이벤트 ID가 없습니다.');
  }
});
