const express = require('express');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

const CommunityPost = require('../models/CommunityPost');
const authenticateToken = require('../middleware/authMiddleware');
const { requireActiveUser } = require('../middleware/roleMiddleware');

const router = express.Router();

// multer memory storage config for optional image upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 
      'image/webp', 'image/heic', 'image/heif', 'image/bmp'
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.bmp'];

    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다. (jpg, png, gif, webp, heic, bmp 이미지 파일만 업로드 가능)'), false);
    }
  }
});

// Helper to compress and save image
async function processAndSaveImage(file) {
  if (!file) return null;
  const dir = 'public/uploads/community';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const filename = uniqueSuffix + '.jpg';
  const outputPath = path.join(dir, filename);
  try {
    await sharp(file.buffer)
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toFile(outputPath);
    return `/uploads/community/${filename}`;
  } catch (err) {
    console.error('Sharp image processing error:', err);
    throw new Error('이미지 처리 중 오류가 발생했습니다.');
  }
}

// Sanitizes post and comments for client safety
function sanitizePost(post, currentUserId) {
  const userIdStr = currentUserId ? currentUserId.toString() : null;
  const isAuthor = userIdStr && post.author && post.author._id.toString() === userIdStr;

  const sanitizedComments = post.comments.map(c => {
    const isCommentAuthor = userIdStr && c.author && c.author._id.toString() === userIdStr;
    let authorName = '익명';

    if (c.isAnonymous) {
      if (c.anonymousNumber === 0) {
        authorName = '익명(글쓴이)';
      } else {
        authorName = `익명 ${c.anonymousNumber}`;
      }
    } else {
      authorName = (c.author && (c.author.name || c.author.displayName)) || '알수없음';
    }

    return {
      _id: c._id,
      content: c.isDeleted ? '삭제된 댓글입니다.' : c.content,
      parentCommentId: c.parentCommentId,
      authorName: authorName,
      isMyComment: !!isCommentAuthor,
      isDeleted: c.isDeleted,
      likesCount: c.likes ? c.likes.length : 0,
      hasLiked: userIdStr && c.likes ? c.likes.some(id => id.toString() === userIdStr) : false,
      createdAt: c.createdAt
    };
  });

  let authorName = '익명';
  if (!post.isAnonymous) {
    authorName = (post.author && (post.author.name || post.author.displayName)) || '알수없음';
  }

  const activeCommentsCount = post.comments 
    ? post.comments.filter(c => !c.isDeleted).length 
    : 0;

  return {
    _id: post._id,
    title: post.title,
    content: post.content,
    image: post.image,
    authorName: authorName,
    isMyPost: !!isAuthor,
    likesCount: post.likes ? post.likes.length : 0,
    hasLiked: userIdStr && post.likes ? post.likes.some(id => id.toString() === userIdStr) : false,
    comments: sanitizedComments,
    commentsCount: activeCommentsCount,
    createdAt: post.createdAt
  };
}

/* =========================================================================
   GET — 게시글 목록 조회 (페이지네이션, 검색, 정렬)
   ========================================================================= */
router.get('/posts', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'recent';

    const match = { isDeleted: false };
    if (search) {
      match.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          likesCount: { $size: { $ifNull: ["$likes", []] } }
        }
      }
    ];

    if (sortBy === 'popular') {
      pipeline.push({ $sort: { likesCount: -1, createdAt: -1 } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const posts = await CommunityPost.aggregate(pipeline);
    
    // Hydrate aggregates back to Mongoose documents for standard populate & sanitize
    const hydratedPosts = posts.map(p => {
      const doc = CommunityPost.hydrate(p);
      // Ensure we preserve the calculated fields or array lengths
      return doc;
    });

    await CommunityPost.populate(hydratedPosts, { path: 'author', select: 'name displayName' });

    const total = await CommunityPost.countDocuments(match);

    const sanitizedPosts = hydratedPosts.map(post => sanitizePost(post, req.user ? req.user._id : null));

    res.json({
      posts: sanitizedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Failed to get community posts:', err);
    res.status(500).json({ message: '게시글 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

/* =========================================================================
   GET — 특정 게시글 상세 조회
   ========================================================================= */
router.get('/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.postId, isDeleted: false })
      .populate('author', 'name displayName')
      .populate('comments.author', 'name displayName');

    if (!post) {
      return res.status(404).json({ message: '존재하지 않거나 삭제된 게시글입니다.' });
    }

    const sanitized = sanitizePost(post, req.user ? req.user._id : null);
    res.json(sanitized);
  } catch (err) {
    console.error('Failed to get community post:', err);
    res.status(500).json({ message: '게시글을 불러오는 중 오류가 발생했습니다.' });
  }
});

/* =========================================================================
   POST — 새 게시글 작성 (이미지 업로드 포함, 활성 회원 전용)
   ========================================================================= */
router.post('/posts', authenticateToken, requireActiveUser, upload.single('image'), async (req, res) => {
  try {
    const { title, content, isAnonymous } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: '제목과 내용을 입력해주세요.' });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await processAndSaveImage(req.file);
    }

    const newPost = new CommunityPost({
      title,
      content,
      isAnonymous: isAnonymous === 'true' || isAnonymous === true,
      image: imageUrl,
      author: req.user._id,
      comments: [],
      anonymousMap: [],
      nextAnonymousNumber: 1
    });

    await newPost.save();
    
    await newPost.populate('author', 'name displayName');

    res.status(201).json(sanitizePost(newPost, req.user._id));
  } catch (err) {
    console.error('Failed to create community post:', err);
    res.status(500).json({ message: '게시글 작성 중 오류가 발생했습니다.' });
  }
});

/* =========================================================================
   POST — 게시글 추천 토글
   ========================================================================= */
router.post('/posts/:postId/like', authenticateToken, async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.postId, isDeleted: false });
    if (!post) {
      return res.status(404).json({ message: '존재하지 않는 게시글입니다.' });
    }

    const userId = req.user._id;
    const likeIndex = post.likes.indexOf(userId);
    let hasLiked = false;

    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(userId);
      hasLiked = true;
    }

    await post.save();
    res.json({
      likesCount: post.likes.length,
      hasLiked: hasLiked
    });
  } catch (err) {
    console.error('Failed to like community post:', err);
    res.status(500).json({ message: '추천 처리 중 오류가 발생했습니다.' });
  }
});

