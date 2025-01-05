// middleware/roleMiddleware.js

// 허용된 역할 목록을 받아 해당 역할들만 접근을 허용하는 미들웨어
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
  
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          message: 'You do not have permission to perform this action'
        });
      }
  
      next();
    };
  };
  
  // 특정 리소스의 소유자나 staff만 접근을 허용하는 미들웨어
  const authorizeOwnerOrStaff = (getResourceCreatorId) => {
    return async (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
  
      try {
        const creatorId = await getResourceCreatorId(req);
        
        if (req.user.role === 'officer' || creatorId?.toString() === req.user.id) {
          next();
        } else {
          res.status(403).json({ 
            message: 'You do not have permission to perform this action' 
          });
        }
      } catch (error) {
        console.error('Authorization error:', error);
        res.status(500).json({ message: 'Error checking permissions' });
      }
    };
  };
  
  // 활성 상태인 사용자만 접근을 허용하는 미들웨어
  const requireActiveUser = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
  
    if (!req.user.active) {
      return res.status(403).json({ 
        message: 'Your account must be active to perform this action' 
      });
    }
  
    next();
  };
  
  module.exports = {
    authorizeRoles,
    authorizeOwnerOrStaff,
    requireActiveUser
  };