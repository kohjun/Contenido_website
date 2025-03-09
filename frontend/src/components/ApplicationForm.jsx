import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';

const ApplicationForm = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    school: '',
    address: '',
    wantOfficer: false,
    motivation: '',
    planningContent: ''
  });

  useEffect(() => {
    fetchUserInfo();
  }, []);

  // 사용자 정보 가져오기
  const fetchUserInfo = async () => {
    try {
      const response = await fetch('/user/info');
      if (!response.ok) {
        throw new Error('사용자 정보를 가져오는데 실패했습니다');
      }
      const userData = await response.json();
      
      // guest가 아닌 경우 메인 페이지로 리다이렉션
      if (userData.role !== 'guest') {
        alert('게스트만 지원이 가능합니다.');
        window.location.href = '/';
        return;
      }

      setUser(userData);

      // 이미 지원한 경우 지원 상태 가져오기
      if (userData.application) {
        await fetchApplicationStatus();
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 지원 상태 확인
  const fetchApplicationStatus = async () => {
    try {
      const response = await fetch('/application/status');
      if (!response.ok) {
        throw new Error('지원 상태를 가져오는데 실패했습니다');
      }
      const data = await response.json();
      setUser(prev => ({
        ...prev,
        application: data
      }));
    } catch (error) {
      console.error('Error fetching application status:', error);
    }
  };

  // 입력 필드 변경 처리
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 지원서 제출
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/application/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '지원서 제출에 실패했습니다');
      }

      alert('지원서가 성공적으로 제출되었습니다!');
      await fetchUserInfo();
      window.location.href='/index.html';
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 카카오톡 채팅방 입장
  const joinKakaoChat = async () => {
    try {
      const response = await fetch('/application/kakao-url');
      if (!response.ok) {
        throw new Error('채팅방 링크를 가져오는데 실패했습니다');
      }
      
      const { url } = await response.json();
      if (url) {
        window.open(url, '_blank');
      } else {
        alert('채팅방 링크를 찾을 수 없습니다.');
      }
    } catch (error) {
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.href = '/auth/kakao'}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg"
          >
            카카오로 로그인하기
          </button>
        </div>
      </div>
    );
  }

  // 지원서를 이미 제출한 경우
  if (user?.application) {
    const { status } = user.application;
    
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-8">지원 상태</h1>
            
            <div className="mb-6">
              {status === 'pending' && (
                <Clock className="w-16 h-16 text-yellow-500 mx-auto" />
              )}
              {status === 'accepted' && (
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              )}
              {status === 'rejected' && (
                <XCircle className="w-16 h-16 text-red-500 mx-auto" />
              )}
            </div>
            
            <div className="mb-6">
              {status === 'pending' && (
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-yellow-800">
                    지원서가 검토 중입니다.<br />
                    결과가 나오면 알려드리겠습니다.
                  </p>
                </div>
              )}
              
              {status === 'accepted' && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-green-800 mb-4">
                    축하합니다! 합격하셨습니다.<br />
                    아래 버튼을 클릭하여 채팅방에 입장해주세요.
                  </p>
                  <button
                    onClick={joinKakaoChat}
                    className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg flex items-center justify-center mx-auto"
                  >
                    카카오톡 채팅방 입장
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              )}
              
              {status === 'rejected' && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-red-800">
                    아쉽게도 이번에는 함께하지 못하게 되었습니다.<br />
                    다음 기회에 다시 지원해주세요.
                  </p>
                </div>
              )}
            </div>
            
            <div className="text-sm text-gray-500 mt-6">
              <p>지원일: {new Date(user.application.appliedAt).toLocaleDateString()}</p>
              {user.application.processedAt && (
                <p>결과 처리일: {new Date(user.application.processedAt).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 지원서 작성 폼에서도 role 체크 추가
  if (!user || user.role !== 'guest') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-lg mb-4">게스트 회원만 지원이 가능합니다.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            메인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 지원서 작성 폼
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">동아리 지원서</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름
            </label>
            <input
              type="text"
              value={user?.name || ''}
              disabled
              className="w-full px-3 py-2 bg-gray-100 border rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              * 이름은 계정에 등록된 정보로 자동 입력됩니다
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              학교
            </label>
            <input
              type="text"
              name="school"
              value={formData.school}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="학교명을 입력하세요"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              거주지
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="주소를 입력하세요 (예: 서울시 강남구)"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="wantOfficer"
              name="wantOfficer"
              checked={formData.wantOfficer}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="wantOfficer" className="ml-2 block text-sm text-gray-900">
              운영진으로 활동하고 싶습니다
            </label>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              지원 동기
            </label>
            <textarea
              name="motivation"
              value={formData.motivation}
              onChange={handleInputChange}
              required
              rows={5}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="동아리에 지원하게 된 동기를 적어주세요"
            />
          </div>
          
          {formData.wantOfficer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                기획 내용
              </label>
              <textarea
                name="planningContent"
                value={formData.planningContent}
                onChange={handleInputChange}
                required={formData.wantOfficer}
                rows={5}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="운영진으로서 기획하고 싶은 활동이나 아이디어를 적어주세요"
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 ${
              loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? '제출 중...' : '지원서 제출하기'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ApplicationForm;