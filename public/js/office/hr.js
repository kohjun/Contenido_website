let users = [];
let currentRole = 'all';
let currentPage = 1;
const usersPerPage = 20;
let searchResults = [];
// 초기 데이터 로드
document.addEventListener('DOMContentLoaded', () => {
   loadUsers();
});

// 사용자 데이터 로드
async function loadUsers() {
   try {
       const response = await fetch('/user/participants/users');
       if (!response.ok) {
           throw new Error('Failed to fetch users');
       }
       const data = await response.json();
       console.log('Loaded users:', data);
       users = data;
       showUsersByRole(currentRole);
   } catch (error) {
       console.error('Error loading users:', error);
   }
}

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

// 페이지네이션 생성
function createPagination(totalUsers) {
   const totalPages = Math.ceil(totalUsers / usersPerPage);
   const paginationContainer = document.getElementById('pagination');
   
   let paginationHtml = '<div class="pagination">';
   
   // 이전 페이지 버튼
   if (currentPage > 1) {
       paginationHtml += `<button onclick="changePage(${currentPage - 1})">이전</button>`;
   }

   // 페이지 번호
   for (let i = 1; i <= totalPages; i++) {
       paginationHtml += `<button class="${i === currentPage ? 'active' : ''}" 
                                 onclick="changePage(${i})">${i}</button>`;
   }

   // 다음 페이지 버튼
   if (currentPage < totalPages) {
       paginationHtml += `<button onclick="changePage(${currentPage + 1})">다음</button>`;
   }

   paginationHtml += '</div>';
   paginationContainer.innerHTML = paginationHtml;
}

// 페이지 변경
function changePage(page) {
    currentPage = page;
    showUsersByRole(currentRole, false);  // resetPage를 false로 설정
}
// 검색 함수
function searchUsers() {
    const searchOption = document.getElementById('search-option').value;
    const searchInput = document.getElementById('search-input').value.toLowerCase();

    // 현재 선택된 역할의 사용자만 필터링
    const currentRoleUsers = currentRole === 'all' 
        ? users 
        : users.filter(user => user.role === currentRole);

    // 검색 조건에 따른 필터링
    searchResults = currentRoleUsers.filter(user => {
        switch(searchOption) {
            case 'displayName':
                return user.displayName.toLowerCase().includes(searchInput);
            case 'warnings':
                return (user.warnings || 0).toString() === searchInput;
            case 'active':
                if (searchInput === '활성' || searchInput === 'active' || searchInput === '1') {
                    return user.active === true;
                }
                if (searchInput === '비활성' || searchInput === 'inactive' || searchInput === '0') {
                    return user.active === false;
                }
                return false;
            case 'role':
                const roleMap = {
                    '참가자': 'participant',
                    '운영진': 'staff',
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

    currentPage = 1; // 검색 시 첫 페이지로 이동
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

    tableBody.innerHTML = usersToShow.map(user => `
        <tr>
            <td><img src="${user.profileImage}" alt="Profile" class="profile-image"></td>
            <td>${user.displayName}</td>
            <td>${user.role}</td>
            <td>${getGenderDisplay(user.gender)}</td>
            <td>${user.warnings || 0}</td>
            <td>${calculateParticipationCount(user.status)}</td>
            <td>
                <label class="toggle-switch">
                    <input type="checkbox" ${user.active ? 'checked' : ''} 
                           onclick="event.preventDefault(); toggleUserActive('${user.id}', !${user.active})">
                    <span class="slider"></span>
                </label>
            </td>
        </tr>
    `).join('');

    createPagination(searchResults.length);
}

// 검색 초기화
function resetSearch() {
    document.getElementById('search-input').value = '';
    searchResults = [];
    currentPage = 1;
    showUsersByRole(currentRole, true);
}

// 역할별 사용자 표시
function showUsersByRole(role, resetPage = true) {
    if (currentRole !== role) {
        currentRole = role;
        if (resetPage) {
            currentPage = 1;
            searchResults = []; // 검색 결과 초기화
            document.getElementById('search-input').value = ''; // 검색창 초기화
        }
    }

     // 버튼 스타일 업데이트
     const buttons = document.querySelectorAll('.role-button');
     buttons.forEach(button => {
         button.classList.remove('active');
         if (button.getAttribute('data-role')?.toLowerCase() === role.toLowerCase()) {
             button.classList.add('active');
         }
     });
 
     // 사용자 필터링 ('all'인 경우 모든 사용자 표시)
     const filteredUsers = role === 'all' ? users : users.filter(user => user.role === role);
     searchResults = filteredUsers;
 
     // 페이지네이션을 위한 사용자 슬라이싱
     const startIndex = (currentPage - 1) * usersPerPage;
     const endIndex = startIndex + usersPerPage;
     const usersToShow = filteredUsers.slice(startIndex, endIndex);
 
     const tableBody = document.getElementById('user-table-body');
     if (!tableBody) {
         console.error('Table body element not found');
         return;
     }
 
     // 테이블 업데이트
     tableBody.innerHTML = usersToShow.map(user => `
         <tr>
             <td><img src="${user.profileImage}" alt="Profile" class="profile-image"></td>
             <td>${user.displayName}</td>
             <td>${user.role}</td>
             <td>${getGenderDisplay(user.gender)}</td>
             <td>${user.warnings || 0}</td>
             <td>${calculateParticipationCount(user.status)}</td>
             <td>
                  <label class="toggle-switch">
                    <input type="checkbox" ${user.active ? 'checked' : ''} 
                           onclick="toggleUserActive('${user.id}', this.checked)">
                    <span class="slider"></span>
                </label>
             </td>
         </tr>
     `).join('');
 
     // 페이지네이션 생성
     createPagination(filteredUsers.length);
 }


// 참가 횟수 계산
function calculateParticipationCount(status) {
   if (!status) return 0;
   return Object.values(status).filter(week => week === 'O').length;
}

// 활성 상태 토글
async function toggleUserActive(userId, active) {   

   try {
       const response = await fetch(`/user/toggle-active/${userId}`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ active })
       });

       if (response.ok) {
           // 로컬 데이터 업데이트
           users = users.map(user => 
               user.id === userId ? { ...user, active } : user
           );
           // 체크박스 상태 업데이트
           const checkbox = document.querySelector(`input[onclick*="${userId}"]`);
           if (checkbox) {
               checkbox.checked = active;
           }
           alert('활성상태가 변경되었습니다.');
       } else {
           throw new Error('Failed to update user status');
       }
   } catch (error) {
       console.error('Error toggling user status:', error);
       alert('사용자 상태 업데이트에 실패했습니다.');
   }
}