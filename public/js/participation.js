// public/js/participation.js
async function fetchUserStatus() {
  try {
    // Updated URL to use the correct endpoint
    const response = await fetch('/user/participants/users');
    console.log('Response Status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const users = await response.json();
    console.log('Fetched users:', users);

    const statusList = document.getElementById('status-list');
    if (!statusList) return;

    // Clear previous content
    statusList.innerHTML = '';

    // Create a table
    const table = document.createElement('table');
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
    users.forEach(user => {
      const row = document.createElement('tr');
      const profileImage = user.profileImage || '/images/basic_Image.png';

      row.innerHTML = `
        <td><img src="${profileImage}" alt="${user.displayName}" width="50" height="50" /></td>
        <td>${user.displayName}</td>
        <td>${user.status.week1 || 'X'}</td>
        <td>${user.status.week2 || 'X'}</td>
        <td>${user.status.week3 || 'X'}</td>
        <td>${user.status.week4 || 'X'}</td>
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
  fetchUserStatus();
});
