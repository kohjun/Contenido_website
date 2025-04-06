const Dashboard = {
  async initialize() {
    try {
      // Chart.js 로드
      if (!window.Chart) {
        await this.loadChartJS();
      }
      
      // 유저 데이터만 가져오기
      const userData = await this.fetchUserData();
      
      // 차트 초기화
      this.initializeCharts(userData);
      
      // 통계 정보 업데이트
      this.updateStatistics(userData);
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      throw error;
    }
  },

  async loadChartJS() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  async fetchUserData() {
    const response = await fetch('/user/participants/users');
    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }
    return response.json();
  },

  initializeCharts(userData) {
    if (!userData || !Array.isArray(userData)) {
      console.error('Invalid user data:', userData);
      return;
    }

    const { roleCounts, genderData, activityData, avgAge, monthlySignups } = this.processData(userData);

    const commonChartOptions = {
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            generateLabels: function(chart) {
              const data = chart.data;
              const total = data.datasets[0].data.reduce((sum, value) => sum + value, 0);
              return data.labels.map((label, i) => ({
                text: `${label} (${data.datasets[0].data[i]}명, ${Math.round(data.datasets[0].data[i]/total*100)}%)`,
                fillStyle: data.datasets[0].backgroundColor[i],
                index: i
              }));
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
              const value = context.raw;
              const percentage = Math.round((value / total) * 100);
              return `${value}명 (${percentage}%)`;
            }
          }
        }
      }
    };

    // 역할 분포 차트
    this.createChart('roleChart', {
      type: 'pie',
      data: {
        labels: ['운영진', '참가자', '스타터', '게스트'],
        datasets: [{
          data: [
            roleCounts['officer'] || 0,
            roleCounts['participant'] || 0,
            roleCounts['starter'] || 0,
            roleCounts['guest'] || 0
          ],
          backgroundColor: ['#4BC0C0', '#0A84FE', '#FFCE56', '#ddd']
        }]
      },
      options: commonChartOptions
    });

    // 성별 분포 차트
    this.createChart('genderChart', {
      type: 'pie',
      data: {
        labels: ['남성', '여성', '기타'],
        datasets: [{
          data: [
            genderData['male'] || 0,
            genderData['female'] || 0,
            genderData['other'] || 0
          ],
          backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56']
        }]
      },
      options: commonChartOptions
    });

    // 선호 활동지역 차트
    const topActivities = Object.entries(activityData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    this.createChart('activityChart', {
      type: 'bar',
      data: {
        labels: topActivities.map(([area]) => area),
        datasets: [{
          label: '선호 활동지역',
          data: topActivities.map(([,count]) => count),
          backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
          borderRadius: 5,
          maxBarThickness: 50
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',  // 가로 막대 차트로 변경
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              font: { size: 12 }
            },
            grid: {
              display: false
            }
          },
          y: {
            ticks: {
              font: { size: 12 }
            },
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            display: false  // 범례 숨김
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.parsed.x}명`;
              }
            }
          }
        }
      }
    });

    // 분기별 회원 현황 차트
    this.createChart('growthChart', {
      type: 'line',
      data: {
        labels: monthlySignups.map(d => `${d.year}년 ${d.quarter}분기`),
        datasets: [{
          label: '신규 가입자',
          data: monthlySignups.map(d => d.newMembers),
          borderColor: '#4BC0C0',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
          tension: 0.3,
          fill: true
        },
        {
          label: '총 회원수',
          data: monthlySignups.map(d => d.totalMembers),
          borderColor: '#FF6384',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y}명`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });

    // 연령 정보 업데이트
    document.getElementById('averageAge').textContent = 
      avgAge.toFixed(1);
  },

  createChart(canvasId, config) {
    const ctx = document.getElementById(canvasId);
    if (ctx) {
      return new Chart(ctx, config);
    }
  },

  processData(userData) {
    if (!userData || !Array.isArray(userData)) {
      return {
        roleCounts: {},
        genderData: {},
        activityData: {},
        avgAge: 0,
        monthlySignups: []
      };
    }

    const today = new Date();
    const activeUsers = userData.filter(user => user.active);
    
    // 월별 회원가입 데이터 처리
    const signupsByMonth = userData.reduce((acc, user) => {
      if (user.createdAt) {
        const date = new Date(user.createdAt);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month}`;
        
        if (!acc[key]) {
          acc[key] = {
            year,
            month,
            count: 0
          };
        }
        acc[key].count++;
      }
      return acc;
    }, {});

    // 최근 12개월 데이터를 위한 모든 월 초기화
    const last12Months = new Array(12).fill(0).map((_, i) => {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        count: 0
      };
    }).reverse();

    // 실제 데이터로 채우기
    last12Months.forEach(monthData => {
      const key = `${monthData.year}-${monthData.month}`;
      if (signupsByMonth[key]) {
        monthData.count = signupsByMonth[key].count;
      }
    });

    // 분기별 데이터 처리
    const quarterMonths = {
      1: [1], // 1분기 (1월)
      2: [4], // 2분기 (4월)
      3: [7], // 3분기 (7월)
      4: [10] // 4분기 (10월)
    };

    const quarterlyData = {};
    let runningTotal = 0;

    userData.forEach(user => {
      if (user.createdAt) {
        const date = new Date(user.createdAt);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        // 해당 월이 속한 분기 찾기
        const quarter = Object.entries(quarterMonths).find(([_, months]) => 
          months.includes(month))?.[0];

        if (quarter) {
          const key = `${year}-${quarter}`;
          if (!quarterlyData[key]) {
            quarterlyData[key] = {
              year,
              quarter,
              newMembers: 0,
              totalMembers: 0
            };
          }
          quarterlyData[key].newMembers++;
          runningTotal++;
          quarterlyData[key].totalMembers = runningTotal;
        }
      }
    });

    // 최근 8분기(2년) 데이터 생성
    const last8Quarters = [];
    const today = new Date();
    let currentYear = today.getFullYear();
    let currentQuarter = Math.floor((today.getMonth() / 3)) + 1;

    for (let i = 0; i < 8; i++) {
      const key = `${currentYear}-${currentQuarter}`;
      last8Quarters.unshift({
        year: currentYear,
        quarter: currentQuarter,
        newMembers: quarterlyData[key]?.newMembers || 0,
        totalMembers: quarterlyData[key]?.totalMembers || 
          (last8Quarters[0]?.totalMembers || 0)
      });

      currentQuarter--;
      if (currentQuarter < 1) {
        currentQuarter = 4;
        currentYear--;
      }
    }

    return {
      roleCounts: userData.reduce((acc, user) => {
        if (user.role) {
          acc[user.role] = (acc[user.role] || 0) + 1;
        }
        return acc;
      }, {}),
      
      genderData: userData.reduce((acc, user) => {
        if (user.gender) {
          acc[user.gender] = (acc[user.gender] || 0) + 1;
        }
        return acc;
      }, {}),
      
      activityData: userData.reduce((acc, user) => {
        // preferredActivity가 있고 '-'가 아닌 경우에만 카운트
        if (user.preferredActivity && user.preferredActivity !== '-') {
          // 기존 값이 있으면 증가, 없으면 1로 초기화
          acc[user.preferredActivity] = (acc[user.preferredActivity] || 0) + 1;
        }
        return acc;
      }, {}),

      avgAge: activeUsers.reduce((acc, user) => {
        if (user.birthDate) {
          const birthYear = new Date(user.birthDate).getFullYear();
          const age = today.getFullYear() - birthYear;
          return acc + age;
        }
        return acc;
      }, 0) / (activeUsers.filter(user => user.birthDate).length || 1),

      monthlySignups: last8Quarters
    };
  },

  getMonthlySignups(userData) {
    const signupsByMonth = userData.reduce((acc, user) => {
      if (user.createdAt) {
        const date = new Date(user.createdAt);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month}`;
        
        if (!acc[key]) {
          acc[key] = {
            year,
            month,
            count: 0
          };
        }
        acc[key].count++;
      }
      return acc;
    }, {});

    // 최근 12개월의 데이터만 반환
    return Object.values(signupsByMonth)
      .sort((a, b) => (a.year - b.year) || (a.month - b.month))
      .slice(-12);
  },

  updateStatistics(userData) {
    if (!userData || !Array.isArray(userData)) {
      console.error('Invalid user data in updateStatistics');
      return;
    }

    // 기본 통계 업데이트
    document.getElementById('totalMembers').textContent = userData.length+'명';
    document.getElementById('activeMembers').textContent = 
      userData.filter(u => u.active).length+'명';
    document.getElementById('avgParticipation').textContent = 
      (userData.reduce((acc, user) => 
        acc + (user.participationCount?.regularCount || 0), 0) / userData.length)
      .toFixed(1)+'번';
  },

  // 불필요한 메서드 제거
  getDepartmentName: undefined,
  getTeamName: undefined,
  updateDepartmentDetails: undefined
};

if (typeof window !== 'undefined') {
  window.Dashboard = Dashboard;
}
