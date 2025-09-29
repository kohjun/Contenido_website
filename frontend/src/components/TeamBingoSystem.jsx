import React from 'react';
import { Users, Plus, Shuffle, Target, BarChart3, User, Calendar, Settings, Grid3x3, Award, Eye, Edit3, Check, X, Search, UserPlus, UserMinus, Crown, Edit2, Save } from 'lucide-react';
import { useTeamBingo } from '../hooks/useTeamBingo';

const TeamBingoSystem = () => {
  const {
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
  } = useTeamBingo();

  return (
    <div className="min-h-screen bg-gray-50 p-5" style={{ fontFamily: "'GmarketSansMedium', sans-serif" }}>
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8 bg-white rounded-lg shadow-sm border p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">빙고 기반 조별활동 시스템</h1>
          <p className="text-gray-600 text-sm mb-6">효율적인 조별활동 관리 및 모니터링 시스템</p>
          
          {/* 현재 활동 표시 */}
          {currentActivity && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                📋 현재 관리 중인 활동: {currentActivity.title}
              </h3>
              <div className="text-sm text-blue-800">
                <span className="mr-4">📅 {new Date(currentActivity.startDate).toLocaleDateString()} ~ {new Date(currentActivity.endDate).toLocaleDateString()}</span>
                <span className="mr-4">👥 참가자: {currentActivity.participants.length}명</span>
                <span className="mr-4">🎯 목표 빙고: {currentActivity.targetBingos}개</span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  getActivityStatus(currentActivity) === '진행중' ? 'bg-green-100 text-green-800' :
                  getActivityStatus(currentActivity) === '완료' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {getActivityStatus(currentActivity)}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 justify-center">
            {/* 관리자 모드는 admin이거나 officer이면서 starterTeam인 경우에만 표시 */}
            {userRole && ((userRole.role === 'admin') || (userRole.role === 'officer' && userRole.team === 'starterTeam')) && (
              <button
                onClick={() => setMode('admin')}
                className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                  mode === 'admin' 
                    ? 'bg-gray-800 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Settings size={16} />
                관리자 모드
              </button>
            )}
            <button
              onClick={() => setMode('participant')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 flex items-center gap-2 ${
                mode === 'participant' 
                  ? 'bg-gray-800 text-white shadow-md' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <User size={16} />
              참가자 모드
            </button>
          </div>
        </div>

        {/* 관리자 모드 */}
        {mode === 'admin' && (
          <>
            {/* 탭 네비게이션 */}
            <div className="flex gap-3 mb-8 overflow-x-auto bg-white p-4 rounded-lg shadow-sm border">
              {[
                { id: 'activities', icon: Calendar, label: '활동 관리' },
                { id: 'members', icon: Users, label: '멤버 관리' },
                { id: 'teams', icon: Shuffle, label: '조 구성' },
                { id: 'missions', icon: Grid3x3, label: '미션 설정' },
                { id: 'monitoring', icon: BarChart3, label: '모니터링' }
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => !isTabDisabled(id) && setActiveTab(id)}
                  disabled={isTabDisabled(id)}
                  title={isTabDisabled(id) ? '먼저 활동을 선택해주세요' : ''}
                  className={`flex items-center gap-2 px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                    activeTab === id
                      ? 'bg-gray-800 text-white shadow-md'
                      : isTabDisabled(id)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>

            {/* 활동 미선택 시 안내 메시지 */}
            {!currentActivity && activeTab !== 'activities' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-100 rounded-full p-2">
                    <Calendar size={20} className="text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-yellow-800">활동을 먼저 선택해주세요</h3>
                    <p className="text-sm text-yellow-700">
                      {activeTab === 'members' && '멤버 관리를 위해서는'}
                      {activeTab === 'teams' && '조 구성을 위해서는'}
                      {activeTab === 'missions' && '미션 설정을 위해서는'}
                      {activeTab === 'monitoring' && '모니터링을 위해서는'}
                      {' '}먼저 "활동 관리" 탭에서 활동을 선택하거나 새로 생성해주세요.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 활동 관리 탭 */}
            {activeTab === 'activities' && (
              <div className="space-y-6">
                {/* 새 활동 생성 */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">새 활동 생성</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">활동 제목 *</label>
                      <input
                        type="text"
                        value={newActivity.title}
                        onChange={(e) => setNewActivity({...newActivity, title: e.target.value})}
                        placeholder="예: 2025년 4분기 조별활동"
                        className="w-full px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">목표 빙고 개수</label>
                      <input
                        type="number"
                        value={newActivity.targetBingos}
                        onChange={(e) => setNewActivity({...newActivity, targetBingos: parseInt(e.target.value) || 2})}
                        min="1"
                        max="8"
                        className="w-full px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">시작일 *</label>
                      <input
                        type="date"
                        value={newActivity.startDate}
                        onChange={(e) => setNewActivity({...newActivity, startDate: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">종료일 *</label>
                      <input
                        type="date"
                        value={newActivity.endDate}
                        onChange={(e) => setNewActivity({...newActivity, endDate: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">활동 설명</label>
                    <textarea
                      value={newActivity.description}
                      onChange={(e) => setNewActivity({...newActivity, description: e.target.value})}
                      rows="3"
                      placeholder="활동에 대한 자세한 설명을 입력하세요"
                      className="w-full px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={createActivity}
                      className="px-6 py-3 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
                    >
                      <Plus size={18} />
                      활동 생성
                    </button>
                  </div>
                </div>

                {/* 기존 활동 목록 */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">기존 활동 목록</h2>
                  
                  {activities.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>생성된 활동이 없습니다.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activities.map((activity) => (
                        <div 
                          key={activity._id} 
                          className={`relative p-5 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                            currentActivity?._id === activity._id
                              ? 'border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-200'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => selectActivity(activity._id)}
                        >
                          {/* 선택 상태 표시 */}
                          {currentActivity?._id === activity._id && (
                            <div className="absolute top-3 right-3">
                              <div className="bg-blue-500 text-white rounded-full p-1">
                                <Check size={14} />
                              </div>
                            </div>
                          )}
                          
                          <h3 className={`text-lg font-bold mb-3 ${
                            currentActivity?._id === activity._id ? 'text-blue-700' : 'text-gray-900'
                          }`}>
                            {activity.title}
                          </h3>
                          
                          <div className="text-sm text-gray-600 space-y-2">
                            <p>📅 {new Date(activity.startDate).toLocaleDateString()} ~ {new Date(activity.endDate).toLocaleDateString()}</p>
                            <p>👥 참가자: {activity.participants.length}명</p>
                            <p>🎯 목표 빙고: {activity.targetBingos}개</p>
                            <div className="flex items-center gap-2">
                              <span>상태:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                getActivityStatus(activity) === '진행중' ? 'bg-green-100 text-green-800' :
                                getActivityStatus(activity) === '완료' ? 'bg-gray-100 text-gray-800' :
                                getActivityStatus(activity) === '예정' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {getActivityStatus(activity)}
                              </span>
                            </div>
                          </div>
                          
                          {currentActivity?._id === activity._id && (
                            <div className="mt-3 text-xs text-blue-700 font-medium bg-blue-100 px-3 py-2 rounded-md">
                              ✓ 현재 관리 중인 활동 - 탭을 통해 관리할 수 있습니다
                            </div>
                          )}
                          
                          {/* 클릭 유도 */}
                          {currentActivity?._id !== activity._id && (
                            <div className="mt-3 text-xs text-gray-500 italic">
                              클릭하여 이 활동을 선택하고 관리하세요
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 멤버 관리 탭 */}
            {activeTab === 'members' && currentActivity && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  멤버 관리 - {currentActivity.title}
                </h2>
                
                {/* 검색 및 필터 */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="relative md:col-span-2">
                    <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="이름으로 검색"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                    />
                  </div>
                  
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                  >
                    <option value="">모든 역할</option>
                    <option value="일반회원">일반회원</option>
                    <option value="스타터">스타터</option>
                    <option value="운영진">운영진</option>
                  </select>

                  <div className="text-sm text-gray-600 flex items-center justify-center bg-white rounded-md border px-3">
                    <div className="text-center">
                      <div className="font-medium">전체: {allUsersData.length}명</div>
                      <div className="text-blue-600 font-medium">선택: {currentActivity.participants.length}명</div>
                    </div>
                  </div>
                </div>

                {/* 멤버 목록 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto border rounded-lg p-4">
                  {getFilteredMembers().map((member) => {
                    const isParticipant = currentActivity.participants.some(p => p._id === member.id);
                    return (
                      <div
                        key={member.id}
                        className={`p-4 border rounded-lg transition-all duration-200 ${
                          isParticipant 
                            ? 'border-gray-800 bg-gray-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{member.name || '이름 없음'}</h4>
                            <p className="text-sm text-blue-600">{member.role || '역할 없음'}</p>
                            <p className="text-sm text-gray-600">
                              {member.age ? member.age + '세' : '나이 미설정'} · {member.gender || '성별 미설정'}
                            </p>
                            {member.department && <p className="text-sm text-gray-600">{member.department}</p>}
                          </div>
                          <button
                            onClick={() => toggleMember(member.id)}
                            className={`p-2 rounded-md transition-all duration-200 ${
                              isParticipant
                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                            }`}
                          >
                            {isParticipant ? <UserMinus size={16} /> : <UserPlus size={16} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 조 구성 탭 */}
            {activeTab === 'teams' && currentActivity && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  조 구성 - {currentActivity.title}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 bg-gray-50 rounded-lg border">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">조별 인원 수</label>
                    <input
                      type="number"
                      value={teamSettings.membersPerTeam}
                      onChange={(e) => setTeamSettings({...teamSettings, membersPerTeam: parseInt(e.target.value) || 1})}
                      min="2"
                      max="10"
                      className="w-full px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-center bg-white rounded-md border px-3">
                    <div className="text-center text-sm">
                      <div className="font-medium">총 {currentActivity.participants.length}명 참가</div>
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={createTeams}
                      disabled={currentActivity.participants.length === 0}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                    >
                      <Shuffle size={18} />
                      조 생성
                    </button>
                  </div>
                </div>

                {/* 구성된 조 목록 */}
                {teams.length > 0 && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">조 목록</h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {teams.map((team) => (
                        <div key={team._id} className="border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-all">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1">
                              <h4 className="text-xl font-bold text-blue-600">{team.name}</h4>
                              <div className="text-sm text-gray-600">
                                빙고: {team.bingoCount || 0}개 | 진행률: {team.summary?.progressRate || 0}%
                              </div>
                            </div>
                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {team.members.length}명
                            </span>
                          </div>

                          <div className="space-y-2">
                            {team.members.map((member, index) => (
                              <div key={member._id} className="flex items-center gap-3 p-2 bg-gray-50 rounded border">
                                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                                  {index + 1}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{member.name}</span>
                                    {member._id === team.leaderId?._id && (
                                      <Crown size={14} className="text-yellow-500" />
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-500">{member.department || '부서 미설정'}</span>
                                </div>
                                {member._id !== team.leaderId?._id && (
                                  <button
                                    onClick={() => setTeamLeader(team._id, member._id)}
                                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
                                  >
                                    조장임명
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 미션 설정 탭 */}
            {activeTab === 'missions' && currentActivity && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  미션 설정 - {currentActivity.title}
                </h2>
                
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">빙고 미션 설정 안내</h4>
                  <p className="text-sm text-blue-800">3x3 빙고판의 각 칸에 들어갈 미션을 설정하세요. 미션은 단순형(완료/미완료)과 카운트형(횟수 달성)으로 나뉩니다.</p>
                </div>
                
                <div className="max-w-6xl mx-auto">
                  <h3 className="text-lg font-semibold mb-4 text-center">빙고 미션판</h3>
                  
                  {bingoMissions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="mb-6">
                        <div className="text-gray-400 mb-4">
                          <Grid3x3 size={64} className="mx-auto" />
                        </div>
                        <p className="text-gray-600 mb-2">미션이 설정되지 않았습니다.</p>
                        <p className="text-sm text-gray-500">아래 버튼을 클릭하여 9개의 빈 미션 칸을 생성하세요.</p>
                      </div>
                      <button
                        onClick={() => {
                          const defaultMissions = Array(9).fill(null).map((_, index) => ({
                            id: index,
                            title: '',
                            description: '',
                            type: 'simple',
                            targetCount: 1,
                            row: Math.floor(index / 3),
                            col: index % 3
                          }));
                          setBingoMissions(defaultMissions);
                        }}
                        className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                      >
                        <Plus size={18} className="inline mr-2" />
                        미션 칸 생성하기
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {bingoMissions.map((mission, index) => (
                          <div key={index} className="p-4 border-2 border-gray-300 rounded-lg bg-white hover:border-blue-400 transition-colors">
                            <div className="mb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-gray-700">미션 {mission.id + 1}</span>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">위치: ({mission.row}, {mission.col})</span>
                              </div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">미션 제목</label>
                              <input
                                type="text"
                                value={mission.title || ''}
                                onChange={(e) => {
                                  const updated = [...bingoMissions];
                                  updated[index] = { ...updated[index], title: e.target.value };
                                  setBingoMissions(updated);
                                }}
                                placeholder="예: 첫 정기모임 참가"
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              />
                            </div>
                            
                            <div className="mb-3">
                              <label className="block text-xs font-medium text-gray-600 mb-1">미션 타입</label>
                              <select
                                value={mission.type || 'simple'}
                                onChange={(e) => {
                                  const updated = [...bingoMissions];
                                  updated[index] = { ...updated[index], type: e.target.value };
                                  setBingoMissions(updated);
                                }}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                              >
                                <option value="simple">단순형 (완료/미완료)</option>
                                <option value="count">카운트형 (횟수 달성)</option>
                              </select>
                            </div>
                            
                            {mission.type === 'count' && (
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">목표 횟수</label>
                                <input
                                  type="number"
                                  value={mission.targetCount || 1}
                                  onChange={(e) => {
                                    const updated = [...bingoMissions];
                                    updated[index] = { ...updated[index], targetCount: parseInt(e.target.value) || 1 };
                                    setBingoMissions(updated);
                                  }}
                                  min="1"
                                  placeholder="목표 횟수"
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                />
                              </div>
                            )}
                            
                            <div className="mt-2 text-xs text-gray-500">
                              {mission.title ? `✓ ${mission.title}` : '미션 제목을 입력하세요'}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="text-center mt-8 flex gap-3 justify-center">
                        <button
                          onClick={() => {
                            if (confirm('모든 미션을 초기화하시겠습니까?')) {
                              const defaultMissions = Array(9).fill(null).map((_, index) => ({
                                id: index,
                                title: '',
                                description: '',
                                type: 'simple',
                                targetCount: 1,
                                row: Math.floor(index / 3),
                                col: index % 3
                              }));
                              setBingoMissions(defaultMissions);
                            }
                          }}
                          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                        >
                          🔄 미션 초기화
                        </button>
                        <button
                          onClick={saveMissions}
                          className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                        >
                          💾 미션 설정 저장
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 모니터링 탭 */}
            {activeTab === 'monitoring' && currentActivity && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">
                    모니터링 - {currentActivity.title}
                  </h2>
                  {selectedTeam && (
                    <button
                      onClick={() => setSelectedTeam(null)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-all flex items-center gap-2"
                    >
                      <X size={16} />
                      목록으로 돌아가기
                    </button>
                  )}
                </div>
                
                {teams.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>모니터링할 조가 없습니다.</p>
                    <p className="text-sm">조 구성을 먼저 진행해주세요.</p>
                  </div>
                ) : !selectedTeam ? (
                  <div className="space-y-6">
                    {/* 통계 요약 */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <h3 className="text-2xl font-bold text-blue-600">{currentActivity.participants.length}</h3>
                        <p className="text-sm text-gray-600">총 참가자</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <h3 className="text-2xl font-bold text-green-600">{teams.length}</h3>
                        <p className="text-sm text-gray-600">총 조 수</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <h3 className="text-2xl font-bold text-yellow-600">
                          {teams.length > 0 ? Math.round(teams.reduce((sum, team) => sum + (team.bingoCount || 0), 0) / teams.length * 10) / 10 : 0}
                        </h3>
                        <p className="text-sm text-gray-600">평균 빙고 수</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg text-center">
                        <h3 className="text-2xl font-bold text-red-600">
                          {teams.filter(team => (team.bingoCount || 0) >= currentActivity.targetBingos).length}
                        </h3>
                        <p className="text-sm text-gray-600">목표 달성 조</p>
                      </div>
                    </div>

                    {/* 조별 진행 현황 */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">조별 진행 현황 (클릭하여 상세보기)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse bg-white border rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-gray-800 text-white">
                              <th className="p-4 text-left">조명</th>
                              <th className="p-4 text-center">인원</th>
                              <th className="p-4 text-center">빙고 수</th>
                              <th className="p-4 text-center">진행률</th>
                              <th className="p-4 text-center">목표 달성</th>
                              <th className="p-4 text-center">상세보기</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teams.map((team, index) => (
                              <tr 
                                key={team._id} 
                                className={`border-b cursor-pointer hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                                onClick={() => loadTeamDetail(team._id)}
                              >
                                <td className="p-4 font-semibold">{team.name}</td>
                                <td className="p-4 text-center">{team.members.length}명</td>
                                <td className="p-4 text-center">
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                    (team.bingoCount || 0) >= currentActivity.targetBingos 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {team.bingoCount || 0}개
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full" 
                                        style={{ width: `${team.summary?.progressRate || 0}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm text-gray-600">{team.summary?.progressRate || 0}%</span>
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  {(team.bingoCount || 0) >= currentActivity.targetBingos ? (
                                    <span className="text-green-600 font-medium">✓ 달성</span>
                                  ) : (
                                    <span className="text-red-600">미달성</span>
                                  )}
                                </td>
                                <td className="p-4 text-center">
                                  <Eye size={18} className="mx-auto text-blue-600" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 조 상세 빙고 현황 */
                  <div className="space-y-6">
                    {/* 조 정보 */}
                    <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-2xl font-bold text-blue-900 mb-2">{selectedTeam.name}</h3>
                          <div className="text-blue-800 space-y-1">
                            <p>조원: {selectedTeam.members?.length}명</p>
                            <p>빙고 달성: <span className="font-bold">{selectedTeam.bingoCount || 0}개</span></p>
                            <p>진행률: <span className="font-bold">{selectedTeam.summary?.progressRate || 0}%</span></p>
                          </div>
                        </div>
                        <div className="text-right">
                          {(selectedTeam.bingoCount || 0) >= currentActivity.targetBingos ? (
                            <span className="px-4 py-2 bg-green-500 text-white rounded-full font-bold">
                              목표 달성!
                            </span>
                          ) : (
                            <span className="px-4 py-2 bg-yellow-500 text-white rounded-full font-bold">
                              진행 중
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 빙고판 */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">빙고 현황 (칸을 클릭하여 완료 처리)</h3>
                      <div className="grid grid-cols-3 gap-3 max-w-3xl mx-auto">
                        {/* 3x3 빙고판 */}
                        {[0, 1, 2].map(row => (
                          [0, 1, 2].map(col => {
                            const progress = selectedTeam.progress?.find(p => {
                              const mission = currentActivity.bingoMissions.find(m => m.id === p.missionId);
                              return mission && mission.row === row && mission.col === col;
                            });
                            
                            const mission = currentActivity.bingoMissions.find(m => 
                              m.row === row && m.col === col
                            );
                            
                            if (!mission || !progress) return null;
                            
                            return (
                              <div
                                key={`${row}-${col}`}
                                className={`relative aspect-square p-4 border-2 rounded-lg transition-all cursor-pointer ${
                                  progress.completed
                                    ? 'bg-green-50 border-green-400 hover:bg-green-100'
                                    : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                                }`}
                                onClick={() => {
                                  if (mission.type === 'simple') {
                                    toggleMissionComplete(selectedTeam._id, mission.id);
                                  }
                                }}
                              >
                                <div className="h-full flex flex-col">
                                  <div className="flex-1 flex flex-col justify-center items-center text-center">
                                    <div className="text-xs text-gray-400 mb-1">
                                      ({row}, {col})
                                    </div>
                                    <div className="text-sm font-semibold mb-2">
                                      {mission.title || `미션 ${mission.id + 1}`}
                                    </div>
                                    
                                    {mission.type === 'count' ? (
                                      <div className="space-y-2 w-full" onClick={(e) => e.stopPropagation()}>
                                        <div className="text-lg font-bold">
                                          {progress.currentCount}/{mission.targetCount}
                                        </div>
                                        <div className="flex gap-2 justify-center">
                                          <button
                                            onClick={() => adjustMissionCount(selectedTeam._id, mission.id, -1)}
                                            className="px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm font-medium"
                                            disabled={progress.currentCount === 0}
                                          >
                                            -1
                                          </button>
                                          <button
                                            onClick={() => adjustMissionCount(selectedTeam._id, mission.id, 1)}
                                            className="px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-sm font-medium"
                                          >
                                            +1
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={`mt-2 px-3 py-1 rounded-md text-sm font-medium ${
                                        progress.completed
                                          ? 'bg-green-500 text-white'
                                          : 'bg-gray-200 text-gray-700'
                                      }`}>
                                        {progress.completed ? '✓ 완료' : '미완료'}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {progress.completed && (
                                    <div className="absolute top-2 right-2 pointer-events-none">
                                      <Check size={20} className="text-green-600 bg-white rounded-full p-1 shadow-sm" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ))}
                      </div>
                      
                      <div className="mt-4 text-center text-sm text-gray-600">
                        💡 단순형 미션: 칸을 클릭하여 완료/미완료 전환 | 카운트형 미션: +/- 버튼으로 조정
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* 참가자 모드 */}
        {mode === 'participant' && (
          <div className="space-y-6">
            {!myTeam ? (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">내가 참여한 활동</h2>
                
                {myActivities.length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>참여 중인 활동이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myActivities.map((activity) => (
                      <div 
                        key={activity._id} 
                        className="p-5 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
                        onClick={() => loadMyTeam(activity._id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-bold text-blue-600">{activity.title}</h3>
                            <div className="text-sm text-gray-600 space-y-1 mt-2">
                              <p>📅 {new Date(activity.startDate).toLocaleDateString()} ~ {new Date(activity.endDate).toLocaleDateString()}</p>
                              <p>🎯 목표 빙고: {activity.targetBingos}개</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            getActivityStatus(activity) === '진행중' ? 'bg-blue-100 text-blue-800' :
                            getActivityStatus(activity) === '완료' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getActivityStatus(activity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* 내 조 정보 */
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">{myTeam.name}</h2>
                  <button
                    onClick={() => setMyTeam(null)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-all"
                  >
                    목록으로 돌아가기
                  </button>
                </div>

                {/* 조원 정보 */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">👥 조원 ({myTeam.members.length}명)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {myTeam.members.map((member, index) => (
                      <div key={member._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                        <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{member.name}</span>
                            {member._id === myTeam.leaderId?._id && (
                              <Crown size={14} className="text-yellow-500" />
                            )}
                          </div>
                          <span className="text-sm text-gray-500">{member.department || '부서 미설정'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 빙고 현황 */}
                <div>
                  <h3 className="text-lg font-semibold mb-6">우리 조 빙고 현황</h3>
                  
                  {/* 진행 상태 요약 */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                      <div className="text-2xl font-bold text-blue-600">{myTeam.bingoCount}</div>
                      <div className="text-sm text-gray-600">빙고 달성</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                      <div className="text-2xl font-bold text-green-600">
                        {myTeam.progress?.filter(p => p.completed).length || 0}/9
                      </div>
                      <div className="text-sm text-gray-600">완료 미션</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center border border-purple-200">
                      <div className="text-2xl font-bold text-purple-600">
                        {myTeam.summary?.progressRate || 0}%
                      </div>
                      <div className="text-sm text-gray-600">진행률</div>
                    </div>
                  </div>

                  {/* 목표 달성 현황 */}
                  <div className={`mb-6 p-4 rounded-lg border-2 border-dashed ${
                    myTeam.bingoCount >= myTeam.activityId.targetBingos 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-yellow-50 border-yellow-300'
                  }`}>
                    <div className="text-center">
                      <div className="text-lg mb-2">
                        목표: <span className="font-bold">{myTeam.activityId.targetBingos}개</span> 빙고 달성
                      </div>
                      <div className="relative w-full bg-gray-200 rounded-full h-4 mb-2">
                        <div 
                          className={`h-4 rounded-full transition-all ${
                            myTeam.bingoCount >= myTeam.activityId.targetBingos 
                              ? 'bg-green-500' 
                              : 'bg-blue-500'
                          }`}
                          style={{ 
                            width: `${Math.min(100, (myTeam.bingoCount / myTeam.activityId.targetBingos) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      {myTeam.bingoCount >= myTeam.activityId.targetBingos ? (
                        <div className="text-green-600 font-bold text-xl">목표 달성 완료!</div>
                      ) : (
                        <div className="text-gray-600">
                          앞으로 <span className="font-bold text-blue-600">
                            {myTeam.activityId.targetBingos - myTeam.bingoCount}개
                          </span> 더 필요합니다
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* 빙고판 */}
                  <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
                    {myTeam.progress.map((progress) => {
                      const mission = myTeam.activityId.bingoMissions.find(m => m.id === progress.missionId);
                      return (
                        <div
                          key={progress.missionId}
                          className={`relative aspect-square p-4 border-2 rounded-lg transition-all shadow-sm ${
                            progress.completed
                              ? 'bg-green-50 border-green-400 shadow-green-200'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          <div className="h-full flex flex-col justify-center items-center text-center">
                            <div className="text-sm font-semibold mb-2">
                              {mission?.title || `미션 ${progress.missionId + 1}`}
                            </div>
                            
                            {mission?.type === 'count' && (
                              <div className="space-y-1">
                                <div className="text-lg font-bold">
                                  {progress.currentCount}/{mission.targetCount}
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      progress.completed ? 'bg-green-500' : 'bg-blue-500'
                                    }`}
                                    style={{ 
                                      width: `${Math.min(100, (progress.currentCount / mission.targetCount) * 100)}%` 
                                    }}
                                  ></div>
                                </div>
                              </div>
                            )}
                            
                            {progress.completed && (
                              <div className="mt-2">
                                <Check size={24} className="text-green-600" />
                              </div>
                            )}
                          </div>
                          
                          {progress.completed && (
                            <div className="absolute top-2 right-2">
                              <div className="bg-green-500 text-white rounded-full p-1">
                                <Check size={16} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamBingoSystem;