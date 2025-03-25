import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Star } from 'lucide-react';
import _ from 'lodash';

const RankingPage = () => {
  const [eventRankings, setEventRankings] = useState([]);
  const [participantRankings, setParticipantRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardsToShow = 3;

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const eventsResponse = await fetch('/events/ended');
        const events = await eventsResponse.json();
        
        if (!Array.isArray(events)) {
          console.error('Events data is not an array:', events);
          throw new Error('Invalid events data format');
        }

        const processedEvents = events.map((event, index) => ({
          id: index + 1,
          eventId: event._id,
          title: event.title,
          date: new Date(event.date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\. /g, '.'),
          participationRate: (event.finalParticipants?.length || 0) / event.participants,
          participation: `${Math.round((event.finalParticipants?.length || 0) / event.participants * 100)}%(${event.finalParticipants?.length || 0}/${event.participants})`,
          participantsCount: event.participants,
          rating: event.rating || 0,
          ratingCount: event.ratingCount || 0,
          ratingScore: (event.rating || 0) * (event.ratingCount || 0), // 평점 점수 추가
          description: event.contents,
          price: `${event.participation_fee.toLocaleString()}원`,
          image: event.images?.[0] || '/api/placeholder/400/200'
        }));

        const sortedEvents = _.orderBy(
          processedEvents, 
          ['ratingScore', 'participationRate'], 
          ['desc', 'desc']
        );
        setEventRankings(sortedEvents);

        const usersResponse = await fetch('/user/participants/users');
        const users = await usersResponse.json();
        const processedUsers = users
          .filter(user => user.active)
          .map(user => ({
            name: user.name,
            count: user.participationCount?.regularCount || 0,
            image: user.profileImage || '/api/placeholder/200/280'
          }));

        const sortedUsers = _.orderBy(processedUsers, ['count'], ['desc'])
          .map((user, index) => ({
            ...user,
            id: index + 1 // 순위를 정렬 후 인덱스 기준으로 부여
          }));

        setParticipantRankings(sortedUsers);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching rankings:', err);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    };

    fetchRankings();
  }, []);

  const handlePrevCards = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNextCards = () => {
    if (currentIndex < participantRankings.length - cardsToShow) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-center">{error}</div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 font-['Elice DX Neolli']">
      {/* 참여 랭킹 섹션 */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl " >참여 랭킹</h1>
          <button className="text-gray-500 hover:text-gray-700" onClick={() => window.location.href = 'index.html'}>돌아가기</button>
        </div>
        <p className="text-gray-500 mb-4">상위 활동부원 20위까지 표시됩니다.</p>
        
        <div className="relative">
          <h2 className="text-xl font-medium mb-2">
            {new Date().getFullYear()}년 {new Date().getMonth() + 1}월 - {new Date().getMonth() + 2}월 기준
          </h2>
          
          {/* 카드 캐러셀 */}
          <div className="relative">
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-300"
                style={{ transform: `translateX(-${currentIndex * (100 / cardsToShow)}%)` }}
              >
                {participantRankings.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex-none w-1/3 px-2"
                  >
                    <div className="relative rounded-lg overflow-hidden shadow-md bg-white">
                      <div className="absolute top-0 left-0 z-10">
                        <div className="relative">
                          <svg width="40" height="55" viewBox="0 0 60 80" className="fill-[#0A84FE]">
                            <polygon points="0,0 60,0 60,60 30,80 0,60" />
                          </svg>
                          <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center text-white font-medium text-lg" style={{paddingBottom: "10px"}}>
                            {user.id}
                          </div>
                        </div>
                      </div>
                      <img 
                        src={user.image} 
                        alt={user.name}
                        className="w-full h-64 object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                        <div className="flex justify-between items-end">
                          <h3 className="text-white text-2xl">{user.name}</h3>
                          <div className="text-white text-4xl">{user.count}<span className="text-sm ml-1">회</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 좌우 이동 버튼 */}
            <button 
              onClick={handlePrevCards} 
              className={`absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 bg-white p-2 rounded-full shadow-lg ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <button 
              onClick={handleNextCards} 
              className={`absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 bg-white p-2 rounded-full shadow-lg ${currentIndex >= participantRankings.length - cardsToShow ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={currentIndex >= participantRankings.length - cardsToShow}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      <br></br>
      {/* 이벤트 랭킹 섹션 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-medium">이벤트 랭킹</h1>
        </div>
        <p className="text-gray-500 mb-4">
          종료된 이벤트를 정렬하여 상위 20개만 표시됩니다.
        </p>
        <br></br>
        <div className="space-y-4">
          {eventRankings.slice(0, 20).map((event) => (
            <div 
              key={event.id} 
              className="border border-gray-300 rounded-lg overflow-hidden bg-white cursor-pointer hover:border-[#0A84FE] transition-colors" 
              onClick={() => window.location.href = `/ranking/${event.eventId}`}
            >
              <div className="relative">
                {/* 랭킹 번호 - 리본 스타일 */}
                <div className="absolute top-0 left-0 z-10">
                  <div className="relative">
                    <svg width="35" height="50" viewBox="0 0 60 80" className="fill-[#0A84FE]">
                      <polygon points="0,0 60,0 60,60 30,80 0,60" />
                    </svg>
                    <div className="absolute top-0 left-0 w-full h-3/4 flex justify-center items-center text-white font-medium text-lg">
                      {event.id} {/* 랭킹 표시용 id 사용 */}
                    </div>
                  </div>
                </div>
                
                <img 
                  src={event.image} 
                  alt={event.title}
                  className="w-full h-48 object-cover"
                />
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-2xl font-bold">{event.title}</h3>
                  <p className="text-gray-500">{event.date}</p>
                </div>
                
                <div className="flex justify-between items-center my-2">
                  <p className="text-black-600">참가율 : {event.participation}</p>
                  <div className="flex items-center">
                    <Star className="w-5 h-5 fill-yellow-400 stroke-yellow-400" />
                    <span className="font-medium mx-1">{event.rating}</span>
                    <span className="text-gray-500">({event.ratingCount})</span>
                  </div>
                </div>
                
                <p className="text-gray-700 my-3 line-clamp-3 font-medium">{event.description}</p>
                
                <div className="flex justify-end mt-2">
                  <p className="text-xl font-medium">참가비 <span className="text-3xl ml-2">{event.price}</span></p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RankingPage;