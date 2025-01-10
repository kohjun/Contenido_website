let currentRole = 'all';
let currentPage = 1;
const usersPerPage = 20;
let searchResults = [];
let users = [];
let selectedUserId = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    initializeDialogs();
});

// 다이얼로그 초기화
function initializeDialogs() {
    // 역할 변경 다이얼로그 추가
    const roleDialog = document.createElement('div');
    roleDialog.className = 'role-change-dialog';
    roleDialog.id = 'roleChangeDialog';
    roleDialog.style.display = 'none';
    roleDialog.innerHTML = `
        <div class="dialog-content">
            <h3>역할 변경</h3>
            <select id="roleSelect">
                <option value="participant">참가자</option>
                <option value="starter">스타터</option>
                <option value="officer">운영진</option>
                <option value="guest">게스트</option>
            </select>
            <div class="dialog-buttons">
                <button onclick="updateUserRole()">변경</button>
                <button onclick="closeDialog('roleChangeDialog')">취소</button>
                
              
            </div>
        </div>
    `;
    document.body.appendChild(roleDialog);

    // 팀 변경 다이얼로그 추가
    const teamDialog = document.createElement('div');
    teamDialog.className = 'role-change-dialog';
    teamDialog.id = 'teamChangeDialog';
    teamDialog.style.display = 'none';
    teamDialog.innerHTML = `
        <div class="dialog-content">
            <h3>팀 변경</h3>
            <select id="teamSelect">
                <option value="operationTeam">운영팀</option>
                <option value="HumanResourceTeam">인사팀</option>
                <option value="financeTeam">재무팀</option>
                <option value="cooperationTeam">대외협력팀</option>
                <option value="marketingTeam">홍보팀</option>
                <option value="designTeam">디자인팀</option>
                <option value="videoTeam">영상제작팀</option>
                <option value="PlanningTeam">기획팀</option>
                <option value="regularTeam">정기모임팀</option>
                <option value="staffTeam">스태프팀</option>
            </select>
            <div class="dialog-buttons">
                <button onclick="updateUserTeam()">변경</button>
                <button onclick="closeDialog('teamChangeDialog')">취소</button>
            </div>
        </div>
    `;
    document.body.appendChild(teamDialog);

    // 컨텍스트 메뉴 추가
    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.id = 'contextMenu';
    contextMenu.style.display = 'none';
    document.body.appendChild(contextMenu);

    // 컨텍스트 메뉴 닫기 이벤트
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.context-menu')) {
            document.getElementById('contextMenu').style.display = 'none';
        }
    });
}

