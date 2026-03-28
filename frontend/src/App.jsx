import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RankingPage from './RankingPage';
import EventDetail from './components/EventDetail';
import ApplicationForm from './components/ApplicationForm';
import TeamBingoSystem from './components/TeamBingoSystem';
import PartnershipPage from './components/PartnershipPage'; 
import Archives from './components/Archives';
import ArchiveDetail from './components/ArchiveDetail';
import ArchiveNew from './components/ArchiveNew';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/ranking/:id" element={<EventDetail />} />
        <Route path="/apply" element={<ApplicationForm />} />
        <Route path="/TeamBingo" element={<TeamBingoSystem />} />
        <Route path="/partnerships" element={<PartnershipPage />} /> 
        <Route path="/archives" element={<Archives />} />
        <Route path="/archives/new" element={<ArchiveNew />} />
        <Route path="/archives/:id" element={<ArchiveDetail />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;