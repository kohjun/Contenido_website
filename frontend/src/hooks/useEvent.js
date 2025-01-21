// hooks/useEvent.js
import { useState, useEffect } from 'react';

export const useEvent = (eventId) => {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const [eventResponse, userResponse] = await Promise.all([
          fetch(`/events/${eventId}`),
          fetch('/user/info')
        ]);

        if (!eventResponse.ok) {
          throw new Error('이벤트를 찾을 수 없습니다.');
        }

        const eventData = await eventResponse.json();
        const userData = await userResponse.json();

        setEvent(eventData);
        setUserRole(userData.role);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const updateEvent = async (updatedData, image) => {
    try {
      // 이미지 업로드 처리
      if (image) {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('eventId', eventId);

        const imageResponse = await fetch('/events/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!imageResponse.ok) {
          throw new Error('이미지 업로드 실패');
        }

        const imageResult = await imageResponse.json();
        updatedData.image = imageResult.imageUrl;
      }

      // 이벤트 정보 업데이트
      const response = await fetch(`/events/update-content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, ...updatedData })
      });

      if (!response.ok) {
        throw new Error('이벤트 업데이트 실패');
      }

      const updatedEvent = await response.json();
      setEvent(updatedEvent);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const canEdit = () => {
    if (!event || !userRole) return false;
    return userRole === 'officer' && event.creator === event.userId;
  };

  return {
    event,
    loading,
    error,
    userRole,
    updateEvent,
    canEdit,
    setError
  };
};