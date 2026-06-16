async function initSiteAdmin() {
  await AdminAuth.requireAuth();
  await BlogCore.initAdmin();
  AdminAuth.bindLogout();
  populateForm();
  bindEvents();
  document.addEventListener('i18n:changed', populateThemeSelect);
}

function locVal(obj) {
  if (obj && typeof obj === 'object' && ('vi' in obj || 'en' in obj)) return obj;
  return { vi: obj || '', en: '' };
}

function populateForm() {
  const data = BlogCore.data();
  const profile = data.profile || {};
  const site = data.site || {};
  const blog = data.blog || {};
  const about = data.about || {};

  const name = locVal(profile.name);
  const title = locVal(profile.title);
  const bio = locVal(profile.bio);
  const location = locVal(profile.location);
  const siteTitle = locVal(site.title);
  const siteTagline = locVal(site.tagline);
  const siteFooter = locVal(site.footer);
  const blogTagline = locVal(blog.tagline);
  const aboutHeading = locVal(about.heading);

  BlogCore.$('#profile-name').value = name.vi;
  BlogCore.$('#profile-name-en').value = name.en;
  BlogCore.$('#profile-title').value = title.vi;
  BlogCore.$('#profile-title-en').value = title.en;
  BlogCore.$('#profile-bio').value = bio.vi;
  BlogCore.$('#profile-bio-en').value = bio.en;
  BlogCore.$('#profile-email').value = profile.email || '';
  BlogCore.$('#profile-location').value = location.vi;
  BlogCore.$('#profile-location-en').value = location.en;
  BlogCore.$('#profile-avatar').value = profile.avatar || '';
  BlogCore.$('#profile-cover').value = profile.coverImage || '';
  BlogCore.updateImagePreview(profile.avatar, BlogCore.$('#profile-avatar-preview'));
  BlogCore.updateImagePreview(profile.coverImage, BlogCore.$('#profile-cover-preview'));

  const social = profile.social || {};
  BlogCore.$('#social-github').value = social.github || '';
  BlogCore.$('#social-linkedin').value = social.linkedin || '';
  BlogCore.$('#social-facebook').value = social.facebook || '';

  BlogCore.$('#site-title').value = siteTitle.vi;
  BlogCore.$('#site-title-en').value = siteTitle.en;
  BlogCore.$('#site-tagline').value = siteTagline.vi;
  BlogCore.$('#site-tagline-en').value = siteTagline.en;
  BlogCore.$('#site-footer').value = siteFooter.vi;
  BlogCore.$('#site-footer-en').value = siteFooter.en;

  BlogCore.$('#blog-tagline').value = blogTagline.vi;
  BlogCore.$('#blog-tagline-en').value = blogTagline.en;

  const contact = data.contact || {};
  const shop = data.shop || {};
  BlogCore.$('#contact-phone').value = contact.phone || shop.phone || '';
  BlogCore.$('#contact-zalo').value = contact.zalo || shop.zalo || '';
  BlogCore.$('#contact-telegram').value = contact.telegram || '';
  BlogCore.$('#contact-messenger').value = contact.messenger || '';
  BlogCore.$('#contact-whatsapp').value = contact.whatsapp || '';

  BlogCore.$('#about-heading').value = aboutHeading.vi;
  BlogCore.$('#about-heading-en').value = aboutHeading.en;
  BlogCore.$('#about-image').value = about.image || '';
  BlogCore.updateImagePreview(about.image, BlogCore.$('#about-image-preview'));
  const paragraphs = about.paragraphs || [];
  BlogCore.$('#about-paragraphs').value = paragraphs.map((p) => (typeof p === 'object' ? p.vi : p) || '').join('\n\n');
  BlogCore.$('#about-paragraphs-en').value = paragraphs.map((p) => (typeof p === 'object' ? p.en : '') || '').join('\n\n');

  populateThemeSelect();
  renderServicesEditor();
}

function populateThemeSelect() {
  const select = BlogCore.$('#site-theme');
  if (!select) return;
  fetch(`${document.body.dataset.base || ''}themes.json`)
    .then((r) => r.json())
    .then((themes) => {
      select.innerHTML = '';
      Object.entries(themes).forEach(([id, theme]) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = typeof I18n !== 'undefined' ? I18n.themeName(id, theme.name) : theme.name;
        if (id === BlogCore.data().theme) opt.selected = true;
        select.appendChild(opt);
      });
    });
}

function renderServicesEditor() {
  const list = BlogCore.$('#services-list');
  if (!list) return;
  list.innerHTML = '';
  (BlogCore.data().services || []).forEach((service) => {
    list.appendChild(createServiceRow(service));
  });
}

function createServiceRow(service = {}) {
  const name = locVal(service.name);
  const desc = locVal(service.desc);
  const row = document.createElement('div');
  row.className = 'service-edit-row';
  row.innerHTML = `
    <input type="text" class="service-icon-input" value="${BlogCore.escapeAttr(service.icon || '💻')}" maxlength="4" title="Icon">
    <div class="service-edit-fields">
      <input type="text" class="service-name-input" value="${BlogCore.escapeAttr(name.vi)}" data-i18n-placeholder="admin.site.serviceName">
      <input type="text" class="service-name-en-input" value="${BlogCore.escapeAttr(name.en)}" data-i18n-placeholder="admin.site.serviceNameEn">
      <textarea class="service-desc-input" rows="2" data-i18n-placeholder="admin.site.serviceDesc">${BlogCore.escapeHtml(desc.vi)}</textarea>
      <textarea class="service-desc-en-input" rows="2" data-i18n-placeholder="admin.site.serviceDescEn">${BlogCore.escapeHtml(desc.en)}</textarea>
    </div>
    <button type="button" class="btn-danger service-remove-btn">✕</button>
  `;
  row.querySelector('.service-remove-btn').addEventListener('click', () => row.remove());
  return row;
}

