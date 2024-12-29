// sidebar.js
const Sidebar = (function() {
  const template = `
    <div class="org-sidebar" id="org-sidebar">
      <div class="org-header">
        <a href="index.html"> <h1>Contenido</h1> </a>
      </div>
      
      <div class="org-menu">
        <!-- 운영부 -->
        <a href="#" class="org-menu-item">
          <i>⚙️</i>
          <div class="org-menu-item-content">
            <div class="org-menu-item-label">운영부</div>
            <div class="org-menu-item-description">조직 운영 및 관리</div>
          </div>
        </a>
        
        <div class="org-submenu">
          <a href="#" class="org-menu-item">
            
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>운영팀</strong></div>
              <div class="org-menu-item-description">부서간 소통통 및 일정 관리</div>
            </div>
          </a>
          <a href="#" class="org-menu-item">
            
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>대외협력팀팀</strong></div>
              <div class="org-menu-item-description">기업협찬, 수료증, 활동증명</div>
            </div>
          </a>
          <a href="#" class="org-menu-item">
            
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>인사팀</strong></div>
              <div class="org-menu-item-description">운영진, 참가자 규칙 및 입출관리 </div>
            </div>
          </a>
          <a href="#" class="org-menu-item">
            
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>재무팀</strong></div>
              <div class="org-menu-item-description">정산, 입출금 결제내역 관리</div>
            </div>
          </a>
        </div>

        <!-- 홍보부 -->
        <a href="#" class="org-menu-item">
          <i>📣</i>
          <div class="org-menu-item-content">
            <div class="org-menu-item-label">홍보부</div>
            <div class="org-menu-item-description">대외 홍보 및 동아리 모집</div>
          </div>
        </a>
        
        <div class="org-submenu">
          <a href="#" class="org-menu-item">
           
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>마케팅팀</strong></div>
              <div class="org-menu-item-description">동아리 모집, 인스타, 서포터즈 관리</div>
            </div>
          </a>
          <a href="#" class="org-menu-item">
          
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>디자인팀</strong></div>
              <div class="org-menu-item-description">포스터, 로고, 웹사이트UX/UI 디자인</div>
            </div>
          </a>
          <a href="#" class="org-menu-item">
           
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>영상제작팀</strong></div>
              <div class="org-menu-item-description">상위 이벤트, 동아리 소개 영상 관리

              </div>
            </div>
          </a>
        </div>

        <!-- 기획부 -->
        <a href="#" class="org-menu-item">
          <i>💡</i>
          <div class="org-menu-item-content">
            <div class="org-menu-item-label">기획부</div>
            <div class="org-menu-item-description">이벤트 및 정기모임 기획</div>
          </div>
        </a>
        
        <div class="org-submenu">
          <a href="#" class="org-menu-item">
          
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>정기모임팀</strong></div>
              <div class="org-menu-item-description"> 조별활동, MT, 시즌 행사 기획</div>
              
            </div>
          </a>
          <a href="#" class="org-menu-item">
            
            <div class="org-menu-item-content">
              <div class="org-menu-item-label"><strong>스태프팀</strong></div>
              <div class="org-menu-item-description"> 메인 컨텐츠 이벤트 기획</div>
            </div>
          </a>
        </div>

        <button class="org-toggle-btn">접기</button>
      </div>
    </div>
  `;

  function init(container) {
    container.innerHTML = template;

    const sidebar = container.querySelector('.org-sidebar');
    const toggleBtn = container.querySelector('.org-toggle-btn');
    const header = container.querySelector('.org-header h1');

    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      if (sidebar.classList.contains('collapsed')) {
        header.textContent = 'Con';
        toggleBtn.textContent = '펼치기';
      } else {
        header.textContent = 'Contenido';
        toggleBtn.textContent = '접기';
      }
    });
  }

  return {
    init: init
  };
})();

if (typeof window !== 'undefined') {
  window.Sidebar = Sidebar;
}
