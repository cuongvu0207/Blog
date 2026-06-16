async function initWritePage() {
  await BlogCore.initPublic();
  await UserAuth.init();
  if (!UserAuth.requireLogin()) return;

  document.getElementById('write-form').addEventListener('submit', submitPost);
  document.getElementById('btn-write-upload')?.addEventListener('click', () => {
    document.getElementById('write-image-file')?.click();
  });
  document.getElementById('write-image-file')?.addEventListener('change', uploadImage);
  document.getElementById('write-image')?.addEventListener('input', (e) => {
    BlogCore.updateImagePreview(e.target.value, document.getElementById('write-image-preview'));
  });
}

async function uploadImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const base = document.body.dataset.base || '';
    const apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
    const res = await fetch(`${apiBase}${base}api/upload`, {
      method: 'POST',
      headers: UserAuth.authHeaders(),
      body: formData
    });
    const result = await res.json();
    if (!result.ok) throw new Error(result.error || 'Upload failed');
    document.getElementById('write-image').value = result.url;
    BlogCore.updateImagePreview(result.url, document.getElementById('write-image-preview'));
    BlogCore.showToast(I18n.t('toast.uploadOk'), 'success');
  } catch (err) {
    BlogCore.showToast(err.message, 'error');
  }
}

async function submitPost(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const base = document.body.dataset.base || '';
    const payload = {
      reviewTarget: document.getElementById('write-target').value.trim(),
      title: document.getElementById('write-title').value.trim(),
      excerpt: document.getElementById('write-excerpt').value.trim(),
      content: document.getElementById('write-content').value.trim(),
      rating: document.getElementById('write-rating').value,
      tags: document.getElementById('write-tags').value.trim(),
      image: document.getElementById('write-image').value.trim()
    };
    const apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
    const res = await fetch(`${apiBase}${base}api/user/post`, {
      method: 'POST',
      headers: { ...UserAuth.authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!res.ok || !result.ok) throw new Error(result.error || I18n.t('user.error.generic'));
    BlogCore.showToast(I18n.t('user.published'), 'success');
    setTimeout(() => {
      window.location.href = `post.html?id=${result.post.id}`;
    }, 600);
  } catch (err) {
    BlogCore.showToast(err.message, 'error');
    btn.disabled = false;
  }
}

initWritePage();