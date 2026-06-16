const Modal = (() => {
  function el(id) {
    return typeof id === 'string' ? document.getElementById(id) : id;
  }

  function parts(modal) {
    return {
      modal,
      content: modal?.querySelector('.modal-content'),
      backdrop: modal?.querySelector('.modal-backdrop')
    };
  }

  function clearAnim(modal) {
    if (!modal) return;
    const { content, backdrop } = parts(modal);
    modal.classList.remove('modal-open');
    content?.classList.remove('modal-content-in');
    backdrop?.classList.remove('modal-backdrop-in');
    if (backdrop) backdrop.style.backdropFilter = '';
  }

  function playAnim(modal) {
    const { content, backdrop } = parts(modal);
    requestAnimationFrame(() => {
      if (!modal || modal.classList.contains('hidden')) return;
      modal.classList.add('modal-open');
      content?.classList.add('modal-content-in');
      if (backdrop) {
        backdrop.style.backdropFilter = '';
        backdrop.classList.add('modal-backdrop-in');
      }
    });
  }

  function syncBodyLock() {
    const hasOpen = !!document.querySelector('.modal:not(.hidden)');
    document.body.classList.toggle('modal-active', hasOpen);
  }

  function open(id) {
    const modal = el(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.removeAttribute('inert');
    modal.setAttribute('aria-hidden', 'false');
    playAnim(modal);
    syncBodyLock();
  }

  function close(id) {
    const modal = el(id);
    if (!modal || modal.classList.contains('hidden')) return;

    const { backdrop } = parts(modal);
    modal.style.pointerEvents = 'none';
    if (backdrop) backdrop.style.backdropFilter = 'none';
    clearAnim(modal);
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('inert', '');
    modal.style.pointerEvents = '';
    syncBodyLock();
  }

  function closeTop() {
    const openModals = [...document.querySelectorAll('.modal:not(.hidden)')];
    const top = openModals[openModals.length - 1];
    if (top) close(top.id || top);
  }

  function bind(id, { backdrop = true, closeBtn = true, onClose } = {}) {
    const modal = el(id);
    if (!modal || modal.dataset.modalBound) return;
    modal.dataset.modalBound = 'true';

    const doClose = (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      close(id);
      onClose?.();
    };

    if (backdrop) {
      parts(modal).backdrop?.addEventListener('click', doClose);
    }
    if (closeBtn) {
      modal.querySelector('.modal-close')?.addEventListener('click', doClose);
    }
  }

  function init() {
    document.querySelectorAll('.modal:not(.hidden)').forEach((modal) => close(modal.id || modal));
    if (document.body.dataset.modalKeyBound) return;
    document.body.dataset.modalKeyBound = 'true';
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeTop();
    });
  }

  return { open, close, closeTop, bind, init, clearAnim };
})();

document.addEventListener('DOMContentLoaded', () => Modal.init());