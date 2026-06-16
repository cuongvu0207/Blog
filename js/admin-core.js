const AdminCore = (() => {
  let editingPostId = null;
  let editingProductId = null;
  let commentsPostId = null;

  function getLocField(obj, field) {
    const val = obj[field];
    if (val && typeof val === 'object' && ('vi' in val || 'en' in val)) return val;
    return { vi: val || '', en: '' };
  }

  function setLocField(obj, field, vi, en) {
    obj[field] = I18n.makeLocalized(vi, en || vi);
  }

  function getSpecs(product) {
    const s = product.specs;
    if (Array.isArray(s)) return s;
    if (s && typeof s === 'object') return s.vi || [];
    return [];
  }

  function getSpecsEn(product) {
    const s = product.specs;
    if (s && typeof s === 'object' && !Array.isArray(s)) return s.en || [];
    return [];
  }

  function openEditPostModal(postId) {
    editingPostId = postId;
    const isNew = postId === 'new';
    const post = isNew
      ? { title: { vi: '', en: '' }, excerpt: { vi: '', en: '' }, content: { vi: '', en: '' }, image: '', date: new Date().toISOString().slice(0, 10), tags: [] }
      : BlogCore.getPostById(postId);

    const title = getLocField(post, 'title');
    const excerpt = getLocField(post, 'excerpt');
    const content = getLocField(post, 'content');
    const reviewTarget = getLocField(post, 'reviewTarget');

    BlogCore.$('#edit-post-title').textContent = isNew ? I18n.t('admin.newPost') : I18n.t('admin.editPost');
    BlogCore.$('#edit-title').value = title.vi;
    BlogCore.$('#edit-title-en').value = title.en;
    BlogCore.$('#edit-excerpt').value = excerpt.vi;
    BlogCore.$('#edit-excerpt-en').value = excerpt.en;
    BlogCore.$('#edit-content').value = content.vi;
    BlogCore.$('#edit-content-en').value = content.en;
    BlogCore.$('#edit-date').value = post.date;
    BlogCore.$('#edit-tags').value = (post.tags || []).join(', ');
    BlogCore.$('#edit-rating').value = post.rating ?? '';
    BlogCore.$('#edit-review-target').value = reviewTarget.vi;
    BlogCore.$('#edit-review-target-en').value = reviewTarget.en;
    BlogCore.$('#edit-image').value = post.image || '';
    BlogCore.updateImagePreview(post.image, BlogCore.$('#edit-image-preview'));
    BlogCore.$('#btn-delete-post')?.classList.toggle('hidden', isNew);
    Modal.open('edit-post-modal');
  }

  function closeEditPostModal() {
    Modal.close('edit-post-modal');
    editingPostId = null;
  }

  function openEditProductModal(productId) {
    editingProductId = productId;
    const isNew = productId === 'new';
    const p = isNew
      ? { name: { vi: '', en: '' }, category: 'Phụ kiện', price: 0, salePrice: 0, image: '', description: { vi: '', en: '' }, specs: { vi: [], en: [] }, inStock: true, featured: false }
      : BlogCore.getProductById(productId);

    const name = getLocField(p, 'name');
    const desc = getLocField(p, 'description');

    BlogCore.$('#edit-product-title').textContent = isNew ? I18n.t('admin.newProduct') : I18n.t('admin.editProduct');
    BlogCore.$('#edit-product-name').value = name.vi;
    BlogCore.$('#edit-product-name-en').value = name.en;
    BlogCore.$('#edit-product-category').value = p.category;
    BlogCore.$('#edit-product-price').value = p.price;
    BlogCore.$('#edit-product-sale').value = p.salePrice || '';
    BlogCore.$('#edit-product-image').value = p.image || '';
    BlogCore.$('#edit-product-desc').value = desc.vi;
    BlogCore.$('#edit-product-desc-en').value = desc.en;
    BlogCore.$('#edit-product-specs').value = getSpecs(p).join('\n');
    BlogCore.$('#edit-product-specs-en').value = getSpecsEn(p).join('\n');
    BlogCore.$('#edit-product-stock').checked = p.inStock !== false;
    BlogCore.$('#edit-product-featured').checked = !!p.featured;
    BlogCore.updateImagePreview(p.image, BlogCore.$('#edit-product-image-preview'));
    BlogCore.$('#btn-delete-product')?.classList.toggle('hidden', isNew);
    Modal.open('edit-product-modal');
  }

  function closeEditProductModal() {
    Modal.close('edit-product-modal');
    editingProductId = null;
  }

  function bindPostAdmin(onChange) {
    BlogCore.$('#btn-add-post')?.addEventListener('click', () => openEditPostModal('new'));
    BlogCore.$('#btn-cancel-edit-post')?.addEventListener('click', closeEditPostModal);
    Modal.bind('edit-post-modal', { closeBtn: false, onClose: () => { editingPostId = null; } });

    BlogCore.$('#btn-confirm-edit-post')?.addEventListener('click', async () => {
      const titleVi = BlogCore.$('#edit-title').value.trim();
      if (!titleVi) { BlogCore.showToast(I18n.t('admin.field.title'), 'error'); return; }

      const ratingVal = parseFloat(BlogCore.$('#edit-rating').value);
      const postData = {
        title: I18n.makeLocalized(titleVi, BlogCore.$('#edit-title-en').value.trim()),
        excerpt: I18n.makeLocalized(BlogCore.$('#edit-excerpt').value.trim(), BlogCore.$('#edit-excerpt-en').value.trim()),
        content: I18n.makeLocalized(BlogCore.$('#edit-content').value.trim(), BlogCore.$('#edit-content-en').value.trim()),
        reviewTarget: I18n.makeLocalized(
          BlogCore.$('#edit-review-target').value.trim(),
          BlogCore.$('#edit-review-target-en').value.trim()
        ),
        image: BlogCore.$('#edit-image').value.trim(),
        date: BlogCore.$('#edit-date').value,
        tags: BlogCore.$('#edit-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
        rating: Number.isFinite(ratingVal) && ratingVal >= 0 && ratingVal <= 10 ? ratingVal : null
      };

      const data = BlogCore.data();
      if (editingPostId === 'new') {
        data.posts.unshift({ id: 'post-' + Date.now(), ...postData, published: true, comments: [] });
      } else {
        const post = BlogCore.getPostById(editingPostId);
        if (post) {
          const comments = post.comments || [];
          Object.assign(post, postData);
          post.comments = comments;
        }
      }

      closeEditPostModal();
      if (await BlogCore.saveData()) onChange?.();
    });

    BlogCore.$('#btn-delete-post')?.addEventListener('click', async () => {
      if (!editingPostId || editingPostId === 'new') return;
      if (!confirm(I18n.t('admin.deletePostConfirm'))) return;
      const data = BlogCore.data();
      data.posts = data.posts.filter((p) => p.id !== editingPostId);
      closeEditPostModal();
      if (await BlogCore.saveData()) onChange?.();
    });

    bindPostImageUpload();
  }

  function bindProductAdmin(onChange) {
    BlogCore.$('#btn-add-product')?.addEventListener('click', () => openEditProductModal('new'));
    BlogCore.$('#btn-cancel-edit-product')?.addEventListener('click', closeEditProductModal);
    Modal.bind('edit-product-modal', { closeBtn: false, onClose: () => { editingProductId = null; } });

    BlogCore.$('#btn-confirm-edit-product')?.addEventListener('click', async () => {
      const nameVi = BlogCore.$('#edit-product-name').value.trim();
      if (!nameVi) { BlogCore.showToast(I18n.t('admin.field.name'), 'error'); return; }

      const specsVi = BlogCore.$('#edit-product-specs').value.split('\n').map((s) => s.trim()).filter(Boolean);
      const specsEn = BlogCore.$('#edit-product-specs-en').value.split('\n').map((s) => s.trim()).filter(Boolean);

      const productData = {
        name: I18n.makeLocalized(nameVi, BlogCore.$('#edit-product-name-en').value.trim()),
        category: BlogCore.$('#edit-product-category').value.trim() || 'Phụ kiện',
        price: parseInt(BlogCore.$('#edit-product-price').value, 10) || 0,
        salePrice: parseInt(BlogCore.$('#edit-product-sale').value, 10) || 0,
        image: BlogCore.$('#edit-product-image').value.trim(),
        description: I18n.makeLocalized(BlogCore.$('#edit-product-desc').value.trim(), BlogCore.$('#edit-product-desc-en').value.trim()),
        specs: (() => {
          const s = { vi: specsVi, en: specsEn.length ? specsEn : specsVi };
          const prevSpecs = editingProductId !== 'new' ? BlogCore.getProductById(editingProductId)?.specs : null;
          I18n.SUPPORTED.forEach((code) => {
            if (code === 'vi' || code === 'en') return;
            s[code] = (prevSpecs && prevSpecs[code]) || s.en;
          });
          return s;
        })(),
        inStock: BlogCore.$('#edit-product-stock').checked,
        featured: BlogCore.$('#edit-product-featured').checked
      };

      const data = BlogCore.data();
      if (editingProductId === 'new') {
        data.products = data.products || [];
        data.products.unshift({ id: 'prod-' + Date.now(), ...productData, published: true });
      } else {
        const prod = BlogCore.getProductById(editingProductId);
        if (prod) Object.assign(prod, productData);
      }

      closeEditProductModal();
      if (await BlogCore.saveData()) onChange?.();
    });

    BlogCore.$('#btn-delete-product')?.addEventListener('click', async () => {
      if (!editingProductId || editingProductId === 'new') return;
      if (!confirm(I18n.t('admin.deleteProductConfirm'))) return;
      const data = BlogCore.data();
      data.products = data.products.filter((p) => p.id !== editingProductId);
      closeEditProductModal();
      if (await BlogCore.saveData()) onChange?.();
    });

    bindProductImageUpload();
  }

  function bindPostImageUpload() {
    BlogCore.$('#edit-image')?.addEventListener('input', (e) => {
      BlogCore.updateImagePreview(e.target.value, BlogCore.$('#edit-image-preview'));
    });
    BlogCore.$('#btn-upload-post-image')?.addEventListener('click', () => BlogCore.$('#edit-image-file')?.click());
    BlogCore.$('#edit-image-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const url = await BlogCore.uploadImage(file);
        BlogCore.$('#edit-image').value = url;
        BlogCore.updateImagePreview(url, BlogCore.$('#edit-image-preview'));
        BlogCore.showToast(I18n.t('toast.uploadOk'), 'success');
      } catch (err) {
        BlogCore.showToast(err.message, 'error');
      }
    });
  }

  function bindProductImageUpload() {
    BlogCore.$('#edit-product-image')?.addEventListener('input', (e) => {
      BlogCore.updateImagePreview(e.target.value, BlogCore.$('#edit-product-image-preview'));
    });
    BlogCore.$('#btn-upload-product-image')?.addEventListener('click', () => BlogCore.$('#edit-product-image-file')?.click());
    BlogCore.$('#edit-product-image-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const url = await BlogCore.uploadImage(file);
        BlogCore.$('#edit-product-image').value = url;
        BlogCore.updateImagePreview(url, BlogCore.$('#edit-product-image-preview'));
        BlogCore.showToast(I18n.t('toast.uploadOk'), 'success');
      } catch (err) {
        BlogCore.showToast(err.message, 'error');
      }
    });
  }

  function renderCommentsList(postId) {
    const list = BlogCore.$('#admin-comments-list');
    if (!list) return;
    const post = BlogCore.getPostById(postId);
    if (!post) return;
    const comments = post.comments || [];
    if (!comments.length) {
      list.innerHTML = `<p class="admin-comments-empty">${I18n.t('comments.empty')}</p>`;
      return;
    }
    list.innerHTML = comments.map((c) => `
      <div class="admin-comment-row" data-id="${BlogCore.escapeAttr(c.id)}">
        <div class="admin-comment-info">
          <strong>${BlogCore.escapeHtml(c.name)}</strong>
          <span>${BlogCore.formatDate((c.date || '').slice(0, 10))}</span>
          <p>${BlogCore.escapeHtml(c.content)}</p>
        </div>
        <button type="button" class="btn-danger admin-delete-comment">✕</button>
      </div>
    `).join('');
    list.querySelectorAll('.admin-delete-comment').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('.admin-comment-row');
        const cmtId = row?.dataset.id;
        if (!cmtId || !confirm(I18n.t('admin.deleteCommentConfirm'))) return;
        post.comments = (post.comments || []).filter((c) => c.id !== cmtId);
        if (await BlogCore.saveData()) {
          renderCommentsList(postId);
          renderAdminPostList();
        }
      });
    });
  }

  function openCommentsModal(postId) {
    commentsPostId = postId;
    const post = BlogCore.getPostById(postId);
    if (!post) return;
    BlogCore.$('#comments-modal-title').textContent = I18n.t('admin.commentsFor', { title: I18n.localize(post.title) });
    renderCommentsList(postId);
    Modal.open('comments-modal');
  }

  function closeCommentsModal() {
    Modal.close('comments-modal');
    commentsPostId = null;
  }

  function bindCommentsAdmin() {
    BlogCore.$('#btn-close-comments')?.addEventListener('click', closeCommentsModal);
    Modal.bind('comments-modal', { onClose: () => { commentsPostId = null; } });
  }

  function renderAdminPostList() {
    const list = BlogCore.$('#admin-posts-list');
    if (!list) return;
    list.innerHTML = '';
    BlogCore.getPublishedPosts().concat(BlogCore.data().posts.filter((p) => p.published === false)).forEach((post) => {
      const row = document.createElement('div');
      row.className = 'admin-row';
      const cmtCount = post.comments?.length || 0;
      const ratingLabel = post.rating ? ` · ${post.rating}/10` : '';
      row.innerHTML = `
        <img src="${BlogCore.escapeAttr(post.image)}" alt="" class="admin-thumb">
        <div class="admin-row-info">
          <strong>${BlogCore.escapeHtml(I18n.localize(post.title))}</strong>
          <span>${BlogCore.formatDate(post.date)} · ${post.published === false ? I18n.t('admin.status.draft') : I18n.t('admin.status.published')}${ratingLabel} · 💬 ${cmtCount}${post.authorName ? ` · ✍️ ${BlogCore.escapeHtml(post.authorName)}` : ''}</span>
        </div>
        <div class="admin-row-actions">
          <button class="btn-secondary admin-comments-btn" data-id="${post.id}">💬 ${I18n.t('admin.comments')}</button>
          <button class="btn-secondary admin-edit-btn" data-id="${post.id}">✏️ ${I18n.t('admin.editPost')}</button>
        </div>
      `;
      row.querySelector('.admin-edit-btn').addEventListener('click', () => openEditPostModal(post.id));
      row.querySelector('.admin-comments-btn').addEventListener('click', () => openCommentsModal(post.id));
      list.appendChild(row);
    });
  }

  function renderAdminProductList() {
    const list = BlogCore.$('#admin-products-list');
    if (!list) return;
    list.innerHTML = '';
    (BlogCore.data().products || []).forEach((product) => {
      const row = document.createElement('div');
      row.className = 'admin-row';
      row.innerHTML = `
        <img src="${BlogCore.escapeAttr(product.image)}" alt="" class="admin-thumb">
        <div class="admin-row-info">
          <strong>${BlogCore.escapeHtml(I18n.localize(product.name))}</strong>
          <span>${BlogCore.formatPrice(product.salePrice || product.price)} · ${product.inStock ? I18n.t('admin.status.inStock') : I18n.t('admin.status.outOfStock')}</span>
        </div>
        <button class="btn-secondary admin-edit-btn" data-id="${product.id}">✏️ ${I18n.t('admin.editProduct')}</button>
      `;
      row.querySelector('.admin-edit-btn').addEventListener('click', () => openEditProductModal(product.id));
      list.appendChild(row);
    });
  }

  return {
    bindPostAdmin, bindProductAdmin, bindCommentsAdmin,
    renderAdminPostList, renderAdminProductList,
    openEditPostModal, openEditProductModal
  };
})();