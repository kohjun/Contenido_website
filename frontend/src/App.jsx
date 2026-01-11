import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RankingPage from './RankingPage';
import EventDetail from './components/EventDetail';
import ApplicationForm from './components/ApplicationForm';
import TeamBingoSystem from './components/TeamBingoSystem';
import PartnershipPage from './PartnershipPage'; // 추가

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/ranking/:id" element={<EventDetail />} />
        <Route path="/apply" element={<ApplicationForm />} />
        <Route path="/TeamBingo" element={<TeamBingoSystem />} />
        <Route path="/partnerships" element={<PartnershipPage />} /> 
      </Routes>
    </BrowserRouter>
  );
};

export default App;