import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Star, ArrowLeft } from 'lucide-react';
import _ from 'lodash';

const RankingPage = () => {
  const [eventRankings, setEventRankings] = useState([]);
  const [participantRankings, setParticipantRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardsToShow = 3;

  const getQuarterInfo = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const quarter = Math.ceil(month / 3);
    const quarterRanges = {
      1: '1-3',
      2: '4-6',
      3: '7-9',
      4: '10-12'
    };
    return `${year}년 ${quarterRanges[quarter]}월`;
  };

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
          date: new Date(event.date)
            .toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
            .replace(/\. /g, '.'),
          participationRate: (event.finalParticipants?.length || 0) / event.participants,
          participation: `${Math.round(((event.finalParticipants?.length || 0) / event.participants) * 100)}% (${event.finalParticipants?.length || 0}/${event.participants})`,
          participantsCount: event.participants,
          rating: event.rating || 0,
          ratingCount: event.ratingCount || 0,
          ratingScore: (event.rating || 0) * (event.ratingCount || 0),
          description: event.contents,
          price: `${(event.participation_fee || 0).toLocaleString()}원`,
          image: event.images?.[0] ? event.images[0] : '/images/Basic_Event_Image.png'
        }));

        const sortedEvents = _.orderBy(
          processedEvents,
          ['ratingScore', 'participationRate'],
          ['desc', 'desc']
        ).map((event, idx) => ({ ...event, id: idx + 1 }));
        setEventRankings(sortedEvents);

        const usersResponse = await fetch('/user/participants/users');
        const users = await usersResponse.json();
        const processedUsers = users
          .filter((user) => user.active)
          .map((user) => ({
            name: user.name,
            count: user.participationCount?.regularCount || 0,
            image: user.profileImage || '/images/basic_Image.png'
          }));

        const sortedUsers = _.orderBy(processedUsers, ['count'], ['desc'])
          .slice(0, 20)
          .map((user, index) => ({
            ...user,
            id: index + 1
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
      <div className="min-h-screen flex flex-col justify-center items-center gap-3 bg-[#F4F8FE]">
        <div className="w-9 h-9 border-4 border-[#D8ECFF] rounded-full border-t-[#0A84FE] animate-spin" />
        <p className="text-sm text-[#516278]">랭킹 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center p-6 bg-[#F4F8FE]">
        <div className="bg-white border border-[#FECACA] text-[#DC2626] rounded-2xl px-6 py-4 text-sm shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full py-6 md:py-10 px-3 md:px-6"
      style={{
        background:
          'radial-gradient(1100px 520px at 50% -10%, #DCEBFF 0%, #EEF5FE 42%, #F6FAFF 100%)'
      }}
    >
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {/* 상단 브랜드 헤더 */}
        <header className="flex items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wider bg-[#D8ECFF] text-[#005EC4] mb-1.5">
              CONTENIDO RANKING
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-[#0B2A5B] tracking-tight">
              참여 · 이벤트 랭킹
            </h1>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-[#D2E3F7] text-sm font-semibold text-[#0B2A5B] hover:border-[#0A84FE] hover:text-[#0A84FE] hover:bg-[#EEF6FF] transition-colors shadow-sm"
            onClick={() => (window.location.href = '/index.html')}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>홈으로</span>
          </button>
        </header>

        {/* 참여 랭킹 섹션 */}
        <section className="bg-white rounded-3xl p-4 md:p-7 border border-[#E5EFFB] shadow-[0_8px_28px_rgba(10,48,102,0.06)]">
          <div className="flex flex-wrap justify-between items-baseline gap-2 mb-1">
            <h2 className="text-xl md:text-2xl font-bold text-[#0B2A5B]">참여 랭킹</h2>
            <span className="text-xs md:text-sm font-semibold px-3 py-1 rounded-full bg-[#EEF6FF] text-[#005EC4] border border-[#D2E3F7]">
              {getQuarterInfo()} 기준
            </span>
          </div>
          <p className="text-[#516278] text-xs md:text-sm mb-5">
            상위 활동부원 20위까지 표시됩니다.
          </p>

          {/* 카드 캐러셀 */}
          <div className="relative px-1">
            <div className="overflow-hidden rounded-2xl">
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${currentIndex * (100 / cardsToShow)}%)` }}
              >
                {participantRankings.map((user) => (
                  <div key={user.id} className="flex-none w-1/3 px-1.5 md:px-2">
                    <div className="relative rounded-2xl overflow-hidden border border-[#E5EFFB] bg-[#EEF6FF] shadow-sm">
                      <div className="absolute top-0 left-2 z-10">
                        <div className="relative">
                          <svg width="36" height="48" viewBox="0 0 60 80" className="fill-[#0A84FE] drop-shadow">
                            <polygon points="0,0 60,0 60,60 30,80 0,60" />
                          </svg>
                          <div
                            className="absolute inset-0 flex justify-center items-center text-white font-bold text-base tabular-nums"
                            style={{ paddingBottom: '10px' }}
                          >
                            {user.id}
                          </div>
                        </div>
                      </div>
                      <img
                        src={user.image}
                        alt={user.name}
                        onError={(e) => {
                          e.currentTarget.src = '/images/basic_Image.png';
                        }}
                        className="w-full h-44 md:h-64 object-cover block"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#071A38]/90 via-[#071A38]/45 to-transparent p-2.5 md:p-4">
                        <div className="flex justify-between items-end gap-1">
                          <h3 className="text-white text-sm md:text-lg font-bold truncate">
                            {user.name}
                          </h3>
                          <div className="text-white text-lg md:text-2xl font-bold whitespace-nowrap tabular-nums">
                            {user.count}
                            <span className="text-xs ml-0.5 font-normal opacity-90">회</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 좌우 이동 버튼 */}
            <button
              type="button"
              aria-label="이전 참여자 보기"
              onClick={handlePrevCards}
              className={`absolute top-1/2 left-0 -translate-y-1/2 -translate-x-2 md:-translate-x-4 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-white border border-[#D2E3F7] text-[#0B2A5B] rounded-full shadow-md transition-all ${
                currentIndex === 0
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-[#0A84FE] hover:text-white hover:border-[#0A84FE]'
              }`}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              aria-label="다음 참여자 보기"
              onClick={handleNextCards}
              className={`absolute top-1/2 right-0 -translate-y-1/2 translate-x-2 md:translate-x-4 w-9 h-9 md:w-10 md:h-10 flex items-center justify-center bg-white border border-[#D2E3F7] text-[#0B2A5B] rounded-full shadow-md transition-all ${
                currentIndex >= participantRankings.length - cardsToShow
                  ? 'opacity-40 cursor-not-allowed'
                  : 'hover:bg-[#0A84FE] hover:text-white hover:border-[#0A84FE]'
              }`}
              disabled={currentIndex >= participantRankings.length - cardsToShow}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* 이벤트 랭킹 섹션 */}
        <section className="bg-white rounded-3xl p-4 md:p-7 border border-[#E5EFFB] shadow-[0_8px_28px_rgba(10,48,102,0.06)]">
          <div className="mb-5">
            <h2 className="text-xl md:text-2xl font-bold text-[#0B2A5B] mb-1">이벤트 랭킹</h2>
            <p className="text-[#516278] text-xs md:text-sm">
              종료된 이벤트를 평점과 참가율 기준으로 정렬하여 상위 20개를 표시합니다.
            </p>
          </div>

          <div className="space-y-4 md:space-y-5">
            {eventRankings.slice(0, 20).map((event) => (
              <article
                key={event.eventId || event.id}
                className="group border border-[#E5EFFB] rounded-2xl overflow-hidden bg-white cursor-pointer hover:border-[#0A84FE] hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(10,132,254,0.14)] transition-all"
                onClick={() => (window.location.href = `/ranking/${event.eventId}`)}
              >
                <div className="relative bg-[#EEF6FF]">
                  {/* 랭킹 번호 리본 */}
                  <div className="absolute top-0 left-3 z-10">
                    <div className="relative">
                      <svg width="36" height="48" viewBox="0 0 60 80" className="fill-[#0A84FE] drop-shadow">
                        <polygon points="0,0 60,0 60,60 30,80 0,60" />
                      </svg>
                      <div className="absolute inset-0 flex justify-center items-center text-white font-bold text-base tabular-nums pb-2">
                        {event.id}
                      </div>
                    </div>
                  </div>

                  <img
                    src={event.image}
                    alt={event.title}
                    onError={(e) => {
                      e.currentTarget.src = '/images/Basic_Event_Image.png';
                    }}
                    className="w-full h-40 md:h-52 object-cover block group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </div>

                <div className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-1 mb-2">
                    <h3 className="text-lg md:text-xl font-bold text-[#0B192C] line-clamp-1 group-hover:text-[#0A84FE] transition-colors">
                      {event.title}
                    </h3>
                    <span className="text-[#64748B] text-xs md:text-sm whitespace-nowrap tabular-nums">
                      {event.date}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-2 mb-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#EEF6FF] text-[#005EC4] text-xs md:text-sm font-semibold tabular-nums">
                      참가율 {event.participation}
                    </span>
                    <div className="flex items-center gap-1 tabular-nums">
                      <Star className="w-4 h-4 fill-amber-400 stroke-amber-400" />
                      <span className="font-bold text-sm md:text-base text-[#0B192C]">
                        {Number(event.rating).toFixed(1)}
                      </span>
                      <span className="text-[#64748B] text-xs md:text-sm">({event.ratingCount})</span>
                    </div>
                  </div>

                  <p className="text-[#516278] text-xs md:text-sm leading-relaxed line-clamp-2 mb-3">
                    {event.description}
                  </p>

                  <div className="flex justify-end items-baseline gap-2 pt-2.5 border-t border-[#EEF5FD]">
                    <span className="text-xs md:text-sm text-[#64748B] font-medium">참가비</span>
                    <span className="text-lg md:text-2xl font-bold text-[#0A84FE] tabular-nums">
                      {event.price}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default RankingPage;
