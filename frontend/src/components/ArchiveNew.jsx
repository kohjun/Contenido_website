import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/ArchiveDetail.css';

const ArchiveNew = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    eventSnapshot: {
      title: '',
      date: '',
      place: '',
      team: '',
      startTime: '',
      endTime: '',
      participation_fee: 0,
      contents: ''
    },
    participantInfo: {
      totalApplied: 0,
      totalFinal: 0,
      male: 0,
      female: 0,
      ageRange: '',
      location: ''
    },
    reviewSnapshot: {
      averageRating: 0,
      totalReviews: 0,
      reviews: []
    },
    background: { why: '', who: '', what: '' },
    solution: { differentiation: '', approach: '', expectedEffect: '' },
    concept: { mainConcept: '', conceptDetail: '', worldView: '' },
    structure: { format: '', overview: '' },
    timeline: [],
    games: [],
    budget: { items: [], total: 0 },
    staff: [],
    expectedOutcomes: { quantitative: [], qualitative: [] },
    references: { benchmarking: [], gameRules: [] },
    reflection: {
      summary: '',
      coreStrategies: [],
      challenges: [],
      learnings: []
    },
    feedback: { improvements: '', regrets: '' },
    media: { images: [], videos: [], instagram: '', youtube: '', proposal: '' }
  });

  // ── 공통 헬퍼 ──────────────────────────────────────────
  const updateField = (path, value) => {
    const keys = path.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      let cur = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = { ...cur[keys[i]] };
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const addListItem = (listPath, defaultItem) => {
    const keys = listPath.split('.');
    setFormData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      let cur = newData;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      const k = keys[keys.length - 1];
      cur[k] = [...(cur[k] || []), defaultItem];
      return newData;
    });
  };

  const removeListItem = (listPath, index) => {
    const keys = listPath.split('.');
    setFormData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      let cur = newData;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      const k = keys[keys.length - 1];
      cur[k] = cur[k].filter((_, i) => i !== index);
      return newData;
    });
  };

  const updateListItem = (listPath, index, field, value) => {
    const keys = listPath.split('.');
    setFormData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      let cur = newData;
      for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
      const k = keys[keys.length - 1];
      cur[k][index] = { ...cur[k][index], [field]: value };
      return newData;
    });
  };

  // ── 리뷰 ───────────────────────────────────────────────
  const addReview = () => {
    setFormData(prev => {
      const reviews = [
        ...prev.reviewSnapshot.reviews,
        { userName: '', rating: 5, comment: '', createdAt: new Date() }
      ];
      return {
        ...prev,
        reviewSnapshot: {
          ...prev.reviewSnapshot,
          reviews,
          totalReviews: reviews.length
        }
      };
    });
  };

  const removeReview = (index) => {
    setFormData(prev => {
      const reviews = prev.reviewSnapshot.reviews.filter((_, i) => i !== index);
      const avg = reviews.length
        ? parseFloat((reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1))
        : 0;
      return {
        ...prev,
        reviewSnapshot: { ...prev.reviewSnapshot, reviews, totalReviews: reviews.length, averageRating: avg }
      };
    });
  };

  const updateReview = (index, field, value) => {
    setFormData(prev => {
      const reviews = [...prev.reviewSnapshot.reviews];
      reviews[index] = { ...reviews[index], [field]: value };
      const avg = reviews.length
        ? parseFloat((reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1))
        : 0;
      return {
        ...prev,
        reviewSnapshot: { ...prev.reviewSnapshot, reviews, averageRating: avg, totalReviews: reviews.length }
      };
    });
  };

  // ── 미디어 업로드 ────────────────────────────────────────
  const handleMediaUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', type);
      try {
        const res = await fetch('/archives/upload/external', {
          method: 'POST', credentials: 'include', body: fd
        });
        if (!res.ok) throw new Error('업로드 실패');
        const result = await res.json();
        setFormData(prev => ({
          ...prev,
          media: { ...prev.media, [type]: [...prev.media[type], result.url] }
        }));
      } catch (err) {
        console.error(err);
        alert(`${file.name} 업로드 실패`);
      }
    }
  };

  const removeMedia = (type, index) => {
    setFormData(prev => ({
      ...prev,
      media: { ...prev.media, [type]: prev.media[type].filter((_, i) => i !== index) }
    }));
  };

  // ── 저장 ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!formData.eventSnapshot.title) { alert('이벤트 제목을 입력해주세요.'); return; }
    if (!formData.eventSnapshot.date)  { alert('이벤트 날짜를 입력해주세요.'); return; }
    if (!confirm('새 아카이브를 저장하시겠습니까? (PDF도 자동 생성됩니다)')) return;

    setSaving(true);
    try {
      const res = await fetch('/archives/save-external', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) {
        if (res.status === 401) { alert('로그인이 필요합니다.'); window.location.href = '/auth/kakao'; return; }
        throw new Error('저장 실패');
      }
      const result = await res.json();
      alert(result.pdfUrl ? '아카이브가 저장되고 PDF가 생성되었습니다!' : '아카이브가 저장되었습니다!');
      navigate('/archives');
    } catch (err) {
      console.error(err);
      alert('아카이브 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // ── 공통 UI 조각 ─────────────────────────────────────────
  const SectionHeader = ({ num, title }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
      <span className="section-number">{num}</span>
      <h2 style={{ margin: 0 }}>{title}</h2>
    </div>
  );

  return (
    <div className="archive-detail-container">
      {/* ── 헤더 ── */}
      <div className="detail-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/archives')}>← 뒤로</button>
          <span className="breadcrumb">아카이브 › 새 아카이브 만들기</span>
        </div>
        <div className="header-right">
          <button className="btn-secondary" onClick={() => navigate('/archives')}>취소</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중... (PDF 생성 중)' : '💾 저장 (PDF 자동 생성)'}
          </button>
        </div>
      </div>

      <div className="editor-content">

        {/* ── 이벤트 기본 정보 카드 ── */}
        <div className="editor-header-card">
          <h2>외부 이벤트 정보</h2>
          <p className="event-meta" style={{ color: 'rgba(255,255,255,0.8)' }}>
            CONTENIDO가 주최하지 않은 외부 행사의 아카이브를 직접 작성합니다.
          </p>

          <div style={{ marginTop: '20px' }}>
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label style={{ color: 'white' }}>이벤트 제목 *</label>
                <input
                  type="text"
                  value={formData.eventSnapshot.title}
                  onChange={e => updateField('eventSnapshot.title', e.target.value)}
                  placeholder="예: 서울 청년주간 부스 운영"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ color: 'white' }}>팀 / 주최</label>
                <input
                  type="text"
                  value={formData.eventSnapshot.team}
                  onChange={e => updateField('eventSnapshot.team', e.target.value)}
                  placeholder="예: 대외협력팀"
                  style={{ background: 'rgba(255,255,255,0.9)' }}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label style={{ color: 'white' }}>날짜 *</label>
                <input type="date" value={formData.eventSnapshot.date}
                  onChange={e => updateField('eventSnapshot.date', e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.9)' }} required />
              </div>
              <div className="form-group">
                <label style={{ color: 'white' }}>시작 시간</label>
                <input type="time" value={formData.eventSnapshot.startTime}
                  onChange={e => updateField('eventSnapshot.startTime', e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.9)' }} />
              </div>
              <div className="form-group">
                <label style={{ color: 'white' }}>종료 시간</label>
                <input type="time" value={formData.eventSnapshot.endTime}
                  onChange={e => updateField('eventSnapshot.endTime', e.target.value)}
                  style={{ background: 'rgba(255,255,255,0.9)' }} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label style={{ color: 'white' }}>장소</label>
                <input type="text" value={formData.eventSnapshot.place}
                  onChange={e => updateField('eventSnapshot.place', e.target.value)}
                  placeholder="예: 서울시청 광장"
                  style={{ background: 'rgba(255,255,255,0.9)' }} />
              </div>
              <div className="form-group">
                <label style={{ color: 'white' }}>참가비 (원)</label>
                <input type="number" value={formData.eventSnapshot.participation_fee}
                  onChange={e => updateField('eventSnapshot.participation_fee', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  style={{ background: 'rgba(255,255,255,0.9)' }} />
              </div>
            </div>

            <div className="form-group">
              <label style={{ color: 'white' }}>이벤트 설명</label>
              <textarea rows="4" value={formData.eventSnapshot.contents}
                onChange={e => updateField('eventSnapshot.contents', e.target.value)}
                placeholder="이벤트에 대한 간단한 설명을 입력하세요..."
                style={{ background: 'rgba(255,255,255,0.9)' }} />
            </div>
          </div>
        </div>

        {/* ── 참가자 정보 ── */}
        <section className="form-section">
          <SectionHeader num="👥" title="참가자 정보" />

          <div className="form-row">
            <div className="form-group">
              <label>총 신청 인원</label>
              <input type="number" value={formData.participantInfo.totalApplied}
                onChange={e => updateField('participantInfo.totalApplied', parseInt(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label>최종 참가 인원</label>
              <input type="number" value={formData.participantInfo.totalFinal}
                onChange={e => updateField('participantInfo.totalFinal', parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>남성</label>
              <input type="number" value={formData.participantInfo.male}
                onChange={e => updateField('participantInfo.male', parseInt(e.target.value) || 0)} />
            </div>
            <div className="form-group">
              <label>여성</label>
              <input type="number" value={formData.participantInfo.female}
                onChange={e => updateField('participantInfo.female', parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>평균 연령대</label>
              <input type="text" value={formData.participantInfo.ageRange}
                onChange={e => updateField('participantInfo.ageRange', e.target.value)}
                placeholder="예: 20대 초반" />
            </div>
            <div className="form-group">
              <label>주요 거주지</label>
              <input type="text" value={formData.participantInfo.location}
                onChange={e => updateField('participantInfo.location', e.target.value)}
                placeholder="예: 서울 강남구, 마포구" />
            </div>
          </div>
        </section>

        {/* ── 참가자 후기 (수기) ── */}
        <section className="form-section">
          <SectionHeader num="⭐" title="참가자 후기 (수기 작성)" />

          <div style={{ background: '#F0F8FF', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <p style={{ color: '#0A84FE', fontWeight: '600', marginBottom: '6px' }}>
              평균 평점: {formData.reviewSnapshot.averageRating} / 5.0
              &nbsp;(총 {formData.reviewSnapshot.totalReviews}개)
            </p>
            <p style={{ fontSize: '13px', color: '#666' }}>후기를 추가하면 평균 평점이 자동으로 계산됩니다.</p>
          </div>

          <button type="button" className="btn-add-item" onClick={addReview} style={{ marginBottom: '15px' }}>
            + 후기 추가
          </button>

          {formData.reviewSnapshot.reviews.map((review, idx) => (
            <div key={idx} className="list-item">
              <button type="button" className="btn-remove-item" onClick={() => removeReview(idx)}>삭제</button>
              <div className="form-row">
                <div className="form-group">
                  <label>작성자 이름</label>
                  <input type="text" value={review.userName}
                    onChange={e => updateReview(idx, 'userName', e.target.value)}
                    placeholder="익명 또는 실명" />
                </div>
                <div className="form-group">
                  <label>평점</label>
                  <select value={review.rating}
                    onChange={e => updateReview(idx, 'rating', parseFloat(e.target.value))}>
                    {[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1].map(v => (
                      <option key={v} value={v}>{'⭐'.repeat(Math.floor(v))}{'☆'.repeat(5 - Math.ceil(v))} ({v}점)</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>후기 내용</label>
                <textarea rows="3" value={review.comment}
                  onChange={e => updateReview(idx, 'comment', e.target.value)}
                  placeholder="후기를 입력하세요..." />
              </div>
            </div>
          ))}
        </section>

        {/* ── 1. 기획 배경 ── */}
        <section className="form-section">
          <SectionHeader num="1" title="기획 배경 및 문제 정의" />
          <div className="form-group">
            <label>Why? 왜 이 기획을 하게 되었나?</label>
            <textarea value={formData.background.why}
              onChange={e => updateField('background.why', e.target.value)}
              placeholder="예: 두 동아리 간 교류 기회 부족, 소속감 고취 필요" />
          </div>
          <div className="form-group">
            <label>Who? 타겟은 누구인가?</label>
            <textarea value={formData.background.who}
              onChange={e => updateField('background.who', e.target.value)}
              placeholder="예: 20대 초중반 대학생, 활동적이고 경쟁심이 강한 세대" />
          </div>
          <div className="form-group">
            <label>What? 해결하고자 한 문제</label>
            <textarea value={formData.background.what}
              onChange={e => updateField('background.what', e.target.value)}
              placeholder="예: 기존 행사는 단순 승부 중심 → 지루함과 참여도 저하" />
          </div>
        </section>

        {/* ── 2. 솔루션 ── */}
        <section className="form-section">
          <SectionHeader num="2" title="솔루션" />
          <div className="form-group">
            <label>차별화 포인트</label>
            <textarea value={formData.solution.differentiation}
              onChange={e => updateField('solution.differentiation', e.target.value)}
              placeholder="예: 전략 + 협동 중심 설계, 예능 메커니즘 도입" />
          </div>
          <div className="form-group">
            <label>접근 방법</label>
            <textarea value={formData.solution.approach}
              onChange={e => updateField('solution.approach', e.target.value)}
              placeholder="예: TV 예능 포맷을 현실에 적용, 모두가 주인공이 되는 구조" />
          </div>
          <div className="form-group">
            <label>기대 효과</label>
            <textarea value={formData.solution.expectedEffect}
              onChange={e => updateField('solution.expectedEffect', e.target.value)}
              placeholder="예: 참여도 향상, 소속감 강화, 예능적 순간 창출" />
          </div>
        </section>

        {/* ── 3. 기획 컨셉 ── */}
        <section className="form-section">
          <SectionHeader num="3" title="기획 컨셉 & 세계관" />
          <div className="form-group">
            <label>메인 컨셉 (한 줄)</label>
            <input type="text" value={formData.concept.mainConcept}
              onChange={e => updateField('concept.mainConcept', e.target.value)}
              placeholder="예: 무한 경쟁: Team Rivals - 전략 서바이벌" />
          </div>
          <div className="form-group">
            <label>컨셉 상세 설명</label>
            <textarea value={formData.concept.conceptDetail}
              onChange={e => updateField('concept.conceptDetail', e.target.value)}
              placeholder="단순한 행사가 아닌..." />
          </div>
          <div className="form-group">
            <label>세계관</label>
            <textarea value={formData.concept.worldView}
              onChange={e => updateField('concept.worldView', e.target.value)}
              placeholder="이벤트의 전체적인 분위기와 세계관" />
          </div>
        </section>

        {/* ── 4. 콘텐츠 구조 ── */}
        <section className="form-section">
          <SectionHeader num="4" title="콘텐츠 구조" />
          <div className="form-group">
            <label>주요 포맷</label>
            <input type="text" value={formData.structure.format}
              onChange={e => updateField('structure.format', e.target.value)}
              placeholder="예: 팀 대항전, 2부 구성 (부스 게임 + 메인 매치)" />
          </div>
          <div className="form-group">
            <label>구조 개요</label>
            <textarea value={formData.structure.overview}
              onChange={e => updateField('structure.overview', e.target.value)}
              placeholder="전체 진행 흐름 및 구성 설명" />
          </div>
        </section>

        {/* ── 5. 타임라인 ── */}
        <section className="form-section">
          <SectionHeader num="5" title="타임라인 & 큐시트" />
          <div className="dynamic-list">
            {formData.timeline.map((item, idx) => (
              <div key={idx} className="list-item">
                <button type="button" className="btn-remove-item"
                  onClick={() => removeListItem('timeline', idx)}>삭제</button>
                <div className="form-row">
                  <div className="form-group">
                    <label>시간</label>
                    <input type="text" value={item.time || ''}
                      onChange={e => updateListItem('timeline', idx, 'time', e.target.value)}
                      placeholder="13:00 - 13:30" />
                  </div>
                  <div className="form-group">
                    <label>구분</label>
                    <input type="text" value={item.phase || ''}
                      onChange={e => updateListItem('timeline', idx, 'phase', e.target.value)}
                      placeholder="개회, 1부, 2부" />
                  </div>
                </div>
                <div className="form-group">
                  <label>프로그램명</label>
                  <input type="text" value={item.program || ''}
                    onChange={e => updateListItem('timeline', idx, 'program', e.target.value)}
                    placeholder="오프닝, 부스 게임" />
                </div>
                <div className="form-group">
                  <label>세부 내용</label>
                  <textarea value={item.detail || ''}
                    onChange={e => updateListItem('timeline', idx, 'detail', e.target.value)}
                    placeholder="세부 진행 방식" />
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn-add-item"
            onClick={() => addListItem('timeline', { time: '', phase: '', program: '', detail: '' })}>
            + 타임라인 추가
          </button>
        </section>

        {/* ── 6. 게임 메커니즘 ── */}
        <section className="form-section">
          <SectionHeader num="6" title="게임 및 활동 메커니즘" />
          <div className="dynamic-list">
            {formData.games.map((item, idx) => (
              <div key={idx} className="list-item">
                <button type="button" className="btn-remove-item"
                  onClick={() => removeListItem('games', idx)}>삭제</button>
                <div className="form-group">
                  <label>게임명</label>
                  <input type="text" value={item.name || ''}
                    onChange={e => updateListItem('games', idx, 'name', e.target.value)}
                    placeholder="여왕 피구" />
                </div>
                <div className="form-group">
                  <label>게임 룰</label>
                  <textarea value={item.rules || ''}
                    onChange={e => updateListItem('games', idx, 'rules', e.target.value)}
                    placeholder="상세 게임 룰" />
                </div>
                <div className="form-group">
                  <label>예능 포인트</label>
                  <textarea value={item.points || ''}
                    onChange={e => updateListItem('games', idx, 'points', e.target.value)}
                    placeholder="재미 요소, 예능적 순간" />
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn-add-item"
            onClick={() => addListItem('games', { name: '', rules: '', points: '' })}>
            + 게임 추가
          </button>
        </section>

        {/* ── 7. 예산 ── */}
        <section className="form-section">
          <SectionHeader num="7" title="예산 및 소요 자원" />
          <div className="dynamic-list">
            {(formData.budget.items || []).map((item, idx) => (
              <div key={idx} className="list-item">
                <button type="button" className="btn-remove-item"
                  onClick={() => removeListItem('budget.items', idx)}>삭제</button>
                <div className="form-row-3">
                  <div className="form-group">
                    <label>항목</label>
                    <input type="text" value={item.category || ''}
                      onChange={e => updateListItem('budget.items', idx, 'category', e.target.value)}
                      placeholder="대관료" />
                  </div>
                  <div className="form-group">
                    <label>금액 (원)</label>
                    <input type="number" value={item.amount || ''}
                      onChange={e => {
                        const amt = parseInt(e.target.value) || 0;
                        updateListItem('budget.items', idx, 'amount', amt);
                        // 총합 자동 계산
                        setFormData(prev => {
                          const items = prev.budget.items.map((b, i) => i === idx ? { ...b, amount: amt } : b);
                          const total = items.reduce((s, b) => s + (b.amount || 0), 0);
                          return { ...prev, budget: { ...prev.budget, items, total } };
                        });
                      }}
                      placeholder="100000" />
                  </div>
                  <div className="form-group">
                    <label>세부 내역</label>
                    <input type="text" value={item.detail || ''}
                      onChange={e => updateListItem('budget.items', idx, 'detail', e.target.value)}
                      placeholder="체육관 5시간" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn-add-item"
            onClick={() => addListItem('budget.items', { category: '', amount: 0, detail: '' })}>
            + 비용 항목 추가
          </button>
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label>총 예산 (자동 계산)</label>
            <input type="text" readOnly
              value={(formData.budget.total || 0).toLocaleString() + '원'}
              style={{ background: '#F8F9FB', fontWeight: '600', color: '#0A84FE' }} />
          </div>
        </section>

        {/* ── 8. 스태프 ── */}
        <section className="form-section">
          <SectionHeader num="8" title="인력 운영 (스태프)" />
          <div className="dynamic-list">
            {formData.staff.map((item, idx) => (
              <div key={idx} className="list-item">
                <button type="button" className="btn-remove-item"
                  onClick={() => removeListItem('staff', idx)}>삭제</button>
                <div className="form-row">
                  <div className="form-group">
                    <label>이름</label>
                    <input type="text" value={item.name || ''}
                      onChange={e => updateListItem('staff', idx, 'name', e.target.value)}
                      placeholder="홍길동" />
                  </div>
                  <div className="form-group">
                    <label>역할</label>
                    <input type="text" value={item.role || ''}
                      onChange={e => updateListItem('staff', idx, 'role', e.target.value)}
                      placeholder="총괄 PD, 주심" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn-add-item"
            onClick={() => addListItem('staff', { name: '', role: '' })}>
            + 스태프 추가
          </button>
        </section>

        {/* ── 9. 기대 효과 ── */}
        <section className="form-section">
          <SectionHeader num="9" title="기대 효과 및 성공 지표" />
          <div className="form-group">
            <label>정량적 목표</label>
            <p className="form-helper">예: 참여율 85% 이상, 만족도 4.5/5.0</p>
            <div className="dynamic-list">
              {(formData.expectedOutcomes.quantitative || []).map((item, idx) => (
                <div key={idx} className="list-item">
                  <button type="button" className="btn-remove-item"
                    onClick={() => removeListItem('expectedOutcomes.quantitative', idx)}>삭제</button>
                  <div className="form-row">
                    <div className="form-group">
                      <label>지표명</label>
                      <input type="text" value={item.metric || ''}
                        onChange={e => updateListItem('expectedOutcomes.quantitative', idx, 'metric', e.target.value)}
                        placeholder="참여율" />
                    </div>
                    <div className="form-group">
                      <label>목표치</label>
                      <input type="text" value={item.target || ''}
                        onChange={e => updateListItem('expectedOutcomes.quantitative', idx, 'target', e.target.value)}
                        placeholder="85% 이상" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn-add-item"
              onClick={() => addListItem('expectedOutcomes.quantitative', { metric: '', target: '' })}>
              + 정량적 목표 추가
            </button>
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label>정성적 목표</label>
            <p className="form-helper">예: 참여자 간 유대감 강화, 브랜드 인지도 향상</p>
            <div className="dynamic-list">
              {(formData.expectedOutcomes.qualitative || []).map((item, idx) => (
                <div key={idx} className="list-item" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="text" value={item || ''}
                    onChange={e => {
                      setFormData(prev => {
                        const arr = [...prev.expectedOutcomes.qualitative];
                        arr[idx] = e.target.value;
                        return { ...prev, expectedOutcomes: { ...prev.expectedOutcomes, qualitative: arr } };
                      });
                    }}
                    placeholder="정성적 목표를 입력하세요"
                    style={{ flex: 1 }} />
                  <button type="button" className="btn-remove-item"
                    onClick={() => removeListItem('expectedOutcomes.qualitative', idx)}
                    style={{ marginTop: 0, position: 'static' }}>삭제</button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-add-item"
              onClick={() => addListItem('expectedOutcomes.qualitative', '')}>
              + 정성적 목표 추가
            </button>
          </div>
        </section>

        {/* ── 10. 참고 자료 ── */}
        <section className="form-section">
          <SectionHeader num="10" title="참고 자료" />
          <div className="form-group">
            <label>벤치마킹 프로그램</label>
            <input type="text"
              value={formData.references.benchmarking.join(', ')}
              onChange={e => updateField('references.benchmarking', e.target.value.split(',').map(s => s.trim()))}
              placeholder="런닝맨 (SBS), 신서유기 (tvN)" />
          </div>
          <div className="form-group">
            <label>게임 룰 참고</label>
            <input type="text"
              value={formData.references.gameRules.join(', ')}
              onChange={e => updateField('references.gameRules', e.target.value.split(',').map(s => s.trim()))}
              placeholder="여왕 피구 - 런닝맨 변형" />
          </div>
        </section>

        {/* ── 11. 기획자 회고 ── */}
        <section className="form-section">
          <SectionHeader num="11" title="기획자 회고" />
          <div className="form-group">
            <label>프로젝트 요약</label>
            <textarea value={formData.reflection.summary}
              onChange={e => updateField('reflection.summary', e.target.value)}
              placeholder="전체 프로젝트에 대한 마무리 정리" />
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label>핵심 전략</label>
            <div className="dynamic-list">
              {(formData.reflection.coreStrategies || []).map((item, idx) => (
                <div key={idx} className="list-item">
                  <button type="button" className="btn-remove-item"
                    onClick={() => removeListItem('reflection.coreStrategies', idx)}>삭제</button>
                  <div className="form-row">
                    <div className="form-group">
                      <label>전략 제목</label>
                      <input type="text" value={item.title || ''}
                        onChange={e => updateListItem('reflection.coreStrategies', idx, 'title', e.target.value)}
                        placeholder="예: 팀 빌딩 극대화" />
                    </div>
                    <div className="form-group" style={{ flex: 2 }}>
                      <label>설명</label>
                      <input type="text" value={item.description || ''}
                        onChange={e => updateListItem('reflection.coreStrategies', idx, 'description', e.target.value)}
                        placeholder="전략에 대한 설명" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn-add-item"
              onClick={() => addListItem('reflection.coreStrategies', { title: '', description: '' })}>
              + 핵심 전략 추가
            </button>
          </div>

          <div className="form-group" style={{ marginTop: '20px' }}>
            <label>도전 과제 & 해결책</label>
            <div className="dynamic-list">
              {(formData.reflection.challenges || []).map((item, idx) => (
                <div key={idx} className="list-item">
                  <button type="button" className="btn-remove-item"
                    onClick={() => removeListItem('reflection.challenges', idx)}>삭제</button>
                  <div className="form-row">
                    <div className="form-group">
                      <label>도전 / 리스크</label>
                      <input type="text" value={item.risk || ''}
                        onChange={e => updateListItem('reflection.challenges', idx, 'risk', e.target.value)}
                        placeholder="예: 참가자 이탈 우려" />
                    </div>
                    <div className="form-group" style={{ flex: 2 }}>
                      <label>해결책</label>
                      <input type="text" value={item.solution || ''}
                        onChange={e => updateListItem('reflection.challenges', idx, 'solution', e.target.value)}
                        placeholder="실제 대응 방법" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn-add-item"
              onClick={() => addListItem('reflection.challenges', { risk: '', solution: '' })}>
              + 도전 과제 추가
            </button>
          </div>
        </section>

        {/* ── 12. 피드백 ── */}
        <section className="form-section">
          <SectionHeader num="12" title="추가 피드백" />
          <div className="form-group">
            <label>개선점</label>
            <textarea value={formData.feedback.improvements}
              onChange={e => updateField('feedback.improvements', e.target.value)}
              placeholder="다음에 개선하면 좋을 점들" />
          </div>
          <div className="form-group">
            <label>아쉬운 점</label>
            <textarea value={formData.feedback.regrets}
              onChange={e => updateField('feedback.regrets', e.target.value)}
              placeholder="이번 이벤트에서 아쉬웠던 부분" />
          </div>
        </section>

        {/* ── 13. 미디어 ── */}
        <section className="form-section">
          <SectionHeader num="13" title="미디어 업로드" />

          {/* 이미지 */}
          <div className="form-group">
            <label>현장 이미지</label>
            <div className="upload-area" onClick={() => document.getElementById('new-images-upload').click()}>
              <div className="upload-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                    stroke="#0A84FE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="upload-label">이미지 업로드</span>
              <p className="upload-hint">JPG, PNG, GIF (최대 50MB)</p>
              <input id="new-images-upload" type="file" multiple accept="image/*"
                onChange={e => handleMediaUpload(e, 'images')} style={{ display: 'none' }} />
            </div>
            {formData.media.images.length > 0 && (
              <div className="media-preview-grid">
                {formData.media.images.map((url, i) => (
                  <div key={i} className="media-preview-item">
                    <img src={url} alt={`업로드 ${i + 1}`} />
                    <button type="button" className="media-remove-btn" onClick={() => removeMedia('images', i)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 영상 */}
          <div className="form-group">
            <label>현장 영상</label>
            <div className="upload-area" onClick={() => document.getElementById('new-videos-upload').click()}>
              <div className="upload-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M23 7l-7 5 7 5V7z" fill="#0A84FE"/>
                  <rect x="1" y="5" width="15" height="14" rx="2" stroke="#0A84FE" strokeWidth="2" fill="none"/>
                </svg>
              </div>
              <span className="upload-label">영상 업로드</span>
              <p className="upload-hint">MP4, MOV, AVI (최대 100MB)</p>
              <input id="new-videos-upload" type="file" multiple accept="video/*"
                onChange={e => handleMediaUpload(e, 'videos')} style={{ display: 'none' }} />
            </div>
            {formData.media.videos.length > 0 && (
              <div className="media-preview-grid">
                {formData.media.videos.map((url, i) => (
                  <div key={i} className="media-preview-item">
                    <video src={url} controls />
                    <span className="video-indicator">VIDEO</span>
                    <button type="button" className="media-remove-btn" onClick={() => removeMedia('videos', i)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>인스타그램 주소</label>
              <input type="url" value={formData.media.instagram}
                onChange={e => updateField('media.instagram', e.target.value)}
                placeholder="https://instagram.com/p/..." />
            </div>
            <div className="form-group">
              <label>유튜브 영상 링크</label>
              <input type="url" value={formData.media.youtube}
                onChange={e => updateField('media.youtube', e.target.value)}
                placeholder="https://youtube.com/watch?v=..." />
            </div>
          </div>
        </section>

        {/* ── 하단 저장 버튼 ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '20px 0 40px' }}>
          <button className="btn-secondary" onClick={() => navigate('/archives')}>취소</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '저장 중... (PDF 생성 중)' : '💾 저장 (PDF 자동 생성)'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ArchiveNew;