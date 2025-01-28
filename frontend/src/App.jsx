import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RankingPage from './RankingPage';
import EventDetail from './components/EventDetail';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/ranking/:id" element={<EventDetail />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;