import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RankingPage from './RankingPage';
import EventDetail from './components/EventDetail';
import ApplicationForm from './components/ApplicationForm';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/ranking/:id" element={<EventDetail />} />
        <Route path="/apply" element={<ApplicationForm />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;