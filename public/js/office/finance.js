class TransactionTable {
    constructor() {
        this.data = [];
        this.page = 0;
        this.rowsPerPage = 10;
        this.tableContainer = document.getElementById('table-container');
        this.tbody = document.getElementById('transaction-body');
        this.prevButton = document.getElementById('prev-page');
        this.nextButton = document.getElementById('next-page');
        this.pageInfo = document.getElementById('page-info');
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('verify-button').addEventListener('click', () => {
            const fileInput = document.getElementById('transaction-upload');
            const file = fileInput.files[0];
            if (file) {
                this.handleFileUpload(file);
            } else {
                alert('파일을 선택해주세요.');
            }
        });

        this.prevButton.addEventListener('click', () => this.previousPage());
        this.nextButton.addEventListener('click', () => this.nextPage());
    }
    
    handleFileUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.data = JSON.parse(e.target.result).filter(row => row.거래일시 !== "");
                this.page = 0;
                this.renderTable();
                this.tableContainer.classList.remove('hidden');
                document.getElementById('fee-verify-button').classList.remove('hidden');
            } catch (error) {
                console.error('Error parsing JSON:', error);
                alert('파일 형식이 올바르지 않습니다.');
            }
        };
        reader.readAsText(file);
    }

    getPageData() {
        const start = this.page * this.rowsPerPage;
        return this.data.slice(start, start + this.rowsPerPage);
    }

    renderTable() {
        const pageData = this.getPageData();
        this.tbody.innerHTML = pageData.map((row, idx) => `
            <tr class="${idx % 2 === 0 ? 'even-row' : 'odd-row'}">
                <td>${row.거래일시 || ''}</td>
                <td>${row.구분 || ''}</td>
                <td class="text-right">${row.거래금액 || ''}</td>
                <td class="text-right">${row['거래 후 잔액'] || ''}</td>
                <td>${row.거래구분 || ''}</td>
                <td>${row.내용 || ''}</td>
                <td>${row.메모 || ''}</td>
            </tr>
        `).join('');

        const totalPages = Math.ceil(this.data.length / this.rowsPerPage);
        this.pageInfo.textContent = `Page ${this.page + 1} of ${totalPages}`;
        
        this.prevButton.disabled = this.page === 0;
        this.nextButton.disabled = this.page >= totalPages - 1;
    }

    previousPage() {
        if (this.page > 0) {
            this.page--;
            this.renderTable();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.data.length / this.rowsPerPage);
        if (this.page < totalPages - 1) {
            this.page++;
            this.renderTable();
        }
    }

    getData() {
        return this.data;
    }
}

class FeeVerification {
    constructor() {
        this.transactionTable = new TransactionTable();
        this.verificationResults = {
            verified: [],
            unverified: [],
            processing: false
        };
        
        this.setupEventListeners();
        this.setupVerificationContainer();
    }

    setupVerificationContainer() {
        const container = document.createElement('div');
        container.id = 'verification-container';
        container.className = 'verification-container';
        document.getElementById('table-container').insertAdjacentElement('afterend', container);
    }

    setupEventListeners() {
        document.getElementById('fee-verify-button').addEventListener('click', async () => {
            await this.verifyFees();
        });
    }

    async fetchParticipants() {
        try {
            const response = await fetch('/user/participants/users');
            if (!response.ok) throw new Error('Failed to fetch participants');
            const users = await response.json();
            return users.filter(user => user.role === 'participant');
        } catch (error) {
            console.error('Error fetching participants:', error);
            return [];
        }
    }

    extractDepositorInfo(transaction) {
        const memo = transaction.메모 || '';
        const phoneMatch = memo.match(/\d{4}/);
        const depositorName = transaction.내용.replace(/[0-9]/g, '').replace('회비', '').trim();
        const amount = parseInt(transaction.거래금액.replace(/,/g, ''), 10);
        
        return {
            name: depositorName,
            phoneNumber: phoneMatch ? phoneMatch[0] : null,
            amount: amount
        };
    }

