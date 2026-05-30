// routes/archives/pdf.js
// PDF 생성(puppeteer) + S3 업로드 헬퍼 — 라우트 없는 헬퍼 모듈
// (이전: routes/archives.js)

const puppeteer = require('puppeteer');
const { uploadToS3 } = require('./_shared');


// ─────────────────────────────────────────────────────────────
// PDF 생성 + S3 업로드 헬퍼
// ─────────────────────────────────────────────────────────────
async function generateAndUploadPdf(archive, eventId) {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(generatePdfHtml(archive), { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });
    await browser.close();

    const ts  = Date.now();
    const key = `archives/${eventId}/pdf/archive_${ts}.pdf`;
    const url = await uploadToS3(pdfBuffer, key, 'application/pdf');
    console.log(`PDF 생성 성공: ${key}`);
    return url;
  } catch (err) {
    console.error('PDF 생성 에러 (계속 진행):', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// PDF HTML 템플릿 — 12섹션 구조 반영
// ─────────────────────────────────────────────────────────────
function generatePdfHtml(archive) {
  const snap = archive.eventSnapshot || {};
  const nl   = (s) => s ? String(s).replace(/\n/g, '<br>') : '';
  const fmt  = (n) => n != null ? Number(n).toLocaleString() : '0';
  const dateStr = snap.date
    ? new Date(snap.date).toLocaleDateString('ko-KR')
    : '';

  // 성별 비율
  const total      = archive.participantInfo?.totalFinal || 0;
  const maleCount  = archive.participantInfo?.male   || 0;
  const femaleCount= archive.participantInfo?.female || 0;
  const maleRatio  = total > 0 ? Math.round(maleCount  / total * 100) : 0;
  const femaleRatio= total > 0 ? Math.round(femaleCount / total * 100) : 0;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }

  body {
    font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
    font-size: 10.5pt;
    line-height: 1.7;
    color: #1E2D40;
    background: #fff;
  }

  /* ── 표지 헤더 ── */
  .cover-header {
    background: linear-gradient(135deg, #0A84FE 0%, #0870D9 100%);
    color: #fff;
    padding: 36px 40px 28px;
    margin-bottom: 32px;
  }
  .cover-label {
    font-size: 9pt;
    letter-spacing: 0.18em;
    opacity: 0.75;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .cover-head-staff {
    display: inline-block;
    background: rgba(255,255,255,0.18);
    border-radius: 6px;
    padding: 4px 14px;
    font-size: 11pt;
    font-weight: 700;
    margin-bottom: 16px;
  }
  .cover-title {
    font-size: 20pt;
    font-weight: 800;
    line-height: 1.25;
    margin-bottom: 10px;
  }
  .cover-meta {
    font-size: 10pt;
    opacity: 0.85;
  }

  /* ── 섹션 ── */
  .section {
    margin: 0 40px 30px;
    page-break-inside: avoid;
  }
  .sec-badge {
    display: inline-block;
    background: #0A84FE;
    color: #fff;
    font-size: 8.5pt;
    font-weight: 700;
    border-radius: 5px;
    padding: 1px 8px;
    margin-bottom: 5px;
    letter-spacing: 0.04em;
  }
  .sec-title {
    font-size: 15pt;
    font-weight: 800;
    color: #0A84FE;
    border-bottom: 2px solid #DBEAFE;
    padding-bottom: 6px;
    margin-bottom: 14px;
  }
  .sub-title {
    font-size: 11pt;
    font-weight: 700;
    color: #0870D9;
    margin: 16px 0 6px;
  }

  /* ── 박스 ── */
  .box {
    background: #F0F7FF;
    border-left: 4px solid #0A84FE;
    border-radius: 0 8px 8px 0;
    padding: 12px 16px;
    margin: 10px 0;
    font-size: 10pt;
  }
  .box-label {
    font-weight: 700;
    color: #0870D9;
    margin-bottom: 4px;
  }
  .box p { color: #374151; }

  .success-box {
    background: #EBF4FF;
    border: 1px solid #BFDBFE;
    border-radius: 8px;
    padding: 14px 18px;
    margin: 10px 0;
    font-size: 10pt;
  }
  .success-box p { margin-bottom: 6px; }
  .success-box p:last-child { margin-bottom: 0; }

  .warn-box {
    background: #FFFBEB;
    border-left: 4px solid #F59E0B;
    border-radius: 0 8px 8px 0;
    padding: 10px 14px;
    margin: 8px 0;
    font-size: 10pt;
    color: #78350F;
  }

  .learn-box {
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    border-radius: 8px;
    padding: 14px 18px;
    margin: 10px 0;
    font-size: 10pt;
    color: #166534;
  }
  .learn-box li { margin-bottom: 5px; }

  /* ── 개요 테이블 (02) ── */
  .overview-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
  .overview-table td { border: 1px solid #E2E6EA; padding: 9px 12px; }
  .overview-table td:first-child { width: 28%; font-weight: 700; color: #0870D9; background: #F0F7FF; }

  /* ── 타임라인 테이블 (07) ── */
  .timeline-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9.5pt; }
  .timeline-table thead tr { background: linear-gradient(135deg,#0A84FE,#0870D9); color: #fff; }
  .timeline-table th { padding: 9px 10px; text-align: left; font-weight: 600; font-size: 9pt; }
  .timeline-table td { border: 1px solid #E2E6EA; padding: 8px 10px; }
  .timeline-table tr:nth-child(even) td { background: #F8FAFF; }

  /* ── 예산 테이블 (08) ── */
  .budget-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
  .budget-table thead tr { background: #1E2D40; color: #fff; }
  .budget-table th { padding: 9px 12px; text-align: left; font-weight: 600; }
  .budget-table td { border: 1px solid #E2E6EA; padding: 8px 12px; }
  .budget-table .amount { text-align: right; font-weight: 700; color: #0870D9; }
  .budget-table .total-row { background: #EBF4FF; }
  .budget-table .total-row td { font-weight: 700; }

  /* ── 스태프 그리드 (09) ── */
  .staff-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 10px 0; }
  .staff-card { background: #F8FAFF; border: 1px solid #DBEAFE; border-radius: 10px; padding: 12px 14px; }
  .staff-name { font-size: 11.5pt; font-weight: 700; color: #1E2D40; margin-bottom: 3px; }
  .staff-role { display: inline-block; background: #DBEAFE; color: #0870D9; font-size: 9pt; font-weight: 600; border-radius: 5px; padding: 1px 7px; margin-bottom: 5px; }
  .staff-desc { font-size: 9.5pt; color: #6B7280; line-height: 1.5; }

  /* ── 성별 바 (10) ── */
  .gender-bar-wrap { height: 8px; border-radius: 4px; overflow: hidden; display: flex; margin: 8px 0 5px; }
  .gender-bar-male   { background: #3B82F6; }
  .gender-bar-female { background: #EC4899; }
  .gender-legend { font-size: 9.5pt; color: #374151; }
  .gender-legend span { margin-right: 16px; }

  /* ── 게임 카드 (06) ── */
  .game-card { border: 1.5px solid #DBEAFE; border-radius: 10px; padding: 14px 18px; margin: 12px 0; }
  .game-title { font-size: 12pt; font-weight: 800; color: #1E2D40; margin-bottom: 8px; }
  .game-overview { font-size: 10pt; color: #374151; margin-bottom: 8px; }
  .game-rules { background: #EBF4FF; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px; }
  .game-rules strong { font-size: 9.5pt; color: #0870D9; }
  .game-rules p { font-size: 9.5pt; color: #0870D9; margin-top: 4px; }
  .game-point { background: #FEFCE8; border-left: 3px solid #FACC15; border-radius: 0 6px 6px 0; padding: 7px 12px; font-size: 9.5pt; color: #713F12; margin-bottom: 5px; }
  .game-score { text-align: right; font-size: 9pt; font-weight: 700; color: #6B7280; }

  /* ── 회고 전략 카드 (11) ── */
  .strategy-card { background: #F8FAFF; border-left: 4px solid #1E2D40; border-radius: 0 10px 10px 0; padding: 12px 16px; margin: 8px 0; }
  .strategy-title { font-size: 10.5pt; font-weight: 800; color: #1E2D40; margin-bottom: 4px; }
  .strategy-card p { font-size: 10pt; color: #374151; }

  /* ── 후기 (11) ── */
  .review-item { background: #F8FAFF; border-left: 3px solid #0A84FE; padding: 9px 13px; margin: 6px 0; border-radius: 0 6px 6px 0; font-size: 10pt; color: #374151; }
  .review-author { font-size: 9pt; font-weight: 700; color: #0A84FE; margin-bottom: 3px; }

  /* ── 미디어 그리드 (12) ── */
  .media-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 12px 0; }
  .media-grid img { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 6px; border: 1px solid #E2E6EA; }

  /* ── 구분선 ── */
  hr { border: none; border-top: 1px solid #E2E6EA; margin: 24px 40px; }

  /* ── 푸터 ── */
  .footer {
    background: linear-gradient(135deg, #1E2D40 0%, #374151 100%);
    color: #fff;
    padding: 24px 40px;
    margin-top: 40px;
    text-align: center;
  }
  .footer-logo {
    font-size: 12pt;
    font-weight: 800;
    letter-spacing: 0.08em;
    margin-bottom: 6px;
    color: #0A84FE;
  }
  .footer-text {
    font-size: 9pt;
    opacity: 0.8;
    line-height: 1.6;
  }
</style>
</head>
<body>

<!-- ★ 표지 헤더 -->
<div class="cover-header">
  <div class="cover-label">CONTENIDO ARCHIVE</div>
  ${archive.headStaff ? `<div class="cover-head-staff">총괄 스태프 · ${archive.headStaff}</div><br>` : ''}
  <div class="cover-title">${snap.title || '제목 없음'}</div>
  <div class="cover-meta">
    ${snap.team || ''} · ${dateStr} · ${snap.place || ''} · ${total}명 참여
    ${archive.reviewSnapshot?.averageRating > 0 ? ` · ⭐ ${archive.reviewSnapshot.averageRating}/5.0` : ''}
  </div>
</div>

<!-- 01 이벤트 요약 -->
${archive.projectSummary ? `
<div class="section">
  <div class="sec-badge">01</div>
  <div class="sec-title">이벤트 요약</div>
  <div class="box">
    <p>${nl(archive.projectSummary)}</p>
  </div>
</div>` : ''}

<!-- 02 이벤트 개요 -->
${(snap.startTime || snap.contents || snap.participation_fee > 0) ? `
<div class="section">
  <div class="sec-badge">02</div>
  <div class="sec-title">이벤트 개요</div>
  <table class="overview-table">
    ${snap.startTime ? `<tr><td>진행 시간</td><td>${snap.startTime} ~ ${snap.endTime || ''}</td></tr>` : ''}
    ${snap.place     ? `<tr><td>장소</td><td>${snap.place}</td></tr>` : ''}
    ${snap.participation_fee > 0 ? `<tr><td>참가비</td><td>${fmt(snap.participation_fee)}원</td></tr>` : ''}
    ${snap.contents  ? `<tr><td>행사 소개</td><td style="white-space:pre-line;line-height:1.8;">${snap.contents}</td></tr>` : ''}
  </table>
</div>` : ''}

<!-- 03 기획 의도 & 배경 -->
${archive.background ? `
<div class="section">
  <div class="sec-badge">03</div>
  <div class="sec-title">기획 의도 &amp; 배경</div>
  <div class="box">
    <p style="white-space:pre-line;">${archive.background}</p>
  </div>
</div>` : ''}

<!-- 04 이벤트 컨셉 & 세계관 -->
${archive.concept?.mainConcept ? `
<div class="section">
  <div class="sec-badge">04</div>
  <div class="sec-title">이벤트 컨셉 &amp; 세계관</div>
  <div class="success-box">
    <p><strong>메인 컨셉</strong>: ${archive.concept.mainConcept}</p>
    ${archive.concept.conceptDetail ? `<p>${nl(archive.concept.conceptDetail)}</p>` : ''}
  </div>
  ${archive.concept.worldView ? `
    <div class="sub-title">세계관</div>
    <div class="box"><p>${nl(archive.concept.worldView)}</p></div>
  ` : ''}
</div>` : ''}

<!-- 05 콘텐츠 구조 -->
${(archive.structure?.format || archive.structure?.overview) ? `
<div class="section">
  <div class="sec-badge">05</div>
  <div class="sec-title">콘텐츠 구조</div>
  ${archive.structure.format ? `<p style="font-size:10.5pt;margin-bottom:8px;"><strong>진행 포맷</strong>: ${archive.structure.format}</p>` : ''}
  ${archive.structure.overview ? `<div class="box"><p>${nl(archive.structure.overview)}</p></div>` : ''}
</div>` : ''}

<!-- 06 게임 상세 설명 -->
${archive.games?.length > 0 ? `
<div class="section">
  <div class="sec-badge">06</div>
  <div class="sec-title">게임 상세 설명</div>
  ${archive.games.map(g => `
    <div class="game-card">
      <div class="game-title"> ${g.name}</div>
      ${g.overview ? `<div class="game-overview">${g.overview}</div>` : ''}
      ${g.rules    ? `<div class="game-rules"><strong>게임 규칙</strong><p>${nl(g.rules)}</p></div>` : ''}
      ${g.points   ? `<div class="game-point"> 포인트: ${g.points}</div>` : ''}
      ${g.scoring  ? `<div class="game-score">점수 방식: ${g.scoring}</div>` : ''}
    </div>
  `).join('')}
</div>` : ''}

<!-- 07 타임라인 -->
${archive.timeline?.length > 0 ? `
<div class="section">
  <div class="sec-badge">07</div>
  <div class="sec-title">타임라인 &amp; 큐시트</div>
  <table class="timeline-table">
    <thead><tr><th>시간</th><th>구분</th><th>프로그램</th><th>세부 내용</th><th>비고</th></tr></thead>
    <tbody>
      ${archive.timeline.map(t => `
        <tr>
          <td>${t.time}</td>
          <td>${t.phase}</td>
          <td><strong>${t.program}</strong></td>
          <td>${nl(t.detail)}</td>
          <td style="color:#7A8391;font-size:9pt;">${t.notes || ''}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</div>` : ''}

<!-- 08 예산 테이블 -->
${archive.budget?.items?.length > 0 ? `
<div class="section">
  <div class="sec-badge">08</div>
  <div class="sec-title">예산 테이블</div>
  <table class="budget-table">
    <thead><tr><th>항목</th><th>세부 내역</th><th style="text-align:right">금액</th><th style="text-align:right">비중</th></tr></thead>
    <tbody>
      ${archive.budget.items.map(b => `
        <tr>
          <td>${b.category}</td>
          <td>${b.detail || ''}</td>
          <td class="amount">${fmt(b.amount)}원</td>
          <td style="text-align:right;color:#7A8391;">${b.ratio ? b.ratio + '%' : ''}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="2"><strong>총 예산</strong></td>
        <td class="amount">${fmt(archive.budget.total)}원</td>
        <td></td>
      </tr>
    </tbody>
  </table>
</div>` : ''}

<!-- 09 스태프 정보 -->
${archive.staff?.length > 0 ? `
<div class="section">
  <div class="sec-badge">09</div>
  <div class="sec-title">스태프 정보</div>
  ${archive.headStaff ? `<div class="success-box" style="margin-bottom:12px;"><p><strong>총괄 스태프</strong>: ${archive.headStaff}</p></div>` : ''}
  <div class="staff-grid">
    ${archive.staff.map(s => `
      <div class="staff-card">
        <div class="staff-name">${s.name}</div>
        <div class="staff-role">${s.role}</div>
        ${s.description ? `<div class="staff-desc">${s.description}</div>` : ''}
      </div>
    `).join('')}
  </div>
</div>` : ''}

<!-- 10 참가자 정보 -->
${total > 0 ? `
<div class="section">
  <div class="sec-badge">10</div>
  <div class="sec-title">참가자 정보</div>
  <div class="success-box">
    <p><strong>신청 인원</strong>: ${archive.participantInfo?.totalApplied || 0}명 &nbsp;|&nbsp; <strong>최종 참여</strong>: ${total}명</p>
    ${archive.participantInfo?.ageRange ? `<p><strong>연령대</strong>: ${archive.participantInfo.ageRange}</p>` : ''}
    ${archive.participantInfo?.location ? `<p><strong>지역</strong>: ${archive.participantInfo.location}</p>` : ''}
  </div>
  ${total > 0 ? `
    <div class="gender-bar-wrap">
      <div class="gender-bar-male"   style="width:${maleRatio}%"></div>
      <div class="gender-bar-female" style="width:${femaleRatio}%"></div>
    </div>
    <div class="gender-legend">
      <span>🔵 남 ${maleCount}명 (${maleRatio}%)</span>
      <span>🩷 여 ${femaleCount}명 (${femaleRatio}%)</span>
    </div>
  ` : ''}
</div>` : ''}

<!-- 11 OUTRO — 성과 & 배운 점 -->
${(archive.reflection?.summary || archive.reflection?.coreStrategies?.length > 0 || archive.reviewSnapshot?.reviews?.length > 0) ? `
<div class="section">
  <div class="sec-badge">11</div>
  <div class="sec-title">OUTRO — 성과 &amp; 배운 점</div>

  ${archive.reviewSnapshot?.averageRating > 0 ? `
    <div class="success-box">
      참가자 평균 평점 <strong style="color:#0A84FE;font-size:13pt;">${archive.reviewSnapshot.averageRating} / 5.0</strong>
      <span style="font-size:9pt;color:#7A8391;margin-left:8px;">(${archive.reviewSnapshot.totalReviews}명 응답)</span>
    </div>
  ` : ''}

  ${archive.reflection?.summary ? `
    <div class="box" style="margin-bottom:14px;"><p>${nl(archive.reflection.summary)}</p></div>
  ` : ''}

  ${archive.reflection?.coreStrategies?.length > 0 ? `
    <div class="sub-title"> 핵심 전략</div>
    ${archive.reflection.coreStrategies.map(s => `
      <div class="strategy-card">
        <div class="strategy-title">${s.title}</div>
        <p>${nl(s.description)}</p>
      </div>
    `).join('')}
  ` : ''}

  ${archive.reflection?.challenges?.length > 0 ? `
    <div class="sub-title"> 도전 과제 &amp; 대응</div>
    ${archive.reflection.challenges.map(c => `
      <div class="warn-box">
        <p><strong>리스크</strong>: ${nl(c.risk)}</p>
        <p><strong>대응</strong>: ${nl(c.solution)}</p>
      </div>
    `).join('')}
  ` : ''}

  ${archive.reflection?.learnings?.length > 0 ? `
    <div class="sub-title"> 배운 점</div>
    <div class="learn-box">
      <ul>
        ${archive.reflection.learnings.map(l => `<li>${l}</li>`).join('')}
      </ul>
    </div>
  ` : ''}

  ${archive.reviewSnapshot?.reviews?.filter(r => r.comment).length > 0 ? `
    <div class="sub-title"> 참가자 후기</div>
    ${archive.reviewSnapshot.reviews.filter(r => r.comment).map(r => `
      <div class="review-item">
        ${!r.isAnonymous && r.userName ? `<div class="review-author">${r.userName}</div>` : ''}
        ${r.comment}
      </div>
    `).join('')}
  ` : ''}
</div>` : ''}

<!-- 12 미디어 자료 -->
${(archive.media?.images?.length > 0 || archive.media?.youtube || archive.media?.instagram) ? `
<div class="section">
  <div class="sec-badge">12</div>
  <div class="sec-title">미디어 자료</div>
  ${archive.media.images?.length > 0 ? `
    <div class="sub-title"> 현장 사진</div>
    <div class="media-grid">
      ${archive.media.images.map(url => `<img src="${url}" alt="현장 사진">`).join('')}
    </div>
  ` : ''}
  ${(archive.media.youtube || archive.media.instagram) ? `
    <div class="success-box" style="margin-top:12px;">
      ${archive.media.youtube   ? `<p> <strong>YouTube</strong>: ${archive.media.youtube}</p>`   : ''}
      ${archive.media.instagram ? `<p> <strong>Instagram</strong>: ${archive.media.instagram}</p>` : ''}
    </div>
  ` : ''}
</div>` : ''}

<!-- 푸터 -->
<div class="footer">
  <div class="footer-logo">CONTENIDO</div>
  <div class="footer-text">
    이벤트 아카이브 시스템 | ${new Date().toLocaleDateString('ko-KR')}<br>
    © ${new Date().getFullYear()} CONTENIDO. All Rights Reserved.
  </div>
</div>

</body>
</html>`;
}

module.exports = { generateAndUploadPdf, generatePdfHtml };
