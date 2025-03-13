class AnnouncementManager {
  constructor() {
    this.initializeEventListeners();
    this.loadAnnouncements();
  }

  async loadAnnouncements() {
    try {
      const response = await fetch('/api/announcements');
      const announcements = await response.json();
      this.renderAnnouncements(announcements);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  }

  renderAnnouncements(announcements) {
    const container = document.getElementById('announcements-list');
    container.innerHTML = announcements.map(ann => `
      <div class="announcement-item" data-id="${ann._id}">
        <div class="announcement-header">
          <h3>${ann.title}</h3>
          <span class="priority ${ann.priority}">${ann.priority}</span>
        </div>
        <div class="announcement-content">${ann.content}</div>
        <div class="announcement-footer">
          <span>By: ${ann.author.name}</span>
          <div class="actions">
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  initializeEventListeners() {
    document.getElementById('create-announcement-form')?.addEventListener('submit', this.handleCreate.bind(this));
    document.getElementById('announcements-list')?.addEventListener('click', this.handleActions.bind(this));
  }

  async handleCreate(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData))
      });
      if (response.ok) {
        this.loadAnnouncements();
        e.target.reset();
      }
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  }

  async handleActions(e) {
    const announcementId = e.target.closest('.announcement-item')?.dataset.id;
    if (!announcementId) return;

    if (e.target.classList.contains('delete-btn')) {
      if (confirm('정말 삭제하시겠습니까?')) {
        await this.deleteAnnouncement(announcementId);
      }
    } else if (e.target.classList.contains('edit-btn')) {
      this.showEditForm(announcementId);
    }
  }

  async deleteAnnouncement(id) {
    try {
      const response = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        this.loadAnnouncements();
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  }
}

window.addEventListener('load', () => {
  new AnnouncementManager();
});
