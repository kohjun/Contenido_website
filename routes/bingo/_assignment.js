// routes/bingo/_assignment.js
// 스마트 조 배정 알고리즘 + 헬퍼 (순수 함수, 모델 비의존) (이전: routes/bingo.js)
// 참고: SEOUL_ADJACENCY 는 원본 그대로 (불완전 데이터 보완은 비범위)

// 스마트 조 배정 함수
function smartTeamAssignment(participants, teamCount) {
  // 1. 기본 조 크기 계산
  const baseSize = Math.floor(participants.length / teamCount);
  const remainder = participants.length % teamCount;
  const teamSizes = Array(teamCount).fill(baseSize);
  for (let i = 0; i < remainder; i++) {
    teamSizes[i]++;
  }
  
  // 2. 초기 그룹 생성
  const groups = Array(teamCount).fill(null).map(() => []);
  
  // 3. 성별로 분리
  const males = participants.filter(p => p.gender === 'male');
  const females = participants.filter(p => p.gender === 'female');
  
  // 4. 각 조에 필요한 남녀 수 계산 (비율 유지)
  const maleRatio = males.length / participants.length;
  const maleSlots = teamSizes.map(size => Math.round(size * maleRatio));
  const femaleSlots = teamSizes.map((size, i) => size - maleSlots[i]);
  
  // 5. 나이순 정렬 (지그재그 배치로 나이 균형)
  const sortByAge = (arr) => arr.sort((a, b) => a.age - b.age);
  const zigzagOrder = (arr) => {
    const sorted = sortByAge(arr);
    const result = [];
    let left = 0, right = sorted.length - 1;
    let toggle = true;
    while (left <= right) {
      result.push(toggle ? sorted[left++] : sorted[right--]);
      toggle = !toggle;
    }
    return result;
  };
  
  // 6. 그리디 배정 (지역 거리 고려)
const assignToGroups = (pool, slots) => {
  const ordered = zigzagOrder(pool);
  
  for (const person of ordered) {
    let bestGroup = -1;
    let bestScore = Infinity;
    
    for (let gi = 0; gi < teamCount; gi++) {
      if (slots[gi] <= 0) continue;
      
      // 현재 그룹에 추가했을 때의 점수 계산
      const score = calculateGroupScore(groups[gi], person);
      
      if (score < bestScore || (score === bestScore && groups[gi].length < groups[bestGroup]?.length)) {
        bestGroup = gi;
        bestScore = score;
      }
    }
    
    // 🔥 안전 장치 추가
    if (bestGroup === -1) {
      // 슬롯이 남은 첫 번째 그룹 찾기
      bestGroup = slots.findIndex(s => s > 0);
    }
    
    // 여전히 그룹을 찾지 못했다면 첫 번째 그룹에 배정
    if (bestGroup === -1) {
      bestGroup = 0;
    }
    
    groups[bestGroup].push(person);
    slots[bestGroup]--;
  }
};
  
  assignToGroups([...males], [...maleSlots]);
  assignToGroups([...females], [...femaleSlots]);
  
  // 7. 스타터 최소 인원 체크 및 재배치
  ensureStarterDistribution(groups);
  
  // 8. 교환을 통한 최적화 (선택적)
  optimizeBySwaps(groups, 1000);
  
  return groups;
}

// 그룹 점수 계산 (낮을수록 좋음)
function calculateGroupScore(group, newPerson) {
  if (group.length === 0) return 0;
  
  let score = 0;
  
  // 지역 거리 패널티
  for (const member of group) {
    const distance = getRegionDistance(member.region, newPerson.region);
    score += distance > 2 ? 10 : distance; // 2칸 이상 떨어지면 큰 패널티
  }
  
  // 나이 차이 패널티
  const ages = [...group.map(m => m.age), newPerson.age];
  const ageDiff = Math.max(...ages) - Math.min(...ages);
  score += ageDiff > 6 ? (ageDiff - 6) * 5 : 0;
  
  return score;
}

// 서울 25개 구 거리 계산 (BFS)
const SEOUL_ADJACENCY = {
  "종로구": ["은평구","서대문구","중구","용산구","성북구","동대문구"],
  "중구": ["종로구","용산구","성동구","동대문구","마포구"],
  // ... 전체 인접 정보
};

function getRegionDistance(region1, region2) {
  if (region1 === region2) return 0;
  
  const queue = [[region1, 0]];
  const visited = new Set([region1]);
  
  while (queue.length > 0) {
    const [current, dist] = queue.shift();
    const neighbors = SEOUL_ADJACENCY[current] || [];
    
    for (const neighbor of neighbors) {
      if (neighbor === region2) return dist + 1;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([neighbor, dist + 1]);
      }
    }
  }
  
  return 100; // 연결되지 않음
}

// 스타터 분배 보장
function ensureStarterDistribution(groups) {
  const starters = groups.flatMap((g, gi) => 
    g.filter(m => m.isStarter).map(m => ({...m, groupIndex: gi}))
  );
  
  // 각 조의 스타터 수 계산
  const starterCounts = groups.map(g => g.filter(m => m.isStarter).length);
  
  // 스타터가 5명 미만인 조 찾기
  for (let gi = 0; gi < groups.length; gi++) {
    if (starterCounts[gi] < 5 && starters.length >= groups.length * 5) {
      // 스타터가 많은 조에서 가져오기
      // (실제 구현 필요)
    }
  }
}

// 교환을 통한 최적화
function optimizeBySwaps(groups, iterations) {
  // 성별이 같은 멤버끼리만 교환
  for (let iter = 0; iter < iterations; iter++) {
    const gender = Math.random() < 0.5 ? 'male' : 'female';
    
    // 무작위 2개 조 선택
    const g1 = Math.floor(Math.random() * groups.length);
    let g2 = Math.floor(Math.random() * groups.length);
    while (g2 === g1) g2 = Math.floor(Math.random() * groups.length);
    
    // 해당 성별 멤버 찾기
    const members1 = groups[g1].filter(m => m.gender === gender);
    const members2 = groups[g2].filter(m => m.gender === gender);
    
    if (members1.length === 0 || members2.length === 0) continue;
    
    // 무작위 교환
    const idx1 = Math.floor(Math.random() * members1.length);
    const idx2 = Math.floor(Math.random() * members2.length);
    
    // 점수 계산 후 개선되면 유지
    const beforeScore = calculateTotalScore(groups);
    
    [members1[idx1], members2[idx2]] = [members2[idx2], members1[idx1]];
    
    const afterScore = calculateTotalScore(groups);
    
    if (afterScore > beforeScore) {
      // 원복
      [members1[idx1], members2[idx2]] = [members2[idx2], members1[idx1]];
    }
  }
}

function calculateTotalScore(groups) {
  return groups.reduce((sum, group) => {
    return sum + group.reduce((gscore, member, idx) => {
      return gscore + calculateGroupScore(group.slice(0, idx), member);
    }, 0);
  }, 0);
}


module.exports = { smartTeamAssignment };
