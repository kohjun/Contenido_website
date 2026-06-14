let currentPage = 1;
let totalPages = 1;
let currentUser = null;
let currentSort = 'recent';
let currentSearch = '';
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Verify token/session
  const authenticated = await AuthModule.verifyToken();
  if (!authenticated) {
    AuthModule.redirectToLogin();
    return;
  }

  // Load user data
  currentUser = await AuthModule.loadUserInfo();
  if (!currentUser) {
    AuthModule.redirectToLogin();
    return;
  }

  // Setup UI constraints for active vs inactive users
  if (!currentUser.active) {
    const writeCard = document.getElementById('write-card-container');
    writeCard.innerHTML = `<div class="active-user-only-notice">⚠️ 정식 승인(활성)된 회원만 자유게시판에 글과 댓글을 작성할 수 있습니다. (가입 대기중인 회원은 읽기만 가능)</div>`;
  } else {
    document.getElementById('post-create-form').addEventListener('submit', handlePostSubmit);
  }

  // File picker handler with preview
  const fileInput = document.getElementById('post-image-file');
  const previewContainer = document.getElementById('write-image-preview-container');
  const previewImg = document.getElementById('write-image-preview');

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const nameLabel = document.getElementById('post-file-name');
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        nameLabel.textContent = file.name;

        // Image Reader & Preview
        const reader = new FileReader();
        reader.onload = (event) => {
          previewImg.src = event.target.result;
          previewContainer.style.display = 'block';
        };
        reader.readAsDataURL(file);
      } else {
        nameLabel.textContent = '선택된 파일 없음';
        previewContainer.style.display = 'none';
        previewImg.src = '#';
      }
    });
  }

  // Cancel write image button
  const cancelImgBtn = document.getElementById('btn-cancel-write-image');
  if (cancelImgBtn) {
    cancelImgBtn.addEventListener('click', () => {
      if (fileInput) fileInput.value = '';
      document.getElementById('post-file-name').textContent = '선택된 파일 없음';
      previewContainer.style.display = 'none';
      previewImg.src = '#';
    });
  }

  // Search trigger on button click or Enter key
  const searchInput = document.getElementById('board-search-input');
  const searchBtn = document.getElementById('btn-board-search');

  const executeSearch = () => {
    if (searchInput) {
      currentSearch = searchInput.value.trim();
      loadPosts(1);
    }
  };

  if (searchBtn) {
    searchBtn.addEventListener('click', executeSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        executeSearch();
      }
    });
  }

  // Tab filters switching
  const tabRecent = document.getElementById('tab-recent');
  const tabPopular = document.getElementById('tab-popular');
  if (tabRecent && tabPopular) {
    tabRecent.addEventListener('click', () => {
      if (currentSort === 'recent') return;
      currentSort = 'recent';
      tabRecent.classList.add('active');
      tabPopular.classList.remove('active');
      loadPosts(1);
    });

    tabPopular.addEventListener('click', () => {
      if (currentSort === 'popular') return;
      currentSort = 'popular';
      tabPopular.classList.add('active');
      tabRecent.classList.remove('active');
      loadPosts(1);
    });
  }

  // Pagination handlers
  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      loadPosts(currentPage - 1);
    }
  });

  document.getElementById('next-page').addEventListener('click', () => {
    if (currentPage < totalPages) {
      loadPosts(currentPage + 1);
    }
  });

  // Modal close handlers
  document.getElementById('detail-modal-close').addEventListener('click', closeModal);
  document.getElementById('detail-modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'detail-modal-overlay') {
      closeModal();
    }
  });

  // Load first page of posts
  loadPosts(1);
});

/* =========================================================================
   게시글 목록 로드 및 렌더링
   ========================================================================= */
async function loadPosts(page = 1) {
  try {
    const url = `/community/posts?page=${page}&limit=10&search=${encodeURIComponent(currentSearch)}&sortBy=${currentSort}`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('게시글 목록을 가져올 수 없습니다.');
    const data = await res.json();

    currentPage = data.pagination.page;
    totalPages = data.pagination.totalPages;

    renderPosts(data.posts);
    renderPagination();
  } catch (err) {
    console.error(err);
    showToast('게시글을 불러오는 중 오류가 발생했습니다.', { type: 'danger' });
  }
}