    async verifyFees() {
        const transactionData = this.transactionTable.getData();
        if (!transactionData.length) {
            alert('거래 데이터를 먼저 업로드해주세요.');
            return;
        }
    
        const participants = await this.fetchParticipants();
        
        
        this.verificationResults.processing = true;
        this.verificationResults.verified = [];
        this.verificationResults.unverified = [...participants];
    
        // 이미 처리된 참가자 ID를 추적
        const processedParticipantIds = new Set();
    
        // 12000원 입금 내역만 필터링
        const feeTransactions = transactionData.filter(trans => {
            const amount = parseInt(trans.거래금액.replace(/,/g, ''), 10);
            return amount === 12000;
        });
    
        for (const transaction of feeTransactions) {
            // 입금자 이름 추출 (내용 필드에서) - 숫자 유지
            const depositorName = transaction.내용.replace('회비', '').trim();
            
            // 메모 필드에서 전화번호와 회비 여부 확인
            const memo = transaction.메모;
            const memoMatch = memo.match(/(\d{4})(회비)/);
    
            // 메모 형식이 맞지 않으면 건너뛰기
            if (!memoMatch) {
                console.warn(`메모 형식 불일치 - 입금자: ${depositorName}, 메모: ${memo}`);
                continue;
            }
    
            const phoneNumber = memoMatch[1];  // 전화번호 4자리
            const feeType = memoMatch[2];      // "회비"
    
            // 이름과 전화번호 뒷자리가 모두 일치하는 참가자 찾기
            let participant = null;
            for (const p of participants) {
                const nameMatches = p.name.replace(/\s+/g, '') === depositorName;
                const phoneMatches = p.phonenumber?.slice(-4) === phoneNumber;
                const notProcessed = !processedParticipantIds.has(p.id);
    
                if (nameMatches && phoneMatches && notProcessed) {
                    participant = p;
                    break;
                }
            }
    
            if (participant && feeType === '회비') {
                // 모든 조건이 일치하는 경우
                this.verificationResults.verified.push(participant);
                this.verificationResults.unverified = this.verificationResults.unverified
                    .filter(p => p.id !== participant.id);
    
                // 처리된 참가자 기록
                processedParticipantIds.add(participant.id);
    
                // 활성 상태 업데이트
                await this.updateParticipantStatus(participant.id, true);
    
            } else {
                // 매칭 실패 원인 상세 로깅
                const failureReasons = [];
                const matchedByName = participants.find(p => 
                    p.name.replace(/\s+/g, '') === depositorName
                );
                const matchedByPhone = participants.find(p => 
                    p.phonenumber?.slice(-4) === phoneNumber
                );
    
                if (!matchedByName) failureReasons.push('이름 불일치');
                if (!matchedByPhone) failureReasons.push('전화번호 불일치');
                if (feeType !== '회비') failureReasons.push('회비 타입 불일치');
    
                console.warn(
                    `매칭 실패 - ` +
                    `입금자: ${depositorName}, ` +
                    `전화번호: ${phoneNumber}, ` +
                    `실패 사유: ${failureReasons.join(', ')}`
                );
            }
        }
    
        // 미납 참가자 비활성화
        for (const unverifiedParticipant of this.verificationResults.unverified) {
            await this.updateParticipantStatus(unverifiedParticipant.id, false);
        }
    
        this.verificationResults.processing = false;
        this.displayVerificationResults();
    }

    async updateParticipantStatus(userId, active) {
        try {
            const response = await fetch(`/user/toggle-active/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active })
            });

            if (!response.ok) {
                throw new Error('Failed to update participant status');
            }
        } catch (error) {
            console.error('Error updating participant status:', error);
        }
    }

    displayVerificationResults() {
        alert('입금처리가 완료되었습니다.');
        const container = document.getElementById('verification-container');
        container.innerHTML = `
            <div class="verification-results">
                <h3>회비 납부 확인 결과</h3>
                <div class="results-grid">
                    <div class="results-box">
                        <h4>납부 완료 (${this.verificationResults.verified.length}명)</h4>
                        <ul>
                            ${this.verificationResults.verified.map(p => `
                                <li>${p.name} (${p.displayName}) - ${p.phonenumber || '전화번호 없음'}</li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="results-box">
                        <h4>미납 (${this.verificationResults.unverified.length}명)</h4>
                        <ul>
                            ${this.verificationResults.unverified.map(p => `
                                <li>${p.name} (${p.displayName}) - ${p.phonenumber || '전화번호 없음'}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new FeeVerification();
});