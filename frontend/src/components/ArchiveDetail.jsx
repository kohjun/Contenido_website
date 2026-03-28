import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../css/ArchiveDetail.css';

// formData 초기값 — Archive.js 스키마와 1:1 대응
const INITIAL_FORM = {
  headStaff: '',
  projectSummary: '',
  eventSnapshot: {
    title: '',
    date: '',
    place: '',
    team: '',
    startTime: '',
    endTime: '',
    participation_fee: 0,
    contents: '',
  },
  background: '',
  concept: { mainConcept: '', conceptDetail: '', worldView: '' },
  structure: { format: '', overview: '' },
  games: [],
  timeline: [],
  budget: { items: [], total: 0 },
  staff: [],
  participantInfo: {
    totalApplied: 0,
    totalFinal: 0,
    male: 0,
    female: 0,
    ageRange: '',
    location: '',
  },
  reflection: {
    coreStrategies: [],
    challenges: [],
    learnings: [],
    summary: '',
  },
  reviewSnapshot: {
    averageRating: 0,
    totalReviews: 0,
    reviews: [],
  },
  media: {
    images: [],
    videos: [],
    instagram: '',
    youtube: '',
    proposal: '',
  },
};

const ArchiveDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // ✅ useAuth 훅으로 권한 체크
  const { isAuthorized, isLoading: isCheckingAuth, user } = useAuth(['officer', 'admin'], true);
  
  const [mode, setMode] = useState('view');
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isArchived, setIsArchived] = useState(false);

  useEffect(() => { 
    if (isAuthorized) {
      loadEvent(); 
    }
  }, [id, isAuthorized]);

  const loadEvent = async () => {
    if (id === 'new') {
      setLoading(false);
      setMode('edit');
      return;
    }
    try {
      const res = await fetch(`/archives/event/${id}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) { window.location.href = '/auth/kakao'; return; }
        throw new Error('이벤트를 불러올 수 없습니다.');
      }
      const data = await res.json();
      setEvent(data);
      setIsArchived(data.archive?.archived || false);

      if (data.archive?.archived) {
        setMode('view');
        setFormData(mergeArchive(INITIAL_FORM, data.archive));
      } else {
        setMode('edit');
        
        // ✅ 임시저장된 데이터가 있으면 불러오기
        if (data.archive) {
          setFormData(mergeArchive(INITIAL_FORM, data.archive));
        } else {
          // 아카이브 없으면 기본값만 설정
          setFormData(prev => ({
            ...prev,
            participantInfo: {
              ...prev.participantInfo,
              totalFinal: data.finalParticipants?.length || 0,
            },
            reviewSnapshot: {
              averageRating: calcAvgRating(data.endEvaluations),
              totalReviews: data.endEvaluations?.length || 0,
              reviews: (data.endEvaluations || []).map(e => ({
                userId: e.userId?._id,
                userName: e.userId?.name || '익명',
                rating: e.rating,
                comment: e.feedback,
                isAnonymous: false,
                createdAt: e.createdAt,
              })),
            },
          }));
        }
      }
    } catch (err) {
      console.error(err);
      alert('이벤트를 불러올 수 없습니다.');
      navigate('/archives');
    } finally {
      setLoading(false);
    }
  };

  const mergeArchive = (initial, arch) => ({
    ...initial,
    ...arch,
    headStaff: arch.headStaff || '',
    eventSnapshot: { ...initial.eventSnapshot, ...(arch.eventSnapshot || {}) },
    background:    arch.background    || '',
    concept:       { ...initial.concept,       ...(arch.concept       || {}) },
    structure:     { ...initial.structure,     ...(arch.structure     || {}) },
    budget:        { items: arch.budget?.items || [], total: arch.budget?.total || 0 },
    participantInfo: { ...initial.participantInfo, ...(arch.participantInfo || {}) },
    reflection:    { ...initial.reflection,    ...(arch.reflection    || {}) },
    reviewSnapshot: { ...initial.reviewSnapshot, ...(arch.reviewSnapshot || {}) },
    media:         { ...initial.media,         ...(arch.media         || {}) },
    games:   arch.games  || [],
    timeline: arch.timeline || [],
    staff:   arch.staff  || [],
  });

  const calcAvgRating = (evals) => {
    if (!evals?.length) return 0;
    const rs = evals.map(e => e.rating).filter(Boolean);
    if (!rs.length) return 0;
    return +(rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(1);
  };

  const handleTempSave = async () => {
    if (!confirm('임시 저장하시겠습니까?\n\n임시 저장은 언제든지 수정할 수 있습니다.')) return;
    setSaving(true);
    try {
      const res = await fetch(`/archives/temp-save/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        if (res.status === 401) { alert('로그인이 필요합니다.'); window.location.href = '/auth/kakao'; return; }
        throw new Error('저장 실패');
      }
      const result = await res.json();
      alert('임시 저장되었습니다!');
      setEvent(prev => ({ ...prev, archive: result.archive }));
    } catch (err) {
      console.error(err);
      alert('임시 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalSave = async () => {
    if (!confirm('최종 아카이브로 저장하시겠습니까?\n\n【중요】\n- 최종 저장 후에는 더 이상 편집할 수 없습니다.\n\n정말 최종 저장하시겠습니까?')) return;
    
    setFinalizing(true);
    try {
      const res = await fetch(`/archives/final-save/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        if (res.status === 401) { alert('로그인이 필요합니다.'); window.location.href = '/auth/kakao'; return; }
        throw new Error('저장 실패');
      }
      const result = await res.json();
      alert('✅ 최종 아카이브가 저장되었습니다!\n\nPDF가 생성되어 네이버 클라우드에 저장되었습니다.');
      setEvent(prev => ({ ...prev, archive: result.archive }));
      setIsArchived(true);
      setMode('view');
    } catch (err) {
      console.error(err);
      alert('최종 저장에 실패했습니다.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleMediaUpload = async (e, type = 'images') => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('category', type);
        const res = await fetch(`/archives/upload/${id}`, { method: 'POST', credentials: 'include', body: fd });
        if (!res.ok) { if (res.status === 401) { alert('로그인이 필요합니다.'); window.location.href = '/auth/kakao'; return; } throw new Error(); }
        const result = await res.json();
        setFormData(prev => ({
          ...prev,
          media: { ...prev.media, [type]: [...(prev.media[type] || []), result.url] },
        }));
      } catch { alert(`${file.name} 업로드 실패`); }
    }
  };

  // ✅ 권한 체크 중
  if (isCheckingAuth) {
    return (
      <div className="archive-detail-container">
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          gap: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #E2E6EA',
            borderTopColor: '#0A84FE',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ color: '#7A8391', fontSize: '14px' }}>권한 확인 중...</p>
        </div>
      </div>
    );
  }

  // ✅ 권한 없음
  if (!isAuthorized) {
    return null;
  }

  if (loading) return <div className="archive-detail-container"><div className="loading-state">이벤트를 불러오는 중...</div></div>;
  if (!event && id !== 'new') return <div className="archive-detail-container"><div className="error-state">이벤트를 찾을 수 없습니다.</div></div>;

  const displayEvent = event || { title: '새 아카이브', date: new Date(), place: '-', team: '-' };

  return (
    <div className="archive-detail-container">
      <div className="detail-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/archives')}>← 뒤로</button>
          <span className="breadcrumb">아카이브 › {displayEvent.title}</span>
        </div>
        <div className="header-right">
          {mode === 'view' ? (
            <>
              <button className="btn-secondary" onClick={() => window.print()}>PDF 다운로드</button>
              {!isArchived && (
                <button className="btn-secondary" onClick={() => setMode('edit')}>편집</button>
              )}
              {isArchived && (
                <div style={{
                  display: 'inline-block',
                  background: '#10B981',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  marginLeft: '8px'
                }}>
                  ✓ 최종 아카이브 완료
                </div>
              )}
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => {
                if (confirm('편집을 취소하시겠습니까?\n저장하지 않은 내용은 사라집니다.')) {
                  setMode('view');
                }
              }}>취소</button>
              <button 
                className="btn-secondary" 
                onClick={handleTempSave} 
                disabled={saving}
                style={{
                  background: '#F59E0B',
                  color: '#fff',
                  border: 'none'
                }}
              >
                {saving ? '저장 중...' : '💾 임시 저장'}
              </button>
              <button 
                className="btn-primary" 
                onClick={handleFinalSave} 
                disabled={finalizing}
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  fontWeight: '700'
                }}
              >
                {finalizing ? '최종 저장 중...' : '🔒 최종 아카이브 저장'}
              </button>
            </>
          )}
        </div>
      </div>

      {mode === 'view'
        ? <ArchiveViewer event={displayEvent} data={formData} />
        : <ArchiveEditor event={displayEvent} formData={formData} setFormData={setFormData} onMediaUpload={handleMediaUpload} />
      }
      
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// ArchiveViewer
const ArchiveViewer = ({ event, data }) => {
  const snap = data.eventSnapshot || {};
  const title = snap.title || event.title;
  const dateStr = snap.date
    ? new Date(snap.date).toLocaleDateString('ko-KR')
    : new Date(event.date).toLocaleDateString('ko-KR');
  const maleRatio = data.participantInfo?.totalFinal
    ? Math.round((data.participantInfo.male / data.participantInfo.totalFinal) * 100)
    : 0;
  const femaleRatio = 100 - maleRatio;

  return (
    <div className="archive-viewer">
      <div className="viewer-sidebar">
        <div className="sidebar-section">
          <div className="sidebar-title">문서 정보</div>
          {data.headStaff && (
            <div className="info-row">
              <span>총괄</span>
              <span className="info-value highlight">{data.headStaff}</span>
            </div>
          )}
          <div className="info-row"><span>이벤트</span><span className="info-value">{title}</span></div>
          <div className="info-row"><span>일시</span><span className="info-value">{dateStr}</span></div>
          <div className="info-row"><span>장소</span><span className="info-value">{snap.place || event.place}</span></div>
          <div className="info-row"><span>팀</span><span className="info-value">{snap.team || event.team}</span></div>
          <div className="info-row"><span>참가자</span><span className="info-value">{data.participantInfo?.totalFinal || 0}명</span></div>
          {data.reviewSnapshot?.averageRating > 0 && (
            <div className="info-row">
              <span>평점</span>
              <span className="info-value highlight">{data.reviewSnapshot.averageRating} / 5.0</span>
            </div>
          )}
        </div>

        {data.media?.images?.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-title">현장 사진</div>
            <div className="sidebar-images">
              {data.media.images.map((url, i) => <img key={i} src={url} alt={`현장 ${i + 1}`} />)}
            </div>
          </div>
        )}
      </div>

      <div className="viewer-content">
        <div className="document-paper">
          <div className="document-header">
            <span>CONTENIDO ARCHIVE</span>
            <span>{snap.team || event.team}</span>
          </div>

          {data.headStaff && (
            <div className="head-staff-badge">
              <span className="head-staff-label">총괄 스태프</span>
              <span className="head-staff-name">{data.headStaff}</span>
            </div>
          )}

          <h1 className="document-title">{title}</h1>
          <p className="document-meta">
            {snap.team || event.team} · {dateStr} · {snap.place || event.place} · {data.participantInfo?.totalFinal || 0}명 참여
          </p>

          {data.projectSummary && (
            <section className="document-section">
              <div className="sec-num">01</div>
              <div className="sec-title">이벤트 요약</div>
              <div className="highlight-box">
                <p>{data.projectSummary}</p>
              </div>
            </section>
          )}

          {(snap.startTime || snap.contents || snap.participation_fee > 0) && (
            <section className="document-section">
              <div className="sec-num">02</div>
              <div className="sec-title">이벤트 개요</div>
              <table className="timeline-table">
                <tbody>
                  {snap.startTime && <tr><td style={{width:'30%',fontWeight:600}}>진행 시간</td><td>{snap.startTime} ~ {snap.endTime}</td></tr>}
                  {snap.place && <tr><td style={{fontWeight:600}}>장소</td><td>{snap.place}</td></tr>}
                  {snap.participation_fee > 0 && <tr><td style={{fontWeight:600}}>참가비</td><td>{snap.participation_fee.toLocaleString()}원</td></tr>}
                  {snap.contents && (
                    <tr>
                      <td style={{fontWeight:600,verticalAlign:'top'}}>행사 소개</td>
                      <td style={{whiteSpace:'pre-line',lineHeight:'1.85'}}>{snap.contents}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          )}

          {data.background && (
            <section className="document-section">
              <div className="sec-num">03</div>
              <div className="sec-title">기획 의도 &amp; 배경</div>
              <div className="highlight-box">
                <p style={{whiteSpace:'pre-line',lineHeight:'1.9'}}>{data.background}</p>
              </div>
            </section>
          )}

          {data.concept?.mainConcept && (
            <section className="document-section">
              <div className="sec-num">04</div>
              <div className="sec-title">이벤트 컨셉 &amp; 세계관</div>
              <div className="success-box">
                <p><strong>메인 컨셉</strong>: {data.concept.mainConcept}</p>
                {data.concept.conceptDetail && <p>{data.concept.conceptDetail}</p>}
              </div>
              {data.concept.worldView && (
                <div className="subsection" style={{marginTop:14}}>
                  <strong>세계관</strong>
                  <p>{data.concept.worldView}</p>
                </div>
              )}
            </section>
          )}

          {(data.structure?.format || data.structure?.overview) && (
            <section className="document-section">
              <div className="sec-num">05</div>
              <div className="sec-title">콘텐츠 구조</div>
              {data.structure.format && (
                <p><strong>진행 포맷</strong>: {data.structure.format}</p>
              )}
              {data.structure.overview && (
                <div className="highlight-box" style={{marginTop:10}}>
                  <p style={{whiteSpace:'pre-line'}}>{data.structure.overview}</p>
                </div>
              )}
            </section>
          )}

          {data.games?.length > 0 && (
            <section className="document-section">
              <div className="sec-num">06</div>
              <div className="sec-title">게임 상세 설명</div>
              {data.games.map((g, i) => (
                <div key={i} className="game-card">
                  <div className="game-card-title"> {g.name}</div>
                  {g.overview && <p style={{fontSize:13,color:'#374151',marginBottom:10}}>{g.overview}</p>}
                  {g.rules && (
                    <div className="game-rules">
                      <strong>게임 규칙</strong>
                      <p style={{marginTop:6,fontSize:13,whiteSpace:'pre-line'}}>{g.rules}</p>
                    </div>
                  )}
                  {g.points && (
                    <div className="game-point"> 포인트: {g.points}</div>
                  )}
                  {g.scoring && (
                    <div className="game-score">점수 방식: {g.scoring}</div>
                  )}
                </div>
              ))}
            </section>
          )}

          {data.timeline?.length > 0 && (
            <section className="document-section">
              <div className="sec-num">07</div>
              <div className="sec-title">타임라인 &amp; 큐시트</div>
              <table className="timeline-table">
                <thead>
                  <tr>
                    <th>시간</th><th>구분</th><th>프로그램</th><th>세부 내용</th><th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {data.timeline.map((t, i) => (
                    <tr key={i}>
                      <td>{t.time}</td>
                      <td>{t.phase}</td>
                      <td><strong>{t.program}</strong></td>
                      <td>{t.detail}</td>
                      <td style={{color:'#7A8391',fontSize:12}}>{t.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {data.budget?.items?.length > 0 && (
            <section className="document-section">
              <div className="sec-num">08</div>
              <div className="sec-title">예산 테이블</div>
              <table className="budget-table">
                <thead>
                  <tr><th>항목</th><th>세부 내역</th><th>금액</th><th>비중</th></tr>
                </thead>
                <tbody>
                  {data.budget.items.map((b, i) => (
                    <tr key={i}>
                      <td>{b.category}</td>
                      <td>{b.detail}</td>
                      <td className="amount">{b.amount?.toLocaleString()}원</td>
                      <td style={{textAlign:'right',fontSize:12,color:'#7A8391'}}>{b.ratio ? `${b.ratio}%` : ''}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan="2"><strong>총 예산</strong></td>
                    <td className="amount"><strong>{data.budget.total?.toLocaleString()}원</strong></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {data.staff?.length > 0 && (
            <section className="document-section">
              <div className="sec-num">09</div>
              <div className="sec-title">스태프 정보</div>
              {data.headStaff && (
                <div className="highlight-box" style={{marginBottom:16}}>
                  <p><strong>총괄 스태프</strong>: {data.headStaff}</p>
                </div>
              )}
              <div className="staff-grid">
                {data.staff.map((s, i) => (
                  <div key={i} className="staff-card">
                    <div className="staff-name">{s.name}</div>
                    <div className="staff-role-tag">{s.role}</div>
                    {s.description && <div className="staff-desc">{s.description}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.participantInfo?.totalFinal > 0 && (
            <section className="document-section">
              <div className="sec-num">10</div>
              <div className="sec-title">참가자 정보</div>
              <div className="success-box">
                <p>
                  <strong>신청 인원</strong>: {data.participantInfo.totalApplied}명 &nbsp;|&nbsp;
                  <strong>최종 참여</strong>: {data.participantInfo.totalFinal}명
                </p>
                {data.participantInfo.ageRange && (
                  <p><strong>연령대</strong>: {data.participantInfo.ageRange}</p>
                )}
                {data.participantInfo.location && (
                  <p><strong>지역</strong>: {data.participantInfo.location}</p>
                )}
              </div>
              {data.participantInfo.totalFinal > 0 && (
                <>
                  <div className="gender-bar">
                    <div className="male" style={{width:`${maleRatio}%`}}></div>
                    <div className="female" style={{width:`${femaleRatio}%`}}></div>
                  </div>
                  <div className="gender-legend">
                    <span><span className="legend-dot" style={{background:'#3B82F6'}}></span>남 {data.participantInfo.male}명 ({maleRatio}%)</span>
                    <span><span className="legend-dot" style={{background:'#EC4899'}}></span>여 {data.participantInfo.female}명 ({femaleRatio}%)</span>
                  </div>
                </>
              )}
            </section>
          )}

          {(data.reflection?.summary || data.reflection?.coreStrategies?.length > 0 || data.reviewSnapshot?.reviews?.length > 0) && (
            <section className="document-section">
              <div className="sec-num">11</div>
              <div className="sec-title">OUTRO — 성과 &amp; 배운 점</div>

              {data.reviewSnapshot?.averageRating > 0 && (
                <div className="rating-box">
                  참가자 평균 평점 <strong>{data.reviewSnapshot.averageRating} / 5.0</strong>
                  <span style={{fontSize:12,color:'#7A8391',marginLeft:8}}>({data.reviewSnapshot.totalReviews}명 응답)</span>
                </div>
              )}

              {data.reflection?.summary && (
                <div className="highlight-box" style={{marginBottom:16}}>
                  <p>{data.reflection.summary}</p>
                </div>
              )}

              {data.reflection?.coreStrategies?.length > 0 && (
                <>
                  <div className="sub-title">핵심 전략</div>
                  {data.reflection.coreStrategies.map((s, i) => (
                    <div key={i} className="strategy-card">
                      <div className="s-title">{s.title}</div>
                      <p>{s.description}</p>
                    </div>
                  ))}
                </>
              )}

              {data.reflection?.challenges?.length > 0 && (
                <>
                  <div className="sub-title">도전 과제 &amp; 대응</div>
                  {data.reflection.challenges.map((c, i) => (
                    <div key={i} className="warning-box">
                      <p><strong>리스크</strong>: {c.risk}</p>
                      <p><strong>대응</strong>: {c.solution}</p>
                    </div>
                  ))}
                </>
              )}

              {data.reflection?.learnings?.length > 0 && (
                <>
                  <div className="sub-title">배운 점</div>
                  <div className="feedback-card learn">
                    <ul>
                      {data.reflection.learnings.map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                  </div>
                </>
              )}

              {data.reviewSnapshot?.reviews?.length > 0 && (
                <>
                  <div className="sub-title">참가자 후기</div>
                  {data.reviewSnapshot.reviews.filter(r => r.comment).map((r, i) => (
                    <div key={i} className="review-item">
                      {!r.isAnonymous && r.userName && (
                        <strong style={{display:'block',marginBottom:4,fontSize:12,color:'#0A84FE'}}>{r.userName}</strong>
                      )}
                      {r.comment}
                    </div>
                  ))}
                </>
              )}
            </section>
          )}

          {(data.media?.images?.length > 0 || data.media?.youtube || data.media?.instagram) && (
            <section className="document-section">
              <div className="sec-num">12</div>
              <div className="sec-title">미디어 자료</div>

              {data.media.images?.length > 0 && (
                <>
                  <div className="sub-title"> 현장 사진</div>
                  <div className="media-preview-grid">
                    {data.media.images.map((url, i) => (
                      <div key={i} className="media-preview-item">
                        <img src={url} alt={`현장 ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {(data.media.youtube || data.media.instagram) && (
                <div className="success-box" style={{marginTop:16}}>
                  {data.media.youtube && <p><strong>YouTube</strong>: <a href={data.media.youtube} target="_blank" rel="noreferrer">{data.media.youtube}</a></p>}
                  {data.media.instagram && <p><strong>Instagram</strong>: <a href={data.media.instagram} target="_blank" rel="noreferrer">{data.media.instagram}</a></p>}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

// ArchiveEditor
const ArchiveEditor = ({ event, formData, setFormData, onMediaUpload }) => {
  const updateField = (path, value) => {
    const keys = path.split('.');
    setFormData(prev => {
      const next = { ...prev };
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = { ...cur[keys[i]] };
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const addItem = (field, template) =>
    setFormData(prev => ({ ...prev, [field]: [...(prev[field] || []), template] }));

  const removeItem = (field, idx) =>
    setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }));

  const updateItem = (field, idx, key, value) =>
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === idx ? { ...item, [key]: value } : item),
    }));

  const addReflectionItem = (subField, template) =>
    setFormData(prev => ({
      ...prev,
      reflection: {
        ...prev.reflection,
        [subField]: [...(prev.reflection[subField] || []), template],
      },
    }));
  const removeReflectionItem = (subField, idx) =>
    setFormData(prev => ({
      ...prev,
      reflection: {
        ...prev.reflection,
        [subField]: prev.reflection[subField].filter((_, i) => i !== idx),
      },
    }));
  const updateReflectionItem = (subField, idx, key, value) =>
    setFormData(prev => ({
      ...prev,
      reflection: {
        ...prev.reflection,
        [subField]: prev.reflection[subField].map((item, i) =>
          i === idx ? (typeof item === 'string' ? value : { ...item, [key]: value }) : item
        ),
      },
    }));

  return (
    <div className="archive-editor">
      <div className="editor-content">
        <div className="editor-header-card">
          <h2>{event.title}</h2>
          <p className="event-meta">
            {new Date(event.date).toLocaleDateString('ko-KR')} · {event.place} · {event.team}
          </p>
        </div>

        <form className="archive-form">

          <section className="form-section">
            <span className="section-number">★</span>
            <h2>총괄 스태프</h2>
            <div className="form-group">
              <label>총괄 스태프 이름 <span style={{color:'#0A84FE'}}>*</span></label>
              <input
                type="text"
                value={formData.headStaff || ''}
                onChange={e => updateField('headStaff', e.target.value)}
                placeholder="예: 홍길동"
              />
              <p className="form-helper">이 아카이브의 총괄 책임자 이름을 입력하세요. 문서 상단에 표시됩니다.</p>
            </div>
          </section>

          <section className="form-section">
            <span className="section-number">1</span>
            <h2>이벤트 요약</h2>
            <div className="form-group">
              <label>한 줄 / 단락 요약</label>
              <textarea
                value={formData.projectSummary || ''}
                onChange={e => updateField('projectSummary', e.target.value)}
                placeholder="이 이벤트를 한 문단으로 요약해주세요. 어떤 행사였고, 무엇이 특별했나요?"
                style={{minHeight:100}}
              />
            </div>
          </section>

          <section className="form-section">
            <span className="section-number">2</span>
            <h2>이벤트 개요</h2>
            <div className="form-row">
              <div className="form-group">
                <label>시작 시간</label>
                <input type="text" value={formData.eventSnapshot?.startTime || ''} onChange={e => updateField('eventSnapshot.startTime', e.target.value)} placeholder="예: 14:00" />
              </div>
              <div className="form-group">
                <label>종료 시간</label>
                <input type="text" value={formData.eventSnapshot?.endTime || ''} onChange={e => updateField('eventSnapshot.endTime', e.target.value)} placeholder="예: 18:00" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>장소</label>
                <input type="text" value={formData.eventSnapshot?.place || ''} onChange={e => updateField('eventSnapshot.place', e.target.value)} placeholder="예: 서울대학교 체육관" />
              </div>
              <div className="form-group">
                <label>참가비</label>
                <input type="number" value={formData.eventSnapshot?.participation_fee || 0} onChange={e => updateField('eventSnapshot.participation_fee', Number(e.target.value))} placeholder="0" />
              </div>
            </div>
            <div className="form-group">
              <label>행사 소개 (공지문 스타일)</label>
              <textarea
                value={formData.eventSnapshot?.contents || ''}
                onChange={e => updateField('eventSnapshot.contents', e.target.value)}
                placeholder="참가자에게 공지했던 행사 내용을 입력하세요."
              />
            </div>
          </section>

          <section className="form-section">
            <span className="section-number">3</span>
            <h2>기획 의도 &amp; 배경</h2>
            <div className="form-group">
              <label>기획 의도 &amp; 배경</label>
              <textarea
                value={formData.background || ''}
                onChange={e => updateField('background', e.target.value)}
                placeholder="이 이벤트를 기획하게 된 배경, 의도, 타겟, 해결하고자 한 문제 등을 자유롭게 작성해주세요."
                style={{minHeight: 160}}
              />
              <p className="form-helper">줄바꿈을 사용해 자유롭게 작성할 수 있어요.</p>
            </div>
          </section>

          <section className="form-section">
            <span className="section-number">4</span>
            <h2>이벤트 컨셉 &amp; 세계관</h2>
            <div className="form-group">
              <label>메인 컨셉</label>
              <input type="text" value={formData.concept?.mainConcept || ''} onChange={e => updateField('concept.mainConcept', e.target.value)} placeholder="예: 우리 모두가 주인공인 하루" />
            </div>
            <div className="form-group">
              <label>컨셉 상세 설명</label>
              <textarea value={formData.concept?.conceptDetail || ''} onChange={e => updateField('concept.conceptDetail', e.target.value)} placeholder="컨셉의 배경과 의도를 자세히 설명해주세요." />
            </div>
            <div className="form-group">
              <label>세계관 / 스토리라인</label>
              <textarea value={formData.concept?.worldView || ''} onChange={e => updateField('concept.worldView', e.target.value)} placeholder="예: 우주선에 갇힌 승무원들이 임무를 완수하는 스토리..." />
            </div>
          </section>

          <section className="form-section">
            <span className="section-number">5</span>
            <h2>콘텐츠 구조</h2>
            <div className="form-group">
              <label>진행 포맷</label>
              <input type="text" value={formData.structure?.format || ''} onChange={e => updateField('structure.format', e.target.value)} placeholder="예: 팀 대항전 / 개인전 / 릴레이" />
            </div>
            <div className="form-group">
              <label>전체 구조 개요</label>
              <textarea
                value={formData.structure?.overview || ''}
                onChange={e => updateField('structure.overview', e.target.value)}
                placeholder="콘텐츠가 어떻게 흘러가는지 단계별로 설명해주세요.&#10;예: 1부 팀 빌딩 → 2부 게임 대향전 → 3부 시상 및 마무리"
                style={{minHeight:120}}
              />
            </div>
          </section>

          <section className="form-section">
            <span className="section-number">6</span>
            <h2>게임 상세 설명</h2>
            <div className="dynamic-list">
              {(formData.games || []).map((g, i) => (
                <div key={i} className="list-item">
                  <button type="button" className="btn-remove-item" onClick={() => removeItem('games', i)}>삭제</button>
                  <div className="form-group">
                    <label>게임 이름</label>
                    <input type="text" value={g.name || ''} onChange={e => updateItem('games', i, 'name', e.target.value)} placeholder="예: 좀비 생존 게임" />
                  </div>
                  <div className="form-group">
                    <label>게임 개요</label>
                    <textarea value={g.overview || ''} onChange={e => updateItem('games', i, 'overview', e.target.value)} placeholder="한두 문장으로 게임을 설명하세요." style={{minHeight:70}} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>규칙</label>
                      <textarea value={g.rules || ''} onChange={e => updateItem('games', i, 'rules', e.target.value)} placeholder="게임 규칙을 입력하세요." style={{minHeight:80}} />
                    </div>
                    <div className="form-group">
                      <label>포인트 / 특이사항</label>
                      <textarea value={g.points || ''} onChange={e => updateItem('games', i, 'points', e.target.value)} placeholder="보너스 조건, 승리 조건 등" style={{minHeight:80}} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>점수 방식</label>
                    <input type="text" value={g.scoring || ''} onChange={e => updateItem('games', i, 'scoring', e.target.value)} placeholder="예: 팀별 누적 점수" />
                  </div>
                </div>
              ))}
              <button type="button" className="btn-add-item" onClick={() => addItem('games', { name:'', overview:'', rules:'', points:'', scoring:'' })}>
                + 게임 추가
              </button>
            </div>
          </section>

          <section className="form-section">
            <span className="section-number">7</span>
            <h2>타임라인 &amp; 큐시트</h2>
            <div className="dynamic-list">
              {(formData.timeline || []).map((t, i) => (
                <div key={i} className="list-item">
                  <button type="button" className="btn-remove-item" onClick={() => removeItem('timeline', i)}>삭제</button>
                  <div className="form-row-3">
                    <div className="form-group">
                      <label>시간</label>
                      <input type="text" value={t.time || ''} onChange={e => updateItem('timeline', i, 'time', e.target.value)} placeholder="예: 14:00" />
                    </div>
                    <div className="form-group">
                      <label>구분</label>
                      <input type="text" value={t.phase || ''} onChange={e => updateItem('timeline', i, 'phase', e.target.value)} placeholder="예: 준비" />
                    </div>
                    <div className="form-group">
                      <label>프로그램</label>
                      <input type="text" value={t.program || ''} onChange={e => updateItem('timeline', i, 'program', e.target.value)} placeholder="예: 참가자 입장" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>세부 내용</label>
                      <input type="text" value={t.detail || ''} onChange={e => updateItem('timeline', i, 'detail', e.target.value)} placeholder="세부 진행 내용" />
                    </div>
                    <div className="form-group">
                      <label>비고</label>
                      <input type="text" value={t.notes || ''} onChange={e => updateItem('timeline', i, 'notes', e.target.value)} placeholder="특이사항" />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className="btn-add-item" onClick={() => addItem('timeline', { time:'', phase:'', program:'', detail:'', notes:'' })}>
                + 타임라인 항목 추가
              </button>
            </div>
          </section>

          <section className="form-section">
            <span className="section-number">8</span>
            <h2>예산 테이블</h2>
            <div className="dynamic-list">
              {(formData.budget?.items || []).map((b, i) => (
                <div key={i} className="list-item">
                  <button type="button" className="btn-remove-item" onClick={() => {
                    const items = formData.budget.items.filter((_, idx) => idx !== i);
                    const total = items.reduce((s, x) => s + (x.amount || 0), 0);
                    setFormData(prev => ({ ...prev, budget: { items, total } }));
                  }}>삭제</button>
                  <div className="form-row">
                    <div className="form-group">
                      <label>항목</label>
                      <input type="text" value={b.category || ''} onChange={e => {
                        const items = formData.budget.items.map((item, idx) => idx === i ? { ...item, category: e.target.value } : item);
                        setFormData(prev => ({ ...prev, budget: { ...prev.budget, items } }));
                      }} placeholder="예: 식비" />
                    </div>
                    <div className="form-group">
                      <label>세부 내역</label>
                      <input type="text" value={b.detail || ''} onChange={e => {
                        const items = formData.budget.items.map((item, idx) => idx === i ? { ...item, detail: e.target.value } : item);
                        setFormData(prev => ({ ...prev, budget: { ...prev.budget, items } }));
                      }} placeholder="예: 점심 도시락 50인분" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>금액 (원)</label>
                      <input type="number" value={b.amount || 0} onChange={e => {
                        const items = formData.budget.items.map((item, idx) => idx === i ? { ...item, amount: Number(e.target.value) } : item);
                        const total = items.reduce((s, x) => s + (x.amount || 0), 0);
                        setFormData(prev => ({ ...prev, budget: { items, total } }));
                      }} />
                    </div>
                    <div className="form-group">
                      <label>비중 (%)</label>
                      <input type="number" value={b.ratio || ''} onChange={e => {
                        const items = formData.budget.items.map((item, idx) => idx === i ? { ...item, ratio: Number(e.target.value) } : item);
                        setFormData(prev => ({ ...prev, budget: { ...prev.budget, items } }));
                      }} placeholder="자동 계산 or 직접 입력" />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" className="btn-add-item" onClick={() => {
                const items = [...(formData.budget?.items || []), { category:'', detail:'', amount:0, ratio:0 }];
                setFormData(prev => ({ ...prev, budget: { ...prev.budget, items } }));
              }}>+ 예산 항목 추가</button>
            </div>
            {formData.budget?.items?.length > 0 && (
              <div style={{marginTop:12,padding:'12px 16px',background:'#F8F9FB',borderRadius:8,border:'1px solid #E2E6EA',fontSize:14}}>
                <strong>총 예산: </strong>
                <span style={{color:'#0A84FE',fontWeight:700}}>{(formData.budget?.total || 0).toLocaleString()}원</span>
              </div>
            )}
          </section>

          <section className="form-section">
            <span className="section-number">9</span>
            <h2>스태프 정보</h2>
            <div className="dynamic-list">
              {(formData.staff || []).map((s, i) => (
                <div key={i} className="list-item">
                  <button type="button" className="btn-remove-item" onClick={() => removeItem('staff', i)}>삭제</button>
                  <div className="form-row">
                    <div className="form-group">
                      <label>이름</label>
                      <input type="text" value={s.name || ''} onChange={e => updateItem('staff', i, 'name', e.target.value)} placeholder="예: 김민준" />
                    </div>
                    <div className="form-group">
                      <label>역할</label>
                      <input type="text" value={s.role || ''} onChange={e => updateItem('staff', i, 'role', e.target.value)} placeholder="예: 진행 MC" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>담당 업무 설명</label>
                    <input type="text" value={s.description || ''} onChange={e => updateItem('staff', i, 'description', e.target.value)} placeholder="예: 오프닝/클로징 진행 및 게임 심판" />
                  </div>
                </div>
              ))}
              <button type="button" className="btn-add-item" onClick={() => addItem('staff', { name:'', role:'', description:'' })}>
                + 스태프 추가
              </button>
            </div>
          </section>

          <section className="form-section">
            <span className="section-number">10</span>
            <h2>참가자 정보</h2>
            <div className="form-row-3">
              <div className="form-group">
                <label>신청 인원</label>
                <input type="number" value={formData.participantInfo?.totalApplied || 0} onChange={e => updateField('participantInfo.totalApplied', Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>최종 참여 인원</label>
                <input type="number" value={formData.participantInfo?.totalFinal || 0} onChange={e => updateField('participantInfo.totalFinal', Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>연령대</label>
                <input type="text" value={formData.participantInfo?.ageRange || ''} onChange={e => updateField('participantInfo.ageRange', e.target.value)} placeholder="예: 20~26세" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>남성 인원</label>
                <input type="number" value={formData.participantInfo?.male || 0} onChange={e => updateField('participantInfo.male', Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>여성 인원</label>
                <input type="number" value={formData.participantInfo?.female || 0} onChange={e => updateField('participantInfo.female', Number(e.target.value))} />
              </div>
            </div>
            <div className="form-group">
              <label>주요 지역</label>
              <input type="text" value={formData.participantInfo?.location || ''} onChange={e => updateField('participantInfo.location', e.target.value)} placeholder="예: 서울 / 수도권" />
            </div>
          </section>

          <section className="form-section">
            <span className="section-number">11</span>
            <h2>OUTRO — 성과 &amp; 배운 점</h2>

            <div className="form-group">
              <label>총평 / 회고 요약</label>
              <textarea
                value={formData.reflection?.summary || ''}
                onChange={e => updateField('reflection.summary', e.target.value)}
                placeholder="이 이벤트 전체를 돌아보며 한 문단으로 총평해주세요."
                style={{minHeight:100}}
              />
            </div>

            <div className="form-group" style={{marginTop:20}}>
              <label>💡 핵심 전략</label>
              <div className="dynamic-list">
                {(formData.reflection?.coreStrategies || []).map((s, i) => (
                  <div key={i} className="list-item">
                    <button type="button" className="btn-remove-item" onClick={() => removeReflectionItem('coreStrategies', i)}>삭제</button>
                    <div className="form-group">
                      <label>전략 제목</label>
                      <input type="text" value={s.title || ''} onChange={e => updateReflectionItem('coreStrategies', i, 'title', e.target.value)} placeholder="예: 팀 랜덤 배정으로 교류 극대화" />
                    </div>
                    <div className="form-group">
                      <label>상세 설명</label>
                      <textarea value={s.description || ''} onChange={e => updateReflectionItem('coreStrategies', i, 'description', e.target.value)} placeholder="왜 이 전략을 택했고 어떤 결과를 냈나요?" style={{minHeight:70}} />
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-add-item" onClick={() => addReflectionItem('coreStrategies', { title:'', description:'' })}>+ 핵심 전략 추가</button>
              </div>
            </div>

            <div className="form-group" style={{marginTop:20}}>
              <label>⚠️ 도전 과제 &amp; 대응</label>
              <div className="dynamic-list">
                {(formData.reflection?.challenges || []).map((c, i) => (
                  <div key={i} className="list-item">
                    <button type="button" className="btn-remove-item" onClick={() => removeReflectionItem('challenges', i)}>삭제</button>
                    <div className="form-row">
                      <div className="form-group">
                        <label>리스크 / 문제</label>
                        <textarea value={c.risk || ''} onChange={e => updateReflectionItem('challenges', i, 'risk', e.target.value)} style={{minHeight:70}} />
                      </div>
                      <div className="form-group">
                        <label>대응 방법</label>
                        <textarea value={c.solution || ''} onChange={e => updateReflectionItem('challenges', i, 'solution', e.target.value)} style={{minHeight:70}} />
                      </div>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-add-item" onClick={() => addReflectionItem('challenges', { risk:'', solution:'' })}>+ 도전 과제 추가</button>
              </div>
            </div>

            <div className="form-group" style={{marginTop:20}}>
              <label>📝 배운 점 (한 줄씩)</label>
              <div className="dynamic-list">
                {(formData.reflection?.learnings || []).map((l, i) => (
                  <div key={i} className="list-item" style={{padding:'12px 16px'}}>
                    <button type="button" className="btn-remove-item" onClick={() => removeReflectionItem('learnings', i)}>삭제</button>
                    <input
                      type="text"
                      value={l}
                      onChange={e => updateReflectionItem('learnings', i, null, e.target.value)}
                      placeholder="배운 점을 한 줄로 작성하세요."
                      style={{width:'85%',padding:'8px 12px',border:'1.5px solid #E2E6EA',borderRadius:8,fontFamily:'GMS,sans-serif',fontSize:13}}
                    />
                  </div>
                ))}
                <button type="button" className="btn-add-item" onClick={() => addReflectionItem('learnings', '')}>+ 배운 점 추가</button>
              </div>
            </div>
          </section>

          <section className="form-section">
            <span className="section-number">12</span>
            <h2>미디어 자료</h2>

            <div className="form-group">
              <label>현장 사진 업로드</label>
              <div className="upload-area">
                <input type="file" multiple accept="image/*" onChange={e => onMediaUpload(e, 'images')} style={{display:'none'}} id="image-upload" />
                <label htmlFor="image-upload" style={{cursor:'pointer',display:'block'}}>
                  <div className="upload-icon">📷</div>
                  <span className="upload-label">클릭하여 사진 업로드</span>
                  <span className="upload-hint">JPG, PNG, WEBP · 여러 장 선택 가능</span>
                </label>
              </div>
              {formData.media?.images?.length > 0 && (
                <div className="media-preview-grid" style={{marginTop:12}}>
                  {formData.media.images.map((url, i) => (
                    <div key={i} className="media-preview-item">
                      <img src={url} alt={`업로드 ${i + 1}`} />
                      <button className="media-remove-btn" onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          media: { ...prev.media, images: prev.media.images.filter((_, idx) => idx !== i) },
                        }));
                      }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>YouTube URL</label>
                <input type="url" value={formData.media?.youtube || ''} onChange={e => updateField('media.youtube', e.target.value)} placeholder="https://youtube.com/..." />
              </div>
              <div className="form-group">
                <label>Instagram URL</label>
                <input type="url" value={formData.media?.instagram || ''} onChange={e => updateField('media.instagram', e.target.value)} placeholder="https://instagram.com/..." />
              </div>
            </div>
          </section>

        </form>
      </div>
    </div>
  );
};

export default ArchiveDetail;