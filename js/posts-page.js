async function initPostsPage() {
  await BlogCore.initPublic(renderAllPosts);
  renderAllPosts();
}

function renderAllPosts() {
  const grid = BlogCore.$('#posts-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const posts = BlogCore.getPublishedPosts();
  BlogCore.$('#posts-count').textContent = I18n.t('blog.postsCount', { n: posts.length });
  posts.forEach((post, i) => grid.appendChild(BlogCore.buildPostCard(post, { large: true, index: i })));
  if (typeof Effects !== 'undefined') Effects.refresh();
}

initPostsPage();