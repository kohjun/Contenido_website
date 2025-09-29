// frontend/src/hooks/useTeamBingo.js
import { useState, useEffect } from 'react';

export const useTeamBingo = () => {
  // 기본 상태 - 초기 모드를 participant로 변경 ✅
  const [mode, setMode] = useState('participant');
  const [activeTab, setActiveTab] = useState('activities');
  const [currentActivity, setCurrentActivity] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [allUsersData, setAllUsersData] = useState([]);
  
  // 활동 관리 상태
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState({
    title: '',
    startDate: '',
    endDate: '',
    description: '',
    targetBingos: 2
  });

  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  
  // 팀 설정 상태
  const [teamSettings, setTeamSettings] = useState({
    membersPerTeam: 4
  });

  // 팀 및 미션 상태
  const [teams, setTeams] = useState([]);
  const [isCreatingTeams, setIsCreatingTeams] = useState(false);
  const [bingoMissions, setBingoMissions] = useState(
    Array(9).fill(null).map((_, index) => ({
      id: index,
      title: '',
      description: '',
      type: 'simple',
      targetCount: 1,
      row: Math.floor(index / 3),
      col: index % 3
    }))
  );

  // 참가자 모드 상태
  const [myActivities, setMyActivities] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  
  // 모니터링 및 조원 관리 상태
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [unassignedMembers, setUnassignedMembers] = useState([]);

  // API 함수들
  const checkUserRole = async () => {
    try {
      const response = await fetch('/user/info_database');
      const data = await response.json();
      setUserRole(data);
      
      // 역할만 저장하고 모드는 기본값(participant) 유지 ✅
      // 사용자가 직접 관리자 모드 버튼을 눌러야 전환됨
    } catch (error) {
      console.error('사용자 역할 확인 오류:', error);
      // 오류 발생 시에도 participant 모드 유지
    }
  };

  const loadActivities = async () => {
    try {
      const response = await fetch('/api/bingo/activities');
      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error('활동 로드 오류:', error);
    }
  };

  const loadMembers = async () => {
    if (!currentActivity) return;
    
    try {
      const response = await fetch('/user/participants/users');
      const userData = await response.json();
      
      const transformedData = userData.map(user => ({
        id: user.id,
        name: user.name || '이름 없음',
        role: user.role === 'participant' ? '참가자' : 
              user.role === 'starter' ? '스타터' : 
              user.role === 'officer' ? '운영진' : user.role || '역할 없음',
        age: user.birthDate ? new Date().getFullYear() - new Date(user.birthDate).getFullYear() + 1 : null,
        gender: user.gender === 'male' ? '남성' : 
               user.gender === 'female' ? '여성' : '기타',
        department: user.department || '',
        team: user.team || '',
        isParticipant: currentActivity.participants.some(p => (p._id || p) === user.id)
      }));
      
      setAllUsersData(transformedData);
    } catch (error) {
      console.error('멤버 로드 오류:', error);
      setAllUsersData([]);
    }
  };

  const loadTeams = async () => {
    if (!currentActivity) return;
    
    try {
      const response = await fetch(`/api/bingo/activities/${currentActivity._id}/teams`);
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('팀 로드 오류:', error);
    }
  };

  // 미배정 인원 로드 - 올바른 엔드포인트 사용 ✅
  const loadUnassignedMembers = async () => {
    if (!currentActivity) return;
    
    try {
      const response = await fetch(`/api/bingo/activities/${currentActivity._id}/unassigned`);
      const data = await response.json();
      setUnassignedMembers(data);
    } catch (error) {
      console.error('미배정 인원 로드 오류:', error);
    }
  };

  const createActivity = async () => {
    if (!newActivity.title || !newActivity.startDate || !newActivity.endDate) {
      alert('필수 정보를 모두 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/api/bingo/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newActivity)
      });

      if (response.ok) {
        const activity = await response.json();
        setCurrentActivity(activity);
        await loadActivities();
        setNewActivity({
          title: '',
          startDate: '',
          endDate: '',
          description: '',
          targetBingos: 2
        });
        alert('활동이 생성되었습니다.');
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || '활동 생성에 실패했습니다.');
      }
    } catch (error) {
      alert('오류: ' + error.message);
      return false;
    }
  };

  const selectActivity = async (activityId) => {
    try {
      const response = await fetch(`/api/bingo/activities/${activityId}`);
      if (response.ok) {
        const activity = await response.json();
        setCurrentActivity(activity);
        setBingoMissions(activity.bingoMissions.length > 0 ? activity.bingoMissions : bingoMissions);
        await loadMembers();
        await loadTeams();
      }
    } catch (error) {
      console.error('활동 선택 오류:', error);
    }
  };

  const toggleMember = async (userId) => {
    if (!currentActivity) return;
    
    try {
      const isCurrentlySelected = currentActivity.participants.some(p => (p._id || p) === userId);
      const action = isCurrentlySelected ? 'remove' : 'add';
      
      const response = await fetch(`/api/bingo/activities/${currentActivity._id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: [userId],
          action: action
        })
      });
      
      if (response.ok) {
        const updatedActivity = await response.json();
        setCurrentActivity(updatedActivity);
        await loadMembers();
      }
    } catch (error) {
      alert('오류: ' + error.message);
    }
  };

  // 역할별 일괄 추가/제거
  const bulkToggleByRole = async (role) => {
    if (!currentActivity) return;
    
    try {
      // allUsersData에서 직접 필터링 (추가 API 호출 불필요!)
      const roleUsers = allUsersData.filter(user => {
        if (role === 'participant') return user.role === '참가자';
        if (role === 'starter') return user.role === '스타터';
        if (role === 'officer') return user.role === '운영진';
        return false;
      });
      
      const roleUserIds = roleUsers.map(user => user.id);
      
      if (roleUserIds.length === 0) {
        alert('해당 역할의 사용자가 없습니다.');
        return;
      }
      
      // 현재 활동에 포함된 사용자인지 확인
      const allIncluded = roleUserIds.every(userId => 
        currentActivity.participants.some(p => (p._id || p) === userId)
      );
      
      const action = allIncluded ? 'remove' : 'add';
      const roleName = role === 'participant' ? '참가자' : 
                      role === 'starter' ? '스타터' : '운영진';
      
      if (!confirm(`모든 ${roleName}을(를) ${action === 'add' ? '추가' : '제거'}하시겠습니까? (${roleUserIds.length}명)`)) {
        return;
      }
      
      // 기존 participants API 사용
      const response = await fetch(`/api/bingo/activities/${currentActivity._id}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userIds: roleUserIds, 
          action 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentActivity(data);
        await loadMembers();
        alert(`${roleUserIds.length}명의 ${roleName}이 ${action === 'add' ? '추가' : '제거'}되었습니다.`);
        return true;
      }
    } catch (error) {
      alert('오류: ' + error.message);
      return false;
    }
  };

  const createTeams = async () => {
    if (!currentActivity) return;
    
    if (currentActivity.participants.length === 0) {
      alert('참가자가 없습니다. 먼저 멤버를 추가해주세요.');
      return;
    }
    
    if (!confirm(`조별 ${teamSettings.membersPerTeam}명으로 조를 생성하시겠습니까?\n\n⏱️ 조 생성에는 수 초가 소요될 수 있습니다.`)) {
      return;
    }
    
    setIsCreatingTeams(true);
    
    try {
      const response = await fetch(`/api/bingo/activities/${currentActivity._id}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membersPerTeam: teamSettings.membersPerTeam })
      });
      
      if (response.ok) {
        await loadTeams();
        await loadUnassignedMembers();
        alert('조가 성공적으로 생성되었습니다.');
        return true;
      } else {
        const error = await response.json();
        throw new Error(error.message || '조 생성에 실패했습니다.');
      }
    } catch (error) {
      alert('오류: ' + error.message);
      return false;
    } finally {
      setIsCreatingTeams(false);
    }
  };

  const setTeamLeader = async (teamId, memberId) => {
    try {
      const response = await fetch(`/api/bingo/teams/${teamId}/leader`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaderId: memberId })
      });
      
      if (response.ok) {
        await loadTeams();
        alert('조장이 임명되었습니다.');
        return true;
      }
    } catch (error) {
      alert('오류: ' + error.message);
      return false;
    }
  };

  // 조원 추가
  const addMemberToTeam = async (teamId, userId) => {
    try {
      const response = await fetch(`/api/bingo/teams/${teamId}/members/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      if (response.ok) {
        await loadTeams();
        await loadUnassignedMembers();
        alert('조원이 추가되었습니다.');
        return true;
      } else {
        const error = await response.json();
        alert(error.message || '조원 추가에 실패했습니다.');
        return false;
      }
    } catch (error) {
      alert('오류: ' + error.message);
      return false;
    }
  };

  // 조원 제거
  const removeMemberFromTeam = async (teamId, userId) => {
    if (!confirm('정말로 이 조원을 제거하시겠습니까?')) {
      return false;
    }
    
    try {
      const response = await fetch(`/api/bingo/teams/${teamId}/members/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      
      if (response.ok) {
        await loadTeams();
        await loadUnassignedMembers();
        alert('조원이 제거되었습니다.');
        return true;
      }
    } catch (error) {
      alert('오류: ' + error.message);
      return false;
    }
  };

  // 조원 이동
  const moveMemberToTeam = async (sourceTeamId, targetTeamId, userId) => {
    if (!confirm('이 조원을 다른 조로 이동하시겠습니까?')) {
      return false;
    }
    
    try {
      const response = await fetch(`/api/bingo/teams/${sourceTeamId}/members/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetTeamId })
      });
      
      if (response.ok) {
        await loadTeams();
        alert('조원이 이동되었습니다.');
        return true;
      } else {
        const errorData = await response.json();
        alert('오류: ' + (errorData.message || '조원 이동에 실패했습니다.'));
        return false;
      }
    } catch (error) {
      alert('오류: ' + error.message);
      return false;
    }
  };

  // 조 이름 수정 함수 수정
