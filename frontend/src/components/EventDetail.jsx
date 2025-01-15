import React, { useState } from 'react';
import { useParams } from 'react-router-dom'; // URL 파라미터를 가져오기 위해 추가
import { Star, Heart, ArrowLeft, Camera } from 'lucide-react';

const EventDetail = () => {
  const { eventId } = useParams(); // URL에서 eventId를 가져옴
  console.log('Event ID:', eventId); // 콘솔에서 eventId 확인

  const [activeTab, setActiveTab] = useState('info');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(101);
  const [selectedImage, setSelectedImage] = useState(null);
  const [reviews, setReviews] = useState([
    { id: 1, rating: 5, comment: "정말 재미있었어요! 스토리가 흥미진진했습니다.", date: "2024-01-15" },
  ]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (newReview.comment.trim()) {
      setReviews([
        {
          id: reviews.length + 1,
          rating: newReview.rating,
          comment: newReview.comment,
          date: new Date().toISOString().split('T')[0]
        },
        ...reviews
      ]);
      setNewReview({ rating: 5, comment: '' });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="space-y-4 px-4">
            <p className="text-gray-800">
              나는 마을의 열쇠공이다. 얼집 귀금속점 주인이 일전에 의뢰한 물건이 맘에 쏙 들었는지 귀한 답례품을 주고 갔다.
            </p>
            <p className="text-gray-800">
              구두쇠로 소문난 녀석이 웬일이지? 제법 만들기 어려웠던 것이지만, 작업하는 재미가 있어서 꽤 괜찮은 결과물이 나온 덕인 것 같다. 보는 눈은 없어 가지고...
            </p>
            <p className="text-gray-800">
              흠 근데 이거 뭘 준 거지? 구두쇠 녀석이 비싼 걸 줬을 리 없으니 의심부터 해봐야겠어! 자, 어디 한번 보러 가볼까?
            </p>
          </div>
        );
      case 'review':
        return (
          <div className="space-y-6 px-4">
            <form onSubmit={handleSubmitReview} className="space-y-4 border-b pb-6">
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
                className="bg-orange-500 text-white px-4 py-2 rounded-lg"
              >
                리뷰 작성
              </button>
            </form>
            <div className="space-y-4">
              {reviews.map(review => (
                <div key={review.id} className="border-b pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="text-gray-500 text-sm">{review.date}</span>
                  </div>
                  <p className="text-gray-800">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-2xl mx-auto bg-white">
        {/* Header */}
        <div className="flex items-center p-4">
          <button className="mr-4">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold flex-1 text-center">(간판제목)</h1>
        </div>

        {/* Image Upload Section */}
        <div className="p-4 bg-gray-50 border-y">
          <div className="bg-gray-100 rounded-lg">
            {selectedImage ? (
              <img 
                src={selectedImage} 
                alt="Uploaded room" 
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="h-64 w-full flex flex-col items-center justify-center cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Camera className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-gray-500">사진 업로드하기</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4">
          <h2 className="text-xl font-bold mb-2">(제목)</h2>
          <p className="text-gray-600 mb-4">(장소)</p>
          
          {/* Stats */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center">
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
              <span className="ml-1">4.5(80)</span>
            </div>
            <div className="flex items-center cursor-pointer" onClick={handleLike}>
              <Heart className={`w-5 h-5 ${liked ? 'text-pink-500 fill-current' : 'text-pink-500'}`} />
              <span className="ml-1">{likeCount}</span>
            </div>
            <div className="text-gray-600">
              진행시간 70분
            </div>
            <div className="text-gray-600">
              참가인원 10명
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 border-b">
            {['info', 'review'].map((tab) => (
              <button
                key={tab}
                className={`px-6 py-3 ${
                  activeTab === tab
                    ? 'border-b-2 border-black font-bold'
                    : 'text-gray-500'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'info' ? '정보' : '리뷰'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="content">
            {renderContent()}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8 px-4">
            <button className="flex-1 bg-orange-500 text-white py-4 rounded-lg font-bold hover:bg-orange-600 transition-colors">
              신청하기
            </button>
            <button className="flex-1 border border-orange-500 text-orange-500 py-4 rounded-lg font-bold hover:bg-orange-50 transition-colors">
              공유하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
