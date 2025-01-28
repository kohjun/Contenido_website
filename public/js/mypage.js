// 사용자 정보 표시

let userData; // 사용자 데이터를 전역 변수로 저장

// mypage.js를 수정
async function fetchUserInfo() {
  try {
    const response = await fetch('/user/info_database');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    userData = data; // 사용자 데이터를 전역 변수에 저장

    if (!data) {
      throw new Error('No data received');
    }

    // 프로필 이미지 업데이트
    const userImage = document.getElementById('user-image');
    if (userImage) {
      userImage.src = data.profileImage || '/images/basic_Image.png';
      userImage.onerror = () => {
        userImage.src = '/images/basic_Image.png';
      };
    }

    // 역할 표시 매핑
    const roleDisplay = {
      'officer': '운영진',
      'starter': '스타터',
      'admin': '관리자',
      'participant': '참가자',
      'guest': '게스트'
    };

    // 팀 표시 매핑
    const teamDisplay = {
      'operationTeam': '운영',
      'cooperationTeam': '대외협력',
      'HumanResourceTeam': '인사',
      'financeTeam': '재무',
      'marketingTeam': '홍보',
      'designTeam': '디자인',
      'videoTeam': '영상제작',
      'PlanningTeam': '기획',
      'regularTeam': '정기모임',
      'staffTeam': '스태프'
    };

    // 성별 표시 매핑
    const genderDisplay = {
      'male': '남성',
      'female': '여성',
      'other': '기타'
    };

    // 기본 정보 업데이트
    updateElement('user-name', `이름 : ${data.name || '-'}`);
    updateElement('user-nickname', `프로필 이름 : ${data.displayName || '-'}`);
    updateElement('user-email', `이메일 : ${data.email ? data.email.replace(/^(.{3,})(.{4})(@.*)$/, '$1****$3') : '-'}`);
    updateElement('user-role', `역할 : ${roleDisplay[data.role] || data.role || '-'}`);
    updateElement('user-team', `팀 이름 : ${teamDisplay[data.team] || data.team || '-'}`);

    // 개인 정보 업데이트
    updateElement('user-phonenumber', `전화번호 : ${data.phonenumber || '-'}`);
    updateElement('user-gender', `성별 : ${genderDisplay[data.gender] || '-'}`);
    if (data.birthDate) {
      const birthDate = new Date(data.birthDate).toISOString().slice(0, 10).replace(/-/g, '.');
      updateElement('user-birthdate', `생년월일 : ${birthDate}`);
    }

    // 활동 정보 업데이트
    updateElement('user-active', `활성상태 : ${data.active ? '✅활동' : '❌비활동'}`);
    updateElement('user-warningcount', `경고 횟수 : ${data.warningCount || 0}`);
    updateElement('user-totalcount', `총 참가 횟수 : ${data.participationCount?.totalCount || 0}`);
    updateElement('user-regularcount', `정기 참가 횟수 : ${data.participationCount?.regularCount || 0}`);

    // 각 섹션 표시
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('activity-info').style.display = 'block';

  } catch (error) {
    console.error('Error fetching user info:', error);
    alert('사용자 정보를 불러오는데 실패했습니다. 다시 로그인해주세요.');
  }
}

// 요소 업데이트 헬퍼 함수
function updateElement(id, text) {
  const element = document.getElementById(id);
  if (element) {
    element.innerText = text;
  }
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
  fetchUserInfo();

  // 개인 정보 보기 버튼 클릭 이벤트
  document.getElementById('toggle-personal-info').addEventListener('click', () => {
    document.getElementById('birthdate-input-container').style.display = 'block';
    document.getElementById('toggle-personal-info').style.display = 'none';
  });

  // 생년월일 확인 버튼 클릭 이벤트
  document.getElementById('confirm-birthdate').addEventListener('click', () => {
    const inputBirthdate = document.getElementById('birthdate-input').value;
    const userBirthdate = new Date(userData.birthDate).toISOString().slice(2, 10).replace(/-/g, '');

    if (inputBirthdate === userBirthdate) {
      document.getElementById('personal-info').style.display = 'block';
      document.getElementById('birthdate-input-container').style.display = 'none';
    } else {
      alert('생년월일이 일치하지 않습니다.');
    }
  });
});