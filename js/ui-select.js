const UiSelect = (() => {
  const instances = new Map();

  function enhance(select) {
    if (!select || select.dataset.uiSelectEnhanced) return instances.get(select);
    select.dataset.uiSelectEnhanced = 'true';

    const wrap = document.createElement('div');
    wrap.className = 'ui-select';
    if (select.classList.contains('theme-select')) wrap.classList.add('ui-select--theme');
    if (select.classList.contains('lang-select')) wrap.classList.add('ui-select--lang');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'ui-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const valueEl = document.createElement('span');
    valueEl.className = 'ui-select-value';

    const chevron = document.createElement('span');
    chevron.className = 'ui-select-chevron';
    chevron.setAttribute('aria-hidden', 'true');

    trigger.append(valueEl, chevron);

    const menu = document.createElement('div');
    menu.className = 'ui-select-menu';
    menu.setAttribute('role', 'listbox');

    select.classList.add('ui-select-native');
    select.parentNode.insertBefore(wrap, select);
    wrap.append(select, trigger, menu);

    const state = { select, wrap, trigger, valueEl, menu, options: [] };
    instances.set(select, state);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle(state);
    });

    menu.addEventListener('click', (e) => {
      e.stopPropagation();
      const opt = e.target.closest('.ui-select-option');
      if (!opt) return;
      pick(state, opt.dataset.value);
    });

    select.addEventListener('change', () => syncValue(state));

    let rebuildTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(rebuildTimer);
      rebuildTimer = setTimeout(() => rebuild(state), 0);
    });
    observer.observe(select, { childList: true, subtree: true });

    state.reposition = () => positionMenu(state);
    window.addEventListener('resize', state.reposition, { passive: true });
    window.addEventListener('scroll', state.reposition, { passive: true });

    rebuild(state);
    return state;
  }

  function positionMenu(state) {
    if (!state.wrap.classList.contains('is-open')) return;
    const rect = state.trigger.getBoundingClientRect();
    const menu = state.menu;
    menu.style.top = `${rect.bottom + 10}px`;
    menu.style.right = `${Math.max(8, window.innerWidth - rect.right)}px`;
    menu.style.minWidth = `${Math.max(rect.width + 40, 168)}px`;
  }

  function rebuild(state) {
    const { select, menu } = state;
    const current = select.value;
    menu.innerHTML = '';

    state.options = Array.from(select.options).map((opt, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ui-select-option';
      btn.dataset.value = opt.value;
      btn.setAttribute('role', 'option');
      btn.style.setProperty('--opt-i', String(index));

      const label = document.createElement('span');
      label.className = 'ui-select-option-label';
      label.textContent = opt.textContent;

      const check = document.createElement('span');
      check.className = 'ui-select-option-check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';

      btn.append(label, check);
      btn.classList.toggle('is-selected', opt.value === current);
      btn.setAttribute('aria-selected', opt.value === current ? 'true' : 'false');
      menu.appendChild(btn);
      return btn;
    });

    syncValue(state);
  }

  function syncValue(state) {
    const opt = state.select.options[state.select.selectedIndex];
    state.valueEl.textContent = opt?.textContent || '';
    state.options.forEach((btn) => {
      const on = btn.dataset.value === state.select.value;
      btn.classList.toggle('is-selected', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function pick(state, value) {
    if (state.select.value === value) {
      close(state);
      return;
    }
    state.select.value = value;
    state.select.dispatchEvent(new Event('change', { bubbles: true }));
    state.wrap.classList.add('is-changed');
    setTimeout(() => state.wrap.classList.remove('is-changed'), 450);
    close(state);
  }

  function open(state) {
    closeOthers(state);
    state.wrap.classList.add('is-open');
    state.trigger.setAttribute('aria-expanded', 'true');
    positionMenu(state);
    requestAnimationFrame(() => {
      positionMenu(state);
      state.menu.classList.add('is-visible');
    });
  }

  function close(state) {
    state.wrap.classList.remove('is-open');
    state.trigger.setAttribute('aria-expanded', 'false');
    state.menu.classList.remove('is-visible');
  }

  function toggle(state) {
    if (state.wrap.classList.contains('is-open')) close(state);
    else open(state);
  }

  function closeOthers(current) {
    instances.forEach((state) => {
      if (state !== current) close(state);
    });
  }

  function enhanceAll(root = document) {
    root.querySelectorAll('select.theme-select, select.lang-select, select.nav-select').forEach(enhance);
  }

  function refreshAll() {
    instances.forEach((state) => {
      if (state.select.isConnected) rebuild(state);
    });
  }

  document.addEventListener('click', () => {
    instances.forEach((state) => close(state));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') instances.forEach((state) => close(state));
  });

  return { enhance, enhanceAll, refreshAll };
})();