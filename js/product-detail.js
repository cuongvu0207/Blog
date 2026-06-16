async function initProductDetail() {
  await BlogCore.initPublic(renderProduct);
  renderProduct();
}

function renderProduct() {
  const id = new URLSearchParams(window.location.search).get('id');
  const product = BlogCore.getProductById(id);
  const container = BlogCore.$('#product-detail');

  if (!product) {
    container.innerHTML = `
      <div class="post-not-found">
        <h2>${I18n.t('product.notFound')}</h2>
        <a href="products.html" class="btn-primary">← ${I18n.t('product.backToList')}</a>
      </div>
    `;
    return;
  }

  const name = BlogCore.loc(product.name);
  document.title = `${name} — ${BlogCore.loc(BlogCore.data().site.title)}`;
  const price = product.salePrice || product.price;
  const hasSale = product.salePrice && product.salePrice < product.price;
  const specs = BlogCore.getProductSpecs(product);

  container.innerHTML = `
    <a href="products.html" class="back-link">← ${I18n.t('product.backToList')}</a>
    <div class="product-detail-layout">
      <div class="product-detail-gallery reveal-left">
        <img src="${BlogCore.escapeAttr(product.image)}" alt="${BlogCore.escapeAttr(name)}">
        ${!product.inStock ? `<span class="product-badge out-of-stock">${I18n.t('product.outOfStock')}</span>` : ''}
      </div>
      <div class="product-detail-info reveal-right">
        <span class="product-category">${BlogCore.escapeHtml(BlogCore.locCategory(product.category))}</span>
        <h1>${BlogCore.escapeHtml(name)}</h1>
        <div class="product-prices product-prices-large">
          <span class="product-price">${BlogCore.formatPrice(price)}</span>
          ${hasSale ? `<span class="product-old-price">${BlogCore.formatPrice(product.price)}</span>` : ''}
        </div>
        <p class="product-detail-desc">${BlogCore.escapeHtml(BlogCore.loc(product.description))}</p>
        <ul class="product-specs">${specs.map((s) => `<li>${BlogCore.escapeHtml(s)}</li>`).join('')}</ul>
        <div class="product-detail-actions">
          <button class="btn-primary btn-add-cart-lg" id="btn-add-cart-detail" ${!product.inStock ? 'disabled' : ''}>
            ${product.inStock ? `🛒 ${I18n.t('product.addToCartLg')}` : I18n.t('product.outOfStock')}
          </button>
        </div>
        <div class="product-contact">
          <p>${I18n.t('product.contactOrder')}:</p>
          <a href="tel:${BlogCore.data().shop?.phone}" class="social-btn">📞 ${BlogCore.data().shop?.phone}</a>
          <a href="https://zalo.me/${BlogCore.data().shop?.zalo}" target="_blank" class="social-btn">💬 Zalo</a>
        </div>
      </div>
    </div>
  `;

  BlogCore.$('#btn-add-cart-detail')?.addEventListener('click', () => {
    if (product.inStock) Cart.add(product);
  });
  if (typeof Effects !== 'undefined') Effects.refresh();
}

initProductDetail();