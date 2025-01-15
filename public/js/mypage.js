// 사용자 정보 표시

async function fetchUserInfo() {
    try {
      const response = await fetch('/user/info');
      if (response.status === 401) {
        console.log("User is not logged in.");
        document.getElementById('user-info').style.display = 'none';
        return;
      }

      const data = await response.json();
      console.log("Fetched data:", data);

      if (data.nickname && data.email && data.role) {
        const userInfoDiv = document.getElementById('user-info');
        const userName = document.getElementById('user-name');
        const userNickname = document.getElementById('user-nickname');
        
        const userEmail = document.getElementById('user-email');
        const userRole = document.getElementById('user-role');
        
        const userImage = document.getElementById('user-image');
        const userActive = document.getElementById('user-active');
        userName.innerText = "이름 : " + data.name;
        userNickname.innerText = "프로필 이름 : " + data.nickname;
        userEmail.innerText = "이메일 : " + data.email.replace(/^(.{3,})(.{4})(@.*)$/, '$1****$3');
        
        const roleDisplay = {
            'officer': '운영진',
            'starter': '스타터',
            'admin': '관리자',
            'participant': '참가자',
            'guest': '게스트'
        };

        userRole.innerText = "역할 : " + (roleDisplay[data.role] || data.role);
        
        userActive.innerText = "활성상태 : " + (data.active ? '✅활동' : '❌비활동');

        userInfoDiv.style.display = 'block';

        userImage.src = data.profileImage || '/images/basic_Image.png';
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }


  document.addEventListener('DOMContentLoaded', fetchUserInfo);

  // 진행중인 이벤트 페이지로 이동
  function OnEvents() {
    window.location.href = '/events.html';
  }

  // 참가자 상태 확인 페이지로 이동
  function checkParticipationStatus() {
    window.location.href = '/participation-status.html';
  }