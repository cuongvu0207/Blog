const BlogCore = (() => {
  const THEME_KEY = 'ctech-theme';
  let data = {};
  let themes = {};
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const getBase = () => document.body?.dataset?.base || '';
  const getApiBase = () => (typeof window !== 'undefined' && window.API_BASE) || '';

  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    return saved && themes[saved] ? saved : null;
  }

  function setPreferredTheme(themeId) {
    if (themeId) localStorage.setItem(THEME_KEY, themeId);
  }

  function resolveTheme() {
    return getPreferredTheme() || data.theme || 'ocean';
  }

  function getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }

  function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const target = keys.reduce((o, k) => o[k], obj);
    target[last] = value;
  }

  function loc(value) {
    return typeof I18n !== 'undefined' ? I18n.localize(value) : (value?.vi || value || '');
  }

  function formatDate(dateStr) {
    const locale = typeof I18n !== 'undefined' ? I18n.localeTag() : 'vi-VN';
    return new Date(dateStr).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  async function loadData() {
    const base = getBase();
    const apiBase = getApiBase();
    const dataBase = apiBase || base;
    const bust = Date.now();
    const fetchOpts = { cache: 'no-store' };
    const [dataRes, themesRes] = await Promise.all([
      fetch(`${dataBase}data.json?_=${bust}`, fetchOpts),
      fetch(`${dataBase}themes.json?_=${bust}`, fetchOpts)
    ]);
    if (!dataRes.ok) throw new Error(`data.json HTTP ${dataRes.status}`);
    if (!themesRes.ok) throw new Error(`themes.json HTTP ${themesRes.status}`);
    data = await dataRes.json();
    themes = await themesRes.json();
    return { data, themes };
  }

  async function refreshData(onRerender) {
    try {
      await loadData();
      applyTheme(resolveTheme());
      populateThemeSelect();
      renderSiteFields();
      onRerender?.();
      if (typeof ContactBubble !== 'undefined') {
        if (document.getElementById('contact-island')) ContactBubble.renderActions();
        else ContactBubble.init();
      }
      return true;
    } catch {
      return false;
    }
  }

  function applyTheme(themeId) {
    const theme = themes[themeId];
    if (!theme) return;
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, val]) => {
      root.style.setProperty(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, val);
    });
    root.style.setProperty('--font', theme.font);
    root.style.setProperty('--radius', theme.radius);
    try {
      localStorage.setItem('ctech-theme-cache', JSON.stringify({
        colors: theme.colors, font: theme.font, radius: theme.radius
      }));
    } catch { /* ignore */ }
  }

  function themeLabel(id) {
    if (typeof I18n !== 'undefined') {
      return I18n.themeName(id, themes[id]?.name || id);
    }
    return themes[id]?.name || id;
  }

  function locCategory(key) {
    const labels = data.shop?.categoryLabels?.[key];
    return labels ? loc(labels) : key;
  }

  function populateThemeSelect() {
    const select = $('#theme-select');
    if (!select) return;
    const current = resolveTheme();
    select.innerHTML = '';
    Object.keys(themes).forEach((id) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = themeLabel(id);
      if (id === current) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function renderSiteFields() {
    $$('[data-field]').forEach((el) => {
      const value = getNestedValue(data, el.dataset.field);
      if (value !== undefined) el.textContent = loc(value);
    });
    const logo = $('.logo-text[data-field]') || $('.logo[data-field]');
    if (logo) document.title = logo.textContent || 'CTECH';
  }

  function showToast(message, type = '') {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type}`;
    setTimeout(() => toast.classList.add('hidden'), 3000);
    toast.classList.remove('hidden');
  }

  function apiHeaders(extra = {}) {
    const headers = { ...extra };
    if (typeof AdminAuth !== 'undefined') Object.assign(headers, AdminAuth.authHeaders());
    return headers;
  }

  function handleUnauthorized() {
    if (typeof AdminAuth === 'undefined') return false;
    AdminAuth.clear();
    const base = document.body.dataset.base || '';
    window.location.href = `${base}admin/login.html`;
    return true;
  }

  async function uploadImage(file) {
    const base = getBase();
    const apiBase = getApiBase();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${apiBase}${base}api/upload`, { method: 'POST', headers: apiHeaders(), body: formData });
    if (res.status === 401) { handleUnauthorized(); throw new Error(I18n.t('admin.login.required')); }
    const result = await res.json();
    if (!result.ok) throw new Error(result.error || 'Upload failed');
    return result.url;
  }

  async function saveData() {
    const base = getBase();
    const apiBase = getApiBase();
    try {
      const res = await fetch(`${apiBase}${base}api/save`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data, null, 2)
      });
      if (res.status === 401) {
        handleUnauthorized();
        showToast(I18n.t('admin.login.required'), 'error');
        return false;
      }
      const result = await res.json();
      if (result.ok) {
        showToast(I18n.t('toast.saved'), 'success');
        return true;
      }
      showToast(result.error || I18n.t('toast.serverError'), 'error');
    } catch {
      showToast(I18n.t('toast.serverError'), 'error');
    }
    return false;
  }

  function updateImagePreview(url, previewEl) {
    if (!previewEl) return;
    if (url) { previewEl.src = url; previewEl.classList.remove('hidden'); }
    else previewEl.classList.add('hidden');
  }

  function formatPrice(n) {
    const locale = typeof I18n !== 'undefined' ? I18n.localeTag() : 'vi-VN';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'VND' }).format(n);
  }

  function getPublishedPosts() {
    return (data.posts || []).filter((p) => p.published !== false);
  }

  function getPostById(id) {
    return (data.posts || []).find((p) => p.id === id);
  }

  function getPublishedProducts() {
    return (data.products || []).filter((p) => p.published !== false);
  }

  function getProductById(id) {
    return (data.products || []).find((p) => p.id === id);
  }

  function getProductSpecs(product) {
    const s = product.specs;
    if (Array.isArray(s)) return s;
    if (s && typeof s === 'object') {
      const lang = typeof I18n !== 'undefined' ? I18n.lang() : 'vi';
      return s[lang] || s.en || s.vi || [];
    }
    return [];
  }

  function buildPostCard(post, options = {}) {
    const { large = false, index = 0 } = options;
    const card = document.createElement('article');
    card.className = large ? 'post-card post-card-large' : 'post-card';
    card.style.transitionDelay = `${index * 0.1}s`;
    const title = loc(post.title);

    const reviewTarget = loc(post.reviewTarget);
    const ratingHtml = post.rating
      ? `<span class="post-card-rating">${post.rating}/10</span>`
      : '';
    const commentsHtml = post.comments?.length
      ? `<span class="post-card-comments">💬 ${post.comments.length}</span>`
      : '';
    const authorHtml = post.authorName
      ? `<span class="post-card-author">✍️ ${escapeHtml(post.authorName)}</span>`
      : '';

    card.innerHTML = `
      ${post.image ? `<div class="post-image-wrap"><img class="post-card-image" src="${escapeAttr(post.image)}" alt="${escapeAttr(title)}"><div class="post-image-overlay"></div>${ratingHtml ? `<div class="post-card-rating-wrap">${ratingHtml}</div>` : ''}</div>` : ''}
      <div class="post-card-body">
        <div class="post-card-meta">
          <span class="post-date">${formatDate(post.date)}</span>
          ${authorHtml}
          ${commentsHtml}
        </div>
        ${reviewTarget ? `<div class="post-card-target">${escapeHtml(reviewTarget)}</div>` : ''}
        <h3>${escapeHtml(title)}</h3>
        <p class="post-excerpt">${escapeHtml(loc(post.excerpt))}</p>
        <div class="post-tags">${(post.tags || []).map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
        ${large ? `<span class="read-more">${I18n.t('post.readMore')} →</span>` : ''}
      </div>
    `;

    card.addEventListener('click', () => {
      window.location.href = `post.html?id=${post.id}`;
    });

    if (typeof Effects !== 'undefined') Effects.tiltCard(card);
    return card;
  }

  function buildProductCard(product, options = {}) {
    const { large = false, index = 0 } = options;
    const card = document.createElement('article');
    card.className = large ? 'product-card product-card-large' : 'product-card';
    card.style.transitionDelay = `${index * 0.1}s`;
    const name = loc(product.name);
    const price = product.salePrice || product.price;
    const hasSale = product.salePrice && product.salePrice < product.price;

    card.innerHTML = `
      <div class="product-image-wrap">
        <img class="product-image" src="${escapeAttr(product.image)}" alt="${escapeAttr(name)}">
        ${!product.inStock ? `<span class="product-badge out-of-stock">${I18n.t('product.outOfStock')}</span>` : ''}
        ${product.featured ? `<span class="product-badge featured">${I18n.t('product.featured')}</span>` : ''}
        ${hasSale ? `<span class="product-badge sale">${I18n.t('product.sale')}</span>` : ''}
      </div>
      <div class="product-body">
        <span class="product-category">${escapeHtml(locCategory(product.category))}</span>
        <h3>${escapeHtml(name)}</h3>
        <div class="product-prices">
          <span class="product-price">${formatPrice(price)}</span>
          ${hasSale ? `<span class="product-old-price">${formatPrice(product.price)}</span>` : ''}
        </div>
        <p class="product-desc">${escapeHtml(loc(product.description))}</p>
        <div class="product-actions">
          <button class="btn-add-cart" data-id="${product.id}" ${!product.inStock ? 'disabled' : ''}>
            ${product.inStock ? `🛒 ${I18n.t('product.addToCart')}` : I18n.t('product.outOfStock')}
          </button>
          <span class="read-more">${I18n.t('product.viewDetail')} →</span>
        </div>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-add-cart')) return;
      window.location.href = `product.html?id=${product.id}`;
    });

    card.querySelector('.btn-add-cart')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (product.inStock && typeof Cart !== 'undefined') Cart.add(product);
    });

    if (typeof Effects !== 'undefined') Effects.tiltCard(card);
    return card;
  }

  function bindPublicEvents(onRerender) {
    if (document.body.dataset.publicBound) return;
    document.body.dataset.publicBound = 'true';

    $('#theme-select')?.addEventListener('change', async (e) => {
      const themeId = e.target.value;
      data.theme = themeId;
      setPreferredTheme(themeId);
      applyTheme(themeId);
      await saveData();
      showToast(I18n.t('toast.themeChanged'), 'success');
    });

    document.addEventListener('i18n:changed', () => {
      populateThemeSelect();
      renderSiteFields();
      onRerender?.();
      I18n.applyDOM();
    });


  }

  async function initPublic(onRerender) {
    if (typeof I18n !== 'undefined') await I18n.init();
    await loadData();
    applyTheme(resolveTheme());
    populateThemeSelect();
    renderSiteFields();
    bindPublicEvents(onRerender);
    if (typeof ContactBubble !== 'undefined') ContactBubble.init();
    if (typeof UserAuth !== 'undefined') UserAuth.init();

    const reload = () => refreshData(onRerender);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reload();
    });
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) reload();
    });
  }

  async function initAdmin() {
    document.body.dataset.base = document.body.dataset.base || '../';
    if (typeof I18n !== 'undefined') await I18n.init();
    await loadData();
    applyTheme(resolveTheme());
    I18n.applyDOM();
    if (typeof AdminAuth !== 'undefined') AdminAuth.bindLogout();
  }

  return {
    $, $$, data: () => data, loc,
    getNestedValue, setNestedValue, formatDate, formatPrice,
    escapeHtml, escapeAttr, uploadImage, saveData, refreshData, updateImagePreview,
    getPublishedPosts, getPostById, getPublishedProducts, getProductById,
    getProductSpecs, buildPostCard, buildProductCard,
    renderSiteFields, showToast, applyTheme, setPreferredTheme, resolveTheme,
    themeLabel, locCategory, populateThemeSelect,
    initPublic, initAdmin
  };
})();