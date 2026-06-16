let currentCategory = null;

async function initProductsPage() {
  await BlogCore.initPublic(renderAll);
  renderAll();
}

function renderAll() {
  renderCategories();
  renderProducts();
}

function renderCategories() {
  const container = BlogCore.$('#category-filters');
  if (!container) return;
  const shopCategories = BlogCore.data().shop?.categories || [];
  const allLabel = I18n.t('filter.all');

  container.innerHTML = [
    { key: '', label: allLabel },
    ...shopCategories.map((cat) => ({ key: cat, label: BlogCore.locCategory(cat) }))
  ].map(({ key, label }) => {
    const active = key === '' ? currentCategory === null : currentCategory === key;
    return `<button class="filter-btn ${active ? 'active' : ''}" data-cat="${BlogCore.escapeAttr(key)}">${BlogCore.escapeHtml(label)}</button>`;
  }).join('');

  container.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentCategory = btn.dataset.cat || null;
      renderCategories();
      renderProducts();
    });
  });
}

function renderProducts() {
  const grid = BlogCore.$('#products-grid');
  if (!grid) return;
  grid.innerHTML = '';

  let products = BlogCore.getPublishedProducts();
  if (currentCategory) {
    products = products.filter((p) => p.category === currentCategory);
  }

  BlogCore.$('#products-count').textContent = I18n.t('shop.productsCount', { n: products.length });
  products.forEach((product, i) => grid.appendChild(BlogCore.buildProductCard(product, { large: true, index: i })));
  if (typeof Effects !== 'undefined') Effects.refresh();
}

initProductsPage();