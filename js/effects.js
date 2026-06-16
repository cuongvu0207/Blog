const Effects = (() => {
  let revealObserver = null;

  function init() {
    initScrollProgress();
    initToolbarHeight();
    initNavbarScroll();
    initParallax();
    initCursorGlow();
    initRevealObserver();
    initHeroStagger();
    initNavActive();
  }

  function initScrollProgress() {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;

    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = `${progress}%`;
    }, { passive: true });
  }

  function initToolbarHeight() {
    const toolbar = document.getElementById('toolbar');
    if (!toolbar) return;

    const sync = () => {
      const h = Math.ceil(toolbar.getBoundingClientRect().height);
      document.documentElement.style.setProperty('--toolbar-h', `${h}px`);
    };

    sync();
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(sync).observe(toolbar);
    }
    window.addEventListener('resize', sync, { passive: true });
    if (document.fonts?.ready) document.fonts.ready.then(sync);
  }

  function initNavbarScroll() {
    const nav = document.getElementById('nav');
    if (!nav) return;

    const THRESHOLD = 48;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        nav.classList.toggle('nav-glass', window.scrollY > THRESHOLD);
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initParallax() {
    const cover = document.getElementById('hero-cover');
    const avatar = document.getElementById('avatar-wrapper');
    if (!cover && !avatar) return;

    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (cover) cover.style.transform = `translateY(${y * 0.35}px) scale(1.05)`;
      if (avatar && y < 500) avatar.style.transform = `translateY(${y * -0.08}px)`;
    }, { passive: true });
  }

  function initCursorGlow() {
    const glow = document.getElementById('cursor-glow');
    if (!glow || window.matchMedia('(pointer: coarse)').matches) return;

    let x = 0, y = 0;
    let cx = 0, cy = 0;

    document.addEventListener('mousemove', (e) => {
      x = e.clientX;
      y = e.clientY;
    });

    function animate() {
      cx += (x - cx) * 0.12;
      cy += (y - cy) * 0.12;
      glow.style.transform = `translate(${cx - 150}px, ${cy - 150}px)`;
      requestAnimationFrame(animate);
    }
    animate();
  }

  function initRevealObserver() {
    if (revealObserver) revealObserver.disconnect();

    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');

        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-right, .reveal-scale, .post-card, .service-item').forEach((el) => {
      revealObserver.observe(el);
    });
  }

  function initHeroStagger() {
    document.querySelectorAll('.hero .reveal-up').forEach((el, i) => {
      el.style.animationDelay = `${0.2 + i * 0.15}s`;
    });
  }

  function initNavActive() {
    const links = document.querySelectorAll('.nav-link');
    const sections = ['home', 'about', 'posts-preview-section', 'contact']
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!sections.length) return;

    window.addEventListener('scroll', () => {
      let current = '';
      sections.forEach((sec) => {
        if (!sec) return;
        const top = sec.offsetTop - 120;
        if (window.scrollY >= top) current = sec.id;
      });
      links.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
      });
    }, { passive: true });
  }

  function refresh() {
    initRevealObserver();
    initHeroStagger();
  }

  function tiltCard(card) {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateX = ((y - rect.height / 2) / rect.height) * -6;
      const rotateY = ((x - rect.width / 2) / rect.width) * 6;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  }

  return { init, refresh, tiltCard };
})();

document.addEventListener('DOMContentLoaded', () => Effects.init());