const days = ['일', '월', '화', '수', '목', '금', '토'];
const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const teamColors = {
    'A-1': '#FF6384',
    'B-1': '#36A2EB',
    'C-1': '#FFCE56',
    'C-2': '#4BC0C0'
};

async function fetchData() {
    try {
        const response = await fetch('/office/team-statistics');
        
        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login';
                return null;
            }
            throw new Error('Failed to fetch statistics');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        return null;
    }
}

function createBasicStats(data) {
    const statsDiv = document.getElementById('basicStats');
    statsDiv.innerHTML = '';
    
    Object.entries(data).forEach(([team, stats]) => {
        const teamDiv = document.createElement('div');
        teamDiv.className = 'stat-card';
        teamDiv.innerHTML = `
            <h3>${team}</h3>
            <p>평균 평점: ${stats.averageRating.toFixed(1)}</p>
            <p>평균 참가비: ${stats.averageFee.toLocaleString()}원</p>
            <p>평균 소요시간: ${stats.averageDuration}분</p>
            <p>평균 참가율: ${stats.participationRate}%</p>
            <p>총 이벤트: ${stats.totalEvents}회</p>
        `;
        statsDiv.appendChild(teamDiv);
    });
}

function createCharts(data) {
    if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
        console.error('차트를 위한 유효한 데이터가 없습니다');
        return;
    }

    const teams = Object.keys(data);
    const commonOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: {
                    padding: 20,
                    font: {
                        size: 12
                    }
                }
            },
            title: {
                display: true,
                font: {
                    size: 16,
                    weight: 'bold'
                },
                padding: {
                    bottom: 20
                }
            }
        }
    };

    createRatingChart(teams, data, commonOptions);
    createDayChart(teams, data, commonOptions);
    createFeeChart(teams, data, commonOptions);
    createMonthChart(teams, data, commonOptions);
    createParticipationChart(teams, data, commonOptions);
    createTimeChart(teams, data, commonOptions);
}

function createRatingChart(teams, data, commonOptions) {
    new Chart(document.getElementById('ratingChart'), {
        type: 'bar',
        data: {
            labels: teams,
            datasets: [{
                label: '팀별 평균 평점',
                data: teams.map(team => data[team]?.averageRating || 0),
                backgroundColor: teams.map(team => teamColors[team])
            }]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                title: {
                    ...commonOptions.plugins.title,
                    text: '팀별 이벤트 평균 평점'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    title: {
                        display: true,
                        text: '평점 (5점 만점)',
                        font: { size: 12 }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '팀',
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

function createDayChart(teams, data, commonOptions) {
    new Chart(document.getElementById('dayChart'), {
        type: 'line',
        data: {
            labels: days,
            datasets: teams.map(team => ({
                label: team,
                data: Array(7).fill(0).map((_, i) => data[team]?.eventsByDay[i] || 0),
                borderColor: teamColors[team],
                fill: false
            }))
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                title: {
                    ...commonOptions.plugins.title,
                    text: '요일별 이벤트 분포'
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: '이벤트 수',
                        font: { size: 12 }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '요일',
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

function createFeeChart(teams, data, commonOptions) {
    new Chart(document.getElementById('feeChart'), {
        type: 'bar',
        data: {
            labels: teams,
            datasets: [{
                label: '평균 참가비',
                data: teams.map(team => data[team]?.averageFee || 0),
                backgroundColor: teams.map(team => teamColors[team])
            }]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                title: {
                    ...commonOptions.plugins.title,
                    text: '팀별 평균 참가비'
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: '참가비 (원)',
                        font: { size: 12 }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '팀',
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

function createMonthChart(teams, data, commonOptions) {
    new Chart(document.getElementById('monthChart'), {
        type: 'line',
        data: {
            labels: months,
            datasets: teams.map(team => ({
                label: team,
                data: Array(12).fill(0).map((_, i) => data[team]?.eventsByMonth[i] || 0),
                borderColor: teamColors[team],
                fill: false
            }))
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                title: {
                    ...commonOptions.plugins.title,
                    text: '월별 이벤트 추이'
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: '이벤트 수',
                        font: { size: 12 }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '월',
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

function createTimeChart(teams, data, commonOptions) {
    new Chart(document.getElementById('timeChart'), {
        type: 'line',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}시`),
            datasets: teams.map(team => ({
                label: team,
                data: Array(24).fill(0).map((_, i) => data[team]?.eventsByHour[i] || 0),
                borderColor: teamColors[team],
                fill: false
            }))
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                title: {
                    ...commonOptions.plugins.title,
                    text: '시간대별 이벤트 분포'
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: '이벤트 수',
                        font: { size: 12 }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '시간',
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

function createParticipationChart(teams, data, commonOptions) {
    new Chart(document.getElementById('participationChart'), {
        type: 'bar',
        data: {
            labels: teams,
            datasets: [{
                label: '평균 참가율 (%)',
                data: teams.map(team => data[team]?.participationRate || 0),
                backgroundColor: teams.map(team => teamColors[team])
            }]
        },
        options: {
            ...commonOptions,
            plugins: {
                ...commonOptions.plugins,
                title: {
                    ...commonOptions.plugins.title,
                    text: '팀별 평균 참가율'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '참가율 (%)',
                        font: { size: 12 }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '팀',
                        font: { size: 12 }
                    }
                }
            }
        }
    });
}

async function initDashboard() {
    try {
        const data = await fetchData();
        if (data) {
            createBasicStats(data);
            createCharts(data);
        }
    } catch (error) {
        console.error('대시보드 초기화 중 오류:', error);
    }
}

// 페이지 로드 시 대시보드 초기화
document.addEventListener('DOMContentLoaded', initDashboard);
