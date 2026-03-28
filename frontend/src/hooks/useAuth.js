// frontend/src/hooks/useAuth.js
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * 기획부(planning) 전용 권한 체크 훅
 * 
 * @param {Array<string>} requiredRoles - 필요한 역할 (기본값: ['officer', 'admin'])
 * @param {boolean} requirePlanning - planning 부서 필수 여부 (기본값: true)
 * @returns {Object} { isAuthorized, isLoading, user }
 */
export function useAuth(requiredRoles = ['officer', 'admin'], requirePlanning = true) {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/user/info', {
        credentials: 'include'
      });

      if (!response.ok) {
        // 로그인 안 됨
        alert('로그인이 필요합니다.');
        navigate('/login');
        return;
      }

      const userData = await response.json();

      // 관리자는 무조건 접근 가능
      if (userData.role === 'admin') {
        setUser(userData);
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // 역할 체크
      if (!requiredRoles.includes(userData.role)) {
        alert('접근 권한이 없습니다.');
        navigate('/');
        return;
      }

      // planning 부서 체크 (requirePlanning이 true일 때만)
      if (requirePlanning && userData.department !== 'planning') {
        alert('접근 권한이 없습니다.\n아카이브는 기획부(planning)만 접근 가능합니다.');
        navigate('/');
        return;
      }

      // 권한 확인 완료
      setUser(userData);
      setIsAuthorized(true);
    } catch (error) {
      console.error('권한 확인 오류:', error);
      alert('접근 권한을 확인할 수 없습니다.');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  return { isAuthorized, isLoading, user };
}