let currentRole = 'all';
let currentPage = 1;
const usersPerPage = 20;
let searchResults = [];
let users = [];
let selectedUserId = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    initializeDialogs(); // 다이얼로그 초기화 (HTML에 이미 존재하므로 생성 코드는 제거)
});

// 다이얼로그 초기화 (이벤트 리스너 등)
function initializeDialogs() {
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
        users = await response.json();
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
    const user = users.find(u => u.id === userId);

    let menuContent = `<div class="context-menu-header">${userName}</div>`;

    if (userRole === 'admin') {
        menuContent += `<div class="menu-item disabled">Admin은 변경할 수 없습니다</div>`;
    } else {
        menuContent += `<button onclick="showDialog('roleChangeDialog')">역할 변경</button>`;
        if (userRole === 'officer') {
            menuContent += `<button onclick="showDialog('teamChangeDialog')">팀 변경</button>`;
        }
        if (user && user.team === 'staffTeam') {
            menuContent += `<button onclick="showStaffSubteamDialog()">스태프팀 변경</button>`;
        }
    }
    
    contextMenu.innerHTML = menuContent;

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
async function updateUserRole() {
    if (!selectedUserId) return;

    const newRole = document.getElementById('roleSelect').value;
    try {
        const requestBody = { role: newRole };

        if (newRole === 'officer') {
            requestBody.department = 'operation';
            requestBody.team = 'operationTeam';
        }

        if (newRole === 'guest') {
            requestBody.active = false;
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

        await loadUsers(); // 데이터를 최신 상태로 다시 로드
        showUsersByRole(currentRole, false);
        highlightModifiedUser(selectedUserId);
        
        closeDialog('roleChangeDialog');
        alert('역할이 성공적으로 변경되었습니다.');
    } catch (error) {
        console.error('Error updating user role:', error);
        alert(error.message || '역할 변경 중 오류가 발생했습니다.');
    }
}

// 팀과 부서 매핑
const teamDepartmentMapping = {
    'operationTeam': 'operation', 'HumanResourceTeam': 'operation', 'financeTeam': 'operation', 'cooperationTeam': 'operation',
    'marketingTeam': 'promotion', 'designTeam': 'promotion', 'videoTeam': 'promotion',
    'PlanningTeam': 'planning', 'regularTeam': 'planning', 'staffTeam': 'planning', 'starterTeam': 'planning'
};

// 팀 업데이트 함수
async function updateUserTeam() {
    if (!selectedUserId) return;

    const newTeam = document.getElementById('teamSelect').value;
    const newDepartment = teamDepartmentMapping[newTeam];

    try {
        const body = { team: newTeam, department: newDepartment };
        const response = await fetch(`/user/update-team/${selectedUserId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }

        await loadUsers(); // 데이터 최신화
        showUsersByRole(currentRole, false);
        highlightModifiedUser(selectedUserId);

        closeDialog('teamChangeDialog');
        alert('팀이 성공적으로 변경되었습니다.');
    } catch (error) {
        console.error('Error updating user team:', error);
        alert(error.message || '팀 변경 중 오류가 발생했습니다.');
    }
}

// 변경된 유저 행 하이라이트 함수
function highlightModifiedUser(userId) {
    const userRow = document.querySelector(`tr[data-userid='${userId}']`); // data-userid 속성으로 찾도록 변경
    if (userRow) {
        userRow.classList.add('recently-modified');
        setTimeout(() => {
            userRow.classList.remove('recently-modified');
        }, 60000); // 1분
    }
}

// 유저 행 생성 (단일 함수로 통합 및 개선)
function generateUserRow(user) {
    if (!user) return '';

    const warningCount = user.warningCount || 0;
    const regularCount = user.participationCount?.regularCount || 0;
    const teamName = getTeamNameInKorean(user.team, user.staffSubteam);
    const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-';
    const secureProfileImage = user.profileImage ? user.profileImage.replace(/^http:/, 'https:') : '/images/basic_Image.png';
    const phoneSuffix = user.phonenumber ? user.phonenumber.replace(/\D/g, '').slice(-4) : '';

    const roleDisplay = {
        'officer': '운영진', 'starter': '스타터', 'admin': '관리자',
        'participant': '참가자', 'guest': '게스트'
    };
    
    const genderDisplay = user.gender === 'male' ? '남' : user.gender === 'female' ? '여' : '-';

    return `
        <tr oncontextmenu="handleContextMenu(event, '${user.id}', '${user.name || ''}', '${user.role}')" data-userid="${user.id}">
            <td><img src="${secureProfileImage}" alt="Profile" class="profile-image" onerror="this.src='/images/basic_Image.png'"></td>
            <td>${user.name || '--'}${phoneSuffix ? `(${phoneSuffix})` : ''}(${user.displayName || '--'})</td>
            <td>${roleDisplay[user.role] || user.role}</td>
            <td>${teamName || '-'}</td>
            <td>${genderDisplay}</td>
            <td class="warning-count-cell">
                <button onclick="updateWarningCount('${user.id}', ${Math.max(0, warningCount - 1)})" class="warning-btn" ${warningCount <= 0 ? 'disabled' : ''}>-</button>
                <span>${warningCount}</span>
                <button onclick="updateWarningCount('${user.id}', ${warningCount + 1})" class="warning-btn">+</button>
            </td>
            <td class="participation-count-cell">
                <button onclick="updateParticipationCount('${user.id}', ${Math.max(0, regularCount - 1)})" class="warning-btn" ${regularCount <= 0 ? 'disabled' : ''}>-</button>
                <span>${regularCount}</span>
                <button onclick="updateParticipationCount('${user.id}', ${regularCount + 1})" class="warning-btn">+</button>
            </td>
            <td>
                <label class="toggle-switch">
                    <input type="checkbox" ${user.active ? 'checked' : ''} onclick="toggleUserActive('${user.id}', this.checked)">
                    <span class="slider"></span>
                </label>
            </td>
            <td>${joinDate}</td>
        </tr>`;
}

function getTeamNameInKorean(team, staffSubteam) {
    const teamMapping = {
        "operationTeam": "운영팀", "HumanResourceTeam": "인사팀", "financeTeam": "재무팀",
        "cooperationTeam": "대외협력팀", "marketingTeam": "홍보팀", "designTeam": "디자인팀",
        "videoTeam": "영상제작팀", "PlanningTeam": "기획팀", "regularTeam": "정기모임팀",
        "staffTeam": "스태프팀", "starterTeam": "스타터팀"
    };
    if (team === "staffTeam" && staffSubteam) {
        return `${teamMapping[team]}(${staffSubteam})`;
    }
    return teamMapping[team] || team;
}

// 참가 횟수 업데이트
async function updateParticipationCount(userId, newCount) {
    await updateCount(userId, 'participation', { regularCount: newCount }, '참가 횟수');
}

// 경고 횟수 업데이트
async function updateWarningCount(userId, newCount) {
    await updateCount(userId, 'warning', { warningCount: newCount }, '경고 횟수');
}

// 공통 카운트 업데이트 로직
async function updateCount(userId, type, body, alertName) {
    try {
        const response = await fetch(`/user/update-${type}/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error(`Failed to update ${type} count`);

        await loadUsers(); // 변경 후 데이터 다시 로드
        showUsersByRole(currentRole, false); // 현재 뷰 새로고침
        alert(`${alertName}가 업데이트되었습니다.`);
    } catch (error) {
        console.error(`Error updating ${type} count:`, error);
        alert(`${alertName} 업데이트에 실패했습니다.`);
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
        if (!response.ok) throw new Error('Failed to update user status');
        
        await loadUsers();
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

    document.querySelectorAll('.role-button').forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-role') === role);
    });

    const filteredUsers = (searchResults.length > 0) ? searchResults : users;

    let usersToDisplay;
    if (role === 'all') {
        usersToDisplay = filteredUsers;
    } else if (role === 'staffTeam') {
        usersToDisplay = filteredUsers.filter(user => user.team === 'staffTeam');
    } else {
        usersToDisplay = filteredUsers.filter(user => user.role === role);
    }

    displayUsers(usersToDisplay);
}

// 사용자 목록과 페이지네이션을 화면에 표시
function displayUsers(usersArray) {
    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const usersToShow = usersArray.slice(startIndex, endIndex);

    const tableBody = document.getElementById('user-table-body');
    if (tableBody) {
        tableBody.innerHTML = usersToShow.map(generateUserRow).join('');
    }
    createPagination(usersArray.length);
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
        paginationHtml += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
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
    showUsersByRole(currentRole, false); // 검색 상태를 유지하며 페이지 이동
}

// 검색 기능
function searchUsers() {
    const searchOption = document.getElementById('search-option').value;
    const searchInput = document.getElementById('search-input').value.toLowerCase();

    searchResults = users.filter(user => {
        if (!user) return false;
        switch(searchOption) {
            case 'name':
                return user.name?.toLowerCase().includes(searchInput) || false;
            case 'warningCount':
                return (user.warningCount || 0).toString() === searchInput;
            case 'active':
                if (searchInput === '활성' || searchInput === 'active') return user.active;
                if (searchInput === '비활성' || searchInput === 'inactive') return !user.active;
                return false;
            case 'role':
                const roleMap = { '참가자': 'participant', '운영진': 'officer', '스타터': 'starter', '게스트': 'guest' };
                const searchRole = roleMap[searchInput] || searchInput;
                return (user.role || '').toLowerCase() === searchRole;
            case 'gender':
                if (searchInput === '남' || searchInput === 'male') return user.gender === 'male';
                if (searchInput === '여' || searchInput === 'female') return user.gender === 'female';
                return false;
            default:
                return true;
        }
    });

    currentPage = 1;
    showUsersByRole(currentRole, false); // 검색 결과를 현재 역할 필터에 맞게 표시
}

// 검색 초기화
function resetSearch() {
    document.getElementById('search-input').value = '';
    searchResults = [];
    currentPage = 1;
    showUsersByRole(currentRole, true);
}

// 스태프 소그룹 변경 다이얼로그 표시
function showStaffSubteamDialog() {
    document.getElementById('contextMenu').style.display = 'none';
    const select = document.getElementById('staffSubteamModalSelect');
    const dialog = document.getElementById('staffSubteamDialog');
    
    const user = users.find(u => u.id === selectedUserId);
    select.value = user?.staffSubteam || '';
    
    dialog.style.display = 'flex';
}

// 스태프 소그룹 변경 확인
async function confirmStaffSubteamOnly() {
    const staffSubteam = document.getElementById('staffSubteamModalSelect').value;
    if (!staffSubteam) {
        alert('스태프 소그룹을 반드시 선택해야 합니다.');
        return;
    }
    try {
        const response = await fetch(`/user/update-staffsubteam/${selectedUserId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ staffSubteam })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }

        await loadUsers();
        showUsersByRole(currentRole, false);
        highlightModifiedUser(selectedUserId);
        
        closeDialog('staffSubteamDialog');
        alert('스태프 소그룹이 성공적으로 변경되었습니다.');
    } catch (error) {
        console.error('Error updating staff subteam:', error);
        alert(error.message || '스태프 소그룹 변경 중 오류가 발생했습니다.');
    }
}

// 전역 스코프에 함수 할당
window.confirmStaffSubteamOnly = confirmStaffSubteamOnly;
window.updateUserRole = updateUserRole;
window.updateUserTeam = updateUserTeam;
window.closeDialog = closeDialog;
window.showUsersByRole = showUsersByRole;
window.searchUsers = searchUsers;
window.resetSearch = resetSearch;
window.handleContextMenu = handleContextMenu;
window.showStaffSubteamDialog = showStaffSubteamDialog;
window.updateWarningCount = updateWarningCount;
window.updateParticipationCount = updateParticipationCount;
window.toggleUserActive = toggleUserActive;
window.changePage = changePage;
