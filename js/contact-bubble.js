const ContactBubble = (() => {
  let open = false;

  const BRAND_ICONS = {
    zalo: 'assets/icons/zalo.svg',
    telegram: 'assets/icons/telegram.svg'
  };

  function iconBase() {
    return document.body?.dataset?.base || '';
  }

  function channelIcon(ch) {
    const brand = BRAND_ICONS[ch.id];
    if (brand) {
      return `<img src="${BlogCore.escapeAttr(iconBase() + brand)}" alt="" class="contact-brand-icon" width="24" height="24">`;
    }
    return `<span class="contact-icon-emoji" aria-hidden="true">${ch.icon}</span>`;
  }

  function channels() {
    const profile = BlogCore.data().profile || {};
    const extra = BlogCore.data().contact || {};
    const shop = BlogCore.data().shop || {};
    const phone = extra.phone || shop.phone;
    const zalo = extra.zalo || shop.zalo;
    const list = [];

    if (phone) {
      list.push({
        id: 'phone',
        icon: '📞',
        label: I18n.t('contactBubble.call'),
        href: `tel:${phone}`,
        external: false
      });
    }
    if (zalo) {
      list.push({
        id: 'zalo',
        icon: '',
        label: 'Zalo',
        href: `https://zalo.me/${zalo.replace(/\D/g, '')}`,
        external: true
      });
    }
    if (extra.telegram) {
      const handle = extra.telegram.replace(/^@/, '').trim();
      list.push({
        id: 'telegram',
        icon: '',
        label: 'Telegram',
        href: `https://t.me/${handle}`,
        external: true
      });
    }
    if (extra.messenger) {
      list.push({
        id: 'messenger',
        icon: '💙',
        label: 'Messenger',
        href: extra.messenger.startsWith('http') ? extra.messenger : `https://m.me/${extra.messenger}`,
        external: true
      });
    }
    if (extra.whatsapp) {
      const digits = extra.whatsapp.replace(/\D/g, '');
      list.push({
        id: 'whatsapp',
        icon: '📱',
        label: 'WhatsApp',
        href: `https://wa.me/${digits}`,
        external: true
      });
    }
    if (profile.email) {
      list.push({
        id: 'email',
        icon: '📧',
        label: I18n.t('contactBubble.email'),
        href: `mailto:${profile.email}`,
        external: false
      });
    }

    return list;
  }

  function mount() {
    if (document.getElementById('contact-island')) return;
    const root = document.createElement('div');
    root.id = 'contact-island';
    root.className = 'contact-island';
    root.innerHTML = `
      <button type="button" class="contact-island-bar" id="contact-island-toggle" aria-expanded="false" aria-controls="contact-island-body">
        <span class="contact-island-mark" aria-hidden="true">💬</span>
        <span class="contact-island-label" data-i18n="contactBubble.title">Liên hệ nhanh</span>
        <span class="contact-island-chevron" aria-hidden="true"></span>
      </button>
      <div class="contact-island-body" id="contact-island-body">
        <div class="contact-island-actions" id="contact-island-actions"></div>
      </div>
    `;
    document.body.appendChild(root);
    bindEvents();
    renderActions();
    I18n.applyDOM();
  }

  function renderActions() {
    const container = document.getElementById('contact-island-actions');
    const root = document.getElementById('contact-island');
    if (!container || !root) return;

    const items = channels();
    if (!items.length) {
      root.classList.add('hidden');
      return;
    }
    root.classList.remove('hidden');

    container.innerHTML = items.map((ch, i) => `
      <a href="${BlogCore.escapeAttr(ch.href)}"
         class="contact-island-action contact-island-action--${ch.id}"
         style="--action-delay:${i * 0.04}s"
         ${ch.external ? 'target="_blank" rel="noopener noreferrer"' : ''}>
        <span class="contact-island-action-icon" aria-hidden="true">${channelIcon(ch)}</span>
        <span class="contact-island-action-label">${BlogCore.escapeHtml(ch.label)}</span>
      </a>
    `).join('');
  }

  function setOpen(next) {
    open = next;
    const root = document.getElementById('contact-island');
    const toggle = document.getElementById('contact-island-toggle');
    if (!root || !toggle) return;

    root.classList.toggle('contact-island--open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  function bindEvents() {
    const toggle = document.getElementById('contact-island-toggle');

    toggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(!open);
    });

    document.addEventListener('click', (e) => {
      if (!open) return;
      const root = document.getElementById('contact-island');
      if (root && !root.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) setOpen(false);
    });

    document.addEventListener('i18n:changed', () => {
      renderActions();
      I18n.applyDOM();
    });
  }

  function init() {
    if (document.body.dataset.page?.startsWith('admin')) return;
    mount();
  }

  return { init, renderActions };
})();