function bindEvents() {
  BlogCore.$('#site-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    collectFormData();
    await BlogCore.saveData();
  });

  BlogCore.$('#btn-add-service')?.addEventListener('click', () => {
    BlogCore.$('#services-list')?.appendChild(createServiceRow());
  });

  bindImageUpload('profile-avatar', 'profile-avatar-file', 'btn-upload-avatar', 'profile-avatar-preview');
  bindImageUpload('profile-cover', 'profile-cover-file', 'btn-upload-cover', 'profile-cover-preview');
  bindImageUpload('about-image', 'about-image-file', 'btn-upload-about', 'about-image-preview');
}

function bindImageUpload(inputId, fileId, btnId, previewId) {
  BlogCore.$(`#${inputId}`)?.addEventListener('input', (e) => {
    BlogCore.updateImagePreview(e.target.value, BlogCore.$(`#${previewId}`));
  });
  BlogCore.$(`#${btnId}`)?.addEventListener('click', () => BlogCore.$(`#${fileId}`)?.click());
  BlogCore.$(`#${fileId}`)?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await BlogCore.uploadImage(file);
      BlogCore.$(`#${inputId}`).value = url;
      BlogCore.updateImagePreview(url, BlogCore.$(`#${previewId}`));
      BlogCore.showToast(I18n.t('toast.uploadOk'), 'success');
    } catch (err) {
      BlogCore.showToast(err.message, 'error');
    }
  });
}

function collectFormData() {
  const data = BlogCore.data();

  data.profile = {
    name: I18n.makeLocalized(BlogCore.$('#profile-name').value.trim(), BlogCore.$('#profile-name-en').value.trim()),
    title: I18n.makeLocalized(BlogCore.$('#profile-title').value.trim(), BlogCore.$('#profile-title-en').value.trim()),
    bio: I18n.makeLocalized(BlogCore.$('#profile-bio').value.trim(), BlogCore.$('#profile-bio-en').value.trim()),
    email: BlogCore.$('#profile-email').value.trim(),
    location: I18n.makeLocalized(BlogCore.$('#profile-location').value.trim(), BlogCore.$('#profile-location-en').value.trim()),
    avatar: BlogCore.$('#profile-avatar').value.trim(),
    coverImage: BlogCore.$('#profile-cover').value.trim(),
    social: {
      github: BlogCore.$('#social-github').value.trim(),
      linkedin: BlogCore.$('#social-linkedin').value.trim(),
      facebook: BlogCore.$('#social-facebook').value.trim()
    }
  };

  data.site = {
    title: I18n.makeLocalized(BlogCore.$('#site-title').value.trim(), BlogCore.$('#site-title-en').value.trim()),
    tagline: I18n.makeLocalized(BlogCore.$('#site-tagline').value.trim(), BlogCore.$('#site-tagline-en').value.trim()),
    footer: I18n.makeLocalized(BlogCore.$('#site-footer').value.trim(), BlogCore.$('#site-footer-en').value.trim())
  };

  data.blog = {
    tagline: I18n.makeLocalized(BlogCore.$('#blog-tagline').value.trim(), BlogCore.$('#blog-tagline-en').value.trim())
  };

  data.contact = {
    phone: BlogCore.$('#contact-phone').value.trim(),
    zalo: BlogCore.$('#contact-zalo').value.trim(),
    telegram: BlogCore.$('#contact-telegram').value.trim(),
    messenger: BlogCore.$('#contact-messenger').value.trim(),
    whatsapp: BlogCore.$('#contact-whatsapp').value.trim()
  };

  const viParagraphs = BlogCore.$('#about-paragraphs').value.split('\n\n').map((s) => s.trim()).filter(Boolean);
  const enParagraphs = BlogCore.$('#about-paragraphs-en').value.split('\n\n').map((s) => s.trim()).filter(Boolean);

  data.about = {
    heading: I18n.makeLocalized(BlogCore.$('#about-heading').value.trim(), BlogCore.$('#about-heading-en').value.trim()),
    image: BlogCore.$('#about-image').value.trim(),
    paragraphs: viParagraphs.map((vi, i) => I18n.makeLocalized(vi, enParagraphs[i] || vi))
  };

  data.services = [...BlogCore.$$('#services-list .service-edit-row')].map((row, i) => {
    const prev = (BlogCore.data().services || [])[i];
    const name = I18n.makeLocalized(
      row.querySelector('.service-name-input').value.trim(),
      row.querySelector('.service-name-en-input').value.trim()
    );
    const desc = I18n.makeLocalized(
      row.querySelector('.service-desc-input').value.trim(),
      row.querySelector('.service-desc-en-input').value.trim()
    );
    if (prev) {
      I18n.SUPPORTED.forEach((code) => {
        if (code === 'vi' || code === 'en') return;
        if (prev.name?.[code]) name[code] = prev.name[code];
        if (prev.desc?.[code]) desc[code] = prev.desc[code];
      });
    }
    return {
      icon: row.querySelector('.service-icon-input').value.trim() || '⚡',
      name,
      desc
    };
  }).filter((s) => s.name.vi || s.name.en);

  data.theme = BlogCore.$('#site-theme')?.value || data.theme;
  BlogCore.setPreferredTheme(data.theme);
  BlogCore.applyTheme(data.theme);
}

initSiteAdmin();