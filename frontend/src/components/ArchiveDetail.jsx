import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../css/ArchiveDetail.css';

const C = {
  sig: "#0A84FE",
  sigP: "rgba(10,132,254,.07)",
  sigL: "rgba(10,132,254,.18)",
  ink: "#0D1117",
  mid: "#3D4450",
  soft: "#7A8391",
  paper: "#F8F9FB",
  line: "#E2E6EA",
  white: "#fff",
};

const ArchiveDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState('view'); // 'view' or 'edit'
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState({
    background: { why: '', who: '', what: '' },
    solution: { differentiation: '', approach: '', expectedEffect: '' },
    concept: { mainConcept: '', conceptDetail: '', worldView: '' },
    structure: { format: '', overview: '' },
    timeline: [],
    games: [],
    budget: { items: [], total: 0 },
    staff: [],
    participants: { total: 0, male: 0, female: 0, ageRange: '', location: '' },
    expectedOutcomes: { quantitative: [], qualitative: [], highlights: [] },
    references: { benchmarking: [], gameRules: [], budgetSource: '', spaceDesign: '' },
    reflection: { coreStrategies: [], challenges: [], learnings: [], summary: '' },
    feedback: { improvements: '', regrets: '' },
    media: { images: [], instagram: '', youtube: '', proposal: '' }
  });

  useEffect(() => {
    loadEvent();
  }, [id]);

  const loadEvent = async () => {
  // 1. ID가 'new'라면 서버에 fetch를 보낼 필요가 없습니다.
  if (id === 'new') {
    setLoading(false);
    setMode('edit'); // 새 아카이브는 바로 편집 모드로 진입
    return;
  }

  try {
    const response = await fetch(`/archives/event/${id}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 401) {
        window.location.href = '/auth/kakao';
        return;
      }
      throw new Error('이벤트를 불러올 수 없습니다.');
    }

    const data = await response.json();
    setEvent(data);

      // 아카이브 완료 여부 확인
      if (data.archive?.archived) {
        setMode('view');
        setFormData(data.archive);
      } else {
        setMode('edit');
        // 기존 데이터 자동 로드
        loadExistingData(data);
      }
    } catch (error) {
      console.error('이벤트 조회 에러:', error);
      alert('이벤트를 불러올 수 없습니다.');
      navigate('/archives');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingData = (data) => {
    // 참가자 정보 자동 입력
    setFormData(prev => ({
      ...prev,
      participants: {
        ...prev.participants,
        total: data.finalParticipants?.length || 0
      },
      feedback: {
        ...prev.feedback,
        rating: calculateAverageRating(data.endEvaluations),
        reviews: (data.endEvaluations || [])
          .filter(e => e.feedback)
          .map(e => e.feedback)
      }
    }));
  };

  const calculateAverageRating = (evaluations) => {
    if (!evaluations || evaluations.length === 0) return 0;
    const ratings = evaluations.map(e => e.rating).filter(r => r);
    if (ratings.length === 0) return 0;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  };

  const handleSave = async () => {
    if (!confirm('아카이브를 저장하시겠습니까?')) return;

    setSaving(true);
    try {
      const response = await fetch(`/archives/save/${id}`, {
        method: 'PUT',
        credentials: 'include', // 쿠키 포함
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert('로그인이 필요합니다.');
          window.location.href = '/auth/kakao';
          return;
        }
        throw new Error('저장 실패');
      }

      const result = await response.json();
      alert('아카이브가 저장되었습니다!');
      
      // 뷰 모드로 전환
      setEvent({ ...event, archive: result.archive });
      setMode('view');
    } catch (error) {
      console.error('저장 에러:', error);
      alert('아카이브 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'images');

        const response = await fetch(`/archives/upload/${id}`, {
          method: 'POST',
          credentials: 'include', // 쿠키 포함
          body: formData
        });

        if (!response.ok) {
          if (response.status === 401) {
            alert('로그인이 필요합니다.');
            window.location.href = '/auth/kakao';
            return;
          }
          throw new Error('업로드 실패');
        }

        const result = await response.json();
        setFormData(prev => ({
          ...prev,
          media: {
            ...prev.media,
            images: [...prev.media.images, result.url]
          }
        }));
      } catch (error) {
        console.error('이미지 업로드 에러:', error);
        alert(`${file.name} 업로드 실패`);
      }
    }
  };

  if (loading) {
    return (
      <div className="archive-detail-container">
        <div className="loading-state">이벤트를 불러오는 중...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="archive-detail-container">
        <div className="error-state">이벤트를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="archive-detail-container">
      {/* Header */}
      <div className="detail-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => navigate('/archives')}>
            ← 뒤로
          </button>
          <span className="breadcrumb">
            아카이브 › {event.title}
          </span>
        </div>
        <div className="header-right">
          {mode === 'view' ? (
            <>
              <button className="btn-secondary" onClick={() => window.print()}>
                PDF 다운로드
              </button>
              <button className="btn-secondary" onClick={() => setMode('edit')}>
                편집
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => setMode('view')}>
                취소
              </button>
              <button 
                className="btn-primary" 
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </>
          )}
        </div>
      </div>

      {mode === 'view' ? (
        <ArchiveViewer event={event} data={formData} />
      ) : (
        <ArchiveEditor 
          event={event}
          formData={formData}
          setFormData={setFormData}
          onImageUpload={handleImageUpload}
        />
      )}
    </div>
  );
};

/* ========== 뷰어 컴포넌트 ========== */
const ArchiveViewer = ({ event, data }) => {
  return (
    <div className="archive-viewer">
      <div className="viewer-sidebar">
        <div className="sidebar-section">
          <div className="sidebar-title">문서 정보</div>
          <div className="info-row">
            <span>이벤트</span>
            <span className="info-value">{event.title}</span>
          </div>
          <div className="info-row">
            <span>일시</span>
            <span className="info-value">
              {new Date(event.date).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <div className="info-row">
            <span>장소</span>
            <span className="info-value">{event.place}</span>
          </div>
          <div className="info-row">
            <span>팀</span>
            <span className="info-value">{event.team}</span>
          </div>
          <div className="info-row">
            <span>참가자</span>
            <span className="info-value">{data.participants?.total || 0}명</span>
          </div>
          {data.feedback?.rating > 0 && (
            <div className="info-row">
              <span>평점</span>
              <span className="info-value highlight">
                {data.feedback.rating} / 5.0
              </span>
            </div>
          )}
        </div>

        {data.media?.images?.length > 0 && (
          <div className="sidebar-section">
            <div className="sidebar-title">현장 사진</div>
            <div className="sidebar-images">
              {data.media.images.map((url, i) => (
                <img key={i} src={url} alt={`현장 사진 ${i + 1}`} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="viewer-content">
        <div className="document-paper">
          <div className="document-header">
            <span>CONTENIDO ARCHIVE</span>
            <span>1 / 1</span>
          </div>

          <h1 className="document-title">{event.title}</h1>
          <p className="document-meta">
            {event.team} · {new Date(event.date).toLocaleDateString('ko-KR')} · 
            {data.participants?.total || 0}명 참여
          </p>

          {/* 기획 배경 */}
          {data.background?.why && (
            <section className="document-section">
              <h2>01. 기획 배경</h2>
              <div className="highlight-box">
                <div className="subsection">
                  <strong>Why? 왜 이 기획을 하게 되었나?</strong>
                  <p>{data.background.why}</p>
                </div>
                <div className="subsection">
                  <strong>Who? 타겟은 누구인가?</strong>
                  <p>{data.background.who}</p>
                </div>
                <div className="subsection">
                  <strong>What? 해결하고자 한 문제</strong>
                  <p>{data.background.what}</p>
                </div>
              </div>
            </section>
          )}

          {/* 솔루션 */}
          {data.solution?.differentiation && (
            <section className="document-section">
              <h2>02. 솔루션</h2>
              <div className="success-box">
                <p><strong>차별화 포인트:</strong> {data.solution.differentiation}</p>
                <p><strong>접근 방법:</strong> {data.solution.approach}</p>
                <p><strong>기대 효과:</strong> {data.solution.expectedEffect}</p>
              </div>
            </section>
          )}

          {/* 기획 컨셉 */}
          {data.concept?.mainConcept && (
            <section className="document-section">
              <h2>03. 기획 컨셉</h2>
              <p><strong>메인 컨셉:</strong> {data.concept.mainConcept}</p>
              {data.concept.conceptDetail && <p>{data.concept.conceptDetail}</p>}
              {data.concept.worldView && (
                <div className="subsection">
                  <strong>세계관</strong>
                  <p>{data.concept.worldView}</p>
                </div>
              )}
            </section>
          )}

          {/* 타임라인 */}
          {data.timeline?.length > 0 && (
            <section className="document-section">
              <h2>04. 타임라인 & 큐시트</h2>
              <table className="timeline-table">
                <thead>
                  <tr>
                    <th>시간</th>
                    <th>구분</th>
                    <th>프로그램</th>
                    <th>세부 내용</th>
                  </tr>
                </thead>
                <tbody>
                  {data.timeline.map((t, i) => (
                    <tr key={i}>
                      <td>{t.time}</td>
                      <td>{t.phase}</td>
                      <td><strong>{t.program}</strong></td>
                      <td>{t.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* 예산 */}
          {data.budget?.items?.length > 0 && (
            <section className="document-section">
              <h2>05. 예산</h2>
              <table className="budget-table">
                <thead>
                  <tr>
                    <th>항목</th>
                    <th>세부 내역</th>
                    <th>금액</th>
                  </tr>
                </thead>
                <tbody>
                  {data.budget.items.map((b, i) => (
                    <tr key={i}>
                      <td>{b.category}</td>
                      <td>{b.detail}</td>
                      <td className="amount">{b.amount?.toLocaleString()}원</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td colSpan="2"><strong>총 예산</strong></td>
                    <td className="amount">
                      <strong>{data.budget.total?.toLocaleString()}원</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {/* 피드백 */}
          {data.feedback?.reviews?.length > 0 && (
            <section className="document-section">
              <h2>06. 참가자 후기</h2>
              {data.feedback.rating > 0 && (
                <div className="rating-box">
                  평균 평점: <strong>{data.feedback.rating} / 5.0</strong>
                </div>
              )}
              {data.feedback.reviews.map((review, i) => (
                <div key={i} className="review-item">
                  {review}
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

/* ========== 에디터 컴포넌트 ========== */
const ArchiveEditor = ({ event, formData, setFormData, onImageUpload }) => {
  const updateField = (path, value) => {
    const keys = path.split('.');
    setFormData(prev => {
      const newData = { ...prev };
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  return (
    <div className="archive-editor">
      <div className="editor-sidebar">
        <div className="sidebar-info">
          <h3>기존 이벤트 정보</h3>
          <div className="info-box">
            <p><strong>제목:</strong> {event.title}</p>
            <p><strong>일시:</strong> {new Date(event.date).toLocaleDateString('ko-KR')}</p>
            <p><strong>장소:</strong> {event.place}</p>
            <p><strong>팀:</strong> {event.team}</p>
            <p><strong>참가 인원:</strong> {event.finalParticipants?.length || 0}명</p>
          </div>

          {event.endEvaluations?.length > 0 && (
            <div className="reviews-box">
              <h4>기존 후기</h4>
              {event.endEvaluations
                .filter(e => e.feedback)
                .map((e, i) => (
                  <div key={i} className="review-preview">
                    <strong>{e.userId?.name || '익명'}</strong>
                    <span>{e.feedback}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="editor-content">
        <form className="archive-form">
          {/* 기획 배경 */}
          <section className="form-section">
            <h2>1. 기획 배경 및 문제 정의</h2>
            
            <div className="form-group">
              <label>Why? 왜 이 기획을 하게 되었나?</label>
              <textarea
                value={formData.background?.why || ''}
                onChange={(e) => updateField('background.why', e.target.value)}
                placeholder="예: 두 동아리 간 교류 기회 부족"
              />
            </div>

            <div className="form-group">
              <label>Who? 타겟은 누구인가?</label>
              <textarea
                value={formData.background?.who || ''}
                onChange={(e) => updateField('background.who', e.target.value)}
                placeholder="예: 20대 초중반 대학생"
              />
            </div>

            <div className="form-group">
              <label>What? 해결하고자 한 문제</label>
              <textarea
                value={formData.background?.what || ''}
                onChange={(e) => updateField('background.what', e.target.value)}
                placeholder="예: 기존 행사는 단순 승부 중심 → 지루함"
              />
            </div>
          </section>

          {/* 솔루션 */}
          <section className="form-section">
            <h2>2. 솔루션</h2>
            
            <div className="form-group">
              <label>차별화 포인트</label>
              <textarea
                value={formData.solution?.differentiation || ''}
                onChange={(e) => updateField('solution.differentiation', e.target.value)}
                placeholder="예: 전략 + 협동 중심 설계"
              />
            </div>

            <div className="form-group">
              <label>접근 방법</label>
              <textarea
                value={formData.solution?.approach || ''}
                onChange={(e) => updateField('solution.approach', e.target.value)}
                placeholder="예: TV 예능 메커니즘 도입"
              />
            </div>

            <div className="form-group">
              <label>기대 효과</label>
              <textarea
                value={formData.solution?.expectedEffect || ''}
                onChange={(e) => updateField('solution.expectedEffect', e.target.value)}
                placeholder="예: 모두가 주인공"
              />
            </div>
          </section>

          {/* 미디어 */}
          <section className="form-section">
            <h2>14. 미디어 업로드</h2>
            
            <div className="form-group">
              <label>현장 사진</label>
              <div className="upload-area">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={onImageUpload}
                  style={{ display: 'none' }}
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="upload-label">
                  클릭하여 사진 업로드
                </label>
              </div>
              {formData.media?.images?.length > 0 && (
                <div className="image-preview-grid">
                  {formData.media.images.map((url, i) => (
                    <img key={i} src={url} alt={`업로드 ${i + 1}`} />
                  ))}
                </div>
              )}
            </div>
          </section>
        </form>
      </div>
    </div>
  );
};

export default ArchiveDetail;