import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Calendar, Plus, X } from 'lucide-react';

// 스타일 정의
const styles = `
  .partnership-page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 40px 20px;
    background: #f8f9fa;
    min-height: 100vh;
  }

  .page-header {
    text-align: center;
    margin-bottom: 48px;
  }

  .page-header h1 {
    font-size: 2.5rem;
    font-weight: 800;
    color: #1a1a1a;
    margin-bottom: 12px;
  }

  .page-subtitle {
    font-size: 1.1rem;
    color: #666;
  }

  .filter-section {
    background: white;
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    margin-bottom: 32px;
  }

  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .category-filters {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .filter-btn {
    padding: 10px 24px;
    border: 2px solid #e5e7eb;
    background: white;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    color: #666;
  }

  .filter-btn:hover {
    border-color: #0a84fe;
    color: #0a84fe;
  }

  .filter-btn.active {
    background: #0a84fe;
    border-color: #0a84fe;
    color: white;
  }

  .btn-add-partner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #0a84fe;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-add-partner:hover {
    background: #0066cc;
    transform: translateY(-2px);
  }

  .search-box {
    position: relative;
  }

  .search-box input {
    width: 100%;
    padding: 12px 40px 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.95rem;
  }

  .search-box input:focus {
    outline: none;
    border-color: #0a84fe;
  }

  .search-icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
  }

  .partners-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 24px;
  }

  .partnership-card {
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    transition: transform 0.2s, box-shadow 0.2s;
    position: relative;
  }

  .partnership-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  }

  .category-ribbon {
    position: absolute;
    top: 0;
    right: 20px;
    z-index: 10;
  }

  .category-ribbon .relative {
    position: relative;
  }

  .fill-gray {
    fill: #2d3748;
  }

  .category-text {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    color: white;
    font-size: 0.8rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .card-image {
    width: 100%;
    height: 200px;
    overflow: hidden;
    background: #f0f0f0;
  }

  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .card-content {
    padding: 20px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .partner-name {
    font-size: 1.3rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0;
  }

  .btn-delete {
    padding: 4px;
    background: #fee;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    color: #dc2626;
    transition: all 0.2s;
  }

  .btn-delete:hover {
    background: #fcc;
  }

  .partnership-date {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: #666;
    margin-bottom: 16px;
  }

  .partnership-date .icon {
    width: 16px;
    height: 16px;
  }

  .info-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #555;
  }

  .info-item .icon {
    width: 18px;
    height: 18px;
    color: #0a84fe;
  }

  .info-icon {
    font-size: 1.1rem;
  }

  .info-text {
    flex: 1;
  }

  .partner-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
  }

  .tag {
    padding: 4px 10px;
    background: #f0f0f0;
    border-radius: 12px;
    font-size: 0.75rem;
    color: #555;
  }

  .benefits-section {
    margin-bottom: 16px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
  }

  .benefits-section h4 {
    font-size: 0.9rem;
    margin-bottom: 8px;
    color: #333;
  }

  .benefits-section ul {
    margin: 0;
    padding-left: 20px;
  }

  .benefits-section li {
    font-size: 0.85rem;
    color: #666;
    line-height: 1.6;
  }

  .card-actions {
    display: flex;
    gap: 8px;
  }

  .btn-action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-location {
    background: #0a84fe;
    color: white;
  }

  .btn-location:hover {
    background: #0066cc;
  }

  .btn-contact {
    background: #10b981;
    color: white;
  }

  .btn-contact:hover {
    background: #059669;
  }

  .btn-icon {
    width: 18px;
    height: 18px;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px;
    border-bottom: 1px solid #e5e7eb;
  }

  .modal-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0;
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #999;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-close:hover {
    color: #333;
  }

  .modal-body {
    padding: 24px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    font-weight: 600;
    margin-bottom: 8px;
    color: #333;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.95rem;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #0a84fe;
  }

  .facilities-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .facility-checkbox {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    transition: background 0.2s;
  }

  .facility-checkbox:hover {
    background: #f8f9fa;
  }

  .facility-checkbox input {
    width: auto;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    padding: 24px;
    border-top: 1px solid #e5e7eb;
  }

  .btn-cancel,
  .btn-submit {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancel {
    background: #f3f4f6;
    color: #666;
  }

  .btn-cancel:hover {
    background: #e5e7eb;
  }

  .btn-submit {
    background: #0a84fe;
    color: white;
  }

  .btn-submit:hover {
    background: #0066cc;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 16px;
  }

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #f3f4f6;
    border-top-color: #0a84fe;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .no-results {
    text-align: center;
    padding: 60px 20px;
    color: #999;
  }

  @media (max-width: 768px) {
    .page-header h1 {
      font-size: 2rem;
    }

    .filter-header {
      flex-direction: column;
      align-items: stretch;
    }

    .category-filters {
      justify-content: center;
    }

    .partners-grid {
      grid-template-columns: 1fr;
    }

    .facilities-grid {
      grid-template-columns: 1fr;
    }

    .card-actions {
      flex-direction: column;
    }
  }
`;