function renderPosts(posts) {
  const feed = document.getElementById('posts-feed');
  if (!posts || posts.length === 0) {
    feed.innerHTML = '<div style="text-align: center; color: var(--c-text-muted); padding: 40px 0;">등록된 게시글이 없습니다. 첫 글을 작성해보세요!</div>';
    return;
  }

  feed.innerHTML = posts.map(post => {
    const dateStr = formatDate(post.createdAt);
    const imageTag = post.image ? `<img src="${post.image}" class="post-thumb" alt="thumbnail" />` : '';
    const authorClass = post.authorName === '익명' ? 'post-author' : 'post-author not-anon';

    return `
      <div class="post-card" data-id="${post._id}">
        <div class="post-header">
          <div class="post-header-left">
            <span class="post-avatar">👤</span>
            <span class="${authorClass}">${escapeHtml(post.authorName)}</span>
            <span class="post-time">${dateStr}</span>
          </div>
        </div>
        <h2 class="post-title">${escapeHtml(post.title)}</h2>
        <div class="post-body-wrap">
          <p class="post-summary">${escapeHtml(post.content)}</p>
          ${imageTag}
        </div>
        <div class="post-footer">
          <div class="post-left-footer">
            ${post.isMyPost || ['admin', 'officer'].includes(currentUser.role) ? `
              <button class="comment-act-btn btn-delete" data-delete-post-id="${post._id}">삭제</button>
            ` : ''}
          </div>
          <div class="post-stats">
            ${post.likesCount > 0 ? `
              <span class="meta-item liked" data-post-like-id="${post._id}">👍 ${post.likesCount}</span>
              <span class="meta-sep">|</span>
            ` : ''}
            <span class="meta-item commented">💬 ${post.commentsCount}</span>
            <span class="meta-sep">|</span>
            <span class="meta-item">${dateStr}</span>
            <span class="meta-sep">|</span>
            <span class="meta-item">${escapeHtml(post.authorName)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card click handlers
  document.querySelectorAll('.post-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-delete-post-id]')) {
        e.stopPropagation();
        const postId = e.target.closest('[data-delete-post-id]').dataset.deletePostId;
        deletePost(postId);
        return;
      }
      const postId = card.dataset.id;
      openPostDetail(postId);
    });
  });
}

function renderPagination() {
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  const infoSpan = document.getElementById('page-info');

  infoSpan.textContent = `페이지 ${currentPage} / ${totalPages || 1}`;

  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

/* =========================================================================
   게시글 등록
   ========================================================================= */
async function handlePostSubmit(e) {
  e.preventDefault();

  if (!currentUser.active) {
    showToast('정식 승인(활성) 회원만 게시글을 작성할 수 있습니다.', { type: 'danger' });
    return;
  }

  const title = document.getElementById('post-title').value.trim();
  const content = document.getElementById('post-content').value.trim();
  const isAnonymous = document.getElementById('post-anonymous').checked;
  const fileInput = document.getElementById('post-image-file');

  if (!title || !content) {
    showToast('제목과 내용을 모두 입력해 주세요.', { type: 'info' });
    return;
  }

  const formData = new FormData();
  formData.append('title', title);
  formData.append('content', content);
  formData.append('isAnonymous', isAnonymous);

  if (fileInput.files.length > 0) {
    formData.append('image', fileInput.files[0]);
  }

  try {
    const submitBtn = document.getElementById('btn-submit-post');
    submitBtn.disabled = true;

    const res = await fetch('/community/posts', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    submitBtn.disabled = false;

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || '게시글 저장 실패');
    }

    showToast('게시글이 성공적으로 등록되었습니다.', { type: 'success' });

    // Reset Form
    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
    document.getElementById('post-image-file').value = '';
    document.getElementById('post-file-name').textContent = '선택된 파일 없음';
    const previewContainer = document.getElementById('write-image-preview-container');
    const previewImg = document.getElementById('write-image-preview');
    if (previewContainer) previewContainer.style.display = 'none';
    if (previewImg) previewImg.src = '#';

    loadPosts(1);
  } catch (err) {
    console.error(err);
    showToast(err.message || '게시글 작성 중 오류가 발생했습니다.', { type: 'danger' });
  }
}

/* =========================================================================
   게시글 상세 정보 모달
   ========================================================================= */
async function openPostDetail(postId) {
  try {
    const res = await fetch(`/community/posts/${postId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('게시글 상세 정보를 가져올 수 없습니다.');
    const post = await res.json();

    renderPostDetail(post);

    const modal = document.getElementById('detail-modal-overlay');
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  } catch (err) {
    console.error(err);
    showToast('게시글을 불러올 수 없습니다.', { type: 'danger' });
  }
}

function closeModal() {
  const modal = document.getElementById('detail-modal-overlay');
  modal.classList.remove('show');
  document.body.style.overflow = '';
}

function renderPostDetail(post) {
  const body = document.getElementById('detail-modal-body');
  const footer = document.querySelector('.detail-modal-footer');
  document.getElementById('current-post-id').value = post._id;

  if (!currentUser.active) {
    footer.innerHTML = `<div class="active-user-only-notice">⚠️ 정식 승인(활성)된 회원만 댓글을 작성할 수 있습니다.</div>`;
  } else {
    footer.innerHTML = `
      <form id="comment-create-form" class="comment-input-form">
        <input type="hidden" id="current-post-id" value="${post._id}" />
        <div class="comment-input-row">
          <input type="text" class="comment-input-field" id="comment-content" placeholder="댓글을 입력하세요..." required />
          <label class="comment-anon-label">
            <input type="checkbox" id="comment-anonymous" checked />
            <span>익명</span>
          </label>
          <button type="submit" class="comment-submit-btn" aria-label="등록">✏️</button>
        </div>
      </form>
    `;
    document.getElementById('comment-create-form').addEventListener('submit', handleCommentSubmit);
  }

  const dateStr = formatDate(post.createdAt);
  const authorClass = post.authorName === '익명' ? 'post-author' : 'post-author not-anon';
  const imageSection = post.image ? `
    <div class="post-detail-image-wrap">
      <img src="${post.image}" class="post-detail-image" alt="photo" onclick="window.open('${post.image}')" style="cursor: zoom-in;" />
    </div>
  ` : '';

  const commentsListHtml = renderCommentsTree(post.comments, post._id);

  const isMyPostOrStaff = post.isMyPost || ['admin', 'officer'].includes(currentUser.role);
  let rightActionsHtml = '';
  if (isMyPostOrStaff) {
    rightActionsHtml += `<button class="post-detail-act-link" id="btn-delete-post">삭제</button>`;
  } else {
    rightActionsHtml += `
      <button class="post-detail-act-link" id="btn-msg-post">쪽지</button>
      <button class="post-detail-act-link" id="btn-report-post">신고</button>
    `;
  }

  body.innerHTML = `
    <div class="post-detail-section">
      <div class="post-detail-header-row">
        <div class="post-detail-profile">
          <div class="post-detail-avatar">👤</div>
          <div class="post-detail-author-meta">
            <span class="${authorClass}">${escapeHtml(post.authorName)}</span>
            <span class="post-detail-time">${dateStr}</span>
          </div>
        </div>
        <div class="post-detail-right-actions">
          ${rightActionsHtml}
        </div>
      </div>
      
      <h2 class="post-detail-title">${escapeHtml(post.title)}</h2>
      <p class="post-detail-content">${escapeHtml(post.content)}</p>
      ${imageSection}
      
      <div class="post-detail-stats-row">
        <span class="detail-stat-val liked">👍 ${post.likesCount}</span>
        <span class="detail-stat-val commented">💬 ${post.commentsCount}</span>
        <span class="detail-stat-val" style="color: #ffb600;">⭐ 0</span>
      </div>
      
      <div class="post-detail-buttons-row">
        <button class="btn-detail-action ${post.hasLiked ? 'liked' : ''}" id="btn-like-post">
          <span>👍 공감</span>
        </button>
        <button class="btn-detail-action" id="btn-scrap-post">
          <span>⭐ 스크랩</span>
        </button>
      </div>
    </div>

    <div class="comments-section">
      <h3 class="comments-section-title">댓글 ${post.commentsCount}</h3>
      <div class="comments-list" id="modal-comments-list">
        ${commentsListHtml}
      </div>
    </div>
  `;

  // Attach delete & like post listeners
  const deleteBtn = document.getElementById('btn-delete-post');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => deletePost(post._id, true));
  }
  const msgBtn = document.getElementById('btn-msg-post');
  if (msgBtn) {
    msgBtn.addEventListener('click', () => {
      showToast('쪽지 기능은 준비 중입니다.', { type: 'info' });
    });
  }
  const reportBtn = document.getElementById('btn-report-post');
  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      showToast('신고가 접수되었습니다.', { type: 'success' });
    });
  }
  const scrapBtn = document.getElementById('btn-scrap-post');
  if (scrapBtn) {
    scrapBtn.addEventListener('click', () => {
      showToast('스크랩 기능은 준비 중입니다.', { type: 'info' });
    });
  }
  document.getElementById('btn-like-post').addEventListener('click', () => togglePostLike(post._id));

  attachCommentActions(post._id);
}

