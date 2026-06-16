async function initHome() {
  await BlogCore.initPublic(renderAll);
  renderAll();
  if (typeof Effects !== 'undefined') Effects.refresh();
  document.addEventListener('i18n:changed', () => {
    renderServices();
    if (typeof Effects !== 'undefined') Effects.refresh();
  });
}

function renderAll() {
  const data = BlogCore.data();
  const avatar = BlogCore.$('#avatar');
  if (data.profile?.avatar && avatar) avatar.src = data.profile.avatar;

  const cover = BlogCore.$('#hero-cover');
  if (data.profile?.coverImage && cover) {
    cover.style.backgroundImage = `url('${data.profile.coverImage}')`;
  }

  const aboutPhoto = BlogCore.$('#about-photo');
  if (data.about?.image && aboutPhoto) aboutPhoto.src = data.about.image;

  BlogCore.renderSiteFields();
  renderSocial();
  renderAbout();
  renderServices();
  renderPostsPreview();
  if (typeof Effects !== 'undefined') Effects.refresh();
}

function renderSocial() {
  const container = BlogCore.$('#social-links');
  if (!container) return;
  container.innerHTML = '';
  const labels = { github: 'GitHub', linkedin: 'LinkedIn', facebook: 'Facebook' };
  Object.entries(BlogCore.data().profile?.social || {}).forEach(([key, url]) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = labels[key] || key;
    a.className = 'social-btn';
    container.appendChild(a);
  });
}

function renderAbout() {
  const container = BlogCore.$('#about-paragraphs');
  if (!container) return;
  container.innerHTML = '';
  (BlogCore.data().about?.paragraphs || []).forEach((p, i) => {
    const el = document.createElement('p');
    el.className = 'reveal-up';
    el.textContent = BlogCore.loc(p);
    el.style.animationDelay = `${0.3 + i * 0.15}s`;
    container.appendChild(el);
  });
}

function renderServices() {
  const container = BlogCore.$('#services');
  if (!container) return;
  container.innerHTML = '';
  const items = BlogCore.data().services || [];
  items.forEach((service, i) => {
    const div = document.createElement('div');
    div.className = 'service-item reveal-scale';
    div.style.transitionDelay = `${i * 0.08}s`;
    div.innerHTML = `
      <span class="service-icon" aria-hidden="true">${BlogCore.escapeHtml(service.icon || '⚡')}</span>
      <div class="service-name">${BlogCore.escapeHtml(BlogCore.loc(service.name))}</div>
      <div class="service-desc">${BlogCore.escapeHtml(BlogCore.loc(service.desc))}</div>
    `;
    container.appendChild(div);
  });
}

function renderPostsPreview() {
  const grid = BlogCore.$('#posts-preview');
  if (!grid) return;
  grid.innerHTML = '';
  BlogCore.getPublishedPosts().slice(0, 3)
    .forEach((post, i) => grid.appendChild(BlogCore.buildPostCard(post, { large: true, index: i })));
}

initHome();