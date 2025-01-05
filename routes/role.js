/*const { authorizeRoles, authorizeOwnerOrStaff, requireActiveUser } = require('../middleware/roleMiddleware');

// 예시: staff만 접근 가능한 라우트
router.get('/admin/dashboard', 
  authenticateToken, 
  authorizeRoles('staff'), 
  (req, res) => {
    // 로직
});

// 예시: staff와 manager 모두 접근 가능한 라우트
router.get('/reports', 
  authenticateToken, 
  authorizeRoles('staff', 'manager'), 
  (req, res) => {
    // 로직
});

// 예시: 이벤트 수정 - 생성자나 staff만 가능
router.put('/:id', 
  authenticateToken,
  authorizeOwnerOrStaff(async (req) => {
    const event = await Event.findById(req.params.id);
    return event?.creator;
  }),
  (req, res) => {
    // 로직
});

// 예시: 활성 사용자만 이벤트 신청 가능
router.post('/:id/apply', 
  authenticateToken,
  requireActiveUser,
  (req, res) => {
    // 로직
});
*/