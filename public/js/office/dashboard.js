const Dashboard = {
  async initialize() {
    try {
      if (!window.Chart) {
        await this.loadChartJS();
      }
      const userData = await this.fetchUserData();
      this.initializeCharts(userData);
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
    
    // 분기별 범위 정의
    const quarterMonths = {
      1: [1, 2, 3],    // 1분기
      2: [4, 5, 6],    // 2분기
      3: [7, 8, 9],    // 3분기
      4: [10, 11, 12]  // 4분기
    };

    const getQuarterFromMonth = (month) => {
      for (const [quarter, months] of Object.entries(quarterMonths)) {
        if (months.includes(month)) {
          return parseInt(quarter);
        }
      }
      return 1;
    };

    // 실제 회원 수 계산 (게스트 제외)
    const calculateActualMembers = (users, beforeDate) => {
      return users.filter(user => {
        const createdAt = new Date(user.createdAt);
        return createdAt <= beforeDate && 
               ['officer', 'participant', 'starter'].includes(user.role);
      }).length;
    };

    const quarterlyData = {};
    userData.forEach(user => {
      if (user.createdAt) {
        const date = new Date(user.createdAt);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const quarter = getQuarterFromMonth(month);
        const key = `${year}-${quarter}`;

        if (!quarterlyData[key]) {
          quarterlyData[key] = {
            year,
            quarter,
            newMembers: 0,
            totalMembers: 0
          };
        }
        // 게스트가 아닌 경우만 카운트
        if (['officer', 'participant', 'starter'].includes(user.role)) {
          quarterlyData[key].newMembers++;
        }
      }
    });

    // 최근 8분기(2년) 데이터 생성
    const last8Quarters = [];
    let currentYear = today.getFullYear();
    let currentQuarter = Math.floor((today.getMonth() / 3)) + 1;

    for (let i = 0; i < 8; i++) {
      const quarterEndDate = new Date(currentYear, quarterMonths[currentQuarter][2], 31);
      const key = `${currentYear}-${currentQuarter}`;
      
      last8Quarters.unshift({
        year: currentYear,
        quarter: currentQuarter,
        newMembers: quarterlyData[key]?.newMembers || 0,
        totalMembers: calculateActualMembers(userData, quarterEndDate)
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
        if (user.preferredActivity && user.preferredActivity !== '-') {
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

  updateStatistics(userData) {
    if (!userData || !Array.isArray(userData)) {
      console.error('Invalid user data in updateStatistics');
      return;
    }

    const actualMembers = userData.filter(u => 
      ['officer', 'participant', 'starter'].includes(u.role));

    document.getElementById('totalMembers').textContent = actualMembers.length+'명';
    document.getElementById('activeMembers').textContent = 
      actualMembers.filter(u => u.active).length+'명';
    document.getElementById('avgParticipation').textContent = 
      (actualMembers.reduce((acc, user) => 
        acc + (user.participationCount?.regularCount || 0), 0) / actualMembers.length)
      .toFixed(1)+'번';
  }
};

if (typeof window !== 'undefined') {
  window.Dashboard = Dashboard;
}
