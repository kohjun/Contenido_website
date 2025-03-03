// public/js/applications.js
document.addEventListener('DOMContentLoaded', async () => {
  let currentRole = 'all';
  let searchTerm = '';
  let filteredApplicants = [];
  let allApplicants = [];

  // 초기 데이터 로드
  await loadApplicants();
  await loadStats();

  // 필터와 검색 이벤트 리스너 설정
  document.getElementById('search-input')?.addEventListener('input', handleSearch);
  document.querySelectorAll('.filter-button').forEach(button => {
    button.addEventListener('click', () => applyFilter(button.dataset.filter));
  });

  // 지원자 데이터 로드
  async function loadApplicants() {
    try {
      const response = await fetch('/application/all');
      if (!response.ok) {
        throw new Error('지원자 목록을 가져오는데 실패했습니다');
      }
      
      const users = await response.json();
      allApplicants = users.filter(user => user.application); // 지원서가 있는 사용자만 필터링
      filteredApplicants = [...allApplicants];
      
      renderApplicants();
    } catch (error) {
      console.error('Error loading applicants:', error);
      document.getElementById('applicants-container').innerHTML = `
        <div class="error-message">
          <p>${error.message}</p>
          <button onclick="window.loadApplicants()">다시 시도</button>
        </div>
      `;
    }
  }

  // 통계 데이터 로드
  async function loadStats() {
    try {
      const response = await fetch('/application/stats');
      if (!response.ok) {
        throw new Error('통계 데이터를 가져오는데 실패했습니다');
      }
  
      const stats = await response.json();
  
      // 통계 업데이트
      document.getElementById('total-count').textContent = stats.total || 0;
      document.getElementById('pending-count').textContent = stats.pending || 0;
      document.getElementById('accepted-count').textContent = stats.accepted || 0;
      document.getElementById('rejected-count').textContent = stats.rejected || 0;
      document.getElementById('officer-count').textContent = stats.wantOfficer || 0;
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  // 검색 처리
  function handleSearch(e) {
    searchTerm = e.target.value.toLowerCase();
    applyFilter(currentRole);
  }

  // 필터 적용
  function applyFilter(filter) {
    currentRole = filter;
    
    // 기본 필터링
    if (filter === 'all') {
      filteredApplicants = [...allApplicants];
    } else if (filter === 'pending') {
      filteredApplicants = allApplicants.filter(a => a.application?.status === 'pending');
    } else if (filter === 'accepted') {
      filteredApplicants = allApplicants.filter(a => a.application?.status === 'accepted');
    } else if (filter === 'rejected') {
      filteredApplicants = allApplicants.filter(a => a.application?.status === 'rejected');
    } else if (filter === 'officer') {
      filteredApplicants = allApplicants.filter(a => a.application?.wantOfficer);
    }

    // 검색어 적용
    if (searchTerm) {
      filteredApplicants = filteredApplicants.filter(applicant => 
        applicant.name?.toLowerCase().includes(searchTerm) ||
        applicant.displayName?.toLowerCase().includes(searchTerm) ||
        applicant.email?.toLowerCase().includes(searchTerm) ||
        applicant.application?.school?.toLowerCase().includes(searchTerm)
      );
    }

    // 필터 버튼 스타일 업데이트
    document.querySelectorAll('.filter-button').forEach(button => {
      button.classList.toggle('active', button.dataset.filter === filter);
    });

    renderApplicants();
  }

  // 지원자 목록 렌더링
  function renderApplicants() {
    const container = document.getElementById('applicants-container');
    
    if (!filteredApplicants || filteredApplicants.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>일치하는 지원자가 없습니다</p>
        </div>
      `;
      return;
    }

    const applicantsHtml = filteredApplicants.map(applicant => `
      <div class="applicant-card">
        <div class="profile-section">
          <img src="${applicant.profileImage || '/images/basic_Image.png'}" alt="Profile" class="profile-image">
          <div>
            <h3>${applicant.name || applicant.displayName}</h3>
            <p>${applicant.email}</p>
          </div>
        </div>
        
        <div>
          <p><strong>학교:</strong> ${applicant.application?.school || '정보 없음'}</p>
          <p><strong>지원일:</strong> ${new Date(applicant.application?.appliedAt).toLocaleDateString()}</p>
          <div>
            <span class="status-badge ${getStatusClass(applicant.application?.status)}">
              ${getStatusText(applicant.application?.status)}
            </span>
            ${applicant.application?.wantOfficer ? '<span class="status-badge want-officer">운영진 희망</span>' : ''}
          </div>
        </div>
        
        <div class="action-buttons">
          <button class="view-button" onclick="viewApplicantDetail('${applicant._id}')">상세 보기</button>
          ${applicant.application?.status === 'pending' ? `
            <button class="accept-button" onclick="updateApplicantStatus('${applicant._id}', 'accepted')">합격</button>
            <button class="reject-button" onclick="updateApplicantStatus('${applicant._id}', 'rejected')">불합격</button>
          ` : ''}
        </div>
      </div>
    `).join('');

    container.innerHTML = `<div class="applicant-grid">${applicantsHtml}</div>`;
  }

  // 상태 관련 유틸리티 함수들
  function getStatusClass(status) {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'accepted': return 'status-accepted';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  }

  function getStatusText(status) {
    switch (status) {
      case 'pending': return '심사중';
      case 'accepted': return '합격';
      case 'rejected': return '불합격';
      default: return '상태 없음';
    }
  }

  // 전역 함수들
  window.updateApplicantStatus = async function(id, status) {
    try {
      const response = await fetch(`/application/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('상태 업데이트에 실패했습니다');
      }

      await loadApplicants();
      await loadStats();
      closeModal();
      
      alert(`지원자 상태가 "${status === 'accepted' ? '합격' : '불합격'}"으로 변경되었습니다.`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.message);
    }
  };

  window.viewApplicantDetail = function(id) {
    const applicant = allApplicants.find(a => a._id === id);
    if (!applicant) return;

    const modal = document.getElementById('detail-modal');
    const content = document.getElementById('applicant-detail');

    // 생년월일 형식 변환 함수
    const formatBirthDate = (birthDate) => {
      if (!birthDate) return '정보 없음';
      const date = new Date(birthDate);
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    };

    // 성별 텍스트 변환 함수
    const getGenderText = (gender) => {
      if (!gender) return '정보 없음';
      return gender === 'female' ? '여자' : '남자';
    };

    content.innerHTML = `
      <span class="close-modal" onclick="closeModal()">&times;</span>
      <div class="detail-header">
        <img src="${applicant.profileImage || '/images/basic_Image.png'}" alt="Profile" class="profile-image">
        <div>
          <h2>${applicant.name || applicant.displayName}</h2>
          <p>${applicant.email}</p>
        </div>
      </div>

      <div class="detail-status">
        <span class="status-badge ${getStatusClass(applicant.application?.status)}">
          ${getStatusText(applicant.application?.status)}
        </span>
        ${applicant.application?.wantOfficer ? '<span class="status-badge want-officer">운영진 희망</span>' : ''}
      </div>

      <div class="detail-content">
        <h3>기본 정보</h3>
        <p><strong>학교:</strong> ${applicant.application?.school || '정보 없음'}</p>
        <p><strong>생년월일:</strong> ${formatBirthDate(applicant.birthDate)}</p>
        <p><strong>성별:</strong> ${getGenderText(applicant.gender)}</p>
        <p><strong>거주지:</strong> ${applicant.application?.address || '정보 없음'}</p>
        <p><strong>지원일:</strong> ${new Date(applicant.application?.appliedAt).toLocaleDateString()}</p>
        ${applicant.application?.processedAt ? 
          `<p><strong>처리일:</strong> ${new Date(applicant.application.processedAt).toLocaleDateString()}</p>` : ''}

        <h3>지원 동기</h3>
        <div class="motivation-text">
          ${applicant.application?.motivation || '정보 없음'}
        </div>

        ${applicant.application?.wantOfficer ? `
          <h3>기획 내용</h3>
          <div class="planning-text">
            ${applicant.application?.planningContent || '정보 없음'}
          </div>
        ` : ''}
      </div>

      ${applicant.application?.status === 'pending' ? `
        <div class="detail-actions">
          <button class="accept-button" onclick="updateApplicantStatus('${applicant._id}', 'accepted')">합격</button>
          <button class="reject-button" onclick="updateApplicantStatus('${applicant._id}', 'rejected')">불합격</button>
        </div>
      ` : ''}
    `;

    modal.style.display = 'block';

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeModal();
      }
    });

    // 모달 외부 클릭으로 닫기
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });
  };

  window.closeModal = function() {
    document.getElementById('detail-modal').style.display = 'none';
  };

  // 전역 함수 노출
  window.loadApplicants = loadApplicants;
  window.loadStats = loadStats;
});