/* =========================================================================
   DELETE — 게시글 삭제 (활성 회원 전용, 작성자 또는 운영진/관리자만 가능)
   ========================================================================= */
router.delete('/posts/:postId', authenticateToken, requireActiveUser, async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.postId, isDeleted: false });
    if (!post) {
      return res.status(404).json({ message: '존재하지 않는 게시글입니다.' });
    }

    const isAuthor = post.author.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'officer'].includes(req.user.role);

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: '삭제 권한이 없습니다.' });
    }

    post.isDeleted = true;
    await post.save();

    res.json({ message: '게시글이 삭제되었습니다.' });
  } catch (err) {
    console.error('Failed to delete community post:', err);
    res.status(500).json({ message: '게시글 삭제 중 오류가 발생했습니다.' });
  }
});

/* =========================================================================
   POST — 댓글/대댓글 작성 (활성 회원 전용, 익명 순차 번호 자동 매핑)
   ========================================================================= */
router.post('/posts/:postId/comments', authenticateToken, requireActiveUser, async (req, res) => {
  try {
    const { content, isAnonymous, parentCommentId } = req.body;
    if (!content) {
      return res.status(400).json({ message: '댓글 내용을 입력해주세요.' });
    }

    const post = await CommunityPost.findOne({ _id: req.params.postId, isDeleted: false });
    if (!post) {
      return res.status(404).json({ message: '존재하지 않는 게시글입니다.' });
    }

    const userId = req.user._id;
    let anonNumber = null;
    const isAnon = isAnonymous === 'true' || isAnonymous === true;

    if (isAnon) {
      const postAuthorIdStr = post.author.toString();
      const userIdStr = userId.toString();

      if (userIdStr === postAuthorIdStr) {
        anonNumber = 0; // 익명(글쓴이)
      } else {
        const existingMap = post.anonymousMap.find(m => m.userId.toString() === userIdStr);
        if (existingMap) {
          anonNumber = existingMap.anonymousNumber;
        } else {
          anonNumber = post.nextAnonymousNumber;
          post.anonymousMap.push({
            userId: userId,
            anonymousNumber: anonNumber
          });
          post.nextAnonymousNumber += 1;
        }
      }
    }

    const newComment = {
      author: userId,
      content,
      isAnonymous: isAnon,
      anonymousNumber: anonNumber,
      parentCommentId: parentCommentId || null,
      likes: [],
      isDeleted: false
    };

    post.comments.push(newComment);
    await post.save();

    // Populate references
    await post.populate('author', 'name displayName');
    await post.populate('comments.author', 'name displayName');

    const sanitized = sanitizePost(post, req.user._id);
    res.status(201).json(sanitized);
  } catch (err) {
    console.error('Failed to create comment:', err);
    res.status(500).json({ message: '댓글 작성 중 오류가 발생했습니다.' });
  }
});

/* =========================================================================
   DELETE — 댓글 삭제 (활성 회원 전용, 작성자 또는 운영진/관리자만 가능)
   ========================================================================= */
router.delete('/posts/:postId/comments/:commentId', authenticateToken, requireActiveUser, async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.postId, isDeleted: false });
    if (!post) {
      return res.status(404).json({ message: '존재하지 않는 게시글입니다.' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: '존재하지 않는 댓글입니다.' });
    }

    if (comment.isDeleted) {
      return res.status(400).json({ message: '이미 삭제된 댓글입니다.' });
    }

    const isAuthor = comment.author.toString() === req.user._id.toString();
    const isAdmin = ['admin', 'officer'].includes(req.user.role);

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: '삭제 권한이 없습니다.' });
    }

    comment.isDeleted = true;
    await post.save();

    await post.populate('author', 'name displayName');
    await post.populate('comments.author', 'name displayName');

    const sanitized = sanitizePost(post, req.user._id);
    res.json(sanitized);
  } catch (err) {
    console.error('Failed to delete comment:', err);
    res.status(500).json({ message: '댓글 삭제 중 오류가 발생했습니다.' });
  }
});

/* =========================================================================
   POST — 댓글 추천 토글
   ========================================================================= */
router.post('/posts/:postId/comments/:commentId/like', authenticateToken, async (req, res) => {
  try {
    const post = await CommunityPost.findOne({ _id: req.params.postId, isDeleted: false });
    if (!post) {
      return res.status(404).json({ message: '존재하지 않는 게시글입니다.' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: '존재하지 않거나 삭제된 댓글입니다.' });
    }

    const userId = req.user._id;
    const likeIndex = comment.likes.indexOf(userId);

    if (likeIndex > -1) {
      comment.likes.splice(likeIndex, 1);
    } else {
      comment.likes.push(userId);
    }

    await post.save();
    
    await post.populate('author', 'name displayName');
    await post.populate('comments.author', 'name displayName');

    const sanitized = sanitizePost(post, req.user._id);
    res.json(sanitized);
  } catch (err) {
    console.error('Failed to like comment:', err);
    res.status(500).json({ message: '댓글 추천 처리 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
