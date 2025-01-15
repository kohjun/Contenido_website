// HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom'; // Link 컴포넌트 추가

const HomePage = () => {
  return (
    <div>
      <h1>이벤트 랭킹</h1>
      {/* 각 이벤트 상세 페이지로 이동하는 링크 */}
      <Link to="/event/1">이벤트 1 상세 보기</Link>
      <br />
      <Link to="/event/2">이벤트 2 상세 보기</Link>
    </div>
  );
};

export default HomePage;