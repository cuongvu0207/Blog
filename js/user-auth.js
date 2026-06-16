const UserAuth = (() => {
  const TOKEN_KEY = 'ctech-user-token';
  const USER_KEY = 'ctech-user';
  let googleClientId = '';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function authHeaders() {
    const token = getToken();
    return token ? { 'X-User-Token': token } : {};
  }

  async function register(payload) {
    const base = document.body?.dataset?.base || '';
    const apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
    const res = await fetch(`${apiBase}${base}api/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!res.ok || !result.ok) {
      throw new Error(result.error || I18n.t('user.error.generic'));
    }
    setSession(result.token, result.user);
    return result.user;
  }

  async function login(username, password) {
    const base = document.body?.dataset?.base || '';
    const apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
    const res = await fetch(`${apiBase}${base}api/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await res.json();
    if (!res.ok || !result.ok) {
      throw new Error(result.error || I18n.t('user.error.login'));
    }
    setSession(result.token, result.user);
    return result.user;
  }

  async function loginWithGoogleCredential(credential) {
    const base = document.body?.dataset?.base || '';
    const apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
    const res = await fetch(`${apiBase}${base}api/auth/google/credential`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });
    const result = await res.json();
    if (!res.ok || !result.ok) {
      throw new Error(result.error || I18n.t('user.error.googleFailed'));
    }
    setSession(result.token, result.user);
    return result.user;
  }

  async function logout() {
    const base = document.body?.dataset?.base || '';
    const apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
    try {
      await fetch(`${apiBase}${base}api/user/logout`, {
        method: 'POST',
        headers: authHeaders()
      });
    } catch { /* ignore */ }
    clear();
    renderToolbar();
    document.dispatchEvent(new CustomEvent('user:logout'));
  }

  async function refresh() {
    const token = getToken();
    if (!token) return null;
    const base = document.body?.dataset?.base || '';
    try {
      const apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
      const res = await fetch(`${apiBase}${base}api/user/me`, { headers: authHeaders() });
      const result = await res.json();
      if (!res.ok || !result.ok) {
        clear();
        return null;
      }
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      return result.user;
    } catch {
      return getUser();
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function googleEnabled() {
    const base = document.body?.dataset?.base || '';
    try {
      const apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
      const res = await fetch(`${apiBase}${base}api/auth/google/status`);
      const result = await res.json();
      if (result.ok && result.enabled) {
        googleClientId = result.clientId || '';
      }
      return !!(result.ok && result.enabled);
    } catch {
      return false;
    }
  }

  async function initGoogleSignIn(hostEl, onError) {
    if (!hostEl || !(await googleEnabled()) || !googleClientId) return false;
    try {
      await loadScript('https://accounts.google.com/gsi/client');
      const handleCredential = async (response) => {
        try {
          await loginWithGoogleCredential(response.credential);
          window.location.href = 'write.html';
        } catch (ex) {
          onError?.(ex.message);
        }
      };
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredential,
        auto_select: false,
        cancel_on_tap_outside: true
      });
      window.google.accounts.id.renderButton(hostEl, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: Math.min(hostEl.offsetWidth || 320, 400)
      });
      return true;
    } catch {
      return false;
    }
  }

  function loginWithGoogle() {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
      return;
    }
    const base = document.body?.dataset?.base || '';
    const apiBase = (typeof window !== 'undefined' && window.API_BASE) || '';
    window.location.href = `${apiBase}${base}api/auth/google`;
  }

  function renderToolbar() {
    const el = document.getElementById('user-toolbar');
    if (!el) return;
    const user = getUser();
    if (!user) {
      el.innerHTML = `
        <a href="account.html" class="toolbar-btn toolbar-link" data-i18n="user.login">Sign in</a>
        <a href="account.html?tab=register" class="toolbar-btn toolbar-link toolbar-link-accent" data-i18n="user.register">Sign up</a>
      `;
    } else {
      el.innerHTML = `
        <span class="user-toolbar-name">👤 ${BlogCore.escapeHtml(user.displayName)}</span>
        <a href="write.html" class="toolbar-btn toolbar-link toolbar-link-accent" data-i18n="user.write">Write review</a>
        <button type="button" class="toolbar-btn" id="btn-user-logout" data-i18n="user.logout">Sign out</button>
      `;
      document.getElementById('btn-user-logout')?.addEventListener('click', logout);
    }
    if (typeof I18n !== 'undefined') I18n.applyDOM();
  }

  async function init() {
    if (document.body.dataset.page?.startsWith('admin')) return;
    await refresh();
    renderToolbar();
    document.addEventListener('i18n:changed', renderToolbar);
  }

  function requireLogin(redirect = 'account.html') {
    if (!getToken()) {
      window.location.href = redirect;
      return false;
    }
    return true;
  }

  return {
    getToken, getUser, authHeaders, register, login, logout, refresh,
    renderToolbar, init, requireLogin, clear, googleEnabled,
    initGoogleSignIn, loginWithGoogle, loginWithGoogleCredential
  };
})();