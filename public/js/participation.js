async function fetchUserStatus() {
  try {
    // 서버로부터 참가자 데이터 요청
    const response = await fetch('/user/participants/users');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const users = await response.json();

    // 활성 사용자 필터링
    const activeUsers = users.filter((user) => user.active === true);

    // 활성 사용자가 없을 경우 처리
    if (activeUsers.length === 0) {
      document.getElementById('status-list').innerHTML = '<p>참가자가 없습니다.</p>';
      return;
    }

    // 테이블 업데이트
    updateParticipantTable(activeUsers);
  } catch (error) {
    console.error('Error fetching user data:', error);
    document.getElementById('status-list').innerHTML = '<p class="error">Failed to load participant data. Please try again later.</p>';
  }
}

// 참가자 테이블 업데이트
function updateParticipantTable(users) {
  const statusList = document.getElementById('status-list');
  if (!statusList) return;

  // 기존 내용 초기화
  statusList.innerHTML = '';

  // 테이블 생성
  const table = document.createElement('table');
  table.id = 'participant-table';
  table.innerHTML = `
    <tr>
      <th>프로필 사진</th>
      <th>이름</th>
      <th>1주차</th>
      <th>2주차</th>
      <th>3주차</th>
      <th>4주차</th>
    </tr>
  `;

  users.forEach((user, index) => {
    const row = document.createElement('tr');
    row.id = `participant-row-${index}`;
    row.innerHTML = `
      <td><img src="${user.profileImage}" alt="${user.displayName}" width="50" height="50" /></td>
      <td>${user.displayName}</td>
      <td>${user.status.week1 || 'X'}</td>
      <td>${user.status.week2 || 'X'}</td>
      <td>${user.status.week3 || 'X'}</td>
      <td>${user.status.week4 || 'X'}</td>
    `;
    table.appendChild(row);
  });

  statusList.appendChild(table);
}
function searchParticipant() {
  const searchInput = document.getElementById('participant-search').value.trim().toLowerCase();
  const rows = document.querySelectorAll('#participant-table tr');

  if (!searchInput) {
    alert('검색할 이름을 입력하세요.');
    return;
  }

  let found = false;

  rows.forEach((row, index) => {
    if (index === 0) return; // Skip header row

    const nameCell = row.cells[1];
    if (nameCell && nameCell.textContent.toLowerCase().includes(searchInput)) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      row.style.backgroundColor = 'yellow'; // Highlight the row temporarily
      setTimeout(() => (row.style.backgroundColor = ''), 2000); // Remove highlight after 2 seconds
      found = true;
    }
  });

  if (!found) {
    alert('검색한 이름을 찾을 수 없습니다.');
  }
}

// Add event listener to search field for "Enter" key press
document.getElementById('participant-search').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault(); // Prevent form submission if within a form
    searchParticipant(); // Call search function
  }
});
// 현재 날짜 표시
function displayCurrentDate() {
  const currentDateDiv = document.getElementById('current-date');
  if (!currentDateDiv) return;

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  currentDateDiv.textContent = `${year}년 ${month}월`;
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  fetchUserStatus(); // 참가자 상태 불러오기
  displayCurrentDate(); // 현재 날짜 표시
});
