// public/js/participation.js

// Fetches participant status from the server and displays it in a table format
async function fetchUserStatus() {
  try {
    const response = await fetch('/events/participants/users'); // Fetch user data
    const users = await response.json();

    const statusList = document.getElementById('status-list');

    // Clear previous content
    statusList.innerHTML = '';

    // Create a table to display user data
    const table = document.createElement('table');
    table.innerHTML = `
      <tr>
        <th>Profile Image</th>
        <th>Display Name</th>
      </tr>
    `;

    // Populate table rows with user data
    users.forEach(user => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><img src="${user.profileImage}" alt="${user.displayName}" width="50" height="50" /></td>
        <td>${user.displayName}</td>
      `;
      table.appendChild(row);
    });

    // Append the table to the status list
    statusList.appendChild(table);
  } catch (error) {
    console.error('Error fetching user data:', error);
  }
}

// Run fetchUserStatus when the document is ready
document.addEventListener('DOMContentLoaded', fetchUserStatus);
