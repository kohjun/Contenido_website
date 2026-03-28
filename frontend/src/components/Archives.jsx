import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../css/Archives.css';

const C = {
  sig: "#0A84FE",
  sigP: "rgba(10,132,254,.07)",
  sigL: "rgba(10,132,254,.18)",
  ink: "#0D1117",
  mid: "#3D4450",
  soft: "#7A8391",
  paper: "#F8F9FB",
  warm: "#F1F3F6",
  line: "#E2E6EA",
  white: "#fff",
};

const Tag = ({ c = "blue", children }) => (
  <span className={`archive-tag ${c}`}>{children}</span>
);

const FileIcon = ({ type = "pdf", size = 30 }) => {
  const col = { pdf: "#0A84FE", event: "#0A84FE" }[type] || C.sig;
  const paths = {
    pdf: (<><rect x="3" y="1.5" width="10" height="13" rx="1.5" stroke={col} strokeWidth="1.2" fill="none"/><line x1="5" y1="6" x2="11" y2="6" stroke={col} strokeWidth="1" opacity=".6"/><line x1="5" y1="8.5" x2="11" y2="8.5" stroke={col} strokeWidth="1" opacity=".6"/></>),
    event: (<><rect x="2" y="2" width="5" height="6" rx="1" fill={col} opacity=".9"/><rect x="9" y="2" width="5" height="6" rx="1" fill={col} opacity=".55"/><rect x="2" y="10" width="12" height="2.5" rx="1" fill={col} opacity=".75"/></>)
  };
  return (
    <div className="file-icon" style={{ width: size, height: size, borderRadius: size * 0.25, background: `${col}12`, border: `1px solid ${col}28` }}>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 16 16" fill="none">
        {paths[type] || paths.pdf}
      </svg>
    </div>
  );
};

const PAGE_SIZE = 20;

