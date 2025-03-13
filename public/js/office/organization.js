class OrganizationChart {
    static init() {
        this.loadData();
        if (this.isAdmin()) {
            this.setupTeamLeaderEdit();
        }
    }

    static async isAdmin() {
        try {
            const response = await fetch('/user/info');
            const userData = await response.json();
            return userData.role === 'admin';
        } catch (error) {
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
                        this.loadData();
                    } catch (error) {
                        console.error('팀장 상태 업데이트 중 오류:', error);
                        alert('팀장 상태 업데이트에 실패했습니다.');
                    }
                }
            });
        });
    }

    static async loadData() {
        try {
            const response = await fetch('/user/participants/users');
            if (!response.ok) throw new Error('데이터 로드 실패');

            const users = await response.json();
            
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

            // officer 유저 표시
            const officerUsers = users.filter(user => user.role === 'officer');
            officerUsers.forEach(user => {
                const teamContainer = document.getElementById(user.team);
                if (!teamContainer) return;

                const memberDiv = document.createElement('div');
                memberDiv.className = `member${user.isTeamLeader ? ' team-leader' : ''}`;
                memberDiv.dataset.userId = user.id;
                memberDiv.innerHTML = `
                    <span class="name">${user.name}</span>
                    <span class="contact">${user.phonenumber ? user.phonenumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : '-'}</span>
                `;
                teamContainer.appendChild(memberDiv);
            });

            if (await this.isAdmin()) {
                this.setupTeamLeaderEdit();
            }
        } catch (error) {
            console.error('데이터 로드 중 오류:', error);
            alert('데이터를 불러오는데 실패했습니다.');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    OrganizationChart.init();
});
