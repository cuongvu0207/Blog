async function initAccountPage() {
  await BlogCore.initPublic();
  await UserAuth.init();

  if (UserAuth.getToken()) {
    window.location.href = 'write.html';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get('tab') === 'register' ? 'register' : 'login';
  setTab(initialTab);

  const oauthError = params.get('error');
  if (oauthError) {
    const err = document.getElementById(initialTab === 'register' ? 'register-error' : 'login-error');
    err.textContent = mapError(oauthError);
    err.classList.remove('hidden');
  }

  const showAuthError = (msg, tab = initialTab) => {
    const err = document.getElementById(tab === 'register' ? 'register-error' : 'login-error');
    if (!err) return;
    err.textContent = mapError(msg);
    err.classList.remove('hidden');
  };

  const googleBlock = document.getElementById('google-auth-block');
  const googleHost = document.getElementById('google-btn-host');
  if (await UserAuth.initGoogleSignIn(googleHost, (msg) => showAuthError(msg))) {
    googleBlock?.classList.remove('hidden');
  }

  document.querySelectorAll('.auth-tab').forEach((btn) => {
    btn.addEventListener('click', () => setTab(btn.dataset.tab));
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('login-error');
    err.classList.add('hidden');
    try {
      await UserAuth.login(
        document.getElementById('login-username').value.trim(),
        document.getElementById('login-password').value
      );
      window.location.href = 'write.html';
    } catch (ex) {
      err.textContent = mapError(ex.message);
      err.classList.remove('hidden');
    }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('register-error');
    err.classList.add('hidden');
    try {
      await UserAuth.register({
        username: document.getElementById('register-username').value.trim(),
        displayName: document.getElementById('register-display').value.trim(),
        email: document.getElementById('register-email').value.trim(),
        password: document.getElementById('register-password').value
      });
      window.location.href = 'write.html';
    } catch (ex) {
      err.textContent = mapError(ex.message);
      err.classList.remove('hidden');
    }
  });
}

function setTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

function mapError(msg) {
  const map = {
    'Invalid username': I18n.t('user.error.username'),
    'Password too short': I18n.t('user.error.password'),
    'Username taken': I18n.t('user.error.taken'),
    'Invalid credentials': I18n.t('user.error.login'),
    'Use Google sign-in': I18n.t('user.error.useGoogle'),
    google_not_configured: I18n.t('user.error.googleNotConfigured'),
    google_failed: I18n.t('user.error.googleFailed'),
    google_invalid_state: I18n.t('user.error.googleFailed'),
    google_access_denied: I18n.t('user.error.googleDenied')
  };
  return map[msg] || msg || I18n.t('user.error.generic');
}

initAccountPage();