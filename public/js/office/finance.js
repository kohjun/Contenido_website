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

        this.prevButton.addEventListener('click', () => this.previousPage()); // 이전 버튼 이벤트 리스너 추가
        this.nextButton.addEventListener('click', () => this.nextPage()); // 다음 버튼 이벤트 리스너 추가
    }
    
    handleFileUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.data = JSON.parse(e.target.result).filter(row => row.거래일시 !== "");
                this.page = 0;
                this.renderTable();
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
}

document.addEventListener('DOMContentLoaded', () => {
    new TransactionTable();
});