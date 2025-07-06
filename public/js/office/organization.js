class OrganizationChart {
    static isEditMode = false;
    static dragData = null;
    static pendingChanges = [];

    static async init() {
        await this.loadData();
        await this.setupEditModeButton();
    }

    static async setupEditModeButton() {
        const header = document.querySelector('.header-controls');
        // 이미 버튼이 있으면 중복 생성 방지
        if (header.querySelector('.edit-btn')) return;

        // 사용자 정보 가져오기
        let userInfo;
        try {
            const res = await fetch('/user/info');
            userInfo = await res.json();
        } catch (e) {
            userInfo = null;
        }

        // 권한 체크: admin 또는 officer+HumanResourceTeam
        const canEdit = userInfo && (
            userInfo.role === 'admin' ||
            (userInfo.role === 'officer' && userInfo.team === 'HumanResourceTeam')
        );
        if (!canEdit) return;

        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-primary edit-btn';
        editBtn.textContent = '수정하기';
        header.appendChild(editBtn);

        editBtn.addEventListener('click', () => {
            OrganizationChart.toggleEditMode(true);
        });

        // 수정완료 버튼
        const doneBtn = document.createElement('button');
        doneBtn.className = 'btn btn-secondary done-btn';
        doneBtn.textContent = '수정완료';
        doneBtn.style.display = 'none';
        header.appendChild(doneBtn);

        doneBtn.addEventListener('click', async () => {
            await OrganizationChart.applyPendingChanges();
            OrganizationChart.toggleEditMode(false);
        });

        // 취소하기 버튼
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-secondary cancel-btn';
        cancelBtn.textContent = '취소하기';
        cancelBtn.style.display = 'none';
        header.appendChild(cancelBtn);

        cancelBtn.addEventListener('click', () => {
            OrganizationChart.toggleEditMode(false);
        });
    }

    static toggleEditMode(enable) {
        this.isEditMode = enable;
        document.querySelector('.edit-btn').style.display = enable ? 'none' : '';
        document.querySelector('.done-btn').style.display = enable ? '' : 'none';
        document.querySelector('.cancel-btn').style.display = enable ? '' : 'none';

        // 멤버 카드 드래그 가능 여부
        document.querySelectorAll('.member-list .member').forEach(member => {
            member.draggable = enable;
            if (enable) {
                member.classList.add('draggable');
                member.addEventListener('dragstart', this.onDragStart);
                member.addEventListener('dragend', this.onDragEnd);
            } else {
                member.classList.remove('draggable');
                member.removeEventListener('dragstart', this.onDragStart);
                member.removeEventListener('dragend', this.onDragEnd);
            }
        });

        // 팀 영역 드롭 가능 여부
        document.querySelectorAll('.member-list').forEach(list => {
            if (enable) {
                list.addEventListener('dragover', this.onDragOver);
                list.addEventListener('drop', this.onDrop);
                list.classList.add('droppable');
            } else {
                list.removeEventListener('dragover', this.onDragOver);
                list.removeEventListener('drop', this.onDrop);
                list.classList.remove('droppable');
            }
        });

        // 수정모드 종료 시 변경사항 초기화 및 데이터 새로고침
        if (!enable) {
            this.pendingChanges = [];
            this.loadData();
        }
    }

    static onDragStart(e) {
        e.dataTransfer.effectAllowed = 'move';
        OrganizationChart.dragData = {
            userId: e.currentTarget.dataset.userId,
            fromListId: e.currentTarget.parentElement.id,
            originalElem: e.currentTarget
        };
        e.currentTarget.classList.add('dragging');
    }

    static onDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        OrganizationChart.dragData = null;
    }

    static onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        // 같은 리스트 내에서 멤버 위로 드래그 시 시각적 표시
        const draggingElem = document.querySelector('.member.dragging');
        if (draggingElem && e.target.classList.contains('member') && e.target !== draggingElem) {
            const bounding = e.target.getBoundingClientRect();
            const offset = e.clientY - bounding.top;
            if (offset < bounding.height / 2) {
                e.target.parentNode.insertBefore(draggingElem, e.target);
            } else {
                e.target.parentNode.insertBefore(draggingElem, e.target.nextSibling);
            }
        }
    }

    static async onDrop(e) {
        e.preventDefault();
        const toListId = e.currentTarget.id;
        const { userId, fromListId, originalElem } = OrganizationChart.dragData;
        if (!userId) return;

        // 스태프팀 내 staffSubteam 이동 처리
        const staffSubteamIds = ['staff-A1', 'staff-B1', 'staff-C1', 'staff-C2', 'staff-unknown'];
        if (staffSubteamIds.includes(fromListId) && staffSubteamIds.includes(toListId)) {
            // 같은 영역 내 순서 변경만
            if (fromListId === toListId) return;

            // 멤버 DOM 이동
            const memberElem = document.querySelector(`.member[data-user-id="${userId}"]`);
            if (memberElem) {
                e.currentTarget.querySelector('.staff-subteam-list').appendChild(memberElem);
            }

            // staffSubteam 값 추출
            let newStaffSubteam = null;
            if (toListId === 'staff-A1') newStaffSubteam = 'A-1';
            else if (toListId === 'staff-B1') newStaffSubteam = 'B-1';
            else if (toListId === 'staff-C1') newStaffSubteam = 'C-1';
            else if (toListId === 'staff-C2') newStaffSubteam = 'C-2';
            else newStaffSubteam = null;

            const user = OrganizationChart.allUsers?.find(u => u.id === userId);
            if (!user) return;

            // staffSubteam이 다르면 확인 (문구 다르게)
            if (user.staffSubteam !== newStaffSubteam) {
                const msg = newStaffSubteam
                    ? `${user.name}님의 스태프팀 소속을 '${newStaffSubteam}'로 변경하시겠습니까?`
                    : `${user.name}님의 스태프팀 소속을 '미지정'으로 변경하시겠습니까?`;
                if (!confirm(msg)) {
                    // 취소 시 원래 위치로 되돌림
                    document.getElementById(fromListId).querySelector('.staff-subteam-list').appendChild(memberElem);
                    return;
                }
                // pendingChanges에 추가(중복 제거)
                OrganizationChart.pendingChanges = OrganizationChart.pendingChanges.filter(c => c.userId !== userId);
                OrganizationChart.pendingChanges.push({
                    userId,
                    staffSubteam: newStaffSubteam
                });
                // UI상에서 바로 반영
                user.staffSubteam = newStaffSubteam;
            }
            return;
        }

        // 기존: 같은 리스트(팀) 내에서 순서 변경만
        if (fromListId === toListId) {
            // 이미 onDragOver에서 DOM 이동이 되었으므로 별도 처리 불필요
            return;
        }

        // 멤버 DOM 이동 (팀 이동)
        const memberElem = document.querySelector(`.member[data-user-id="${userId}"]`);
        if (memberElem) {
            e.currentTarget.appendChild(memberElem);
        }

        // 드롭 위치의 부서/팀 정보 추출
        const teamMap = {
            operationTeam: { department: '운영부', team: 'operationTeam', role: 'officer' },
            cooperationTeam: { department: '운영부', team: 'cooperationTeam', role: 'officer' },
            HumanResourceTeam: { department: '운영부', team: 'HumanResourceTeam', role: 'officer' },
            financeTeam: { department: '운영부', team: 'financeTeam', role: 'officer' },
            marketingTeam: { department: '홍보부', team: 'marketingTeam', role: 'officer' },
            designTeam: { department: '홍보부', team: 'designTeam', role: 'officer' },
            videoTeam: { department: '홍보부', team: 'videoTeam', role: 'officer' },
            PlanningTeam: { department: '기획부', team: 'PlanningTeam', role: 'officer' },
            regularTeam: { department: '기획부', team: 'regularTeam', role: 'officer' },
            staffTeam: { department: '기획부', team: 'staffTeam', role: 'officer' },
            starterTeam: { department: '기획부', team: 'starterTeam', role: 'officer' }
        };
        const targetInfo = teamMap[toListId];
        if (!targetInfo) return;

        // 현재 멤버 정보 추출
        const user = OrganizationChart.allUsers?.find(u => u.id === userId);
        if (!user) return;

        // 역할/팀이 다르면 확인
        let needRoleChange = user.role !== targetInfo.role || user.team !== targetInfo.team || user.department !== targetInfo.department;
        if (needRoleChange) {
            if (!confirm(`${user.name}님의 역할/팀을 "${targetInfo.department} - ${toListId}"로 변경하시겠습니까?`)) {
                // 취소 시 원래 위치로 되돌림
                document.getElementById(fromListId).appendChild(memberElem);
                return;
            }
        }

        // pendingChanges에 추가(중복 제거)
        OrganizationChart.pendingChanges = OrganizationChart.pendingChanges.filter(c => c.userId !== userId);
        OrganizationChart.pendingChanges.push({
            userId,
            ...targetInfo
        });

        // UI상에서 바로 반영
        user.role = targetInfo.role;
        user.team = targetInfo.team;
        user.department = targetInfo.department;
    }

    static async applyPendingChanges() {
        for (const change of this.pendingChanges) {
            try {
                // staffSubteam 변경만 있는 경우
                if (change.staffSubteam !== undefined) {
                    await fetch(`/user/update-team/${change.userId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            team: 'staffTeam',
                            department: '기획부',
                            staffSubteam: change.staffSubteam
                        })
                    });
                    continue;
                }
                // 역할 변경
                await fetch(`/user/update-role/${change.userId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        role: change.role,
                        department: change.department,
                        team: change.team
                    })
                });
            } catch (e) {
                alert('역할/팀 변경 중 오류가 발생했습니다.');
            }
        }
        alert('변경사항이 저장되었습니다.');
        this.pendingChanges = [];
        await this.loadData();
    }

    static async loadData() {
        try {
            const response = await fetch('/user/participants/users');
            if (!response.ok) throw new Error('데이터 로드 실패');
            const users = await response.json();
            this.allUsers = users; // 드래그&드롭에서 사용

            // 기존 멤버 리스트 초기화
            document.querySelectorAll('.member-list').forEach(list => {
                list.innerHTML = '';
            });

            // admin 유저 표시
            const adminUsers = users.filter(user => user.role === 'admin');
            const adminContainer = document.getElementById('administration');
            if (adminContainer) {
                adminUsers.forEach(user => {
                    const memberDiv = document.createElement('div');
                    memberDiv.className = 'member';
                    memberDiv.innerHTML = `
                        <span class="name">${user.name}</span>
                        <span class="contact">${user.phonenumber ? user.phonenumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '-'}</span>
                    `;
                    adminContainer.appendChild(memberDiv);
                });
            }

            // officer 유저 표시 (팀장 우선 정렬)
            const officerUsers = users.filter(user => user.role === 'officer');
            // 스태프팀 멤버 분리
            const staffTeamUsers = officerUsers.filter(user => user.team === 'staffTeam');
            const otherTeamUsers = officerUsers.filter(user => user.team !== 'staffTeam');

            // 일반 팀 처리
            const teams = [
                'operationTeam', 'cooperationTeam', 'HumanResourceTeam', 'financeTeam',
                'marketingTeam', 'designTeam', 'videoTeam',
                'PlanningTeam', 'regularTeam', 'starterTeam'
            ];
            teams.forEach(teamId => {
                const teamContainer = document.getElementById(teamId);
                if (!teamContainer) return;
                // 팀장 먼저, 그 다음 일반 멤버
                const teamMembers = otherTeamUsers.filter(u => u.team === teamId);
                const leaders = teamMembers.filter(u => u.isTeamLeader);
                const members = teamMembers.filter(u => !u.isTeamLeader);
                [...leaders, ...members].forEach(user => {
                    const memberDiv = document.createElement('div');
                    memberDiv.className = `member${user.isTeamLeader ? ' team-leader' : ''}`;
                    memberDiv.dataset.userId = user.id;
                    memberDiv.innerHTML = `
                        <span class="name">${user.name}</span>
                        <span class="contact">${user.phonenumber ? user.phonenumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '-'}</span>
                    `;
                    teamContainer.appendChild(memberDiv);
                });
            });

            // 스태프팀 내 A-1, B-1, C-1, C-2 영역 생성 및 멤버 배치
            const staffTeamContainer = document.getElementById('staffTeam');
            if (staffTeamContainer) {
                staffTeamContainer.innerHTML = `
                    <div class="staff-subteam" id="staff-A1">
                        <div class="staff-subteam-title">A-1팀</div>
                        <div class="staff-subteam-list"></div>
                    </div>
                    <div class="staff-subteam" id="staff-B1">
                        <div class="staff-subteam-title">B-1팀</div>
                        <div class="staff-subteam-list"></div>
                    </div>
                    <div class="staff-subteam" id="staff-C1">
                        <div class="staff-subteam-title">C-1팀</div>
                        <div class="staff-subteam-list"></div>
                    </div>
                    <div class="staff-subteam" id="staff-C2">
                        <div class="staff-subteam-title">C-2팀</div>
                        <div class="staff-subteam-list"></div>
                    </div>
                    <div class="staff-subteam" id="staff-unknown">
                        <div class="staff-subteam-title">미지정</div>
                        <div class="staff-subteam-list"></div>
                    </div>
                `;
                // staffSubteam 값에 따라 배치
                staffTeamUsers.forEach(user => {
                    let subteamId;
                    if (user.staffSubteam === 'A-1') subteamId = 'staff-A1';
                    else if (user.staffSubteam === 'B-1') subteamId = 'staff-B1';
                    else if (user.staffSubteam === 'C-1') subteamId = 'staff-C1';
                    else if (user.staffSubteam === 'C-2') subteamId = 'staff-C2';
                    else subteamId = 'staff-unknown';
                    const subteamList = document.querySelector(`#${subteamId} .staff-subteam-list`);
                    if (subteamList) {
                        const memberDiv = document.createElement('div');
                        memberDiv.className = `member${user.isTeamLeader ? ' team-leader' : ''}`;
                        memberDiv.dataset.userId = user.id;
                        memberDiv.innerHTML = `
                            <span class="name">${user.name}</span>
                            <span class="contact">${user.phonenumber ? user.phonenumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '-'}</span>
                        `;
                        subteamList.appendChild(memberDiv);
                    }
                });
            }

            // 수정모드일 때 드래그 가능하게 다시 세팅
            if (this.isEditMode) {
                this.toggleEditMode(true);
            } else if (await this.isAdmin()) {
                this.setupTeamLeaderEdit();
            }

            // 인원수 업데이트 추가
            this.updateMemberCounts();
        } catch (error) {
            console.error('데이터 로드 중 오류:', error);
            alert('데이터를 불러오는데 실패했습니다.');
        }
    }

    static updateMemberCounts() {
        // 각 팀의 인원수 업데이트
        document.querySelectorAll('.team').forEach(team => {
            const memberCount = team.querySelector('.member-list').children.length;
            team.querySelector('.member-count').textContent = memberCount;
        });

        // 각 부서의 인원수 업데이트
        document.querySelectorAll('.department').forEach(dept => {
            const memberCount = dept.querySelectorAll('.member-list .member').length;
            dept.querySelector('h2 .member-count').textContent = memberCount;
        });
    }

    static async isAdmin() {
        try {
            const res = await fetch('/user/info');
            const user = await res.json();
            return user.role === 'admin';
        } catch (e) {
            return false;
        }
    }

    static async setupTeamLeaderEdit() {
        document.querySelectorAll('.member').forEach(member => {
            member.addEventListener('contextmenu', async (e) => {
                e.preventDefault();
                const userId = member.dataset.userId;
                const memberName = member.querySelector('.name').textContent;
                const isCurrentlyLeader = member.classList.contains('team-leader');

                const action = isCurrentlyLeader ? '해제' : '지정';
                if (confirm(`${memberName}님의 팀장 ${action}을 하시겠습니까?`)) {
                    try {
                        const response = await fetch(`/user/update-team-leader/${userId}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ isTeamLeader: !isCurrentlyLeader })
                        });

                        if (!response.ok) {
                            throw new Error('팀장 상태 업데이트 실패');
                        }

                        // 변경 성공 시 바로 UI에 반영
                        member.classList.toggle('team-leader');
                        alert(`팀장 ${action}이 완료되었습니다.`);

                        // 전체 데이터 새로고침
                        await this.loadData();
                    } catch (error) {
                        console.error('팀장 상태 업데이트 중 오류:', error);
                        alert('팀장 상태 업데이트에 실패했습니다.');
                    }
                }
            });
        });
    }
}

function createMemberElement(member) {
    // HTTP URL을 HTTPS로 변환
    const secureProfileImage = member.profileImage?.replace('http://', 'https://') || '/images/basic_Image.png';
    
    return `
      <div class="member">
        <img src="${secureProfileImage}" alt="Profile" 
             onerror="this.src='/images/basic_Image.png'">
        <span>${member.name}</span>
        ${member.isTeamLeader ? '<span class="leader-badge">팀장</span>' : ''}
      </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    OrganizationChart.init();
});
