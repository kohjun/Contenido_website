import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Heart, ArrowLeft, Upload, Camera } from 'lucide-react';
import { useEvent } from '../hooks/useEvent';
import { useEventReviews } from '../hooks/useEventReview';

const EventDetail = () => {
  const { id } = useParams();
  const { event, loading, error } = useEvent(id);
  const { reviews, newReview, setNewReview, submitReview } = useEventReviews(id);
  const [activeTab, setActiveTab] = useState('info');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-4 text-red-500 text-center">
        {error || '이벤트를 찾을 수 없습니다.'}
      </div>
    );
  }

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  const getDuration = () => {
    const start = new Date(`2000/01/01 ${event.startTime}`);
    const end = new Date(`2000/01/01 ${event.endTime}`);
    return Math.round((end - start) / (1000 * 60));
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    await submitReview();
    setReviewSubmitted(true);
    setTimeout(() => setReviewSubmitted(false), 3000);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="space-y-4">
            {event.contents.split('\n').map((line, index) => (
              <p key={index} className="text-gray-800">{line}</p>
            ))}
          </div>
        );
      case 'review':
        return (
          <div className="space-y-6">
            <form onSubmit={handleReviewSubmit} className="space-y-4 border-b pb-6">
              <div className="flex items-center gap-2">
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
                className="w-full border rounded-lg p-2 h-24"
                placeholder="리뷰를 작성해주세요"
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
              />
              <button 
                type="submit"
                className="bg-[#0A84FE]-500 text-white px-4 py-2 rounded-lg"
              >
                리뷰 작성
              </button>
              {reviewSubmitted && (
                <div className="text-green-500 mt-2">리뷰가 등록되었습니다!</div>
              )}
            </form>
            <div className="space-y-4">
              {reviews.map(review => (
                <div key={review._id} className="border-b pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-gray-500 text-sm">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-800">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case 'community':
        return (
          <div className="space-y-4">
            <p className="text-gray-600 text-center py-8">
              커뮤니티 기능은 준비중입니다.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-[85%] md:max-w-2xl mx-auto bg-white min-h-screen px-2 md:px-4 py-4 md:py-6 rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center p-4 border-b sticky top-0 bg-white z-10 rounded-t-xl">
        <button className="mr-4" onClick={() => window.history.back()}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold flex-1 text-center mr-6">{event.title}</h1>
      </div>

      {/* Main image */}
      <div className="p-4">
        <div className="rounded-lg overflow-hidden">
          {event.images && event.images.length > 0 ? (
            <img 
              src={event.images[0]} 
              alt={event.title}
              className="w-full h-48 md:h-64 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-48 md:h-64 bg-gray-100 rounded-lg flex flex-col items-center justify-center">
              <Camera className="w-12 h-12 text-gray-400 mb-2" />
              <span className="text-gray-500">이미지 없음</span>
            </div>
          )}
        </div>
      </div>

      {/* Event info */}
      <div className="px-4">
        <h2 className="text-2xl font-bold mb-2">{event.title}</h2>
        <p className="text-gray-600 mb-4">{event.place}</p>
        
        {/* Stats */}
        <div className="flex items-center gap-6 mb-6">
          <div className="flex items-center">
            <Star className="w-5 h-5 text-yellow-400 fill-current" />
            <span className="ml-1">4.5({reviews.length})</span>
          </div>
          <div className="flex items-center cursor-pointer" onClick={handleLike}>
            <Heart className={`w-5 h-5 ${liked ? 'text-pink-500 fill-current' : 'text-pink-500'}`} />
            <span className="ml-1">{likeCount}</span>
          </div>
          <div className="text-gray-600">
            활동시간 {getDuration()}분
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-4 sticky top-16 bg-white z-10">
          {['info', 'review', 'community'].map((tab) => (
            <button
              key={tab}
              className={`flex-1 px-4 py-3 text-center ${
                activeTab === tab
                  ? 'border-b-2 border-[#0A84FE] text-[#0A84FE] font-bold'
                  : 'text-gray-500'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'info' ? '정보' : tab === 'review' ? '리뷰' : '커뮤니티'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[350px] max-h-[550px] overflow-y-auto px-1 md:px-2 pb-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default EventDetail;