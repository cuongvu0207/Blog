(function () {
  try {
    const cache = JSON.parse(localStorage.getItem('ctech-theme-cache'));
    if (!cache) return;
    const root = document.documentElement;
    Object.entries(cache.colors || {}).forEach(([key, val]) => {
      root.style.setProperty(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, val);
    });
    if (cache.font) root.style.setProperty('--font', cache.font);
    if (cache.radius) root.style.setProperty('--radius', cache.radius);
  } catch { /* ignore */ }
})();