const Archives = () => {
  const navigate = useNavigate();
  const { isAuthorized, isLoading: isCheckingAuth, user } = useAuth(['officer', 'admin'], true);

  const [summary, setSummary] = useState({ total: 0, archived: 0 });
  const [recentEvents, setRecentEvents] = useState([]);
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setFilter] = useState('전체');
  const searchInputRef = useRef(null);

  const filters = ['전체', '완료', '대기중'];

  useEffect(() => {
    if (isAuthorized) {
      loadInitial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activeFilter, isAuthorized]);

  const buildQS = (pageNum) => {
    const p = new URLSearchParams();
    p.set('page', pageNum);
    p.set('limit', PAGE_SIZE);
    if (searchQuery) p.set('search', searchQuery);
    if (activeFilter !== '전체') {
      p.set('status', activeFilter === '완료' ? 'archived' : 'pending');
    }
    return p.toString();
  };

  const loadInitial = async () => {
    setLoadingInitial(true);
    setEvents([]);
    setPage(1);
    setHasMore(true);

    try {
      const res = await fetch(`/archives/ended-events?${buildQS(1)}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401) { window.location.href = '/auth/kakao'; return; }
        throw new Error('목록 조회 실패');
      }
      const data = await res.json();

      setEvents(data.events || []);
      setHasMore(data.hasMore ?? false);
      setSummary({ total: data.total || 0, archived: data.archivedCount || 0 });

      if (!searchQuery && activeFilter === '전체') {
        setRecentEvents((data.events || []).slice(0, 4));
      }
    } catch (err) {
      console.error('이벤트 목록 에러:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const res = await fetch(`/archives/ended-events?${buildQS(nextPage)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('추가 로드 실패');
      const data = await res.json();

      setEvents(prev => [...prev, ...(data.events || [])]);
      setHasMore(data.hasMore ?? false);
      setPage(nextPage);
    } catch (err) {
      console.error('더보기 에러:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const executeSearch = () => setSearchQuery(searchInput.trim());

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') executeSearch();
    if (e.key === 'Escape') { setSearchInput(''); setSearchQuery(''); }
  };

  const handleReset = () => {
    setSearchInput('');
    setSearchQuery('');
    setFilter('전체');
  };

  const openGuide = () => {
    window.open('/uploads/guidpdf.pdf', '_blank', 'noopener,noreferrer');
  };

  const getEventStatus = (event) =>
    event.archived ? { label: '완료', color: 'blue' } : { label: '대기중', color: 'gray' };

  const getTimeAgo = (date) => {
    const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;
    return new Date(date).toLocaleDateString('ko-KR');
  };

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: 'rgba(10,132,254,0.18)', color: C.sig, borderRadius: '2px', padding: '0 1px' }}>
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const isFiltered = !!(searchQuery || activeFilter !== '전체');

  if (isCheckingAuth) {
    return (
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
          border: `3px solid ${C.line}`,
          borderTopColor: C.sig,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: C.soft, fontSize: '14px' }}>권한 확인 중...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="archives-container">
      <div className="archives-hero">
        <div className="hero-content animate-fade-up">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            이벤트 아카이브
          </div>
          <h1 className="hero-title">
            모든 이벤트를<br />
            <span className="highlight">체계적으로</span><br />
            보존하세요
          </h1>
          <p className="hero-description">
            종료된 이벤트를 포트폴리오 형식으로 아카이빙.<br />
            언제든 다시 꺼내볼 수 있는 지식의 도서관입니다.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => navigate('/archives/new')}>
              새 아카이브 만들기(외부 이벤트 전용)
            </button>
            <button className="btn-secondary" onClick={openGuide}>
              가이드 보기 →
            </button>
          </div>
          <div className="hero-stats">
            {[
              [summary.total + '+', '등록 이벤트'],
              [summary.archived + '+', '아카이브 완료'],
              ['4+', '활동 팀']
            ].map(([value, label], i) => (
              <div key={i} className="stat-item">
                {i > 0 && <div className="stat-divider" />}
                <div>
                  <div className="stat-value">{value}</div>
                  <div className="stat-label">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-card animate-fade-up-delay">
          <div className="card-header">
            <span>최근 아카이빙</span>
            <span className="badge-today">TODAY</span>
          </div>
          {loadingInitial && recentEvents.length === 0 ? (
            <div style={{ padding: '20px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', textAlign: 'center' }}>
              불러오는 중...
            </div>
          ) : (
            recentEvents.map((event) => {
              const status = getEventStatus(event);
              return (
                <div key={event._id} className="card-item" onClick={() => navigate(`/archives/${event._id}`)}>
                  <FileIcon type="event" size={28} />
                  <div className="card-item-content">
                    <div className="card-item-title">{event.title}</div>
                    <div className="card-item-meta">{event.place} · {getTimeAgo(event.date)}</div>
                  </div>
                  <Tag c={status.color}>{status.label}</Tag>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="archives-search-section">
        <div className="search-bar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="4" stroke={C.sig} strokeWidth="1.5" fill="none" />
            <path d="M11 11l2.5 2.5" stroke={C.sig} strokeWidth="1.5" strokeLinecap="round" />
          </svg>

          <input
            ref={searchInputRef}
            type="text"
            placeholder="이벤트, 장소, 팀 검색... (Enter로 검색)"
            className="search-input"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />

          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setSearchQuery(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.soft, fontSize: '16px', padding: '0 4px', flexShrink: 0 }}
            >
              ✕
            </button>
          )}

          <button
            onClick={executeSearch}
            style={{
              background: searchInput ? C.sig : C.line,
              color: searchInput ? C.white : C.soft,
              border: 'none', borderRadius: '8px', padding: '7px 16px',
              fontSize: '13px', fontWeight: '600', cursor: 'pointer',
              flexShrink: 0, transition: 'background 0.2s, color 0.2s', whiteSpace: 'nowrap'
            }}
          >
            검색
          </button>

          <div className="search-filters">
            {filters.map(f => (
              <button
                key={f}
                className={`filter-btn ${activeFilter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {isFiltered && (
          <div style={{ padding: '10px 4px', fontSize: '13px', color: C.soft, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {searchQuery && <span><strong style={{ color: C.sig }}>"{searchQuery}"</strong> 검색 결과</span>}
            {activeFilter !== '전체' && <span>· <strong style={{ color: C.mid }}>{activeFilter}</strong> 필터</span>}
            {!loadingInitial && (
              <span style={{ color: C.sig, fontWeight: '600' }}>
                {events.length}건{hasMore ? ' (더 있음)' : ''}
              </span>
            )}
            <button
              onClick={handleReset}
              style={{ background: 'none', border: `1px solid ${C.line}`, borderRadius: '6px', padding: '2px 10px', fontSize: '12px', color: C.soft, cursor: 'pointer' }}
            >
              초기화
            </button>
          </div>
        )}
      </div>

      <div className="archives-grid-section">
        <div className="section-header">
          <span className="section-title">
            {searchQuery
              ? `"${searchQuery}" 검색 결과`
              : activeFilter !== '전체'
                ? `${activeFilter} 이벤트`
                : '종료된 이벤트'}
          </span>
          {!loadingInitial && (
            <span style={{ fontSize: '13px', color: C.soft }}>
              {events.length}개 표시 중
              {summary.total > 0 && ` / 전체 ${summary.total}개`}
            </span>
          )}
        </div>

        {loadingInitial ? (
          <div className="loading-state">이벤트를 불러오는 중...</div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <FileIcon type="event" size={48} />
            {isFiltered ? (
              <>
                <p>검색 결과가 없습니다.</p>
                <button
                  onClick={handleReset}
                  style={{ marginTop: '12px', background: C.sig, color: C.white, border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  필터 초기화
                </button>
              </>
            ) : (
              <p>종료된 이벤트가 없습니다.</p>
            )}
          </div>
        ) : (
          <>
            <div className="event-grid">
              {events.map((event, i) => {
                const status = getEventStatus(event);
                const thumbnail = event.images?.[0] || event.thumbnail || null;

                return (
                  <div
                    key={event._id}
                    className={`event-card animate-fade-up-${(i % 4) + 1}`}
                    onClick={() => navigate(`/archives/${event._id}`)}
                  >
                    {thumbnail && (
                      <div className="event-card-thumbnail">
                        <img
                          src={thumbnail}
                          alt={event.title}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.style.display = 'none';
                          }}
                        />
                        <div className="thumbnail-overlay">
                          <span className="thumbnail-status">{status.label}</span>
                        </div>
                      </div>
                    )}

                    {!thumbnail && (
                      <div className="event-card-header">
                        <span className="event-card-label">{status.label.toUpperCase()}</span>
                        <FileIcon type="event" size={34} />
                      </div>
                    )}
                    <div className="event-card-body">
                      <div className="event-card-title">
                        {searchQuery ? highlightText(event.title, searchQuery) : event.title}
                      </div>
                      {event.team && (
                        <div style={{ fontSize: '11px', color: C.soft, marginBottom: '4px' }}>
                          {searchQuery ? highlightText(event.team, searchQuery) : event.team}
                        </div>
                      )}
                      <div className="event-card-footer">
                        <span className="event-card-date">
                          {new Date(event.date).toLocaleDateString('ko-KR')}
                        </span>
                        <div className="event-card-icon">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M5 1v8M2 4l3-3 3 3" stroke={C.sig} strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '36px 0 16px' }}>
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: loadingMore ? C.line : C.white,
                    color: loadingMore ? C.soft : C.sig,
                    border: `2px solid ${loadingMore ? C.line : C.sig}`,
                    borderRadius: '12px', padding: '12px 36px',
                    fontSize: '14px', fontWeight: '700',
                    cursor: loadingMore ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: loadingMore ? 'none' : '0 2px 10px rgba(10,132,254,0.15)'
                  }}
                >
                  {loadingMore ? (
                    <>
                      <span style={{
                        display: 'inline-block', width: '14px', height: '14px',
                        border: `2px solid ${C.soft}`, borderTopColor: 'transparent',
                        borderRadius: '50%', animation: 'spin 0.7s linear infinite'
                      }} />
                      불러오는 중...
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 2v10M3 8l4 4 4-4" stroke={C.sig} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      더보기 (20개씩)
                    </>
                  )}
                </button>
                <p style={{ marginTop: '10px', fontSize: '12px', color: C.soft }}>
                  {events.length}개 표시 중 · 전체 {summary.total}개
                </p>
              </div>
            ) : (
              events.length > PAGE_SIZE && (
                <div style={{ textAlign: 'center', padding: '28px 0', fontSize: '13px', color: C.soft }}>
                  ✓ 전체 {events.length}개를 모두 불러왔습니다.
                </div>
              )
            )}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Archives;