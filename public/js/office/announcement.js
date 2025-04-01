class AnnouncementManager {
  constructor() {
    this.initializeEventListeners();
    this.loadAnnouncements();
  }

  async loadAnnouncements() {
    try {
      const response = await fetch('/announcement/admin');
      if (!response.ok) {
        throw new Error('Failed to load announcements');
      }
      const announcements = await response.json();
      this.renderAnnouncements(announcements);
    } catch (error) {
      console.error('Error loading announcements:', error);
      alert('공지사항을 불러오는데 실패했습니다.');
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
      const response = await fetch('/announcement', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.fromEntries(formData))
      });
      
      if (!response.ok) {
        throw new Error('Failed to create announcement');
      }

      await this.loadAnnouncements();
      e.target.reset();
      alert('공지사항이 성공적으로 등록되었습니다.');
    } catch (error) {
      console.error('Error creating announcement:', error);
      alert('공지사항 등록에 실패했습니다.');
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
      const response = await fetch(`/announcement/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        this.loadAnnouncements();
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  }

  showEditForm(id) {
    const announcement = document.querySelector(`.announcement-item[data-id="${id}"]`);
    const modal = document.getElementById('edit-modal');
    
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-title').value = announcement.querySelector('h3').textContent;
    document.getElementById('edit-content').value = announcement.querySelector('.announcement-content').textContent;
    document.getElementById('edit-priority').value = announcement.querySelector('.priority').textContent;
    
    modal.style.display = 'block';
    
    document.getElementById('edit-announcement-form').onsubmit = async (e) => {
      e.preventDefault();
      await this.updateAnnouncement(new FormData(e.target));
      modal.style.display = 'none';
    };
  }

  async updateAnnouncement(formData) {
    const id = document.getElementById('edit-id').value;
    try {
      const response = await fetch(`/announcement/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(Object.fromEntries(formData))
      });

      if (!response.ok) throw new Error('Failed to update announcement');
      
      await this.loadAnnouncements();
      alert('공지사항이 성공적으로 수정되었습니다.');
    } catch (error) {
      console.error('Error updating announcement:', error);
      alert('공지사항 수정에 실패했습니다.');
    }
  }
}

window.addEventListener('load', () => {
  new AnnouncementManager();
});
