const Cart = (() => {
  const KEY = 'ctech-cart';
  let items = [];

  function load() {
    try { items = JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { items = []; }
    updateBadge();
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(items));
    updateBadge();
  }

  function updateBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const total = items.reduce((s, i) => s + i.qty, 0);
    badge.textContent = total;
    badge.classList.toggle('hidden', total === 0);
  }

  function add(product, qty = 1) {
    const name = BlogCore.loc(product.name);
    const existing = items.find((i) => i.id === product.id);
    if (existing) existing.qty += qty;
    else items.push({ id: product.id, name, price: product.salePrice || product.price, image: product.image, qty });
    save();
    BlogCore.showToast(I18n.t('toast.addedToCart', { name }), 'success');
  }

  function remove(id) {
    items = items.filter((i) => i.id !== id);
    save();
    renderCart();
  }

  function setQty(id, qty) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (qty <= 0) remove(id);
    else { item.qty = qty; save(); renderCart(); }
  }

  function total() {
    return items.reduce((s, i) => s + i.price * i.qty, 0);
  }

  function open() {
    Modal.open('cart-modal');
    renderCart();
    I18n.applyDOM();
  }

  function close() {
    Modal.close('cart-modal');
  }

  function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if (!container) return;

    if (!items.length) {
      container.innerHTML = `<p class="cart-empty">${I18n.t('cart.empty')}</p>`;
      if (totalEl) totalEl.textContent = BlogCore.formatPrice(0);
      return;
    }

    container.innerHTML = items.map((item) => `
      <div class="cart-item">
        <img src="${BlogCore.escapeAttr(item.image)}" alt="">
        <div class="cart-item-info">
          <div class="cart-item-name">${BlogCore.escapeHtml(item.name)}</div>
          <div class="cart-item-price">${BlogCore.formatPrice(item.price)}</div>
          <div class="cart-item-qty">
            <button data-action="minus" data-id="${item.id}">−</button>
            <span>${item.qty}</span>
            <button data-action="plus" data-id="${item.id}">+</button>
          </div>
        </div>
        <button class="cart-item-remove" data-id="${item.id}">✕</button>
      </div>
    `).join('');

    if (totalEl) totalEl.textContent = BlogCore.formatPrice(total());

    container.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = items.find((i) => i.id === btn.dataset.id);
        if (item) setQty(item.id, btn.dataset.action === 'plus' ? item.qty + 1 : item.qty - 1);
      });
    });
    container.querySelectorAll('.cart-item-remove').forEach((btn) => {
      btn.addEventListener('click', () => remove(btn.dataset.id));
    });
  }

  function checkout() {
    if (!items.length) { BlogCore.showToast(I18n.t('cart.empty'), 'error'); return; }
    const shop = BlogCore.data().shop || {};
    const lines = items.map((i) => `• ${i.name} x${i.qty} = ${BlogCore.formatPrice(i.price * i.qty)}`);
    const msg = `CTECH Order:\n\n${lines.join('\n')}\n\nTotal: ${BlogCore.formatPrice(total())}`;

    document.getElementById('checkout-info').innerHTML = `
      <p class="checkout-summary">${BlogCore.escapeHtml(msg).replace(/\n/g, '<br>')}</p>
      <div class="checkout-actions">
        ${shop.phone ? `<a href="tel:${shop.phone}" class="btn-primary">📞 ${I18n.t('checkout.call')} ${shop.phone}</a>` : ''}
        ${shop.zalo ? `<a href="https://zalo.me/${shop.zalo}" target="_blank" class="btn-secondary">💬 ${I18n.t('checkout.zalo')}</a>` : ''}
        <button class="btn-secondary" id="btn-copy-order">📋 ${I18n.t('checkout.copy')}</button>
      </div>
    `;

    close();
    Modal.open('checkout-modal');
    document.getElementById('btn-copy-order')?.addEventListener('click', () => {
      navigator.clipboard.writeText(msg);
      BlogCore.showToast(I18n.t('toast.copied'), 'success');
    });
  }

  function bindEvents() {
    if (document.body.dataset.cartBound) return;
    document.body.dataset.cartBound = 'true';
    document.getElementById('btn-cart')?.addEventListener('click', open);
    Modal.bind('cart-modal');
    document.getElementById('btn-checkout')?.addEventListener('click', checkout);
    Modal.bind('checkout-modal');
    document.addEventListener('i18n:changed', renderCart);
    load();
  }

  return { add, open, close, bindEvents, load };
})();