// 사용자 데이터 로드
async function loadUsers() {
    try {
        const response = await fetch('/user/participants/users');
        if (!response.ok) {
            throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        users = data;
        showUsersByRole(currentRole);
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// 컨텍스트 메뉴 표시
function handleContextMenu(e, userId, userName, userRole) {
    e.preventDefault();
    selectedUserId = userId;
    const contextMenu = document.getElementById('contextMenu');

    // admin 사용자는 변경 불가
    if (userRole === 'admin') {
        contextMenu.innerHTML = `
            <div class="context-menu-header">${userName}</div>
            <div class="menu-item disabled">Admin은 변경할 수 없습니다</div>
        `;
    } else {
      contextMenu.innerHTML = `
          <div class="context-menu-header">${userName}</div>
          <button onclick="showDialog('roleChangeDialog')">역할 변경</button>
          ${userRole === 'officer' ? `<button onclick="showDialog('teamChangeDialog')">팀 변경</button>` : ''}
      `;
    }

    // 메뉴 위치 설정
    const rect = e.target.getBoundingClientRect();
    contextMenu.style.display = 'block';
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;
}

// 다이얼로그 표시/숨김
function showDialog(dialogId) {
    document.getElementById('contextMenu').style.display = 'none';
    document.getElementById(dialogId).style.display = 'flex';
}

function closeDialog(dialogId) {
    document.getElementById(dialogId).style.display = 'none';
}

// 역할 업데이트
// hr.js
async function updateUserRole() {
    if (!selectedUserId) return;
  
    const newRole = document.getElementById('roleSelect').value;
    try {
      const requestBody = {
        role: newRole
      };
  
      // officer로 변경하는 경우 기본 부서와 팀 정보 추가
      if (newRole === 'officer') {
        requestBody.department = 'operation'; // 기본 부서
        requestBody.team = 'operationTeam'; // 기본 팀
      }
  
      const response = await fetch(`/user/update-role/${selectedUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
  
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
  
      const result = await response.json();
      users = users.map(user =>
        user.id === selectedUserId ? { 
          ...user, 
          role: newRole,
          department: newRole === 'officer' ? result.department : undefined,
          team: newRole === 'officer' ? result.team : undefined
        } : user
      );
      
      closeDialog('roleChangeDialog');
      showUsersByRole(currentRole, false);
      highlightModifiedUser(selectedUserId);
      
      alert('역할이 성공적으로 변경되었습니다.');
    } catch (error) {
      console.error('Error updating user role:', error);
      alert(error.message || '역할 변경 중 오류가 발생했습니다.');
    }
  }

// 팀과 부서 매핑 추가
const teamDepartmentMapping = {
    // 운영부
    'operationTeam': 'operation',
    'HumanResourceTeam': 'operation',
    'financeTeam': 'operation',
    'cooperationTeam': 'operation',
    
    // 홍보부
    'marketingTeam': 'promotion',
    'designTeam': 'promotion',
    'videoTeam': 'promotion',
    
    // 기획부
    'PlanningTeam': 'planning',
    'regularTeam': 'planning',
    'staffTeam': 'planning'
};

// 팀 업데이트 함수 수정
async function updateUserTeam() {
    if (!selectedUserId) return;

    const newTeam = document.getElementById('teamSelect').value;
    const newDepartment = teamDepartmentMapping[newTeam];

    try {
        const response = await fetch(`/user/update-team/${selectedUserId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                team: newTeam,
                department: newDepartment 
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }

        // 사용자 데이터 업데이트
        users = users.map(user =>
            user.id === selectedUserId ? { 
                ...user, 
                team: newTeam, 
                department: newDepartment 
            } : user
        );
        
        closeDialog('teamChangeDialog');
        showUsersByRole(currentRole, false);
        highlightModifiedUser(selectedUserId);
        
        alert('팀이 성공적으로 변경되었습니다.');
    } catch (error) {
        console.error('Error updating user team:', error);
        alert(error.message || '팀 변경 중 오류가 발생했습니다.');
    }
}
// 변경된 유저 행 하이라이트 함수
function highlightModifiedUser(userId) {
  const userRow = document.querySelector(`tr[oncontextmenu*="${userId}"]`);
  if (userRow) {
      userRow.classList.add('recently-modified');
      
      // 1분 후에 하이라이트 제거
      setTimeout(() => {
          userRow.classList.remove('recently-modified');
      }, 60000); // 60000ms = 1분
  }
}
// 성별 표시 변환
function getGenderDisplay(gender) {
    switch(gender?.toLowerCase()) {
        case 'male':
            return '남';
        case 'female':
            return '여';
        default:
            return '-';
    }
}

// 사용자 행 HTML 생성
function generateUserRow(user) {
    const warningCount = user.warningCount;
    const regularCount = user.participationCount?.regularCount || 0;
    const teamName = getTeamNameInKorean(user.team);
    
    return `
      <tr oncontextmenu="handleContextMenu(event, '${user.id}', '${user.name}', '${user.role}')" 
          data-warning="${warningCount}">
          <td><img src="${user.profileImage}" alt="Profile" class="profile-image"></td>
          <td>${user.name}</td>
          <td>${user.role}</td>
          <td>${teamName || '-'}</td>
          <td>${getGenderDisplay(user.gender)}</td>
          <td class="warning-count-cell">
              <button onclick="updateWarningCount('${user.id}', ${Math.max(0, warningCount - 1)})" 
                      class="warning-btn" ${warningCount <= 0 ? 'disabled' : ''}>-</button>
              <span>${warningCount}</span>
              <button onclick="updateWarningCount('${user.id}', ${warningCount + 1})" 
                      class="warning-btn">+</button>
          </td>
          <td class="participation-count-cell">
              <button onclick="updateParticipationCount('${user.id}', ${Math.max(0, regularCount - 1)})" 
                      class="warning-btn" ${regularCount <= 0 ? 'disabled' : ''}>-</button>
              <span>${regularCount}</span>
              <button onclick="updateParticipationCount('${user.id}', ${regularCount + 1})" 
                      class="warning-btn">+</button>
          </td>
          <td>
              <label class="toggle-switch">
                  <input type="checkbox" ${user.active ? 'checked' : ''} 
                         onclick="toggleUserActive('${user.id}', this.checked)">
                  <span class="slider"></span>
              </label>
          </td>
      </tr>
    `;
  }

function getTeamNameInKorean(team) {
  const teamMapping = {
    "operationTeam": "운영팀",
    "HumanResourceTeam": "인사팀",
    "financeTeam": "재무팀",
    "cooperationTeam": "대외협력팀",
    "marketingTeam": "홍보팀",
    "designTeam": "디자인팀",
    "videoTeam": "영상제작팀",
    "PlanningTeam": "기획팀",
    "regularTeam": "정기모임팀",
    "staffTeam": "스태프팀"
  };
  return teamMapping[team] || team; // 매핑되지 않은 경우 원래 값 반환
}


// 참가 횟수 업데이트
async function updateParticipationCount(userId, newCount) {
    try {
      const response = await fetch(`/user/update-participation/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regularCount: newCount })
      });
  
      if (!response.ok) {
        throw new Error('Failed to update participation count');
      }
  
      users = users.map(user =>
        user.id === userId ? { 
          ...user, 
          participationCount: {
            ...user.participationCount,
            regularCount: newCount
          }
        } : user
      );
      
      showUsersByRole(currentRole, false);
      alert('참가 횟수가 업데이트되었습니다.');
    } catch (error) {
      console.error('Error updating participation count:', error);
      alert('참가 횟수 업데이트에 실패했습니다.');
    }
  }
// 경고 횟수 업데이트
async function updateWarningCount(userId, newCount) {
    try {
        const response = await fetch(`/user/update-warning/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ warningCount: newCount })
        });

        if (!response.ok) {
            throw new Error('Failed to update warning count');
        }

        users = users.map(user =>
            user.id === userId ? { ...user, warningCount: newCount } : user
        );
        
        showUsersByRole(currentRole, false);
        alert('경고 횟수가 업데이트되었습니다.');
    } catch (error) {
        console.error('Error updating warning count:', error);
        alert('경고 횟수 업데이트에 실패했습니다.');
    }
}

// 활성 상태 토글
async function toggleUserActive(userId, active) {
    try {
        const response = await fetch(`/user/toggle-active/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active })
        });

        if (!response.ok) {
            throw new Error('Failed to update user status');
        }

        users = users.map(user =>
            user.id === userId ? { ...user, active } : user
        );
        
        showUsersByRole(currentRole, false);
        alert('활성상태가 변경되었습니다.');
    } catch (error) {
        console.error('Error toggling user status:', error);
        alert('사용자 상태 업데이트에 실패했습니다.');
    }
}

// 역할별 사용자 표시
function showUsersByRole(role, resetPage = true) {
  currentRole = role;
  if (resetPage) {
      currentPage = 1;
      searchResults = [];
      document.getElementById('search-input').value = '';
  }

  // 역할 버튼 활성화 상태 업데이트
  const buttons = document.querySelectorAll('.role-button');
  buttons.forEach(button => {
      button.classList.remove('active');
      if (button.getAttribute('data-role') === role) {
          button.classList.add('active');
      }
  });

  let filteredUsers;
  switch(role) {
      case 'all':
          filteredUsers = users;
          break;
      case 'staffTeam':
          // team이 staffTeam인 officer만 필터링
          filteredUsers = users.filter(user => 
              user.team === 'staffTeam'
          );
          break;
      case 'participant':
      case 'officer':
      case 'starter':
      case 'guest':
          // 일반 역할별 필터링
          filteredUsers = users.filter(user => user.role === role);
          break;
      default:
          filteredUsers = users;
  }

  const startIndex = (currentPage - 1) * usersPerPage;
  const endIndex = startIndex + usersPerPage;
  const usersToShow = filteredUsers.slice(startIndex, endIndex);

  const tableBody = document.getElementById('user-table-body');
  if (tableBody) {
      tableBody.innerHTML = usersToShow.map(generateUserRow).join('');
      createPagination(filteredUsers.length);
  }
}

// 페이지네이션 생성
function createPagination(totalUsers) {
    const totalPages = Math.ceil(totalUsers / usersPerPage);
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    let paginationHtml = '<div class="pagination">';
    
    if (currentPage > 1) {
        paginationHtml += `<button onclick="changePage(${currentPage - 1})">이전</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        paginationHtml += `<button class="${i === currentPage ? 'active' : ''}" 
                                   onclick="changePage(${i})">${i}</button>`;
    }

    if (currentPage < totalPages) {
        paginationHtml += `<button onclick="changePage(${currentPage + 1})">다음</button>`;
    }

    paginationHtml += '</div>';
    paginationContainer.innerHTML = paginationHtml;
}

// 페이지 변경
function changePage(page) {
    currentPage = page;
    showUsersByRole(currentRole, false);
}

// 검색 기능
function searchUsers() {
    const searchOption = document.getElementById('search-option').value;
    const searchInput = document.getElementById('search-input').value.toLowerCase();

    const currentRoleUsers = currentRole === 'all' 
        ? users 
        : users.filter(user => user.role === currentRole);

    searchResults = currentRoleUsers.filter(user => {
        switch(searchOption) {
            case 'name':
                return user.name.toLowerCase().includes(searchInput);
            case 'warningCount':
                return (user.warningCount || 0).toString() === searchInput;
            case 'active':
                const searchActive = searchInput === '활성' || searchInput === 'active' || searchInput === '1';
                const searchInactive = searchInput === '비활성' || searchInput === 'inactive' || searchInput === '0';
                return searchActive ? user.active : searchInactive ? !user.active : false;
            case 'role':
                const roleMap = {
                    '참가자': 'participant',
                    '운영진': 'officer',
                    '스타터': 'starter',
                    '게스트': 'guest'
                };
                const searchRole = roleMap[searchInput] || searchInput;
                return user.role.toLowerCase() === searchRole.toLowerCase();
            case 'gender':
                if (searchInput === '남' || searchInput === 'male') {
                    return user.gender === 'male';
                }
                if (searchInput === '여' || searchInput === 'female') {
                    return user.gender === 'female';
                }
                return false;
            default:
                return true;
          }
      });
  
      currentPage = 1;
      displaySearchResults();
  }
  
  // 검색 결과 표시
  function displaySearchResults() {
      const startIndex = (currentPage - 1) * usersPerPage;
      const endIndex = startIndex + usersPerPage;
      const usersToShow = searchResults.slice(startIndex, endIndex);
  
      const tableBody = document.getElementById('user-table-body');
      if (!tableBody) {
          console.error('Table body element not found');
          return;
      }
  
      tableBody.innerHTML = usersToShow.map(user => generateUserRow(user)).join('');
      createPagination(searchResults.length);
  }
  
  // 검색 초기화
  function resetSearch() {
      document.getElementById('search-input').value = '';
      searchResults = [];
      currentPage = 1;
      showUsersByRole(currentRole, true);
  }