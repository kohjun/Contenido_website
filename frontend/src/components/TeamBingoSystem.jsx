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
    unassignedMembers,          
    createActivity,
    selectActivity,
    toggleMember,
    bulkToggleByRole,           
    createTeams,
    setTeamLeader,
    isCreatingTeams,
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
  } = useTeamBingo();

  return (
    <div className="min-h-screen bg-gray-50 p-5" style={{ fontFamily: "'GmarketSansMedium', sans-serif" }}>
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-8 bg-white rounded-lg shadow-sm border p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">CONTENID-O 조별활동</h1>
          <p className="text-gray-600 text-sm mb-6">10명 내외의 조원이 한조가 되어 미션을 완수하는 분기별 조별활동</p>
          
          {/* 현재 활동 표시 */}
          {currentActivity && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                현재 관리 중인 활동: {currentActivity.title}
              </h3>
              <div className="text-sm text-blue-800">
                <span className="mr-4"> {new Date(currentActivity.startDate).toLocaleDateString()} ~ {new Date(currentActivity.endDate).toLocaleDateString()}</span>
                <span className="mr-4"> 참가자: {currentActivity.participants.length}명</span>
                <span className="mr-4"> 목표 빙고: {currentActivity.targetBingos}개</span>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">이름 검색</label>
                    <div className="relative">
                      <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="이름으로 검색..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">역할 필터</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all"
                    >
                      <option value="">전체</option>
                      <option value="참가자">참가자</option>
                      <option value="스타터">스타터</option>
                      <option value="운영진">운영진</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-center bg-white rounded-md border px-3">
                    <div className="text-center text-sm">
                      <div className="font-medium">선택된 참가자</div>
                      <div className="text-2xl font-bold text-blue-600">{currentActivity.participants.length}명</div>
                    </div>
                  </div>
                </div>

                {/* 역할별 일괄 추가/제거 버튼 */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3">역할별 일괄 관리</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => bulkToggleByRole('participant')}
                      className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-blue-400 text-blue-700 rounded-md hover:bg-blue-50 transition-all font-medium"
                    >
                      <Users size={16} />
                      {allUsersData.filter(u => u.role === '참가자').every(u => 
                        currentActivity.participants.some(p => (p._id || p) === u.id)
                      ) ? '모든 참가자 제거' : '모든 참가자 추가'}
                    </button>
                    
                    <button
                      onClick={() => bulkToggleByRole('starter')}
                      className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-green-400 text-green-700 rounded-md hover:bg-green-50 transition-all font-medium"
                    >
                      <Target size={16} />
                      {allUsersData.filter(u => u.role === '스타터').every(u => 
                        currentActivity.participants.some(p => (p._id || p) === u.id)
                      ) ? '모든 스타터 제거' : '모든 스타터 추가'}
                    </button>
                    
                    <button
                      onClick={() => bulkToggleByRole('officer')}
                      className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-purple-400 text-purple-700 rounded-md hover:bg-purple-50 transition-all font-medium"
                    >
                      <Settings size={16} />
                      {allUsersData.filter(u => u.role === '운영진').every(u => 
                        currentActivity.participants.some(p => (p._id || p) === u.id)
                      ) ? '모든 운영진 제거' : '모든 운영진 추가'}
                    </button>
                  </div>
                </div>

                {/* 멤버 목록 */}
                <div className="space-y-2">
                  {getFilteredMembers().length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <Users size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>검색 결과가 없습니다.</p>
                    </div>
                  ) : (
                    getFilteredMembers().map((member) => {
                      const isParticipant = currentActivity.participants.some(
                        p => (p._id || p) === member.id
                      );
                      
                      return (
                        <div
                          key={member.id}
                          className={`flex items-center justify-between p-4 border rounded-lg transition-all ${
                            isParticipant 
                              ? 'bg-blue-50 border-blue-200' 
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                              member.role === '참가자' ? 'bg-blue-100 text-blue-600' :
                              member.role === '스타터' ? 'bg-green-100 text-green-600' :
                              'bg-purple-100 text-purple-600'
                            }`}>
                              {member.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold">{member.name}</div>
                              <div className="text-sm text-gray-600">
                                {member.role} | {member.gender} | {member.age}세
                                {member.department && ` | ${member.department}`}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleMember(member.id)}
                            className={`px-4 py-2 rounded-md font-medium transition-all flex items-center gap-2 ${
                              isParticipant
                                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                            }`}
                          >
                            {isParticipant ? <UserMinus size={16} /> : <UserPlus size={16} />}
                            {isParticipant ? '제거' : '추가'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* 조 구성 탭 */}
            {activeTab === 'teams' && currentActivity && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">
                  조 구성 - {currentActivity.title}
                </h2>
                
                {/* 조 생성 컨트롤 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-4 bg-gray-50 rounded-lg border">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">조별 인원 수</label>
                    <input
                      type="number"
                      value={teamSettings.membersPerTeam}
                      onChange={(e) => setTeamSettings({...teamSettings, membersPerTeam: parseInt(e.target.value) || 1})}
                      min="2"
                      max="10"
                      disabled={teams.length > 0 || isCreatingTeams}
                      className="w-full px-4 py-3 border border-gray-200 rounded-md focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="flex items-center justify-center bg-white rounded-md border px-3">
                    <div className="text-center text-sm">
                      <div className="font-medium">총 {currentActivity.participants.length}명 참가</div>
                      {teams.length > 0 && (
                        <div className="text-green-600 text-xs mt-1">✓ {teams.length}개 조 생성됨</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={createTeams}
                      disabled={teams.length > 0 || isCreatingTeams}
                      className={`w-full px-6 py-3 rounded-md font-medium transition-all duration-200 shadow-sm flex items-center justify-center gap-2 ${
                        teams.length > 0 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : isCreatingTeams
                          ? 'bg-blue-400 text-white cursor-wait'
                          : 'bg-gray-800 text-white hover:bg-gray-700 hover:shadow-md'
                      }`}
                    >
                      {isCreatingTeams ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>조 생성 중...</span>
                        </>
                      ) : teams.length > 0 ? (
                        <>
                          <Check size={18} />
                          <span>조 생성 완료</span>
                        </>
                      ) : (
                        <>
                          <Shuffle size={18} />
                          <span>조 생성하기</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 로딩 중 메시지 */}
                {isCreatingTeams && (
                  <div className="mb-6 p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900 mb-1">
                          조를 생성하고 있습니다...
                        </h3>
                        <p className="text-sm text-blue-700">
                          최적의 조 구성을 위해 알고리즘이 작동 중입니다. 잠시만 기다려주세요. ⏱️
                        </p>
                        <p className="text-xs text-blue-600 mt-2">
                          💡 지역, 성비, 역할, 나이를 고려하여 균형잡힌 조를 만들고 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 조가 없을 때 안내 메시지 */}
                {!isCreatingTeams && teams.length === 0 && (
                  <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <Shuffle size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-600 mb-2">아직 조가 생성되지 않았습니다.</p>
                    <p className="text-sm text-gray-500">
                      위의 "조 생성하기" 버튼을 눌러 참가자들을 조로 나누세요.
                    </p>
                  </div>
                )}

                {/* 조 목록 */}
                {!isCreatingTeams && teams.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">생성된 조 목록 ({teams.length}개)</h3>
                      {unassignedMembers.length > 0 && (
                        <span className="text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                          ⚠️ 미배정 인원 {unassignedMembers.length}명
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {teams.map((team) => (
                        <div key={team._id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all bg-white shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-bold text-lg">{team.name}</h4>
                              <div className="text-sm text-gray-600">
                                빙고: {team.bingoCount || 0}개 | 진행률: {team.summary?.progressRate || 0}%
                              </div>
                            </div>
                            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {team.members.length}명
                            </span>
                          </div>

                          <div className="space-y-2">
                            {team.members.map((member, index) => {
                              // 나이 계산
                              const age = member.birthDate 
                                ? new Date().getFullYear() - new Date(member.birthDate).getFullYear() + 1
                                : '?';
                              
                              // 성별 표시
                              const genderText = member.gender === 'male' ? '남' : member.gender === 'female' ? '여' : '?';
                              
                              // 전화번호 뒷자리 추출
                              const phoneLastFour = member.phonenumber 
                                ? member.phonenumber.replace(/\D/g, '').slice(-4) 
                                : '????';
                              
                              return (
                                <div key={member._id} className="flex items-center gap-2 p-2 bg-gray-50 rounded border group">
                                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                                    {index + 1}
                                  </span>
                                  
                                  <div className="flex-1">
                                    <span className="font-medium">{member.name}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                      ({genderText}, {age}세, {phoneLastFour})
                                    </span>
                                    {team.leaderId?._id === member._id && (
                                      <Crown size={14} className="inline ml-1 text-yellow-500" />
                                    )}
                                  </div>

                                  {/* 조원 관리 버튼 */}
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* 조장 지정/해제 */}
                                    <button
                                      onClick={() => setTeamLeader(team._id, team.leaderId?._id === member._id ? null : member._id)}
                                      className="p-1 hover:bg-yellow-100 rounded"
                                      title={team.leaderId?._id === member._id ? "조장 해제" : "조장 지정"}
                                    >
                                      <Crown size={16} className={team.leaderId?._id === member._id ? "text-yellow-600" : "text-gray-400"} />
                                    </button>

                                    {/* 다른 조로 이동 */}
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value && e.target.value !== team._id) {
                                          moveMemberToTeam(team._id, e.target.value, member._id);
                                          e.target.value = '';
                                        }
                                      }}
                                      className="text-xs px-1 py-1 border rounded hover:border-blue-400"
                                      title="다른 조로 이동"
                                    >
                                      <option value="">이동...</option>
                                      {teams.filter(t => t._id !== team._id).map(t => (
                                        <option key={t._id} value={t._id}>
                                          {t.name}
                                        </option>
                                      ))}
                                    </select>

                                    {/* 조원 제거 */}
                                    <button
                                      onClick={() => removeMemberFromTeam(team._id, member._id)}
                                      className="p-1 hover:bg-red-100 rounded text-red-600"
                                      title="조원 제거"
                                    >
                                      <UserMinus size={16} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}

                            {/* 조원 추가 버튼 (미배정 인원이 있을 때만) */}
                            {unassignedMembers.length > 0 && (
                              <div className="pt-2">
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      addMemberToTeam(team._id, e.target.value);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="w-full text-sm px-3 py-2 border border-dashed border-gray-300 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                >
                                  <option value="">+ 조원 추가...</option>
                                  {unassignedMembers.map(member => (
                                    <option key={member._id} value={member._id}>
                                      {member.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 미배정 인원 표시 */}
                    {unassignedMembers.length > 0 && (
                      <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <h4 className="font-semibold text-orange-900 mb-2">⚠️ 미배정 인원 ({unassignedMembers.length}명)</h4>
                        <div className="flex flex-wrap gap-2">
                          {unassignedMembers.map(member => (
                            <span key={member._id} className="px-3 py-1 bg-white border border-orange-300 rounded-full text-sm">
                              {member.name}
                            </span>
                          ))}
                        </div>
                        <p className="text-sm text-orange-700 mt-2">
                          위 조 카드에서 "+ 조원 추가" 드롭다운을 통해 미배정 인원을 배치할 수 있습니다.
                        </p>
                      </div>
                    )}
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
                
                {/* 항상 미션 편집 폼 표시 */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">미션 편집 (3x3 빙고판)</h3>
                    {bingoMissions && bingoMissions.length > 0 && (
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
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-all text-sm"
                      >
                        미션 초기화
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {bingoMissions.map((mission, index) => (
                      <div key={index} className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 transition-colors bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-600">
                            미션 {index + 1}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({Math.floor(index / 3) + 1}행, {(index % 3) + 1}열)
                          </span>
                        </div>
                        
                        <input
                          type="text"
                          placeholder="미션 제목을 입력하세요"
                          value={mission.title || ''}
                          onChange={(e) => {
                            const updated = [...bingoMissions];
                            updated[index].title = e.target.value;
                            setBingoMissions(updated);
                          }}
                          className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        
                        <textarea
                          placeholder="미션 설명 (선택사항)"
                          value={mission.description || ''}
                          onChange={(e) => {
                            const updated = [...bingoMissions];
                            updated[index].description = e.target.value;
                            setBingoMissions(updated);
                          }}
                          rows="2"
                          className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        
                        <select
                          value={mission.type || 'simple'}
                          onChange={(e) => {
                            const updated = [...bingoMissions];
                            updated[index].type = e.target.value;
                            setBingoMissions(updated);
                          }}
                          className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        >
                          <option value="simple">단순형 (완료/미완료)</option>
                          <option value="count">카운트형 (횟수 누적)</option>
                        </select>
                        
                        {mission.type === 'count' && (
                          <input
                            type="number"
                            placeholder="목표 횟수"
                            value={mission.targetCount || 1}
                            onChange={(e) => {
                              const updated = [...bingoMissions];
                              updated[index].targetCount = parseInt(e.target.value) || 1;
                              setBingoMissions(updated);
                            }}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        )}
                        
                        <div className="mt-2 text-xs text-gray-600">
                          {mission.title ? `✓ ${mission.title}` : '⚠️ 미션 제목을 입력하세요'}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center mt-6">
                    <button
                      onClick={saveMissions}
                      className="px-8 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                    >
                      미션 설정 저장
                    </button>
                  </div>
                </div>

                {/* 빙고판 미리보기 */}
                <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                  <h3 className="text-lg font-semibold mb-4 text-center text-blue-900">
                    빙고판 미리보기
                  </h3>
                  <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
                    {bingoMissions.map((mission, idx) => (
                      <div
                        key={idx}
                        className="aspect-square p-3 bg-white border-2 border-blue-300 rounded-lg flex flex-col items-center justify-center text-center shadow-sm"
                      >
                        <div className="text-sm font-semibold text-gray-800 line-clamp-2 mb-1">
                          {mission.title || `미션 ${idx + 1}`}
                        </div>
                        {mission.description && (
                          <div className="text-xs text-gray-500 line-clamp-2 mb-1">
                            {mission.description}
                          </div>
                        )}
                        <div className="mt-auto">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            mission.type === 'count' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {mission.type === 'count' ? `목표 ${mission.targetCount}회` : '단순형'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="text-center mt-4 text-sm text-gray-600">
                    💡 팁: 각 칸을 채워서 3x3 빙고판을 완성하세요!
                  </div>
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
                  <div className="text-center py-16">
                    <BarChart3 size={64} className="mx-auto mb-6 text-gray-300" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-3">
                      아직 조가 생성되지 않았습니다
                    </h3>
                    <p className="text-gray-500 mb-6">
                      모니터링을 시작하려면 먼저 조를 구성해주세요.
                    </p>
                    <button
                      onClick={() => setActiveTab('teams')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
                    >
                      <Shuffle size={18} />
                      <span>조 구성하러 가기</span>
                    </button>
                  </div>
                ) : !selectedTeam ? (
                  /* 조 목록 (요약) */
                  <div>
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">{teams.length}</div>
                        <div className="text-sm text-gray-600">전체 조</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                          {teams.filter(t => t.bingoCount >= currentActivity.targetBingos).length}
                        </div>
                        <div className="text-sm text-gray-600">목표 달성 조</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <div className="text-2xl font-bold text-purple-600">
                          {Math.round(teams.reduce((sum, t) => sum + (t.summary?.progressRate || 0), 0) / teams.length)}%
                        </div>
                        <div className="text-sm text-gray-600">평균 진행률</div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <div className="text-2xl font-bold text-orange-600">
                          {teams.reduce((sum, t) => sum + t.members.length, 0)}
                        </div>
                        <div className="text-sm text-gray-600">전체 참가자</div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">조명</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">인원</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">빙고</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">진행률</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">목표달성</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">액션</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {teams.map((team) => (
                            <tr key={team._id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="font-medium text-gray-900">{team.name}</div>
                                  {team.leaderId && (
                                    <Crown size={14} className="ml-2 text-yellow-500" />
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {team.members.length}명
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  team.bingoCount >= currentActivity.targetBingos 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {team.bingoCount || 0}개
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                    <div 
                                      className="bg-blue-500 h-2 rounded-full transition-all"
                                      style={{ width: `${team.summary?.progressRate || 0}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm text-gray-600 min-w-[40px]">
                                    {team.summary?.progressRate || 0}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {team.bingoCount >= currentActivity.targetBingos ? (
                                  <span className="text-green-600 font-semibold">✓ 달성</span>
                                ) : (
                                  <span className="text-gray-500">진행중</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => loadTeamDetail(team._id)}
                                  className="px-3 py-1 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-all flex items-center gap-1 text-sm"
                                >
                                  <Eye size={14} />
                                  상세보기
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* 선택된 팀 상세 보기 */
                  <div className="space-y-6">
                    {/* 팀 정보 카드 */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-lg shadow-lg">
                      <h3 className="text-2xl font-bold mb-4">{selectedTeam.name}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                          <div className="text-3xl font-bold">{selectedTeam.members.length}</div>
                          <div className="text-sm">팀원</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                          <div className="text-3xl font-bold">{selectedTeam.bingoCount}</div>
                          <div className="text-sm">빙고</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                          <div className="text-3xl font-bold">
                            {selectedTeam.progress?.filter(p => p.completed).length || 0}/9
                          </div>
                          <div className="text-sm">완료 미션</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-lg">
                          <div className="text-3xl font-bold">{selectedTeam.summary?.progressRate || 0}%</div>
                          <div className="text-sm">진행률</div>
                        </div>
                      </div>
                      
                      {/* 목표 달성 여부 */}
                      <div className="mt-4">
                        {selectedTeam.bingoCount >= currentActivity.targetBingos ? (
                          <span className="px-4 py-2 bg-green-500 text-white rounded-full font-bold">
                            ✓ 목표 달성!
                          </span>
                        ) : (
                          <span className="px-4 py-2 bg-yellow-500 text-white rounded-full font-bold">
                            진행 중 (목표: {currentActivity.targetBingos}개)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 빙고판 */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">빙고 현황 (칸을 클릭하여 완료 처리)</h3>
                      <div className="grid grid-cols-3 gap-3 max-w-3xl mx-auto">
                        {currentActivity.bingoMissions && currentActivity.bingoMissions.length > 0 ? (
                          currentActivity.bingoMissions
                            .sort((a, b) => (a.row * 3 + a.col) - (b.row * 3 + b.col))
                            .map((mission) => {
                              const progress = selectedTeam.progress?.find(p => p.missionId === mission.id) || {
                                missionId: mission.id,
                                completed: false,
                                currentCount: 0
                              };
                              
                              return (
                                <div
                                  key={mission.id}
                                  className={`relative aspect-square p-4 border-2 rounded-lg transition-all cursor-pointer ${
                                    progress.completed
                                      ? 'bg-green-50 border-green-400 shadow-md'
                                      : 'bg-white border-gray-300 hover:border-blue-400'
                                  }`}
                                  onClick={() => mission.type === 'simple' && toggleMissionComplete(selectedTeam._id, mission.id)}
                                >
                                  <div className="h-full flex flex-col justify-center items-center text-center">
                                    <div className="text-sm font-semibold mb-2">
                                      {mission.title || `미션 ${mission.id + 1}`}
                                    </div>
                                    
                                    {mission.description && (
                                      <div className="text-xs text-gray-500 mb-2">
                                        {mission.description}
                                      </div>
                                    )}
                                    
                                    {/* 카운트형 미션 */}
                                    {mission.type === 'count' && (
                                      <div className="space-y-2 w-full">
                                        <div className="flex justify-center gap-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              adjustMissionCount(selectedTeam._id, mission.id, -1);
                                            }}
                                            className="px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 text-sm"
                                          >
                                            -
                                          </button>
                                          <span className="px-3 py-1 bg-gray-100 rounded text-sm font-semibold">
                                            {progress.currentCount || 0}/{mission.targetCount}
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              adjustMissionCount(selectedTeam._id, mission.id, 1);
                                            }}
                                            className="px-2 py-1 bg-green-100 text-green-600 rounded hover:bg-green-200 text-sm"
                                          >
                                            +
                                          </button>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                          <div 
                                            className={`h-2 rounded-full transition-all ${
                                              progress.completed ? 'bg-green-500' : 'bg-blue-500'
                                            }`}
                                            style={{ 
                                              width: `${Math.min(100, ((progress.currentCount || 0) / mission.targetCount) * 100)}%` 
                                            }}
                                          ></div>
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          {progress.completed ? '✓ 완료' : `${mission.targetCount - (progress.currentCount || 0)}개 남음`}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* 단순형 완료 상태 */}
                                    {mission.type === 'simple' && (
                                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        progress.completed
                                          ? 'bg-green-500 text-white'
                                          : 'bg-gray-200 text-gray-700'
                                      }`}>
                                        {progress.completed ? '✓ 완료' : '미완료'}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* 완료 체크 표시 */}
                                  {progress.completed && (
                                    <div className="absolute top-2 right-2 pointer-events-none">
                                      <Check size={20} className="text-green-600 bg-white rounded-full p-1 shadow-sm" />
                                    </div>
                                  )}
                                </div>
                              );
                            })
                        ) : (
                          <div className="col-span-3 text-center py-16 text-gray-500">
                            <Grid3x3 size={48} className="mx-auto mb-4 text-gray-300" />
                            <p>미션이 설정되지 않았습니다.</p>
                            <p className="text-sm">미션 설정 탭에서 미션을 먼저 설정해주세요.</p>
                          </div>
                        )}
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
          <div className="space-y-4 sm:space-y-6">
            {!myTeam ? (
              /* 활동 목록 */
              <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">내가 참여한 활동</h2>
                
                {myActivities.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 md:py-16 text-gray-500">
                    <Calendar size={40} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                    <p className="text-xs sm:text-sm md:text-base">참여 중인 활동이 없습니다.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {myActivities.map((activity) => (
                      <div
                        key={activity._id}
                        onClick={() => loadMyTeam(activity._id)}
                        className="p-3 sm:p-4 md:p-5 border rounded-lg cursor-pointer hover:border-blue-300 hover:shadow-md transition-all bg-white"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-2 sm:mb-3">
                          <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">{activity.title}</h3>
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap self-start ${
                            new Date() < new Date(activity.startDate) ? 'bg-yellow-100 text-yellow-800' :
                            new Date() > new Date(activity.endDate) ? 'bg-gray-100 text-gray-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {new Date() < new Date(activity.startDate) ? '예정' :
                            new Date() > new Date(activity.endDate) ? '종료' :
                            '진행중'}
                          </span>
                        </div>
                        
                        <div className="text-[10px] sm:text-xs md:text-sm text-gray-600 space-y-0.5 sm:space-y-1 mb-2 sm:mb-3">
                          <p>📅 {new Date(activity.startDate).toLocaleDateString()} ~ {new Date(activity.endDate).toLocaleDateString()}</p>
                          <p>🎯 목표: {activity.targetBingos}개 빙고</p>
                        </div>
                        
                        {activity.myTeam ? (
                          <div className="pt-2 sm:pt-3 border-t border-gray-100">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                              <div className="text-xs sm:text-sm md:text-base">
                                <span className="font-medium text-gray-900">우리 조: </span>
                                <span className="text-blue-600 font-semibold">{activity.myTeam.name}</span>
                              </div>
                              <div className="flex gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded">
                                  빙고 {activity.myTeam.bingoCount}개
                                </span>
                                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-50 text-green-700 rounded">
                                  진행률 {activity.myTeam.progressRate}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 sm:pt-3 border-t border-gray-100">
                            <div className="text-[10px] sm:text-xs md:text-sm text-gray-500 text-center py-1 sm:py-2 bg-gray-50 rounded">
                              아직 조가 배정되지 않았습니다
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* 내 조 상세 보기 */
              <div className="space-y-4 md:space-y-6">
                <button
                  onClick={() => setMyTeam(null)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                >
                  <X size={16} />
                  <span className="text-sm md:text-base">활동 목록으로</span>
                </button>

                <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
                  <div className="mb-3 sm:mb-4 md:mb-6">
                    <div className="flex items-center gap-2 mb-1 sm:mb-2">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{myTeam.name}</h2>
                      
                      {myTeam.leaderId?._id === userRole?.id && (
                        <button
                          onClick={() => {
                            const newName = prompt('새로운 조 이름을 입력하세요:', myTeam.name);
                            if (newName && newName.trim() && newName !== myTeam.name) {
                              updateTeamName(myTeam._id, newName.trim());
                            }
                          }}
                          className="p-1.5 sm:p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all"
                          title="조 이름 수정 (조장만 가능)"
                        >
                          <Edit2 size={16} className="sm:w-5 sm:h-5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm md:text-base text-gray-600 truncate">{myTeam.activityId.title}</p>
                  </div>

                

                  {/* 통계 카드 - 반응형 그리드 */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-4 mb-3 sm:mb-4 md:mb-6">
                    <div className="bg-blue-50 p-2 sm:p-3 md:p-4 rounded-lg text-center border border-blue-200">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600">{myTeam.bingoCount}</div>
                      <div className="text-[10px] sm:text-xs md:text-sm text-gray-600">빙고</div>
                    </div>
                    <div className="bg-green-50 p-2 sm:p-3 md:p-4 rounded-lg text-center border border-green-200">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
                        {myTeam.progress?.filter(p => p.completed).length || 0}/9
                      </div>
                      <div className="text-[10px] sm:text-xs md:text-sm text-gray-600">완료</div>
                    </div>
                    <div className="bg-purple-50 p-2 sm:p-3 md:p-4 rounded-lg text-center border border-purple-200">
                      <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">
                        {myTeam.summary?.progressRate || 0}%
                      </div>
                      <div className="text-[10px] sm:text-xs md:text-sm text-gray-600">진행률</div>
                    </div>
                  </div>

                  {/* 목표 달성 현황 */}
                  <div className={`p-3 md:p-4 rounded-lg border-2 border-dashed ${
                    myTeam.bingoCount >= myTeam.activityId.targetBingos 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-yellow-50 border-yellow-300'
                  }`}>
                    <div className="text-center">
                      <div className="text-sm md:text-base mb-2 text-gray-900">
                        목표: <span className="font-bold">{myTeam.activityId.targetBingos}개</span> 빙고 달성
                      </div>
                      <div className="relative w-full bg-gray-200 rounded-full h-3 md:h-4 mb-2">
                        <div 
                          className={`h-3 md:h-4 rounded-full transition-all ${
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
                        <div className="text-green-600 font-bold text-base md:text-xl">🎉 목표 달성 완료!</div>
                      ) : (
                        <div className="text-gray-600 text-sm md:text-base">
                          앞으로 <span className="font-bold text-blue-600">
                            {myTeam.activityId.targetBingos - myTeam.bingoCount}개
                          </span> 더 필요합니다
                        </div>
                      )}
                    </div>
                  </div>
                  </div>

                  {/* 빙고판 */}
                  <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4 md:p-6">
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 text-gray-900">우리 조 빙고 현황</h3>
                    
                    {myTeam.activityId.bingoMissions && myTeam.activityId.bingoMissions.length > 0 ? (
                      <>
                        {/* 빙고판 - 세로 모드 최적화 */}
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 w-full max-w-md sm:max-w-lg md:max-w-2xl mx-auto mb-3 sm:mb-4">
                          {myTeam.activityId.bingoMissions
                            .sort((a, b) => (a.row * 3 + a.col) - (b.row * 3 + b.col))
                            .map((mission) => {
                              const progress = myTeam.progress.find(p => p.missionId === mission.id) || {
                                missionId: mission.id,
                                completed: false,
                                currentCount: 0
                              };
                              
                              return (
                                <div
                                  key={mission.id}
                                  className={`relative aspect-square p-1.5 sm:p-2 md:p-4 border-2 rounded-md sm:rounded-lg transition-all shadow-sm ${
                                    progress.completed
                                      ? 'bg-green-50 border-green-400 shadow-green-200'
                                      : 'bg-white border-gray-300'
                                  }`}
                                >
                                  <div className="h-full flex flex-col justify-center items-center text-center overflow-hidden">
                                    {/* 미션 제목 */}
                                    <div className="text-[10px] leading-tight sm:text-xs md:text-sm font-semibold mb-0.5 sm:mb-1 md:mb-2 line-clamp-2 px-0.5 text-gray-900">
                                      {mission.title || `미션 ${mission.id + 1}`}
                                    </div>
                                    
                                    {/* 미션 설명 - 태블릿 이상에서만 표시 */}
                                    {mission.description && (
                                      <div className="hidden lg:block text-xs text-gray-500 mb-2 line-clamp-1 px-1">
                                        {mission.description}
                                      </div>
                                    )}
                                    
                                    {/* 카운트형 미션 */}
                                    {mission.type === 'count' && (
                                      <div className="space-y-0.5 sm:space-y-1 w-full px-0.5 sm:px-1">
                                        <div className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-gray-900">
                                          {progress.currentCount || 0}/{mission.targetCount}
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1 sm:h-1.5 md:h-2">
                                          <div 
                                            className={`h-1 sm:h-1.5 md:h-2 rounded-full transition-all ${
                                              progress.completed ? 'bg-green-500' : 'bg-blue-500'
                                            }`}
                                            style={{ 
                                              width: `${Math.min(100, ((progress.currentCount || 0) / mission.targetCount) * 100)}%` 
                                            }}
                                          ></div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {/* 단순형 미션 */}
                                    {mission.type === 'simple' && (
                                      <div className={`mt-0.5 sm:mt-1 md:mt-2 px-1.5 sm:px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                                        progress.completed
                                          ? 'bg-green-500 text-white'
                                          : 'bg-gray-200 text-gray-700'
                                      }`}>
                                        {progress.completed ? '✓' : '○'}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* 완료 체크 표시 */}
                                  {progress.completed && (
                                    <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 md:top-2 md:right-2">
                                      <Check className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 bg-white rounded-full p-0.5 shadow-sm" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                        
                        {/* 안내 메시지 */}
                        <div className="text-center text-[10px] sm:text-xs md:text-sm text-gray-600 bg-blue-50 p-2 sm:p-3 rounded-lg">
                          💡 관리자가 미션 완료 상태를 업데이트합니다
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 sm:py-12 md:py-16 text-gray-500">
                        <Grid3x3 size={40} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                        <p className="text-xs sm:text-sm md:text-base">미션이 아직 설정되지 않았습니다.</p>
                        <p className="text-[10px] sm:text-xs md:text-sm mt-1">관리자에게 미션 설정을 요청해주세요.</p>
                      </div>
                    )}
                  </div>

                  {/* 조원 목록 */}
                  <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
                    <h3 className="text-lg md:text-xl font-semibold mb-4 text-gray-900">조원 ({myTeam.members.length}명)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                      {myTeam.members.map((member, index) => {
                        const age = member.birthDate 
                          ? new Date().getFullYear() - new Date(member.birthDate).getFullYear() + 1
                          : '?';
                        const genderText = member.gender === 'male' ? '남' : member.gender === 'female' ? '여' : '?';
                        
                        return (
                          <div key={member._id} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 bg-gray-50 rounded-lg border">
                            <span className="w-6 h-6 md:w-8 md:h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold flex-shrink-0">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="font-medium text-sm md:text-base text-gray-900">{member.name}</span>
                                {myTeam.leaderId?._id === member._id && (
                                  <Crown size={14} className="md:w-4 md:h-4 text-yellow-500 flex-shrink-0" />
                                )}
                              </div>
                              <span className="text-xs sm:text-sm text-gray-500 block">
                                ({genderText}, {age}세)
                              </span>
                            </div>
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