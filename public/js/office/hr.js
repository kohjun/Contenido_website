let currentRole = 'all';
let currentPage = 1;
const usersPerPage = 20;
let searchResults = [];
let users = [];
let selectedUserId = null;

// ============ 검색 상태 저장 변수 추가 ============
let currentSearchOption = 'name';
let currentSearchInput = '';
// ============ 검색 상태 저장 변수 추가 끝 ============

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    initializeDialogs();
});

// 다이얼로그 초기화 (이벤트 리스너 등)
function initializeDialogs() {
    // 컨텍스트 메뉴 닫기 이벤트
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.context-menu')) {
            const contextMenu = document.getElementById('contextMenu');
            if (contextMenu) contextMenu.style.display = 'none';
        }
    });

    // 모달 바깥 영역 클릭 시 닫기
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('warning-modal-overlay')) {
            closeWarningModal();
        }
    });
}

// 사용자 데이터 로드
async function loadUsers() {
    try {
        const response = await fetch('/user/participants/users');
        if (!response.ok) {
            throw new Error(`Failed to fetch users: ${response.statusText}`);
        }
        users = await response.json();
        showUsersByRole(currentRole);
    } catch (error) {
        alert('사용자 데이터를 로드하지 못했습니다.');
    }
}

// 컨텍스트 메뉴 표시
function handleContextMenu(e, userId, userName, userRole) {
    e.preventDefault();
    selectedUserId = userId;
    
    const contextMenu = document.getElementById('contextMenu');
    if (!contextMenu) {
        return;
    }
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
    const contextMenu = document.getElementById('contextMenu');
    const dialog = document.getElementById(dialogId);
    if (!dialog) {
        alert(`다이얼로그(${dialogId})를 찾을 수 없습니다.`);
        return;
    }
    if (contextMenu) contextMenu.style.display = 'none';
    dialog.style.display = 'flex';
}

function closeDialog(dialogId) {
    const dialog = document.getElementById(dialogId);
    if (dialog) dialog.style.display = 'none';
}

// 경고 부여 모달 표시
function showWarningModal(userId, userName) {
    const modal = document.createElement('div');
    modal.className = 'warning-modal-overlay';
    modal.innerHTML = `
        <div class="warning-modal">
            <div class="warning-modal-header">
                <h3>${userName}님에게 경고 부여</h3>
                <button onclick="closeWarningModal()" class="modal-close-btn">&times;</button>
            </div>
            <div class="warning-modal-body">
                <div class="form-group">
                    <label for="warning-category">경고 분류:</label>
                    <select id="warning-category" required>
                        <option value="정기모임">정기모임</option>
                        <option value="스태프활동">스태프활동</option>
                        <option value="운영진활동">운영진활동</option>
                        <option value="번개활동">번개활동</option>
                        <option value="조별활동">조별활동</option>
                        <option value="기타">기타</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="warning-reason">경고 사유:</label>
                    <textarea id="warning-reason" rows="4" placeholder="경고 사유를 상세히 입력해주세요..." required></textarea>
                </div>
            </div>
            <div class="warning-modal-footer">
                <button onclick="closeWarningModal()" class="btn-cancel">취소</button>
                <button onclick="issueWarning('${userId}', '${userName}')" class="btn-confirm">경고 부여</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('warning-reason').focus();
}

// 경고 부여 실행
async function issueWarning(userId, userName) {
    const category = document.getElementById('warning-category').value;
    const reason = document.getElementById('warning-reason').value.trim();
    
    if (!reason) {
        alert('경고 사유를 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch(`/user/issue-warning/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason, category })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        const result = await response.json();
        closeWarningModal();
        
        // 성공 메시지와 함께 사용자 목록 새로고침
        alert(`${userName}님에게 경고가 부여되었습니다.\n사유: ${reason}\n현재 경고 횟수: ${result.warningCount}회`);
        await loadUsers();
        // ============ 수정: showUsersByRole 대신 refreshCurrentView 호출 ============
        refreshCurrentView();
        // ============ 수정 끝 ============
        highlightModifiedUser(userId);
        
    } catch (error) {
        console.error('경고 부여 중 오류:', error);
        alert(`경고 부여에 실패했습니다: ${error.message}`);
    }
}

// 경고 내역 조회 모달
function showWarningHistoryModal(userId, userName) {
    const modal = document.createElement('div');
    modal.className = 'warning-modal-overlay';
    modal.innerHTML = `
        <div class="warning-history-modal">
            <div class="warning-modal-header">
                <h3>${userName}님의 경고 내역</h3>
                <button onclick="closeWarningModal()" class="modal-close-btn">&times;</button>
            </div>
            <div class="warning-modal-body">
                <div class="loading-indicator">경고 내역을 불러오는 중...</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    loadWarningHistory(userId);
}

// 경고 내역 로드
async function loadWarningHistory(userId) {
    try {
        const response = await fetch(`/user/warning-history/${userId}?showAll=true`);
        if (!response.ok) {
            throw new Error('경고 내역을 불러올 수 없습니다.');
        }
        
        const data = await response.json();
        const modalBody = document.querySelector('.warning-modal-body');
        
        if (data.warningHistory.length === 0) {
            modalBody.innerHTML = `
                <div class="no-warnings">
                    <p>경고 내역이 없습니다.</p>
                    <p>마지막 초기화: ${data.lastResetDate ? new Date(data.lastResetDate).toLocaleDateString() : '없음'}</p>
                </div>
            `;
            return;
        }
        
        const historyHtml = data.warningHistory.map(warning => `
            <div class="warning-item ${warning.isActive ? 'active-warning' : 'inactive-warning'}">
                <div class="warning-header">
                    <span class="warning-category">[${warning.category}]</span>
                    <span class="warning-date">${new Date(warning.issuedAt).toLocaleString()}</span>
                    ${warning.isActive ? 
                        `<button onclick="removeWarning('${userId}', '${warning.id}')" class="btn-remove-warning">삭제</button>` 
                        : '<span class="warning-status">삭제됨</span>'
                    }
                </div>
                <div class="warning-content">
                    <p><strong>사유:</strong> ${warning.reason}</p>
                    <p><strong>부여자:</strong> ${warning.issuedByName}</p>
                    ${!warning.isActive && warning.removedAt ? 
                        `<p class="removal-info"><strong>삭제일:</strong> ${new Date(warning.removedAt).toLocaleString()} | <strong>삭제자:</strong> ${warning.removedByName || 'System'} | <strong>삭제 사유:</strong> ${warning.removalReason || '없음'}</p>`
                        : ''
                    }
                </div>
            </div>
        `).join('');
        
        modalBody.innerHTML = `
            <div class="warning-summary">
                <p><strong>현재 경고 횟수:</strong> ${data.currentWarningCount}회</p>
                <p><strong>마지막 초기화:</strong> ${data.lastResetDate ? new Date(data.lastResetDate).toLocaleDateString() : '없음'}</p>
            </div>
            <div class="warning-history-list">
                ${historyHtml}
            </div>
        `;
        
    } catch (error) {
        console.error('경고 내역 로드 중 오류:', error);
        document.querySelector('.warning-modal-body').innerHTML = `
            <div class="error-message">
                <p>경고 내역을 불러오는데 실패했습니다.</p>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// 경고 삭제
async function removeWarning(userId, warningId) {
    if (!confirm('이 경고를 삭제하시겠습니까?')) {
        return;
    }
    
    const reason = prompt('삭제 사유를 입력해주세요:', '관리자 판단');
    if (!reason) return;
    
    try {
        const response = await fetch(`/user/remove-warning/${userId}/${warningId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        alert('경고가 삭제되었습니다.');
        loadWarningHistory(userId); // 내역 새로고침
        await loadUsers();
        // ============ 수정: showUsersByRole 대신 refreshCurrentView 호출 ============
        refreshCurrentView();
        // ============ 수정 끝 ============
        
    } catch (error) {
        console.error('경고 삭제 중 오류:', error);
        alert(`경고 삭제에 실패했습니다: ${error.message}`);
    }
}

// 모달 닫기
function closeWarningModal() {
    const modal = document.querySelector('.warning-modal-overlay');
    if (modal) {
        modal.remove();
    }
}

// 역할 업데이트
async function updateUserRole() {
    if (!selectedUserId) {
        alert('선택된 사용자가 없습니다.');
        return;
    }

    const roleSelect = document.getElementById('roleSelect');
    if (!roleSelect) {
        alert('역할 선택 요소를 찾을 수 없습니다.');
        return;
    }
    const newRole = roleSelect.value;

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
            throw new Error(error.message || '역할 업데이트 실패');
        }

        await loadUsers();
        // ============ 수정: showUsersByRole 대신 refreshCurrentView 호출 ============
        refreshCurrentView();
        // ============ 수정 끝 ============
        highlightModifiedUser(selectedUserId);
        closeDialog('roleChangeDialog');
        alert('역할이 성공적으로 변경되었습니다.');
    } catch (error) {
        alert(error.message || '역할 변경 중 오류가 발생했습니다.');
    }
}

// 팀과 부서 매핑
const teamDepartmentMapping = {
    'operationTeam': 'operation', 'HumanResourceTeam': 'operation', 'financeTeam': 'operation', 'cooperationTeam': 'operation',
    'marketingTeam': 'promotion', 'designTeam': 'promotion', 'videoTeam': 'promotion',
    'PlanningTeam': 'planning', 'regularTeam': 'planning', 'staffTeam': 'planning', 'starterTeam': 'planning'
};

// 팀 업데이트
async function updateUserTeam() {
    if (!selectedUserId) {
        alert('선택된 사용자가 없습니다.');
        return;
    }

    const teamSelect = document.getElementById('teamSelect');
    if (!teamSelect) {
        alert('팀 선택 요소를 찾을 수 없습니다.');
        return;
    }
    const newTeam = teamSelect.value;
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
            console.error('Team update failed:', error);
            throw new Error(error.message || '팀 업데이트 실패');
        }

        console.log('Team update successful, reloading users...');
        await loadUsers();
        // ============ 수정: showUsersByRole 대신 refreshCurrentView 호출 ============
        refreshCurrentView();
        // ============ 수정 끝 ============
        highlightModifiedUser(selectedUserId);
        closeDialog('teamChangeDialog');
        alert('팀이 성공적으로 변경되었습니다.');
    } catch (error) {
        console.error('Error updating user team:', error);
        alert(error.message || '팀 변경 중 오류가 발생했습니다.');
    }
}

// 스태프 소그룹 변경 다이얼로그 표시
function showStaffSubteamDialog() {
    const contextMenu = document.getElementById('contextMenu');
    const dialog = document.getElementById('staffSubteamDialog');
    const select = document.getElementById('staffSubteamModalSelect');

    if (!dialog || !select) {
        console.error('Staff subteam dialog or select element not found');
        alert('스태프 소그룹 다이얼로그를 찾을 수 없습니다.');
        return;
    }

    const user = users.find(u => u.id === selectedUserId);
    select.value = user?.staffSubteam || '';
    if (contextMenu) contextMenu.style.display = 'none';
    dialog.style.display = 'flex';
}

// 스태프 소그룹 변경 확인
async function confirmStaffSubteamOnly() {
    const select = document.getElementById('staffSubteamModalSelect');
    if (!select) {
        console.error('Staff subteam select element not found');
        alert('스태프 소그룹 선택 요소를 찾을 수 없습니다.');
        return;
    }
    const staffSubteam = select.value;
    if (!staffSubteam) {
        console.error('No staff subteam selected');
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
            console.error('Staff subteam update failed:', error);
            throw new Error(error.message || '스태프 소그룹 업데이트 실패');
        }

        await loadUsers();
        // ============ 수정: showUsersByRole 대신 refreshCurrentView 호출 ============
        refreshCurrentView();
        // ============ 수정 끝 ============
        highlightModifiedUser(selectedUserId);
        closeDialog('staffSubteamDialog');
        alert('스태프 소그룹이 성공적으로 변경되었습니다.');
    } catch (error) {
        console.error('Error updating staff subteam:', error);
        alert(error.message || '스태프 소그룹 변경 중 오류가 발생했습니다.');
    }
}

// 변경된 유저 행 하이라이트
function highlightModifiedUser(userId) {
    const userRow = document.querySelector(`tr[data-userid='${userId}']`);
    if (userRow) {
        userRow.classList.add('recently-modified');
        setTimeout(() => {
            userRow.classList.remove('recently-modified');
        }, 60000); // 1분
    } else {
        console.warn(`User row for ID ${userId} not found`);
    }
}

// 유저 행 생성 (경고 관리 부분 수정)
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
    const universityDisplay = user.university ? user.university : 'N/A';
    return `
        <tr oncontextmenu="handleContextMenu(event, '${user.id}', '${user.name || ''}', '${user.role}')" 
            data-userid="${user.id}" data-warning="${warningCount}">
            <td><img src="${secureProfileImage}" alt="Profile" class="profile-image" onerror="this.src='/images/basic_Image.png'"></td>
            <td>${user.name || '--'}${phoneSuffix ? `(${phoneSuffix})` : ''}(${user.displayName || '--'})</td>
            <td>${roleDisplay[user.role] || user.role}</td>
            <td>${teamName || '-'}</td>
            <td>${genderDisplay}</td>
            <td>${universityDisplay}</td>
            <td class="warning-count-cell">
                <button onclick="updateWarningCount('${user.id}', ${Math.max(0, warningCount - 1)})" class="warning-btn" ${warningCount <= 0 ? 'disabled' : ''} title="경고 1회 차감">-</button>
                <span class="warning-count" onclick="showWarningHistoryModal('${user.id}', '${user.name || user.displayName}')" 
                      title="클릭하여 경고 내역 확인" style="cursor: pointer; text-decoration: underline; color: #007bff;">${warningCount}</span>
                <button onclick="showWarningModal('${user.id}', '${user.name || user.displayName}')" class="warning-btn" title="경고 부여">+</button>
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

// 경고 횟수 업데이트 (기존 방식 - 긴급용)
async function updateWarningCount(userId, newCount) {
    if (newCount < 0) return;
    
    // 경고 감소 시 확인
    if (confirm('경고를 직접 차감하시겠습니까?\n권장: 경고 번호를 클릭하여 개별 경고를 삭제해주세요.')) {
        await updateCount(userId, 'warning', { warningCount: newCount }, '경고 횟수');
    }
}

// 공통 카운트 업데이트 로직
async function updateCount(userId, type, body, alertName) {
    try {
        const response = await fetch(`/user/update-${type}/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error(`${type} update failed:`, error);
            throw new Error(`Failed to update ${type} count`);
        }

        await loadUsers();
        // ============ 수정: showUsersByRole 대신 refreshCurrentView 호출 ============
        refreshCurrentView();
        // ============ 수정 끝 ============
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
        if (!response.ok) {
            const error = await response.json();
            console.error('Active status update failed:', error);
            throw new Error('Failed to update user status');
        }

        await loadUsers();
        // ============ 수정: showUsersByRole 대신 refreshCurrentView 호출 ============
        refreshCurrentView();
        // ============ 수정 끝 ============
        alert('활성상태가 변경되었습니다.');
    } catch (error) {
        console.error('Error toggling user active status:', error);
        alert('활성상태 변경에 실패했습니다.');
    }
}

// ============ 검색 기능 개선 부분 시작 ============

// 역할별 사용자 표시
function showUsersByRole(role, resetPage = true) {
    currentRole = role;
    
    if (resetPage) {
        // 역할 버튼 클릭 시에만 검색 초기화
        currentPage = 1;
        searchResults = [];
        currentSearchOption = 'name';
        currentSearchInput = '';
        const searchInput = document.getElementById('search-input');
        const searchOption = document.getElementById('search-option');
        if (searchInput) searchInput.value = '';
        if (searchOption) searchOption.value = 'name';
    }

    // 역할 버튼 활성화 상태 업데이트
    document.querySelectorAll('.role-button').forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-role') === role);
    });

    // 현재 뷰 새로고침
    refreshCurrentView();
}

// 현재 뷰 새로고침 (검색 상태 유지) - 새로 추가
function refreshCurrentView() {
    // 검색 결과가 있으면 검색 적용, 없으면 전체 users 사용
    const filteredUsers = (searchResults.length > 0 || currentSearchInput !== '') ? searchResults : users;
    
    let usersToDisplay;
    if (currentRole === 'all') {
        usersToDisplay = filteredUsers;
    } else if (currentRole === 'staffTeam') {
        usersToDisplay = filteredUsers.filter(user => user.team === 'staffTeam');
    } else {
        usersToDisplay = filteredUsers.filter(user => user.role === currentRole);
    }

    displayUsers(usersToDisplay);
}

// 사용자 목록 표시
function displayUsers(usersToShow) {
    const userTableBody = document.getElementById('user-table-body');
    if (!userTableBody) return;

    const startIndex = (currentPage - 1) * usersPerPage;
    const endIndex = startIndex + usersPerPage;
    const paginatedUsers = usersToShow.slice(startIndex, endIndex);

    userTableBody.innerHTML = paginatedUsers.map(user => generateUserRow(user)).join('');

    renderPagination(usersToShow.length);
}

// 페이지네이션 렌더링
function renderPagination(totalUsers) {
    const totalPages = Math.ceil(totalUsers / usersPerPage);
    const paginationDiv = document.getElementById('pagination');
    if (!paginationDiv) return;

    let paginationHTML = '';
    
    if (currentPage > 1) {
        paginationHTML += `<button onclick="changePage(${currentPage - 1})">이전</button>`;
    }
    
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `<button class="${i === currentPage ? 'active' : ''}" 
                                   onclick="changePage(${i})">${i}</button>`;
    }
    
    if (currentPage < totalPages) {
        paginationHTML += `<button onclick="changePage(${currentPage + 1})">다음</button>`;
    }
    
    paginationDiv.innerHTML = paginationHTML;
}

// 페이지 변경
function changePage(page) {
    currentPage = page;
    refreshCurrentView();
}

// 검색 기능 (대학교 검색 추가, 검색 상태 저장)
function searchUsers() {
    // 현재 검색 상태 저장
    currentSearchOption = document.getElementById('search-option')?.value || 'name';
    currentSearchInput = document.getElementById('search-input')?.value.toLowerCase() || '';

    // 검색어가 비어있으면 검색 결과 초기화
    if (currentSearchInput === '') {
        searchResults = [];
        currentPage = 1;
        refreshCurrentView();
        return;
    }

    searchResults = users.filter(user => {
        if (!user) return false;
        
        switch (currentSearchOption) {
            case 'name':
                return user.name?.toLowerCase().includes(currentSearchInput) || false;
            
            case 'university':
                // 대학교 검색 - 포함 검색 (새로 추가됨)
                return user.university?.toLowerCase().includes(currentSearchInput) || false;
            
            case 'warningCount':
                return (user.warningCount || 0).toString() === currentSearchInput;
            
            case 'active':
                if (currentSearchInput === '활성' || currentSearchInput === 'active') return user.active;
                if (currentSearchInput === '비활성' || currentSearchInput === 'inactive') return !user.active;
                return false;
            
            case 'role':
                const roleMap = { 
                    '참가자': 'participant', 
                    '운영진': 'officer', 
                    '스타터': 'starter', 
                    '게스트': 'guest' 
                };
                const searchRole = roleMap[currentSearchInput] || currentSearchInput;
                return (user.role || '').toLowerCase() === searchRole;
            
            case 'gender':
                if (currentSearchInput === '남' || currentSearchInput === 'male') return user.gender === 'male';
                if (currentSearchInput === '여' || currentSearchInput === 'female') return user.gender === 'female';
                return false;
            
            default:
                return true;
        }
    });

    currentPage = 1;
    refreshCurrentView();
}

// 검색 초기화
function resetSearch() {
    document.getElementById('search-input').value = '';
    const searchOption = document.getElementById('search-option');
    if (searchOption) searchOption.value = 'name';
    
    searchResults = [];
    currentSearchOption = 'name';
    currentSearchInput = '';
    currentPage = 1;
    
    refreshCurrentView();
}

// 전역 스코프에 함수 할당
window.updateUserRole = updateUserRole;
window.updateUserTeam = updateUserTeam;
window.confirmStaffSubteamOnly = confirmStaffSubteamOnly;
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

// 새로 추가된 경고 관리 함수들
window.showWarningModal = showWarningModal;
window.issueWarning = issueWarning;
window.showWarningHistoryModal = showWarningHistoryModal;
window.loadWarningHistory = loadWarningHistory;
window.removeWarning = removeWarning;
window.closeWarningModal = closeWarningModal;
