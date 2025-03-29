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
        const verifyButton = document.getElementById('fee-verify-button');
        if (verifyButton) {
            verifyButton.addEventListener('click', async () => {
                await this.verifyFees();
            });
        }

        const downloadButton = document.getElementById('download-results');
        if (downloadButton) {
            downloadButton.addEventListener('click', () => {
                this.downloadResults();
            });
        }
    }

    async loadXLSX() {
        return new Promise((resolve, reject) => {
            if (window.XLSX) {
                resolve(window.XLSX);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
            script.onload = () => resolve(window.XLSX);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    // 결과 다운로드 함수
    async downloadResults() {
        try {
            const XLSX = await this.loadXLSX();
            const currentDate = new Date().toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).replace(/\. /g, '-').replace('.', '');

            const wb = XLSX.utils.book_new();
            const verifiedData = this.verificationResults.verified.map(p => ({
                '상태': '납부완료',
                '이름': p.name,
                '닉네임': p.displayName,
                '전화번호': this.maskPhoneNumber(p.phonenumber),
                '납부일': currentDate
            }));

            const unverifiedData = this.verificationResults.unverified.map(p => ({
                '상태': '미납',
                '이름': p.name,
                '닉네임': p.displayName,
                '전화번호': this.maskPhoneNumber(p.phonenumber),
                '납부일': '-'
            }));

            const allData = [...verifiedData, ...unverifiedData];
            const ws = XLSX.utils.json_to_sheet(allData);

            ws['!cols'] = [
                { width: 10 }, // 상태
                { width: 15 }, // 이름
                { width: 20 }, // 닉네임
                { width: 15 }, // 전화번호
                { width: 12 }  // 납부일
            ];

            XLSX.utils.book_append_sheet(wb, ws, '회비 납부 현황');
            XLSX.writeFile(wb, `회비납부현황_${currentDate}.xlsx`);
        } catch (error) {
            console.error('Error downloading results:', error);
            alert('결과 다운로드 중 오류가 발생했습니다.');
        }
    }

    maskPhoneNumber(phoneNumber) {
        if (!phoneNumber) return '-';
        return phoneNumber.replace(/(\d{3})-?\d{4}-?(\d{4})/, '$1-****-$2');
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
        if (!transactionData || !transactionData.length) {
            alert('거래 데이터를 먼저 업로드해주세요.');
            return;
        }
    
        const participants = await this.fetchParticipants();
        
        this.verificationResults.processing = true;
        this.verificationResults.verified = [];
        this.verificationResults.unverified = [...participants];
    
        const processedParticipantIds = new Set();
    
        // 입금 & 12000원 입금 내역만 필터링 (null/undefined 체크 추가)
        const feeTransactions = transactionData.filter(trans => {
            try {
                if (!trans || typeof trans !== 'object') return false;
                if (!trans.구분 || !trans.거래금액 || !trans.내용) return false;
                
                const amount = parseInt(String(trans.거래금액).replace(/,/g, ''), 10);
                return amount === 12000 && trans.구분 === '입금';
            } catch (error) {
                console.error('Invalid transaction data:', trans);
                return false;
            }
        });
    
        for (const transaction of feeTransactions) {
            try {
                const depositorName = String(transaction.내용 || "").trim().replace(/\s+/g, '');
                if (!depositorName) continue;
                
                const matchingParticipants = participants.filter(p => {
                    if (!p) return false;
                    
                    // name이 있으면 name으로 비교, 없으면 displayName으로 비교
                    const participantName = p.name ? 
                        String(p.name).replace(/\s+/g, '') : 
                        String(p.displayName || "").replace(/\s+/g, '');
                    
                    return participantName === depositorName && 
                           !processedParticipantIds.has(p.id);
                });

                if (matchingParticipants.length === 1) {
                    const participant = matchingParticipants[0];
                    this.verificationResults.verified.push(participant);
                    this.verificationResults.unverified = this.verificationResults.unverified
                        .filter(p => p.id !== participant.id);
                    processedParticipantIds.add(participant.id);
                    await this.updateParticipantStatus(participant.id, true);
                } else if (matchingParticipants.length > 1) {
                    console.warn(`동명이인 발견: ${depositorName}`);
                    matchingParticipants.forEach(p => {
                        if (!processedParticipantIds.has(p.id)) {
                            this.verificationResults.unverified.push(p);
                        }
                    });
                } else {
                    console.warn(`매칭 실패 - 입금자: ${depositorName}`);
                }
            } catch (error) {
                console.error('Error processing transaction:', error);
                continue;
            }
        }
    
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

    // FeeVerification class의 displayVerificationResults 메서드 업데이트
    displayVerificationResults() {
        const container = document.getElementById('verification-container');
        if (!container) {
            console.error('Verification container not found');
            return;
        }

        alert('입금처리가 완료되었습니다.');

        container.innerHTML = `
            <div class="verification-results">
                <h3>회비 납부 확인 결과</h3>
                <div class="results-grid">
                    <div class="results-box">
                        <h4>납부 완료 (${this.verificationResults.verified.length}명)</h4>
                        <ul>
                            ${this.verificationResults.verified.map(p => `
                                <li>${p.name} (${p.displayName}) - ${this.maskPhoneNumber(p.phonenumber) || '전화번호 없음'}</li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="results-box">
                        <h4>미납 (${this.verificationResults.unverified.length}명)</h4>
                        <ul>
                            ${this.verificationResults.unverified.map(p => `
                                <li>${p.name} (${p.displayName}) - ${this.maskPhoneNumber(p.phonenumber) || '전화번호 없음'}</li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
                <button id="download-results" class="download-button">결과 다운로드</button>
            </div>
        `;
        
        // 다운로드 버튼에 이벤트 리스너 다시 연결
        const downloadButton = document.getElementById('download-results');
        if (downloadButton) {
            downloadButton.addEventListener('click', () => {
                this.downloadResults();
            });
        }
    }
    
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new FeeVerification();
});