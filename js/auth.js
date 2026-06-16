const AdminAuth = (() => {
  const KEY = 'ctech-admin-pass';

  function getPassword() {
    return sessionStorage.getItem(KEY) || '';
  }

  function setPassword(password) {
    sessionStorage.setItem(KEY, password);
  }

  function clear() {
    sessionStorage.removeItem(KEY);
  }

  function authHeaders() {
    const password = getPassword();
    return password ? { 'X-Admin-Password': password } : {};
  }

  async function login(password) {
    const base = document.body?.dataset?.base || '';
    const apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
    try {
      const res = await fetch(`${apiBase}${base}api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const result = await res.json();
      if (result.ok) {
        setPassword(password);
        return { ok: true };
      }
      return { ok: false, error: result.error || 'Invalid password' };
    } catch {
      return {
        ok: false,
        error: typeof I18n !== 'undefined' ? I18n.t('admin.login.serverError') : 'Không kết nối được server. Hãy chạy start.bat trước.'
      };
    }
  }

  function logout() {
    clear();
    window.location.href = 'login.html';
  }

  async function requireAuth() {
    if (document.body.dataset.page === 'admin-login') return;
    const saved = getPassword();
    if (!saved) {
      window.location.href = 'login.html';
      return;
    }
    const result = await login(saved);
    if (!result.ok) {
      clear();
      window.location.href = 'login.html';
    }
  }

  function bindLogout() {
    const btn = document.getElementById('btn-admin-logout');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = 'true';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  async function apiPost(path, body, withAuth = false) {
    const base = document.body?.dataset?.base || '';
    const apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
    const headers = { 'Content-Type': 'application/json', ...(withAuth ? authHeaders() : {}) };
    try {
      const res = await fetch(`${apiBase}${base}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch {
      return {
        ok: false,
        error: typeof I18n !== 'undefined' ? I18n.t('admin.login.serverError') : 'Không kết nối được server.'
      };
    }
  }

  async function forgotPassword(email) {
    return apiPost('api/admin/forgot-password', { email });
  }

  async function resetPassword(email, code, newPassword) {
    return apiPost('api/admin/reset-password', { email, code, newPassword });
  }

  async function changePassword(currentPassword, newPassword, confirmPassword) {
    return apiPost('api/admin/change-password', { currentPassword, newPassword, confirmPassword }, true);
  }

  return {
    getPassword, setPassword, clear, authHeaders, login, logout, requireAuth, bindLogout,
    forgotPassword, resetPassword, changePassword
  };
})();