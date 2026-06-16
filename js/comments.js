const Comments = (() => {
  async function submit(postId, name, content) {
    const base = document.body.dataset.base || '';
    const headers = { 'Content-Type': 'application/json', ...(typeof UserAuth !== 'undefined' ? UserAuth.authHeaders() : {}) };
    const apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
    const res = await fetch(`${apiBase}${base}api/comment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ postId, name, content })
    });
    const result = await res.json();
    if (!res.ok || !result.ok) throw new Error(result.error || I18n.t('comments.error'));
    return result.comment;
  }

  function renderList(post) {
    const items = (post.comments || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (!items.length) {
      return `<p class="comments-empty">${I18n.t('comments.empty')}</p>`;
    }
    return items.map((c) => `
      <article class="comment-item">
        <div class="comment-meta">
          <strong class="comment-author">${BlogCore.escapeHtml(c.name)}</strong>
          <time class="comment-date">${BlogCore.formatDate(c.date?.slice(0, 10) || new Date().toISOString().slice(0, 10))}</time>
        </div>
        <p class="comment-body">${BlogCore.escapeHtml(c.content).replace(/\n/g, '<br>')}</p>
      </article>
    `).join('');
  }

  function mount(post) {
    const section = document.getElementById('comments-section');
    if (!section || !post) return;

    section.hidden = false;
    const user = typeof UserAuth !== 'undefined' ? UserAuth.getUser() : null;
    const defaultName = user?.displayName || '';
    section.innerHTML = `
      <h2 class="comments-title">${I18n.t('comments.title')} <span class="comments-count">(${post.comments?.length || 0})</span></h2>
      <div class="comments-list" id="comments-list">${renderList(post)}</div>
      <form class="comment-form" id="comment-form">
        <h3 class="comment-form-title">${I18n.t('comments.formTitle')}</h3>
        <label class="${user ? 'hidden' : ''}">
          <span>${I18n.t('comments.name')}</span>
          <input type="text" id="comment-name" maxlength="80" ${user ? '' : 'required'} autocomplete="name" value="${BlogCore.escapeAttr(defaultName)}">
        </label>
        ${user ? `<p class="comments-as-user">${I18n.t('comments.asUser', { name: user.displayName })}</p>` : `<p class="comments-guest-hint"><a href="account.html">${I18n.t('user.login')}</a> ${I18n.t('comments.loginHint')}</p>`}
        <label>
          <span>${I18n.t('comments.content')}</span>
          <textarea id="comment-content" rows="4" maxlength="2000" required></textarea>
        </label>
        <button type="submit" class="btn-primary">${I18n.t('comments.submit')}</button>
      </form>
    `;

    section.querySelector('#comment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameEl = section.querySelector('#comment-name');
      const name = (nameEl?.value || user?.displayName || '').trim();
      const content = section.querySelector('#comment-content').value.trim();
      if (!name || !content) return;

      const btn = section.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        const comment = await submit(post.id, name, content);
        if (!post.comments) post.comments = [];
        post.comments.push(comment);
        section.querySelector('#comments-list').innerHTML = renderList(post);
        section.querySelector('.comments-count').textContent = `(${post.comments.length})`;
        section.querySelector('#comment-content').value = '';
        BlogCore.showToast(I18n.t('comments.sent'), 'success');
      } catch (err) {
        BlogCore.showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    if (typeof Effects !== 'undefined') Effects.refresh();
  }

  return { mount, submit, renderList };
})();