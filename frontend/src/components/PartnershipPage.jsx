import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Calendar, Plus, X } from 'lucide-react';
import '../PartnershipPage.css';

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
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>장소명 *</label>
            <input
              type="text"
              value={formData.placeName}
              onChange={(e) => setFormData({...formData, placeName: e.target.value})}
              placeholder="예) 카페 콘텐트"
              required
            />
          </div>

          <div className="form-group">
            <label>카테고리 *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              required
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
              placeholder="예) 서울시 강남구 역삼동 123-45"
              required
            />
          </div>

          <div className="form-group">
            <label>전화번호 *</label>
            <input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
              placeholder="예) 02-1234-5678"
              required
            />
          </div>

          <div className="form-group">
            <label>수용 인원 *</label>
            <select
              value={formData.capacity}
              onChange={(e) => setFormData({...formData, capacity: e.target.value})}
              required
            >
              {capacityOptions.map(cap => (
                <option key={cap} value={cap}>{cap}명</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>제휴 혜택 및 메모</label>
            <textarea
              value={formData.memo}
              onChange={(e) => setFormData({...formData, memo: e.target.value})}
              placeholder="제휴 혜택, 특이사항 등을 입력하세요..."
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
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
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
  );
};

export default PartnershipPage;