const updateTeamName = async (teamId, newName) => {
  try {
    const response = await fetch(`/api/bingo/teams/${teamId}/name`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const updatedTeam = await response.json();
    setMyTeam(updatedTeam);
    alert('조 이름이 수정되었습니다.');
  } catch (error) {
    console.error('조 이름 수정 실패:', error);
    alert(error.message || '조 이름 수정에 실패했습니다.');
  }
};

  const saveMissions = async () => {
    try {
      const response = await fetch(`/api/bingo/activities/${currentActivity._id}/missions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bingoMissions })
      });
      
      if (response.ok) {
        alert('미션 설정이 저장되었습니다.');
        return true;
      } else {
        throw new Error('미션 저장에 실패했습니다.');
      }
    } catch (error) {
      alert('오류: ' + error.message);
      return false;
    }
  };

  const loadParticipantData = async () => {
    try {
      const response = await fetch('/api/bingo/my-activities');
      const data = await response.json();
      setMyActivities(data);
    } catch (error) {
      console.error('참가자 데이터 로드 오류:', error);
    }
  };

  const loadMyTeam = async (activityId) => {
    try {
      const response = await fetch(`/api/bingo/activities/${activityId}/my-team`);
      const data = await response.json();
      setMyTeam(data);
    } catch (error) {
      console.error('내 조 정보 로드 오류:', error);
    }
  };

  const loadTeamDetail = async (teamId) => {
    try {
      const response = await fetch(`/api/bingo/teams/${teamId}`);
      const data = await response.json();
      setSelectedTeam(data);
    } catch (error) {
      console.error('팀 상세 정보 로드 오류:', error);
    }
  };

  const toggleMissionComplete = async (teamId, missionId) => {
    try {
      const response = await fetch(`/api/bingo/teams/${teamId}/missions/${missionId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        await loadTeamDetail(teamId);
        await loadTeams();
        return true;
      }
    } catch (error) {
      console.error('미션 토글 오류:', error);
    }
  };

  const adjustMissionCount = async (teamId, missionId, increment) => {
    try {
      const response = await fetch(`/api/bingo/teams/${teamId}/missions/${missionId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment })
      });
      
      if (response.ok) {
        const data = await response.json();
        await loadTeamDetail(teamId);
        await loadTeams();
        return data;
      }
    } catch (error) {
      console.error('미션 카운트 조정 오류:', error);
    }
  };

  const getFilteredMembers = () => {
    return allUsersData.filter(member => {
      const memberName = member.name || '';
      const searchTermLower = (searchTerm || '').toLowerCase();
      
      const matchesSearch = memberName.toLowerCase().includes(searchTermLower);
      const matchesRole = !selectedDepartment || member.role === selectedDepartment;
      return matchesSearch && matchesRole;
    });
  };

  const getActivityStatus = (activity) => {
    const now = new Date();
    const start = new Date(activity.startDate);
    const end = new Date(activity.endDate);
    
    if (!activity.isActive) return '비활성';
    if (now < start) return '예정';
    if (now >= start && now <= end) return '진행중';
    if (activity.isCompleted) return '완료';
    return '종료';
  };

  const isTabDisabled = (tab) => {
    return !currentActivity && ['members', 'teams', 'missions', 'monitoring'].includes(tab);
  };

  // Effects - 초기 로드 시 참가자 데이터를 먼저 로드 ✅
  useEffect(() => {
    const initializeApp = async () => {
      await checkUserRole();        // 1. 역할 확인
      await loadParticipantData();  // 2. 참가자 데이터 먼저 로드
      await loadActivities();       // 3. 관리자용 데이터도 로드
    };
    
    initializeApp();
  }, []);

  useEffect(() => {
    if (mode === 'participant') {
      loadParticipantData();
    }
  }, [mode]);

  useEffect(() => {
    if (activeTab === 'members' && currentActivity) {
      loadMembers();
    }
  }, [activeTab, currentActivity]);

  useEffect(() => {
    if (activeTab === 'teams' && currentActivity) {
      loadTeams();
      loadUnassignedMembers();
    }
  }, [activeTab, currentActivity]);

  useEffect(() => {
    if (activeTab === 'monitoring' && currentActivity) {
      loadTeams();
    }
  }, [activeTab, currentActivity]);

  return {
    // 상태
    mode,
    setMode,
    activeTab,
    setActiveTab,
    currentActivity,
    setCurrentActivity,
    userRole,
    allUsersData,
    activities,
    newActivity,
    setNewActivity,
    searchTerm,
    setSearchTerm,
    selectedDepartment,
    setSelectedDepartment,
    teamSettings,
    setTeamSettings,
    teams,
    isCreatingTeams,
    bingoMissions,
    setBingoMissions,
    myActivities,
    myTeam,
    setMyTeam,
    selectedTeam,
    setSelectedTeam,
    unassignedMembers,
    
    // 함수들
    createActivity,
    selectActivity,
    toggleMember,
    bulkToggleByRole,
    createTeams,
    setTeamLeader,
    saveMissions,
    loadMyTeam,
    loadTeamDetail,
    toggleMissionComplete,
    adjustMissionCount,
    getFilteredMembers,
    getActivityStatus,
    isTabDisabled,
    loadUnassignedMembers,
    addMemberToTeam,
    removeMemberFromTeam,
    moveMemberToTeam,
    updateTeamName
  };
};