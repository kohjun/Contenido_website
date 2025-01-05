// public/js/partitions/nav-injector.js

const navStyles = `
.container {
    position: relative;
    min-height: 100vh;
    padding-bottom: 60px;
}

.sidebar {
    position: fixed;
    top: 0;
    left: -280px;
    width: 230px;
    height: 100%;
    background-color: white;
    box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
    transition: left 0.3s ease;
    z-index: 1001;
    padding-left: 30px;
    
    
}

.sidebar h3 {
    font-size: 20px; /* 글씨 크기 증가 */
    margin: 25px 0; /* 상하 마진 증가 */
    font-weight: 500; /* 글씨 두께 조정 */
    color: rgba(0, 0, 0, 1);
}

.sidebar ul {
    list-style: none;
    padding-left: 25px; /* 들여쓰기 증가 */
    margin: 20px 0; /* 상하 마진 추가 */
}

.sidebar li {
    margin: 15px 0; /* 항목 간 간격 증가 */
    font-size: 16px; /* 글씨 크기 증가 */
}

.sidebar a {
    text-decoration: none;
    color: #333;
    transition: color 0.2s;
}

.sidebar a:hover {
    color: #0A84FE;
}

/* 상단 네비게이션 스타일 */
.custom-top-nav {
    display: flex;
    align-items: center;
    padding: 15px;
    background-color: white;
    border-bottom: 1px solid #eee;
}

/* 토글 버튼 스타일 */
.toggle-btn {
  position: absolute;
  top: 1rem;
  left: 1rem;
  background: #fff;
  color: #0A84FE;
  padding: 0.5rem;
  font-size: 1.5rem;
  border:none;
  width: 50px;
  height: 40px;
  cursor: pointer;
  z-index: 1001; /* 다른 요소들 위에 오도록 설정 */
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.toggle-btn:hover {
  background-color: #0A84FE; /* 호버 시 색상 변경 */
  transform: scale(1.05); /* 살짝 커지는 효과 */
}

/* 토글 버튼 활성화 상태 스타일 */
.toggle-btn.active {
  background-color: #0A84FE; /* 활성화된 상태에서 색상 변경 */
  transform: scale(1.1); /* 활성화 상태에서 버튼 크기 확대 */
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .toggle-btn {
    font-size: 1.2rem; /* 모바일 화면에서는 글씨 크기 조정 */
    top: 0.5rem;
    left: 0.5rem;
  }
}
/* 하단 네비게이션 스타일 */
.custom-bottom-nav {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 60px;
    background-color: white;
    display: flex;
    justify-content: space-around;
    align-items: center;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
    z-index: 1000;
}

.custom-nav-button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 33.33%;
    height: 100%;
    border: none;
    background: none;
    padding: 8px 0;
    cursor: pointer;
    transition: background-color 0.2s;
}

.custom-nav-icon {
    font-size: 24px;
    margin-bottom: 4px;
}

.custom-nav-button span {
    font-size: 12px;
    color: #333;
}



.custom-nav-button.active span {
    color: #666;
}

@media (max-width: 768px) {
    .custom-nav-icon {
        font-size: 20px;
    }
    
    .custom-nav-button span {
        font-size: 11px;
    }
    
    .custom-bottom-nav {
        height: 55px;
    }
}
`;

// 사이드바 HTML
const sidebarHTML = `
<aside>
    <div id="sidebar" class="sidebar">
        <div>
            <a href="office.html" id="staffPageLink"><h3>운영진 페이지</h3></a>
            <a><h3>동아리 활동</h3></a>
            <ul>         
                <li><a href="mypage.html">마이페이지</a></li>
                <li><a href="">Q&A(예정)</a></li>
                <li><a href="">익명제보(예정)</a></li>
            </ul>
            <a href="" onclick="alert('추후 확장 예정입니다!')"><h3>동아리 모집(예정)</h3></a>
            <a href="" onclick="alert('추후 확장 예정입니다!')"><h3>회비내역(예정)</h3></a>
        </div>
    </div>
</aside>
`;

// 상단 네비게이션 HTML
const topNavHTML = `
<nav class="custom-top-nav">
    <button id="toggle-btn" class="toggle-btn" onclick="toggleSidebar()">☰</button><br>
</nav>
`;

// 하단 네비게이션 HTML
const bottomNavHTML = `
<nav class="custom-bottom-nav">
    <button class="custom-nav-button" onclick="handleNotifications()">
        <i class="custom-nav-icon">🔔</i>
        <span>알림</span>
    </button>
    <button class="custom-nav-button" onclick="goHome()">
        <i class="custom-nav-icon">🏠</i>
        <span>홈</span>
    </button>
    <button class="custom-nav-button" onclick="goToMyPage()">
        <i class="custom-nav-icon">👤</i>
        <span>마이</span>
    </button>
</nav>
`;

// 사이드바 토글 함수
function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
        if (sidebar.style.left === "0px") {
            sidebar.style.left = "-250px";
        } else {
            sidebar.style.left = "0px";
        }
    }
}

// 네비게이션 함수들
function handleNotifications() {
    alert('추후 확장예정입니다.')
}

function goHome() {
    window.location.href = '/';
}

function goToMyPage() {
    window.location.href = '/mypage.html';
}

// 스타일과 네비게이션 삽입
document.addEventListener('DOMContentLoaded', function() {
    // 스타일 삽입
    const styleSheet = document.createElement('style');
    styleSheet.textContent = navStyles;
    document.head.appendChild(styleSheet);

    // body에 사이드바 삽입
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

    // 네비게이션 바 삽입
    const container = document.querySelector('.container');
    if (container) {
        container.insertAdjacentHTML('afterbegin', topNavHTML);
        container.insertAdjacentHTML('beforeend', bottomNavHTML);

        // 현재 페이지에 따라 active 클래스 추가
        const currentPath = window.location.pathname;
        const buttons = document.querySelectorAll('.custom-nav-button');
        
        if (currentPath === '/') {
            buttons[1].classList.add('active');
        } else if (currentPath === '/mypage.html') {
            buttons[2].classList.add('active');
        }
    } else {
        console.error('Container element not found');
    }
});