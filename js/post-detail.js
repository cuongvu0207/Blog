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

    ${post.mapUrl ? (() => {
      const rawUrl = (post.mapUrl || '').trim();
      if (!rawUrl) return '';

      const isGoogleMapsLink = rawUrl.includes('google.com/maps') || rawUrl.includes('maps.app.goo.gl') || rawUrl.includes('goo.gl/maps');
      const looksLikeEmbed = rawUrl.includes('/embed') || rawUrl.includes('output=embed') || rawUrl.includes('pb=');

      let embedSrc = rawUrl;
      let canShowIframe = false;

      if (looksLikeEmbed) {
        embedSrc = rawUrl;
        canShowIframe = true;
      } else if (isGoogleMapsLink && rawUrl.includes('google.com/maps')) {
        // Tự động chuyển link chia sẻ thông thường thành link nhúng để hiển thị iframe
        const sep = rawUrl.includes('?') ? '&' : '?';
        embedSrc = rawUrl + sep + 'output=embed';
        canShowIframe = true;
      }

      const externalLink = rawUrl; // luôn mở link gốc người dùng paste

      if (canShowIframe) {
        return `
          <div class="post-map reveal-up" style="margin: 2rem 0 1rem;">
            <h3 style="font-size: 1.1rem; margin-bottom: 0.6rem;">📍 Vị trí / Bản đồ</h3>
            <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); background: #eee;">
              <iframe 
                src="${BlogCore.escapeAttr(embedSrc)}" 
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 12px;"
                allowfullscreen 
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                title="Bản đồ Google Maps">
              </iframe>
            </div>
            <div style="margin-top: 0.4rem; text-align: right;">
              <a href="${BlogCore.escapeAttr(externalLink)}" target="_blank" rel="noopener" style="font-size: 0.9em; text-decoration: underline;">Mở Google Maps ↗</a>
            </div>
          </div>
        `;
      } else {
        // Link chia sẻ ngắn (maps.app.goo.gl) hoặc link không phải Google Maps → chỉ hiện nút
        return `
          <div class="post-map reveal-up" style="margin: 2rem 0 1rem; padding: 1rem; background: #f8f8f8; border-radius: 12px; border: 1px solid #eee;">
            <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem;">📍 Vị trí / Bản đồ</h3>
            <a href="${BlogCore.escapeAttr(externalLink)}" target="_blank" rel="noopener" class="btn-secondary" style="display:inline-block; padding: 0.6rem 1rem; font-size: 0.95em;">
              Xem bản đồ trên Google Maps ↗
            </a>
            <div style="margin-top: 0.4rem; font-size: 0.85em; opacity: 0.7;">
              (Dán link nhúng embed từ Google Maps để hiển thị bản đồ trực tiếp trên trang)
            </div>
          </div>
        `;
      }
    })() : ''}

    <div class="post-detail-footer reveal-up">
      <a href="posts.html" class="btn-secondary">← ${I18n.t('post.backToList')}</a>
    </div>
  `;

  Comments.mount(post);
  if (typeof Effects !== 'undefined') Effects.refresh();
}

initPostDetail();