async function initPostDetail() {
  await BlogCore.initPublic(renderPost);
  renderPost();
}

function renderPost() {
  const id = new URLSearchParams(window.location.search).get('id');
  const post = BlogCore.getPostById(id);
  const article = BlogCore.$('#post-detail');

  if (!post) {
    document.getElementById('comments-section')?.remove();
    article.innerHTML = `
      <div class="post-not-found">
        <h2 data-i18n="post.notFound">${I18n.t('post.notFound')}</h2>
        <p data-i18n="post.notFoundDesc">${I18n.t('post.notFoundDesc')}</p>
        <a href="posts.html" class="btn-primary">${I18n.t('post.backToList')} ←</a>
      </div>
    `;
    return;
  }

  const title = BlogCore.loc(post.title);
  const reviewTarget = BlogCore.loc(post.reviewTarget);
  document.title = `${title} — ${BlogCore.loc(BlogCore.data().site.title)}`;

  const ratingHtml = post.rating
    ? `<div class="post-rating-badge" title="${I18n.t('post.rating')}">
         <span class="post-rating-score">${post.rating}</span><span class="post-rating-max">/10</span>
       </div>`
    : '';

  const targetHtml = reviewTarget
    ? `<div class="post-review-target">🔍 ${BlogCore.escapeHtml(reviewTarget)}</div>`
    : '';

  const commentCount = post.comments?.length || 0;
  const commentBadge = commentCount
    ? `<span class="post-comment-count">💬 ${commentCount}</span>`
    : '';

  article.innerHTML = `
    <a href="posts.html" class="back-link">← ${I18n.t('post.backToList')}</a>
    ${post.image ? `<img class="post-detail-image reveal-up" src="${BlogCore.escapeAttr(post.image)}" alt="${BlogCore.escapeAttr(title)}">` : ''}
    <div class="post-detail-header reveal-up">
      <div class="post-detail-meta">
        ${BlogCore.formatDate(post.date)}
        ${post.authorName ? `<span class="post-author">✍️ ${BlogCore.escapeHtml(post.authorName)}</span>` : ''}
        ${commentBadge}
      </div>
      ${targetHtml}
      <div class="post-detail-title-row">
        <h1 class="post-detail-title">${BlogCore.escapeHtml(title)}</h1>
        ${ratingHtml}
      </div>
      <p class="post-detail-excerpt">${BlogCore.escapeHtml(BlogCore.loc(post.excerpt))}</p>
      <div class="post-tags post-detail-tags">${(post.tags || []).map((t) => `<span class="tag">${BlogCore.escapeHtml(t)}</span>`).join('')}</div>
    </div>
    <div class="post-detail-body reveal-up">${BlogCore.escapeHtml(BlogCore.loc(post.content)).split('\n\n').map((p) => `<p>${BlogCore.escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('')}</div>
    <div class="post-detail-footer reveal-up">
      <a href="posts.html" class="btn-secondary">← ${I18n.t('post.backToList')}</a>
    </div>
  `;

  Comments.mount(post);
  if (typeof Effects !== 'undefined') Effects.refresh();
}

initPostDetail();