/* =========================================================================
   댓글 구조 및 개별 노드 렌더링
   ========================================================================= */
function renderCommentsTree(comments, postId) {
  if (!comments || comments.length === 0) {
    return `<div style="text-align: center; color: var(--c-text-muted); padding: 20px 0; font-size: 13px;">작성된 댓글이 없습니다.</div>`;
  }

  const roots = comments.filter(c => !c.parentCommentId);
  const replies = comments.filter(c => c.parentCommentId);
  let html = '';

  roots.forEach(root => {
    const rootReplies = replies.filter(r => r.parentCommentId.toString() === root._id.toString());
    if (root.isDeleted && rootReplies.length === 0) {
      return; // Skip rendering deleted comments that have no replies
    }

    html += renderCommentNode(root, false, postId);

    rootReplies.forEach(reply => {
      html += renderCommentNode(reply, true, postId);
    });
  });

  return html;
}

function renderCommentNode(c, isReply, postId) {
  const dateStr = formatDate(c.createdAt);
  const isReplyClass = isReply ? 'is-reply' : '';
  const deletedClass = c.isDeleted ? 'deleted-style' : '';
  
  let authorClass = 'comment-node-author';
  if (!c.isAnonymous) {
    authorClass = 'comment-node-author not-anon';
  } else if (c.authorName === '익명(글쓴이)') {
    authorClass = 'comment-node-author is-author-moniker';
  }

  let contentHtml = '';
  if (c.isDeleted) {
    contentHtml = `<p class="comment-node-content" style="color: var(--c-text-muted); font-style: italic;">삭제된 댓글입니다.</p>`;
  } else {
    contentHtml = `<p class="comment-node-content">${escapeHtml(c.content)}</p>`;
  }

  let actionButtonsHtml = '';
  if (!c.isDeleted) {
    const replyBtn = !isReply && currentUser.active ? `
      <button class="comment-link-btn btn-reply" data-comment-id="${c._id}">대댓글</button>
    ` : '';
    const likeBtn = `
      <button class="comment-link-btn btn-comment-like ${c.hasLiked ? 'liked' : ''}" data-comment-id="${c._id}">공감</button>
    `;
    const messageBtn = !c.isMyComment ? `
      <button class="comment-link-btn btn-comment-message" data-author-name="${c.authorName}">쪽지</button>
    ` : '';
    const reportBtn = !c.isMyComment ? `
      <button class="comment-link-btn btn-comment-report" data-comment-id="${c._id}">신고</button>
    ` : '';
    const deleteBtn = c.isMyComment || ['admin', 'officer'].includes(currentUser.role) ? `
      <button class="comment-link-btn btn-delete btn-comment-delete" data-comment-id="${c._id}">삭제</button>
    ` : '';

    actionButtonsHtml = `
      <div class="comment-header-right-actions">
        ${replyBtn}
        ${likeBtn}
        ${messageBtn}
        ${reportBtn}
        ${deleteBtn}
      </div>
    `;
  }

  return `
    <div class="comment-node-item ${isReplyClass} ${deletedClass}" id="comment-${c._id}">
      <div class="comment-node-header">
        <div class="comment-node-profile">
          <div class="comment-node-avatar">👤</div>
          <span class="${authorClass}">${escapeHtml(c.authorName)}</span>
        </div>
        ${actionButtonsHtml}
      </div>
      ${contentHtml}
      <div style="display: flex; align-items: center; gap: 6px;">
        <span class="comment-node-time">${dateStr}</span>
        ${c.likesCount > 0 ? `<span style="color: #f91f1f; font-size: 10px; font-weight: bold; display: inline-flex; align-items: center; gap: 2px;">👍 ${c.likesCount}</span>` : ''}
      </div>
    </div>
  `;
}

