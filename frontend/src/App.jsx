import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EventDetail from './components/EventDetail'; // EventDetail 컴포넌트 임포트
import HomePage from './HomePage'; // 홈 페이지 컴포넌트 임포트

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Home 페이지로 이동하는 경로 설정 */}
        <Route path="/ranking" element={<HomePage />} />

        {/* 이벤트 상세 페이지로 이동하는 동적 경로 설정 */}
        <Route path="/event/:eventId" element={<EventDetail />} />
      </Routes>
    </Router>
  );
};

export default App;