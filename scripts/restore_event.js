// scripts/restore_event.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { ObjectId } = mongoose.Types;

const targetId = new ObjectId('6ac13afde585ae1299c78fdb');

async function restore() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.\n');

  const eventsColl = mongoose.connection.collection('events');
  const existing = await eventsColl.findOne({ _id: targetId });
  if (existing) {
    console.log('⚠️ 이미 해당 이벤트가 DB에 존재합니다:', existing.title);
    process.exit(0);
  }

  // 1. Oplog 에서 원본 문서 조회 시도
  let docToInsert = null;
  try {
    const oplog = mongoose.connection.client.db('local').collection('oplog.rs');
    const logs = await oplog.find({
      $or: [
        { 'o._id': targetId },
        { 'o2._id': targetId }
      ]
    }).sort({ ts: -1 }).toArray();

    for (const log of logs) {
      if (log.op === 'i' && log.o && log.o._id?.toString() === targetId.toString()) {
        console.log('⭐ Oplog insert 기록에서 원본 문서 발견!');
        docToInsert = log.o;
        break;
      }
    }
  } catch (err) {
    console.log('ℹ️ Oplog 접근 불가 또는 문서 없음:', err.message);
  }

  // 2. 만약 Oplog에서 문서를 못 찾았다면, debug.log + Notifications 기록으로 완전 재구성
  if (!docToInsert) {
    console.log('🔄 Oplog에 원본 전체가 없으므로, debug.log 및 Notification 데이터로 완벽 재구성합니다...');

    // (A) 알림(Notification) 컬렉션에서 주최자(creator) 및 신청자 정보 조회
    const notiColl = mongoose.connection.collection('notifications');
    const notis = await notiColl.find({ 'meta.eventId': targetId }).sort({ createdAt: 1 }).toArray();
    console.log(`📌 관련 알림 ${notis.length}건 확인됨.`);

    // 주최자 찾기: 'application_received' 알림의 recipient가 주최자
    let creatorId = null;
    const appNoti = notis.find(n => n.type === 'application_received');
    if (appNoti && appNoti.recipient) {
      creatorId = appNoti.recipient;
      console.log('🎯 주최자(creator) 확인됨:', creatorId.toString());
    } else {
      const adminUser = await mongoose.connection.collection('users').findOne({ role: 'admin' });
      creatorId = adminUser ? adminUser._id : new ObjectId('673aed9a051a576b3e2285e1');
      console.log('ℹ️ 주최자 fallback:', creatorId.toString());
    }

    // (B) 승인된 참가자 목록 추출 (debug.log 에서 확인된 41명)
    const approvedUserIds = [
      '67e2ac4c87fcea0501ff5beb',
      '67e2b50487fcea0501ff67de',
      '67e414d087fcea0501ff86d8',
      '69c9c058b9ed410c27e00007',
      '6abb931fe585ae1299a49e77',
      '695d49ae174375df66d8e435',
      '6871ca18e6d09f0ec4ae01f8',
      '683a8fca135b42dd92af92e4',
      '69cf9840b9ed410c27fb79a4',
      '6a891fb5e585ae1299fe79e7',
      '6abbddcae585ae1299ae679a',
      '6960c985174375df66e64837',
      '6a38f00214daaad63a572bbb',
      '6abc3cd4e585ae1299b04485',
      '69bd169a0316497886e710de',
      '69ca0d8ab9ed410c27e0b0e8',
      '6abbc2a0e585ae1299ad2d29',
      '6ac22a83e585ae1299cf1651',
      '6a439c61f0c4f2058577fdd2',
      '6abb9c85e585ae1299a6d5c3',
      '6a4578e581506d69db6327fc',
      '69ca3b62b9ed410c27e31b6b',
      '6a545b9d61c304990b0e1126',
      '6866464e1e83c9aacc894e48',
      '69bd18d40316497886e73948',
      '6a58f16f61c304990b2dcb62',
      '6a58f14161c304990b2dcb50',
      '6a38f04914daaad63a574df6',
      '6a54cb7261c304990b126492',
      '695de0ea174375df66d9dbac',
      '6abc8b7be585ae1299b25c70',
      '6abc8b7ee585ae1299b25c82',
      '69cd1937b9ed410c27f39c55',
      '6a452f5f81506d69db62b170',
      '6abc6770e585ae1299b11c3d',
      '69cb89e7b9ed410c27ead3cb',
      '6abb97e1e585ae1299a55da4',
      '6a445949d28d7cff736cef3f',
      '6abe1244e585ae1299b79acc',
      '69bd3b1e0316497886e7dddf'
    ];

    const appliedParticipants = [];

    // 회원 승인 참가자 추가
    for (const uid of approvedUserIds) {
      appliedParticipants.push({
        _id: new ObjectId(),
        userId: new ObjectId(uid),
        appliedAt: new Date('2026-10-04T02:00:00.000Z'),
        status: 'approved',
        cancellationRequested: false,
        cancellationRequestedAt: null,
        isGuest: false,
        companions: [],
        statusHistory: [],
        previousAttempts: [],
        answers: []
      });
    }

    // 동반인 게스트 추가 (김주희)
    appliedParticipants.push({
      _id: new ObjectId('6ac70424e585ae1299f5032d'),
      userId: new ObjectId('69bd169a0316497886e710de'), // 초대한 유저 ID
      appliedAt: new Date('2026-10-08T02:47:00.770Z'),
      status: 'approved',
      cancellationRequested: false,
      cancellationRequestedAt: null,
      inviterUserId: new ObjectId('69bd169a0316497886e710de'),
      isGuest: true,
      guestInfo: {
        name: '김주희',
        phone: '01055158067',
        gender: 'female',
        age: 24
      },
      companions: [],
      statusHistory: [],
      previousAttempts: [],
      answers: []
    });

    console.log(`👥 복구된 승인 참가자 수: ${appliedParticipants.length}명`);

    // 접근 코드 해시 (비밀번호: "1004")
    const hashedCode = await bcrypt.hash('1004', 10);

    docToInsert = {
      _id: targetId,
      title: '배틀그라운드 in 서울숲',
      place: '서울숲',
      date: new Date('2026-11-01T00:00:00.000Z'),
      participants: 45,
      startTime: '14:30',
      endTime: '17:30',
      participation_fee: 13000,
      contents: `<배틀그라운드 in 서울숲 참가자 모집>\n\n"이겼닭! 오늘 저녁은 치킨이닭!" 🍗\n\n11월 1일, 서울숲이 무대가 돼요!\n\n화면 속에서만 하던 배그, 진짜로 해보고 싶었던 적 있지 않으세요? 😆\n이번엔 서울숲 한복판에서 현실판 배틀그라운드를 즐겨봐요!\n\n이번 게임을 위해 전용 앱을 직접 만들었어요. 📱\n앱으로 자기장과 게임 상황을 확인하면서, 서울숲 곳곳을 뛰어다니며 적을 찾고, 쫓고, 끝까지 살아남으면 돼요!\n진짜 배그 속에 뛰어든 기분, 같이 느껴봐요 🏃♂️🏃♀️\n\n🎯 적을 찾아보세요!\n서울숲 어딘가에 숨어 있는 상대 플레이어를 찾아보세요.\n들키기 전에 먼저 움직이는 게 포인트예요 👀\n\n🏃 안전구역으로 이동하세요!\n시간이 지날수록 안전구역이 점점 좁아져요.\n제한시간 안에 들어오지 못하면 탈락할 수도 있으니, 상대를 피해 얼른 안전구역으로 들어오세요!\n\n⚔️ 끝까지 살아남아 보세요!\n게임이 진행될수록 남은 사람은 점점 줄어들어요.\n쫓고, 숨고, 눈치 싸움하면서 마지막까지 버텨봐요 💪\n\n👑 FINAL: 최종 우승에 도전하세요!\n최종 우승자에게는 화면 속 치킨이 아닌 진짜 치킨을 드려요! 🍗\n과연 서울숲 배틀그라운드의 최후의 1인은 누가 될까요?\n\n📍 장소: 서울숲\n📅 날짜: 11월 1일 (일)\n🕒 시간: 오후 2시 30분 ~ 5시 30분\n💰 참가비: 13,000원\n📱 진행 방식: 전용 앱으로 즐기는 오프라인 서바이벌 게임`,
      team: 'staffTeam',
      creator: creatorId,
      isEnded: false,
      participationCountAwarded: false,
      images: ['/uploads/events/1791048445259-643120549.jpg'],
      refundPolicy: 'standard',
      rating: 0,
      accessCode: hashedCode,
      allowCompanions: true,
      maxCompanionsPerUser: 1,
      isSelective: false,
      isLightning: false,
      lightningQuestions: [],
      hasParticipantRules: true,
      additionalQuestions: [],
      tags: ['신입추천', '레이스', '야외'],
      applicationStartAt: new Date('2026-10-03T08:00:00.000Z'),
      applicationDeadlineAt: new Date('2026-10-18T22:00:00.000Z'),
      confirmationDeadlineAt: new Date('2026-10-19T22:00:00.000Z'),
      maxApplicants: null,
      feeType: 'fixed',
      participation_fee_max: null,
      dutyMonth: 10,
      dutyYear: 2026,
      appliedParticipants: appliedParticipants,
      finalParticipants: []
    };
  }

  // 3. 데이터베이스에 복원 삽입
  console.log('\n💾 이벤트 문서를 MongoDB에 복원 중...');
  await eventsColl.insertOne(docToInsert);
  console.log('🎉 이벤트가 성공적으로 복구되었습니다!');
  console.log(`- 이벤트 ID: ${docToInsert._id}`);
  console.log(`- 이벤트 제목: ${docToInsert.title}`);
  console.log(`- 행사일: ${docToInsert.date}`);
  console.log(`- 정원: ${docToInsert.participants}명`);
  console.log(`- 참가자 수: ${docToInsert.appliedParticipants?.length || 0}명`);
  console.log(`- 의무 인정 월: ${docToInsert.dutyMonth}월`);

  process.exit(0);
}

restore().catch(e => {
  console.error('❌ 복구 실패:', e);
  process.exit(1);
});
