import React, { useState, useEffect } from 'react';
import { Star, Heart, ArrowLeft, Camera } from 'lucide-react';

const EventDetail = ({ eventId }) => {
  // URL에서 이벤트 ID를 가져오는 대신 props로 받습니다
  const [event, setEvent] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(101);
  const [selectedImage, setSelectedImage] = useState(null);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', isAnonymous: false });

  // 이벤트 데이터 로드
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        const [eventResponse, reviewsResponse, userResponse] = await Promise.all([
          fetch(`/events/${eventId}`),
          fetch(`/reviews?eventId=${eventId}`),
          fetch('/user/info')
        ]);

        if (!eventResponse.ok) throw new Error('Event not found');

        const eventData = await eventResponse.ok ? await eventResponse.json() : null;
        const reviewsData = await reviewsResponse.ok ? await reviewsResponse.json() : [];
        const userData = await userResponse.ok ? await userResponse.json() : null;

        setEvent(eventData);
        setReviews(reviewsData);
        setUserRole(userData?.role);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('eventId', eventId);

      const response = await fetch('/events/upload-image', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setSelectedImage(result.imageUrl);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          rating: newReview.rating,
          comment: newReview.comment,
          isAnonymous: newReview.isAnonymous
        })
      });

      if (response.ok) {
        const reviewsResponse = await fetch(`/reviews?eventId=${eventId}`);
        const updatedReviews = await reviewsResponse.json();
        setReviews(updatedReviews);
        setNewReview({ rating: 5, comment: '', isAnonymous: false });
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  if (!event) {
    return <div className="text-center p-4">Event not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto bg-white">
        {/* Header */}
        <div className="flex items-center p-4 border-b">
          <button onClick={() => window.history.back()} className="mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold flex-1 text-center">{event.title}</h1>
        </div>

        {/* Image Section */}
        <div className="p-4 bg-gray-50 border-y">
          <div className="bg-gray-100 rounded-lg h-64">
            {(selectedImage || event.image) ? (
              <img 
                src={selectedImage || event.image}
                alt="Event"
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <Camera className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Event Info */}
        <div className="p-4">
          <div className="mb-6">
            <h2 className="text-xl font-bold">{event.title}</h2>
            <p className="text-gray-600">{event.place}</p>
            <div className="mt-2 flex gap-4 text-sm text-gray-500">
              <span>참가인원: {event.finalParticipants?.length || 0}/{event.participants}</span>
              <span>시간: {event.startTime}-{event.endTime}</span>
              <span>참가비: {event.participation_fee}원</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b">
            <div className="flex">
              <button
                className={`px-4 py-2 ${activeTab === 'info' ? 'border-b-2 border-blue-500' : ''}`}
                onClick={() => setActiveTab('info')}
              >
                정보
              </button>
              <button
                className={`px-4 py-2 ${activeTab === 'review' ? 'border-b-2 border-blue-500' : ''}`}
                onClick={() => setActiveTab('review')}
              >
                리뷰
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="mt-4">
            {activeTab === 'info' ? (
              <div className="prose max-w-none">
                {event.contents}
              </div>
            ) : (
              <div>
                {/* Review Form */}
                <form onSubmit={handleSubmitReview} className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-6 h-6 cursor-pointer ${
                          star <= newReview.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                        onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                      />
                    ))}
                  </div>
                  <textarea
                    className="w-full border rounded p-2 mb-2"
                    value={newReview.comment}
                    onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                    placeholder="리뷰를 작성해주세요"
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="anonymous"
                      checked={newReview.isAnonymous}
                      onChange={(e) => setNewReview(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                    />
                    <label htmlFor="anonymous">익명으로 작성</label>
                  </div>
                  <button
                    type="submit"
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                  >
                    리뷰 작성
                  </button>
                </form>

                {/* Reviews List */}
                <div className="space-y-4">
                  {reviews.map((review, index) => (
                    <div key={index} className="border-b pb-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold">
                          {review.isAnonymous ? '익명' : review.userId?.displayName}
                        </span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="mt-2">{review.comment}</p>
                      <span className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;