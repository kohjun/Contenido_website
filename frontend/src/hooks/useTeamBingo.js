// hooks/useTeamBingo.js
import { useState, useEffect } from 'react';

export const useTeamBingo = () => {
  // 기본 상태
  const [mode, setMode] = useState('admin');
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
  
  // 모니터링 상태
  const [selectedTeam, setSelectedTeam] = useState(null);

  // API 함수들
  const checkUserRole = async () => {
    try {
      const response = await fetch('/user/info_database');
      const data = await response.json();
      setUserRole(data);
      
      // participant나 starter는 무조건 participant 모드
      if (['participant', 'starter'].includes(data.role)) {
        setMode('participant');
      }
      // admin이거나 officer이면서 starterTeam인 경우만 admin 모드 가능
      else if ((data.role === 'admin') || (data.role === 'officer' && data.team === 'starterTeam')) {
        // 기본값은 admin 모드로 설정
      } else {
        // 그 외는 participant 모드
        setMode('participant');
      }
    } catch (error) {
      console.error('사용자 역할 확인 오류:', error);
      setMode('participant');
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
        role: user.role === 'participant' ? '일반회원' : 
              user.role === 'starter' ? '스타터' : 
              user.role === 'officer' ? '운영진' : user.role || '역할 없음',
        age: user.birthDate ? new Date().getFullYear() - new Date(user.birthDate).getFullYear() + 1 : null,
        gender: user.gender === 'male' ? '남성' : 
               user.gender === 'female' ? '여성' : '기타',
        department: user.department || '',
        team: user.team || ''
      }));
      
      setAllUsersData(transformedData);
    } catch (error) {
      console.error('멤버 로드 오류:', error);
      setAllUsersData([]); // 오류 시 빈 배열로 설정
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
        setBingoMissions(activity.bingoMissions);
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
      const isCurrentlySelected = currentActivity.participants.some(p => p._id === userId);
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

  const createTeams = async () => {
    if (!currentActivity) return;
    
    if (currentActivity.participants.length === 0) {
      alert('참가자가 없습니다. 먼저 멤버를 추가해주세요.');
      return;
    }
    
    if (!confirm(`조별 ${teamSettings.membersPerTeam}명으로 조를 생성하시겠습니까?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/bingo/activities/${currentActivity._id}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membersPerTeam: teamSettings.membersPerTeam })
      });
      
      if (response.ok) {
        await loadTeams();
        alert('조가 성공적으로 생성되었습니다.');
        return true;
      }
    } catch (error) {
      alert('오류: ' + error.message);
      return false;
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

  // 특정 팀 상세 정보 로드
  const loadTeamDetail = async (teamId) => {
    try {
      const response = await fetch(`/api/bingo/teams/${teamId}`);
      const data = await response.json();
      setSelectedTeam(data);
    } catch (error) {
      console.error('팀 상세 정보 로드 오류:', error);
    }
  };

  // 미션 완료 토글 (관리자)
  const toggleMissionComplete = async (teamId, missionId) => {
    try {
      const response = await fetch(`/api/bingo/teams/${teamId}/missions/${missionId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        // 선택된 팀 정보 다시 로드
        await loadTeamDetail(teamId);
        await loadTeams();
        return data;
      }
    } catch (error) {
      console.error('미션 토글 오류:', error);
    }
  };

  // 카운트 미션 조정 (관리자)
  const adjustMissionCount = async (teamId, missionId, increment) => {
    try {
      const response = await fetch(`/api/bingo/teams/${teamId}/missions/${missionId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment })
      });
      
      if (response.ok) {
        const data = await response.json();
        // 선택된 팀 정보 다시 로드
        await loadTeamDetail(teamId);
        await loadTeams();
        return data;
      }
    } catch (error) {
      console.error('미션 카운트 조정 오류:', error);
    }
  };

  // 유틸리티 함수들
  const getFilteredMembers = () => {
    return allUsersData.filter(member => {
      // member.name이 존재하고 문자열인지 확인
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

  // Effects
  useEffect(() => {
    checkUserRole();
    loadActivities();
  }, []);

  useEffect(() => {
    if (mode === 'participant') {
      loadParticipantData();
    }
  }, [mode]);

  useEffect(() => {
    if (activeTab === 'members' && currentActivity) {
      loadMembers();
    } else if (activeTab === 'teams' && currentActivity) {
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
    bingoMissions,
    setBingoMissions,
    myActivities,
    myTeam,
    setMyTeam,
    selectedTeam,
    setSelectedTeam,
    
    // 함수들
    createActivity,
    selectActivity,
    toggleMember,
    createTeams,
    setTeamLeader,
    saveMissions,
    loadMyTeam,
    loadTeamDetail,
    toggleMissionComplete,
    adjustMissionCount,
    getFilteredMembers,
    getActivityStatus,
    isTabDisabled
  };
};