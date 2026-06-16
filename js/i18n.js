const I18n = (() => {
  const KEY = 'ctech-lang';
  const DEFAULT = 'vi';
  const SUPPORTED = ['vi', 'en', 'zh', 'fr', 'ru', 'ko', 'ja', 'es', 'de', 'pt', 'it'];
  const LOCALES = [
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
    { code: 'fr', label: 'Français' },
    { code: 'ru', label: 'Русский' },
    { code: 'ko', label: '한국어' },
    { code: 'ja', label: '日本語' },
    { code: 'es', label: 'Español' },
    { code: 'de', label: 'Deutsch' },
    { code: 'pt', label: 'Português' },
    { code: 'it', label: 'Italiano' }
  ];
  const LOCALE_TAGS = {
    vi: 'vi-VN', en: 'en-US', zh: 'zh-CN', fr: 'fr-FR',
    ru: 'ru-RU', ko: 'ko-KR', ja: 'ja-JP',
    es: 'es-ES', de: 'de-DE', pt: 'pt-PT', it: 'it-IT'
  };
  const CONTENT_FALLBACK = ['vi', 'en', 'zh', 'fr', 'ru', 'ko', 'ja', 'es', 'de', 'pt', 'it'];

  let lang = DEFAULT;
  let strings = {};

  function isSupported(code) {
    return SUPPORTED.includes(code);
  }

  function detectLang() {
    const saved = localStorage.getItem(KEY);
    if (isSupported(saved)) return saved;
    const browser = (navigator.language || '').toLowerCase();
    if (browser.startsWith('vi')) return 'vi';
    if (browser.startsWith('zh')) return 'zh';
    if (browser.startsWith('fr')) return 'fr';
    if (browser.startsWith('ru')) return 'ru';
    if (browser.startsWith('ko')) return 'ko';
    if (browser.startsWith('ja')) return 'ja';
    if (browser.startsWith('es')) return 'es';
    if (browser.startsWith('de')) return 'de';
    if (browser.startsWith('pt')) return 'pt';
    if (browser.startsWith('it')) return 'it';
    return 'en';
  }

  function basePath() {
    return document.body?.dataset?.base || '';
  }

  async function load(locale) {
    const target = isSupported(locale) ? locale : DEFAULT;
    const res = await fetch(`${basePath()}i18n/${target}.json`);
    strings = await res.json();
    lang = target;
    localStorage.setItem(KEY, target);
    document.documentElement.lang = target;
  }

  function t(key, params = {}) {
    let str = strings[key] || key;
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, v);
    });
    return str;
  }

  function localize(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      if (value[lang]) return value[lang];
      for (const code of CONTENT_FALLBACK) {
        if (value[code]) return value[code];
      }
      return Object.values(value)[0] || '';
    }
    return String(value);
  }

  function makeLocalized(vi, en) {
    const result = { vi, en: en || vi };
    SUPPORTED.forEach((code) => {
      if (code !== 'vi' && code !== 'en') result[code] = en || vi;
    });
    return result;
  }

  function themeName(id, fallback = '') {
    const key = `theme.${id}`;
    const translated = strings[key];
    return translated && translated !== key ? translated : fallback;
  }

  function applyDOM() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      const attr = el.dataset.i18nAttr;
      const text = t(key);
      if (attr) {
        el.setAttribute(attr, text);
        return;
      }
      const hasFormChild = el.tagName === 'LABEL' && el.querySelector(
        ':scope > input, :scope > textarea, :scope > select, :scope > .image-input-row, :scope > img, :scope > .image-preview'
      );
      if (hasFormChild) {
        let labelEl = el.querySelector(':scope > .i18n-label');
        if (!labelEl) {
          labelEl = document.createElement('span');
          labelEl.className = 'i18n-label';
          [...el.childNodes].forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) node.remove();
          });
          el.insertBefore(labelEl, el.firstChild);
        }
        labelEl.textContent = text;
        return;
      }
      el.textContent = text;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
  }

  function populateLangSelect() {
    const select = document.getElementById('lang-select');
    if (!select) return;
    select.innerHTML = LOCALES.map(({ code, label }) =>
      `<option value="${code}">${label}</option>`
    ).join('');
    select.value = lang;
  }

  async function setLang(locale) {
    if (!isSupported(locale)) return;
    await load(locale);
    populateLangSelect();
    applyDOM();
    document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: locale } }));
  }

  async function init() {
    await load(detectLang());
    populateLangSelect();
    applyDOM();
    bindSwitcher();
  }

  function bindSwitcher() {
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });
    const select = document.getElementById('lang-select');
    if (select && !select.dataset.bound) {
      select.dataset.bound = 'true';
      select.addEventListener('change', (e) => setLang(e.target.value));
    }
    updateSwitcherUI();
    document.addEventListener('i18n:changed', updateSwitcherUI);
  }

  function updateSwitcherUI() {
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    const select = document.getElementById('lang-select');
    if (select) select.value = lang;
  }

  function localeTag() {
    return LOCALE_TAGS[lang] || 'en-US';
  }

  return {
    init, t, localize, makeLocalized, themeName, lang: () => lang,
    setLang, applyDOM, localeTag, SUPPORTED, LOCALES
  };
})();