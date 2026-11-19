import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Calendar, Plus, X, Upload, Percent, Users, Search } from 'lucide-react';

// 스타일 정의 (Tone-on-Tone Azure #0A84FE · 중복 제거 및 리본 버그 수정)
const styles = `
  @font-face {
    font-family: 'GmarketSansMedium';
    src: url('https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_2001@1.1/GmarketSansMedium.woff') format('woff');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
  }

  .partnership-page {
    --pp-brand: #0A84FE;
    --pp-brand-strong: #0068D6;
    --pp-navy: #0B2A5B;
    --pp-ink: #0B192C;
    --pp-muted: #516278;
    --pp-soft: #D8ECFF;
    --pp-tint: #EEF6FF;
    --pp-border: #D2E3F7;
    --pp-border-subtle: #E5EFFB;
    --pp-grad: linear-gradient(135deg, #2B9BFF 0%, #0A84FE 100%);
    --pp-shadow: 0 8px 26px rgba(10, 48, 102, 0.07);
    font-family: 'GmarketSansMedium', system-ui, -apple-system, sans-serif;
    background: radial-gradient(1100px 560px at 50% -10%, #DCEBFF 0%, #EEF5FE 42%, #F7FAFF 100%);
    min-height: 100vh;
    padding: 36px 20px 90px;
    color: var(--pp-ink);
  }
  .partnership-page * { font-family: inherit; box-sizing: border-box; }

  /* ----- 히어로 배너 ----- */
  .page-header {
    position: relative;
    overflow: hidden;
    text-align: center;
    max-width: 1160px;
    margin: 0 auto 28px;
    padding: 40px 24px 34px;
    border-radius: 26px;
    color: #FFFFFF;
    background: linear-gradient(135deg, #005EC4 0%, #0A84FE 55%, #419EFF 100%);
    box-shadow: 0 16px 40px rgba(10, 132, 254, 0.26);
  }
  .page-header::before, .page-header::after {
    content: '';
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.14);
    pointer-events: none;
  }
  .page-header::before { width: 240px; height: 240px; right: -70px; top: -90px; }
  .page-header::after  { width: 160px; height: 160px; left: -50px; bottom: -70px; background: rgba(255, 255, 255, 0.10); }
  .page-header h1 {
    position: relative;
    z-index: 1;
    margin: 0;
    color: #FFFFFF;
    font-weight: 800;
    font-size: clamp(1.7rem, 4.2vw, 2.4rem);
    letter-spacing: -0.02em;
  }
  .page-subtitle {
    position: relative;
    z-index: 1;
    display: inline-block;
    margin: 12px 0 0;
    padding: 6px 16px;
    border-radius: 999px;
    color: #FFFFFF;
    font-size: 0.9rem;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(4px);
    font-variant-numeric: tabular-nums;
  }

  /* ----- 필터 / 검색 ----- */
  .filter-section {
    max-width: 1160px;
    margin: 0 auto 26px;
    padding: 20px;
    background: #FFFFFF;
    border: 1px solid var(--pp-border-subtle);
    border-radius: 22px;
    box-shadow: var(--pp-shadow);
  }
  .no-permission-message {
    background: var(--pp-tint);
    border: 1px solid var(--pp-border);
    color: var(--pp-navy);
    border-radius: 12px;
    padding: 11px 14px;
    font-size: 0.85rem;
    margin-bottom: 14px;
  }
  .filter-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .category-filters {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .filter-btn {
    padding: 9px 16px;
    border: 1.5px solid var(--pp-border);
    border-radius: 999px;
    background: #FFFFFF;
    color: var(--pp-muted);
    font-weight: 600;
    font-size: 0.88rem;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .filter-btn:hover {
    border-color: #80BEFF;
    color: var(--pp-brand);
    background: var(--pp-tint);
  }
  .filter-btn.active {
    background: var(--pp-grad);
    border-color: transparent;
    color: #FFFFFF;
    box-shadow: 0 6px 14px rgba(10, 132, 254, 0.28);
  }
  .btn-add-partner {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    background: var(--pp-grad);
    color: #FFFFFF;
    font-weight: 700;
    font-size: 0.88rem;
    box-shadow: 0 6px 16px rgba(10, 132, 254, 0.26);
    transition: transform 0.16s ease, box-shadow 0.16s ease;
  }
  .btn-add-partner:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 22px rgba(10, 132, 254, 0.34);
  }
  .btn-add-partner:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #94A3B8;
    box-shadow: none;
  }
  .search-box { position: relative; }
  .search-box input {
    width: 100%;
    padding: 12px 44px 12px 16px;
    border: 1.5px solid var(--pp-border);
    border-radius: 14px;
    background: #FAFDFE;
    font-size: 0.92rem;
    color: var(--pp-ink);
    outline: none;
    transition: border-color 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
  }
  .search-box input:focus {
    border-color: var(--pp-brand);
    background: #FFFFFF;
    box-shadow: 0 0 0 4px rgba(10, 132, 254, 0.12);
  }
  .search-icon {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.55;
    pointer-events: none;
  }

  /* ----- 카드 그리드 ----- */
  .partners-grid {
    max-width: 1160px;
    margin: 0 auto;
    display: grid;
    gap: 22px;
    grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  }
  .partnership-card {
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #FFFFFF;
    border: 1px solid var(--pp-border-subtle);
    border-radius: 22px;
    box-shadow: 0 8px 24px rgba(10, 48, 102, 0.06);
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .partnership-card:hover {
    transform: translateY(-5px);
    border-color: #80BEFF;
    box-shadow: 0 16px 36px rgba(10, 132, 254, 0.15);
  }

  /* 할인 뱃지 (시그니처 아주르 알약 — 리본 삼각형 버그 제거) */
  .discount-ribbon {
    position: absolute;
    top: 14px;
    left: 14px;
    z-index: 2;
  }
  .discount-text {
    display: inline-flex;
    align-items: center;
    padding: 6px 13px;
    border-radius: 999px;
    color: #FFFFFF;
    font-weight: 800;
    font-size: 0.82rem;
    letter-spacing: -0.01em;
    background: linear-gradient(135deg, #0A84FE 0%, #005EC4 100%);
    box-shadow: 0 6px 16px rgba(10, 132, 254, 0.36);
    font-variant-numeric: tabular-nums;
  }

  .card-image {
    position: relative;
    width: 100%;
    height: 196px;
    overflow: hidden;
    background: var(--pp-tint);
  }
  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.3s ease;
  }
  .partnership-card:hover .card-image img {
    transform: scale(1.04);
  }

  .card-content {
    padding: 18px 20px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }
  .partner-name {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--pp-navy);
    line-height: 1.3;
  }
  .btn-delete {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 9px;
    background: #FEECEC;
    color: #DC2626;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .btn-delete:hover {
    background: #DC2626;
    color: #FFFFFF;
  }
  .partnership-date {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #64748B;
    font-size: 0.8rem;
  }
  .partnership-date .icon { width: 14px; height: 14px; flex-shrink: 0; }

  .info-grid { display: flex; flex-direction: column; gap: 8px; }
  .info-item { display: flex; align-items: center; gap: 8px; color: #2E3F54; font-size: 0.86rem; }
  .info-item .icon { width: 16px; height: 16px; color: var(--pp-brand); flex-shrink: 0; }
  .info-icon { font-size: 0.92rem; }
  .info-text { flex: 1; }

  .partner-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tag {
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--pp-tint);
    color: #005EC4;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid #D2E3F7;
  }
  .benefits-section {
    background: var(--pp-tint);
    border: 1px solid #D2E3F7;
    border-radius: 14px;
    padding: 12px 14px;
    font-size: 0.84rem;
    color: #2E3F54;
    line-height: 1.55;
  }
  .benefits-section h4 {
    margin: 0 0 6px;
    font-size: 0.86rem;
    font-weight: 700;
    color: var(--pp-navy);
  }
  .benefits-section ul {
    margin: 0;
    padding-left: 18px;
  }
  .benefits-section li {
    font-size: 0.83rem;
    color: #2E3F54;
    line-height: 1.55;
  }

  .card-actions {
    display: flex;
    gap: 8px;
    margin-top: auto;
    padding-top: 6px;
  }
  .btn-action {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 11px;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    font-size: 0.86rem;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, background-color 0.16s ease;
  }
  .btn-icon { width: 16px; height: 16px; }
  .btn-location {
    background: var(--pp-grad);
    color: #FFFFFF;
    box-shadow: 0 6px 14px rgba(10, 132, 254, 0.24);
  }
  .btn-location:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 20px rgba(10, 132, 254, 0.32);
  }
  .btn-contact {
    background: #FFFFFF;
    color: var(--pp-brand-strong);
    border: 1.5px solid #B4D9FF;
  }
  .btn-contact:hover {
    background: var(--pp-tint);
    border-color: var(--pp-brand);
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 14px;
    color: var(--pp-muted);
  }
  .loading-spinner {
    width: 44px;
    height: 44px;
    border: 4px solid #D8ECFF;
    border-top-color: #0A84FE;
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .no-results {
    grid-column: 1 / -1;
    text-align: center;
    padding: 56px 20px;
    color: #64748B;
    background: #FFFFFF;
    border: 1px dashed #B4D9FF;
    border-radius: 20px;
  }

  /* ----- 모달 ----- */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(11, 25, 44, 0.48);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    overscroll-behavior: contain;
  }
  .modal-content {
    background: #FFFFFF;
    border-radius: 22px;
    width: 100%;
    max-width: 580px;
    max-height: 90vh;
    overflow-y: auto;
    border: 1px solid var(--pp-border-subtle);
    box-shadow: 0 24px 60px rgba(10, 48, 102, 0.24);
  }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--pp-border-subtle);
  }
  .modal-header h2 { font-size: 1.3rem; font-weight: 800; color: var(--pp-navy); margin: 0; }
  .btn-close {
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 10px;
    background: #EEF5FD;
    color: #516278;
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .btn-close:hover { background: #DC2626; color: #FFFFFF; }
  .modal-body { padding: 22px 24px; }
  .form-group { margin-bottom: 18px; }
  .form-group label { display: block; font-weight: 700; color: var(--pp-navy); font-size: 0.85rem; margin-bottom: 7px; }
  .form-group input, .form-group select, .form-group textarea {
    width: 100%;
    padding: 10px 13px;
    border: 1.5px solid var(--pp-border);
    border-radius: 12px;
    background: #FAFDFE;
    font-size: 0.92rem;
    color: var(--pp-ink);
    transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
    border-color: var(--pp-brand);
    background: #FFFFFF;
    box-shadow: 0 0 0 4px rgba(10, 132, 254, 0.12);
    outline: none;
  }
  .image-upload-area {
    border: 2px dashed #B4D9FF;
    border-radius: 14px;
    padding: 24px;
    text-align: center;
    cursor: pointer;
    background: var(--pp-tint);
    transition: border-color 0.15s ease, background-color 0.15s ease;
  }
  .image-upload-area:hover, .image-upload-area.has-image { border-color: var(--pp-brand); background: var(--pp-soft); }
  .image-upload-area.has-image { padding: 0; border-style: solid; overflow: hidden; }
  .preview-image { width: 100%; max-height: 200px; object-fit: cover; display: block; }
  .upload-placeholder { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--pp-muted); }
  .upload-icon { width: 42px; height: 42px; color: var(--pp-brand); }
  .facilities-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .facility-checkbox {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1.5px solid var(--pp-border-subtle);
    border-radius: 10px;
    padding: 8px 10px;
    cursor: pointer;
    font-size: 0.84rem;
    transition: border-color 0.15s ease, background-color 0.15s ease;
  }
  .facility-checkbox:hover { border-color: #80BEFF; background: var(--pp-tint); }
  .facility-checkbox input { width: auto; accent-color: var(--pp-brand); }
  .modal-actions {
    display: flex;
    gap: 10px;
    padding: 18px 24px;
    border-top: 1px solid var(--pp-border-subtle);
  }
  .btn-cancel, .btn-submit {
    flex: 1;
    padding: 12px 18px;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  }
  .btn-cancel { background: #EEF5FD; color: #516278; }
  .btn-cancel:hover { background: #D8ECFF; color: var(--pp-navy); }
  .btn-submit {
    background: var(--pp-grad);
    color: #FFFFFF;
    box-shadow: 0 6px 16px rgba(10, 132, 254, 0.26);
  }
  .btn-submit:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(10, 132, 254, 0.34); }

  @media (max-width: 768px) {
    .partnership-page { padding: 22px 14px 80px; }
    .page-header { padding: 30px 18px 26px; border-radius: 22px; }
    .filter-header { flex-direction: column; align-items: stretch; }
    .category-filters { justify-content: center; }
    .partners-grid { grid-template-columns: 1fr; }
    .facilities-grid { grid-template-columns: 1fr; }
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
    discountRate: '',
    partnershipDate: new Date().toISOString().split('T')[0],
    placeId: '',
    longitude: 127.0,
    latitude: 37.5
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const categories = ['식당/카페', '이벤트/체험', '술집/모임'];
  const capacityOptions = ['~10', '~30', '~50', '~100'];
  const facilitiesOptions = [
    'TV/프로젝터', '인터넷/WIFI', '복사/인쇄기', '화이트보드', '음향/마이크',
    '취사시설', '음식물반입가능', '주차', 'PC/노트북', '의자/테이블',
    '콘센트', '24시 운영', '연중무휴', '간단한 다과/음료', '내부화장실',
    '마트/편의점', '남/여화장실 구분'
  ];

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.placeName || !formData.addressName || !formData.phoneNumber) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    try {
      const submitData = new FormData();
      
      // 기본 정보
      submitData.append('placeId', formData.placeId || `custom_${Date.now()}`);
      submitData.append('placeName', formData.placeName);
      submitData.append('addressName', formData.addressName);
      submitData.append('roadAddressName', formData.addressName);
      submitData.append('phoneNumber', formData.phoneNumber);
      submitData.append('category', formData.category);
      submitData.append('longitude', formData.longitude);
      submitData.append('latitude', formData.latitude);
      submitData.append('capacity', formData.capacity);
      submitData.append('facilities', JSON.stringify(formData.facilities));
      submitData.append('memo', formData.memo);
      submitData.append('discountRate', formData.discountRate);
      submitData.append('partnershipDate', formData.partnershipDate);
      
      // 이미지 파일
      if (imageFile) {
        submitData.append('image', imageFile);
      }

      const response = await fetch('/savedPlaces', {
        method: 'POST',
        credentials: 'include',
        body: submitData
      });

      if (response.ok) {
        const result = await response.json();
        alert('제휴가 추가되었습니다.');
        onAdd(result.place);
        onClose();
        // 폼 초기화
        setFormData({
          placeName: '',
          category: '식당/카페',
          addressName: '',
          phoneNumber: '',
          capacity: '~10',
          memo: '',
          facilities: [],
          discountRate: '',
          partnershipDate: new Date().toISOString().split('T')[0],
          placeId: '',
          longitude: 127.0,
          latitude: 37.5
        });
        setImageFile(null);
        setImagePreview('');
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
            {/* 이미지 업로드 */}
            <div className="form-group">
              <label>제휴 이미지</label>
              <div 
                className={`image-upload-area ${imagePreview ? 'has-image' : ''}`}
                onClick={() => document.getElementById('image-input').click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="preview-image" />
                ) : (
                  <div className="upload-placeholder">
                    <Upload className="upload-icon" />
                    <div>
                      <p style={{margin: 0, fontWeight: 600}}>클릭하여 이미지 업로드</p>
                      <p style={{margin: '4px 0 0', fontSize: '0.85rem', color: '#999'}}>
                        JPG, PNG, GIF (최대 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <input
                id="image-input"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{display: 'none'}}
              />
            </div>

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

            {/* 할인율 입력 */}
            <div className="form-group">
              <label>
                <Percent size={16} style={{display: 'inline', marginRight: '4px'}} />
                할인율 (선택)
              </label>
              <input
                type="text"
                value={formData.discountRate}
                onChange={(e) => setFormData({...formData, discountRate: e.target.value})}
                placeholder="예: 10%, 20% 등"
              />
            </div>

            {/* 제휴일 입력 */}
            <div className="form-group">
              <label>
                <Calendar size={16} style={{display: 'inline', marginRight: '4px'}} />
                제휴 시작일
              </label>
              <input
                type="date"
                value={formData.partnershipDate}
                onChange={(e) => setFormData({...formData, partnershipDate: e.target.value})}
              />
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
const PartnershipCard = ({ partner, onDelete, hasPermission }) => {
  const handlePhoneClick = (phone) => {
    if (phone) {
      alert(`📞 연락처: ${phone}`);
    }
  };

  const handleDelete = async () => {
    if (!hasPermission) {
      alert('삭제 권한이 없습니다.');
      return;
    }

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

  const mapUrl = `https://map.naver.com/p/search/${encodeURIComponent(partner.placeName + ' ' + partner.addressName)}`;
  const partnershipDate = partner.partnershipDate 
    ? new Date(partner.partnershipDate).toLocaleDateString('ko-KR', {year: 'numeric', month: 'long', day: 'numeric'})
    : partner.createdAt 
      ? new Date(partner.createdAt).toLocaleDateString('ko-KR', {year: 'numeric', month: 'long', day: 'numeric'})
      : '-';
  const capacity = partner.capacity?.replace('~', '') || '10';
  const benefits = partner.memo ? partner.memo.split('\n').filter(b => b.trim()) : [];

  return (
    <div className="partnership-card">
      {/* 할인율 깃발 (있는 경우에만 표시) */}
      {partner.discountRate && (
        <div className="discount-ribbon">
          <div className="discount-text">{partner.discountRate}</div>
        </div>
      )}
      
      <div className="card-image">
        <img 
          src={partner.imageUrl || '/images/placeholder.png'}
          alt={partner.placeName}
          onError={(e) => e.target.src = '/images/placeholder.png'}
        />
      </div>
      
      <div className="card-content">
        <div className="card-header">
          <h3 className="partner-name">{partner.placeName}</h3>
          {hasPermission && (
            <button className="btn-delete" onClick={handleDelete} title="삭제">
              <X size={16} />
            </button>
          )}
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
            <Users className="icon" />
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
            <h4>제휴 혜택</h4>
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
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkPermission();
    fetchPartners();
  }, []);

  const checkPermission = async () => {
    try {
      const response = await fetch('/savedPlaces/check-permission', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasPermission(data.hasPermission);
      }
    } catch (error) {
      console.error('Error checking permission:', error);
    }
  };

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
          {!hasPermission && (
            <div className="no-permission-message">
              제휴 추가 및 삭제는 대외협력팀 또는 관리자만 가능합니다.
            </div>
          )}
          
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
            
            <button 
              className="btn-add-partner" 
              onClick={() => setIsModalOpen(true)}
              disabled={!hasPermission}
              title={hasPermission ? '제휴 추가하기' : '권한이 없습니다'}
            >
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
            <Search className="search-icon" size={18} color="#0A84FE" />
          </div>
        </div>

        <div className="partners-grid">
          {filteredPartners.length > 0 ? (
            filteredPartners.map(partner => (
              <PartnershipCard 
                key={partner._id} 
                partner={partner}
                onDelete={handleDeletePartner}
                hasPermission={hasPermission}
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