/* =========================================================================
   댓글 관련 상호작용 (추천, 삭제, 대댓글 창)
   ========================================================================= */
function attachCommentActions(postId) {
  // Comment Like Action
  document.querySelectorAll('.btn-comment-like').forEach(btn => {
    btn.addEventListener('click', async () => {
      const commentId = btn.dataset.commentId;
      try {
        const res = await fetch(`/community/posts/${postId}/comments/${commentId}/like`, {
          method: 'POST',
          credentials: 'include'
        });
        if (!res.ok) throw new Error('댓글 추천 실패');
        const post = await res.json();
        renderPostDetail(post);
      } catch (err) {
        console.error(err);
        showToast('댓글 추천 처리 중 오류가 발생했습니다.', { type: 'danger' });
      }
    });
  });

  // Comment Message Action
  document.querySelectorAll('.btn-comment-message').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('쪽지 기능은 준비 중입니다.', { type: 'info' });
    });
  });

  // Comment Report Action
  document.querySelectorAll('.btn-comment-report').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('신고가 접수되었습니다.', { type: 'success' });
    });
  });

  // Comment Delete Action
  document.querySelectorAll('.btn-comment-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const commentId = btn.dataset.commentId;
      const confirmOk = await openConfirm({
        title: '댓글 삭제',
        message: '댓글을 정말 삭제하시겠습니까?',
        okText: '삭제',
        cancelText: '취소',
        danger: true
      });
      if (!confirmOk) return;

      try {
        const res = await fetch(`/community/posts/${postId}/comments/${commentId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!res.ok) throw new Error('댓글 삭제 실패');
        const post = await res.json();
        renderPostDetail(post);
        showToast('댓글이 삭제되었습니다.', { type: 'success' });
        loadPosts(currentPage); // update stats in main page
      } catch (err) {
        console.error(err);
        showToast('댓글 삭제 중 오류가 발생했습니다.', { type: 'danger' });
      }
    });
  });

  // Reply Form toggler
  document.querySelectorAll('.btn-reply').forEach(btn => {
    btn.addEventListener('click', () => {
      const commentId = btn.dataset.commentId;
      showReplyInput(commentId, postId);
    });
  });
}

function showReplyInput(commentId, postId) {
  const existingForm = document.querySelector('.reply-input-wrap');
  if (existingForm) {
    existingForm.remove();
  }

  const commentNode = document.getElementById(`comment-${commentId}`);
  if (!commentNode) return;

  const replyWrap = document.createElement('div');
  replyWrap.className = 'reply-input-wrap';
  replyWrap.innerHTML = `
    <form id="reply-create-form" class="comment-input-form">
      <div class="comment-input-row">
        <input type="text" class="comment-input-field" id="reply-content" placeholder="답글을 입력하세요..." required />
        <label class="comment-anon-label">
          <input type="checkbox" id="reply-anonymous" checked />
          <span>익명</span>
        </label>
        <button type="submit" class="comment-submit-btn" aria-label="등록">✏️</button>
        <button type="button" class="btn-cancel-reply-x" id="btn-cancel-reply" aria-label="취소">×</button>
      </div>
    </form>
  `;

  commentNode.parentNode.insertBefore(replyWrap, commentNode.nextSibling);

  document.getElementById('btn-cancel-reply').addEventListener('click', () => {
    replyWrap.remove();
  });

  document.getElementById('reply-create-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('reply-content').value.trim();
    const isAnonymous = document.getElementById('reply-anonymous').checked;

    if (!content) return;

    try {
      const res = await fetch(`/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          isAnonymous,
          parentCommentId: commentId
        }),
        credentials: 'include'
      });

      if (!res.ok) throw new Error('답글 등록 실패');
      const post = await res.json();
      renderPostDetail(post);
      showToast('답글이 등록되었습니다.', { type: 'success' });
      loadPosts(currentPage); // update stats in main page
    } catch (err) {
      console.error(err);
      showToast('답글 작성 중 오류가 발생했습니다.', { type: 'danger' });
    }
  });
}

