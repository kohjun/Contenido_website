import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import { Star } from 'lucide-react';

const RankingPage = () => {
  const [eventRankings, setEventRankings] = useState([]);
  const [participantRankings, setParticipantRankings] = useState([]);
  const [activeTab, setActiveTab] = useState('events');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  // 현재 기간을 계산하는 함수
  const getCurrentPeriod = () => {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const period = Math.floor(month / 2) * 2; // 현재 월을 2개월 단위로 나눔
    const startMonth = period + 1; // 1부터 시작하는 월로 변환
    const endMonth = period + 2;
    return `${startMonth}~${endMonth}월`;
  };

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const eventsResponse = await fetch('/events/ended');
        const events = await eventsResponse.json();
        const processedEvents = events.map(event => ({
          id: event._id,
          teamName: event.team,
          eventName: event.title,
          participants: event.finalParticipants?.length || 0,
          maxParticipants: event.participants,
          rating: event.rating || 0,
          description: event.contents,
          date: new Date(event.date).toLocaleDateString(),
          participationFee: event.participation_fee,
          mainImage: event.images?.[0]
        }));

        const sortedEvents = _.orderBy(
          processedEvents,
          ['rating',(event) =>event.participants / event.maxParticipants],
          ['desc', 'desc']
        );

        setEventRankings(sortedEvents);

        const usersResponse = await fetch('/user/participants/users');
        const users = await usersResponse.json();

        const processedUsers = users
          .filter(user => user.active)
          .map(user => ({
            id: user.id,
            name: user.name,
            participationCount: (user.participationCount?.regularCount || 0)
          }));

        const sortedUsers = _.orderBy(processedUsers, ['participationCount'], ['desc']);
        setParticipantRankings(sortedUsers);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching rankings:', err);
        setError('로그인 후 다시 시도하세요.');
        setLoading(false);
      }
    };

    fetchRankings();
  }, []);

  const handleEventClick = (eventId) => {
    window.location.href = `/ranking/${eventId}`;
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            className={`w-4 h-4 ${
              index < Math.floor(rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating.toFixed(1)})</span>
      </div>
    );
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
      <div className="p-4 text-red-500 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-6">동아리 활동 랭킹</h1>
      <div className="flex flex-col items-center gap-2 mb-6">
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'events' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            이벤트 랭킹
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            className={`px-4 py-2 rounded-lg ${
              activeTab === 'participants' ? 'bg-blue-500 text-white' : 'bg-gray-200'
            }`}
          >
            참여 랭킹
          </button>
        </div>
        {activeTab === 'participants' && (
          <div className="text-lg font-semibold text-gray-600">
            {getCurrentPeriod()} 랭킹
          </div>
        )}
        <div className="text-sm text-gray-500 mt-2">
          {activeTab === 'events' 
            ? '* 종료된 이벤트 중 상위 20개의 이벤트만 표시됩니다.'
            : '* 상위 활동부원 20위까지 표시됩니다.'
          }
        </div>
      </div>

      {activeTab === 'events' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventRankings.slice(0, 20).map((event, index) => (
            <div
              key={event.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
              onClick={() => handleEventClick(event.id)}
            >
              <div className="relative aspect-video w-full overflow-hidden">
                <img
                  src={event.mainImage || "/api/placeholder/400/225"}
                  alt={event.eventName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  #{index + 1}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">{event.teamName}</span>
                  <span className="text-sm text-gray-500">{event.date}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{event.eventName}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{event.description}</p>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm">
                    참가율: {Math.round(event.participants / event.maxParticipants * 100)}%
                    <span className="text-gray-500 ml-1">
                      ({event.participants}/{event.maxParticipants})
                    </span>
                  </div>
                  <div className="text-sm font-semibold">
                    {event.participationFee.toLocaleString()}원
                  </div>
                </div>
                {renderStars(event.rating)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {participantRankings.slice(0, 20).map((participant, index) => (
            <div
              key={participant.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              <div className="p-4 text-center">
                <div className="text-3xl font-bold text-gray-800">#{index + 1}</div>
                <div className="text-xl font-bold text-gray-800">{participant.name}</div>
                <div className="text-3xl font-bold text-blue-500">
                  {participant.participationCount}
                </div>
                <div className="text-sm text-gray-500">활동 횟수</div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-6 flex justify-center">
        <button 
          onClick={() => window.location.href = '/events.html'}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          진행중인 이벤트
        </button>
      </div>
    </div>
  );
};

export default RankingPage;