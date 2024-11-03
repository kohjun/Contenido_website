// Fetches participant status from the server and displays it in a table format
async function fetchUserStatus() {
  try {
    const response = await fetch('/events/participants/users'); // Fetch user data
    const users = await response.json();

    const statusList = document.getElementById('status-list');
    if (!statusList) return; // Ensure the element exists

    // Clear previous content
    statusList.innerHTML = '';

    // Create a table to display user data
    const table = document.createElement('table');
    table.innerHTML = `
      <tr>
        <th>프로필 사진</th>
        <th>이름</th>
        <th>[A-1]<br>불,원소,흙</th>
        <th>[B-1]<br>달려라 운동회</th>
        <th>[C-1]<br>야구볼 캐치</th>
        <th>[OT]<br>신입생 환영회</th>
        <th>연말 행사</th>
        <th>연말 행사</th>
        
        

      </tr>
    `;

    // Populate table rows with user data
    users.forEach(user => {
      const row = document.createElement('tr');
      const profileImage = user.profileImage || '/images/default-profile.png';
      row.innerHTML = `
        <td><img src="${profileImage}" alt="${user.displayName}" width="50" height="50" /></td>
        <td>${user.displayName}</td>
      `;
      table.appendChild(row);
    });

    // Append the table to the status list
    statusList.appendChild(table);
  } catch (error) {
    console.error('Error fetching user data:', error);
    document.getElementById('status-list').innerHTML = '<p class="error">Failed to load participant data. Please try again later.</p>';
  }
}

// Run fetchUserStatus when the document is ready
document.addEventListener('DOMContentLoaded', () => {
  const statusList = document.getElementById('status-list');
  if (statusList) {
    fetchUserStatus();
  }
});