/* =========================================================================
   댓글 등록 Submit Handler
   ========================================================================= */
async function handleCommentSubmit(e) {
  e.preventDefault();

  if (!currentUser.active) {
    showToast('정식 승인(활성) 회원만 댓글을 작성할 수 있습니다.', { type: 'danger' });
    return;
  }

  const postId = document.getElementById('current-post-id').value;
  const content = document.getElementById('comment-content').value.trim();
  const isAnonymous = document.getElementById('comment-anonymous').checked;

  if (!content) return;

  try {
    const res = await fetch(`/community/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, isAnonymous }),
      credentials: 'include'
    });

    if (!res.ok) throw new Error('댓글 등록 실패');
    const post = await res.json();

    renderPostDetail(post);
    showToast('댓글이 등록되었습니다.', { type: 'success' });
    loadPosts(currentPage); // update stats in main page
  } catch (err) {
    console.error(err);
    showToast('댓글 작성 중 오류가 발생했습니다.', { type: 'danger' });
  }
}

/* =========================================================================
   게시글 삭제 및 추천
   ========================================================================= */
async function deletePost(postId, isInsideModal = false) {
  const confirmOk = await openConfirm({
    title: '게시글 삭제',
    message: '게시글을 정말 삭제하시겠습니까? 삭제된 게시글은 복구할 수 없습니다.',
    okText: '삭제',
    cancelText: '취소',
    danger: true
  });
  if (!confirmOk) return;

  try {
    const res = await fetch(`/community/posts/${postId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('게시글 삭제 실패');

    showToast('게시글이 삭제되었습니다.', { type: 'success' });

    if (isInsideModal) {
      closeModal();
    }

    loadPosts(currentPage);
  } catch (err) {
    console.error(err);
    showToast('게시글 삭제 중 오류가 발생했습니다.', { type: 'danger' });
  }
}

async function togglePostLike(postId) {
  try {
    const res = await fetch(`/community/posts/${postId}/like`, {
      method: 'POST',
      credentials: 'include'
    });
    if (!res.ok) throw new Error('추천 토글 실패');
    const data = await res.json();

    const likeBtnSpan = document.querySelector('#btn-like-post span');
    if (likeBtnSpan) {
      likeBtnSpan.textContent = `👍 추천 ${data.likesCount}`;
    }

    const likeBtn = document.getElementById('btn-like-post');
    if (likeBtn) {
      if (data.hasLiked) {
        likeBtn.classList.remove('btn-ghost');
        likeBtn.classList.add('btn-danger');
      } else {
        likeBtn.classList.remove('btn-danger');
        likeBtn.classList.add('btn-ghost');
      }
    }

    loadPosts(currentPage);
  } catch (err) {
    console.error(err);
    showToast('추천 처리 중 오류가 발생했습니다.', { type: 'danger' });
  }
}

/* =========================================================================
   날짜 포맷터 및 유틸리티
   ========================================================================= */
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}
