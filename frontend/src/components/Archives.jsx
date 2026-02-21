import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const col = {
    pdf: "#0A84FE",
    docx: "#34C759",
    xlsx: "#FF9F0A",
    img: "#BF5AF2",
    event: "#0A84FE"
  }[type] || C.sig;

  const paths = {
    pdf: (
      <>
        <rect x="3" y="1.5" width="10" height="13" rx="1.5" stroke={col} strokeWidth="1.2" fill="none"/>
        <line x1="5" y1="6" x2="11" y2="6" stroke={col} strokeWidth="1" opacity=".6"/>
        <line x1="5" y1="8.5" x2="11" y2="8.5" stroke={col} strokeWidth="1" opacity=".6"/>
      </>
    ),
    event: (
      <>
        <rect x="2" y="2" width="5" height="6" rx="1" fill={col} opacity=".9"/>
        <rect x="9" y="2" width="5" height="6" rx="1" fill={col} opacity=".55"/>
        <rect x="2" y="10" width="12" height="2.5" rx="1" fill={col} opacity=".75"/>
      </>
    )
  };

  return (
    <div className="file-icon" style={{
      width: size,
      height: size,
      borderRadius: size * 0.25,
      background: `${col}12`,
      border: `1px solid ${col}28`
    }}>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 16 16" fill="none">
        {paths[type] || paths.pdf}
      </svg>
    </div>
  );
};

const Archives = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setFilter] = useState("전체");
  const filters = ["전체", "완료", "진행중", "예정"];

  useEffect(() => {
    loadEndedEvents();
  }, []);

  const loadEndedEvents = async () => {
    try {
      const response = await fetch('/archives/ended-events', {
        credentials: 'include' // 쿠키 포함
      });

      if (!response.ok) {
        if (response.status === 401) {
          // 인증 실패 시 로그인 페이지로
          window.location.href = '/auth/kakao';
          return;
        }
        throw new Error('이벤트 목록을 불러올 수 없습니다.');
      }

      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('이벤트 목록 에러:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (eventId) => {
    navigate(`/archives/${eventId}`);
  };

  const getEventStatus = (event) => {
    if (event.archive?.archived) return { label: "완료", color: "blue" };
    if (event.isEnded) return { label: "대기중", color: "gray" };
    return { label: "진행중", color: "orange" };
  };

  const getTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "오늘";
    if (days === 1) return "어제";
    if (days < 7) return `${days}일 전`;
    if (days < 30) return `${Math.floor(days / 7)}주 전`;
    return new Date(date).toLocaleDateString('ko-KR');
  };

  const recentEvents = events.slice(0, 4);
  const archivedCount = events.filter(e => e.archive?.archived).length;

  return (
    <div className="archives-container">
      {/* Hero Section */}
      <div className="archives-hero">
        <div className="hero-content animate-fade-up">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            이벤트 아카이브
          </div>
          <h1 className="hero-title">
            모든 이벤트를<br/>
            <span className="highlight">체계적으로</span><br/>
            보존하세요
          </h1>
          <p className="hero-description">
            종료된 이벤트를 포트폴리오 형식으로 아카이빙.<br/>
            언제든 다시 꺼내볼 수 있는 지식의 도서관입니다.
          </p>
          <div className="hero-actions">
            <button 
              className="btn-primary"
              onClick={() => navigate('/archives/new')}
            >
              새 아카이브 만들기
            </button>
            <button className="btn-secondary">
              가이드 보기 →
            </button>
          </div>
          <div className="hero-stats">
            {[
              [events.length + "+", "등록 이벤트"],
              [archivedCount + "+", "아카이브 완료"],
              ["4+", "활동 팀"]
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

        {/* Live Card */}
        <div className="hero-card animate-fade-up-delay">
          <div className="card-header">
            <span>최근 아카이빙</span>
            <span className="badge-today">TODAY</span>
          </div>
          {recentEvents.map((event, i) => {
            const status = getEventStatus(event);
            return (
              <div 
                key={event._id}
                className="card-item"
                onClick={() => handleEventClick(event._id)}
              >
                <FileIcon type="event" size={28} />
                <div className="card-item-content">
                  <div className="card-item-title">{event.title}</div>
                  <div className="card-item-meta">
                    {event.place} · {getTimeAgo(event.date)}
                  </div>
                </div>
                <Tag c={status.color}>{status.label}</Tag>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search Bar */}
      <div className="archives-search-section">
        <div className="search-bar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4" stroke={C.sig} strokeWidth="1.5" fill="none"/>
            <path d="M11 11l2.5 2.5" stroke={C.sig} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input 
            type="text"
            placeholder="이벤트, 태그, 팀 검색..."
            className="search-input"
          />
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
      </div>

      {/* Event Grid */}
      <div className="archives-grid-section">
        <div className="section-header">
          <span className="section-title">종료된 이벤트</span>
          <button className="btn-view-all">
            전체 보기 →
          </button>
        </div>

        {loading ? (
          <div className="loading-state">이벤트를 불러오는 중...</div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <FileIcon type="event" size={48} />
            <p>종료된 이벤트가 없습니다.</p>
          </div>
        ) : (
          <div className="event-grid">
            {events.map((event, i) => {
              const status = getEventStatus(event);
              return (
                <div
                  key={event._id}
                  className={`event-card animate-fade-up-${(i % 4) + 1}`}
                  onClick={() => handleEventClick(event._id)}
                >
                  <div className="event-card-header">
                    <span className="event-card-label">{status.label.toUpperCase()}</span>
                    <FileIcon type="event" size={34} />
                  </div>
                  <div className="event-card-body">
                    <div className="event-card-title">{event.title}</div>
                    <div className="event-card-footer">
                      <span className="event-card-date">
                        {new Date(event.date).toLocaleDateString('ko-KR')}
                      </span>
                      <div className="event-card-icon">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M5 1v8M2 4l3-3 3 3" stroke={C.sig} strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Archives;