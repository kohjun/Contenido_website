async function fetchUserStatus() {
  try {
    const response = await fetch('/user/participants/users');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const users = await response.json();
    const statusList = document.getElementById('status-list');
    if (!statusList) return;

    // Clear previous content
    statusList.innerHTML = '';

    // Create a table
    const table = document.createElement('table');
    table.id = 'participant-table'; // Add an ID to the table for reference
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

    // Populate table rows with user data
    users.forEach((user, index) => {
      const row = document.createElement('tr');
      row.id = `participant-row-${index}`; // Add a unique ID for each row
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
  } catch (error) {
    console.error('Error fetching user data:', error);
    document.getElementById('status-list').innerHTML = '<p class="error">Failed to load participant data. Please try again later.</p>';
  }
}

// Search for a participant by name and scroll to their row
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

// Run fetchUserStatus when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  fetchUserStatus();
});