// 제휴 추가 모달 컴포넌트
const AddPartnerModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    placeName: '',
    category: '식당/카페',
    addressName: '',
    phoneNumber: '',
    capacity: '~10',
    memo: '',
    facilities: [],
    placeId: '',
    longitude: 0,
    latitude: 0
  });

  const categories = ['식당/카페', '이벤트/체험', '술집/모임'];
  const capacityOptions = ['~10', '~30', '~50', '~100'];
  const facilitiesOptions = [
    'TV/프로젝터', '인터넷/WIFI', '복사/인쇄기', '화이트보드', '음향/마이크',
    '취사시설', '음식물반입가능', '주차', 'PC/노트북', '의자/테이블',
    '콘센트', '24시 운영', '연중무휴', '간단한 다과/음료', '내부화장실',
    '마트/편의점', '남/여화장실 구분'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.placeName || !formData.addressName || !formData.phoneNumber) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    try {
      const response = await fetch('/savedPlaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          placeId: formData.placeId || `custom_${Date.now()}`,
          placeName: formData.placeName,
          addressName: formData.addressName,
          roadAddressName: formData.addressName,
          phoneNumber: formData.phoneNumber,
          category: formData.category,
          longitude: formData.longitude || 127.0,
          latitude: formData.latitude || 37.5,
          capacity: formData.capacity,
          facilities: formData.facilities,
          memo: formData.memo
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert('제휴가 추가되었습니다.');
        onAdd(result.place);
        onClose();
        setFormData({
          placeName: '',
          category: '식당/카페',
          addressName: '',
          phoneNumber: '',
          capacity: '~10',
          memo: '',
          facilities: [],
          placeId: '',
          longitude: 0,
          latitude: 0
        });
      } else {
        const error = await response.json();
        alert(`추가 실패: ${error.message}`);
      }
    } catch (error) {
      console.error('Error adding partner:', error);
      alert('제휴 추가 중 오류가 발생했습니다.');
    }
  };

  const handleFacilityToggle = (facility) => {
    setFormData(prev => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter(f => f !== facility)
        : [...prev.facilities, facility]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>제휴 추가하기</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>장소명 *</label>
              <input
                type="text"
                value={formData.placeName}
                onChange={(e) => setFormData({...formData, placeName: e.target.value})}
                placeholder="예: 카페 콘텐츠"
                required
              />
            </div>

            <div className="form-group">
              <label>카테고리</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>주소 *</label>
              <input
                type="text"
                value={formData.addressName}
                onChange={(e) => setFormData({...formData, addressName: e.target.value})}
                placeholder="예: 서울시 강남구 테헤란로 123"
                required
              />
            </div>

            <div className="form-group">
              <label>연락처 *</label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                placeholder="예: 02-1234-5678"
                required
              />
            </div>

            <div className="form-group">
              <label>수용 인원</label>
              <select
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
              >
                {capacityOptions.map(cap => (
                  <option key={cap} value={cap}>{cap}명</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>제휴 혜택</label>
              <textarea
                value={formData.memo}
                onChange={(e) => setFormData({...formData, memo: e.target.value})}
                placeholder="한 줄당 하나의 혜택을 입력하세요&#10;예:&#10;10% 할인&#10;웰컴 드링크 제공"
                rows="4"
              />
            </div>

            <div className="form-group">
              <label>편의시설</label>
              <div className="facilities-grid">
                {facilitiesOptions.map(facility => (
                  <label key={facility} className="facility-checkbox">
                    <input
                      type="checkbox"
                      checked={formData.facilities.includes(facility)}
                      onChange={() => handleFacilityToggle(facility)}
                    />
                    <span>{facility}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              취소
            </button>
            <button type="submit" className="btn-submit">
              추가하기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 제휴 파트너 카드 컴포넌트
const PartnershipCard = ({ partner, onDelete }) => {
  const handlePhoneClick = (phone) => {
    if (phone) {
      alert(`📞 연락처: ${phone}`);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`"${partner.placeName}"을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/savedPlaces/${partner._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        alert('제휴가 삭제되었습니다.');
        onDelete(partner._id);
      } else {
        const error = await response.json();
        alert(`삭제 실패: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting partner:', error);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const categoryMap = {
    '음식점': '식당/카페',
    '카페': '식당/카페',
    '술집': '술집/모임',
    '주점': '술집/모임',
    '레저': '이벤트/체험',
    '체육': '이벤트/체험'
  };

  const displayCategory = categoryMap[partner.category] || partner.category || '기타';
  const mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(partner.addressName)}`;
  const partnershipDate = partner.createdAt 
    ? new Date(partner.createdAt).toLocaleDateString('ko-KR').replace(/\. /g, '.').slice(0, -1)
    : '-';
  const capacity = partner.capacity?.replace('~', '') || '10';
  const benefits = partner.memo ? partner.memo.split('\n').filter(b => b.trim()) : [];

  return (
    <div className="partnership-card">
      <div className="category-ribbon">
        <div className="relative">
          <svg width="80" height="95" viewBox="0 0 100 120" className="fill-gray">
            <polygon points="0,0 100,0 100,90 50,120 0,90" />
          </svg>
          <div className="category-text">
            {displayCategory}
          </div>
        </div>
      </div>
      
      <div className="card-image">
        <img 
          src="/images/placeholder.png"
          alt={partner.placeName}
          onError={(e) => e.target.src = 'https://via.placeholder.com/400x300?text=No+Image'}
        />
      </div>
      
      <div className="card-content">
        <div className="card-header">
          <h3 className="partner-name">{partner.placeName}</h3>
          <button className="btn-delete" onClick={handleDelete} title="삭제">
            <X size={16} />
          </button>
        </div>
        
        <div className="partnership-date">
          <Calendar className="icon" />
          <span>제휴일: {partnershipDate}</span>
        </div>
        
        <div className="info-grid">
          <div className="info-item">
            <MapPin className="icon" />
            <span className="info-text">{partner.addressName}</span>
          </div>
          
          <div className="info-item">
            <span className="info-icon">👥</span>
            <span className="info-text">수용 {capacity}명</span>
          </div>
        </div>
        
        {partner.facilities && partner.facilities.length > 0 && (
          <div className="partner-tags">
            {partner.facilities.slice(0, 5).map((facility, index) => (
              <span key={index} className="tag">{facility}</span>
            ))}
            {partner.facilities.length > 5 && (
              <span className="tag">+{partner.facilities.length - 5}</span>
            )}
          </div>
        )}
        
        {benefits.length > 0 && (
          <div className="benefits-section">
            <h4>🎁 제휴 혜택</h4>
            <ul>
              {benefits.map((benefit, index) => (
                <li key={index}>{benefit}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="card-actions">
          <button 
            className="btn-action btn-location" 
            onClick={() => window.open(mapUrl, '_blank')}
          >
            <MapPin className="btn-icon" />
            위치 보기
          </button>
          <button 
            className="btn-action btn-contact"
            onClick={() => handlePhoneClick(partner.phoneNumber)}
          >
            <Phone className="btn-icon" />
            연락하기
          </button>
        </div>
      </div>
    </div>
  );
};

// 메인 대외협력팀 페이지 컴포넌트
const PartnershipPage = () => {
  const [partners, setPartners] = useState([]);
  const [filteredPartners, setFilteredPartners] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await fetch('/savedPlaces', {
        credentials: 'include'
      });
      
      if (response.status === 401) {
        alert('로그인이 필요합니다.');
        window.location.href = '/login.html';
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setPartners(data);
        setFilteredPartners(data);
      } else {
        console.error('Failed to fetch partners');
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = partners;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => {
        const categoryMap = {
          '음식점': '식당/카페',
          '카페': '식당/카페',
          '술집': '술집/모임',
          '주점': '술집/모임',
          '레저': '이벤트/체험',
          '체육': '이벤트/체험'
        };
        const displayCategory = categoryMap[p.category] || p.category || '기타';
        return displayCategory === selectedCategory;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.placeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.addressName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.memo?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPartners(filtered);
  }, [selectedCategory, searchTerm, partners]);

  const categories = ['all', '식당/카페', '이벤트/체험', '술집/모임'];

  const handleAddPartner = (newPartner) => {
    setPartners(prev => [newPartner, ...prev]);
  };

  const handleDeletePartner = (partnerId) => {
    setPartners(prev => prev.filter(p => p._id !== partnerId));
  };

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>로딩 중...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="partnership-page">
        <div className="page-header">
          <h1>제휴 파트너</h1>
          <p className="page-subtitle">
            CONTENIDO와 함께하는 {partners.length}개의 파트너
          </p>
        </div>

        <div className="filter-section">
          <div className="filter-header">
            <div className="category-filters">
              {categories.map(category => (
                <button
                  key={category}
                  className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category === 'all' ? '전체' : category}
                </button>
              ))}
            </div>
            
            <button className="btn-add-partner" onClick={() => setIsModalOpen(true)}>
              <Plus size={20} />
              제휴 추가하기
            </button>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="파트너명, 위치 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
        </div>

        <div className="partners-grid">
          {filteredPartners.length > 0 ? (
            filteredPartners.map(partner => (
              <PartnershipCard 
                key={partner._id} 
                partner={partner}
                onDelete={handleDeletePartner}
              />
            ))
          ) : (
            <div className="no-results">
              <p>검색 결과가 없습니다.</p>
            </div>
          )}
        </div>

        <AddPartnerModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAdd={handleAddPartner}
        />
      </div>
    </>
  );
};

export default PartnershipPage;